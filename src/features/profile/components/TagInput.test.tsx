import { describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagInput, addTags, splitTags } from "./TagInput";

function Harness({ initial = [] as string[] }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <>
      <label htmlFor="tags">Roles</label>
      <TagInput id="tags" value={value} onChange={setValue} itemLabel="role" />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

const current = () => JSON.parse(screen.getByTestId("value").textContent ?? "[]") as string[];

describe("tag helpers", () => {
  it("splits and dedupes", () => {
    expect(splitTags(" a, b;\nc ,, ")).toEqual(["a", "b", "c"]);
    expect(addTags(["React"], ["react", "Go", "Go", ""], 5)).toEqual(["React", "Go"]);
    expect(addTags([], ["TypeScript"], 4)).toEqual(["Type"]);
  });
});

describe("TagInput", () => {
  it("adds with Enter/comma, ignores duplicates and removes with Backspace", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["Frontend"]} />);
    const input = screen.getByRole("textbox", { name: "Roles" });

    await user.type(input, "Backend{Enter}frontend,Lead,");
    expect(current()).toEqual(["Frontend", "Backend", "Lead"]);

    await user.type(input, "{Backspace}");
    expect(current()).toEqual(["Frontend", "Backend"]);

    await user.click(screen.getByRole("button", { name: "Remove role Frontend" }));
    expect(current()).toEqual(["Backend"]);
    expect(input).toHaveFocus();
  });

  it("commits the draft on blur and splits pasted lists", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("textbox", { name: "Roles" });
    await user.click(input);
    await user.paste("A, B\nC");
    expect(current()).toEqual(["A", "B", "C"]);
    await user.type(input, "D");
    await user.tab();
    expect(current()).toEqual(["A", "B", "C", "D"]);
  });
});
