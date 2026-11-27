import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { Diagram } from "@/domain/common/schema";
import { MermaidDiagram } from "./MermaidDiagram";

const mermaidMock = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(async (_id: string, code: string) => {
    if (code.includes("INVALID")) throw new Error("Parse error");
    return { svg: `<svg data-testid="mmd"><text>${code}</text></svg>` };
  }),
}));
vi.mock("mermaid", () => ({ default: mermaidMock }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));

const diagram = (code: string): Diagram => ({ kind: "flowchart", code });

// Render immediately (no IntersectionObserver => the component treats the diagram as visible).
beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MermaidDiagram", () => {
  it("replaces a previously rendered SVG with the source fallback when new code fails", async () => {
    const { rerender, container } = render(<MermaidDiagram diagram={diagram("graph TD; A-->B")} />);
    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());

    // Same mounted instance (e.g. after "Regenerate answer" + router.refresh) gets invalid code.
    rerender(<MermaidDiagram diagram={diagram("graph TD; INVALID")} />);

    expect(await screen.findByText("Diagram could not be rendered; showing source.")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByText("graph TD; INVALID")).toBeInTheDocument();
  });
});
