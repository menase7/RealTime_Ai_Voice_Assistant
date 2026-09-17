import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.config import settings
from app.core.database import get_db, init_db
from app.api.auth import router as auth_router
from app.api.sessions import router as sessions_router
from app.api.voice import router as voice_router
from app.api.analysis import router as analysis_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for database table initialization and cleanup."""
    await init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Real-Time AI Voice Assistant API",
    version="1.0.0",
    lifespan=lifespan
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Authentication routers
app.include_router(auth_router, prefix="/auth")
app.include_router(auth_router, prefix="/api/auth")

# Include Session routers
app.include_router(sessions_router, prefix="/sessions")
app.include_router(sessions_router, prefix="/api/sessions")

# Include Voice WebSocket router
app.include_router(voice_router, prefix="/ws")

# Include Analysis SSE router (Phase 9)
app.include_router(analysis_router, prefix="")

start_time = time.time()


@app.get("/")
async def root():
    return {
        "message": "Welcome to the Real-Time AI Voice Assistant API",
        "docs": "/docs",
        "status": "operational",
        "phase": 4
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
        "uptime_seconds": round(time.time() - start_time, 2),
        "database": {
            "status": db_status,
            "latency_ms": db_latency_ms
        },
        "phase": 4,
        "message": "Phase 4: Basic WebSocket operational"
    }
