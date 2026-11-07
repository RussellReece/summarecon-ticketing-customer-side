"use client";

// src/app/(main)/error.tsx
//
// Route segment Error Boundary for the main catalog.
// Catches server-side or streaming fetch errors and provides a retry button.

import { useEffect } from "react";
import { ApiError } from "@/types/customer";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an analytics or monitoring service if configured
    console.error("[MainPage Error]", error);
  }, [error]);

  const isApiError = error instanceof ApiError;
  const status = isApiError ? error.status : null;

  return (
    <div className="page-container" style={{ paddingBlock: "80px" }}>
      <div className="empty-events" role="alert">
        <span aria-hidden="true" style={{ fontSize: "36px", color: "#e11d48" }}>
          ⚠
        </span>

        <h2>Gagal Memuat Acara</h2>

        <p>
          {status === 401
            ? "Sesi kamu telah berakhir. Silakan masuk kembali untuk melanjutkan."
            : status === 404
              ? "Layanan acara sedang tidak ditemukan."
              : error.message || "Terjadi kendala saat menghubungi server API."}
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px" }}>
          <button
            className="button button-primary"
            onClick={() => reset()}
            type="button"
          >
            Coba Lagi
          </button>

          <button
            className="button button-secondary"
            onClick={() => window.location.reload()}
            type="button"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </div>
    </div>
  );
}

