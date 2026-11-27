import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from "node:dns";
import { isIP } from "node:net";
import { JdExtractionError } from "./errors";
import { isBlockedIp } from "./ip";

/** Ports a public job page can reasonably be served from. */
const ALLOWED_PORTS = new Set(["", "80", "443", "8080", "8443"]);

/** Hostname suffixes that only resolve inside private networks. */
const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".intranet", ".lan", ".home.arpa", ".corp"];
const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata", "metadata.google.internal", "instance-data"]);

export type HostResolver = (hostname: string) => Promise<LookupAddress[]>;

export const defaultResolver: HostResolver = (hostname) =>
  new Promise((resolve, reject) => {
    dnsLookup(hostname, { all: true, verbatim: true }, (err, addresses) => (err ? reject(err) : resolve(addresses)));
  });

interface DohAnswer {
  type: number;
  data: string;
}

const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";

/**
 * DNS-over-HTTPS resolver for runtimes without `node:dns` sockets (Cloudflare Workers). There the
 * connect-time check is done by the platform: the `global_fetch_strictly_public` compatibility
 * flag makes `fetch()` refuse private/internal destinations. This pre-check only gives a clear
 * BLOCKED_HOST error early (and keeps behaviour identical to Node).
 */
export function createDohResolver(fetchImpl: typeof fetch = fetch): HostResolver {
  const query = async (hostname: string, type: "A" | "AAAA"): Promise<LookupAddress[]> => {
    const url = `${DOH_ENDPOINT}?name=${encodeURIComponent(hostname)}&type=${type}`;
    const res = await fetchImpl(url, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`DNS lookup failed (${res.status})`);
    const body = (await res.json()) as { Status?: number; Answer?: DohAnswer[] };
    const wanted = type === "A" ? 1 : 28;
    return (body.Answer ?? [])
      .filter((a) => a.type === wanted && isIP(a.data))
      .map((a) => ({ address: a.data, family: type === "A" ? 4 : 6 }));
  };
  return async (hostname) => {
    const results = await Promise.allSettled([query(hostname, "A"), query(hostname, "AAAA")]);
    const addresses = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    if (addresses.length === 0 && results.every((r) => r.status === "rejected")) {
      throw (results[0] as PromiseRejectedResult).reason;
    }
    return addresses;
  };
}

/** Parses and statically validates a URL (scheme, credentials, port, hostname). No network access. */
export function parsePublicHttpUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = input instanceof URL ? new URL(input.href) : new URL(input.trim());
  } catch {
    throw new JdExtractionError(
      "INVALID_URL",
      "That doesn't look like a valid URL. Use a full link starting with https://.",
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new JdExtractionError("INVALID_URL", "Only http:// and https:// links are supported.");
  }
  if (url.username || url.password) {
    throw new JdExtractionError("INVALID_URL", "Links with embedded credentials are not supported.");
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new JdExtractionError("BLOCKED_HOST", "Links on non-standard ports are not allowed.");
  }
  const host = hostnameOf(url);
  if (!host) throw new JdExtractionError("INVALID_URL", "The link has no host name.");

  if (isIP(host)) {
    if (isBlockedIp(host)) throw blockedHost();
    return url;
  }
  const lower = host.toLowerCase().replace(/\.$/, "");
  if (
    BLOCKED_HOSTNAMES.has(lower) ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => lower.endsWith(suffix)) ||
    // Single-label names ("intranet", "router") only resolve on private networks.
    !lower.includes(".")
  ) {
    throw blockedHost();
  }
  return url;
}

/** URL hostname without IPv6 brackets. WHATWG URL already canonicalizes "0x7f.1" / "2130706433" to dotted IPv4. */
export function hostnameOf(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, "");
}

function blockedHost(): JdExtractionError {
  return new JdExtractionError(
    "BLOCKED_HOST",
    "This address points to a private or internal network and can't be fetched.",
  );
}

/**
 * Full validation: static checks + DNS resolution. Every resolved address must be public.
 * The fetcher additionally re-checks at connect time (see `guardedLookup`) to defeat DNS rebinding.
 */
export async function assertSafeUrl(input: string | URL, resolver: HostResolver = defaultResolver): Promise<URL> {
  const url = parsePublicHttpUrl(input);
  const host = hostnameOf(url);
  if (isIP(host)) return url;

  let addresses: LookupAddress[];
  try {
    addresses = await resolver(host);
  } catch (error) {
    throw new JdExtractionError("FETCH_FAILED", `Couldn't resolve ${host}. Check the link and try again.`, {
      cause: error,
    });
  }
  if (addresses.length === 0) {
    throw new JdExtractionError("FETCH_FAILED", `Couldn't resolve ${host}. Check the link and try again.`);
  }
  if (addresses.some((a) => isBlockedIp(a.address))) throw blockedHost();
  return url;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/**
 * Drop-in replacement for `dns.lookup` used by http(s).request: resolves the host and
 * refuses to connect when any resolved address is private. This is the authoritative
 * SSRF check because it runs on the exact addresses the socket connects to.
 */
export function guardedLookup(hostname: string, options: LookupOptions, callback: LookupCallback): void {
  dnsLookup(hostname, { ...options, all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, []);
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some((a) => isBlockedIp(a.address))) {
      const blocked: NodeJS.ErrnoException = new Error(`Blocked address for ${hostname}`);
      blocked.code = "EBLOCKEDHOST";
      return callback(blocked, []);
    }
    if (options.all) return callback(null, list);
    const first = list[0]!;
    return callback(null, first.address, first.family);
  });
}
