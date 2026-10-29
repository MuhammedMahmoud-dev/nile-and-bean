"""Database operations and the authoritative pricing rules.

Order totals are computed here, from the product rows, on every order. The
client sends what it wants and in what quantity; it never sends a price, and any
price it did send would be ignored. The frontend keeps its own copy of the same
arithmetic only to preview a total before submitting.
"""

from __future__ import annotations

import decimal
from decimal import Decimal

from sqlalchemy.orm import Session, selectinload

from . import models, schemas
from .config import TAX_RATE
from .security import hash_password, verify_password

CENTS = Decimal("0.01")


def money(value: Decimal) -> Decimal:
    """Round to cents, half-up - the convention people expect for money.

    Decimal's default is ROUND_HALF_EVEN, which would turn $0.125 into $0.12.
    """
    return value.quantize(CENTS, rounding=decimal.ROUND_HALF_UP)


class PricingError(ValueError):
    """A requested option does not exist on the product."""


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


def get_user_by_username(db: Session, username: str) -> models.User | None:
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate, is_admin: bool = False) -> models.User:
    db_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hash_password(user.password),
        is_admin=is_admin,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, username: str, password: str) -> models.User | None:
    user = get_user_by_username(db, username)
    if user is None:
        # Hash anyway, so a missing username and a wrong password take a
        # comparable amount of time and cannot be told apart by timing.
        hash_password(password)
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def list_users(db: Session) -> list[models.User]:
    return db.query(models.User).order_by(models.User.id).all()


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------


def list_products(
    db: Session, category: str | None = None, include_unavailable: bool = False
) -> list[models.Product]:
    query = db.query(models.Product)
    if category and category != "all":
        query = query.filter(models.Product.category == category)
    if not include_unavailable:
        query = query.filter(models.Product.available.is_(True))
    return query.order_by(models.Product.id).all()


def get_product_by_slug(db: Session, slug: str) -> models.Product | None:
    return db.query(models.Product).filter(models.Product.slug == slug).first()


def get_product(db: Session, product_id: int) -> models.Product | None:
    return db.get(models.Product, product_id)


def create_product(db: Session, data: schemas.ProductCreate) -> models.Product:
    product = models.Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(
    db: Session, product: models.Product, data: schemas.ProductUpdate
) -> models.Product:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product: models.Product) -> None:
    db.delete(product)
    db.commit()


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------


def unit_price(product: models.Product, size: str | None, extras: list[str]) -> Decimal:
    """Price of one unit including the chosen size and extras.

    Unknown options are rejected rather than ignored. Silently dropping an
    unrecognised extra would let a client pay the base price for it.
    """
    total = Decimal(product.price)
    options = product.options or {}

    if size:
        sizes = options.get("sizes") or []
        match = next((s for s in sizes if s.get("name") == size), None)
        if match is None:
            raise PricingError(f"{product.name} has no size {size!r}")
        total += Decimal(str(match.get("price", 0)))

    if extras:
        available = options.get("extras") or []
        by_name = {e.get("name"): e for e in available}
        for extra in extras:
            match = by_name.get(extra)
            if match is None:
                raise PricingError(f"{product.name} has no extra {extra!r}")
            total += Decimal(str(match.get("price", 0)))

    return money(total)


def _validate_choice(product: models.Product, key: str, label: str, value: str | None) -> None:
    """Free choices (milk, sugar) must still be ones the product offers."""
    if value is None:
        return
    choices = (product.options or {}).get(key) or []
    if value not in choices:
        raise PricingError(f"{product.name} has no {label} option {value!r}")


def validate_milk(product: models.Product, milk: str | None) -> None:
    _validate_choice(product, "milk", "milk", milk)


def validate_sugar(product: models.Product, sugar: str | None) -> None:
    _validate_choice(product, "sugar", "sugar", sugar)


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------


def create_order(db: Session, user: models.User, data: schemas.OrderCreate) -> models.Order:
    """Build an order, pricing every line from the database.

    Raises PricingError for an unknown product or an option the product does not
    offer; the router turns that into a 400.
    """
    items: list[models.OrderItem] = []
    subtotal = Decimal("0.00")

    for line in data.items:
        product = get_product_by_slug(db, line.product_slug)
        if product is None:
            raise PricingError(f"No such product: {line.product_slug!r}")
        if not product.available:
            raise PricingError(f"{product.name} is not currently available")

        validate_milk(product, line.milk)
        validate_sugar(product, line.sugar)
        price = unit_price(product, line.size, line.extras)
        line_total = money(price * line.quantity)
        subtotal += line_total

        items.append(
            models.OrderItem(
                product_id=product.id,
                quantity=line.quantity,
                unit_price=price,
                line_total=line_total,
                size=line.size,
                milk=line.milk,
                sugar=line.sugar,
                extras=line.extras or None,
                special_instructions=line.special_instructions,
            )
        )

    subtotal = money(subtotal)
    tax = money(subtotal * TAX_RATE)
    total = money(subtotal + tax)

    order = models.Order(
        user_id=user.id,
        order_type=data.order_type,
        payment_method=data.payment_method,
        contact_name=data.contact_name,
        contact_phone=data.contact_phone,
        contact_email=data.contact_email,
        address_street=data.address_street,
        address_city=data.address_city,
        address_zip=data.address_zip,
        subtotal=subtotal,
        tax=tax,
        total=total,
        items=items,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def _orders_query(db: Session):
    # Load the lines and their products up front: the admin table renders a
    # product name per line, which would otherwise be one query each.
    return db.query(models.Order).options(
        selectinload(models.Order.items).selectinload(models.OrderItem.product)
    )


def list_orders_for_user(db: Session, user_id: int) -> list[models.Order]:
    return (
        _orders_query(db)
        .filter(models.Order.user_id == user_id)
        .order_by(models.Order.created_at.desc())
        .all()
    )


def list_all_orders(db: Session) -> list[models.Order]:
    return _orders_query(db).order_by(models.Order.created_at.desc()).all()


def get_order(db: Session, order_id: int) -> models.Order | None:
    return db.get(models.Order, order_id)


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------


def list_reviews(db: Session) -> list[models.Review]:
    return (
        db.query(models.Review)
        .options(selectinload(models.Review.user), selectinload(models.Review.product))
        .order_by(models.Review.created_at.desc())
        .all()
    )


def get_review(db: Session, review_id: int) -> models.Review | None:
    return db.get(models.Review, review_id)


def delete_review(db: Session, review: models.Review) -> None:
    db.delete(review)
    db.commit()
