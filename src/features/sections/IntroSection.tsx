"use client";

import { memo, useMemo } from "react";
import { Brain, Clock, Lightbulb, ListChecks, Mic } from "lucide-react";
import type { IntroSection as IntroSectionData } from "@/domain/package/schema";
import type { SectionProps } from "@/features/package-view/section-types";
import { BilingualText, useVisibleLanguages } from "@/components/common/BilingualText";
import { CopyButton } from "@/components/common/CopyButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SPEAKING_WPM, countWords, estimateSpeakingSeconds, formatDuration } from "./shared/text";
import { BilingualList, EmptyNote, Panel, SubSection } from "./shared/ui";

type Variant = IntroSectionData["variants"][number];

const IntroVariantPanel = memo(function IntroVariantPanel({ variant }: { variant: Variant }) {
  const { en, vi } = useVisibleLanguages();
  const words = countWords(variant.script.en);
  const seconds = estimateSpeakingSeconds(variant.script.en);
  const drift = seconds - variant.durationSeconds;
  const timing =
    Math.abs(drift) <= Math.max(5, variant.durationSeconds * 0.15)
      ? "on target"
      : drift > 0
        ? "a bit long"
        : "a bit short";

  return (
    <div className="space-y-5">
      <Panel className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <Mic className="size-3.5" aria-hidden />
              <span className="tabular-nums">{words}</span> words
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />≈{" "}
              <span className="tabular-nums">{formatDuration(seconds)}</span> at {SPEAKING_WPM} wpm
              <span className={cn(timing !== "on target" && "text-amber-700 dark:text-amber-300")}>({timing})</span>
            </span>
          </p>
          <CopyButton text={variant.script.en} label="Copy English answer" size="sm" variant="default" />
        </div>

        {en && (
          <div lang="en" className="space-y-1">
            {vi && <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">English script</p>}
            <p className="text-[15px] leading-7 whitespace-pre-line" data-testid="intro-script-en">
              {variant.script.en}
            </p>
          </div>
        )}
        {vi && (
          <div lang="vi" className={cn("space-y-1", en && "border-t pt-4")}>
            {en && <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Bản tiếng Việt</p>}
            <p className={cn("leading-7 whitespace-pre-line", en ? "text-muted-foreground text-sm" : "text-[15px]")}>
              {variant.script.vi}
            </p>
          </div>
        )}
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Brain className="text-muted-foreground size-4" aria-hidden />
            Memory shortcut
          </h4>
          <BilingualText
            value={variant.memoryShortcut}
            as="p"
            className="text-sm font-medium"
            viClassName="text-sm font-normal"
          />
        </Panel>
        <Panel className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="text-muted-foreground size-4" aria-hidden />
            Key points
          </h4>
          <BilingualList items={variant.keyPoints} ordered />
        </Panel>
      </div>
    </div>
  );
});

export function IntroSection({ data }: SectionProps<"intro">) {
  const variants = useMemo(
    () => [...data.variants].sort((a, b) => a.durationSeconds - b.durationSeconds),
    [data.variants],
  );

  if (variants.length === 0) return <EmptyNote>No self-introduction scripts yet.</EmptyNote>;

  return (
    <div className="space-y-8">
      <Tabs defaultValue={variants[0]!.durationSeconds}>
        <TabsList aria-label="Introduction length" className="w-full sm:w-fit">
          {variants.map((v) => (
            <TabsTrigger key={v.durationSeconds} value={v.durationSeconds} className="px-3">
              {v.durationSeconds} seconds
            </TabsTrigger>
          ))}
        </TabsList>
        {variants.map((v) => (
          <TabsContent key={v.durationSeconds} value={v.durationSeconds} className="pt-3">
            <IntroVariantPanel variant={v} />
          </TabsContent>
        ))}
      </Tabs>

      <SubSection title="Delivery tips" icon={Lightbulb}>
        <BilingualList items={data.deliveryTips} empty="No delivery tips." />
      </SubSection>
    </div>
  );
}
