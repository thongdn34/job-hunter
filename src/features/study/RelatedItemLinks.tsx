"use client";

import { memo, type MouseEvent } from "react";
import type { InterviewPackage } from "@/domain/package/schema";
import { pickText } from "@/components/common/BilingualText";
import { useLanguage } from "@/stores/preferences-store";
import { useExpansionStore } from "@/stores/expansion-store";
import { cn } from "@/lib/utils";
import { getStudyItemIndex, itemShortLabel } from "./study-items";

/** Expands the target item (accordion) and asks it to scroll into view; keeps the URL hash in sync. */
export function focusStudyItem(e: MouseEvent<HTMLAnchorElement>, id: string, anchorId: string): void {
  // Let modified clicks (new tab/window) behave natively.
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  useExpansionStore.getState().focusItem(id, anchorId);
  try {
    window.history.replaceState(window.history.state, "", `#${anchorId}`);
  } catch {
    /* ignore (sandboxed iframes) */
  }
}

interface RelatedItemLinksProps {
  pkg: InterviewPackage;
  ids: readonly string[];
  className?: string;
  /** Accessible label for the list. */
  label?: string;
}

/** Chips linking to related questions / scenarios / exercises / behavioral questions. */
export const RelatedItemLinks = memo(function RelatedItemLinks({
  pkg,
  ids,
  className,
  label = "Related items",
}: RelatedItemLinksProps) {
  const language = useLanguage();
  if (ids.length === 0) return null;
  const { byId } = getStudyItemIndex(pkg);
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {ids.map((id) => {
        const item = byId.get(id);
        if (!item) {
          return (
            <li key={id}>
              <span
                className="text-muted-foreground inline-flex h-6 items-center rounded-md border border-dashed px-2 font-mono text-xs"
                title="Item not available yet"
              >
                {id}
              </span>
            </li>
          );
        }
        const title = pickText(item.title, language === "vi" ? "vi" : "en");
        const short = itemShortLabel(item);
        return (
          <li key={id}>
            <a
              href={`#${item.anchorId}`}
              onClick={(e) => focusStudyItem(e, item.id, item.anchorId)}
              title={title}
              aria-label={`${short}: ${title}`}
              className="bg-background text-foreground hover:bg-muted focus-visible:ring-ring/50 inline-flex h-6 max-w-56 items-center gap-1 rounded-md border px-2 text-xs transition-colors outline-none focus-visible:ring-3"
            >
              <span className="font-semibold tabular-nums">{short}</span>
              <span className="text-muted-foreground truncate">{title}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
});
