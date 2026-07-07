from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.schemas.settings_schema import SettingsUpdate, SettingsResponse
from backend.services import settings_service
from backend.auth.dependencies import get_current_admin

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Retrieve the Default Screen settings (Public)."""
    return settings_service.get_settings(db)

@router.put("", response_model=SettingsResponse)
def update_settings(
    settings_data: SettingsUpdate, 
    db: Session = Depends(get_db), 
    current_admin = Depends(get_current_admin)
):
    """Update Default Screen settings configuration (Admin)."""
    return settings_service.update_settings(db, settings_data)
