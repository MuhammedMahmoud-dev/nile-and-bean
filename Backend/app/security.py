"""Password hashing, JWT issuing, and the current-user dependencies.

The bcrypt hashing in the original ``crud.create_user`` was the one part of the
project that was already correct, so it is kept as-is. Everything around it -
issuing a token, resolving a caller, checking ``is_admin`` - is new. The
``is_admin`` column existed but was never set, never read, and never enforced.
"""

from __future__ import annotations

import datetime as dt

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from . import models
from .config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY
from .database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# tokenUrl is what OpenAPI advertises; it must match the login route.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    expire = dt.datetime.now(dt.timezone.utc) + dt.timedelta(
        minutes=expires_minutes if expires_minutes is not None else ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "exp": expire, "iat": dt.datetime.now(dt.timezone.utc)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """Resolve the caller from the bearer token, or raise 401."""
    if not token:
        raise CREDENTIALS_ERROR

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired, please sign in again",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise CREDENTIALS_ERROR

    username = payload.get("sub")
    if not username:
        raise CREDENTIALS_ERROR

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        # Token is well-formed but the account is gone.
        raise CREDENTIALS_ERROR
    return user


def get_current_admin(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Admin-only guard. 403, not 401: the caller is known but not permitted."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return current_user
