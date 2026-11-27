// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { accessIssuer, verifyAccessRequest } from "./access";

const TEAM = "acme";
const ISSUER = "https://acme.cloudflareaccess.com";
const AUD = "aud-123";

async function setup() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
  const jwks = createLocalJWKSet({ keys: [jwk] });
  const sign = (claims: { iss?: string; aud?: string; exp?: string } = {}) =>
    new SignJWT({ email: "me@example.com" })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(claims.iss ?? ISSUER)
      .setAudience(claims.aud ?? AUD)
      .setIssuedAt()
      .setExpirationTime(claims.exp ?? "5m")
      .sign(privateKey);
  return { jwks, sign };
}

const request = (token?: string) =>
  new Request("https://jobs.example.com/", token ? { headers: { "cf-access-jwt-assertion": token } } : {});

describe("accessIssuer", () => {
  it.each(["acme", "acme.cloudflareaccess.com", "https://acme.cloudflareaccess.com/"])("normalizes %s", (value) => {
    expect(accessIssuer(value)).toBe(ISSUER);
  });
});

describe("verifyAccessRequest", () => {
  const config = { CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD };

  it("fails closed when Access is not configured", async () => {
    expect(await verifyAccessRequest(request(), {})).toMatchObject({ ok: false, status: 503 });
    expect(await verifyAccessRequest(request(), { CF_ACCESS_TEAM_DOMAIN: TEAM })).toMatchObject({ status: 503 });
  });

  it("allows unauthenticated access only when explicitly enabled (local previews)", async () => {
    expect(await verifyAccessRequest(request(), { ALLOW_UNAUTHENTICATED: "true" })).toEqual({ ok: true });
    expect(await verifyAccessRequest(request(), { ALLOW_UNAUTHENTICATED: "1" })).toMatchObject({ ok: false });
  });

  it("accepts a valid Access token", async () => {
    const { jwks, sign } = await setup();
    const verdict = await verifyAccessRequest(request(await sign()), config, () => jwks);
    expect(verdict).toEqual({ ok: true, email: "me@example.com" });
  });

  it("requires a token once configured, even if ALLOW_UNAUTHENTICATED is set", async () => {
    const { jwks } = await setup();
    const verdict = await verifyAccessRequest(request(), { ...config, ALLOW_UNAUTHENTICATED: "true" }, () => jwks);
    expect(verdict).toMatchObject({ ok: false, status: 401 });
  });

  it.each([
    ["another audience", { aud: "other" }],
    ["another issuer", { iss: "https://evil.cloudflareaccess.com" }],
    ["an expired token", { exp: "-1m" }],
  ])("rejects %s", async (_label, claims) => {
    const { jwks, sign } = await setup();
    const verdict = await verifyAccessRequest(request(await sign(claims)), config, () => jwks);
    expect(verdict).toMatchObject({ ok: false, status: 403 });
  });

  it("rejects tokens signed with an unknown key", async () => {
    const { jwks } = await setup();
    const other = await setup();
    const verdict = await verifyAccessRequest(request(await other.sign()), config, () => jwks);
    expect(verdict).toMatchObject({ ok: false, status: 403 });
  });
});
