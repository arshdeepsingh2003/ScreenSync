from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class AppBase(BaseModel):
    name: str = Field(..., max_length=150)
    icon_url: Optional[str] = None

class AppCreate(AppBase):
    pass

class AppUpdate(AppBase):
    pass

class AppResponse(AppBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
        orm_mode = True  # compatible with older pydantic if needed
