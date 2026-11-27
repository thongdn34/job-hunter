import { describe, expect, it } from "vitest";
import {
  countDone,
  deriveSectionStatuses,
  finishedSignature,
  isJobActive,
  jobSectionStatus,
  packageNeedsGeneration,
  isSectionStalled,
  pageIsBehindJob,
  stalledSections,
} from "./section-progress";
import { allStates, makeJob, makePackage } from "./test-fixtures";

describe("section-progress", () => {
  it("hides generation UI for sample and complete packages", () => {
    expect(packageNeedsGeneration(makePackage(allStates("ready")))).toBe(false);
    expect(packageNeedsGeneration(makePackage({}, { isSample: true }))).toBe(false);
    expect(packageNeedsGeneration(makePackage({ ...allStates("ready"), coding: { status: "failed" } }))).toBe(true);
  });

  it("detects active jobs", () => {
    expect(isJobActive(makeJob({ status: "queued" }))).toBe(true);
    expect(isJobActive(makeJob({ status: "running" }))).toBe(true);
    expect(isJobActive(makeJob({ status: "partial" }))).toBe(false);
    expect(isJobActive(null)).toBe(false);
  });

  it("prefers job progress for covered sections and falls back to persisted state", () => {
    const pkg = makePackage({
      ...allStates("ready"),
      jd: { status: "pending" },
      coding: { status: "failed", error: "x" },
    });
    const job = makeJob({ sections: ["jd"], progress: { jd: { status: "generating" } } });
    const statuses = deriveSectionStatuses(pkg, job);
    expect(statuses.jd).toBe("generating");
    expect(statuses.coding).toBe("failed");
    expect(statuses.company).toBe("ready");
    expect(countDone(statuses)).toBe(14);
  });

  it("treats covered sections without progress as pending while the job runs", () => {
    expect(jobSectionStatus(makeJob({ progress: {} }), "match")).toBe("pending");
    expect(jobSectionStatus(makeJob({ status: "failed", progress: {} }), "match")).toBeUndefined();
    expect(jobSectionStatus(makeJob({ sections: ["jd"] }), "match")).toBeUndefined();
  });

  it("reads unfinished entries of a finished job as failed (cancelled for cancelled jobs)", () => {
    const stuck = { jd: { status: "generating" as const }, company: { status: "pending" as const } };
    const failed = makeJob({ status: "failed", sections: ["jd", "company"], progress: stuck });
    expect(jobSectionStatus(failed, "jd")).toBe("failed");
    expect(jobSectionStatus(failed, "company")).toBe("failed");
    const cancelled = makeJob({ status: "cancelled", sections: ["jd", "company"], progress: stuck });
    expect(jobSectionStatus(cancelled, "jd")).toBe("cancelled");
    expect(jobSectionStatus(makeJob({ sections: ["jd"], progress: stuck }), "jd")).toBe("generating");
    // Nothing stays a skeleton: the failed sections are not "stalled" and offer Retry.
    const pkg = makePackage({ ...allStates("ready"), jd: { status: "generating" }, company: { status: "pending" } });
    expect(deriveSectionStatuses(pkg, failed)).toMatchObject({ jd: "failed", company: "failed" });
    expect(stalledSections(pkg, failed).size).toBe(0);
  });

  it("counts skipped sections as done", () => {
    const statuses = deriveSectionStatuses(
      makePackage(),
      makeJob({ progress: { jd: { status: "skipped" }, company: { status: "ready" } } }),
    );
    expect(countDone(statuses)).toBe(2);
  });

  it("knows when the server-rendered page is behind the job", () => {
    const pkg = makePackage({ jd: { status: "generating" } });
    expect(pageIsBehindJob(pkg, makeJob({ progress: { jd: { status: "generating" } } }))).toBe(false);
    expect(pageIsBehindJob(pkg, makeJob({ progress: { jd: { status: "ready" } } }))).toBe(true);
    expect(pageIsBehindJob(pkg, makeJob({ progress: { jd: { status: "failed", error: "bad" } } }))).toBe(true);
    expect(
      pageIsBehindJob(makePackage({ jd: { status: "ready" } }), makeJob({ progress: { jd: { status: "ready" } } })),
    ).toBe(false);
    // Job ended but the page still shows an in-flight section.
    expect(pageIsBehindJob(pkg, makeJob({ status: "cancelled", sections: ["jd"], progress: {} }))).toBe(true);
    expect(pageIsBehindJob(pkg, null)).toBe(false);
  });

  it("changes the finished signature exactly when a section finishes", () => {
    const a = finishedSignature(makeJob({ progress: { jd: { status: "generating" } } }));
    const b = finishedSignature(
      makeJob({ progress: { jd: { status: "generating" }, company: { status: "pending" } } }),
    );
    const c = finishedSignature(makeJob({ progress: { jd: { status: "ready" } } }));
    expect(a).toBe(b);
    expect(c).not.toBe(a);
    expect(finishedSignature(null)).toBe("");
  });

  it("flags pending/generating sections that no running job will finish", () => {
    const base = { loaded: true, jobActive: true, coveredByJob: true };
    expect(isSectionStalled({ ...base, status: "pending" })).toBe(false);
    expect(isSectionStalled({ ...base, status: "pending", loaded: false, jobActive: false })).toBe(false);
    expect(isSectionStalled({ ...base, status: "generating", jobActive: false })).toBe(true);
    expect(isSectionStalled({ ...base, status: "pending", coveredByJob: false })).toBe(true);
    expect(isSectionStalled({ ...base, status: "failed", jobActive: false })).toBe(false);
    expect(isSectionStalled({ ...base, status: undefined, jobActive: false })).toBe(false);
  });

  it("finds stalled sections after a cancelled run was followed by a single-section retry", () => {
    // Cancelled run left cv/intro "pending"; the latest job only regenerated jd.
    const pkg = makePackage({ ...allStates("ready"), cv: { status: "pending" }, intro: { status: "pending" } });
    const retry = makeJob({ status: "succeeded", sections: ["jd"], progress: { jd: { status: "ready" } } });
    expect([...stalledSections(pkg, retry)]).toEqual(["cv", "intro"]);
    // A running retry of another section does not finish them either…
    expect([
      ...stalledSections(pkg, makeJob({ sections: ["jd"], progress: { jd: { status: "generating" } } })),
    ]).toEqual(["cv", "intro"]);
    // …but a running job that covers them does, and nothing is stalled while the job is still loading.
    expect(stalledSections(pkg, makeJob({ progress: {} })).size).toBe(0);
    expect(stalledSections(pkg, undefined).size).toBe(0);
    expect([...stalledSections(pkg, null)]).toEqual(["cv", "intro"]);
  });
});
