"use client";

import { useRef, type KeyboardEvent } from "react";
import { LANGUAGE_MODES, type LanguageMode } from "@/domain/common/schema";
import { useLanguage, usePreferencesStore } from "@/stores/preferences-store";
import { cn } from "@/lib/utils";

/**
 * `short` is the visible text; the accessible name is `"<short>, <label>"` so it starts with the
 * visible text (WCAG 2.5.3 Label in Name: speech users can say "click EN plus VI").
 */
const OPTIONS: Record<LanguageMode, { short: string; label: string; lang?: string }> = {
  en: { short: "EN", label: "English", lang: "en" },
  vi: { short: "VI", label: "Tiếng Việt", lang: "vi" },
  bilingual: { short: "EN+VI", label: "Bilingual" },
};

/**
 * Global content language switch (English / Tiếng Việt / Bilingual).
 * ARIA radiogroup with roving tabindex: Tab focuses the checked option,
 * Arrow keys / Home / End move and select (WAI-ARIA radio group pattern).
 */
/** Accessible name of a language option: visible short text first, then the full name. */
function languageOptionName(mode: LanguageMode): string {
  const { short, label } = OPTIONS[mode];
  return `${short}, ${label}`;
}

export function LanguageSwitch({ className }: { className?: string }) {
  // Same SSR/hydration snapshot as the content (cookie-seeded), so the switch never flips after mount.
  const language = useLanguage();
  const setLanguage = usePreferencesStore((s) => s.setLanguage);
  const refs = useRef<Partial<Record<LanguageMode, HTMLButtonElement | null>>>({});

  const select = (mode: LanguageMode, focus: boolean) => {
    setLanguage(mode);
    if (focus) refs.current[mode]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = LANGUAGE_MODES.indexOf(language);
    const last = LANGUAGE_MODES.length - 1;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = index === last ? 0 : index + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = index === 0 ? last : index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
    }
    if (next === null) return;
    event.preventDefault();
    select(LANGUAGE_MODES[next], true);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Content language"
      onKeyDown={onKeyDown}
      className={cn("bg-muted/40 inline-flex h-8 shrink-0 items-center rounded-lg border p-0.5", className)}
    >
      {LANGUAGE_MODES.map((mode) => {
        const option = OPTIONS[mode];
        const checked = language === mode;
        return (
          <button
            key={mode}
            ref={(el) => {
              refs.current[mode] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={languageOptionName(mode)}
            title={option.label}
            // Applies to the accessible name too, so "Tiếng Việt" is announced with a Vietnamese voice.
            lang={option.lang}
            tabIndex={checked ? 0 : -1}
            onClick={() => select(mode, false)}
            className={cn(
              "text-muted-foreground hover:text-foreground focus-visible:ring-ring h-full rounded-md px-2 text-xs font-medium transition-colors outline-none focus-visible:ring-2",
              checked && "bg-background text-foreground shadow-sm",
            )}
          >
            <span aria-hidden>{option.short}</span>
          </button>
        );
      })}
    </div>
  );
}
