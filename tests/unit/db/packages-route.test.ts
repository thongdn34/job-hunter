// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PackageNotFoundError, SamplePackageError } from "@/server/repositories/repository-errors";

const getPackageBySlug = vi.fn();
const deletePackage = vi.fn();
// The delete route looks up an in-flight generation job first; none exists in these tests.
const getPackageIdBySlug = vi.fn(async () => null);

vi.mock("@/server/repositories/package-repository", async () => {
  const errors = await import("@/server/repositories/repository-errors");
  return { ...errors, getPackageBySlug, deletePackage, getPackageIdBySlug };
});

const { GET, DELETE } = await import("@/app/api/packages/[slug]/route");

const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });
const req = (method: string) => new Request("http://localhost/api/packages/x", { method });

describe("/api/packages/[slug]", () => {
  beforeEach(() => {
    getPackageBySlug.mockReset();
    deletePackage.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("GET returns the package", async () => {
    getPackageBySlug.mockResolvedValue({ meta: { slug: "a" } });
    const res = await GET(req("GET"), ctx("a"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ package: { meta: { slug: "a" } } });
    expect(getPackageBySlug).toHaveBeenCalledWith("a");
  });

  it("GET returns 404 for unknown slugs and 500 on failure", async () => {
    getPackageBySlug.mockResolvedValue(null);
    expect((await GET(req("GET"), ctx("missing"))).status).toBe(404);
    getPackageBySlug.mockRejectedValue(new Error("db down"));
    const res = await GET(req("GET"), ctx("a"));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ code: "internal" });
  });

  it("DELETE maps repository outcomes to 204 / 403 / 404 / 500", async () => {
    deletePackage.mockResolvedValue(undefined);
    const ok = await DELETE(req("DELETE"), ctx("a"));
    expect(ok.status).toBe(204);
    expect(await ok.text()).toBe("");

    deletePackage.mockRejectedValue(new SamplePackageError("isb"));
    expect((await DELETE(req("DELETE"), ctx("isb"))).status).toBe(403);

    deletePackage.mockRejectedValue(new PackageNotFoundError("x"));
    expect((await DELETE(req("DELETE"), ctx("x"))).status).toBe(404);

    deletePackage.mockRejectedValue(new Error("boom"));
    expect((await DELETE(req("DELETE"), ctx("x"))).status).toBe(500);
  });
});
