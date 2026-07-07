import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    DATABASE_URL: Optional[str] = Field(None, validation_alias="DATABASE_URL")
    SUPABASE_URL: Optional[str] = Field(None, validation_alias="SUPABASE_URL")
    SUPABASE_SERVICE_KEY: Optional[str] = Field(None, validation_alias="SUPABASE_SERVICE_KEY")
    JWT_SECRET: str = Field("supersecretjwtkeychangeinproduction12345", validation_alias="JWT_SECRET")
    JWT_EXPIRE_MINUTES: int = Field(60, validation_alias="JWT_EXPIRE_MINUTES")
    CORS_ORIGINS: str = Field("http://localhost:5173,http://127.0.0.1:5173", validation_alias="CORS_ORIGINS")
    ADMIN_USERNAME: str = Field("admin", validation_alias="ADMIN_USERNAME")
    ADMIN_PASSWORD: str = Field("adminpassword", validation_alias="ADMIN_PASSWORD")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
