from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config import settings

if not settings.DATABASE_URL:
    raise ValueError("DATABASE_URL must be configured in backend/.env")

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
