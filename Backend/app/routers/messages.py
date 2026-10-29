"""Contact form messages.

Anyone may send one; only administrators can read, mark, or delete them. The
form on the About page used to show a thank-you toast and discard the message.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_admin

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.post("", response_model=schemas.MessageOut, status_code=status.HTTP_201_CREATED)
def send_message(data: schemas.MessageCreate, db: Session = Depends(get_db)) -> models.Message:
    message = models.Message(name=data.name.strip(), email=data.email, body=data.body.strip())
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("", response_model=list[schemas.MessageOut])
def list_messages(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
) -> list[models.Message]:
    # Unread first, newest first within each group.
    return (
        db.query(models.Message)
        .order_by(models.Message.is_read, models.Message.created_at.desc())
        .all()
    )


@router.patch("/{message_id}", response_model=schemas.MessageOut)
def mark_message(
    message_id: int,
    data: schemas.MessageUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
) -> models.Message:
    message = db.get(models.Message, message_id)
    if message is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")
    message.is_read = data.is_read
    db.commit()
    db.refresh(message)
    return message


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    message = db.get(models.Message, message_id)
    if message is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")
    db.delete(message)
    db.commit()
