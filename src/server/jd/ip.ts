import { isIP } from "node:net";

/**
 * IP address classification for SSRF protection. Only globally routable unicast
 * addresses are allowed; everything private, loopback, link-local (incl. cloud
 * metadata 169.254.169.254 / fd00:ec2::254), multicast, reserved or documentation
 * ranges is blocked. IPv4-mapped / NAT64 / 6to4 IPv6 forms are unwrapped and checked
 * as IPv4.
 */

type Cidr4 = readonly [base: number, prefix: number];

const BLOCKED_V4: readonly Cidr4[] = [
  [ipv4ToInt("0.0.0.0"), 8], // "this" network
  [ipv4ToInt("10.0.0.0"), 8], // private
  [ipv4ToInt("100.64.0.0"), 10], // carrier-grade NAT
  [ipv4ToInt("127.0.0.0"), 8], // loopback
  [ipv4ToInt("169.254.0.0"), 16], // link-local + cloud metadata
  [ipv4ToInt("172.16.0.0"), 12], // private
  [ipv4ToInt("192.0.0.0"), 24], // IETF protocol assignments
  [ipv4ToInt("192.0.2.0"), 24], // TEST-NET-1
  [ipv4ToInt("192.88.99.0"), 24], // 6to4 relay anycast
  [ipv4ToInt("192.168.0.0"), 16], // private
  [ipv4ToInt("198.18.0.0"), 15], // benchmarking
  [ipv4ToInt("198.51.100.0"), 24], // TEST-NET-2
  [ipv4ToInt("203.0.113.0"), 24], // TEST-NET-3
  [ipv4ToInt("224.0.0.0"), 4], // multicast
  [ipv4ToInt("240.0.0.0"), 4], // reserved + broadcast
];

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  return (((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!) >>> 0;
}

function inCidr4(value: number, [base, prefix]: Cidr4): boolean {
  if (prefix === 0) return true;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) >>> 0 === (base & mask) >>> 0;
}

export function isBlockedIpv4(ip: string): boolean {
  if (isIP(ip) !== 4) return true;
  const value = ipv4ToInt(ip);
  return BLOCKED_V4.some((cidr) => inCidr4(value, cidr));
}

/** Expands an IPv6 address (optionally with an embedded dotted IPv4 tail) into 8 16-bit groups. */
export function parseIpv6(input: string): number[] | null {
  let ip = input.trim().toLowerCase();
  if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1);
  const zone = ip.indexOf("%");
  if (zone !== -1) ip = ip.slice(0, zone);
  if (isIP(ip) !== 6) return null;

  // Rewrite an embedded dotted IPv4 tail ("::ffff:1.2.3.4") as two hex groups.
  const lastColon = ip.lastIndexOf(":");
  const maybeV4 = ip.slice(lastColon + 1);
  if (maybeV4.includes(".")) {
    if (isIP(maybeV4) !== 4) return null;
    const v4 = ipv4ToInt(maybeV4);
    ip = `${ip.slice(0, lastColon + 1)}${((v4 >>> 16) & 0xffff).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }

  const toGroups = (s: string) => (s ? s.split(":").map((g) => Number.parseInt(g, 16)) : []);
  let groups: number[];
  if (ip.includes("::")) {
    const [head = "", rest = ""] = ip.split("::");
    const h = toGroups(head);
    const r = toGroups(rest);
    const fill = 8 - h.length - r.length;
    if (fill < 0) return null;
    groups = [...h, ...Array.from({ length: fill }, () => 0), ...r];
  } else {
    groups = toGroups(ip);
  }
  if (groups.length !== 8 || groups.some((g) => !Number.isInteger(g) || g < 0 || g > 0xffff)) return null;
  return groups;
}

function groupsToIpv4(hi: number, lo: number): string {
  return `${hi >>> 8}.${hi & 0xff}.${lo >>> 8}.${lo & 0xff}`;
}

export function isBlockedIpv6(ip: string): boolean {
  const g = parseIpv6(ip);
  if (!g) return true;
  const [g0, g1, g2, g3, g4, g5, g6, g7] = g as [number, number, number, number, number, number, number, number];

  // ::/96 — unspecified, loopback and deprecated IPv4-compatible addresses.
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) return true;
  // ::ffff:0:0/96 — IPv4-mapped.
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff)
    return isBlockedIpv4(groupsToIpv4(g6, g7));
  // ::ffff:0:0:0/96 — IPv4-translated.
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0xffff && g5 === 0)
    return isBlockedIpv4(groupsToIpv4(g6, g7));
  // 64:ff9b::/96 and 64:ff9b:1::/48 — NAT64.
  if (g0 === 0x64 && g1 === 0xff9b) return isBlockedIpv4(groupsToIpv4(g6, g7));
  // 2002::/16 — 6to4 (embedded IPv4 in groups 1-2).
  if (g0 === 0x2002) return isBlockedIpv4(groupsToIpv4(g1, g2));
  // 2001:0::/32 — Teredo (obfuscated client IPv4); 2001:db8::/32 — documentation; 2001:10::/28 ORCHID.
  if (g0 === 0x2001 && (g1 === 0 || g1 === 0xdb8 || (g1 & 0xfff0) === 0x10)) return true;
  // 100::/64 — discard-only.
  if (g0 === 0x100 && g1 === 0 && g2 === 0 && g3 === 0) return true;
  // fc00::/7 unique-local (incl. fd00:ec2::254 metadata), fe80::/10 link-local, fec0::/10 site-local, ff00::/8 multicast.
  if ((g0 & 0xfe00) === 0xfc00) return true;
  if ((g0 & 0xffc0) === 0xfe80 || (g0 & 0xffc0) === 0xfec0) return true;
  if ((g0 & 0xff00) === 0xff00) return true;
  // Only global unicast (2000::/3) is allowed.
  return (g0 & 0xe000) !== 0x2000;
}

/** True when the address must never be fetched. Non-IP strings are treated as blocked. */
export function isBlockedIp(ip: string): boolean {
  const cleaned = ip.trim().replace(/^\[|\]$/g, "");
  const version = isIP(cleaned.split("%")[0] ?? "");
  if (version === 4) return isBlockedIpv4(cleaned);
  if (version === 6) return isBlockedIpv6(cleaned);
  return true;
}
