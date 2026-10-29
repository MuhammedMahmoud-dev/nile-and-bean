"""Pydantic v2 request and response schemas.

The originals used ``class Config: orm_mode = True``, which is Pydantic v1
syntax against an unpinned dependency that resolves to v2. The v2 spelling is
``model_config = ConfigDict(from_attributes=True)``.

Request schemas validate at the boundary; the original application validated
nothing at all. Notably, no schema here accepts a price or a total - those are
computed server-side, so a client cannot name its own price.
"""

from __future__ import annotations

import datetime as dt
import decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from .models import OrderStatus, OrderType, PaymentMethod

# Alias kept short because it appears on every user-facing schema. EmailStr
# needs the email-validator package, which is pinned in requirements.txt.
Email = EmailStr

# ---------------------------------------------------------------------------
# Users and auth
# ---------------------------------------------------------------------------


class UserBase(BaseModel):
    username: Annotated[str, Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_.-]+$")]
    email: Email
    full_name: Annotated[str | None, Field(default=None, max_length=120)]


class UserCreate(UserBase):
    password: Annotated[str, Field(min_length=8, max_length=128)]


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_admin: bool
    created_at: dt.datetime


class UserAdminUpdate(BaseModel):
    """Fields an administrator may change on another account."""

    full_name: Annotated[str | None, Field(default=None, max_length=120)]
    is_admin: bool | None = None


class Token(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserOut


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------


class ProductBase(BaseModel):
    slug: Annotated[str, Field(min_length=1, max_length=80, pattern=r"^[a-z0-9-]+$")]
    name: Annotated[str, Field(min_length=1, max_length=120)]
    name_ar: Annotated[str | None, Field(default=None, max_length=120)]
    image: Annotated[str | None, Field(default=None, max_length=500)]
    price: Annotated[decimal.Decimal, Field(gt=0, max_digits=10, decimal_places=2)]
    category: Annotated[str, Field(min_length=1, max_length=40)]
    short_description: Annotated[str, Field(default="", max_length=300)]
    long_description: str | None = None
    options: dict[str, Any] | None = None
    featured: bool = False
    popular: bool = False
    available: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    """Every field optional: this backs a PATCH-style partial update."""

    name: Annotated[str | None, Field(default=None, min_length=1, max_length=120)]
    name_ar: Annotated[str | None, Field(default=None, max_length=120)]
    image: Annotated[str | None, Field(default=None, max_length=500)]
    price: Annotated[decimal.Decimal | None, Field(default=None, gt=0, max_digits=10, decimal_places=2)]
    category: Annotated[str | None, Field(default=None, min_length=1, max_length=40)]
    short_description: Annotated[str | None, Field(default=None, max_length=300)]
    long_description: str | None = None
    options: dict[str, Any] | None = None
    featured: bool | None = None
    popular: bool | None = None
    available: bool | None = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------


class OrderItemIn(BaseModel):
    """One requested line. Deliberately carries no price of any kind."""

    product_slug: Annotated[str, Field(min_length=1, max_length=80)]
    quantity: Annotated[int, Field(ge=1, le=99)]
    size: Annotated[str | None, Field(default=None, max_length=40)]
    milk: Annotated[str | None, Field(default=None, max_length=40)]
    sugar: Annotated[str | None, Field(default=None, max_length=40)]
    extras: Annotated[list[str], Field(default_factory=list, max_length=20)]
    special_instructions: Annotated[str | None, Field(default=None, max_length=500)]


class OrderCreate(BaseModel):
    order_type: OrderType
    payment_method: PaymentMethod

    contact_name: Annotated[str, Field(min_length=1, max_length=120)]
    contact_phone: Annotated[str, Field(min_length=5, max_length=40)]
    contact_email: Email

    address_street: Annotated[str | None, Field(default=None, max_length=200)]
    address_city: Annotated[str | None, Field(default=None, max_length=100)]
    address_zip: Annotated[str | None, Field(default=None, max_length=20)]

    items: Annotated[list[OrderItemIn], Field(min_length=1, max_length=50)]

    @model_validator(mode="after")
    def _delivery_requires_an_address(self) -> "OrderCreate":
        if self.order_type is OrderType.delivery:
            missing = [
                name
                for name, value in (
                    ("address_street", self.address_street),
                    ("address_city", self.address_city),
                    ("address_zip", self.address_zip),
                )
                if not (value or "").strip()
            ]
            if missing:
                raise ValueError(
                    "Delivery orders require " + ", ".join(missing)
                )
        return self


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    unit_price: decimal.Decimal
    line_total: decimal.Decimal
    size: str | None
    milk: str | None
    sugar: str | None = None
    extras: list[str] | None
    special_instructions: str | None
    product_name: str | None = None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    order_type: OrderType
    status: OrderStatus
    payment_method: PaymentMethod
    contact_name: str
    contact_phone: str
    contact_email: str
    address_street: str | None
    address_city: str | None
    address_zip: str | None
    subtotal: decimal.Decimal
    tax: decimal.Decimal
    total: decimal.Decimal
    created_at: dt.datetime
    items: list[OrderItemOut]


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rating: int
    comment: str | None
    created_at: dt.datetime
    user_id: int
    product_id: int
    # Flattened for the admin table, which shows names rather than ids.
    user_name: str | None = None
    product_name: str | None = None

    @field_validator("rating")
    @classmethod
    def _rating_in_range(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("rating must be between 1 and 5")
        return v


class PasswordResetOut(BaseModel):
    """Returned once, to the administrator who performed the reset.

    There is no email, so the temporary password is handed to the admin to pass
    on. It is never stored in plain text and cannot be retrieved again.
    """

    user_id: int
    username: str
    temporary_password: str


# ---------------------------------------------------------------------------
# Contact messages
# ---------------------------------------------------------------------------


class MessageCreate(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=120)]
    email: Email
    body: Annotated[str, Field(min_length=1, max_length=4000)]


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    body: str
    is_read: bool
    created_at: dt.datetime


class MessageUpdate(BaseModel):
    is_read: bool
