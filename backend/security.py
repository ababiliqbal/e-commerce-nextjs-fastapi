import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

# ----------------------------------------------------------------------------
# Workaround for passlib + bcrypt >= 4.0.0 / 5.0.0 compatibility
# ----------------------------------------------------------------------------
import bcrypt

if not hasattr(bcrypt, "__about__"):
    class _BcryptAbout:
        __version__ = getattr(bcrypt, "__version__", "4.0.0")

    bcrypt.__about__ = _BcryptAbout()

_original_hashpw = bcrypt.hashpw


def _safe_hashpw(password, salt):
    if isinstance(password, str):
        password = password.encode("utf-8")
    if len(password) > 72:
        password = password[:72]
    return _original_hashpw(password, salt)


bcrypt.hashpw = _safe_hashpw
# ----------------------------------------------------------------------------

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import User

# Load environment variables from .env
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "ambashop-ecommerce-super-secret-jwt-key-2026-production-min-32-bytes",
)
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# Password context with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Mengganti OAuth2PasswordBearer dengan HTTPBearer agar Swagger UI menggunakan field Bearer Token murni
security_scheme = HTTPBearer(auto_error=True)
security_scheme_optional = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Memverifikasi kecocokan antara plain password dengan hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Menghasilkan hash password aman menggunakan algoritma bcrypt."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Membuat JWT access token berdurasi terbatas menggunakan HS256."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Membuat JWT refresh token berdurasi panjang (default: 7 hari)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def verify_google_token(token: str) -> dict:
    """
    Memvalidasi Google OIDC ID Token menggunakan google-auth library.
    Mengembalikan dictionary info payload pengguna jika valid.
    """
    try:
        id_info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None,
        )
        return id_info
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token Google tidak valid atau kedaluwarsa: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency FastAPI untuk mengekstrak dan memvalidasi JWT dari Authorization Header,
    serta mengembalikan User aktif dari database. Melempar HTTPException 401 jika gagal.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kredensial autentikasi tidak valid atau telah kedaluwarsa.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_identifier: Optional[str] = payload.get("sub")
        token_type: Optional[str] = payload.get("type")

        if user_identifier is None or (token_type and token_type != "access"):
            raise credentials_exception
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    user = None
    try:
        user_uuid = uuid.UUID(user_identifier)
        user = db.query(User).filter(User.id == user_uuid).first()
    except (ValueError, AttributeError):
        pass

    if user is None:
        user = db.query(User).filter(User.email == user_identifier).first()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Akun pengguna tidak aktif atau dinonaktifkan.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme_optional),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Dependency FastAPI untuk mengambil pengguna aktif dari token jika tersedia.
    Jika token tidak disertakan atau tidak valid, mengembalikan None tanpa melempar error 401.
    """
    if not credentials:
        return None

    token = credentials.credentials

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_identifier: Optional[str] = payload.get("sub")
        token_type: Optional[str] = payload.get("type")

        if not user_identifier or (token_type and token_type != "access"):
            return None

        user = None
        try:
            user_uuid = uuid.UUID(user_identifier)
            user = db.query(User).filter(User.id == user_uuid).first()
        except (ValueError, AttributeError):
            pass

        if user is None:
            user = db.query(User).filter(User.email == user_identifier).first()

        if user is None or not user.is_active:
            return None

        return user
    except Exception:
        return None


def require_role(required_role: str):
    """
    Factory dependency FastAPI untuk memeriksa apakah pengguna yang diautentikasi
    memiliki role tertentu. Melempar HTTPException 403 jika role tidak cocok.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_str = (
            current_user.role.value
            if hasattr(current_user.role, "value")
            else str(current_user.role)
        )
        target_role_str = (
            required_role.value
            if hasattr(required_role, "value")
            else str(required_role)
        )

        if user_role_str != target_role_str:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Akses ditolak: role '{target_role_str}' diperlukan untuk mengakses resource ini.",
            )
        return current_user

    return role_checker