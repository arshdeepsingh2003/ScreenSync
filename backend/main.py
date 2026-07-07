import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add the project root to sys.path to allow absolute imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import settings

app = FastAPI(title="ScreenSync API", version="0.1.0")

# Setup CORS using origins specified in configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def get_health():
    db_connected = False
    db_error = None
    
    if settings.DATABASE_URL:
        try:
            import psycopg2
            # Set connection timeout to 3 seconds for health check
            conn = psycopg2.connect(settings.DATABASE_URL, connect_timeout=3)
            conn.close()
            db_connected = True
        except Exception as e:
            db_error = str(e)
            
    return {
        "status": "ok",
        "database": {
            "configured": bool(settings.DATABASE_URL),
            "connected": db_connected,
            "error": db_error
        },
        "supabase": {
            "url_configured": bool(settings.SUPABASE_URL),
            "key_configured": bool(settings.SUPABASE_SERVICE_KEY)
        }
    }
