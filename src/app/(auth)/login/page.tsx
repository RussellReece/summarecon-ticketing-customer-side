import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <div className="auth-card">
      <span className="eyebrow eyebrow-dark">SELAMAT DATANG KEMBALI</span>
      <h1>Masuk ke<br />akunmu.</h1>
      <p className="auth-intro">Lanjutkan ke momen-momen yang kamu nantikan.</p>
      <Suspense fallback={<div className="auth-form-loading" style={{ minHeight: "260px" }} />}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
