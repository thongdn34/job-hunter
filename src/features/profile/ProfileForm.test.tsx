import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CandidateProfile } from "@/domain/profile/schema";
import type { ProfilePayload } from "@/domain/profile/form";
import { ProfileForm } from "./ProfileForm";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const profile: CandidateProfile = {
  id: "local-profile",
  fullName: "",
  headline: "Senior Software Engineer",
  yearsOfExperience: 7,
  location: "Ho Chi Minh City, Vietnam",
  targetRoles: ["Senior Frontend Engineer"],
  workingArrangement: "hybrid",
  summary: "Summary.",
  skills: [
    { id: "s1", name: "React", category: "frontend", proficiency: "production" },
    { id: "s2", name: "Go", category: "backend", proficiency: "familiar" },
  ],
  experiences: [
    {
      id: "e1",
      company: "Persefoni",
      role: "",
      period: "",
      summary: "Carbon accounting platform.",
      highlights: ["Built enterprise features."],
      technologies: ["React", "TypeScript"],
      includeInGeneration: true,
      order: 0,
    },
    {
      id: "e2",
      company: "Elfie",
      role: "",
      period: "",
      summary: "",
      highlights: [],
      technologies: [],
      includeInGeneration: false,
      order: 1,
    },
  ],
  cvText: "CV text",
  cvFileName: "cv.pdf",
  cvUploadedAt: "2026-01-01T00:00:00.000Z",
};

function setup(onSubmit = vi.fn(async (payload: ProfilePayload) => ({ ...profile, ...payload }))) {
  const user = userEvent.setup();
  render(<ProfileForm profile={profile} onSubmit={onSubmit} />);
  return { user, onSubmit };
}

const saveButton = () => screen.getByRole("button", { name: /save profile/i });

describe("ProfileForm", () => {
  it("renders the profile and starts clean", () => {
    setup();
    expect(screen.getByLabelText(/headline/i)).toHaveValue("Senior Software Engineer");
    expect(screen.getByRole("heading", { name: /persefoni/i })).toBeInTheDocument();
    expect(screen.getByText("Excluded from generation")).toBeInTheDocument();
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("adds a highlight and submits it", async () => {
    const { user, onSubmit } = setup();
    const persefoni = screen.getByRole("listitem", { name: /persefoni/i });
    await user.click(within(persefoni).getByRole("button", { name: /add highlight/i }));

    const newHighlight = within(persefoni).getByRole("textbox", { name: /highlight 2 for persefoni/i });
    expect(newHighlight).toHaveFocus();
    await user.type(newHighlight, "Shipped WCAG keyboard navigation.");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    await user.click(saveButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const payload = onSubmit.mock.calls[0]![0];
    expect(payload.experiences[0]!.highlights).toEqual([
      "Built enterprise features.",
      "Shipped WCAG keyboard navigation.",
    ]);
    await waitFor(() => expect(screen.getByText("All changes saved")).toBeInTheDocument());
  });

  it("shows a validation error for an empty headline and does not submit", async () => {
    const { user, onSubmit } = setup();
    const headline = screen.getByLabelText(/headline/i);
    await user.clear(headline);
    await user.click(saveButton());

    expect(await screen.findByText("Headline is required")).toBeInTheDocument();
    expect(headline).toHaveAttribute("aria-invalid", "true");
    expect(headline).toHaveAccessibleDescription("Headline is required");
    expect(headline).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a payload matching the API contract", async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText(/full name/i), "  Jane Doe  ");
    // Move Elfie above Persefoni.
    await user.click(screen.getByRole("button", { name: "Move Elfie up" }));
    // Add a target role through the tag input.
    await user.type(screen.getByRole("textbox", { name: /target roles/i }), "Staff Engineer{Enter}");
    // Toggle Go's proficiency.
    await user.click(screen.getByRole("button", { name: /^Go: Familiar/ }));
    await user.click(saveButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      fullName: "Jane Doe",
      headline: "Senior Software Engineer",
      yearsOfExperience: 7,
      location: "Ho Chi Minh City, Vietnam",
      targetRoles: ["Senior Frontend Engineer", "Staff Engineer"],
      workingArrangement: "hybrid",
      summary: "Summary.",
      skills: [
        { id: "s1", name: "React", category: "frontend", proficiency: "production" },
        { id: "s2", name: "Go", category: "backend", proficiency: "production" },
      ],
      experiences: [
        {
          id: "e2",
          company: "Elfie",
          role: "",
          period: "",
          summary: "",
          highlights: [],
          technologies: [],
          includeInGeneration: false,
          order: 0,
        },
        {
          id: "e1",
          company: "Persefoni",
          role: "",
          period: "",
          summary: "Carbon accounting platform.",
          highlights: ["Built enterprise features."],
          technologies: ["React", "TypeScript"],
          includeInGeneration: true,
          order: 1,
        },
      ],
    });
  });

  it("keeps edits when saving fails", async () => {
    const onSubmit = vi.fn(async () => {
      throw new Error("boom");
    });
    const { user } = setup(onSubmit);
    await user.type(screen.getByLabelText(/location/i), "!");
    await user.click(saveButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toHaveValue("Ho Chi Minh City, Vietnam!");
  });

  it("adds and removes skills", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText("Skill"), "react{Enter}");
    expect(screen.getByText(/React is already listed under Frontend/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Skill"));
    await user.type(screen.getByLabelText("Skill"), "Vitest");
    await user.click(screen.getByRole("button", { name: /add skill/i }));
    expect(screen.getByRole("button", { name: "Remove skill Vitest" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove skill React" }));
    expect(screen.queryByRole("button", { name: "Remove skill React" })).not.toBeInTheDocument();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("toggles inclusion in generated content", async () => {
    const { user } = setup();
    const toggle = screen.getByRole("switch", { name: /include in generated content/i, checked: true });
    await user.click(toggle);
    expect(screen.getAllByText("Excluded from generation")).toHaveLength(2);
  });
});
