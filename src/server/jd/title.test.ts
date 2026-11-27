import { describe, expect, it } from "vitest";
import { detectJobTitle } from "./title";

describe("detectJobTitle", () => {
  it("reads labelled titles (English and Vietnamese)", () => {
    expect(detectJobTitle("About us\nJob title: Senior Front-End Developer\nRequirements…")).toBe(
      "Senior Front-End Developer",
    );
    expect(detectJobTitle("Vị trí tuyển dụng: Lập trình viên ReactJS\nMô tả công việc")).toBe("Lập trình viên ReactJS");
    expect(detectJobTitle("**Position:** Staff Engineer – Payments")).toBe("Staff Engineer");
  });

  it("uses a short first line that names a role", () => {
    expect(detectJobTitle("Senior Frontend Engineer - ACME\n\nResponsibilities\n- Build UIs")).toBe(
      "Senior Frontend Engineer",
    );
    expect(detectJobTitle("  \nQA Automation Tester\nWe test things.")).toBe("QA Automation Tester");
  });

  it("finds 'hiring a …' phrases in the opening paragraph", () => {
    expect(
      detectJobTitle(
        "Acme Robotics is hiring a Senior Frontend Engineer to build our fleet dashboard. Requirements: React.",
      ),
    ).toBe("Senior Frontend Engineer");
    expect(detectJobTitle("We are looking for a talented React developer who loves UX.")).toBe("React developer");
  });

  it("returns undefined when no title can be found", () => {
    expect(detectJobTitle("Responsibilities: build things. Requirements: React, TypeScript.")).toBeUndefined();
    expect(detectJobTitle("We are looking for someone to lead our platform work.")).toBeUndefined();
    expect(detectJobTitle("")).toBeUndefined();
    // A long first sentence is not a title.
    expect(
      detectJobTitle("Our engineers build the best logistics platform in Vietnam and beyond.\nMore text"),
    ).toBeUndefined();
  });
});
