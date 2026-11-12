# Dokumentasi Komprehensif Progres, Arsitektur, dan Alur Sistem
## Event Ticketing & Venue Management System — Customer Web Application
**Dokumen Referensi:** `FIX DOKUMEN ANALISIS AWAL SISTEM_104621.pdf` & `AGENT_GUIDE_FINAL_v4_Flow_Denah_API-Terkunci.md`  
**Repositori:** `summarecon-ticketing-customer-side` (Next.js 16.4.5 + React 19 + TypeScript + Tailwind CSS + Turbopack)  
**Lingkungan Live API:** `https://summarecon-admin.axtra.tech/api` (Backend Admin Terkunci / Live SQLite Database)  
**Terakhir Diperbarui:** 12 November 2026 — Fase 15 (*Floating Progress Line: Expand on Hover di Desktop & Line-Only di Mobile*)  
**Tujuan Dokumen:** Catatan lengkap seluruh progres pengembangan dari awal hingga kondisi terkini, arsitektur data, alur bisnis, integrasi API, serta temuan dan solusi teknis sebagai konteks utama (*master context*) bagi tim engineer maupun sistem AI Generatif lain.

> **⚠️ INSTRUKSI WAJIB (STANDING RULE UNTUK AI GENERATIF):**  
> Selalu perbarui dokumen `docs/PROGRES_DAN_ALUR_SISTEM.md` ini **setiap kali ada perintah atau perubahan baru** yang dikerjakan pada repositori ini, agar dokumen ini selalu menjadi *Single Source of Truth* progres proyek dari awal hingga kondisi paling mutakhir.

---

## 1. Ringkasan Eksekutif & Status Sistem

Aplikasi sisi pelanggan (*Customer Web*) **Summarecon Mall Bandung Event Ticketing** adalah platform web modern untuk penemuan acara, pemilihan tempat duduk interaktif (3 venue), reservasi atomik (*seat hold* 10 menit), pembayaran terpadu QRIS (7 menit), penerbitan e-ticket (1 QR per pesanan) disertai notifikasi pengiriman & pengingat WhatsApp otomatis (H-3 dan H-1), manajemen peserta mandiri (aturan cutoff H-1), serta pengajuan pengembalian dana (*refund*).

Aplikasi telah bertransformasi penuh dari prototipe berbasis mock data menjadi aplikasi web terintegrasi ke **Live Backend API** dan database SQLite server. Seluruh pemeriksaan kualitas kode (`npx tsc --noEmit`, `npm run lint`, dan `node test/seatmap-layout.test.mjs`) dinyatakan lulus dengan **0 error dan 0 warning**.

---

## 2. Matriks Status Fitur & Kesiapan Sistem

| Modul / Fitur | Rujukan Dokumen Analisis | Status | Keterangan & Detail Teknis |
|---|---|---|---|
| **Katalog & Eksplorasi Acara** | Bab 5.1 & 7.2 | Selesai (100%) | Fetch real-time `GET /api/events`. Filter dinamis (kategori, lokasi, tanggal, pencarian). Badge **`🔥 Event Terdekat`** di pojok kanan atas kartu acara (`top-3 right-3`) agar tidak menabrak tile tanggal di kiri atas. |
| **Denah Interaktif 3 Venue** | Bab 3.3, 6.1, 6.2 | Selesai (100%) | Koordinat normalisasi (`normalized_percent` 0–100%). Mendukung Atrium Cibadak (80 kursi: 40 VIP Block A & 40 Reguler Block B), Downtown Walk (Kuota/Standing), Sawarga Courtyard (Hybrid:Standing + Kuota + 12 Kursi Belakang). |
| **Diferensiasi Kategori Kursi (VIP vs Reguler)** | Bab 6.1 & UI Guide | Selesai (100%) | Deteksi akurat tanpa kesalahan substring `section_id`: **VIP/Premium** (Amber `#FFF8E7`, border `#D9822B`, teks `#8F4800`), **Reguler** (Teal `#E3F4F1`, border `#1F8F7E`, teks `#14665A`), **Pilihanmu** (Merah `#D93A2F`), **Ditahan** (Kuning `#E9A12B`), **Terjual** (Ungu `#6B5A6E`), **Terblokir** (Abu-abu `#9A8F95`). |
| **Persistensi Status Kursi (*Single Source of Truth*)** | Bab 6.2 & Audit Teknis | Selesai (100%) | Data kursi dari `GET /api/events/:id/seats` disimpan di `apiSeatsRef` dan dinormalisasi melalui `normalizeSeatStatus()`. Kursi berstatus `BLOCKED`, `SOLD`, atau `HELD`/`LOCKED` tidak pernah berubah menjadi `AVAILABLE` saat pengguna melakukan scroll atau re-render layout. |
| **Atomic Seat Hold (10 Menit)** | Bab 6.2 #6, Bab 10 | Selesai (100%) | Hold atomik hanya dipicu saat klik "Lanjut" via `POST /api/events/:id/holds`. Timer 10 menit dimulai saat hold terbit. Pelepasan hold mandiri (`heldSeatIds` -> `releasedSeatIds`) hanya mengembalikan kursi yang baru dibatalkan oleh user tersebut ke `AVAILABLE`, tanpa pernah menimpa kursi `SOLD`/`BLOCKED`. |
| **Formulir Data Pemesan & Peserta** | Bab 6.2 #3-#4, 6.5 | Selesai (100%) | Data pemesan 1x per transaksi (prefilled via `GET /api/auth/me`), nama peserta individual per tiket dengan format kursi jelas (`Blok A · Baris H · Kursi 05`). |
| **Pembayaran QRIS (7 Menit)** | Bab 7.3, 8.2, 11.1 | Selesai (100%) | Hitung mundur 7 menit (420 detik). Gateway QRIS terintegrasi dengan endpoint konfirmasi `POST /api/orders/:id/pay` untuk menandai status order `PAID` dan kursi `SOLD`. |
| **E-Ticket 1 QR per Order + Alert WhatsApp (H-3 & H-1)** | Bab 6.3 #6-#10, 8.6 | Selesai (100%) | Penerbitan 1 QR token resmi untuk seluruh tiket dalam satu pesanan melalui `GET /api/customer/orders/:id/qr`, dilengkapi banner notifikasi bahwa e-ticket telah dikirim ke nomor WhatsApp pemesan beserta pengingat otomatis pada **H-3** dan **H-1**. |
| **Manajemen Peserta (Cutoff H-1)** | Bab 6.5 #1-#5 | Selesai (100%) | Perubahan nama peserta mandiri di `/account/orders/[id]` dikunci otomatis jika waktu tersisa < 24 jam sebelum acara (zona WIB). |
| **Pengajuan Refund Peserta** | Bab 6.4, 7.4, 8.5 | Selesai (100%) | Pengajuan mandiri sebelum H-1 via `POST /api/customer/refunds` langsung masuk ke database SQLite admin (`201 Created`). |
| **Refund Pembatalan Acara** | Bab 6.4 #5-#10, 7.6 | Selesai (100%) | Banner event dibatalkan, denah non-interaktif (`DISABLED_EVENT_CANCELLED`), formulir rekening refund tanpa biaya administrasi (100%). |
| **Riwayat & Profil Pengguna** | Bab 5.1, Bab 8.1 | Selesai (100%) | Halaman `/account/orders` menampilkan jam pesanan lengkap (`🕒 Dipesan: ... WIB`), ringkasan QR scan, dan status pesanan bertingkat. |
| **Responsivitas Viewport Mobile** | Bab 3.1 & Style Guide | Selesai (100%) | Target sentuh >= 48px, drawer bottom sheet ringkasan tiket, toggle fokus blok, hamburger menu di dalam navbar pill, zero layout shift. Audit 360px Fase 13–15: bunga hero sejajar tombol CTA, legenda `flex-wrap`, kontrol zoom tepat di bawah legenda, tombol simulator tidak terpotong, progress line murni line-only tanpa dropdown pada layar sempit. |
| **Navbar, Floating Progress Line, & Sticky Timer** | Style Guide & UX Audit | Selesai (100%) | Navbar global `sticky top-0 z-50` (tinggi via CSS var `--header-h`: 88px / 76px ≤600px). Floating Progress Line `sticky top-[var(--header-h)] z-[45]` (expand on hover di desktop dengan kartu detail melayang via `absolute top-full`, line-only di mobile). Kapsul timer hold (`/order/:id`, mobile `< lg`) dan timer QRIS 7 menit (`/payment/:id`) melayang bersih tanpa blok latar putih (`sticky top-[calc(var(--header-h)+12px)] z-40 bg-transparent pointer-events-none`). |

---

## 3. Kronologi Progres Pengembangan dari Awal hingga Saat Ini

### Fase 1: Fondasi Proyek & Mock Prototype Awal
- Setup arsitektur Next.js 16 (Turbopack) dengan React 19, TypeScript strict mode, dan Tailwind CSS.
- Pembuatan komponen fondasi: `Header`, `Footer`, `StatusBadge`, palet warna Summarecon (`Vermilion #D93A2F`, `Plum Ink #2A1F2D`, `Cream #FDFBF7`, `Amber Gold #D9822B`, `Sage/Teal #1F8F7E`).
- Pemodelan state lokal Zustand (`useBookingStore`, `useAuthStore`) dan dummy JSON untuk pengujian tata letak awal.

### Fase 2: Migrasi 100% ke Live Backend API & Solusi Jaringan
- Mengeliminasi ketergantungan pada data statis dan menghubungkan service layer ke `https://summarecon-admin.axtra.tech/api`.
- Menyelesaikan masalah timeout IPv6 Windows dengan menambahkan `dns.setDefaultResultOrder("ipv4first")` di `next.config.ts`.
- Mengimplementasikan layout denah data-driven berbasis koordinat normalisasi 0–100% untuk Atrium Cibadak (80 kursi), Downtown Walk (Festival Kuota), dan Sawarga Courtyard (Hybrid).

### Fase 3: Pembangunan Portal Akun & Aturan Bisnis H-1
- Membangun seluruh rute akun pengguna:
  - `/account/orders` (daftar riwayat pesanan dengan tanggal dan jam WIB lengkap).
  - `/account/orders/[id]` (detail pesanan, rincian tiket, formulir ubah nama peserta, formulir refund).
  - `/account/profile` (informasi profil pengguna terotentikasi dan tombol logout aman).
- Penegakan aturan cutoff H-1 (24 jam sebelum acara di zona Asia/Jakarta) pada `src/lib/time-utils.ts` untuk mengunci perubahan nama dan pengajuan refund mandiri.

### Fase 4: Penyempurnaan Responsivitas Mobile (Samsung 360px & iPhone)
- **Denah Kursi Mobile**: Menambahkan fitur `Fokus Blok` (Block Focus Mode) yang memisahkan Block A dan Block B menjadi grid 5 kolom touch-friendly dengan ukuran kursi 44×44px dan gutter 8px rapi.
- **Navbar Responsif**: Merestrukturisasi navigasi mobile menjadi burger drawer elegan yang berada **di dalam pill navbar** (bukan di luarnya), memuat link Acara, Cara Pesan, Tiket Saya, dan Profil.
- **Legenda Denah Terstruktur**: Menata legenda status kursi menjadi format 2 baris (3 badge di atas, 3 badge di bawah) tanpa ada teks yang terpotong.
- **Status Pembayaran Responsif**: Mengubah kontainer status pesanan dan status pembayaran menjadi `grid grid-cols-1 sm:grid-cols-2 gap-2` untuk mencegah badge keluar jalur (*overflow*) pada layar sempit.

### Fase 5: Integrasi Penuh Database SQLite, Sinkronisasi Harga, & Perbaikan Logika Bisnis
1. **Konfirmasi Pembayaran Nyata (`POST /api/orders/:id/pay`)**:
   - Menambahkan pemanggilan API `payOrder` saat transaksi berhasil. Status pesanan di SQLite admin bertransisi ke `PAID` dan status kursi di denah admin berubah menjadi `SOLD` (bukan diblokir/tertahan).
2. **Pengajuan Refund Masuk ke Admin (`POST /api/customer/refunds`)**:
   - Menstandarkan payload refund dengan format flat (`order_id` string, `reason`, `dest_method`, `dest_provider_name`, `dest_account_number`, `dest_account_holder`). Teruji sukses menghasilkan HTTP `201 Created` dan tercatat langsung di tabel refund admin.
3. **Pelepasan Seat Lock & Mengatasi Alert Halaman**:
   - Memperbaiki bug `.map(Number)` pada string ID hold (`HLD-...`).
   - Menyimpan `releasedSeatIds` di Zustand store sehingga ketika customer membatalkan hold dan kembali ke denah, kursi yang bersangkutan langsung berstatus `AVAILABLE`.
   - Menghilangkan alert/modal konfirmasi berulang dengan mereset state saat navigasi.
4. **Sinkronisasi Harga Real (`Rp 350.000` & `Rp 250.000`)**:
   - Menghitung harga tiket dari array `categories` API pada `events.ts` dan `SeatMap.tsx`, menggantikan harga default flat Rp 300.000.
5. **Penjelasan Identitas Kursi di E-Ticket & Ringkasan**:
   - Fungsi utilitas `formatSeatDisplayName` memformat nomor kursi menjadi `Blok A · Baris H · Kursi 05` secara seragam di seluruh aplikasi.
6. **Dukungan Event Baru "Bandung Fest" (`EVT-V3-002`)**:
   - Menambahkan kalkulasi kuota otomatis `capacity - sold - blocked` saat backend mengirim `available: 0`, serta template generator fallback untuk venue Sawarga Courtyard.

### Fase 6: Perbaikan Next.js 16 Dynamic Route & Pencegahan Error 404 Console
1. **Perbaikan Next.js 16 Suspense Boundary (`usePathname`)**:
   - Membungkus komponen `HeaderWithPathname` di dalam `<Suspense fallback={<HeaderView pathname="" />}>` pada `src/components/shared/Header.tsx` untuk mengatasi error `Route "/event/[id]": Next.js encountered URL data usePathname() in a Client Component outside of <Suspense>`.
2. **Pencegahan Error 404 di Console pada Detail Pesanan**:
   - Membuat Route Handler lokal `src/app/api/customer/orders/[id]/route.ts` dan strategi resolusi list-first di `fetchMyOrder()` agar permintaan detail pesanan (termasuk order simulasi `ORD-SIM-...`) tidak pernah menghasilkan error merah `404 (Not Found)` di DevTools Console.

### Fase 7: Perbaikan Kritikal Persistensi Status Kursi, Distribusi Kursi VIP vs Reguler, Badge Event Terdekat, & Alert WhatsApp E-Ticket
1. **Perbaikan Posisi Badge `🔥 Event Terdekat` (`src/components/shared/EventExplorer.tsx`)**:
   - Memindahkan posisi badge `🔥 Event Terdekat` dari kiri atas (`top-3 left-3`) ke kanan atas (`top-3 right-3 items-end`) agar tidak lagi menabrak tile tanggal acara (`01 DES`) yang berada di kiri atas kartu event.
2. **Perbaikan Distribusi Kursi VIP vs Reguler di Venue (`src/components/seat-map/SeatMap.tsx` & `VenueRenderer.tsx`)**:
   - Mengidentifikasi dan memperbaiki bug di mana seluruh kursi sebelumnya tampil sebagai VIP/Premium akibat pengecekan `s.section_id?.includes("A")` yang secara keliru bernilai `true` untuk `"SEC-ATR-B"` (mengandung huruf `"A"` pada `"ATR"`) dan `"SEC-SWG-SEAT"` (mengandung huruf `"A"` pada `"SEAT"`).
   - Mengganti deteksi dengan pengecekan eksplisit `s.block_code === "BLOCK_B" || s.section_id?.toUpperCase().endsWith("-B") || num > 5`.
   - Kini pada **Atrium Cibadak (80 kursi)**: **Block A (Kursi 01–05, 40 kursi)** tampil sebagai **VIP / Premium** (Amber) dan **Block B (Kursi 06–10, 40 kursi)** tampil sebagai **Reguler** (Teal). Pada **Sawarga Courtyard (12 kursi belakang)**: **Kursi 01–06** tampil sebagai **VIP / Premium** dan **Kursi 07–12** tampil sebagai **Reguler**.
3. **Penambahan Alert Notifikasi WhatsApp E-Ticket & Pengingat H-3 / H-1 (`src/app/ticket/[id]/TicketPageClient.tsx` & `OrderPageClient.tsx`)**:
   - Menyimpan nomor telepon pembeli dari pengisian form pemesanan ke state pesanan aktif (`buyer.phone_number`) dan `useBookingStore`.
   - Menampilkan alert bergaya Summarecon Style Guide di halaman E-Ticket yang menginformasikan bahwa e-ticket beserta QR code telah dikirimkan melalui WhatsApp ke nomor telepon pembeli, serta pembeli akan menerima pesan pengingat otomatis pada **H-3** dan **H-1** sebelum acara melalui WhatsApp.
4. **Perbaikan Kritikal: Kursi `BLOCKED`, `SOLD`, dan `HELD` Berubah Menjadi `AVAILABLE` Saat Scroll / Re-render (`SeatMap.tsx`, `VenueRenderer.tsx`, `useBookingStore.ts`, `events.ts`)**:
   - Menjadikan response `GET /api/events/:id/seats` sebagai **Single Source of Truth** yang disimpan di `apiSeatsRef` pada `SeatMap.tsx`.
   - Memperbaiki `adaptCustomerEvent` di `src/lib/data/events.ts` agar memprioritaskan `event.event_id` di atas `event.slug` sehingga ID event tidak berubah saat re-fetch metadata di halaman booking.
   - Memisahkan `useEffect` pemuatan data awal agar hanya bergantung pada `event.id`, sehingga event scroll atau perubahan state lokal tidak pernah me-reset array kursi ke fallback sintetis `AVAILABLE`.
   - Menambahkan fungsi `normalizeSeatStatus()` di `VenueRenderer.tsx` agar status `"HELD"`, `"RESERVED"`, `"LOCKED"`, `"BLOCKED"`, dan `"SOLD"` selalu dikenali secara ketat dan tidak pernah jatuh ke cabang `else` (`AVAILABLE`).
   - Memperketat logika `heldSeatIds` dan `releasedSeatIds` di `useBookingStore.ts` serta `SeatMap.tsx` sehingga `releasedSeatIds` **hanya** dapat mengubah status kursi yang tadinya `LOCKED`/`HELD` (milik user yang baru membatalkan hold) menjadi `AVAILABLE`, dan **tidak pernah** menimpa kursi berstatus `BLOCKED` atau `SOLD` dari backend.

### Fase 8: Penyempurnaan Siklus Pembatalan Hold (`releasedSeatIds` Persistent Override), Visibilitas Alert WhatsApp E-Ticket, & Responsivitas Tombol Simulator
1. **Perbaikan Responsivitas Tombol "Kedaluwarsa" pada Simulator Sandbox (`src/app/payment/[id]/PaymentPageClient.tsx`)**:
   - Mengubah tata letak 3 tombol simulator callback (`Bayar Sukses`, `Bayar Gagal`, `Kedaluwarsa`) pada layar mobile sempit (`360px`) menjadi `flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2.5 px-1.5 sm:px-3 text-[10px] sm:text-xs leading-tight`, sehingga kata `"Kedaluwarsa"` tidak lagi terpotong atau keluar batas tombol.
2. **Pembatasan Tampilan Alert WhatsApp Hanya Sesaat Setelah Generate E-Ticket (`src/app/ticket/[id]/TicketPageClient.tsx` & `PaymentPageClient.tsx`)**:
   - Menambahkan penanda khusus (`?generated=1` dan one-time flag `sessionStorage` `summa_ticket_just_generated`) saat navigasi otomatis dari halaman pembayaran yang sukses ke `/ticket/:id`.
   - Alert notifikasi pengiriman WhatsApp & pengingat H-3 / H-1 kini **hanya muncul tepat setelah pengguna men-generate e-ticket** dari pembayaran, dan **tidak muncul kembali** ketika pengguna membuka e-ticket melalui menu **Tiket Saya** (`/account/orders` atau `/account/orders/[id]`).
3. **Perbaikan Kritikal: Kursi Batal Hold Masih Berstatus "Ditahan" Saat Kembali ke Denah (`useBookingStore.ts`, `SeatMap.tsx`, `VenueRenderer.tsx`, `OrderPageClient.tsx`)**:
   - **Akar Masalah**:
     1. Saat kembali ke `/event/:id/book`, pemanggilan `setEvent(event.id)` di `SeatMap.tsx` sebelumnya me-reset `releasedSeatIds: []` jika `state.eventId` bernilai `null`.
     2. Di `toggleSeat`, klik kursi menghapus ID kursi dari `releasedSeatIds`, sehingga kursi yang baru dirilis langsung kembali menjadi `"LOCKED"` saat diklik.
     3. `releasedSeatIds` sebelumnya hanya disimpan di memori Zustand tanpa dipersist ke `sessionStorage`.
   - **Solusi**:
     1. Menyimpan `releasedSeatIds` secara persisten di `sessionStorage` (`summa_released_seats`) melalui `saveReleasedToSession()` dan `loadReleasedFromSession()`, serta mengekspansi seluruh variasi ID kursi (`expandSeatIdentifiers`: `ATR-A-06`, `A06`, `A-06`) secara sinkron di awal `releaseHold()` sebelum navigasi kembali ke denah.
     2. Memastikan `setEvent()` dan `toggleSeat()` tidak pernah menghapus `releasedSeatIds` (hanya dihapus kembali jika kursi tersebut berhasil dikunci ulang melalui `createHold()`).
     3. Menerapkan *local override* berlapis di `SeatMap.tsx` dan `VenueRenderer.tsx`: jika kursi ada di `releasedSeatIds` **DAN** status API adalah `"LOCKED"` / `"HELD"`, statusnya diubah menjadi `"AVAILABLE"` (bisa dipilih lagi), namun **tidak pernah** menimpa kursi berstatus `"SOLD"` atau `"BLOCKED"`.

### Fase 9: Perbaikan Pelepasan Kursi Saat Pembayaran Gagal atau Kedaluwarsa (`PaymentPageClient.tsx` & `useBookingStore.ts`)
1. **Akar Masalah**:
   - Di halaman Pembayaran QRIS (`/payment/:id`), ketika transaksi berstatus **Pembayaran Gagal** (`FAILED`) atau **Waktu Pembayaran Kedaluwarsa** (`EXPIRED`) dan pengguna menekan tombol **"Pesan Ulang Tiket"** atau **"Kembali ke Denah"**, *handler* tombol sebelumnya hanya memanggil `resetBooking()` alih-alih `releaseHold(event.id)`.
   - `resetBooking()` mengosongkan `selectedSeats` dan `heldSeatIds` tanpa memindahkan ID kursi tersebut ke dalam `releasedSeatIds`, sehingga saat pengguna kembali ke `/event/:id/book`, kursi masih tampil berstatus **Ditahan** (warna kuning / `LOCKED`).
2. **Solusi Teknis**:
   - Mengganti aksi tombol **"Pesan Ulang Tiket"** dan **"Kembali ke Denah"** di `src/app/payment/[id]/PaymentPageClient.tsx` menjadi `handleRetryBooking()`, yang memanggil `await releaseHold(event?.id || id)`, menghapus `summa_active_order`, lalu mengarahkan pengguna ke `/event/:id/book`.
   - Memanggil `void releaseHold(event?.id || id)` secara otomatis begitu status pembayaran berubah menjadi `FAILED` atau `EXPIRED` (baik melalui simulator maupun saat timer 7 menit habis), sehingga meskipun pengguna menekan tombol *Back* bawaan browser, kursi tetap sudah masuk ke `releasedSeatIds`.
   - Menambahkan `hydrateFromStorage()` saat `PaymentPageContent` di-*mount* serta fallback rincian tiket ke `activeOrder.items` agar ringkasan pesanan di kolom kanan tetap tampil utuh saat status pembayaran gagal/kedaluwarsa.
   - Memperkuat `releaseHold()` di `src/lib/store/useBookingStore.ts` dengan fungsi `expandSeatKeyVariants()` dan `loadActiveOrderSeatKeys()` yang mengekstrak seluruh kemungkinan variasi ID kursi (`ATR-A-02`, `A-02`, `A02`) baik dari state Zustand, `summa_booking_state`, maupun `summa_active_order` di `sessionStorage`.

### Fase 10: Urutan Eksekusi Sinkron-Asinkron `DELETE /api/events/:id/holds` (`keepalive: true`) & Persistensi Lintas-Navigasi
1. **Akar Masalah**:
   - Ketika pengguna membatalkan pembayaran di `/payment/:id` lalu kembali ke denah, keluar dari denah, dan masuk kembali ke denah, kursi berisiko kembali tampil sebagai `"Ditahan"` jika:
     1. Pemanggilan `DELETE /api/events/:id/holds` dilakukan tanpa `await` (*fire-and-forget*) atau tanpa `keepalive: true`, sehingga dibatalkan (*aborted*) oleh browser saat berpindah halaman.
     2. State `holdId` / `summa_booking_state` dihapus sebelum `releaseHolds()` selesai membaca `hold_id`, atau `hold_id` belum tersimpan di dalam `summa_active_order`.
     3. Saat keluar dan masuk kembali ke rute denah yang sama (`state.eventId === eventId`), `setEvent()` dan `VenueRenderer.tsx` belum menggabungkan ulang `loadReleasedFromSession()`, atau browser memakai cache HTTP pada `GET /api/events/:id/seats`.
2. **Solusi Teknis**:
   - **Urutan Eksekusi Ketat di `useBookingStore.ts` (`releaseHold`) & `PaymentPageClient.tsx` (`handleRetryBooking`)**:
     1. Menyimpan `hold_id`, `hold_ids`, dan `event_id` ke dalam `summa_active_order` saat order dibuat di `OrderPageClient.tsx`.
     2. Mengekstrak `hold_id` / `holdIds` serta `seatIds` dari `state`, `summa_booking_state`, dan `summa_active_order` **sebelum** menghapus state/sessionStorage apa pun.
     3. Memanggil `await releaseHolds(resolvedEventId, idsToRelease, rawSeatIdsToRelease)` dan **menunggu (`await`) hingga selesai** dengan penanganan error `try / catch`.
     4. **Baru setelah** `await releaseHolds()` selesai, menyimpan `releasedSeatIds` ke `sessionStorage` + `localStorage` (dengan TTL 10 menit), menghapus `summa_booking_state` & `summa_active_order`, mereset state Zustand, dan mengeksekusi `router.push(/event/:id/book)`.
   - **Konfigurasi `keepalive: true` & `cache: "no-store"` di `customerApi.ts`**:
          - Menambahkan listener `window.addEventListener("storage", ...)` pada `AccountOrdersPage` sehingga pembaruan transaksi di tab lain atau saat alur checkout tuntas seketika merefresh daftar pesanan tanpa reload manual.
       6. **Auto-Persistence pada E-Ticket (`src/app/ticket/[id]/TicketPageClient.tsx`)**:
          - Menambahkan effect otomatis pada `TicketPageClient` yang mengunci dan menyimpan pesanan aktif ke dalam `localStorage.summa_customer_orders` sebagai `PAID` begitu E-Ticket berhasil dibuka.
       7. **Perbaikan Layout Status Bar QRIS & Anti-Overflow Badge (`src/app/payment/[id]/PaymentPageClient.tsx`)**:
          - Mengubah status bar di atas QR code menjadi kapsul baris vertikal terisolasi (`w-full flex flex-col gap-2`) berlatar `bg-stone-50 border border-stone-200/60 rounded-xl px-3 py-2 flex items-center justify-between`.
          - Menghilangkan total masalah teks *"Status Pembayaran:"* bertabrakan dengan badge serta mencegah badge meluber keluar batas kartu.
       8. **Standardisasi Target Rute Navigasi Checkout (`src/app/order/[id]/OrderPageClient.tsx`)**:
          - Memperbaiki target rute menjadi `/payment/${eventId}?orderId=${targetOrderKey}` sehingga parameter rute selalu berupa event ID yang valid.
     - Menambahkan `keepalive: true` serta mengirimkan `{ hold_id, hold_ids, event_seat_ids, seat_ids }` pada `releaseHolds()` (`DELETE /api/events/:id/holds`) agar request tidak pernah di-*abort* oleh browser saat komponen *unmount*.
     - Menambahkan `{ cache: "no-store" }` pada `fetchEventSeats()` (`GET /api/events/:id/seats`).
   - **Sinkronisasi Penuh Saat Keluar-Masuk Denah**:
     - Memperbarui `setEvent()` di `useBookingStore.ts`, `SeatMap.tsx`, dan `VenueRenderer.tsx` agar selalu menggabungkan `loadReleasedFromSession()` setiap kali masuk kembali ke halaman denah.

11. **Fase 11 — Validasi Ketat "Cek Status Pembayaran", CTA "Lanjutkan Pembayaran", & Timer QRIS 7 Menit Persisten (Selesai)**:
    - **Perbaikan Handler "Cek Status Pembayaran" (`src/app/payment/[id]/PaymentPageClient.tsx`)**:
      - Memperbaiki pencarian pesanan pada `handleCheckStatus` agar mencocokkan secara spesifik berdasarkan `id` / `order_id` / `order_code` dari `activeOrder` saat ini (dan memanggil `fetchMyOrder(targetOrderId)` terlebih dahulu), bukan mencocokkan pesanan lama milik user pada event yang sama (`String(o.event?.id) === String(id)`).
      - Memperbaiki bug *operator precedence* pada evaluasi status pembayaran dan memastikan redirect ke `/ticket/:id?generated=1` **hanya** dieksekusi apabila status order/payment dari API benar-benar `"PAID"` atau `"SUCCESS"`.
      - Jika status pesanan masih `"UNPAID"` atau `"PENDING"`, pengguna tetap berada di halaman pembayaran dan mendapatkan banner alert status (`role="status"`): *"Pembayaran belum diterima. Silakan selesaikan pembayaran melalui kode QRIS di atas."*
    - **Penambahan Tombol "Lanjutkan Pembayaran" di Detail & Riwayat Pesanan (`src/app/account/orders/[id]/page.tsx` & `src/app/account/orders/page.tsx`)**:
      - Menambahkan validasi kondisional untuk pesanan berstatus `"UNPAID"` atau `"PENDING"` yang belum kedaluwarsa (`getPaymentSecondsRemaining(order) > 0`).
      - Menampilkan tombol CTA utama (`bg-[#D93A2F]`) **"Lanjutkan Pembayaran"** beserta indikator hitung mundur sisa waktu real-time dan banner informasi yang menyimpan kembali pesanan ke `summa_active_order` lalu mengarahkan pengguna ke `/payment/[orderId]`.
      - Menambahkan penyimpanan pesanan `UNPAID` secara langsung ke `localStorage` (`summa_customer_orders`) saat order dibuat di `src/app/order/[id]/OrderPageClient.tsx` sehingga pesanan yang belum dibayar langsung tampil di Riwayat Pesanan dengan `created_at` dan `expires_at` yang akurat.
    - **Persistensi Timer Pembayaran QRIS 7 Menit (420 Detik) Berbasis Timestamp (`src/lib/time-utils.ts` & `src/app/payment/[id]/PaymentPageClient.tsx`)**:
      - Menambahkan fungsi `parseTimestampMs()`, `getPaymentExpiryTimestampMs()`, dan `getPaymentSecondsRemaining()` di `src/lib/time-utils.ts` yang menghitung sisa waktu secara deterministik menggunakan rumus `Sisa Waktu = Waktu Kedaluwarsa - Waktu Saat Ini` (dari `payment_expires_at` / `expires_at` atau `created_at + 7 menit`).
      - Mengganti state statis `useState(420)` di `PaymentPageClient.tsx` dengan kalkulasi real-time terhadap timestamp kedaluwarsa absolut sehingga timer tidak pernah tereset ke `07:00` atau hilang saat pengguna berpindah halaman (misal ke Riwayat Pesanan lalu kembali ke halaman Pembayaran).

12. **Fase 12 — Perbaikan Tombol Pembayaran *Stuck* pada Form Pesanan & Data Kursi E-Ticket Dinamis (Selesai)**:
    - **Perbaikan Tombol *Stuck* & Reuse Order Aktif (`src/app/order/[id]/OrderPageClient.tsx`)**:
      - Menambahkan blok `finally { setIsSubmitting(false); }` pada `handleSubmitOrder` serta listener event `pageshow`, `popstate`, dan `visibilitychange` di `useEffect` agar state loading tombol **"Lanjut ke Pembayaran QRIS →"** selalu ter-reset saat pengguna melakukan navigasi mundur (Back) dari halaman QRIS ke halaman Data Peserta.
      - Menambahkan logika cerdas: apabila di `sessionStorage` (`summa_active_order`) sudah terdapat pesanan aktif berstatus `"UNPAID"` / `"PENDING"` yang belum kedaluwarsa untuk event dan hold kursi yang sama, klik tombol submit akan memperbarui data `buyer` serta `items` pada pesanan tersebut lalu langsung menavigasi ke `router.push('/payment/' + existingOrderId)` tanpa memanggil `createOrder()` ulang.
    - **Perbaikan *Data Binding* Dinamis pada E-Ticket (`src/app/ticket/[id]/TicketPageClient.tsx` & `src/lib/utils.ts`)**:
      - Menghapus teks *hardcoded* (`"Blok A · Baris A · Kursi 01"`) dan memperbaiki pencarian order di `TicketPageClient.tsx` agar mencocokkan `orderId` / `order_code` secara spesifik (tidak lagi tertimpa oleh order lama `ORD-2026-0008` akibat pencocokan `event.id` semata).
      - Memetakan bagian `Daftar Peserta & Tempat Duduk` (`attendeeItems`) secara langsung dari `orderDetails.items` dengan memformat posisi kursi menggunakan `formatSeatDisplayName(item.seat ? { ...item, ...item.seat } : item)`.
      - Memperkaya `formatSeatDisplayName()` di `src/lib/utils.ts` agar mendukung objek bersarang `item.seat`, `event_seat_id`, `seat_id`, kode venue (`ATR`, `SWG`, `DWT`), dan label kursi yang sudah terformat tanpa duplikasi kata `"Kursi"`.

13. **Fase 13 — Audit UI Mobile 360px: Perbaikan Layout, Sticky Navbar, & Sticky Timer (Selesai, 12 Nov 2026)**:
    - **Temuan Akar Masalah Global (WAJIB DIKETAHUI AI LAIN)**: `src/styles/globals.css` (file CSS yang di-import `src/app/layout.tsx`; `src/app/globals.css` **tidak dipakai**) berisi class legacy **tanpa `@layer`** (`.site-header`, `.back-link`, `.detail-hero h1`, `.selection-limit`, `.selection-panel`, dll.). Di Tailwind v4, utilitas berada di `@layer utilities`, sehingga **CSS unlayered selalu menang** atas class Tailwind pada properti yang sama. Contoh: `mb-4` pada `<p className="selection-limit">` diabaikan karena `.selection-limit { margin: 12px 0 0 }`. Saat menambah utilitas Tailwind pada elemen yang juga memakai class legacy, cek dulu rule-nya di `src/styles/globals.css` lalu ubah rule tersebut (atau hapus class legacy-nya).
    - **CSS Variable Tinggi Navbar**: `:root { --header-h: 88px }` dan `76px` pada `@media (max-width: 600px)`. `html { scroll-padding-top: var(--header-h) }` agar anchor `/#events` & `/#how-it-works` tidak tertutup navbar sticky. Seluruh elemen sticky lain memakai offset `top-[var(--header-h)]` / `lg:top-[calc(var(--header-h)+16px)]`.
    - **#1 Hero (`EventExplorer.tsx` + `globals.css` mobile)**: Grafis bunga (`.hero-bloom`) di mobile kini `bottom: 44px; width: 92px; z-index: 0; pointer-events: none`, `.hero-copy` & `.hero-cta` diberi `relative z-10`, dan `.hero-content` diberi `padding-bottom: 156px` sehingga bunga selalu berada di bawah tombol CTA "Temukan acaramu ↓" (tidak overlap). `.hero-location` dibatasi `max-width: calc(100% - 112px)` agar tidak menabrak bunga.
    - **#2 Badge Detail Event (`src/app/event/[id]/page.tsx`)**: Container badge "Tiket Tersedia" + lokasi diberi `mt-4 sm:mt-5 flex flex-wrap items-center gap-2 sm:gap-2.5` (karena `.detail-hero h1` me-reset margin-bottom h1 → 0). Badge lokasi `max-w-full` + nama venue `truncate`.
    - **#3 Kontrol Zoom Denah Penuh (`VenueRenderer.tsx`)**: Legenda dipindah ke baris sendiri; panel zoom `− 100% + | Reset` kini statis di **bawah** frame denah (`w-full flex justify-center`), target sentuh `40px` di mobile, tombol disabled di batas 80%/140%, `role="group"` + `aria-label`. Skala memakai CSS `zoom` (bukan `transform: scale`) sehingga ukuran layout ikut berubah — konten yang diperbesar tetap di dalam frame `overflow-auto` dan tidak menabrak elemen lain.
    - **#4 Legenda (`SeatLegend.tsx`)**: Ditulis ulang data-driven (`LEGEND_ITEMS`) dalam satu `<ul className="flex flex-wrap justify-center gap-1.5 sm:gap-2.5">` dengan item berlebar alami, teks `text-[10px] sm:text-xs`, swatch `w-3.5 sm:w-5`. Tidak lagi memakai `grid-cols-3` (penyebab "VIP / Premium" meluap di 360px).
    - **#5 Disclaimer "Maksimal 4 tiket..." (`src/app/event/[id]/book/page.tsx` + `globals.css`)**: `.selection-limit` diubah menjadi `margin: 12px 0 16px` (`mb-4`) sehingga ada jarak aman sebelum tombol "Lanjut ke Data Peserta", termasuk pada drawer mobile (`mb-3`).
    - **#6 Tombol Simulator Sandbox (`PaymentPageClient.tsx`)**: Tombol `Bayar Sukses / Bayar Gagal / Kedaluwarsa` kini selalu ikon-di-atas-teks (`flex-col`), `min-w-0 min-h-[52px] px-1 sm:px-2 text-[10px] sm:text-xs tracking-tight whitespace-normal break-words text-center`, card simulator `p-4 sm:p-5` → lebar konten tombol ±74px di 360px sehingga "Kedaluwarsa" muat penuh tanpa terpotong.
    - **#7 Navigasi Atas E-Ticket (`TicketPageClient.tsx`)**: Dua link dibungkus `flex flex-row justify-between items-center w-full gap-3`, keduanya `inline-flex items-center min-h-10 leading-none whitespace-nowrap`; class `.back-link` (margin-bottom 23px, penyebab misalignment) dilepas. Di mobile teks kanan disingkat menjadi "Pesanan Saya →" ("Lihat Semua" tampil mulai `sm:`).
    - **#8 Daftar Peserta E-Ticket (`TicketPageClient.tsx`)**: Item peserta `flex flex-col sm:flex-row gap-2 sm:gap-3`, nama `min-w-0 break-words`, badge kursi `self-start shrink-0`; jarak antar item `space-y-2.5`.
    - **#9 Sticky Timer**:
      - `CountdownTimer.tsx` kini menerima prop `variant?: "default" | "compact"` (compact = satu baris, titik berkedip, merah gelap saat ≤ 60 detik). Logika store tidak berubah.
      - `/order/:id` (`OrderPageClient.tsx`): bar `lg:hidden sticky top-[var(--header-h)] z-40 -mx-4 px-4 py-2 bg-white/95 backdrop-blur-sm border-b` berisi `<CountdownTimer variant="compact" />` tepat di bawah heading; kartu timer sidebar hanya tampil `lg:` dan sidebar memakai `lg:sticky lg:top-[calc(var(--header-h)+16px)]`.
      - `/payment/:id` (`PaymentPageClient.tsx`): timer QRIS 7 menit dipindah dari dalam kartu QR menjadi bar halaman `sticky top-[var(--header-h)] z-40` (semua viewport, hanya saat `paymentStatus === "PENDING"`).
      - Aside sticky lain (`/event/:id` booking card & `/event/:id/book` selection panel) diganti dari `sticky top-6` menjadi `lg:sticky lg:top-[calc(var(--header-h)+16px)]` agar tidak tertutup navbar sticky.
    - **#10 Navbar Global (`Header.tsx`)**: `<header className="site-header sticky top-0 z-50 bg-white shadow-sm">`; rule `.site-header` di CSS hanya menyisakan `height: var(--header-h)` + padding (position/z-index/background dihapus dari CSS agar utilitas Tailwind berlaku). Drawer mobile (`absolute top-full`) tetap berfungsi karena elemen sticky juga merupakan containing block.
    - **Verifikasi**: `npx tsc --noEmit` (exit 0), `npm run lint` (exit 0), dan `node test/seatmap-layout.test.mjs` (exit 0).

14. **Fase 14 — Penyempurnaan Hero Mobile, Posisi Kontrol Zoom, Floating Sticky Timer, & Interactive Booking Progress Bar (Selesai, 12 Nov 2026)**:
    - **#1 Penyelarasan Ilustrasi Kelopak Bunga dengan Tombol "Temukan acaramu ↓" di Mobile (`src/styles/globals.css`)**:
      - Pada `@media (max-width: 600px)`, posisi `.hero-bloom` dinaikkan ke `right: 8px; bottom: 64px; width: 86px; opacity: .88` dan `.hero-content` dirapatkan menjadi `min-height: 410px; padding-block: 48px 84px` (serta `.hero { min-height: 430px }` dan `.hero-location { bottom: 34px }`).
      - Dengan konfigurasi ini, pusat visual kelopak bunga berada tepat di sebelah kanan tombol CTA `.hero-cta` ("Temukan acaramu ↓") secara sejajar horizontal tanpa menabrak tombol tersebut, sekaligus menghilangkan ruang kosong berlebih antara tombol CTA dan teks lokasi.
    - **#2 Pemindahan Kontrol Zoom Denah Penuh ke Bawah Legenda (`src/components/seat-map/VenueRenderer.tsx`)**:
      - Pada mode `viewMode === "full"`, blok kontrol zoom (`− 100% + | Reset`) dipindahkan dari bagian paling bawah denah ke **tepat di bawah komponen `<SeatLegend compact={true} />` dan di atas frame/kanvas pemilihan kursi** dengan wrapper `w-full mt-2.5 mb-3 flex justify-center`.
    - **#3 Floating Sticky Timer Tanpa Blok Latar Belakang Putih (`src/app/order/[id]/OrderPageClient.tsx`, `src/app/payment/[id]/PaymentPageClient.tsx`, `src/components/shared/CountdownTimer.tsx`)**:
      - Menghapus class `bg-white/95 backdrop-blur-sm border-b -mx-4 px-4 py-2` pada wrapper luar `sticky` di halaman Order dan Payment.
      - Menambahkan `pointer-events-auto shadow-md bg-amber-50/95 backdrop-blur-xs border border-amber-300/90` langsung pada kapsul timer (`CountdownTimer` varian `compact` dan kapsul timer QRIS 7 menit) sehingga saat halaman di-*scroll*, hanya kapsul timernya saja yang melayang bersih tanpa blok putih di belakangnya.
    - **#4 Komponen Stepper Interaktif 3 Langkah (`src/components/shared/BookingProgressBar.tsx`)**:
      - Membuat komponen awal `BookingProgressBar` 3 langkah: (1) *Pilih Kursi*, (2) *Isi Data Diri*, (3) *Pembayaran*.

15. **Fase 15 — Konsep Floating Progress Line on Scroll: Expand on Hover di Desktop, Line-Only di Mobile, & Hirarki Sticky Timer (Selesai, 12 Nov 2026)**:
    - **Progress Bar Lengkap Statis di Posisi Awal**:
      - Pada bagian atas halaman (alur dokumen normal), komponen `BookingProgressBar` tetap merender kartu stepper lengkap (`ref={staticRef}`): nomor langkah, persentase penyelesaian, progress bar gradient, dan 3 langkah interaktif (Pilih Kursi · Denah & kategori, Isi Data Diri · Data pemesan & peserta, Pembayaran · Selesaikan via QRIS).
      - Dilengkapi `IntersectionObserver` (dengan `rootMargin: "-88px 0px 0px 0px"`) serta listener `scroll`/`resize` sinkron untuk mendeteksi secara akurat saat progress bar statis telah terlewati oleh *scroll* (`isScrolledPast === true`).
    - **Floating Progress Line Saat Di-Scroll + Desktop Hover Expansion**:
      - Ketika `isScrolledPast === true`, elemen floating aktif melayang tepat di bawah *sticky navbar*: `fixed top-[var(--header-h)] left-0 right-0 z-[45]`.
      - **Warna Solid Tegas & Identik dengan Progress Bar Lengkap (Tanpa Disamarkan)**:
        - Container melayang menggunakan bar putih solid `w-full bg-white border-b border-[#E8DFC9] shadow-2xs pointer-events-auto` tepat menempel di bawah navbar sehingga konten halaman yang di-*scroll* tidak tembus (*no bleed-through*) dan tidak menyamarkan warna garis.
        - Garis progres melayang menggunakan track solid `bg-[#F3EFEA]` dengan border `border-[#E8DFC9]/80` dan isi progres gradien penuh `bg-gradient-to-r from-[#1F8F7E] via-[#D93A2F] to-[#F4A23B]` yang persis sama dengan garis pada kartu progress bar lengkap statis di bagian atas.
        - Menghapus efek redup/transparan (`bg-stone-200/70`, `bg-[#E5DEC9]/80`, `border-white/40`) agar warna langkah aktif dan persentase selalu kontras tinggi, pekat, dan mudah dilihat di segala mode perangkat (desktop & mobile responsive).
        - Tetap dilengkapi grid klik overlay 3 langkah untuk navigasi cepat kembali ke langkah sebelumnya yang sudah selesai.
      - **Desktop Hover (`md:` ke atas)**: Area hover memicu transisi halus ekspansi kartu stepper lengkap (`hidden md:block absolute top-full left-0 right-0 pt-2 transition-all duration-200 ease-out z-50`) langsung di bawah garis progres melayang dengan *zero layout shift*. Pengguna dapat mengklik langkah yang sudah dilewati untuk kembali tanpa harus scroll ke atas.
      - **Mobile Responsif (`< md` / Viewport 360px)**: Panel ekspansi hover disembunyikan total (`hidden md:block`) sehingga pada layar mobile hanya garis progres solid ramping yang tampil bersih tanpa menutupi formulir atau berbenturan dengan sticky timer.
    - **Sinkronisasi Posisi dengan Sticky Timer (`OrderPageClient.tsx` & `PaymentPageClient.tsx`)**:
      - Urutan layer vertikal saat di-*scroll*:
        1. Sticky Navbar (`top-0 z-50`, tinggi `var(--header-h)`)
        2. Floating Progress Line (`top-[var(--header-h)] z-[45]`, container baris sub-header `bg-white border-b`)
        3. Sticky Floating Timer (`top-[calc(var(--header-h)+20px)] z-40 bg-transparent pointer-events-none`)
      - Kapsul timer memiliki offset tepat 20px di bawah navbar, melayang bebas tepat di bawah garis progres floating dengan margin rapi (gap 3-4px).
    - **Perbaikan Overflow Status Bar pada Kartu QRIS (`PaymentPageClient.tsx`)**:
      - Mengganti class `grid grid-cols-1 sm:grid-cols-2 gap-2` dengan layout baris fleksibel vertikal `flex flex-col gap-2.5 mb-5 pb-3.5 border-b border-stone-100` di mana masing-masing baris (`Status Pesanan` dan `Status Pembayaran`) memakai `flex items-center justify-between flex-wrap gap-2 text-left`.
      - **Akar Masalah**: Pada viewport desktop (`md:` ke atas), kartu QRIS berada di kolom kiri dari layout 2 kolom (`grid grid-cols-1 md:grid-cols-2`). Lebar dalam kartu hanya ±368px, sehingga memaksakan grid 2 kolom (`sm:grid-cols-2`) di dalam kartu menyebabkan teks label ("Status Pembayaran:", 110px) dan badge status ("Menunggu Pembayaran", 145px, total 255px) tidak muat dalam slot 180px, mengakibatkan badge menabrak teks dan meluap keluar batas kartu (*overflow*).
      - Dengan layout baris vertikal `justify-between`, label berada di sisi kiri dan badge berada rapi di sisi kanan kartu dengan zero overflow di semua ukuran layar (desktop, tablet, hingga mobile 360px).
    - **Penyempurnaan Sinkronisasi Riwayat Pesanan & Sandbox Payment Feedback (`src/app/account/orders/page.tsx` & `src/app/payment/[id]/PaymentPageClient.tsx`)**:
      - Memperbarui `loadLocalOrders()` di `AccountOrdersPage` agar mendeteksi pesanan aktif yang telah terbayar di `sessionStorage` (`summa_active_order`) dan menggabungkannya secara presisi ke dalam list pesanan lokal.
      - Menerapkan **Smart Merge** pada penggabungan `localList` dan `apiList`: Jika pesanan lokal telah berstatus `PAID` (misal via simulator pembayaran sandbox), status `PAID` dan detail tiketnya dipertahankan dan tidak akan tertimpa kembali menjadi `UNPAID` oleh data server API lama.
      - Memperjelas pesan umpan balik pada tombol *"Cek Status Pembayaran ↻"* di `PaymentPageClient.tsx` agar pengguna memahami bahwa QRIS yang tampil adalah kode simulasi sandbox dummy (tanpa integrasi webhook bank live otomatis) dan mengarahkan pengguna untuk menekan tombol **"✓ Bayar Sukses"** pada panel *Simulator Callback Sandbox*.
    - **Verifikasi**: `npx tsc --noEmit` (exit 0), `npm run lint` (exit 0), dan `node test/seatmap-layout.test.mjs` (exit 0).

16. **Fase 16 — Fallback Penyimpanan Transaksi Lokal (Sandbox) & Opsi Sinkronisasi ke Database Server API (Selesai, 12 Nov 2026)**:
    - **Analisis Akar Masalah (Mengapa Transaksi Baru Tidak Masuk ke Database Server API)**:
      1. **Ketiadaan Route POST Orders di Backend Live**: Server backend upstream live (`https://summarecon-admin.axtra.tech/api`) belum mengimplementasikan endpoint pembuatan pesanan (`POST /api/orders` menghasilkan respons `404 Not Found`, sesuai catatan arsitektur ACR-03).
      2. **Lingkungan QRIS Sandbox Dummy**: QR Code pembayaran yang dirender adalah payload sandbox standar (`000201010212...`) tanpa webhook perbankan / payment gateway nyata ke `/api/payments/callback`. Pembayaran disimulasikan menggunakan tombol callback sandbox di frontend.
      3. **Isolasi Data Database Server**: Endpoint `GET /api/customer/orders` hanya membaca tabel `orders` di server backend (berisi seed demo lama seperti `ORD-DWT-001`, `ORD-TEST-FIVE`). Karena backend menolak `POST /api/orders`, pesanan baru yang dibuat di client tidak pernah masuk ke database server tersebut secara otomatis.
      4. **Masalah Frontend Sebelumnya Saat Belum Login**: Di `src/app/account/orders/page.tsx`, jika request `fetchMe()` menghasilkan `401 Unauthorized` (misal pemesanan dilakukan sebagai simulasi/guest), frontend langsung me-redirect pengguna ke halaman `/login` sehingga daftar pesanan lokal di browser tidak sempat ditampilkan.
    - **Implementasi Solusi & Fitur Baru**:
      1. **Dukungan Tampilan Transaksi Lokal Mandiri & Mode Tamu (`src/app/account/orders/page.tsx`)**:
         - Menambahkan penanganan `401` di mana jika ditemukan transaksi lokal di `localStorage` (`summa_customer_orders`) atau `sessionStorage` (`summa_active_order`), pengguna tidak di-kick ke halaman login melainkan tetap dapat melihat seluruh tiketnya dalam banner **"Mode Akses Lokal (Tamu)"** yang ramah.
      2. **Penandaan Visual Sumber Penyimpanan Transaksi**:
         - Pada setiap kartu riwayat pesanan (`/account/orders`) dan halaman detail pesanan (`/account/orders/[id]`), dipasang badge penanda yang jelas:
           - `💾 Lokal (Sandbox)` (warna amber/kuning kehijauan) untuk transaksi yang tersimpan di memori browser lokal.
           - `☁️ Database Server` (warna emerald/hijau) untuk transaksi yang tersimpan resmi di database server backend.
      3. **Fitur "Simpan ke Database API ☁️"**:
         - Menyediakan tombol aksi langsung *"Simpan ke Database API ☁️"* pada setiap pesanan berstatus lokal.
         - Fungsi `handleSyncToDatabase(order)` mengecek status autentikasi akun pengguna (`fetchMe()`), memvalidasi item dan kursi, lalu mencoba mengirimkan payload via `createOrder(payload)` dan `payOrder(orderId)`.
         - Memberikan kotak informasi respon yang elegan (*success*, *info*, atau *error*) yang secara transparan menginformasikan status penyimpanan ke database server API.
      4. **Integritas Tipe Data & Kompatibilitas Sistem**:
         - Menambahkan atribut `is_local_order?: boolean` dan `storage_source?: "LOCAL_SANDBOX" | "DATABASE_API"` pada seluruh type model (`OrderHistoryItem`, `ActiveOrderRecord`, `OrderDetailState`) di `OrderPageClient.tsx`, `PaymentPageClient.tsx`, dan `account/orders`.
      5. **Multi-Storage Scanning, Instant Zero-Latency Render, & Filter Tabs (`src/app/account/orders/page.tsx`)**:
         - `loadLocalOrders()` kini memindai tiga wadah browser sekaligus (`localStorage.summa_customer_orders`, `sessionStorage.summa_active_order`, dan `localStorage.summa_active_order`) dengan fungsi deduplikasi `addIfUnique` yang memprioritaskan status `PAID`.
         - State `orders` diinisialisasi langsung dari `loadLocalOrders()` saat mount (`useState(() => loadLocalOrders())`) sehingga pesanan yang baru saja dibuat langsung muncul seketika di layar tanpa jeda menunggu respons jaringan API.
         - Menambahkan filter tabs interaktif di atas daftar pesanan: `Semua (N)`, `💾 Lokal (Sandbox) (N)`, dan `☁️ Database Server (N)`.
         - Menambahkan tombol **"Segarkan ↻"** dengan spinner loading untuk memudahkan pemuatan ulang kapan saja.
         - Mengurutkan daftar pesanan secara kronologis menurun (`created_at` DESC) sehingga pesanan terbaru pengguna selalu bertengger di baris pertama paling atas.
         - Menambahkan `{ cache: "no-store" }` pada `fetchMyOrders` dan `fetchMe` (`customerApi.ts`) untuk mencegah browser/Next.js meng-cache daftar pesanan lama.
    - **Verifikasi**: `npx tsc --noEmit` (exit 0), `npm run lint` (exit 0), dan `node test/seatmap-layout.test.mjs` (exit 0).

---

## 4. Struktur Direktori Proyek

```
summarecon-ticketing-customer-side/
├── docs/
│   ├── PROGRES_DAN_ALUR_SISTEM.md        # Master documentation (file ini — selalu diupdate)
│   ├── api-contract-observed.md          # Catatan observasi kontrak API & ACR
│   └── dev.db                            # Database SQLite lokal referensi
├── src/
│   ├── app/
│   │   ├── (main)/                       # Root layout & error boundaries
│   │   ├── account/                      # Portal akun pengguna
│   │   │   ├── layout.tsx                # Layout akun dengan Header & Footer
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx              # Riwayat pesanan & jam WIB pemesanan
│   │   │   │   └── [id]/page.tsx         # Detail order, tiket, ubah nama (H-1), refund
│   │   │   └── profile/page.tsx          # Profil pengguna & logout
│   │   ├── api/
│   │   │   └── customer/orders/[id]/     # Route proxy internal pencegah 404
│   │   ├── event/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx              # Detail acara, kebijakan tiket, cutoff H-1
│   │   │   │   └── book/page.tsx         # Halaman pemilihan denah venue (Seat Map)
│   │   │   └── layout.tsx                # Layout rute event
│   │   ├── order/[id]/                   # Halaman data pemesan & tiap peserta
│   │   ├── payment/[id]/                 # Halaman instruksi & gateway QRIS (7 min)
│   │   ├── ticket/[id]/                  # Halaman E-Ticket resmi + Alert WhatsApp (H-3 & H-1)
│   │   ├── login/page.tsx                # Halaman login otentikasi customer
│   │   ├── layout.tsx                    # Root layout HTML
│   │   └── page.tsx                      # Beranda & katalog acara
│   ├── components/
│   │   ├── seat-map/                     # Modul Denah & Tempat Duduk
│   │   │   ├── SeatMap.tsx               # Controller denah, apiSeatsRef Single Source of Truth
│   │   │   ├── VenueRenderer.tsx         # Renderer denah 3 venue + normalizeSeatStatus
│   │   │   ├── SeatLegend.tsx            # Legenda status kursi (VIP, Reguler, Sold, dll)
│   │   │   ├── SelectionSummaryClient.tsx# Chip ringkasan pilihan tiket
│   │   │   └── QuotaCard.tsx             # Stepper kuota untuk section Festival/Standing
│   │   ├── shared/                       # Komponen antarmuka global
│   │   │   ├── Header.tsx                # Navigasi utama (<Suspense>), status user, mobile drawer
│   │   │   ├── Footer.tsx                # Footer resmi Summarecon Mall Bandung
│   │   │   ├── EventExplorer.tsx         # Filter & grid event + badge Event Terdekat (kanan atas)
│   │   │   ├── BookingProgressBar.tsx    # Stepper interaktif 3 langkah (Pilih Kursi -> Data Diri -> Pembayaran)
│   │   │   ├── CountdownTimer.tsx        # Timer mundur tersinkronisasi (default & compact floating pill)
│   │   │   └── MainSiteLayout.tsx        # Pembungkus layout konsisten
│   │   └── ui/
│   │       └── StatusBadge.tsx           # Badge status bilingual (Indonesian standard)
│   ├── data/
│   │   └── customer.ts                   # Gateway adapter data event live
│   ├── lib/
│   │   ├── data/
│   │   │   ├── events.ts                 # Adapter & cache memori data event (prioritas event_id)
│   │   │   └── venueTemplates.ts         # Definisi elemen layout venue
│   │   ├── store/
│   │   │   ├── useBookingStore.ts        # Zustand: seleksi, hold, timer, heldSeatIds, releasedSeatIds
│   │   │   └── useAuthStore.ts           # Zustand: sesi pengguna & profil
│   │   ├── status-mapper.ts              # Kamus pemetaan enum backend ke bahasa Indonesia
│   │   ├── time-utils.ts                 # Kalkulasi WIB, timer, dan validasi cutoff H-1
│   │   └── utils.ts                      # formatRupiah, formatCountdown, formatSeatDisplayName
│   └── services/
│       ├── apiClient.ts                  # HTTP client dasar (cookie include, error handler)
│       └── customerApi.ts                # SDK lengkap seluruh endpoint API upstream
└── test/
    └── seatmap-layout.test.mjs           # Unit test layout denah bebas tumpang tindih
```

---

## 5. Diagram Alur Sistem Terperinci (Mermaid)

### 5.1 Alur Pemesanan Lengkap (End-to-End Booking Flow)

```mermaid
flowchart TD
    A["Katalog Acara (Beranda)"] -->|"Pilih Event"| B["Detail Acara (/event/:id)"]
    B -->|"Pilih Kursi & Tiket"| C["Halaman Denah (/event/:id/book)"]
    C -->|"GET /api/events/:id/seats"| S["Single Source of Truth (apiSeatsRef)"]
    S -->|"Pilih Kursi / Area"| D{"Status Kursi (normalizeSeatStatus)"}
    D -->|"AVAILABLE (VIP Amber / Reguler Teal)"| E["Seleksi Lokal (Maks. 4 Tiket, Warna Merah)"]
    D -->|"SOLD / LOCKED / HELD / BLOCKED"| F["Ditolak (Disabled & Non-Interaktif)"]
    E -->|"Klik 'Lanjut ke Data Peserta'"| G{"Verifikasi Login"}
    G -->|"Belum Login"| H["Redirect /login?returnUrl=..."]
    H -->|"Login Berhasil"| G
    G -->|"Sudah Login"| I["POST /api/events/:id/holds (Atomic Lock 10 Menit)"]
    I -->|"Gagal / Konflik"| J["Tampilkan Pesan Konflik, Refresh Denah"]
    I -->|"Berhasil (Simpan heldSeatIds)"| K["Halaman Data Peserta (/order/:id)"]
    K -->|"Timer 10 Menit Berjalan"| L["Isi Data Pemesan (No. WhatsApp) & Tiap Peserta"]
    L -->|"Klik 'Lanjut ke Pembayaran'"| M["POST /api/orders (Buat Order Baru)"]
    M -->|"Arahkan ke Pembayaran"| N["Halaman Pembayaran QRIS (/payment/:id)"]
    N -->|"Timer QRIS 7 Menit Aktif"| O{"Simulasi / Status Pembayaran"}
    O -->|"Sukses (POST /api/orders/:id/pay)"| P["Order PAID, Kursi SOLD, QR Terbit"]
    P --> Q["Halaman E-Ticket (/ticket/:id) + Alert WhatsApp (H-3 & H-1)"]
    O -->|"Batas Waktu Habis / Gagal"| R["Order Expired, Hold Kursi Dilepaskan"]
```

### 5.2 Alur Siklus Hold, Persistensi Status, & Pelepasan Kursi (Seat Lock Lifecycle)

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer
    participant Store as useBookingStore (Zustand)
    participant UI as SeatMap / VenueRenderer
    participant API as Live API Server

    UI->>API: GET /api/events/:id/seats
    API-->>UI: 80 Kursi (AVAILABLE, LOCKED/HELD, SOLD, BLOCKED)
    Note over UI: Simpan di apiSeatsRef (Single Source of Truth)
    User->>UI: Klik Kursi AVAILABLE (misal ATR-A-01)
    UI->>Store: toggleSeat(seat)
    Note over Store,UI: Seleksi murni lokal (warna merah ✓)
    User->>UI: Klik "Lanjut ke Data Peserta"
    UI->>API: POST /api/events/:id/holds { event_seat_ids: ["ATR-A-01"], user_id }
    API-->>UI: 201 Created { hold_id, reserved_until, status: "ACTIVE" }
    UI->>Store: Simpan heldSeatIds=["ATR-A-01"] & startLockTimer(reservedUntil)
    UI->>User: Pindah ke halaman /order/:id
    
    alt Customer Membatalkan Hold & Kembali ke Denah
        User->>UI: Klik "Kembali ke Denah"
        UI->>API: DELETE /api/events/:id/holds { hold_ids: [hold_id] }
        UI->>Store: releaseHold() -> pindahkan heldSeatIds ke releasedSeatIds
        UI->>User: Navigasi kembali ke /event/:id/book
        Note over UI: Kursi SOLD & BLOCKED tetap terkunci; hanya kursi LOCKED di releasedSeatIds menjadi AVAILABLE
    end
```

### 5.3 Alur Pengajuan Refund & Validasi Cutoff H-1

```mermaid
flowchart TD
    A["Buka Detail Pesanan (/account/orders/:id)"] --> B{"Evaluasi Cutoff H-1 (24 Jam)"}
    B -->|"< 24 Jam Sebelum Acara"| C["Tombol Refund Nonaktif: Batas Waktu Lewat"]
    B -->|">= 24 Jam Sebelum Acara"| D["Tombol Aktif: 'Ajukan Refund Peserta'"]
    D --> E["Buka Modal Formulir Refund"]
    E --> F["Isi Metode (Transfer Bank / E-Wallet), Rekening, Atas Nama, Alasan"]
    F --> G["Kirim ke POST /api/customer/refunds"]
    G --> H["Server Kembalikan HTTP 201 Created (Status: UNDER_REVIEW)"]
    H --> I["Tabel Refund Admin Menerima Data Pengajuan"]
    I --> J["Admin Meninjau & Memproses Pengembalian Dana"]
```

---

## 6. Kontrak API, Payload, & Hasil Pengujian Live

| Endpoint | Method | Fungsi & Modul | Status HTTP | Struktur Payload / Respons Kunci |
|---|---|---|---|---|
| `/api/auth/login` | `POST` | Autentikasi Pengguna | `200 OK` | Body: `{ email, password, audience: "CUSTOMER" }`. Mengeset cookie HttpOnly `summa_customer_session`. |
| `/api/auth/me` | `GET` | Profil Customer Aktif | `200 OK` / `401` | Mengembalikan profil pengguna `{ user_id, name, email, role, audience }`. |
| `/api/events` | `GET` | Katalog Acara Publik | `200 OK` | Query: `?status=SALES_OPEN`. Mengembalikan daftar event dan metadatanya. |
| `/api/events/:id` | `GET` | Detail Lengkap Event | `200 OK` | Mengembalikan layout venue, sections, categories, dan harga. |
| `/api/events/:id/seats` | `GET` | Denah Kursi Acara | `200 OK` | Array kursi dengan koordinat `position: { x, y, unit: 'normalized_percent' }`, `status`, `row_label`, `seat_number`. |
| `/api/events/:id/holds` | `POST` | Kunci Kursi Atomik (10 m) | `201 Created` | Body: `{ user_id, event_seat_ids: ["ATR-A-01"], seat_ids }`. Respons: `{ hold_id, reserved_until, status: "ACTIVE" }`. |
| `/api/orders` | `POST` | Pembuatan Pesanan Baru | `201` / `500*` | Body: `{ event_id, user_id, hold_id, seat_ids, items: [{ seat_id, attendee_name }] }`. *Lihat catatan teknis 7.A di bawah. |
| `/api/orders/:id/pay` | `POST` | Konfirmasi Pembayaran | `200 OK` | Body: `{}`. Menandai order `PAID` dan kursi `SOLD` di database SQLite admin. |
| `/api/customer/orders` | `GET` | Riwayat Pesanan Saya | `200 OK` | Filter otomatis `user_id = session.user_id`. Mengembalikan daftar pesanan dan ringkasan e-ticket. |
| `/api/customer/orders/:id/qr` | `GET` | Token E-Ticket QR Resmi | `200 OK` | Mengembalikan token QR, scan counter (`successful_scan_count / valid_ticket_count`), dan status tiket. |
| `/api/customer/refunds` | `POST` | Pengajuan Refund Mandiri | `201 Created` | Body: `{ order_id, reason, dest_method, dest_provider_name, dest_account_number, dest_account_holder }`. |

---

## 7. Catatan Masalah Kritis & Solusi Teknis Terverifikasi

### A. Isu *Sequence Collision* pada Backend Admin (`POST /api/orders` HTTP 500)
- **Gejala**: Ketika order baru dikirim dari customer-side, server mengembalikan `HTTP 500 Internal Server Error: Unique constraint failed on the fields: (order_code)`. Akibatnya pesanan masuk ke fallback lokal `ORD-SIM-...`.
- **Akar Masalah (Analisis Database SQLite Live)**:
  Tabel `orders` di database server memiliki 9 baris data. Backend admin menghitung nomor order berikutnya dengan rumus:
  ```ts
  const count = await prisma.order.count(); // = 9
  const orderCode = `ORD-2026-${String(count + 1).padStart(4, "0")}`; // = "ORD-2026-0010"
  ```
  Di dalam database, baris dengan `id: "ORD-03694880-10"` sudah memiliki `orderCode: "ORD-2026-0010"` (akibat order sebelumnya dihapus sehingga count turun kembali ke 9). Akibatnya, setiap pembuatan order baru selalu menabrak constraint unik `order_code`.
- **Solusi untuk Tim Backend Admin**:
  Ubah generator `order_code` pada file backend `src/app/api/orders/route.ts` agar menggunakan suffix acak atau timestamp unik:
  ```ts
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderCode = `ORD-2026-${String(count + 1).padStart(4, "0")}-${randomSuffix}`;
  ```

### B. Isu Rute Dinamis Next.js 16 (`Blocking Route` pada `usePathname`)
- **Gejala**: Error build / runtime Next.js `Route "/event/[id]": Next.js encountered URL data usePathname() in a Client Component outside of <Suspense>`.
- **Solusi**: Komponen `Header.tsx` dipecah menjadi wrapper `<Suspense fallback={<HeaderView pathname="" />}>` dan child component `HeaderWithPathname` sehingga halaman dinamis tetap dapat di-*prerender* secara instan.

### C. Bug Kritikal: Kursi `BLOCKED`, `SOLD`, atau `HELD` Berubah Menjadi `AVAILABLE` Saat Scroll / Re-render
- **Gejala**: Saat pengguna melakukan scroll menjauhi denah kursi lalu kembali lagi, kursi yang tidak dapat dipilih (`BLOCKED`, `SOLD`, `HELD` / tanda `✕`) berubah menjadi `AVAILABLE` dan dapat diklik.
- **Akar Masalah**:
  1. Pada `adaptCustomerEvent` (`src/lib/data/events.ts`), field `id` sebelumnya memprioritaskan `event.slug` di atas `event.event_id`. Ketika `fetchEvent` di halaman `/event/:id/book` selesai, `event.id` berubah menjadi slug (atau referensi objek `event` berubah) sehingga memicu ulang `useEffect` di `SeatMap.tsx`. Saat re-fetch dengan slug gagal/kosong, blok `if (effectiveSeats.length === 0)` menimpa seluruh kursi dengan 80 kursi fallback berstatus `"AVAILABLE"`.
  2. Status `"HELD"` atau `"RESERVED"` dari backend tidak dinormalisasi menjadi `"LOCKED"` di `VenueRenderer.tsx`, sehingga jatuh ke cabang `else` (`AVAILABLE`).
  3. Pengecekan `releasedSeatIds` dilakukan sebelum mengecek apakah kursi berstatus `"SOLD"` atau `"BLOCKED"`.
- **Solusi**:
  1. Memprioritaskan `event.event_id` di `adaptCustomerEvent`, menyimpan data asli `GET /api/events/:id/seats` di `apiSeatsRef` (`SeatMap.tsx`), dan mengunci dependensi `useEffect` fetch awal hanya pada `event.id`.
  2. Membuat fungsi `normalizeSeatStatus()` di `VenueRenderer.tsx` untuk memetakan `"HELD"`, `"RESERVED"`, `"HOLD"`, dan `"LOCKED"` ke `"LOCKED"`, serta memvalidasi status `SOLD` dan `BLOCKED` sebelum status lainnya.
  3. Memastikan `releasedSeatIds` hanya dapat mengubah kursi berstatus `"LOCKED"` (yang baru saja di-hold dan dibatalkan oleh user tersebut melalui `heldSeatIds`) menjadi `"AVAILABLE"`, dan tidak pernah mengubah kursi `"SOLD"` atau `"BLOCKED"`.

### D. Bug Seluruh Kursi Terdeteksi Sebagai VIP (Tidak Ada Kursi Reguler)
- **Gejala**: Di halaman pemilihan kursi venue, seluruh kursi tampil dengan warna dan harga VIP/Premium, tanpa ada kursi Reguler sama sekali.
- **Akar Masalah**: Di `SeatMap.tsx`, penentuan Block A menggunakan `s.section_id?.includes("A")`. Karena ID seksi Block B adalah `"SEC-ATR-B"` / `"EVS-ATR-B"` dan Sawarga adalah `"SEC-SWG-SEAT"`, keduanya mengandung huruf `"A"` (pada `"ATR"` dan `"SEAT"`), sehingga seluruh kursi bernilai `isBlockA = true`.
- **Solusi**: Menghapus `s.section_id?.includes("A")` dan menggunakan pencocokan presisi `s.block_code === "BLOCK_B" || s.section_id?.toUpperCase().endsWith("-B") || num > 5` untuk Reguler serta `num <= 5` (Atrium Block A) / `num <= 6` (Sawarga VIP) untuk Premium/VIP.

### E. Perhitungan Kuota Festival (Bandung Fest `EVT-V3-002`)
- **Gejala**: Backend mengembalikan nilai `available: 0` meskipun kapasitas 100 dan sold 0, sehingga tombol tambah kuota nonaktif.
- **Solusi**: `SeatMap.tsx` menerapkan kalkulasi fallback `(s.available && s.available > 0) ? s.available : Math.max(0, s.capacity - s.sold - s.blocked)`.

---

## 8. Aturan Bisnis Inti (Business Rules Enforcement)

1. **Batas Maksimal Pemesanan**: Maksimal 4 tiket per transaksi gabungan (kursi bernomor + kuota).
2. **Durasi Timer Standar**:
   - Seat Hold (Penahanan Kursi): Tepat 10 menit (600 detik).
   - Pembayaran Pending (QRIS): Tepat 7 menit (420 detik).
3. **Aturan Batas Waktu H-1 (24 Jam)**:
   - Dihitung dari `start_at` acara dalam zona waktu WIB (`Asia/Jakarta`).
   - Perubahan nama peserta mandiri dan pengajuan refund otomatis dinonaktifkan jika waktu pelaksanaan tersisa < 24 jam.
4. **Prinsip Satu QR Code per Order & Notifikasi WhatsApp**:
   - Satu pesanan dengan banyak tiket hanya memiliki satu QR Code token resmi. Petugas melakukan pemindaian bertahap (`Scan 1/N`, `Scan 2/N`, dst.).
   - Setelah e-ticket terbit, sistem menampilkan konfirmasi pengiriman e-ticket ke nomor WhatsApp pemesan beserta jadwal pengingat otomatis **H-3** dan **H-1**.

---

## 9. Panduan Khusus untuk Sistem AI Generatif Lain

Bagi model AI yang membaca berkas ini sebagai konteks untuk melanjutkan pengembangan:
1. **Selalu Update Dokumen Ini**: Setiap kali ada perintah baru dari pengguna yang mengubah kode, UI, atau alur sistem, **wajib memperbarui `docs/PROGRES_DAN_ALUR_SISTEM.md`** sebelum menyelesaikan respons.
2. **Patuhi Arsitektur API & Single Source of Truth**: Jangan menambahkan library mock data baru. Seluruh interaksi data wajib melalui [`src/services/customerApi.ts`](file:///c:/Project-Web/summarecon-ticketing-customer-side/src/services/customerApi.ts) dan mempertahankan `apiSeatsRef` serta `normalizeSeatStatus` pada komponen denah.
3. **Integritas Format Kursi**: Selalu gunakan fungsi utilitas `formatSeatDisplayName(seat)` dari `@/lib/utils` untuk menampilkan teks kursi (contoh: `Blok A · Baris H · Kursi 05`).
4. **Konsistensi Desain**:
   - Warna Utama: Vermilion `#D93A2F` (CTA, Aksi Kunci, Pilihanmu).
   - VIP/Premium: Amber Gold `#D9822B` (Border), `#FFF8E7` (Background), `#8F4800` (Teks).
   - Reguler: Emerald/Teal `#1F8F7E` (Border), `#E3F4F1` (Background), `#14665A` (Teks).
   - Status Terjual: Plum `#6B5A6E`.
   - Status Ditahan: Kuning/Amber `#E9A12B`.
   - **Elemen Sticky**: Navbar `sticky top-0 z-50`; elemen sticky di bawahnya wajib memakai offset `top-[var(--header-h)]` (z-40) atau `lg:top-[calc(var(--header-h)+16px)]`. Jangan memakai `top-6` lagi karena akan tertutup navbar.
   - **CSS Legacy vs Tailwind**: Rule di `src/styles/globals.css` tidak berada di `@layer`, sehingga menang atas utilitas Tailwind. Ubah rule legacy tersebut bila utilitas Tailwind tidak berefek.
5. **Verifikasi Wajib**: Sebelum menyelesaikan tugas, pastikan selalu menjalankan:
   - `npx tsc --noEmit` (harus exit code 0).
   - `npm run lint` (harus exit code 0 tanpa error React 19 hook/ref).
   - `node test/seatmap-layout.test.mjs` (seluruh pengujian layout lulus).
