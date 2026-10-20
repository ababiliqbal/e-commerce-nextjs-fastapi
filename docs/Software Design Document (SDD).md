# Software Design Document (SDD)

## Platform E-Commerce Berbasis RESTful Microservices

### Riwayat Dokumen (Document Control)

| Versi | Tanggal     | Penulis         | Deskripsi Perubahan (Change Log)                                                                                                                                        | Status  |
| :---- | :---------- | :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| 1.0.0 | 12 Okt 2026 | M. Iqbal Ababil | Inisialisasi MVP, Arsitektur Database, Integrasi Midtrans.                                                                                                              | Dirilis |
| 1.1.0 | 16 Okt 2026 | M. Iqbal Ababil | Refactoring UI/UX (CRO Pattern, Brand Color 'Tech Violet'), Security Audit (CORS Regex, Rate Limiting, XSS Validation).                                                 | Dirilis |
| 1.2.0 | 19 Okt 2026 | M. Iqbal Ababil | DRAF: Desain Arsitektur IAM (JWT Dual-Token, Argon2/Bcrypt, Google OIDC), Skema Fisik `users` & `product_images`, Migrasi Alembic, dan Algoritma Eager Loading (`1:N`). | Draf    |
| 1.3.0 | TBA         | M. Iqbal Ababil | RENCANA: Desain Arsitektur CMS Internal (Admin Dashboard), RBAC Guard Endpoints, & Integrasi S3/Supabase Object Storage.                                                | Rencana |
| 2.0.0 | TBA         | M. Iqbal Ababil | RENCANA: Modul Integrasi Eksternal (API Logistik 3PL), Ongkos Kirim Dinamis & Order State Machine V2.                                                                   | Rencana |

**Versi:** 1.2.0 **Status:** Draf

## BAB 1: DESAIN ARSITEKTURAL (SYSTEM ARCHITECTURE)

Arsitektur sistem ini menggunakan pola **Decoupled 3-Tier Architecture** dengan pemisahan tegas (_Separation of Concerns_) antara lapisan presentasi, lapisan logika bisnis, dan lapisan persistensi data. Pada **Versi 1.2.0**, arsitektur diperluas untuk mendukung manajemen identitas (_stateful session awareness_) melalui skema _Dual-Token JWT_ serta relasi multi-entitas tanpa mengorbankan sifat _stateless_ pada komunikasi inti REST API.

### 1.1 Dekomposisi Modul (Modular Breakdown)

Sistem dipecah menjadi modul-modul independen yang berjalan di kontainer atau _runtime_ terisolasi masing-masing:

1. **Tier 1: Presentation Module (Next.js - Client & SSR)**
   - **UI Components:** Komponen React (Tombol, Form, Grid Produk, **\[Ditambahkan V1.2.0\]** _Interactive Product Image Gallery/Carousel_, _Google Sign-In Button_, dan _Dynamic Auth Navbar_) yang dioptimasi dengan prinsip CRO dan palet warna "Tech Violet".
   - **State Manager:** Pengelola status memori lokal menggunakan **Zustand**, terbagi menjadi dua _store_ terisolasi:
     1. `useCartStore`: Mengelola _state_ keranjang belanja di _localStorage_.
     2. **\[Ditambahkan V1.2.0\]** `useAuthStore`: Mengelola _state_ profil pengguna aktif (`user`) dan `access_token` di memori klien, dilengkapi mekanisme sinkronisasi sesi.
   - **API Client & Auth Interceptor \[Diperbarui V1.2.0\]:** Layanan _fetcher_ pembungkus _request_ HTTP ke _backend_ yang secara otomatis menyisipkan _Header_ `Authorization: Bearer <access_token>`, menyertakan `credentials: "include"` untuk pertukaran _HttpOnly Cookie_, serta menangani _silent token refresh_ jika merespons `401 Unauthorized`.

2. **Tier 2: Application/API Module (FastAPI - Backend)**
   - **Router/Controller:** Menerima _request_ HTTP dari Next.js, memvalidasi parameter _input_ menggunakan Pydantic, dan menerapkan _Rate Limiting_ (`slowapi`). **\[Ditambahkan V1.2.0\]** Mencakup `auth_router` untuk autentikasi lokal/Google SSO dan _dependency guard_ (`get_current_user`, `get_optional_user`, `require_role`).
   - **Service/Business Logic:** Berisi fungsi inti: kalkulasi harga (_Zero-Trust Pricing_), validasi stok, pemanggilan _Payment Gateway_, **\[Ditambahkan V1.2.0\]** _hashing_ kata sandi (`Argon2id`/`Bcrypt`), pembuatan/verifikasi tanda tangan JWT (`HS256`), dan verifikasi kriptografi `id_token` Google OAuth 2.0.
   - **Repository/DAO (Data Access Object):** Modul khusus yang berisi kueri SQL/ORM (SQLAlchemy) untuk berinteraksi dengan database, termasuk strategi _Eager Loading_ (`selectinload`) pada relasi gambar produk.

3. **Tier 3: Persistence Module (PostgreSQL & Alembic)**
   - Mesin basis data relasional PostgreSQL dengan sistem manajemen migrasi skema versi terstruktur menggunakan **Alembic** **\[Ditambahkan V1.2.0\]**.

### 1.2 Relasi Kontrol (Control Relationships)

Hubungan pemanggilan antar-modul bersifat **Uni-directional** (Satu Arah) dari atas ke bawah. Lapis bawah tidak pernah memanggil lapis atas, melainkan hanya mengembalikan _response_.

- **Alur Standar & Katalog Multi-Gambar:** `Next.js API Client` ➔ `FastAPI Router` ➔ `FastAPI Repository (Eager Load Product + Images)` ➔ `PostgreSQL`.
- **Alur Autentikasi Google SSO \[Ditambahkan V1.2.0\]:** `Next.js (Google SDK)` ➔ `FastAPI Auth Router (/auth/google)` ➔ `FastAPI Auth Service (Verify Token to Google OIDC Certificates)` ➔ `PostgreSQL (Upsert User)` ➔ `Return JWT + Set HttpOnly Cookie`.
- **Alur Hybrid Checkout \[Diperbarui V1.2.0\]:** `Next.js API Client (Optional Bearer JWT)` ➔ `FastAPI Order Router` ➔ `FastAPI Service (Extract user_id if authenticated + Pessimistic Lock Stock)` ➔ `PostgreSQL`.
- **Alur Webhook Asinkron:** `Payment Gateway (Midtrans)` ➔ `FastAPI Webhook Router` ➔ `FastAPI Service (Verify SHA-512 & Update Status/Stock)` ➔ `PostgreSQL`.

### 1.3 Representasi Arsitektur (Format AI-Readable Topology)

Berikut adalah topologi arsitektur V1.2.0 yang dirancang agar dapat langsung dipahami oleh _AI Agent_ (Cursor/Cline) saat melakukan _monitored vibe coding_:

```text
[Internet/Client]
       │ (HTTP/HTTPS)
       ▼
┌────────────────────────────────────────────────────────────┐
│ FRONTEND TIER (Next.js / TypeScript)                       │
│ ├─ src/app/ (App Router: /, /product/[id], /cart,          │
│ │            /login, /register, /orders/history)           │
│ ├─ src/components/ (UI, CRO Elements, ProductGallery,      │
│ │                   GoogleLoginBtn, NavbarAuthMenu)        │
│ ├─ src/store/ (Zustand: useCartStore & useAuthStore)       │
│ └─ src/lib/api.ts (HTTP Client + Bearer & Cookie Support)  │
└─────────────────────────────┬──────────────────────────────┘
                              │ (REST API / JSON + Credentials)
       ┌──────────────────────┼──────────────────────┐
       │                      │ (Webhook HTTPS)      │ (OIDC Token Verify)
       ▼                      ▼                      ▼
┌─────────────────────────────────────────────┐  ┌────────────────────────┐
│ BACKEND TIER (FastAPI / Python)             │  │ EXTERNAL PROVIDERS     │
│ ├─ main.py & routers/ (Auth, Products,      │  │ ├─ Midtrans Snap API   │
│ │                      Orders, Webhooks)    │  │ └─ Google OAuth2/OIDC  │
│ ├─ security.py (JWT HS256, Argon2/Bcrypt,   │  └────────────────────────┘
│ │               Google OIDC Verifier, RBAC) │
│ ├─ models.py (SQLAlchemy ORM Entities)      │
│ ├─ schemas.py (Pydantic v2 DTOs)            │
│ └─ alembic/ (Database Migration Scripts)    │
└─────────────────────────────┬───────────────┘
                              │ (TCP/IP Port 5432 / Pooler)
                              ▼
┌────────────────────────────────────────────────────────────┐
│ DATABASE TIER (PostgreSQL)                                 │
│ ├─ Table: users (IAM & RBAC)                               │
│ ├─ Table: products (Core Catalog)                          │
│ ├─ Table: product_images (1:N Gallery Relation)            │
│ ├─ Table: orders (Nullable FK -> users.id)                 │
│ ├─ Table: order_items (FK -> orders.id & products.id)      │
│ └─ Table: alembic_version (Schema Migration Tracker)       │
└────────────────────────────────────────────────────────────┘
```

## BAB 2: DESAIN BASIS DATA DAN DATA (DATABASE DESIGN)

### 2.1 Struktur Data Modul (Data Transfer Objects / DTO)

Kontrak JSON di bawah ini menjadi acuan tunggal (_Single Source of Truth_) bagi AI Agent dalam men-_generate_ `schemas.py` (Pydantic) di FastAPI dan tipe data TypeScript di Next.js.

#### A. DTO Modul Katalog & Multi-Gambar \[Diperbarui V1.2.0\]

- **Product Image DTO (`ProductImageResponse`):**

```json
{
  "id": "uuid",
  "image_url": "string (URL)",
  "is_primary": "boolean",
  "display_order": "integer"
}
```

- **Product Response DTO (`ProductResponse` - Backward Compatible):**

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string | null",
  "price": "number (decimal)",
  "stock_quantity": "integer",
  "image_url": "string | null (Primary thumbnail fallback)",
  "images": [
    {
      "id": "uuid",
      "image_url": "string (URL)",
      "is_primary": "boolean",
      "display_order": "integer"
    }
  ]
}
```

#### B. DTO Modul Identitas & Autentikasi / IAM \[Ditambahkan V1.2.0\]

- **User Register Request DTO (`UserRegisterRequest`):**

```json
{
  "full_name": "string (min 3 chars, no HTML tags)",
  "email": "string (valid email format)",
  "password": "string (min 8 chars, alphanumeric)"
}
```

- **User Login Request DTO (`UserLoginRequest`):**

```json
{
  "email": "string (valid email format)",
  "password": "string"
}
```

- **Google SSO Request DTO (`GoogleAuthRequest`):**

```json
{
  "id_token": "string (Google OIDC JWT)"
}
```

- **Auth Token & User Response DTO (`AuthResponse`):**
  _(Catatan: `refresh_token` tidak dikirim di body JSON, melainkan disematkan langsung pada header `Set-Cookie` sebagai `HttpOnly`)_

```json
{
  "access_token": "string (JWT HS256)",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "string",
    "full_name": "string",
    "role": "CUSTOMER | ADMIN",
    "auth_provider": "LOCAL | GOOGLE"
  }
}
```

#### C. DTO Modul Checkout & Pemesanan \[Diperbarui V1.2.0\]

- **Cart Checkout DTO (`CheckoutRequest`):**

```json
{
  "customer_name": "string",
  "customer_email": "string (format email)",
  "customer_phone": "string (numeric)",
  "shipping_address": "string",
  "items": [
    {
      "product_id": "uuid",
      "quantity": "integer (>0)"
    }
  ]
}
```

- **Order Response & History DTO (`OrderResponse`):**

```json
{
  "id": "uuid",
  "user_id": "uuid | null",
  "customer_name": "string",
  "customer_email": "string",
  "customer_phone": "string",
  "shipping_address": "string",
  "total_amount": "number (decimal)",
  "status": "PENDING | PAID | CANCELLED",
  "payment_gateway_ref": "string | null (Midtrans Snap Token)",
  "created_at": "string (ISO-8601 timestamp)",
  "items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "quantity": "integer",
      "price_at_purchase": "number (decimal)"
    }
  ]
}
```

### 2.2 Desain Skema Fisik (Physical Database Schema)

Skema fisik di PostgreSQL dikawal ketat oleh konstrain kunci asing (_Foreign Keys_), indeks pencarian cepat (_B-Tree Index_), dan dikelola evolusinya melalui **Alembic**.

1. **Tabel: `users` \[Tabel Baru V1.2.0\]**
   - `id` (UUID, Primary Key, Default: `uuid_generate_v4()`)
   - `email` (VARCHAR 255, NOT NULL, **UNIQUE**, **INDEXED**)
   - `full_name` (VARCHAR 255, NOT NULL)
   - `password_hash` (VARCHAR 255, **NULLABLE** — _Bernilai NULL jika pengguna mendaftar via Google SSO_)
   - `auth_provider` (VARCHAR 50, NOT NULL, Default: `'LOCAL'` — _Nilai yang diizinkan: `'LOCAL'`, `'GOOGLE'`_)
   - `role` (VARCHAR 50, NOT NULL, Default: `'CUSTOMER'` — _Nilai yang diizinkan: `'CUSTOMER'`, `'ADMIN'`_)
   - `is_active` (BOOLEAN, NOT NULL, Default: `TRUE`)
   - `created_at` (TIMESTAMPTZ, NOT NULL, Default: `NOW()`)

2. **Tabel: `products` \[Dipertahankan & Direlasikan V1.2.0\]**
   - `id` (UUID, Primary Key, Auto-gen v4)
   - `name` (VARCHAR 255, NOT NULL)
   - `description` (TEXT, Nullable)
   - `price` (NUMERIC 12,2, NOT NULL, Check: `>= 0`)
   - `stock_quantity` (INTEGER, NOT NULL, Check: `>= 0`)
   - `image_url` (VARCHAR 500, Nullable — _Dipertahankan sebagai fallback thumbnail utama agar kompatibel dengan komponen V1.1.0_)
   - `created_at` (TIMESTAMPTZ, Default: `NOW()`)

3. **Tabel: `product_images` \[Tabel Baru V1.2.0\]**
   - `id` (UUID, Primary Key, Default: `uuid_generate_v4()`)
   - `product_id` (UUID, NOT NULL, **INDEXED**) ➔ **Foreign Key** (`products.id`) `ON DELETE CASCADE`
   - `image_url` (TEXT, NOT NULL)
   - `is_primary` (BOOLEAN, NOT NULL, Default: `FALSE`)
   - `display_order` (INTEGER, NOT NULL, Default: `0`)
   - `created_at` (TIMESTAMPTZ, NOT NULL, Default: `NOW()`)

4. **Tabel: `orders` \[Dimodifikasi V1.2.0\]**
   - `id` (UUID, Primary Key, Auto-gen v4)
   - `user_id` (UUID, **NULLABLE**, **INDEXED**) ➔ **Foreign Key** (`users.id`) `ON DELETE SET NULL` **\[Kolom Baru V1.2.0\]**
   - `customer_name` (VARCHAR 255, NOT NULL)
   - `customer_email` (VARCHAR 255, NOT NULL)
   - `customer_phone` (VARCHAR 50, NOT NULL)
   - `shipping_address` (TEXT, NOT NULL)
   - `total_amount` (NUMERIC 12,2, NOT NULL, Check: `>= 0`)
   - `status` (VARCHAR 50, NOT NULL, Default: `'PENDING'`)
   - `payment_gateway_ref` (VARCHAR 255, Nullable)
   - `created_at` (TIMESTAMPTZ, Default: `NOW()`)

5. **Tabel: `order_items`**
   - `id` (UUID, Primary Key, Auto-gen v4)
   - `order_id` (UUID, NOT NULL) ➔ **Foreign Key** (`orders.id`) `ON DELETE CASCADE`
   - `product_id` (UUID, NOT NULL) ➔ **Foreign Key** (`products.id`) `ON DELETE RESTRICT`
   - `quantity` (INTEGER, NOT NULL, Check: `> 0`)
   - `price_at_purchase` (NUMERIC 12,2, NOT NULL)

## BAB 3: SPESIFIKASI ANTARMUKA (INTERFACE SPECIFICATION)

### 3.1 Antarmuka Antar-Modul (Internal API Contracts)

#### A. Endpoint Katalog & Multi-Gambar

- **API 1: Pengambilan Daftar Produk**
  - **Endpoint:** `GET /api/v1/products`
  - **Proses:** Mengambil semua produk beserta relasi `images` menggunakan `selectinload(Product.images)`.
  - **Output (Success):** `HTTP 200 OK` (Array of `ProductResponse`).
- **API 2: Pengambilan Detail Produk Spesifik \[Ditambahkan V1.2.0\]**
  - **Endpoint:** `GET /api/v1/products/{product_id}`
  - **Proses:** Mengambil satu produk berdasarkan UUID beserta daftar `product_images` yang telah diurutkan berdasarkan `display_order ASC`.
  - **Output (Success):** `HTTP 200 OK` (`ProductResponse`).
  - **Output (Error):** `HTTP 404 Not Found` jika UUID produk tidak ditemukan.

#### B. Endpoint Manajemen Identitas / IAM \[Ditambahkan V1.2.0\]

- **API 3: Registrasi Pengguna Baru**
  - **Endpoint:** `POST /api/v1/auth/register`
  - **Proteksi:** _Rate Limiter_ (`5/minute` per IP).
  - **Input Body:** `UserRegisterRequest`.
  - **Output (Success):** `HTTP 201 Created` (`AuthResponse` + `Set-Cookie: refresh_token`).
  - **Output (Error):** `HTTP 409 Conflict` (`{"detail": "Email sudah terdaftar"}`).
- **API 4: Login Kredensial Lokal**
  - **Endpoint:** `POST /api/v1/auth/login`
  - **Proteksi:** _Rate Limiter_ (`5/minute` per IP).
  - **Input Body:** `UserLoginRequest`.
  - **Output (Success):** `HTTP 200 OK` (`AuthResponse` + `Set-Cookie: refresh_token`).
  - **Output (Error):** `HTTP 401 Unauthorized` (`{"detail": "Email atau kata sandi salah"}`).
- **API 5: Login / Registrasi via Google SSO**
  - **Endpoint:** `POST /api/v1/auth/google`
  - **Proteksi:** _Rate Limiter_ (`10/minute` per IP).
  - **Input Body:** `GoogleAuthRequest` (`{"id_token": "..."}`).
  - **Output (Success):** `HTTP 200 OK` (`AuthResponse` + `Set-Cookie: refresh_token`).
  - **Output (Error):** `HTTP 401 Unauthorized` (`{"detail": "Token Google tidak valid atau kedaluwarsa"}`).
- **API 6: Pembaruan Access Token (Silent Refresh)**
  - **Endpoint:** `POST /api/v1/auth/refresh`
  - **Input:** Membaca `refresh_token` dari `HttpOnly Cookie`.
  - **Output (Success):** `HTTP 200 OK` (`{"access_token": "new_jwt_string", "token_type": "bearer"}`).
- **API 7: Profil Pengguna Aktif & Logout**
  - **Endpoint:** `GET /api/v1/auth/me` (Butuh _Header_ `Authorization: Bearer <token>`) & `POST /api/v1/auth/logout` (Menghapus _Cookie_ `refresh_token`).

#### C. Endpoint Pemesanan & Riwayat Transaksi

- **API 8: Inisiasi Pemesanan (Hybrid Checkout) \[Diperbarui V1.2.0\]**
  - **Endpoint:** `POST /api/v1/orders/checkout`
  - **Proteksi:** _Rate Limiter_ (`5/minute` per IP).
  - **Headers:** `Content-Type: application/json`, dan **Opsional** `Authorization: Bearer <access_token>`.
  - **Proses:** Menggunakan dependency `get_optional_user`. Jika token valid, `order.user_id = current_user.id`. Jika tidak ada token, `order.user_id = None` (_Guest_).
  - **Output (Success):** `HTTP 201 Created` (`OrderResponse`).
- **API 9: Riwayat Pesanan Pelanggan \[Ditambahkan V1.2.0\]**
  - **Endpoint:** `GET /api/v1/orders/me`
  - **Proteksi Wajib:** `Depends(get_current_user)` (Menolak akses tamu dengan `401 Unauthorized`).
  - **Output (Success):** `HTTP 200 OK` (Array of `OrderResponse` milik pengguna yang sedang login, diurutkan dari `created_at DESC`).

### 3.2 Antarmuka Subsistem Eksternal (External Systems Contracts)

- **EXT-API-01: Payment Gateway Webhook (Inbound - Midtrans)**
  - **Protokol:** HTTPS POST ke `POST /api/v1/webhooks/midtrans`.
  - **Keamanan Wajib:** Verifikasi `signature_key` menggunakan algoritma `SHA-512` (`order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY`).
- **EXT-API-02: Google Identity Services OIDC Verification \[Ditambahkan V1.2.0\]**
  - **Protokol:** HTTPS (Server-to-Server Key Fetching & Local Cryptographic Verification).
  - **Mekanisme:** Backend FastAPI menggunakan modul `google.oauth2.id_token.verify_oauth2_token` untuk memvalidasi tanda tangan RS256 pada `id_token`, memastikan _issuer_ adalah `accounts.google.com`, dan mencocokkan klaim `aud` dengan variabel lingkungan `GOOGLE_CLIENT_ID`.

## BAB 4: DESAIN KOMPONEN DAN ALGORITMA (COMPONENT SELECTION AND DESIGN)

### 4.1 Pemilihan Komponen Pakai Ulang (Reusable Components)

1. **Frontend (Next.js):**
   - **State Management:** `Zustand` (dengan middleware `persist` untuk keranjang belanja dan penyimpanan terkelola untuk sesi autentikasi).
   - **Form Validation:** `Zod` + `React Hook Form` (Validasi _type-safe_ dan sanitasi regex Anti-XSS).
   - **Google OAuth SDK \[Ditambahkan V1.2.0\]:** `@react-oauth/google` (Pustaka resmi berbasis _Google Identity Services_ terbaru untuk merender tombol Sign-In dan menangkap `credential` / `id_token` di sisi klien).
2. **Backend (FastAPI):**
   - **Database ORM & Migration:** `SQLAlchemy 2.0` + `Alembic` **\[Ditambahkan V1.2.0\]** untuk kontrol versi skema database.
   - **Schema Validation:** `Pydantic v2` + `pydantic[email]`.
   - **Security & Cryptography \[Ditambahkan V1.2.0\]:**
     - `pwdlib[argon2]` atau `passlib[bcrypt]` / `bcrypt` murni untuk _password hashing_ yang tahan serangan GPU.
     - `PyJWT` (atau `python-jose[cryptography]`) untuk enkoda/dekoda token JWT standar RFC 7519.
     - `google-auth` & `requests` untuk verifikasi token OIDC Google.
   - **Rate Limiting:** `SlowAPI`.

### 4.2 Rancangan Algoritmik Matematis (Kompleksitas & Logika Inti)

#### A. Algoritma 1: Validasi Harga Keranjang & Konfirmasi Stok (Pessimistic Locking)

1. Ekstrak identitas pengguna secara opsional dari header JWT ($O(1)$).
2. Lakukan kueri `SELECT ... FOR UPDATE` pada tabel `products` untuk mengunci baris produk yang dibeli dan mencegah _race condition_.
3. Hitung ulang harga secara tertutup di server: $\text{total\_amount} = \sum (\text{item\_qty} \times \text{db\_price})$.
4. Kurangi stok, simpan `Order` (beserta `user_id` jika ada) dan `OrderItem`, minta token Midtrans Snap, lalu _commit_ transaksi secara atomik.

- **Time Complexity:** $\approx O(n \log N)$
- **Space Complexity:** $O(n)$

#### B. Algoritma 2: Eager Loading Galeri Multi-Gambar Anti N+1 Query \[Ditambahkan V1.2.0\]

Saat memuat $M$ produk yang masing-masing memiliki $K$ gambar di tabel `product_images`, pendekatan _Lazy Loading_ yang naif akan mengeksekusi $1 + M$ kueri SQL (_N+1 Query Problem_), yang akan melumpuhkan latensi API di atas batas 200 ms.
**Langkah Komputasi (`selectinload`):**

1. Eksekusi Kueri 1: `SELECT * FROM products ORDER BY created_at DESC;` (Mengambil $M$ produk).
2. Kumpulkan seluruh `product.id` ke dalam memori dan eksekusi Kueri 2 secara otomatis melalui SQLAlchemy `selectinload(Product.images)`:
   `SELECT * FROM product_images WHERE product_id IN (id_1, id_2, ..., id_M) ORDER BY display_order ASC;`
3. Petakan (_hash-join_ di memori ORM) daftar gambar ke masing-masing objek produk induknya.

- **Database Round-Trips:** Konstan **$O(1)$** (Selalu tepat **2 kueri SQL**, berapapun jumlah produk $M$ yang ditampilkan).
- **Time Complexity (Waktu):** $O(M + K_{\text{total}})$ di memori aplikasi.

#### C. Algoritma 3: Verifikasi Kriptografi JWT & RBAC Guard \[Ditambahkan V1.2.0\]

1. Ekstrak token dari header `Authorization: Bearer <token>`.
2. Verifikasi tanda tangan digital menggunakan algoritma HMAC-SHA256:
   $$\text{Signature} = \text{HMAC-SHA256}(\text{Base64Url}(\text{Header}) + \text{"."} + \text{Base64Url}(\text{Payload}), \text{JWT\_SECRET\_KEY})$$
3. Periksa klaim waktu kedaluwarsa ($\text{exp} > t_{\text{now}}$) dan tipe token ($\text{type} == \text{"access"}$).
4. Jika rute membutuhkan hak akses khusus (misal: `ADMIN`), evaluasi klaim $\text{payload.role} == \text{"ADMIN"}$ dalam waktu konstan $O(1)$.

## BAB 5: KOMPONEN SEKUNDER DAN OPERASIONAL EKOSISTEM

### 5.1 Pemilihan Teknologi & Konfigurasi Lingkungan (Environment Variables)

Untuk mendukung fitur V1.2.0 tanpa membocorkan kredensial di kode sumber, variabel lingkungan berikut wajib dikonfigurasi:

- **Backend (`.env` / Vercel Backend Environment):**
  - `DATABASE_URL`: String koneksi PostgreSQL (Supabase Pooler/Direct).
  - `MIDTRANS_SERVER_KEY` & `MIDTRANS_IS_PRODUCTION`: Kredensial pembayaran.
  - `ALLOWED_ORIGINS`: Daftar domain frontend yang diizinkan oleh CORS.
  - **\[Baru V1.2.0\]** `JWT_SECRET_KEY`: Kunci rahasia acak minimal 32-byte (256-bit) yang dihasilkan via `openssl rand -hex 32`.
  - **\[Baru V1.2.0\]** `JWT_ALGORITHM`: Default `HS256`.
  - **\[Baru V1.2.0\]** `ACCESS_TOKEN_EXPIRE_MINUTES`: Default `30`.
  - **\[Baru V1.2.0\]** `REFRESH_TOKEN_EXPIRE_DAYS`: Default `7`.
  - **\[Baru V1.2.0\]** `GOOGLE_CLIENT_ID`: ID Klien OAuth 2.0 dari Google Cloud Console.
- **Frontend (`.env.local` / Vercel Frontend Config):**
  - `NEXT_PUBLIC_API_URL`: URL publik _backend_ FastAPI (tanpa garis miring penutup).
  - `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`: Kunci klien Midtrans Snap.
  - **\[Baru V1.2.0\]** `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: ID Klien OAuth 2.0 publik (harus identik dengan `GOOGLE_CLIENT_ID` di _backend_).

### 5.2 Manajemen Konfigurasi dan Otomatisasi (CI/CD Pipeline)

#### 5.2.1 Manajemen Versi & Migrasi Basis Data (Git & Alembic Governance)

- **Aturan Penamaan Cabang:** `feature/` (misal: `feature/db-migration-v1.2`, `feature/iam-backend`, `feature/multi-image-ui`), `bugfix/`, `chore/`, dan `hotfix/`.
- **Aturan Migrasi Skema \[Ditambahkan V1.2.0\]:**
  - Setiap perubahan pada `backend/models.py` wajib diikuti dengan pembuatan revisi Alembic (`alembic revision --autogenerate -m "deskripsi"`).
  - File revisi di dalam `backend/alembic/versions/` wajib diperiksa secara manual (_code review_) untuk memastikan tidak ada perintah `op.drop_table()` atau `op.drop_column()` yang tidak disengaja sebelum menjalankan `alembic upgrade head`.

#### 5.2.2 Pembangunan Sistem & Integrasi (System Building & Automation)

Otomatisasi perakitan perangkat lunak ditangani oleh GitHub Actions dan Vercel CD:

- **Type & Code Checking:** Memvalidasi TypeScript (`tsc --noEmit`), ESLint pada Next.js, serta validasi sintaks/impor Python dan skema Pydantic pada FastAPI.
- **Build Validation:** Mengeksekusi `npm run build` untuk memastikan seluruh halaman baru (`/login`, `/register`, `/orders/history`, dan galeri `/product/[id]`) berhasil dikompilasi tanpa _error_.
