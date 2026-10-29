"""ORM models.

Changes from the model this replaces:

* ``price`` was ``Integer`` and could not represent $2.99. It is now
  ``Numeric(10, 2)``, which SQLAlchemy returns as ``decimal.Decimal`` and which
  round-trips exactly on SQLite. No money is ever held as a float.
* ``Order`` held a single ``product_id`` and ``quantity``, so it could not
  represent a cart with more than one product - which the checkout UI has always
  allowed the customer to build. It is now an order header with ``OrderItem``
  lines, and each line carries the options (size, milk, extras) the customer
  chose, which previously had nowhere to live at all.
* ``Product`` had no ``relationship()`` back to orders, only a bare foreign key,
  so ``order.product`` did not exist. Both directions are now wired.
"""

from __future__ import annotations

import datetime as dt
import decimal
import enum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


class OrderType(str, enum.Enum):
    pickup = "pickup"
    delivery = "delivery"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    preparing = "preparing"
    ready = "ready"
    completed = "completed"
    cancelled = "cancelled"


class PaymentMethod(str, enum.Enum):
    card = "card"
    applepay = "applepay"
    googlepay = "googlepay"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    orders: Mapped[list["Order"]] = relationship(back_populates="user")
    reviews: Mapped[list["Review"]] = relationship(back_populates="user")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # The stable public identifier the frontend uses in URLs (?id=espresso).
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    # Shown above the English name, the way a Cairo shop sign is lettered.
    name_ar: Mapped[str | None] = mapped_column(String(120))
    image: Mapped[str | None] = mapped_column(String(500))
    price: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    short_description: Mapped[str] = mapped_column(String(300), default="")
    long_description: Mapped[str | None] = mapped_column(Text)
    # {"sizes": [{"name", "price"}], "milk": [str], "sugar": [str],
    #  "extras": [{"name", "price"}]}
    # Held as JSON rather than three more tables: the shape is read whole, never
    # queried into, and is authored per product.
    options: Mapped[dict | None] = mapped_column(JSON)
    featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    popular: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="product")
    reviews: Mapped[list["Review"]] = relationship(back_populates="product", cascade="all, delete-orphan")


class Order(Base):
    """Order header. Money fields are computed server-side, never accepted."""

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)

    order_type: Mapped[OrderType] = mapped_column(Enum(OrderType), nullable=False)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), default=OrderStatus.pending, nullable=False
    )
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), nullable=False)

    contact_name: Mapped[str] = mapped_column(String(120), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(40), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)

    # Present only for delivery orders; enforced by the request schema.
    address_street: Mapped[str | None] = mapped_column(String(200))
    address_city: Mapped[str | None] = mapped_column(String(100))
    address_zip: Mapped[str | None] = mapped_column(String(20))

    subtotal: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    tax: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, index=True
    )

    user: Mapped["User"] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    """One line of an order, including the options chosen for it."""

    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True, nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True, nullable=False)

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    # Copied at purchase time so a later price change does not rewrite history.
    unit_price: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    line_total: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    size: Mapped[str | None] = mapped_column(String(40))
    milk: Mapped[str | None] = mapped_column(String(40))
    # Turkish coffee is ordered by sugar level: sada, 'al-reeha, mazboot, ziyada.
    sugar: Mapped[str | None] = mapped_column(String(40))
    extras: Mapped[list | None] = mapped_column(JSON)
    special_instructions: Mapped[str | None] = mapped_column(String(500))

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="order_items")

    @property
    def product_name(self) -> str | None:
        """Convenience for the admin orders table, which shows names not ids."""
        return self.product.name if self.product else None


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_review_user_product"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True, nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5, enforced by the schema
    comment: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    user: Mapped["User"] = relationship(back_populates="reviews")
    product: Mapped["Product"] = relationship(back_populates="reviews")


class Message(Base):
    """A note sent through the contact form on the About page.

    The form used to show a thank-you toast and discard what was typed. Messages
    are now stored and listed for administrators. There is no email: a reply, if
    any, happens outside the site.
    """

    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, index=True
    )
