import { describe, expect, it } from "vitest";
import { checkRequest, parseAllowedHosts, parseHostHeader, type GuardRequest } from "./request-guard";

const none = parseAllowedHosts(undefined);
const req = (patch: Partial<GuardRequest>): GuardRequest => ({
  method: "GET",
  host: "localhost:3000",
  origin: null,
  secFetchSite: null,
  ...patch,
});

describe("request guard", () => {
  it("parses Host headers and the allowlist", () => {
    expect(parseHostHeader("LOCALHOST:3000")).toEqual({ host: "localhost:3000", hostname: "localhost" });
    expect(parseHostHeader("[::1]:3100")).toEqual({ host: "[::1]:3100", hostname: "[::1]" });
    expect(parseHostHeader("evil.com/x")).toBeNull();
    expect(parseHostHeader("")).toBeNull();
    const allowed = parseAllowedHosts(" Jobs.Example.com , 10.0.0.5:3000,");
    expect([...allowed.entries]).toEqual(["jobs.example.com", "10.0.0.5:3000"]);
    expect(allowed.any).toBe(false);
    expect(parseAllowedHosts("*").any).toBe(true);
  });

  it("serves loopback hosts and refuses others (DNS rebinding)", () => {
    for (const host of ["localhost:3000", "127.0.0.1:3100", "[::1]:3000", "localhost"]) {
      expect(checkRequest(req({ host }), none).ok, host).toBe(true);
    }
    expect(checkRequest(req({ host: "attacker.example:3000" }), none).ok).toBe(false);
    expect(checkRequest(req({ host: null }), none).ok).toBe(false);
    expect(checkRequest(req({ host: "jobs.example.com" }), parseAllowedHosts("jobs.example.com")).ok).toBe(true);
    expect(checkRequest(req({ host: "10.0.0.5:3001" }), parseAllowedHosts("10.0.0.5:3000")).ok).toBe(false);
    expect(checkRequest(req({ host: "anything.test" }), parseAllowedHosts("*")).ok).toBe(true);
  });

  it("refuses cross-site state-changing requests (CSRF)", () => {
    const post = (patch: Partial<GuardRequest>) => checkRequest(req({ method: "POST", ...patch }), none).ok;
    expect(post({ secFetchSite: "cross-site", origin: "https://evil.example" })).toBe(false);
    expect(post({ secFetchSite: "same-site", origin: "http://localhost:5173" })).toBe(false);
    expect(post({ origin: "https://evil.example" })).toBe(false);
    expect(post({ origin: "null" })).toBe(false);
    // Same-origin browser requests and non-browser clients (no Origin) pass.
    expect(post({ secFetchSite: "same-origin", origin: "http://localhost:3000" })).toBe(true);
    expect(post({})).toBe(true);
    // Reads are never blocked by the origin check.
    expect(checkRequest(req({ secFetchSite: "cross-site", origin: "https://evil.example" }), none).ok).toBe(true);
  });

  it("accepts an allow-listed public origin behind a Host-rewriting reverse proxy", () => {
    const allowed = parseAllowedHosts("jobs.example.com");
    const request = req({
      method: "POST",
      host: "127.0.0.1:3000",
      origin: "https://jobs.example.com",
      secFetchSite: "same-origin",
    });
    expect(checkRequest(request, allowed).ok).toBe(true);
    expect(checkRequest(request, none).ok).toBe(false);
  });
});
