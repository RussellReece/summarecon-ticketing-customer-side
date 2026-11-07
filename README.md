# Summarecon Tickets · Customer Prototype

Prototype Customer Side untuk Summarecon Mall Bandung. Implementasi customer prototype memakai Vanilla JavaScript ES Modules, HTML/CSS, JSON seed, dan `localStorage`; draft Next.js lama tetap tersedia melalui `npm run dev:next` dan tidak dihapus.

## Menjalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Server hanya bind ke `127.0.0.1`. Tidak ada `.env`, provider sandbox nyata, maupun kredensial eksternal yang dibutuhkan.

## Akun demo

- Email: `nadia.demo@example.test`, `rafi.demo@example.test`, `dina.demo@example.test`, `bima.demo@example.test`
- Kata sandi: `Demo#2026`
- Login juga menyediakan tombol isi otomatis untuk akun demo. Registrasi prototype menyimpan verifier PBKDF2 lokal; tetap jangan gunakan data pribadi atau kata sandi nyata.

## Fitur dan alur demo

- Beranda, pencarian/filter status, detail tiga event seed, kategori tiket, dan layout venue konseptual terbaru.
- Atrium Cibadak memakai `event_seats` dan koordinat `normalized_percent` dari seed; C05/F02 terjual, A10 terblokir berdasarkan `section_id`. Pemilihan kursi hanya state sementara.
- Hold kursi dibuat saat **Lanjut**, berlaku 10 menit, all-or-nothing di service, timer tidak direset saat refresh, dan hold kedaluwarsa memeriksa status pembayaran terlebih dahulu.
- Login/register demo, antrean FIFO simulasi, data peserta, ringkasan, order, dan riwayat yang difilter menurut akun.
- QRIS sandbox mock dengan callback sukses/gagal/pending/expired, signature salah, dan callback duplikat. Tiket satu QR/order terbit hanya setelah callback sukses tervalidasi. QR e-ticket bersifat demo, bukan tiket masuk.
- Refund peserta per tiket, pengisian data refund event batal, status refund terpisah dari status pembayaran, dan nomor rekening hanya tersimpan tersamarkan.
- `Reset demo` memuat ulang seed tanpa mengubah JSON asli.

Untuk reset lewat UI pilih **Reset demo** pada beranda/profil, atau jalankan di console browser:

```js
await window.resetDemo();
sessionStorage.clear();
location.reload();
```

## Layout dan data

Seed read-only berada di `src/data/event_ticketing_venue_management_dummy_data.json`. API lokal `/api/seed` menghapus `password_hash`, `qr_token_hash`, `queue_token`, `payment_gateway_callbacks`, dan `admin_audit_logs` sebelum mengirim data ke browser. Denah revisi dilayani dari `BerkasDokumen/Paket_Diagram_Venue_Ticketing_Revisi/`:

- Downtown Walk: konfigurasi ticketed event, meja/kursi dining tidak menjadi inventori.
- Atrium Cibadak: contoh 80 kursi bernomor, bukan kapasitas resmi.
- Sawarga Courtyard: Opsi B, standing di depan.
- Master site map memberi konteks lokasi; seluruh denah hanya konsep dan harus divalidasi oleh pengelola/safety.

## Audit awal dan keputusan

| Area | Kondisi draft | Keputusan |
|---|---|---|
| Stack | Draft memakai Next.js/React/TypeScript meskipun master prompt menetapkan Vanilla JS ES Modules | Prototype vanilla dibuat terpisah dan menjadi `npm run dev`; draft Next dipertahankan utuh lewat `npm run dev:next`. |
| Event & inventori | Event dan kursi sebelumnya hard-coded, tidak membaca JSON | Diganti untuk prototype oleh loader/API seed serta seat map berbasis data/koordinat. |
| Hold | Timer client dapat dimulai di luar transaksi “Lanjut” dan reset saat state lokal hilang | Diterapkan service hold berbasis `reserved_until`; pilihan seat belum mengunci inventori. |
| Pembayaran/tiket | Tombol UI dapat menampilkan sukses dan menerbitkan tampilan QR tanpa callback | Diganti mock adapter/callback idempoten; order/tiket hanya berubah setelah simulasi callback tervalidasi. |
| Akun/refund | Alur sebelumnya belum terhubung ke seed/persistence | Dibuat guard akun lokal, filter kepemilikan order, riwayat refund, dan transfer manual mock. |
| Layout/style | Tampilan mengikuti token warna hangat tetapi denah generik | Memakai token pada Style Guide dan diagram revisi; tidak mengklaim kapasitas resmi. |

## Temuan seed D1–D10

| ID | Penanganan prototype |
|---|---|
| D1 | Counter kursi dihitung dari `event_seats`, bukan counter section yang tidak konsisten; JSON seed tidak diubah. |
| D2 | Identitas kursi memakai `section_id` dan `seat_label`; `ATR-A-10` ditampilkan `A10`, bukan disimpulkan dari awalan ID. |
| D3 | Superset status tiket JSON dipertahankan; status tiket dan kehadiran dipisah. |
| D4 | Status refund tidak pernah dimasukkan ke status payment. |
| D5 | Order batal tetap tampil sebagai “Dibatalkan” dan refund tampil terpisah. |
| D6 | `available_quantity: null` tidak dirender sebagai nol tersedia; acara dibatalkan menonaktifkan booking. |
| D7 | Refund dibayar manual, tanpa klaim transfer otomatis atau pemanggilan gateway. |
| D8 | Tiket event selesai tetap dapat dilihat, tetapi tiket yang dipakai/tanggal terlewat tidak ditawarkan untuk refund. |
| D9 | Refund `UNDER_REVIEW` tidak otomatis mengubah tiket menjadi tidak valid. |
| D10 | Batas H-1 diperlakukan sebagai 24 jam sebelum `start_at` pada waktu WIB. |

## Batasan dan asumsi

- Ini prototype lokal tanpa backend: `localStorage` bukan database aman, bukan lock atomik lintas perangkat, dan tidak menjamin FIFO multi-user atau pencegahan overselling lintas browser/perangkat. Critical section service hanya memvalidasi dan memperbarui state pada browser ini.
- Tidak ada provider QRIS sungguhan. QRIS pembayaran menampilkan QR mock lokal; simulator developer hanya untuk demonstrasi callback. Integrasi provider nyata memerlukan backend, kredensial sandbox server-side, verifikasi signature provider, rekonsiliasi status, dan pengujian resmi.
- Data kapasitas/seat IDs adalah contoh. Penjualan nyata harus menunggu validasi denah, kapasitas, akses, venue, aturan keselamatan, dan kebijakan pengelola mal.
- Seed hanya punya satu event `SALES_OPEN` dengan `BOOK_BY_SEAT`; jalur quota/standing ditangani generik oleh service/UI tetapi tidak ada event aktif seed untuk membuktikan pembelian keduanya. Status antrean juga hanya simulasi lokal.
- Panel pembayaran callback diberi label alat dev. Simulasi pembatalan event/refund tidak melakukan transfer dana; admin, check-in, notifikasi WhatsApp, rekonsiliasi gateway callback terlambat yang memerlukan alokasi admin, dan pengeditan profil belum dibangun.
- Registrasi/login bersifat demo lokal; akun seed berbagi `Demo#2026`. Jangan gunakan untuk autentikasi/otorisasi produksi.

## Pemeriksaan

```bash
npm run lint
npm run build
npm run build:next
```

`npm run build` memeriksa sintaks modul prototype. `npm run build:next` hanya untuk memastikan draft Next.js lama tetap dapat dibangun.

Checklist fitur belum seluruhnya lolos sebagai sistem produksi: rute customer inti, seed, layout, hold, dan callback mock tersedia; multi-user atomik lintas perangkat, provider pembayaran nyata, admin/check-in, serta seluruh skenario refund produksi adalah N/A atau simulasi sesuai batasan di atas.
