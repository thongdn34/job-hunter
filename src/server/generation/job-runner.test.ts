import { describe, expect, it, vi } from "vitest";
import { createWorkflowRunner } from "./job-runner";
import type { WorkflowBindingLike, GenerationWorkflowParams, WorkflowInstanceLike } from "@/server/cloudflare/env";

function binding(status: string | Error | "missing") {
  const instance: WorkflowInstanceLike = {
    id: "job-1",
    status: vi.fn(async () => {
      if (status instanceof Error) throw status;
      return { status };
    }),
    terminate: vi.fn(async () => undefined),
  };
  const fake: WorkflowBindingLike<GenerationWorkflowParams> = {
    create: vi.fn(async () => instance),
    get: vi.fn(async () => {
      if (status === "missing") throw new Error("instance.not_found");
      return instance;
    }),
  };
  return { fake, instance };
}

describe("createWorkflowRunner (Cloudflare Workflows)", () => {
  it("creates one instance per job, keyed by the job id", async () => {
    const { fake } = binding("queued");
    await createWorkflowRunner(fake).start("job-1", { force: true });
    expect(fake.create).toHaveBeenCalledWith({ id: "job-1", params: { jobId: "job-1", force: true } });
  });

  it.each([
    ["queued", true],
    ["running", true],
    ["waiting", true],
    ["paused", true],
    ["complete", false],
    ["errored", false],
    ["terminated", false],
    ["missing", false],
  ])("treats instance status %s as alive=%s", async (status, alive) => {
    const { fake } = binding(status);
    expect(await createWorkflowRunner(fake).isAlive("job-1")).toBe(alive);
  });

  it("does not declare a job dead when the status call fails", async () => {
    const { fake } = binding(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await createWorkflowRunner(fake).isAlive("job-1")).toBe(true);
  });

  it("terminates the instance on stop and ignores unknown instances", async () => {
    const { fake, instance } = binding("running");
    await createWorkflowRunner(fake).stop("job-1", "Package deleted");
    expect(instance.terminate).toHaveBeenCalled();
    await expect(createWorkflowRunner(binding("missing").fake).stop("job-1", "x")).resolves.toBeUndefined();
  });
});
