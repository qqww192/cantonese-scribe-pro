"""
Vercel serverless function entry point for CantoneseScribe API.
"""

from app.main import app

# Export the FastAPI app for Vercel
handler = app