"""
Vercel serverless function entry point for CantoneseScribe API.
"""

from main import app

# Export the FastAPI app for Vercel
handler = app