// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";
import { describe, expect, it, vi } from "vitest";
import { NormalizedJdSchema } from "@/domain/jd/schema";
import { JdExtractionError } from "./errors";
import { extractJobFromUrl, normalizeManualJd, stripSiteSuffix } from "./extract";
import { extractFieldsFromHtml, findJsonLdJobPosting, htmlToText, jobPostingToFields } from "./html";
import { canonicalLinkedInJobUrl, linkedInJobId, toLinkedInGuestUrl } from "./linkedin";
import type { FetchedPage } from "./safe-fetch";

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");
const NOW = new Date("2026-03-01T00:00:00.000Z");

function page(body: string, init: Partial<Omit<FetchedPage, "body">> = {}): FetchedPage {
  return { url: new URL("https://example.com/"), status: 200, contentType: "text/html; charset=utf-8", body, ...init };
}

describe("LinkedIn URL mapping", () => {
  it.each([
    ["https://www.linkedin.com/jobs/view/4492566584/", "4492566584"],
    ["https://www.linkedin.com/jobs/view/4492566584", "4492566584"],
    ["https://vn.linkedin.com/jobs/view/senior-front-end-developer-at-isb-vietnam-4492566584?trk=abc", "4492566584"],
    ["https://www.linkedin.com/comm/jobs/view/4492566584/", "4492566584"],
    ["https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4492566584", "4492566584"],
    ["https://www.linkedin.com/jobs/search/?currentJobId=4492566584&keywords=react", "4492566584"],
    ["https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4492566584", "4492566584"],
  ])("maps %s", (url, id) => {
    expect(linkedInJobId(new URL(url))).toBe(id);
    expect(toLinkedInGuestUrl(new URL(url))?.toString()).toBe(
      `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`,
    );
    expect(canonicalLinkedInJobUrl(new URL(url))).toBe(`https://www.linkedin.com/jobs/view/${id}/`);
  });

  it.each([
    "https://www.linkedin.com/in/someone/",
    "https://www.linkedin.com/feed/",
    "https://notlinkedin.com/jobs/view/4492566584/",
  ])("ignores non-job URL %s", (url) => {
    expect(toLinkedInGuestUrl(new URL(url))).toBeNull();
  });
});

describe("JSON-LD extraction", () => {
  it("finds a JobPosting inside @graph and maps its fields", () => {
    const $ = load(fixture("jobposting-jsonld.html"));
    const posting = findJsonLdJobPosting($);
    expect(posting).not.toBeNull();
    const fields = jobPostingToFields(posting!);
    expect(fields).toMatchObject({
      title: "Senior Frontend Engineer (React)",
      company: "Example Fintech JSC",
      location: "Ho Chi Minh City, Vietnam",
      employmentType: "Full time",
      strategy: "json-ld",
    });
    expect(fields.text).toContain("## Mô tả công việc");
    expect(fields.text).toContain("• Stream market data over WebSocket");
    expect(fields.text).toContain("retail investors & brokers");
    expect(fields.text).not.toMatch(/onerror|alert/);
  });

  it("ignores malformed JSON-LD blocks", () => {
    const $ = load('<script type="application/ld+json">{ not json</script><p>hi</p>');
    expect(findJsonLdJobPosting($)).toBeNull();
  });

  it("marks telecommute jobs as remote", () => {
    const fields = jobPostingToFields({
      title: "Dev",
      jobLocationType: "TELECOMMUTE",
      description: "Plain text description",
    });
    expect(fields.location).toBe("Remote");
    expect(fields.text).toBe("Plain text description");
  });
});

describe("htmlToText / main content", () => {
  it("keeps headings and list items, strips chrome and scripts", () => {
    const fields = extractFieldsFromHtml(fixture("generic-career-page.html"));
    expect(fields.strategy).toBe("main-content");
    expect(fields.title).toBe("Backend Developer");
    expect(fields.company).toBe("Acme Robotics");
    expect(fields.text).toContain("## What you'll do");
    expect(fields.text).toContain("• Own PostgreSQL schemas and migrations");
    expect(fields.text).toContain("## Nice to have");
    expect(fields.text).not.toMatch(/Privacy|Related jobs|window\.track|\.x\{\}/);
  });

  it("parses the LinkedIn guest markup", () => {
    const fields = extractFieldsFromHtml(fixture("linkedin-guest.html"), { linkedIn: true });
    expect(fields).toMatchObject({
      title: "Senior Front-End Developer",
      company: "ISB Vietnam",
      location: "Ho Chi Minh City, Vietnam",
      employmentType: "Full-time",
      strategy: "linkedin",
    });
    expect(fields.text.split("\n")).toEqual(
      expect.arrayContaining([
        "Responsibilities",
        "• Optimize rendering of high-frequency data streams",
        "Requirements",
      ]),
    );
  });

  it("promotes bold-only paragraphs to headings", () => {
    expect(htmlToText("<p><strong>Quyền lợi:</strong></p><ul><li>Lương tháng 13</li></ul>")).toBe(
      "## Quyền lợi\n• Lương tháng 13",
    );
  });
});

describe("extractJobFromUrl", () => {
  it("fetches the LinkedIn guest endpoint and normalizes the result", async () => {
    const fetchPage = vi.fn<(url: URL) => Promise<FetchedPage>>(async () => page(fixture("linkedin-guest.html")));
    const jd = await extractJobFromUrl("https://www.linkedin.com/jobs/view/senior-fe-at-isb-4492566584/?trk=x", {
      fetchPage,
      now: NOW,
    });
    expect(fetchPage.mock.calls[0]?.[0].toString()).toBe(
      "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4492566584",
    );
    expect(NormalizedJdSchema.parse(jd)).toEqual(jd);
    expect(jd).toMatchObject({
      companyName: "ISB Vietnam",
      jobTitle: "Senior Front-End Developer",
      origin: "url",
      sourceUrl: "https://www.linkedin.com/jobs/view/4492566584/",
      extractedAt: NOW.toISOString(),
    });
    expect(jd.sections.map((s) => s.heading)).toEqual(["Responsibilities", "Requirements"]);
  });

  it("prefers JSON-LD for career pages", async () => {
    const jd = await extractJobFromUrl("https://careers.example.com/jobs/1", {
      fetchPage: async () => page(fixture("jobposting-jsonld.html")),
      now: NOW,
    });
    expect(jd.companyName).toBe("Example Fintech JSC");
    expect(jd.sections.map((s) => s.heading)).toEqual(["Overview", "Mô tả công việc", "Yêu cầu", "Benefits"]);
  });

  it.each([
    [403, "LOGIN_REQUIRED"],
    [999, "LOGIN_REQUIRED"],
    [404, "FETCH_FAILED"],
    [429, "FETCH_FAILED"],
    [500, "FETCH_FAILED"],
  ])("maps HTTP %s to %s", async (status, code) => {
    await expect(
      extractJobFromUrl("https://careers.example.com/jobs/1", { fetchPage: async () => page("", { status }) }),
    ).rejects.toMatchObject({ code });
  });

  it("reports login walls and empty pages", async () => {
    await expect(
      extractJobFromUrl("https://careers.example.com/jobs/1", {
        fetchPage: async () => page("<main><p>Please sign in to view this job.</p></main>"),
      }),
    ).rejects.toMatchObject({ code: "LOGIN_REQUIRED" });
    await expect(
      extractJobFromUrl("https://careers.example.com/jobs/1", { fetchPage: async () => page("<div id='root'></div>") }),
    ).rejects.toMatchObject({ code: "NO_CONTENT" });
  });

  it("rejects non-HTML content and non-job LinkedIn links", async () => {
    await expect(
      extractJobFromUrl("https://careers.example.com/jd.pdf", {
        fetchPage: async () => page("%PDF-1.7", { contentType: "application/pdf" }),
      }),
    ).rejects.toMatchObject({ code: "NO_CONTENT" });
    await expect(extractJobFromUrl("https://www.linkedin.com/in/someone/")).rejects.toBeInstanceOf(JdExtractionError);
  });

  it("rejects unsafe URLs before fetching", async () => {
    const fetchPage = vi.fn();
    await expect(extractJobFromUrl("http://169.254.169.254/latest/meta-data/", { fetchPage })).rejects.toMatchObject({
      code: "BLOCKED_HOST",
    });
    await expect(extractJobFromUrl("file:///etc/passwd", { fetchPage })).rejects.toMatchObject({ code: "INVALID_URL" });
    expect(fetchPage).not.toHaveBeenCalled();
  });
});

describe("normalizeManualJd", () => {
  it("normalizes pasted text with origin manual", () => {
    const jd = normalizeManualJd(
      { companyName: "ACME", rawText: "Yêu cầu\n- React\n- TypeScript", sourceUrl: "https://acme.example/jobs/1" },
      NOW,
    );
    expect(jd).toMatchObject({
      origin: "manual",
      companyName: "ACME",
      jobTitle: "",
      sourceUrl: "https://acme.example/jobs/1",
    });
    expect(jd.sections).toEqual([{ heading: "Yêu cầu", items: ["React", "TypeScript"] }]);
  });

  it("detects the job title from pasted text unless one is given", () => {
    const rawText =
      "Acme Robotics is hiring a Senior Frontend Engineer to build our fleet dashboard.\nRequirements: React.";
    expect(normalizeManualJd({ companyName: "ACME", rawText }, NOW).jobTitle).toBe("Senior Frontend Engineer");
    expect(normalizeManualJd({ companyName: "ACME", jobTitle: "Staff FE", rawText }, NOW).jobTitle).toBe("Staff FE");
    expect(normalizeManualJd({ companyName: "ACME", jobTitle: "  ", rawText }, NOW).jobTitle).toBe(
      "Senior Frontend Engineer",
    );
    expect(
      normalizeManualJd(
        { companyName: "ACME", rawText: "<h1>Position: Data Engineer</h1><p>Build pipelines.</p>" },
        NOW,
      ).jobTitle,
    ).toBe("Data Engineer");
  });

  it("converts pasted HTML to text", () => {
    const jd = normalizeManualJd({ companyName: "ACME", rawText: "<h2>Benefits</h2><ul><li>Laptop</li></ul>" }, NOW);
    expect(jd.text).toBe("## Benefits\n• Laptop");
  });
});

describe("stripSiteSuffix", () => {
  it("removes site suffixes from page titles", () => {
    expect(stripSiteSuffix("Senior Engineer | ACME Careers")).toBe("Senior Engineer");
    expect(stripSiteSuffix("Front-End Developer - ITviec")).toBe("Front-End Developer");
    expect(stripSiteSuffix("Engineer")).toBe("Engineer");
  });
});
