"""Seed the database with the catalogue the site has always served.

``seed_data.json`` was extracted programmatically from the nine products that
were hardcoded in ``js/main.js``, so the seeded catalogue matches what the
storefront displayed before it began reading from the API.

Run after applying migrations::

    alembic upgrade head
    python seed.py

Idempotent: products are matched on their slug and updated in place, so running
it twice does not duplicate anything.
"""

from __future__ import annotations

import json
import os
import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import crud, models, schemas  # noqa: E402
from app.database import SessionLocal  # noqa: E402

SEED_FILE = Path(__file__).resolve().parent / "seed_data.json"

# Demo accounts. Passwords may be overridden by the environment; the defaults
# exist so a fresh clone is usable immediately and are documented in the README.
ADMIN_PASSWORD = os.environ.get("SEED_ADMIN_PASSWORD", "admin-password-123")
CUSTOMER_PASSWORD = os.environ.get("SEED_CUSTOMER_PASSWORD", "customer-password-123")

# The four reviews the admin page used to display as hardcoded table rows.
SEED_REVIEWS = [
    ("espresso", 5, "Excellent flavor and aroma!"),
    ("latte", 4, "Very good but a bit too hot."),
    ("cappuccino", 3, "Nice foam but lacked richness."),
    ("chai-latte", 5, "Loved the spice balance."),
]


def seed_products(db) -> tuple[int, int]:
    raw = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    created = updated = 0

    for entry in raw:
        payload = schemas.ProductCreate(
            slug=entry["id"],
            name=entry["name"],
            image=entry.get("image"),
            # str() first: Decimal(float) would carry the float's error in.
            price=Decimal(str(entry["price"])),
            category=entry["category"],
            short_description=entry.get("shortDescription", ""),
            long_description=entry.get("longDescription"),
            options=entry.get("options"),
            featured=bool(entry.get("featured", False)),
            popular=bool(entry.get("popular", False)),
            available=True,
        )

        existing = crud.get_product_by_slug(db, payload.slug)
        if existing is None:
            crud.create_product(db, payload)
            created += 1
        else:
            for field, value in payload.model_dump(exclude={"slug"}).items():
                setattr(existing, field, value)
            updated += 1

    db.commit()
    return created, updated


def seed_users(db) -> tuple[models.User, models.User]:
    admin = crud.get_user_by_username(db, "admin")
    if admin is None:
        admin = crud.create_user(
            db,
            schemas.UserCreate(
                username="admin",
                email="admin@example.com",
                full_name="Site Administrator",
                password=ADMIN_PASSWORD,
            ),
            is_admin=True,
        )
        print("  created admin user 'admin'")
    else:
        print("  admin user 'admin' already present")

    customer = crud.get_user_by_username(db, "sarah")
    if customer is None:
        customer = crud.create_user(
            db,
            schemas.UserCreate(
                username="sarah",
                email="sarah@example.com",
                full_name="Sarah Ali",
                password=CUSTOMER_PASSWORD,
            ),
        )
        print("  created customer user 'sarah'")
    else:
        print("  customer user 'sarah' already present")

    return admin, customer


def seed_reviews(db, author: models.User) -> int:
    added = 0
    for slug, rating, comment in SEED_REVIEWS:
        product = crud.get_product_by_slug(db, slug)
        if product is None:
            continue
        exists = (
            db.query(models.Review)
            .filter(models.Review.user_id == author.id, models.Review.product_id == product.id)
            .first()
        )
        if exists:
            continue
        db.add(models.Review(user_id=author.id, product_id=product.id, rating=rating, comment=comment))
        added += 1
    db.commit()
    return added


def main() -> None:
    if not SEED_FILE.is_file():
        raise SystemExit(f"Seed data not found at {SEED_FILE}")

    with SessionLocal() as db:
        print("Seeding products...")
        created, updated = seed_products(db)
        print(f"  {created} created, {updated} updated")

        print("Seeding users...")
        admin, customer = seed_users(db)

        print("Seeding reviews...")
        added = seed_reviews(db, customer)
        print(f"  {added} added")

    print("\nDone.")
    print(f"  admin    / {ADMIN_PASSWORD}")
    print(f"  sarah    / {CUSTOMER_PASSWORD}")


if __name__ == "__main__":
    main()
