"use client";

import { memo, useCallback } from "react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExpansionStore } from "@/stores/expansion-store";
import { StudiedCount } from "./item-parts";
import { useStudiedCount } from "./progress";

/** Count + studied progress + Expand all / Collapse all for sections 8–10. */
export const ItemListToolbar = memo(function ItemListToolbar({
  slug,
  ids,
  noun,
}: {
  slug: string;
  ids: readonly string[];
  noun: string;
}) {
  const studied = useStudiedCount(slug, ids);
  const expandAll = useCallback(() => useExpansionStore.getState().expandMany([...ids]), [ids]);
  const collapseAll = useCallback(() => useExpansionStore.getState().collapseMany([...ids]), [ids]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-muted-foreground mr-auto flex items-center gap-2 text-xs tabular-nums">
        <span>
          {ids.length} {noun}
        </span>
        <StudiedCount studied={studied} total={ids.length} />
      </p>
      <Button type="button" size="sm" variant="outline" onClick={expandAll} disabled={ids.length === 0}>
        <ChevronsUpDown aria-hidden />
        Expand all
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={collapseAll} disabled={ids.length === 0}>
        <ChevronsDownUp aria-hidden />
        Collapse all
      </Button>
    </div>
  );
});
