from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.db.database import get_db
from backend.schemas.screen_schema import ScreenCreate, ScreenUpdate, ScreenResponse
from backend.services import screen_service
from backend.services.exceptions import ScreenNotFoundError, ScreenNumberTakenError
from backend.auth.dependencies import get_current_admin

router = APIRouter(prefix="/screens", tags=["screens"])

@router.get("", response_model=List[ScreenResponse])
def get_screens(db: Session = Depends(get_db)):
    """Retrieve all screens (Public)."""
    return screen_service.get_screens(db)

@router.post("", response_model=ScreenResponse, status_code=status.HTTP_201_CREATED)
def create_screen(
    screen_data: ScreenCreate, 
    db: Session = Depends(get_db), 
    current_admin = Depends(get_current_admin)
):
    """Create a new Screen (Admin). Ensures unique screen_number."""
    return screen_service.create_screen(db, screen_data)

@router.put("/{screen_id}", response_model=ScreenResponse)
def update_screen(
    screen_id: int, 
    screen_data: ScreenUpdate, 
    db: Session = Depends(get_db), 
    current_admin = Depends(get_current_admin)
):
    """Update a Screen's number, name, or active status (Admin)."""
    return screen_service.update_screen(db, screen_id, screen_data)

@router.delete("/{screen_id}")
def delete_screen(
    screen_id: int, 
    db: Session = Depends(get_db), 
    current_admin = Depends(get_current_admin)
):
    """Delete a Screen (Admin)."""
    screen_service.delete_screen(db, screen_id)
    return {"id": screen_id, "deleted": True}
