import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useExpansionStore } from "@/stores/expansion-store";
import { ACCORDION_LIST_ATTR, ItemAccordion } from "./ItemAccordion";

function List({ ids }: { ids: string[] }) {
  return (
    <div {...{ [ACCORDION_LIST_ATTR]: "" }}>
      {ids.map((id) => (
        <ItemAccordion key={id} id={id} header={<span>Header {id}</span>} renderBody={() => <p>Body {id}</p>} />
      ))}
    </div>
  );
}

const header = (id: string) => screen.getByRole("button", { name: `Header ${id}` });

beforeEach(() => {
  useExpansionStore.setState({ expanded: {}, focusRequest: null });
});

describe("ItemAccordion", () => {
  it("renders a heading-wrapped disclosure button wired to its panel", () => {
    render(<List ids={["a"]} />);
    const button = header("a");
    expect(button.closest("h3")).not.toBeNull();
    expect(button).toHaveAttribute("aria-expanded", "false");
    const panelId = button.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId!);
    // A group, not a region: expanded panels must not become landmarks (APG accordion note).
    expect(panel).toHaveAttribute("role", "group");
    expect(panel).toHaveAttribute("aria-labelledby", button.id);
    const wrapper = document.getElementById("item-a");
    expect(wrapper).toHaveAttribute("data-item-id", "a");
  });

  it("expands and collapses on click and lazily renders the body", async () => {
    const user = userEvent.setup();
    render(<List ids={["a"]} />);
    expect(screen.queryByText("Body a")).not.toBeInTheDocument();
    await user.click(header("a"));
    expect(header("a")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Body a")).toBeVisible();
    expect(screen.getByRole("group", { name: "Header a" })).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    await user.click(header("a"));
    expect(header("a")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Body a")).not.toBeInTheDocument();
  });

  it("toggles with Enter and Space", async () => {
    const user = userEvent.setup();
    render(<List ids={["a"]} />);
    header("a").focus();
    await user.keyboard("{Enter}");
    expect(header("a")).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(header("a")).toHaveAttribute("aria-expanded", "false");
  });

  it("moves focus between headers with ArrowUp/ArrowDown/Home/End (wrapping)", async () => {
    const user = userEvent.setup();
    render(<List ids={["a", "b", "c"]} />);
    header("a").focus();
    await user.keyboard("{ArrowDown}");
    expect(header("b")).toHaveFocus();
    await user.keyboard("{End}");
    expect(header("c")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(header("a")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(header("c")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(header("a")).toHaveFocus();
  });

  it("does not affect other items when toggling", async () => {
    const user = userEvent.setup();
    render(<List ids={["a", "b"]} />);
    await user.click(header("a"));
    await user.click(header("b"));
    await user.click(header("b"));
    expect(header("a")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Body a")).toBeInTheDocument();
  });

  it("handles focusItem(): expands, scrolls into view, flashes, focuses and clears the request", async () => {
    const scrollSpy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    render(<List ids={["a", "b"]} />);
    act(() => useExpansionStore.getState().focusItem("b", "item-b"));
    expect(header("b")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Body b")).toBeInTheDocument();
    await waitFor(() => expect(useExpansionStore.getState().focusRequest).toBeNull());
    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ block: "start" }));
    expect(document.getElementById("item-b")).toHaveClass("jh-flash");
    expect(header("b")).toHaveFocus();
    expect(header("a")).toHaveAttribute("aria-expanded", "false");
    scrollSpy.mockRestore();
  });
});
