import type { MatchLevel } from "@/domain/package/schema";
import { MATCH_LEVEL_LABELS } from "@/domain/match/score";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const MATCH_LEVEL_STYLES: Record<MatchLevel, string> = {
  strong: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  relevant: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  partial: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  gap: "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300",
  unverified: "border-zinc-500/30 bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
};

export function MatchLevelBadge({ level, className }: { level: MatchLevel; className?: string }) {
  return (
    <Badge variant="outline" className={cn(MATCH_LEVEL_STYLES[level], className)} data-level={level}>
      {MATCH_LEVEL_LABELS[level]}
    </Badge>
  );
}
