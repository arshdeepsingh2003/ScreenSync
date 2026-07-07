from typing import Optional, Dict, List
from pydantic import BaseModel

class SessionScreenResponse(BaseModel):
    id: int
    screen_number: int
    screen_name: Optional[str] = None

    class Config:
        from_attributes = True
        orm_mode = True

class SessionAssignmentContent(BaseModel):
    content_id: int
    type: str
    file_url: Optional[str] = None
    text_content: Optional[str] = None
    title: Optional[str] = None
    duration: Optional[int] = None

    class Config:
        from_attributes = True
        orm_mode = True

class SessionStateResponse(BaseModel):
    active_app_id: Optional[int] = None
    current_batch: int
    screens: List[SessionScreenResponse]
    assignment: Dict[str, Optional[SessionAssignmentContent]]

    class Config:
        from_attributes = True
        orm_mode = True
