"use client";

import { useId, type ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StatBarProps {
  label: ReactNode;
  /** 0–100. */
  value: number;
  detail?: ReactNode;
  className?: string;
}

/** Labelled progress bar with a percentage and an optional detail line. */
export function StatBar({ label, value, detail, className }: StatBarProps) {
  const id = useId();
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span id={id} className="font-medium">
          {label}
        </span>
        <span className="font-semibold tabular-nums">{pct}%</span>
      </div>
      <Progress value={pct} aria-labelledby={id} className="gap-0" />
      {detail && <p className="text-muted-foreground text-xs tabular-nums">{detail}</p>}
    </div>
  );
}
