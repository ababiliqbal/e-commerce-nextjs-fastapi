from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import Order, User, UserRole
from schemas import (
    CityDTO,
    ProvinceDTO,
    ShipmentTrackingResponse,
    ShippingRateRequest,
    ShippingRateResponse,
)
from security import get_optional_user
from logistics import (
    COURIER_META,
    build_tracking_manifest,
    calculate_shipping_rates,
    get_all_provinces,
    get_cities,
)

router = APIRouter(prefix="/api/v1/logistics", tags=["Logistics & 3PL"])


@router.get("/provinces", response_model=List[ProvinceDTO], status_code=status.HTTP_200_OK)
def list_provinces():
    """Mengambil daftar seluruh provinsi di Indonesia yang didukung sistem pengiriman."""
    return get_all_provinces()


@router.get("/cities", response_model=List[CityDTO], status_code=status.HTTP_200_OK)
def list_cities(
    province_id: Optional[str] = Query(None, description="Filter berdasarkan ID Provinsi"),
    search: Optional[str] = Query(None, description="Pencarian nama kota atau kabupaten"),
):
    """Mengambil daftar kota/kabupaten tujuan dengan filter opsional provinsi atau pencarian nama."""
    return get_cities(province_id=province_id, search=search)


@router.post("/rates", response_model=ShippingRateResponse, status_code=status.HTTP_200_OK)
async def get_shipping_rates(payload: ShippingRateRequest):
    """Menghitung tarif ongkos kirim dinamis untuk ekspedisi (JNE, J&T, SiCepat, POS)

    berdasarkan kota tujuan dan bobot total belanjaan (gram).
    Mendukung integrasi live RajaOngkir API dan fallback otomatis ke Built-in Deterministic Engine.
    """
    return await calculate_shipping_rates(
        destination_city_id=payload.destination_city_id,
        weight_grams=payload.weight_grams,
        courier_code=payload.courier_code,
    )


@router.get(
    "/track/{order_id}",
    response_model=ShipmentTrackingResponse,
    status_code=status.HTTP_200_OK,
)
def track_shipment(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Melacak riwayat manifes perjalanan paket dan nomor resi pengiriman berdasarkan ID Pesanan.

    Menerapkan isolasi kepemilikan: pelanggan terdaftar hanya dapat melacak pesanan miliknya,
    kecuali diakses oleh Admin atau merupakan pesanan pelanggan tamu (guest).
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pesanan dengan ID {order_id} tidak ditemukan.",
        )

    # Validasi Hak Akses (Customer vs Admin vs Guest)
    if order.user_id is not None:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Autentikasi diperlukan untuk melacak pesanan milik akun terdaftar.",
            )
        if (
            order.user_id != current_user.id
            and current_user.role != "ADMIN"
            and current_user.role != UserRole.ADMIN
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Akses ditolak: Anda tidak memiliki wewenang untuk melihat data pesanan ini.",
            )

    courier_key = (order.courier_code or "").strip().lower()
    courier_display = COURIER_META.get(courier_key, {}).get("name", (order.courier_code or "Kurir").upper())

    manifest = build_tracking_manifest(order)

    dest_parts = [order.customer_name]
    if order.shipping_city_name:
        dest_parts.append(order.shipping_city_name)
    if order.shipping_province:
        dest_parts.append(order.shipping_province)
    destination_str = ", ".join(dest_parts)

    return ShipmentTrackingResponse(
        order_id=order.id,
        tracking_number=order.tracking_number,
        courier_code=order.courier_code,
        courier_name=courier_display,
        courier_service=order.courier_service,
        shipping_etd=order.shipping_etd,
        status=order.status,
        origin="Warehouse Amba Shop - Jakarta Pusat",
        destination=destination_str,
        shipped_at=order.shipped_at,
        completed_at=order.completed_at,
        manifest=manifest,
    )
