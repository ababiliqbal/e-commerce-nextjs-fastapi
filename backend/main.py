import re
import hashlib
import os
import sys
import uuid
from contextlib import asynccontextmanager
from decimal import Decimal
from pathlib import Path
from typing import List
from uuid import UUID

current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from dotenv import load_dotenv
import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Order, OrderItem, OrderStatus, Product
from schemas import (
    CheckoutRequest,
    MidtransWebhookPayload,
    OrderResponse,
    ProductResponse,
)

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

MIDTRANS_SERVER_KEY = os.getenv("MIDTRANS_SERVER_KEY", "")
MIDTRANS_IS_PRODUCTION = os.getenv("MIDTRANS_IS_PRODUCTION", "false").lower()

MIDTRANS_SNAP_URL = (
    "https://app.midtrans.com/snap/v1/transactions"
    if MIDTRANS_IS_PRODUCTION == "true"
    else "https://app.sandbox.midtrans.com/snap/v1/transactions"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Base.metadata.create_all(bind=engine)
    yield


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="E-Commerce API",
    version="1.3.0",
    lifespan=lifespan,
)
app.state.limiter = limiter

from routers.auth import router as auth_router
from routers.products import router as products_router
from routers.orders import router as orders_router
from routers.admin import router as admin_router

app.include_router(auth_router)
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(admin_router)


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Terlalu banyak permintaan. Silakan coba lagi nanti."},
    )

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "").strip()
origins = [
    origin.strip()
    for origin in allowed_origins_raw.split(",")
    if origin.strip() and origin.strip() != "*"
]

# Jika ALLOWED_ORIGINS kosong, defaultkan ke localhost untuk pengembangan lokal
if not origins:
    origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Baris sakti: Mengizinkan otomatis URL dinamis bawaan Vercel (Preview & Production)
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {"status": "healthy"}



@app.post("/api/v1/webhooks/midtrans", status_code=status.HTTP_200_OK)
def midtrans_webhook(
    payload: MidtransWebhookPayload,
    db: Session = Depends(get_db),
):
    # a. Verifikasi Signature SHA-512
    raw_signature = (
        f"{payload.order_id}{payload.status_code}{payload.gross_amount}{MIDTRANS_SERVER_KEY}"
    )
    computed_signature = hashlib.sha512(raw_signature.encode("utf-8")).hexdigest()

    if computed_signature != payload.signature_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid signature key",
        )

    try:
        # b. Query & Lock Order
        try:
            order_uuid = uuid.UUID(payload.order_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )

        order = (
            db.query(Order)
            .filter(Order.id == order_uuid)
            .with_for_update()
            .first()
        )

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )

        # c. Idempotency Check
        if order.status in [OrderStatus.PAID.value, OrderStatus.CANCELLED.value]:
            return {
                "status": "ignored",
                "message": "Order already in final state",
            }

        # d. Evaluasi Status Transaksi Midtrans
        if payload.transaction_status == "capture":
            if payload.fraud_status == "accept":
                order.status = OrderStatus.PAID.value
        elif payload.transaction_status == "settlement":
            order.status = OrderStatus.PAID.value
        elif payload.transaction_status in ["cancel", "deny", "expire"]:
            order.status = OrderStatus.CANCELLED.value
            for item in order.items:
                product = (
                    db.query(Product)
                    .filter(Product.id == item.product_id)
                    .with_for_update()
                    .first()
                )
                if product:
                    product.stock_quantity += item.quantity

        # e. Commit dan return status ok
        db.commit()
        return {
            "status": "ok",
            "order_id": str(order.id),
            "new_status": order.status,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal memproses webhook: {str(e)}",
        )

