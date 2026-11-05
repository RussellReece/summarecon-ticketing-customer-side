"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState("");
  const isRegister = mode === "register";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const name = isRegister
      ? String(formData.get("name") ?? "").trim()
      : email.split("@")[0];

    if (!email.includes("@") || (isRegister && name.length < 2)) {
      setError("Periksa kembali nama dan alamat email kamu.");
      return;
    }

    setUser({ name, email });
    router.push("/");
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {isRegister && (
        <label>
          Nama lengkap
          <input autoComplete="name" name="name" placeholder="Nama kamu" required minLength={2} />
        </label>
      )}
      <label>
        Email
        <input
          autoComplete="email"
          name="email"
          type="email"
          placeholder="nama@email.com"
          required
        />
      </label>
      <label>
        Kata sandi
        <input
          autoComplete={isRegister ? "new-password" : "current-password"}
          name="password"
          type="password"
          placeholder="Minimal 8 karakter"
          minLength={8}
          required
        />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary auth-submit" type="submit">
        {isRegister ? "Buat akun" : "Masuk ke akun"}
        <span aria-hidden="true">→</span>
      </button>
      <p className="auth-switch">
        {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
        <Link href={isRegister ? "/login" : "/register"}>
          {isRegister ? "Masuk" : "Daftar"}
        </Link>
      </p>
      <p className="demo-note">Mode demo — akun tidak disimpan ke server.</p>
    </form>
  );
}
