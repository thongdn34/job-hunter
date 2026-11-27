"use client";

import { memo, useCallback } from "react";
import { DifficultyBadge, PriorityBadge } from "@/components/common/Badges";
import { useVisibleLanguages } from "@/components/common/BilingualText";
import { CodeBlock } from "@/components/common/CodeBlock";
import { CopyButton } from "@/components/common/CopyButton";
import { Markdown } from "@/components/common/Markdown";
import { MermaidDiagram } from "@/components/common/MermaidDiagram";
import { Badge } from "@/components/ui/badge";
import type { InterviewQuestion } from "@/domain/package/schema";
import { RegenerateItemButton } from "@/features/generation/RegenerateItemButton";
import { ItemAccordion, type HeadingLevel } from "./ItemAccordion";
import {
  BilingualParagraphs,
  Callout,
  DetailBlock,
  ExperienceRefView,
  FollowUpList,
  ItemHeader,
  StudyActions,
  ViParagraph,
} from "./item-parts";

interface QuestionItemProps {
  question: InterviewQuestion;
  slug: string;
  /** Show the per-item regenerate action (generated packages only). */
  canRegenerate: boolean;
  /** Stable callback; toggles studied and syncs topic completion. */
  onToggleStudied: (questionId: string) => void;
  headingLevel?: HeadingLevel;
  /** Extra classes for the accordion wrapper (e.g. scroll margin under sticky toolbars). */
  className?: string;
}

/** One Section 7 question as an accordion item. Memoized: re-renders only when its props change. */
export const QuestionItem = memo(function QuestionItem({
  question,
  slug,
  canRegenerate,
  onToggleStudied,
  headingLevel = 4,
  className,
}: QuestionItemProps) {
  const renderBody = useCallback(
    () => (
      <QuestionBody question={question} slug={slug} canRegenerate={canRegenerate} onToggleStudied={onToggleStudied} />
    ),
    [question, slug, canRegenerate, onToggleStudied],
  );

  return (
    <ItemAccordion
      id={question.id}
      headingLevel={headingLevel}
      className={className}
      header={
        <ItemHeader
          label={`Q${question.number}`}
          title={question.question}
          slug={slug}
          id={question.id}
          meta={
            <>
              <PriorityBadge priority={question.priority} />
              <DifficultyBadge difficulty={question.difficulty} />
            </>
          }
        />
      }
      renderBody={renderBody}
    />
  );
});

function QuestionBody({
  question: q,
  slug,
  canRegenerate,
  onToggleStudied,
}: Omit<QuestionItemProps, "headingLevel" | "className">) {
  const { vi } = useVisibleLanguages();
  return (
    <div className="space-y-5">
      <DetailBlock
        title="Recommended English answer"
        actions={<CopyButton text={q.answer} label="Copy English answer" size="xs" />}
      >
        <p lang="en" className="text-sm leading-relaxed whitespace-pre-line">
          {q.answer}
        </p>
      </DetailBlock>

      {vi ? (
        <DetailBlock title={<span lang="vi">Giải thích (Tiếng Việt)</span>}>
          <ViParagraph>{q.viExplanation}</ViParagraph>
        </DetailBlock>
      ) : null}

      <DetailBlock title="Technical explanation">
        <Markdown source={q.technicalExplanation} />
      </DetailBlock>

      <DetailBlock title="Practical example">
        <BilingualParagraphs value={q.practicalExample.description} />
        {q.practicalExample.code ? <CodeBlock block={q.practicalExample.code} /> : null}
      </DetailBlock>

      {q.diagram ? (
        <DetailBlock title="Diagram">
          <MermaidDiagram diagram={q.diagram} />
        </DetailBlock>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Callout title="Memory shortcut" value={q.memoryShortcut} tone="accent" />
        <Callout title="Key takeaway" value={q.keyTakeaway} />
      </div>

      <FollowUpList followUps={q.followUps} />

      <DetailBlock title="Context">
        <dl className="grid gap-3 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-4">
          <dt className="text-muted-foreground font-medium">JD requirement</dt>
          <dd lang="en">{q.jdRequirement}</dd>
          {q.candidateExperience ? (
            <>
              <dt className="text-muted-foreground font-medium">Related experience</dt>
              <dd>
                <ExperienceRefView value={q.candidateExperience} />
              </dd>
            </>
          ) : null}
          {q.tags.length > 0 ? (
            <>
              <dt className="text-muted-foreground font-medium">Tags</dt>
              <dd>
                <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                  {q.tags.map((tag) => (
                    <li key={tag}>
                      <Badge variant="secondary" className="font-mono">
                        {tag}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          ) : null}
        </dl>
      </DetailBlock>

      <StudyActions slug={slug} id={q.id} onToggleStudied={onToggleStudied}>
        {canRegenerate ? <RegenerateItemButton packageSlug={slug} itemId={q.id} /> : null}
      </StudyActions>
    </div>
  );
}
