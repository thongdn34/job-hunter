import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useProgressStore } from "@/stores/progress-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { CheatsheetSection } from "./CheatsheetSection";
import { makeFixturePackage } from "./test-fixtures";

const pkg = makeFixturePackage();

beforeEach(() => {
  act(() => {
    useProgressStore.setState({ byPackage: {} });
    usePreferencesStore.setState({ language: "bilingual" });
  });
});

const renderSection = () => render(<CheatsheetSection pkg={pkg} data={pkg.sections.cheatsheet!} />);

describe("CheatsheetSection", () => {
  it("lists high-priority concepts first, with EN and VI shortcuts", () => {
    renderSection();
    const list = screen.getByRole("list", { name: "Cheat sheet concepts" });
    const titles = within(list)
      .getAllByRole("heading", { level: 4 })
      .map((h) => h.textContent);
    expect(titles[0]).toContain("Critical concept");
    expect(titles[1]).toContain("Medium concept");
    expect(titles[2]).toContain("Low concept");
    expect(screen.getByText("Crit EN").closest("[lang]")).toHaveAttribute("lang", "en");
    expect(screen.getByText("Crit VI").closest("[lang]")).toHaveAttribute("lang", "vi");
  });

  it("filters to high-priority concepts", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("switch", { name: /high-priority only/i }));
    const list = screen.getByRole("list", { name: "Cheat sheet concepts" });
    expect(
      within(list)
        .getAllByRole("listitem")
        .filter((li) => li.parentElement === list),
    ).toHaveLength(1);
    expect(screen.queryByText("Low concept")).not.toBeInTheDocument();
  });

  it("rapid review shows one concept at a time with ←/→ and Esc", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("button", { name: /rapid review/i }));
    const region = screen.getByRole("region", { name: "Rapid review" });
    expect(within(region).getByText("Concept 1 of 3")).toBeInTheDocument();
    expect(within(region).getByRole("heading", { level: 4 })).toHaveTextContent("Critical concept");

    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(within(region).getByText("Concept 2 of 3")).toBeInTheDocument();
    fireEvent.keyDown(region, { key: "ArrowRight" });
    fireEvent.keyDown(region, { key: "ArrowRight" }); // clamps at the end
    expect(within(region).getByText("Concept 3 of 3")).toBeInTheDocument();
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(within(region).getByText("Concept 2 of 3")).toBeInTheDocument();

    fireEvent.keyDown(region, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Rapid review" })).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Cheat sheet concepts" })).toBeInTheDocument();
  });

  it("embeds the flashcard deck and links to the full-screen page", () => {
    renderSection();
    expect(screen.getByTestId("flashcard-deck")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /full-screen flashcards/i })).toHaveAttribute(
      "href",
      `/packages/${pkg.meta.slug}/flashcards`,
    );
  });
});
