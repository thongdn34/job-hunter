"use client";

import { memo } from "react";
import {
  Banknote,
  Boxes,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  Network,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { InterviewerQuestions } from "@/domain/package/schema";
import type { SectionProps } from "@/features/package-view/section-types";
import { BilingualText } from "@/components/common/BilingualText";
import { CopyButton } from "@/components/common/CopyButton";
import { Badge } from "@/components/ui/badge";
import { EmptyNote, SubSection } from "./shared/ui";

type Group = InterviewerQuestions["groups"][number];
type Question = Group["questions"][number];

const CATEGORY_META: Record<Group["category"], { label: string; icon: LucideIcon }> = {
  "technical-architecture": { label: "Technical architecture", icon: Boxes },
  "project-responsibilities": { label: "Project & responsibilities", icon: ClipboardList },
  "engineering-culture": { label: "Engineering culture", icon: Users },
  "team-structure": { label: "Team structure", icon: Network },
  "career-growth": { label: "Career growth", icon: GraduationCap },
  compensation: { label: "Compensation", icon: Banknote },
  "working-arrangements": { label: "Working arrangements", icon: CalendarClock },
  "interview-process": { label: "Interview process", icon: HelpCircle },
};

const QuestionItem = memo(function QuestionItem({ question, number }: { question: Question; number: number }) {
  return (
    <li className="flex items-start gap-3 px-3 py-3">
      <span className="text-muted-foreground mt-0.5 w-5 shrink-0 text-right text-xs tabular-nums" aria-hidden>
        {number}.
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <BilingualText value={question.text} as="p" className="text-sm font-medium" viClassName="text-sm font-normal" />
        {question.why && (
          <div className="text-muted-foreground text-xs">
            <span className="font-medium">Why ask: </span>
            <BilingualText value={question.why} className="text-xs" />
          </div>
        )}
      </div>
      <CopyButton
        text={question.text.en}
        label={`Copy question ${number}`}
        size="icon"
        variant="ghost"
        className="size-7 shrink-0"
      />
    </li>
  );
});

export function InterviewerQuestionsSection({ data }: SectionProps<"hr">) {
  if (data.groups.length === 0) return <EmptyNote>No questions prepared yet.</EmptyNote>;

  return (
    <div className="space-y-8">
      {data.groups.map((group, gi) => {
        const meta = CATEGORY_META[group.category];
        return (
          <SubSection
            key={`${group.category}-${gi}`}
            icon={meta.icon}
            title={
              <span className="flex flex-wrap items-center gap-2">
                <BilingualText value={group.title} className="text-base" viClassName="text-sm font-normal" />
              </span>
            }
            actions={
              <>
                <Badge variant="secondary" className="font-normal">
                  {meta.label}
                </Badge>
                <CopyButton
                  text={() => group.questions.map((q, i) => `${i + 1}. ${q.text.en}`).join("\n")}
                  label="Copy all (English)"
                  size="xs"
                />
              </>
            }
          >
            <ol className="bg-card divide-y rounded-lg border">
              {group.questions.map((q, i) => (
                <QuestionItem key={q.id} question={q} number={i + 1} />
              ))}
            </ol>
          </SubSection>
        );
      })}
    </div>
  );
}
