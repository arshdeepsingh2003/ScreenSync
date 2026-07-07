from sqlalchemy import Column, Integer, String, DateTime, CheckConstraint, func
from backend.db.base import Base

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    default_screen_type = Column(String(20), nullable=False) # image, video, html, text
    default_screen_url = Column(String, nullable=True)
    default_screen_text = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("id = 1", name="singleton_settings_row"),
    )
