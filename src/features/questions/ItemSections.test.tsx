import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useExpansionStore } from "@/stores/expansion-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useProgressStore } from "@/stores/progress-store";
import { BehavioralSection, buildStarAnswer } from "./BehavioralSection";
import { CodingSection, formatArgs, formatValue } from "./CodingSection";
import { SystemDesignSection } from "./SystemDesignSection";
import { fixtureBehavioral, makeFixturePackage } from "./test-fixtures";

const pkg = makeFixturePackage();

beforeEach(() => {
  useExpansionStore.setState({ expanded: {}, focusRequest: null });
  useProgressStore.setState({ byPackage: {} });
  usePreferencesStore.setState({ language: "bilingual" });
});

describe("SystemDesignSection", () => {
  it("renders SD numbering, lazily expands and toggles studied", async () => {
    const user = userEvent.setup();
    render(<SystemDesignSection pkg={pkg} data={pkg.sections.systemDesign!} />);
    const header = screen.getByRole("button", { name: /SD1/ });
    expect(header.closest("h3")).not.toBeNull();
    expect(screen.queryByText("SD recommended answer")).not.toBeInTheDocument();
    await user.click(header);
    const region = screen.getByRole("group", { name: /SD1/ });
    expect(within(region).getByText("SD recommended answer")).toBeInTheDocument();
    expect(within(region).getByRole("table", { name: "Trade-offs" })).toBeInTheDocument();
    expect(within(region).getByRole("table", { name: "Component responsibilities" })).toBeInTheDocument();
    expect(within(region).getByText("Giải thích SD")).toHaveAttribute("lang", "vi");
    await user.click(within(region).getByRole("button", { name: "Mark as studied" }));
    expect(useProgressStore.getState().get("test-pkg").studied).toEqual(["sd1"]);
    expect(screen.getByText("1/1 studied")).toBeInTheDocument();
  });

  it("expand all / collapse all", async () => {
    const user = userEvent.setup();
    render(<SystemDesignSection pkg={pkg} data={pkg.sections.systemDesign!} />);
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByRole("button", { name: /SD1/ })).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.getByRole("button", { name: /SD1/ })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("CodingSection", () => {
  it("renders Q51 with solution and test-case table", async () => {
    const user = userEvent.setup();
    render(<CodingSection pkg={pkg} data={pkg.sections.coding!} />);
    await user.click(screen.getByRole("button", { name: /Q51/ }));
    const region = screen.getByRole("group", { name: /Q51/ });
    expect(within(region).getByText("export function throttle() {}")).toBeInTheDocument();
    const table = within(region).getByRole("table", { name: "Test cases for throttle" });
    expect(within(table).getByText("[1,2,3], 10")).toBeInTheDocument();
    expect(within(table).getByText("[1,3]")).toBeInTheDocument();
    await user.click(within(region).getByRole("button", { name: "Favorite" }));
    expect(useProgressStore.getState().get("test-pkg").favorites).toEqual(["c51"]);
  });

  it("formats test-case values safely", () => {
    expect(formatValue(undefined)).toBe("undefined");
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(formatValue(cyclic)).toBe("[object Object]");
    expect(formatArgs(["x", 2, null])).toBe('"x", 2, null');
  });
});

describe("BehavioralSection", () => {
  it("renders STAR grid, cautions and the theoretical source badge", async () => {
    const user = userEvent.setup();
    render(<BehavioralSection pkg={pkg} data={pkg.sections.star!} />);
    await user.click(screen.getByRole("button", { name: /Q56/ }));
    const region = screen.getByRole("group", { name: /Q56/ });
    for (const t of ["Situation EN", "Task EN", "Action EN", "Result EN", "Tình huống VI"]) {
      expect(within(region).getByText(t)).toBeInTheDocument();
    }
    expect(within(region).getByText("Theoretical")).toBeInTheDocument();
    expect(within(region).getByText("Do not claim")).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: "Copy English STAR answer" })).toBeInTheDocument();

    act(() => usePreferencesStore.getState().setLanguage("en"));
    expect(within(region).queryByText("Tình huống VI")).not.toBeInTheDocument();
    expect(within(region).getByText("Situation EN")).toBeInTheDocument();
  });

  it("builds a copyable English STAR answer", () => {
    expect(buildStarAnswer(fixtureBehavioral)).toBe(
      "Situation: Situation EN\n\nTask: Task EN\n\nAction: Action EN\n\nResult: Result EN",
    );
  });
});
