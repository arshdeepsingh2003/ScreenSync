from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.db.database import get_db
from backend.schemas.app_schema import AppCreate, AppUpdate, AppResponse
from backend.services import app_service
from backend.services.exceptions import AppNotFoundError
from backend.auth.dependencies import get_current_admin

router = APIRouter(prefix="/apps", tags=["apps"])

@router.get("", response_model=List[AppResponse])
def get_apps(db: Session = Depends(get_db)):
    """Retrieve all Apps (Public)."""
    return app_service.get_apps(db)

@router.post("", response_model=AppResponse, status_code=status.HTTP_201_CREATED)
def create_app(
    app_data: AppCreate, 
    db: Session = Depends(get_db), 
    current_admin = Depends(get_current_admin)
):
    """Create a new App (Admin)."""
    return app_service.create_app(db, app_data)

@router.put("/{app_id}", response_model=AppResponse)
def update_app(
    app_id: int, 
    app_data: AppUpdate, 
    db: Session = Depends(get_db), 
    current_admin = Depends(get_current_admin)
):
    """Update an App's name or icon URL (Admin)."""
    return app_service.update_app(db, app_id, app_data)

@router.delete("/{app_id}")
def delete_app(
    app_id: int, 
    db: Session = Depends(get_db), 
    current_admin = Depends(get_current_admin)
):
    """Delete an App and all its slides cascaded (Admin)."""
    app_service.delete_app(db, app_id)
    return {"id": app_id, "deleted": True}

@router.post("/{app_id}/activate")
def activate_app(app_id: int, db: Session = Depends(get_db)):
    """Set the App as active and reset playback batch (Public)."""
    target_app = app_service.activate_app(db, app_id)
    return {
        "active_app_id": target_app.id,
        "current_batch": 0
    }
