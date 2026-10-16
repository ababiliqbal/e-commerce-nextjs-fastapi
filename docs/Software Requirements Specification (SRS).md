# Software Requirements Specification (SRS)

## Platform E-Commerce Berbasis RESTful Microservices

### Riwayat Dokumen (Document Control)

| Versi | Tanggal     | Penulis         | Deskripsi Perubahan (Change Log)                                                                             | Status  |
| :---- | :---------- | :-------------- | :----------------------------------------------------------------------------------------------------------- | :------ |
| 1.0.0 | 12 Okt 2026 | M. Iqbal Ababil | Inisialisasi MVP, Guest Checkout, Midtrans Snap.                                                             | Dirilis |
| 1.1.0 | 16 Okt 2026 | M. Iqbal Ababil | DRAF: Refactoring UI/UX (CRO Pattern, Brand Color 'Tech Violet'), Security Audit (CORS, Rate Limiting, XSS). | Draf    |
| 1.2.0 | TBA         | M. Iqbal Ababil | DRAF: Penambahan Modul IAM (Login/Register JWT), ERD Users & Product_Images.                                 | Rencana |
| 2.0.0 | TBA         | M. Iqbal Ababil | DRAF: Modul Integrasi Eksternal (API Logistik 3PL), Ongkos Kirim Dinamis.                                    | Rencana |

**Versi:** 1.1.0 **Status:** Draf

## BAB I: PENDAHULUAN

### 1.1 Tujuan (Purpose)

Dokumen ini mendeskripsikan spesifikasi kebutuhan perangkat lunak untuk sistem aplikasi e-commerce _Minimum Viable Product_ (MVP) dan _incremental update_ V1.1.0. Sistem ini dirancang sebagai platform transaksi ritel digital terdesentralisasi (arsitektur _decoupled_). Sistem memfasilitasi pembeli untuk melihat katalog produk, memasukkan produk ke keranjang, menyelesaikan pesanan melalui mekanisme _Guest Checkout_, dan melakukan pembayaran digital yang terverifikasi otomatis. Dokumen ini ditujukan bagi tim pengembang (_developer_), _Project Manager_, serta pemangku kepentingan untuk memahami fungsi, batasan, dan target operasional sistem.

### 1.2 Cakupan Proyek (Project Scope)

Proyek ini dinamakan "E-Commerce Web Platform (MVP Version)". Cakupan otomatisasi yang diselesaikan meliputi:

- Penyajian katalog produk secara instan menggunakan teknik rendering dinamis (_Server-Side Rendering_).
- Manajemen status (_state management_) keranjang belanja di sisi klien sebelum sesi _checkout_.
- Otomatisasi pencatatan pesanan dan pengelolaan siklus hidup transaksi (_Transaction Lifecycle_) melalui RESTful API.
- Integrasi sistem pihak ketiga (_Payment Gateway_) untuk memvalidasi pembayaran secara _real-time_ tanpa intervensi manual dari administrator.
- **[Ditambahkan V1.1.0]** Peningkatan pengalaman pengguna (_User Experience_) dengan prinsip _Conversion Rate Optimization_ (CRO) dan skema warna merek (_Brand Color_) "Tech Violet".
- **[Ditambahkan V1.1.0]** Pengetatan postur keamanan (_Security Posture_) melawan _Brute Force_, _Over-permissive CORS_, dan _Cross-Site Scripting_ (XSS).
- _Scope Exclusions_ (Di luar cakupan fase ini): Sistem otentikasi/registrasi pengguna kompleks, perhitungan ongkos kirim dinamis berbasis geolokasi, _dashboard_ admin tingkat lanjut (CMS visual), dan sistem _review/rating_.

### 1.3 Karakteristik Lingkungan (Environmental Characteristics)

Sistem dibangun di atas arsitektur _Client-Server_ terpisah dengan spesifikasi lingkungan interaksi sebagai berikut:

- **Lingkungan Eksekusi Klien (Frontend):** Berjalan di peramban web modern (Google Chrome, Mozilla Firefox, Safari) pada perangkat _desktop_ dan _mobile_. Dikembangkan menggunakan kerangka kerja Next.js (React) dengan bahasa TypeScript.
- **Lingkungan Eksekusi Server (Backend):** Berjalan pada kontainer terisolasi berbasis Linux (Docker). Menggunakan kerangka kerja FastAPI (Python) yang menyediakan antarmuka RESTful API secara asinkron.
- **Sistem Manajemen Basis Data:** PostgreSQL digunakan sebagai pangkalan data relasional utama untuk menjamin integritas transaksional (ACID).
- **Interaksi Sistem Eksternal:** Sistem berkomunikasi dengan _Payment Gateway Server_ (misal: Midtrans/Xendit) melalui protokol HTTPS/TLS 1.2+ menggunakan arsitektur _Webhook_ asinkron.

## BAB II: DESKRIPSI UMUM

### 2.1 Perspektif Produk (Product Perspective)

Sistem E-Commerce ini adalah produk baru dan independen. Sistem ini diposisikan sebagai platform mandiri dengan arsitektur berorientasi layanan (_service-oriented_). Dalam ekosistem yang lebih luas, produk ini dirancang _scalable_—siap untuk diintegrasikan dengan modul manajemen rantai pasok (_Supply Chain Management_) atau modul akuntansi perusahaan di fase pengembangan selanjutnya tanpa merombak basis kode inti.

### 2.2 Karakteristik Pengguna (User Classes)

Sistem akan diakses oleh dua kelas pengguna utama:

1. **Pelanggan Tamu (Guest Customer):**
   - _Karakteristik:_ Pengguna internet umum yang memiliki tingkat literasi teknologi dasar hingga menengah. Cenderung memiliki rentang perhatian pendek (_short attention span_) sehingga membutuhkan antarmuka yang responsif, navigasi intuitif, dan proses _checkout_ yang minimal gesekan (_frictionless_).
   - _Fungsi:_ Mencari produk, menambah item ke keranjang, mengisi formulir pengiriman, dan melakukan pembayaran.
2. **Administrator Basis Data/Teknis (Technical Admin):**
   - _Karakteristik:_ Pengguna dengan literasi perangkat lunak tinggi.
   - _Fungsi:_ Memanipulasi _state_ pesanan (misal: mengubah status "PAID" menjadi "SHIPPED") dan mengelola ketersediaan stok melalui antarmuka _database client_ (misal: pgAdmin/DBeaver) atau melalui manipulasi _endpoint_ API secara langsung.

### 2.3 Batasan Desain & Implementasi (Design & Implementation Constraints)

- **Pemisahan Entitas (Decoupling):** Frontend (Next.js) dan Backend (FastAPI) tidak boleh berada dalam satu wadah proses (_monolith_). Keduanya harus berkomunikasi murni melalui JSON API _payloads_.
- **Bahasa Pemrograman:** Lapisan presentasi (Frontend) wajib menggunakan TypeScript untuk _type safety_ ketat. Lapisan logika bisnis (Backend) diwajibkan menggunakan Python 3.10+.
- **Integritas Relasional:** Data finansial (Pesanan, Item Pesanan, dan Harga Historis) wajib disimpan dalam basis data relasional (PostgreSQL). Penggunaan _NoSQL database_ **dilarang keras** untuk modul transaksional.
- **Lingkungan Kontainer (Containerization):** Seluruh layanan _backend_ (API dan Database) harus dikemas menggunakan Docker (_Dockerfile_ & _docker-compose.yml_).
- **Otomatisasi Integrasi (CI/CD):** Semua rilis kode harus melewati pengecekan _workflow_ di GitHub Actions sebelum dideploy.

## BAB III: KEBUTUHAN FUNGSIONAL

Kebutuhan fungsional dikelompokkan berdasarkan modul utama perangkat lunak.

### 3.1 Modul Manajemen Katalog (Klien & API)

- **F-CAT-01: Pengambilan Daftar Produk (Product Listing Retrieval)**
  - **Deskripsi:** Sistem (Next.js) harus dapat mengambil dan menampilkan daftar produk secara dinamis dari API dengan mempertimbangkan _pagination_.
  - **Proses:** _Backend_ memanggil _query_ dari tabel `products` di PostgreSQL, mengurutkan berdasarkan ketersediaan atau tanggal terbaru.
  - **Output:** Grid produk di layar klien (Gambar, Nama Produk, Harga).
- **F-CAT-02: Pengambilan Detail Produk (Product Detail Fetch)**
  - **Deskripsi:** Sistem harus menampilkan data mendalam saat pengguna memilih satu produk spesifik.
  - **Output:** Tampilan halaman detail yang memuat Nama Produk, Harga, Deskripsi Lengkap, dan Jumlah Stok tersisa saat ini.

### 3.2 Modul Keranjang Belanja (Shopping Cart)

- **F-CRT-01: Tambah Item ke Keranjang**
  - **Deskripsi:** Sistem memungkinkan pengguna memasukkan produk yang dilihat ke dalam sesi keranjang sementara.
  - **Proses:** Logika frontend (via _Zustand_) memvalidasi apakah kuantitas yang diminta melebihi sisa stok yang ditampilkan.
- **F-CRT-02: Modifikasi & Penghapusan Item**
  - **Deskripsi:** Pengguna dapat mengubah jumlah produk yang akan dibeli atau menghapusnya dari daftar.
  - **Output:** Perhitungan ulang otomatis (_real-time recalculation_) untuk total harga.

### 3.3 Modul Checkout & Manajemen Pemesanan

- **F-ORD-01: Pemrosesan Keranjang Tamu (Guest Checkout Processing)**
  - **Deskripsi:** Sistem meninjau _state_ keranjang dan meminta informasi logistik dari pembeli.
  - **Proses:** Validasi _regex_ untuk format email dan kelengkapan alamat menggunakan pustaka _Zod_ di frontend sebelum pengiriman data. **[Ditambahkan V1.1.0]** Validasi Zod harus menolak tag HTML untuk mencegah XSS.
- **F-ORD-02: Inisiasi Transaksi Finansial (Order Initialization)**
  - **Deskripsi:** _Backend_ menerima permintaan _checkout_, menyimpan pesanan, dan meminta token dari _Payment Gateway_.
  - **Proses:**
    1. API (FastAPI) mengunci transaksi dan memverifikasi ulang harga serta ketersediaan stok aktual di PostgreSQL (_Pessimistic Locking_).
    2. API menyimpan _header_ order dan detail order dengan status `PENDING`.
    3. API memanggil layanan API pihak ketiga (_Payment Gateway_) untuk mendapatkan URL/Token pembayaran.
- **F-ORD-03: Webhook Pembayaran & Penguncian Stok (Payment Webhook & Stock Mutation)**
  - **Deskripsi:** Mekanisme asinkron penerimaan notifikasi konfirmasi bahwa dana pelanggan telah berhasil ditransfer.
  - **Proses:**
    1. API memverifikasi keaslian _signature key_ (SHA-512) di dalam _header_.
    2. API mengubah status pesanan dari `PENDING` menjadi `PAID` di _database_.
    3. Sistem mengurangi (mutasi) nilai stok fisik barang pada tabel produk.

## BAB IV: KEBUTUHAN ANTARMUKA EKSTERNAL

### 4.1 Antarmuka Pengguna (User Interfaces)

Antarmuka pengguna didesain menggunakan paradigma responsif.

- **Standardisasi Layout & CRO [Diperbarui V1.1.0]:** Aplikasi akan mengadopsi pola _F-Pattern_ untuk katalog.
- **Skema Warna (Brand Identity) [Ditambahkan V1.1.0]:**
  - **Warna Primer:** "Tech Violet" (Misal: `Violet-700` atau `#6D28D9`) untuk _Call-to-Action_ (CTA) dan interaksi utama.
  - **Warna Sekunder/Gradien:** Digunakan secara halus pada spanduk promosi atau tombol kritis (misal: "Bayar dengan Midtrans").
  - **Tipografi:** Menggunakan _font sans-serif_ modern (Geist/Inter) dengan penekanan hirarki visual (tebal pada harga, redup pada deskripsi).
- **Umpan Balik Sistem (System Feedback):**
  - **Micro-interactions [Ditambahkan V1.1.0]:** Tombol CTA harus memiliki efek memuat (_spinner_) dan notifikasi mengambang (_Toast_) saat terjadi mutasi data.
  - **Breadcrumbs Navigation [Ditambahkan V1.1.0]:** Disediakan navigasi struktural pada halaman detail (`Beranda > Kategori > Nama Produk`).
  - **State Memuat (Loading):** Menggunakan _Skeleton Loader_.

### 4.2 Antarmuka Perangkat Lunak (Software Interfaces)

- **SI-01: Komunikasi Frontend (Next.js) ke Backend API (FastAPI)**
  - **Protokol:** HTTP/HTTPS menggunakan RESTful Web Services (`application/json`).
- **SI-02: Koneksi API ke Basis Data (PostgreSQL)**
  - **Protokol:** TCP/IP pada _port_ 5432.
- **SI-03: Integrasi API Payment Gateway (Third-Party)**
  - **Protokol:** HTTPS (wajib TLS enkripsi end-to-end).

## BAB V: KEBUTUHAN NON-FUNGSIONAL (NON-FUNCTIONAL REQUIREMENTS)

### 5.1 Kinerja & Skalabilitas (Performance & Scalability Requirements)

- **NF-PER-01: Waktu Muat Awal (Initial Page Load):** Lapisan antarmuka (Next.js) harus mencapai _First Contentful Paint_ (FCP) di bawah 1,5 detik.
- **NF-PER-02: Waktu Respons API (API Latency):** Rata-rata waktu respons untuk pemanggilan _endpoint_ non-transaksional harus berada di bawah 200 ms.
- **NF-PER-03: Konkurensi (Concurrency Handling):** _Web server_ FastAPI dan PostgreSQL harus mampu memproses setidaknya 100 RPS.

### 5.2 Keamanan & Privasi (Security & Privacy Requirements)

- **NF-SEC-01: Enkripsi Transportasi Data:** Komunikasi data **wajib** dienkripsi menggunakan HTTPS dengan standar TLS 1.2+.
- **NF-SEC-02: Perlindungan Injeksi & Serangan Payload [Diperbarui V1.1.0]:**
  - FastAPI memanfaatkan Pydantic, dan Next.js memanfaatkan Zod untuk validasi ketat guna menolak serangan injeksi SQL dan _Cross-Site Scripting_ (XSS) pada _input form_.
- **NF-SEC-03: Otentikasi Webhook (Webhook Signature Verification):** _Endpoint webhook_ wajib memverifikasi _hash signature_ HMAC-SHA512 dari Midtrans.
- **NF-SEC-04: Perlindungan Lintas Situs (CORS Policy) [Diperbarui V1.1.0]:** FastAPI harus membatasi _Cross-Origin Resource Sharing_ (CORS) hanya untuk domain URL _frontend_ Next.js yang sah di tahap produksi (mengganti _wildcard_ `*` dengan URL publik spesifik).
- **NF-SEC-05: Rate Limiting & DoS Protection [Ditambahkan V1.1.0]:** _Endpoint_ krusial seperti `/checkout` wajib mengimplementasikan _Rate Limiting_ (misal: maks 5 _request_ per menit per IP) di sisi FastAPI untuk mencegah serangan _Brute Force_ dan _Resource Exhaustion_.

### 5.3 Keselamatan & Keandalan (Safety & Reliability Requirements)

- **NF-SFT-01: Integritas Transaksional (ACID):** Seluruh operasi di PostgreSQL dibungkus dalam blok SQL _Transaction_ dengan mekanisme _Rollback_ jika terjadi kegagalan sistematis.
- **NF-SFT-02: Pemulihan Otomatis (Container Restart Policy):** Semua _container_ Docker (Next.js, FastAPI, PostgreSQL) diatur dengan kebijakan _restart: always_ atau _unless-stopped_.
- **NF-SFT-03: Perlindungan Degradasi (Graceful Degradation):** Jika koneksi _database_ terputus, API merespons dengan kode 503, dan _frontend_ merender "Halaman Perbaikan" (_Maintenance Page_).
