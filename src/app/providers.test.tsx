import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { usePreferencesStore } from "@/stores/preferences-store";
import { PROGRESS_STORAGE_KEY, useProgressStore } from "@/stores/progress-store";
import { emptyProgress } from "@/domain/progress/schema";
import { Providers, onPersistedStorageChange } from "./providers";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("cross-tab persisted store sync", () => {
  it("rehydrates progress when another tab writes it", async () => {
    await useProgressStore.persist.rehydrate();
    useProgressStore.setState({ byPackage: {} });
    const other = { ...emptyProgress(), studied: ["q5"], updatedAt: "2026-11-27T00:00:00.000Z" };
    // Simulate tab B's persisted write (this tab's memory is stale).
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ state: { byPackage: { pkg: other } }, version: 1 }),
    );
    expect(useProgressStore.getState().byPackage.pkg).toBeUndefined();

    onPersistedStorageChange({ key: PROGRESS_STORAGE_KEY, storageArea: window.localStorage });
    expect(useProgressStore.getState().byPackage.pkg?.studied).toEqual(["q5"]);
  });

  it("ignores unrelated keys and listens to window storage events while mounted", () => {
    const progress = vi.spyOn(useProgressStore.persist, "rehydrate");
    const prefs = vi.spyOn(usePreferencesStore.persist, "rehydrate");
    const { unmount } = render(
      <Providers>
        <p>child</p>
      </Providers>,
    );
    progress.mockClear();
    prefs.mockClear();

    window.dispatchEvent(new StorageEvent("storage", { key: "something-else", storageArea: window.localStorage }));
    expect(progress).not.toHaveBeenCalled();
    expect(prefs).not.toHaveBeenCalled();

    window.dispatchEvent(new StorageEvent("storage", { key: PROGRESS_STORAGE_KEY, storageArea: window.localStorage }));
    expect(progress).toHaveBeenCalledTimes(1);
    window.dispatchEvent(
      new StorageEvent("storage", { key: "job-hunter:preferences", storageArea: window.localStorage }),
    );
    expect(prefs).toHaveBeenCalledTimes(1);

    unmount();
    window.dispatchEvent(new StorageEvent("storage", { key: PROGRESS_STORAGE_KEY, storageArea: window.localStorage }));
    expect(progress).toHaveBeenCalledTimes(1);
  });
});
