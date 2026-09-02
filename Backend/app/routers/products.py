"""Public catalogue reads, plus admin-only writes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..security import get_current_admin

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[schemas.ProductOut])
def list_products(
    category: str | None = Query(default=None, max_length=40),
    db: Session = Depends(get_db),
) -> list[models.Product]:
    """Public catalogue. Unavailable products are hidden from customers."""
    return crud.list_products(db, category=category)


@router.get("/{slug}", response_model=schemas.ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)) -> models.Product:
    product = crud.get_product_by_slug(db, slug)
    if product is None or not product.available:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return product


# --- Admin ------------------------------------------------------------------


@router.get("/admin/all", response_model=list[schemas.ProductOut])
def list_all_products(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
) -> list[models.Product]:
    """Every product, including ones withdrawn from sale."""
    return crud.list_products(db, include_unavailable=True)


@router.post("", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    data: schemas.ProductCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
) -> models.Product:
    if crud.get_product_by_slug(db, data.slug):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Slug {data.slug!r} is already in use")
    return crud.create_product(db, data)


@router.patch("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    data: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
) -> models.Product:
    product = crud.get_product(db, product_id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return crud.update_product(db, product, data)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    product = crud.get_product(db, product_id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    try:
        crud.delete_product(db, product)
    except IntegrityError:
        db.rollback()
        # Order history references this product, so removing the row would
        # rewrite past orders. Withdraw it from sale instead.
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This product appears in existing orders. Mark it unavailable instead of deleting it.",
        )
