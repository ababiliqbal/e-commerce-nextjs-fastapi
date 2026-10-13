from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class ProductResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    price: float
    stock_quantity: int
    created_at: datetime

    model_config = {"from_attributes": True}
