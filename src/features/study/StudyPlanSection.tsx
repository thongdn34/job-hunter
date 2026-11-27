"use client";

import { memo, useId, useMemo, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import type { InterviewPackage, StudyPlan, StudyTask } from "@/domain/package/schema";
import type { SectionProps } from "@/features/package-view/section-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { BilingualText, pickText } from "@/components/common/BilingualText";
import { PriorityBadge } from "@/components/common/Badges";
import { useProgressStore } from "@/stores/progress-store";
import { useLanguage } from "@/stores/preferences-store";
import { useProgressHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { RelatedItemLinks } from "./RelatedItemLinks";
import { StatBar } from "./StatBar";
import { formatMinutes, overallPlanStats, planStats, type CompletionStats } from "./stats";

const EMPTY: readonly string[] = [];

/** Section 13 — 1/3/7-day study plans with persisted task checkboxes and progress. */
export function StudyPlanSection({ pkg, data }: SectionProps<"studyPlan">) {
  const slug = pkg.meta.slug;
  const hydrated = useProgressHydrated();
  const language = useLanguage();
  const completedList = useProgressStore((s) => s.byPackage[slug]?.studyPlanTasks ?? EMPTY);
  const completed = useMemo(() => new Set(completedList), [completedList]);
  /**
   * "Show only remaining" hides the tasks that were done when the filter was turned on (or the
   * plan tab changed), not the live set: checking a task keeps its row visible (struck through) so
   * the focused checkbox isn't unmounted and keyboard focus doesn't fall back to <body>.
   */
  const [hiddenTasks, setHiddenTasks] = useState<ReadonlySet<string> | null>(null);
  const onlyRemaining = hiddenTasks !== null;
  const snapshotCompleted = () => new Set(useProgressStore.getState().byPackage[slug]?.studyPlanTasks ?? EMPTY);
  const switchId = useId();

  const plans = data.plans;
  const overall = useMemo(() => overallPlanStats(plans, completed), [plans, completed]);
  const perPlan = useMemo(() => new Map(plans.map((p) => [p.id, planStats(p, completed)])), [plans, completed]);

  if (plans.length === 0) {
    return <p className="text-muted-foreground text-sm">No study plan available yet.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-card rounded-xl border p-4">
        <ProgressSummary label="Overall study plan progress" stats={overall} hydrated={hydrated} />
      </div>

      <Tabs
        defaultValue={plans[0].id}
        className="gap-4"
        onValueChange={() => setHiddenTasks((h) => (h ? snapshotCompleted() : h))}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList aria-label="Study plan length" className="w-full sm:w-fit">
            {plans.map((plan) => (
              <TabsTrigger key={plan.id} value={plan.id} className="gap-1.5 px-3">
                <span>{pickText(plan.title, language === "vi" ? "vi" : "en")}</span>
                {hydrated && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {perPlan.get(plan.id)?.percent ?? 0}%
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-2">
            <Switch
              id={switchId}
              checked={onlyRemaining}
              onCheckedChange={(on) => setHiddenTasks(on ? snapshotCompleted() : null)}
              nativeButton
              render={<button type="button" />}
            />
            <label htmlFor={switchId} className="text-sm select-none">
              Show only remaining
            </label>
          </div>
        </div>

        {plans.map((plan) => (
          <TabsContent key={plan.id} value={plan.id} className="flex flex-col gap-4">
            <ProgressSummary
              label={`${plan.title.en} progress`}
              stats={perPlan.get(plan.id) ?? planStats(plan, completed)}
              hydrated={hydrated}
            />
            <PlanDays plan={plan} pkg={pkg} completed={completed} hiddenTasks={hiddenTasks} hydrated={hydrated} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ProgressSummary({ label, stats, hydrated }: { label: string; stats: CompletionStats; hydrated: boolean }) {
  if (!hydrated) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }
  return (
    <StatBar
      label={label}
      value={stats.percent}
      detail={
        <>
          {stats.completed}/{stats.total} tasks · {formatMinutes(stats.minutesRemaining)} remaining
        </>
      }
    />
  );
}

interface PlanDaysProps {
  plan: StudyPlan;
  pkg: InterviewPackage;
  completed: Set<string>;
  /** Tasks hidden by "Show only remaining" (a snapshot), or null when the filter is off. */
  hiddenTasks: ReadonlySet<string> | null;
  hydrated: boolean;
}

function PlanDays({ plan, pkg, completed, hiddenTasks, hydrated }: PlanDaysProps) {
  const hidden = hydrated ? hiddenTasks : null;
  const anyShown = plan.days.some((d) => d.tasks.some((t) => !hidden?.has(t.id)));
  if (hidden && !anyShown) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed p-6 text-sm">
        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
        Every task in this plan is done.
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-4">
      {plan.days.map((day) => {
        const tasks = hidden ? day.tasks.filter((t) => !hidden.has(t.id)) : day.tasks;
        const doneCount = day.tasks.filter((t) => completed.has(t.id)).length;
        const minutes = day.tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
        return (
          <li key={day.day} className="bg-card rounded-xl border">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
              <h4 className="font-semibold">
                <span className="text-muted-foreground mr-2">Day {day.day}</span>
                <BilingualText value={day.focus} viClassName="text-sm font-normal" />
              </h4>
              <span className="text-muted-foreground text-xs tabular-nums">
                {hydrated ? `${doneCount}/${day.tasks.length} done · ` : ""}
                {formatMinutes(minutes)}
              </span>
            </div>
            {tasks.length === 0 ? (
              <p className="text-muted-foreground px-4 py-3 text-sm">All tasks for this day are done.</p>
            ) : (
              <ul className="divide-y">
                {tasks.map((task) => (
                  <TaskRow key={task.id} slug={pkg.meta.slug} pkg={pkg} task={task} checked={completed.has(task.id)} />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface TaskRowProps {
  slug: string;
  pkg: InterviewPackage;
  task: StudyTask;
  checked: boolean;
}

const TaskRow = memo(function TaskRow({ slug, pkg, task, checked }: TaskRowProps) {
  const titleId = useId();
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            className="mt-0.5"
            checked={checked}
            aria-labelledby={titleId}
            onCheckedChange={(on) => useProgressStore.getState().setIn(slug, "studyPlanTasks", task.id, on)}
          />
          <span
            id={titleId}
            className={cn("text-sm leading-snug", checked && "text-muted-foreground line-through decoration-1")}
          >
            <BilingualText value={task.title} />
          </span>
        </label>
        <div className="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs tabular-nums">
            <Clock className="size-3.5" aria-hidden />
            <span className="sr-only">Duration:</span>
            {formatMinutes(task.durationMinutes)}
          </span>
          <PriorityBadge priority={task.priority} />
        </div>
      </div>
      <RelatedItemLinks pkg={pkg} ids={task.relatedItemIds} className="pl-7" label="Related items for this task" />
    </li>
  );
});
