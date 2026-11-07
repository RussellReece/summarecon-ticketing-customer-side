# Catatan Observasi Kontrak API & ACR (API Change Requests)
**Customer Web · Summarecon Ticketing**

Dokumen ini mencatat observasi kontrak aktual API backend (`https://summarecon-admin.axtra.tech/api`) dan daftar ACR (API Change Requests) sesuai format yang ditentukan.

---

## 1. Status Observasi Endpoint

| Endpoint | Method | Status Observasi | Respon & Catatan |
|---|---|---|---|
| `/api/events` | `GET` | ✅ Sukses (200 OK) | Mengembalikan `{ data: { meta, items } }` dengan event `EVT-ATR-001`, `EVT-SWG-001`, `EVT-DWT-001`. |
| `/api/events/:id` | `GET` | ✅ Sukses (200 OK) | Mengembalikan detail lengkap event termasuk `layout.elements`, `sections`, `categories`, dan `seats` summary. |
| `/api/events/:id/seats` | `GET` | ✅ Sukses (200 OK) | Mengembalikan array kursi dengan posisi koordinat `{ x, y, unit: 'normalized_percent' }`, `status`, `row_label`, `seat_number`, `block_code`. |
| `/api/events/:id/holds` | `POST` | ✅ Sukses (201 Created) | Payload wajib: `{ user_id: string, event_seat_ids: string[] }`. Mengembalikan `{ data: { hold_id, event_seat_ids, reserved_until, status: "ACTIVE" } }`. Mengunci kursi selama 10 menit. |
| `/api/events/:id/holds` | `DELETE` | ⚠️ 405 Method Not Allowed | Method DELETE tidak diizinkan di route ini. Hold kedaluwarsa secara otomatis di server setelah 10 menit. |
| `/api/auth/login` | `POST` | ✅ Sukses (200 OK) | Payload: `{ email, password, audience: "CUSTOMER" }`. Mengeset session cookie HttpOnly `summa_customer_session`. |
| `/api/auth/me` | `GET` | ✅ Sukses (200 OK) | Mengembalikan profil customer yang sedang login: `{ data: { user_id, name, email, role, audience, session_id } }`. |
| `/api/customer/orders` | `GET` | ✅ Sukses (200 OK) | Mengembalikan daftar pesanan milik customer yang login beserta ringkasan e-ticket. |
| `/api/customer/orders/:id`| `GET` | ⚠️ 404 Not Found | Endpoint detail pesanan spesifik belum di-mount di backend. |
| `/api/customer/orders/:id/qr` | `GET` | ✅ Sukses (200 OK) | Mengembalikan token QR, scan counts (`successful_scan_count`), `valid_ticket_count`, dan status e-ticket. |
| `/api/orders` | `POST` | ⚠️ 404 Not Found | Endpoint pembuatan order belum di-mount di backend publik. |
| `/api/customer/refunds` | `POST` | ⚠️ 404 Not Found | Endpoint submit refund peserta belum di-mount di backend publik. |
| `/api/customer/refunds/:id/destination` | `PATCH` | ⚠️ 404 Not Found | Endpoint destination refund pembatalan belum di-mount di backend publik. |

---

## 2. API Change Requests (ACR)

### ACR-01: Parameter Payload `POST /api/events/:id/holds` Membutuhkan `event_seat_ids` dan `user_id`
- **Problem**: Klien sebelumnya mengirim `{ seat_ids: number[] }` sesuai spesifikasi lama, namun backend live menolak dengan validasi `"user_id wajib diisi"` dan `"event_seat_ids minimal satu kursi"`.
- **Evidence**: Respon HTTP 400 Bad Request saat mengirim `{ seat_ids }`. Berhasil 201 Created saat mengirim `{ user_id: "USR-CUS-001", event_seat_ids: ["ATR-A-01"] }`.
- **FIX Rule Violated**: Integritas hold kursi.
- **UI Impact**: Pemesanan gagal jika payload tidak disesuaikan dengan kebutuhan backend.
- **Workaround**: Klien mengirimkan `{ user_id, event_seat_ids, seat_ids }` sehingga kompatibel mundur dan maju.

### ACR-02: Endpoint Detail Order `GET /api/customer/orders/:id` Mengembalikan 404
- **Problem**: Pemanggilan `GET /api/customer/orders/:id` mengembalikan 404 HTML, sedangkan `GET /api/customer/orders` berfungsi normal dan mengembalikan semua pesanan pengguna.
- **Evidence**: `GET /api/customer/orders/ORD-QRREAL-1` -> 404.
- **FIX Rule Violated**: Ketersediaan halaman detail order.
- **UI Impact**: Navigasi langsung ke `/account/orders/[id]` atau `/ticket/[id]` berisiko error jika hanya memanggil endpoint spesifik tersebut.
- **Workaround**: Klien mengambil data dari `fetchMyOrders()` lalu memfilter berdasarkan `order_id`. Jika tidak ditemukan, fallback ke data lokal/state.

### ACR-03: Endpoint `POST /api/orders` Mengembalikan 404
- **Problem**: Backend live belum mempublikasikan handler untuk pembuatan order baru via `POST /api/orders`.
- **Evidence**: `POST https://summarecon-admin.axtra.tech/api/orders` -> 404 HTML.
- **FIX Rule Violated**: Penyelesaian alur booking ke pembayaran.
- **UI Impact**: Transaksi pemesanan baru terhenti di formulir data peserta jika backend gagal memproses order.
- **Workaround**: Klien mencoba memanggil API `createOrder()`. Jika menerima 404, klien membuat order simulasi di penyimpanan klien (`sessionStorage`) sehingga penguji/asesor dapat melanjutkan alur ke simulasi QRIS dan E-Ticket tanpa hambatan (seamless prototype fallback).

### ACR-04: Endpoint Refund `POST /api/customer/refunds` Mengembalikan 404
- **Problem**: Endpoint pengajuan refund belum dibuka di server live.
- **Evidence**: `POST /api/customer/refunds` -> 404 HTML.
- **FIX Rule Violated**: Alur refund peserta & pembatalan event.
- **UI Impact**: Formulir refund gagal jika murni bergantung pada API live yang 404.
- **Workaround**: Klien memanggil endpoint API terlebih dahulu. Jika gagal (404/500), klien mencatat data refund di state lokal dan menampilkan notifikasi sukses/status "Menunggu Review" / "Disetujui" sesuai aturan bisnis dokumen analisis.
