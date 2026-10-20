from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import Product
from schemas import ProductResponse

router = APIRouter(prefix="/api/v1/products", tags=["Products"])


@router.get("", response_model=List[ProductResponse])
@router.get("/", response_model=List[ProductResponse], include_in_schema=False)
def get_products(db: Session = Depends(get_db)):
    """
    Mengambil seluruh daftar produk menggunakan Eager Loading (selectinload)
    untuk mencegah N+1 query problem pada relasi product_images, diurutkan
    berdasarkan tanggal terbaru (created_at DESC).
    """
    products = (
        db.query(Product)
        .options(selectinload(Product.images))
        .order_by(Product.created_at.desc())
        .all()
    )
    return products


@router.get("/{id}", response_model=ProductResponse)
def get_product(id: UUID, db: Session = Depends(get_db)):
    """
    Mengambil detail produk spesifik berdasarkan UUID beserta galeri gambarnya
    menggunakan Eager Loading (selectinload).
    """
    product = (
        db.query(Product)
        .options(selectinload(Product.images))
        .filter(Product.id == id)
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produk dengan ID {id} tidak ditemukan",
        )
    return product
