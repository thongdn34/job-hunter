import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { IntroSection as IntroData } from "@/domain/package/schema";
import { usePreferencesStore } from "@/stores/preferences-store";
import { IntroSection } from "./IntroSection";
import { bi, makeTestPackage } from "./test-fixtures";

const variant = (seconds: 30 | 60 | 90, en: string) => ({
  durationSeconds: seconds,
  script: { en, vi: `Bản ${seconds} giây` },
  memoryShortcut: bi(`Shortcut ${seconds}`),
  keyPoints: [bi(`Point ${seconds}`)],
});

const data: IntroData = {
  // Deliberately unsorted: the UI orders tabs 30 → 60 → 90.
  variants: [
    variant(60, "Sixty second script about my frontend leadership."),
    variant(30, "Thirty second script."),
    variant(90, "Ninety second script with lots of detail."),
  ],
  deliveryTips: [bi("Smile and slow down")],
};

describe("IntroSection", () => {
  it("renders 30/60/90 tabs with the 30-second version selected first", () => {
    render(<IntroSection pkg={makeTestPackage()} data={data} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["30 seconds", "60 seconds", "90 seconds"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Thirty second script.")).toBeInTheDocument();
    expect(screen.getByText("Smile and slow down")).toBeInTheDocument();
  });

  it("switches tabs", async () => {
    const user = userEvent.setup();
    render(<IntroSection pkg={makeTestPackage()} data={data} />);
    await user.click(screen.getByRole("tab", { name: "60 seconds" }));
    expect(screen.getByRole("tab", { name: "60 seconds" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Sixty second script about my frontend leadership.")).toBeVisible();
    expect(screen.getByText("Shortcut 60")).toBeVisible();
  });

  it("copies the English script of the active tab", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<IntroSection pkg={makeTestPackage()} data={data} />);

    await user.click(screen.getByRole("button", { name: "Copy English answer" }));
    expect(writeText).toHaveBeenLastCalledWith("Thirty second script.");

    await user.click(screen.getByRole("tab", { name: "90 seconds" }));
    await user.click(screen.getByRole("button", { name: "Copy English answer" }));
    expect(writeText).toHaveBeenLastCalledWith("Ninety second script with lots of detail.");
    // The accessible name stays stable; the result is announced through a toast (CopyButton).
    expect(screen.getByRole("button", { name: "Copy English answer" })).toBeInTheDocument();
  });

  it("shows word count and estimated speaking time", () => {
    render(<IntroSection pkg={makeTestPackage()} data={data} />);
    // "Thirty second script." = 3 words -> ~1s at 130 wpm
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("0:01")).toBeInTheDocument();
  });

  it("hides the English script in Vietnamese-only mode", () => {
    usePreferencesStore.setState({ language: "vi" });
    try {
      render(<IntroSection pkg={makeTestPackage()} data={data} />);
      expect(screen.queryByText("Thirty second script.")).not.toBeInTheDocument();
      expect(screen.getByText("Bản 30 giây")).toBeInTheDocument();
      // The copy action still copies English.
      expect(screen.getByRole("button", { name: "Copy English answer" })).toBeInTheDocument();
    } finally {
      usePreferencesStore.setState({ language: "bilingual" });
    }
  });
});
