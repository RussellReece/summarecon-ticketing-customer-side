# AGENT GUIDE FINAL v4 — Event Ticketing Customer Web
**Studi kasus:** Summarecon Mall Bandung (prototype) · **Versi:** 4.0 final · **Tanggal:** 7 November 2026 · **Zona waktu:** Asia/Jakarta (+07:00)

Dokumen ini **menggantikan** Agent Guide v2 dan v3. Perubahan utama dari v3: **integrasi API sudah selesai dan dikunci**, sehingga pekerjaan agent dibatasi pada **flow aplikasi, denah, dan penyesuaian tampilan**. Bagian v3 tentang "mock server", migrasi stack, dan data dari JSON sebagai sumber utama **dibatalkan**.

---

## 0. Ringkasan Situasi (baca dulu)

| Hal | Keadaan |
|---|---|
| API backend | **Sudah terpasang dan berfungsi.** Alamatnya dibaca dari variabel env `NEXT_PUBLIC_API_URL` (berkas env proyek). |
| Yang kurang | **Flow aplikasi/web** (urutan halaman, state, aturan bisnis di UI) dan **denah yang salah**, ditambah beberapa penyesuaian. |
| Sumber alur | `FIX_DOKUMEN_ANALISIS_AWAL_SISTEM_104621.pdf` |
| Sumber visual | `Style_Guide_Summarecon_Ticketing_1.md` / `.html` (**style guide final milik pemilik proyek**) |
| Data dummy JSON | Rujukan skema, enum, dan skenario uji. **Bukan** pengganti data dari API. |
| Stack | Awalan `NEXT_PUBLIC_` menunjukkan proyek memakai **Next.js**. **Verifikasi lewat `package.json`, jangan menebak.** Pertahankan stack yang ada; **jangan migrasi**. |

**Tugas agent dalam satu kalimat:** lengkapi dan perbaiki flow customer sesuai FIX Dokumen Analisis, benahi denah per venue, terapkan style guide final, **tanpa mengubah apa pun yang sudah bekerja di sisi API**.

---

## 1. ATURAN EMAS: Zona API Terkunci

### 1.1 Klasifikasi zona

| Zona | Isi | Aturan |
|---|---|---|
| 🔒 **TERKUNCI** | Klien API (fungsi `fetch`/axios/SDK), base URL, daftar endpoint, header & token, penanganan sesi/login yang sudah jalan, integrasi pembayaran sandbox, pemetaan respons yang sudah dipakai halaman yang bekerja, berkas env | **Dilarang diubah, dipindah, di-rename, atau dibungkus ulang secara mengubah perilaku.** |
| 🟡 **HATI-HATI** | Pemetaan status → label, penjaga rute (guard), penyimpanan state transaksi di sisi klien | Boleh diubah **hanya** bila perlu untuk flow; jangan memengaruhi kontrak API; catat di laporan. |
| 🟢 **BEBAS** | Halaman, komponen, routing UI, state UI, form, validasi sisi klien, denah/seat map, gaya (CSS/Tailwind), copy, ikon, aksesibilitas, tes | Boleh dibaca, dibuat, diubah, dipindah, dihapus, **bahkan ditulis ulang menyeluruh** bila audit membenarkannya. |

### 1.2 Cara menemukan zona terkunci (langkah audit pertama)
1. Cari penggunaan `NEXT_PUBLIC_API_URL` dan semua pemanggilan jaringan (`fetch(`, `axios`, `useSWR`, `react-query`, route handler).
2. Daftar berkas-berkas itu di laporan audit sebagai **"Zona Terkunci"** dan bekukan (jangan edit).
3. Catat setiap endpoint yang dipakai beserta metode, bentuk request, dan bentuk respons yang **teramati dari kode**. Simpan di `docs/api-contract-observed.md` (berkas baru, tidak memengaruhi kode).

### 1.3 Yang boleh dilakukan terhadap API
- **Memanggil** fungsi klien API yang sudah ada dari halaman/komponen baru.
- **Membuat adapter di sisi UI** (`lib/view-models/…`) yang mengubah respons API menjadi bentuk yang enak dipakai UI, **tanpa** menyentuh klien aslinya.
- Menambah **pembungkus baru** (hook, mis. `useHold()`) yang memanggil klien lama apa adanya.

### 1.4 Yang tidak boleh
- Mengubah endpoint, payload, header, URL, atau nama field yang dikirim/diterima.
- Mengganti pemanggilan API dengan data JSON/hardcode, atau menambahkan "mock" yang menimpa API.
- Mengedit, memindahkan, atau mencetak isi berkas env. Variabel `NEXT_PUBLIC_*` **terlihat oleh browser**: jangan pernah menaruh secret (server key payment, token admin) di sana.
- Menambahkan kredensial, kunci, atau URL baru yang dikarang.

### 1.5 Bila API ternyata menghalangi aturan bisnis
**Jangan menambal API.** Buat entri **API Change Request (ACR)** di laporan:
`ACR-nn · masalah · bukti (request/respons) · aturan FIX yang dilanggar · dampak ke UI · solusi sementara di UI (bila aman)`.
Lanjutkan pekerjaan lain; pemilik proyek yang memutuskan perubahan API.

### 1.4a Etika memakai API bersama
Host API adalah server nyata yang dipakai bersama. Saat menguji:
- Panggilan baca (GET) bebas dipakai.
- Panggilan yang **membuat data** (hold, order, payment, refund, registrasi) hanya memakai **akun demo/uji**, secukupnya, dan **setiap ID yang dibuat dicatat** di `docs/test-data-log.md`. Jangan memicu massal, jangan membuat ratusan data.
- Jangan menghapus atau mengubah data milik akun lain. Bila tidak ada akun uji, **tanyakan** kredensial, jangan membuat sendiri atau menebak.
- Data baru memakai awalan jelas (mis. email `agent.test+N@example.test`).

---

## 2. Berkas Sumber & Prioritas

| # | Sumber | Dipakai untuk |
|---|---|---|
| 1 | Instruksi terbaru pemilik proyek + dokumen ini | Arah kerja |
| 2 | **`FIX_DOKUMEN_ANALISIS_AWAL_SISTEM_104621.pdf`** | **Alur, aturan bisnis, status** (acuan utama flow) |
| 3 | `Blueprint_Venue_…_REVISI.pdf`, `Denah_Venue_…_Revisi_2026.pdf` | Venue, tiga lapisan layout, denah per venue |
| 4 | **`Style_Guide_Summarecon_Ticketing_1.md` / `.html`** | **Seluruh keputusan visual dan copy** |
| 5 | `customer-side-prototype-baseline.md` | Spesifikasi halaman, FR-CUS-01..28, acceptance criteria |
| 6 | `event_ticketing_venue_management_dummy_data.json` | Nama field, enum, skenario seed (rujukan, bukan sumber runtime) |
| 7 | Respons API yang **teramati nyata** | Kontrak data sebenarnya |

**Bila respons API berbeda dari JSON/dokumen:** UI mengikuti **respons API** untuk bentuk data, dan mengikuti **FIX Dokumen** untuk perilaku. Perbedaan dilaporkan, jangan diam-diam diselesaikan.

> Style guide lama buatan agent (`Style_Guide_FINAL_Summarecon_Ticketing.*`) **tidak berlaku lagi**. Hanya `…Ticketing_1` yang berlaku.

---

## 3. Ruang Lingkup

**Dikerjakan (Customer Web):** beranda & daftar event · detail event · login/registrasi (memakai alur auth yang sudah ada) · antrean · seat map & pilih tiket (tiga tipe booking) · data pemesan & peserta · ringkasan · pembayaran QRIS sandbox (tampilan & status) · hasil pembayaran · riwayat & detail pesanan · e-ticket (1 QR/order) · ubah nama peserta · refund peserta · refund pembatalan event · profil.

**Tidak dikerjakan:** Admin Dashboard dan aplikasi Check-in petugas (nama host API menunjukkan admin berada di proyek terpisah; **asumsi: tidak dibangun di sini**; konfirmasi bila ternyata salah) · editor layout master · marketplace · gateway produksi · transfer refund otomatis · **Book by Table**.

---

## 4. Alur Customer Mengikuti FIX Dokumen (bagian 7.2–7.7)

Setiap langkah: **apa yang UI lakukan** dan **apa yang harus diverifikasi** terhadap API. Jika sebuah langkah belum didukung API, tulis ACR; jangan dikarang di UI.

### 4.1 Pemesanan (FIX 7.2) — stepper UI: **Pilih → Isi data → Bayar → E-ticket**

| # | Langkah (FIX) | UI harus | Verifikasi/Catatan |
|---|---|---|---|
| 1 | Buka daftar event | Tanpa login. Sembunyikan `DRAFT`. | Event `CANCELLED` tampil dengan label dibatalkan, CTA nonaktif. |
| 2 | Pilih event | Detail: jadwal, venue, kategori, harga, jenis booking **sesuai section event**, info refund & ubah nama | Jangan tampilkan semua jenis booking otomatis. |
| 3 | Lihat detail + seat map | Denah per venue (bagian 6) | Ketersediaan hanya informatif; divalidasi ulang server saat Lanjut. |
| 4 | Login/registrasi | Guard + `returnUrl` kembali ke event | Pakai mekanisme auth yang sudah ada (🔒). |
| 5 | Trafik tinggi → antrean | Halaman antrean FIFO per event, tampilkan nomor & status dari API | **Jangan mengarang estimasi waktu.** Masuk antrean ≠ dapat kursi. |
| 6 | Server beri giliran (FIFO) | Buka kontrol booking hanya bila giliran sudah diberikan | Customer belum giliran tidak boleh menahan kursi/kuota. |
| 7 | Pilih kursi/area kuota | **Pilihan sementara di klien. Tanpa lock, tanpa timer.** | Lihat P0-1. |
| 8 | Sistem cek ketersediaan | Dilakukan server saat Lanjut | Tangani konflik (bagian 5.1). |
| 9 | Lock/reservasi 10 menit | Dipicu **hanya oleh tombol Lanjut** | Timer dari `reserved_until` server. |
| 10 | Isi data pemesan + nama tiap peserta | Pemesan sekali per order (prefill profil); **satu nama per tiket** | Jumlah nama = jumlah tiket. |
| 11 | Validasi data | Validasi klien + tampilkan galat server | Field wajib, tidak ada nama kosong. |
| 12 | Ringkasan pesanan | Event, venue, kursi/section, nama peserta, qty, harga, total, metode QRIS, timer | **Pakai angka dari API**, jangan hitung bebas. |
| 13 | Order + data payment dibuat | Tombol "Bayar" → panggil alur yang sudah ada | 🔒 |
| 14 | Lanjut bayar | Halaman pembayaran QRIS sandbox | Lihat 4.2. |

### 4.2 Pembayaran & e-ticket (FIX 7.3)
- Banner tetap: **"Mode uji — pembayaran sandbox, tidak ada uang sungguhan"** (gaya mengikuti style guide).
- Tampilkan QR/instruksi, nominal, kode order, **timer pending maks. 7 menit dari `expires_at` server**, status payment dari API, tombol "Cek status".
- Status order dan payment **ditampilkan terpisah**.
- UI **tidak boleh menetapkan sukses sendiri**. Sukses hanya jika API melaporkan `SUCCESS`/`PAID`. Polling status dengan interval wajar (mis. 3–5 detik) + berhenti saat status final.
- Pending > batas: tampilkan "Waktu pembayaran habis" **hanya setelah API menyatakan** expired. Bila status tidak pasti (jaringan), tampilkan "Sedang memeriksa pembayaran", jangan langsung gagal.
- Gagal/expired: pesan jelas + "Pesan ulang"; **tidak ada QR e-ticket**.
- Sukses: halaman hasil + tombol "Lihat E-Ticket" dan "Pesanan Saya"; info e-ticket juga dikirim via WhatsApp.
- **Pembayaran sandbox sudah diintegrasikan: jangan disentuh.** Panel simulasi (bila ada dari integrasi) dipertahankan apa adanya dan berlabel alat uji.

### 4.3 E-ticket (FIX 6.3, 8.6)
- **Satu QR per order.** Tampilkan "Scan x/y" (berhasil/tiket valid), daftar peserta + status tiket + status kehadiran.
- Muat QR **dari data yang disediakan API**. Jangan membuat token QR di klien. Jangan menampilkan `qr_token_hash` mentah.
- QR hanya untuk order dibayar valid. Tiket refund/batal/terdampak event dibatalkan: tidak valid (badge **TIDAK BERLAKU**).
- Event dibatalkan: ganti QR dengan overlay "Tiket tidak berlaku — event dibatalkan" + tombol "Isi data refund".
- Refund parsial: penyebut berkurang (contoh 3 tiket, 1 refund → "Scan 0/2").
- Tombol cetak/unduh bila memungkinkan.

### 4.4 Ubah nama peserta (FIX 6.5)
Sampai H-1 sebelum event mulai. Tidak mengubah nilai transaksi, jumlah tiket, atau QR. Perubahan tercatat (riwayat dari API bila ada). Setelah H-1: tombol nonaktif + alasan + tanggal batas. Hanya tiket milik user.

### 4.5 Refund peserta (FIX 7.4)
1. Riwayat/Detail Pesanan → pilih tiket (checkbox, **boleh parsial**) → sistem cek kelayakan H-1.
2. Form tujuan: **Metode** (Transfer Bank / E-Wallet), **Nama bank/e-wallet**, **Nomor**, **Nama pemilik** — **keempatnya wajib**.
3. Status awal setelah kirim: **MENUNGGU PERSETUJUAN** (`UNDER_REVIEW`). Admin setujui/tolak. Disetujui → menunggu proses → sedang diproses → selesai. Ditolak → berhenti.
4. Teks tetap: *Tanpa biaya admin · Pengajuan sampai H-1 · Dana ditransfer manual oleh admin, maksimal 1 minggu setelah data lengkap.*
5. Nominal = tiket terpilih saja, bukan seluruh order. Nomor rekening **dimasking** setelah tersimpan (`****6789`).
6. Pelanggaran: setelah H-1 → tombol nonaktif + penjelasan.

### 4.5a Refund akibat pembatalan event (FIX 7.6)
Banner di Riwayat Pesanan: "Event dibatalkan. Isi data refund agar dana bisa dikirim." Tiket terdampak otomatis **TIDAK BERLAKU**. Peserta **tidak** menunggu persetujuan refund, tetapi **wajib** mengisi tujuan. Status awal **MENUNGGU DATA REFUND**; setelah data lengkap → **DISETUJUI · MENUNGGU PROSES**. Tampilkan target "maks. 1 minggu setelah data lengkap" (tanggal pasti hanya bila API menyediakannya). **Jangan menyiratkan dana otomatis kembali**; transfer manual oleh admin.
`refund.status` dan `refund_data_status` adalah dua hal berbeda; jangan disatukan.

### 4.6 Notifikasi (FIX 6.6)
Tampilkan status/informasi yang tersedia dari API (e-ticket terkirim, pembatalan, refund). Kegagalan notifikasi **tidak** mengubah validitas tiket. Jangan membangun pengiriman WhatsApp di klien.

### 4.7 Check-in (FIX 7.8)
Dilakukan petugas, di luar scope. UI customer hanya menampilkan QR dan progres "Scan x/y".

---

## 5. PERBAIKAN PRIORITAS (P0)

### P0-1. Timer 10 menit mulai saat "Lanjut", bukan saat klik kursi
| Tahap | Perilaku benar |
|---|---|
| Klik kursi / pilih section | Hanya state klien. **Dilarang memanggil endpoint hold/lock.** Tampilkan ringkasan + tombol **Lanjut**. |
| Klik **Lanjut** | **Satu** panggilan hold untuk semua pilihan (all-or-nothing, dilakukan server). Timer mulai dari `reserved_until` server. |
| Isi data & bayar | Countdown dari `reserved_until`; **refresh tidak mereset** (baca ulang dari API/hold aktif). |
| Kembali ke denah | Dialog konfirmasi → lepaskan hold lewat fungsi API yang ada → pilihan tetap tersimpan. |
| Waktu habis | Tampilkan "Waktu habis. Kursi dilepas. Pilih kursi lagi." **Pelepasan dilakukan server** (didahului cek status pembayaran). UI hanya mencerminkan. |

- **Koreksi selisih jam:** hitung sisa waktu dengan offset antara waktu server (dari respons/header `Date`) dan jam perangkat. Jangan percaya jam perangkat mentah.
- Copy "ditahan 10 menit" **hanya** setelah Lanjut. Di denah: *"Memilih belum mengunci kursi. Kursi ditahan 10 menit setelah kamu masuk ke langkah isi data."*
- Seat map **menyegarkan status berkala** (polling 5–10 detik, jeda saat tab tidak aktif) karena kunci baru terjadi saat Lanjut. Perubahan status tidak menggeser tata letak.
- Hold satu per user per event: bila ada hold aktif saat membuka booking, pulihkan ke langkah Isi data dengan timer berjalan.
- **Bila API mengunci saat klik atau tidak mengembalikan `reserved_until`:** tulis ACR. UI tetap tidak memanggil hold sebelum Lanjut.

**Acceptance:**
- [ ] Klik kursi 15 menit tanpa Lanjut → tidak ada panggilan hold; kursi tetap tersedia bagi orang lain.
- [ ] Lanjut → hold dibuat; timer ≈ 10:00; refresh tidak mereset.
- [ ] Konflik saat Lanjut → pesan *"Kursi C05 baru saja diambil. Pilih kursi lain."* + denah disegarkan; tidak ada kursi terkunci sebagian.
- [ ] Timer habis → UI kembali ke pilih kursi dengan pesan jelas.

### P0-2. Pembayaran: UI saja, integrasi tidak disentuh
- [ ] Banner sandbox tampil di langkah bayar.
- [ ] Order PAID dan e-ticket muncul **hanya** setelah API menyatakan sukses.
- [ ] Gagal/expired → tanpa QR, ada jalan kembali.
- [ ] Tidak ada secret di kode klien/env publik.
- [ ] Order dan payment ditampilkan sebagai dua status.

---

## 6. DENAH (BAGIAN YANG SALAH — PERBAIKI MENYELURUH)

### 6.1 Prinsip
1. **Satu renderer berbasis data** untuk semua venue. Bukan satu denah melengkung untuk semua, bukan daftar/grid biasa, bukan gambar statis.
2. Sumber denah: `event_layout_snapshots.snapshot_payload` → `layout_templates` → `event_sections` → `event_seats` (urutan prioritas seperti di baseline 6.5). **Bentuk nyata diambil dari respons API**; JSON dipakai untuk memverifikasi harapan.
3. Koordinat `{x, y, width, height}` berunit **`normalized_percent`** (0–100 relatif terhadap kanvas). Terapkan sebagai `left/top/width/height: x%` di dalam kontainer berposisi relatif dengan **rasio tetap** (disarankan 16:11), atau SVG `viewBox="0 0 100 70"`. **Jangan menjadikannya piksel.**
4. Posisi kursi `{x, y}` adalah **titik tengah** kursi dalam persen kanvas. Verifikasi visual: setiap kursi harus jatuh **di dalam kotak sectionnya**.
5. Elemen `ticketable: false` (panggung, backstage, tenant, aisle, A11Y, FOH, check-in, entry, exit, egress) = **blok netral berlabel, tidak bisa diklik**, `pointer-events: none`. Panggung memakai gradasi tanda tangan.
6. Elemen `ticketable: true` ber-`booking_type`: `BOOK_BY_SEAT` → render kursi; `BOOK_BY_QUOTA`/`STANDING` → render **satu kartu section** (bukan kursi).
7. Jangan menyimpulkan blok dari huruf ID kursi (`ATR-A-10` = baris A, bukan Block A). Selalu pakai `section_id`/`block_code`.
8. Label venue memakai ejaan data (**Cibadak**), mudah diganti.

### 6.2 Spesifikasi per venue (koordinat dari seed JSON, kanvas 100×100 persen)
Format kolom posisi: `x, y, lebar, tinggi`.

**V1 Downtown Walk — `TPL-DWT-EVENT-01` (mode Event Bertiket)**
| Elemen | Jenis | Ticketable | Posisi |
|---|---|---|---|
| Main Stage | STAGE | tidak | 31, 8, 31, 10 |
| Backstage | BACKSTAGE | tidak | 63, 8, 17, 10 |
| Standing A · Front/General (`SEC-DWT-SA`) | STANDING | ya | 6, 25, 26, 23 |
| Standing B · General (`SEC-DWT-SB`) | STANDING | ya | 34, 25, 26, 23 |
| Standing C · Side/Overflow (`SEC-DWT-SC`) | STANDING | ya | 62, 25, 26, 23 |
| Cross Aisle / Emergency | EMERGENCY_ACCESS | tidak | 7, 51, 82, 4 |
| Tenant Area | TENANT_AREA | tidak | 6, 63, 19, 14 |
| Book by Quota Q1 (`SEC-DWT-Q1`) | QUOTA | ya | 27, 63, 19, 14 |
| A11Y / Check-in / Entry / Exit | fasilitas | tidak | 48,63,12,14 · 62,63,12,14 · 76,63,10,14 · 88,63,9,14 |

- **Tidak ada kursi.** Tidak ada meja/kursi makan harian di denah event. Mode operasional harian (meja bundar) **bukan inventori**; bila ditampilkan, hanya sebagai informasi non-interaktif berlabel "Operasional harian, tidak dijual".

**V2 Atrium Cibadak (Lobby Ageung) — `TPL-ATR-CBD-SEAT-01` (Book by Seat)**
| Elemen | Jenis | Ticketable | Posisi |
|---|---|---|---|
| Stage / Screen | STAGE | tidak | 25, 7, 25, 10 |
| Backstage | BACKSTAGE | tidak | 56, 7, 16, 10 |
| **Block A** seat 01–05 (`SEC-ATR-A`) | SEAT | ya | 16, 26, 28, 31 |
| Main Aisle | AISLE | tidak | 48, 26, 11, 31 |
| **Block B** seat 06–10 (`SEC-ATR-B`) | SEAT | ya | 61, 26, 27, 31 |
| A11Y · FOH · Check-in · Exit | fasilitas | tidak | 17,65,14,10 · 33,65,14,10 · 51,65,14,10 · 69,65,14,10 |
| Rear Circulation / Egress | EMERGENCY_ACCESS | tidak | 19, 78, 66, 4 |
| Side Aisles (2) | AISLE | tidak | 8,27,3,30 · 91,27,3,30 |

- Kursi: **8 baris (A–H) × 10 kolom = 80 ID**. Block A: kolom 01–05 (x 28.0–41.6, y 30.0–53.1); Block B: kolom 06–10 (x 62.0–75.6, y 30.0–53.1). Label tampil `C05`, `F02`, `A10`.
- Tampilkan label baris (A–H) di sisi kiri tiap blok.
- Atrium Cileutik/Ciunik memakai **renderer dan template yang sama**; hanya label venue berbeda (record venue alternatif, bukan kode baru).
- Seed: C05 dan F02 terjual, A10 diblokir (milik Block **B**).

**V3 Sawarga Courtyard — `TPL-SWG-OPTION-B-01` (Opsi B: standing di depan)**
| Elemen | Jenis | Ticketable | Posisi |
|---|---|---|---|
| Main Stage | STAGE | tidak | 27, 6, 27, 10 |
| Backstage | BACKSTAGE | tidak | 60, 6, 18, 10 |
| Standing Pit S1 (`SEC-SWG-S1`) | STANDING | ya | 15, 22, 64, 25 |
| Book by Seat · Rear (`SEC-SWG-SEAT`) | SEAT | ya | 13, 52, 29, 18 |
| Book by Quota Q1 · Side (`SEC-SWG-Q1`) | QUOTA | ya | 46, 52, 32, 18 |
| Cross Aisle / Egress | EMERGENCY_ACCESS | tidak | 11, 72, 78, 4 |
| Check-in · Entrance · A11Y · Exit | fasilitas | tidak | 13,80,15,9 · 33,80,15,9 · 55,80,15,9 · 78,80,15,9 |

- Kursi belakang: 12 kursi, 2 baris × 6 (x 22.0–42.5, y 57–64).
- **Opsi A** (kursi dekat panggung: Block A & B Book by Seat di depan, Quota Q1 dan Standing S1 di bawah) **harus bisa muncul hanya dengan template berbeda dari data**, tanpa mengubah kode. **Dilarang hard-code** "standing selalu di depan".
- Batas outline Sawarga adalah poligon tidak beraturan (bukan persegi panjang); boleh digambar sebagai latar dekoratif.
- Event `EVT-SWG-001` berstatus `CANCELLED`: seluruh denah **tidak interaktif** (garis putus-putus abu, `DISABLED_EVENT_CANCELLED`), banner "Event dibatalkan", `available_quantity: null` **bukan** 0.

### 6.3 Perilaku kursi (Book by Seat)
| Status | Visual (mengikuti style guide final) | Bisa dipilih |
|---|---|---|
| Tersedia | Teal `#1F8F7E` | ya |
| Dipilih (`SELECTED`, lokal) | Vermilion `#D93A2F` + ✓ | — |
| Ditahan (`LOCKED`) | Amber `#E9A12B` + ⋯ | tidak |
| Terjual (`SOLD`) | Plum gelap `#6B5A6E` + ✕ | tidak |
| Diblokir (`BLOCKED`) | Arsiran abu | tidak (alasan di tooltip bila ada) |
| Event dibatalkan | Transparan, garis putus-putus | tidak |

- Warna **dan** simbol **dan** label; legenda tetap di bawah denah.
- `aria-label="Kursi C05, Premium Block A, Rp350.000, tersedia"`. Perubahan status diumumkan lewat `aria-live="polite"`.
- Label baris-nomor muncul saat hover/sentuh dan di ringkasan.
- **Area sentuh ≥ 48 px**: di ponsel sediakan zoom/pan (mis. pinch + tombol +/−) dan perbesar area klik tak terlihat; jangan memperkecil kursi di bawah keterbacaan.
- Pilih beberapa kursi diizinkan; batas maksimum per order = konfigurasi (asumsi sementara 6, ditandai `ASSUMPTION`).

### 6.4 Kartu section (Book by Quota & Standing)
Nama + kategori + harga · badge tipe **BOOK BY QUOTA** / **STANDING** · penghitung **`terpakai/kapasitas`** (terpakai = terjual + tertahan) · progress bar · stepper jumlah (−/+, ≤ sisa) · label **"Kapasitas contoh (prototype)"**.
Warna progress sesuai style guide final: **< 80% teal · 80–99% amber · 100% plum gelap + tombol nonaktif ("Habis")**. Tanpa nomor kursi. Section ber-`inventory_status: DISABLED_EVENT_CANCELLED` nonaktif.

### 6.5 Daftar penyakit denah yang harus dicari saat audit
- [ ] Kursi dirender sebagai daftar/grid tanpa koordinat.
- [ ] Satu denah (mis. melengkung) dipakai untuk semua venue.
- [ ] Downtown Walk menampilkan kursi/meja makan sebagai kursi bernomor.
- [ ] Quota/Standing digambar sebagai kursi individual.
- [ ] Elemen non-ticketable bisa diklik atau menghilang.
- [ ] Koordinat diperlakukan sebagai piksel atau tanpa rasio tetap (denah melar/bergeser di layar berbeda).
- [ ] Kursi tidak berada di dalam kotak section; blok tertukar (A vs B) karena memakai huruf ID.
- [ ] Sawarga terkunci pada satu susunan (Opsi B) di kode.
- [ ] Event dibatalkan masih interaktif atau menampilkan 0 tersedia.
- [ ] Status hanya warna; legenda tidak ada; target sentuh kecil di ponsel.
- [ ] Tata letak bergeser saat status berubah.
- [ ] Counter section tidak cocok dengan kursi (temuan D1, lihat 8.1).

**Acceptance denah:**
- [ ] Tiga venue + dua template Sawarga tampil benar dari data, di lebar 360 / 768 / 1280 px.
- [ ] Atrium: 80 kursi, dua blok, main aisle di tengah; C05/F02 terjual, A10 diblokir pada Block B.
- [ ] Downtown Walk: Standing A/B/C + Quota Q1, **nol kursi**.
- [ ] Menambah template Sawarga Opsi A (data) menghasilkan denah baru tanpa ubah kode.
- [ ] Klik elemen non-ticketable tidak berefek.

---

## 7. STYLE GUIDE FINAL (ringkas penerapan)

Berkas acuan: `Style_Guide_Summarecon_Ticketing_1.md` dan `.html`. **Ikuti seluruhnya**; HTML-nya menyertakan demo denah per venue yang boleh dijadikan **referensi visual** (data di dalamnya hanya contoh, jangan disalin sebagai data).

- Token: Vermilion `#D93A2F` (aksi/pilihan), Garnet `#8C1F2B` (teks kecil/hover), Saffron `#F4A23B`, Blush `#FDE9E4`, Krem `#FFF8F5` (latar), Plum Ink `#2A1F2D` (teks); gradasi `135° #D93A2F → #EE6A35 → #F4A23B` untuk hero, header tiket, panggung (bukan di belakang teks kecil).
- Font: **Plus Jakarta Sans** (judul) + **DM Sans** (bacaan). Radius: kartu 16, tombol pill, kursi 8/8/5/5, tiket 20. Bayangan `0 6px 24px rgba(140,31,43,.10)`.
- **Satu tombol primer Vermilion per layar.** Pilihan pengguna merah; status sistem **tidak pernah** merah; merah error hanya untuk kegagalan.
- Maksimal dua ketebalan huruf dalam satu kartu. Target sentuh ≥ 48 px. Hormati `prefers-reduced-motion`; tanpa shader/parallax/kursor kustom di halaman pilih kursi.
- **Label status (huruf kapital badge) mengikuti bagian 10 style guide:**
  Order/pembayaran: MENUNGGU PEMBAYARAN · 07:00, TERBAYAR, KEDALUWARSA, DIBATALKAN, GAGAL, REFUND SEBAGIAN, DIREFUND.
  Refund: MENUNGGU DATA REFUND, MENUNGGU PERSETUJUAN, PERLU KONFIRMASI, DISETUJUI · MENUNGGU PROSES, SEDANG DIPROSES, SELESAI, DITOLAK.
  Tiket/kehadiran: AKTIF, TIDAK BERLAKU, SCAN 2/3, SUDAH MASUK, BELUM MASUK.
  Event: DRAF, DIJUAL, DIBATALKAN (**tambahan yang diasumsikan** bila style guide diam: SEGERA HADIR, PENJUALAN DITUTUP, BERLANGSUNG, SELESAI; tandai `ASSUMPTION`).
- Label wajib: **"Kapasitas contoh (prototype)"** dan **"Konsep prototype"** pada denah. Aturan konten bagian 12 style guide: jangan menyebut refund "otomatis", jangan QR per tiket, jangan menetapkan standing selalu di depan, jangan Book by Table.
- Jangan memakai logo Summarecon sebagai logo aplikasi; pakai nama dan lockup sendiri.
- Satu modul **`status-mapper`**: enum/raw → label + ikon + warna badge. Nilai tak dikenal → badge netral, tidak membuat halaman error.
- Contoh angka di style guide (kuota 12/40, harga Rp250, "Konser Akustik") **hanya ilustrasi**; data nyata dari API.

---

## 8. Data & Status

### 8.1 Temuan seed yang harus dilaporkan bila muncul di respons API
| # | Temuan | Penanganan UI |
|---|---|---|
| D1 | Counter section Atrium tidak cocok dengan kursi: `ATR-A-10` berada di **Block B** (`BLOCKED`), tetapi counter mencatat blocked di Block A. Seharusnya A: sold 2, blocked 0, avail 38; B: sold 0, blocked 1, avail 39. | Untuk Book by Seat, **hitung dari daftar kursi** bila tersedia; laporkan sebagai ACR. |
| D2 | ID kursi `ATR-A-10`: "A" = baris. | Jangan simpulkan blok dari ID. |
| D3 | `ticket_status` JSON (`RESERVED, ISSUED, USED, REFUND_PENDING, REFUNDED, CANCELLED`) lebih luas dari FIX (8.3). | `status-mapper` mengenali keduanya. |
| D4 | Status refund tidak ada di `payment_status` JSON (FIX 8.2 punya). | Tampilkan refund hanya dari data refund. |
| D5 | Order event batal berstatus `CANCELLED` meski refund `COMPLETED`. | Tampilkan order DIBATALKAN + chip refund SELESAI. |
| D6 | Event batal: `available_quantity = null`. | Tampilkan "Event dibatalkan"; jangan 0. |
| D7 | FIX 11.1/13 menyebut refund pembatalan "otomatis"; FIX 6.4/7.6 menyebut manual. | **Manual.** Konfirmasi ke pemilik. |
| D8 | Tiket `ISSUED` pada event `COMPLETED` (tidak hadir). | Jangan tawarkan refund (H-1 lewat). |
| D9 | `RFD-ATR-001` `UNDER_REVIEW` saat tiket masih `ISSUED`. | Wajar saat review. |
| D10 | Jam cutoff H-1 tidak ditetapkan. | Asumsi: **24 jam sebelum `start_at`, WIB**; tampilkan tanggal-jam batas nyata. Pakai nilai dari API bila ada. |

### 8.2 Status terpisah
Event · Order · Payment · Ticket · Attendance · Refund · Refund-data. Tidak boleh digabung. Enum (FIX bagian 8 ∪ JSON) tercantum di baseline bagian 7.

### 8.3 Keamanan data di UI
Jangan tampilkan: `password_hash`, `qr_token_hash`, `queue_token` mentah, log callback, audit admin. Nomor rekening dimasking. Customer hanya melihat order/tiket/refund miliknya; URL order orang lain → "Pesanan ini tidak tersedia untuk akunmu."

---

## 9. Mandat Perubahan Kode

1. Agent **boleh membuat, mengubah, memindahkan, dan menghapus** berkas di zona 🟢, dan menulis ulang **seluruh lapisan UI** bila audit membenarkan (denah dan flow booking kemungkinan perlu ditulis ulang).
2. Zona 🔒 **tidak disentuh** (bagian 1). Zona 🟡 hanya dengan alasan tercatat.
3. **Audit dulu**, putuskan *perbaiki* vs *tulis ulang* per area dengan alasan. Bila ada git: buat branch `fix/flow-denah` dan commit kecil per perubahan; tanpa git: salin ke `_backup/` sebelum perubahan besar.
4. Pertahankan route yang sudah dipakai API/auth; ubah route UI hanya bila perlu dan catat.
5. Jangan menambah dependensi tanpa alasan; catat setiap dependensi baru.
6. Tidak boleh mencetak, menyalin, atau meng-commit isi berkas env. Pastikan berkas env sudah di `.gitignore`. (Berkas yang diunggah bernama `_env.local`; Next.js membaca `.env.local`. Jangan mengubah isinya; hanya konfirmasi nama berkas di proyek benar.)
7. Aturan bisnis tak tertulis di sumber: jangan menebak; pakai asumsi default bagian 11, tandai `// ASSUMPTION:` dan laporkan.
8. Teks UI Bahasa Indonesia, ramah dan singkat.

---

## 10. Urutan Pengerjaan

0. **Audit:** stack, zona terkunci, kontrak API teramati, pemetaan fitur (Ada/Sebagian/Belum/Salah) terhadap bagian 4–6, daftar penyakit denah, temuan D1–D10, ACR.
1. **Fondasi UI:** token style final, `status-mapper`, util waktu WIB + offset server, view-model adapter.
2. **Denah:** renderer berbasis data, tiga venue + Sawarga A/B, kartu kuota/standing, status & legenda, zoom/pan.
3. **Flow booking:** guard + `returnUrl`, antrean, Lanjut → hold, timer, form pemesan/peserta, ringkasan.
4. **Pembayaran & e-ticket (UI):** halaman bayar, polling status, hasil, e-ticket satu QR + "Scan x/y".
5. **Akun:** riwayat, detail, ubah nama, profil.
6. **Refund:** peserta (parsial) + pembatalan event + timeline.
7. **QA:** checklist bagian 12, responsif, aksesibilitas, perbaikan.
8. **Laporan akhir.**

Jangan berhenti setelah satu halaman. Jangan menghapus fitur yang sudah benar.

---

## 11. Open Questions & Asumsi Default

| # | Isu | Asumsi default |
|---|---|---|
| 1 | Stack | Next.js (dari `NEXT_PUBLIC_`); verifikasi `package.json` |
| 2 | Admin/Check-in dibangun di sini? | Tidak, proyek terpisah |
| 3 | Akun uji untuk API | Pakai yang diberikan; bila tidak ada, **tanya** |
| 4 | API membuat hold saat klik / tanpa `reserved_until` | Tulis ACR; UI tidak memanggil hold sebelum Lanjut |
| 5 | Jam cutoff H-1 | 24 jam sebelum `start_at` WIB, atau nilai API |
| 6 | Batas tiket per order | 6 (sementara) |
| 7 | Label event di luar DRAF/DIJUAL/DIBATALKAN | Lihat bagian 7 (asumsi) |
| 8 | Order batal setelah refund selesai | DIBATALKAN + chip refund SELESAI |
| 9 | Tombol kembali dari form | Lepas hold dengan konfirmasi |
| 10 | Ejaan Cibadak/Cibadag | "Cibadak" (label di satu konstanta) |
| 11 | Refund pembatalan: otomatis vs manual (D7) | Manual |
| 12 | "Bandung Build Challenge 2026 Technical Brief" belum diterima | Minta bila ada kriteria penilaian |

---

## 12. Checklist Pengujian (PASS / FAIL / N/A + bukti)

**A. Zona API**
- [ ] A1 Tidak ada perubahan pada berkas zona terkunci (tunjukkan `git diff --stat`/daftar berkas).
- [ ] A2 Tidak ada secret di kode klien/env publik; berkas env tidak ter-commit.
- [ ] A3 Tidak ada data dari JSON menimpa respons API.
- [ ] A4 ACR tercatat untuk setiap ketidaksesuaian.

**B. Booking & timer**
- [ ] B1 Klik kursi tidak memanggil hold/tidak ada timer.
- [ ] B2 Lanjut → hold + timer dari server; refresh tidak mereset.
- [ ] B3 Konflik kursi ditangani all-or-nothing dengan pesan benar.
- [ ] B4 Quota/Standing tidak melebihi sisa; stepper dibatasi.
- [ ] B5 Antrean FIFO per event tampil; belum giliran = tanpa kontrol booking; tanpa estimasi karangan.
- [ ] B6 Teks "ditahan 10 menit" tidak muncul sebelum Lanjut.
- [ ] B7 Satu hold aktif per user per event dipulihkan setelah refresh.

**C. Denah (bagian 6)**
- [ ] C1–C5 acceptance denah terpenuhi; daftar penyakit 6.5 semua tidak ditemukan.

**D. Pembayaran & e-ticket**
- [ ] D1 Banner sandbox tampil. D2 PAID/e-ticket hanya setelah API sukses. D3 Gagal/expired tanpa QR. D4 Order & payment terpisah. D5 Satu QR per order + "Scan x/y". D6 Event batal → overlay + CTA isi data refund. D7 Refund parsial menurunkan penyebut.

**E. Akun, peserta, refund**
- [ ] E1 Hanya order milik sendiri. E2 Ubah nama sampai H-1, setelahnya nonaktif beralasan. E3 Refund: empat field wajib, parsial, nominal tiket terpilih, rekening dimasking. E4 Status refund & data refund terpisah. E5 Refund pembatalan: tanpa persetujuan peserta tetapi wajib isi data; tidak ada kata "otomatis dikembalikan". E6 Setelah H-1 pengajuan ditolak UI.

**F. Style & kualitas**
- [ ] F1 Token/typography sesuai style guide final. F2 Satu CTA primer per layar. F3 Merah tidak dipakai untuk tersedia/berhasil. F4 Status = warna + simbol + teks. F5 Label prototype tampil. F6 Responsif 360/768/1280. F7 State loading/kosong/error di tiap halaman. F8 Tanpa error konsol; tidak ada tombol tanpa aksi. F9 Navigasi keyboard & `aria-label` kursi.

---

## 13. Format Laporan

**Audit awal:** stack terverifikasi · Zona Terkunci (daftar berkas) · kontrak API teramati · tabel fitur · penyakit denah · temuan D1–D10 · keputusan perbaiki/tulis ulang · ACR awal.
**Per perubahan:** berkas · alasan (ID bagian/FR) · cara uji · hasil · konfirmasi zona terkunci tidak tersentuh.
**Akhir:** tabel checklist (PASS/FAIL/N/A + bukti), daftar ACR, asumsi dipakai, Open Questions, `docs/test-data-log.md`, cara menjalankan.

---

## 14. Definition of Done

- [ ] Zona API terkunci tidak berubah; ACR dilaporkan.
- [ ] Flow customer penuh sesuai FIX 7.2–7.7: browse → login → (antrean) → pilih → **Lanjut/hold 10 menit** → data peserta → ringkasan → bayar QRIS sandbox → e-ticket satu QR → riwayat → ubah nama → refund peserta & pembatalan.
- [ ] Denah tiga venue (+ Sawarga A/B) benar, berbasis data, responsif, aksesibel.
- [ ] Style guide final (`…Ticketing_1`) diterapkan.
- [ ] Checklist bagian 12 PASS/N/A beralasan.
- [ ] Tidak ada secret/kredensial di repo atau laporan.
- [ ] README: cara menjalankan, env yang dibutuhkan (hanya nama variabel), akun uji, keterbatasan.
- [ ] Label "Kapasitas contoh (prototype)" dan "Konsep prototype" tampil; sistem bukan dasar membuka penjualan tiket nyata sebelum divalidasi pengelola mal.
