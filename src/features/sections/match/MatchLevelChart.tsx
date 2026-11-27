"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { MATCH_LEVELS, type MatchLevel } from "@/domain/package/schema";
import { MATCH_LEVEL_LABELS } from "@/domain/match/score";

/**
 * Bar chart of requirement counts per match level.
 * Loaded lazily (recharts is large). Decorative for assistive tech: the
 * MatchSection renders the same numbers in an accessible table.
 */
export default function MatchLevelChart({ byLevel }: { byLevel: Record<MatchLevel, number> }) {
  const data = MATCH_LEVELS.map((level) => ({ level, label: MATCH_LEVEL_LABELS[level], count: byLevel[level] }));
  return (
    <BarChart
      data={data}
      responsive
      style={{ width: "100%", height: 220 }}
      margin={{ top: 20, right: 8, bottom: 0, left: -16 }}
      accessibilityLayer={false}
    >
      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={{ stroke: "var(--border)" }}
        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        interval={0}
      />
      <YAxis
        allowDecimals={false}
        tickLine={false}
        axisLine={false}
        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        width={40}
      />
      <Tooltip
        cursor={{ fill: "var(--muted)", opacity: 0.6 }}
        contentStyle={{
          background: "var(--popover)",
          color: "var(--popover-foreground)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          fontSize: 12,
        }}
        formatter={(value) => [value, "Requirements"]}
      />
      <Bar
        dataKey="count"
        name="Requirements"
        fill="var(--primary)"
        radius={[4, 4, 0, 0]}
        maxBarSize={48}
        isAnimationActive={false}
      >
        <LabelList dataKey="count" position="top" fill="var(--foreground)" fontSize={12} />
      </Bar>
    </BarChart>
  );
}
