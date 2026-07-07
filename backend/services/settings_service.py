from sqlalchemy.orm import Session
from backend.models.settings import Settings
from backend.schemas.settings_schema import SettingsUpdate

def get_settings(db: Session) -> Settings:
    """
    Retrieve the global default screen settings singleton (id=1).
    Create it with default values if it is somehow missing.
    """
    settings_row = db.query(Settings).filter(Settings.id == 1).first()
    if not settings_row:
        settings_row = Settings(
            id=1,
            default_screen_type="text",
            default_screen_text="Welcome to ScreenSync",
            default_screen_url=None
        )
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)
    return settings_row

def update_settings(db: Session, settings_data: SettingsUpdate) -> Settings:
    """Update properties on the settings singleton."""
    settings_row = get_settings(db)
    
    for field, value in settings_data.model_dump(exclude_unset=True).items():
        setattr(settings_row, field, value)
        
    db.commit()
    db.refresh(settings_row)
    return settings_row
