"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "./CopyButton";
import { cn } from "@/lib/utils";

/**
 * Visible, searchable (Ctrl+F) bookmark marker with a copy-deep-link action.
 * The marker text itself (e.g. BOOKMARK_ISB_JD) is plain text in the DOM on purpose.
 */
export function BookmarkMarker({
  bookmark,
  anchorId,
  className,
}: {
  bookmark: string;
  anchorId: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <code
        className="bg-muted text-foreground/70 rounded px-1.5 py-0.5 font-mono text-[11px] tracking-tight"
        data-bookmark={bookmark}
      >
        {bookmark}
      </code>
      <button
        type="button"
        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded px-1 py-0.5 focus-visible:ring-2 focus-visible:outline-none"
        aria-label={`Copy link to ${bookmark}`}
        onClick={async () => {
          const url = `${window.location.origin}${window.location.pathname}#${anchorId}`;
          if (await copyToClipboard(url)) toast.success("Link copied", { description: bookmark });
        }}
      >
        <Link2 className="size-3.5" aria-hidden />
        <span className="sr-only sm:not-sr-only">Copy link</span>
      </button>
    </div>
  );
}
