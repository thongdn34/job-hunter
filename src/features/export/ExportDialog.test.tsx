import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { exportFixture } from "@/domain/export/__fixtures__/export-fixture";
import type { InterviewPackage } from "@/domain/package/schema";
import { usePreferencesStore } from "@/stores/preferences-store";
import { ExportDialog } from "./ExportDialog";

const SLUG = exportFixture.meta.slug;

async function openDialog(pkg: InterviewPackage = exportFixture) {
  const user = userEvent.setup();
  render(<ExportDialog pkg={pkg} />);
  await user.click(screen.getByRole("button", { name: /export/i }));
  const dialog = await screen.findByRole("dialog", { name: "Export package" });
  return { user, dialog };
}

describe("ExportDialog", () => {
  beforeEach(() => usePreferencesStore.setState({ language: "bilingual" }));

  it("opens from the Export button and offers a Markdown download of all sections by default", async () => {
    const { dialog } = await openDialog();
    expect(within(dialog).getByRole("radio", { name: /markdown/i })).toBeChecked();
    const link = within(dialog).getByRole("link", { name: /download/i });
    expect(link).toHaveAttribute("href", `/api/packages/${SLUG}/export?format=md&lang=bilingual`);
    expect(link).toHaveAttribute("download", "isb-senior-front-end-developer-run10.md");
    expect(within(dialog).getByText("16 of 16 ready sections selected.")).toBeInTheDocument();
  });

  it("uses the global language preference when opened", async () => {
    usePreferencesStore.setState({ language: "vi" });
    const { dialog } = await openDialog();
    expect(
      within(dialog)
        .getByRole("link", { name: /download/i })
        .getAttribute("href"),
    ).toContain("lang=vi");
  });

  it("switches formats, including the print view in a new tab", async () => {
    const { user, dialog } = await openDialog();
    await user.click(within(dialog).getByRole("radio", { name: /json/i }));
    const json = within(dialog).getByRole("link", { name: /download/i });
    expect(json).toHaveAttribute("href", `/api/packages/${SLUG}/export?format=json`);
    expect(json).toHaveAttribute("download", "isb-senior-front-end-developer-run10.json");

    await user.click(within(dialog).getByRole("radio", { name: /standalone html/i }));
    expect(
      within(dialog)
        .getByRole("link", { name: /download/i })
        .getAttribute("href"),
    ).toContain("format=html");

    await user.click(within(dialog).getByRole("radio", { name: /pdf/i }));
    const print = within(dialog).getByRole("link", { name: /open print view/i });
    expect(print).toHaveAttribute("href", `/print/${SLUG}?lang=bilingual&autoprint=1`);
    expect(print).toHaveAttribute("target", "_blank");
  });

  it("selects sections; none disables the action, select all restores", async () => {
    const { user, dialog } = await openDialog();
    await user.click(within(dialog).getByRole("button", { name: "None" }));
    expect(within(dialog).queryByRole("link", { name: /download/i })).toBeNull();
    expect(within(dialog).getByRole("button", { name: /download/i })).toBeDisabled();
    expect(within(dialog).getByText("0 of 16 ready sections selected.")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("checkbox", { name: /job description analysis/i }));
    await user.click(within(dialog).getByRole("checkbox", { name: /bilingual technical interview/i }));
    expect(
      within(dialog)
        .getByRole("link", { name: /download/i })
        .getAttribute("href"),
    ).toContain("sections=jd%2Cbilingual");

    await user.click(within(dialog).getByRole("button", { name: "Select all" }));
    expect(
      within(dialog)
        .getByRole("link", { name: /download/i })
        .getAttribute("href"),
    ).not.toContain("sections=");
  });

  it("disables sections without content", async () => {
    const partial: InterviewPackage = { ...exportFixture, sections: { ...exportFixture.sections, coding: undefined } };
    const { dialog } = await openDialog(partial);
    const coding = within(dialog).getByRole("checkbox", { name: /coding and algorithms/i });
    expect(coding).toHaveAttribute("aria-disabled", "true");
    expect(coding).not.toBeChecked();
    expect(within(dialog).getByText("15 of 15 ready sections selected.")).toBeInTheDocument();
  });
});
