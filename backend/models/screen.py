from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index, func
from backend.db.base import Base

class Screen(Base):
    __tablename__ = "screens"

    id = Column(Integer, primary_key=True, index=True)
    screen_number = Column(Integer, unique=True, nullable=False, index=True)
    screen_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

# Index for fetching active screens sorted by number
Index("idx_screens_active_number", Screen.is_active, Screen.screen_number)
