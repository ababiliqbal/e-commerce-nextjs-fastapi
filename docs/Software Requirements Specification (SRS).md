# Software Requirements Specification (SRS)

## Platform E-Commerce Berbasis RESTful Microservices

### Riwayat Dokumen (Document Control)

| Versi | Tanggal     | Penulis         | Deskripsi Perubahan (Change Log)                                                                                                                                      | Status  |
| :---- | :---------- | :-------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| 1.0.0 | 12 Okt 2026 | M. Iqbal Ababil | Inisialisasi MVP, Guest Checkout, Midtrans Snap.                                                                                                                      | Dirilis |
| 1.1.0 | 16 Okt 2026 | M. Iqbal Ababil | Refactoring UI/UX (CRO Pattern, Brand Color 'Tech Violet'), Security Audit (CORS Regex, Rate Limiting, XSS Validation).                                               | Dirilis |
| 1.2.0 | 19 Okt 2026 | M. Iqbal Ababil | DRAF: Penambahan Modul IAM (Login/Register JWT, Google SSO OIDC, RBAC), Galeri Multi-Gambar Produk (`product_images`), Member Checkout & Riwayat Pesanan, Migrasi DB. | Draf    |
| 1.3.0 | TBA         | M. Iqbal Ababil | RENCANA: Modul Dashboard Admin (CMS Internal), Manajemen Inventaris Visual & Integrasi Object Storage (S3/Supabase Storage).                                          | Rencana |
| 2.0.0 | TBA         | M. Iqbal Ababil | RENCANA: Modul Integrasi Eksternal (API Logistik 3PL), Ongkos Kirim Dinamis & Pelacakan Resi.                                                                         | Rencana |

**Versi:** 1.2.0 **Status:** Draf

---

## BAB I: PENDAHULUAN

### 1.1 Tujuan (Purpose)

Dokumen ini mendeskripsikan spesifikasi kebutuhan perangkat lunak untuk sistem aplikasi e-commerce _Minimum Viable Product_ (MVP) beserta pembaruan inkremental (_incremental updates_) hingga **Versi 1.2.0**. Sistem ini dirancang sebagai platform transaksi ritel digital terdesentralisasi (arsitektur _decoupled_). Sistem memfasilitasi pembeli untuk melihat katalog produk beserta galeri multi-gambar, mengelola akun pengguna melalui sistem manajemen identitas (_Identity and Access Management_ / IAM), memasukkan produk ke keranjang, menyelesaikan pesanan baik melalui mekanisme _Guest Checkout_ maupun _Authenticated Member Checkout_, melacak riwayat pesanan pribadi, dan melakukan pembayaran digital yang terverifikasi otomatis. Dokumen ini ditujukan bagi tim pengembang (_developer_), _Project Manager_, serta pemangku kepentingan untuk memahami fungsi, batasan, dan target operasional sistem.

### 1.2 Cakupan Proyek (Project Scope)

Proyek ini dinamakan "E-Commerce Web Platform (Amba Shop)". Cakupan otomatisasi yang diselesaikan meliputi:

- Penyajian katalog produk secara instan menggunakan teknik rendering dinamis (_Server-Side Rendering_).
- Manajemen status (_state management_) keranjang belanja dan sesi autentikasi pengguna di sisi klien.
- Otomatisasi pencatatan pesanan dan pengelolaan siklus hidup transaksi (_Transaction Lifecycle_) melalui RESTful API.
- Integrasi sistem pihak ketiga (_Payment Gateway_ Midtrans) untuk memvalidasi pembayaran secara _real-time_ tanpa intervensi manual dari administrator.
- **[Dirilis V1.1.0]** Peningkatan pengalaman pengguna (_User Experience_) dengan prinsip _Conversion Rate Optimization_ (CRO) dan skema warna merek (_Brand Color_) "Tech Violet".
- **[Dirilis V1.1.0]** Pengetatan postur keamanan (_Security Posture_) melawan _Brute Force_, _Over-permissive CORS_, dan _Cross-Site Scripting_ (XSS).
- **[Ditambahkan V1.2.0]** Sistem Manajemen Identitas dan Akses (_Identity and Access Management_ / IAM) menggunakan _JSON Web Token_ (JWT) dengan mekanisme _Dual-Token_ (_Access Token_ & _HttpOnly Refresh Token_), mencakup registrasi akun, login kredensial lokal, serta _Single Sign-On_ (SSO) menggunakan Google OAuth 2.0 / _OpenID Connect_ (OIDC).
- **[Ditambahkan V1.2.0]** Fondasi Otorisasi Berbasis Peran (_Role-Based Access Control_ / RBAC) yang memisahkan entitas `CUSTOMER` dan `ADMIN` di tingkat _backend_.
- **[Ditambahkan V1.2.0]** Dukungan penyajian galeri multi-gambar untuk setiap produk (relasi _One-to-Many_ `1:N` pada tabel `product_images`) dengan tampilan _carousel_ atau _thumbnail switcher_ interaktif.
- **[Ditambahkan V1.2.0]** Mekanisme _Hybrid Checkout_ (mendukung _Guest Checkout_ maupun _Member Checkout_ dengan _auto-fill_ profil) serta halaman Riwayat Pesanan (_Order History_) khusus pelanggan terdaftar.
- **[Ditambahkan V1.2.0]** Penerapan manajemen migrasi skema basis data terstruktur (_Database Schema Migration_) menggunakan Alembic guna menjamin keutuhan data historis produksi.
- _Scope Exclusions_ (Di luar cakupan fase V1.2.0): Antarmuka visual _dashboard_ admin untuk manajemen produk/unggah gambar (dijadwalkan pada V1.3.0), perhitungan ongkos kirim dinamis berbasis geolokasi (dijadwalkan pada V2.0.0), dan sistem _review/rating_ produk.

### 1.3 Karakteristik Lingkungan (Environmental Characteristics)

Sistem dibangun di atas arsitektur _Client-Server_ terpisah dengan spesifikasi lingkungan interaksi sebagai berikut:

- **Lingkungan Eksekusi Klien (Frontend):** Berjalan di peramban web modern (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge) pada perangkat _desktop_ dan _mobile_. Dikembangkan menggunakan kerangka kerja Next.js (React) dengan bahasa TypeScript dan dideploy pada jaringan komputasi tepi (Vercel).
- **Lingkungan Eksekusi Server (Backend):** Berjalan pada kontainer terisolasi berbasis Linux (Docker) atau lingkungan _Serverless/Cloud Compute_. Menggunakan kerangka kerja FastAPI (Python) yang menyediakan antarmuka RESTful API.
- **Sistem Manajemen Basis Data:** PostgreSQL (Supabase Managed Database / Docker Container) digunakan sebagai pangkalan data relasional utama untuk menjamin integritas transaksional (ACID), dilengkapi dengan **Alembic** sebagai mesin kontrol versi skema basis data.
- **Interaksi Sistem Eksternal:**
  1. Berkomunikasi dengan _Payment Gateway Server_ (Midtrans Snap) melalui protokol HTTPS/TLS 1.2+ menggunakan arsitektur _Webhook_ asinkron.
  2. **[Ditambahkan V1.2.0]** Berkomunikasi dengan _Google Identity Services_ (OAuth 2.0 / OIDC Provider) untuk verifikasi token kriptografi autentikasi pengguna secara _server-to-server_.

---

## BAB II: DESKRIPSI UMUM

### 2.1 Perspektif Produk (Product Perspective)

Sistem E-Commerce ini adalah produk mandiri dengan arsitektur berorientasi layanan (_service-oriented_). Pada Versi 1.2.0, sistem bertransformasi dari aplikasi _stateless_ murni menjadi aplikasi yang memiliki kesadaran identitas (_identity-aware_) dan _stateful_ terhadap sesi pengguna, tanpa merusak kemampuan transaksi cepat bagi pengguna anonim (_Guest_). Arsitektur ini dirancang _scalable_—siap untuk dihubungkan dengan antarmuka CMS Administratif pada V1.3.0 dan modul logistik pihak ketiga (3PL) pada V2.0.0 tanpa merombak basis kode inti.

### 2.2 Karakteristik Pengguna (User Classes)

Sistem pada Versi 1.2.0 diakses oleh tiga kelas pengguna utama:

1. **Pelanggan Tamu (Guest Customer):**
   - _Karakteristik:_ Pengguna internet umum yang ingin berbelanja secara cepat tanpa membuat akun. Membutuhkan proses _checkout_ yang minimal gesekan (_frictionless_).
   - _Fungsi:_ Melihat katalog dan galeri multi-gambar produk, menambah item ke keranjang, mengisi formulir pengiriman secara manual, dan melakukan pembayaran.
2. **Pelanggan Terdaftar (Registered Customer) [Ditambahkan V1.2.0]:**
   - _Karakteristik:_ Pengguna yang telah melakukan registrasi akun via email/kata sandi atau login menggunakan akun Google (SSO). Memiliki peran sistem `CUSTOMER`.
   - _Fungsi:_ Memiliki seluruh hak akses Pelanggan Tamu, ditambah kemampuan _auto-fill_ informasi pengiriman saat _checkout_, mengaitkan pesanan langsung ke ID akunnya (`user_id`), serta melihat daftar dan detail status Riwayat Pesanan (_Order History_) miliknya.
3. **Administrator Sistem (System/Technical Admin) [Diperbarui V1.2.0]:**
   - _Karakteristik:_ Pengelola sistem dengan literasi perangkat lunak tinggi dan memiliki klaim otorisasi peran `ADMIN` di dalam token JWT serta basis data.
   - _Fungsi:_ Mengelola skema basis data, memanipulasi data katalog serta `product_images`, dan memiliki hak akses eksklusif terhadap _endpoint_ API terproteksi yang disiapkan sebagai fondasi _Dashboard Admin_ (V1.3.0).

### 2.3 Batasan Desain & Implementasi (Design & Implementation Constraints)

- **Pemisahan Entitas (Decoupling):** Frontend (Next.js) dan Backend (FastAPI) tidak boleh berada dalam satu wadah proses (_monolith_). Keduanya harus berkomunikasi murni melalui JSON API _payloads_ dan _HTTP Headers/Cookies_.
- **Bahasa Pemrograman:** Lapisan presentasi (Frontend) wajib menggunakan TypeScript untuk _type safety_ ketat. Lapisan logika bisnis (Backend) diwajibkan menggunakan Python 3.10+.
- **Integritas Relasional & Migrasi Skema [Diperbarui V1.2.0]:** Data pengguna, produk, galeri gambar, dan transaksi finansial wajib disimpan dalam basis data relasional (PostgreSQL). Penggunaan _NoSQL database_ **dilarang keras** untuk modul transaksional dan identitas. Seluruh perubahan struktur tabel wajib dikelola melalui skrip migrasi **Alembic**; modifikasi destruktif seperti penghapusan tabel produksi secara paksa (_drop table_) dilarang keras.
- **Kompatibilitas Mundur (Backward Compatibility) [Ditambahkan V1.2.0]:** Penambahan fitur autentikasi pengguna tidak boleh mematikan fitur _Guest Checkout_. Kolom relasi `user_id` pada tabel `orders` wajib bersifat opsional (`NULLABLE`) agar pesanan dari pengguna tamu maupun data transaksi historis V1.0–V1.1 tetap valid.
- **Lingkungan Kontainer (Containerization):** Layanan _backend_ dan basis data pengembangan lokal harus dikemas menggunakan Docker (_Dockerfile_ & _docker-compose.yml_).
- **Otomatisasi Integrasi (CI/CD):** Semua rilis kode harus melewati pengecekan _workflow_ di GitHub Actions sebelum dideploy ke produksi.

---

## BAB III: KEBUTUHAN FUNGSIONAL

Kebutuhan fungsional dikelompokkan berdasarkan modul utama perangkat lunak.

### 3.1 Modul Manajemen Katalog & Multi-Gambar (Klien & API)

- **F-CAT-01: Pengambilan Daftar Produk (Product Listing Retrieval) [Diperbarui V1.2.0]**
  - **Deskripsi:** Sistem (Next.js) harus dapat mengambil dan menampilkan daftar produk secara dinamis dari API dengan menyertakan gambar utama (_primary image_).
  - **Proses:** _Backend_ memanggil _query_ dari tabel `products` beserta relasinya di `product_images` di PostgreSQL menggunakan teknik _Eager Loading_ untuk menghindari masalah _N+1 Query_, mengurutkan berdasarkan ketersediaan atau tanggal terbaru.
  - **Output:** Grid produk di layar klien yang menampilkan Gambar Utama (`is_primary = true` atau _fallback_ `image_url`), Nama Produk, dan Harga.
- **F-CAT-02: Pengambilan Detail Produk & Galeri Multi-Gambar (Product Detail & Multi-Image Fetch) [Diperbarui V1.2.0]**
  - **Deskripsi:** Sistem harus menampilkan informasi mendalam beserta koleksi gambar dari berbagai sudut pandang saat pengguna memilih satu produk spesifik.
  - **Proses:** API melakukan pencarian produk berdasarkan `product_id` dan memuat seluruh baris terkait pada tabel `product_images` yang diurutkan berdasarkan atribut `display_order` secara menaik (_ascending_).
  - **Output:** Halaman detail produk yang memuat komponen Galeri Gambar Interaktif (1 gambar pratinjau utama berukuran besar dan deretan _thumbnail_ yang dapat diklik), Nama Produk, Harga, Deskripsi Lengkap, dan Jumlah Stok tersisa.

### 3.2 Modul Keranjang Belanja (Shopping Cart)

- **F-CRT-01: Tambah Item ke Keranjang**
  - **Deskripsi:** Sistem memungkinkan pengguna memasukkan produk yang dilihat ke dalam sesi keranjang sementara.
  - **Proses:** Logika frontend (via _Zustand_) memvalidasi apakah kuantitas yang diminta melebihi sisa stok yang ditampilkan dan menampilkan umpan balik _Toast notification_.
- **F-CRT-02: Modifikasi & Penghapusan Item**
  - **Deskripsi:** Pengguna dapat mengubah jumlah produk yang akan dibeli atau menghapusnya dari daftar.
  - **Output:** Perhitungan ulang otomatis (_real-time recalculation_) untuk total harga.

### 3.3 Modul Checkout & Manajemen Pemesanan

- **F-ORD-01: Pemrosesan Keranjang Hibrida (Guest & Authenticated Checkout Processing) [Diperbarui V1.2.0]**
  - **Deskripsi:** Sistem meninjau _state_ keranjang dan meminta informasi pengiriman dari pembeli, baik sebagai tamu maupun pelanggan yang sedang login.
  - **Proses:**
    1. Jika pengguna berstatus **Login (Authenticated)**, sistem secara otomatis mengisi awal (_pre-fill_) kolom Nama Lengkap dan Email pada formulir _checkout_ berdasarkan data profil pengguna, serta menyertakan token autentikasi JWT pada _header_ permintaan API.
    2. Jika pengguna berstatus **Tamu (Guest)**, pengguna mengisi seluruh formulir secara manual.
    3. Validasi _regex_ via _Zod_ di frontend memeriksa format email, nomor telepon angka, kelengkapan alamat, dan menolak karakter tag HTML (`<` atau `>`) untuk mencegah XSS.
- **F-ORD-02: Inisiasi Transaksi Finansial (Order Initialization) [Diperbarui V1.2.0]**
  - **Deskripsi:** _Backend_ menerima permintaan _checkout_, mengaitkan pesanan dengan identitas pengguna (jika ada), menyimpan pesanan, dan meminta token dari _Payment Gateway_.
  - **Proses:**
    1. API memeriksa keberadaan _Bearer Token_ JWT yang valid pada _request header_. Jika valid, sistem mengekstrak `user_id` untuk disimpan pada baris pesanan; jika tidak ada token (_Guest_), `user_id` diisi `NULL`.
    2. API mengunci baris produk di PostgreSQL (_Pessimistic Locking_ via `.with_for_update()`) dan memverifikasi ulang harga (_Zero-Trust Pricing_) serta ketersediaan stok aktual.
    3. API menyimpan _header_ pesanan (tabel `orders`) dan detail item (tabel `order_items`) dengan status `PENDING`.
    4. API memanggil layanan Midtrans Snap untuk mendapatkan token pembayaran.
- **F-ORD-03: Webhook Pembayaran & Penguncian Stok (Payment Webhook & Stock Mutation)**
  - **Deskripsi:** Mekanisme asinkron penerimaan notifikasi konfirmasi status transaksi dari Midtrans.
  - **Proses:**
    1. API memverifikasi keaslian _signature key_ (SHA-512) dan memeriksa _idempotency_ status pesanan.
    2. Jika pembayaran sukses (`settlement` / `capture`), status pesanan diubah menjadi `PAID`. Jika gagal/dibatalkan (`cancel` / `deny` / `expire`), status diubah menjadi `CANCELLED` dan stok produk dikembalikan (_rollback stock_) ke tabel `products`.
- **F-ORD-04: Riwayat Pesanan Pelanggan (Customer Order History) [Ditambahkan V1.2.0]**
  - **Deskripsi:** Pelanggan terdaftar yang sedang login dapat melihat daftar seluruh transaksi yang pernah dibuat menggunakan akunnya.
  - **Proses:** Frontend memanggil _endpoint_ terproteksi `GET /api/v1/orders/me` dengan menyertakan JWT _Access Token_. _Backend_ memfilter tabel `orders` berdasarkan `user_id == current_user.id` yang diurutkan dari transaksi terbaru.
  - **Output:** Daftar riwayat pesanan di layar klien yang memuat ID Pesanan, Tanggal Transaksi, Total Pembayaran, Status Pembayaran (`PENDING`, `PAID`, `CANCELLED`), dan tautan ke halaman rincian pesanan.

### 3.4 Modul Manajemen Identitas & Akses / IAM [Ditambahkan V1.2.0]

- **F-IAM-01: Registrasi Pelanggan Baru (Local Account Registration)**
  - **Deskripsi:** Pengguna tamu dapat mendaftarkan akun baru menggunakan nama lengkap, alamat email, dan kata sandi.
  - **Proses:**
    1. Validasi sisi klien (Zod) dan sisi server (Pydantic) memastikan format email sah, nama bebas tag HTML, dan kata sandi memenuhi standar kekuatan minimal (minimal 8 karakter, kombinasi huruf dan angka).
    2. _Backend_ memeriksa keunikan email di tabel `users`. Jika email sudah terdaftar, sistem menolak dengan status `400 Bad Request` / `409 Conflict`.
    3. _Backend_ melakukan _hashing_ kata sandi menggunakan algoritma **Argon2id** atau **Bcrypt** sebelum menyimpannya ke kolom `password_hash` dengan `auth_provider = 'LOCAL'` dan `role = 'CUSTOMER'`.
  - **Output:** Akun pengguna berhasil dibuat dan sistem mengembalikan respons sukses atau langsung menginisiasi sesi login.
- **F-IAM-02: Autentikasi Kredensial Lokal & Penerbitan JWT (Local Login & Token Issuance)**
  - **Deskripsi:** Pengguna terdaftar dapat masuk ke sistem menggunakan email dan kata sandi.
  - **Proses:**
    1. _Backend_ mencari pengguna berdasarkan email dan memverifikasi kecocokan kata sandi terhadap `password_hash`.
    2. Jika gagal, sistem mengembalikan pesan generik _"Email atau kata sandi salah"_ (`401 Unauthorized`) untuk mencegah _User Enumeration_.
    3. Jika berhasil, _backend_ menerbitkan `access_token` (JWT berumur pendek yang memuat klaim `sub: user_id`, `email`, dan `role`) pada _response body_ serta menyematkan `refresh_token` (berumur panjang) di dalam _HttpOnly, Secure, SameSite Cookie_.
- **F-IAM-03: Autentikasi Google SSO (OAuth 2.0 / OIDC Backend Verification)**
  - **Deskripsi:** Pengguna dapat masuk atau mendaftar secara instan menggunakan akun Google mereka dengan satu klik.
  - **Proses:**
    1. Klien (Next.js) memicu alur autentikasi Google dan menerima `id_token` dari Google.
    2. Klien mengirimkan `id_token` tersebut ke _endpoint_ `POST /api/v1/auth/google` di FastAPI.
    3. FastAPI memverifikasi tanda tangan kriptografi, masa berlaku, dan kecocokan `GOOGLE_CLIENT_ID` pada `id_token` menggunakan pustaka resmi `google-auth`.
    4. **Account Linking / Auto-Provisioning:** Jika email dari Google belum ada di tabel `users`, sistem otomatis membuat baris pengguna baru dengan `password_hash = NULL`, `auth_provider = 'GOOGLE'`, dan `role = 'CUSTOMER'`. Jika email sudah terdaftar, sistem langsung mengaitkan sesi ke akun tersebut.
  - **Output:** Penerbitan pasangan JWT (`access_token` & _HttpOnly_ `refresh_token`) yang identik dengan alur login lokal.
- **F-IAM-04: Pembaruan Sesi & Penutupan Sesi (Token Refresh & Logout)**
  - **Deskripsi:** Sistem menjaga keberlangsungan sesi pengguna secara mulus tanpa mengorbankan keamanan, serta mengizinkan pengguna keluar dari akun.
  - **Proses:**
    1. Saat `access_token` kedaluwarsa, klien memanggil `POST /api/v1/auth/refresh` yang membaca `refresh_token` dari _HttpOnly Cookie_ untuk menerbitkan `access_token` baru.
    2. Saat pengguna menekan tombol _Logout_, klien memanggil `POST /api/v1/auth/logout` untuk menghapus _HttpOnly Cookie_ dari peramban dan membersihkan _state_ autentikasi lokal di memori aplikasi.
- **F-IAM-05: Otorisasi Berbasis Peran (Role-Based Access Control / RBAC Middleware)**
  - **Deskripsi:** _Backend_ memvalidasi hak akses pengguna sebelum mengizinkan eksekusi pada _endpoint_ sensitif.
  - **Proses:** _Dependency injection_ di FastAPI (`get_current_user` dan `require_role("ADMIN")`) mendekode JWT _Access Token_, memverifikasi status aktif pengguna (`is_active == True`), dan menolak akses dengan kode `403 Forbidden` apabila pengguna berstatus `CUSTOMER` mencoba mengakses rute khusus `ADMIN`.

---

## BAB IV: KEBUTUHAN ANTARMUKA EKSTERNAL

### 4.1 Antarmuka Pengguna (User Interfaces)

Antarmuka pengguna didesain menggunakan paradigma responsif dengan prinsip _Clean Minimalist_.

- **Standardisasi Layout & CRO:** Aplikasi mengadopsi pola _F-Pattern_ untuk katalog dan _full-card clickable_ untuk kemudahan navigasi.
- **Skema Warna (Brand Identity):**
  - **Warna Primer:** "Tech Violet" (`Violet-700` / `#6D28D9`) untuk _Call-to-Action_ (CTA), lencana keranjang, dan elemen fokus utama.
  - **Tipografi:** Menggunakan _font sans-serif_ modern (Geist/Inter) dengan penekanan hirarki visual yang jelas.
- **Komponen Antarmuka Baru [Ditambahkan V1.2.0]:**
  - **Halaman Login & Registrasi (`/login`, `/register`):** Formulir autentikasi minimalis dengan validasi _real-time_, dilengkapi tombol resmi **"Lanjutkan dengan Google"** (_Google Sign-In Button_) yang kontras dan jelas.
  - **Menu Profil & Status Navigasi (Navbar Auth State):** Bilah navigasi atas (_Navbar_) wajib beradaptasi secara dinamis—menampilkan tombol _"Masuk / Daftar"_ bagi pengguna tamu, atau menampilkan nama/inisial pengguna beserta menu _dropdown_ (_"Riwayat Pesanan"_, _"Keluar"_) bagi pengguna yang sudah login.
  - **Galeri Multi-Gambar Produk (Product Image Gallery):** Pada halaman detail produk (`/product/[id]`), antarmuka menampilkan satu bingkai gambar utama beresolusi tinggi dengan daftar _thumbnail_ di bawah atau di sampingnya untuk berpindah antar-gambar produk secara instan tanpa memuat ulang halaman.
- **Umpan Balik Sistem (System Feedback):**
  - **Micro-interactions:** Tombol CTA memiliki indikator pemuatan (_spinner_) dan _Toast notification_ (via _Sonner_) saat terjadi mutasi keranjang, keberhasilan login/logout, atau penolakan akses.
  - **Breadcrumbs Navigation:** Navigasi struktural pada halaman detail (`Beranda > Katalog > Nama Produk`).
  - **State Memuat (Loading):** Menggunakan _Skeleton Loader_.

### 4.2 Antarmuka Perangkat Lunak (Software Interfaces)

- **SI-01: Komunikasi Frontend (Next.js) ke Backend API (FastAPI) [Diperbarui V1.2.0]**
  - **Protokol:** HTTP/HTTPS menggunakan RESTful Web Services (`application/json`).
  - **Transmisi Autentikasi:** Menggunakan _HTTP Header_ `Authorization: Bearer <access_token>` untuk rute terproteksi, dikombinasikan dengan pengiriman kredensial kuki (`credentials: "include"`) untuk pertukaran _HttpOnly Refresh Token_.
- **SI-02: Koneksi API ke Basis Data (PostgreSQL)**
  - **Protokol:** TCP/IP pada _port_ 5432 melalui SQLAlchemy ORM dan dikelola skemanya menggunakan Alembic.
- **SI-03: Integrasi API Payment Gateway (Midtrans)**
  - **Protokol:** HTTPS (wajib enkripsi TLS _end-to-end_).
- **SI-04: Integrasi Layanan Identitas Google (Google OAuth 2.0 / OIDC) [Ditambahkan V1.2.0]**
  - **Protokol:** HTTPS (TLS 1.2+).
  - **Mode Interaksi:** Klien Next.js berinteraksi dengan _Google Identity Services SDK_ untuk memperoleh _ID Token_, kemudian _Backend_ FastAPI memvalidasi tanda tangan digital token tersebut terhadap sertifikat publik Google (`https://oauth2.googleapis.com/tokeninfo` atau kunci publik JWK Google).

---

## BAB V: KEBUTUHAN NON-FUNGSIONAL (NON-FUNCTIONAL REQUIREMENTS)

### 5.1 Kinerja & Skalabilitas (Performance & Scalability Requirements)

- **NF-PER-01: Waktu Muat Awal (Initial Page Load):** Lapisan antarmuka (Next.js) harus mencapai _First Contentful Paint_ (FCP) di bawah 1,5 detik.
- **NF-PER-02: Waktu Respons API & Efisiensi Kueri Relasional [Diperbarui V1.2.0]:** Rata-rata waktu respons untuk pemanggilan _endpoint_ non-transaksional harus berada di bawah 200 ms. Pengambilan produk beserta daftar gambarnya (`product_images`) wajib menggunakan _Eager Loading_ (`selectinload` / `joinedload`) untuk mencegah _N+1 Query Problem_.
- **NF-PER-03: Konkurensi (Concurrency Handling):** _Web server_ FastAPI dan PostgreSQL harus mampu memproses setidaknya 100 RPS.

### 5.2 Keamanan & Privasi (Security & Privacy Requirements)

- **NF-SEC-01: Enkripsi Transportasi Data:** Komunikasi data **wajib** dienkripsi menggunakan HTTPS dengan standar TLS 1.2+.
- **NF-SEC-02: Perlindungan Injeksi & Serangan Payload:** FastAPI memanfaatkan Pydantic dan Next.js memanfaatkan Zod untuk validasi ketat guna menolak serangan injeksi SQL dan _Cross-Site Scripting_ (XSS) pada seluruh formulir (termasuk formulir Login, Registrasi, dan Checkout).
- **NF-SEC-03: Otentikasi Webhook (Webhook Signature Verification):** _Endpoint webhook_ wajib memverifikasi _hash signature_ SHA-512 dari Midtrans.
- **NF-SEC-04: Perlindungan Lintas Situs (CORS Policy) [Diperbarui V1.2.0]:** FastAPI membatasi _Cross-Origin Resource Sharing_ (CORS) hanya untuk domain URL _frontend_ Next.js yang sah (termasuk dukungan pola regex tervalidasi untuk subdomain _preview_ Vercel) dengan `allow_credentials=True` guna mendukung transmisi kuki autentikasi yang aman.
- **NF-SEC-05: Rate Limiting & DoS Protection [Diperbarui V1.2.0]:** Selain _endpoint_ `/checkout` (maks 5 _request_/menit/IP), pembatasan laju (_Rate Limiting_) wajib diterapkan secara ketat pada _endpoint_ autentikasi (`/api/v1/auth/login` dan `/api/v1/auth/register` maks 5–10 _request_/menit/IP) untuk memitigasi serangan _Credential Stuffing_ dan _Brute-Force Password Guessing_.
- **NF-SEC-06: Keamanan Penyimpanan Kredensial (Password Hashing Standard) [Ditambahkan V1.2.0]:** Sistem **dilarang keras** menyimpan kata sandi dalam bentuk teks biasa (_plain text_) atau algoritma _hash_ cepat yang rentan (seperti MD5/SHA-1/SHA-256 murni). Seluruh kata sandi pengguna wajib di-_hash_ menggunakan fungsi derivasi kunci yang tahan terhadap serangan perangkat keras (GPU/ASIC), yaitu **Argon2id** atau **Bcrypt** dengan _cryptographic salt_ unik per pengguna.
- **NF-SEC-07: Manajemen Token JWT & Keamanan Sesi [Ditambahkan V1.2.0]:**
  - _Access Token_ JWT harus ditandatangani secara kriptografis (`HS256` dengan _Secret Key_ minimal 256-bit dari _Environment Variables_) dan memiliki masa berlaku singkat (15–30 menit).
  - _Refresh Token_ wajib memiliki masa berlaku terukur (misal: 7 hari) dan ditransmisikan melalui **HttpOnly, Secure, SameSite Cookie** untuk mencegah pencurian token sesi apabila terjadi celah XSS di sisi klien.
- **NF-SEC-08: Verifikasi Zero-Trust Token OAuth Eksternal [Ditambahkan V1.2.0]:** _Backend_ FastAPI tidak boleh mempercayai klaim alamat email atau nama dari login Google yang dikirim mentah oleh _frontend_. _Backend_ wajib memverifikasi keaslian `id_token` secara kriptografis langsung terhadap kunci publik Google dan memastikan nilai `aud` (_Audience_) cocok dengan `GOOGLE_CLIENT_ID` aplikasi.

### 5.3 Keselamatan & Keandalan (Safety & Reliability Requirements)

- **NF-SFT-01: Integritas Transaksional (ACID):** Seluruh operasi finansial dan mutasi stok di PostgreSQL dibungkus dalam blok SQL _Transaction_ dengan mekanisme _Rollback_ otomatis jika terjadi kegagalan sistematis.
- **NF-SFT-02: Pemulihan Otomatis (Container Restart Policy):** Semua _container_ Docker diatur dengan kebijakan _restart: always_ atau _unless-stopped_.
- **NF-SFT-03: Perlindungan Degradasi (Graceful Degradation):** Jika koneksi _database_ terputus, API merespons dengan kode 503, dan _frontend_ merender halaman gangguan layanan secara elegan tanpa mengekspos _stack trace_ internal.
- **NF-SFT-04: Keamanan Migrasi Skema Tanpa Kehilangan Data (Non-Destructive Schema Evolution) [Ditambahkan V1.2.0]:** Setiap pembaruan skema tabel pada pangkalan data produksi (seperti penambahan tabel `users`, `product_images`, dan kolom `user_id` pada `orders`) wajib dilakukan melalui skrip migrasi terversi (Alembic `upgrade`/`downgrade`) yang menjamin 100% keutuhan data produk dan transaksi yang sudah ada sebelumnya.
