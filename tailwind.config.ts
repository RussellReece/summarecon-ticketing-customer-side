import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        summa: {
          primary: "#D93A2F",       // Vermilion - Tombol, kursi dipilih
          primaryDark: "#8C1F2B",   // Garnet - Teks di atas tint, hover[cite: 37, 38]
          accent: "#F4A23B",        // Saffron - Sorotan, promo[cite: 37, 38]
          tint: "#FDE9E4",          // Blush - Latar lembut, chip[cite: 37, 38]
          bg: "#FFF8F5",            // Krem - Latar halaman utama[cite: 37, 38]
          ink: "#2A1F2D",           // Plum Ink - Teks utama[cite: 37, 38]
          muted: "#6E6270",         // Teks sekunder[cite: 37, 38]
          line: "#F0DCD6",          // Garis batas / border[cite: 37, 38]
        },
        status: {
          ok: "#1F8F7E",            // Teal - Tersedia / Valid[cite: 37, 38]
          hold: "#E9A12B",          // Orange - Dipesan / Sudah dipakai[cite: 37, 38]
          sold: "#BDB3B8",          // Grey - Terjual[cite: 37, 38]
          bad: "#B3261E",           // Red - Tidak valid / Error[cite: 37, 38]
        }
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'], // Judul & Angka[cite: 37, 38]
        body: ['"DM Sans"', 'sans-serif'],              // Teks bacaan[cite: 37, 38]
      },
      boxShadow: {
        'summa': '0 6px 24px rgba(140, 31, 43, 0.10)',  // Bayangan bernuansa merah[cite: 37, 38]
      },
      backgroundImage: {
        'summa-gradient': 'linear-gradient(135deg, #D93A2F 0%, #EE6A35 60%, #F4A23B 100%)', // Gradasi tanda tangan[cite: 37, 38]
      },
      borderRadius: {
        'seat': '8px 8px 5px 5px',   // Radius khusus bentuk kursi[cite: 37, 38]
        'ticket': '20px',            // Radius bingkai e-ticket[cite: 37, 38]
      }
    },
  },
  plugins: [],
};

export default config;