from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class ProductResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    price: float
    stock_quantity: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CheckoutItemRequest(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)


class CheckoutRequest(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: str
    items: List[CheckoutItemRequest] = Field(..., min_length=1)

    @field_validator("customer_name", "customer_phone", "shipping_address")
    @classmethod
    def validate_no_html_tags(cls, value: str) -> str:
        if "<" in value or ">" in value:
            raise ValueError("Karakter tidak valid terdeteksi.")
        return value


class OrderItemResponse(BaseModel):
    product_id: UUID
    quantity: int
    price_at_purchase: float

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: UUID
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: str
    total_amount: float
    status: str
    payment_gateway_ref: Optional[str] = None
    created_at: datetime
    items: List[OrderItemResponse]

    model_config = {"from_attributes": True}


class MidtransWebhookPayload(BaseModel):
    order_id: str
    status_code: str
    gross_amount: str
    signature_key: str
    transaction_status: str
    fraud_status: Optional[str] = None

    model_config = {"extra": "ignore"}

