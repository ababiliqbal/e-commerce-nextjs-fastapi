from contextlib import asynccontextmanager
from decimal import Decimal
from typing import List
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Order, OrderItem, OrderStatus, Product
from schemas import (
    CheckoutRequest,
    OrderResponse,
    ProductResponse,
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

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    # a. Validasi bahwa items tidak kosong
    if not request.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keranjang belanja tidak boleh kosong",
        )

    try:
        total_amount = Decimal("0.00")
        order_items_to_create = []

        # b. Untuk setiap item di request, query Product dari database menggunakan .with_for_update()
        for item in request.items:
            product = (
                db.query(Product)
                .filter(Product.id == item.product_id)
                .with_for_update()
                .first()
            )

            # c. Jika produk tidak ditemukan, lempar HTTPException(status_code=404)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Produk dengan ID {item.product_id} tidak ditemukan",
                )

            # d. Jika product.stock_quantity < item.quantity, lempar HTTPException(status_code=400, detail=f"Stok produk {product.name} tidak mencukupi")
            if product.stock_quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stok produk {product.name} tidak mencukupi",
                )

            # e. Kurangi product.stock_quantity sebesar item.quantity
            product.stock_quantity -= item.quantity

            # f. Hitung harga menggunakan product.price dari database (Zero-Trust Pricing) dan akumulasikan ke total_amount
            item_price = Decimal(str(product.price))
            total_amount += item_price * item.quantity

            order_items_to_create.append(
                OrderItem(
                    product_id=product.id,
                    quantity=item.quantity,
                    price_at_purchase=item_price,
                )
            )

        # g. Buat record Order baru (status default PENDING) dan record OrderItem terkait
        new_order = Order(
            customer_name=request.customer_name,
            customer_email=request.customer_email,
            customer_phone=request.customer_phone,
            shipping_address=request.shipping_address,
            total_amount=total_amount,
            status=OrderStatus.PENDING.value,
            items=order_items_to_create,
        )

        db.add(new_order)

        # h. Lakukan db.commit() dan db.refresh(new_order), lalu return new_order. Jika terjadi error di tengah jalan, pastikan db.rollback() dieksekusi.
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
