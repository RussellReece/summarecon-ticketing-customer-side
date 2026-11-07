Style Guide · Bandung Build Challenge 2026

# Summarecon Ticketing

Bahasa visual untuk sistem tiket event di Summarecon Mall Bandung: hangat, jelas, dan meyakinkan saat memilih kursi.\
Versi revisi: mengikuti Dokumen Analisis Final dan Blueprint Venue (6 November 2026).

## 1. Konsep

Logo Summarecon berbentuk kelopak teratai yang mengembang dengan gradasi merah-jingga. Kami mengambil bentuk itu sebagai inspirasi: sudut membulat, gradasi hangat, dan satu warna aksi yang tegas. Warna utama digeser ke **merah vermilion** agar lebih berani dan tidak sama dengan oranye brand aslinya.

**Hangat**\
Merah-jingga, latar krem, sudut membulat.

**Jelas**\
Status kursi dibedakan warna, bentuk, dan label.

**Tepercaya**\
Teks gelap berkontras tinggi, informasi harga selalu terlihat.

**Mobile-first**\
Target sentuh minimal 48 px.

## 2. Warna

Satu warna aksi (Vermilion), satu warna pendamping (Saffron), netral berwarna plum-hangat, dan warna fungsional untuk status.

Aa

**Vermilion**`#D93A2F`\
Primary, tombol, kursi dipilih

Aa

**Garnet**`#8C1F2B`\
Teks di atas tint, hover

Aa

**Saffron**`#F4A23B`\
Aksen, highlight, promo

Aa

**Blush**`#FDE9E4`\
Tint, chip, latar lembut

Aa

**Krem**`#FFF8F5`\
Latar halaman

Aa

**Plum Ink**`#2A1F2D`\
Teks utama, mode gelap

### Gradasi tanda tangan

`135°: #D93A2F → #EE6A35 → #F4A23B` · Dipakai untuk hero, header tiket, dan panggung seat map. Jangan dipakai untuk teks kecil.

### Status kursi dan kuota

Aa

**Tersedia**`#1F8F7E`\
AVAILABLE · dapat dipilih

⋯

**Ditahan**`#E9A12B`\
LOCKED · 10 menit sejak isi data

✕

**Terjual**`#6B5A6E`\
SOLD · plum gelap + ✕

**Diblokir**`arsiran abu`\
BLOCKED · oleh panitia

✓

**Dipilih**`#D93A2F`\
Pilihan pengguna

!

**Error / Gagal**`#B3261E`\
Hanya untuk kegagalan

Empat status inventori mengikuti dokumen final (tersedia, ditahan, terjual, diblokir). Terjual tidak lagi memakai abu terang dan merah dipertahankan untuk pilihan pengguna, sehingga tidak ada dua status yang tampak sama. Setiap status juga punya simbol (✕, ⋯, arsiran, ✓) agar terbaca tanpa warna.

Area **Book by Quota** dan **Standing** tidak punya status per kursi. Tampilkan angka terisi/kapasitas, misalnya **16/50**, dengan batang progres: di bawah 80% teal, 80–99% amber, 100% plum gelap dan tombol nonaktif.

## 3. Tipografi

Wordmark Summarecon memakai sans-serif humanis semi-bold dengan huruf bulat dan terbuka, serta tagline BANDUNG berhuruf kapital renggang. **Plus Jakarta Sans** paling dekat karakternya dan gratis (Google Fonts), dipasangkan dengan **DM Sans** untuk teks bacaan.

Display · Plus Jakarta Sans ExtraBold 800 · 40/44

# Pilih kursimu

Heading 1 · Plus Jakarta Sans Bold 700 · 28/34

## Konser Akustik Bandung

Heading 2 · Plus Jakarta Sans SemiBold 600 · 20/28

### Kategori tiket

Body · DM Sans Regular 400 · 16/24Pilih kursi pada denah. Kursi ditahan 10 menit setelah kamu masuk ke langkah isi data.

Caption · DM Sans Medium 500 · 13/18Harga sudah termasuk pajak

Overline · Plus Jakarta Sans SemiBold · 12 · tracking 0.3em · KAPITAL (meniru tagline BANDUNG)**SUMMARECON MALL · BANDUNG**

## 4. Bentuk dan Jarak

**Radius**\
Kartu 16 · Tombol penuh (pill) · Kursi 8/8/5/5 · Tiket 20

**Spasi**\
Skala 4 · 8 · 12 · 16 · 24 · 32 · 48

**Bayangan**\
`0 6px 24px rgba(140,31,43,.10)` bayangan bernuansa merah, bukan abu

**Ikon**\
Garis 1.75 px, ujung membulat, satu gaya konsisten

## 5. Komponen

### Tombol

### Badge status

Terbayar Menunggu pembayaran Kedaluwarsa Refund diproses

### Denah per venue (sesuai blueprint)

Tiga venue dari blueprint: V1 Downtown Walk, V2 Atrium (Cibadak, Cileutik, atau Ciunik), dan V3 Sawarga Courtyard. Setiap denah mengikuti susunan di blueprint: panggung dan backstage di atas, section di tengah, lalu jalur sirkulasi dan fasilitas di bawah. Ganti venue, pilih kursi atau kuota, lalu jalankan alur pemesanan sampai e-ticket.

TersediaDitahanTerjualDiblokirPilihanmu

Alur waktu: memilih kursi belum mengunci apa pun. Kursi ditahan 10 menit saat pengguna masuk ke langkah isi data, lalu pembayaran QRIS sandbox diberi waktu maksimal 7 menit. Angka kursi dan kuota hanya contoh data prototype, bukan kapasitas resmi.

### E-ticket (satu QR per order)

E-TICKET · ORD-2026-001

### Konser Akustik Bandung

Sab, 14 Nov 2026 · 19.00 · Sawarga Courtyard

Sari A. · A07SUDAH MASUK

Budi P. · A08BELUM MASUK

Dewi R. · A09BELUM MASUK

**Scan 1/3**

Satu QR untuk seluruh tiket dalam order. Dikirim juga lewat WhatsApp.

### Hasil check-in panitia

✓ Valid · Scan 1/3 · ORD-2026-001

✓ Valid · Scan 3/3 · QR kini habis

! Batas scan tercapai · 3/3

✕ Bukan tiket untuk event ini

✕ Tiket tidak berlaku · refund atau event dibatalkan

Batas scan mengikuti jumlah tiket valid. Order 3 tiket dengan 1 refund hanya dapat dipakai 2 orang, dan layar menampilkan sisa yang valid.

## 6. Suara dan Prinsip

**Lakukan**

- Satu tombol utama Vermilion per layar.
- Tampilkan harga dan sisa waktu tahan kursi selalu terlihat.
- Bahasa ramah dan singkat: "Kursi ditahan 10 menit".
- Gunakan latar krem, bukan putih murni, untuk halaman utama.

**Hindari**

- Merah untuk status "tersedia" atau "berhasil".
- Gradasi di belakang teks kecil.
- Lebih dari dua ketebalan huruf dalam satu kartu.
- Menyalin logo Summarecon untuk logo aplikasi. Gunakan nama dan lockup sendiri.

Catatan: logo dan nama Summarecon milik pemiliknya. Pada prototype, tampilkan sebagai konteks lokasi acara, bukan sebagai identitas produk tim.

## 7. Ilustrasi Kelopak

Satu bentuk dasar: kelopak ramping dengan ujung runcing, disusun menjadi kipas seperti logo Summarecon. Bentuk ini dipakai berulang sebagai ikon merek, pola latar, denah melengkung, loader, dan ilustrasi status.

**Kipas Kelopak**Penanda merek, favicon, splash screen

**Pola Kelopak**Latar kartu, header e-ticket, onboarding

**Denah Melengkung**Seat map ruang konser dengan panggung berbentuk busur

**Pembayaran Berhasil**Kelopak mekar di sekitar tanda centang

**Belum Ada Tiket**Kuncup tertutup untuk keadaan kosong

**Loader Mekar**Saat antrean booking dan menunggu pembayaran

Aturan: ilustrasi memakai gradasi tanda tangan atau garis tipis 2–2.5 px, tidak lebih dari satu ilustrasi besar per layar, dan selalu di belakang atau di samping konten, bukan menutupi denah kursi.

## 8. Referensi 21st.dev dan Awwwards

Pola dari 21st.dev (komponen React dan Tailwind) diterjemahkan ke bahasa visual Kelopak. Prinsip dari situs pemenang Awwwards dipakai secukupnya, karena fokus challenge adalah kejelasan alur pilih kursi.

Konser*✿*Seminar*✿*Pameran*✿*Workshop*✿*Festival*✿*Konser*✿*Seminar*✿*Pameran*✿*Workshop*✿*Festival*✿*

Tiket terjual

0

72% dari kuota

Sisa waktu isi data

10:00

Kursi ditahan 10 menit sejak langkah isi data; bayar maks. 7 menit

**Tombol Shimmer**Kilau hanya pada CTA utama.

**Kartu Spotlight**

Gerakkan kursor atau jari di kartu ini: cahaya Vermilion mengikuti. Cocok untuk kartu kategori tiket (Gold, Silver, Reguler).

### Dari referensi ke komponen kita

| Sumber | Pola | Dipakai untuk |
| --- | --- | --- |
| 21st.dev | Spotlight Card, Cards and Grids | Kartu kategori tiket dan ringkasan dashboard panitia (bento) |
| 21st.dev | Shimmer atau Gradient Button | Satu CTA utama: Beli Tiket, Bayar |
| 21st.dev | Background Paths, Gradients, Shaders | Hero dan splash: kelopak bergerak lambat, bukan shader berat |
| 21st.dev | Marquee | Pita kategori acara di halaman beranda |
| 21st.dev | Number Ticker, Stats | Angka tiket terjual, pendaftar, kehadiran |
| 21st.dev | Steppers, Progress, Docks | Langkah booking (Kursi, Data, Bayar, E-ticket) dan navigasi bawah di ponsel |
| Awwwards | Tipografi besar dan ruang kosong luas | Judul acara dan angka kunci berukuran besar |
| Awwwards | Gerak saat scroll, tekstur halus | Elemen muncul perlahan, grain tipis di latar |
| Awwwards | Interaksi mikro | Kursi membesar saat dipilih, kelopak mekar saat sukses |

**Batas gerak**

- Durasi 150–700 ms, easing lembut.
- Hormati pengaturan prefers-reduced-motion.
- Gerak dekoratif hanya di hero dan keadaan kosong.

**Jangan di halaman pilih kursi**

- Shader, parallax, atau kursor kustom.
- Animasi yang menunda klik atau membuat kursi bergeser.
- Efek yang menyembunyikan status kursi.

Catatan implementasi: komponen 21st.dev berbasis React dan Tailwind. Di halaman ini semuanya ditulis ulang dengan CSS biasa agar ringan. Jika prototype final memakai React, ambil strukturnya dari 21st.dev dan ganti warna dengan token pada style guide ini.

## 9. Referensi Tambahan: Mana yang Dipakai

Tujuh referensi dinilai dari struktur dan interaksinya, bukan warna. Ukuran penilaian: apakah membantu orang memilih kursi dan menerima e-ticket, apakah membantu panitia, dan apakah cocok dengan suasana mal yang hangat dan ramah keluarga.

| Referensi | Ambil | Lewati |
| --- | --- | --- |
| **Eventbux** (event, ungu) | Kartu pemesanan melayang (jadwal, tombol, kebijakan refund), kartu jenis tiket, bilah filter di hero, kartu event dengan lencana harga dan blok tanggal | Tumpukan kartu yang saling menimpa, terlalu ramai di layar kecil |
| **Edujar** (kursus, gelap) | Kolom pencarian bentuk pil, tab kategori segmen, deretan sponsor | Ilustrasi 3D dan tokoh, tema gelap penuh |
| **Easy Study** (hangat) | Panel samping "Pilihan minggu ini", nuansa krem yang ramah, bukti sosial singkat | Ilustrasi tokoh dan font tulisan tangan |
| **Pitch.io** (dashboard) | Sidebar, banner sapaan, kartu statistik, daftar event dengan saklar publikasi | Kartu statistik warna-warni (pakai satu aksen) |
| **MicDrop** (editorial) | Kartu bergaris tipis, lencana statistik di atas gambar, banner ajakan | Ulasan pendengar, seluruh konten khas podcast |
| **EventSeven** (acara) | Pil kategori di tepi bawah hero, lembar putih bersudut membulat di atas hero, grid kartu dengan tanggal dan lokasi | Tombol dan teks sangat kecil, kontras rendah, kolom newsletter |
| **Motivec** (konferensi) | Navbar pil melayang, breadcrumb, kartu dengan tag, tanggal, dan lokasi huruf kapital | Widget template, newsletter, logo di footer |

**Keputusan:** pola dari Eventbux, Pitch.io, EventSeven, dan Motivec dipakai penuh karena langsung mendukung alur beranda → detail → pilih kursi → e-ticket dan dashboard panitia. Edujar dan Easy Study diambil sebagian untuk pencarian dan sorotan mingguan. MicDrop hanya untuk gaya kartu. Ilustrasi tokoh dan 3D tidak dipakai; digantikan ilustrasi kelopak agar tetap terasa Summarecon dan tidak terkesan template.

### Navbar pil dan pencarian

**✿ Summarecon**[Acara](#)[Tiket Saya](#)[Bantuan](#)

Cari**Konser, seminar…**Lokasi**Summarecon Mall Bandung**Tanggal**Semua tanggal**

SemuaMusikSeminarKeluargaPameran

### Kartu event, ringkasan pesanan, dan dashboard

Mulai Rp 150.000♡

NOV**14**

#### Konser Akustik Bandung

SUMMARECON MALL BANDUNG · 19.00

**Ringkasan Pesanan**

Gold · B-07Rp 350.000

Gold · B-08Rp 350.000

TotalRp 700.000

Sisa waktu isi data 09:41 · Bayar QRIS sandbox maks. 7 menit · Refund sampai H-1

**Halo, Admin**

3 event aktif, 128 tiket terjual hari ini.

**1.250**Tiket terjual

**Rp 312jt**Pendapatan

**86**Check-in

**4**Refund menunggu

**Konser Akustik Bandung**\
14 Nov · 420 kursi

DIJUAL[x]

**Seminar Kreator Muda**\
15 Nov · 200 kursi

DRAF[ ]

Di ponsel: kartu ringkasan pesanan menjadi panel bawah yang menempel (bottom sheet), sidebar admin menjadi tab bawah, dan bilah filter menjadi satu kolom.

## 10. Status dan Label (Dokumen Final)

Status order, pembayaran, refund, tiket, dan kehadiran dipisahkan, sehingga tiap domain punya label dan warna sendiri. Label ditulis dalam bahasa Indonesia, sedangkan kode status tetap untuk sistem.

| Domain | Label di antarmuka |
| --- | --- |
| Order dan pembayaran (QRIS sandbox) | MENUNGGU PEMBAYARAN · 07:00TERBAYARKEDALUWARSADIBATALKANGAGALREFUND SEBAGIANDIREFUND |
| Refund | MENUNGGU DATA REFUNDMENUNGGU PERSETUJUANPERLU KONFIRMASIDISETUJUI · MENUNGGU PROSESSEDANG DIPROSESSELESAIDITOLAK |
| Tiket dan kehadiran | AKTIFTIDAK BERLAKUSCAN 2/3SUDAH MASUKBELUM MASUK |
| Event | DRAFDIJUALDIBATALKAN |

## 11. Komponen Admin dan Venue

Lima lokasi dari blueprint ditampilkan sebagai pilihan venue. Denah dasar bersifat tetap; admin hanya memilih venue, template layout, dan tipe booking per section.

### Pemilih venue

**Downtown Walk**Outdoor · alfresco dining. Meja makan harian bukan inventori tiket; saat event dipakai Standing dan Kuota.

**Atrium Cibadak**Lobby Ageung · indoor

**Atrium Cileutik**Lobby Alus · indoor

**Atrium Ciunik**Indoor · alternatif lokasi

**Sawarga Courtyard**Open-air courtyard · template Opsi A atau B

Kapasitas tiap venue tampil sebagai "menunggu validasi pengelola" sampai angka resmi tersedia. Satu event hanya memilih satu venue, dan jadwal yang bertabrakan ditolak.

### Tiga lapisan konfigurasi dan tipe booking

**1. Master venue**Tetap. Admin tidak menggambar ulang denah.

**2. Template layout**Dipilih admin per event, misalnya Sawarga Opsi A atau B.

**3. Snapshot**Dibekukan saat penjualan dibuka; transaksi merujuk ke sini.

Tipe booking per section:

Book by SeatBook by QuotaStanding

Book by Table tidak termasuk baseline, jadi tidak ada komponen untuknya.

### Antrean refund admin

Semua 8Menunggu data 3Menunggu persetujuan 2Disetujui 1Diproses 1Selesai 1

**Sari Anggraini** · 1 tiket · Rp 350.000\
Event dibatalkan · belum mengisi data rekening

MENUNGGU DATA REFUND

**Budi Pratama** · 2 tiket · Rp 700.000\
Pengajuan peserta · Transfer bank · BCA ••••4821

MENUNGGU PERSETUJUAN

**Dewi Rahma** · 1 tiket · Rp 350.000\
E-wallet · GoPay ••••0912 · dana dikirim manual oleh admin

DISETUJUI · MENUNGGU PROSES

**Rizky Maulana** · 1 tiket · Rp 200.000\
Nomor rekening perlu diperbaiki

PERLU KONFIRMASI

Dana dikembalikan manual oleh admin di luar sistem. Antarmuka hanya mengelola data, status, riwayat, dan pesan WhatsApp (templat atau manual). Target selesai maksimal 1 minggu setelah data lengkap.

**Blokir kursi atau area**

Admin dapat memblokir kursi atau section untuk kebutuhan operasional. Kursi yang sedang ditahan atau sudah terjual tidak dapat diblokir, dan kapasitas section dihitung ulang setelah blokir.

## 12. Aturan Konten dari Dokumen Final

**Tampilkan**

- Memilih kursi belum mengunci kursi. "Kursi ditahan 10 menit" mulai saat isi data, lalu "Bayar dalam 7 menit" via QRIS sandbox.
- Kuota sebagai terisi/kapasitas, misalnya 16/50.
- Satu QR per order dengan penghitung scan (0/3, 1/3, 3/3).
- Refund sampai H-1, tanpa biaya admin, selesai maksimal 1 minggu setelah data lengkap.
- Nama peserta per tiket; dapat diubah sampai H-1.
- Angka kapasitas dan kursi contoh dengan keterangan "contoh data".

**Hindari**

- Menampilkan kursi meja makan Downtown Walk sebagai kursi bernomor.
- Menyebut refund "otomatis"; pengembalian dana dilakukan manual oleh admin.
- QR terpisah per tiket.
- Menetapkan standing selalu di depan atau kursi selalu di belakang.
- Fitur Book by Table dan kapasitas yang tampak seperti angka resmi mall.