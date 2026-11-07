# PROMPT — REDESAIN SEAT MAP (RAPI, SESUAI STYLE GUIDE, RESPONSIF MOBILE)
## Summarecon Ticketing · Customer Web (Next.js)

> Tempel seluruh isi file ini ke Antigravity. Lampirkan juga: `Style_Guide_Summarecon_Ticketing_1.md/.html`, `AGENT_GUIDE_FINAL_v4_Flow_Denah_API-Terkunci.md`, `PROGRES_DAN_ALUR_SISTEM.md`, dan tangkapan layar seat map saat ini.

---

## 1. ROLE & OBJECTIVE

Bertindaklah sebagai Senior Frontend Engineer dan UI/UX Designer (React/Next.js, CSS, aksesibilitas, UI mobile).

Seat map di proyek ini **sudah berfungsi** (data dari API, status kursi, seleksi, hold saat "Lanjut"), tetapi tampilannya **berantakan dan tidak nyaman di mobile**. Tugasmu: **mendesain ulang tampilan dan perilaku visual seat map** agar **rapi, bersih, sesuai Style Guide, status kursi jelas berbeda warna, dan nyaman dipakai di ponsel**. Edit kode langsung di workspace, jalankan, uji di beberapa ukuran layar, dan perbaiki sampai lolos kriteria.

**Ini pekerjaan tampilan (UI) saja. Logika bisnis dan API tidak boleh berubah.**

---

## 2. GUARDRAIL (WAJIB, BACA DULU)

### 2.1 Zona terlarang (🔒 jangan disentuh)
- `src/services/customerApi.ts`, `src/data/customer.ts`, `next.config.ts`, berkas env (`.env.local`), dan semua kode pemanggil API/auth/pembayaran.
- Kontrak data: nama field, endpoint, payload.
- Perilaku bisnis yang sudah benar: **memilih kursi hanya mengubah state lokal**; **hold 10 menit hanya dibuat saat tombol "Lanjut"** (`POST /api/events/:id/holds`); batas **maks. 4 tiket per transaksi**; event `CANCELLED` menonaktifkan denah (`DISABLED_EVENT_CANCELLED`); status disegarkan berkala tanpa mereset pilihan.

### 2.2 Zona kerja (🟢 boleh diubah, bahkan ditulis ulang)
`src/components/seat-map/*` (termasuk `VenueRenderer.tsx`), komponen UI pendukung seat map, CSS/Tailwind untuk seat map, dan tata letak halaman pemesanan (`/event/[id]/book`) **hanya sejauh perlu** untuk bottom sheet ringkasan dan tampilan mobile.

### 2.3 Zona hati-hati (🟡)
Booking store/selector: boleh **menambah** selector/helper turunan (mis. daftar kursi terpilih per blok). **Jangan** mengubah aturan seleksi, batas 4 tiket, atau waktu pemicu hold.

### 2.4 Lainnya
- Jangan mengubah data yang diterima komponen dari lapisan data. Bila UI butuh bentuk lain, buat **adapter/view-model di sisi komponen**.
- Jangan menambah data dari JSON/hardcode. Jangan menaruh secret di kode.
- Jangan menyentuh halaman lain yang sudah bagus (beranda, detail, checkout, dst.).
- Bila menemukan masalah yang hanya bisa diperbaiki di API, **catat sebagai ACR** di laporan; jangan ubah API.
- Dependensi baru hanya bila benar-benar perlu (mis. pinch-zoom); utamakan CSS/JS bawaan. Catat alasannya.

---

## 3. DIAGNOSIS: APA YANG SALAH PADA TAMPILAN SAAT INI

Berdasarkan tangkapan layar Atrium Cibadak, temukan penyebab di kode dan perbaiki:

1. **Kursi saling menimpa secara vertikal.** Tinggi kursi lebih besar dari jarak antar-baris, sehingga delapan baris tampak menumpuk dan angka terpotong.
2. **Kolom tidak sejajar.** Kursi berstatus berbeda (ditahan/terjual/diblokir) tampak bergeser vertikal atau berukuran lain dibanding kursi tersedia (contoh: kursi amber di sudut kiri atas Block A dan kursi abu di kanan atas Block B menonjol keluar dari baris). Penyebab umum: ukuran, `border`, atau `padding` berbeda per status; atau posisi absolut per kursi tanpa ukuran seragam.
3. **Kluster kursi tidak berada di tengah bingkai blok.** Kursi menumpuk di sisi kanan bingkai, sisi kiri kosong.
4. **Judul blok tertimpa kursi** ("Block A · Seat 01–05", "Block B · Seat 06–10").
5. **Nomor baris tidak ada.** Setiap kursi hanya menampilkan nomor kolom, sehingga pengguna tidak tahu baris mana (A–H).
6. **Teks dalam kursi terlalu besar** untuk ukuran kursi dan tidak konsisten.
7. **Gaya fasilitas tidak konsisten dengan style guide:** blok FOH hitam (di luar palet), ikon A11Y berupa emoji, warna blok fasilitas acak.
8. **Tidak ramah mobile.** Menyusutkan seluruh kanvas ke lebar layar membuat kursi sangat kecil dan tidak bisa disentuh dengan tepat.
9. Periksa juga: legenda status tampil/tidak, dan apakah tata letak bergeser saat status disegarkan.

Tulis hasil diagnosis (penyebab per poin, berkas dan baris) di laporan awal.

---

## 4. SPESIFIKASI DESAIN

### 4.1 Sumber kebenaran visual
`Style_Guide_Summarecon_Ticketing_1` (token, tipografi, radius, bayangan, komponen). Bila ada konflik dengan prompt ini, **style guide menang**. Tampilan harus terasa **bersih, lapang, hangat** (latar krem, kartu putih, sudut membulat).

Token: Vermilion `#D93A2F` (pilihan), Garnet `#8C1F2B` (teks kecil/fokus), Saffron `#F4A23B`, Blush `#FDE9E4`, Krem `#FFF8F5`, Plum Ink `#2A1F2D`; font **Plus Jakarta Sans** (judul/angka) + **DM Sans** (bacaan). Radius: kartu 16, kursi 8/8/5/5, section 12. Bayangan `0 6px 24px rgba(140,31,43,.10)`.

### 4.2 Status kursi: lima tampilan yang jelas berbeda
Setiap status berbeda **warna + ikon/pola + teks** (terbaca tanpa warna). Semua status memakai **ukuran, border, dan baseline yang sama** (hanya warna/ikon yang berubah) agar kolom selalu sejajar.

| Status | Isi kursi | Warna | Bisa dipilih |
|---|---|---|---|
| **Tersedia** (`AVAILABLE`) | Nomor kursi | Isi tint `#E3F4F1`, border 2 px teal `#1F8F7E`, teks `#14665A` | Ya |
| **Dipilih** (lokal) | ✓ lalu nomor kecil | Vermilion `#D93A2F` solid, teks putih, ring Garnet saat fokus, sedikit membesar (scale 1.06, 150 ms) | Klik lagi untuk batal |
| **Ditahan** (`LOCKED`) | ⋯ | Amber `#E9A12B` solid, ikon Plum Ink | Tidak |
| **Terjual** (`SOLD`) | ✕ | Plum gelap `#6B5A6E` solid, ikon putih | Tidak |
| **Diblokir** (`BLOCKED`) | ⊘ | Arsiran abu `#E6DFE3` (garis miring) + border `#9A8F95`, ikon abu gelap | Tidak |
| **Event dibatalkan** | — | Transparan, garis putus-putus abu | Tidak |

Aturan: merah (Vermilion) **hanya** untuk pilihan pengguna. Kontras teks ≥ 4,5:1 (karena itu "Tersedia" memakai tint + teks gelap, bukan teks putih di atas teal).

### 4.3 Susunan blok kursi (rapi dan seragam)
- Untuk section Book by Seat, **render sebagai CSS grid di dalam bingkai blok**: kolom = nomor kursi, baris = huruf baris, diurutkan dari data (`row_label`, `seat_number`, atau koordinat). Jika posisi kursi di data membentuk grid teratur, pakai grid; jika tidak teratur, pakai posisi absolut **dengan ukuran kursi dihitung dari jarak antar-kursi** (`ukuran = min(jarakX, jarakY) × 0,82`) sehingga **tidak mungkin saling menimpa**.
- Ukuran dasar di kanvas virtual: **kursi 36×36, jarak 8**. Kursi berada **di dalam** bingkai blok dengan padding seragam, dan terpusat.
- **Label baris (A–H)** di kolom sempit sisi kiri tiap blok (teks 12 px, Plum Muted). Angka dalam kursi **13 px, 600**. Seluruh label aman dari pemotongan.
- **Judul blok di atas bingkai** (chip kecil, bukan di dalamnya): `Block A · 01–05` + kategori + harga (mis. `Premium · Rp350.000`) + ringkasan `38 tersedia`. Tidak boleh tertimpa kursi.
- Beda kategori/blok dibedakan lewat **chip judul dan warna aksen bingkai yang halus**, **bukan** lewat warna kursi (agar tidak bentrok dengan warna status).
- Bila kursi tidak muat pada koordinat persen dari data, **boleh menambah tinggi/lebar kanvas virtual** atau menggeser fasilitas ke bawah. Komposisi relatif (panggung di atas, blok kiri/kanan, aisle tengah, fasilitas di bawah) tetap dipertahankan. **Yang tidak boleh: kursi saling menimpa.**
- Kursi lorong/ruang kosong dipertahankan sesuai data (jangan dirapatkan).

### 4.4 Elemen non-ticketable (panggung, backstage, aisle, fasilitas)
- **Panggung:** gradasi tanda tangan `135° #D93A2F → #EE6A35 → #F4A23B`, sudut bawah melengkung (radius 12/12/40/40), teks putih tebal.
- **Backstage, FOH, A11Y, Check-in, Exit, Rear Egress:** pil/kartu **tenang dan netral** (latar Blush/krem/abu hangat, border tipis, teks Plum Muted 12–13 px), ikon garis 1,75 px bergaya konsisten. **Tidak ada blok hitam, tidak ada emoji.** A11Y memakai ikon garis kursi roda. Tidak bisa diklik (`pointer-events: none`).
- **Aisle/side aisle:** ruang kosong dengan label kecil dan garis putus-putus sangat tipis; label vertikal bila sempit.
- Panggung dan blok non-ticketable tidak boleh menutupi kursi.

### 4.5 Tipografi, jarak, kebersihan
Satu skala jarak (4·8·12·16·24·32). Maksimal dua ketebalan huruf per kartu. Hindari garis tebal dan bayangan berlapis; bingkai blok: kartu putih, radius 12–16, border 1 px `#EADFDF`, bayangan halus. Tidak ada efek shader/parallax/kursor kustom.

### 4.6 Legenda
Legenda selalu terlihat: Tersedia · Pilihanmu · Ditahan · Terjual · Diblokir, memakai **komponen kursi mini yang sama** (ikon + warna). Desktop: satu baris di bawah denah. Mobile: baris ringkas yang bisa digulir mendatar, tetap terlihat tanpa menutupi denah.
Tambahkan catatan kecil: *"Memilih belum mengunci kursi. Kursi ditahan 10 menit setelah kamu menekan Lanjut."* dan label **"Konsep prototype"** serta **"Kapasitas contoh (prototype)"** (sudah ada, rapikan penempatannya).

### 4.7 Interaksi
- Hover/fokus: kursi tersedia naik halus (scale 1.06) + tooltip *"Baris C · Kursi 05 · Premium · Rp350.000 · Tersedia"*. Kursi tidak tersedia: tooltip alasan (*"Terjual"*, *"Ditahan pengguna lain"*, *"Diblokir panitia"*).
- Fokus keyboard: ring Garnet 2 px, offset 2 px. Navigasi panah antar kursi (roving tabindex), Enter/Spasi memilih.
- Mencapai batas 4 tiket: kursi lain tetap terlihat normal, klik menampilkan toast *"Maksimal 4 tiket per transaksi"* (jangan memberi warna "terjual").
- Jika kursi terpilih ternyata diambil orang lain saat penyegaran status: batalkan pilihan, tampilkan toast *"Kursi C05 baru saja diambil. Pilih kursi lain."*, tanpa tata letak bergeser.
- Animasi 150–300 ms, hormati `prefers-reduced-motion`.

---

## 5. RESPONSIF & MOBILE (BAGIAN TERPENTING)

**Prinsip:** jangan sekadar mengecilkan seluruh denah ke lebar layar. Pada ponsel, ubah **cara menampilkannya** agar kursi besar, jelas, dan mudah disentuh.

### 5.1 Breakpoint dan mode tampilan
| Lebar | Mode | Keterangan |
|---|---|---|
| **≥ 1024 px** | **Denah penuh** | Seluruh venue dalam satu kanvas; kursi ≥ 32 px (area sentuh/klik ≥ 44 px lewat padding/pseudo-element). Skala kanvas dengan `transform: scale()` **seragam** (proporsi isi tidak berubah). |
| **640–1023 px** | **Denah penuh + zoom/pan** | Tombol **+ / − / reset**, pinch-zoom, geser dengan satu jari. Tersedia pula tombol *"Tampilan per blok"*. |
| **< 640 px (ponsel)** | **Tampilan per blok (default)** | Lihat 5.2. Mode "Denah penuh" tersedia sebagai opsi dengan pinch-zoom. |

### 5.2 Mobile: "Overview + Fokus Blok"
1. **Ringkasan atas (orientasi):** mini-denah sederhana (panggung di atas + kotak blok) agar pengguna tahu arah panggung. Blok yang sedang dilihat disorot.
2. **Tab/segmen blok** di bawahnya: `Block A · 38 tersedia | Block B · 39 tersedia` (tinggi ≥ 48 px, bisa digeser). Sawarga: `Kursi belakang` dll. Boleh juga geser kiri/kanan antar blok tanpa mengganggu gulir halaman.
3. **Grid blok (fokus):** kursi **44–48 px**, jarak 8 px, label baris di kiri, seluruh blok **muat lebar layar tanpa gulir mendatar** (5 kolom × 44 + gutter ≈ 276 px; aman di 360 px). Bila blok lebih lebar, gulir mendatar dengan indikator, bukan memperkecil kursi di bawah 40 px.
4. **Panggung sebagai penunjuk arah** di atas grid (pita gradasi kecil bertuliskan "Panggung ↑") agar orientasi jelas.
5. **Legenda ringkas** satu baris (gulir mendatar) tepat di atas grid, tetap terlihat.
6. **Section kuota/standing:** kartu **satu kolom penuh**, stepper jumlah dengan tombol ≥ 48 px, progress bar, `terpakai/kapasitas`.
7. **Bottom sheet ringkasan (menempel di bawah):**
   - Ringkas: `2 kursi · Rp700.000` + tombol primer Vermilion **Lanjut** (≥ 48 px, lebar penuh).
   - Tarik/ketuk untuk membuka: chip kursi terpilih (`A05 ✕`, `B07 ✕`) untuk menghapus satu per satu, rincian harga, penghitung `2/4 dipilih`, dan teks bantu tentang hold 10 menit.
   - Hormati `env(safe-area-inset-bottom)`. Beri `padding-bottom` pada konten sebesar tinggi sheet agar kursi paling bawah tidak tertutup.
   - Tombol Lanjut nonaktif dengan alasan (*"Pilih kursi dulu"*) saat kosong.
8. Gesture: gulir halaman vertikal tetap normal di luar grid; pinch hanya aktif pada mode "Denah penuh". Tidak ada hover-only; tooltip diganti ringkasan di sheet saat kursi diketuk.
9. Orientasi landscape ponsel: tetap tampil benar (grid tidak terpotong, sheet tidak menutupi >30% layar).

### 5.3 Tablet
Denah penuh dengan zoom; ringkasan pesanan sebagai panel samping atau sheet bawah sesuai lebar. Seluruh target sentuh ≥ 44 px (tombol zoom 48 px).

### 5.4 Venue lain (renderer yang sama, data-driven)
- **Downtown Walk:** **nol kursi.** Kartu Standing A/B/C dan Quota Q1 (nama, harga, `terpakai/kapasitas`, progress bar: <80% teal, 80–99% amber, 100% plum gelap + "Habis", stepper). Area tenant/panggung/jalur = blok netral. Meja makan harian tidak digambar sebagai kursi.
- **Sawarga Courtyard (Opsi B):** pit standing di atas, **12 kursi belakang** (2 baris × 6, grid rapi, mode per blok di mobile), kuota samping. Template Opsi A harus tetap dapat dirender dari data tanpa mengubah kode.
- **Atrium Cileutik/Ciunik:** renderer dan template yang sama.
- **Event dibatalkan:** seluruh denah non-interaktif (garis putus-putus abu), banner pembatalan, tidak menampilkan "0 tersedia".

### 5.5 Kinerja & stabilitas
- Seat berupa komponen ringan (`React.memo`), update status tidak me-render ulang seluruh kanvas; tidak ada layout shift saat status disegarkan (ukuran seat tetap).
- Skeleton saat memuat, state kosong/error yang jelas dengan tombol "Coba lagi".
- Tidak ada error/warning konsol.

---

## 6. AKSESIBILITAS

- Setiap kursi `<button>` dengan `aria-label="Kursi C05, Premium Block A, Rp350.000, tersedia"`; terpilih memakai `aria-pressed="true"`; tidak tersedia memakai `aria-disabled="true"` (tetap dapat difokus agar alasannya terbaca).
- Wilayah `aria-live="polite"` mengumumkan perubahan: *"Kursi C05 dipilih. 2 dari 4 tiket."*, konflik kursi, dan batas maksimum.
- Kontras ≥ 4,5:1 untuk teks, ≥ 3:1 untuk batas/ikon. Status tidak hanya warna.
- Target sentuh ≥ 44 px (kontrol utama 48 px). Mendukung zoom teks browser 200% tanpa kehilangan fungsi.

---

## 7. CARA KERJA

1. **Audit dulu:** baca `VenueRenderer.tsx` dan komponen kursi/blok; tuliskan diagnosis (bagian 3) dengan berkas dan baris.
2. Buat branch/checkpoint (`git checkout -b feat/seatmap-redesign` atau salin ke `_backup/`).
3. Implementasi bertahap: (a) token & komponen kursi seragam, (b) grid blok + label baris + judul blok, (c) elemen non-ticketable bergaya style guide, (d) legenda, (e) mode responsif + tampilan per blok + bottom sheet, (f) kartu kuota/standing, (g) aksesibilitas, (h) polish.
4. **Uji visual** di browser pada **360×800, 390×844, 768×1024, 1280×800, 1440×900** (portrait dan landscape ponsel). Bila alat browser/screenshot tersedia, ambil tangkapan layar sebelum dan sesudah untuk tiap ukuran.
5. Tambahkan **uji otomatis sederhana** (Playwright/Vitest bila sudah ada di proyek; bila tidak, skrip kecil di console/test) yang memastikan **tidak ada dua tombol kursi yang kotak batasnya saling beririsan** dan ukuran kursi minimum terpenuhi.
6. Jalankan `npx tsc --noEmit` dan `npm run lint` (harus 0 error). Pastikan alur booking (pilih → Lanjut → hold → data peserta) **tetap bekerja seperti sebelumnya**.

---

## 8. KRITERIA LULUS (PASS/FAIL + bukti)

**Kerapian**
- [ ] Tidak ada kursi yang saling menimpa pada semua ukuran layar (uji otomatis bukti).
- [ ] Semua kursi berukuran sama; kolom dan baris sejajar untuk semua status.
- [ ] Kursi terpusat di bingkai blok; judul blok tidak tertimpa; label baris A–H tampil.
- [ ] Fasilitas tampil netral dan konsisten dengan style guide; tidak ada blok hitam/emoji.

**Status**
- [ ] Lima status (tersedia, dipilih, ditahan, terjual, diblokir) berbeda jelas dalam warna + ikon + legenda.
- [ ] Merah hanya untuk pilihan pengguna.
- [ ] Event dibatalkan: denah non-interaktif, tanpa "0 tersedia".

**Mobile**
- [ ] 360 px: tampilan per blok memuat grid tanpa gulir mendatar; kursi ≥ 44 px; tab blok ≥ 48 px.
- [ ] Bottom sheet menempel, tidak menutupi kursi, tombol Lanjut ≥ 48 px, safe-area dihormati.
- [ ] Pinch-zoom/pan (mode denah penuh) berfungsi; gulir halaman tidak terganggu.
- [ ] Landscape ponsel dan tablet tampil benar.

**Fungsi (tidak boleh rusak)**
- [ ] Klik kursi tidak memanggil API; hold hanya saat "Lanjut".
- [ ] Batas 4 tiket, penyegaran status, penanganan konflik kursi masih benar.
- [ ] Downtown Walk tanpa kursi; Sawarga 12 kursi; Atrium 80 kursi (A–H × 01–10).
- [ ] **Tidak ada perubahan pada berkas zona terlarang** (tampilkan `git diff --stat`).

**Aksesibilitas & kualitas**
- [ ] `aria-label`, `aria-pressed`, `aria-live`, navigasi keyboard berfungsi.
- [ ] Tanpa error/warning konsol; `tsc` dan lint 0 error.

---

## 9. DELIVERABLE

1. Perubahan kode di workspace (jangan hanya saran).
2. Laporan singkat: diagnosis awal, daftar berkas diubah + alasan, keputusan desain, hasil uji per ukuran layar (tabel PASS/FAIL), tangkapan layar sebelum/sesudah (bila memungkinkan), ACR bila ada, serta konfirmasi bahwa zona terlarang tidak berubah.
3. Catatan batasan dan saran lanjutan (maksimal 5 butir).

**Mulai dengan audit komponen seat map, lalu langsung implementasi. Jangan berhenti pada perencanaan.**
