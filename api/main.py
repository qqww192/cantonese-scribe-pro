"""
Main FastAPI application entry point.
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from core.config import get_settings
from core.logging import setup_logging
from core.exceptions import AppException
from api.v1.api import api_router
from core.storage import cleanup_temp_files


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events."""
    # Startup
    setup_logging()
    logging.info("CantoneseScribe backend starting up...")
    
    # Ensure required directories exist
    from core.storage import ensure_directories
    ensure_directories()
    
    yield
    
    # Shutdown
    logging.info("CantoneseScribe backend shutting down...")
    # Clean up any temporary files
    await cleanup_temp_files()


def create_application() -> FastAPI:
    """Create FastAPI application with all configurations."""
    settings = get_settings()
    
    app = FastAPI(
        title="CantoneseScribe API",
        description="FastAPI backend for Cantonese video transcription service",
        version="1.0.0",
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url="/redoc" if settings.environment != "production" else None,
        lifespan=lifespan
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Trusted hosts middleware for security
    if settings.environment == "production":
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=settings.allowed_hosts
        )
    
    # Include API router
    app.include_router(api_router)
    
    # Global exception handler
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "error_code": exc.error_code}
        )
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "version": "1.0.0"}
    
    return app


# Create the FastAPI app instance
app = create_application()

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development",
        log_level="info"
    )