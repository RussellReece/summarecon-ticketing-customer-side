import type { NextConfig } from "next";
import dns from "node:dns";

// Force IPv4 DNS resolution first to prevent ENOTFOUND / ECONNRESET timeouts on Windows
// when proxying requests to Cloudflare upstream endpoints (which advertise IPv6 AAAA records).
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore in environments where not supported
}

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://summarecon-admin.axtra.tech/api/:path*",
      },
      // Safety fallbacks: in case frontend code requests /events without "/api" prefix
      {
        source: "/events",
        destination: "https://summarecon-admin.axtra.tech/api/events",
      },
      {
        source: "/events/:path*",
        destination: "https://summarecon-admin.axtra.tech/api/events/:path*",
      },
    ];
  },
};

export default nextConfig;
