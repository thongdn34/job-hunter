import { Ban, CheckCircle2, Circle, History, Loader2, XCircle, type LucideIcon } from "lucide-react";
import type { ChipStatus } from "./section-progress";

export interface StatusMeta {
  label: string;
  icon: LucideIcon;
  /** Icon color classes (theme tokens / dual-theme palette). */
  iconClass: string;
  /** Chip border/background classes. */
  chipClass: string;
  spin?: boolean;
}

export const STATUS_META: Record<ChipStatus, StatusMeta> = {
  pending: {
    label: "Waiting",
    icon: Circle,
    iconClass: "text-muted-foreground",
    chipClass: "bg-background text-muted-foreground",
  },
  generating: {
    label: "Generating",
    icon: Loader2,
    iconClass: "text-primary",
    chipClass: "border-primary/40 bg-primary/5 text-foreground",
    spin: true,
  },
  ready: {
    label: "Ready",
    icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    chipClass: "border-emerald-500/30 bg-emerald-500/5 text-foreground",
  },
  skipped: {
    label: "Unchanged",
    icon: CheckCircle2,
    iconClass: "text-emerald-600/70 dark:text-emerald-400/70",
    chipClass: "bg-background text-muted-foreground",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    iconClass: "text-destructive",
    chipClass: "border-destructive/40 bg-destructive/5 text-foreground",
  },
  stale: {
    label: "Outdated",
    icon: History,
    iconClass: "text-amber-600 dark:text-amber-400",
    chipClass: "border-amber-500/40 bg-amber-500/5 text-foreground",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    iconClass: "text-muted-foreground",
    chipClass: "bg-background text-muted-foreground",
  },
};
