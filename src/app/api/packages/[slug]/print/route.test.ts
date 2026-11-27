import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportFixture } from "@/domain/export/__fixtures__/export-fixture";
import { buildStandaloneHtmlParts } from "@/domain/export/html";
import { sectionBookmark } from "@/domain/package/bookmarks";

const getPackageBySlug = vi.fn();
vi.mock("@/server/repositories/package-repository", () => ({
  getPackageBySlug: (slug: string) => getPackageBySlug(slug),
}));

const { GET } = await import("./route");

const SLUG = exportFixture.meta.slug;
const call = (query: string, slug = SLUG) =>
  GET(new Request(`http://localhost/api/packages/${slug}/print?${query}`), { params: Promise.resolve({ slug }) });

describe("GET /api/packages/[slug]/print", () => {
  beforeEach(() => {
    getPackageBySlug.mockReset();
    getPackageBySlug.mockImplementation(async (slug: string) => (slug === SLUG ? exportFixture : null));
  });

  it("returns 400 for an unknown section or bad language", async () => {
    expect((await call("sections=jd,nope")).status).toBe(400);
    expect((await call("sections=")).status).toBe(400);
    const res = await call("lang=fr");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { issues: { path: string }[] };
    expect(body.issues[0]?.path).toBe("lang");
  });

  it("returns 404 for an unknown package", async () => {
    expect((await call("lang=en", "missing-package")).status).toBe(404);
  });

  it("returns only the expanded, non-interactive export body as an inert HTML fragment", async () => {
    const res = await call("sections=jd,bilingual&lang=vi&autoprint=1");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    expect(res.headers.get("content-disposition")).toBeNull();

    const text = await res.text();
    const expected = buildStandaloneHtmlParts(exportFixture, {
      sections: ["jd", "bilingual"],
      language: "vi",
      expanded: true,
      interactive: false,
    }).body;
    const withoutExportTime = (html: string) => html.replace(/<dt>Exported<\/dt><dd>[^<]*<\/dd>/, "");
    expect(withoutExportTime(text)).toBe(withoutExportTime(expected));
    expect(text.startsWith('<div class="jh-export lang-vi"')).toBe(true);
    expect(text).not.toContain("<script");
    expect(text).not.toContain("<style");
    expect(text).toContain(sectionBookmark("ISB", "bilingual"));
    expect(text).not.toContain(sectionBookmark("ISB", "coding"));
    expect(text).not.toContain("data-set-lang");
  });

  it("defaults to every section in bilingual mode", async () => {
    const text = await (await call("")).text();
    expect(text.startsWith('<div class="jh-export lang-bilingual"')).toBe(true);
    expect(text).toContain(sectionBookmark("ISB", "coding"));
  });
});
