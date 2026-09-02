"""Application settings.

Everything environment-dependent lives here so nothing has to be hardcoded at a
call site the way the original ``main.py`` hardcoded an absolute Windows path.
"""

from __future__ import annotations

import os
from decimal import Decimal
from pathlib import Path

# Repository layout:
#   <repo root>/Backend/app/config.py   <- this file
#   <repo root>/index.html              <- the frontend
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
REPO_ROOT = BACKEND_DIR.parent
FRONTEND_DIR = REPO_ROOT

# --- Database ---------------------------------------------------------------
# Default to a file next to the backend package, not the process working
# directory, so the database does not move when you start the app elsewhere.
DEFAULT_DB_PATH = BACKEND_DIR / "cafe.db"
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

# --- Auth -------------------------------------------------------------------
# A development fallback is provided so the project runs immediately after
# clone. It is deliberately obvious, and startup warns when it is in use.
DEV_SECRET_KEY = "dev-only-insecure-key-change-me"
SECRET_KEY = os.environ.get("SECRET_KEY", DEV_SECRET_KEY)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# --- Business rules ---------------------------------------------------------
# The single definition of the tax rate. The frontend previously carried its own
# copy of 0.08 and computed the total the server never saw.
TAX_RATE = Decimal(os.environ.get("TAX_RATE", "0.08"))

# --- CORS -------------------------------------------------------------------
# The frontend is served by this application from the same origin, so CORS is
# not needed in production. These origins exist only so the static site can also
# be run from a separate dev server (e.g. `python -m http.server`) while working
# on the frontend. Never a wildcard: with credentials-bearing requests, "*" is
# both refused by browsers and wrong.
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")

DEV_CORS_ORIGINS = [
    "http://localhost:8123",
    "http://127.0.0.1:8123",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]


def cors_origins() -> list[str]:
    """Allowed cross-origin callers. Empty in production, by design."""
    if ENVIRONMENT == "development":
        return DEV_CORS_ORIGINS
    configured = os.environ.get("CORS_ORIGINS", "").strip()
    return [o.strip() for o in configured.split(",") if o.strip()]
