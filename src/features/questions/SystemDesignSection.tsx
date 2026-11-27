"use client";

import { memo, useCallback, useMemo } from "react";
import { DifficultyBadge, PriorityBadge } from "@/components/common/Badges";
import { useVisibleLanguages } from "@/components/common/BilingualText";
import { CopyButton } from "@/components/common/CopyButton";
import { Markdown } from "@/components/common/Markdown";
import { MermaidDiagram } from "@/components/common/MermaidDiagram";
import type { SystemDesignScenario } from "@/domain/package/schema";
import type { SectionProps } from "@/features/package-view/section-types";
import { ACCORDION_LIST_ATTR, ItemAccordion } from "./ItemAccordion";
import { ItemListToolbar } from "./ItemListToolbar";
import {
  BilingualList,
  BilingualParagraphs,
  BodyHeading,
  Callout,
  DataTable,
  DetailBlock,
  FollowUpList,
  ItemHeader,
  StudyActions,
  ViParagraph,
} from "./item-parts";

/** Section 8 — system design scenarios as accordion items ("SD1", "SD2", …). */
export function SystemDesignSection({ pkg, data }: SectionProps<"systemDesign">) {
  const slug = pkg.meta.slug;
  const scenarios = useMemo(() => [...data.scenarios].sort((a, b) => a.number - b.number), [data.scenarios]);
  const ids = useMemo(() => scenarios.map((s) => s.id), [scenarios]);

  if (scenarios.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">No scenarios yet.</p>
    );
  }

  return (
    <div className="space-y-3" {...{ [ACCORDION_LIST_ATTR]: "" }}>
      <ItemListToolbar slug={slug} ids={ids} noun="scenarios" />
      <div className="space-y-2">
        {scenarios.map((s) => (
          <ScenarioItem key={s.id} scenario={s} slug={slug} />
        ))}
      </div>
    </div>
  );
}

export const ScenarioItem = memo(function ScenarioItem({
  scenario,
  slug,
}: {
  scenario: SystemDesignScenario;
  slug: string;
}) {
  const renderBody = useCallback(() => <ScenarioBody scenario={scenario} slug={slug} />, [scenario, slug]);
  return (
    <ItemAccordion
      id={scenario.id}
      header={
        <ItemHeader
          label={`SD${scenario.number}`}
          title={scenario.title}
          slug={slug}
          id={scenario.id}
          meta={
            <>
              <PriorityBadge priority={scenario.priority} />
              <DifficultyBadge difficulty={scenario.difficulty} />
            </>
          }
        />
      }
      renderBody={renderBody}
    />
  );
});

const CONCERNS = [
  ["stateManagement", "State management"],
  ["scalability", "Scalability"],
  ["performance", "Performance"],
  ["security", "Security"],
  ["reliability", "Reliability"],
  ["errorRecovery", "Error recovery"],
  ["monitoring", "Monitoring"],
] as const satisfies ReadonlyArray<readonly [keyof SystemDesignScenario, string]>;

function ScenarioBody({ scenario: s, slug }: { scenario: SystemDesignScenario; slug: string }) {
  const { vi } = useVisibleLanguages();
  return (
    <div className="space-y-5">
      <DetailBlock title="Prompt">
        <BilingualParagraphs value={s.prompt} />
      </DetailBlock>

      <div className="grid gap-4 md:grid-cols-2">
        <DetailBlock title="Functional requirements">
          <BilingualList items={s.functionalRequirements} />
        </DetailBlock>
        <DetailBlock title="Non-functional requirements">
          <BilingualList items={s.nonFunctionalRequirements} />
        </DetailBlock>
      </div>

      <DetailBlock title="Clarifying questions">
        <BilingualList items={s.clarifyingQuestions} ordered />
      </DetailBlock>

      <DetailBlock title="High-level architecture">
        <Markdown source={s.highLevelArchitecture} />
        <MermaidDiagram diagram={s.architectureDiagram} />
      </DetailBlock>

      <DetailBlock title="Component responsibilities">
        <DataTable
          caption="Component responsibilities"
          columns={["Component", "Responsibility"]}
          rows={s.componentResponsibilities.map((c) => [
            <span key="n" className="font-mono text-xs">
              {c.name}
            </span>,
            <BilingualParagraphs key="r" value={c.responsibility} />,
          ])}
        />
      </DetailBlock>

      <DetailBlock title="Data flow">
        <Markdown source={s.dataFlow} />
      </DetailBlock>

      <DetailBlock title="API design">
        <Markdown source={s.apiDesign} />
      </DetailBlock>

      <div className="grid gap-3 md:grid-cols-2">
        {CONCERNS.map(([key, label]) => (
          <div key={key} className="rounded-lg border p-3">
            <BodyHeading className="mb-1.5">{label}</BodyHeading>
            <Markdown source={s[key]} />
          </div>
        ))}
      </div>

      <DetailBlock title="Trade-offs">
        <DataTable
          caption="Trade-offs"
          columns={["Decision", "Pros", "Cons"]}
          rows={s.tradeOffs.map((t) => [t.decision, t.pros, t.cons])}
        />
      </DetailBlock>

      <DetailBlock
        title="Recommended English answer"
        actions={<CopyButton text={s.recommendedAnswer} label="Copy English answer" size="xs" />}
      >
        <p lang="en" className="text-sm leading-relaxed whitespace-pre-line">
          {s.recommendedAnswer}
        </p>
      </DetailBlock>

      {vi ? (
        <DetailBlock title={<span lang="vi">Giải thích (Tiếng Việt)</span>}>
          <ViParagraph>{s.viExplanation}</ViParagraph>
        </DetailBlock>
      ) : null}

      <DetailBlock title="Sequence diagram">
        <MermaidDiagram diagram={s.sequenceDiagram} />
      </DetailBlock>

      <Callout title="Memory shortcut" value={s.memoryShortcut} tone="accent" />

      <FollowUpList followUps={s.followUps} />

      <StudyActions slug={slug} id={s.id} />
    </div>
  );
}
