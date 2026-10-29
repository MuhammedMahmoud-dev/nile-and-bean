"""Admin authorization.

The original application had an is_admin column that nothing ever set, read, or
checked, and admin pages that were plain HTML anyone could open (AUDIT.md
section 6.1). These tests pin down that every admin route now refuses an
anonymous caller with 401 and a signed-in non-admin with 403.
"""

from __future__ import annotations

import pytest

# (method, path) for every route that must be administrator-only.
ADMIN_ROUTES = [
    ("get", "/api/users"),
    ("patch", "/api/users/1"),
    ("delete", "/api/users/1"),
    ("get", "/api/orders"),
    ("patch", "/api/orders/1/status"),
    ("get", "/api/reviews"),
    ("delete", "/api/reviews/1"),
    ("get", "/api/products/admin/all"),
    ("post", "/api/products"),
    ("patch", "/api/products/1"),
    ("delete", "/api/products/1"),
    ("post", "/api/users/1/reset-password"),
    ("get", "/api/messages"),
    ("patch", "/api/messages/1"),
    ("delete", "/api/messages/1"),
]


def _call(client, method, path, **kwargs):
    """GET and DELETE take no body, so only send one where it is allowed."""
    if method in ("post", "patch", "put"):
        kwargs.setdefault("json", {})
    return getattr(client, method)(path, **kwargs)


@pytest.mark.parametrize("method,path", ADMIN_ROUTES)
def test_admin_routes_reject_anonymous_callers(client, method, path):
    response = _call(client, method, path)
    assert response.status_code == 401, f"{method.upper()} {path} gave {response.status_code}"


@pytest.mark.parametrize("method,path", ADMIN_ROUTES)
def test_admin_routes_reject_a_signed_in_customer(client, customer_auth, method, path):
    """403, not 401: the caller is known, just not permitted."""
    response = _call(client, method, path, headers=customer_auth)
    assert response.status_code == 403, f"{method.upper()} {path} gave {response.status_code}"


def test_an_administrator_is_allowed_through(client, admin_auth):
    assert client.get("/api/users", headers=admin_auth).status_code == 200
    assert client.get("/api/orders", headers=admin_auth).status_code == 200
    assert client.get("/api/reviews", headers=admin_auth).status_code == 200


def test_a_forged_admin_claim_in_the_token_is_ignored(client, customer, customer_auth):
    """Authority comes from the database row, never from the token payload."""
    import jwt

    from app.config import ALGORITHM, SECRET_KEY

    forged = jwt.encode(
        {"sub": "sarah", "is_admin": True, "role": "admin", "exp": 9999999999},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    response = client.get("/api/users", headers={"Authorization": f"Bearer {forged}"})
    assert response.status_code == 403


# --- catalogue visibility ---------------------------------------------------


def test_the_public_catalogue_hides_withdrawn_products(client, db_session, espresso):
    espresso.available = False
    db_session.commit()

    assert client.get("/api/products").json() == []
    assert client.get("/api/products/espresso").status_code == 404


def test_an_administrator_can_still_see_withdrawn_products(
    client, db_session, admin_auth, espresso
):
    espresso.available = False
    db_session.commit()

    listing = client.get("/api/products/admin/all", headers=admin_auth).json()
    assert [p["slug"] for p in listing] == ["espresso"]


# --- product management -----------------------------------------------------


def test_an_administrator_can_create_a_product(client, admin_auth):
    response = client.post(
        "/api/products",
        json={
            "slug": "flat-white",
            "name": "Flat White",
            "price": "4.19",
            "category": "coffee",
            "short_description": "Velvety steamed milk",
        },
        headers=admin_auth,
    )
    assert response.status_code == 201
    assert response.json()["price"] == "4.19"


def test_a_duplicate_slug_is_rejected(client, admin_auth, espresso):
    response = client.post(
        "/api/products",
        json={"slug": "espresso", "name": "Another", "price": "1.00", "category": "coffee"},
        headers=admin_auth,
    )
    assert response.status_code == 409


def test_a_negative_price_is_rejected(client, admin_auth):
    response = client.post(
        "/api/products",
        json={"slug": "free-lunch", "name": "Free Lunch", "price": "-5.00", "category": "coffee"},
        headers=admin_auth,
    )
    assert response.status_code == 422


def test_deleting_a_product_with_order_history_is_refused(
    client, admin_auth, customer_auth, espresso, pickup_order_body
):
    """Deleting it would rewrite past orders, so the API says withdraw instead."""
    client.post(
        "/api/orders",
        json=pickup_order_body([{"product_slug": "espresso", "quantity": 1}]),
        headers=customer_auth,
    )

    response = client.delete(f"/api/products/{espresso.id}", headers=admin_auth)
    assert response.status_code == 409
    assert "unavailable" in response.json()["detail"]


def test_a_product_with_no_orders_can_be_deleted(client, admin_auth, espresso):
    assert client.delete(f"/api/products/{espresso.id}", headers=admin_auth).status_code == 204
    assert client.get("/api/products").json() == []


# --- user management guards -------------------------------------------------


def test_an_administrator_cannot_remove_their_own_admin_access(client, admin, admin_auth):
    """Otherwise the last administrator can lock everyone out."""
    response = client.patch(
        f"/api/users/{admin.id}", json={"is_admin": False}, headers=admin_auth
    )
    assert response.status_code == 400


def test_an_administrator_cannot_delete_their_own_account(client, admin, admin_auth):
    assert client.delete(f"/api/users/{admin.id}", headers=admin_auth).status_code == 400


def test_deleting_a_user_with_orders_is_refused(
    client, customer, admin_auth, customer_auth, espresso, pickup_order_body
):
    client.post(
        "/api/orders",
        json=pickup_order_body([{"product_slug": "espresso", "quantity": 1}]),
        headers=customer_auth,
    )
    response = client.delete(f"/api/users/{customer.id}", headers=admin_auth)
    assert response.status_code == 409


def test_an_administrator_can_promote_another_user(client, customer, admin_auth):
    response = client.patch(
        f"/api/users/{customer.id}", json={"is_admin": True}, headers=admin_auth
    )
    assert response.status_code == 200
    assert response.json()["is_admin"] is True
