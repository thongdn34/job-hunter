import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { scrollToAnchor } from "@/features/package-view/navigation";
import { useExpansionStore } from "@/stores/expansion-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useProgressStore } from "@/stores/progress-store";
import { QuestionBankSection, groupQuestionsByTopic } from "./QuestionBankSection";
import { fixtureQuestions, fixtureTopics, makeFixturePackage, makeQuestion } from "./test-fixtures";

const SLUG = "test-pkg";

function renderSection() {
  const pkg = makeFixturePackage();
  return render(<QuestionBankSection pkg={pkg} data={pkg.sections.bilingual!} />);
}

const itemHeaders = () => Array.from(document.querySelectorAll<HTMLButtonElement>("[data-accordion-header]"));
const headerFor = (n: number) => {
  const el = document.querySelector<HTMLButtonElement>(`#item-q${String(n).padStart(2, "0")}-header`);
  if (!el) throw new Error(`header Q${n} not rendered`);
  return el;
};
const isRendered = (n: number) => document.getElementById(`item-q${String(n).padStart(2, "0")}`) !== null;

beforeEach(() => {
  useExpansionStore.setState({ expanded: {}, focusRequest: null, revealRequest: null });
  useProgressStore.setState({ byPackage: {} });
  usePreferencesStore.setState({ language: "bilingual" });
});

describe("groupQuestionsByTopic", () => {
  it("groups by topic order, sorts by number and collects orphans", () => {
    const qs = [makeQuestion(3, "react"), makeQuestion(1, "realtime"), makeQuestion(9, "unknown")];
    const groups = groupQuestionsByTopic(fixtureTopics, qs);
    expect(groups.map((g) => g.topic.id)).toEqual(["realtime", "react", "__other__"]);
    expect(groups[2]!.questionIds).toEqual(["q09"]);
  });
});

describe("QuestionBankSection", () => {
  it("renders topic headings with visible bookmarks, anchors and collapsed questions", () => {
    renderSection();
    expect(screen.getByText("BOOKMARK_TST_WEBSOCKET")).toBeInTheDocument();
    expect(screen.getByText("BOOKMARK_TST_REACT")).toBeInTheDocument();
    expect(document.getElementById("bookmark-tst-websocket")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: /Real-time communication/ })).toBeInTheDocument();
    expect(itemHeaders()).toHaveLength(4);
    expect(headerFor(1)).toHaveTextContent("Q1");
    expect(headerFor(1).closest("h4")).not.toBeNull();
    expect(screen.queryByText(/Recommended answer 1/)).not.toBeInTheDocument();
    expect(screen.getAllByText("0/2 studied")).toHaveLength(2);
  });

  it("expanded body shows answer, VI explanation, follow-ups and metadata", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(headerFor(1));
    const region = screen.getByRole("group", { name: /How do WebSockets reconnect/ });
    expect(within(region).getByText(/Recommended answer 1/)).toBeInTheDocument();
    expect(within(region).getByText("Giải thích tiếng Việt 1")).toHaveAttribute("lang", "vi");
    expect(within(region).getByRole("heading", { name: "Giải thích (Tiếng Việt)" }).firstElementChild).toHaveAttribute(
      "lang",
      "vi",
    );
    expect(within(region).getByRole("button", { name: "Copy English answer" })).toBeInTheDocument();
    expect(within(region).getByText("Follow-up answer EN 1")).toBeInTheDocument();
    expect(within(region).getByText("Actual experience")).toBeInTheDocument();
    expect(within(region).getByText("JD requirement 1")).toBeInTheDocument();
  });

  it("searches collapsed content and reduces visible items", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.type(screen.getByRole("searchbox", { name: /search questions/i }), "jitter");
    await waitFor(() => expect(itemHeaders()).toHaveLength(1));
    expect(isRendered(1)).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1 of 4 questions");
    // Topic without matches is hidden while filtering.
    expect(screen.queryByText("BOOKMARK_TST_REACT")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(itemHeaders()).toHaveLength(4));
  });

  it("filters by difficulty, priority and topic chips", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    await user.click(screen.getByRole("button", { name: "critical", pressed: false }));
    expect(itemHeaders()).toHaveLength(2);
    expect(isRendered(1) && isRendered(3)).toBe(true);

    await user.click(screen.getByRole("button", { name: "easy" }));
    expect(itemHeaders()).toHaveLength(1);
    expect(isRendered(1)).toBe(true);

    await user.click(screen.getByRole("button", { name: "critical", pressed: true }));
    await user.click(screen.getByRole("button", { name: "easy", pressed: true }));
    await user.click(screen.getByRole("button", { name: /React performance/ }));
    expect(itemHeaders()).toHaveLength(2);
    expect(isRendered(3) && isRendered(4)).toBe(true);
  });

  it("filters by study status and favorites", async () => {
    const user = userEvent.setup();
    useProgressStore.getState().toggleIn(SLUG, "studied", "q02");
    useProgressStore.getState().toggleIn(SLUG, "favorites", "q04");
    renderSection();
    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    await user.click(screen.getByRole("radio", { name: "Studied" }));
    expect(itemHeaders()).toHaveLength(1);
    expect(isRendered(2)).toBe(true);
    await user.click(screen.getByRole("radio", { name: "Not studied" }));
    expect(itemHeaders()).toHaveLength(3);
    await user.click(screen.getByRole("radio", { name: "Favorites" }));
    expect(itemHeaders()).toHaveLength(1);
    expect(isRendered(4)).toBe(true);
  });

  it("keeps a question visible (and focused) after toggling it out of the active status filter", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    await user.click(screen.getByRole("radio", { name: "Not studied" }));
    expect(itemHeaders()).toHaveLength(4);
    await user.click(headerFor(1));
    const button = screen.getByRole("button", { name: "Mark as studied", pressed: false });
    button.focus();
    await user.keyboard("{Enter}");

    expect(useProgressStore.getState().get(SLUG).studied).toEqual(["q01"]);
    expect(isRendered(1)).toBe(true);
    expect(itemHeaders()).toHaveLength(4);
    expect(document.activeElement).not.toBe(document.body);

    // Changing the filter applies the new progress.
    await user.click(screen.getByRole("radio", { name: "All" }));
    await user.click(screen.getByRole("radio", { name: "Not studied" }));
    expect(itemHeaders()).toHaveLength(3);
    expect(isRendered(1)).toBe(false);
  });

  it("Expand all expands only the filtered items; Collapse all collapses them", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    await user.click(screen.getByRole("button", { name: /Real-time communication/ }));
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    expect(useExpansionStore.getState().expanded).toEqual({ q01: true, q02: true });
    expect(headerFor(1)).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(headerFor(3)).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(useExpansionStore.getState().expanded).toEqual({});
  });

  it("mark as studied updates the store, header status and topic completion", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(headerFor(1));
    await user.click(screen.getByRole("button", { name: "Mark as studied", pressed: false }));
    expect(useProgressStore.getState().get(SLUG).studied).toEqual(["q01"]);
    expect(within(headerFor(1)).getByText("Studied")).toBeInTheDocument();
    expect(screen.getByText("1/2 studied")).toBeInTheDocument();
    expect(useProgressStore.getState().get(SLUG).completedTopics).toEqual([]);

    await user.click(headerFor(2));
    const region2 = screen.getByRole("group", { name: /SSE vs WebSocket/ });
    await user.click(within(region2).getByRole("button", { name: "Mark as studied" }));
    expect(useProgressStore.getState().get(SLUG).completedTopics).toEqual(["realtime"]);
    expect(screen.getByText("2/2 studied")).toBeInTheDocument();

    await user.click(within(region2).getByRole("button", { name: "Studied", pressed: true }));
    expect(useProgressStore.getState().get(SLUG).completedTopics).toEqual([]);

    await user.click(within(region2).getByRole("button", { name: "Favorite", pressed: false }));
    expect(useProgressStore.getState().get(SLUG).favorites).toEqual(["q02"]);
  });

  it("language switch: 'en' hides Vietnamese text, 'vi' hides English question text", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(headerFor(1));
    expect(screen.getByText("Câu hỏi tiếng Việt 1?")).toBeInTheDocument();
    expect(screen.getByText("Giải thích tiếng Việt 1")).toBeInTheDocument();

    act(() => usePreferencesStore.getState().setLanguage("en"));
    expect(screen.queryByText("Câu hỏi tiếng Việt 1?")).not.toBeInTheDocument();
    expect(screen.queryByText("Giải thích tiếng Việt 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Mẹo nhớ VI 1")).not.toBeInTheDocument();
    expect(screen.getByText("Shortcut EN 1")).toBeInTheDocument();

    act(() => usePreferencesStore.getState().setLanguage("vi"));
    expect(screen.queryByText("How do WebSockets reconnect?")).not.toBeInTheDocument();
    expect(screen.getByText("Câu hỏi tiếng Việt 1?")).toBeInTheDocument();
    expect(screen.getByText("Giải thích tiếng Việt 1")).toBeInTheDocument();
    // English answer + technical content have no VI variant and stay visible.
    expect(screen.getByText(/Recommended answer 1/)).toBeInTheDocument();
  });

  it("focusItem() expands the target and resets filters that hide it", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.type(screen.getByRole("searchbox", { name: /search questions/i }), "jitter");
    await waitFor(() => expect(itemHeaders()).toHaveLength(1));
    act(() => useExpansionStore.getState().focusItem("q04", "item-q04"));
    await waitFor(() => expect(isRendered(4)).toBe(true));
    expect(headerFor(4)).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("searchbox", { name: /search questions/i })).toHaveValue("");
    await waitFor(() => expect(useExpansionStore.getState().focusRequest).toBeNull());
  });

  it("renders an empty state when nothing matches; its Clear filters keeps focus in the section", async () => {
    const user = userEvent.setup();
    renderSection();
    const search = screen.getByRole("searchbox", { name: /search questions/i });
    await user.type(search, "zzz-no-match");
    await waitFor(() => expect(screen.getByText(/No questions match/)).toBeInTheDocument());
    expect(fixtureQuestions).toHaveLength(4);

    const emptyState = screen.getByText(/No questions match/).parentElement!;
    await user.click(within(emptyState).getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(itemHeaders()).toHaveLength(4));
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
  });

  it("toolbar 'Clear search' and 'Clear filters' move focus to the search input", async () => {
    const user = userEvent.setup();
    renderSection();
    const search = screen.getByRole("searchbox", { name: /search questions/i });
    await user.type(search, "jitter");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    await user.click(screen.getByRole("button", { name: "critical", pressed: false }));
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    expect(search).toHaveFocus();
  });

  it("navigating to a topic hidden by the filters resets them and scrolls to its heading", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.type(screen.getByRole("searchbox", { name: /search questions/i }), "jitter");
    await waitFor(() => expect(document.getElementById("bookmark-tst-react")).toBeNull());

    const scrolled: Element[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };
    try {
      let immediate = true;
      act(() => {
        immediate = scrollToAnchor("bookmark-tst-react", { updateHash: false });
      });
      expect(immediate).toBe(false);
      await waitFor(() => expect(document.getElementById("bookmark-tst-react")).not.toBeNull());
      await waitFor(() => expect(scrolled).toContain(document.getElementById("bookmark-tst-react")));
      expect(itemHeaders()).toHaveLength(4);
      expect(screen.getByRole("searchbox", { name: /search questions/i })).toHaveValue("");
      expect(useExpansionStore.getState().revealRequest).toBeNull();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("ignores reveal requests for anchors it does not own", async () => {
    const user = userEvent.setup();
    renderSection();
    const search = screen.getByRole("searchbox", { name: /search questions/i });
    await user.type(search, "jitter");
    act(() => useExpansionStore.getState().requestReveal("bookmark-tst-elsewhere"));
    expect(search).toHaveValue("jitter");
  });

  it("gives topic headings and items a scroll margin that clears the sticky toolbars", () => {
    renderSection();
    expect(document.getElementById("bookmark-tst-websocket")?.className).toMatch(/md:scroll-mt-/);
    expect(document.getElementById("item-q01")?.className).toMatch(/md:scroll-mt-/);
  });
});
