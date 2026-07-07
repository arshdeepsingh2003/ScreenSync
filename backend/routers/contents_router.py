from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.db.database import get_db
from backend.schemas.content_schema import ContentCreate, ContentUpdate, ContentResponse, ContentReorder
from backend.services import content_service
from backend.services.exceptions import ContentNotFoundError, AppNotFoundError
from backend.auth.dependencies import get_current_admin

# We do not use prefix in the router decorator here because the paths differ in structure (/apps/{app_id}/contents vs /contents/{content_id})
router = APIRouter(tags=["contents"])

@router.get("/apps/{app_id}/contents", response_model=List[ContentResponse])
def get_contents(app_id: int, db: Session = Depends(get_db)):
    """Retrieve all contents/slides for an App (Public)."""
    return content_service.get_contents_by_app(db, app_id)

@router.post("/apps/{app_id}/contents", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
def create_content(
    app_id: int, 
    content_data: ContentCreate, 
    db: Session = Depends(get_db), 
    current_admin = Depends(get_current_admin)
):
    """Create a new slide for an App (Admin)."""
    return content_service.create_content(db, app_id, content_data)

@router.put("/contents/{content_id}", response_model=ContentResponse)
def update_content(
    content_id: int, 
    content_data: ContentUpdate, 
    db: Session = Depends(get_db), 
    current_admin = Depends(get_current_admin)
):
    """Update a slide's attributes (Admin)."""
    return content_service.update_content(db, content_id, content_data)

@router.delete("/contents/{content_id}")
def delete_content(
    content_id: int, 
    db: Session = Depends(get_db), 
    current_admin = Depends(get_current_admin)
):
    """Delete a slide (Admin)."""
    content_service.delete_content(db, content_id)
    return {"id": content_id, "deleted": True}

@router.patch("/apps/{app_id}/contents/reorder", response_model=List[ContentResponse])
def reorder_contents(
    app_id: int, 
    reorder_data: ContentReorder, 
    db: Session = Depends(get_db), 
    current_admin = Depends(get_current_admin)
):
    """Reorder multiple slides for an App using drag-and-drop (Admin)."""
    return content_service.reorder_contents(db, app_id, reorder_data.ordered_ids)
