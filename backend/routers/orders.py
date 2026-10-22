from decimal import Decimal
import os
from pathlib import Path
from typing import List, Optional
import uuid
from uuid import UUID

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, status
import httpx
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import Order, OrderItem, OrderStatus, Product, User, UserRole
from schemas import CheckoutRequest, OrderResponse
from security import get_current_user, get_optional_user

# Impor limiter dari modul utama (dengan fallback)
try:
    from main import limiter
except ImportError:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address)

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

MIDTRANS_SERVER_KEY = os.getenv("MIDTRANS_SERVER_KEY", "")
MIDTRANS_IS_PRODUCTION = os.getenv("MIDTRANS_IS_PRODUCTION", "false").lower()

MIDTRANS_SNAP_URL = (
    "https://app.midtrans.com/snap/v1/transactions"
    if MIDTRANS_IS_PRODUCTION == "true"
    else "https://app.sandbox.midtrans.com/snap/v1/transactions"
)

router = APIRouter(prefix="/api/v1/orders", tags=["Orders"])


@router.post(
    "/checkout",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("5/minute")
def checkout(
    request: Request,
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Inisiasi pemesanan (Hybrid Checkout). Mendukung pengguna guest maupun
    pengguna terautentikasi (user_id disematkan jika pengguna login).
    Menggunakan Pessimistic Locking (.with_for_update()) dan Zero-Trust Pricing.
    """
    if not payload.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keranjang belanja tidak boleh kosong",
        )

    try:
        total_amount = Decimal("0.00")
        order_items_to_create = []
        midtrans_items = []

        for item in payload.items:
            product = (
                db.query(Product)
                .filter(Product.id == item.product_id)
                .with_for_update()
                .first()
            )

            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Produk dengan ID {item.product_id} tidak ditemukan",
                )

            if not product.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Produk tidak lagi tersedia",
                )

            if product.stock_quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stok produk {product.name} tidak mencukupi",
                )

            product.stock_quantity -= item.quantity
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

        order_id = uuid.uuid4()
        new_order = Order(
            id=order_id,
            user_id=current_user.id if current_user else None,
            customer_name=payload.customer_name,
            customer_email=payload.customer_email,
            customer_phone=payload.customer_phone,
            shipping_address=payload.shipping_address,
            total_amount=total_amount,
            status=OrderStatus.PENDING.value,
            items=order_items_to_create,
        )

        db.add(new_order)

        # Susun payload JSON Midtrans Snap
        midtrans_payload = {
            "transaction_details": {
                "order_id": str(order_id),
                "gross_amount": int(total_amount),
            },
            "customer_details": {
                "first_name": payload.customer_name,
                "email": payload.customer_email,
                "phone": payload.customer_phone,
                "shipping_address": {
                    "address": payload.shipping_address,
                },
            },
            "item_details": midtrans_items,
        }

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
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gagal membuat transaksi pembayaran Midtrans: {response.text}",
            )

        snap_token = response.json().get("token")
        new_order.payment_gateway_ref = snap_token

        db.commit()
        created_order = (
            db.query(Order)
            .options(
                selectinload(Order.items)
                .selectinload(OrderItem.product)
                .selectinload(Product.images)
            )
            .filter(Order.id == new_order.id)
            .first()
        )
        return created_order

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal memproses pesanan: {str(e)}",
        )


@router.get(
    "/me",
    response_model=List[OrderResponse],
    status_code=status.HTTP_200_OK,
)
def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mengambil riwayat pesanan milik pengguna yang sedang terautentikasi
    dengan eager loading (selectinload) pada item pesanan, produk, dan galeri gambar,
    diurutkan berdasarkan tanggal terbaru (created_at DESC).
    """
    orders = (
        db.query(Order)
        .options(
            selectinload(Order.items)
            .selectinload(OrderItem.product)
            .selectinload(Product.images)
        )
        .filter(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return orders


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
    status_code=status.HTTP_200_OK,
)
def get_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Mengambil rincian pesanan spesifik berdasarkan ID pesanan (UUID) beserta produk dan gambarnya.
    Mencegah kebocoran data jika pesanan dibuat oleh akun terdaftar (member).
    """
    order = (
        db.query(Order)
        .options(
            selectinload(Order.items)
            .selectinload(OrderItem.product)
            .selectinload(Product.images)
        )
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pesanan dengan ID {order_id} tidak ditemukan",
        )

    # Proteksi Kepemilikan: Jika pesanan dibuat oleh akun terdaftar / Member
    if order.user_id is not None:
        if (
            current_user is not None
            and order.user_id != current_user.id
            and current_user.role != "ADMIN"
            and current_user.role != UserRole.ADMIN
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Akses ditolak: Pesanan ini milik akun pengguna lain.",
            )

    return order
