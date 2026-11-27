// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultProfile } from "@/content/profile/default-profile";

const repo = vi.hoisted(() => ({
  saveCv: vi.fn(),
  clearCv: vi.fn(),
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
}));
vi.mock("@/server/repositories/profile-repository", () => repo);

const { POST, DELETE } = await import("./route");
const profileRoute = await import("../route");

function upload(file: File | null, init: RequestInit = {}) {
  const form = new FormData();
  if (file) form.set("file", file);
  return new Request("http://localhost/api/profile/cv", { method: "POST", body: form, ...init });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  repo.saveCv.mockImplementation(async ({ fileName, text }: { fileName: string; text: string }) => ({
    ...defaultProfile,
    cvFileName: fileName,
    cvText: text,
    cvUploadedAt: "2026-01-01T00:00:00.000Z",
  }));
  repo.clearCv.mockResolvedValue(defaultProfile);
});

describe("POST /api/profile/cv", () => {
  it("extracts and stores a text CV", async () => {
    const res = await POST(upload(new File(["Jane  Doe\n\n\nReact"], "cv.txt", { type: "text/plain" })));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(repo.saveCv).toHaveBeenCalledWith({ fileName: "cv.txt", text: "Jane Doe\n\nReact" });
    expect(body).toMatchObject({ extractedChars: 15, truncated: false, profile: { cvFileName: "cv.txt" } });
  });

  it("returns 415 for .docx", async () => {
    const res = await POST(upload(new File(["PK"], "cv.docx")));
    expect(res.status).toBe(415);
    expect((await res.json()).error).toMatch(/aren't supported yet/);
    expect(repo.saveCv).not.toHaveBeenCalled();
  });

  it("returns 400 when the file field is missing", async () => {
    const res = await POST(upload(null));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("missing_file");
  });

  it("returns 415 for non-multipart requests", async () => {
    const res = await POST(
      new Request("http://localhost/api/profile/cv", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(415);
  });

  it("returns 413 for oversized files", async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "cv.pdf", { type: "application/pdf" });
    const res = await POST(upload(big));
    expect(res.status).toBe(413);
  });

  it("returns 413 for an oversized body without Content-Length (streamed)", async () => {
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= 8) return controller.close();
        sent += 1;
        controller.enqueue(chunk);
      },
    });
    const res = await POST(
      new Request("http://localhost/api/profile/cv", {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=x" },
        body,
        duplex: "half",
      } as RequestInit),
    );
    expect(res.status).toBe(413);
    expect(repo.saveCv).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/profile/cv", () => {
  it("clears the CV", async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(repo.clearCv).toHaveBeenCalledOnce();
  });

  it("returns 500 on repository failure", async () => {
    repo.clearCv.mockRejectedValueOnce(new Error("db down"));
    const res = await DELETE();
    expect(res.status).toBe(500);
  });
});

describe("/api/profile", () => {
  it("GET returns the profile", async () => {
    repo.getProfile.mockResolvedValue(defaultProfile);
    const res = await profileRoute.GET();
    expect(await res.json()).toEqual({ profile: defaultProfile });
  });

  it("PUT validates the payload", async () => {
    const res = await profileRoute.PUT(
      new Request("http://localhost/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...defaultProfile, headline: "  " }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues).toEqual([expect.objectContaining({ path: "headline" })]);
    expect(repo.saveProfile).not.toHaveBeenCalled();
  });

  it("PUT returns 400 for a cvUploadedAt that is not an ISO datetime", async () => {
    const res = await profileRoute.PUT(
      new Request("http://localhost/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...defaultProfile, cvText: "my cv", cvUploadedAt: "yesterday" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ code: "validation" });
    expect(body.issues).toEqual([expect.objectContaining({ path: "cvUploadedAt" })]);
    expect(repo.saveProfile).not.toHaveBeenCalled();
  });

  it("PUT rejects invalid JSON and wrong content types", async () => {
    const bad = await profileRoute.PUT(
      new Request("http://localhost/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );
    expect(bad.status).toBe(400);
    const wrongType = await profileRoute.PUT(new Request("http://localhost/api/profile", { method: "PUT", body: "x" }));
    expect(wrongType.status).toBe(415);
  });

  it("PUT saves a sanitized profile", async () => {
    repo.saveProfile.mockImplementation(async (p: unknown) => p);
    const res = await profileRoute.PUT(
      new Request("http://localhost/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...defaultProfile, headline: " Staff Engineer " }),
      }),
    );
    expect(res.status).toBe(200);
    expect(repo.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ headline: "Staff Engineer" }));
  });
});
