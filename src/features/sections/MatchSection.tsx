"use client";

import { Suspense, lazy, memo, useMemo, useState } from "react";
import { BarChart3, Calculator, ListFilter, Scale } from "lucide-react";
import { MATCH_LEVELS, type MatchLevel, type MatchRequirement } from "@/domain/package/schema";
import {
  MATCH_CATEGORIES,
  MATCH_CATEGORY_LABELS,
  MATCH_LEVEL_LABELS,
  MATCH_LEVEL_POINTS,
  MATCH_SCORE_DISCLAIMER,
  computeMatchScore,
  scoreBand,
} from "@/domain/match/score";
import type { SectionProps } from "@/features/package-view/section-types";
import { BilingualText } from "@/components/common/BilingualText";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MatchLevelBadge } from "./match/MatchLevelBadge";
import { Callout, EmptyNote, ExperienceKindBadge, Panel, SubSection } from "./shared/ui";

const MatchLevelChart = lazy(() => import("./match/MatchLevelChart"));

const BAND_LABEL: Record<ReturnType<typeof scoreBand>, string> = {
  strong: "Strong fit",
  good: "Good fit",
  moderate: "Moderate fit",
  low: "Low fit",
};

const BAND_BAR: Record<ReturnType<typeof scoreBand>, string> = {
  strong: "bg-emerald-500",
  good: "bg-sky-500",
  moderate: "bg-amber-500",
  low: "bg-red-500",
};

type Filter = MatchLevel | "all";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, ""));

/* ------------------------------------------------------------------ */
/* Requirement row (table on md+, stacked card on mobile)              */
/* ------------------------------------------------------------------ */

function CellLabel({ children }: { children: string }) {
  return (
    <span className="text-muted-foreground mb-1 block text-xs font-medium tracking-wide uppercase md:hidden">
      {children}
    </span>
  );
}

const RequirementRow = memo(function RequirementRow({ req }: { req: MatchRequirement }) {
  return (
    <tr className="bg-card mb-3 block rounded-lg border p-3 align-top md:mb-0 md:table-row md:rounded-none md:border-0 md:border-b md:bg-transparent md:p-0">
      <th scope="row" className="block pb-2 text-left font-normal md:table-cell md:w-[22%] md:p-3">
        <BilingualText
          value={req.requirement}
          as="p"
          className="text-sm font-medium"
          viClassName="text-sm font-normal"
        />
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Badge variant="secondary" className="font-normal">
            {MATCH_CATEGORY_LABELS[req.category]}
          </Badge>
          <Badge variant="outline" className="font-normal tabular-nums" title="Relative weight in the score (1–5)">
            Weight {req.weight}
          </Badge>
        </div>
      </th>
      <td className="block py-2 md:table-cell md:p-3">
        <CellLabel>Candidate experience</CellLabel>
        <BilingualText value={req.candidateExperience} as="p" className="text-sm" viClassName="text-sm" />
      </td>
      <td className="block py-2 md:table-cell md:p-3">
        <CellLabel>Match level</CellLabel>
        <MatchLevelBadge level={req.matchLevel} />
      </td>
      <td className="block py-2 md:table-cell md:p-3">
        <CellLabel>Evidence</CellLabel>
        {req.evidence.length === 0 ? (
          <span className="text-muted-foreground text-sm italic">No evidence</span>
        ) : (
          <ul className="space-y-2">
            {req.evidence.map((ev, i) => (
              <li key={i} className="space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <ExperienceKindBadge kind={ev.kind} />
                  {ev.company && <span className="text-xs font-medium">{ev.company}</span>}
                </div>
                <BilingualText value={ev.note} as="p" className="text-sm" viClassName="text-sm" />
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="block py-2 md:table-cell md:p-3">
        <CellLabel>Gap</CellLabel>
        {req.knowledgeGap ? (
          <BilingualText value={req.knowledgeGap} as="p" className="text-sm" viClassName="text-sm" />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </td>
      <td className="block pt-2 md:table-cell md:p-3">
        <CellLabel>Improvement</CellLabel>
        {req.recommendedImprovement ? (
          <BilingualText value={req.recommendedImprovement} as="p" className="text-sm" viClassName="text-sm" />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </td>
    </tr>
  );
});

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function MatchSection({ data }: SectionProps<"match">) {
  const result = useMemo(() => computeMatchScore(data.requirements), [data.requirements]);
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () => (filter === "all" ? data.requirements : data.requirements.filter((r) => r.matchLevel === filter)),
    [data.requirements, filter],
  );

  const band = scoreBand(result.score);
  const total = data.requirements.length;

  return (
    <div className="space-y-8">
      {/* Score ---------------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_1fr]">
        <Panel className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm font-medium">Estimated match score</p>
          <p className="flex items-baseline gap-1">
            <span className="text-5xl font-semibold tracking-tight tabular-nums">{result.score}</span>
            <span className="text-muted-foreground text-lg">/ 100</span>
            <span className="sr-only">, {BAND_LABEL[band]}</span>
          </p>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full" aria-hidden>
            <div className={cn("h-full rounded-full", BAND_BAR[band])} style={{ width: `${result.score}%` }} />
          </div>
          <p className="text-sm" aria-hidden>
            {BAND_LABEL[band]} · {fmt(result.earnedPoints)} of {fmt(result.maxPoints)} weighted points
          </p>
          <p
            data-testid="match-score-disclaimer"
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-950 dark:text-amber-100"
          >
            {MATCH_SCORE_DISCLAIMER}
          </p>
        </Panel>

        <Panel className="space-y-3">
          <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Scale className="text-muted-foreground size-4" aria-hidden />
            Summary
          </h3>
          <BilingualText
            value={data.summary}
            as="p"
            className="text-sm leading-relaxed"
            viClassName="text-sm leading-relaxed"
          />
        </Panel>
      </div>

      {/* Formula -------------------------------------------------------------- */}
      <SubSection title="How the score is calculated" icon={Calculator}>
        <Panel className="space-y-4">
          <p className="text-sm">
            Each requirement has a weight from 1 to 5 and earns points according to its match level:
          </p>
          <p className="bg-muted overflow-x-auto rounded-md px-3 py-2 font-mono text-xs whitespace-nowrap sm:text-sm">
            score = Σ(weight × level points) ÷ Σ(weight) × 100 = {fmt(result.earnedPoints)} ÷ {fmt(result.maxPoints)} ×
            100 ≈ {result.score}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-sm">
              <caption className="sr-only">Points per match level and number of requirements at each level</caption>
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Level
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Points
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Requirements
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATCH_LEVELS.map((level) => (
                  <tr key={level} className="border-b last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      <MatchLevelBadge level={level} />
                    </th>
                    <td className="py-2 pr-3 text-right tabular-nums">{MATCH_LEVEL_POINTS[level].toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{result.byLevel[level]}</td>
                    <td className="text-muted-foreground py-2 text-right tabular-nums">
                      {total ? Math.round((result.byLevel[level] / total) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <BilingualText
            value={data.scoringNotes}
            as="p"
            className="text-muted-foreground text-xs"
            viClassName="text-xs"
          />
        </Panel>
      </SubSection>

      {/* Chart + category breakdown -------------------------------------------- */}
      <div className="grid gap-8 lg:grid-cols-2">
        <SubSection title="Requirements by match level" icon={BarChart3}>
          <figure className="bg-card rounded-xl border p-3">
            <div aria-hidden className="min-h-[220px]">
              <Suspense fallback={<Skeleton className="h-[220px] w-full" />}>
                <MatchLevelChart byLevel={result.byLevel} />
              </Suspense>
            </div>
            <figcaption className="text-muted-foreground mt-2 text-xs">
              Requirement counts per level. The same numbers are listed in the table above.
            </figcaption>
          </figure>
        </SubSection>

        <SubSection title="Breakdown by category" icon={Scale}>
          <div className="bg-card overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[20rem] text-sm">
              <caption className="sr-only">Score per requirement category</caption>
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th scope="col" className="p-3 font-medium">
                    Category
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Count
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Points
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATCH_CATEGORIES.map((cat) => {
                  const c = result.byCategory[cat];
                  return (
                    <tr key={cat} className="border-b last:border-0">
                      <th scope="row" className="p-3 text-left font-normal">
                        {MATCH_CATEGORY_LABELS[cat]}
                      </th>
                      <td className="p-3 text-right tabular-nums">{c.count}</td>
                      <td className="text-muted-foreground p-3 text-right tabular-nums">
                        {c.count ? `${fmt(c.earnedPoints)} / ${fmt(c.maxPoints)}` : "—"}
                      </td>
                      <td className="p-3 text-right font-medium tabular-nums">{c.count ? `${c.score}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SubSection>
      </div>

      {/* Requirements --------------------------------------------------------- */}
      <SubSection title="Requirement-by-requirement match" icon={ListFilter}>
        <div role="group" aria-label="Filter requirements by match level" className="flex flex-wrap gap-1.5">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")} count={total}>
            All
          </FilterButton>
          {MATCH_LEVELS.map((level) => (
            <FilterButton
              key={level}
              active={filter === level}
              onClick={() => setFilter(level)}
              count={result.byLevel[level]}
              disabled={result.byLevel[level] === 0}
            >
              {MATCH_LEVEL_LABELS[level]}
            </FilterButton>
          ))}
        </div>
        <p className="text-muted-foreground text-xs" aria-live="polite">
          Showing {visible.length} of {total} requirements
          {filter !== "all" ? ` (${MATCH_LEVEL_LABELS[filter]})` : ""}
        </p>

        {visible.length === 0 ? (
          <EmptyNote>No requirements at this level.</EmptyNote>
        ) : (
          <table className="md:bg-card block w-full text-sm md:table md:rounded-xl md:border">
            <caption className="sr-only">Job requirements compared with candidate experience</caption>
            <thead className="hidden md:table-header-group">
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th scope="col" className="p-3 font-medium">
                  Requirement
                </th>
                <th scope="col" className="p-3 font-medium">
                  Candidate experience
                </th>
                <th scope="col" className="p-3 font-medium">
                  Match
                </th>
                <th scope="col" className="p-3 font-medium">
                  Evidence
                </th>
                <th scope="col" className="p-3 font-medium">
                  Gap
                </th>
                <th scope="col" className="p-3 font-medium">
                  Improvement
                </th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {visible.map((req) => (
                <RequirementRow key={req.id} req={req} />
              ))}
            </tbody>
          </table>
        )}

        <Callout tone="info">
          <p>
            Evidence badges: <strong>Actual</strong> = real production experience, <strong>Theoretical</strong> =
            knowledge without hands-on use, <strong>Recommended approach</strong> = how you would tackle it. Never
            present theoretical knowledge as experience.
          </p>
        </Callout>
      </SubSection>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  count,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  disabled?: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
      )}
    >
      {children}
      <span className={cn("tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>{count}</span>
    </button>
  );
}
