from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import Literal
from backend.storage.supabase_storage import upload_file
from backend.auth.dependencies import get_current_admin

router = APIRouter(prefix="/uploads", tags=["uploads"])

@router.post("")
async def upload(
    file: UploadFile = File(...),
    bucket: Literal["app-icons", "slide-media", "default-screen"] = Form(...),
    current_admin = Depends(get_current_admin)
):
    """
    Upload a media file (icons, images, videos, PDFs) to the specified Supabase Storage bucket.
    Protected endpoint: requires active admin JWT session.
    """
    try:
        # Read file bytes
        file_bytes = await file.read()
        
        # Determine content type, fallback if empty
        mime_type = file.content_type
        if not mime_type:
            mime_type = "application/octet-stream"
            
        # Delegate upload to Supabase storage helper
        public_url = upload_file(
            bucket_name=bucket,
            file_bytes=file_bytes,
            filename=file.filename,
            mime_type=mime_type
        )
        
        return {"url": public_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )
