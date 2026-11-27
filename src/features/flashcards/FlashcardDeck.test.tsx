import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Flashcard } from "@/domain/package/schema";
import { useProgressStore } from "@/stores/progress-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { FlashcardDeck } from "./FlashcardDeck";
import { FlashcardShortcutsToggle } from "./FlashcardShortcutsToggle";
import { useFlashcardShortcutsStore } from "./shortcuts-store";
import { shuffle } from "./deck";

const SLUG = "deck-test";

function makeCard(i: number): Flashcard {
  return {
    id: `fc-${i}`,
    front: { en: `Question ${i}?`, vi: `Câu hỏi ${i}?` },
    back: {
      answer: `Answer ${i}`,
      viExplanation: `Giải thích ${i}`,
      memoryShortcut: { en: `Shortcut ${i}`, vi: `Mẹo ${i}` },
    },
    priority: "high",
  };
}

const cards = [1, 2, 3, 4].map(makeCard);

const position = () => screen.getByTestId("deck-position").textContent;

beforeEach(() => {
  act(() => {
    useProgressStore.setState({ byPackage: {} });
    usePreferencesStore.setState({ language: "en" });
    useFlashcardShortcutsStore.setState({ enabled: true });
  });
});

describe("FlashcardDeck", () => {
  it("navigates with ←/→ (wrapping) and announces the card", () => {
    render(<FlashcardDeck packageSlug={SLUG} cards={cards} globalShortcuts />);
    expect(position()).toBe("Card 1 of 4");
    expect(screen.getByTestId("flashcard-front")).toHaveTextContent("Question 1?");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(position()).toBe("Card 2 of 4");
    expect(screen.getByTestId("flashcard-front")).toHaveTextContent("Question 2?");
    expect(screen.getByTestId("deck-live")).toHaveTextContent("Card 2 of 4: Question 2?");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(position()).toBe("Card 4 of 4");
  });

  it("scopes shortcuts to the deck when not global", () => {
    render(<FlashcardDeck packageSlug={SLUG} cards={cards} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(position()).toBe("Card 1 of 4");
    fireEvent.keyDown(screen.getByTestId("flashcard-deck"), { key: "ArrowRight" });
    expect(position()).toBe("Card 2 of 4");
  });

  it("flips with the button and Space, counting a card as reviewed only once", async () => {
    const user = userEvent.setup();
    render(<FlashcardDeck packageSlug={SLUG} cards={cards} globalShortcuts />);
    const flip = screen.getByRole("button", { name: /show answer/i });
    expect(flip).toHaveAttribute("aria-pressed", "false");

    await user.click(flip);
    const back = screen.getByTestId("flashcard-back");
    expect(within(back).getByText("Answer 1")).toBeInTheDocument();
    expect(within(back).getByText("Giải thích 1")).toBeInTheDocument();
    expect(within(back).getByText("Shortcut 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show question/i })).toHaveAttribute("aria-pressed", "true");
    expect(useProgressStore.getState().get(SLUG).flashcards.reviewedCount).toBe(1);

    fireEvent.keyDown(document.body, { key: " " });
    expect(screen.getByTestId("flashcard-front")).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(screen.getByTestId("flashcard-back")).toBeInTheDocument();
    // Same card flipped again: still counted once.
    expect(useProgressStore.getState().get(SLUG).flashcards.reviewedCount).toBe(1);
  });

  it("mark known (button and K) updates the store and advances", async () => {
    const user = userEvent.setup();
    render(<FlashcardDeck packageSlug={SLUG} cards={cards} globalShortcuts />);
    await user.click(screen.getByRole("button", { name: /^known$/i }));
    expect(useProgressStore.getState().get(SLUG).flashcards.known).toEqual(["fc-1"]);
    expect(position()).toBe("Card 2 of 4");

    fireEvent.keyDown(window, { key: "r" });
    expect(useProgressStore.getState().get(SLUG).flashcards.review).toEqual(["fc-2"]);
    expect(position()).toBe("Card 3 of 4");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "k" });
    const fc = useProgressStore.getState().get(SLUG).flashcards;
    expect(fc.known).toEqual(["fc-1", "fc-2"]);
    expect(fc.review).toEqual([]);
  });

  it("filters to cards for review and to unknown cards", async () => {
    const user = userEvent.setup();
    act(() => {
      useProgressStore.getState().markFlashcard(SLUG, "fc-1", "known");
      useProgressStore.getState().markFlashcard(SLUG, "fc-3", "review");
    });
    render(<FlashcardDeck packageSlug={SLUG} cards={cards} />);

    await user.click(screen.getByRole("button", { name: /for review \(1\)/i }));
    expect(position()).toBe("Card 1 of 1");
    expect(screen.getByTestId("flashcard-front")).toHaveTextContent("Question 3?");

    await user.click(screen.getByRole("button", { name: /not known \(3\)/i }));
    expect(position()).toBe("Card 1 of 3");
    expect(screen.getByTestId("flashcard-front")).toHaveTextContent("Question 2?");
  });

  it("shuffles deterministically with a seed (S)", () => {
    render(<FlashcardDeck packageSlug={SLUG} cards={cards} seed={10} globalShortcuts />);
    fireEvent.keyDown(window, { key: "s" });
    const expectedFirst = shuffle(
      cards.map((c) => c.id),
      11,
    )[0];
    const expected = cards.find((c) => c.id === expectedFirst)!;
    expect(screen.getByTestId("flashcard-front")).toHaveTextContent(expected.front.en);
    expect(screen.getByRole("button", { name: /original order/i })).toBeInTheDocument();
  });

  it("keeps keyboard focus when 'Original order' and 'Show all cards' remove themselves", async () => {
    const user = userEvent.setup();
    render(<FlashcardDeck packageSlug={SLUG} cards={cards} seed={10} />);
    await user.click(screen.getByRole("button", { name: /^shuffle$/i }));
    await user.click(screen.getByRole("button", { name: /original order/i }));
    expect(screen.queryByRole("button", { name: /original order/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^shuffle$/i })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: /for review \(0\)/i }));
    await user.click(screen.getByRole("button", { name: /show all cards/i }));
    expect(position()).toBe("Card 1 of 4");
    expect(screen.getByRole("button", { name: /^all \(4\)/i })).toHaveFocus();
  });

  it("marks the Vietnamese explanation heading with lang=vi", async () => {
    const user = userEvent.setup();
    render(<FlashcardDeck packageSlug={SLUG} cards={cards} />);
    await user.click(screen.getByRole("button", { name: /show answer/i }));
    expect(screen.getByText("Giải thích")).toHaveAttribute("lang", "vi");
  });

  it("ignores shortcuts while typing in an input", () => {
    render(
      <>
        <input aria-label="notes" />
        <FlashcardDeck packageSlug={SLUG} cards={cards} globalShortcuts />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText("notes"), { key: "ArrowRight" });
    expect(position()).toBe("Card 1 of 4");
  });

  it("ignores page-wide shortcuts inside dialogs and menus, or while a modal is open", () => {
    render(
      <>
        <div role="dialog" aria-modal="true">
          <a href="#nav">Nav link</a>
        </div>
        <div role="menu">
          <div role="menuitem" tabIndex={-1}>
            Theme
          </div>
        </div>
        <FlashcardDeck packageSlug={SLUG} cards={cards} globalShortcuts />
      </>,
    );
    fireEvent.keyDown(screen.getByText("Nav link"), { key: "k" });
    fireEvent.keyDown(screen.getByRole("menuitem"), { key: "r" });
    // The modal is still open, so even body-targeted keys are ignored.
    fireEvent.keyDown(document.body, { key: "k" });
    expect(useProgressStore.getState().byPackage[SLUG]).toBeUndefined();
    expect(position()).toBe("Card 1 of 4");
  });

  it("lets the user turn page-wide single-key shortcuts off (WCAG 2.1.4)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FlashcardShortcutsToggle />
        <FlashcardDeck packageSlug={SLUG} cards={cards} globalShortcuts />
      </>,
    );
    const toggle = screen.getByRole("switch", { name: /keyboard shortcuts/i });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(useFlashcardShortcutsStore.getState().enabled).toBe(false);

    fireEvent.keyDown(document.body, { key: "k" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(useProgressStore.getState().byPackage[SLUG]).toBeUndefined();
    expect(position()).toBe("Card 1 of 4");

    // Inside the deck: arrows still navigate, letters stay inert.
    const deck = screen.getByTestId("flashcard-deck");
    fireEvent.keyDown(deck, { key: "ArrowRight" });
    expect(position()).toBe("Card 2 of 4");
    fireEvent.keyDown(deck, { key: "k" });
    expect(useProgressStore.getState().byPackage[SLUG]).toBeUndefined();

    await user.click(toggle);
    fireEvent.keyDown(document.body, { key: "k" });
    expect(useProgressStore.getState().get(SLUG).flashcards.known).toEqual(["fc-2"]);
  });

  it("shows the Vietnamese front in vi mode", () => {
    act(() => usePreferencesStore.setState({ language: "vi" }));
    render(<FlashcardDeck packageSlug={SLUG} cards={cards} />);
    expect(screen.getByTestId("flashcard-front")).toHaveTextContent("Câu hỏi 1?");
  });

  it("renders an empty state without cards", () => {
    render(<FlashcardDeck packageSlug={SLUG} cards={[]} />);
    expect(screen.getByText(/no flashcards/i)).toBeInTheDocument();
  });
});
