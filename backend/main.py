import hashlib
import os
import uuid
from contextlib import asynccontextmanager
from decimal import Decimal
from pathlib import Path
from typing import List
from uuid import UUID

from dotenv import load_dotenv
import httpx
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
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
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="E-Commerce API",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins_raw = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)
origins = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {"status": "healthy"}



@app.get("/api/v1/products", response_model=List[ProductResponse])
def get_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    return products


@app.post(
    "/api/v1/orders/checkout",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def checkout(request: CheckoutRequest, db: Session = Depends(get_db)):
    # Validasi bahwa items tidak kosong
    if not request.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keranjang belanja tidak boleh kosong",
        )

    try:
        total_amount = Decimal("0.00")
        order_items_to_create = []
        midtrans_items = []

        # Loop setiap item di request, query Product dari database menggunakan .with_for_update()
        for item in request.items:
            product = (
                db.query(Product)
                .filter(Product.id == item.product_id)
                .with_for_update()
                .first()
            )

            # Jika produk tidak ditemukan, lempar HTTPException(status_code=404)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Produk dengan ID {item.product_id} tidak ditemukan",
                )

            # Jika product.stock_quantity < item.quantity, lempar HTTPException(status_code=400)
            if product.stock_quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stok produk {product.name} tidak mencukupi",
                )

            # Kurangi product.stock_quantity sebesar item.quantity
            product.stock_quantity -= item.quantity

            # Hitung harga menggunakan product.price dari database (Zero-Trust Pricing) dan akumulasikan ke total_amount
            item_price = Decimal(str(product.price))
            total_amount += item_price * item.quantity

            order_items_to_create.append(
                OrderItem(
                    product_id=product.id,
                    quantity=item.quantity,
                    price_at_purchase=item_price,
                )
            )

            midtrans_items.append({
                "id": str(product.id),
                "price": int(item_price),
                "quantity": item.quantity,
                "name": product.name[:50],
            })

        # Buat order_id = uuid.uuid4() secara eksplisit
        order_id = uuid.uuid4()
        new_order = Order(
            id=order_id,
            customer_name=request.customer_name,
            customer_email=request.customer_email,
            customer_phone=request.customer_phone,
            shipping_address=request.shipping_address,
            total_amount=total_amount,
            status=OrderStatus.PENDING.value,
            items=order_items_to_create,
        )

        db.add(new_order)

        # Susun payload JSON Midtrans
        midtrans_payload = {
            "transaction_details": {
                "order_id": str(order_id),
                "gross_amount": int(total_amount),
            },
            "customer_details": {
                "first_name": request.customer_name,
                "email": request.customer_email,
                "phone": request.customer_phone,
                "shipping_address": {
                    "address": request.shipping_address,
                },
            },
            "item_details": midtrans_items,
        }

        # Kirim request POST sinkron menggunakan httpx.Client(timeout=10.0) ke URL Midtrans Snap
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                MIDTRANS_SNAP_URL,
                json=midtrans_payload,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                auth=(MIDTRANS_SERVER_KEY, ""),
            )

        if response.status_code != 201:
            db.rollback()
            raise HTTPException(
                status_code=502,
                detail=f"Gagal membuat transaksi pembayaran Midtrans: {response.text}",
            )

        snap_token = response.json().get("token")
        new_order.payment_gateway_ref = snap_token

        db.commit()
        db.refresh(new_order)
        return new_order

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal memproses pesanan: {str(e)}",
        )


@app.get("/api/v1/orders/{order_id}", response_model=OrderResponse)
def get_order(order_id: UUID, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pesanan dengan ID {order_id} tidak ditemukan",
        )
    return order


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

