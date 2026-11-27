"use client";

import { memo } from "react";
import type { Bilingual, LanguageMode } from "@/domain/common/schema";
import { useLanguage } from "@/stores/preferences-store";
import { cn } from "@/lib/utils";

interface BilingualTextProps {
  value: Bilingual;
  /** Element used for each language block. */
  as?: "span" | "p" | "div" | "h3" | "h4";
  className?: string;
  /** Extra classes for the Vietnamese line in bilingual mode. */
  viClassName?: string;
  /** Override the global language mode. */
  mode?: LanguageMode;
}

/**
 * Renders English, Vietnamese, or both according to the global language switch.
 * Vietnamese lines carry lang="vi" for screen readers and are visually secondary.
 */
export const BilingualText = memo(function BilingualText({
  value,
  as: Tag = "span",
  className,
  viClassName,
  mode,
}: BilingualTextProps) {
  const globalMode = useLanguage();
  const lang = mode ?? globalMode;
  if (lang === "en")
    return (
      <Tag className={className} lang="en">
        {value.en}
      </Tag>
    );
  if (lang === "vi")
    return (
      <Tag className={className} lang="vi">
        {value.vi}
      </Tag>
    );
  return (
    <>
      <Tag className={className} lang="en">
        {value.en}
      </Tag>
      {Tag === "span" ? " " : null}
      <Tag className={cn("text-muted-foreground", Tag === "span" ? "block" : "", viClassName)} lang="vi" data-lang="vi">
        {value.vi}
      </Tag>
    </>
  );
});

/** Returns which languages should be visible for the current mode. */
export function useVisibleLanguages(): { en: boolean; vi: boolean } {
  const mode = useLanguage();
  return { en: mode !== "vi", vi: mode !== "en" };
}

/** Plain-string helper (e.g. for aria-labels, document titles). */
export function pickText(value: Bilingual, mode: LanguageMode): string {
  if (mode === "en") return value.en;
  if (mode === "vi") return value.vi;
  return `${value.en} — ${value.vi}`;
}
