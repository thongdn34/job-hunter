import { Badge } from "@/components/ui/badge";
import type { Difficulty, Priority, VerificationStatus } from "@/domain/common/schema";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<Priority, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  high: "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30",
  medium: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  low: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
};

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  hard: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  expert: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
};

const VERIFICATION_STYLES: Record<VerificationStatus, string> = {
  verified: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
  unverified: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  assumption: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", PRIORITY_STYLES[priority], className)}>
      {priority}
    </Badge>
  );
}

export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", DIFFICULTY_STYLES[difficulty], className)}>
      {difficulty}
    </Badge>
  );
}

export function VerificationBadge({ status, className }: { status: VerificationStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", VERIFICATION_STYLES[status], className)}>
      {status}
    </Badge>
  );
}
