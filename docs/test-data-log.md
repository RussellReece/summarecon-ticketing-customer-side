# Log Data Pengujian (Test Data Log)
**Customer Web · Summarecon Ticketing**

Dokumen ini mencatat data pengujian dan interaksi simulasi yang dilakukan selama pengembangan alur dan denah customer.

---

## 1. Akun Pengujian Tersedia

| Akun | Password | Role | Catatan |
|---|---|---|---|
| `nadia.demo@example.test` | `Summarecon2026!` | Customer | Akun demo terverifikasi di backend live |
| `rafi.demo@example.test` | `Summarecon2026!` | Customer | Akun demo terverifikasi di backend live |

---

## 2. Event yang Diuji

| ID Event | Nama Event | Venue | Status | Jenis Booking |
|---|---|---|---|---|
| `EVT-ATR-001` | Bandung Tech & Creative Expo | Atrium Cibadak | `SALES_OPEN` | `BOOK_BY_SEAT` (80 kursi, 2 blok) |
| `EVT-DWT-001` | Downtown Jazz Night | Downtown Walk | `COMPLETED` | `STANDING` / `BOOK_BY_QUOTA` (0 kursi) |
| `EVT-SWG-001` | Sawarga Indie Sound | Sawarga Courtyard | `CANCELLED` | Mixed: Standing Pit + 12 Kursi Belakang + Quota |

---

## 3. Catatan Simulasi & Alur

- **Hold Seat**: Durasi 10 menit. Hold dilakukan secara atomic pada endpoint `POST /api/events/:id/holds`.
- **Payment Sandbox**: Pembayaran menggunakan simulasi QRIS. Waktu tunggu pembayaran maksimal 7 menit.
- **Refund Policy**: Batas pengajuan peserta adalah H-1 sebelum event mulai. Refund pembatalan event tidak memerlukan persetujuan manual peserta namun memerlukan pengisian data rekening tujuan.

