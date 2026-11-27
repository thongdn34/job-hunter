"use client";

import { Bar, BarChart, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { TopicProgress } from "./stats";

/**
 * Compact horizontal bar chart: % of items studied per topic. Single series → one hue
 * (the theme primary), no legend; the muted background bar is the 100% track.
 * Loaded lazily (recharts is heavy) and hidden from assistive tech — ProgressPanel renders
 * an equivalent text list for screen readers.
 */
export default function ProgressTopicChart({ topics }: { topics: TopicProgress[] }) {
  const height = topics.length * 22 + 8;
  return (
    <BarChart
      responsive
      style={{ width: "100%", height }}
      data={topics}
      layout="vertical"
      margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
      barCategoryGap={4}
    >
      <XAxis type="number" domain={[0, 100]} hide />
      <YAxis
        type="category"
        dataKey="label"
        width={72}
        tickLine={false}
        axisLine={false}
        interval={0}
        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
      />
      <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={TopicTooltip} isAnimationActive={false} />
      <Bar
        dataKey="percent"
        fill="var(--primary)"
        background={{ fill: "var(--muted)", radius: 4 }}
        radius={4}
        barSize={10}
        isAnimationActive={false}
      />
    </BarChart>
  );
}

function TopicTooltip({ active, payload }: TooltipContentProps) {
  const entry = payload?.[0]?.payload as TopicProgress | undefined;
  if (!active || !entry) return null;
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium">{entry.title.en}</p>
      <p className="text-muted-foreground tabular-nums">
        {entry.studied}/{entry.total} studied · {entry.percent}%
      </p>
    </div>
  );
}
