"""Test fixtures.

Every test runs against its own throwaway SQLite file, created from the ORM
metadata and torn down afterwards, so tests never touch a developer's cafe.db
and cannot leak state into one another.
"""

from __future__ import annotations

import sys
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import crud, models, schemas  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def db_session(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_connection, _record):
        cur = dbapi_connection.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db_session):
    """A TestClient wired to the throwaway database."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # the fixture owns the session lifetime

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Data fixtures
# ---------------------------------------------------------------------------

ESPRESSO_OPTIONS = {
    "sizes": [
        {"name": "Single", "price": 0},
        {"name": "Double", "price": 1},
        {"name": "Triple", "price": 2},
    ],
    "extras": [
        {"name": "Extra Shot", "price": 0.99},
        {"name": "Vanilla Syrup", "price": 0.50},
    ],
    "milk": ["Whole", "Oat"],
}


@pytest.fixture()
def espresso(db_session) -> models.Product:
    return crud.create_product(
        db_session,
        schemas.ProductCreate(
            slug="espresso",
            name="Espresso",
            price=Decimal("2.99"),
            category="coffee",
            short_description="Bold and full-bodied",
            options=ESPRESSO_OPTIONS,
        ),
    )


@pytest.fixture()
def croissant(db_session) -> models.Product:
    return crud.create_product(
        db_session,
        schemas.ProductCreate(
            slug="croissant",
            name="Butter Croissant",
            price=Decimal("3.29"),
            category="pastry",
            short_description="Flaky and buttery",
        ),
    )


@pytest.fixture()
def customer(db_session) -> models.User:
    return crud.create_user(
        db_session,
        schemas.UserCreate(
            username="sarah",
            email="sarah@example.com",
            full_name="Sarah Ali",
            password="customer-password",
        ),
    )


@pytest.fixture()
def admin(db_session) -> models.User:
    return crud.create_user(
        db_session,
        schemas.UserCreate(
            username="admin",
            email="admin@example.com",
            full_name="Site Administrator",
            password="admin-password",
        ),
        is_admin=True,
    )


def _token(client: TestClient, username: str, password: str) -> str:
    response = client.post(
        "/api/auth/login", data={"username": username, "password": password}
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture()
def customer_auth(client, customer) -> dict[str, str]:
    return {"Authorization": f"Bearer {_token(client, 'sarah', 'customer-password')}"}


@pytest.fixture()
def admin_auth(client, admin) -> dict[str, str]:
    return {"Authorization": f"Bearer {_token(client, 'admin', 'admin-password')}"}


@pytest.fixture()
def pickup_order_body():
    """A valid order body. Note there is no price field anywhere in it."""

    def build(items):
        return {
            "order_type": "pickup",
            "payment_method": "card",
            "contact_name": "Sarah Ali",
            "contact_phone": "+20 100 555 0123",
            "contact_email": "sarah@example.com",
            "items": items,
        }

    return build
