"""Order creation and listing."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..security import get_current_admin, get_current_user

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    data: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.Order:
    """Place an order.

    Totals are computed from the product rows. The request body has no field
    for a price or a total, so a client cannot propose one.
    """
    try:
        return crud.create_order(db, current_user, data)
    except crud.PricingError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))


@router.get("/me", response_model=list[schemas.OrderOut])
def list_my_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[models.Order]:
    return crud.list_orders_for_user(db, current_user.id)


@router.get("", response_model=list[schemas.OrderOut])
def list_all_orders(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
) -> list[models.Order]:
    return crud.list_all_orders(db)


@router.patch("/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(
    order_id: int,
    data: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
) -> models.Order:
    order = crud.get_order(db, order_id)
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    order.status = data.status
    db.commit()
    db.refresh(order)
    return order
