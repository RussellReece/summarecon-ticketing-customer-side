"use client";

// src/components/auth/AuthForm.tsx
//
// Client Component — connects directly to live API:
// - Login: POST /api/auth/login with { email, password, audience: "CUSTOMER" }
// - Register: POST /api/auth/register with { full_name, email, phone_number, password }
// - Handles session cookie and localStorage session token storage upon success.

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { loginCustomer, registerCustomer } from "@/services/customerApi";
import { ApiError } from "@/types/customer";

export interface AuthFormProps {
  mode: "login" | "register";
}

function AuthFormContent({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  const setUser = useAuthStore((state) => state.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isRegister = mode === "register";

  // Fill credentials for convenience in testing the live backend
  const fillDemoCustomer = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Summarecon2026!");
    setError("");
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isRegister) {
        // Register API call
        const res = await registerCustomer({
          full_name: fullName.trim(),
          email: email.trim(),
          phone_number: phone.trim(),
          password,
        });

        const userData = res.data?.user;
        setUser({
          name: userData?.full_name || fullName.trim(),
          email: userData?.email || email.trim(),
        });
      } else {
        // Login API call — strictly sending audience: "CUSTOMER"
        const res = await loginCustomer({
          email: email.trim(),
          password,
          audience: "CUSTOMER",
        });

        const rawRes = res as unknown as Record<string, unknown>;
        const token =
          res.data?.token ||
          res.data?.session_token ||
          (typeof rawRes.token === "string" ? rawRes.token : undefined) ||
          (typeof rawRes.session_token === "string" ? rawRes.session_token : undefined);

        if (token) {
          // Store in cookie and localStorage for client and server usage
          document.cookie = `summa_customer_session=${token}; path=/; max-age=86400; SameSite=Lax`;
          if (typeof window !== "undefined") {
            localStorage.setItem("summa_customer_session", token);
          }
        }

        const rawUserData = ((res.data?.user as unknown) || rawRes.user) as Record<string, unknown> | undefined;
        const displayName =
          res.data?.user?.full_name ||
          (typeof rawUserData?.full_name === "string" ? rawUserData.full_name : undefined) ||
          (typeof rawUserData?.name === "string" ? rawUserData.name : undefined) ||
          email.split("@")[0];

        setUser({
          name: displayName,
          email: res.data?.user?.email || (typeof rawUserData?.email === "string" ? rawUserData.email : email.trim()),
        });
      }

      // Success: navigate to target page
      router.push(returnUrl);
      router.refresh();
    } catch (err) {
      console.error("[AuthForm Error]", err);
      if (err instanceof ApiError) {
        switch (err.status) {
          case 401:
            setError("Email atau kata sandi salah. Pastikan kata sandi sesuai (mis. Summarecon2026!).");
            break;
          case 404:
            setError("Akun tidak ditemukan. Silakan periksa kembali atau daftar akun baru.");
            break;
          case 409:
            setError("Email sudah terdaftar. Silakan masuk menggunakan akunmu.");
            break;
          case 422:
            if (err.errors) {
              const msgs = Object.values(err.errors).flat().join(". ");
              setError(msgs || err.message);
            } else {
              setError(err.message || "Data formulir tidak valid.");
            }
            break;
          case 0:
            setError("Gagal terhubung ke server API. Periksa koneksi internet kamu.");
            break;
          default:
            setError(err.message || "Terjadi kesalahan pada sistem. Silakan coba lagi.");
        }
      } else {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {/* Demo Credentials Quick-Fill helper box */}
      {!isRegister && (
        <div
          style={{
            background: "#f0edff",
            border: "1px solid #d5cbff",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "16px",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ display: "block", marginBottom: "4px", color: "#4a2bb5" }}>
            Akun Demo Customer (Live API):
          </strong>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
            <button
              type="button"
              onClick={() => fillDemoCustomer("nadia.demo@example.test")}
              style={{
                fontSize: "11px",
                padding: "3px 8px",
                borderRadius: "4px",
                border: "1px solid #ac9aff",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              nadia.demo@example.test
            </button>
            <button
              type="button"
              onClick={() => fillDemoCustomer("rafi.demo@example.test")}
              style={{
                fontSize: "11px",
                padding: "3px 8px",
                borderRadius: "4px",
                border: "1px solid #ac9aff",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              rafi.demo@example.test
            </button>
          </div>
          <span style={{ color: "#555765" }}>
            Kata sandi API: <code>Summarecon2026!</code>
          </span>
        </div>
      )}

      {isRegister && (
        <>
          <label>
            Nama lengkap
            <input
              autoComplete="name"
              name="name"
              placeholder="Nama kamu"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
            />
          </label>
          <label>
            No. WhatsApp
            <input
              autoComplete="tel"
              name="phone"
              type="tel"
              placeholder="+628110000102"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
            />
          </label>
        </>
      )}

      <label>
        Email
        <input
          autoComplete="email"
          name="email"
          type="email"
          placeholder="nama@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </label>

      <label>
        Kata sandi
        <input
          autoComplete={isRegister ? "new-password" : "current-password"}
          name="password"
          type="password"
          placeholder="Minimal 8 karakter"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button
        className="button button-primary auth-submit"
        type="submit"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading
          ? isRegister
            ? "Membuat akun..."
            : "Memeriksa kredensial..."
          : isRegister
            ? "Buat akun"
            : "Masuk ke akun"}
        {!isLoading && <span aria-hidden="true">→</span>}
      </button>

      <p className="auth-switch">
        {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
        <Link href={isRegister ? "/login" : "/register"}>
          {isRegister ? "Masuk" : "Daftar"}
        </Link>
      </p>
    </form>
  );
}

/**
 * AuthForm wrapper wrapped in React Suspense.
 * Resolves Next.js prerendering block caused by `useSearchParams()` hook.
 */
export function AuthForm(props: AuthFormProps) {
  return (
    <Suspense
      fallback={
        <div
          className="auth-form-loading"
          style={{ minHeight: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <span style={{ fontSize: "14px", color: "#6b7280" }}>Memuat formulir...</span>
        </div>
      }
    >
      <AuthFormContent {...props} />
    </Suspense>
  );
}
