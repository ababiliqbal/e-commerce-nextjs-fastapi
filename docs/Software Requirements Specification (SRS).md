# Software Requirements Specification (SRS)

## Platform E-Commerce Berbasis RESTful Microservices

### Riwayat Dokumen (Document Control)

| Versi | Tanggal     | Penulis         | Deskripsi Perubahan (Change Log)                                                                                                                                                                     | Status  |
| :---- | :---------- | :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| 1.0.0 | 12 Okt 2026 | M. Iqbal Ababil | Inisialisasi MVP, Guest Checkout, Midtrans Snap.                                                                                                                                                     | Dirilis |
| 1.1.0 | 16 Okt 2026 | M. Iqbal Ababil | Refactoring UI/UX (CRO Pattern, Brand Color 'Tech Violet'), Security Audit (CORS Regex, Rate Limiting, XSS Validation).                                                                              | Dirilis |
| 1.2.0 | 19 Okt 2026 | M. Iqbal Ababil | Penambahan Modul IAM (Login/Register JWT, Google SSO OIDC, RBAC), Galeri Multi-Gambar Produk (`product_images`), Member Checkout & Riwayat Pesanan, Migrasi DB.                                      | Dirilis |
| 1.3.0 | 21 Okt 2026 | M. Iqbal Ababil | DRAF: Modul Dashboard Admin (CMS Internal), Analitik Penjualan Eksekutif, Manajemen Katalog CRUD & Soft-Delete (`is_active`), Pemenuhan Pesanan (`SHIPPED`/`COMPLETED`), & Integrasi Object Storage. | Draf    |
| 2.0.0 | TBA         | M. Iqbal Ababil | RENCANA: Modul Integrasi Eksternal (API Logistik 3PL), Ongkos Kirim Dinamis & Pelacakan Resi.                                                                                                        | Rencana |

**Versi:** 1.3.0 **Status:** Draf

---

## BAB I: PENDAHULUAN

### 1.1 Tujuan (Purpose)

Dokumen ini mendeskripsikan spesifikasi kebutuhan perangkat lunak untuk sistem aplikasi e-commerce _Minimum Viable Product_ (MVP) beserta pembaruan inkremental (_incremental updates_) hingga **Versi 1.3.0**. Sistem ini dirancang sebagai platform transaksi ritel digital terdesentralisasi (arsitektur _decoupled_). Sistem memfasilitasi pembeli untuk melihat katalog produk beserta galeri multi-gambar, mengelola akun pengguna melalui sistem manajemen identitas (_Identity and Access Management_ / IAM), menyelesaikan pesanan melalui mekanisme _Guest Checkout_ maupun _Authenticated Member Checkout_, melacak riwayat pesanan pribadi, dan melakukan pembayaran digital yang terverifikasi otomatis. Selain itu, pada **Versi 1.3.0**, sistem menyediakan antarmuka **Dashboard Admin (Internal CMS)** yang terproteksi RBAC bagi administrator untuk memantau analitik penjualan secara _real-time_, mengelola inventaris produk beserta unggahan foto ke _Cloud Object Storage_, dan memproses siklus pemenuhan pesanan pelanggan. Dokumen ini ditujukan bagi tim pengembang (_developer_), _Project Manager_, serta pemangku kepentingan untuk memahami fungsi, batasan, dan target operasional sistem.

### 1.2 Cakupan Proyek (Project Scope)

Proyek ini dinamakan "E-Commerce Web Platform (Amba Shop)". Cakupan otomatisasi yang diselesaikan meliputi:

- Penyajian katalog produk aktif secara instan menggunakan teknik rendering dinamis (_Server-Side Rendering_).
- Manajemen status (_state management_) keranjang belanja dan sesi autentikasi pengguna di sisi klien.
- Otomatisasi pencatatan pesanan dan pengelolaan siklus hidup transaksi (_Transaction Lifecycle_) melalui RESTful API.
- Integrasi sistem pihak ketiga (_Payment Gateway_ Midtrans) untuk memvalidasi pembayaran secara _real-time_ tanpa intervensi manual dari administrator.
- **[Dirilis V1.1.0]** Peningkatan pengalaman pengguna (_User Experience_) dengan prinsip _Conversion Rate Optimization_ (CRO) dan skema warna merek (_Brand Color_) "Tech Violet".
- **[Dirilis V1.1.0]** Pengetatan postur keamanan (_Security Posture_) melawan _Brute Force_, _Over-permissive CORS_, dan _Cross-Site Scripting_ (XSS).
- **[Dirilis V1.2.0]** Sistem Manajemen Identitas dan Akses (_Identity and Access Management_ / IAM) menggunakan _JSON Web Token_ (JWT) dengan mekanisme _Dual-Token_ (_Access Token_ & _HttpOnly Refresh Token_), mencakup registrasi akun, login kredensial lokal, serta _Single Sign-On_ (SSO) menggunakan Google OAuth 2.0 / _OpenID Connect_ (OIDC).
- **[Dirilis V1.2.0]** Fondasi Otorisasi Berbasis Peran (_Role-Based Access Control_ / RBAC) yang memisahkan entitas `CUSTOMER` dan `ADMIN` di tingkat _backend_.
- **[Dirilis V1.2.0]** Dukungan penyajian galeri multi-gambar untuk setiap produk (relasi _One-to-Many_ `1:N` pada tabel `product_images`) dengan tampilan _carousel_ atau _thumbnail switcher_ interaktif.
- **[Dirilis V1.2.0]** Mekanisme _Hybrid Checkout_ (mendukung _Guest Checkout_ maupun _Member Checkout_ dengan _smart auto-fill_ profil) serta halaman Riwayat Pesanan (_Order History_) khusus pelanggan terdaftar.
- **[Dirilis V1.2.0]** Penerapan manajemen migrasi skema basis data terstruktur (_Database Schema Migration_) menggunakan Alembic guna menjamin keutuhan data historis produksi.
- **[Ditambahkan V1.3.0]** Antarmuka **Dashboard Admin (`/admin`)** terproteksi RBAC yang menyajikan metrik **Analitik Penjualan Eksekutif** (_Gross Revenue_, Rasio Konversi Pesanan, Produk Terlaris, dan Peringatan Stok Menipis / _Low-Stock Alert_).
- **[Ditambahkan V1.3.0]** Modul Manajemen Katalog Visual (CRUD Produk & Galeri Multi-Gambar) dengan mekanisme pengarsipan non-destruktif (**_Soft-Delete_** melalui atribut `is_active`) guna menjaga integritas riwayat pesanan masa lalu.
- **[Ditambahkan V1.3.0]** Integrasi **_Cloud Object Storage_ (Supabase Storage / S3-Compatible Bucket)** untuk fitur unggah berkas gambar produk secara langsung (_Direct File Upload_) dengan validasi tipe MIME dan ukuran berkas.
- **[Ditambahkan V1.3.0]** Modul Manajemen Operasional & Pemenuhan Pesanan (_Order Fulfillment_) dengan perluasan _Finite State Machine_ status pesanan (`PENDING` ➔ `PAID` ➔ `SHIPPED` ➔ `COMPLETED`, serta `CANCELLED`).
- _Scope Exclusions_ (Di luar cakupan fase V1.3.0): Perhitungan ongkos kirim dinamis berbasis geolokasi & pelacakan resi kurir otomatis via API Logistik 3PL (dijadwalkan pada V2.0.0), serta sistem _review/rating_ produk oleh pelanggan.

### 1.3 Karakteristik Lingkungan (Environmental Characteristics)

Sistem dibangun di atas arsitektur _Client-Server_ terpisah dengan spesifikasi lingkungan interaksi sebagai berikut:

- **Lingkungan Eksekusi Klien (Frontend):** Berjalan di peramban web modern (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge) pada perangkat _desktop_ dan _mobile_. Dikembangkan menggunakan kerangka kerja Next.js (React) dengan bahasa TypeScript dan dideploy pada jaringan komputasi tepi (Vercel).
- **Lingkungan Eksekusi Server (Backend):** Berjalan pada kontainer terisolasi berbasis Linux (Docker) atau lingkungan _Serverless/Cloud Compute_. Menggunakan kerangka kerja FastAPI (Python) yang menyediakan antarmuka RESTful API.
- **Sistem Manajemen Basis Data:** PostgreSQL (Supabase Managed Database / Docker Container) digunakan sebagai pangkalan data relasional utama untuk menjamin integritas transaksional (ACID), dilengkapi dengan **Alembic** sebagai mesin kontrol versi skema basis data.
- **Interaksi Sistem Eksternal:**
  1. Berkomunikasi dengan _Payment Gateway Server_ (Midtrans Snap) melalui protokol HTTPS/TLS 1.2+ menggunakan arsitektur _Webhook_ asinkron.
  2. Berkomunikasi dengan _Google Identity Services_ (OAuth 2.0 / OIDC Provider) untuk verifikasi token kriptografi autentikasi pengguna secara _server-to-server_.
  3. **[Ditambahkan V1.3.0]** Berkomunikasi dengan layanan **_Cloud Object Storage_ (Supabase Storage API / AWS S3)** melalui protokol HTTPS untuk penyimpanan objek biner gambar produk dan penyajiannya melalui jaringan CDN publik.

---

## BAB II: DESKRIPSI UMUM

### 2.1 Perspektif Produk (Product Perspective)

Sistem E-Commerce ini adalah produk mandiri dengan arsitektur berorientasi layanan (_service-oriented_). Setelah memiliki kesadaran identitas (_identity-aware_) pada V1.2.0, pada **Versi 1.3.0** sistem dilengkapi dengan kapabilitas operasional mandiri melalui **Internal Content Management System (CMS) & Operations Dashboard**. Administrator tidak lagi bergantung pada akses langsung ke klien basis data mentah (seperti DBeaver atau pgAdmin) untuk memperbarui stok, mengunggah produk baru, atau memproses pengiriman pesanan. Arsitektur ini menjaga pemisahan tegas antara antarmuka publik pelanggan (_Storefront_) dan antarmuka internal pengelola (_Backoffice_), serta siap dihubungkan dengan modul logistik pihak ketiga (3PL) pada V2.0.0.

### 2.2 Karakteristik Pengguna (User Classes)

Sistem pada Versi 1.3.0 diakses oleh tiga kelas pengguna utama dengan pemisahan hak akses yang tegas:

1. **Pelanggan Tamu (Guest Customer):**
   - _Karakteristik:_ Pengguna internet umum yang ingin berbelanja secara cepat tanpa membuat akun. Membutuhkan proses _checkout_ yang minimal gesekan (_frictionless_).
   - _Fungsi:_ Melihat katalog produk yang berstatus aktif (`is_active = true`) beserta galeri multi-gambarnya, menambah item ke keranjang, mengisi formulir pengiriman secara manual, dan melakukan pembayaran.
2. **Pelanggan Terdaftar (Registered Customer):**
   - _Karakteristik:_ Pengguna yang telah melakukan registrasi akun via email/kata sandi atau login menggunakan akun Google (SSO). Memiliki peran sistem `CUSTOMER`.
   - _Fungsi:_ Memiliki seluruh hak akses Pelanggan Tamu, ditambah kemampuan _smart auto-fill_ informasi pengiriman saat _checkout_, mengaitkan pesanan langsung ke ID akunnya (`user_id`), serta memantau daftar dan progres status pengiriman pesanan (`PENDING`, `PAID`, `SHIPPED`, `COMPLETED`, `CANCELLED`) pada halaman Riwayat Pesanan (`/orders/history`). Pengguna kelas ini **dilarang keras** mengakses rute `/admin/*`.
3. **Administrator Sistem / Operasional Toko (Store Administrator) [Diperbarui V1.3.0]:**
   - _Karakteristik:_ Pengelola operasional toko dan staf manajemen inventaris yang terautentikasi dengan klaim otorisasi peran `ADMIN` di dalam token JWT serta basis data.
   - _Fungsi:_ Mengakses **Dashboard Admin (`/admin`)**, memantau metrik analitik pendapatan dan peringatan stok menipis, menambah/mengubah/mengarsipkan produk (_soft-delete_), mengunggah foto produk langsung ke _Cloud Object Storage_, mengatur susunan galeri multi-gambar, serta memverifikasi dan memperbarui status pemenuhan pesanan seluruh pelanggan (`PAID` ➔ `SHIPPED` ➔ `COMPLETED`).

### 2.3 Batasan Desain & Implementasi (Design & Implementation Constraints)

- **Pemisahan Entitas (Decoupling):** Frontend (Next.js) dan Backend (FastAPI) tidak boleh berada dalam satu wadah proses (_monolith_). Keduanya harus berkomunikasi murni melalui JSON API _payloads_, `multipart/form-data` (khusus unggah berkas), dan _HTTP Headers/Cookies_.
- **Bahasa Pemrograman:** Lapisan presentasi (Frontend) wajib menggunakan TypeScript untuk _type safety_ ketat. Lapisan logika bisnis (Backend) diwajibkan menggunakan Python 3.10+.
- **Integritas Relasional, Migrasi Skema & Larangan Hard-Delete Katalog [Diperbarui V1.3.0]:** Data pengguna, produk, galeri gambar, dan transaksi finansial wajib disimpan dalam basis data relasional (PostgreSQL). Seluruh perubahan struktur tabel wajib dikelola melalui skrip migrasi **Alembic**. Penghapusan baris produk secara fisik (`HARD DELETE`) pada produk yang memiliki keterkaitan historis dengan `order_items` **dilarang keras**; penghapusan katalog oleh Admin wajib diimplementasikan sebagai **_Soft-Delete_** (`is_active = FALSE`).
- **Pemisahan Penyimpanan Biner (BLOB Offloading) [Ditambahkan V1.3.0]:** Basis data PostgreSQL dilarang menyimpan berkas gambar mentah dalam bentuk biner (`BYTEA` atau string `Base64` berukuran besar). Seluruh berkas gambar wajib diunggah ke _Cloud Object Storage_ (Supabase Storage / S3), dan basis data hanya menyimpan _string_ URL publiknya.
- **Kompatibilitas Mundur (Backward Compatibility):** Fitur _Guest Checkout_ dan struktur katalog yang ada tetap berjalan tanpa gangguan. Produk baru maupun lama secara bawaan memiliki status `is_active = TRUE`.
- **Lingkungan Kontainer & Otomatisasi CI/CD:** Layanan _backend_ dan basis data pengembangan lokal dikemas menggunakan Docker, dan seluruh rilis kode wajib melewati pemeriksaan GitHub Actions CI sebelum dideploy ke produksi.

---

## BAB III: KEBUTUHAN FUNGSIONAL

Kebutuhan fungsional dikelompokkan berdasarkan modul utama perangkat lunak.

### 3.1 Modul Manajemen Katalog & Multi-Gambar (Klien & API)

- **F-CAT-01: Pengambilan Daftar Produk Aktif (Active Product Listing Retrieval) [Diperbarui V1.3.0]**
  - **Deskripsi:** Sistem (Next.js) harus dapat mengambil dan menampilkan daftar produk yang berstatus aktif secara dinamis dari API dengan menyertakan gambar utama (_primary image_).
  - **Proses:** _Backend_ memanggil _query_ dari tabel `products` dengan filter wajib `Product.is_active == True` beserta relasinya di `product_images` di PostgreSQL menggunakan teknik _Eager Loading_ (`selectinload`) untuk menghindari masalah _N+1 Query_.
  - **Output:** Grid produk aktif di layar klien yang menampilkan Gambar Utama (`is_primary = true` atau _fallback_ `image_url`), Nama Produk, Stok Tersedia, dan Harga. Produk yang diarsipkan (`is_active = false`) tidak ditampilkan di etalase publik.
- **F-CAT-02: Pengambilan Detail Produk & Galeri Multi-Gambar (Product Detail & Multi-Image Fetch) [Diperbarui V1.3.0]**
  - **Deskripsi:** Sistem harus menampilkan informasi mendalam beserta koleksi gambar dari berbagai sudut pandang saat pengguna memilih satu produk aktif spesifik.
  - **Proses:** API melakukan pencarian produk berdasarkan `product_id` (memastikan `is_active == True` untuk akses publik) dan memuat seluruh baris terkait pada tabel `product_images` yang diurutkan berdasarkan atribut `is_primary DESC, display_order ASC`.
  - **Output:** Halaman detail produk yang memuat komponen Galeri Gambar Interaktif (1 gambar pratinjau utama berukuran besar dan deretan _thumbnail_ yang dapat diklik), Nama Produk, Harga, Deskripsi Lengkap, dan Jumlah Stok tersisa.

### 3.2 Modul Keranjang Belanja (Shopping Cart)

- **F-CRT-01: Tambah Item ke Keranjang**
  - **Deskripsi:** Sistem memungkinkan pengguna memasukkan produk yang dilihat ke dalam sesi keranjang sementara beserta referensi gambar utamanya.
  - **Proses:** Logika frontend (via _Zustand_) memvalidasi apakah kuantitas yang diminta melebihi sisa stok yang ditampilkan dan menampilkan umpan balik _Toast notification_.
- **F-CRT-02: Modifikasi & Penghapusan Item**
  - **Deskripsi:** Pengguna dapat mengubah jumlah produk yang akan dibeli atau menghapusnya dari daftar.
  - **Output:** Perhitungan ulang otomatis (_real-time recalculation_) untuk total harga.

### 3.3 Modul Checkout & Manajemen Pemesanan

- **F-ORD-01: Pemrosesan Keranjang Hibrida (Guest & Authenticated Checkout Processing)**
  - **Deskripsi:** Sistem meninjau _state_ keranjang dan meminta informasi pengiriman dari pembeli, baik sebagai tamu maupun pelanggan yang sedang login.
  - **Proses:**
    1. Jika pengguna berstatus **Login (Authenticated)**, sistem secara otomatis mengisi awal (_smart auto-fill_) kolom Nama Lengkap, Email, Nomor Telepon, dan Alamat Pengiriman berdasarkan profil pengguna serta riwayat pengiriman tersimpan, dan menyertakan token autentikasi JWT pada _header_ permintaan API.
    2. Jika pengguna berstatus **Tamu (Guest)**, pengguna mengisi seluruh formulir secara manual.
    3. Validasi _regex_ via _Zod_ di frontend memeriksa format email, nomor telepon angka, kelengkapan alamat, dan menolak karakter tag HTML (`<` atau `>`) untuk mencegah XSS.
- **F-ORD-02: Inisiasi Transaksi Finansial (Order Initialization) [Diperbarui V1.3.0]**
  - **Deskripsi:** _Backend_ menerima permintaan _checkout_, mengaitkan pesanan dengan identitas pengguna (jika ada), menyimpan pesanan, dan meminta token dari _Payment Gateway_.
  - **Proses:**
    1. API memeriksa keberadaan _Bearer Token_ JWT yang valid pada _request header_. Jika valid, sistem mengekstrak `user_id` untuk disimpan pada baris pesanan; jika tidak ada token (_Guest_), `user_id` diisi `NULL`.
    2. API mengunci baris produk di PostgreSQL (_Pessimistic Locking_ via `.with_for_update()`), memastikan produk masih berstatus aktif (`is_active == True`), dan memverifikasi ulang harga (_Zero-Trust Pricing_) serta ketersediaan stok aktual.
    3. API menyimpan _header_ pesanan (tabel `orders`) dan detail item (tabel `order_items`) dengan status `PENDING`.
    4. API memanggil layanan Midtrans Snap untuk mendapatkan token pembayaran.
- **F-ORD-03: Webhook Pembayaran & Penguncian Stok (Payment Webhook & Stock Mutation)**
  - **Deskripsi:** Mekanisme asinkron penerimaan notifikasi konfirmasi status transaksi dari Midtrans.
  - **Proses:**
    1. API memverifikasi keaslian _signature key_ (SHA-512) dan memeriksa _idempotency_ status pesanan.
    2. Jika pembayaran sukses (`settlement` / `capture`), status pesanan diubah menjadi `PAID`. Jika gagal/dibatalkan (`cancel` / `deny` / `expire`), status diubah menjadi `CANCELLED` dan stok produk dikembalikan (_rollback stock_) ke tabel `products`.
- **F-ORD-04: Riwayat & Pelacakan Status Pesanan Pelanggan (Customer Order History & Status Tracking) [Diperbarui V1.3.0]**
  - **Deskripsi:** Pelanggan terdaftar yang sedang login dapat melihat daftar seluruh transaksi miliknya beserta perkembangan status pemenuhan pesanan dari gudang/admin.
  - **Proses:** Frontend memanggil _endpoint_ terproteksi `GET /api/v1/orders/me` dengan menyertakan JWT _Access Token_. _Backend_ memfilter tabel `orders` berdasarkan `user_id == current_user.id` yang diurutkan dari transaksi terbaru.
  - **Output:** Daftar riwayat pesanan di layar klien yang memuat ID Pesanan, Tanggal Transaksi, Total Pembayaran, dan Lencana Status Siklus Hidup Pesanan (`PENDING`, `PAID`, `SHIPPED` / Dikirim, `COMPLETED` / Selesai, atau `CANCELLED` / Dibatalkan).

### 3.4 Modul Manajemen Identitas & Akses / IAM

- **F-IAM-01: Registrasi Pelanggan Baru (Local Account Registration)**
  - **Deskripsi:** Pengguna tamu dapat mendaftarkan akun baru menggunakan nama lengkap, alamat email, dan kata sandi yang di-_hash_ menggunakan Bcrypt/Argon2id dengan peran bawaan `CUSTOMER`.
- **F-IAM-02: Autentikasi Kredensial Lokal & Penerbitan JWT (Local Login & Token Issuance)**
  - **Deskripsi:** Pengguna terdaftar dapat masuk menggunakan email dan kata sandi untuk menerima `access_token` (JWT HS256) dan `refresh_token` di dalam _HttpOnly Cookie_.
- **F-IAM-03: Autentikasi Google SSO (OAuth 2.0 / OIDC Backend Verification)**
  - **Deskripsi:** Pengguna dapat masuk atau mendaftar secara instan menggunakan akun Google yang diverifikasi secara kriptografis oleh FastAPI terhadap sertifikat OIDC Google.
- **F-IAM-04: Pembaruan Sesi & Penutupan Sesi (Token Refresh & Logout)**
  - **Deskripsi:** Sistem mendukung pembaruan `access_token` secara senyap (_silent refresh_) via `/api/v1/auth/refresh` dan penghapusan sesi/kuki serta isolasi _state_ pesanan lokal saat `/api/v1/auth/logout`.
- **F-IAM-05: Otorisasi Berbasis Peran (Role-Based Access Control / RBAC Middleware)**
  - **Deskripsi:** _Backend_ memvalidasi hak akses pengguna melalui _dependency_ `require_role("ADMIN")` dan menolak akses pengguna non-admin ke seluruh rute `/api/v1/admin/*` dengan kode `403 Forbidden`.

### 3.5 Modul Dashboard Admin & CMS Internal [Ditambahkan V1.3.0]

- **F-ADM-01: Analitik Eksekutif Penjualan & Peringatan Stok (Executive Sales & Inventory Analytics)**
  - **Deskripsi:** Administrator dapat melihat ringkasan kinerja finansial dan operasional toko secara _real-time_ pada halaman utama Dashboard Admin (`/admin`).
  - **Proses:** _Backend_ mengeksekusi kueri agregasi SQL (`SUM`, `COUNT`, `GROUP BY`) pada tabel `orders`, `order_items`, dan `products` untuk menghitung metrik kunci tanpa membebani memori aplikasi.
  - **Output:**
    1. **Total Pendapatan Bersih (_Gross Revenue_):** Akumulasi `total_amount` dari seluruh pesanan yang telah lunas (`status IN ('PAID', 'SHIPPED', 'COMPLETED')`).
    2. **Statistik & Konversi Pesanan:** Total seluruh pesanan, rincian jumlah pesanan per status (`PENDING`, `PAID`, `SHIPPED`, `COMPLETED`, `CANCELLED`), dan persentase rasio konversi pembayaran.
    3. **Peringatan Stok Menipis (_Low-Stock Alert_):** Daftar produk aktif (`is_active == True`) yang memiliki `stock_quantity <= 5` unit agar Admin dapat segera melakukan _restock_.
    4. **Produk Terlaris (_Top Selling Products_):** Daftar 5 produk dengan kuantitas penjualan tertinggi dari transaksi yang sah.
- **F-ADM-02: Manajemen Katalog Produk & Siklus Hidup Soft-Delete (Product CRUD & Soft-Delete Lifecycle)**
  - **Deskripsi:** Administrator dapat melihat seluruh daftar inventaris (baik produk aktif maupun yang diarsipkan), menambahkan produk baru, memperbarui informasi/harga/stok produk, serta menonaktifkan produk dari etalase publik.
  - **Proses:**
    1. **Create (`POST /api/v1/admin/products`):** Menyimpan entitas produk baru beserta koleksi `product_images` ke PostgreSQL dalam satu transaksi atomik.
    2. **Update (`PUT /api/v1/admin/products/{id}`):** Memperbarui atribut produk (`name`, `description`, `price`, `stock_quantity`, `is_active`) dan menyinkronkan susunan galeri gambar (`is_primary` dan `display_order`).
    3. **Soft-Delete / Archive (`DELETE /api/v1/admin/products/{id}`):** Mengubah atribut `is_active` menjadi `FALSE` (bukan menghapus baris fisik di database) sehingga produk disembunyikan dari halaman utama toko namun data historis pada `order_items` pelanggan tetap terjaga 100%.
  - **Output:** Tabel manajemen inventaris interaktif di `/admin/products` dengan umpan balik langsung (_Toast notification_).
- **F-ADM-03: Unggah Gambar Awan & Manajemen Galeri Multi-Gambar (Cloud Object Storage Upload & Gallery Management)**
  - **Deskripsi:** Administrator dapat mengunggah berkas foto produk secara langsung dari perangkat lokal (_Drag-and-Drop_ atau pemilih berkas) maupun menautkan URL gambar ke dalam galeri produk.
  - **Proses:**
    1. Klien mengirimkan berkas gambar melalui `multipart/form-data` ke _endpoint_ `POST /api/v1/admin/upload`.
    2. _Backend_ memvalidasi tipe MIME berkas (hanya mengizinkan `image/jpeg`, `image/png`, `image/webp`) dan membatasi ukuran berkas maksimal **5 MB**.
    3. _Backend_ menghasilkan nama berkas unik berbasis UUID dan mengunggahnya ke _Bucket_ publik **`product-images`** pada layanan **Supabase Storage (S3-Compatible Object Storage)**.
  - **Output:** API mengembalikan URL CDN publik gambar yang siap dipasang sebagai gambar utama (`is_primary = true`) atau gambar sudut pandang tambahan pada formulir produk Admin.
- **F-ADM-04: Manajemen Operasional & Pemenuhan Pesanan (Order Fulfillment & Finite State Machine)**
  - **Deskripsi:** Administrator dapat memantau seluruh pesanan pelanggan yang masuk dan memperbarui tahapan pengiriman barang.
  - **Proses:**
    1. Admin mengakses `/admin/orders` yang mengambil daftar seluruh pesanan dari `GET /api/v1/admin/orders` (dilengkapi fitur filter berdasarkan status dan pencarian berdasarkan ID/Nama/Email pelanggan).
    2. Saat Admin memproses pesanan melalui `PATCH /api/v1/admin/orders/{id}/status`, _backend_ menerapkan aturan **Finite State Machine (FSM)** yang ketat:
       - Pesanan berstatus `PAID` hanya dapat diubah menjadi `SHIPPED` (Dikirim).
       - Pesanan berstatus `SHIPPED` hanya dapat diubah menjadi `COMPLETED` (Selesai).
       - Pesanan berstatus `PENDING` dapat dibatalkan menjadi `CANCELLED` (dengan pengembalian stok otomatis).
       - Transisi ilegal (seperti mengubah `CANCELLED` atau `PENDING` langsung menjadi `SHIPPED`) wajib ditolak dengan kode `400 Bad Request`.
  - **Output:** Pembaruan status pesanan tercatat di PostgreSQL dan langsung tercermin pada halaman Riwayat Pesanan pelanggan (`/orders/history`).

---

## BAB IV: KEBUTUHAN ANTARMUKA EKSTERNAL

### 4.1 Antarmuka Pengguna (User Interfaces)

Antarmuka pengguna didesain menggunakan paradigma responsif dengan prinsip _Clean Minimalist_ dan konsistensi identitas visual **"Tech Violet"** (`#6D28D9`).

- **Standardisasi Layout & CRO (Storefront Publik):** Aplikasi mengadopsi pola _F-Pattern_ untuk katalog, _full-card clickable_, halaman autentikasi (`/login`, `/register` dengan tombol Google SSO), menu profil dinamis di Navbar, serta komponen Galeri Multi-Gambar di `/product/[id]`.
- **Komponen Antarmuka Administratif Baru [Ditambahkan V1.3.0]:**
  - **Pintasan Navigasi Admin (Navbar Admin Entry):** Jika pengguna yang sedang login memiliki peran `role === 'ADMIN'`, menu profil pada _Navbar_ utama menampilkan lencana khusus `ADMIN` dan tombol pintasan langsung menuju **"Dashboard Admin" (`/admin`)**.
  - **Tata Letak Ruang Kerja Admin (`Admin Shell Layout` - `/admin/*`):** Menggunakan navigasi _Sidebar_ tetap di sisi kiri (untuk layar _desktop_) dan bilah atas responsif yang memuat menu: **Ringkasan Analitik (`/admin`)**, **Manajemen Produk (`/admin/products`)**, **Manajemen Pesanan (`/admin/orders`)**, serta tombol **Kembali ke Toko (`/`)**.
  - **Halaman Analitik Eksekutif (`/admin`):** Menampilkan 4 Kartu KPI utama (Total Pendapatan, Total Pesanan Lunas, Rasio Konversi, Jumlah Stok Kritis), tabel peringatan stok menipis (_Low-Stock Alert_), dan daftar produk terlaris.
  - **Halaman & Modal Manajemen Produk (`/admin/products`):** Menampilkan tabel inventaris lengkap dengan lencana status (`Aktif` hijau / `Diarsipkan` abu-abu), bilah pencarian, serta Modal Tambah/Edit Produk yang dilengkapi area **_Drag-and-Drop Image Uploader_** dan pengatur urutan galeri gambar (`Utama` vs `Tambahan`).
  - **Halaman Operasional Pesanan (`/admin/orders`):** Menampilkan tabel transaksi menyeluruh dengan tab filter status (`Semua`, `PENDING`, `PAID`, `SHIPPED`, `COMPLETED`, `CANCELLED`), modal rincian item pesanan, dan tombol aksi satu klik (**"Kirim Barang"** / **"Selesaikan Pesanan"**).

### 4.2 Antarmuka Perangkat Lunak (Software Interfaces)

- **SI-01: Komunikasi Frontend (Next.js) ke Backend API (FastAPI)**
  - **Protokol:** HTTP/HTTPS menggunakan RESTful Web Services (`application/json` dan `multipart/form-data` untuk unggah gambar).
  - **Transmisi Autentikasi:** Menggunakan _HTTP Header_ `Authorization: Bearer <access_token>` dan `credentials: "include"` untuk _HttpOnly Refresh Token_.
- **SI-02: Koneksi API ke Basis Data (PostgreSQL)**
  - **Protokol:** TCP/IP pada _port_ 5432 melalui SQLAlchemy ORM dan dikelola skemanya menggunakan Alembic.
- **SI-03: Integrasi API Payment Gateway (Midtrans)**
  - **Protokol:** HTTPS (enkripsi TLS _end-to-end_).
- **SI-04: Integrasi Layanan Identitas Google (Google OAuth 2.0 / OIDC)**
  - **Protokol:** HTTPS (TLS 1.2+) untuk verifikasi `id_token` Google.
- **SI-05: Integrasi Cloud Object Storage (Supabase Storage / S3 REST API) [Ditambahkan V1.3.0]**
  - **Protokol:** HTTPS (TLS 1.2+) menggunakan otorisasi _Service Role Key_ dari sisi server FastAPI ke _endpoint_ Supabase Storage API (`/storage/v1/object/product-images/*`).
  - **Mode Penyajian:** Berkas gambar yang berhasil diunggah disajikan secara publik melalui URL CDN berkinerja tinggi kepada peramban klien.

---

## BAB V: KEBUTUHAN NON-FUNGSIONAL (NON-FUNCTIONAL REQUIREMENTS)

### 5.1 Kinerja & Skalabilitas (Performance & Scalability Requirements)

- **NF-PER-01: Waktu Muat Awal (Initial Page Load):** Lapisan antarmuka (Next.js) harus mencapai _First Contentful Paint_ (FCP) di bawah 1,5 detik.
- **NF-PER-02: Waktu Respons API, Eager Loading & Efisiensi Agregasi Analitik [Diperbarui V1.3.0]:** Rata-rata waktu respons untuk pemanggilan _endpoint_ katalog dan analitik harus berada di bawah 250 ms. Pengambilan produk beserta gambarnya wajib menggunakan _Eager Loading_ (`selectinload`), dan perhitungan metrik analitik Admin wajib menggunakan fungsi agregasi native tingkat basis data (`SUM`, `COUNT`, `CASE WHEN`) di PostgreSQL, bukan memproses perulangan ribuan baris di memori Python.
- **NF-PER-03: Konkurensi (Concurrency Handling):** _Web server_ FastAPI dan PostgreSQL harus mampu memproses setidaknya 100 RPS.

### 5.2 Keamanan & Privasi (Security & Privacy Requirements)

- **NF-SEC-01: Enkripsi Transportasi Data:** Komunikasi data **wajib** dienkripsi menggunakan HTTPS dengan standar TLS 1.2+.
- **NF-SEC-02: Perlindungan Injeksi & Serangan Payload:** FastAPI memanfaatkan Pydantic dan Next.js memanfaatkan Zod untuk validasi ketat guna menolak serangan injeksi SQL dan _Cross-Site Scripting_ (XSS) pada seluruh formulir pelanggan maupun formulir CMS Admin.
- **NF-SEC-03: Otentikasi Webhook (Webhook Signature Verification):** _Endpoint webhook_ wajib memverifikasi _hash signature_ SHA-512 dari Midtrans.
- **NF-SEC-04: Perlindungan Lintas Situs (CORS Policy):** FastAPI membatasi CORS hanya untuk domain _frontend_ Next.js yang sah dengan `allow_credentials=True`.
- **NF-SEC-05: Rate Limiting & DoS Protection:** Pembatasan laju diterapkan pada `/checkout`, `/auth/login`, `/auth/register`, serta _endpoint_ unggah berkas Admin (`/api/v1/admin/upload` maks 20 _request_/menit/IP).
- **NF-SEC-06: Keamanan Penyimpanan Kredensial:** Kata sandi wajib di-_hash_ menggunakan **Argon2id** atau **Bcrypt**.
- **NF-SEC-07: Manajemen Token JWT & Keamanan Sesi:** Menggunakan _Access Token_ JWT (`HS256`) berumur pendek dan _HttpOnly Refresh Token Cookie_ disertai isolasi _state_ sesi peramban saat pergantian akun.
- **NF-SEC-08: Verifikasi Zero-Trust Token OAuth Eksternal:** _Backend_ memverifikasi `id_token` Google secara kriptografis terhadap `GOOGLE_CLIENT_ID`.
- **NF-SEC-09: Validasi Keamanan Unggah Berkas & Isolasi Kunci Storage [Ditambahkan V1.3.0]:**
  - Kunci rahasia `SUPABASE_SERVICE_ROLE_KEY` **wajib** disimpan secara eksklusif di lingkungan server _Backend_ FastAPI dan dilarang keras diekspos ke _Frontend_ Next.js.
  - _Endpoint_ unggah gambar wajib memvalidasi tipe konten (`image/jpeg`, `image/png`, `image/webp`), memeriksa _magic bytes_ / ekstensi berkas untuk menolak skrip berbahaya (`.html`, `.svg` berisi skrip, `.php`, `.exe`), mensterilkan nama berkas dengan UUID v4 baru, dan menolak berkas yang melebihi **5 MB** (`HTTP 413 Content Too Large` / `400 Bad Request`).

### 5.3 Keselamatan & Keandalan (Safety & Reliability Requirements)

- **NF-SFT-01: Integritas Transaksional (ACID):** Seluruh operasi finansial, mutasi stok, dan pembaruan galeri produk dibungkus dalam blok SQL _Transaction_ dengan mekanisme _Rollback_ otomatis jika terjadi kegagalan.
- **NF-SFT-02: Pemulihan Otomatis (Container Restart Policy):** Semua _container_ Docker diatur dengan kebijakan _restart: always_ atau _unless-stopped_.
- **NF-SFT-03: Perlindungan Degradasi (Graceful Degradation):** Jika koneksi _database_ atau _Object Storage_ terputus, API merespons dengan pesan terstruktur tanpa mengekspos _stack trace_ internal.
- **NF-SFT-04: Keamanan Migrasi Skema Tanpa Kehilangan Data (Non-Destructive Schema Evolution):** Setiap pembaruan skema tabel pada pangkalan data produksi (termasuk penambahan kolom `is_active` pada `products`) wajib dilakukan melalui skrip migrasi terversi (Alembic `upgrade`/`downgrade`).
- **NF-SFT-05: Perlindungan Integritas Historis via Soft-Delete & Order State Machine [Ditambahkan V1.3.0]:** Sistem menjamin bahwa pengarsipan produk oleh Admin (`is_active = FALSE`) tidak akan pernah merusak tampilan nota atau riwayat pesanan pelanggan yang pernah membeli produk tersebut di masa lalu, serta menjamin status pesanan hanya dapat bergerak maju sesuai aturan _Finite State Machine_ yang sah.
