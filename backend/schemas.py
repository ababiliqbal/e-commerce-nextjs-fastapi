from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


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


class OrderItemResponse(BaseModel):
    product_id: UUID
    quantity: int
    price_at_purchase: float

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: UUID
    customer_name: str
    customer_email: str
    total_amount: float
    status: str
    created_at: datetime
    items: List[OrderItemResponse]

    model_config = {"from_attributes": True}
