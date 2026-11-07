import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const prototypeRoot = resolve(root, "prototype");
const maps = new Map([
  ["/maps/master-site.svg", resolve(root, "BerkasDokumen", "Paket_Diagram_Venue_Ticketing_Revisi", "00_Master_Site_Map_Revised.svg")],
  ["/maps/downtown-walk.svg", resolve(root, "BerkasDokumen", "Paket_Diagram_Venue_Ticketing_Revisi", "02_Downtown_Walk_Ticketed_Event.svg")],
  ["/maps/atrium-cibadak.svg", resolve(root, "BerkasDokumen", "Paket_Diagram_Venue_Ticketing_Revisi", "03_ATRIUM_CIBADAK_Event_SeatMap.svg")],
  ["/maps/sawarga-option-b.svg", resolve(root, "BerkasDokumen", "Paket_Diagram_Venue_Ticketing_Revisi", "07_Sawarga_Courtyard_Option_B_Standing_Front.svg")],
]);
const mime = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

const BACKEND_BASE = "https://summarecon-admin.axtra.tech";

// Hop-by-hop and encoding headers to strip from forwarded responses.
// Node's native fetch() already handles stream decompression (Brotli/gzip),
// so forwarding `content-encoding` or raw `transfer-encoding` causes
// browser decompression failures ("unexpected token '<'" / corrupted JSON).
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
]);

/**
 * Proxy /api/* requests to the live backend server.
 * This ensures the browser calls 'self' (same-origin), avoiding CSP and CORS restrictions.
 */
async function proxyApiRequest(request, response, url) {
  // Ensure the target path starts with /api
  const targetPath = url.pathname.startsWith("/api")
    ? url.pathname
    : `/api${url.pathname}`;
  const targetUrl = `${BACKEND_BASE}${targetPath}${url.search}`;

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const bodyBuffer = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  const headers = {};
  for (const [key, value] of Object.entries(request.headers)) {
    if (key.toLowerCase() === "host" || key.toLowerCase() === "connection") continue;
    headers[key] = value;
  }
  headers["host"] = "summarecon-admin.axtra.tech";

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : bodyBuffer,
      redirect: "manual",
    });

    const resHeaders = {};
    upstreamRes.headers.forEach((val, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        resHeaders[key] = val;
      }
    });

    // Ensure client knows response is UTF-8 JSON if content-type is json
    if (resHeaders["content-type"] && !resHeaders["content-type"].includes("charset")) {
      resHeaders["content-type"] += "; charset=utf-8";
    }

    response.writeHead(upstreamRes.status, resHeaders);
    const arrayBuffer = await upstreamRes.arrayBuffer();
    response.end(Buffer.from(arrayBuffer));
  } catch (err) {
    response.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Bad Gateway", message: err.message }));
  }
}

async function serveFile(response, path, contentType) {
  const body = await readFile(path);
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://summarecon-admin.axtra.tech http://localhost:* ws: wss:;",
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");

  // 1. Explicit API routes & proxying
  if (url.pathname.startsWith("/api/") || url.pathname === "/api") {
    if (url.pathname === "/api/health") {
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ ok: true, mode: "prototype" }));
      return;
    }
    if (url.pathname === "/api/seed") {
      response.writeHead(410, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify({ error: "Seed data is disabled." }));
      return;
    }

    // Proxy all /api/* calls (GET /api/events, POST /api/auth/login, etc.)
    await proxyApiRequest(request, response, url);
    return;
  }

  // 2. Fallback API routes: Catch calls made without the "/api" prefix
  // (e.g. /events?status=SALES_OPEN, /auth/login, /customer/orders)
  if (
    url.pathname === "/events" ||
    url.pathname.startsWith("/events/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/customer/")
  ) {
    await proxyApiRequest(request, response, url);
    return;
  }

  // 3. Static file serving only allows GET
  if (request.method !== "GET") {
    response.writeHead(405, { Allow: "GET" });
    response.end("Method Not Allowed");
    return;
  }

  try {
    if (url.pathname === "/vendor/qrcode-generator.js") {
      await serveFile(response, resolve(root, "node_modules", "qrcode-generator", "dist", "qrcode.js"), "text/javascript; charset=utf-8");
      return;
    }
    if (maps.has(url.pathname)) {
      await serveFile(response, maps.get(url.pathname), "image/svg+xml; charset=utf-8");
      return;
    }

    const relative = url.pathname === "/"
      ? "index.html"
      : decodeURIComponent(url.pathname.startsWith("/prototype/")
        ? url.pathname.slice("/prototype/".length)
        : url.pathname.slice(1));
    const requested = resolve(prototypeRoot, normalize(relative));
    if (requested !== prototypeRoot && !requested.startsWith(`${prototypeRoot}${sep}`)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const acceptHeader = request.headers["accept"] || "";
    const isJsonRequest = acceptHeader.includes("application/json");

    let target = requested;
    try {
      const info = await stat(target);
      if (info.isDirectory()) target = resolve(target, "index.html");
    } catch {
      // If client is asking for JSON or this is not a frontend HTML page request, don't return index.html!
      if (isJsonRequest || extname(url.pathname)) {
        response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "Not Found", path: url.pathname }));
        return;
      }
      target = resolve(prototypeRoot, "index.html");
    }
    const contentType = mime.get(extname(target)) ?? "application/octet-stream";
    await serveFile(response, target, contentType);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`Internal Server Error\n${error instanceof Error ? error.message : String(error)}`);
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`Prototype server running at http://localhost:${port}/ (Proxying /api/* -> https://summarecon-admin.axtra.tech/api/*)`);
});
