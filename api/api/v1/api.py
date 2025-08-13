"""
Main API router that includes all endpoint routers.
"""

from fastapi import APIRouter

from api.v1.endpoints import auth, transcription, files, users

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(transcription.router, prefix="/transcription", tags=["transcription"])