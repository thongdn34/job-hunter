import { describe, expect, it, vi } from "vitest";
import { safeFetch } from "./safe-fetch";
import { createDohResolver } from "./url-guard";

const publicResolver = async () => [{ address: "93.184.216.34", family: 4 }];

function fetchSequence(responses: Array<() => Response>) {
  const calls: string[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL) => {
    calls.push(String(input));
    const next = responses.shift();
    if (!next) throw new Error("unexpected fetch");
    return next();
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("safeFetch (fetch transport, used on Cloudflare Workers)", () => {
  it("returns the decoded body and follows re-validated redirects", async () => {
    const { impl, calls } = fetchSequence([
      () => new Response(null, { status: 302, headers: { location: "/jobs/1" } }),
      () => new Response("<h1>Senior FE</h1>", { headers: { "content-type": "text/html; charset=utf-8" } }),
    ]);
    const page = await safeFetch("https://careers.example.com/start", {
      transport: "fetch",
      fetchImpl: impl,
      resolver: publicResolver,
    });
    expect(calls).toEqual(["https://careers.example.com/start", "https://careers.example.com/jobs/1"]);
    expect(page.url.href).toBe("https://careers.example.com/jobs/1");
    expect(page.body).toBe("<h1>Senior FE</h1>");
    expect(page.contentType).toContain("text/html");
  });

  it("refuses redirects to private addresses", async () => {
    const { impl } = fetchSequence([
      () => new Response(null, { status: 301, headers: { location: "http://127.0.0.1/admin" } }),
    ]);
    await expect(
      safeFetch("https://careers.example.com/", { transport: "fetch", fetchImpl: impl, resolver: publicResolver }),
    ).rejects.toMatchObject({ code: "BLOCKED_HOST" });
  });

  it("bounds the response size even without content-length", async () => {
    const big = "x".repeat(2048);
    const { impl } = fetchSequence([() => new Response(big)]);
    await expect(
      safeFetch("https://careers.example.com/", {
        transport: "fetch",
        fetchImpl: impl,
        resolver: publicResolver,
        maxBytes: 1024,
      }),
    ).rejects.toMatchObject({ code: "TOO_LARGE" });
  });

  it("maps network failures to FETCH_FAILED", async () => {
    const impl = vi.fn(async () => {
      throw new TypeError("network down");
    }) as unknown as typeof fetch;
    await expect(
      safeFetch("https://careers.example.com/", { transport: "fetch", fetchImpl: impl, resolver: publicResolver }),
    ).rejects.toMatchObject({ code: "FETCH_FAILED" });
  });
});

describe("createDohResolver", () => {
  const doh = (answers: Record<string, Array<{ type: number; data: string }>>) =>
    vi.fn(async (input: RequestInfo | URL) => {
      const type = new URL(String(input)).searchParams.get("type") ?? "A";
      return Response.json({ Status: 0, Answer: answers[type] ?? [] });
    }) as unknown as typeof fetch;

  it("returns A and AAAA records (ignoring CNAME entries)", async () => {
    const resolve = createDohResolver(
      doh({
        A: [
          { type: 5, data: "alias.example.com." },
          { type: 1, data: "93.184.216.34" },
        ],
        AAAA: [{ type: 28, data: "2606:2800:220:1::1" }],
      }),
    );
    expect(await resolve("example.com")).toEqual([
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1::1", family: 6 },
    ]);
  });

  it("lets safeFetch block hosts that resolve to private addresses", async () => {
    const resolver = createDohResolver(doh({ A: [{ type: 1, data: "10.0.0.5" }] }));
    const impl = vi.fn() as unknown as typeof fetch;
    await expect(
      safeFetch("https://rebind.example.com/", { transport: "fetch", fetchImpl: impl, resolver }),
    ).rejects.toMatchObject({ code: "BLOCKED_HOST" });
    expect(impl).not.toHaveBeenCalled();
  });
});
