# Software Requirements Specification (SRS)

## Platform E-Commerce Berbasis RESTful Microservices

### Riwayat Dokumen (Document Control)

| Versi | Tanggal     | Penulis         | Deskripsi Perubahan (Change Log)                                                                                                                                                                     | Status  |
| :---- | :---------- | :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| 1.0.0 | 12 Okt 2026 | M. Iqbal Ababil | Inisialisasi MVP, Guest Checkout, Midtrans Snap.                                                                                                                                                     | Dirilis |
| 1.1.0 | 16 Okt 2026 | M. Iqbal Ababil | Refactoring UI/UX (CRO Pattern, Brand Color 'Tech Violet'), Security Audit (CORS Regex, Rate Limiting, XSS Validation).                                                                              | Dirilis |
| 1.2.0 | 19 Okt 2026 | M. Iqbal Ababil | Penambahan Modul IAM (Login/Register JWT, Google SSO OIDC, RBAC), Galeri Multi-Gambar Produk (`product_images`), Member Checkout & Riwayat Pesanan, Migrasi DB.                                      | Dirilis |
| 1.3.0 | 21 Okt 2026 | M. Iqbal Ababil | Modul Dashboard Admin (CMS Internal), Analitik Penjualan Eksekutif, Manajemen Katalog CRUD & Soft-Delete (`is_active`), Pemenuhan Pesanan (`SHIPPED`/`COMPLETED`), & Integrasi Object Storage.       | Dirilis |
| 2.0.0 | 22 Okt 2026 | M. Iqbal Ababil | DRAF: Modul Integrasi Logistik 3PL Hibrida (RajaOngkir API + Built-in Tariff Engine), Atribut Berat Produk (`weight_grams`), Kalkulasi Ongkos Kirim Dinamis, Manajemen Nomor Resi & Pelacakan Paket. | Dirilis |

**Versi:** 2.0.0 **Status:** Dirilis

---

## BAB I: PENDAHULUAN

### 1.1 Tujuan (Purpose)

Dokumen ini mendeskripsikan spesifikasi kebutuhan perangkat lunak secara paripurna untuk sistem aplikasi e-commerce _Minimum Viable Product_ (MVP) beserta pembaruan evolusioner hingga rilis mayor **Versi 2.0.0**. Sistem ini dirancang sebagai platform transaksi ritel digital terdesentralisasi (arsitektur _decoupled_ 3-Tier). Sistem memfasilitasi pembeli untuk melihat katalog produk beserta galeri multi-gambar dan spesifikasi berat fisik barang, mengelola akun pengguna melalui sistem manajemen identitas (_Identity and Access Management_ / IAM), menghitung estimasi ongkos kirim secara dinamis berdasarkan kota tujuan dan bobot keranjang, menyelesaikan pesanan melalui mekanisme _Guest Checkout_ maupun _Authenticated Member Checkout_, melakukan pembayaran digital yang terverifikasi otomatis, serta melacak posisi pergerakan paket menggunakan nomor resi pengiriman (_Airwaybill Tracking_). Selain itu, sistem menyediakan antarmuka **Dashboard Admin (Internal CMS)** yang terproteksi RBAC bagi administrator untuk memantau analitik penjualan secara _real-time_, mengelola inventaris dan berat produk beserta unggahan foto ke _Cloud Object Storage_, serta menerbitkan nomor resi dan memproses siklus pemenuhan pesanan pelanggan. Dokumen ini ditujukan bagi tim pengembang (_developer_), _Project Manager_, serta pemangku kepentingan untuk memahami fungsi, batasan, dan target operasional sistem.

### 1.2 Cakupan Proyek (Project Scope)

Proyek ini dinamakan "E-Commerce Web Platform (Amba Shop)". Cakupan otomatisasi yang diselesaikan meliputi:

- Penyajian katalog produk aktif secara instan menggunakan teknik rendering dinamis (_Server-Side Rendering_).
- Manajemen status (_state management_) keranjang belanja, bobot akumulasi item, dan sesi autentikasi pengguna di sisi klien.
- Otomatisasi pencatatan pesanan dan pengelolaan siklus hidup transaksi (_Transaction Lifecycle_) melalui RESTful API.
- Integrasi sistem pihak ketiga (_Payment Gateway_ Midtrans) untuk memvalidasi pembayaran (subtotal barang + biaya pengiriman) secara _real-time_ tanpa intervensi manual dari administrator.
- **[Dirilis V1.1.0]** Peningkatan pengalaman pengguna (_User Experience_) dengan prinsip _Conversion Rate Optimization_ (CRO) dan skema warna merek (_Brand Color_) "Tech Violet".
- **[Dirilis V1.1.0]** Pengetatan postur keamanan (_Security Posture_) melawan _Brute Force_, _Over-permissive CORS_, dan _Cross-Site Scripting_ (XSS).
- **[Dirilis V1.2.0]** Sistem Manajemen Identitas dan Akses (_Identity and Access Management_ / IAM) menggunakan _JSON Web Token_ (JWT) dengan mekanisme _Dual-Token_ (_Access Token_ & _HttpOnly Refresh Token_), mencakup registrasi akun, login kredensial lokal, serta _Single Sign-On_ (SSO) menggunakan Google OAuth 2.0 / _OpenID Connect_ (OIDC).
- **[Dirilis V1.2.0]** Fondasi Otorisasi Berbasis Peran (_Role-Based Access Control_ / RBAC) yang memisahkan entitas `CUSTOMER` dan `ADMIN` di tingkat _backend_.
- **[Dirilis V1.2.0]** Dukungan penyajian galeri multi-gambar untuk setiap produk (relasi _One-to-Many_ `1:N` pada tabel `product_images`) dengan tampilan _carousel_ atau _thumbnail switcher_ interaktif.
- **[Dirilis V1.2.0]** Mekanisme _Hybrid Checkout_ (mendukung _Guest Checkout_ maupun _Member Checkout_ dengan _smart auto-fill_ profil) serta halaman Riwayat Pesanan (_Order History_) khusus pelanggan terdaftar.
- **[Dirilis V1.2.0]** Penerapan manajemen migrasi skema basis data terstruktur (_Database Schema Migration_) menggunakan Alembic guna menjamin keutuhan data historis produksi.
- **[Dirilis V1.3.0]** Antarmuka **Dashboard Admin (`/admin`)** terproteksi RBAC yang menyajikan metrik **Analitik Penjualan Eksekutif** (_Gross Revenue_, Rasio Konversi Pesanan, Produk Terlaris, dan Peringatan Stok Menipis / _Low-Stock Alert_).
- **[Dirilis V1.3.0]** Modul Manajemen Katalog Visual (CRUD Produk & Galeri Multi-Gambar) dengan mekanisme pengarsipan non-destruktif (**_Soft-Delete_** melalui atribut `is_active`) guna menjaga integritas riwayat pesanan masa lalu.
- **[Dirilis V1.3.0]** Integrasi **_Cloud Object Storage_ (Supabase Storage / S3-Compatible Bucket)** untuk fitur unggah berkas gambar produk secara langsung (_Direct File Upload_) dengan validasi tipe MIME dan ukuran berkas.
- **[Dirilis V1.3.0]** Modul Manajemen Operasional & Pemenuhan Pesanan (_Order Fulfillment_) dengan _Finite State Machine_ status pesanan (`PENDING` ➔ `PAID` ➔ `SHIPPED` ➔ `COMPLETED`, serta `CANCELLED`).
- **[Ditambahkan V2.0.0 - Rilis Mayor]** Penambahan atribut dimensi berat fisik pada entitas produk (`weight_grams`) dan kalkulasi otomatis total bobot keranjang belanja.
- **[Ditambahkan V2.0.0 - Rilis Mayor]** Integrasi **Mesin Logistik 3PL Hibrida (_Dual-Mode Hybrid Logistics Adapter_)** yang menghubungkan sistem dengan penyedia API Ongkos Kirim eksternal (RajaOngkir API) dilengkapi mesin kalkulasi tarif zona geografis dan direktori Provinsi/Kota Indonesia bawaan (_Built-in Deterministic Fallback Engine_) guna menjamin ketersediaan layanan _checkout_ 100% (_Zero-Downtime_).
- **[Ditambahkan V2.0.0 - Rilis Mayor]** Perombakan rumus finansial inti (**_Zero-Trust Pricing + Shipping Cost Verification_**) di sisi server yang memvalidasi ulang tarif pengiriman berdasarkan kota tujuan, ekspedisi (`JNE`, `J&T`, `SiCepat`, `POS Indonesia`), layanan (`REG`, `YES/BEST`, `ECO/OKE`), dan pembulatan bobot kilogram ke atas sebelum menerbitkan tagihan Midtrans Snap.
- **[Ditambahkan V2.0.0 - Rilis Mayor]** Perluasan **Order State Machine V2** yang mewajibkan penyematan **Nomor Resi Pengiriman (`tracking_number`)** saat pesanan diubah menjadi `SHIPPED`, dilengkapi antarmuka **Lini Masa Pelacakan Paket Interaktif (_Interactive Parcel Tracking Timeline_)** bagi pelanggan.
- _Scope Exclusions_ (Di luar cakupan fase V2.0.0): Sistem ulasan dan peringkat bintang (_product review/rating_) oleh pelanggan, manajemen multi-gudang asal (_multi-origin warehouse allocation_), serta fitur obrolan langsung (_live chat_).

### 1.3 Karakteristik Lingkungan (Environmental Characteristics)

Sistem dibangun di atas arsitektur _Client-Server_ terpisah dengan spesifikasi lingkungan interaksi sebagai berikut:

- **Lingkungan Eksekusi Klien (Frontend):** Berjalan di peramban web modern (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge) pada perangkat _desktop_ dan _mobile_. Dikembangkan menggunakan kerangka kerja Next.js (React) dengan bahasa TypeScript dan dideploy pada jaringan komputasi tepi (Vercel).
- **Lingkungan Eksekusi Server (Backend):** Berjalan pada kontainer terisolasi berbasis Linux (Docker) atau lingkungan _Serverless/Cloud Compute_. Menggunakan kerangka kerja FastAPI (Python) yang menyediakan antarmuka RESTful API.
- **Sistem Manajemen Basis Data:** PostgreSQL (Supabase Managed Database / Docker Container) digunakan sebagai pangkalan data relasional utama untuk menjamin integritas transaksional (ACID), dilengkapi dengan **Alembic** sebagai mesin kontrol versi skema basis data.
- **Interaksi Sistem Eksternal:**
  1. Berkomunikasi dengan _Payment Gateway Server_ (Midtrans Snap) melalui protokol HTTPS/TLS 1.2+ menggunakan arsitektur _Webhook_ asinkron.
  2. Berkomunikasi dengan _Google Identity Services_ (OAuth 2.0 / OIDC Provider) untuk verifikasi token kriptografi autentikasi pengguna secara _server-to-server_.
  3. Berkomunikasi dengan layanan **_Cloud Object Storage_ (Supabase Storage API / AWS S3)** melalui protokol HTTPS untuk penyimpanan objek biner gambar produk dan penyajiannya melalui jaringan CDN publik.
  4. **[Ditambahkan V2.0.0]** Berkomunikasi dengan layanan **_Third-Party Logistics_ (3PL REST API - RajaOngkir)** melalui pola _Adapter_ dengan perlindungan _automatic fallback_ ke mesin direktori wilayah dan tarif internal apabila kuota API eksternal habis atau mengalami gangguan jaringan.

---

## BAB II: DESKRIPSI UMUM

### 2.1 Perspektif Produk (Product Perspective)

Sistem E-Commerce ini adalah produk mandiri dengan arsitektur berorientasi layanan (_service-oriented_). Pada rilis mayor **Versi 2.0.0**, sistem mencapai kematangan siklus hidup ritel digital secara utuh (_end-to-end e-commerce fulfillment_). Sistem tidak lagi memperlakukan pesanan hanya sebagai catatan pembayaran digital, melainkan mengintegrasikan variabel fisik logistik (bobot barang dalam gram, zona kota tujuan pengiriman, pilihan ekspedisi kurir, biaya ongkos kirim terverifikasi, dan pelacakan nomor resi pengiriman) ke dalam jantung mesin transaksi dan _Dashboard_ Operasional Admin.

### 2.2 Karakteristik Pengguna (User Classes)

Sistem pada Versi 2.0.0 diakses oleh tiga kelas pengguna utama dengan pemisahan hak akses yang tegas:

1. **Pelanggan Tamu (Guest Customer):**
   - _Karakteristik:_ Pengguna internet umum yang ingin berbelanja secara cepat tanpa membuat akun. Membutuhkan proses _checkout_ yang transparan dan minimal gesekan (_frictionless_).
   - _Fungsi:_ Melihat katalog produk aktif (`is_active = true`), galeri multi-gambar, dan berat satuan produk; menambah item ke keranjang; memilih Provinsi, Kota/Kabupaten tujuan, serta layanan ekspedisi pengiriman untuk melihat ongkos kirim secara _real-time_; melakukan pembayaran total (barang + ongkir); serta melacak status dan perjalanan resi pesanan sesi terakhirnya.
2. **Pelanggan Terdaftar (Registered Customer) [Diperbarui V2.0.0]:**
   - _Karakteristik:_ Pengguna yang telah melakukan registrasi akun via email/kata sandi atau login menggunakan akun Google (SSO). Memiliki peran sistem `CUSTOMER`.
   - _Fungsi:_ Memiliki seluruh hak akses Pelanggan Tamu, ditambah kemampuan _smart auto-fill_ informasi pengiriman lengkap (termasuk penyimpanan preferensi Provinsi, Kota/Kabupaten tujuan, dan Kode Pos bawaan), mengaitkan pesanan langsung ke ID akunnya (`user_id`), menyalin nomor resi pengiriman (`tracking_number`), serta memantau **Lini Masa Pelacakan Paket (_Parcel Tracking Timeline_)** pada halaman Riwayat & Detail Pesanan (`/orders/history` dan `/orders/[id]`). Pengguna kelas ini **dilarang keras** mengakses rute `/admin/*`.
3. **Administrator Sistem / Operasional Toko (Store Administrator) [Diperbarui V2.0.0]:**
   - _Karakteristik:_ Pengelola operasional toko dan staf manajemen inventaris/logistik yang terautentikasi dengan klaim otorisasi peran `ADMIN` di dalam token JWT serta basis data.
   - _Fungsi:_ Mengakses **Dashboard Admin (`/admin`)**, memantau metrik analitik pendapatan dan peringatan stok menipis, menambah/mengubah/mengarsipkan produk beserta pengaturan **berat fisik produk (`weight_grams`)**, mengunggah foto produk ke _Cloud Object Storage_, serta memproses pengiriman pesanan pelanggan dengan menginput atau men-_generate_ **Nomor Resi (`tracking_number`)** saat mengubah status pesanan dari `PAID` ➔ `SHIPPED` ➔ `COMPLETED`.

### 2.3 Batasan Desain & Implementasi (Design & Implementation Constraints)

- **Pemisahan Entitas (Decoupling):** Frontend (Next.js) dan Backend (FastAPI) tidak boleh berada dalam satu wadah proses (_monolith_). Keduanya harus berkomunikasi murni melalui JSON API _payloads_, `multipart/form-data`, dan _HTTP Headers/Cookies_.
- **Bahasa Pemrograman:** Lapisan presentasi (Frontend) wajib menggunakan TypeScript untuk _type safety_ ketat. Lapisan logika bisnis (Backend) diwajibkan menggunakan Python 3.10+.
- **Integritas Relasional, Migrasi Skema & Larangan Hard-Delete Katalog:** Data pengguna, produk, galeri gambar, dan transaksi finansial/logistik wajib disimpan dalam basis data relasional (PostgreSQL). Seluruh perubahan struktur tabel wajib dikelola melalui skrip migrasi **Alembic** secara non-destruktif. Penghapusan katalog oleh Admin wajib diimplementasikan sebagai **_Soft-Delete_** (`is_active = FALSE`).
- **Verifikasi Ongkos Kirim Sisi Server (Zero-Trust Shipping Cost) [Ditambahkan V2.0.0]:** _Backend_ FastAPI dilarang mempercayai nominal rupiah ongkos kirim yang dikirim mentah oleh klien (_frontend_). _Backend_ wajib menghitung ulang total berat keranjang dari tabel `products.weight_grams` dan memverifikasi tarif resmi layanan kurir berdasarkan `shipping_city_id`, `courier_code`, dan `courier_service` di sisi server sebelum menjumlahkannya ke `total_amount`.
- **Ketahanan Layanan Logistik (Fault-Tolerant 3PL Adapter) [Ditambahkan V2.0.0]:** Kegagalan jaringan atau habisnya kuota pada API logistik eksternal (RajaOngkir) **tidak boleh** menghentikan kemampuan pelanggan untuk melakukan _checkout_. Modul logistik wajib memiliki _Built-in Deterministic Wilayah & Tariff Fallback Engine_ yang mengambil alih perhitungan secara otomatis dan transparan.
- **Kompatibilitas Mundur (Backward Compatibility) [Diperbarui V2.0.0]:** Penambahan kolom logistik pada tabel `orders` dan `products` wajib menyertakan nilai bawaan (`server_default`) yang aman (misal: `weight_grams = 1000`, `shipping_cost = 0`) agar seluruh data produk dan riwayat transaksi historis dari V1.0 hingga V1.3 tetap valid dan dapat diakses tanpa _error_.

---

## BAB III: KEBUTUHAN FUNGSIONAL

Kebutuhan fungsional dikelompokkan berdasarkan modul utama perangkat lunak.

### 3.1 Modul Manajemen Katalog & Multi-Gambar (Klien & API)

- **F-CAT-01: Pengambilan Daftar Produk Aktif (Active Product Listing Retrieval)**
  - **Deskripsi:** Sistem (Next.js) harus dapat mengambil dan menampilkan daftar produk yang berstatus aktif secara dinamis dari API dengan menyertakan gambar utama (_primary image_) dan informasi stok.
  - **Proses:** _Backend_ memanggil _query_ dari tabel `products` dengan filter wajib `Product.is_active == True` beserta relasinya di `product_images` di PostgreSQL menggunakan teknik _Eager Loading_ (`selectinload`) untuk menghindari masalah _N+1 Query_.
  - **Output:** Grid produk aktif di layar klien yang menampilkan Gambar Utama (`is_primary = true` atau _fallback_ `image_url`), Nama Produk, Stok Tersedia, dan Harga.
- **F-CAT-02: Pengambilan Detail Produk, Spesifikasi Berat & Galeri Multi-Gambar [Diperbarui V2.0.0]**
  - **Deskripsi:** Sistem harus menampilkan informasi mendalam, spesifikasi berat fisik produk, beserta koleksi gambar dari berbagai sudut pandang saat pengguna memilih satu produk aktif spesifik.
  - **Proses:** API melakukan pencarian produk berdasarkan `product_id` (memastikan `is_active == True` untuk akses publik) dan memuat seluruh baris terkait pada tabel `product_images` yang diurutkan berdasarkan atribut `is_primary DESC, display_order ASC`.
  - **Output:** Halaman detail produk yang memuat komponen Galeri Gambar Interaktif (1 gambar pratinjau utama berukuran besar dan deretan _thumbnail_ yang dapat diklik), Nama Produk, Harga, **Berat Satuan Produk (`weight_grams` dalam format gram/kilogram)**, Deskripsi Lengkap, dan Jumlah Stok tersisa.

### 3.2 Modul Keranjang Belanja (Shopping Cart)

- **F-CRT-01: Tambah Item ke Keranjang & Akumulasi Berat [Diperbarui V2.0.0]**
  - **Deskripsi:** Sistem memungkinkan pengguna memasukkan produk yang dilihat ke dalam sesi keranjang sementara beserta referensi gambar utama dan berat satuannya (`weight_grams`).
  - **Proses:** Logika frontend (via _Zustand_) memvalidasi apakah kuantitas yang diminta melebihi sisa stok yang ditampilkan dan menampilkan umpan balik _Toast notification_.
- **F-CRT-02: Modifikasi, Penghapusan Item & Perhitungan ulang Bobot Total [Diperbarui V2.0.0]**
  - **Deskripsi:** Pengguna dapat mengubah jumlah produk yang akan dibeli atau menghapusnya dari daftar.
  - **Output:** Perhitungan ulang otomatis (_real-time recalculation_) untuk **Subtotal Harga Barang**, **Total Berat Keranjang ($\sum q_i \times w_i$ dalam gram/kg)**, serta penyesuaian otomatis **Biaya Ongkos Kirim** apabila kota tujuan dan kurir telah dipilih.

### 3.3 Modul Checkout & Manajemen Pemesanan

- **F-ORD-01: Pemrosesan Keranjang Hibrida & Pemilihan Layanan Pengiriman [Diperbarui V2.0.0]**
  - **Deskripsi:** Sistem meninjau _state_ keranjang dan meminta informasi alamat tujuan serta pilihan layanan ekspedisi dari pembeli, baik sebagai tamu maupun pelanggan yang sedang login.
  - **Proses:**
    1. Jika pengguna berstatus **Login (Authenticated)**, sistem secara otomatis mengisi awal (_smart auto-fill_) kolom Nama Lengkap, Email, Nomor Telepon, Provinsi, Kota/Kabupaten Tujuan, Kode Pos, dan Alamat Lengkap berdasarkan profil pengiriman tersimpan milik pengguna.
    2. Pengguna memilih Provinsi dan Kota/Kabupaten tujuan serta memilih Ekspedisi Kurir (`JNE`, `J&T`, `SiCepat`, `POS`) dan layanan pengiriman yang diinginkan (misal: `REG`, `YES/BEST`, `ECO`).
    3. Validasi _regex_ via _Zod_ di frontend memeriksa format email, nomor telepon angka, kelengkapan kota/alamat/kurir, dan menolak karakter tag HTML (`<` atau `>`) untuk mencegah XSS.
- **F-ORD-02: Inisiasi Transaksi Finansial & Verifikasi Ongkir Zero-Trust [Diperbarui V2.0.0]**
  - **Deskripsi:** _Backend_ menerima permintaan _checkout_, memverifikasi stok, harga barang, dan tarif ongkos kirim secara tertutup di server, menyimpan pesanan beserta metadata logistik, dan meminta token dari _Payment Gateway_.
  - **Proses:**
    1. API memeriksa keberadaan _Bearer Token_ JWT secara opsional (`get_optional_user`) untuk mengaitkan `user_id` jika pelanggan sedang login.
    2. API mengunci baris produk di PostgreSQL (_Pessimistic Locking_ via `.with_for_update()`), memastikan `is_active == True`, menghitung ulang subtotal barang ($\sum q_i \times p_i$), serta menghitung total berat fisik keranjang ($W_{\text{total}} = \sum q_i \times w_i$).
    3. API memanggil modul logistik internal/3PL untuk memverifikasi tarif `shipping_cost` dan estimasi tiba (`shipping_etd`) berdasarkan `shipping_city_id`, `courier_code`, `courier_service`, dan $W_{\text{total}}$, lalu menetapkan $\text{total\_amount} = \text{subtotal} + \text{shipping\_cost}$.
    4. API menyimpan _header_ pesanan ke tabel `orders` (lengkap dengan rincian kota tujuan, kurir, layanan, berat total, dan ongkos kirim) serta detail item ke tabel `order_items` dengan status `PENDING`.
    5. API memanggil layanan Midtrans Snap dengan menyertakan daftar item produk ditambah _item_ biaya pengiriman (`"id": "SHIPPING-FEE"`) sehingga `gross_amount` Midtrans sama persis dengan `total_amount`.
- **F-ORD-03: Webhook Pembayaran & Penguncian Stok (Payment Webhook & Stock Mutation)**
  - **Deskripsi:** Mekanisme asinkron penerimaan notifikasi konfirmasi status transaksi dari Midtrans.
  - **Proses:**
    1. API memverifikasi keaslian _signature key_ (SHA-512) dan memeriksa _idempotency_ status pesanan.
    2. Jika pembayaran sukses (`settlement` / `capture`), status pesanan diubah menjadi `PAID`. Jika gagal/dibatalkan (`cancel` / `deny` / `expire`), status diubah menjadi `CANCELLED` dan stok produk dikembalikan (_rollback stock_) ke tabel `products`.
- **F-ORD-04: Riwayat, Rincian Logistik & Pelacakan Resi Pesanan Pelanggan [Diperbarui V2.0.0]**
  - **Deskripsi:** Pelanggan dapat melihat daftar seluruh transaksi miliknya beserta rincian kurir, biaya ongkos kirim, nomor resi, dan lini masa pergerakan paket.
  - **Proses:** Frontend memanggil `GET /api/v1/orders/me` (untuk daftar riwayat) dan `GET /api/v1/orders/{id}` serta `GET /api/v1/logistics/track/{id}` (untuk detail pesanan dan manifes pelacakan resi).
  - **Output:** Kartu dan halaman detail pesanan yang menampilkan rincian Subtotal Barang, Ongkos Kirim, Total Pembayaran, Nama Ekspedisi & Layanan, **Nomor Resi (`tracking_number`)** dengan fitur salin cepat (_Copy to Clipboard_), serta **Visual Tracking Timeline** tahapan perjalanan paket.

### 3.4 Modul Manajemen Identitas & Akses / IAM

- **F-IAM-01 s.d. F-IAM-05:** Mencakup Registrasi Pelanggan Baru dengan Bcrypt (`F-IAM-01`), Login Kredensial Lokal & Penerbitan Dual-Token JWT (`F-IAM-02`), Autentikasi Google SSO OIDC (`F-IAM-03`), Silent Token Refresh & Logout dengan Isolasi Sesi (`F-IAM-04`), serta RBAC Middleware `require_role("ADMIN")` (`F-IAM-05`).

### 3.5 Modul Dashboard Admin & CMS Internal

- **F-ADM-01: Analitik Eksekutif Penjualan & Peringatan Stok (Executive Sales & Inventory Analytics)**
  - **Deskripsi:** Menampilkan metrik _Gross Revenue_, Total Pesanan & Rasio Konversi, Distribusi Status Pesanan, _Low-Stock Alert_ ($\le 5$ unit), dan 5 Produk Terlaris di `/admin`.
- **F-ADM-02: Manajemen Katalog Produk, Berat Fisik & Soft-Delete [Diperbarui V2.0.0]**
  - **Deskripsi:** Administrator dapat menambahkan produk baru, memperbarui harga, stok, galeri gambar, serta **berat satuan produk dalam gram (`weight_grams`)**, atau mengarsipkan produk (`is_active = FALSE`) di `/admin/products`.
- **F-ADM-03: Unggah Gambar Awan & Manajemen Galeri Multi-Gambar**
  - **Deskripsi:** Unggah foto produk langsung ke _Public Bucket_ `product-images` di Supabase Storage dengan validasi MIME dan batas ukuran 5 MB.
- **F-ADM-04: Manajemen Operasional Pesanan & Penerbitan Nomor Resi (Order Fulfillment FSM V2) [Diperbarui V2.0.0]**
  - **Deskripsi:** Administrator dapat memantau seluruh pesanan pelanggan beserta kurir/layanan yang dipilih pelanggan, dan menerbitkan **Nomor Resi (`tracking_number`)** saat mengirim barang.
  - **Proses:**
    1. Saat Admin mengubah status pesanan dari `PAID` menjadi `SHIPPED` melalui `PATCH /api/v1/admin/orders/{id}/status`, sistem mewajibkan pengisian `tracking_number` (atau menghasilkan nomor resi standar kurir secara otomatis jika diminta) dan mencatat stempel waktu `shipped_at = NOW()`.
    2. Saat paket telah tiba, Admin dapat mengubah status dari `SHIPPED` menjadi `COMPLETED` yang mencatat stempel waktu `completed_at = NOW()`.

### 3.6 Modul Logistik Pihak Ketiga (3PL), Kalkulasi Ongkir & Pelacakan Resi [Ditambahkan V2.0.0]

- **F-LOG-01: Penyediaan Direktori Wilayah Geografis (Provinces & Cities Directory)**
  - **Deskripsi:** Sistem menyediakan daftar Provinsi dan Kota/Kabupaten di Indonesia sebagai referensi alamat tujuan pengiriman pelanggan.
  - **Proses:** Klien memanggil `GET /api/v1/logistics/provinces` dan `GET /api/v1/logistics/cities?province_id={id}`. _Backend_ mengambil data dari _Adapter_ RajaOngkir atau repositori wilayah nasional internal yang di-cache di memori server.
  - **Output:** Daftar terstruktur Provinsi dan Kota/Kabupaten beserta tipe wilayah (`Kota` / `Kabupaten`) dan kode pos bawaan.
- **F-LOG-02: Kalkulasi Tarif Ongkos Kirim Dinamis Multi-Kurir (Dynamic Shipping Rate Calculation)**
  - **Deskripsi:** Sistem menghitung biaya pengiriman dari kota gudang asal toko (Jakarta Pusat) ke kota tujuan pelanggan berdasarkan bobot total keranjang dan ekspedisi yang dipilih.
  - **Proses:**
    1. Klien mengirimkan `destination_city_id`, `weight_grams`, dan `courier_code` (`jne`, `jnt`, `sicepat`, `pos`) ke `POST /api/v1/logistics/rates`.
    2. Sistem membulatkan berat ke atas dalam satuan kilogram ($\text{ chargeable\_kg} = \max(1, \lceil \text{weight\_grams} / 1000 \rceil)$).
    3. Sistem mengambil daftar layanan yang tersedia (Ekonomis, Reguler, kilat/Next Day) dari penyedia 3PL (atau _Deterministic Zone-Based Tariff Engine_ jika dalam mode _fallback_).
  - **Output:** Daftar layanan pengiriman beserta nama layanan (`service`), deskripsi, tarif ongkos kirim dalam Rupiah (`cost`), dan estimasi waktu tiba (`etd`, misal: `"2-3 Hari"`).
- **F-LOG-03: Penerbitan & Validasi Nomor Resi Pengiriman (Airwaybill / Tracking Number Management)**
  - **Deskripsi:** Setiap pesanan yang memasuki status pengiriman (`SHIPPED`) wajib memiliki nomor resi unik sesuai format ekspedisi yang dipilih pelanggan.
  - **Proses:** Sistem memvalidasi input `tracking_number` dari Admin (alfanumerik, strip, tanpa karakter XSS) dan menyimpannya ke kolom `orders.tracking_number`.
- **F-LOG-04: Simulasi & Pelacakan Manifes Perjalanan Paket (Parcel Tracking Manifest & Timeline)**
  - **Deskripsi:** Pelanggan dan Admin dapat memantau riwayat pergerakan paket secara kronologis berdasarkan nomor resi dan status pesanan.
  - **Proses:** Klien memanggil `GET /api/v1/logistics/track/{order_id}`. Sistem memverifikasi hak akses pesanan dan menyusun daftar titik pemeriksaan (_checkpoints_ / _manifest logs_) yang sinkron dengan kota asal (Jakarta), kota tujuan pelanggan (`shipping_city_name`), kurir (`courier_code`), nomor resi (`tracking_number`), serta tahapan status pesanan (`PAID`, `SHIPPED`, `COMPLETED`).
  - **Output:** Objek pelacakan resi yang berisi ringkasan ekspedisi dan deretan kronologis riwayat perjalanan paket lengkap dengan lokasi, waktu, dan deskripsi status.

---

## BAB IV: KEBUTUHAN ANTARMUKA EKSTERNAL

### 4.1 Antarmuka Pengguna (User Interfaces)

Antarmuka pengguna didesain menggunakan paradigma responsif dengan prinsip _Clean Minimalist_ dan konsistensi identitas visual **"Tech Violet"** (`#6D28D9`).

- **Komponen Antarmuka Storefront & Logistik Baru [Ditambahkan V2.0.0]:**
  - **Indikator Berat Produk (`/product/[id]` & `/cart`):** Menampilkan lencana berat satuan produk (misal: `Berat: 650 gr`) di halaman detail produk serta total akumulasi berat belanjaan (misal: `Total Berat: 1.300 gr (2 kg)`) di halaman keranjang.
  - **Pemilih Wilayah & Layanan Kurir Interaktif (`/cart`):** Dropdown pemilihan **Provinsi** dan **Kota/Kabupaten Tujuan**, pemilih **Kurir Ekspedisi** (`JNE`, `J&T Express`, `SiCepat`, `POS Indonesia`), serta kartu radio pilihan **Layanan & Tarif Ongkir** (menampilkan harga ongkir dan estimasi hari pengiriman).
  - **Ringkasan Tagihan Transparan (`/cart`):** Menampilkan rincian **Subtotal Harga Barang**, **Biaya Pengiriman (Kurir - Layanan)**, dan **Total Tagihan Akhir** sebelum tombol bayar ditekan.
  - **Komponen Lini Masa Pelacakan Paket (`Parcel Tracking Timeline` di `/orders/[id]` & `/orders/history`):** Menampilkan kotak informasi ekspedisi, Nomor Resi dengan tombol **"Salin Resi"**, serta diagram vertikal (_stepper timeline_) tahapan perjalanan paket dari gudang hingga tiba di kota tujuan.
- **Komponen Antarmuka Administratif Baru [Diperbarui V2.0.0]:**
  - **Input Berat Produk pada Modal Produk (`/admin/products`):** Kolom input numerik **Berat Produk (Gram)** saat Admin menambah atau mengedit produk.
  - **Modal Input & Generator Nomor Resi (`/admin/orders`):** Saat Admin mengklik tombol **"Kirim Barang (`SHIPPED`)"**, antarmuka menampilkan input **Nomor Resi Pengiriman** dilengkapi tombol pintar **"Generate Resi Otomatis"** sesuai kurir pesanan tersebut.

### 4.2 Antarmuka Perangkat Lunak (Software Interfaces)

- **SI-01: Komunikasi Frontend (Next.js) ke Backend API (FastAPI):** RESTful JSON & Multipart melalui HTTP/HTTPS.
- **SI-02: Koneksi API ke Basis Data (PostgreSQL):** TCP/IP port 5432 via SQLAlchemy ORM & Alembic.
- **SI-03: Integrasi API Payment Gateway (Midtrans Snap):** HTTPS POST dengan penyertaan _item_ ongkos kirim di dalam `item_details` dan verifikasi Webhook SHA-512.
- **SI-04: Integrasi Layanan Identitas Google (Google OAuth 2.0 / OIDC):** Verifikasi `id_token` RS256.
- **SI-05: Integrasi Cloud Object Storage (Supabase Storage REST API):** Unggah biner gambar produk ke bucket publik `product-images`.
- **SI-06: Integrasi Layanan Logistik 3PL Hibrida (RajaOngkir API / Built-in Engine) [Ditambahkan V2.0.0]:**
  - **Protokol:** HTTPS GET/POST menggunakan `httpx` ke _endpoint_ RajaOngkir (`/province`, `/city`, `/cost`) dengan _header_ `key: <RAJAONGKIR_API_KEY>`, dilengkapi peralihan otomatis (_seamless failover_) ke mesin direktori dan kalkulasi tarif internal apabila kunci API tidak dikonfigurasi atau layanan eksternal tidak merespons.

---

## BAB V: KEBUTUHAN NON-FUNGSIONAL (NON-FUNCTIONAL REQUIREMENTS)

### 5.1 Kinerja & Skalabilitas (Performance & Scalability Requirements)

- **NF-PER-01: Waktu Muat Awal (Initial Page Load):** Lapisan antarmuka (Next.js) harus mencapai _First Contentful Paint_ (FCP) di bawah 1,5 detik.
- **NF-PER-02: Waktu Respons API, Eager Loading & Caching Direktori Wilayah [Diperbarui V2.0.0]:** Rata-rata waktu respons untuk pemanggilan _endpoint_ katalog, analitik, dan daftar Provinsi/Kota harus berada di bawah 250 ms. Data referensi Provinsi dan Kota wajib disimpan dalam memori _in-memory cache_ server untuk menghindari latensi panggilan jaringan berulang.
- **NF-PER-03: Konkurensi (Concurrency Handling):** _Web server_ FastAPI dan PostgreSQL harus mampu memproses setidaknya 100 RPS.

### 5.2 Keamanan & Privasi (Security & Privacy Requirements)

- **NF-SEC-01 s.d. NF-SEC-09:** Mencakup Enkripsi HTTPS/TLS 1.2+ (`NF-SEC-01`), Validasi Anti-XSS & SQLi via Zod/Pydantic (`NF-SEC-02`), Verifikasi Signature SHA-512 Midtrans (`NF-SEC-03`), Kebijakan CORS Ketat (`NF-SEC-04`), Rate Limiting (`NF-SEC-05`), Hashing Kredensial Bcrypt (`NF-SEC-06`), Keamanan JWT Dual-Token & Isolasi Sesi (`NF-SEC-07`), Verifikasi Zero-Trust Google OIDC (`NF-SEC-08`), serta Keamanan Unggah Berkas & Isolasi Kunci Storage (`NF-SEC-09`).
- **NF-SEC-10: Pencegahan Manipulasi Biaya Ongkos Kirim (Anti-Shipping Fee Tampering) [Ditambahkan V2.0.0]:**
  - Sistem **dilarang keras** menggunakan angka nominal ongkos kirim dari _request body_ klien sebagai dasar penagihan.
  - _Backend_ wajib menghitung ulang berat total pesanan dari tabel `products` dan memverifikasi tarif resmi layanan kurir di sisi server untuk mencegah serangan manipulasi harga (_Parameter Tampering Attack_).
  - Kunci `RAJAONGKIR_API_KEY` wajib disimpan secara rahasia di lingkungan server _Backend_ FastAPI dan tidak boleh diekspos ke _Frontend_.

### 5.3 Keselamatan & Keandalan (Safety & Reliability Requirements)

- **NF-SFT-01 s.d. NF-SFT-05:** Mencakup Integritas Transaksional ACID (`NF-SFT-01`), Kebijakan Restart Kontainer (`NF-SFT-02`), Degradasi Elegan (`NF-SFT-03`), Evolusi Skema Non-Destruktif via Alembic (`NF-SFT-04`), serta Integritas Historis via Soft-Delete & Order FSM (`NF-SFT-05`).
- **NF-SFT-06: Ketahanan Layanan Logistik Tanpa Henti (Zero-Downtime Logistics Fallback) [Ditambahkan V2.0.0]:** Apabila layanan API pihak ketiga (RajaOngkir) mengalami gangguan (_timeout_, kuota habis, atau _HTTP 5xx_), modul _Logistics Adapter_ di _Backend_ wajib beralih secara otomatis dalam waktu $< 50\text{ ms}$ ke algoritma tarif zona internal sehingga proses _checkout_ pelanggan tidak pernah gagal akibat ketergantungan eksternal.
