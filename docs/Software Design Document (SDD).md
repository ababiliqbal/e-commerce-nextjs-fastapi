# **Software Design Document (SDD)**

## **Platform E-Commerce Berbasis RESTful Microservices**

## **BAB 3.1: DESAIN ARSITEKTURAL (*SYSTEM ARCHITECTURE*)**

Arsitektur sistem ini menggunakan pola **Decoupled 3-Tier Architecture** dengan pemisahan tegas ( *Separation of Concerns*) antara lapisan presentasi, lapisan logika bisnis, dan lapisan persistensi data.

### **3.1.1 Dekomposisi Modul (Modular Breakdown)**

Sistem dipecah menjadi modul-modul independen yang berjalan di kontainernya masing-masing:

1. **Tier 1: Presentation Module (Next.js \- Client & SSR)**  
   * **UI Components:** Komponen React (Tombol, Form, Grid Produk).  
   * **State Manager:** Pengelola status memori lokal (Zustand/Redux) untuk *Cart*.  
   * **API Client:** Layanan *fetcher* (seperti Axios atau *native fetch*) pembungkus *request* HTTP ke *backend*.  
2. **Tier 2: Application/API Module (FastAPI \- Backend)**  
   * **Router/Controller:** Menerima *request* HTTP dari Next.js, memvalidasi parameter *input* menggunakan Pydantic.  
   * **Service/Business Logic:** Berisi fungsi inti (kalkulasi harga, validasi stok, pemanggilan *Payment Gateway*).  
   * **Repository/DAO (Data Access Object):** Modul khusus yang berisi kueri SQL/ORM (seperti SQLAlchemy) untuk berinteraksi dengan database. Modul bisnis tidak boleh memanggil SQL secara langsung.  
3. **Tier 3: Persistence Module (PostgreSQL)**  
   * Mesin basis data relasional.

### **3.1.2 Relasi Kontrol (*Control Relationships*)**

Hubungan pemanggilan antar-modul bersifat **Uni-directional** (Satu Arah) dari atas ke bawah. Lapis bawah tidak pernah memanggil lapis atas, melainkan hanya mengembalikan *response*.

* **Alur Standar:** `Next.js API Client` ➔ `FastAPI Router` ➔ `FastAPI Service` ➔ `FastAPI Repository` ➔ `PostgreSQL`.  
* **Alur Webhook Asinkron:** `Payment Gateway (Eksternal)` ➔ `FastAPI Webhook Router` ➔ `FastAPI Service (Update Status)` ➔ `PostgreSQL`.

### **3.1.3 Representasi Arsitektur (Format *AI-Readable Topology*)**

Berikut adalah topologi arsitektur yang dapat langsung dipahami oleh *AI agent* saat Anda melakukan *vibe coding*:

Plaintext  
\[Internet/Client\]  
       │ (HTTP/HTTPS)  
       ▼  
┌──────────────────────────────────────────────┐  
│ FRONTEND TIER (Next.js / TypeScript)         │  
│ ├─ pages/ (Routing & SSR)                    │  
│ ├─ components/ (Reusable UI)                 │  
│ ├─ store/ (Zustand Cart State)               │  
│ └─ lib/api/ (HTTP Client \-\> Backend)         │  
└──────────────────────┬───────────────────────┘  
                       │ (REST API / JSON)  
       ┌───────────────┴───────────────┐ (Webhook HTTPS)  
       ▼                               ▼  
┌──────────────────────────────────────────────┐  
│ BACKEND TIER (FastAPI / Python)              │  
│ ├─ api/routers/ (Endpoint Definitions)       │  
│ ├─ core/services/ (Business Logic)           │  
│ ├─ db/repositories/ (SQLAlchemy CRUD)        │  
│ └─ schemas/ (Pydantic DTOs for Validation)   │  
└──────────────────────┬───────────────────────┘  
                       │ (TCP/IP Port 5432\)  
                       ▼  
┌──────────────────────────────────────────────┐  
│ DATABASE TIER (PostgreSQL)                   │  
│ ├─ Table: products                           │  
│ ├─ Table: orders                             │  
│ └─ Table: order\_items                        │  
└──────────────────────────────────────────────┘

## **BAB 3.2: DESAIN BASIS DATA DAN DATA (*DATABASE DESIGN*)**

Desain data dibagi menjadi representasi transien di dalam memori aplikasi (DTO) dan representasi persisten di dalam cakram keras (*database physical schema*).

### **3.2.1 Struktur Data Modul (Data Transfer Objects / DTO)**

Saat berinteraksi, modul FastAPI dan Next.js tidak saling melempar baris tabel database mentah. Mereka menggunakan DTO. Ini adalah "kontrak bentuk data" (JSON) antar-modul.

*Agen AI akan menggunakan spesifikasi ini untuk men-generate Pydantic Models di Python dan Typescript Interfaces di Next.js.*

* **Cart Checkout DTO (Request dari Frontend ke Backend):**  
* JSON

{  
  "customer\_name": "string",  
  "customer\_email": "string (format email)",  
  "customer\_phone": "string",  
  "shipping\_address": "string",  
  "items": \[  
    {  
      "product\_id": "uuid",  
      "quantity": "integer (\>0)"  
    }  
  \]  
}

*   
*   
* **Order Response DTO (Response dari Backend ke Frontend):**  
* JSON

{  
  "order\_id": "uuid",  
  "status": "string",  
  "payment\_url": "string (URL to Payment Gateway)"  
}

*   
* 

### **3.2.2 Desain Skema Fisik (*Physical Database Schema*)**

Skema fisik ini merupakan wujud konkrit dari desain logika (ERD). Aturan relasi dikawal ketat oleh sistem konstrain PostgreSQL.

**Tabel Utama & Konstrain Kritis:**

1. **Tabel: `products`**  
   * `id` (UUID, Primary Key, Auto-gen v4)  
   * `name` (VARCHAR 255, NOT NULL)  
   * `description` (TEXT)  
   * `price` (NUMERIC 12,2, NOT NULL, Check: \>= 0\)  
   * `stock_quantity` (INTEGER, NOT NULL, Check: \>= 0\)  
   * `created_at` (TIMESTAMPTZ, Default: NOW())  
2. **Tabel: `orders`**  
   * `id` (UUID, Primary Key, Auto-gen v4)  
   * `customer_name` (VARCHAR 255, NOT NULL)  
   * `customer_email` (VARCHAR 255, NOT NULL)  
   * `customer_phone` (VARCHAR 50, NOT NULL)  
   * `shipping_address` (TEXT, NOT NULL)  
   * `total_amount` (NUMERIC 12,2, NOT NULL, Check: \>= 0\)  
   * `status` (VARCHAR 50, NOT NULL, Default: 'PENDING')  
   * `payment_gateway_ref` (VARCHAR 255, Nullable)  
   * `created_at` (TIMESTAMPTZ, Default: NOW())  
3. **Tabel: `order_items`**  
   * `id` (UUID, Primary Key, Auto-gen v4)  
   * `order_id` (UUID, NOT NULL) \-\> **Foreign Key** (`orders.id`) `ON DELETE CASCADE`  
   * `product_id` (UUID, NOT NULL) \-\> **Foreign Key** (`products.id`) `ON DELETE RESTRICT`  
   * `quantity` (INTEGER, NOT NULL, Check: \> 0\)  
   * `price_at_purchase` (NUMERIC 12,2, NOT NULL)

## **BAB 3.3: SPESIFIKASI ANTARMUKA (*INTERFACE SPECIFICATION*)**

### **3.3.1 Antarmuka Antar-Modul (Internal API Contracts)**

Spesifikasi ini mengatur bagaimana modul presentasi (Next.js) dan modul logika bisnis (FastAPI) berkomunikasi melalui jaringan internal menggunakan HTTP RESTful.

* **API 1: Inisiasi Pemesanan (*Checkout*)**  
  * **Endpoint:** POST /api/v1/orders/checkout  
  * **Caller (Klien):** Next.js HTTP Fetcher.  
  * **Callee (Server):** FastAPI Order Router.  
  * **Request Headers:** Content-Type: application/json  
  * **Input Body (Payload):** Sesuai spesifikasi *Cart Checkout DTO* (Bab 3.2.1).  
  * **Output (Success):** HTTP 201 Created. Body: {"order\_id": "uuid", "payment\_url": "url\_string"}  
  * **Output (Error):** HTTP 409 Conflict. Body: {"error": "Stock insufficient for product\_id X"}  
* **API 2: Validasi Sisa Stok Katalog**  
  * **Endpoint:** GET /api/v1/products/{id}/availability  
  * **Parameter:** id (Tipe: UUID).  
  * **Output:** {"available\_stock": integer}

### **3.3.2 Antarmuka Subsistem Eksternal (*External Systems Contracts*)**

Mengatur bagaimana sistem kita berkomunikasi dengan infrastruktur di luar kendali kita (Payment Gateway). Kita asumsikan menggunakan standar API Midtrans.

* **EXT-API-01: Payment Gateway Webhook (Inbound)**  
  * **Protokol:** HTTPS POST.  
  * **Endpoint Publik Kita:** POST /api/v1/webhooks/payment  
  * **Keamanan Wajib:** Header Signature-Key yang berisi enkripsi *HMAC-SHA512* dari kombinasi Order ID \+ Status \+ Server Key.  
  * **Data Pertukaran (Midtrans Payload):**  
  * JSON

{  
  "order\_id": "uuid",  
  "transaction\_status": "settlement",  
  "gross\_amount": "string",  
  "signature\_key": "hash\_string"  
}

*   
  *   
  * **Tanggung Jawab Modul:** Mengurai JSON, memverifikasi *signature* matematis, lalu memanggil *Order Repository* untuk meng-*update* database.

## **BAB 3.4: DESAIN KOMPONEN DAN ALGORITMA (*COMPONENT SELECTION AND DESIGN*)**

### **3.4.1 Pemilihan Komponen Pakai Ulang (*Reusable Components*)**

Sesuai prinsip DRY (*Don't Repeat Yourself*), sistem tidak akan membangun modul penunjang dari nol jika pustaka open-source bereputasi tinggi sudah tersedia.

1. **Frontend (Next.js):**  
   * *State Management:* **Zustand**. Alasan: Beban memori jauh lebih ringan daripada Redux; mencegah *re-render* yang tidak perlu dengan arsitektur *hook*.  
   * *Data Fetching:* **SWR** atau **React Query**. Alasan: Menangani siklus *caching*, *revalidation* data katalog di latar belakang, dan *retry* otomatis jika jaringan putus.  
   * *Form Validation:* **Zod** \+ **React Hook Form**. Alasan: Keduanya dirancang spesifik untuk TypeScript (*type-safe validation*).  
2. **Backend (FastAPI):**  
   * *Database ORM:* **SQLAlchemy 2.0 (Async)**. Alasan: Mampu menahan koneksi asinkron tanpa memblokir *thread* utama Python (*non-blocking I/O*).  
   * *Schema Validation:* **Pydantic v2**. Alasan: Ditulis menggunakan bahasa Rust di balik layar (inti Core Pydantic), sehingga kecepatan validasi JSON 5-50x lebih cepat dibanding versi terdahulu.

### **3.4.2 Rancangan Algoritmik Matematis (Kompleksitas & Logika Inti)**

Di bawah ini adalah algoritma kritis pemrosesan transaksi yang dijalankan oleh modul Order Service saat *checkout*. Algoritma ini dirancang dengan evaluasi ketat terhadap kompleksitas waktu (*Time Complexity*, $O$) dan ruang (*Space Complexity*).

**Algoritma Inti: Validasi Harga Keranjang & Konfirmasi Stok**

Saat menerima *Array* keranjang dari klien (sejumlah $n$ barang), *backend* tidak boleh percaya pada total harga dari klien. Ia harus menghitung ulang dari sumber absolut (database).

**Langkah Komputasi:**

1. Kumpulkan semua product\_id dari *request* keranjang klien ke dalam sebuah Himpunan (*Set*). (Kompleksitas: $O(n)$ waktu, $O(n)$ ruang).  
2. Lakukan kueri SQL SELECT id, price, stock\_quantity FROM products WHERE id IN (...) untuk mengambil data $n$ produk sekaligus. Ini mencegah masalah kueri iteratif *N+1 Query Problem*.  
   * Kompleksitas kueri database (menggunakan indeks *B-Tree* pada *Primary Key*): $O(n\log N)$, di mana $N$ adalah total jumlah produk di *database*.  
3. Ubah hasil kueri SQL menjadi *Hash Map* (Dictionary di Python) dengan product\_id sebagai *key*. (Kompleksitas pembuatan *Hash Map*: $O(n)$ waktu, $O(n)$ ruang).  
4. Iterasi (perulangan) setiap item dari keranjang klien, lakukan pencarian data harga dan stok dari *Hash Map*. Kalkulasi: total\_tagihan \+= (item\_qty \* db\_price).  
   * Kompleksitas pencarian *Hash Map*: $O(1)$ per item. Total waktu loop: $O(n)$.  
   * Jika item\_qty \> db\_stock, lempar eksepsi *InsufficientStockError*.

**Analisis Kompleksitas Akhir Algoritma Checkout:**

* **Time Complexity (Waktu):** $\approx O(n\log N)$ (Didominasi oleh waktu pencarian indeks database; pemrosesan CPU di Python murni $O(n)$ linier).  
* **Space Complexity (Ruang):** $O(n)$ (Memori yang dibutuhkan untuk *Hash Map* sementara berbanding lurus dengan jumlah unik item di keranjang).  
* **Akurasi:** Tingkat akurasi matematis 100% (bebas eksploitasi peretas), karena referensi harga diselesaikan dalam arsitektur tertutup antara *backend* dan *database*, mengabaikan masukan harga dari pengguna.

## **BAB 4: KOMPONEN SEKUNDER DAN OPERASIONAL EKOSISTEM**

Bab ini mendefinisikan infrastruktur pendukung, lingkungan kerja pengembang, serta strategi manajemen konfigurasi otomatis untuk menjamin bahwa perangkat lunak dapat dirakit, diuji, dan dirilis secara terprediksi tanpa intervensi manual yang rentan kesalahan.

### **4.1 Pemilihan Teknologi (*Tech Stack & Platform*)**

Sistem ini ditargetkan untuk beroperasi di lingkungan komputasi awan awan (*cloud-native*) yang terisolasi.

* **Lingkungan Eksekusi & Bahasa Pemrograman:**  
  * **Frontend:** TypeScript (Target Kompilasi: ES2022). Dieksekusi pada *runtime* Node.js v20 (LTS) saat fase *build* (SSG/SSR), dan dirender pada peramban web modern sisi klien.  
  * **Backend:** Python versi 3.10 atau lebih tinggi (CPython interpreter). Dipilih karena ekosistem asinkron (*asyncio*) yang kuat pada FastAPI dan dukungan *library* AI di masa depan.  
* **Sistem Operasi Target (*Deployment OS*):**  
  * Aplikasi tidak akan berjalan langsung di atas sistem operasi *host*. Keduanya akan diisolasi di dalam *Container* berbasis **Linux (Alpine atau Debian Slim)** melalui *Docker Engine*. Hal ini memastikan prinsip *"Works on my machine, works in production"*.  
* **Perangkat Lunak Basis Data:**  
  * **PostgreSQL 15+**. Dijalankan sebagai layanan eksternal terkelola (*Managed Database / BaaS* seperti Supabase) atau sebagai *container* independen.  
* **Alat Pendukung Rekayasa Lunak (*CASE Tools / Programming Environment*):**  
  * *IDE/Editor:* Visual Studio Code atau Cursor (dioptimalkan untuk *Vibe Coding* dengan AI agent).  
  * *API Testing:* Postman atau Insomnia untuk memvalidasi *request/response* REST API.  
  * *Database GUI:* DBeaver atau pgAdmin untuk inspeksi data manual.  
  * *Package Manager:* `pnpm` (Frontend) untuk resolusi dependensi yang ketat, dan `pip` atau `Poetry` (Backend).

### **4.2 Manajemen Konfigurasi dan Otomatisasi (*CI/CD Pipeline*)**

Bagian ini dirumuskan berdasarkan standar **Git Project Management** untuk memastikan tata kelola versi (*version control*) tetap rapi saat bekerja di lingkungan *sprint* dan *vibe coding*.

#### **4.2.1 Manajemen Versi (*Version Control System \- Git*)**

Semua kode sumber akan dilacak menggunakan Git dan disimpan di repositori pusat (GitHub). Aturan berikut **wajib** dipatuhi:

**1\. Aturan Penamaan Cabang (*Branch Naming Convention*):** Cabang utama (`main`) bersifat suci dan siap rilis (*production-ready*). Pekerjaan dilakukan di cabang terpisah dengan awalan (*prefix*) wajib:

* `feature/` : Untuk membangun fungsi atau fitur baru (Contoh: `feature/cart-state`).  
* `bugfix/` : Untuk memperbaiki *error* atau kecacatan sistem di masa *development* (Contoh: `bugfix/checkout-calc`).  
* `hotfix/` : Untuk perbaikan *error* kritis yang terjadi langsung di *server* aktif/produksi (Contoh: `hotfix/payment-webhook-crash`).

**2\. Aturan Pesan Commit (*Commit Message Convention*):** Pesan commit harus deskriptif, terstruktur, dan menjelaskan "apa" serta "mengapa" perubahan dilakukan, menggunakan awalan berikut:

* `feat:` : Menambahkan fitur baru ke dalam aplikasi.  
* `fix:` : Memperbaiki bug atau *error* pada sistem.  
* `docs:` : Mengubah atau menambah panduan teks/dokumentasi (misal: SDD, README.md).  
* `chore:` : Melakukan tugas pembersihan, konfigurasi *build*, atau pembaruan *library*.  
* `refactor:` : Merapikan struktur kode tanpa mengubah fungsi aslinya.  
* *Ekstensi:* `test:` (menambah unit test), `ci:` (mengubah skrip GitHub Actions).  
* *Contoh Commit:* `feat: add midtrans webhook listener endpoint`

**3\. Penggabungan Artefak (*Merging & Pull Requests*):** Setiap cabang fitur tidak boleh di-*merge* langsung ke `main`. Penggabungan wajib melalui proses *Pull Request* (PR). Mode penggabungan yang digunakan adalah **Squash and Merge** untuk menyatukan puluhan *commit* berantakan selama *vibe coding* menjadi satu *commit* tunggal yang rapi di cabang `main`.

#### **4.2.2 Pembangunan Sistem & Integrasi (*System Building & Build Automation*)**

Otomatisasi perakitan perangkat lunak akan ditangani oleh skrip *Continuous Integration / Continuous Deployment* (CI/CD) menggunakan **GitHub Actions**.

* **Deteksi Dependensi Otomatis:**  
  * Skrip *build* akan mendeteksi perubahan pada berkas `package.json` (Next.js) dan `requirements.txt` (FastAPI). Jika ada dependensi baru, mesin CI akan mengunduh dan mengompilasinya secara terisolasi.  
* **Tahapan CI Pipeline (*The Build Steps*):**  
  * **Code Checking:** Menjalankan `ESLint` (Frontend) dan `Flake8` atau `Ruff` (Backend) untuk mendeteksi *syntax error*.  
  * **Type Checking:** Memvalidasi Typescript (`tsc --noEmit`) dan Python tipe statis (`mypy`).  
  * **Build Validation:** Mengeksekusi perintah `npm run build` untuk Next.js dan membangun *image* Docker (`docker build`) untuk FastAPI guna memastikan kerangka kode dapat dirakit (*compiled/packaged*) tanpa *error* fatal.  
* **Otomatisasi CD Pipeline (*Continuous Deployment*):**  
  * Jika seluruh tahapan CI lulus (*passed*) di cabang `main`, CD *pipeline* akan mengambil *image* Docker yang berhasil dirakit dan mendorongnya (*push*) ke Docker Registry.  
  * Sistem kemudian akan memicu (*trigger*) *webhook* ke platform *hosting* (seperti Vercel untuk Frontend dan Google Cloud Run untuk Backend) untuk menarik artefak terbaru dan melakukan *rolling update* tanpa mengakibatkan *downtime*.

