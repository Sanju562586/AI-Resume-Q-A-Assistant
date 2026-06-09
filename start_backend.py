"""
start_backend.py
Run from the project root:
    python start_backend.py

This is equivalent to:
    uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
"""
import sys
import os

# Ensure the project root (this file's directory) is on sys.path
ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[ROOT],
    )
