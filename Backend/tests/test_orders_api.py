"""Order endpoints: authentication, validation, and price integrity."""

from __future__ import annotations

from decimal import Decimal


def test_placing_an_order_requires_signing_in(client, espresso, pickup_order_body):
    response = client.post(
        "/api/orders", json=pickup_order_body([{"product_slug": "espresso", "quantity": 1}])
    )
    assert response.status_code == 401


def test_a_signed_in_customer_can_place_an_order(
    client, customer_auth, espresso, pickup_order_body
):
    response = client.post(
        "/api/orders",
        json=pickup_order_body([{"product_slug": "espresso", "quantity": 2, "size": "Double"}]),
        headers=customer_auth,
    )
    assert response.status_code == 201, response.text

    body = response.json()
    assert body["status"] == "pending"
    assert Decimal(body["items"][0]["unit_price"]) == Decimal("3.99")
    assert Decimal(body["subtotal"]) == Decimal("7.98")
    assert Decimal(body["total"]) == Decimal("8.62")


def test_a_client_cannot_dictate_its_own_price(
    client, customer_auth, espresso, pickup_order_body
):
    """Extra price fields in the body must be ignored, not honoured."""
    body = pickup_order_body(
        [
            {
                "product_slug": "espresso",
                "quantity": 1,
                "size": "Triple",
                "extras": ["Vanilla Syrup"],
                "unit_price": 0.01,
                "price": 0.01,
                "line_total": 0.01,
            }
        ]
    )
    body["subtotal"] = 0.01
    body["total"] = 0.01

    response = client.post("/api/orders", json=body, headers=customer_auth)
    assert response.status_code == 201

    placed = response.json()
    assert Decimal(placed["items"][0]["unit_price"]) == Decimal("5.49")
    assert Decimal(placed["total"]) == Decimal("5.93")


def test_an_option_the_product_does_not_offer_is_rejected(
    client, customer_auth, espresso, pickup_order_body
):
    response = client.post(
        "/api/orders",
        json=pickup_order_body(
            [{"product_slug": "espresso", "quantity": 1, "extras": ["Free Gold Bar"]}]
        ),
        headers=customer_auth,
    )
    assert response.status_code == 400
    assert "no extra" in response.json()["detail"]


def test_delivery_requires_a_full_address(client, customer_auth, espresso, pickup_order_body):
    body = pickup_order_body([{"product_slug": "espresso", "quantity": 1}])
    body["order_type"] = "delivery"

    response = client.post("/api/orders", json=body, headers=customer_auth)
    assert response.status_code == 422
    assert "address" in response.text


def test_delivery_with_an_address_is_accepted(client, customer_auth, espresso, pickup_order_body):
    body = pickup_order_body([{"product_slug": "espresso", "quantity": 1}])
    body.update(
        order_type="delivery",
        address_street="12 Nile Corniche",
        address_city="Cairo",
        address_zip="11511",
    )

    response = client.post("/api/orders", json=body, headers=customer_auth)
    assert response.status_code == 201
    assert response.json()["address_city"] == "Cairo"


def test_an_empty_order_is_rejected(client, customer_auth, pickup_order_body):
    response = client.post("/api/orders", json=pickup_order_body([]), headers=customer_auth)
    assert response.status_code == 422


def test_a_zero_quantity_line_is_rejected(client, customer_auth, espresso, pickup_order_body):
    response = client.post(
        "/api/orders",
        json=pickup_order_body([{"product_slug": "espresso", "quantity": 0}]),
        headers=customer_auth,
    )
    assert response.status_code == 422


def test_a_negative_quantity_is_rejected(client, customer_auth, espresso, pickup_order_body):
    response = client.post(
        "/api/orders",
        json=pickup_order_body([{"product_slug": "espresso", "quantity": -5}]),
        headers=customer_auth,
    )
    assert response.status_code == 422


def test_a_malformed_contact_email_is_rejected(
    client, customer_auth, espresso, pickup_order_body
):
    body = pickup_order_body([{"product_slug": "espresso", "quantity": 1}])
    body["contact_email"] = "not-an-email"

    response = client.post("/api/orders", json=body, headers=customer_auth)
    assert response.status_code == 422


def test_a_customer_sees_only_their_own_orders(
    client, db_session, customer_auth, admin, espresso, pickup_order_body
):
    from app import crud, schemas

    client.post(
        "/api/orders",
        json=pickup_order_body([{"product_slug": "espresso", "quantity": 1}]),
        headers=customer_auth,
    )
    # An order belonging to somebody else.
    crud.create_order(
        db_session,
        admin,
        schemas.OrderCreate(
            order_type="pickup",
            payment_method="card",
            contact_name="Site Administrator",
            contact_phone="+20 100 555 9999",
            contact_email="admin@example.com",
            items=[{"product_slug": "espresso", "quantity": 5}],
        ),
    )

    mine = client.get("/api/orders/me", headers=customer_auth).json()
    assert len(mine) == 1
    assert mine[0]["contact_name"] == "Sarah Ali"


def test_card_details_are_not_accepted_or_stored(
    client, customer_auth, espresso, pickup_order_body
):
    """The checkout collects card fields; none of them reach the server."""
    body = pickup_order_body([{"product_slug": "espresso", "quantity": 1}])
    body["card_number"] = "4242424242424242"
    body["card_cvc"] = "123"

    response = client.post("/api/orders", json=body, headers=customer_auth)
    assert response.status_code == 201
    assert "4242" not in response.text
    assert "card_number" not in response.json()
