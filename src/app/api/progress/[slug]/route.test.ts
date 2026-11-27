import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyProgress } from "@/domain/progress/schema";
import { PackageNotFoundError } from "@/server/repositories/repository-errors";

const repo = vi.hoisted(() => ({
  getProgress: vi.fn(),
  saveProgress: vi.fn(),
}));
vi.mock("@/server/repositories/progress-repository", () => repo);

import { GET, POST, PUT } from "./route";

const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });
const valid = { ...emptyProgress(), studied: ["q1"], updatedAt: "2026-11-27T10:00:00.000Z" };

beforeEach(() => {
  repo.getProgress.mockReset();
  repo.saveProgress.mockReset();
  repo.saveProgress.mockImplementation(async (_slug: string, p: unknown) => p);
});

function put(body: string, method = "PUT") {
  return new Request("http://localhost/api/progress/pkg", {
    method,
    body,
    headers: { "content-type": "application/json" },
  });
}

describe("/api/progress/[slug]", () => {
  it("GET returns the stored progress", async () => {
    repo.getProgress.mockResolvedValue(valid);
    const res = await GET(new Request("http://localhost/api/progress/pkg"), ctx("pkg"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ progress: valid });
    expect(repo.getProgress).toHaveBeenCalledWith("pkg");
  });

  it("GET returns null when nothing is stored", async () => {
    repo.getProgress.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/progress/pkg"), ctx("pkg"));
    expect(await res.json()).toEqual({ progress: null });
  });

  it("GET rejects an invalid slug", async () => {
    const res = await GET(new Request("http://localhost/api/progress/x"), ctx("../etc"));
    expect(res.status).toBe(400);
    expect(repo.getProgress).not.toHaveBeenCalled();
  });

  it("GET returns 500 when the repository throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    repo.getProgress.mockRejectedValue(new Error("db down"));
    const res = await GET(new Request("http://localhost/api/progress/pkg"), ctx("pkg"));
    expect(res.status).toBe(500);
  });

  it("PUT validates and saves", async () => {
    const res = await PUT(put(JSON.stringify(valid)), ctx("pkg"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ progress: valid });
    expect(repo.saveProgress).toHaveBeenCalledWith("pkg", valid);
  });

  it("PUT returns 400 for an invalid payload", async () => {
    const res = await PUT(put(JSON.stringify({ studied: "nope" })), ctx("pkg"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
    expect(body.issues).toBeDefined();
    expect(repo.saveProgress).not.toHaveBeenCalled();
  });

  it("PUT returns 404 (without logging a server error) for an unknown package", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    repo.saveProgress.mockRejectedValue(new PackageNotFoundError("gone"));
    const res = await PUT(put(JSON.stringify(valid)), ctx("gone"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/not found/i);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("PUT returns 400 for malformed JSON", async () => {
    const res = await PUT(put("{not json"), ctx("pkg"));
    expect(res.status).toBe(400);
  });

  it("POST (sendBeacon, text/plain) is accepted", async () => {
    const req = new Request("http://localhost/api/progress/pkg", {
      method: "POST",
      body: JSON.stringify(valid),
      headers: { "content-type": "text/plain;charset=UTF-8" },
    });
    const res = await POST(req, ctx("pkg"));
    expect(res.status).toBe(200);
    expect(repo.saveProgress).toHaveBeenCalledWith("pkg", valid);
  });

  it("rejects oversized payloads", async () => {
    const res = await PUT(put("x".repeat(600 * 1024)), ctx("pkg"));
    expect(res.status).toBe(413);
  });
});
