import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProgressStore } from "./progress-store";
import { mergeReadingPosition, useReadingPositionStore } from "./reading-position-store";

const SLUG = "reading-test";
const KEY = "job-hunter:reading-position";

beforeEach(() => {
  useReadingPositionStore.setState({ bySlug: {} });
  useProgressStore.setState({ byPackage: {} });
  window.localStorage.clear();
});

describe("mergeReadingPosition", () => {
  it("keeps stored fields that the update leaves undefined", () => {
    expect(mergeReadingPosition({ section: "jd", anchor: "a", scrollY: 10 }, { scrollY: 20 })).toEqual({
      section: "jd",
      anchor: "a",
      scrollY: 20,
    });
    expect(mergeReadingPosition(undefined, { anchor: "b" })).toEqual({ anchor: "b" });
  });
});

describe("useReadingPositionStore", () => {
  it("persists the position to its own localStorage entry without touching progress", () => {
    useReadingPositionStore.getState().setPosition(SLUG, { section: "cheatsheet", anchor: "x", scrollY: 120 });

    expect(useReadingPositionStore.getState().bySlug[SLUG]).toEqual({
      section: "cheatsheet",
      anchor: "x",
      scrollY: 120,
    });
    const raw = window.localStorage.getItem(KEY);
    expect(raw).toContain('"scrollY":120');
    // Scrolling is not study progress: no progress entry, no updatedAt bump, nothing to sync.
    expect(useProgressStore.getState().byPackage[SLUG]).toBeUndefined();
    expect(window.localStorage.getItem("job-hunter:progress")).toBeNull();
  });

  it("is a no-op (no state change, no storage write) when the position is unchanged", () => {
    const store = useReadingPositionStore;
    store.getState().setPosition(SLUG, { section: "jd", anchor: "a", scrollY: 300 });
    const before = store.getState().bySlug;
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    try {
      store.getState().setPosition(SLUG, { section: "jd", anchor: "a", scrollY: 300 });
      store.getState().setPosition(SLUG, { scrollY: 300 });
      expect(listener).not.toHaveBeenCalled();
      expect(setItem).not.toHaveBeenCalled();
      expect(store.getState().bySlug).toBe(before);

      store.getState().setPosition(SLUG, { scrollY: 301 });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(setItem).toHaveBeenCalledTimes(1);
    } finally {
      setItem.mockRestore();
      unsubscribe();
    }
  });

  it("restores the position after a fresh session (rehydrate from storage)", async () => {
    useReadingPositionStore.getState().setPosition(SLUG, { anchor: "y", scrollY: 42 });
    const raw = window.localStorage.getItem(KEY);
    useReadingPositionStore.setState({ bySlug: {} });
    window.localStorage.setItem(KEY, raw!);
    await useReadingPositionStore.persist.rehydrate();
    expect(useReadingPositionStore.getState().bySlug[SLUG]).toEqual({ anchor: "y", scrollY: 42 });
  });
});
