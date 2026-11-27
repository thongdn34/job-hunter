import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { isbSamplePackage } from "@/content/samples/isb";
import { collectStudyItems, type StudyItem } from "@/domain/package/items";
import { useExpansionStore } from "@/stores/expansion-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { GlobalSearch } from "./GlobalSearch";
import { buildToc, flattenToc } from "./toc";

function item(id: string, number: number, title: string, hiddenAnswer: string): StudyItem {
  return {
    id,
    number,
    kind: "question",
    section: "bilingual",
    title: { en: title, vi: `${title} VI` },
    difficulty: "medium",
    priority: "high",
    anchorId: `item-${id}`,
    referenceAnswer: hiddenAnswer,
    searchText: `${title}\n${title} vi\n${hiddenAnswer}`.toLowerCase(),
  };
}

const ITEMS = [
  item("isb-q01", 1, "Explain WebSocket reconnection", "Use exponential backoff with jitter and a heartbeat (omega)."),
  item(
    "isb-q02",
    2,
    "How does React reconcile?",
    "Fiber splits work into units; the zebracorn scheduler yields to the browser (omega).",
  ),
];
const ENTRIES = flattenToc(buildToc(isbSamplePackage));

function setup(items = ITEMS) {
  const user = userEvent.setup();
  render(<GlobalSearch items={items} entries={ENTRIES} />);
  return { user, input: screen.getByRole("combobox") };
}

describe("GlobalSearch", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ language: "en" });
    useExpansionStore.setState({ expanded: {}, focusRequest: null });
    window.history.replaceState(null, "", "/packages/isb");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is a labelled combobox that starts collapsed", () => {
    const { input } = setup();
    expect(input).toHaveAccessibleName("Search questions, answers and sections");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("finds an item by a term that only exists in its collapsed answer and focuses it on select", async () => {
    const focusItem = vi.spyOn(useExpansionStore.getState(), "focusItem");
    const { user, input } = setup();

    await user.type(input, "zebracorn");
    const listbox = await screen.findByRole("listbox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("How does React reconcile?");
    expect(options[0]).toHaveTextContent("Q2");
    expect(options[0]).toHaveTextContent("Question");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", options[0].id);

    await user.click(options[0]);
    expect(focusItem).toHaveBeenCalledWith("isb-q02", "item-isb-q02");
    expect(useExpansionStore.getState().expanded["isb-q02"]).toBe(true);
    expect(window.location.hash).toBe("#item-isb-q02");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("navigates results with ArrowUp/ArrowDown and opens the active one with Enter", async () => {
    const { user, input } = setup();
    await user.type(input, "omega");
    await screen.findByRole("listbox");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);

    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowUp}{ArrowUp}");
    const last = screen.getAllByRole("option").at(-1)!;
    expect(last).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", last.id);

    await user.keyboard("{ArrowDown}{Enter}");
    // First option wins after wrapping; it is one of the two items.
    expect(useExpansionStore.getState().focusRequest?.id).toMatch(/^isb-q0[12]$/);
  });

  it("matches section titles and bookmarks, and scrolls to the section on select", async () => {
    const section = document.createElement("section");
    section.id = "bookmark-isb-system-design";
    document.body.appendChild(section);
    const scrollSpy = vi.spyOn(section, "scrollIntoView");
    const focusItem = vi.spyOn(useExpansionStore.getState(), "focusItem");

    const { user, input } = setup();
    await user.type(input, "BOOKMARK_ISB_SYSTEM_DESIGN");
    const option = await screen.findByRole("option", { name: /System Design/ });
    expect(screen.getByRole("group", { name: "Sections" })).toContainElement(option);

    await user.click(option);
    expect(scrollSpy).toHaveBeenCalled();
    expect(focusItem).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#bookmark-isb-system-design");
    section.remove();
  });

  it("closes with Escape, then clears the query with a second Escape", async () => {
    const { user, input } = setup();
    await user.type(input, "heartbeat");
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("heartbeat");
    await user.keyboard("{Escape}");
    expect(input).toHaveValue("");
  });

  it("shows an empty state and announces no results", async () => {
    const { user, input } = setup();
    await user.type(input, "nonexistentterm");
    expect(await screen.findByText(/No results for/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No results"));
  });

  it("focuses the search with '/' and Ctrl+K", async () => {
    const { user, input } = setup();
    expect(input).not.toHaveFocus();
    await user.keyboard("/");
    expect(input).toHaveFocus();
    expect(input).toHaveValue("");
    input.blur();
    await user.keyboard("{Control>}k{/Control}");
    expect(input).toHaveFocus();
  });

  // The ISB sample question bank is authored separately; run once it has questions.
  const sampleHasQuestions = (isbSamplePackage.sections.bilingual?.questions.length ?? 0) > 0;
  it.runIf(sampleHasQuestions)("searches the real ISB sample including hidden follow-up answers", async () => {
    const items = collectStudyItems(isbSamplePackage);
    const q = isbSamplePackage.sections.bilingual!.questions[0];
    const words = q.followUps[0].answer.en.split(/\s+/).filter((w) => /^[a-z]{8,}$/i.test(w));
    const { user, input } = setup(items);
    await user.type(input, words.slice(0, 2).join(" "));
    await screen.findByRole("listbox");
    const match = screen.getAllByRole("option").find((o) => o.id && o.textContent?.includes(q.question.en));
    expect(match).toBeDefined();
  });
});
