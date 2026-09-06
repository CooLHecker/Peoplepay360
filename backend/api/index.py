"""Entry point for Vercel's Python (ASGI) runtime.

Vercel detects the `app` object exported here and serves it as a
serverless function, routing requests according to `vercel.json`.
"""

from app.main import app  # noqa: F401
