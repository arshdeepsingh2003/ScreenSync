import os
import sys
import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Add the project root to sys.path to allow absolute imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import settings
from backend.routers import (
    auth_router,
    apps_router,
    contents_router,
    screens_router,
    settings_router,
    upload_router,
)
from backend.services.exceptions import (
    AppNotFoundError,
    ScreenNotFoundError,
    ContentNotFoundError,
    ScreenNumberTakenError,
    InvalidCredentialsError,
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ScreenSync API", version="0.1.0")

# Setup CORS using origins specified in configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST Routers under /api prefix
app.include_router(auth_router.router, prefix="/api")
app.include_router(apps_router.router, prefix="/api")
app.include_router(contents_router.router, prefix="/api")
app.include_router(screens_router.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(upload_router.router, prefix="/api")

# Centralized Exception Handlers

@app.exception_handler(AppNotFoundError)
async def app_not_found_handler(request: Request, exc: AppNotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc), "code": "APP_NOT_FOUND"}
    )

@app.exception_handler(ScreenNotFoundError)
async def screen_not_found_handler(request: Request, exc: ScreenNotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc), "code": "SCREEN_NOT_FOUND"}
    )

@app.exception_handler(ContentNotFoundError)
async def content_not_found_handler(request: Request, exc: ContentNotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc), "code": "CONTENT_NOT_FOUND"}
    )

@app.exception_handler(ScreenNumberTakenError)
async def screen_number_taken_handler(request: Request, exc: ScreenNumberTakenError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": str(exc), "code": "SCREEN_NUMBER_TAKEN"}
    )

@app.exception_handler(InvalidCredentialsError)
async def invalid_credentials_handler(request: Request, exc: InvalidCredentialsError):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": str(exc), "code": "INVALID_CREDENTIALS"},
        headers={"WWW-Authenticate": "Bearer"}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.errors(), "code": "VALIDATION_ERROR"}
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": "HTTP_ERROR"}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception occurred: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal Server Error", "code": "INTERNAL_SERVER_ERROR"}
    )

@app.get("/api/health")
def get_health():
    db_connected = False
    db_error = None
    
    if settings.DATABASE_URL:
        try:
            import psycopg2
            # Set connection timeout to 3 seconds for health check
            conn = psycopg2.connect(settings.DATABASE_URL, connect_timeout=3)
            conn.close()
            db_connected = True
        except Exception as e:
            db_error = str(e)
            
    return {
        "status": "ok",
        "database": {
            "configured": bool(settings.DATABASE_URL),
            "connected": db_connected,
            "error": db_error
        },
        "supabase": {
            "url_configured": bool(settings.SUPABASE_URL),
            "key_configured": bool(settings.SUPABASE_SERVICE_KEY)
        }
    }
