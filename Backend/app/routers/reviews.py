"""Admin-only review moderation, backing view-reviews.html.

Scope note: the original page was four hardcoded table rows, and the application
has never had a customer-facing way to write a review. This exposes reading and
deleting reviews to administrators; reviews themselves are created by the seed
script. Customer review submission would need a product-page UI that has never
existed and is deliberately out of scope here.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..security import get_current_admin

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.get("", response_model=list[schemas.ReviewOut])
def list_reviews(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
) -> list[schemas.ReviewOut]:
    out: list[schemas.ReviewOut] = []
    for review in crud.list_reviews(db):
        item = schemas.ReviewOut.model_validate(review)
        item.user_name = review.user.full_name or review.user.username
        item.product_name = review.product.name
        out.append(item)
    return out


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    review = crud.get_review(db, review_id)
    if review is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Review not found")
    crud.delete_review(db, review)
