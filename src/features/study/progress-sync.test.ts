import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyProgress, type PackageProgress } from "@/domain/progress/schema";
import { useProgressStore } from "@/stores/progress-store";
import { isNewer, reconcilePulled, startProgressSync, type ProgressStoreApi } from "./progress-sync";

const SLUG = "sync-test";
const URL_ = `/api/progress/${SLUG}`;

function progress(updatedAt: string, patch: Partial<PackageProgress> = {}): PackageProgress {
  return { ...emptyProgress(), ...patch, updatedAt };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

type FetchArgs = [string, RequestInit | undefined];

function makeFetch(getResponse: () => Response) {
  const calls: FetchArgs[] = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push([String(url), init]);
    if (!init?.method || init.method === "GET") return getResponse();
    const body = JSON.parse(String(init.body)) as PackageProgress;
    return json({ progress: body });
  });
  return { fn: fn as unknown as typeof fetch, calls, puts: () => calls.filter(([, i]) => i?.method === "PUT") };
}

const noTarget = { target: null, sendBeacon: null } as const;

beforeEach(async () => {
  vi.useFakeTimers();
  await useProgressStore.persist.rehydrate();
  useProgressStore.setState({ byPackage: {} });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("isNewer", () => {
  it("compares ISO timestamps", () => {
    expect(isNewer("2026-02-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe(true);
    expect(isNewer("2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe(false);
  });
});

describe("startProgressSync", () => {
  it("replaces local progress with a newer server copy and does not echo it back", async () => {
    useProgressStore.getState().replace(SLUG, progress("2026-01-01T00:00:00.000Z", { studied: ["old"] }));
    const server = progress("2026-06-01T00:00:00.000Z", { studied: ["q1", "q2"] });
    const f = makeFetch(() => json({ progress: server }));

    const stop = startProgressSync(SLUG, { fetchImpl: f.fn, ...noTarget });
    await vi.advanceTimersByTimeAsync(5000);

    expect(f.calls[0][0]).toBe(URL_);
    expect(useProgressStore.getState().get(SLUG)).toEqual(server);
    expect(f.puts()).toHaveLength(0);
    stop();
    expect(f.puts()).toHaveLength(0);
  });

  it("keeps a newer local copy and pushes it", async () => {
    const localCopy = progress("2026-06-01T00:00:00.000Z", { favorites: ["q9"] });
    useProgressStore.getState().replace(SLUG, localCopy);
    const f = makeFetch(() => json({ progress: progress("2026-01-01T00:00:00.000Z") }));

    const stop = startProgressSync(SLUG, { fetchImpl: f.fn, ...noTarget });
    await vi.advanceTimersByTimeAsync(1500);

    expect(useProgressStore.getState().get(SLUG).favorites).toEqual(["q9"]);
    expect(f.puts()).toHaveLength(1);
    expect(JSON.parse(String(f.puts()[0][1]?.body))).toEqual(localCopy);
    stop();
  });

  it("debounces local changes into a single PUT", async () => {
    const f = makeFetch(() => json({ progress: null }));
    const stop = startProgressSync(SLUG, { fetchImpl: f.fn, ...noTarget });
    await vi.advanceTimersByTimeAsync(10);

    const s = useProgressStore.getState();
    s.toggleIn(SLUG, "studied", "a");
    await vi.advanceTimersByTimeAsync(500);
    s.toggleIn(SLUG, "studied", "b");
    await vi.advanceTimersByTimeAsync(500);
    s.toggleIn(SLUG, "studied", "c");
    expect(f.puts()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1000);

    expect(f.puts()).toHaveLength(1);
    expect(JSON.parse(String(f.puts()[0][1]?.body)).studied).toEqual(["a", "b", "c"]);

    // No further traffic without changes (no loop).
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f.puts()).toHaveLength(1);
    stop();
  });

  it("never pushes after a failing GET and retries the pull before pushing", async () => {
    let fail = true;
    const server = progress("2026-01-01T00:00:00.000Z", { studied: ["s1"], favorites: ["f1"] });
    const f = makeFetch(() => (fail ? json({ error: "boom" }, 500) : json({ progress: server })));
    const target = new EventTarget() as unknown as Window;
    const beacon = vi.fn(() => true);
    const stop = startProgressSync(SLUG, { fetchImpl: f.fn, target, sendBeacon: beacon });
    await vi.advanceTimersByTimeAsync(10);
    useProgressStore.getState().toggleIn(SLUG, "favorites", "x");
    await vi.advanceTimersByTimeAsync(1500);
    target.dispatchEvent(new Event("pagehide"));
    expect(f.puts()).toHaveLength(0);
    expect(beacon).not.toHaveBeenCalled();

    // The pull is retried with backoff; once it succeeds the local toggle is merged and pushed.
    fail = false;
    await vi.advanceTimersByTimeAsync(10_000);
    const gets = f.calls.filter(([, i]) => !i?.method || i.method === "GET");
    expect(gets.length).toBeGreaterThanOrEqual(2);
    const merged = useProgressStore.getState().get(SLUG);
    expect(merged.studied).toEqual(["s1"]);
    expect(merged.favorites).toEqual(["f1", "x"]);
    expect(f.puts()).toHaveLength(1);
    expect(JSON.parse(String(f.puts()[0][1]?.body))).toMatchObject({ studied: ["s1"], favorites: ["f1", "x"] });
    stop();
  });

  it("does not let a reading-position save during a slow pull overwrite the server lists", async () => {
    const server = progress("2026-01-01T00:00:00.000Z", {
      studied: ["q1", "q2"],
      favorites: ["q3"],
      studyPlanTasks: ["t1"],
      flashcards: { known: ["c1"], review: [], reviewedCount: 4 },
    });
    let release: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls: FetchArgs[] = [];
    const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push([String(url), init]);
      if (!init?.method || init.method === "GET") {
        await gate;
        return json({ progress: server });
      }
      return json({ progress: JSON.parse(String(init.body)) as PackageProgress });
    });
    const stop = startProgressSync(SLUG, { fetchImpl: fn as unknown as typeof fetch, ...noTarget });
    await vi.advanceTimersByTimeAsync(10);

    // Fresh browser: a scroll save while the GET is still in flight creates nothing.
    useProgressStore.getState().setLastPosition(SLUG, { section: "overview", scrollY: 300 });
    expect(useProgressStore.getState().byPackage[SLUG]).toBeUndefined();
    await vi.advanceTimersByTimeAsync(3000);
    (release as (() => void) | null)?.();
    await vi.advanceTimersByTimeAsync(3000);

    expect(useProgressStore.getState().get(SLUG)).toEqual(server);
    expect(calls.filter(([, i]) => i?.method === "PUT")).toHaveLength(0);
    stop();
  });

  it("merges a toggle made during the pull into the server copy instead of replacing it", async () => {
    const server = progress("2026-01-01T00:00:00.000Z", { studied: ["q1"], favorites: ["q3"] });
    let release: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls: FetchArgs[] = [];
    const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push([String(url), init]);
      if (!init?.method || init.method === "GET") {
        await gate;
        return json({ progress: server });
      }
      return json({ progress: JSON.parse(String(init.body)) as PackageProgress });
    });
    const stop = startProgressSync(SLUG, { fetchImpl: fn as unknown as typeof fetch, ...noTarget });
    await vi.advanceTimersByTimeAsync(10);
    useProgressStore.getState().toggleIn(SLUG, "studied", "q2");
    await vi.advanceTimersByTimeAsync(3000);
    expect(calls.filter(([, i]) => i?.method === "PUT")).toHaveLength(0);
    (release as (() => void) | null)?.();
    await vi.advanceTimersByTimeAsync(3000);

    const p = useProgressStore.getState().get(SLUG);
    expect(p.studied).toEqual(["q1", "q2"]);
    expect(p.favorites).toEqual(["q3"]);
    const puts = calls.filter(([, i]) => i?.method === "PUT");
    expect(puts).toHaveLength(1);
    const pushed = JSON.parse(String(puts[0][1]?.body)) as PackageProgress;
    expect(pushed).toMatchObject({ studied: ["q1", "q2"], favorites: ["q3"] });
    expect(isNewer(pushed.updatedAt, server.updatedAt)).toBe(true);
    stop();
  });

  it("does not retry the pull or push after a 4xx GET", async () => {
    const f = makeFetch(() => json({ error: "bad" }, 400));
    const stop = startProgressSync(SLUG, { fetchImpl: f.fn, ...noTarget });
    await vi.advanceTimersByTimeAsync(10);
    useProgressStore.getState().toggleIn(SLUG, "favorites", "x");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(f.calls).toHaveLength(1);
    stop();
  });

  it("flushes pending changes with sendBeacon on pagehide", async () => {
    const f = makeFetch(() => json({ progress: null }));
    const target = new EventTarget() as unknown as Window;
    const beacon = vi.fn(() => true);
    const stop = startProgressSync(SLUG, { fetchImpl: f.fn, target, sendBeacon: beacon });
    await vi.advanceTimersByTimeAsync(10);

    useProgressStore.getState().toggleIn(SLUG, "studied", "q1");
    target.dispatchEvent(new Event("pagehide"));

    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0]).toEqual([URL_, expect.stringContaining('"q1"')]);
    // The pending debounced PUT was cancelled because the beacon carried the data.
    await vi.advanceTimersByTimeAsync(2000);
    expect(f.puts()).toHaveLength(0);
    stop();
  });

  it("falls back to fetch keepalive when sendBeacon fails", async () => {
    const f = makeFetch(() => json({ progress: null }));
    const target = new EventTarget() as unknown as Window;
    const stop = startProgressSync(SLUG, { fetchImpl: f.fn, target, sendBeacon: () => false });
    await vi.advanceTimersByTimeAsync(10);
    useProgressStore.getState().toggleIn(SLUG, "studied", "q1");
    target.dispatchEvent(new Event("pagehide"));
    expect(f.puts()).toHaveLength(1);
    expect(f.puts()[0][1]?.keepalive).toBe(true);
    stop();
  });

  it("waits for store hydration before pulling", async () => {
    let hydrated = false;
    let onHydrate: (() => void) | null = null;
    const store = {
      getState: useProgressStore.getState,
      subscribe: useProgressStore.subscribe,
      persist: {
        hasHydrated: () => hydrated,
        onFinishHydration: (cb: () => void) => {
          onHydrate = cb;
          return () => {
            onHydrate = null;
          };
        },
      },
    } as unknown as ProgressStoreApi;
    const f = makeFetch(() => json({ progress: null }));
    const stop = startProgressSync(SLUG, { fetchImpl: f.fn, store, ...noTarget });
    await vi.advanceTimersByTimeAsync(10);
    expect(f.calls).toHaveLength(0);
    hydrated = true;
    (onHydrate as (() => void) | null)?.();
    await vi.advanceTimersByTimeAsync(10);
    expect(f.calls).toHaveLength(1);
    stop();
  });
});

describe("reconcilePulled", () => {
  const T0 = "2026-01-01T00:00:00.000Z";
  const T1 = "2026-02-01T00:00:00.000Z";
  const NOW = Date.parse("2026-03-01T00:00:00.000Z");

  it("takes the newer of server and pre-session local copy when nothing changed in-session", () => {
    const server = progress(T1, { studied: ["s"] });
    const baseline = progress(T0, { studied: ["b"], lastScrollY: 50 });
    expect(reconcilePulled(server, baseline, baseline, NOW)).toEqual({ ...server, lastScrollY: 50 });
    const newerLocal = progress(T1, { studied: ["b"] });
    expect(reconcilePulled(progress(T0), newerLocal, newerLocal, NOW)).toBe(newerLocal);
    expect(reconcilePulled(null, undefined, undefined, NOW)).toBeUndefined();
    expect(reconcilePulled(server, undefined, undefined, NOW)).toBe(server);
  });

  it("replays in-session additions, removals and review counts onto the server copy", () => {
    const baseline = progress(T0, { studied: ["a", "b"], flashcards: { known: [], review: ["c1"], reviewedCount: 2 } });
    const current = progress("2026-02-15T00:00:00.000Z", {
      studied: ["b", "n"],
      flashcards: { known: ["c1"], review: [], reviewedCount: 3 },
    });
    const server = progress(T1, {
      studied: ["a", "b", "s"],
      favorites: ["f"],
      flashcards: { known: [], review: ["c1", "c2"], reviewedCount: 10 },
    });
    const merged = reconcilePulled(server, baseline, current, NOW)!;
    expect(merged.studied).toEqual(["b", "s", "n"]);
    expect(merged.favorites).toEqual(["f"]);
    expect(merged.flashcards).toEqual({ known: ["c1"], review: ["c2"], reviewedCount: 11 });
    expect(merged.updatedAt).toBe(new Date(NOW).toISOString());
  });

  it("keeps the server timestamp when only the position changed", () => {
    const server = progress(T1, { studied: ["s"] });
    const current = progress(new Date(0).toISOString(), { lastAnchor: "x" });
    const merged = reconcilePulled(server, undefined, current, NOW)!;
    expect(merged).toEqual({ ...server, lastAnchor: "x" });
  });
});

describe("progress store", () => {
  it("setLastPosition neither creates progress nor bumps updatedAt", () => {
    const s = useProgressStore.getState();
    s.setLastPosition(SLUG, { scrollY: 10 });
    expect(useProgressStore.getState().byPackage[SLUG]).toBeUndefined();
    s.replace(SLUG, progress("2026-01-01T00:00:00.000Z", { studied: ["q"] }));
    s.setLastPosition(SLUG, { scrollY: 10, anchor: "a" });
    const p = useProgressStore.getState().byPackage[SLUG];
    expect(p).toMatchObject({ updatedAt: "2026-01-01T00:00:00.000Z", lastScrollY: 10, lastAnchor: "a" });
  });
});

describe("progress store persistence", () => {
  it("restores progress written via actions from localStorage", async () => {
    vi.useRealTimers();
    const s = useProgressStore.getState();
    s.toggleIn(SLUG, "studied", "q1");
    s.setIn(SLUG, "studyPlanTasks", "t1", true);
    s.markFlashcard(SLUG, "fc1", "known");
    s.markFlashcard(SLUG, "fc2", "review");
    s.incrementFlashcardsReviewed(SLUG);
    s.setLastPosition(SLUG, { section: "cheatsheet", scrollY: 120 });

    const raw = window.localStorage.getItem("job-hunter:progress");
    expect(raw).toBeTruthy();

    // Simulate a fresh browser session: wipe memory, restore storage, rehydrate.
    useProgressStore.setState({ byPackage: {} });
    window.localStorage.setItem("job-hunter:progress", raw!);
    expect(useProgressStore.getState().byPackage[SLUG]).toBeUndefined();
    await useProgressStore.persist.rehydrate();

    const p = useProgressStore.getState().get(SLUG);
    expect(p.studied).toEqual(["q1"]);
    expect(p.studyPlanTasks).toEqual(["t1"]);
    expect(p.flashcards).toEqual({ known: ["fc1"], review: ["fc2"], reviewedCount: 1 });
    expect(p.lastSection).toBe("cheatsheet");
    expect(p.lastScrollY).toBe(120);
  });
});

describe("re-pull when the tab becomes visible / focused again", () => {
  const T0 = "2026-01-01T00:00:00.000Z";
  const T1 = "2026-06-01T00:00:00.000Z";

  it("pulls a newer copy written by another tab/device and does not push the stale one", async () => {
    useProgressStore.getState().replace(SLUG, progress(T0, { studied: ["q1"] }));
    let server = progress(T0, { studied: ["q1"] });
    const f = makeFetch(() => json({ progress: server }));
    const target = new EventTarget() as unknown as Window;
    const stop = startProgressSync(SLUG, { fetchImpl: f.fn, target, sendBeacon: null });
    await vi.advanceTimersByTimeAsync(10);
    expect(f.calls).toHaveLength(1);

    // Another tab marks Q5 meanwhile; the server now holds the newer copy.
    server = progress(T1, { studied: ["q1", "q5"] });
    target.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(10);

    expect(f.calls.filter(([, i]) => i?.method === "GET")).toHaveLength(2);
    expect(useProgressStore.getState().get(SLUG).studied).toEqual(["q1", "q5"]);
    expect(f.puts()).toHaveLength(0);

    // A later edit in this tab builds on the refreshed copy (Q5 is kept).
    useProgressStore.getState().toggleIn(SLUG, "favorites", "q2");
    await vi.advanceTimersByTimeAsync(1100);
    expect(f.puts()).toHaveLength(1);
    expect(JSON.parse(String(f.puts()[0][1]?.body)).studied).toEqual(["q1", "q5"]);
    stop();
  });

  it("re-pulls on window focus but never while a local edit is pending", async () => {
    const f = makeFetch(() => json({ progress: null }));
    const target = new EventTarget() as unknown as Window;
    const stop = startProgressSync(SLUG, { fetchImpl: f.fn, target, sendBeacon: null });
    await vi.advanceTimersByTimeAsync(10);
    const gets = () => f.calls.filter(([, i]) => !i?.method || i.method === "GET").length;
    expect(gets()).toBe(1);

    useProgressStore.getState().toggleIn(SLUG, "studied", "q1");
    target.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(10);
    expect(gets()).toBe(1); // dirty: the pending edit is pushed instead

    await vi.advanceTimersByTimeAsync(1100);
    expect(f.puts()).toHaveLength(1);
    target.dispatchEvent(new Event("focus"));
    target.dispatchEvent(new Event("visibilitychange")); // concurrent trigger is coalesced
    await vi.advanceTimersByTimeAsync(10);
    expect(gets()).toBe(2);
    expect(useProgressStore.getState().get(SLUG).studied).toEqual(["q1"]);

    stop();
    target.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(10);
    expect(gets()).toBe(2);
  });
});

describe("setLastPosition", () => {
  it("does not bump updatedAt, so a scroll never triggers a PUT", async () => {
    useProgressStore.getState().replace(SLUG, progress("2026-01-01T00:00:00.000Z", { studied: ["q1"] }));
    const f = makeFetch(() => json({ progress: progress("2026-01-01T00:00:00.000Z", { studied: ["q1"] }) }));
    const stop = startProgressSync(SLUG, { fetchImpl: f.fn, ...noTarget });
    await vi.advanceTimersByTimeAsync(10);

    useProgressStore.getState().setLastPosition(SLUG, { anchor: "a", scrollY: 500 });
    await vi.advanceTimersByTimeAsync(5000);

    const p = useProgressStore.getState().get(SLUG);
    expect(p.updatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(p.lastScrollY).toBe(500);
    expect(f.puts()).toHaveLength(0);
    stop();
  });
});
