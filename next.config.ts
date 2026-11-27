import type { NextConfig } from "next";

/**
 * Baseline Content-Security-Policy. It deliberately leaves script/style sources alone (Next.js
 * inline bootstrap scripts, Mermaid's inline SVG styles, dev HMR) and closes the zero-click data
 * exfiltration channels instead: no remote images/media and no cross-origin fetch/XHR/WebSocket.
 * Generated Markdown also drops images in `renderMarkdown` (defense in depth).
 */
export const CONTENT_SECURITY_POLICY = [
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY }] }];
  },
  // Native SQLite driver must stay external to the server bundle.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
