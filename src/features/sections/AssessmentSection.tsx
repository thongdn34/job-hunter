"use client";

import { useId, useMemo } from "react";
import {
  AlertTriangle,
  CircleCheck,
  CircleHelp,
  Clock,
  Crosshair,
  Gauge,
  ShieldCheck,
  Star,
  Target,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { FinalAssessment } from "@/domain/package/schema";
import { MATCH_SCORE_DISCLAIMER, computeMatchScore } from "@/domain/match/score";
import type { SectionProps } from "@/features/package-view/section-types";
import { BilingualText } from "@/components/common/BilingualText";
import { PriorityBadge } from "@/components/common/Badges";
import { cn } from "@/lib/utils";
import { sortByPriority } from "./shared/text";
import { BilingualList, EmptyNote, Panel, SubSection } from "./shared/ui";

type Decision = FinalAssessment["recommendation"]["decision"];

const DECISION_META: Record<Decision, { label: string; icon: LucideIcon; className: string }> = {
  "apply-now": {
    label: "Apply now",
    icon: CircleCheck,
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  },
  "apply-after-prep": {
    label: "Apply after preparation",
    icon: Clock,
    className: "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  },
  "clarify-first": {
    label: "Clarify with the recruiter first",
    icon: CircleHelp,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  "not-recommended": {
    label: "Not recommended",
    icon: XCircle,
    className: "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200",
  },
};

export function AssessmentSection({ pkg, data }: SectionProps<"assessment">) {
  const recId = useId();
  const decision = DECISION_META[data.recommendation.decision];
  const DecisionIcon = decision.icon;
  const gaps = useMemo(() => sortByPriority(data.knowledgeGaps, (g) => g.priority), [data.knowledgeGaps]);
  const matchRequirements = pkg.sections.match?.requirements;
  const score = useMemo(
    () => (matchRequirements ? computeMatchScore(matchRequirements).score : null),
    [matchRequirements],
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,20rem)]">
        <Panel className="space-y-2">
          <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Gauge className="text-muted-foreground size-4" aria-hidden />
            Overall match
          </h3>
          <BilingualText
            value={data.overallMatch}
            as="p"
            className="text-sm leading-relaxed"
            viClassName="text-sm leading-relaxed"
          />
          {score !== null && (
            <p className="text-muted-foreground pt-1 text-xs">
              Computed match estimate: <span className="text-foreground font-semibold tabular-nums">{score}/100</span> ·{" "}
              {MATCH_SCORE_DISCLAIMER}
            </p>
          )}
        </Panel>

        <section aria-labelledby={recId} className={cn("space-y-2 rounded-xl border p-4", decision.className)}>
          <h3 id={recId} className="text-xs font-medium tracking-wide uppercase opacity-80">
            Recommendation
          </h3>
          <p className="flex items-center gap-2 text-base font-semibold" data-decision={data.recommendation.decision}>
            <DecisionIcon className="size-5 shrink-0" aria-hidden />
            {decision.label}
          </p>
          <BilingualText
            value={data.recommendation.rationale}
            as="p"
            className="text-sm"
            viClassName="text-sm opacity-90"
          />
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <SubSection title="Strongest selling points" icon={Star}>
          <BilingualList items={data.sellingPoints} />
        </SubSection>

        <SubSection title="Main gaps" icon={Crosshair}>
          {gaps.length === 0 ? (
            <EmptyNote>No gaps identified.</EmptyNote>
          ) : (
            <ul className="bg-card divide-y rounded-lg border">
              {gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-3 px-3 py-2.5">
                  <PriorityBadge priority={g.priority} className="mt-0.5 shrink-0" />
                  <BilingualText value={g.gap} as="p" className="text-sm" viClassName="text-sm" />
                </li>
              ))}
            </ul>
          )}
        </SubSection>
      </div>

      <SubSection title="Interview priorities" icon={Target}>
        <BilingualList items={data.interviewPriorities} ordered />
      </SubSection>

      <SubSection title="Verification notes" icon={ShieldCheck}>
        <BilingualList items={data.verificationNotes} empty="No verification notes." />
      </SubSection>

      <SubSection title="Unsupported claims & assumptions" icon={AlertTriangle}>
        {data.unsupportedClaims.length === 0 ? (
          <EmptyNote>No unsupported claims found.</EmptyNote>
        ) : (
          <ul className="space-y-2">
            {data.unsupportedClaims.map((claim, i) => (
              <li
                key={i}
                className="flex gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-100"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <span className="sr-only">Unsupported: </span>
                  <BilingualText value={claim} viClassName="text-amber-900/80 dark:text-amber-100/80" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SubSection>
    </div>
  );
}
