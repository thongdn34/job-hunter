// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NormalizedJd } from "@/domain/jd/schema";

const mocks = vi.hoisted(() => ({
  extractJobFromUrl: vi.fn(),
  normalizeManualJd: vi.fn(),
  createPackageShell: vi.fn(),
  getPackageIdBySlug: vi.fn(),
  listPackages: vi.fn(),
  startPackageGeneration: vi.fn(),
}));

vi.mock("@/server/jd", () => {
  class JdExtractionError extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = "JdExtractionError";
    }
  }
  return {
    JdExtractionError,
    isJdExtractionError: (e: unknown) => e instanceof JdExtractionError,
    extractJobFromUrl: mocks.extractJobFromUrl,
    normalizeManualJd: mocks.normalizeManualJd,
  };
});
vi.mock("@/server/repositories/package-repository", () => ({
  createPackageShell: mocks.createPackageShell,
  getPackageIdBySlug: mocks.getPackageIdBySlug,
  listPackages: mocks.listPackages,
}));
vi.mock("@/server/generation/service", () => ({ startPackageGeneration: mocks.startPackageGeneration }));

import { GET, POST } from "./route";
import * as jdModule from "@/server/jd";

const jd: NormalizedJd = {
  companyName: "Acme",
  jobTitle: "Senior Frontend Engineer",
  origin: "manual",
  text: "x".repeat(100),
  sections: [],
  extractedAt: "2026-11-01T00:00:00.000Z",
  warnings: [],
};

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/packages", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );

beforeEach(() => {
  vi.stubEnv("AI_PROVIDER", "mock");
  mocks.normalizeManualJd.mockReturnValue(jd);
  mocks.extractJobFromUrl.mockResolvedValue({ ...jd, origin: "url", sourceUrl: "https://jobs.example.com/1" });
  mocks.createPackageShell.mockResolvedValue({ id: "pkg1", slug: "acme-senior-frontend-engineer" });
  mocks.getPackageIdBySlug.mockResolvedValue("pkg1");
  mocks.startPackageGeneration.mockResolvedValue({ id: "job1" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /api/packages", () => {
  it("lists packages", async () => {
    mocks.listPackages.mockResolvedValue([{ slug: "isb" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ packages: [{ slug: "isb" }] });
  });
});

describe("POST /api/packages", () => {
  it("creates a package from pasted text and starts a job", async () => {
    const res = await post({ companyName: "Acme", rawText: "x".repeat(100) });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ slug: "acme-senior-frontend-engineer", jobId: "job1" });
    expect(mocks.normalizeManualJd).toHaveBeenCalledWith(
      expect.objectContaining({ companyName: "Acme", rawText: "x".repeat(100) }),
    );
    expect(mocks.extractJobFromUrl).not.toHaveBeenCalled();
    expect(mocks.createPackageShell).toHaveBeenCalledWith(
      expect.objectContaining({ companyCode: "ACME", jobTitle: "Senior Frontend Engineer", jd }),
    );
    expect(mocks.startPackageGeneration).toHaveBeenCalledWith(expect.objectContaining({ packageId: "pkg1" }));
  });

  it("extracts from the URL when no text is pasted", async () => {
    const res = await post({ companyName: "Acme", sourceUrl: "https://jobs.example.com/1" });
    expect(res.status).toBe(201);
    expect(mocks.extractJobFromUrl).toHaveBeenCalledWith("https://jobs.example.com/1", expect.anything());
  });

  it("returns 422 EXTRACTION_FAILED so the UI can ask for a manual paste", async () => {
    mocks.extractJobFromUrl.mockRejectedValue(
      new (jdModule as unknown as { JdExtractionError: new (c: string, m: string) => Error }).JdExtractionError(
        "LOGIN_REQUIRED",
        "Login required.",
      ),
    );
    const res = await post({ companyName: "Acme", sourceUrl: "https://www.linkedin.com/jobs/view/1" });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "EXTRACTION_FAILED", reason: "LOGIN_REQUIRED" });
    expect(mocks.createPackageShell).not.toHaveBeenCalled();
  });

  it("returns 503 AI_NOT_CONFIGURED without a provider", async () => {
    vi.stubEnv("AI_PROVIDER", "anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await post({ companyName: "Acme", rawText: "x".repeat(100) });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: "AI_NOT_CONFIGURED" });
  });

  it("validates the body", async () => {
    expect((await post({ companyName: "" })).status).toBe(400);
    expect((await post({ companyName: "Acme" })).status).toBe(400);
    expect((await post({ companyName: "Acme", rawText: "too short" })).status).toBe(400);
    expect((await post("{not json")).status).toBe(400);
  });

  it("refuses non-JSON bodies (CORS simple requests) with 415", async () => {
    const res = await POST(
      new Request("http://localhost/api/packages", {
        method: "POST",
        body: JSON.stringify({ companyName: "Acme", rawText: "x".repeat(100) }),
      }),
    );
    expect(res.status).toBe(415);
    expect(await res.json()).toMatchObject({ code: "UNSUPPORTED_MEDIA_TYPE" });
  });
});
