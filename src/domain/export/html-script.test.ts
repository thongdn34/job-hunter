import { afterEach, describe, expect, it } from "vitest";
import { exportFixture } from "./__fixtures__/export-fixture";
import { buildStandaloneHtmlParts } from "./html";
import { EXPORT_SCRIPT } from "./html-assets";

/** Runs the standalone file's inline script against its own markup (jsdom). */
describe("standalone HTML inline script", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    history.replaceState(null, "", "/");
  });

  function mount() {
    const parts = buildStandaloneHtmlParts(exportFixture, { language: "bilingual" });
    document.body.innerHTML = parts.body;
    new Function(parts.script)();
    return document.querySelector<HTMLElement>("[data-jh-export]")!;
  }

  const details = () => [...document.querySelectorAll<HTMLDetailsElement>(".jh-main details")];
  const click = (selector: string) => document.querySelector<HTMLButtonElement>(selector)!.click();

  it("is syntactically valid", () => {
    expect(() => new Function(EXPORT_SCRIPT)).not.toThrow();
  });

  it("reveals the toolbar and switches language classes + aria-pressed", () => {
    const root = mount();
    expect(document.querySelector(".jh-controls")?.hasAttribute("hidden")).toBe(false);
    click('[data-set-lang="vi"]');
    expect(root.classList.contains("lang-vi")).toBe(true);
    expect(root.classList.contains("lang-bilingual")).toBe(false);
    expect(document.querySelector('[data-set-lang="vi"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector('[data-set-lang="bilingual"]')?.getAttribute("aria-pressed")).toBe("false");
  });

  it("expands and collapses all items", () => {
    mount();
    click('[data-action="expand"]');
    expect(details().every((d) => d.open)).toBe(true);
    click('[data-action="collapse"]');
    expect(details().some((d) => d.open)).toBe(false);
  });

  it("opens the <details> targeted by the URL hash", () => {
    mount();
    location.hash = "#item-isb-q03";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(document.querySelector<HTMLDetailsElement>("#item-isb-q03")?.open).toBe(true);
  });

  it("opens everything before printing and restores afterwards", () => {
    mount();
    window.dispatchEvent(new Event("beforeprint"));
    expect(details().every((d) => d.open)).toBe(true);
    window.dispatchEvent(new Event("afterprint"));
    expect(details().some((d) => d.open)).toBe(false);
  });
});
