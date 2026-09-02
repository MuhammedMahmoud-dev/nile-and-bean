"""Registration, login and the current-user endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..security import create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)) -> schemas.Token:
    if crud.get_user_by_username(db, user.username):
        raise HTTPException(status.HTTP_409_CONFLICT, "That username is already taken")
    if crud.get_user_by_email(db, user.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already registered")

    # is_admin is never taken from the request body. Administrators are made by
    # the seed script or by an existing administrator, never by self-signup.
    created = crud.create_user(db, user)
    return schemas.Token(
        access_token=create_access_token(created.username),
        user=schemas.UserOut.model_validate(created),
    )


@router.post("/login", response_model=schemas.Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> schemas.Token:
    user = crud.authenticate_user(db, form.username, form.password)
    if user is None:
        # One message for both failures, so it cannot be used to enumerate
        # which usernames exist.
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return schemas.Token(
        access_token=create_access_token(user.username),
        user=schemas.UserOut.model_validate(user),
    )


@router.get("/me", response_model=schemas.UserOut)
def read_me(current_user: models.User = Depends(get_current_user)) -> models.User:
    return current_user
