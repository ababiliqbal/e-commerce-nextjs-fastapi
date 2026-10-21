import os
from pathlib import Path
import uuid
from dotenv import load_dotenv
from fastapi import HTTPException, UploadFile, status
import httpx

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "product-images")

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes


async def upload_image_to_supabase(file: UploadFile) -> dict:
    """Mengunggah berkas gambar ke Supabase Storage REST API secara asinkron menggunakan httpx.

    Validasi Keamanan:
    1. Memvalidasi format content_type (hanya image/jpeg, image/png, image/webp).
    2. Membatasi ukuran berkas maksimal 5MB.
    3. Mengamankan nama berkas menggunakan UUIDv4 untuk mencegah path traversal.
    """
    supabase_url = os.getenv("SUPABASE_URL", SUPABASE_URL).rstrip("/")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY)
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", SUPABASE_STORAGE_BUCKET)

    if not supabase_url or not service_role_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Konfigurasi Supabase Storage belum lengkap di environment backend.",
        )

    # 1. Validasi Content Type
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format file tidak didukung. Hanya file image/jpeg, image/png, dan image/webp yang diperbolehkan.",
        )

    # 2. Baca isi file dan Validasi Ukuran File (Maksimal 5MB)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Ukuran berkas melebihi batas maksimum 5MB.",
        )

    # Reset pointer file jika dibutuhkan pembacaan berikutnya
    await file.seek(0)

    # 3. Generate nama file aman menggunakan UUIDv4 dan ekstensi asli
    ext = ""
    if file.filename:
        ext = Path(file.filename).suffix.lower()

    if not ext or ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        mime_to_ext = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        }
        ext = mime_to_ext.get(content_type, ".jpg")

    filename = f"{uuid.uuid4()}{ext}"

    # 4. Unggah ke Supabase REST API menggunakan httpx.AsyncClient
    upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{filename}"
    headers = {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
        "Content-Type": content_type,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                upload_url,
                headers=headers,
                content=content,
            )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Terjadi kegagalan koneksi ke Supabase Storage: {str(exc)}",
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code if response.status_code >= 400 else status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal mengunggah berkas ke Supabase Storage: {response.text}",
        )

    public_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{filename}"

    return {
        "image_url": public_url,
        "public_url": public_url,
        "filename": filename,
        "content_type": content_type,
        "size_bytes": len(content),
    }
