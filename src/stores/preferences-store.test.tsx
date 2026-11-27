import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { LANGUAGE_COOKIE, parseLanguageMode } from "@/domain/common/language-cookie";
import { ServerLanguageContext, useLanguage, usePreferencesStore } from "./preferences-store";

function Probe() {
  return <span data-testid="lang">{useLanguage()}</span>;
}

function FreshProbe({ useLanguage: use }: { useLanguage: () => string }) {
  return <span>{use()}</span>;
}

const tree = (language: "en" | "vi" | "bilingual" | null) => (
  <ServerLanguageContext.Provider value={language}>
    <Probe />
  </ServerLanguageContext.Provider>
);

function clearCookie() {
  document.cookie = `${LANGUAGE_COOKIE}=; path=/; max-age=0`;
}

afterEach(() => {
  clearCookie();
  window.localStorage.clear();
  usePreferencesStore.setState({ language: "bilingual" });
});

describe("parseLanguageMode", () => {
  it("accepts known modes only", () => {
    expect(parseLanguageMode("en")).toBe("en");
    expect(parseLanguageMode("bilingual")).toBe("bilingual");
    expect(parseLanguageMode("fr")).toBeNull();
    expect(parseLanguageMode(undefined)).toBeNull();
  });
});

describe("preferences store language cookie", () => {
  it("mirrors setLanguage to the jh-lang cookie", () => {
    usePreferencesStore.getState().setLanguage("vi");
    expect(document.cookie).toContain(`${LANGUAGE_COOKIE}=vi`);
    expect(usePreferencesStore.getState().language).toBe("vi");
  });

  it("writes the cookie after rehydrating a value saved before the cookie existed", async () => {
    window.localStorage.setItem("job-hunter:preferences", JSON.stringify({ state: { language: "en" }, version: 1 }));
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().language).toBe("en");
    expect(document.cookie).toContain(`${LANGUAGE_COOKIE}=en`);
  });
});

describe("useLanguage SSR/hydration", () => {
  it("renders the cookie language on the server", () => {
    expect(renderToString(tree("en"))).toContain(">en<");
    expect(renderToString(tree(null))).toContain(">bilingual<");
  });

  it("hydrates with the server language without a mismatch or a second commit", async () => {
    // Fresh store module: in the app nothing has rehydrated yet when <Providers> first renders.
    vi.resetModules();
    const fresh = await import("./preferences-store");
    const { ServerLanguageContext, seedLanguage, usePreferencesStore } = fresh;
    const tree = (language: "vi") => (
      <ServerLanguageContext.Provider value={language}>
        <FreshProbe useLanguage={fresh.useLanguage} />
      </ServerLanguageContext.Provider>
    );
    const html = renderToString(tree("vi"));
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    const subscribe = vi.spyOn(usePreferencesStore, "setState");

    // What <Providers> does in its first render, before any consumer renders.
    seedLanguage("vi");
    expect(usePreferencesStore.getState().language).toBe("vi");
    subscribe.mockClear();

    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, tree("vi"), { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toBe("vi");
    expect(subscribe).not.toHaveBeenCalled();

    // Later changes still flow through the store.
    await act(async () => usePreferencesStore.getState().setLanguage("en"));
    expect(container.textContent).toBe("en");
    act(() => root?.unmount());
    container.remove();
  });
});
