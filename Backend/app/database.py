"""Database engine, session factory and the FastAPI session dependency."""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import DATABASE_URL

_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    # check_same_thread is a SQLite-only concern: FastAPI serves requests from a
    # thread pool, and SQLite otherwise refuses a connection reused off-thread.
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)

if _is_sqlite:

    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, _record):
        """SQLite ignores FOREIGN KEY constraints unless asked, per connection.

        Without this the order -> product and order_item -> order references are
        decorative, and deleting a product would silently orphan order lines.
        """
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Iterator[Session]:
    """Request-scoped session, closed even if the handler raises."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
