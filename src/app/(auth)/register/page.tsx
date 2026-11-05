import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <div className="auth-card">
      <span className="eyebrow eyebrow-dark">MULAI PETUALANGANMU</span>
      <h1>Buat akun<br />baru.</h1>
      <p className="auth-intro">Simpan tiket dan jangan lewatkan acara favoritmu.</p>
      <AuthForm mode="register" />
    </div>
  );
}
