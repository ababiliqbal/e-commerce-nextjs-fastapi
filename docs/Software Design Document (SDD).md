# Software Design Document (SDD)

## Platform E-Commerce Berbasis RESTful Microservices

### Riwayat Dokumen (Document Control)

| Versi | Tanggal     | Penulis         | Deskripsi Perubahan (Change Log)                                                                                                                                                             | Status  |
| :---- | :---------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| 1.0.0 | 12 Okt 2026 | M. Iqbal Ababil | Inisialisasi MVP, Arsitektur Database, Integrasi Midtrans.                                                                                                                                   | Dirilis |
| 1.1.0 | 16 Okt 2026 | M. Iqbal Ababil | Refactoring UI/UX (CRO Pattern, Brand Color 'Tech Violet'), Security Audit (CORS Regex, Rate Limiting, XSS Validation).                                                                      | Dirilis |
| 1.2.0 | 19 Okt 2026 | M. Iqbal Ababil | Desain Arsitektur IAM (JWT Dual-Token, Argon2/Bcrypt, Google OIDC), Skema Fisik `users` & `product_images`, Migrasi Alembic, dan Algoritma Eager Loading (`1:N`).                            | Dirilis |
| 1.3.0 | 21 Okt 2026 | M. Iqbal Ababil | DRAF: Desain Arsitektur CMS Internal (Admin Dashboard), Real-Time SQL Analytics, Soft-Delete (`is_active`), Order Fulfillment FSM, & Integrasi Cloud Object Storage (Supabase Storage / S3). | Draf    |
| 2.0.0 | TBA         | M. Iqbal Ababil | RENCANA: Modul Integrasi Eksternal (API Logistik 3PL), Ongkos Kirim Dinamis & Order State Machine V2.                                                                                        | Rencana |

**Versi:** 1.3.0 **Status:** Draf

## BAB 1: DESAIN ARSITEKTURAL (SYSTEM ARCHITECTURE)

Arsitektur sistem ini menggunakan pola **Decoupled 3-Tier Architecture** dengan pemisahan tegas (_Separation of Concerns_) antara lapisan presentasi, lapisan logika bisnis, dan lapisan persistensi data. Pada **Versi 1.3.0**, arsitektur diperluas untuk mendukung operasi **Internal Content Management System (CMS) & Operations Dashboard** melalui pemisahan jalur otorisasi `ADMIN` (_Role-Based Access Control_), pengalihan penyimpanan berkas gambar biner ke **Cloud Object Storage (Supabase Storage / S3)**, serta mesin agregasi analitik real-time di tingkat basis data.

### 1.1 Dekomposisi Modul (Modular Breakdown)

Sistem dipecah menjadi modul-modul independen yang berjalan di kontainer atau _runtime_ terisolasi masing-masing:

1. **Tier 1: Presentation Module (Next.js - Client & SSR)**
   - **Storefront UI Components:** Komponen React pelanggan (Grid Produk, _Interactive Product Image Gallery_, _Google Sign-In Button_, dan _Dynamic Auth Navbar_) dengan prinsip CRO dan palet warna "Tech Violet".
   - **Admin Backoffice UI Components [Ditambahkan V1.3.0]:** Ruang kerja internal (`/admin/*`) yang dilindungi _Client Role Guard_, mencakup _Admin Sidebar Shell_, _Executive KPI & Low-Stock Cards_, _Product CRUD Modal with Drag-and-Drop Image Uploader_, serta _Order Fulfillment Table_.
   - **State Manager:** Pengelola status memori lokal menggunakan **Zustand**, terbagi menjadi dua _store_ terisolasi:
     1. `useCartStore`: Mengelola _state_ keranjang belanja di _localStorage_.
     2. `useAuthStore`: Mengelola _state_ profil pengguna aktif (`user`), `access_token`, preferensi pengiriman tersimpan (`savedShipping`), serta isolasi sesi pesanan saat login/logout.
   - **API Client & Auth Interceptor [Diperbarui V1.3.0]:** Layanan _fetcher_ pembungkus _request_ HTTP ke _backend_ yang menyisipkan _Header_ `Authorization: Bearer <access_token>`, menyertakan `credentials: "include"`, menangani _silent token refresh_, serta mendukung pengiriman `FormData` (`multipart/form-data`) untuk unggahan gambar Admin.

2. **Tier 2: Application/API Module (FastAPI - Backend)**
   - **Router/Controller:** Menerima _request_ HTTP dari Next.js, memvalidasi parameter menggunakan Pydantic, dan menerapkan _Rate Limiting_ (`slowapi`). Mencakup `auth_router`, `products_router`, `orders_router`, dan **[Ditambahkan V1.3.0]** `admin_router` (`/api/v1/admin/*`) yang seluruh rutenya dikunci secara terpusat menggunakan _dependency_ `Depends(require_role("ADMIN"))`.
   - **Service/Business Logic:** Berisi fungsi inti: kalkulasi harga (_Zero-Trust Pricing_), validasi stok, pemanggilan _Payment Gateway_, _hashing_ kata sandi (`Bcrypt`), manajemen JWT (`HS256`), verifikasi OIDC Google, serta **[Ditambahkan V1.3.0]** validasi _Finite State Machine_ (FSM) pemenuhan pesanan dan layanan pengunggah objek biner (`storage.py`) ke Supabase Storage.
   - **Repository/DAO (Data Access Object):** Modul kueri SQL/ORM (SQLAlchemy) untuk berinteraksi dengan database, termasuk strategi _Eager Loading_ (`selectinload`), pemfilteran produk aktif (`is_active == True`), dan **[Ditambahkan V1.3.0]** kueri agregasi analitik eksekutif (`SUM`, `COUNT`, `CASE WHEN`).

3. **Tier 3: Persistence & Object Storage Module (PostgreSQL, Alembic & Supabase Storage) [Diperbarui V1.3.0]**
   - **Relational Database:** Mesin basis data PostgreSQL dengan manajemen migrasi skema terstruktur menggunakan **Alembic**.
   - **Cloud Object Storage [Ditambahkan V1.3.0]:** Layanan penyimpanan objek terdistribusi (Supabase Storage Bucket `product-images`) untuk menyimpan berkas fisik gambar produk (`.jpg`, `.png`, `.webp`) dan menyajikannya melalui CDN publik.

### 1.2 Relasi Kontrol (Control Relationships)

Hubungan pemanggilan antar-modul bersifat **Uni-directional** (Satu Arah) dari atas ke bawah. Lapis bawah tidak pernah memanggil lapis atas, melainkan hanya mengembalikan _response_.

- **Alur Standar & Katalog Multi-Gambar Publik:** `Next.js API Client` ➔ `FastAPI Product Router` ➔ `FastAPI Repository (Filter is_active=True + Eager Load Images)` ➔ `PostgreSQL`.
- **Alur Autentikasi Google SSO:** `Next.js (Google SDK)` ➔ `FastAPI Auth Router (/auth/google)` ➔ `FastAPI Auth Service (Verify Token to Google OIDC Certificates)` ➔ `PostgreSQL (Upsert User)` ➔ `Return JWT + Set HttpOnly Cookie`.
- **Alur Hybrid Checkout:** `Next.js API Client (Optional Bearer JWT)` ➔ `FastAPI Order Router` ➔ `FastAPI Service (Extract user_id + Verify is_active & Pessimistic Lock Stock)` ➔ `PostgreSQL`.
- **Alur Unggah Gambar & Manajemen Katalog Admin [Ditambahkan V1.3.0]:** `Next.js Admin UI (Bearer JWT Admin)` ➔ `FastAPI Admin Router (Guard: require_role("ADMIN"))` ➔ `Storage Service (Validate MIME/Size & Upload to Supabase Storage Bucket)` ➔ `Return Public CDN URL` ➔ `PostgreSQL (Insert/Update products & product_images)`.
- **Alur Analitik & Fulfillment Pesanan Admin [Ditambahkan V1.3.0]:** `Next.js Admin UI (Bearer JWT Admin)` ➔ `FastAPI Admin Router` ➔ `FastAPI Service (Execute SQL Aggregation / Validate Order FSM Transition)` ➔ `PostgreSQL`.
- **Alur Webhook Asinkron:** `Payment Gateway (Midtrans)` ➔ `FastAPI Webhook Router` ➔ `FastAPI Service (Verify SHA-512 & Update Status/Stock)` ➔ `PostgreSQL`.

### 1.3 Representasi Arsitektur (Format AI-Readable Topology)

Berikut adalah topologi arsitektur V1.3.0 yang dirancang agar dapat langsung dipahami oleh _AI Agent_ (Cursor/Cline) saat melakukan _monitored vibe coding_:

```text
[Internet/Client & Store Admin]
       │ (HTTP/HTTPS)
       ▼
┌────────────────────────────────────────────────────────────────────┐
│ FRONTEND TIER (Next.js / TypeScript)                               │
│ ├─ src/app/ (Storefront: /, /product/[id], /cart, /login,          │
│ │            /register, /orders/history, /orders/[id])             │
│ ├─ src/app/admin/ (Backoffice CMS: /admin, /admin/products,        │
│ │                  /admin/orders + Role Guard Layout)              │
│ ├─ src/components/ (UI, ProductGallery, GoogleLoginBtn,            │
│ │                   AdminSidebar, ImageUploader, KPICards)         │
│ ├─ src/store/ (Zustand: useCartStore & useAuthStore)               │
│ └─ src/lib/api.ts (HTTP Client + Bearer, Cookie & FormData)        │
└─────────────────────────────┬──────────────────────────────────────┘
                              │ (REST API / JSON & Multipart + Credentials)
       ┌──────────────────────┼──────────────────────┐
       │                      │ (Webhook HTTPS)      │ (OIDC & Storage HTTPS)
       ▼                      ▼                      ▼
┌─────────────────────────────────────────────┐  ┌────────────────────────────┐
│ BACKEND TIER (FastAPI / Python)             │  │ EXTERNAL CLOUD SERVICES    │
│ ├─ main.py & routers/ (Auth, Products,      │  │ ├─ Midtrans Snap API       │
│ │                      Orders, Admin,       │  │ ├─ Google OAuth2/OIDC      │
│ │                      Webhooks)            │  │ └─ Supabase Object Storage │
│ ├─ security.py (JWT HS256, Bcrypt,          │  │    (Bucket: product-images)│
│ │               Google OIDC, RBAC Guard)    │  └────────────────────────────┘
│ ├─ storage.py (MIME Validator & S3 Uploader)│
│ ├─ models.py (SQLAlchemy ORM Entities)      │
│ ├─ schemas.py (Pydantic v2 DTOs)            │
│ └─ alembic/ (Database Migration Scripts)    │
└─────────────────────────────┬───────────────┘
                              │ (TCP/IP Port 5432 / Pooler)
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ DATABASE TIER (PostgreSQL)                                         │
│ ├─ Table: users (IAM & RBAC: CUSTOMER | ADMIN)                     │
│ ├─ Table: products (Core Catalog + is_active Soft-Delete Flag)     │
│ ├─ Table: product_images (1:N Gallery Relation -> CDN URLs)        │
│ ├─ Table: orders (FSM Status: PENDING|PAID|SHIPPED|COMPLETED|...)  │
│ ├─ Table: order_items (FK -> orders.id & products.id)              │
│ └─ Table: alembic_version (Schema Migration Tracker)               │
└────────────────────────────────────────────────────────────────────┘
```

## BAB 2: DESAIN BASIS DATA DAN DATA (DATABASE DESIGN)

### 2.1 Struktur Data Modul (Data Transfer Objects / DTO)

Kontrak JSON di bawah ini menjadi acuan tunggal (_Single Source of Truth_) bagi AI Agent dalam men-_generate_ `schemas.py` (Pydantic) di FastAPI dan tipe data TypeScript di Next.js.

#### A. DTO Modul Katalog & Multi-Gambar [Diperbarui V1.3.0]

- **Product Image DTO (`ProductImageResponse` & `ProductImageInput`):**

```json
{
  "id": "uuid (optional on input)",
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
  "is_active": "boolean (true = tampil di katalog, false = diarsipkan)",
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

#### B. DTO Modul Identitas & Autentikasi / IAM

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

#### C. DTO Modul Checkout & Pemesanan [Diperbarui V1.3.0]

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
  "status": "PENDING | PAID | SHIPPED | COMPLETED | CANCELLED",
  "payment_gateway_ref": "string | null (Midtrans Snap Token)",
  "created_at": "string (ISO-8601 timestamp)",
  "items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "product_name": "string (optional enriched field)",
      "quantity": "integer",
      "price_at_purchase": "number (decimal)"
    }
  ]
}
```

#### D. DTO Modul Dashboard Admin, Analitik & Cloud Upload [Ditambahkan V1.3.0]

- **Admin Create / Update Product DTO (`ProductAdminWriteRequest`):**

```json
{
  "name": "string (min 3 chars, no HTML tags)",
  "description": "string | null",
  "price": "number (decimal > 0)",
  "stock_quantity": "integer (>= 0)",
  "is_active": "boolean (default: true)",
  "image_url": "string | null",
  "images": [
    {
      "image_url": "string (valid HTTPS URL)",
      "is_primary": "boolean",
      "display_order": "integer (>= 0)"
    }
  ]
}
```

- **Admin Order Status Mutation DTO (`OrderStatusUpdateRequest`):**

```json
{
  "status": "SHIPPED | COMPLETED | CANCELLED"
}
```

- **Cloud Image Upload Response DTO (`ImageUploadResponse`):**

```json
{
  "image_url": "string (Public Supabase Storage CDN URL)",
  "filename": "string (UUID-sanitized object key)",
  "content_type": "string (image/jpeg | image/png | image/webp)",
  "size_bytes": "integer"
}
```

- **Executive Analytics Summary DTO (`AdminAnalyticsResponse`):**

```json
{
  "total_revenue": "number (decimal - sum of PAID, SHIPPED, COMPLETED orders)",
  "total_orders": "integer",
  "orders_by_status": {
    "PENDING": "integer",
    "PAID": "integer",
    "SHIPPED": "integer",
    "COMPLETED": "integer",
    "CANCELLED": "integer"
  },
  "conversion_rate": "number (float percentage 0-100)",
  "active_products_count": "integer",
  "archived_products_count": "integer",
  "low_stock_products": [
    {
      "id": "uuid",
      "name": "string",
      "stock_quantity": "integer",
      "price": "number (decimal)",
      "image_url": "string | null"
    }
  ],
  "top_selling_products": [
    {
      "product_id": "uuid",
      "name": "string",
      "total_sold": "integer",
      "total_revenue": "number (decimal)"
    }
  ]
}
```

### 2.2 Desain Skema Fisik (Physical Database Schema)

Skema fisik di PostgreSQL dikawal ketat oleh konstrain kunci asing (_Foreign Keys_), indeks pencarian cepat (_B-Tree Index_), dan dikelola evolusinya melalui **Alembic**.

1. **Tabel: `users`**
   - `id` (UUID, Primary Key, Default: `uuid_generate_v4()`)
   - `email` (VARCHAR 255, NOT NULL, **UNIQUE**, **INDEXED**)
   - `full_name` (VARCHAR 255, NOT NULL)
   - `password_hash` (VARCHAR 255, **NULLABLE**)
   - `auth_provider` (VARCHAR 50, NOT NULL, Default: `'LOCAL'`)
   - `role` (VARCHAR 50, NOT NULL, Default: `'CUSTOMER'` — _Nilai: `'CUSTOMER'`, `'ADMIN'`_)
   - `is_active` (BOOLEAN, NOT NULL, Default: `TRUE`)
   - `created_at` (TIMESTAMPTZ, NOT NULL, Default: `NOW()`)

2. **Tabel: `products` \[Dimodifikasi V1.3.0\]**
   - `id` (UUID, Primary Key, Auto-gen v4)
   - `name` (VARCHAR 255, NOT NULL)
   - `description` (TEXT, Nullable)
   - `price` (NUMERIC 12,2, NOT NULL, Check: `>= 0`)
   - `stock_quantity` (INTEGER, NOT NULL, Check: `>= 0`)
   - `image_url` (VARCHAR 500, Nullable — _Disinkronkan otomatis dengan gambar utama di `product_images`_)
   - `is_active` (BOOLEAN, NOT NULL, Default: `TRUE`, **INDEXED**) **\[Kolom Baru V1.3.0 — Penanda Soft-Delete/Arsip Katalog\]**
   - `created_at` (TIMESTAMPTZ, Default: `NOW()`)

3. **Tabel: `product_images`**
   - `id` (UUID, Primary Key, Default: `uuid_generate_v4()`)
   - `product_id` (UUID, NOT NULL, **INDEXED**) ➔ **Foreign Key** (`products.id`) `ON DELETE CASCADE`
   - `image_url` (TEXT, NOT NULL)
   - `is_primary` (BOOLEAN, NOT NULL, Default: `FALSE`)
   - `display_order` (INTEGER, NOT NULL, Default: `0`)
   - `created_at` (TIMESTAMPTZ, NOT NULL, Default: `NOW()`)

4. **Tabel: `orders` \[Diperluas Enum Status V1.3.0\]**
   - `id` (UUID, Primary Key, Auto-gen v4)
   - `user_id` (UUID, **NULLABLE**, **INDEXED**) ➔ **Foreign Key** (`users.id`) `ON DELETE SET NULL`
   - `customer_name` (VARCHAR 255, NOT NULL)
   - `customer_email` (VARCHAR 255, NOT NULL)
   - `customer_phone` (VARCHAR 50, NOT NULL)
   - `shipping_address` (TEXT, NOT NULL)
   - `total_amount` (NUMERIC 12,2, NOT NULL, Check: `>= 0`)
   - `status` (VARCHAR 50, NOT NULL, Default: `'PENDING'` — **\[Diperbarui V1.3.0\]** _Nilai yang diizinkan: `'PENDING'`, `'PAID'`, `'SHIPPED'`, `'COMPLETED'`, `'CANCELLED'`_)
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

#### A. Endpoint Katalog Publik & Multi-Gambar \[Diperbarui V1.3.0\]

- **API 1: Pengambilan Daftar Produk Aktif**
  - **Endpoint:** `GET /api/v1/products`
  - **Proses:** Mengambil semua produk yang memiliki `is_active == True` beserta relasi `images` menggunakan `selectinload(Product.images)`.
  - **Output (Success):** `HTTP 200 OK` (Array of `ProductResponse`).
- **API 2: Pengambilan Detail Produk Spesifik**
  - **Endpoint:** `GET /api/v1/products/{product_id}`
  - **Proses:** Mengambil satu produk aktif berdasarkan UUID beserta daftar `product_images` yang telah diurutkan berdasarkan `is_primary DESC, display_order ASC`.
  - **Output (Success):** `HTTP 200 OK` (`ProductResponse`).
  - **Output (Error):** `HTTP 404 Not Found` jika UUID produk tidak ditemukan atau berstatus `is_active == False`.

#### B. Endpoint Manajemen Identitas / IAM

- **API 3 s.d. API 7:** `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/google`, `/api/v1/auth/refresh`, `/api/v1/auth/me`, dan `/api/v1/auth/logout`.

#### C. Endpoint Pemesanan & Riwayat Transaksi Pelanggan

- **API 8: Inisiasi Pemesanan (Hybrid Checkout)**
  - **Endpoint:** `POST /api/v1/orders/checkout`
  - **Proses:** Memvalidasi ketersediaan stok dan memastikan `product.is_active == True` dengan _Pessimistic Locking_, mengaitkan `user_id` secara opsional, dan menerbitkan Snap Token Midtrans.
- **API 9: Riwayat & Detail Pesanan Pelanggan**
  - **Endpoint:** `GET /api/v1/orders/me` (Butuh `get_current_user`) & `GET /api/v1/orders/{order_id}` (Dilindungi isolasi kepemilikan akun sehingga pelanggan A tidak dapat mengintip pesanan pelanggan B, kecuali diakses oleh `ADMIN`).

#### D. Endpoint Administrasi & CMS Internal (`/api/v1/admin/*`) \[Ditambahkan V1.3.0\]

_Catatan Keamanan: Seluruh endpoint di bawah ini wajib dikunci dengan dependency `Depends(require_role("ADMIN"))`. Permintaan tanpa token merespons `401 Unauthorized`, sedangkan permintaan dengan token `CUSTOMER` merespons `403 Forbidden`._

- **API 10: Ringkasan Analitik Eksekutif**
  - **Endpoint:** `GET /api/v1/admin/analytics/summary`
  - **Proses:** Mengeksekusi agregasi SQL untuk menghitung total pendapatan lunas, distribusi status pesanan, rasio konversi, daftar produk dengan stok $\le 5$, dan 5 produk terlaris.
  - **Output (Success):** `HTTP 200 OK` (`AdminAnalyticsResponse`).
- **API 11: Daftar Seluruh Katalog Produk (Admin View)**
  - **Endpoint:** `GET /api/v1/admin/products`
  - **Query Params Opsional:** `include_inactive: bool = True`, `search: str = ""`
  - **Proses:** Mengambil seluruh produk (baik `is_active = True` maupun `False`) beserta galeri gambarnya menggunakan `selectinload(Product.images)` yang diurutkan dari `created_at DESC`.
  - **Output (Success):** `HTTP 200 OK` (Array of `ProductResponse`).
- **API 12: Pembuatan Produk Baru & Galeri Multi-Gambar**
  - **Endpoint:** `POST /api/v1/admin/products`
  - **Input Body:** `ProductAdminWriteRequest`.
  - **Proses:** Membuat entitas `Product` baru, menyinkronkan kolom `image_url` utama, dan menyimpan daftar `ProductImage` terkait dalam satu transaksi database.
  - **Output (Success):** `HTTP 201 Created` (`ProductResponse`).
- **API 13: Pembaruan Produk, Stok & Galeri Multi-Gambar**
  - **Endpoint:** `PUT /api/v1/admin/products/{product_id}`
  - **Input Body:** `ProductAdminWriteRequest`.
  - **Proses:** Memperbarui data produk, mengganti/menyinkronkan koleksi `product_images` secara atomik, dan memastikan tepat satu gambar ditandai sebagai `is_primary = True`.
  - **Output (Success):** `HTTP 200 OK` (`ProductResponse`).
- **API 14: Pengarsipan Produk (Soft-Delete)**
  - **Endpoint:** `DELETE /api/v1/admin/products/{product_id}`
  - **Proses:** Mengubah `product.is_active = False` dan menyimpan perubahan tanpa menghapus baris dari tabel `products` agar referensi kunci asing pada `order_items` tetap utuh.
  - **Output (Success):** `HTTP 200 OK` (`{"status": "archived", "product_id": "uuid", "is_active": false}`).
- **API 15: Unggah Berkas Gambar ke Cloud Object Storage**
  - **Endpoint:** `POST /api/v1/admin/upload`
  - **Proteksi:** `Depends(require_role("ADMIN"))` + _Rate Limiter_ (`20/minute` per IP).
  - **Headers:** `Content-Type: multipart/form-data`.
  - **Input Form:** `file: UploadFile`.
  - **Proses:** Memvalidasi tipe konten (`image/jpeg`, `image/png`, `image/webp`) dan ukuran berkas ($\le 5\text{ MB}$), mengunggah biner ke Supabase Storage Bucket `product-images` (atau penyimpanan statis lokal terisolasi saat mode _offline fallback_), dan mengembalikan URL publiknya.
  - **Output (Success):** `HTTP 201 Created` (`ImageUploadResponse`).
  - **Output (Error):** `HTTP 400 Bad Request` (tipe berkas tidak didukung) atau `HTTP 413 Content Too Large` (ukuran $> 5\text{ MB}$).
- **API 16: Daftar Seluruh Pesanan Pelanggan (Admin View)**
  - **Endpoint:** `GET /api/v1/admin/orders`
  - **Query Params Opsional:** `status_filter: Optional[str] = None`, `search: Optional[str] = None`.
  - **Proses:** Mengambil daftar seluruh pesanan pelanggan (Member maupun Guest) beserta `Order.items` menggunakan `selectinload`, diurutkan dari `created_at DESC`.
  - **Output (Success):** `HTTP 200 OK` (Array of `OrderResponse`).
- **API 17: Pembaruan Status Pemenuhan Pesanan (Order Fulfillment FSM)**
  - **Endpoint:** `PATCH /api/v1/admin/orders/{order_id}/status`
  - **Input Body:** `OrderStatusUpdateRequest` (`{"status": "SHIPPED" | "COMPLETED" | "CANCELLED"}`).
  - **Proses:** Memvalidasi transisi status menggunakan aturan _Finite State Machine_ (FSM). Jika transisi dari `PENDING` ke `CANCELLED`, sistem mengembalikan stok produk (`product.stock_quantity += item.quantity`) dengan penguncian `.with_for_update()`.
  - **Output (Success):** `HTTP 200 OK` (`OrderResponse`).
  - **Output (Error):** `HTTP 400 Bad Request` jika transisi status melanggar aturan FSM.

### 3.2 Antarmuka Subsistem Eksternal (External Systems Contracts)

- **EXT-API-01: Payment Gateway Webhook (Inbound - Midtrans)**
  - **Protokol:** HTTPS POST ke `POST /api/v1/webhooks/midtrans` dengan verifikasi `SHA-512`.
- **EXT-API-02: Google Identity Services OIDC Verification**
  - **Protokol:** HTTPS menggunakan `google.oauth2.id_token.verify_oauth2_token`.
- **EXT-API-03: Supabase Storage / S3-Compatible Object Storage API \[Ditambahkan V1.3.0\]**
  - **Protokol:** HTTPS POST/PUT ke `https://<project_ref>.supabase.co/storage/v1/object/product-images/<uuid_filename>` menggunakan header `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` dan `apikey: <SUPABASE_SERVICE_ROLE_KEY>`.
  - **Public URL Pattern:** `https://<project_ref>.supabase.co/storage/v1/object/public/product-images/<uuid_filename>`.

## BAB 4: DESAIN KOMPONEN DAN ALGORITMA (COMPONENT SELECTION AND DESIGN)

### 4.1 Pemilihan Komponen Pakai Ulang (Reusable Components)

1. **Frontend (Next.js):**
   - **State Management:** `Zustand` (`useCartStore` & `useAuthStore`).
   - **Form Validation:** `Zod` + `React Hook Form`.
   - **Google OAuth SDK:** `@react-oauth/google`.
   - **UI Icons & Feedback:** `lucide-react` (Ikon navigasi Admin, KPI, dan status pengiriman) + `sonner` (Toast notifications).
2. **Backend (FastAPI):**
   - **Database ORM & Migration:** `SQLAlchemy 2.0` + `Alembic`.
   - **Schema Validation:** `Pydantic v2` + `pydantic[email]`.
   - **Multipart File Handling & Cloud Upload \[Ditambahkan V1.3.0\]:** `python-multipart` (untuk parsing `UploadFile` di FastAPI) dan `httpx` (untuk komunikasi asinkron/sinkron berkinerja tinggi ke REST API Supabase Storage tanpa membebani ukuran bundel Serverless Vercel).
   - **Security & Cryptography:** `passlib[bcrypt]`, `bcrypt==4.0.1`, `PyJWT`, `google-auth`, dan `SlowAPI`.

### 4.2 Rancangan Algoritmik Matematis (Kompleksitas & Logika Inti)

#### A. Algoritma 1: Validasi Harga Keranjang & Konfirmasi Stok (Pessimistic Locking)

1. Ekstrak identitas pengguna secara opsional dari header JWT ($O(1)$).
2. Lakukan kueri `SELECT ... FOR UPDATE` pada tabel `products` untuk mengunci baris produk yang dibeli, memvalidasi `is_active == True`, dan mencegah _race condition_.
3. Hitung ulang harga secara tertutup di server: $\text{total\_amount} = \sum (\text{item\_qty} \times \text{db\_price})$.
4. Kurangi stok, simpan `Order` dan `OrderItem`, minta token Midtrans Snap, lalu _commit_ transaksi secara atomik.

- **Time Complexity:** $\approx O(n \log N)$ | **Space Complexity:** $O(n)$

#### B. Algoritma 2: Eager Loading Galeri Multi-Gambar Anti N+1 Query

Menggunakan SQLAlchemy `selectinload(Product.images)` yang mengeksekusi tepat **2 kueri SQL** konstan ($O(1)$ _database round-trips_) berapapun jumlah produk $M$ yang dimuat.

#### C. Algoritma 3: Verifikasi Kriptografi JWT & RBAC Guard

Memverifikasi tanda tangan HMAC-SHA256 pada token Bearer dan mengevaluasi klaim peran $\text{user.role} == \text{"ADMIN"}$ dalam waktu konstan $O(1)$.

#### D. Algoritma 4: Agregasi Analitik Penjualan Real-Time Satu Putaran (Single-Pass SQL Aggregation) \[Ditambahkan V1.3.0\]

Alih-alih menarik ribuan objek `Order` ke dalam memori Python yang memakan kompleksitas ruang $O(N_{\text{orders}})$, perhitungan metrik eksekutif diserahkan ke mesin pengoptimal PostgreSQL:

1. **Perhitungan Revenue & Distribusi Status:**
   $$\text{Gross Revenue} = \sum_{o \in \text{Orders}} \begin{cases} o.\text{total\_amount} & \text{jika } o.\text{status} \in \{\text{'PAID'}, \text{'SHIPPED'}, \text{'COMPLETED'}\} \\ 0 & \text{lainnya} \end{cases}$$
2. **Perhitungan Rasio Konversi Transaksi ($\text{CR}$):**
   $$\text{CR} = \left( \frac{N_{\text{PAID}} + N_{\text{SHIPPED}} + N_{\text{COMPLETED}}}{N_{\text{total\_orders}}} \right) \times 100\%$$
3. **Agregasi Top 5 Produk Terlaris:**
   Mengeksekusi `JOIN` antara `order_items`, `orders`, dan `products` dengan filter `orders.status IN ('PAID', 'SHIPPED', 'COMPLETED')`, dikelompokkan berdasarkan `product_id` (`GROUP BY`), diurutkan berdasarkan `SUM(order_items.quantity) DESC LIMIT 5`.

- **Time Complexity:** $O(N_{\text{orders}})$ di tingkat pemindaian indeks C-engine PostgreSQL, dan **$O(1)$** di memori aplikasi Python.

#### E. Algoritma 5: Transisi Finite State Machine (FSM) Pemenuhan Pesanan \[Ditambahkan V1.3.0\]

Status pesanan dimodelkan sebagai graf berarah (_Directed Acyclic Graph_) dengan himpunan status $S = \{\text{PENDING}, \text{PAID}, \text{SHIPPED}, \text{COMPLETED}, \text{CANCELLED}\}$ dan fungsi transisi yang diizinkan $\delta$:

- $\delta(\text{PENDING}) \rightarrow \{\text{PAID}, \text{CANCELLED}\}$ _(Transisi ke `CANCELLED` memicu pengembalian stok $\Delta \text{stock} = +q_i$)_
- $\delta(\text{PAID}) \rightarrow \{\text{SHIPPED}\}$
- $\delta(\text{SHIPPED}) \rightarrow \{\text{COMPLETED}\}$
- $\delta(\text{COMPLETED}) \rightarrow \emptyset$ _(Terminal State)_
- $\delta(\text{CANCELLED}) \rightarrow \emptyset$ _(Terminal State)_

Setiap permintaan mutasi status $s_{\text{target}} \notin \delta(s_{\text{current}})$ langsung ditolak dalam waktu konstan **$O(1)$** sebelum menyentuh operasi tulis basis data.

## BAB 5: KOMPONEN SEKUNDER DAN OPERASIONAL EKOSISTEM

### 5.1 Pemilihan Teknologi & Konfigurasi Lingkungan (Environment Variables)

Untuk mendukung fitur V1.3.0, variabel lingkungan berikut wajib dikonfigurasi:

- **Backend (`.env` / Vercel Backend Environment):**
  - `DATABASE_URL`: String koneksi PostgreSQL (Supabase Pooler/Direct).
  - `MIDTRANS_SERVER_KEY` & `MIDTRANS_IS_PRODUCTION`: Kredensial pembayaran.
  - `ALLOWED_ORIGINS`: Daftar domain frontend yang diizinkan oleh CORS.
  - `JWT_SECRET_KEY`, `JWT_ALGORITHM` (`HS256`), `ACCESS_TOKEN_EXPIRE_MINUTES` (`30`), `REFRESH_TOKEN_EXPIRE_DAYS` (`7`).
  - `GOOGLE_CLIENT_ID`: ID Klien OAuth 2.0 dari Google Cloud Console.
  - **\[Baru V1.3.0\]** `SUPABASE_URL`: URL dasar proyek Supabase (contoh: `https://xyzcompany.supabase.co`).
  - **\[Baru V1.3.0\]** `SUPABASE_SERVICE_ROLE_KEY`: Kunci rahasia _Service Role_ Supabase untuk mengizinkan _backend_ FastAPI mengunggah objek ke Supabase Storage.
  - **\[Baru V1.3.0\]** `SUPABASE_STORAGE_BUCKET`: Nama _bucket_ publik penyimpanan gambar produk (Default: `product-images`).
- **Frontend (`.env.local` / Vercel Frontend Config):**
  - `NEXT_PUBLIC_API_URL`: URL publik _backend_ FastAPI.
  - `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`: Kunci klien Midtrans Snap.
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: ID Klien OAuth 2.0 publik.

### 5.2 Manajemen Konfigurasi dan Otomatisasi (CI/CD Pipeline)

#### 5.2.1 Manajemen Versi & Migrasi Basis Data (Git & Alembic Governance)

- **Aturan Penamaan Cabang V1.3.0:**
  - `docs/srs-sdd-v1.3.0` (Pembaruan kontrak dokumen spesifikasi dan desain V1.3.0).
  - `feature/admin-backend-api` (Sprint 13: Migrasi Alembic `is_active`, Storage Uploader, & Endpoint Admin).
  - `feature/admin-dashboard-analytics` (Sprint 14: Admin Layout Shell, RBAC Guard UI, & Executive Analytics).
  - `feature/admin-catalog-orders-ui` (Sprint 15: Product CRUD Modal, Multi-Image Uploader, & Order Fulfillment UI).
- **Aturan Migrasi Skema:**
  - Penambahan kolom `is_active` pada tabel `products` wajib menggunakan `server_default=sa.text('true')` pada skrip Alembic agar seluruh baris produk yang sudah ada di database lokal maupun produksi otomatis bernilai `TRUE` tanpa mengalami kegagalan `NotNullViolation`.

#### 5.2.2 Pembangunan Sistem & Integrasi (System Building & Automation)

Otomatisasi perakitan perangkat lunak ditangani oleh GitHub Actions dan Vercel CD:

- **Backend Dependency Integrity:** File `backend/requirements.txt` wajib dijaga dalam format pengkodean **UTF-8** murni dan menyertakan `python-multipart` untuk mendukung fitur unggah berkas di lingkungan _Serverless_ Vercel.
- **Build Validation:** Mengeksekusi `npm run build` untuk memastikan seluruh rute baru (`/admin`, `/admin/products`, `/admin/orders`) bebas dari _error_ tipe data TypeScript dan siap dirilis ke produksi.
