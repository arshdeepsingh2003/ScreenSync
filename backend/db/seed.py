import sys
import os

# Add the project root to sys.path to allow absolute imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.db.database import engine, SessionLocal
from backend.db.base import Base
# Import all models to ensure they are registered with Base.metadata
from backend.models import Admin, App, Content, Screen, Session, Settings
from backend.config import settings
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_db():
    print("Connecting to database and creating tables if they do not exist...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Seed Singleton Session
        session_row = db.query(Session).filter(Session.id == 1).first()
        if not session_row:
            print("Seeding default session singleton (id=1)...")
            new_session = Session(id=1, active_app_id=None, current_batch=0)
            db.add(new_session)
        else:
            print("Session singleton already exists.")

        # 2. Seed Singleton Settings
        settings_row = db.query(Settings).filter(Settings.id == 1).first()
        if not settings_row:
            print("Seeding default settings singleton (id=1)...")
            new_settings = Settings(
                id=1,
                default_screen_type="text",
                default_screen_text="Welcome to ScreenSync",
                default_screen_url=None
            )
            db.add(new_settings)
        else:
            print("Settings singleton already exists.")

        # 3. Seed Bootstrap Admin
        admin_username = settings.ADMIN_USERNAME
        admin_password = settings.ADMIN_PASSWORD
        
        existing_admin = db.query(Admin).filter(Admin.username == admin_username).first()
        hashed_pw = pwd_context.hash(admin_password)
        if not existing_admin:
            print(f"Seeding admin user '{admin_username}'...")
            new_admin = Admin(username=admin_username, password_hash=hashed_pw)
            db.add(new_admin)
        else:
            print(f"Admin user '{admin_username}' already exists. Updating password hash to match config...")
            existing_admin.password_hash = hashed_pw
            
        db.commit()
        print("Database seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
