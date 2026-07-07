from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import relationship
from backend.db.base import Base

class Content(Base):
    __tablename__ = "contents"

    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=True)
    type = Column(String(20), nullable=False) # image, video, pdf, text, html
    file_url = Column(String, nullable=True)
    text_content = Column(String, nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    duration = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    app = relationship("App", back_populates="contents")

# Primary read pattern index: ordered slides per App
Index("idx_contents_app_order", Content.app_id, Content.display_order)
