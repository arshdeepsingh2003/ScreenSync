from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ScreenBase(BaseModel):
    screen_number: int
    screen_name: Optional[str] = Field(None, max_length=100)
    is_active: bool = True

class ScreenCreate(BaseModel):
    screen_number: int
    screen_name: Optional[str] = Field(None, max_length=100)

class ScreenUpdate(BaseModel):
    screen_number: Optional[int] = None
    screen_name: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None

class ScreenResponse(ScreenBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
        orm_mode = True
