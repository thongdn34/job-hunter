"use client";

import { memo, useId, useMemo } from "react";
import { Boxes, CheckSquare, Gauge, GraduationCap, Layers, ListTodo, Target, TestTube2 } from "lucide-react";
import type { Bilingual } from "@/domain/common/schema";
import type { SectionProps } from "@/features/package-view/section-types";
import { BilingualText } from "@/components/common/BilingualText";
import { PriorityBadge } from "@/components/common/Badges";
import { MermaidDiagram } from "@/components/common/MermaidDiagram";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { useProgressStore } from "@/stores/progress-store";
import { cn } from "@/lib/utils";
import { sortByPriority } from "./shared/text";
import { BilingualList, ChipList, Panel, SubSection } from "./shared/ui";

const ChecklistItem = memo(function ChecklistItem({ slug, id, text }: { slug: string; id: string; text: Bilingual }) {
  const checked = useProgressStore((s) => Boolean(s.byPackage[slug]?.projectChecklist.includes(id)));
  const setIn = useProgressStore((s) => s.setIn);
  const inputId = useId();
  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <Checkbox
        id={inputId}
        checked={checked}
        onCheckedChange={(on) => setIn(slug, "projectChecklist", id, on)}
        className="mt-0.5"
      />
      <label
        htmlFor={inputId}
        className={cn(
          "min-w-0 flex-1 cursor-pointer text-sm leading-relaxed",
          checked && "text-muted-foreground decoration-muted-foreground/60 line-through",
        )}
      >
        <BilingualText value={text} />
      </label>
    </li>
  );
});

function useChecklistDone(slug: string, ids: readonly string[]): number {
  const idSet = useMemo(() => new Set(ids), [ids]);
  return useProgressStore((s) => {
    const done = s.byPackage[slug]?.projectChecklist;
    if (!done) return 0;
    let n = 0;
    for (const id of done) if (idSet.has(id)) n += 1;
    return n;
  });
}

export function PracticeProjectSection({ pkg, data }: SectionProps<"project">) {
  const slug = pkg.meta.slug;
  const ids = useMemo(() => data.implementationChecklist.map((c) => c.id), [data.implementationChecklist]);
  const done = useChecklistDone(slug, ids);
  const total = ids.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const features = useMemo(() => sortByPriority(data.features, (f) => f.priority), [data.features]);

  return (
    <div className="space-y-8">
      <Panel className="space-y-3">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Project</p>
        <p className="text-lg font-semibold tracking-tight">{data.name}</p>
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Target className="text-muted-foreground size-4" aria-hidden />
            Objective
          </h3>
          <BilingualText
            value={data.objective}
            as="p"
            className="text-sm leading-relaxed"
            viClassName="text-sm leading-relaxed"
          />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold">Target gaps</h3>
          <ChipList items={data.targetGaps} label="Target gaps" />
        </div>
      </Panel>

      <SubSection title="Tech stack" icon={Layers}>
        <div className="bg-card overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[20rem] text-sm">
            <caption className="sr-only">Technologies and why they were chosen</caption>
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th scope="col" className="p-3 font-medium">
                  Technology
                </th>
                <th scope="col" className="p-3 font-medium">
                  Why
                </th>
              </tr>
            </thead>
            <tbody>
              {data.techStack.map((t) => (
                <tr key={t.name} className="border-b align-top last:border-0">
                  <th scope="row" className="p-3 text-left font-medium whitespace-nowrap">
                    {t.name}
                  </th>
                  <td className="p-3">
                    <BilingualText value={t.reason} as="p" className="text-sm" viClassName="text-sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SubSection>

      <SubSection title="Architecture" icon={Boxes}>
        <MermaidDiagram diagram={data.architectureDiagram} />
      </SubSection>

      <SubSection title="Features" icon={ListTodo}>
        <ul className="bg-card divide-y rounded-lg border">
          {features.map((f) => (
            <li key={f.id} className="flex items-start gap-3 px-3 py-2.5">
              <PriorityBadge priority={f.priority} className="mt-0.5 shrink-0" />
              <BilingualText value={f.title} as="p" className="text-sm" viClassName="text-sm" />
            </li>
          ))}
        </ul>
      </SubSection>

      <SubSection title="Implementation checklist" icon={CheckSquare}>
        <Progress value={pct} className="gap-1.5">
          <ProgressLabel className="text-muted-foreground text-xs">
            {done} of {total} steps done
          </ProgressLabel>
          <ProgressValue className="text-xs" />
        </Progress>
        <ul className="bg-card divide-y rounded-lg border" aria-label="Implementation checklist">
          {data.implementationChecklist.map((item) => (
            <ChecklistItem key={item.id} slug={slug} id={item.id} text={item.text} />
          ))}
        </ul>
      </SubSection>

      <div className="grid gap-8 md:grid-cols-2">
        <SubSection title="Testing requirements" icon={TestTube2}>
          <BilingualList items={data.testingRequirements} />
        </SubSection>
        <SubSection title="Performance requirements" icon={Gauge}>
          <BilingualList items={data.performanceRequirements} />
        </SubSection>
      </div>

      <SubSection title="Learning outcomes" icon={GraduationCap}>
        <BilingualList items={data.learningOutcomes} />
      </SubSection>
    </div>
  );
}
