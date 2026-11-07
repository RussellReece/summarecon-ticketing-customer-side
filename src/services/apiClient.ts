// src/services/apiClient.ts
//
// Low-level HTTP client for the Summarecon Ticketing API.
// All domain-specific fetch functions live in `customerApi.ts`; this module
// only handles transport concerns: base URL, headers, error normalisation.

import { ApiError } from "@/types/customer";

/**
 * Builds the appropriate API URL depending on whether the call is made
 * from the browser (client-side) or Node.js (server-side).
 *
 * - In the browser: Always prefixes with `/api` to hit the local proxy (defined in `next.config.ts`),
 *   guaranteeing same-origin ('self') compliance and avoiding CSP/CORS errors.
 * - On the server: Prepends `process.env.NEXT_PUBLIC_API_URL` directly.
 */
export function buildApiUrl(path: string): string {
  // If already an absolute URL, return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Ensure leading slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    // In browser: route through local proxy at /api
    if (cleanPath.startsWith("/api/")) {
      return cleanPath;
    }
    return `/api${cleanPath}`;
  }

  // In Node.js / Server Components: call upstream backend directly
  const rawBase =
    process.env.NEXT_PUBLIC_API_URL || "https://summarecon-admin.axtra.tech/api";
  const base = rawBase.replace(/\/+$/, "");

  // If path already starts with /api/, strip it to avoid /api/api/...
  const apiPath = cleanPath.startsWith("/api/") ? cleanPath.slice(4) : cleanPath;
  return `${base}${apiPath}`;
}

// ─── Request options ─────────────────────────────────────────────────────────

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** JSON body — will be serialised automatically. */
  body?: unknown;
  /**
   * Optional session token or JWT.
   * Useful when calling from Next.js Server Components / Actions where browser
   * cookies aren't automatically attached to outgoing server-to-server fetches.
   */
  token?: string;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

/**
 * Makes an authenticated fetch call to the API.
 *
 * - Normalises URL via `buildApiUrl` to ensure `/api` prefix is always present.
 * - Inspects Content-Type and gracefully handles non-JSON / HTML responses.
 * - Serialises JSON bodies.
 * - Forwards the `summa_customer_session` cookie automatically in browser calls.
 * - Normalises error responses into `ApiError` instances.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildApiUrl(path);

  const { body, token, headers: customHeaders, ...rest } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token
      ? {
          Cookie: `summa_customer_session=${token}`,
          Authorization: `Bearer ${token}`,
        }
      : {}),
    ...(customHeaders as Record<string, string>),
  };

  const init: RequestInit = {
    // "include" sends HttpOnly cookies (session) in both directions.
    credentials: "include",
    ...rest,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (networkError) {
    // Network failure (DNS, CORS preflight blocked, offline, etc.)
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      networkError instanceof Error
        ? networkError.message
        : "Gagal terhubung ke server. Periksa koneksi internet kamu.",
    );
  }

  // 204 No Content has no body
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  // Read response as text first to handle both JSON and non-JSON gracefully
  let textBody = "";
  try {
    textBody = await response.text();
  } catch (readError) {
    throw new ApiError(
      response.status,
      "READ_ERROR",
      `Gagal membaca respons dari server (${response.status} ${response.statusText}): ${readError instanceof Error ? readError.message : String(readError)}`,
    );
  }

  // Guard against non-JSON / HTML responses (e.g. 404/502 HTML pages or index.html fallback)
  if (!isJson) {
    const preview = textBody.slice(0, 150).replace(/\s+/g, " ");
    const isHtml = textBody.trim().startsWith("<") || contentType.includes("text/html");
    const hint = isHtml
      ? " Server mengembalikan dokumen HTML alih-alih JSON. Pastikan endpoint menggunakan prefix /api (misalnya /api/events) dan proxy lokal aktif."
      : "";

    throw new ApiError(
      response.status,
      "INVALID_CONTENT_TYPE",
      `Respons server (${response.status} ${response.statusText}) bukan format JSON (Content-Type: "${contentType || "kosong"}"). Respons: "${preview}"...${hint}`,
    );
  }

  // Parse JSON safely
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(textBody);
  } catch (parseError) {
    throw new ApiError(
      response.status,
      "INVALID_JSON",
      `Gagal mengurai respons JSON dari server (${response.status} ${response.statusText}): ${parseError instanceof Error ? parseError.message : String(parseError)}`,
    );
  }

  // ── Happy path ──────────────────────────────────────────────────────────────
  if (response.ok) {
    return parsedJson as T;
  }

  // ── Error path (HTTP 4xx / 5xx with JSON body) ──────────────────────────────
  const errorObj = (parsedJson && typeof parsedJson === "object" ? parsedJson : {}) as Record<string, unknown>;
  const message =
    (errorObj.message as string) ||
    (errorObj.error as string) ||
    response.statusText ||
    "Terjadi kesalahan pada server.";
  const code = (errorObj.code as string) || errorCodeFromStatus(response.status);
  const errors = errorObj.errors as Record<string, string[]> | undefined;

  throw new ApiError(response.status, code, message, errors);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function errorCodeFromStatus(status: number): string {
  switch (status) {
    case 400: return "BAD_REQUEST";
    case 401: return "UNAUTHENTICATED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 422: return "UNPROCESSABLE_ENTITY";
    case 429: return "TOO_MANY_REQUESTS";
    case 500: return "SERVER_ERROR";
    default:  return `HTTP_${status}`;
  }
}

/**
 * Convenience wrapper for GET requests.
 * Pass `searchParams` to append a query string without manually building URLs.
 */
export function apiGet<T>(
  path: string,
  searchParams?: Record<string, string | number | boolean | undefined>,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<T> {
  let fullPath = path;

  if (searchParams) {
    const qs = Object.entries(searchParams)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) fullPath = `${path}?${qs}`;
  }

  return apiFetch<T>(fullPath, { method: "GET", ...options });
}

/** Convenience wrapper for POST requests. */
export function apiPost<T>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body, ...options });
}

/** Convenience wrapper for PATCH requests. */
export function apiPatch<T>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<T> {
  return apiFetch<T>(path, { method: "PATCH", body, ...options });
}

/** Convenience wrapper for DELETE requests. */
export function apiDelete<T>(
  path: string,
  options?: Omit<RequestOptions, "method">,
): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE", ...options });
}

