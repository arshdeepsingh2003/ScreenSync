from sqlalchemy.orm import Session
from backend.models.app import App
from backend.models.session import Session as SessionModel
from backend.schemas.app_schema import AppCreate, AppUpdate
from backend.services.exceptions import AppNotFoundError

def get_apps(db: Session):
    """Retrieve all Apps, ordered by name."""
    return db.query(App).order_by(App.name).all()

def get_app_by_id(db: Session, app_id: int) -> App:
    """Retrieve a single App by ID or raise AppNotFoundError."""
    app = db.query(App).filter(App.id == app_id).first()
    if not app:
        raise AppNotFoundError(f"App with ID {app_id} not found")
    return app

def create_app(db: Session, app_data: AppCreate) -> App:
    """Create a new App."""
    app = App(
        name=app_data.name,
        icon_url=app_data.icon_url,
        is_active=False
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app

def update_app(db: Session, app_id: int, app_data: AppUpdate) -> App:
    """Update an existing App."""
    app = get_app_by_id(db, app_id)
    app.name = app_data.name
    app.icon_url = app_data.icon_url
    db.commit()
    db.refresh(app)
    return app

def delete_app(db: Session, app_id: int):
    """Delete an App. DB constraints handle cascade deletes."""
    app = get_app_by_id(db, app_id)
    db.delete(app)
    db.commit()
    return app_id

def activate_app(db: Session, app_id: int) -> App:
    """
    Set target App as active, deactivate all other Apps, and
    update the global playback session row (resetting current_batch to 0).
    """
    # Verify app exists
    target_app = get_app_by_id(db, app_id)
    
    # Deactivate all apps
    db.query(App).update({App.is_active: False})
    
    # Activate target app
    target_app.is_active = True
    
    # Get session singleton
    session_row = db.query(SessionModel).filter(SessionModel.id == 1).first()
    if not session_row:
        # Create session row if it somehow doesn't exist
        session_row = SessionModel(id=1, active_app_id=app_id, current_batch=0)
        db.add(session_row)
    else:
        session_row.active_app_id = app_id
        session_row.current_batch = 0
        
    db.commit()
    db.refresh(target_app)
    return target_app
