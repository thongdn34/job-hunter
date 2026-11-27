"use client";

import { memo, useCallback, useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import { DifficultyBadge, PriorityBadge } from "@/components/common/Badges";
import { useVisibleLanguages } from "@/components/common/BilingualText";
import { CopyButton } from "@/components/common/CopyButton";
import { Badge } from "@/components/ui/badge";
import type { Bilingual } from "@/domain/common/schema";
import type { BehavioralQuestion } from "@/domain/package/schema";
import type { SectionProps } from "@/features/package-view/section-types";
import { ACCORDION_LIST_ATTR, ItemAccordion } from "./ItemAccordion";
import { ItemListToolbar } from "./ItemListToolbar";
import {
  BilingualList,
  BodyHeading,
  Callout,
  DetailBlock,
  ExperienceRefView,
  FollowUpList,
  ItemHeader,
  StudyActions,
} from "./item-parts";

const STAR_PARTS = [
  ["situation", "S", "Situation", "Tình huống"],
  ["task", "T", "Task", "Nhiệm vụ"],
  ["action", "A", "Action", "Hành động"],
  ["result", "R", "Result", "Kết quả"],
] as const;

/** Plain-text English STAR answer for the clipboard. */
export function buildStarAnswer(q: BehavioralQuestion): string {
  return STAR_PARTS.map(([key, , label]) => `${label}: ${q.star[key].en}`).join("\n\n");
}

/** Section 10 — behavioral (STAR) questions as accordion items (e.g. "Q56"). */
export function BehavioralSection({ pkg, data }: SectionProps<"star">) {
  const slug = pkg.meta.slug;
  const questions = useMemo(() => [...data.questions].sort((a, b) => a.number - b.number), [data.questions]);
  const ids = useMemo(() => questions.map((q) => q.id), [questions]);

  if (questions.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        No behavioral questions yet.
      </p>
    );
  }

  return (
    <div className="space-y-3" {...{ [ACCORDION_LIST_ATTR]: "" }}>
      <ItemListToolbar slug={slug} ids={ids} noun="questions" />
      <div className="space-y-2">
        {questions.map((q) => (
          <BehavioralItem key={q.id} question={q} slug={slug} />
        ))}
      </div>
    </div>
  );
}

export const BehavioralItem = memo(function BehavioralItem({
  question,
  slug,
}: {
  question: BehavioralQuestion;
  slug: string;
}) {
  const renderBody = useCallback(() => <BehavioralBody question={question} slug={slug} />, [question, slug]);
  return (
    <ItemAccordion
      id={question.id}
      header={
        <ItemHeader
          label={`Q${question.number}`}
          title={question.question}
          slug={slug}
          id={question.id}
          meta={
            <>
              <Badge variant="secondary">{question.competency}</Badge>
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

function StarCell({
  letter,
  label,
  viLabel,
  value,
}: {
  letter: string;
  label: string;
  viLabel: string;
  value: Bilingual;
}) {
  const { en, vi } = useVisibleLanguages();
  return (
    <div className="space-y-1.5 rounded-lg border p-3">
      <BodyHeading className="flex items-center gap-2 normal-case">
        <span
          aria-hidden
          className="bg-primary text-primary-foreground inline-flex size-6 items-center justify-center rounded-md text-xs font-bold"
        >
          {letter}
        </span>
        <span className="text-foreground text-sm font-semibold">
          {en ? <span lang="en">{label}</span> : null}
          {en && vi ? <span aria-hidden> · </span> : null}
          {vi ? (
            <span lang="vi" className={en ? "text-muted-foreground font-normal" : undefined}>
              {viLabel}
            </span>
          ) : null}
        </span>
      </BodyHeading>
      {en ? (
        <p lang="en" className="text-sm leading-relaxed whitespace-pre-line">
          {value.en}
        </p>
      ) : null}
      {vi ? (
        <p
          lang="vi"
          className={
            en
              ? "text-muted-foreground text-sm leading-relaxed whitespace-pre-line"
              : "text-sm leading-relaxed whitespace-pre-line"
          }
        >
          {value.vi}
        </p>
      ) : null}
    </div>
  );
}

function BehavioralBody({ question: q, slug }: { question: BehavioralQuestion; slug: string }) {
  return (
    <div className="space-y-5">
      <DetailBlock title="Story source">
        <ExperienceRefView value={q.source} />
        {q.source.kind !== "actual" ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            This is a template — replace it with a real story before using it in an interview.
          </p>
        ) : null}
      </DetailBlock>

      <DetailBlock
        title="STAR answer"
        actions={<CopyButton text={() => buildStarAnswer(q)} label="Copy English STAR answer" size="xs" />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {STAR_PARTS.map(([key, letter, label, viLabel]) => (
            <StarCell key={key} letter={letter} label={label} viLabel={viLabel} value={q.star[key]} />
          ))}
        </div>
      </DetailBlock>

      {q.cautions.length > 0 ? (
        <div role="note" className="border-destructive/30 bg-destructive/5 space-y-2 rounded-lg border p-3">
          <BodyHeading className="text-destructive flex items-center gap-1.5">
            <TriangleAlert className="size-3.5" aria-hidden />
            Do not claim
          </BodyHeading>
          <BilingualList items={q.cautions} />
        </div>
      ) : null}

      <Callout title="Memory shortcut" value={q.memoryShortcut} tone="accent" />

      <FollowUpList followUps={[q.followUp]} title="Interviewer follow-up" />

      <StudyActions slug={slug} id={q.id} />
    </div>
  );
}
