from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.schemas.session_schema import SessionStateResponse
from backend.services import session_service

router = APIRouter(prefix="/session", tags=["session"])

@router.get("/state", response_model=SessionStateResponse)
def get_session_state(db: Session = Depends(get_db)):
    """Retrieve the current playback session state (Public)."""
    return session_service.get_session_state(db)

@router.post("/next", response_model=SessionStateResponse)
def next_batch(db: Session = Depends(get_db)):
    """Increment the playback session current batch (Public)."""
    return session_service.next(db)

@router.post("/previous", response_model=SessionStateResponse)
def previous_batch(db: Session = Depends(get_db)):
    """Decrement the playback session current batch, clamped at 0 (Public)."""
    return session_service.previous(db)
