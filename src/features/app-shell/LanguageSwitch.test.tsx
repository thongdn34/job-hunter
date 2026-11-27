import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BilingualText } from "@/components/common/BilingualText";
import { usePreferencesStore } from "@/stores/preferences-store";
import { LanguageSwitch } from "./LanguageSwitch";

// Accessible names start with the visible text (WCAG 2.5.3 Label in Name).
const EN = "EN, English";
const VI = "VI, Tiếng Việt";
const BI = "EN+VI, Bilingual";

const VALUE = { en: "Hello interviewer", vi: "Xin chào nhà tuyển dụng" };

function setup() {
  const user = userEvent.setup();
  render(
    <>
      <LanguageSwitch />
      <p data-testid="content">
        <BilingualText value={VALUE} />
      </p>
    </>,
  );
  return { user, content: screen.getByTestId("content") };
}

describe("LanguageSwitch", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ language: "bilingual" });
  });

  it("renders an accessible radiogroup with the current mode checked", () => {
    setup();
    const group = screen.getByRole("radiogroup", { name: "Content language" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: BI })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: EN })).toHaveAttribute("aria-checked", "false");
    // Roving tabindex: only the checked option is in the tab order.
    expect(screen.getByRole("radio", { name: BI })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: EN })).toHaveAttribute("tabindex", "-1");
  });

  it("includes the visible text in each option's accessible name", () => {
    setup();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-label"))).toEqual([EN, VI, BI]);
    for (const radio of radios) {
      const visible = radio.textContent ?? "";
      expect(visible).not.toBe("");
      expect(radio.getAttribute("aria-label")?.startsWith(visible)).toBe(true);
    }
    expect(screen.getByRole("radio", { name: VI })).toHaveAttribute("lang", "vi");
  });

  it("switches what BilingualText renders between EN, VI and bilingual", async () => {
    const { user, content } = setup();
    expect(content).toHaveTextContent(VALUE.en);
    expect(content).toHaveTextContent(VALUE.vi);

    await user.click(screen.getByRole("radio", { name: EN }));
    expect(usePreferencesStore.getState().language).toBe("en");
    expect(content).toHaveTextContent(VALUE.en);
    expect(content).not.toHaveTextContent(VALUE.vi);

    await user.click(screen.getByRole("radio", { name: VI }));
    expect(usePreferencesStore.getState().language).toBe("vi");
    expect(content).not.toHaveTextContent(VALUE.en);
    expect(content).toHaveTextContent(VALUE.vi);
    expect(screen.getByText(VALUE.vi)).toHaveAttribute("lang", "vi");

    await user.click(screen.getByRole("radio", { name: BI }));
    expect(content).toHaveTextContent(VALUE.en);
    expect(content).toHaveTextContent(VALUE.vi);
  });

  it("supports arrow-key navigation with wrap-around", async () => {
    const { user, content } = setup();
    screen.getByRole("radio", { name: BI }).focus();

    await user.keyboard("{ArrowRight}");
    expect(usePreferencesStore.getState().language).toBe("en");
    expect(screen.getByRole("radio", { name: EN })).toHaveFocus();
    expect(content).not.toHaveTextContent(VALUE.vi);

    await user.keyboard("{ArrowRight}");
    expect(usePreferencesStore.getState().language).toBe("vi");
    expect(screen.getByRole("radio", { name: VI })).toHaveFocus();

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(usePreferencesStore.getState().language).toBe("bilingual");

    await user.keyboard("{Home}");
    expect(usePreferencesStore.getState().language).toBe("en");
    await user.keyboard("{End}");
    expect(usePreferencesStore.getState().language).toBe("bilingual");
  });
});
