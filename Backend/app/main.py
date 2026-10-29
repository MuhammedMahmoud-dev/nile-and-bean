"""FastAPI application.

Replaces a module that mounted static files from a hardcoded absolute Windows
path (``C:\\Sw_project_Deliverable-_3-main``) that did not even point at this
project's directory, and that called ``create_all()`` at import time in place of
migrations. Paths are now derived from this file's location, and the schema is
owned by Alembic.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import DEV_SECRET_KEY, ENVIRONMENT, FRONTEND_DIR, SECRET_KEY, cors_origins
from .routers import auth, messages, orders, products, reviews, users

logger = logging.getLogger("nilebean")

app = FastAPI(
    title="Nile & Bean API",
    version="1.0.0",
    description="Order coffee, tea and pastries for pickup or delivery.",
)

if SECRET_KEY == DEV_SECRET_KEY and ENVIRONMENT != "development":
    # Loud, because a shared signing key means anyone can mint a valid token.
    logger.warning(
        "SECRET_KEY is the built-in development value while ENVIRONMENT=%r. "
        "Set SECRET_KEY in the environment before deploying.",
        ENVIRONMENT,
    )

origins = cors_origins()
if origins:
    # Only for running the static frontend from a separate dev server. In
    # production the frontend is served from this same origin, so the list is
    # empty and no cross-origin request is permitted. Never "*".
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(users.router)
app.include_router(reviews.router)
app.include_router(messages.router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log the detail, return a generic message.

    An unhandled error previously surfaced as a raw traceback in the response.
    """
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


# --- Static frontend --------------------------------------------------------
# Mounted last so it never shadows an /api route. html=True serves index.html
# for "/" and resolves extensionless paths to their .html file.

if FRONTEND_DIR.joinpath("index.html").is_file():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:  # pragma: no cover - only in an unusual checkout
    logger.warning("Frontend not found at %s; serving the API only.", FRONTEND_DIR)

    @app.get("/")
    def missing_frontend() -> dict[str, str]:
        return {"detail": "API is running. Frontend files were not found."}
