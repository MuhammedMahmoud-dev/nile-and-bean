"""Authentication: registration, login, token handling, and account privacy."""

from __future__ import annotations

import datetime as dt

import jwt
import pytest

from app import crud
from app.config import ALGORITHM, SECRET_KEY
from app.security import create_access_token, hash_password, verify_password


# --- password hashing -------------------------------------------------------


def test_password_is_hashed_not_stored_in_the_clear(db_session, customer):
    stored = crud.get_user_by_username(db_session, "sarah").hashed_password
    assert stored != "customer-password"
    assert stored.startswith("$2")  # bcrypt
    assert verify_password("customer-password", stored)
    assert not verify_password("not-the-password", stored)


def test_the_same_password_hashes_differently_each_time():
    """Distinct salts: two users with one password must not share a hash."""
    assert hash_password("same-password") != hash_password("same-password")


# --- registration -----------------------------------------------------------


def test_register_returns_a_usable_token(client):
    response = client.post(
        "/api/auth/register",
        json={
            "username": "newcomer",
            "email": "newcomer@example.com",
            "password": "a-good-password",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["user"]["username"] == "newcomer"

    me = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"}
    )
    assert me.status_code == 200
    assert me.json()["username"] == "newcomer"


def test_registration_never_returns_the_password_or_its_hash(client):
    response = client.post(
        "/api/auth/register",
        json={"username": "quiet", "email": "quiet@example.com", "password": "a-good-password"},
    )
    assert "a-good-password" not in response.text
    assert "hashed_password" not in response.json()["user"]


def test_a_new_account_is_never_an_administrator(client):
    """is_admin must not be settable from the request body."""
    response = client.post(
        "/api/auth/register",
        json={
            "username": "sneaky",
            "email": "sneaky@example.com",
            "password": "a-good-password",
            "is_admin": True,
        },
    )
    assert response.status_code == 201
    assert response.json()["user"]["is_admin"] is False


def test_duplicate_username_is_rejected(client, customer):
    response = client.post(
        "/api/auth/register",
        json={"username": "sarah", "email": "other@example.com", "password": "a-good-password"},
    )
    assert response.status_code == 409


def test_duplicate_email_is_rejected(client, customer):
    response = client.post(
        "/api/auth/register",
        json={"username": "someone-else", "email": "sarah@example.com", "password": "a-good-password"},
    )
    assert response.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        {"username": "ab", "email": "a@example.com", "password": "a-good-password"},  # too short
        {"username": "has space", "email": "a@example.com", "password": "a-good-password"},
        {"username": "fine", "email": "not-an-email", "password": "a-good-password"},
        {"username": "fine", "email": "a@example.com", "password": "short"},
    ],
)
def test_registration_validates_its_input(client, payload):
    assert client.post("/api/auth/register", json=payload).status_code == 422


# --- login ------------------------------------------------------------------


def test_login_succeeds_with_correct_credentials(client, customer):
    response = client.post(
        "/api/auth/login", data={"username": "sarah", "password": "customer-password"}
    )
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"


def test_login_fails_with_a_wrong_password(client, customer):
    response = client.post(
        "/api/auth/login", data={"username": "sarah", "password": "wrong"}
    )
    assert response.status_code == 401


def test_login_does_not_reveal_whether_an_account_exists(client, customer):
    """A wrong password and an unknown user must be indistinguishable."""
    wrong_password = client.post(
        "/api/auth/login", data={"username": "sarah", "password": "wrong"}
    )
    no_such_user = client.post(
        "/api/auth/login", data={"username": "nobody-here", "password": "wrong"}
    )
    assert wrong_password.status_code == no_such_user.status_code == 401
    assert wrong_password.json() == no_such_user.json()


# --- tokens -----------------------------------------------------------------


def test_me_requires_a_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_a_garbage_token_is_rejected(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.token"})
    assert response.status_code == 401


def test_a_token_signed_with_the_wrong_key_is_rejected(client, customer):
    forged = jwt.encode(
        {"sub": "sarah", "exp": dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=1)},
        "an-attackers-key",
        algorithm=ALGORITHM,
    )
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert response.status_code == 401


def test_an_expired_token_is_rejected(client, customer):
    expired = create_access_token("sarah", expires_minutes=-1)
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_a_valid_token_for_a_deleted_account_is_rejected(client, db_session, customer):
    token = create_access_token("sarah")
    db_session.delete(customer)
    db_session.commit()

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_the_token_subject_is_the_username(customer):
    decoded = jwt.decode(create_access_token("sarah"), SECRET_KEY, algorithms=[ALGORITHM])
    assert decoded["sub"] == "sarah"
