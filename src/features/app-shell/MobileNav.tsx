"use client";

import { useRef, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { PackageSummary } from "@/domain/package/schema";
import { scrollToAnchor } from "@/features/package-view/navigation";
import { MainNav } from "./MainNav";
import { SidebarNav } from "./SidebarNav";

/** Hamburger (below lg) that opens the app navigation + package sections in a left sheet. */
export function MobileNav({ packages }: { packages: PackageSummary[] }) {
  const [open, setOpen] = useState(false);
  /** In-page target to scroll to once the sheet has closed (and restored focus). */
  const pendingAnchor = useRef<string | null>(null);

  const close = (anchorId?: string) => {
    pendingAnchor.current = anchorId ?? null;
    setOpen(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen || !pendingAnchor.current) return;
        const anchorId = pendingAnchor.current;
        pendingAnchor.current = null;
        scrollToAnchor(anchorId);
      }}
    >
      <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" />}>
        <Menu aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="w-80 max-w-[85vw] gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle>Job Hunter</SheetTitle>
          <SheetDescription>Navigation and package sections</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto p-3">
          <MainNav orientation="vertical" onNavigate={() => close()} />
          <SidebarNav packages={packages} onNavigate={close} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
