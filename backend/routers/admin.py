from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import String, func, or_
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import Order, OrderItem, OrderStatus, Product, ProductImage
from schemas import (
    AdminAnalyticsResponse,
    ImageUploadResponse,
    LowStockProductItem,
    OrderStatusUpdateRequest,
    OrderResponse,
    ProductAdminWriteRequest,
    ProductResponse,
    TopSellingProductItem,
)
from security import require_role
from storage import upload_image_to_supabase

try:
    from main import limiter
except ImportError:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address)

# Terapkan dependency guard di level router untuk membatasi seluruh rute hanya untuk ADMIN
router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin"],
    dependencies=[Depends(require_role("ADMIN"))],
)

# Definisi Finite State Machine (FSM) Siklus Hidup Pesanan
FSM_ALLOWED_TRANSITIONS = {
    OrderStatus.PENDING.value: [OrderStatus.PAID.value, OrderStatus.CANCELLED.value],
    OrderStatus.PAID.value: [OrderStatus.SHIPPED.value],
    OrderStatus.SHIPPED.value: [OrderStatus.COMPLETED.value],
    OrderStatus.COMPLETED.value: [],
    OrderStatus.CANCELLED.value: [],
}


# ============================================================================
# 1. Ringkasan Analitik Eksekutif (Executive Analytics Summary)
# ============================================================================


@router.get("/analytics/summary", response_model=AdminAnalyticsResponse)
def get_analytics_summary(db: Session = Depends(get_db)):
    """Menghitung metrik analitik eksekutif secara real-time menggunakan agregasi SQL murni:

    - Total Revenue: Akumulasi total_amount pesanan berstatus PAID, SHIPPED, COMPLETED.
    - Total Orders: Akumulasi seluruh pesanan.
    - Orders by Status: Distribusi jumlah pesanan per status siklus hidup.
    - Conversion Rate: Persentase pesanan berhasil dibayar / dikirim / selesai.
    - Active & Archived Products Count: Jumlah produk aktif vs diarsipkan.
    - Low-Stock Alert: Daftar produk dengan stok menipis (<= 5).
    - Top 5 Best-Selling Products: 5 produk terlaris berdasarkan kuantitas terjual.
    """
    revenue_statuses = [
        OrderStatus.PAID.value,
        OrderStatus.SHIPPED.value,
        OrderStatus.COMPLETED.value,
    ]

    # 1. Total Revenue (hanya pesanan lunas)
    total_rev = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(Order.status.in_(revenue_statuses))
        .scalar()
    )
    total_revenue = float(total_rev or 0.0)

    # 2. Total seluruh pesanan
    total_orders = db.query(func.count(Order.id)).scalar() or 0

    # 3. Distribusi pesanan per status
    status_counts_rows = (
        db.query(Order.status, func.count(Order.id))
        .group_by(Order.status)
        .all()
    )
    orders_by_status = {
        "PENDING": 0,
        "PAID": 0,
        "SHIPPED": 0,
        "COMPLETED": 0,
        "CANCELLED": 0,
    }
    for st, count in status_counts_rows:
        orders_by_status[st] = int(count)

    # 4. Rasio Konversi Pesanan (%)
    fulfilled_orders_count = (
        orders_by_status.get("PAID", 0)
        + orders_by_status.get("SHIPPED", 0)
        + orders_by_status.get("COMPLETED", 0)
    )
    conversion_rate = (
        round((fulfilled_orders_count / total_orders) * 100, 2)
        if total_orders > 0
        else 0.0
    )

    # 5. Jumlah produk aktif vs diarsipkan
    active_products_count = (
        db.query(func.count(Product.id))
        .filter(Product.is_active == True)
        .scalar()
        or 0
    )
    archived_products_count = (
        db.query(func.count(Product.id))
        .filter(Product.is_active == False)
        .scalar()
        or 0
    )

    # 6. Peringatan Stok Menipis (stok <= 5)
    low_stock_query = (
        db.query(Product)
        .filter(Product.stock_quantity <= 5)
        .order_by(Product.stock_quantity.asc())
        .all()
    )
    low_stock_products = [
        LowStockProductItem(
            id=p.id,
            name=p.name,
            stock_quantity=p.stock_quantity,
            price=float(p.price),
            image_url=p.image_url,
        )
        for p in low_stock_query
    ]

    # 7. Top 5 Produk Terlaris
    top_selling_rows = (
        db.query(
            Product.id.label("product_id"),
            Product.name,
            func.sum(OrderItem.quantity).label("total_sold"),
            func.sum(OrderItem.quantity * OrderItem.price_at_purchase).label("total_revenue"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status.in_(revenue_statuses))
        .group_by(Product.id, Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
        .all()
    )
    top_selling_products = [
        TopSellingProductItem(
            product_id=row.product_id,
            name=row.name,
            total_sold=int(row.total_sold or 0),
            total_revenue=float(row.total_revenue or 0.0),
        )
        for row in top_selling_rows
    ]

    return AdminAnalyticsResponse(
        total_revenue=total_revenue,
        total_orders=total_orders,
        orders_by_status=orders_by_status,
        conversion_rate=conversion_rate,
        active_products_count=active_products_count,
        archived_products_count=archived_products_count,
        low_stock_products=low_stock_products,
        top_selling_products=top_selling_products,
    )


# ============================================================================
# 2. Unggah Berkas Gambar ke Cloud Storage (Cloud Image Upload)
# ============================================================================


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    response_model=ImageUploadResponse,
)
@limiter.limit("20/minute")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
):
    """Mengunggah berkas foto produk ke Supabase Storage REST API secara asinkron

    dengan batasan rate-limit 20 request/menit.
    """
    result = await upload_image_to_supabase(file)
    return result


# ============================================================================
# 3. CRUD Produk & Galeri Multi-Gambar (Product Catalog Management)
# ============================================================================


@router.get("/products", response_model=List[ProductResponse])
def get_admin_products(
    include_inactive: bool = True,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Mengambil seluruh daftar produk (termasuk produk diarsipkan / is_active=False)

    beserta galeri gambar menggunakan selectinload.
    """
    query = db.query(Product).options(selectinload(Product.images))

    if not include_inactive:
        query = query.filter(Product.is_active == True)

    if search and search.strip():
        query = query.filter(Product.name.ilike(f"%{search.strip()}%"))

    return query.order_by(Product.created_at.desc()).all()


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_admin_product(
    payload: ProductAdminWriteRequest,
    db: Session = Depends(get_db),
):
    """Membuat produk baru beserta susunan galeri gambar product_images secara atomik."""
    primary_image_url = None
    if payload.images:
        primary_item = next(
            (img for img in payload.images if img.is_primary and img.image_url and img.image_url.strip()),
            None,
        )
        if not primary_item and payload.images:
            primary_item = next(
                (img for img in payload.images if img.image_url and img.image_url.strip()),
                None,
            )
        if primary_item:
            primary_image_url = primary_item.image_url.strip()

    if not primary_image_url and payload.image_url and payload.image_url.strip():
        primary_image_url = payload.image_url.strip()

    new_product = Product(
        name=payload.name,
        description=payload.description,
        price=Decimal(str(payload.price)),
        stock_quantity=payload.stock_quantity,
        is_active=payload.is_active,
        image_url=primary_image_url,
    )
    db.add(new_product)
    db.flush()

    # Tambahkan galeri multi-gambar
    has_primary = any(img.is_primary for img in payload.images)
    for idx, img in enumerate(payload.images):
        clean_url = img.image_url.strip() if img.image_url else ""
        is_prim = (
            img.is_primary
            if has_primary
            else (clean_url == primary_image_url if primary_image_url else idx == 0)
        )
        prod_img = ProductImage(
            product_id=new_product.id,
            image_url=clean_url,
            is_primary=is_prim,
            display_order=img.display_order if img.display_order is not None else idx,
        )
        db.add(prod_img)

    db.commit()
    db.refresh(new_product)
    return new_product


@router.put("/products/{id}", response_model=ProductResponse)
def update_admin_product(
    id: UUID,
    payload: ProductAdminWriteRequest,
    db: Session = Depends(get_db),
):
    """Memperbarui informasi produk, status aktif, dan menyinkronkan galeri gambar secara atomik."""
    product = (
        db.query(Product)
        .options(selectinload(Product.images))
        .filter(Product.id == id)
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produk dengan ID {id} tidak ditemukan.",
        )

    product.name = payload.name
    product.description = payload.description
    product.price = Decimal(str(payload.price))
    product.stock_quantity = payload.stock_quantity
    product.is_active = payload.is_active

    # Tentukan primary image URL
    primary_image_url = None
    if payload.images:
        primary_item = next(
            (img for img in payload.images if img.is_primary and img.image_url and img.image_url.strip()),
            None,
        )
        if not primary_item and payload.images:
            primary_item = next(
                (img for img in payload.images if img.image_url and img.image_url.strip()),
                None,
            )
        if primary_item:
            primary_image_url = primary_item.image_url.strip()

    if not primary_image_url and payload.image_url and payload.image_url.strip():
        primary_image_url = payload.image_url.strip()

    product.image_url = primary_image_url

    # Sinkronisasi koleksi product_images secara atomik
    db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
    has_primary = any(img.is_primary for img in payload.images)
    for idx, img in enumerate(payload.images):
        clean_url = img.image_url.strip() if img.image_url else ""
        is_prim = (
            img.is_primary
            if has_primary
            else (clean_url == primary_image_url if primary_image_url else idx == 0)
        )
        prod_img = ProductImage(
            product_id=product.id,
            image_url=clean_url,
            is_primary=is_prim,
            display_order=img.display_order if img.display_order is not None else idx,
        )
        db.add(prod_img)

    db.commit()

    # Re-fetch dengan eager loading untuk response yang konsisten
    updated_product = (
        db.query(Product)
        .options(selectinload(Product.images))
        .filter(Product.id == product.id)
        .first()
    )
    return updated_product


@router.delete("/products/{id}")
def delete_admin_product(
    id: UUID,
    db: Session = Depends(get_db),
):
    """Melakukan Soft Delete produk (mengubah is_active = False) tanpa menghapus baris fisik

    sehingga relasi kunci asing ke order_items tetap utuh.
    """
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produk dengan ID {id} tidak ditemukan.",
        )

    product.is_active = False
    db.commit()
    return {
        "status": "archived",
        "product_id": str(product.id),
        "is_active": False,
        "message": f"Produk '{product.name}' berhasil diarsipkan (soft-deleted).",
    }


# ============================================================================
# 4. Manajemen & Pemenuhan Pesanan (Order Fulfillment & FSM)
# ============================================================================


@router.get("/orders", response_model=List[OrderResponse])
def get_admin_orders(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Mengambil daftar seluruh pesanan (Member & Guest) beserta item-itemnya,

    mendukung pemfilteran status dan pencarian Nama/Email/Telepon/ID.
    """
    query = (
        db.query(Order)
        .options(
            selectinload(Order.items)
            .selectinload(OrderItem.product)
            .selectinload(Product.images)
        )
        .order_by(Order.created_at.desc())
    )

    if status_filter:
        norm_status = status_filter.strip().upper()
        if norm_status not in ["ALL", "SEMUA", ""]:
            query = query.filter(Order.status == norm_status)

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Order.customer_name.ilike(search_pattern),
                Order.customer_email.ilike(search_pattern),
                Order.customer_phone.ilike(search_pattern),
                func.cast(Order.id, String).ilike(search_pattern),
            )
        )

    return query.all()


@router.patch("/orders/{id}/status", response_model=OrderResponse)
def update_order_status(
    id: UUID,
    payload: OrderStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    """Memperbarui status pesanan berdasarkan aturan Finite State Machine (FSM):

    - PENDING -> PAID atau CANCELLED
    - PAID -> SHIPPED
    - SHIPPED -> COMPLETED
    - COMPLETED & CANCELLED -> Terminal State (tidak dapat diubah)

    Jika transisi ke CANCELLED, stok produk dikembalikan secara atomik dengan with_for_update().
    """
    order = (
        db.query(Order)
        .options(
            selectinload(Order.items)
            .selectinload(OrderItem.product)
            .selectinload(Product.images)
        )
        .filter(Order.id == id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pesanan dengan ID {id} tidak ditemukan.",
        )

    current_status = order.status.strip().upper()
    target_status = payload.status.strip().upper()

    allowed_targets = FSM_ALLOWED_TRANSITIONS.get(current_status, [])
    if target_status not in allowed_targets:
        allowed_str = (
            ", ".join(allowed_targets)
            if allowed_targets
            else "tidak ada (status akhir/terminal)"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Transisi status pesanan dari '{current_status}' ke '{target_status}' tidak diizinkan. "
                f"Status berikutnya yang diperbolehkan: {allowed_str}."
            ),
        )

    # Rollback stok jika transisi ke CANCELLED
    if target_status == OrderStatus.CANCELLED.value:
        for item in order.items:
            product = (
                db.query(Product)
                .filter(Product.id == item.product_id)
                .with_for_update()
                .first()
            )
            if product:
                product.stock_quantity += item.quantity

    order.status = target_status
    db.commit()
    db.refresh(order)
    return order
