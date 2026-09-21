import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.config import settings
from app.core.database import get_db, init_db
from app.core.logging_config import setup_logging
from app.api.auth import router as auth_router
from app.api.sessions import router as sessions_router
from app.api.voice import router as voice_router
from app.api.analysis import router as analysis_router

# Initialize structured logging
setup_logging()
logger = logging.getLogger("voice_assistant.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for database table initialization and startup verification."""
    logger.info("Initializing database metadata...")
    await init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down application server.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Real-Time AI Voice Assistant API (Production-Ready Architecture)",
    version="1.0.0",
    lifespan=lifespan
)

# 1. Request Logging Middleware (measures latency & logs endpoints)
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    t0 = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as err:
        logger.exception(f"Unhandled exception during {request.method} {request.url.path}: {err}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "An internal server error occurred. Please try again later.",
                "error_code": "INTERNAL_SERVER_ERROR"
            }
        )

    latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    # Log requests except high-frequency health probes
    if not request.url.path.endswith("/health"):
        logger.info(f"{request.method} {request.url.path} -> {response.status_code} [{latency_ms}ms]")
    return response


# 2. Global Exception Handlers (never leak stack traces or secret keys to users)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field_loc = " -> ".join([str(l) for l in err.get("loc", []) if l != "body"])
        errors.append({
            "field": field_loc or "request",
            "message": err.get("msg", "Invalid value"),
            "type": err.get("type", "value_error")
        })
    logger.warning(f"Validation error on {request.method} {request.url.path}: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error on request inputs",
            "errors": errors
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Fatal server exception on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred. Please try again later.",
            "error_code": "INTERNAL_SERVER_ERROR"
        }
    )


# 3. Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Include Routers
app.include_router(auth_router, prefix="/auth")
app.include_router(auth_router, prefix="/api/auth")

app.include_router(sessions_router, prefix="/sessions")
app.include_router(sessions_router, prefix="/api/sessions")

app.include_router(voice_router, prefix="/ws")

app.include_router(analysis_router, prefix="")

app_start_time = time.time()


@app.get("/")
async def root():
    return {
        "message": "Welcome to VoxAI Studio Enterprise API",
        "docs": "/docs",
        "status": "operational",
        "environment": "production"
    }


@app.get("/api/health", status_code=status.HTTP_200_OK)
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "disconnected"
    db_latency_ms = None
    try:
        t0 = time.perf_counter()
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            db_status = "connected"
            db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    except Exception as e:
        db_status = f"error: {str(e)}"

    is_healthy = db_status == "connected"
    return {
        "status": "healthy" if is_healthy else "degraded",
        "service": settings.PROJECT_NAME,
        "uptime_seconds": round(time.time() - app_start_time, 2),
        "database": {
            "status": db_status,
            "latency_ms": db_latency_ms
        },
        "message": "VoxAI Studio services operational"
    }
