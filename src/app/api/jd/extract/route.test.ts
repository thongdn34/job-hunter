// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NormalizedJd } from "@/domain/jd/schema";

const extractMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/jd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/jd")>();
  return {
    ...actual,
    // Delegate to the real implementation unless a test overrides it (keeps URL validation real).
    extractJobFromUrl: (...args: Parameters<typeof actual.extractJobFromUrl>) =>
      extractMock.getMockImplementation() ? extractMock(...args) : actual.extractJobFromUrl(...args),
  };
});

const { POST } = await import("./route");

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/jd/extract", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const sampleJd: NormalizedJd = {
  companyName: "ACME",
  jobTitle: "Engineer",
  origin: "url",
  text: "Requirements\n• React",
  sections: [{ heading: "Requirements", items: ["React"] }],
  extractedAt: "2026-01-01T00:00:00.000Z",
  warnings: [],
};

describe("POST /api/jd/extract", () => {
  beforeEach(() => {
    extractMock.mockReset();
  });

  it.each([["not a url"], ["file:///etc/passwd"], ["ftp://example.com/job"]])(
    "returns 422 INVALID_URL for %s",
    async (url) => {
      const res = await POST(post({ url }, { "x-forwarded-for": "198.51.100.1" }));
      expect(res.status).toBe(422);
      await expect(res.json()).resolves.toMatchObject({ code: "INVALID_URL", error: expect.any(String) });
    },
  );

  it("returns 422 INVALID_URL when the url is missing", async () => {
    const res = await POST(post({}));
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toMatchObject({ code: "INVALID_URL" });
  });

  it("returns 422 BLOCKED_HOST for internal addresses", async () => {
    const res = await POST(
      post({ url: "http://169.254.169.254/latest/meta-data/" }, { "x-forwarded-for": "198.51.100.2" }),
    );
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toMatchObject({ code: "BLOCKED_HOST" });
  });

  it("returns 400 for a malformed body", async () => {
    const res = await POST(post("{nope"));
    expect(res.status).toBe(400);
  });

  it("returns 200 with the normalized JD and caches repeat requests", async () => {
    extractMock.mockImplementation(async () => sampleJd);
    const url = "https://careers.example.com/jobs/cached";
    const first = await POST(post({ url }, { "x-forwarded-for": "198.51.100.3" }));
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ jd: sampleJd });
    const second = await POST(post({ url }, { "x-forwarded-for": "198.51.100.3" }));
    expect(second.status).toBe(200);
    expect(extractMock).toHaveBeenCalledTimes(1);
  });

  it("rate-limits a client after 10 extractions per minute", async () => {
    extractMock.mockImplementation(async () => sampleJd);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await POST(
        post({ url: `https://careers.example.com/jobs/${i}` }, { "x-forwarded-for": "203.0.113.9" }),
      );
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("maps unexpected errors to 422 so the UI can fall back to paste", async () => {
    extractMock.mockImplementation(async () => {
      throw new Error("boom");
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(
      post({ url: "https://careers.example.com/jobs/boom" }, { "x-forwarded-for": "198.51.100.4" }),
    );
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toMatchObject({ code: "FETCH_FAILED" });
    spy.mockRestore();
  });
});

describe("clientKey", () => {
  const req = (headers: Record<string, string>) => new Request("http://localhost/api/jd/extract", { headers });

  it("uses CF-Connecting-IP on Cloudflare and ignores spoofable X-Forwarded-For", async () => {
    const { clientKey } = await import("@/server/jd/client-key");
    const headers = { "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.1" };
    expect(clientKey(req(headers), true)).toBe("203.0.113.9");
    expect(clientKey(req({ "x-forwarded-for": "198.51.100.1" }), true)).toBe("unknown");
  });

  it("uses X-Forwarded-For under Node.js", async () => {
    const { clientKey } = await import("@/server/jd/client-key");
    expect(clientKey(req({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }), false)).toBe("198.51.100.1");
    expect(clientKey(req({}), false)).toBe("local");
  });
});
