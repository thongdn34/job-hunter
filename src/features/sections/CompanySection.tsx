"use client";

import { memo } from "react";
import {
  AlertTriangle,
  Building2,
  FolderKanban,
  Link as LinkIcon,
  MessageCircleQuestion,
  Package,
  Users,
} from "lucide-react";
import type { Bilingual, Fact } from "@/domain/common/schema";
import type { SectionProps } from "@/features/package-view/section-types";
import { BilingualText } from "@/components/common/BilingualText";
import { CopyButton } from "@/components/common/CopyButton";
import { formatDate } from "./shared/text";
import { EmptyNote, ExternalLink, FactItem, FactList, FactMeta, SubSection } from "./shared/ui";

function OverviewCard({ label, fact }: { label: string; fact: Fact }) {
  return (
    <div className="bg-card flex flex-col gap-2 rounded-xl border p-4">
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className="flex flex-1 flex-col justify-between gap-2">
        <BilingualText
          value={fact.text}
          as="p"
          className="text-sm leading-relaxed"
          viClassName="text-sm leading-relaxed"
        />
        <FactMeta fact={fact} />
      </dd>
    </div>
  );
}

const RecruiterQuestion = memo(function RecruiterQuestion({ q, index }: { q: Bilingual; index: number }) {
  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <span className="text-muted-foreground mt-0.5 w-5 shrink-0 text-right text-xs tabular-nums" aria-hidden>
        {index + 1}.
      </span>
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        <BilingualText value={q} />
      </div>
      <CopyButton
        text={q.en}
        label={`Copy question ${index + 1}`}
        size="icon"
        variant="ghost"
        className="size-7 shrink-0"
      />
    </li>
  );
});

export function CompanySection({ data }: SectionProps<"company">) {
  return (
    <div className="space-y-8">
      <SubSection title="Overview" icon={Building2}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OverviewCard label="Company overview" fact={data.overview} />
          <OverviewCard label="Business model" fact={data.businessModel} />
          <OverviewCard label="Industry" fact={data.industry} />
          <OverviewCard label="Company size" fact={data.companySize} />
        </dl>
      </SubSection>

      <div className="grid gap-8 lg:grid-cols-2">
        <SubSection title="Products & services" icon={Package}>
          <FactList facts={data.productsAndServices} empty="No products or services recorded." />
        </SubSection>
        <SubSection title="Engineering culture" icon={Users}>
          <FactList facts={data.engineeringCulture} empty="No public information about engineering culture." />
        </SubSection>
      </div>

      <SubSection title="Projects you might work on" icon={FolderKanban}>
        <FactList facts={data.potentialProjects} empty="No potential projects identified." />
      </SubSection>

      <SubSection title="Application risks" icon={AlertTriangle}>
        {data.applicationRisks.length === 0 ? (
          <EmptyNote>No application risks identified.</EmptyNote>
        ) : (
          <ul className="space-y-2">
            {data.applicationRisks.map((risk, i) => (
              <li
                key={i}
                className="flex gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-amber-950 dark:text-amber-100"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="sr-only">Risk: </span>
                <FactItem fact={risk} className="min-w-0 flex-1" />
              </li>
            ))}
          </ul>
        )}
      </SubSection>

      <SubSection
        title="Questions to ask the recruiter"
        icon={MessageCircleQuestion}
        actions={
          data.recruiterQuestions.length > 0 ? (
            <CopyButton
              text={() => data.recruiterQuestions.map((q, i) => `${i + 1}. ${q.en}`).join("\n")}
              label="Copy all (English)"
              size="xs"
            />
          ) : null
        }
      >
        {data.recruiterQuestions.length === 0 ? (
          <EmptyNote>No recruiter questions.</EmptyNote>
        ) : (
          <ol className="bg-card divide-y rounded-lg border">
            {data.recruiterQuestions.map((q, i) => (
              <RecruiterQuestion key={i} q={q} index={i} />
            ))}
          </ol>
        )}
      </SubSection>

      <SubSection title="Sources" icon={LinkIcon}>
        {data.sources.length === 0 ? (
          <NoSources />
        ) : (
          <ul className="space-y-2 text-sm">
            {data.sources.map((s) => (
              <li key={s.url} className="flex flex-wrap items-baseline gap-x-2">
                <ExternalLink href={s.url}>{s.title || undefined}</ExternalLink>
                {s.accessedAt && (
                  <span className="text-muted-foreground text-xs">
                    accessed <time dateTime={s.accessedAt}>{formatDate(s.accessedAt)}</time>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </SubSection>
    </div>
  );
}

function NoSources() {
  return <EmptyNote>No sources recorded — treat every company fact above as unverified.</EmptyNote>;
}
