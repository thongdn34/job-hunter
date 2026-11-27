import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrintView } from "./PrintView";

const run = vi.fn<(opts: { nodes: HTMLElement[] }) => Promise<void>>();
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    run: (opts: { nodes: HTMLElement[] }) => run(opts),
  },
}));

const BODY_URL = "/api/packages/isb/print?lang=bilingual";
const BODY =
  '<div class="jh-export lang-bilingual" data-jh-export><main><p>Answer text</p>' +
  '<pre class="mermaid">flowchart LR\n  A --> B</pre></main></div>';

const fetchMock = vi.fn<typeof fetch>();
const printMock = vi.fn();

function renderView(props: Partial<React.ComponentProps<typeof PrintView>> = {}) {
  return render(
    <PrintView bodyUrl={BODY_URL} backHref="/packages/isb" autoprint={false} sectionCount={3} {...props} />,
  );
}

describe("PrintView", () => {
  beforeEach(() => {
    run.mockReset();
    run.mockImplementation(async ({ nodes }) => {
      for (const n of nodes) n.setAttribute("data-processed", "true");
    });
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      async () => new Response(BODY, { status: 200, headers: { "Content-Type": "text/html" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    printMock.mockReset();
    vi.spyOn(window, "print").mockImplementation(printMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches the body once after mount, injects it, then renders its diagrams", async () => {
    const { container } = renderView();
    expect(screen.getByRole("status")).toHaveTextContent("Loading the package…");
    expect(screen.getByRole("button", { name: /print/i })).toBeDisabled();

    await screen.findByText("Ready to print · 3 sections, everything expanded.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(BODY_URL);
    expect(container.querySelector(".jh-export main p")?.textContent).toBe("Answer text");
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]?.[0].nodes).toHaveLength(1);
    expect(container.querySelector("pre.mermaid")?.hasAttribute("data-processed")).toBe(true);
    expect(screen.getByRole("button", { name: /print/i })).toBeEnabled();
    expect(printMock).not.toHaveBeenCalled();
  });

  it("opens the print dialog only after the body is in the document when autoprint is set", async () => {
    let seenBody = false;
    printMock.mockImplementation(() => {
      seenBody = document.querySelector(".jh-export main p") !== null;
    });
    renderView({ autoprint: true });
    await waitFor(() => expect(printMock).toHaveBeenCalledTimes(1));
    expect(seenBody).toBe(true);
  });

  it("reports diagram failures but keeps the body printable", async () => {
    run.mockRejectedValueOnce(new Error("boom"));
    const { container } = renderView({ autoprint: true });
    await screen.findByText(/Diagrams could not be rendered/);
    expect(container.querySelector("pre.mermaid")?.textContent).toContain("flowchart LR");
    expect(printMock).toHaveBeenCalledTimes(1);
  });

  it("shows an error with a retry when the body cannot be loaded, and never auto-prints an empty page", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    const user = userEvent.setup();
    const { container } = renderView({ autoprint: true });
    await screen.findByText("The print view could not be loaded.");
    expect(container.querySelector(".jh-export")).toBeNull();
    expect(printMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /print/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() => expect(printMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container.querySelector(".jh-export")).not.toBeNull();
  });
});
