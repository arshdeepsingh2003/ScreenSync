from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, Index
from sqlalchemy.orm import relationship
from backend.db.base import Base

class App(Base):
    __tablename__ = "apps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    icon_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Project-specific default fallback screen settings (null means inherit global)
    default_screen_type = Column(String(20), nullable=True)
    default_screen_url = Column(String, nullable=True)
    default_screen_text = Column(String, nullable=True)

    contents = relationship("Content", back_populates="app", cascade="all, delete-orphan")

# PostgreSQL partial unique index to guarantee at most one active app
Index(
    "one_active_app",
    App.is_active,
    unique=True,
    postgresql_where=(App.is_active == True)
)
