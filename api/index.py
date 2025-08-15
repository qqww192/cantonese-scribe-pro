"""
Vercel serverless function entry point for CantoneseScribe API.
"""

from api.app.main import app as fastapi_app

# Export the FastAPI app for Vercel
app = fastapi_app