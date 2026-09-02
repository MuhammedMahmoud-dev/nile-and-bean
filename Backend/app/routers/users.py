"""Admin-only user management, backing manage-users.html."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..security import get_current_admin

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
) -> list[models.User]:
    return crud.list_users(db)


@router.patch("/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    data: schemas.UserAdminUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
) -> models.User:
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    # Refuse to let the last administrator demote themselves and lock everyone
    # out of the admin area.
    if user.id == current_admin.id and data.is_admin is False:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "You cannot remove your own administrator access"
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == current_admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot delete your own account")
    if user.orders:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This user has orders. Deleting them would orphan order history.",
        )

    db.delete(user)
    db.commit()
