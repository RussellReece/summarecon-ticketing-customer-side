# Database & API — Summarecon Ticketing (Customer Side)

Di sisi customer, akses dan manipulasi data di database dibatasi secara ketat menggunakan filter `user_id` dari sesi login yang aktif. Customer hanya berhak melihat dan mengubah pesanan miliknya sendiri.

## 1. Scope Data & Normalisasi
- **Tabel Publik (Read-Only):** `events`, `event_sections`, `ticket_categories`, `venues`, dan `layout_templates`. Data event dengan status `DRAFT` tidak akan dikembalikan oleh API.
- **Tabel Kursi (`event_seats`):** Publik hanya bisa membaca status kursi (`AVAILABLE`, `LOCKED`, `SOLD`, `BLOCKED`). Data sensitif seperti `current_order_id` yang sedang menahan kursi di-filter di tingkat API dan tidak diturunkan ke klien.
- **Tabel Privat:** Semua pencarian di tabel `orders`, `order_items`, `tickets`, `e_tickets`, dan `refunds` ditambahkan kondisi `WHERE user_id = {session.user_id}`.

## 2. Alur Transaksi (Write API)

| Method | Path | Proses Database (Backend) |
|---|---|---|
| POST | `/api/events/:id/holds` | Mengecek status `event_seats` (wajib `AVAILABLE`). Jika lolos, status diubah menjadi `LOCKED` dan baris baru dibuat di `booking_holds` dengan `reserved_until` (10 menit). Transaksi bersifat **atomik**. |
| POST | `/api/orders` | Membuat record di `orders` (`PENDING`), `order_items`, `tickets` (`RESERVED`), dan `payments`. Kursi yang di-hold berubah menjadi `SOLD` (tersambung ke order). Jika hold kedaluwarsa, API melempar 409. |
| POST | `/api/customer/refunds` | Mengajukan refund. Membuat row di tabel `refunds` dengan status awal `UNDER_REVIEW`. Data JSON rekening/e-wallet milik peserta disimpan langsung di kolom `refund_destination` untuk ditinjau admin. Menulis 1 baris riwayat di `refund_status_histories`. |
| PATCH | `/api/customer/refunds/:id/destination` | Digunakan saat event dibatalkan oleh pihak penyelenggara dan status awal refund adalah `REQUESTED`. Customer menyetor kelengkapan data metode refund. Begitu disetor, sistem otomatis menaikkan status menjadi `APPROVED` tanpa butuh review manual lagi. |

## 3. Penerbitan E-Ticket (Event-Driven)
Customer tidak dapat menembak API pembuatan e-ticket.
1. Saat customer berhasil membayar, payment gateway (sandbox QRIS) mengirim webhook `/api/payments/callback`.
2. Sistem mengidempoten webhook tersebut, lalu mengubah tabel `payments` menjadi `SUCCESS` dan tabel `orders` menjadi `PAID`.
3. Di saat yang sama, sistem membuat 1 row di tabel `e_tickets` yang menautkan `order_id` tersebut dengan hash unik.
4. Ketika customer memanggil `GET /api/customer/orders/:id/qr`, API hanya membacakan token dari `e_tickets` dan menghasilkan gambar QR secara real-time via *data URL*.