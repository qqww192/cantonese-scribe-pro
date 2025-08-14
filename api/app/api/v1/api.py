"""
Main API router that includes all endpoint routers.
"""

from fastapi import APIRouter

from .endpoints import auth, transcription, files, users, progress, billing, health

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(transcription.router, prefix="/transcription", tags=["transcription"])
api_router.include_router(progress.router, prefix="/progress", tags=["progress"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(health.router, prefix="/health", tags=["health"])