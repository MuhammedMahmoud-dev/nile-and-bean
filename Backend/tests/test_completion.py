"""The features that made the site work end to end.

Each closes a dead end a reviewer would otherwise hit: an order with no
confirmation, a contact form that discarded what was typed, a password reset
page that posted nowhere, and an Egyptian café that could not take its coffee
the Egyptian way.
"""

from __future__ import annotations

from decimal import Decimal

import pytest

from app import crud, schemas
from app.config import TAX_RATE
from app.crud import PricingError, money


# --- a customer can read back their own order -------------------------------


def _place(client, auth, body):
    response = client.post("/api/orders", json=body, headers=auth)
    assert response.status_code == 201, response.text
    return response.json()


def test_a_customer_can_fetch_their_own_order(
    client, customer_auth, espresso, pickup_order_body
):
    placed = _place(
        client, customer_auth, pickup_order_body([{"product_slug": "espresso", "quantity": 1}])
    )
    response = client.get(f"/api/orders/{placed['id']}", headers=customer_auth)

    assert response.status_code == 200
    assert response.json()["total"] == placed["total"]


def test_another_customers_order_is_not_found_rather_than_forbidden(
    client, db_session, customer_auth, admin, espresso
):
    """404, not 403, so order ids cannot be probed to learn which exist."""
    someone_elses = crud.create_order(
        db_session,
        admin,
        schemas.OrderCreate(
            order_type="pickup",
            payment_method="card",
            contact_name="Site Administrator",
            contact_phone="+20 100 555 9999",
            contact_email="admin@example.com",
            items=[{"product_slug": "espresso", "quantity": 1}],
        ),
    )
    response = client.get(f"/api/orders/{someone_elses.id}", headers=customer_auth)
    assert response.status_code == 404


def test_an_administrator_can_fetch_any_order(
    client, customer_auth, admin_auth, espresso, pickup_order_body
):
    placed = _place(
        client, customer_auth, pickup_order_body([{"product_slug": "espresso", "quantity": 1}])
    )
    assert client.get(f"/api/orders/{placed['id']}", headers=admin_auth).status_code == 200


def test_fetching_an_order_requires_signing_in(client):
    assert client.get("/api/orders/1").status_code == 401


# --- sugar levels -----------------------------------------------------------


@pytest.fixture()
def turkish_coffee(db_session):
    return crud.create_product(
        db_session,
        schemas.ProductCreate(
            slug="turkish-coffee",
            name="Turkish Coffee",
            name_ar="قهوة تركي",
            price=Decimal("45"),
            category="coffee",
            options={
                "sizes": [{"name": "Single", "price": 0}, {"name": "Double", "price": 20}],
                "sugar": ["Sada · no sugar", "Mazboot · medium"],
                "extras": [{"name": "Cardamom", "price": 5}],
            },
        ),
    )


def test_a_sugar_level_is_stored_on_the_line(
    client, customer_auth, turkish_coffee, pickup_order_body
):
    placed = _place(
        client,
        customer_auth,
        pickup_order_body(
            [{"product_slug": "turkish-coffee", "quantity": 2, "size": "Double",
              "sugar": "Mazboot · medium", "extras": ["Cardamom"]}]
        ),
    )
    line = placed["items"][0]

    assert line["sugar"] == "Mazboot · medium"
    assert Decimal(line["unit_price"]) == Decimal("70")  # 45 + 20 + 5
    assert Decimal(placed["subtotal"]) == Decimal("140")
    assert Decimal(placed["total"]) == Decimal("140") + money(Decimal("140") * TAX_RATE)


def test_a_sugar_level_the_product_does_not_offer_is_rejected(turkish_coffee):
    with pytest.raises(PricingError, match="no sugar option"):
        crud.validate_sugar(turkish_coffee, "Extra extra sweet")


def test_sugar_on_a_product_without_sugar_levels_is_rejected(
    client, customer_auth, espresso, pickup_order_body
):
    response = client.post(
        "/api/orders",
        json=pickup_order_body([{"product_slug": "espresso", "quantity": 1, "sugar": "Mazboot · medium"}]),
        headers=customer_auth,
    )
    assert response.status_code == 400


def test_the_arabic_name_is_returned_with_the_product(client, turkish_coffee):
    assert client.get("/api/products/turkish-coffee").json()["name_ar"] == "قهوة تركي"


def test_egyptian_vat_is_the_default_rate():
    assert TAX_RATE == Decimal("0.14")


# --- the contact form -------------------------------------------------------


def test_anyone_can_send_a_message(client):
    response = client.post(
        "/api/messages",
        json={"name": "Layla", "email": "layla@example.com", "body": "Do you open on Fridays?"},
    )
    assert response.status_code == 201
    assert response.json()["is_read"] is False


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "", "email": "a@example.com", "body": "hi"},
        {"name": "Layla", "email": "not-an-email", "body": "hi"},
        {"name": "Layla", "email": "a@example.com", "body": ""},
    ],
)
def test_a_message_is_validated(client, payload):
    assert client.post("/api/messages", json=payload).status_code == 422


def test_only_an_administrator_can_read_messages(client, customer_auth, admin_auth):
    client.post("/api/messages", json={"name": "L", "email": "l@example.com", "body": "hi"})

    assert client.get("/api/messages").status_code == 401
    assert client.get("/api/messages", headers=customer_auth).status_code == 403

    listing = client.get("/api/messages", headers=admin_auth)
    assert listing.status_code == 200
    assert [m["body"] for m in listing.json()] == ["hi"]


def test_an_administrator_can_mark_and_delete_a_message(client, admin_auth):
    sent = client.post(
        "/api/messages", json={"name": "L", "email": "l@example.com", "body": "hi"}
    ).json()

    marked = client.patch(
        f"/api/messages/{sent['id']}", json={"is_read": True}, headers=admin_auth
    )
    assert marked.json()["is_read"] is True

    assert client.delete(f"/api/messages/{sent['id']}", headers=admin_auth).status_code == 204
    assert client.get("/api/messages", headers=admin_auth).json() == []


def test_unread_messages_are_listed_first(client, admin_auth):
    first = client.post(
        "/api/messages", json={"name": "A", "email": "a@example.com", "body": "first"}
    ).json()
    client.post("/api/messages", json={"name": "B", "email": "b@example.com", "body": "second"})
    client.patch(f"/api/messages/{first['id']}", json={"is_read": True}, headers=admin_auth)

    bodies = [m["body"] for m in client.get("/api/messages", headers=admin_auth).json()]
    assert bodies == ["second", "first"]


# --- password reset without email -------------------------------------------


def test_an_administrator_can_reset_a_password(client, customer, admin_auth):
    response = client.post(f"/api/users/{customer.id}/reset-password", headers=admin_auth)
    assert response.status_code == 200
    temporary = response.json()["temporary_password"]
    assert len(temporary) >= 12

    # The old password stops working and the temporary one starts.
    assert client.post(
        "/api/auth/login", data={"username": "sarah", "password": "customer-password"}
    ).status_code == 401
    assert client.post(
        "/api/auth/login", data={"username": "sarah", "password": temporary}
    ).status_code == 200


def test_the_temporary_password_is_stored_only_as_a_hash(client, db_session, customer, admin_auth):
    temporary = client.post(
        f"/api/users/{customer.id}/reset-password", headers=admin_auth
    ).json()["temporary_password"]
    db_session.refresh(customer)
    assert temporary not in customer.hashed_password


def test_a_customer_cannot_reset_anyones_password(client, customer, customer_auth):
    response = client.post(f"/api/users/{customer.id}/reset-password", headers=customer_auth)
    assert response.status_code == 403


def test_an_administrator_cannot_reset_their_own_password_here(client, admin, admin_auth):
    response = client.post(f"/api/users/{admin.id}/reset-password", headers=admin_auth)
    assert response.status_code == 400
