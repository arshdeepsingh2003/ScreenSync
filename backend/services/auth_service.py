from sqlalchemy.orm import Session
from backend.models.admin import Admin
from backend.auth.password_handler import verify_password
from backend.auth.jwt_handler import create_access_token
from backend.services.exceptions import InvalidCredentialsError
from backend.schemas.auth_schema import TokenResponse
from backend.config import settings

def authenticate_admin(db: Session, username: str, password: str) -> TokenResponse:
    """
    Authenticate an admin user.
    Raises InvalidCredentialsError if authentication fails.
    Returns TokenResponse with a valid access token.
    """
    admin = db.query(Admin).filter(Admin.username == username).first()
    if not admin:
        raise InvalidCredentialsError("Invalid username or password")
        
    if not verify_password(password, admin.password_hash):
        raise InvalidCredentialsError("Invalid username or password")
        
    # Create the JWT token
    token = create_access_token(data={"sub": str(admin.id)})
    expires_in = settings.JWT_EXPIRE_MINUTES * 60
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in
    )
