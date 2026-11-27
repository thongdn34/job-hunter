/**
 * Request guard used by `src/proxy.ts`. The app has no authentication (local-first, single
 * user), so it must not be drivable by other websites the user visits:
 *
 * - DNS rebinding: a hostile domain resolving to 127.0.0.1 makes its page same-origin with the
 *   app. Only loopback Host headers (plus the ALLOWED_HOSTS allowlist) are served.
 * - CSRF: route handlers get no framework origin check (only Server Actions do) and some
 *   endpoints accept "simple" requests that need no CORS preflight. State-changing methods are
 *   refused when the browser reports a cross-origin request (Sec-Fetch-Site / Origin).
 *
 * Pure and framework-free so it can be unit-tested.
 */

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const SAME_ORIGIN_FETCH_SITES = new Set(["same-origin", "none"]);

export interface AllowedHosts {
  /** ALLOWED_HOSTS="*" disables the Host check (Origin is still compared with Host). */
  any: boolean;
  /** Lowercased "hostname" (any port) or "hostname:port" entries. */
  entries: ReadonlySet<string>;
}

/** Parses ALLOWED_HOSTS: comma-separated hostnames, optionally with a port ("jobs.example.com,10.0.0.5:3000"). */
export function parseAllowedHosts(value: string | undefined): AllowedHosts {
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return { any: entries.includes("*"), entries: new Set(entries.filter((entry) => entry !== "*")) };
}

interface HostParts {
  host: string;
  hostname: string;
}

/** Splits a Host header value ("localhost:3000", "[::1]:3000", "example.com") — null when malformed. */
export function parseHostHeader(value: string | null | undefined): HostParts | null {
  const host = value?.trim().toLowerCase();
  if (!host || /[\s/@\\]/.test(host)) return null;
  const match = /^(\[[0-9a-f:.]+\]|[^:[\]]+)(?::(\d{1,5}))?$/.exec(host);
  if (!match) return null;
  return { host, hostname: match[1] };
}

function isAllowedHost(parts: HostParts, allowed: AllowedHosts): boolean {
  return (
    LOOPBACK_HOSTNAMES.has(parts.hostname) || allowed.entries.has(parts.hostname) || allowed.entries.has(parts.host)
  );
}

export interface GuardRequest {
  method: string;
  host: string | null;
  origin: string | null;
  secFetchSite: string | null;
}

export type GuardVerdict = { ok: true } | { ok: false; reason: string };

export function checkRequest(request: GuardRequest, allowed: AllowedHosts): GuardVerdict {
  const host = parseHostHeader(request.host);
  if (!host) return { ok: false, reason: "Missing or invalid Host header." };
  if (!allowed.any && !isAllowedHost(host, allowed)) {
    return {
      ok: false,
      reason: `Host "${host.host}" is not allowed. Add it to ALLOWED_HOSTS to serve the app under this name.`,
    };
  }
  if (SAFE_METHODS.has(request.method.toUpperCase())) return { ok: true };

  const site = request.secFetchSite?.trim().toLowerCase();
  if (site && !SAME_ORIGIN_FETCH_SITES.has(site)) return { ok: false, reason: "Cross-site requests are not allowed." };

  if (request.origin !== null) {
    let origin: HostParts | null = null;
    try {
      origin = parseHostHeader(new URL(request.origin).host);
    } catch {
      origin = null;
    }
    if (!origin) return { ok: false, reason: "Cross-origin requests are not allowed." };
    const sameHost = origin.host === host.host;
    // Behind a reverse proxy that rewrites Host, the public origin must be allow-listed.
    const allowListed = allowed.entries.has(origin.hostname) || allowed.entries.has(origin.host);
    if (!sameHost && !allowListed) return { ok: false, reason: "Cross-origin requests are not allowed." };
  }
  return { ok: true };
}
