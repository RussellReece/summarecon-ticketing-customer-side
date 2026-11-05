# SummareconTicket

Demo ticketing customer app for events at Summarecon Mall Bandung, built with Next.js App Router, TypeScript, Zustand, and Socket.IO client. Its visual tokens and components follow [Style Guide – Summarecon Ticketing](./Style%20Guide%20%E2%80%93%20Summarecon%20Ticketing.md).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `src/app/(main)/` — beranda dan layout navigasi publik.
- `src/app/(auth)/` — halaman login dan registrasi.
- `src/app/event/[id]/` — detail acara dan pemilihan kursi.
- `src/app/order/[id]/` — ringkasan pesanan.
- `src/app/ticket/[id]/` — pratinjau e-ticket dengan QR.
- `src/components/ui/` — komponen dasar Button, Card, Badge, dan Modal.
- `src/components/seat-map/` — denah dan ringkasan kursi.
- `src/components/shared/` — layout bersama, Header, Footer, dan Timer.
- `src/lib/store/` — state booking dan sesi pengguna.
- `src/lib/socket/` — klien Socket.IO opsional.
- `src/lib/utils.ts` — helper format harga dan countdown.
- `src/styles/globals.css` — Tailwind CSS dan gaya global.
- `src/types/` — tipe Event, Seat, dan UserSession.
- `tailwind.config.ts` — konfigurasi tema Tailwind proyek.

Rute acara, pesanan, dan tiket memakai layout bersama terpisah agar struktur folder tetap sesuai tanpa menghilangkan Header dan Footer.

## Demo routes

- `/` — event discovery dan booking guide.
- `/event/[id]` — event details.
- `/event/[id]/book` — seat map dan timer hold 10 menit.
- `/order/[id]` — order review.
- `/ticket/[id]` — QR-code ticket preview.
- `/login` dan `/register` — form demo sisi klien.

Data acara dan ketersediaan kursi adalah data contoh. Autentikasi, pemesanan, pembayaran, dan QR masuk belum terhubung ke backend. Untuk pembaruan kursi opsional, atur `NEXT_PUBLIC_SOCKET_URL`; klien mendengarkan event `seat:locked` dan `seat:unlocked` berisi ID kursi.

## Checks

```bash
npm run lint
npm run build
```
