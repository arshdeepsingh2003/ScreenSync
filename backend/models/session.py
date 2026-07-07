from sqlalchemy import Column, Integer, ForeignKey, DateTime, CheckConstraint, func
from sqlalchemy.orm import relationship
from backend.db.base import Base

class Session(Base):
    __tablename__ = "session"

    id = Column(Integer, primary_key=True, default=1)
    active_app_id = Column(Integer, ForeignKey("apps.id", ondelete="SET NULL"), nullable=True)
    current_batch = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    app = relationship("App")

    __table_args__ = (
        CheckConstraint("id = 1", name="singleton_session_row"),
    )
