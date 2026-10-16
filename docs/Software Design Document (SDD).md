# Software Design Document (SDD)

## Platform E-Commerce Berbasis RESTful Microservices

### Riwayat Dokumen (Document Control)

| Versi | Tanggal     | Penulis         | Deskripsi Perubahan (Change Log)                                                                             | Status  |
| :---- | :---------- | :-------------- | :----------------------------------------------------------------------------------------------------------- | :------ |
| 1.0.0 | 12 Okt 2026 | M. Iqbal Ababil | Inisialisasi MVP, Arsitektur Database, Integrasi Midtrans.                                                   | Dirilis |
| 1.1.0 | 16 Okt 2026 | M. Iqbal Ababil | DRAF: Refactoring UI/UX (CRO Pattern, Brand Color 'Tech Violet'), Security Audit (CORS, Rate Limiting, XSS). | Draf    |
| 1.2.0 | TBA         | M. Iqbal Ababil | DRAF: Penambahan Modul IAM (Login/Register JWT), ERD Users & Product_Images.                                 | Rencana |
| 2.0.0 | TBA         | M. Iqbal Ababil | DRAF: Modul Integrasi Eksternal (API Logistik 3PL), Ongkos Kirim Dinamis.                                    | Rencana |

**Versi:** 1.1.0 **Status:** Draf

## BAB 1: DESAIN ARSITEKTURAL (SYSTEM ARCHITECTURE)

Arsitektur sistem ini menggunakan pola **Decoupled 3-Tier Architecture** dengan pemisahan tegas (_Separation of Concerns_) antara lapisan presentasi, lapisan logika bisnis, dan lapisan persistensi data.

### 1.1 Dekomposisi Modul (Modular Breakdown)

Sistem dipecah menjadi modul-modul independen yang berjalan di kontainernya masing-masing:

1. **Tier 1: Presentation Module (Next.js - Client & SSR)**
   - **UI Components:** Komponen React (Tombol, Form, Grid Produk) yang dioptimasi dengan prinsip CRO dan palet warna "Tech Violet".
   - **State Manager:** Pengelola status memori lokal (Zustand) untuk _Cart_.
   - **API Client:** Layanan _fetcher_ pembungkus _request_ HTTP ke _backend_.
2. **Tier 2: Application/API Module (FastAPI - Backend)**
   - **Router/Controller:** Menerima _request_ HTTP dari Next.js, memvalidasi parameter _input_ menggunakan Pydantic. **[Pembaruan V1.1.0]** Dilengkapi modul _Rate Limiting_.
   - **Service/Business Logic:** Berisi fungsi inti (kalkulasi harga, validasi stok, pemanggilan _Payment Gateway_).
   - **Repository/DAO (Data Access Object):** Modul khusus yang berisi kueri SQL/ORM (SQLAlchemy) untuk berinteraksi dengan database.
3. **Tier 3: Persistence Module (PostgreSQL)**
   - Mesin basis data relasional.

### 1.2 Relasi Kontrol (Control Relationships)

Hubungan pemanggilan antar-modul bersifat **Uni-directional** (Satu Arah) dari atas ke bawah. Lapis bawah tidak pernah memanggil lapis atas, melainkan hanya mengembalikan _response_.

- **Alur Standar:** `Next.js API Client` ➔ `FastAPI Router` ➔ `FastAPI Service` ➔ `FastAPI Repository` ➔ `PostgreSQL`.
- **Alur Webhook Asinkron:** `Payment Gateway (Eksternal)` ➔ `FastAPI Webhook Router` ➔ `FastAPI Service (Update Status)` ➔ `PostgreSQL`.

### 1.3 Representasi Arsitektur (Format AI-Readable Topology)

```text
[Internet/Client]
       │ (HTTP/HTTPS)
       ▼
┌──────────────────────────────────────────────┐
│ FRONTEND TIER (Next.js / TypeScript)         │
│ ├─ pages/ (Routing & SSR)                    │
│ ├─ components/ (Reusable UI & CRO Elements)  │
│ ├─ store/ (Zustand Cart State)               │
│ └─ lib/api/ (HTTP Client -> Backend)         │
└──────────────────────┬───────────────────────┘
                       │ (REST API / JSON)
       ┌───────────────┴───────────────┐ (Webhook HTTPS)
       ▼                               ▼
┌──────────────────────────────────────────────┐
│ BACKEND TIER (FastAPI / Python)              │
│ ├─ api/routers/ (Endpoint Definitions)       │
│ ├─ core/services/ (Business Logic & Auth)    │
│ ├─ db/repositories/ (SQLAlchemy CRUD)        │
│ └─ schemas/ (Pydantic DTOs for Validation)   │
└──────────────────────┬───────────────────────┘
                       │ (TCP/IP Port 5432)
                       ▼
┌──────────────────────────────────────────────┐
│ DATABASE TIER (PostgreSQL)                   │
│ ├─ Table: products                           │
│ ├─ Table: orders                             │
│ └─ Table: order_items                        │
└──────────────────────────────────────────────┘
```

## BAB 2: DESAIN BASIS DATA DAN DATA (DATABASE DESIGN)

### 2.1 Struktur Data Modul (Data Transfer Objects / DTO)

- **Cart Checkout DTO (Request dari Frontend ke Backend):**

```json
{
  "customer_name": "string",
  "customer_email": "string (format email)",
  "customer_phone": "string",
  "shipping_address": "string",
  "items": [
    {
      "product_id": "uuid",
      "quantity": "integer (>0)"
    }
  ]
}
```

- **Order Response DTO (Response dari Backend ke Frontend):**

```json
{
  "order_id": "uuid",
  "status": "string",
  "payment_gateway_ref": "string (Token)"
}
```

### 2.2 Desain Skema Fisik (Physical Database Schema)

**Tabel Utama & Konstrain Kritis:**

1. **Tabel: `products`**
   - `id` (UUID, Primary Key, Auto-gen v4)
   - `name` (VARCHAR 255, NOT NULL)
   - `description` (TEXT)
   - `price` (NUMERIC 12,2, NOT NULL, Check: >= 0)
   - `stock_quantity` (INTEGER, NOT NULL, Check: >= 0)
   - `created_at` (TIMESTAMPTZ, Default: NOW())
2. **Tabel: `orders`**
   - `id` (UUID, Primary Key, Auto-gen v4)
   - `customer_name` (VARCHAR 255, NOT NULL)
   - `customer_email` (VARCHAR 255, NOT NULL)
   - `customer_phone` (VARCHAR 50, NOT NULL)
   - `shipping_address` (TEXT, NOT NULL)
   - `total_amount` (NUMERIC 12,2, NOT NULL, Check: >= 0)
   - `status` (VARCHAR 50, NOT NULL, Default: 'PENDING')
   - `payment_gateway_ref` (VARCHAR 255, Nullable)
   - `created_at` (TIMESTAMPTZ, Default: NOW())
3. **Tabel: `order_items`**
   - `id` (UUID, Primary Key, Auto-gen v4)
   - `order_id` (UUID, NOT NULL) -> Foreign Key (`orders.id`) ON DELETE CASCADE
   - `product_id` (UUID, NOT NULL) -> Foreign Key (`products.id`) ON DELETE RESTRICT
   - `quantity` (INTEGER, NOT NULL, Check: > 0)
   - `price_at_purchase` (NUMERIC 12,2, NOT NULL)

## BAB 3: SPESIFIKASI ANTARMUKA (INTERFACE SPECIFICATION)

### 3.1 Antarmuka Antar-Modul (Internal API Contracts)

- **API 1: Inisiasi Pemesanan (Checkout)**
  - **Endpoint:** POST /api/v1/orders/checkout
  - **Caller:** Next.js HTTP Fetcher.
  - **Callee:** FastAPI Order Router.
  - **Output (Success):** HTTP 201 Created. Body: `{"order_id": "uuid", "payment_gateway_ref": "token_string"}`
  - **Output (Error):** HTTP 400 Bad Request. Body: `{"detail": "Stock insufficient"}`
  - **[Tambahan V1.1.0]:** Wajib dilindungi oleh Rate Limiter (maksimal 5 request / menit / IP).

### 3.2 Antarmuka Subsistem Eksternal (External Systems Contracts)

- **EXT-API-01: Payment Gateway Webhook (Inbound)**
  - **Protokol:** HTTPS POST.
  - **Endpoint Publik Kita:** POST /api/v1/webhooks/midtrans
  - **Keamanan Wajib:** Header Signature-Key yang berisi enkripsi HMAC-SHA512 dari kombinasi order_id + status_code + gross_amount + Server Key.

## BAB 4: DESAIN KOMPONEN DAN ALGORITMA (COMPONENT SELECTION AND DESIGN)

### 4.1 Pemilihan Komponen Pakai Ulang (Reusable Components)

1. **Frontend (Next.js):**
   - **State Management:** Zustand. Alasan: Beban memori jauh lebih ringan daripada Redux; mencegah re-render yang tidak perlu dengan arsitektur hook.
   - **Form Validation:** Zod + React Hook Form. Alasan: Validasi type-safe dan pembersihan input XSS secara deklaratif.
2. **Backend (FastAPI):**
   - **Database ORM:** SQLAlchemy 2.0 (Async). Alasan: Mampu menahan koneksi asinkron tanpa memblokir thread utama Python.
   - **Schema Validation:** Pydantic v2. Alasan: Eksekusi validasi 5-50x lebih cepat (Rust Core).
   - **[Tambahan V1.1.0] Rate Limiting:** Slowapi (atau Middleware Redis Token Bucket serupa).

### 4.2 Rancangan Algoritmik Matematis (Kompleksitas & Logika Inti)

**Algoritma Inti: Validasi Harga Keranjang & Konfirmasi Stok (Pessimistic Locking)**

1. Kumpulkan semua product_id dari keranjang klien.
2. Lakukan kueri SELECT ... FOR UPDATE (menggunakan .with_for_update()) untuk mengambil data $n$ produk sekaligus dan mengunci barisnya di PostgreSQL untuk mencegah race condition.
3. Iterasi setiap item dari keranjang klien, lakukan pencarian data harga dan stok. Kalkulasi: total_tagihan += (item_qty \* db_price).
4. Jika item_qty > db_stock, lempar InsufficientStockError.
5. Jika valid, kurangi stok dan commit ke tabel orders dan order_items.

- **Time Complexity (Waktu):** $\approx O(n\log N)$
- **Space Complexity (Ruang):** $O(n)$

## BAB 5: KOMPONEN SEKUNDER DAN OPERASIONAL EKOSISTEM

### 5.1 Pemilihan Teknologi (Tech Stack & Platform)

Sistem ini ditargetkan untuk beroperasi di lingkungan komputasi awan (cloud-native) yang terisolasi.

- **Lingkungan Eksekusi & Bahasa:** TypeScript (Target: ES2022) pada Node.js v20 (LTS) dan Python 3.12+ (CPython).
- **Sistem Operasi Target:** Diisolasi di dalam Container berbasis Linux (Alpine atau Debian Slim) melalui Docker Engine.
- **Perangkat Lunak Basis Data:** PostgreSQL 15+ dijalankan sebagai Session Pooler di awan (Supabase).

### 5.2 Manajemen Konfigurasi dan Otomatisasi (CI/CD Pipeline)

#### 5.2.1 Manajemen Versi (Version Control System - Git)

**Aturan Penamaan Cabang:**

- `feature/` : Untuk membangun fungsi baru.
- `bugfix/` : Untuk memperbaiki error sistem di masa development.
- `chore/` : Untuk perubahan DevOps / konfigurasi build.
- `hotfix/` : Untuk perbaikan error kritis di server produksi.

**Aturan Penggabungan (Merging):** Mode penggabungan menggunakan Squash and Merge untuk menyatukan commit selama vibe coding menjadi satu commit tunggal yang rapi di cabang main.

#### 5.2.2 Pembangunan Sistem & Integrasi (System Building & Automation)

Otomatisasi perakitan perangkat lunak ditangani oleh GitHub Actions.

**Tahapan CI Pipeline:**

- **Type Checking:** Memvalidasi Typescript (`npx next typegen` diikuti `tsc --noEmit`) pada Next.js.
- **Code Checking:** Memvalidasi import Python dan smoke testing modul FastAPI.
- **Build Validation:** Mengeksekusi perintah `npm run build` untuk Next.js secara otomatis setiap ada PR ke main.

**Otomatisasi CD Pipeline:**

- **Deployment berarsitektur Hybrid Cloud:** Frontend Next.js disajikan melalui Vercel Edge Network, Backend Python dieksekusi melalui Vercel Serverless Functions (atau Render/Railway), dan database dipusatkan pada Supabase Session Pooler.
