"""
Vercel serverless function entry point for CantoneseScribe API.
"""

from app.main import app as fastapi_app

# Export the FastAPI app for Vercel
app = fastapi_app