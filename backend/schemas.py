from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============================================================================
# Product & Image Schemas
# ============================================================================


class ProductImageResponse(BaseModel):
    id: UUID
    image_url: str
    is_primary: bool = False
    display_order: int = 0

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    price: float
    stock_quantity: int
    weight_grams: int = Field(default=1000, gt=0, le=100000)
    is_active: bool = True
    created_at: datetime
    image_url: Optional[str] = None
    images: List[ProductImageResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Logistics & 3PL Schemas (V2.0.0)
# ============================================================================


class ProvinceDTO(BaseModel):
    province_id: str
    province_name: str

    model_config = ConfigDict(from_attributes=True)


class CityDTO(BaseModel):
    city_id: str
    province_id: str
    province_name: str
    city_name: str
    type: str
    postal_code: str

    model_config = ConfigDict(from_attributes=True)


class ShippingServiceOptionDTO(BaseModel):
    service: str
    description: str
    cost: float
    etd: str

    model_config = ConfigDict(from_attributes=True)


class ShippingRateRequest(BaseModel):
    destination_city_id: str
    weight_grams: int = Field(..., gt=0, le=500000)
    courier_code: str = Field(..., description="jne | jnt | sicepat | pos")

    @field_validator("courier_code")
    @classmethod
    def validate_courier_code(cls, value: str) -> str:
        clean = value.strip().lower()
        if clean not in ("jne", "jnt", "sicepat", "pos"):
            raise ValueError("courier_code harus salah satu dari: jne, jnt, sicepat, pos.")
        return clean

    @field_validator("destination_city_id")
    @classmethod
    def validate_destination_city_id(cls, value: str) -> str:
        clean = value.strip()
        if "<" in clean or ">" in clean:
            raise ValueError("Karakter tidak valid terdeteksi.")
        if not clean:
            raise ValueError("destination_city_id tidak boleh kosong.")
        return clean


class ShippingRateResponse(BaseModel):
    origin_city: str
    destination_city: CityDTO
    weight_grams: int
    chargeable_weight_kg: int
    courier_code: str
    courier_name: str
    services: List[ShippingServiceOptionDTO]
    provider_mode: str = "BUILTIN_ENGINE"  # "LIVE_RAJAONGKIR" or "BUILTIN_ENGINE"

    model_config = ConfigDict(from_attributes=True)


class TrackingManifestItemDTO(BaseModel):
    timestamp: str
    status_title: str
    description: str
    city: str
    is_current: bool = False

    model_config = ConfigDict(from_attributes=True)


class ShipmentTrackingResponse(BaseModel):
    order_id: UUID
    tracking_number: Optional[str] = None
    courier_code: Optional[str] = None
    courier_name: str
    courier_service: Optional[str] = None
    shipping_etd: Optional[str] = None
    status: str
    origin: str
    destination: str
    shipped_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    manifest: List[TrackingManifestItemDTO] = []

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Identity & Access Management (IAM) / Auth Schemas
# ============================================================================


class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=3)
    email: str
    password: str = Field(..., min_length=8)

    model_config = ConfigDict(from_attributes=True)

    @field_validator("full_name")
    @classmethod
    def validate_no_html_tags(cls, value: str) -> str:
        if "<" in value or ">" in value:
            raise ValueError("Karakter tidak valid terdeteksi.")
        return value


class UserLoginRequest(BaseModel):
    email: str
    password: str

    model_config = ConfigDict(from_attributes=True)


class GoogleAuthRequest(BaseModel):
    id_token: str

    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    auth_provider: str
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Checkout & Order Schemas
# ============================================================================


class CheckoutItemRequest(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)

    model_config = ConfigDict(from_attributes=True)


class CheckoutRequest(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_province: Optional[str] = None
    shipping_city_id: str = Field(..., min_length=1)
    shipping_city_name: Optional[str] = None
    shipping_postal_code: Optional[str] = None
    shipping_address: str
    courier_code: str = Field(..., description="jne | jnt | sicepat | pos")
    courier_service: str = Field(..., min_length=1, description="e.g. REG, YES, BEST, ECO")
    items: List[CheckoutItemRequest] = Field(..., min_length=1)

    model_config = ConfigDict(from_attributes=True)

    @field_validator(
        "customer_name",
        "customer_phone",
        "shipping_address",
        "shipping_province",
        "shipping_city_id",
        "shipping_city_name",
        "shipping_postal_code",
        "courier_code",
        "courier_service",
    )
    @classmethod
    def validate_no_html_tags(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and ("<" in value or ">" in value):
            raise ValueError("Karakter tidak valid (< atau >) terdeteksi.")
        return value

    @field_validator("courier_code")
    @classmethod
    def validate_courier_code(cls, value: str) -> str:
        clean = value.strip().lower()
        if clean not in ("jne", "jnt", "sicepat", "pos"):
            raise ValueError("courier_code harus salah satu dari: jne, jnt, sicepat, pos.")
        return clean


class OrderItemResponse(BaseModel):
    id: Optional[UUID] = None
    product_id: UUID
    product_name: Optional[str] = None
    product_image: Optional[str] = None
    quantity: int
    price_at_purchase: float

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_province: Optional[str] = None
    shipping_city_id: Optional[str] = None
    shipping_city_name: Optional[str] = None
    shipping_postal_code: Optional[str] = None
    shipping_address: str
    courier_code: Optional[str] = None
    courier_service: Optional[str] = None
    shipping_etd: Optional[str] = None
    shipping_weight_grams: int = 1000
    shipping_cost: float = 0.0
    tracking_number: Optional[str] = None
    shipped_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_amount: float
    status: str
    payment_gateway_ref: Optional[str] = None
    created_at: datetime
    items: List[OrderItemResponse]

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Webhook Schemas
# ============================================================================


class MidtransWebhookPayload(BaseModel):
    order_id: str
    status_code: str
    gross_amount: str
    signature_key: str
    transaction_status: str
    fraud_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, extra="ignore")


# ============================================================================
# Admin CMS & Analytics Schemas (V1.3.0 & V2.0.0)
# ============================================================================


class ProductImageWriteItem(BaseModel):
    image_url: str
    is_primary: bool = False
    display_order: int = 0

    model_config = ConfigDict(from_attributes=True)


class ProductAdminWriteRequest(BaseModel):
    name: str = Field(..., min_length=3)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    stock_quantity: int = Field(..., ge=0)
    weight_grams: int = Field(default=1000, gt=0, le=100000)
    is_active: bool = True
    image_url: Optional[str] = None
    images: List[ProductImageWriteItem] = []

    model_config = ConfigDict(from_attributes=True)

    @field_validator("name")
    @classmethod
    def validate_no_html_tags(cls, value: str) -> str:
        if "<" in value or ">" in value:
            raise ValueError("Karakter tidak valid (< atau >) terdeteksi.")
        return value


class OrderStatusUpdateRequest(BaseModel):
    status: str
    tracking_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("status", "tracking_number")
    @classmethod
    def validate_no_html_tags(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            if "<" in value or ">" in value:
                raise ValueError("Karakter tidak valid (< atau >) terdeteksi.")
            if len(value) > 100:
                raise ValueError("Panjang teks melebihi batas 100 karakter.")
        return value


class ImageUploadResponse(BaseModel):
    image_url: str
    filename: str
    content_type: str
    size_bytes: int

    model_config = ConfigDict(from_attributes=True)


class LowStockProductItem(BaseModel):
    id: UUID
    name: str
    stock_quantity: int
    price: float
    image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TopSellingProductItem(BaseModel):
    product_id: UUID
    name: str
    total_sold: int
    total_revenue: float

    model_config = ConfigDict(from_attributes=True)


class AdminAnalyticsResponse(BaseModel):
    total_revenue: float
    total_orders: int
    orders_by_status: Dict[str, int]
    conversion_rate: float
    active_products_count: int
    archived_products_count: int
    low_stock_products: List[LowStockProductItem]
    top_selling_products: List[TopSellingProductItem]

    model_config = ConfigDict(from_attributes=True)
