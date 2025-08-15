"""
Main FastAPI application entry point.
"""

import os
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from .core.config import get_settings
from .core.logging import setup_logging
from .core.exceptions import AppException
from .api.v1.api import api_router
from .core.storage import cleanup_temp_files
from .services.database_service import init_database
from .services.google_speech_service import init_google_speech_service
from .services.unified_transcription_service import init_unified_transcription_service
from .middleware.error_handling import add_error_handlers
from .middleware.usage_tracking import UsageTrackingMiddleware
from .services.monthly_reset_service import monthly_reset_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events."""
    # Startup
    setup_logging()
    logging.info("CantoneseScribe backend starting up...")
    
    # Ensure required directories exist
    from core.storage import ensure_directories
    ensure_directories()
    
    # Initialize database connection
    try:
        await init_database()
        logging.info("Database initialized successfully")
    except Exception as e:
        logging.error(f"Failed to initialize database: {str(e)}")
        # Don't fail startup for database issues in development
        if get_settings().environment == "production":
            raise
    
    # Initialize transcription services
    try:
        await init_google_speech_service()
        logging.info("Google Speech service initialized successfully")
    except Exception as e:
        logging.warning(f"Failed to initialize Google Speech service: {str(e)}")
        # Continue startup even if Google Speech fails
    
    try:
        await init_unified_transcription_service()
        logging.info("Unified transcription service initialized successfully")
    except Exception as e:
        logging.error(f"Failed to initialize unified transcription service: {str(e)}")
        # Don't fail startup for transcription service issues in development
        if get_settings().environment == "production":
            raise
    
    # Start monthly reset scheduler
    try:
        monthly_reset_service.start_scheduler()
        logging.info("Monthly reset scheduler started successfully")
    except Exception as e:
        logging.error(f"Failed to start monthly reset scheduler: {str(e)}")
        # Don't fail startup for scheduler issues
        if get_settings().environment == "production":
            logging.warning("Monthly reset scheduler failed to start in production")
    
    yield
    
    # Shutdown
    logging.info("CantoneseScribe backend shutting down...")
    
    # Stop monthly reset scheduler
    try:
        monthly_reset_service.stop_scheduler()
        logging.info("Monthly reset scheduler stopped")
    except Exception as e:
        logging.error(f"Error stopping monthly reset scheduler: {str(e)}")
    
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
    
    # Usage tracking middleware (should be added before API routes)
    app.add_middleware(
        UsageTrackingMiddleware,
        enable_enforcement=settings.environment != "development"  # Disable enforcement in dev
    )
    
    # Include API router with prefix
    app.include_router(api_router, prefix=settings.api_prefix)
    
    # Add comprehensive error handling
    add_error_handlers(app)
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "version": "1.0.0"}
    
    # Debug endpoint to test API connectivity
    @app.get("/debug")
    async def debug_info():
        return {
            "status": "ok",
            "api_prefix": settings.api_prefix,
            "environment": settings.environment,
            "cors_origins": settings.allowed_origins,
            "timestamp": datetime.utcnow().isoformat(),
            "endpoints": {
                "auth_login": f"{settings.api_prefix}/auth/login",
                "auth_register": f"{settings.api_prefix}/auth/register",
                "waitlist_signup": f"{settings.api_prefix}/waitlist/signup"
            }
        }
    
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