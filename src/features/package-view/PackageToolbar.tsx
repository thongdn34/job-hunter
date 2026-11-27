"use client";

import { useRef, useState } from "react";
import { ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { StudyItem } from "@/domain/package/items";
import type { InterviewPackage } from "@/domain/package/schema";
import { ProgressPanel } from "@/features/study/ProgressPanel";
import { GlobalSearch } from "./GlobalSearch";
import { scrollToAnchor } from "./navigation";
import { TableOfContents } from "./TableOfContents";
import type { TocEntry, TocSection } from "./toc";

/** Sticky bar under the header: global search + (below xl) a "Contents" sheet with TOC and progress. */
export function PackageToolbar({
  pkg,
  items,
  toc,
  entries,
}: {
  pkg: InterviewPackage;
  items: StudyItem[];
  toc: TocSection[];
  entries: TocEntry[];
}) {
  return (
    <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-14 z-30 border-b backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-2.5 sm:px-6">
        <GlobalSearch items={items} entries={entries} className="min-w-0 flex-1" />
        <ContentsSheet pkg={pkg} toc={toc} />
      </div>
    </div>
  );
}

function ContentsSheet({ pkg, toc }: { pkg: InterviewPackage; toc: TocSection[] }) {
  const [open, setOpen] = useState(false);
  const pending = useRef<string | null>(null);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen || !pending.current) return;
        const anchorId = pending.current;
        pending.current = null;
        scrollToAnchor(anchorId);
      }}
    >
      <SheetTrigger render={<Button variant="outline" size="default" className="xl:hidden" />}>
        <ListTree aria-hidden />
        <span className="sr-only sm:not-sr-only">Contents</span>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 max-w-[85vw] gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle>Contents</SheetTitle>
          <SheetDescription>Sections, topic bookmarks and study progress</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto p-3">
          <TableOfContents
            toc={toc}
            onSelect={(anchorId) => {
              pending.current = anchorId;
              setOpen(false);
            }}
          />
          <ProgressPanel pkg={pkg} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
