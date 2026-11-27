import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MatchSection as MatchData } from "@/domain/package/schema";
import { MATCH_SCORE_DISCLAIMER } from "@/domain/match/score";
import { usePreferencesStore } from "@/stores/preferences-store";
import { MatchSection } from "./MatchSection";
import { bi, makeTestPackage } from "./test-fixtures";

const data: MatchData = {
  summary: bi("Solid frontend fit with a backend gap."),
  scoringNotes: bi("Weights reflect the JD emphasis."),
  requirements: [
    {
      id: "r-react",
      requirement: bi("React expertise"),
      category: "required",
      weight: 5,
      candidateExperience: bi("8 years of React"),
      matchLevel: "strong",
      evidence: [{ company: "Acme", kind: "actual", note: bi("Led React migration") }],
    },
    {
      id: "r-go",
      requirement: bi("Go microservices"),
      category: "preferred",
      weight: 3,
      candidateExperience: bi("Studied Go basics"),
      matchLevel: "gap",
      evidence: [{ kind: "theoretical", note: bi("Course only") }],
      knowledgeGap: bi("No production Go"),
      recommendedImprovement: bi("Build a small Go service"),
    },
  ],
};

describe("MatchSection", () => {
  it("shows the computed score with the internal-estimate label", () => {
    render(<MatchSection pkg={makeTestPackage()} data={data} />);
    // 5 / 8 = 62.5% -> 63
    expect(screen.getByText("63")).toBeInTheDocument();
    expect(screen.getByText(MATCH_SCORE_DISCLAIMER)).toBeInTheDocument();
    expect(MATCH_SCORE_DISCLAIMER).toMatch(/Internal estimate/);
    expect(screen.getByText(/5 ÷ 8 × 100/)).toBeInTheDocument();
  });

  it("renders the requirement table with evidence kind badges", () => {
    render(<MatchSection pkg={makeTestPackage()} data={data} />);
    const table = screen.getByRole("table", { name: /job requirements/i });
    expect(within(table).getAllByRole("row", { name: /React expertise|Go microservices/ })).toHaveLength(2);
    expect(within(table).getByText("Actual")).toBeInTheDocument();
    expect(within(table).getByText("Theoretical")).toBeInTheDocument();
  });

  it("filters requirements by match level", async () => {
    const user = userEvent.setup();
    render(<MatchSection pkg={makeTestPackage()} data={data} />);
    const filters = screen.getByRole("group", { name: /filter requirements/i });
    await user.click(within(filters).getByRole("button", { name: /^Gap/ }));
    expect(within(filters).getByRole("button", { name: /^Gap/ })).toHaveAttribute("aria-pressed", "true");
    const table = screen.getByRole("table", { name: /job requirements/i });
    expect(within(table).queryByText("React expertise")).not.toBeInTheDocument();
    expect(within(table).getByText("Go microservices")).toBeInTheDocument();
    expect(screen.getByText(/Showing 1 of 2 requirements/)).toBeInTheDocument();
    // Levels with no requirements cannot be selected.
    expect(within(filters).getByRole("button", { name: /^Partial/ })).toBeDisabled();
  });

  it("respects the English-only language mode", () => {
    usePreferencesStore.setState({ language: "en" });
    try {
      render(<MatchSection pkg={makeTestPackage()} data={data} />);
      expect(screen.queryByText("VI: React expertise")).not.toBeInTheDocument();
    } finally {
      usePreferencesStore.setState({ language: "bilingual" });
    }
  });
});
