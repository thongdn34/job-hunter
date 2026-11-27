// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { JdExtractionError } from "./errors";
import { parseLinkedInPageTitle, parseReaderResponse, readerFallbackFromEnv } from "./reader";

const JINA_BODY = `Title: Senior Frontend Developer at Tinhvan Software JSC. — Quận 7, Ho Chi Minh City, Vietnam | LinkedIn Jobs

URL Source: https://www.linkedin.com/jobs/view/4494986236/

Markdown Content:
**Requirements:**

*   5+ years of experience in Frontend Development.
`;

describe("parseReaderResponse", () => {
  it("splits the Jina header from the markdown content", () => {
    const page = parseReaderResponse(JINA_BODY);
    expect(page.title).toBe(
      "Senior Frontend Developer at Tinhvan Software JSC. — Quận 7, Ho Chi Minh City, Vietnam | LinkedIn Jobs",
    );
    expect(page.text.startsWith("**Requirements:**")).toBe(true);
    expect(page.text).not.toContain("URL Source");
  });

  it("treats the upstream site's error warning as a failure", () => {
    expect(() =>
      parseReaderResponse("Title: \n\nWarning: Target URL returned error 429: Too Many Requests\n\n"),
    ).toThrow(JdExtractionError);
  });

  it("falls back to the whole body without the marker", () => {
    expect(parseReaderResponse("just text").text).toBe("just text");
  });
});

describe("parseLinkedInPageTitle", () => {
  it("extracts the job title and company", () => {
    expect(
      parseLinkedInPageTitle("Senior Frontend Developer at Tinhvan Software JSC. — Quận 7, Vietnam | LinkedIn Jobs"),
    ).toEqual({
      title: "Senior Frontend Developer",
      company: "Tinhvan Software JSC.",
    });
    expect(parseLinkedInPageTitle("Dev at ACME | LinkedIn")).toEqual({ title: "Dev", company: "ACME" });
  });

  it("returns nothing for titles it does not recognise", () => {
    expect(parseLinkedInPageTitle("LinkedIn Jobs")).toEqual({});
    expect(parseLinkedInPageTitle("")).toEqual({});
  });
});

describe("readerFallbackFromEnv", () => {
  it("is disabled unless JD_READER_FALLBACK=jina", () => {
    expect(readerFallbackFromEnv({})).toBeUndefined();
    expect(readerFallbackFromEnv({ JD_READER_FALLBACK: "off" })).toBeUndefined();
    expect(readerFallbackFromEnv({ JD_READER_FALLBACK: " Jina " })).toBeDefined();
  });

  it("calls r.jina.ai with the page URL, selectors and the optional API key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JINA_BODY, { status: 200 }));
    const reader = readerFallbackFromEnv({ JD_READER_FALLBACK: "jina", JINA_API_KEY: "k-123" }, fetchImpl);
    const page = await reader!(new URL("https://www.linkedin.com/jobs/view/4494986236/"), { linkedIn: true });
    expect(page.text).toContain("Requirements");

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://r.jina.ai/https://www.linkedin.com/jobs/view/4494986236/");
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-Target-Selector"]).toBe(".description__text");
    expect(headers.Authorization).toBe("Bearer k-123");
    expect(init?.redirect).toBe("manual");
  });

  it("omits the key and the LinkedIn selector when not needed", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JINA_BODY, { status: 200 }));
    const reader = readerFallbackFromEnv({ JD_READER_FALLBACK: "jina" }, fetchImpl);
    await reader!(new URL("https://careers.example.com/jobs/1"), { linkedIn: false });
    const headers = fetchImpl.mock.calls[0]![1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers["X-Target-Selector"]).toBeUndefined();
  });

  it("treats a redirect from the reader as a failure", async () => {
    const redirected = readerFallbackFromEnv(
      { JD_READER_FALLBACK: "jina" },
      vi.fn<typeof fetch>(
        async () => new Response(null, { status: 302, headers: { location: "https://evil.example/" } }),
      ),
    );
    await expect(redirected!(new URL("https://a.example/x"), { linkedIn: false })).rejects.toMatchObject({
      code: "FETCH_FAILED",
    });
  });

  it("maps HTTP errors and network failures to FETCH_FAILED", async () => {
    const limited = readerFallbackFromEnv(
      { JD_READER_FALLBACK: "jina" },
      vi.fn<typeof fetch>(async () => new Response("slow down", { status: 429 })),
    );
    await expect(limited!(new URL("https://a.example/x"), { linkedIn: false })).rejects.toMatchObject({
      code: "FETCH_FAILED",
    });
    const down = readerFallbackFromEnv(
      { JD_READER_FALLBACK: "jina" },
      vi.fn<typeof fetch>(async () => {
        throw new TypeError("network down");
      }),
    );
    await expect(down!(new URL("https://a.example/x"), { linkedIn: false })).rejects.toMatchObject({
      code: "FETCH_FAILED",
    });
  });
});
