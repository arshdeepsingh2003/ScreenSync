import os
import uuid
from typing import Optional
from supabase import create_client, Client
from backend.config import settings

# Initialize Supabase Client with service key to bypass RLS policies on upload
supabase_client: Optional[Client] = None

if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
    supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

def upload_file(bucket_name: str, file_bytes: bytes, filename: str, mime_type: str) -> str:
    """
    Upload file bytes to a specified Supabase storage bucket.
    Generates a unique destination path using UUIDs to avoid filename collisions.
    Returns the public URL to access the uploaded file.
    """
    if not supabase_client:
        raise ValueError("Supabase client is not configured. Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set.")
        
    # Get the file extension
    ext = os.path.splitext(filename)[1]
    # Create unique filename
    unique_filename = f"{uuid.uuid4()}{ext}"
    
    # Upload the file
    supabase_client.storage.from_(bucket_name).upload(
        path=unique_filename,
        file=file_bytes,
        file_options={"content-type": mime_type}
    )
    
    # Get public URL
    public_url = supabase_client.storage.from_(bucket_name).get_public_url(unique_filename)
    return public_url
