from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.schemas.auth_schema import LoginRequest, TokenResponse
from backend.services.auth_service import authenticate_admin
from backend.services.exceptions import InvalidCredentialsError

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate admin credentials and return a JWT access token.
    """
    return authenticate_admin(db, request.username, request.password)
