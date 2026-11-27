"use client";

import { memo, useCallback, useMemo } from "react";
import { DifficultyBadge, PriorityBadge } from "@/components/common/Badges";
import { CodeBlock } from "@/components/common/CodeBlock";
import { MermaidDiagram } from "@/components/common/MermaidDiagram";
import type { CodingExercise } from "@/domain/package/schema";
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
} from "./item-parts";

/** JSON-ish rendering of test-case values (never throws). */
export function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  try {
    const out = JSON.stringify(value);
    return out === undefined ? String(value) : out;
  } catch {
    return String(value);
  }
}

/** Formats positional args as a call argument list: `[1,2], 3`. */
export function formatArgs(args: readonly unknown[]): string {
  return args.map(formatValue).join(", ");
}

/** Section 9 — coding exercises as accordion items (numbered like the question bank, e.g. "Q51"). */
export function CodingSection({ pkg, data }: SectionProps<"coding">) {
  const slug = pkg.meta.slug;
  const exercises = useMemo(() => [...data.exercises].sort((a, b) => a.number - b.number), [data.exercises]);
  const ids = useMemo(() => exercises.map((e) => e.id), [exercises]);

  if (exercises.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">No exercises yet.</p>
    );
  }

  return (
    <div className="space-y-3" {...{ [ACCORDION_LIST_ATTR]: "" }}>
      <ItemListToolbar slug={slug} ids={ids} noun="exercises" />
      <div className="space-y-2">
        {exercises.map((e) => (
          <ExerciseItem key={e.id} exercise={e} slug={slug} />
        ))}
      </div>
    </div>
  );
}

export const ExerciseItem = memo(function ExerciseItem({ exercise, slug }: { exercise: CodingExercise; slug: string }) {
  const renderBody = useCallback(() => <ExerciseBody exercise={exercise} slug={slug} />, [exercise, slug]);
  return (
    <ItemAccordion
      id={exercise.id}
      header={
        <ItemHeader
          label={`Q${exercise.number}`}
          title={exercise.title}
          slug={slug}
          id={exercise.id}
          meta={
            <>
              <PriorityBadge priority={exercise.priority} />
              <DifficultyBadge difficulty={exercise.difficulty} />
            </>
          }
        />
      }
      renderBody={renderBody}
    />
  );
});

function ExerciseBody({ exercise: c, slug }: { exercise: CodingExercise; slug: string }) {
  return (
    <div className="space-y-5">
      <DetailBlock title="Problem statement">
        <BilingualParagraphs value={c.statement} />
      </DetailBlock>

      <DetailBlock title="Examples">
        <ol className="space-y-2">
          {c.examples.map((ex, i) => (
            <li key={i} className="bg-muted/30 rounded-lg border p-3 text-sm">
              <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground text-xs font-medium">Input</dt>
                <dd>
                  <code className="font-mono text-[13px] break-all">{ex.input}</code>
                </dd>
                <dt className="text-muted-foreground text-xs font-medium">Output</dt>
                <dd>
                  <code className="font-mono text-[13px] break-all">{ex.output}</code>
                </dd>
              </dl>
              {ex.explanation ? <BilingualParagraphs value={ex.explanation} className="mt-2" /> : null}
            </li>
          ))}
        </ol>
      </DetailBlock>

      {c.constraints.length > 0 ? (
        <DetailBlock title="Constraints">
          <ul className="list-disc space-y-1 pl-5 font-mono text-[13px]">
            {c.constraints.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </DetailBlock>
      ) : null}

      <DetailBlock title="Approach">
        <BilingualParagraphs value={c.approach} />
      </DetailBlock>

      <DetailBlock title="TypeScript solution">
        <CodeBlock block={c.solution} />
      </DetailBlock>

      <DetailBlock title="Step by step">
        <BilingualList items={c.steps} ordered />
      </DetailBlock>

      <DetailBlock title="Complexity">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Time</dt>
          <dd className="font-mono">{c.timeComplexity}</dd>
          <dt className="text-muted-foreground">Space</dt>
          <dd className="font-mono">{c.spaceComplexity}</dd>
        </dl>
      </DetailBlock>

      <DetailBlock title="Edge cases">
        <BilingualList items={c.edgeCases} />
      </DetailBlock>

      <DetailBlock title="Walkthrough">
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed">
          {c.walkthrough.steps.map((step, i) => (
            <li key={i} className="whitespace-pre-line">
              {step}
            </li>
          ))}
        </ol>
        {c.walkthrough.diagram ? <MermaidDiagram diagram={c.walkthrough.diagram} /> : null}
      </DetailBlock>

      <Callout title="Memory shortcut" value={c.memoryShortcut} tone="accent" />

      <FollowUpList followUps={[c.followUp]} title="Interviewer follow-up" />

      {c.alternative ? (
        <div className="space-y-2 rounded-lg border p-3">
          <BodyHeading>Alternative solution</BodyHeading>
          <BilingualParagraphs value={c.alternative.description} />
          {c.alternative.code ? <CodeBlock block={c.alternative.code} /> : null}
          <p className="text-muted-foreground text-xs">
            Complexity: <span className="font-mono">{c.alternative.complexity}</span>
          </p>
        </div>
      ) : null}

      <DetailBlock title="Test cases">
        <DataTable
          caption={`Test cases for ${c.functionName}`}
          columns={["Case", `${c.functionName}(…)`, "Expected"]}
          rows={c.testCases.map((t) => [
            t.name,
            <code key="a" className="font-mono text-xs break-all">
              {formatArgs(t.args)}
            </code>,
            <code key="e" className="font-mono text-xs break-all">
              {formatValue(t.expected)}
            </code>,
          ])}
        />
      </DetailBlock>

      <p className="text-muted-foreground text-xs">
        <span className="font-medium">JD requirement:</span> <span lang="en">{c.jdRequirement}</span>
      </p>

      <StudyActions slug={slug} id={c.id} />
    </div>
  );
}
