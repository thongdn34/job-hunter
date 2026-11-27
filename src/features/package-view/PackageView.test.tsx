import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { SectionKey } from "@/domain/package/sections";
import { useExpansionStore } from "@/stores/expansion-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { PackageView } from "./PackageView";
import { makeTestPackage } from "./test-fixtures";

// Isolate the layout from features owned by other modules.
vi.mock("next/navigation", () => ({
  usePathname: () => "/packages/isb-vietnam-senior-frontend-developer",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/features/export/ExportDialog", () => ({ ExportDialog: () => <button type="button">Export</button> }));
vi.mock("@/features/generation/GenerationProgressBanner", () => ({ GenerationProgressBanner: () => null }));
vi.mock("@/features/generation/SectionStatusPlaceholder", () => ({
  SectionStatusPlaceholder: ({ sectionKey }: { sectionKey: SectionKey }) => <p>placeholder:{sectionKey}</p>,
}));
vi.mock("@/features/study/ProgressPanel", () => ({ ProgressPanel: () => <div>progress-panel</div> }));
const progressSync = vi.fn();
vi.mock("@/features/study/use-progress-sync", () => ({ useProgressSync: (slug: string) => progressSync(slug) }));
vi.mock("./section-registry", async () => {
  const { SECTION_KEYS } = await import("@/domain/package/sections");
  return {
    SECTION_COMPONENTS: Object.fromEntries(SECTION_KEYS.map((k) => [k, () => <p>content:{k}</p>])),
  };
});

describe("PackageView", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ language: "en" });
    useExpansionStore.setState({ expanded: {}, focusRequest: null });
    window.history.replaceState(null, "", "/packages/isb-vietnam-senior-frontend-developer");
    progressSync.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders all 16 sections with bookmark markers and numbered headings", () => {
    const pkg = makeTestPackage();
    const { container } = render(<PackageView pkg={pkg} />);
    const sections = container.querySelectorAll("article section[id^='bookmark-']");
    expect(sections).toHaveLength(16);
    const jd = container.querySelector<HTMLElement>("#bookmark-isb-jd")!;
    expect(within(jd).getByText("BOOKMARK_ISB_JD")).toBeInTheDocument();
    expect(within(jd).getByRole("heading", { level: 2 })).toHaveTextContent("1. Job Description Analysis");
    expect(jd).toHaveAttribute("aria-labelledby", within(jd).getByRole("heading", { level: 2 }).id);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(pkg.meta.jobTitle);
    expect(progressSync).toHaveBeenCalledWith(pkg.meta.slug);
  });

  it("renders content only for ready/stale sections and a placeholder otherwise", () => {
    const { container } = render(<PackageView pkg={makeTestPackage()} />);
    const get = (id: string) => container.querySelector<HTMLElement>(`#${id}`)!;
    expect(within(get("bookmark-isb-bilingual")).getByText("content:bilingual")).toBeInTheDocument();
    expect(within(get("bookmark-isb-bilingual")).queryByText(/Outdated/)).not.toBeInTheDocument();
    // Stale sections keep showing their (usable) content with a notice.
    expect(within(get("bookmark-isb-jd")).getByText("content:jd")).toBeInTheDocument();
    expect(within(get("bookmark-isb-jd")).getByText(/Outdated/)).toBeInTheDocument();
    expect(within(get("bookmark-isb-company")).getByText("placeholder:company")).toBeInTheDocument();
  });

  it("switches section headings with the language preference", () => {
    usePreferencesStore.setState({ language: "vi" });
    const { container } = render(<PackageView pkg={makeTestPackage()} />);
    const heading = within(container.querySelector<HTMLElement>("#bookmark-isb-jd")!).getByRole("heading", {
      level: 2,
    });
    expect(heading).toHaveTextContent("1. Phân tích mô tả công việc");
  });

  it("lists section and topic bookmarks in the table of contents", () => {
    render(<PackageView pkg={makeTestPackage()} />);
    const toc = screen.getAllByRole("navigation", { name: "On this page" })[0];
    expect(within(toc).getByRole("link", { name: /7\.\s*Bilingual Technical Interview/ })).toHaveAttribute(
      "href",
      "#bookmark-isb-bilingual",
    );
    expect(within(toc).getByRole("link", { name: /React/ })).toHaveAttribute("href", "#bookmark-isb-react");
    expect(within(toc).getByRole("button", { name: "Copy link to BOOKMARK_ISB_REACT" })).toBeInTheDocument();
  });

  it("opens the item referenced by an #item-… deep link on mount", () => {
    window.history.replaceState(null, "", "/packages/isb-vietnam-senior-frontend-developer#item-isb-q02");
    render(<PackageView pkg={makeTestPackage()} />);
    const request = useExpansionStore.getState().focusRequest;
    expect(request).toMatchObject({ id: "isb-q02", anchorId: "item-isb-q02" });
    expect(useExpansionStore.getState().expanded["isb-q02"]).toBe(true);
  });

  it("reacts to hashchange events for items", () => {
    render(<PackageView pkg={makeTestPackage()} />);
    expect(useExpansionStore.getState().focusRequest).toBeNull();
    window.history.replaceState(null, "", "#item-isb-q01");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(useExpansionStore.getState().focusRequest?.id).toBe("isb-q01");
  });
});
