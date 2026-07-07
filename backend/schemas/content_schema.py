from datetime import datetime
from typing import Optional, Literal, List
from pydantic import BaseModel, Field

class ContentBase(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    type: Literal["image", "video", "pdf", "text", "html"]
    file_url: Optional[str] = None
    text_content: Optional[str] = None
    display_order: int = 0
    duration: Optional[int] = None

class ContentCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    type: Literal["image", "video", "pdf", "text", "html"]
    file_url: Optional[str] = None
    text_content: Optional[str] = None
    display_order: Optional[int] = None
    duration: Optional[int] = None

class ContentUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    type: Optional[Literal["image", "video", "pdf", "text", "html"]] = None
    file_url: Optional[str] = None
    text_content: Optional[str] = None
    display_order: Optional[int] = None
    duration: Optional[int] = None

class ContentResponse(ContentBase):
    id: int
    app_id: int
    created_at: datetime

    class Config:
        from_attributes = True
        orm_mode = True

class ContentReorder(BaseModel):
    ordered_ids: List[int]
