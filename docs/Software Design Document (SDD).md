# Software Design Document (SDD)

## Platform E-Commerce Berbasis RESTful Microservices

### Riwayat Dokumen (Document Control)

| Versi | Tanggal     | Penulis         | Deskripsi Perubahan (Change Log)                                                                                                                                                       | Status  |
| :---- | :---------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| 1.0.0 | 12 Okt 2026 | M. Iqbal Ababil | Inisialisasi MVP, Arsitektur Database, Integrasi Midtrans.                                                                                                                             | Dirilis |
| 1.1.0 | 16 Okt 2026 | M. Iqbal Ababil | Refactoring UI/UX (CRO Pattern, Brand Color 'Tech Violet'), Security Audit (CORS Regex, Rate Limiting, XSS Validation).                                                                | Dirilis |
| 1.2.0 | 19 Okt 2026 | M. Iqbal Ababil | Desain Arsitektur IAM (JWT Dual-Token, Argon2/Bcrypt, Google OIDC), Skema Fisik `users` & `product_images`, Migrasi Alembic, dan Algoritma Eager Loading (`1:N`).                      | Dirilis |
| 1.3.0 | 21 Okt 2026 | M. Iqbal Ababil | Desain Arsitektur CMS Internal (Admin Dashboard), Real-Time SQL Analytics, Soft-Delete (`is_active`), Order Fulfillment FSM, & Integrasi Cloud Object Storage (Supabase Storage / S3). | Dirilis |
| 2.0.0 | 22 Okt 2026 | M. Iqbal Ababil | DRAF: Desain Arsitektur Logistik 3PL Hibrida (`logistics.py`), Skema `weight_grams` & Atribut Pengiriman/Resi `orders`, Algoritma Zero-Trust Shipping Cost, & Order State Machine V2.  | Draf    |

**Versi:** 2.0.0 **Status:** Draf

## BAB 1: DESAIN ARSITEKTURAL (SYSTEM ARCHITECTURE)

Arsitektur sistem ini menggunakan pola **Decoupled 3-Tier Architecture** dengan pemisahan tegas (_Separation of Concerns_) antara lapisan presentasi, lapisan logika bisnis, dan lapisan persistensi data. Pada rilis mayor **Versi 2.0.0**, arsitektur diperluas dengan subsistem **Third-Party Logistics (3PL) & Parcel Tracking Engine** menggunakan pola desain **Dual-Mode Adapter Pattern**. Sistem mengintegrasikan perhitungan ongkos kirim berbasis berat fisik dan geolokasi kota tujuan ke dalam invarian transaksi _Zero-Trust Checkout_, menyinkronkan komponen biaya pengiriman dengan _Payment Gateway_ Midtrans Snap, serta memperluas _Order State Machine_ untuk mendukung penerbitan Nomor Resi (_Airwaybill_) dan pelacakan perjalanan paket secara _real-time_.

### 1.1 Dekomposisi Modul (Modular Breakdown)

Sistem dipecah menjadi modul-modul independen yang berjalan di kontainer atau _runtime_ terisolasi masing-masing:

1. **Tier 1: Presentation Module (Next.js - Client & SSR)**
   - **Storefront & Logistics UI Components \[Diperbarui V2.0.0\]:** Komponen React pelanggan yang mencakup Grid Produk, _Interactive Product Image Gallery_ dengan indikator berat produk (`weight_grams`), _Dynamic Shipping Calculator & Courier Selector_ di halaman `/cart`, _Google Sign-In Button_, _Dynamic Auth Navbar_, serta komponen **_Interactive Parcel Tracking Timeline_** di halaman `/orders/[id]` dan `/orders/history`.
   - **Admin Backoffice UI Components \[Diperbarui V2.0.0\]:** Ruang kerja internal (`/admin/*`) yang dilindungi _Client Role Guard_, mencakup _Admin Sidebar Shell_, _Executive KPI & Low-Stock Cards_, _Product CRUD Modal_ (dilengkapi input `weight_grams` dan _Drag-and-Drop Image Uploader_), serta _Order Fulfillment Table_ (dilengkapi Modal Input & Generator Nomor Resi Pengiriman).
   - **State Manager:** Pengelola status memori lokal menggunakan **Zustand**, terbagi menjadi dua _store_ terisolasi:
     1. `useCartStore`: Mengelola _state_ keranjang belanja di _localStorage_ beserta perhitungan otomatis akumulasi kuantitas, subtotal harga, dan **total berat fisik keranjang (`totalWeightGrams`)**.
     2. `useAuthStore`: Mengelola _state_ profil pengguna aktif (`user`), `access_token`, serta preferensi pengiriman tersimpan (`savedShipping` yang kini mencakup Provinsi, Kota/Kabupaten, Kode Pos, dan Alamat).
   - **API Client & Auth Interceptor:** Layanan _fetcher_ pembungkus _request_ HTTP ke _backend_ yang menyisipkan _Header_ `Authorization: Bearer <access_token>`, menyertakan `credentials: "include"`, menangani _silent token refresh_, mendukung pengiriman `FormData`, serta memanggil _endpoint_ kalkulasi ongkir dan pelacakan resi.

2. **Tier 2: Application/API Module (FastAPI - Backend)**
   - **Router/Controller:** Menerima _request_ HTTP dari Next.js, memvalidasi parameter menggunakan Pydantic, dan menerapkan _Rate Limiting_ (`slowapi`). Mencakup `auth_router`, `products_router`, `orders_router`, `admin_router`, dan **\[Ditambahkan V2.0.0\]** `logistics_router` (`/api/v1/logistics/*`) untuk penyediaan direktori Provinsi/Kota, kalkulasi tarif ongkos kirim multi-kurir, dan pelacakan manifes resi.
   - **Service/Business Logic \[Diperbarui V2.0.0\]:** Berisi fungsi inti: kalkulasi harga dan ongkos kirim tertutup (**_Zero-Trust Pricing & Shipping Cost Verification_**), validasi stok, pemanggilan _Payment Gateway_ Midtrans Snap (dengan injeksi _item_ ongkos kirim), _hashing_ kata sandi (`Bcrypt`), manajemen JWT (`HS256`), verifikasi OIDC Google, layanan pengunggah objek biner (`storage.py`), validasi _Finite State Machine_ (FSM V2) pemenuhan pesanan berbasis nomor resi, serta **modul `logistics.py` (_Dual-Mode 3PL Adapter & Parcel Tracking Generator_)**.
   - **Repository/DAO (Data Access Object):** Modul kueri SQL/ORM (SQLAlchemy) untuk berinteraksi dengan database, termasuk strategi _Eager Loading_ (`selectinload`), pemfilteran produk aktif (`is_active == True`), dan kueri agregasi analitik eksekutif.

3. **Tier 3: Persistence & Object Storage Module (PostgreSQL, Alembic & Supabase Storage)**
   - **Relational Database:** Mesin basis data PostgreSQL dengan manajemen migrasi skema terstruktur menggunakan **Alembic**.
   - **Cloud Object Storage:** Layanan penyimpanan objek terdistribusi (Supabase Storage Bucket `product-images`) untuk menyimpan berkas fisik gambar produk dan menyajikannya melalui CDN publik.

### 1.2 Relasi Kontrol (Control Relationships)

Hubungan pemanggilan antar-modul bersifat **Uni-directional** (Satu Arah) dari atas ke bawah:

- **Alur Standar & Katalog Multi-Gambar Publik:** `Next.js API Client` ➔ `FastAPI Product Router` ➔ `FastAPI Repository (Filter is_active=True + Eager Load Images + Weight)` ➔ `PostgreSQL`.
- **Alur Kalkulasi Ongkos Kirim Dinamis \[Ditambahkan V2.0.0\]:** `Next.js Checkout UI (Select Province/City & Courier)` ➔ `FastAPI Logistics Router (POST /logistics/rates)` ➔ `Logistics Adapter Service (Query RajaOngkir API or Built-in Zone Tariff Engine)` ➔ `Return Available Services, Costs & ETD`.
- **Alur Hybrid Checkout & Zero-Trust Shipping \[Diperbarui V2.0.0\]:** `Next.js API Client` ➔ `FastAPI Order Router` ➔ `FastAPI Service (Lock Stock + Compute Total Weight + Re-verify Shipping Cost via Logistics Service + Request Midtrans Snap Token with Shipping Line-Item)` ➔ `PostgreSQL`.
- **Alur Fulfillment Resi Admin & Pelacakan Paket \[Ditambahkan V2.0.0\]:**
  - _Fulfillment:_ `Next.js Admin UI (Input/Generate Resi)` ➔ `FastAPI Admin Router (PATCH /admin/orders/{id}/status)` ➔ `Validate FSM & Save tracking_number + shipped_at` ➔ `PostgreSQL`.
  - _Tracking:_ `Next.js Order Detail UI` ➔ `FastAPI Logistics Router (GET /logistics/track/{order_id})` ➔ `Logistics Service (Build Chronological Tracking Manifest)` ➔ `Return Timeline Events`.
- **Alur Webhook Asinkron:** `Payment Gateway (Midtrans)` ➔ `FastAPI Webhook Router` ➔ `FastAPI Service (Verify SHA-512 & Update Status/Stock)` ➔ `PostgreSQL`.

### 1.3 Representasi Arsitektur (Format AI-Readable Topology)

Berikut adalah topologi arsitektur V2.0.0 yang dirancang agar dapat langsung dipahami oleh _AI Agent_ (Cursor/Cline) saat melakukan _monitored vibe coding_:

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
│ ├─ src/components/ (UI, ProductGallery, ShippingCalculator,        │
│ │                   TrackingTimeline, AdminSidebar, ImageUploader) │
│ ├─ src/store/ (Zustand: useCartStore [Weight] & useAuthStore)      │
│ └─ src/lib/api.ts (HTTP Client + Logistics, Auth & Admin APIs)     │
└─────────────────────────────┬──────────────────────────────────────┘
                              │ (REST API / JSON & Multipart + Credentials)
       ┌──────────────────────┼──────────────────────┐
       │                      │ (Webhook HTTPS)      │ (External HTTPS APIs)
       ▼                      ▼                      ▼
┌─────────────────────────────────────────────┐  ┌────────────────────────────┐
│ BACKEND TIER (FastAPI / Python)             │  │ EXTERNAL CLOUD & 3PL APIs  │
│ ├─ main.py & routers/ (Auth, Products,      │  │ ├─ Midtrans Snap API       │
│ │                      Orders, Admin,       │  │ ├─ Google OAuth2/OIDC      │
│ │                      Logistics, Webhooks) │  │ ├─ Supabase Object Storage │
│ ├─ logistics.py (Dual-Mode 3PL Adapter:     │  │ └─ RajaOngkir / 3PL API    │
│ │                RajaOngkir + Zone Engine   │  │    (with Internal Fallback)│
│ │                & Tracking Manifest Gen)   │  └────────────────────────────┘
│ ├─ security.py (JWT HS256, Bcrypt, RBAC)    │
│ ├─ storage.py (MIME Validator & S3 Uploader)│
│ ├─ models.py & schemas.py (ORM & DTOs V2)   │
│ └─ alembic/ (Database Migration Scripts)    │
└─────────────────────────────┬───────────────┘
                              │ (TCP/IP Port 5432 / Pooler)
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ DATABASE TIER (PostgreSQL)                                         │
│ ├─ Table: users (IAM & RBAC: CUSTOMER | ADMIN)                     │
│ ├─ Table: products (Catalog + is_active + weight_grams)            │
│ ├─ Table: product_images (1:N Gallery Relation -> CDN URLs)        │
│ ├─ Table: orders (FSM V2 + Shipping City/Courier/Cost/Tracking No) │
│ ├─ Table: order_items (FK -> orders.id & products.id)              │
│ └─ Table: alembic_version (Schema Migration Tracker)               │
└────────────────────────────────────────────────────────────────────┘
```

## BAB 2: DESAIN BASIS DATA DAN DATA (DATABASE DESIGN)

### 2.1 Struktur Data Modul (Data Transfer Objects / DTO)

Kontrak JSON di bawah ini menjadi acuan tunggal (_Single Source of Truth_) bagi AI Agent dalam men-_generate_ `schemas.py` (Pydantic) di FastAPI dan tipe data TypeScript di Next.js.

#### A. DTO Modul Katalog, Berat Produk & Multi-Gambar \[Diperbarui V2.0.0\]

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
  "weight_grams": "integer (default: 1000, > 0)",
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

#### B. DTO Modul Logistik 3PL, Kalkulasi Ongkir & Pelacakan Resi \[Ditambahkan V2.0.0\]

- **Province & City Directory DTO (`ProvinceDTO` & `CityDTO`):**

```json
{
  "province_id": "string",
  "province_name": "string",
  "city_id": "string",
  "city_name": "string (e.g., 'Kota Surabaya')",
  "type": "Kota | Kabupaten",
  "postal_code": "string"
}
```

- **Shipping Rate Calculation Request DTO (`ShippingRateRequest`):**

```json
{
  "destination_city_id": "string",
  "weight_grams": "integer (> 0)",
  "courier_code": "jne | jnt | sicepat | pos"
}
```

- **Shipping Rate Calculation Response DTO (`ShippingRateResponse`):**

```json
{
  "origin_city": "string (Default: 'Jakarta Pusat')",
  "destination_city": "CityDTO",
  "weight_grams": "integer",
  "chargeable_weight_kg": "integer",
  "courier_code": "string",
  "courier_name": "string",
  "services": [
    {
      "service": "string (e.g., 'REG', 'YES', 'ECO')",
      "description": "string (e.g., 'Layanan Reguler')",
      "cost": "number (decimal IDR)",
      "etd": "string (e.g., '2-3 Hari')"
    }
  ]
}
```

- **Parcel Tracking Manifest Response DTO (`ShipmentTrackingResponse`):**

```json
{
  "order_id": "uuid",
  "tracking_number": "string | null",
  "courier_code": "string",
  "courier_name": "string",
  "courier_service": "string",
  "status": "PENDING | PAID | SHIPPED | COMPLETED | CANCELLED",
  "origin": "string ('Warehouse Amba Shop - Jakarta Pusat')",
  "destination": "string (Customer Name, City, Province)",
  "shipped_at": "string (ISO-8601) | null",
  "completed_at": "string (ISO-8601) | null",
  "manifest": [
    {
      "timestamp": "string (ISO-8601)",
      "status_title": "string",
      "description": "string",
      "city": "string",
      "is_current": "boolean"
    }
  ]
}
```

#### C. DTO Modul Checkout & Pemesanan dengan Logistik \[Diperbarui V2.0.0\]

- **Cart Checkout DTO (`CheckoutRequest`):**

```json
{
  "customer_name": "string",
  "customer_email": "string (format email)",
  "customer_phone": "string (numeric)",
  "shipping_province": "string",
  "shipping_city_id": "string",
  "shipping_city_name": "string",
  "shipping_postal_code": "string",
  "shipping_address": "string",
  "courier_code": "jne | jnt | sicepat | pos",
  "courier_service": "string (e.g., 'REG')",
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
  "shipping_province": "string | null",
  "shipping_city_id": "string | null",
  "shipping_city_name": "string | null",
  "shipping_postal_code": "string | null",
  "shipping_address": "string",
  "courier_code": "string | null",
  "courier_service": "string | null",
  "shipping_etd": "string | null",
  "shipping_weight_grams": "integer",
  "shipping_cost": "number (decimal)",
  "tracking_number": "string | null",
  "shipped_at": "string (ISO-8601) | null",
  "completed_at": "string (ISO-8601) | null",
  "total_amount": "number (decimal - subtotal items + shipping_cost)",
  "status": "PENDING | PAID | SHIPPED | COMPLETED | CANCELLED",
  "payment_gateway_ref": "string | null (Midtrans Snap Token)",
  "created_at": "string (ISO-8601 timestamp)",
  "items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "product_name": "string",
      "product_image": "string | null",
      "quantity": "integer",
      "price_at_purchase": "number (decimal)"
    }
  ]
}
```

#### D. DTO Modul Dashboard Admin, Katalog & Resi Pengiriman \[Diperbarui V2.0.0\]

- **Admin Create / Update Product DTO (`ProductAdminWriteRequest`):**

```json
{
  "name": "string (min 3 chars, no HTML tags)",
  "description": "string | null",
  "price": "number (decimal > 0)",
  "stock_quantity": "integer (>= 0)",
  "weight_grams": "integer (> 0, default: 1000)",
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

- **Admin Order Status & Tracking Mutation DTO (`OrderStatusUpdateRequest`):**

```json
{
  "status": "SHIPPED | COMPLETED | CANCELLED",
  "tracking_number": "string | null (Required or auto-generated when status == 'SHIPPED')"
}
```

### 2.2 Desain Skema Fisik (Physical Database Schema)

Skema fisik di PostgreSQL dikawal ketat oleh konstrain kunci asing (_Foreign Keys_), indeks pencarian cepat (_B-Tree Index_), dan dikelola evolusinya secara non-destruktif melalui **Alembic**.

1. **Tabel: `users`**
   - `id` (UUID, Primary Key, Default: `uuid_generate_v4()`)
   - `email` (VARCHAR 255, NOT NULL, **UNIQUE**, **INDEXED**)
   - `full_name` (VARCHAR 255, NOT NULL)
   - `password_hash` (VARCHAR 255, **NULLABLE**)
   - `auth_provider` (VARCHAR 50, NOT NULL, Default: `'LOCAL'`)
   - `role` (VARCHAR 50, NOT NULL, Default: `'CUSTOMER'` — _Nilai: `'CUSTOMER'`, `'ADMIN'`_)
   - `is_active` (BOOLEAN, NOT NULL, Default: `TRUE`)
   - `created_at` (TIMESTAMPTZ, NOT NULL, Default: `NOW()`)

2. **Tabel: `products` \[Dimodifikasi V2.0.0\]**
   - `id` (UUID, Primary Key, Auto-gen v4)
   - `name` (VARCHAR 255, NOT NULL)
   - `description` (TEXT, Nullable)
   - `price` (NUMERIC 12,2, NOT NULL, Check: `>= 0`)
   - `stock_quantity` (INTEGER, NOT NULL, Check: `>= 0`)
   - `weight_grams` (INTEGER, NOT NULL, Default: `1000`, Server Default: `'1000'`, Check: `> 0`) **\[Kolom Baru V2.0.0 — Berat Satuan Produk dalam Gram\]**
   - `image_url` (VARCHAR 500, Nullable)
   - `is_active` (BOOLEAN, NOT NULL, Default: `TRUE`, **INDEXED**)
   - `created_at` (TIMESTAMPTZ, Default: `NOW()`)

3. **Tabel: `product_images`**
   - `id` (UUID, Primary Key, Default: `uuid_generate_v4()`)
   - `product_id` (UUID, NOT NULL, **INDEXED**) ➔ **Foreign Key** (`products.id`) `ON DELETE CASCADE`
   - `image_url` (TEXT, NOT NULL)
   - `is_primary` (BOOLEAN, NOT NULL, Default: `FALSE`)
   - `display_order` (INTEGER, NOT NULL, Default: `0`)
   - `created_at` (TIMESTAMPTZ, NOT NULL, Default: `NOW()`)

4. **Tabel: `orders` \[Dimodifikasi V2.0.0\]**
   - `id` (UUID, Primary Key, Auto-gen v4)
   - `user_id` (UUID, **NULLABLE**, **INDEXED**) ➔ **Foreign Key** (`users.id`) `ON DELETE SET NULL`
   - `customer_name` (VARCHAR 255, NOT NULL)
   - `customer_email` (VARCHAR 255, NOT NULL)
   - `customer_phone` (VARCHAR 50, NOT NULL)
   - `shipping_province` (VARCHAR 100, **NULLABLE**) **\[Kolom Baru V2.0.0\]**
   - `shipping_city_id` (VARCHAR 50, **NULLABLE**) **\[Kolom Baru V2.0.0\]**
   - `shipping_city_name` (VARCHAR 100, **NULLABLE**) **\[Kolom Baru V2.0.0\]**
   - `shipping_postal_code` (VARCHAR 20, **NULLABLE**) **\[Kolom Baru V2.0.0\]**
   - `shipping_address` (TEXT, NOT NULL)
   - `courier_code` (VARCHAR 50, **NULLABLE**) **\[Kolom Baru V2.0.0 — e.g., `'jne'`, `'jnt'`, `'sicepat'`, `'pos'`\]**
   - `courier_service` (VARCHAR 100, **NULLABLE**) **\[Kolom Baru V2.0.0 — e.g., `'REG'`, `'YES'`\]**
   - `shipping_etd` (VARCHAR 50, **NULLABLE**) **\[Kolom Baru V2.0.0 — e.g., `'2-3 Hari'`\]**
   - `shipping_weight_grams` (INTEGER, NOT NULL, Default: `1000`, Server Default: `'1000'`) **\[Kolom Baru V2.0.0\]**
   - `shipping_cost` (NUMERIC 12,2, NOT NULL, Default: `0.00`, Server Default: `'0.00'`) **\[Kolom Baru V2.0.0\]**
   - `tracking_number` (VARCHAR 100, **NULLABLE**, **INDEXED**) **\[Kolom Baru V2.0.0 — Nomor Resi Pengiriman\]**
   - `shipped_at` (TIMESTAMPTZ, **NULLABLE**) **\[Kolom Baru V2.0.0\]**
   - `completed_at` (TIMESTAMPTZ, **NULLABLE**) **\[Kolom Baru V2.0.0\]**
   - `total_amount` (NUMERIC 12,2, NOT NULL, Check: `>= 0` — _Subtotal Barang + `shipping_cost`_)
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

#### A. Endpoint Katalog Publik & Multi-Gambar

- **API 1 & API 2:** `GET /api/v1/products` dan `GET /api/v1/products/{product_id}` (Mengembalikan `ProductResponse` yang kini mencakup `weight_grams`).

#### B. Endpoint Manajemen Identitas / IAM

- **API 3 s.d. API 7:** `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/google`, `/api/v1/auth/refresh`, `/api/v1/auth/me`, dan `/api/v1/auth/logout`.

#### C. Endpoint Pemesanan & Riwayat Transaksi Pelanggan \[Diperbarui V2.0.0\]

- **API 8: Inisiasi Pemesanan dengan Verifikasi Ongkir (Hybrid Zero-Trust Checkout)**
  - **Endpoint:** `POST /api/v1/orders/checkout`
  - **Proses:**
    1. Mengunci baris produk (`.with_for_update()`), memvalidasi stok dan `is_active == True`.
    2. Menghitung $\text{subtotal} = \sum (q_i \times p_i)$ dan berat total $W_{\text{total}} = \sum (q_i \times w_i)$.
    3. Memanggil `calculate_shipping_cost(shipping_city_id, W_total, courier_code, courier_service)` di sisi server untuk menetapkan `shipping_cost` dan `shipping_etd`.
    4. Menetapkan $\text{total\_amount} = \text{subtotal} + \text{shipping\_cost}$, menyimpan `Order` beserta metadata logistik, dan menyisipkan objek `{"id": "SHIPPING-FEE", "price": int(shipping_cost), "quantity": 1, "name": "Ongkir ..."}` ke dalam `item_details` permintaan Midtrans Snap.
  - **Output (Success):** `HTTP 201 Created` (`OrderResponse`).
- **API 9: Riwayat & Detail Pesanan Pelanggan**
  - **Endpoint:** `GET /api/v1/orders/me` & `GET /api/v1/orders/{order_id}`.

#### D. Endpoint Administrasi & CMS Internal (`/api/v1/admin/*`) \[Diperbarui V2.0.0\]

- **API 10 s.d. API 16:** `/api/v1/admin/analytics/summary`, `GET/POST/PUT/DELETE /api/v1/admin/products` (mendukung penyimpanan `weight_grams`), `POST /api/v1/admin/upload`, dan `GET /api/v1/admin/orders`.
- **API 17: Pembaruan Status Pemenuhan Pesanan & Input Resi (Order Fulfillment FSM V2)**
  - **Endpoint:** `PATCH /api/v1/admin/orders/{order_id}/status`
  - **Input Body:** `OrderStatusUpdateRequest` (`{"status": "SHIPPED" | "COMPLETED" | "CANCELLED", "tracking_number": "..."}`).
  - **Proses:**
    - Memvalidasi transisi FSM.
    - Jika `status == "SHIPPED"`, simpan `tracking_number` (atau _auto-generate_ nomor resi berformat `AMBA-{COURIER}-{YYYYMMDD}-{RANDOM}` jika `tracking_number` kosong) dan set `order.shipped_at = datetime.now(timezone.utc)`.
    - Jika `status == "COMPLETED"`, set `order.completed_at = datetime.now(timezone.utc)`.
  - **Output (Success):** `HTTP 200 OK` (`OrderResponse`).

#### E. Endpoint Logistik 3PL, Kalkulasi Ongkir & Pelacakan Resi (`/api/v1/logistics/*`) \[Ditambahkan V2.0.0\]

- **API 18: Daftar Direktori Provinsi Indonesia**
  - **Endpoint:** `GET /api/v1/logistics/provinces`
  - **Output (Success):** `HTTP 200 OK` (Array of `ProvinceDTO`).
- **API 19: Daftar Direktori Kota/Kabupaten Berdasarkan Provinsi**
  - **Endpoint:** `GET /api/v1/logistics/cities`
  - **Query Params Opsional:** `province_id: Optional[str] = None`
  - **Output (Success):** `HTTP 200 OK` (Array of `CityDTO`).
- **API 20: Kalkulasi Tarif Ongkos Kirim Multi-Kurir**
  - **Endpoint:** `POST /api/v1/logistics/rates`
  - **Input Body:** `ShippingRateRequest` (`destination_city_id`, `weight_grams`, `courier_code`).
  - **Output (Success):** `HTTP 200 OK` (`ShippingRateResponse` berisi daftar layanan `REG`, `YES/BEST`, `ECO/OKE` beserta tarif dan ETD).
- **API 21: Pelacakan Manifes Perjalanan Paket (Parcel Tracking Timeline)**
  - **Endpoint:** `GET /api/v1/logistics/track/{order_id}`
  - **Proteksi:** Menggunakan `get_optional_user` dengan validasi isolasi kepemilikan pesanan (identik dengan proteksi `GET /api/v1/orders/{order_id}`).
  - **Output (Success):** `HTTP 200 OK` (`ShipmentTrackingResponse`).

### 3.2 Antarmuka Subsistem Eksternal (External Systems Contracts)

- **EXT-API-01: Payment Gateway Webhook & Snap API (Midtrans):** Menyertakan item biaya pengiriman di dalam `item_details` agar jumlah total item sama persis dengan `transaction_details.gross_amount`.
- **EXT-API-02: Google Identity Services OIDC Verification.**
- **EXT-API-03: Supabase Storage / S3-Compatible Object Storage API.**
- **EXT-API-04: Hybrid 3PL Logistics Gateway (RajaOngkir REST API + Built-in Fallback Adapter) \[Ditambahkan V2.0.0\]**
  - **Protokol:** HTTPS POST ke `https://api.rajaongkir.com/starter/cost` (atau _endpoint_ Komerce/RajaOngkir V2) dengan parameter `origin`, `destination`, `weight`, dan `courier`.
  - **Mekanisme Failover:** Modul `backend/logistics.py` membungkus panggilan eksternal di dalam blok `try...except httpx.HTTPError`. Apabila `RAJAONGKIR_API_KEY` tidak disetel atau API eksternal merespons di luar `200 OK`, _Adapter_ langsung mengeksekusi perhitungan tarif berbasis matriks zona geografis Indonesia secara deterministik tanpa jeda.

## BAB 4: DESAIN KOMPONEN DAN ALGORITMA (COMPONENT SELECTION AND DESIGN)

### 4.1 Pemilihan Komponen Pakai Ulang (Reusable Components)

1. **Frontend (Next.js):** `Zustand`, `Zod` + `React Hook Form`, `@react-oauth/google`, `lucide-react` (Ikon truk pengiriman, kotak paket, lencana resi, dan _stepper timeline_), serta `sonner`.
2. **Backend (FastAPI):** `SQLAlchemy 2.0` + `Alembic`, `Pydantic v2`, `python-multipart`, `httpx` (Klien HTTP untuk Midtrans, Supabase Storage, dan RajaOngkir 3PL API), `passlib[bcrypt]`, `PyJWT`, `google-auth`, dan `SlowAPI`.

### 4.2 Rancangan Algoritmik Matematis (Kompleksitas & Logika Inti)

#### A. Algoritma 1: Kalkulasi Harga & Ongkos Kirim Zero-Trust dengan Pembulatan Bobot (V2.0.0) \[Diperbarui V2.0.0\]

1. Kunci baris produk yang dipesan dengan `SELECT ... FOR UPDATE`.
2. Hitung subtotal barang dan bobot fisik total keranjang:
   $$\text{Subtotal} = \sum_{i=1}^{n} (q_i \times p_i), \quad W_{\text{total}} = \sum_{i=1}^{n} (q_i \times w_i)$$
3. Hitung bobot tagihan ekspedisi dalam satuan kilogram dengan fungsi _ceiling_ ($\lceil \cdot \rceil$):
   $$W_{\text{kg}} = \max\left(1, \left\lceil \frac{W_{\text{total}}}{1000} \right\rceil\right)$$
4. Hitung biaya pengiriman berdasarkan tarif dasar kota tujuan ($R_{\text{dest}}$), faktor pengali kurir ($\alpha_{\text{courier}}$), dan faktor kelas layanan ($\beta_{\text{service}}$):
   $$\text{Shipping Cost} = W_{\text{kg}} \times \text{round\_to\_500}\left(R_{\text{dest}} \times \alpha_{\text{courier}} \times \beta_{\text{service}}\right)$$
5. Tetapkan total tagihan akhir secara atomik:
   $$\text{Total Amount} = \text{Subtotal} + \text{Shipping Cost}$$

- **Time Complexity:** $O(n \log N)$ untuk penguncian baris basis data dan $O(1)$ untuk kalkulasi tarif logistik.

#### B. Algoritma 2 s.d. Algoritma 4: Eager Loading (`selectinload`), Verifikasi JWT RBAC, & Agregasi Analitik SQL Satu Putaran.

#### C. Algoritma 5: Transisi Finite State Machine (FSM V2) dengan Invarian Nomor Resi \[Diperbarui V2.0.0\]

Transisi status pesanan $\delta(s_{\text{current}}, \text{payload}) \rightarrow s_{\text{target}}$ diperketat dengan syarat invarian logistik:

- $\delta(\text{PENDING}) \rightarrow \{\text{PAID}, \text{CANCELLED}\}$ _(Transisi ke `CANCELLED` mengembalikan stok $\Delta \text{stock} = +q_i$)_
- $\delta(\text{PAID}) \rightarrow \{\text{SHIPPED}\}$ **syarat wajib:** $\text{len}(\text{tracking\_number}) \ge 6$ dan mencatat $\text{shipped\_at} = t_{\text{now}}$.
- $\delta(\text{SHIPPED}) \rightarrow \{\text{COMPLETED}\}$ dan mencatat $\text{completed\_at} = t_{\text{now}}$.
- $\delta(\text{COMPLETED}) \rightarrow \emptyset$ & $\delta(\text{CANCELLED}) \rightarrow \emptyset$ _(Terminal States)_.

## BAB 5: KOMPONEN SEKUNDER DAN OPERASIONAL EKOSISTEM

### 5.1 Pemilihan Teknologi & Konfigurasi Lingkungan (Environment Variables)

- **Backend (`.env` / Vercel Backend Environment):**
  - `DATABASE_URL`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION`, `ALLOWED_ORIGINS`.
  - `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `GOOGLE_CLIENT_ID`.
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
  - **\[Baru V2.0.0 - Opsional dengan Built-in Fallback\]** `RAJAONGKIR_API_KEY`: Kunci API RajaOngkir untuk mode kueri eksternal (jika kosong, sistem otomatis menggunakan _Built-in Indonesian Wilayah & Tariff Engine_).
  - **\[Baru V2.0.0 - Opsional\]** `STORE_ORIGIN_CITY_ID`: ID kota gudang pengiriman asal (Default: `'152'` — Jakarta Pusat).
- **Frontend (`.env.local` / Vercel Frontend Config):**
  - `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

### 5.2 Manajemen Konfigurasi dan Otomatisasi (CI/CD Pipeline)

#### 5.2.1 Manajemen Versi & Migrasi Basis Data (Git & Alembic Governance)

- **Aturan Penamaan Cabang V2.0.0:**
  - `docs/srs-sdd-v2.0.0` (Pembaruan dokumen kontrak spesifikasi dan desain V2.0.0).
  - `feature/logistics-3pl-backend` (Sprint 17: Migrasi Alembic V2.0.0, Modul `logistics.py`, Endpoint Ongkir/Tracking, & Zero-Trust Checkout V2).
  - `feature/checkout-shipping-ui` (Sprint 18: Kalkulator Ongkir Dinamis `/cart`, Pemilih Provinsi/Kota/Kurir, & Manajemen Berat Produk Admin).
  - `feature/order-tracking-timeline` (Sprint 19: Input/Generator Resi Admin & Visual Parcel Tracking Timeline Pelanggan).
  - `docs/release-v2.0.0` (Sprint 20: Migrasi Produksi V2.0.0, End-to-End QA, Pengesahan Dokumen, & Tag Rilis Mayor `v2.0.0`).
