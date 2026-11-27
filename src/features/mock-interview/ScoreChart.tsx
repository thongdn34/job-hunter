"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatScore } from "./labels";

export interface ScoreChartDatum {
  label: string;
  title: string;
  score: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScoreChartDatum }> }) {
  const d = active ? payload?.[0]?.payload : undefined;
  if (!d) return null;
  return (
    <div className="bg-popover text-popover-foreground max-w-64 rounded-md border px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium">
        {d.label}: {formatScore(d.score)}/10
      </p>
      <p className="text-muted-foreground mt-0.5 line-clamp-2">{d.title}</p>
    </div>
  );
}

/**
 * Single-series bar chart of per-question scores (0–10) with an average reference line.
 * Loaded lazily (recharts is heavy). The per-question list next to it is the table view.
 */
export default function ScoreChart({ data, average }: { data: ScoreChartDatum[]; average: number | null }) {
  return (
    <div
      className="text-muted-foreground h-56 w-full"
      role="img"
      aria-label={`Bar chart of scores per question out of 10${average !== null ? `; average ${formatScore(average)}` : ""}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap="25%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "currentColor", fontSize: 12 }}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "currentColor", fontSize: 12 }}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            isAnimationActive={false}
          />
          {average !== null ? (
            <ReferenceLine
              y={average}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              label={{
                value: `avg ${formatScore(average)}`,
                position: "insideTopRight",
                fill: "currentColor",
                fontSize: 11,
              }}
            />
          ) : null}
          <Bar dataKey="score" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
