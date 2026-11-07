# API Reference — Summarecon Ticketing (Customer Side)

| Lingkungan | Base URL |
|---|---|
| Produksi (customer) | `https://summarecon.axtra.tech/api` |
| Lokal | `http://localhost:3000/api` |

**Autentikasi:** Semua endpoint privat di bawah `/api/customer/` mewajibkan cookie sesi `summa_customer_session`.

---

## 1. Autentikasi Pengunjung

### `POST /api/auth/register`
Pendaftaran akun peserta baru (Role secara sistem otomatis menjadi `CUSTOMER`).
```json
{ 
  "full_name": "Rafi Pratama", 
  "email": "rafi.demo@example.test", 
  "phone_number": "+628110000102", 
  "password": "Password123!" 
}