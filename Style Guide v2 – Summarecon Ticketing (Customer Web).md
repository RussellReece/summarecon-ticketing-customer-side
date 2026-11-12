[**Summarecon**](#top)

[Perubahan](#perubahan)[Token](#token)[Ikon](#ikon)[Navbar](#navbar)[Badge](#badge)[Denah](#denah)[Responsif](#responsif)

Style Guide v2 · Customer Web

# Summarecon Ticketing

Disusun dari aplikasi yang sudah berjalan (Fase 1–12). Fokus revisi ini: navbar menempel, ikon Phosphor tanpa emoji, legenda denah responsif, dan denah ukuran penuh.

## 1. Ringkasan Perubahan

**Navbar menempel**

Pill melayang, tetap terlihat saat scroll, bayangan muncul setelah scroll. Coba scroll halaman ini.

**Tanpa emoji**

Semua ikon dari Phosphor. Badge Event Terdekat, jam pesanan, dan penanda status tidak lagi memakai emoji atau simbol teks.

**Legenda responsif**

Grid yang menyesuaikan lebar, dua kolom di ponsel, dan dapat dilipat saat denah layar penuh.

**Denah penuh**

Kontrol zoom, Pas layar, dan Layar penuh dengan ringkasan pesanan yang tetap terlihat.

## 2. Token Warna (sesuai aplikasi)

Nilai diambil dari dokumen progres, sehingga tim tidak perlu mengubah warna yang sudah dipakai.

Aa

**Vermilion**`#D93A2F`\
CTA, Pilihanmu

Aa

**Plum Ink**`#2A1F2D`\
Teks utama

Aa

**Cream**`#FDFBF7`\
Latar halaman

VIP

**Amber Gold**`#D9822B`\
Border VIP · isi `#FFF8E7` · teks `#8F4800`

REG

**Teal**`#1F8F7E`\
Border Reguler · isi `#E3F4F1` · teks `#14665A`

Ditahan

**Held**`#E9A12B`\
Isi penuh + ikon jam

Terjual

**Sold**`#6B5A6E`\
Isi penuh + ikon X

**Blocked**`#9A8F95`\
Arsiran + ikon larangan

**Aturan pembeda kategori dan status**

VIP (amber) dan Ditahan (kuning) berwarna dekat, jadi dibedakan dengan **bentuk isi**: kursi tersedia selalu berisi **warna pucat dengan garis tepi** (VIP bertanda bintang kecil), sedangkan kursi tidak tersedia berisi **warna penuh dengan ikon**. Pilihanmu merah penuh dengan tanda centang.

## 3. Ikon: Phosphor Saja

Gunakan `@phosphor-icons/react`. Dilarang emoji dan simbol teks sebagai ikon (misalnya api, jam, centang, silang, hati, bunga, panah). Bentuk di bawah hanyalah ilustrasi; di aplikasi pakai komponen resmi dengan nama berikut.

**Timer**Event Terdekat, sisa waktu

**Broadcast**Sedang berlangsung

**CalendarCheck**Hari ini

**Clock**Ditahan, jam pesanan

**Check**Pilihanmu, berhasil

**X**Terjual, tutup

**Prohibit**Diblokir

**Star**Kategori VIP

**Heart**Favorit

**ArrowRight**Lanjut

**ArrowsOut / ArrowsIn**Layar penuh

**MapPin**Lokasi venue

**Ticket**Tiket, e-ticket

**Warning**Peringatan, gagal

**List**Menu hamburger

**Aturan pakai**

- Ukuran 16 px (badge), 20 px (tombol dan baris), 24 px (navigasi).
- Bobot `regular` untuk umum, `bold` untuk 16 px ke bawah, `fill` hanya untuk keadaan aktif.
- Ikon dekoratif diberi `aria-hidden`; ikon tunggal tanpa teks wajib punya `aria-label`.
- Ikon mengikuti warna teks (`currentColor`), tidak diberi warna sendiri.

## 4. Navbar Menempel (Sticky)

Navbar halaman ini adalah contohnya. Pill tetap di atas saat scroll, burger berada di dalam pill pada layar sempit, dan bayangan muncul setelah scroll melewati 8 px.

| Properti | Nilai |
| --- | --- |
| Posisi | `position: sticky; top: 0; z-index: 50`, dengan jarak atas 8 px ditambah safe-area |
| Tinggi pill | 56 px, tombol dan tautan minimal 44 px |
| Latar | Surface 86% dengan blur 12 px, garis tepi 1 px |
| Mobile (≤720 px) | Tautan menjadi panel di bawah pill, dibuka burger, tertutup saat pindah halaman atau Esc |
| Offset elemen menempel lain | Ringkasan pesanan dan toolbar denah: `top: 72px`; jangkar: `scroll-margin-top: 84px` |
| Urutan lapisan | Navbar 50 · ringkasan menempel 40 · drawer 60 · denah layar penuh 100 · toast 110 |

```
<header className="sticky top-0 z-50 px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
  <nav className={`relative mx-auto flex h-14 max-w-6xl items-center gap-3 rounded-full
    border border-[#EADFD9] bg-white/85 pl-4 pr-2 backdrop-blur-md transition-shadow
    ${scrolled ? "shadow-[0_8px_28px_rgba(140,31,43,.14)]" : ""}`}>
    {/* logo, links (hidden md:flex), burger (md:hidden) di dalam nav */}
  </nav>
</header>
```

## 5. Badge Waktu Event dan Posisi dalam Kartu

Badge selalu berada di dalam kartu: kanan atas, dengan lebar maksimal kartu dikurangi 84 px (tile tanggal 56 px di kiri ditambah jarak). Teks panjang pindah baris, tidak keluar kartu.

NOV**08**Sedang berlangsung

**Bazaar Kreator Bandung**SAWARGA COURTYARD · SAMPAI 21.00

NOV**10**Event Terdekat

**Seminar Kreator Muda**ATRIUM CILEUTIK · 2 HARI LAGI

NOV**14**Hari ini

**Festival Kuliner Downtown Walk yang Sangat Panjang Namanya**DOWNTOWN WALK

Berlangsung Hari ini Event Terdekat Terbayar Selesai

| Urutan | Penanda | Aturan |
| --- | --- | --- |
| 1 | Sedang berlangsung | Disematkan paling atas, bingkai 2 px Vermilion |
| 2 | Hari ini | Badge amber dengan jam mulai |
| 3 | Event Terdekat | Hanya event mendatang terdekat, maksimal 7 hari |
| 4 | Mendatang | Tanpa badge, urut tanggal |
| 5 | Selesai | Kartu diredam, tanpa tombol beli |

## 6. Denah Penuh dan Legenda Responsif

Toolbar denah: zoom keluar/masuk, Pas layar, dan Layar penuh. Pada layar penuh, denah memakai tinggi layar penuh, ringkasan pesanan tetap di bawah, dan legenda dapat dilipat. Coba di bawah, lalu tekan Esc untuk keluar.

100%

PANGGUNG

**Belum ada kursi dipilih**

Legenda 6 penanda

RegulerRp 300.000 · tersedia

VIPRp 500.000 · bintang

PilihanmuBelum ditahan

DitahanPengguna lain

TerjualTidak tersedia

DiblokirOleh panitia

| Aspek | Aturan |
| --- | --- |
| Legenda | Grid `auto-fit minmax(150px,1fr)`; ≤480 px dua kolom tanpa subteks; label tidak boleh terpotong |
| Layar penuh | `fixed inset-0 z-100 h-dvh`, kunci scroll body, fokus terkurung, Esc menutup, tombol tutup selalu terlihat |
| Zoom | Ukuran kursi 16–52 px; Pas layar menghitung ukuran dari lebar wadah; seleksi tidak hilang saat zoom |
| Ponsel | Fokus Blok (A atau B) dengan kursi 44 px tetap dipertahankan; Layar penuh menampilkan seluruh blok dengan geser dan cubit |
| Kategori vs status | Isi pucat + garis tepi = tersedia (VIP bertanda bintang); isi penuh + ikon = tidak tersedia |

## 7. Breakpoint dan Target Sentuh

| Lebar | Perangkat uji | Perilaku |
| --- | --- | --- |
| 320–359 | Ponsel kecil | Satu kolom, legenda 2 kolom, denah bisa digeser |
| 360–479 | Samsung, iPhone | Fokus Blok, kursi 44 px, burger di dalam pill |
| 480–767 | Ponsel besar | Kartu 1–2 kolom, legenda 3 kolom |
| 768–1023 | Tablet | Navbar penuh, denah seluruh blok, ringkasan di samping |
| 1024+ | Laptop, desktop | Lebar konten 1080 px, ringkasan menempel di kanan |

Target sentuh minimal 44 px (tombol utama 48 px), input 16 px agar iOS tidak memperbesar halaman, dan safe-area notch dihitung pada navbar, toolbar, serta panel bawah. Timer tetap: kursi ditahan 10 menit setelah tombol Lanjut, pembayaran QRIS 7 menit.