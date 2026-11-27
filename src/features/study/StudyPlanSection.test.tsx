import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useProgressStore } from "@/stores/progress-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useExpansionStore } from "@/stores/expansion-store";
import { StudyPlanSection } from "./StudyPlanSection";
import { FIXTURE_SLUG, makeFixturePackage } from "./test-fixtures";

const pkg = makeFixturePackage();

beforeEach(async () => {
  await act(async () => {
    await useProgressStore.persist.rehydrate();
    useProgressStore.setState({ byPackage: {} });
    usePreferencesStore.setState({ language: "en" });
    useExpansionStore.setState({ expanded: {}, focusRequest: null });
  });
});

function renderSection() {
  return render(<StudyPlanSection pkg={pkg} data={pkg.sections.studyPlan!} />);
}

describe("StudyPlanSection", () => {
  it("checking a task updates the store and progress percentages", async () => {
    const user = userEvent.setup();
    renderSection();

    expect(screen.getByText("Overall study plan progress")).toBeInTheDocument();
    expect(screen.getByText("0/5 tasks · 4h remaining")).toBeInTheDocument();
    expect(screen.getByText("0/2 tasks · 1h 30m remaining")).toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox", { name: "Task t1" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);

    expect(useProgressStore.getState().get(FIXTURE_SLUG).studyPlanTasks).toEqual(["t1"]);
    expect(screen.getByRole("checkbox", { name: "Task t1" })).toBeChecked();
    // 1-day plan: 1/2 → 50%; overall 1/5 → 20%.
    expect(screen.getByText("1/2 tasks · 1h remaining")).toBeInTheDocument();
    expect(screen.getByText("1/5 tasks · 3h 30m remaining")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /1-day plan progress/i })).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByRole("progressbar", { name: /overall/i })).toHaveAttribute("aria-valuenow", "20");

    await user.click(screen.getByRole("checkbox", { name: "Task t1" }));
    expect(useProgressStore.getState().get(FIXTURE_SLUG).studyPlanTasks).toEqual([]);
  });

  it("'show only remaining' hides completed tasks", async () => {
    const user = userEvent.setup();
    act(() => useProgressStore.getState().setIn(FIXTURE_SLUG, "studyPlanTasks", "t1", true));
    renderSection();
    expect(screen.getByRole("checkbox", { name: "Task t1" })).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: /show only remaining/i }));
    expect(screen.queryByRole("checkbox", { name: "Task t1" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Task t2" })).toBeInTheDocument();
  });

  it("keeps a task checked under 'show only remaining' visible so keyboard focus stays on it", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("switch", { name: /show only remaining/i }));
    const checkbox = screen.getByRole("checkbox", { name: "Task t1" });
    checkbox.focus();
    await user.keyboard(" ");

    expect(useProgressStore.getState().get(FIXTURE_SLUG).studyPlanTasks).toEqual(["t1"]);
    const after = screen.getByRole("checkbox", { name: "Task t1" });
    expect(after).toBeChecked();
    expect(after).toHaveFocus();

    // Re-toggling the filter applies the new snapshot.
    await user.click(screen.getByRole("switch", { name: /show only remaining/i }));
    await user.click(screen.getByRole("switch", { name: /show only remaining/i }));
    expect(screen.queryByRole("checkbox", { name: "Task t1" })).not.toBeInTheDocument();
  });

  it("switches plans with tabs", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("tab", { name: /3-day plan/i }));
    expect(screen.getByRole("checkbox", { name: "Task t3" })).toBeInTheDocument();
  });

  it("related item chips focus the item", async () => {
    const user = userEvent.setup();
    renderSection();
    const link = screen.getByRole("link", { name: "Q1: Fixture question 1?" });
    expect(link).toHaveAttribute("href", "#item-fx-q1");
    await user.click(link);
    const s = useExpansionStore.getState();
    expect(s.expanded["fx-q1"]).toBe(true);
    expect(s.focusRequest).toMatchObject({ id: "fx-q1", anchorId: "item-fx-q1" });
    // Unknown ids render as plain (non-link) chips.
    expect(screen.getByText("missing-item").closest("a")).toBeNull();
  });
});
