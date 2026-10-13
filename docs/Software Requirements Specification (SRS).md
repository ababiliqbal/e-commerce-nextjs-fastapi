# **Software Requirements Specification (SRS)**

## **Platform E-Commerce Berbasis RESTful Microservices**

**Versi:** 1.0 (MVP) **Status:** Draf

## **BAB I: PENDAHULUAN**

### **1.1 Tujuan (*Purpose*)**

Dokumen ini mendeskripsikan spesifikasi kebutuhan perangkat lunak untuk sistem aplikasi e-commerce *Minimum Viable Product* (MVP). Sistem ini dirancang sebagai platform transaksi ritel digital terdesentralisasi (arsitektur *decoupled*). Sistem ini akan memfasilitasi pembeli untuk melihat katalog produk, memasukkan produk ke keranjang, menyelesaikan pesanan melalui mekanisme *Guest Checkout*, dan melakukan pembayaran digital yang terverifikasi otomatis. Dokumen ini ditujukan bagi tim pengembang (*developer*), *Project Manager*, serta pemangku kepentingan (calon klien *software house*) untuk memahami fungsi, batasan, dan target operasional sistem.

### **1.2 Cakupan Proyek (*Project Scope*)**

Proyek ini dinamakan "E-Commerce Web Platform (MVP Version)". Cakupan otomatisasi yang akan diselesaikan oleh perangkat lunak ini meliputi:

* Penyajian katalog produk secara instan menggunakan teknik rendering dinamis (*Server-Side Rendering*).  
* Manajemen status (*state management*) keranjang belanja di sisi klien sebelum sesi *checkout*.  
* Otomatisasi pencatatan pesanan dan pengelolaan siklus hidup transaksi (*Transaction Lifecycle*) melalui RESTful API.  
* Integrasi sistem pihak ketiga (*Payment Gateway*) untuk memvalidasi pembayaran secara *real-time* tanpa intervensi manual dari administrator.  
* *Scope Exclusions* (Di luar cakupan fase ini): Sistem otentikasi/registrasi pengguna kompleks, perhitungan ongkos kirim dinamis berbasis geolokasi, *dashboard* admin tingkat lanjut (CMS visual), dan sistem *review/rating*.

### **1.3 Karakteristik Lingkungan (*Environmental Characteristics*)**

Sistem ini dibangun di atas arsitektur *Client-Server* terpisah dengan spesifikasi lingkungan interaksi sebagai berikut:

* **Lingkungan Eksekusi Klien (Frontend):** Berjalan di peramban web modern (Google Chrome, Mozilla Firefox, Safari) pada perangkat *desktop* dan *mobile*. Dikembangkan menggunakan kerangka kerja Next.js (React) dengan bahasa TypeScript.  
* **Lingkungan Eksekusi Server (Backend):** Berjalan pada kontainer terisolasi berbasis Linux (Docker). Menggunakan kerangka kerja FastAPI (Python) yang menyediakan antarmuka RESTful API secara asinkron.  
* **Sistem Manajemen Basis Data:** PostgreSQL digunakan sebagai pangkalan data relasional utama untuk menjamin integritas transaksional (ACID).  
* **Interaksi Sistem Eksternal:** Sistem ini akan berkomunikasi dengan *Payment Gateway Server* (misal: Midtrans/Xendit) melalui protokol HTTPS/TLS 1.2+ menggunakan arsitektur *Webhook* asinkron.

## **BAB II: DESKRIPSI UMUM**

### **2.1 Perspektif Produk (*Product Perspective*)**

Sistem E-Commerce ini adalah produk baru dan independen (bukan sistem pengganti/migrasi dari sistem peninggalan atau *legacy system*). Sistem ini diposisikan sebagai platform mandiri dengan arsitektur berorientasi layanan (*service-oriented*). Dalam ekosistem yang lebih luas, produk ini dirancang *scalable*—siap untuk diintegrasikan dengan modul manajemen rantai pasok (*Supply Chain Management*) atau modul akuntansi perusahaan di fase pengembangan selanjutnya tanpa perlu merombak basis kode inti.

### **2.2 Karakteristik Pengguna (*User Classes*)**

Sistem MVP ini akan diakses oleh dua kelas pengguna utama:

1. **Pelanggan Tamu (*Guest Customer*):**  
   * *Karakteristik:* Pengguna internet umum yang memiliki tingkat literasi teknologi dasar hingga menengah. Cenderung memiliki rentang perhatian pendek (*short attention span*) sehingga membutuhkan antarmuka yang sangat responsif, navigasi intuitif, dan proses *checkout* yang minimal gesekan (*frictionless*).  
   * *Fungsi:* Mencari produk, menambah item ke keranjang, mengisi formulir pengiriman, dan melakukan pembayaran.  
2. **Administrator Basis Data/Teknis (*Technical Admin*):**  
   * *Karakteristik:* Pengguna dengan literasi perangkat lunak tinggi (berperan sebagai pengelola sementara pada fase MVP).  
   * *Fungsi:* Memanipulasi *state* pesanan (misal: mengubah status "PAID" menjadi "SHIPPED") dan mengelola ketersediaan stok melalui antarmuka *database client* (misal: pgAdmin/DBeaver) atau melalui manipulasi *endpoint* API secara langsung.

### **2.3 Batasan Desain & Implementasi (*Design & Implementation Constraints*)**

Pengembangan perangkat lunak ini diwajibkan untuk mematuhi batasan arsitektural dan teknis berikut:

* **Pemisahan Entitas (Decoupling):** Frontend (Next.js) dan Backend (FastAPI) tidak boleh berada dalam satu wadah proses (*monolith*). Keduanya harus berkomunikasi murni melalui JSON API *payloads*.  
* **Bahasa Pemrograman:** Lapisan presentasi (Frontend) wajib menggunakan TypeScript untuk *type safety* ketat guna mencegah *runtime error* pada keranjang belanja. Lapisan logika bisnis (Backend) diwajibkan menggunakan Python 3.10+.  
* **Integritas Relasional:** Data finansial (Pesanan, Item Pesanan, dan Harga Historis) wajib disimpan dalam basis data relasional (PostgreSQL). Penggunaan *NoSQL database* (seperti MongoDB) **dilarang keras** untuk modul transaksional guna mencegah inkonsistensi data pembayaran.  
* **Lingkungan Kontainer (Containerization):** Seluruh layanan *backend* (API dan Database) harus dikemas menggunakan Docker (*Dockerfile* & *docker-compose.yml*) untuk memastikan konsistensi lingkungan lintas-*server* (dari mesin pengembangan ke produksi).  
* **Otomatisasi Integrasi (CI/CD):** Dilarang melakukan peluncuran pembaruan langsung ke *server* produksi secara manual. Semua rilis kode harus melewati pengecekan *workflow* di GitHub Actions.

## **BAB III: KEBUTUHAN FUNGSIONAL**

Kebutuhan fungsional di bawah ini dikelompokkan berdasarkan modul utama perangkat lunak (MVP).

### **3.1 Modul Manajemen Katalog (Klien & API)**

Fungsi ini menangani visibilitas inventaris toko ke pengguna umum.

* **F-CAT-01: Pengambilan Daftar Produk (Product Listing Retrieval)**  
  * **Deskripsi:** Sistem (Next.js) harus dapat mengambil dan menampilkan daftar produk secara dinamis dari API dengan mempertimbangkan *pagination*.  
  * **Input:** Nomor halaman (*page*) atau parameter *limit* (default: 10).  
  * **Proses:** *Backend* memanggil *query* dari tabel `products` di PostgreSQL, mengurutkan berdasarkan ketersediaan atau tanggal terbaru.  
  * **Output:** Grid produk di layar klien (Gambar, Nama Produk, Harga).  
* **F-CAT-02: Pengambilan Detail Produk (Product Detail Fetch)**  
  * **Deskripsi:** Sistem harus menampilkan data mendalam saat pengguna memilih satu produk spesifik.  
  * **Input:** ID Produk (`product_id`).  
  * **Proses:** API melakukan pencarian ke database berdasarkan ID.  
  * **Output:** Tampilan halaman detail yang memuat Nama Produk, Harga, Deskripsi Lengkap, dan Jumlah Stok tersisa saat ini.

### **3.2 Modul Keranjang Belanja (*Shopping Cart*)**

Fungsi ini berjalan secara lokal di sisi klien sebelum sesi *checkout* disahkan.

* **F-CRT-01: Tambah Item ke Keranjang**  
  * **Deskripsi:** Sistem memungkinkan pengguna memasukkan produk yang dilihat ke dalam sesi keranjang sementara.  
  * **Input:** ID Produk dan kuantitas (jumlah).  
  * **Proses:** Logika frontend (via *Zustand/Redux*) memvalidasi apakah kuantitas yang diminta melebihi sisa stok yang ditampilkan.  
  * **Output:** *State* keranjang diperbarui; pembaruan ikon keranjang (jumlah item) dan kalkulasi total harga di antarmuka (*UI update*).  
* **F-CRT-02: Modifikasi & Penghapusan Item**  
  * **Deskripsi:** Pengguna dapat mengubah jumlah produk yang akan dibeli atau menghapusnya dari daftar.  
  * **Input:** Perintah 'Ubah Kuantitas' (tambah/kurang) atau 'Hapus' pada item di halaman Cart.  
  * **Output:** Perhitungan ulang otomatis (*real-time recalculation*) untuk total harga.

### **3.3 Modul Checkout & Manajemen Pemesanan**

Fungsi utama interaksi antara antarmuka Next.js dan *endpoint* FastAPI untuk pencatatan transaksi finansial.

* **F-ORD-01: Pemrosesan Keranjang Tamu (*Guest Checkout Processing*)**  
  * **Deskripsi:** Sistem meninjau *state* keranjang dan meminta informasi logistik dari pembeli.  
  * **Input:** Data form pengiriman (Nama, Email, No. HP, Alamat).  
  * **Proses:** Validasi *regex* untuk format email dan kelengkapan alamat menggunakan pustaka (misal: *Zod*) di frontend sebelum pengiriman data.  
  * **Output:** Pengiriman (HTTP POST) JSON *Payload* berisi identitas pengiriman dan susunan *Array* keranjang ke *endpoint* API pesanan.  
* **F-ORD-02: Inisiasi Transaksi Finansial (*Order Initialization*)**  
  * **Deskripsi:** *Backend* menerima permintaan *checkout*, menyimpan pesanan, dan meminta token dari *Payment Gateway*.  
  * **Input:** JSON *Payload* dari frontend (F-ORD-01).  
  * **Proses:**  
    1. API (FastAPI) mengunci transaksi dan memverifikasi ulang harga serta ketersediaan stok aktual di PostgreSQL.  
    2. API menyimpan *header* order (Tabel `Orders`) dan detail order (Tabel `Order_Items`) dengan status awal `PENDING`.  
    3. API memanggil layanan API pihak ketiga (*Payment Gateway*) untuk mendapatkan URL/Token pembayaran.  
  * **Output:** API mengembalikan URL/Token Pembayaran ke frontend untuk dirender dalam bentuk halaman pembayaran (misal: Midtrans *Snap*).  
* **F-ORD-03: Webhook Pembayaran & Penguncian Stok (*Payment Webhook & Stock Mutation*)**  
  * **Deskripsi:** Mekanisme asinkron penerimaan notifikasi konfirmasi bahwa dana pelanggan telah berhasil ditransfer.  
  * **Input:** Permintaan HTTP POST otomatis dari server *Payment Gateway* ke *endpoint webhook* FastAPI.  
  * **Proses:**  
    1. API memverifikasi keaslian *signature key* di dalam *header* untuk keamanan (Anti-Spoofing).  
    2. API mengubah status pesanan dari `PENDING` menjadi `PAID` di *database*.  
    3. Sistem mengurangi (mutasi) nilai stok fisik barang pada tabel produk.  
  * **Output:** Tidak ada output UI (murni *backend*); pengembalian status *HTTP 200 OK* ke server *Payment Gateway*.

## **BAB IV: KEBUTUHAN ANTARMUKA EKSTERNAL**

Bab ini merinci titik-titik interaksi sistem dengan entitas luar, baik manusia maupun perangkat lunak lain.

### **4.1 Antarmuka Pengguna (*User Interfaces*)**

Antarmuka pengguna didesain menggunakan paradigma responsif (beradaptasi dari layar seluler hingga *desktop*).

* **Standardisasi Layout:** Aplikasi akan mengadopsi pola E-Commerce konvensional untuk mencegah kebingungan kognitif (*cognitive load*):  
  * *Header* berisi Logo di kiri, bar pencarian di tengah, dan Ikon Keranjang di kanan.  
  * Katalog ditampilkan dalam format matriks (*grid*).  
* **Umpan Balik Sistem (*System Feedback*):**  
  * **State Memuat (*Loading*):** Saat menunggu respons API lambat, layar harus menampilkan elemen visual *Skeleton Loader*, bukan halaman kosong.  
  * **Interaksi Tombol:** Tombol pemicu mutasi data (misal: tombol "Bayar") wajib berada dalam keadaan nonaktif (*disabled*) selama proses tunggu API untuk mencegah transaksi duplikat akibat pengguna menekan berulang kali (*double-click prevention*).  
  * **Error Handling UI:** Jika koneksi API gagal, UI akan menampilkan pemberitahuan ramah (*Toast/Snackbar Message*), misal: "Sistem sibuk, silakan coba beberapa saat lagi."

### **4.2 Antarmuka Perangkat Lunak (*Software Interfaces*)**

Definisi cara komponen-komponen sistem "berbicara" satu sama lain dan pihak eksternal:

* **SI-01: Komunikasi Frontend (Next.js) ke Backend API (FastAPI)**  
  * **Protokol:** HTTP/HTTPS menggunakan RESTful Web Services.  
  * **Format Data:** Format pertukaran berbasis `application/json`.  
  * **Arsitektur Autentikasi (Fase Lanjut):** Akses *endpoint* administratif nantinya dikunci dengan protokol otentikasi JWT (*JSON Web Tokens*) melalui *HTTP Header Bearer*.  
* **SI-02: Koneksi API ke Basis Data (PostgreSQL)**  
  * **Protokol:** TCP/IP pada *port* standar PostgreSQL (5432) yang diamankan dalam jaringan virtual Docker internal.  
  * **Interaksi:** Menggunakan koneksi asinkron (misal: *SQLAlchemy Async* atau *SQLModel*) atau pustaka klien ORM (seperti *Prisma* atau *Supabase Client*) tergantung pilihan integrasi BaaS.  
* **SI-03: Integrasi API Payment Gateway (Third-Party)**  
  * **Protokol:** HTTPS (wajib TLS enkripsi end-to-end).  
  * **Mode Interaksi:** Dua arah (Bilateral).  
    1. API lokal menembak permintaan (*Outbound request*) menggunakan otentikasi *Secret API Key* yang disimpan rapat dalam *Environment Variables* (.env).  
    2. API lokal memiliki *Webhook Endpoint* publik untuk menerima respons balik (*Inbound callback*) dari penyedia layanan pembayaran.

## **BAB V: KEBUTUHAN NON-FUNGSIONAL (*NON-FUNCTIONAL REQUIREMENTS*)**

Kebutuhan non-fungsional (sering disebut sebagai atribut kualitas sistem atau *ilities*) menetapkan standar kriteria performa, keamanan, dan keandalan operasional sistem.

### **5.1 Kinerja & Skalabilitas (*Performance & Scalability Requirements*)**

Kinerja mendefinisikan seberapa responsif dan cepat sistem menangani interaksi pengguna dan beban data.

* **NF-PER-01: Waktu Muat Awal (*Initial Page Load*):** Lapisan antarmuka (Next.js) harus mencapai nilai *First Contentful Paint* (FCP) di bawah 1,5 detik pada koneksi 4G standar. Hal ini dicapai dengan strategi *Static Site Generation* (SSG) atau *Server-Side Rendering* (SSR).  
* **NF-PER-02: Waktu Respons API (*API Latency*):** Rata-rata waktu respons untuk pemanggilan *endpoint* non-transaksional (seperti pencarian produk atau katalog) di FastAPI harus berada di bawah 200 milidetik (*ms*) pada persentil ke-95 (P95).  
* **NF-PER-03: Konkurensi (*Concurrency Handling*):** *Web server* FastAPI (menggunakan *Uvicorn/Gunicorn* sebagai *ASGI server*) dan PostgreSQL harus mampu memproses setidaknya 100 *requests per second* (RPS) secara bersamaan tanpa mengalami penolakan koneksi (*connection drop*) atau kebocoran memori (*memory leak*).

### **5.2 Keamanan & Privasi (*Security & Privacy Requirements*)**

Sistem berurusan dengan data pribadi dan interaksi finansial, sehingga standar keamanan tidak dapat dikompromikan.

* **NF-SEC-01: Enkripsi Transportasi Data:** Seluruh komunikasi data, baik antara klien dan *server*, maupun antara *server* dan *Payment Gateway*, **wajib** dienkripsi menggunakan protokol HTTPS dengan standar TLS (*Transport Layer Security*) versi 1.2 atau lebih tinggi. Akses HTTP (port 80\) akan otomatis dialihkan secara paksa (*Force Redirect*) ke HTTPS (port 443).  
* **NF-SEC-02: Perlindungan Injeksi & Serangan *Payload*:**  
  * FastAPI wajib memanfaatkan Pydantic untuk melakukan validasi tipe data dan skema *payload* secara ketat guna menolak serangan injeksi SQL dan *Cross-Site Scripting* (XSS).  
  * Setiap input teks bebas (misal: "Catatan Tambahan untuk Kurir") harus dibersihkan (*sanitized*) dari karakter *tag* HTML sebelum dieksekusi atau disimpan ke basis data.  
* **NF-SEC-03: Otentikasi *Webhook* (*Webhook Signature Verification*):** *Endpoint webhook* tidak boleh menerima *request* sembarangan. Setiap notifikasi keberhasilan pembayaran dari pihak ketiga harus disertai pengecekan kunci kriptografi (*hash signature* HMAC-SHA256) menggunakan *Secret Key* internal perusahaan. Jika *signature* tidak cocok, *request* wajib ditolak dengan kode *401 Unauthorized* atau *403 Forbidden*.  
* **NF-SEC-04: Perlindungan Lintas Situs (*CORS Policy*):** FastAPI harus membatasi *Cross-Origin Resource Sharing* (CORS) hanya untuk domain URL *frontend* Next.js yang sah. Permintaan API dari *domain* asing tidak akan diproses.

### **5.3 Keselamatan & Keandalan (*Safety & Reliability Requirements*)**

Ketentuan ini mengatur bagaimana perangkat lunak bersikap saat terjadi skenario bencana operasional atau kegagalan perangkat keras.

* **NF-SFT-01: Integritas Transaksional (ACID):** Seluruh operasi yang melibatkan uang dan stok di PostgreSQL harus dibungkus dalam blok SQL *Transaction*. Jika langkah pengurangan stok gagal (misalnya karena *server down* seketika atau kendala konstrain stok), pencatatan status `PAID` harus dibatalkan (*Rollback*) secara serentak untuk mencegah kondisi status pesanan yang anomali.  
* **NF-SFT-02: Pemulihan Otomatis (*Container Restart Policy*):** Semua *container* Docker (Next.js, FastAPI, PostgreSQL) diatur dengan kebijakan *restart: always* atau *unless-stopped*. Jika aplikasi *crash* akibat kehabisan memori (*OOM Killer*) atau kesalahan kode fatal, *Docker Daemon* akan secara otomatis menyalakan ulang *container* tanpa intervensi manual.  
* **NF-SFT-03: Perlindungan Degradasi (*Graceful Degradation*):** Jika koneksi *database* terputus sepenuhnya, API harus merespons dengan kode *503 Service Unavailable*, dan aplikasi *frontend* harus merender "Halaman Perbaikan (*Maintenance Page*)" dengan elegan, bukan memberikan tampilan daftar *error* SQL (seperti *stack trace*) yang mengekspos struktur internal server kepada publik.

