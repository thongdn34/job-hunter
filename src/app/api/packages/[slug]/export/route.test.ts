import { beforeEach, describe, expect, it, vi } from "vitest";
import { InterviewPackageSchema } from "@/domain/package/schema";
import { exportFixture } from "@/domain/export/__fixtures__/export-fixture";

const getPackageBySlug = vi.fn();
vi.mock("@/server/repositories/package-repository", () => ({
  getPackageBySlug: (slug: string) => getPackageBySlug(slug),
}));

const { GET } = await import("./route");

const SLUG = exportFixture.meta.slug;
const call = (query: string, slug = SLUG) =>
  GET(new Request(`http://localhost/api/packages/${slug}/export?${query}`), { params: Promise.resolve({ slug }) });

describe("GET /api/packages/[slug]/export", () => {
  beforeEach(() => {
    getPackageBySlug.mockReset();
    getPackageBySlug.mockImplementation(async (slug: string) => (slug === SLUG ? exportFixture : null));
  });

  it("returns 400 for a bad format", async () => {
    const res = await call("format=pdf");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: { path: string }[] };
    expect(body.issues[0]?.path).toBe("format");
  });

  it("returns 400 for a missing format, unknown section or bad language", async () => {
    expect((await call("")).status).toBe(400);
    expect((await call("format=md&sections=jd,nope")).status).toBe(400);
    expect((await call("format=md&sections=")).status).toBe(400);
    expect((await call("format=md&lang=fr")).status).toBe(400);
  });

  it("returns 404 for an unknown package", async () => {
    const res = await call("format=md", "missing-package");
    expect(res.status).toBe(404);
  });

  it("downloads Markdown with an attachment filename", async () => {
    const res = await call("format=md&sections=jd,bilingual&lang=en");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("content-disposition")).toContain(
      'attachment; filename="isb-senior-front-end-developer-run10.md"',
    );
    const text = await res.text();
    expect(text).toContain("BOOKMARK_ISB_JD");
    expect(text).toContain("BOOKMARK_ISB_BILINGUAL");
    expect(text).not.toContain("BOOKMARK_ISB_CODING");
  });

  it("downloads schema-valid JSON with only the selected sections", async () => {
    const res = await call("format=json&sections=coding");
    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    const parsed = InterviewPackageSchema.parse(await res.json());
    expect(Object.keys(parsed.sections)).toEqual(["coding"]);
  });

  it("downloads standalone HTML", async () => {
    const res = await call("format=html&lang=vi");
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("content-disposition")).toContain(".html");
    expect(await res.text()).toContain('class="jh-export lang-vi"');
  });
});
