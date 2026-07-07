from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
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

@router.post("/apps/{app_id}/contents/import_pdf", response_model=List[ContentResponse], status_code=status.HTTP_201_CREATED)
async def import_pdf(
    app_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    Import a PDF document and automatically split it into individual slides.
    Admins only.
    """
    # 1. Validate PDF file type
    if file.content_type != "application/pdf" and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF files are supported."
        )

    try:
        # 2. Read file bytes
        file_bytes = await file.read()
        
        # 3. Count PDF pages using pypdf
        import io
        from pypdf import PdfReader
        
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            num_pages = len(reader.pages)
        except Exception as pdf_err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read PDF document: {str(pdf_err)}"
            )

        if num_pages == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded PDF document contains no pages."
            )

        # 4. Upload file to Supabase Storage in slide-media bucket
        from backend.storage.supabase_storage import upload_file
        
        public_url = upload_file(
            bucket_name="slide-media",
            file_bytes=file_bytes,
            filename=file.filename,
            mime_type="application/pdf"
        )
        
        # 5. Create slide content records sequentially
        return content_service.import_pdf_slides(
            db=db,
            app_id=app_id,
            filename=file.filename,
            public_url=public_url,
            num_pages=num_pages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import PDF document: {str(e)}"
        )
