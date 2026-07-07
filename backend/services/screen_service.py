from sqlalchemy.orm import Session
from backend.models.screen import Screen
from backend.schemas.screen_schema import ScreenCreate, ScreenUpdate
from backend.services.exceptions import ScreenNotFoundError, ScreenNumberTakenError
from backend.websocket.events import emit_screen_updated
from backend.services.session_service import clamp_session_batch

def get_screens(db: Session):
    """Retrieve all screens sorted by screen_number."""
    return db.query(Screen).order_by(Screen.screen_number).all()

def get_screen_by_id(db: Session, screen_id: int) -> Screen:
    """Retrieve a single screen by ID or raise ScreenNotFoundError."""
    screen = db.query(Screen).filter(Screen.id == screen_id).first()
    if not screen:
        raise ScreenNotFoundError(f"Screen with ID {screen_id} not found")
    return screen

def create_screen(db: Session, screen_data: ScreenCreate) -> Screen:
    """Create a new Screen, ensuring the screen_number is unique."""
    existing = db.query(Screen).filter(Screen.screen_number == screen_data.screen_number).first()
    if existing:
        raise ScreenNumberTakenError(f"Screen number {screen_data.screen_number} is already taken")
        
    screen = Screen(
        screen_number=screen_data.screen_number,
        screen_name=screen_data.screen_name,
        is_active=True
    )
    db.add(screen)
    db.commit()
    db.refresh(screen)
    clamp_session_batch(db)
    emit_screen_updated()
    return screen

def update_screen(db: Session, screen_id: int, screen_data: ScreenUpdate) -> Screen:
    """Update an existing Screen, checking for unique screen_number if changed."""
    screen = get_screen_by_id(db, screen_id)
    
    if screen_data.screen_number is not None and screen_data.screen_number != screen.screen_number:
        existing = db.query(Screen).filter(Screen.screen_number == screen_data.screen_number).first()
        if existing:
            raise ScreenNumberTakenError(f"Screen number {screen_data.screen_number} is already taken")
            
    for field, value in screen_data.model_dump(exclude_unset=True).items():
        setattr(screen, field, value)
        
    db.commit()
    db.refresh(screen)
    clamp_session_batch(db)
    emit_screen_updated()
    return screen

def delete_screen(db: Session, screen_id: int):
    """Delete a screen."""
    screen = get_screen_by_id(db, screen_id)
    db.delete(screen)
    db.commit()
    clamp_session_batch(db)
    emit_screen_updated()
    return screen_id
