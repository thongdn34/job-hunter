// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { LookupAddress } from "node:dns";
import { JdExtractionError } from "./errors";
import { isBlockedIp, parseIpv6 } from "./ip";
import { assertSafeUrl, parsePublicHttpUrl, type HostResolver } from "./url-guard";

const publicResolver: HostResolver = async () => [{ address: "93.184.216.34", family: 4 }];
const resolverFor =
  (...addresses: string[]): HostResolver =>
  async () =>
    addresses.map<LookupAddress>((address) => ({ address, family: address.includes(":") ? 6 : 4 }));

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error instanceof JdExtractionError ? error.code : "UNEXPECTED";
  }
}

describe("isBlockedIp", () => {
  it.each([
    "127.0.0.1",
    "127.255.255.254",
    "10.0.0.1",
    "10.255.1.2",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:169.254.169.254",
    "64:ff9b::a9fe:a9fe",
    "2002:a00:1::",
    "fc00::1",
    "fd00:ec2::254",
    "fe80::1",
    "fe80::1%en0",
    "ff02::1",
    "2001:db8::1",
    "not-an-ip",
  ])("blocks %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each([
    "93.184.216.34",
    "8.8.8.8",
    "172.32.0.1",
    "2606:4700:4700::1111",
    "::ffff:8.8.8.8",
    "[2a00:1450:4001:82a::200e]",
  ])("allows public address %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });

  it("parses IPv6 with embedded IPv4", () => {
    expect(parseIpv6("::ffff:1.2.3.4")).toEqual([0, 0, 0, 0, 0, 0xffff, 0x0102, 0x0304]);
    expect(parseIpv6("2001:db8::1")).toEqual([0x2001, 0xdb8, 0, 0, 0, 0, 0, 1]);
    expect(parseIpv6("nope")).toBeNull();
  });
});

describe("parsePublicHttpUrl", () => {
  it.each([
    ["file:///etc/passwd", "INVALID_URL"],
    ["ftp://example.com/job.txt", "INVALID_URL"],
    ["javascript:alert(1)", "INVALID_URL"],
    ["gopher://example.com", "INVALID_URL"],
    ["not a url", "INVALID_URL"],
    ["https://user:pass@example.com/", "INVALID_URL"],
    ["http://127.0.0.1/admin", "BLOCKED_HOST"],
    ["http://2130706433/", "BLOCKED_HOST"],
    ["http://0x7f.1/", "BLOCKED_HOST"],
    ["http://10.1.2.3/", "BLOCKED_HOST"],
    ["http://169.254.169.254/latest/meta-data/", "BLOCKED_HOST"],
    ["http://[::1]/", "BLOCKED_HOST"],
    ["http://[::ffff:127.0.0.1]/", "BLOCKED_HOST"],
    ["http://localhost:3000/", "BLOCKED_HOST"],
    ["http://api.localhost/", "BLOCKED_HOST"],
    ["http://metadata.google.internal/", "BLOCKED_HOST"],
    ["http://intranet/", "BLOCKED_HOST"],
    ["https://example.com:22/", "BLOCKED_HOST"],
  ])("rejects %s with %s", (url, code) => {
    expect(() => parsePublicHttpUrl(url)).toThrowError(expect.objectContaining({ code }));
  });

  it("accepts public http(s) URLs", () => {
    expect(parsePublicHttpUrl(" https://itviec.com/it-jobs/senior-react-1234 ").hostname).toBe("itviec.com");
    expect(parsePublicHttpUrl("http://93.184.216.34:8080/job").port).toBe("8080");
  });
});

describe("assertSafeUrl", () => {
  it("allows hosts that resolve only to public addresses", async () => {
    const resolver = vi.fn(publicResolver);
    await expect(assertSafeUrl("https://careers.example.com/job/1", resolver)).resolves.toBeInstanceOf(URL);
    expect(resolver).toHaveBeenCalledWith("careers.example.com");
  });

  it.each([["127.0.0.1"], ["10.0.0.5"], ["169.254.169.254"], ["::1"], ["fd00::1"]])(
    "blocks hosts resolving to %s",
    async (address) => {
      expect(await codeOf(assertSafeUrl("https://evil.example.com/", resolverFor(address)))).toBe("BLOCKED_HOST");
    },
  );

  it("blocks when any resolved address is private (mixed records)", async () => {
    expect(await codeOf(assertSafeUrl("https://evil.example.com/", resolverFor("93.184.216.34", "10.0.0.1")))).toBe(
      "BLOCKED_HOST",
    );
  });

  it("does not resolve IP literals and blocks private ones", async () => {
    const resolver = vi.fn(publicResolver);
    expect(await codeOf(assertSafeUrl("http://127.0.0.1/", resolver))).toBe("BLOCKED_HOST");
    expect(resolver).not.toHaveBeenCalled();
  });

  it("maps DNS failures to FETCH_FAILED", async () => {
    const failing: HostResolver = async () => {
      throw Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" });
    };
    expect(await codeOf(assertSafeUrl("https://does-not-exist.example/", failing))).toBe("FETCH_FAILED");
  });

  it("rejects non-http schemes before any DNS lookup", async () => {
    const resolver = vi.fn(publicResolver);
    expect(await codeOf(assertSafeUrl("file:///etc/passwd", resolver))).toBe("INVALID_URL");
    expect(await codeOf(assertSafeUrl("ftp://example.com/x", resolver))).toBe("INVALID_URL");
    expect(resolver).not.toHaveBeenCalled();
  });
});
