import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

/**
 * Cloudflare Access (Zero Trust) gate for the Cloudflare Workers deployment. The app has no login
 * of its own (single user), so on the public internet every request must carry a valid Access JWT
 * (`Cf-Access-Jwt-Assertion`, added by Cloudflare after the user signs in). Verifying it in the
 * Worker — not only at the edge — also closes the `*.workers.dev` / preview URLs, which Access
 * does not cover unless configured. Fails closed: without configuration nothing is served unless
 * ALLOW_UNAUTHENTICATED=true (local previews).
 *
 * Dependency-light and framework-free: used by cloudflare/worker.ts and unit-tested directly.
 */

export interface AccessConfig {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ALLOW_UNAUTHENTICATED?: string;
}

export type AccessVerdict = { ok: true; email?: string } | { ok: false; status: 401 | 403 | 503; reason: string };

/** "myteam", "myteam.cloudflareaccess.com" or "https://myteam.cloudflareaccess.com/" → issuer URL. */
export function accessIssuer(teamDomain: string): string {
  let host = teamDomain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  if (!host.includes(".")) host = `${host}.cloudflareaccess.com`;
  return `https://${host}`;
}

const jwksByIssuer = new Map<string, JWTVerifyGetKey>();

function remoteJwks(issuer: string): JWTVerifyGetKey {
  let jwks = jwksByIssuer.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    jwksByIssuer.set(issuer, jwks);
  }
  return jwks;
}

export async function verifyAccessRequest(
  request: Request,
  config: AccessConfig,
  getKey: (issuer: string) => JWTVerifyGetKey = remoteJwks,
): Promise<AccessVerdict> {
  const team = config.CF_ACCESS_TEAM_DOMAIN?.trim();
  const audience = config.CF_ACCESS_AUD?.trim();
  if (!team || !audience) {
    if (config.ALLOW_UNAUTHENTICATED?.trim().toLowerCase() === "true") return { ok: true };
    return {
      ok: false,
      status: 503,
      reason:
        "Cloudflare Access is not configured. Set CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD (see docs/DEPLOYMENT.md).",
    };
  }
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return { ok: false, status: 401, reason: "Sign in through Cloudflare Access to use this app." };
  const issuer = accessIssuer(team);
  try {
    const { payload } = await jwtVerify(token, getKey(issuer), { issuer, audience, algorithms: ["RS256"] });
    return { ok: true, email: typeof payload.email === "string" ? payload.email : undefined };
  } catch {
    return { ok: false, status: 403, reason: "Your Cloudflare Access session is invalid or expired. Sign in again." };
  }
}
