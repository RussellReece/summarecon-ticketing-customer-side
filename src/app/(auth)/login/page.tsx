import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <div className="auth-card">
      <span className="eyebrow eyebrow-dark">SELAMAT DATANG KEMBALI</span>
      <h1>Masuk ke<br />akunmu.</h1>
      <p className="auth-intro">Lanjutkan ke momen-momen yang kamu nantikan.</p>
      <AuthForm mode="login" />
    </div>
  );
}
