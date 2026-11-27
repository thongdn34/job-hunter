// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureInternalToken, INTERNAL_TOKEN_HEADER } from "@/server/cloudflare/internal-token";

const mocks = vi.hoisted(() => ({ getGenerationJob: vi.fn(), runGenerationJob: vi.fn() }));
vi.mock("@/server/repositories/generation-job-repository", () => ({ getGenerationJob: mocks.getGenerationJob }));
vi.mock("@/server/generation/pipeline", () => ({ runGenerationJob: mocks.runGenerationJob }));

const { POST } = await import("./route");
const KEY = Symbol.for("job-hunter.internal-token");

const call = (body: unknown, token?: string) =>
  POST(
    new Request("http://localhost/api/internal/generation/run", {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { [INTERNAL_TOKEN_HEADER]: token } : {}) },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  mocks.getGenerationJob.mockReset();
  mocks.runGenerationJob.mockReset();
});
afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[KEY];
});

describe("POST /api/internal/generation/run", () => {
  it("is a 404 without the isolate token (always the case under Node.js)", async () => {
    expect((await call({ jobId: "j1" })).status).toBe(404);
    expect((await call({ jobId: "j1" }, "guess")).status).toBe(404);
    ensureInternalToken();
    expect((await call({ jobId: "j1" }, "guess")).status).toBe(404);
    expect(mocks.runGenerationJob).not.toHaveBeenCalled();
  });

  it("runs a queued or interrupted (running) job", async () => {
    const token = ensureInternalToken();
    mocks.getGenerationJob.mockResolvedValue({ id: "j1", status: "running" });
    mocks.runGenerationJob.mockResolvedValue({ id: "j1", status: "succeeded" });
    const res = await call({ jobId: "j1", force: true }, token);
    expect(await res.json()).toEqual({ status: "succeeded" });
    expect(mocks.runGenerationJob).toHaveBeenCalledWith("j1", { force: true });
  });

  it("never re-runs a finished job (retried Workflow step)", async () => {
    const token = ensureInternalToken();
    mocks.getGenerationJob.mockResolvedValue({ id: "j1", status: "partial" });
    expect(await (await call({ jobId: "j1" }, token)).json()).toEqual({ status: "partial", skipped: true });
    mocks.getGenerationJob.mockResolvedValue(null);
    expect(await (await call({ jobId: "gone" }, token)).json()).toEqual({ status: "missing" });
    expect(mocks.runGenerationJob).not.toHaveBeenCalled();
  });

  it("validates the body", async () => {
    const token = ensureInternalToken();
    expect((await call({ nope: 1 }, token)).status).toBe(400);
  });
});
