# e-commerce-nextjs-fastapi# 🛒 Core Commerce — Production-Grade Fullstack E-Commerce Platform

![CI Pipeline](https://github.com/ababiliqbal/e-commerce-nextjs-fastapi/actions/workflows/ci.yml/badge.svg)
![Next.js](<https://img.shields.io/badge/Frontend-Next.js%2016%20(App%20Router)-black>)
![FastAPI](<https://img.shields.io/badge/Backend-FastAPI%20(Python%203.12+)-009688>)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015-336791)
![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED)

Platform web _e-commerce_ modern berarsitektur **Decoupled 3-Tier** yang dirancang dengan fokus pada keamanan transaksi finansial, ketahanan konkurensi basis data (_ACID Compliance_), dan otomatisasi infrastruktur (_CI/CD & Containerization_). Proyek ini dibangun mengikuti siklus rekayasa perangkat lunak formal berbasis spesifikasi **SRS (Software Requirements Specification)** dan **SDD (Software Design Document)**.

🔗 **Live Demo (Frontend):** [https://ecommerce-nextjs-frontend-two.vercel.app/](https://ecommerce-nextjs-frontend-two.vercel.app/)  
🔗 **Live API Healthcheck:** [https://ecommerce-fastapi-backend-bay.vercel.app/health](https://ecommerce-fastapi-backend-bay.vercel.app/health)  
🔗 **Interactive API Docs (Swagger UI):** [https://ecommerce-fastapi-backend-bay.vercel.app/docs](https://ecommerce-fastapi-backend-bay.vercel.app/docs)

---

## 🏗️ Sorotan Arsitektur & Rekayasa Sistem (Engineering Highlights)

Berbeda dengan prototipe _e-commerce_ standar, sistem ini mengimplementasikan mekanisme pertahanan level produksi untuk menangani skenario dunia nyata:

1. **Pessimistic Concurrency Control (Anti-Race Condition):**
   Menggunakan penguncian baris tingkat basis data (`SELECT ... FOR UPDATE` melalui SQLAlchemy `.with_for_update()`) saat proses _checkout_ dan _webhook_. Mencegah anomali _overselling_ (stok minus) ketika ratusan pengguna membeli barang terakhir di milidetik yang sama.
2. **Zero-Trust Pricing Architecture:**
   Sisi klien (_Frontend_) hanya diizinkan mengirimkan `product_id` dan `quantity`. Kalkulasi `total_amount` dan penguncian harga historis (`price_at_purchase`) dilakukan 100% di sisi _server_ menggunakan tipe aritmatika presisi tinggi `Decimal` berdasarkan data otoritatif PostgreSQL.
3. **Cryptographic Webhook Verification & Idempotent Auto-Restock:**
   Endpoint penerima notifikasi pembayaran Midtrans dilindungi oleh verifikasi _hash_ **`SHA-512`**. Mendukung sifat _idempotent_ (kebal terhadap duplikasi pengiriman _webhook_) dan secara otomatis mengembalikan stok barang ke gudang (_auto-restock_) apabila pembayaran berstatus `cancel`, `deny`, atau `expire`.
4. **Frictionless Guest Checkout & Client-Side Order Recovery:**
   Pengguna dapat bertransaksi tanpa paksaan registrasi akun. Dilengkapi persistensi _state_ menggunakan **Zustand (`localStorage`)** dengan penanganan _SSR Hydration Guard_ serta fitur pemulihan sesi tagihan terakhir (_Guest Order Recovery_).
5. **Hybrid Deployment Ready (Docker Multi-Stage & Serverless):**
   Mendukung isolasi penuh melalui **Docker Compose** (dengan _Multi-Stage Build_ `output: "standalone"` pada Next.js) maupun _deployment_ berbasis _Serverless Edge_ di **Vercel** dan **Supabase**.

---

## 🛠️ Tech Stack

| Lapisan (Tier)               | Teknologi                                                                                                 | Peran & Kegunaan                                                                                        |
| :--------------------------- | :-------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| **Frontend (Presentation)**  | Next.js 16 (App Router), TypeScript 5, Tailwind CSS v4, Shadcn UI (Radix), Zustand, React Hook Form + Zod | Server-Side Rendering (SSR), manajemen _state_ keranjang belanja, dan validasi skema formulir berlapis. |
| **Backend (Business Logic)** | FastAPI (Python), SQLAlchemy ORM, Pydantic v2, HTTPX                                                      | RESTful API, manajemen transaksi ACID, dan integrasi klien HTTP ke Midtrans Snap API.                   |
| **Database (Persistence)**   | PostgreSQL 15 (Docker & Supabase)                                                                         | Penyimpanan relasional dengan _Check Constraints_, _Foreign Key Integrity_, dan _UUID v4 Primary Keys_. |
| **Payment Gateway**          | Midtrans Snap API (Sandbox)                                                                               | Pemrosesan pembayaran multi-kanal (Virtual Account, QRIS, E-Wallet) dan notifikasi HTTP Webhook.        |
| **DevOps & CI/CD**           | Docker, Docker Compose, GitHub Actions, Vercel                                                            | Otomatisasi _type-checking_, pengujian kompilasi paralel, kontainerisasi, dan _cloud deployment_.       |

---

## 📂 Struktur Direktori (Monorepo)

```text
├── .github/workflows/
│   └── ci.yml                 # Pipeline CI paralel (Backend Python Check & Frontend Next.js Build)
├── docs/
│   ├── SRS.md                 # Spesifikasi Kebutuhan Perangkat Lunak (IEEE Standard)
│   └── SDD.md                 # Dokumen Desain Arsitektur & Basis Data
├── backend/
│   ├── main.py                # Entrypoint FastAPI, Endpoint Transaksi & Webhook Midtrans
│   ├── models.py              # Skema Tabel SQLAlchemy (Product, Order, OrderItem)
│   ├── schemas.py             # Validasi DTO Pydantic v2
│   ├── database.py            # Konfigurasi Engine & Session Pool PostgreSQL
│   ├── seed.py                # Skrip Idempotent Seeder untuk data awal katalog
│   ├── Dockerfile             # Kontainerisasi Backend Python
│   └── vercel.json            # Konfigurasi Serverless Runtime Vercel
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router (SSR Catalog, Dynamic Detail, Cart, Order Status)
│   │   ├── components/        # Komponen UI Atomik & Midtrans Snap PayButton
│   │   ├── store/             # Zustand Cart & Guest Order Recovery Store
│   │   ├── lib/               # Utilitas Dual-Network API Resolver (Internal Docker vs Public URL)
│   │   └── types/             # Kontrak Interface TypeScript
│   └── Dockerfile             # Multi-Stage Production Dockerfile (Node Alpine Standalone)
└── docker-compose.yml         # Orkestrasi 3 Kontainer (PostgreSQL + FastAPI + Next.js)
```

---

## 🚀 Panduan Menjalankan Proyek Secara Lokal

### Opsi A: Menggunakan Docker Compose (Direkomendasikan — 1 Perintah)

Pastikan **Docker Desktop** sudah menyala di komputer Anda.

1. Kloning repositori:
   ```bash
   git clone [https://github.com/ababiliqbal/e-commerce-nextjs-fastapi.git](https://github.com/ababiliqbal/e-commerce-nextjs-fastapi.git)
   cd e-commerce-nextjs-fastapi
   ```
2. Siapkan berkas `.env` di `backend/.env` (lihat `backend/.env.example`) dan `.env` di _root directory_ untuk argumen `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`.
3. Jalankan orkestrasi kontainer:
   ```bash
   docker compose up --build -d
   ```
4. Akses aplikasi:
   - **Frontend Web:** `http://localhost:3000`
   - **Backend API & Swagger Docs:** `http://localhost:8000/docs`

### Opsi B: Menjalankan Secara Manual (Tanpa Docker untuk App)

1. **Backend:**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate      # Windows (Gunakan `source venv/bin/activate` di Mac/Linux)
   pip install -r requirements.txt
   python seed.py
   uvicorn main:app --reload
   ```
2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 🧪 Skenario Pengujian Pembayaran (Midtrans Sandbox)

1. Buka aplikasi dan tambahkan produk ke keranjang belanja.
2. Masuk ke halaman **Keranjang (`/cart`)**, isi formulir _Guest Checkout_, lalu klik **Bayar Sekarang**.
3. Pada jendela popup **Midtrans Snap**, pilih metode **Virtual Account (BCA)** dan salin nomor Virtual Account yang terbit.
4. Buka [Midtrans BCA VA Simulator](https://simulator.sandbox.midtrans.com/bca/va/index), tempelkan nomor VA, lalu klik **Inquire** dan **Pay**.
5. Midtrans akan mengirimkan notifikasi _webhook_ terenkripsi ke _backend_, dan status pesanan pada halaman Anda akan otomatis berubah menjadi **`LUNAS (PAID)`**.

---

## 📄 Dokumentasi Rekayasa Lengkap

- [Software Requirements Specification (SRS)](<./docs/Software_Requirements_Specification_(SRS).md>)
- [Software Design Document (SDD)](<./docs/Software_Design_Document_(SDD).md>)

---

_Dibangun oleh **Muhammad Iqbal Ababil** — 2026._
