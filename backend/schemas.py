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
    is_active: bool = True
    created_at: datetime
    image_url: Optional[str] = None
    images: List[ProductImageResponse] = []

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
    shipping_address: str
    items: List[CheckoutItemRequest] = Field(..., min_length=1)

    model_config = ConfigDict(from_attributes=True)

    @field_validator("customer_name", "customer_phone", "shipping_address")
    @classmethod
    def validate_no_html_tags(cls, value: str) -> str:
        if "<" in value or ">" in value:
            raise ValueError("Karakter tidak valid terdeteksi.")
        return value


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
    shipping_address: str
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
# Admin CMS & Analytics Schemas (V1.3.0)
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

    model_config = ConfigDict(from_attributes=True)


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
