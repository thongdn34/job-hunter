import { z } from "zod";
import { emptyProgress, PackageProgressSchema, type PackageProgress } from "@/domain/progress/schema";
import { useProgressStore } from "@/stores/progress-store";

/**
 * Framework-free progress sync controller (used by `useProgressSync`).
 *
 * 1. Waits for the persisted store to hydrate from localStorage and snapshots the local copy
 *    as it was before this session (`baseline`).
 * 2. GET /api/progress/[slug] (retried with backoff until it succeeds), then reconciles with
 *    `reconcilePulled`: the newer of server/baseline wins, and local writes made *during* the pull
 *    are merged on top per list (so they never replace the whole server document).
 * 3. Subscribes to the store and debounces PUTs of the local copy. Nothing is pushed (debounced,
 *    beacon or keepalive) until a pull has succeeded, so a failed/slow GET can never let a
 *    near-empty local copy overwrite the server.
 * 4. On pagehide / tab hidden / stop, flushes pending changes via navigator.sendBeacon
 *    (falls back to fetch keepalive, failures are silent).
 * 5. When the tab becomes visible or focused again (and nothing local is pending), pulls again so
 *    a newer copy from another tab/device wins before this tab writes (see `refresh`).
 *
 * Loop safety: `lastSynced` remembers the `updatedAt` known to match the server. Writes that
 * come *from* the server set it before touching the store, so the subscription sees nothing dirty.
 */

const ResponseSchema = z.object({ progress: PackageProgressSchema.nullable() });

export type ProgressStoreApi = Pick<typeof useProgressStore, "getState" | "subscribe"> & {
  persist: Pick<(typeof useProgressStore)["persist"], "hasHydrated" | "onFinishHydration">;
};

export interface ProgressSyncOptions {
  fetchImpl?: typeof fetch;
  store?: ProgressStoreApi;
  debounceMs?: number;
  /** Override for tests; defaults to navigator.sendBeacon when available. */
  sendBeacon?: ((url: string, data: string) => boolean) | null;
  /** Event target for pagehide/visibilitychange/focus; defaults to window. */
  target?: Pick<Window, "addEventListener" | "removeEventListener"> | null;
  maxRetries?: number;
}

export function progressUrl(slug: string): string {
  return `/api/progress/${encodeURIComponent(slug)}`;
}

function time(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** True when `a` is strictly newer than `b`. */
export function isNewer(a: string, b: string): boolean {
  return time(a) > time(b);
}

const LIST_KEYS = ["studied", "favorites", "completedTopics", "studyPlanTasks", "projectChecklist"] as const;
/** Upper bound for the pull retry backoff. */
const MAX_PULL_DELAY_MS = 30_000;

/** Applies the additions/removals between `before` and `after` onto `target` (order kept). */
function applyDelta(target: string[], before: string[], after: string[]): { list: string[]; changed: boolean } {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const removed = new Set(before.filter((id) => !afterSet.has(id)));
  const added = after.filter((id) => !beforeSet.has(id));
  if (removed.size === 0 && added.length === 0) return { list: target, changed: false };
  const list = target.filter((id) => !removed.has(id));
  const present = new Set(list);
  for (const id of added) {
    if (!present.has(id)) {
      list.push(id);
      present.add(id);
    }
  }
  return { list, changed: true };
}

function withLocalPosition(base: PackageProgress, local: PackageProgress | undefined): PackageProgress {
  if (!local) return base;
  return {
    ...base,
    lastSection: local.lastSection ?? base.lastSection,
    lastAnchor: local.lastAnchor ?? base.lastAnchor,
    lastScrollY: local.lastScrollY ?? base.lastScrollY,
  };
}

/**
 * Decides the local copy after a successful pull.
 *
 * - `server`: the server copy (null when the server has none).
 * - `baseline`: the local copy when this session started (before any in-session write).
 * - `current`: the local copy now (it may have changed while the GET was in flight).
 *
 * The newer of server/baseline wins as a whole (both are complete, authoritative documents).
 * Writes made during the pull are then replayed on top of the winner as per-list deltas
 * (baseline -> current), so a toggle made before the pull finished never discards the server's
 * other lists. Reading-position fields are device-local and always come from `current`.
 */
export function reconcilePulled(
  server: PackageProgress | null,
  baseline: PackageProgress | undefined,
  current: PackageProgress | undefined,
  nowMs: number = Date.now(),
): PackageProgress | undefined {
  const serverWins = server !== null && (!baseline || isNewer(server.updatedAt, baseline.updatedAt));
  if (!serverWins) return current; // local (pre-session or in-session) is at least as new
  if (!current) return server;
  if (baseline && current.updatedAt === baseline.updatedAt) return withLocalPosition(server, current);

  // Local writes happened during the pull: replay them onto the server copy.
  const base = baseline ?? emptyProgress();
  let changed = false;
  const merged: PackageProgress = withLocalPosition({ ...server, flashcards: { ...server.flashcards } }, current);
  for (const key of LIST_KEYS) {
    const d = applyDelta(server[key], base[key], current[key]);
    merged[key] = d.list;
    changed ||= d.changed;
  }
  for (const key of ["known", "review"] as const) {
    const d = applyDelta(server.flashcards[key], base.flashcards[key], current.flashcards[key]);
    merged.flashcards[key] = d.list;
    changed ||= d.changed;
  }
  const reviewedDelta = current.flashcards.reviewedCount - base.flashcards.reviewedCount;
  if (reviewedDelta > 0) {
    merged.flashcards.reviewedCount = server.flashcards.reviewedCount + reviewedDelta;
    changed = true;
  }
  if (changed) {
    // Strictly newer than every input so the merged copy is pushed and accepted by the server.
    const t = Math.max(nowMs, time(current.updatedAt), time(server.updatedAt) + 1);
    merged.updatedAt = new Date(t).toISOString();
  }
  return merged;
}

/** Starts syncing one package. Returns a stop function (idempotent). */
export function startProgressSync(slug: string, options: ProgressSyncOptions = {}): () => void {
  const fetchImpl = options.fetchImpl ?? (typeof fetch === "function" ? fetch.bind(globalThis) : undefined);
  const store = options.store ?? useProgressStore;
  const debounceMs = options.debounceMs ?? 1000;
  const maxRetries = options.maxRetries ?? 3;
  const target = options.target === undefined ? (typeof window !== "undefined" ? window : null) : options.target;
  const beacon =
    options.sendBeacon === undefined
      ? typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function"
        ? (url: string, data: string) => navigator.sendBeacon(url, data)
        : null
      : options.sendBeacon;
  const url = progressUrl(slug);

  let stopped = false;
  let pulled = false;
  let lastSynced: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pullTimer: ReturnType<typeof setTimeout> | null = null;
  let pullAttempts = 0;
  /** Local copy as it was before this session wrote anything (captured once, before the pull). */
  let baseline: PackageProgress | undefined;
  let inFlight = false;
  /** A refresh pull (tab visible/focused again) is running. */
  let pulling = false;
  let queued = false;
  let retries = 0;
  let unsubscribeStore: (() => void) | null = null;
  let unsubscribeHydration: (() => void) | null = null;
  const pullAbort = typeof AbortController !== "undefined" ? new AbortController() : null;

  const local = (): PackageProgress | undefined => store.getState().byPackage[slug];
  const isDirty = () => {
    const p = local();
    return p !== undefined && p.updatedAt !== lastSynced;
  };

  const applyServer = (server: PackageProgress) => {
    lastSynced = server.updatedAt;
    store.getState().replace(slug, server);
  };

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const schedule = (delay = debounceMs) => {
    if (stopped) return;
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, delay);
  };

  async function flush(): Promise<void> {
    if (stopped || !pulled || !fetchImpl || !isDirty()) return;
    if (inFlight) {
      queued = true;
      return;
    }
    const snapshot = local();
    if (!snapshot) return;
    inFlight = true;
    let retry = false;
    try {
      const res = await fetchImpl(url, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      if (res.ok) {
        retries = 0;
        lastSynced = snapshot.updatedAt;
        const parsed = ResponseSchema.safeParse(await res.json().catch(() => null));
        const saved = parsed.success ? parsed.data.progress : null;
        const current = local();
        // Last-write-wins on the server may return a newer copy (another device/tab).
        if (!stopped && saved && current && isNewer(saved.updatedAt, current.updatedAt)) applyServer(saved);
      } else {
        // 4xx = our payload is wrong; retrying the same payload won't help.
        retry = res.status >= 500;
      }
    } catch {
      retry = true; // offline / network error
    } finally {
      inFlight = false;
    }
    if (stopped) return;
    if (queued) {
      queued = false;
      if (isDirty()) schedule();
    } else if (retry && retries < maxRetries && isDirty()) {
      retries += 1;
      schedule(debounceMs * 2 ** retries);
    }
  }

  /** Fire-and-forget flush that survives page unload. */
  const flushOnExit = () => {
    if (!pulled || !isDirty()) return;
    const snapshot = local();
    if (!snapshot) return;
    clearTimer();
    const body = JSON.stringify(snapshot);
    let sent = false;
    try {
      // A string body is sent as text/plain (CORS-safelisted); the route parses the raw text.
      sent = beacon ? beacon(url, body) : false;
    } catch {
      sent = false;
    }
    if (!sent && fetchImpl) {
      try {
        void fetchImpl(url, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => undefined);
        sent = true;
      } catch {
        /* silent */
      }
    }
    if (sent) lastSynced = snapshot.updatedAt;
  };

  /**
   * Re-pulls when the tab becomes visible / focused again, so a newer copy written meanwhile by
   * another tab or device replaces this (stale) one *before* this tab's next write could overwrite
   * it under last-write-wins. Skipped while a local edit is pending (it is pushed instead) or a
   * pull/push is already running.
   */
  const refresh = () => {
    if (stopped || !pulled || pulling || pullTimer !== null || inFlight || timer !== null || isDirty()) return;
    baseline = local();
    pulling = true;
    void pull().finally(() => {
      pulling = false;
    });
  };

  const onPageHide = () => flushOnExit();
  const onVisibility = () => {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "hidden") flushOnExit();
    else if (document.visibilityState === "visible") refresh();
  };
  const onFocus = () => refresh();

  const retryPull = () => {
    if (stopped) return;
    pullAttempts += 1;
    const delay = Math.min(debounceMs * 2 ** pullAttempts, MAX_PULL_DELAY_MS);
    pullTimer = setTimeout(() => {
      pullTimer = null;
      void pull();
    }, delay);
  };

  /**
   * Pulls the server copy. Until it succeeds nothing is pushed: on a network error, a non-ok
   * response or an unparsable body it retries with backoff (except for 4xx, where retrying the
   * same request won't help; the local copy then just stays local).
   */
  async function pull(): Promise<void> {
    if (!fetchImpl) {
      pulled = true;
      return;
    }
    let server: PackageProgress | null;
    try {
      const res = await fetchImpl(url, {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: pullAbort?.signal,
      });
      if (stopped) return;
      if (!res.ok) {
        if (res.status >= 500 || res.status === 408 || res.status === 429) retryPull();
        return;
      }
      const parsed = ResponseSchema.safeParse(await res.json().catch(() => null));
      if (stopped) return;
      if (!parsed.success) {
        retryPull();
        return;
      }
      server = parsed.data.progress;
    } catch {
      // Offline or aborted: keep working locally and try the pull again later.
      if (!stopped) retryPull();
      return;
    }

    const current = local();
    const next = reconcilePulled(server, baseline, current);
    // Set before touching the store so the subscription doesn't see the server copy as dirty.
    if (server && next && next.updatedAt === server.updatedAt) lastSynced = server.updatedAt;
    if (next && next !== current) store.getState().replace(slug, next);
    pulled = true;
    if (isDirty()) schedule();
  }

  const begin = () => {
    if (stopped) return;
    unsubscribeStore = store.subscribe((state, prev) => {
      if (state.byPackage[slug] === prev.byPackage[slug]) return;
      if (!isDirty()) return;
      retries = 0;
      schedule();
    });
    target?.addEventListener("pagehide", onPageHide);
    target?.addEventListener("visibilitychange", onVisibility);
    target?.addEventListener("focus", onFocus);
    baseline = local();
    void pull();
  };

  if (store.persist.hasHydrated()) begin();
  else
    unsubscribeHydration = store.persist.onFinishHydration(() => {
      unsubscribeHydration?.();
      unsubscribeHydration = null;
      begin();
    });

  return () => {
    if (stopped) return;
    flushOnExit();
    stopped = true;
    clearTimer();
    if (pullTimer !== null) clearTimeout(pullTimer);
    pullTimer = null;
    pullAbort?.abort();
    unsubscribeHydration?.();
    unsubscribeStore?.();
    target?.removeEventListener("pagehide", onPageHide);
    target?.removeEventListener("visibilitychange", onVisibility);
    target?.removeEventListener("focus", onFocus);
  };
}
