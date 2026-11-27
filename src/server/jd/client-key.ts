import { isCloudflareRuntime } from "@/server/cloudflare/runtime";

/**
 * Client identity for rate limiting. On Cloudflare `CF-Connecting-IP` is set by the edge and
 * cannot be spoofed by the client; X-Forwarded-For is only trusted under Node.js (behind your own
 * reverse proxy).
 */
export function clientKey(request: Request, onCloudflare = isCloudflareRuntime()): string {
  if (onCloudflare) return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}
