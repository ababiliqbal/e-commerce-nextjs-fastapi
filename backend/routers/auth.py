import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
import jwt
from sqlalchemy.orm import Session

from database import get_db
from models import AuthProvider, User, UserRole
from schemas import (
    AuthResponse,
    GoogleAuthRequest,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from security import (
    JWT_ALGORITHM,
    JWT_SECRET_KEY,
    REFRESH_TOKEN_EXPIRE_DAYS,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_password_hash,
    verify_google_token,
    verify_password,
)

# Impor limiter dari modul utama (dengan fallback jika diimpor secara terisolasi)
try:
    from main import limiter
except ImportError:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Helper untuk mengatur refresh_token ke HttpOnly secure cookie."""
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/",
    )


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("5/minute")
def register(
    request: Request,
    payload: UserRegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Mendaftarkan pengguna baru dengan kredensial lokal (email & password).
    Memeriksa keunikan email, meng-hash kata sandi, dan membuat sesi JWT.
    """
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email sudah terdaftar",
        )

    hashed_password = get_password_hash(payload.password)
    new_user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hashed_password,
        auth_provider=AuthProvider.LOCAL.value,
        role=UserRole.CUSTOMER.value,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": str(new_user.id)})
    refresh_token = create_refresh_token(data={"sub": str(new_user.id)})
    _set_refresh_cookie(response, refresh_token)

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
)
@limiter.limit("5/minute")
def login(
    request: Request,
    payload: UserLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Mengautentikasi pengguna dengan kredensial lokal (email & password).
    Jika gagal, mengembalikan 401 generik untuk mencegah user enumeration.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if (
        not user
        or not user.password_hash
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau kata sandi salah",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Akun pengguna dinonaktifkan",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    _set_refresh_cookie(response, refresh_token)

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/google",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
)
@limiter.limit("10/minute")
def google_auth(
    request: Request,
    payload: GoogleAuthRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Mengautentikasi atau mendaftarkan pengguna melalui Google SSO (OIDC ID Token).
    Melakukan 'Upsert': membuat user baru jika email belum ada di database.
    """
    id_info = verify_google_token(payload.id_token)
    email: Optional[str] = id_info.get("email")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token Google tidak memuat alamat email yang valid",
        )

    full_name: str = (
        id_info.get("name")
        or id_info.get("given_name")
        or email.split("@")[0]
    )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=full_name,
            password_hash=None,
            auth_provider=AuthProvider.GOOGLE.value,
            role=UserRole.CUSTOMER.value,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.full_name and full_name:
            user.full_name = full_name
            db.commit()
            db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Akun pengguna dinonaktifkan",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    _set_refresh_cookie(response, refresh_token)

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/refresh",
    status_code=status.HTTP_200_OK,
)
def refresh_access_token(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Memperbarui access_token menggunakan refresh_token yang tersimpan di HttpOnly Cookie.
    """
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token tidak ditemukan pada cookie",
        )

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        token_type = payload.get("type")
        user_id_str = payload.get("sub")

        if token_type != "refresh" or not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token tidak valid",
            )
        user_id = uuid.UUID(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token tidak valid atau telah kedaluwarsa",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pengguna tidak ditemukan atau akun dinonaktifkan",
        )

    new_access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
)
def logout(response: Response):
    """
    Menghapus cookie refresh_token untuk mengakhiri sesi pengguna.
    """
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )
    return {"detail": "Berhasil logout"}


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Mengambil data profil pengguna yang sedang login berdasarkan Bearer token aktif.
    """
    return current_user
