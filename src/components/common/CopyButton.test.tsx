import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "./CopyButton";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

afterEach(() => {
  vi.restoreAllMocks();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

describe("CopyButton", () => {
  it("copies the text and announces success while keeping its accessible name", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(<CopyButton text={() => "hello"} label="Copy code" />);

    await user.click(screen.getByRole("button", { name: "Copy code" }));

    expect(writeText).toHaveBeenCalledWith("hello");
    expect(toastMock.success).toHaveBeenCalledWith("Copied to clipboard");
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
  });

  it("announces a failure when the clipboard is unavailable", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    const exec = vi.fn(() => false);
    Object.defineProperty(document, "execCommand", { value: exec, configurable: true, writable: true });
    render(<CopyButton text="x" label="Copy answer" />);

    await user.click(screen.getByRole("button", { name: "Copy answer" }));

    expect(exec).toHaveBeenCalledWith("copy");
    expect(toastMock.error).toHaveBeenCalledWith("Could not copy to clipboard");
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("uses a stable aria-label for icon-only buttons", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(<CopyButton text="q" label="Copy question 1" size="icon" />);
    const button = screen.getByRole("button", { name: "Copy question 1" });
    await user.click(button);
    expect(button).toHaveAttribute("aria-label", "Copy question 1");
  });
});
