"use client";

import { useId, useMemo, useState } from "react";
import { Loader2, Play } from "lucide-react";
import type { MockConfig } from "@/domain/package/schema";
import { CRITERION_WEIGHTS, REVEAL_PENALTY } from "@/domain/mock/scoring";
import { BilingualText } from "@/components/common/BilingualText";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CRITERION_LABELS } from "./labels";
import {
  DEFAULT_PLAN_OPTIONS,
  eligibleItems,
  KIND_LABELS,
  PLAN_MODES,
  QUESTION_COUNTS,
  type PlanItem,
  type PlanMode,
  type PlanOptions,
} from "./mock-plan";

interface MockSetupProps {
  config: MockConfig;
  pool: readonly PlanItem[];
  pending: boolean;
  error: string | null;
  onStart: (options: PlanOptions) => void;
}

const MODE_LABELS: Record<PlanMode, { title: string; hint: string }> = {
  priority: { title: "In order by priority", hint: "Critical questions first, curated order." },
  shuffled: { title: "Shuffled", hint: "Random order, like a real interview." },
};

const segmentClass =
  "relative flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50";

type IncludeKey = keyof PlanOptions["include"];
const INCLUDE_KEYS: IncludeKey[] = ["systemDesign", "coding", "behavioral"];

function IncludeToggle({
  kind,
  checked,
  available,
  onChange,
}: {
  kind: IncludeKey;
  checked: boolean;
  available: number;
  onChange: (on: boolean) => void;
}) {
  const labelId = useId();
  const hintId = useId();
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <span id={labelId} className="block text-sm font-medium">
          Include {KIND_LABELS[kind].en.toLowerCase()}
        </span>
        <span id={hintId} className="text-muted-foreground block text-xs">
          {available} in the pool
        </span>
      </div>
      <Switch
        checked={checked && available > 0}
        disabled={available === 0}
        onCheckedChange={(on) => onChange(on)}
        aria-labelledby={labelId}
        aria-describedby={hintId}
      />
    </div>
  );
}

export function MockSetup({ config, pool, pending, error, onStart }: MockSetupProps) {
  const [options, setOptions] = useState<PlanOptions>(DEFAULT_PLAN_OPTIONS);
  const countName = useId();
  const modeName = useId();

  const availableByKind = useMemo(() => {
    const counts: Record<IncludeKey, number> = { systemDesign: 0, coding: 0, behavioral: 0 };
    for (const item of pool) if (item.kind !== "question") counts[item.kind] += 1;
    return counts;
  }, [pool]);
  const eligibleCount = useMemo(() => eligibleItems(pool, options.include).length, [pool, options.include]);
  const plannedCount = Math.min(options.count, eligibleCount);

  return (
    <div className="space-y-6">
      <BilingualText value={config.intro} as="p" className="text-sm leading-relaxed" />

      <section aria-labelledby={`${countName}-rubric`} className="space-y-3">
        <h3 id={`${countName}-rubric`} className="text-sm font-semibold">
          Scoring rubric
        </h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          {config.rubric.map((r) => (
            <div key={r.criterion} className="bg-card rounded-lg border p-3">
              <dt className="flex items-baseline justify-between gap-2 text-sm font-medium">
                <BilingualText value={CRITERION_LABELS[r.criterion]} viClassName="text-xs font-normal" />
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {Math.round(CRITERION_WEIGHTS[r.criterion] * 100)}%
                </span>
              </dt>
              <dd className="text-muted-foreground mt-1 text-sm">
                <BilingualText value={r.description} viClassName="text-xs" />
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground text-xs">
          Overall = weighted average out of 10. Revealing the recommended answer before submitting costs{" "}
          {REVEAL_PENALTY} points.
        </p>
      </section>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (eligibleCount > 0 && !pending) onStart(options);
        }}
      >
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Number of questions</legend>
          <div className="grid max-w-xs grid-cols-3 gap-2">
            {QUESTION_COUNTS.map((n) => (
              <label key={n} className={segmentClass}>
                <input
                  type="radio"
                  name={countName}
                  value={n}
                  className="sr-only"
                  checked={options.count === n}
                  onChange={() => setOptions((o) => ({ ...o, count: n }))}
                />
                {n}
              </label>
            ))}
          </div>
          {eligibleCount < options.count ? (
            <p className="text-muted-foreground text-xs" role="status">
              Only {eligibleCount} question{eligibleCount === 1 ? "" : "s"} match your filters — the session will have{" "}
              {plannedCount}.
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Order</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PLAN_MODES.map((mode) => (
              <label key={mode} className={cn(segmentClass, "flex-col items-start justify-start text-left")}>
                <input
                  type="radio"
                  name={modeName}
                  value={mode}
                  className="sr-only"
                  checked={options.mode === mode}
                  onChange={() => setOptions((o) => ({ ...o, mode }))}
                />
                <span>{MODE_LABELS[mode].title}</span>
                <span className="text-xs font-normal opacity-80">{MODE_LABELS[mode].hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Question types</legend>
          <p className="text-muted-foreground text-xs">Technical questions are always included.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {INCLUDE_KEYS.map((kind) => (
              <IncludeToggle
                key={kind}
                kind={kind}
                checked={options.include[kind]}
                available={availableByKind[kind]}
                onChange={(on) => setOptions((o) => ({ ...o, include: { ...o.include, [kind]: on } }))}
              />
            ))}
          </div>
        </fieldset>

        {error ? (
          <div
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
          >
            <p className="font-medium">Could not start the mock interview</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : null}

        <Button type="submit" size="lg" disabled={pending || eligibleCount === 0} aria-busy={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
          {pending ? "Starting…" : `Start mock interview (${plannedCount} question${plannedCount === 1 ? "" : "s"})`}
        </Button>
        {eligibleCount === 0 ? (
          <p className="text-muted-foreground text-sm">No questions are available for the selected types.</p>
        ) : null}
      </form>
    </div>
  );
}
