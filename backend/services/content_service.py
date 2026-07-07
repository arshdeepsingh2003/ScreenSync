from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.models.content import Content
from backend.schemas.content_schema import ContentCreate, ContentUpdate
from backend.services.exceptions import ContentNotFoundError, AppNotFoundError
from backend.services.app_service import get_app_by_id

def get_contents_by_app(db: Session, app_id: int):
    """Retrieve all contents/slides for a specific App, sorted by display_order."""
    # Ensure app exists first
    get_app_by_id(db, app_id)
    return db.query(Content).filter(Content.app_id == app_id).order_by(Content.display_order).all()

def get_content_by_id(db: Session, content_id: int) -> Content:
    """Retrieve a single content slide by ID, or raise ContentNotFoundError."""
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise ContentNotFoundError(f"Content slide with ID {content_id} not found")
    return content

def create_content(db: Session, app_id: int, content_data: ContentCreate) -> Content:
    """Create a new content slide under a specific App."""
    # Ensure app exists
    get_app_by_id(db, app_id)
    
    # Auto-assign display_order if not provided
    display_order = content_data.display_order
    if display_order is None:
        max_order = db.query(func.max(Content.display_order)).filter(Content.app_id == app_id).scalar()
        display_order = (max_order + 1) if max_order is not None else 0
        
    content = Content(
        app_id=app_id,
        title=content_data.title,
        type=content_data.type,
        file_url=content_data.file_url,
        text_content=content_data.text_content,
        display_order=display_order,
        duration=content_data.duration
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return content

def update_content(db: Session, content_id: int, content_data: ContentUpdate) -> Content:
    """Update an existing content slide."""
    content = get_content_by_id(db, content_id)
    
    # Exclude unset values but update fields present
    for field, value in content_data.model_dump(exclude_unset=True).items():
        setattr(content, field, value)
        
    db.commit()
    db.refresh(content)
    return content

def delete_content(db: Session, content_id: int):
    """Delete a content slide."""
    content = get_content_by_id(db, content_id)
    db.delete(content)
    db.commit()
    return content_id

def reorder_contents(db: Session, app_id: int, ordered_ids: list[int]) -> list[Content]:
    """
    Update the display_order of content slides for an App.
    Accepts list of content IDs in the desired order.
    """
    # Ensure app exists
    get_app_by_id(db, app_id)
    
    contents = db.query(Content).filter(Content.app_id == app_id).all()
    content_map = {c.id: c for c in contents}
    
    # Update orders
    for order_index, content_id in enumerate(ordered_ids):
        if content_id in content_map:
            content_map[content_id].display_order = order_index
            
    db.commit()
    
    # Return updated list
    return db.query(Content).filter(Content.app_id == app_id).order_by(Content.display_order).all()
