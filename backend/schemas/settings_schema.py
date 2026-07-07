from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel

class SettingsBase(BaseModel):
    default_screen_type: Literal["image", "video", "html", "text"]
    default_screen_url: Optional[str] = None
    default_screen_text: Optional[str] = None

class SettingsUpdate(BaseModel):
    default_screen_type: Optional[Literal["image", "video", "html", "text"]] = None
    default_screen_url: Optional[str] = None
    default_screen_text: Optional[str] = None

class SettingsResponse(SettingsBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True
        orm_mode = True
