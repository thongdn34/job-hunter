/**
 * In-memory registry of running jobs (job id → AbortController). Cancellation aborts in-flight
 * model calls immediately; the persisted GenerationJob.cancelRequested flag is polled between
 * steps as well, so a cancel issued from another request is always honoured.
 *
 * Limitation: in-process only. On Cloudflare Workers jobs run in a Workflow isolate, so only the
 * persisted cancelRequested flag reaches them and liveness comes from the JobRunner (job-runner.ts).
 */

const globalRegistry = globalThis as unknown as { __generationJobs?: Map<string, AbortController> };
const jobs: Map<string, AbortController> = (globalRegistry.__generationJobs ??= new Map());

export function registerJob(jobId: string): AbortController {
  const existing = jobs.get(jobId);
  if (existing && !existing.signal.aborted) return existing;
  const controller = new AbortController();
  jobs.set(jobId, controller);
  return controller;
}

export function unregisterJob(jobId: string): void {
  jobs.delete(jobId);
}

/** Aborts a running job. Returns true when the job was running in this process. */
export function abortJob(jobId: string, reason = "Cancelled by user"): boolean {
  const controller = jobs.get(jobId);
  if (!controller) return false;
  controller.abort(new DOMException(reason, "AbortError"));
  return true;
}

export function isJobActive(jobId: string): boolean {
  return jobs.has(jobId);
}

const globalLocks = globalThis as unknown as { __generationPackageLocks?: Map<string, Promise<unknown>> };
const packageLocks: Map<string, Promise<unknown>> = (globalLocks.__generationPackageLocks ??= new Map());

/**
 * Runs `fn` while holding an in-process per-package lock, so "check there is no active job →
 * create a job" is atomic per package (two overlapping retries cannot both start a job).
 */
export async function withPackageLock<T>(packageId: string, fn: () => Promise<T>): Promise<T> {
  const previous = packageLocks.get(packageId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => current);
  packageLocks.set(packageId, tail);
  try {
    await previous;
    return await fn();
  } finally {
    release();
    if (packageLocks.get(packageId) === tail) packageLocks.delete(packageId);
  }
}

/** Simple async semaphore bounding concurrent model calls. */
export function createLimiter(concurrency: number): <T>(fn: () => Promise<T>) => Promise<T> {
  const max = Math.max(1, Math.floor(concurrency));
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    if (active >= max) return;
    const run = queue.shift();
    if (run) {
      active += 1;
      run();
    }
  };
  return <T>(fn: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            next();
          });
      });
      next();
    });
}
