/** True inside the Cloudflare Workers runtime (workerd), false under Node.js. Dependency-free. */
export function isCloudflareRuntime(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}
