"use client";

import { memo, type MouseEvent } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/components/common/CopyButton";
import { useLanguage } from "@/stores/preferences-store";
import { cn } from "@/lib/utils";
import { navLabel } from "@/features/app-shell/nav-config";
import { useIsActiveAnchor } from "./active-section-store";
import { scrollToAnchor } from "./navigation";
import type { TocEntry, TocSection } from "./toc";

export interface TableOfContentsProps {
  toc: TocSection[];
  /** Override navigation (e.g. close a sheet first, then scroll). Defaults to an in-page smooth scroll. */
  onSelect?: (anchorId: string) => void;
  className?: string;
}

/** Section + topic bookmarks with active-section highlighting and copy-link actions. */
export function TableOfContents({ toc, onSelect, className }: TableOfContentsProps) {
  return (
    <nav aria-label="On this page" className={cn("text-sm", className)}>
      <h2 className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wide uppercase">On this page</h2>
      <ol className="space-y-0.5">
        {toc.map((section) => (
          <li key={section.anchorId}>
            <TocRow entry={section} onSelect={onSelect} />
            {section.topics.length > 0 && (
              <ol className="mt-0.5 mb-1 ml-5 space-y-0.5 border-l pl-1.5" aria-label="Topics">
                {section.topics.map((topic) => (
                  <li key={topic.anchorId}>
                    <TocRow entry={topic} onSelect={onSelect} />
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

const TocRow = memo(function TocRow({ entry, onSelect }: { entry: TocEntry; onSelect?: (anchorId: string) => void }) {
  const language = useLanguage();
  const active = useIsActiveAnchor(entry.anchorId);
  const label = navLabel(entry.title, language);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (onSelect) onSelect(entry.anchorId);
    else scrollToAnchor(entry.anchorId);
  };

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${entry.anchorId}`;
    if (await copyToClipboard(url)) toast.success("Link copied", { description: entry.bookmark });
    else toast.error("Could not copy link");
  };

  return (
    <div className="group flex items-center gap-0.5">
      <a
        href={`#${entry.anchorId}`}
        title={entry.bookmark}
        aria-current={active ? "location" : undefined}
        onClick={onClick}
        className={cn(
          "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-w-0 flex-1 items-baseline gap-1.5 rounded-md px-2 py-1 outline-none focus-visible:ring-2",
          entry.kind === "topic" && "py-0.5 text-xs",
          active && "bg-muted text-foreground font-medium",
        )}
      >
        {entry.kind === "section" && (
          <span className="w-5 shrink-0 text-right text-xs tabular-nums">{entry.number}.</span>
        )}
        <span className="min-w-0 truncate" lang={language === "vi" ? "vi" : "en"}>
          {label}
        </span>
        {entry.kind === "topic" && entry.range && (
          <span className="text-muted-foreground ml-auto shrink-0 text-[10px] tabular-nums">{entry.range}</span>
        )}
      </a>
      <button
        type="button"
        onClick={copyLink}
        aria-label={`Copy link to ${entry.bookmark}`}
        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring shrink-0 rounded p-1 opacity-0 outline-none group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 pointer-coarse:opacity-100"
      >
        <Link2 className="size-3.5" aria-hidden />
      </button>
    </div>
  );
});
