"use client";

import { useMemo } from "react";
import {
  Boxes,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Gift,
  Link as LinkIcon,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import type { Fact, VerificationStatus } from "@/domain/common/schema";
import { VERIFICATION_STATUSES } from "@/domain/common/schema";
import type { SectionProps } from "@/features/package-view/section-types";
import { BilingualText } from "@/components/common/BilingualText";
import { VerificationBadge } from "@/components/common/Badges";
import { MermaidDiagram } from "@/components/common/MermaidDiagram";
import { countFactsByStatus, formatDate } from "./shared/text";
import { BilingualList, Callout, EmptyNote, ExternalLink, FactList, FactMeta, Panel, SubSection } from "./shared/ui";

const STATUS_LEGEND: Record<VerificationStatus, string> = {
  verified: "Confirmed from a cited source (job posting or company site).",
  unverified: "Stated somewhere but not confirmed — treat with caution.",
  assumption: "Inferred by the generator — confirm with the recruiter before relying on it.",
};

function KeyFact({ label, fact }: { label: string; fact: Fact }) {
  return (
    <div className="bg-card space-y-1.5 rounded-lg border p-3">
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className="space-y-1.5">
        <BilingualText value={fact.text} as="p" className="text-sm font-medium" viClassName="text-sm font-normal" />
        <FactMeta fact={fact} />
      </dd>
    </div>
  );
}

export function JdSection({ data }: SectionProps<"jd">) {
  const statusCounts = useMemo(
    () =>
      countFactsByStatus([
        data.jobTitle,
        data.company,
        data.location,
        data.workingArrangement,
        data.seniority,
        data.compensation,
        ...data.responsibilities,
        ...data.requiredSkills,
        ...data.preferredSkills,
        ...data.benefits,
        ...data.keyExpectations,
        ...data.inferredArchitecture.components,
      ]),
    [data],
  );

  return (
    <div className="space-y-8">
      <SubSection title="Key facts" icon={Briefcase}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KeyFact label="Job title" fact={data.jobTitle} />
          <KeyFact label="Company" fact={data.company} />
          <KeyFact label="Location" fact={data.location} />
          <KeyFact label="Working arrangement" fact={data.workingArrangement} />
          <KeyFact label="Seniority" fact={data.seniority} />
          {data.compensation ? (
            <KeyFact label="Compensation" fact={data.compensation} />
          ) : (
            <div className="bg-muted/30 space-y-1.5 rounded-lg border border-dashed p-3">
              <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Compensation</dt>
              <dd className="space-y-1.5">
                <VerificationBadge status="unverified" />
                <p className="text-muted-foreground text-sm">
                  Not verified — not published in the job posting. Ask the recruiter for the range.
                </p>
              </dd>
            </div>
          )}
        </dl>
      </SubSection>

      <div className="grid gap-8 lg:grid-cols-2">
        <SubSection title="Responsibilities" icon={ClipboardList}>
          <FactList facts={data.responsibilities} />
        </SubSection>
        <SubSection title="Key expectations" icon={Target}>
          <FactList facts={data.keyExpectations} />
        </SubSection>
        <SubSection title="Required skills" icon={ListChecks}>
          <FactList facts={data.requiredSkills} />
        </SubSection>
        <SubSection title="Preferred skills" icon={Sparkles}>
          <FactList facts={data.preferredSkills} empty="No preferred skills listed." />
        </SubSection>
        <SubSection title="Benefits" icon={Gift} className="lg:col-span-2">
          <FactList facts={data.benefits} empty="No benefits listed in the posting." />
        </SubSection>
      </div>

      <SubSection title="Inferred architecture" icon={Boxes}>
        <Callout tone="warning" title="Inference, not a fact">
          <p>Built from clues in the posting. Confirm the real stack and architecture during the interview.</p>
        </Callout>
        <BilingualText
          value={data.inferredArchitecture.summary}
          as="p"
          className="text-sm leading-relaxed"
          viClassName="text-sm leading-relaxed"
        />
        <FactList facts={data.inferredArchitecture.components} empty="No components inferred." />
        {data.inferredArchitecture.diagram && <MermaidDiagram diagram={data.inferredArchitecture.diagram} />}
      </SubSection>

      <SubSection title="Verification" icon={ShieldCheck}>
        <Panel className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">Overall status:</span>
            <VerificationBadge status={data.verification.overallStatus} />
            {data.verification.checkedAt && (
              <span className="text-muted-foreground text-xs">
                Checked <time dateTime={data.verification.checkedAt}>{formatDate(data.verification.checkedAt)}</time>
              </span>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">Legend</h4>
            <dl className="grid gap-2 sm:grid-cols-3">
              {VERIFICATION_STATUSES.map((s) => (
                <div key={s} className="space-y-1 rounded-lg border p-2.5">
                  <dt className="flex items-center justify-between gap-2">
                    <VerificationBadge status={s} />
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {statusCounts[s]} {statusCounts[s] === 1 ? "fact" : "facts"}
                    </span>
                  </dt>
                  <dd className="text-muted-foreground text-xs">{STATUS_LEGEND[s]}</dd>
                </div>
              ))}
            </dl>
          </div>

          {data.verification.notes.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <CheckCircle2 className="text-muted-foreground size-4" aria-hidden />
                Notes
              </h4>
              <BilingualList items={data.verification.notes} />
            </div>
          )}
        </Panel>
      </SubSection>

      <SubSection title="Sources" icon={LinkIcon}>
        {data.sourceUrls.length === 0 ? (
          <EmptyNote>No source URLs recorded.</EmptyNote>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {data.sourceUrls.map((url) => (
              <li key={url}>
                <ExternalLink href={url} />
              </li>
            ))}
          </ul>
        )}
      </SubSection>
    </div>
  );
}
