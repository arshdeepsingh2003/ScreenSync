from sqlalchemy.orm import Session as DBSession
from backend.models.session import Session as SessionModel
from backend.models.screen import Screen
from backend.models.content import Content
from backend.services.distribution_service import compute_assignment

def get_session(db: DBSession) -> SessionModel:
    """Retrieve the singleton session row, creating it if it doesn't exist."""
    session_row = db.query(SessionModel).filter(SessionModel.id == 1).first()
    if not session_row:
        session_row = SessionModel(id=1, active_app_id=None, current_batch=0)
        db.add(session_row)
        db.commit()
        db.refresh(session_row)
    return session_row

def get_session_state(db: DBSession) -> dict:
    """
    Get the full session state including:
    - active_app_id
    - current_batch
    - active screens ordered by screen_number
    - computed slide assignments mapped by screen.id
    """
    session_row = get_session(db)
    
    # Query active screens ordered by screen_number
    active_screens = db.query(Screen).filter(Screen.is_active == True).order_by(Screen.screen_number).all()
    
    # Query contents for the active app if any
    slides = []
    if session_row.active_app_id is not None:
        slides = db.query(Content).filter(Content.app_id == session_row.active_app_id).order_by(Content.display_order).all()
        
    # Compute slide assignment
    raw_assignment = compute_assignment(slides, active_screens, session_row.current_batch)
    
    # Format the assignment keys to strings, values to Pydantic-ready dictionaries
    assignment = {}
    for screen_id, content in raw_assignment.items():
        if content:
            assignment[str(screen_id)] = {
                "content_id": content.id,
                "type": content.type,
                "file_url": content.file_url,
                "text_content": content.text_content,
                "title": content.title,
                "duration": content.duration
            }
        else:
            assignment[str(screen_id)] = None
            
    return {
        "active_app_id": session_row.active_app_id,
        "current_batch": session_row.current_batch,
        "screens": active_screens,
        "assignment": assignment
    }

def next(db: DBSession) -> dict:
    """Increment current_batch and return the new session state."""
    session_row = get_session(db)
    session_row.current_batch += 1
    db.commit()
    db.refresh(session_row)
    return get_session_state(db)

def previous(db: DBSession) -> dict:
    """Decrement current_batch (floor at 0) and return the new session state."""
    session_row = get_session(db)
    session_row.current_batch = max(0, session_row.current_batch - 1)
    db.commit()
    db.refresh(session_row)
    return get_session_state(db)

# Aliases for backwards compatibility / alternate naming
next_batch = next
previous_batch = previous
