"use client";

import { memo, type ReactNode } from "react";
import { CircleCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVisibleLanguages } from "@/components/common/BilingualText";
import type { Bilingual, ExperienceRef, FollowUp } from "@/domain/common/schema";
import { useIsFavorite, useIsStudied, useProgressStore } from "@/stores/progress-store";
import { cn } from "@/lib/utils";
import { useBodyHeadingLevel } from "./ItemAccordion";

/* ------------------------------------------------------------------ */
/* Header pieces                                                       */
/* ------------------------------------------------------------------ */

/** Studied / favorite indicators shown in a collapsed header. Fixed width = no layout shift. */
export const ItemStatusIndicators = memo(function ItemStatusIndicators({ slug, id }: { slug: string; id: string }) {
  const studied = useIsStudied(slug, id);
  const favorite = useIsFavorite(slug, id);
  return (
    <span className="flex w-10 shrink-0 items-center justify-end gap-1" data-testid="item-status">
      <span className="inline-flex size-4 items-center justify-center">
        {studied ? (
          <>
            <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <span className="sr-only">Studied</span>
          </>
        ) : null}
      </span>
      <span className="inline-flex size-4 items-center justify-center">
        {favorite ? (
          <>
            <Star className="size-4 fill-amber-400 text-amber-500" aria-hidden />
            <span className="sr-only">Favorite</span>
          </>
        ) : null}
      </span>
    </span>
  );
});

interface ItemHeaderProps {
  /** Display number, e.g. "Q7" or "SD1". */
  label: string;
  title: Bilingual;
  slug: string;
  id: string;
  /** Badges / meta rendered under the title (must not be interactive). */
  meta?: ReactNode;
}

/** Content of an accordion header button (non-interactive elements only). */
export function ItemHeader({ label, title, slug, id, meta }: ItemHeaderProps) {
  const { en, vi } = useVisibleLanguages();
  return (
    <span className="flex items-start gap-3">
      <span className="bg-muted text-foreground/70 mt-0.5 inline-flex h-6 min-w-11 shrink-0 items-center justify-center rounded-md px-1.5 font-mono text-xs font-semibold tabular-nums">
        {label}
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        {en ? (
          <span lang="en" className="text-foreground block leading-snug font-medium">
            {title.en}
          </span>
        ) : null}
        {vi ? (
          <span
            lang="vi"
            className={cn("block leading-snug", en ? "text-muted-foreground text-sm" : "text-foreground font-medium")}
          >
            {title.vi}
          </span>
        ) : null}
        {meta ? <span className="flex flex-wrap items-center gap-1.5 pt-1">{meta}</span> : null}
      </span>
      <ItemStatusIndicators slug={slug} id={id} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Body building blocks                                                */
/* ------------------------------------------------------------------ */

/** Heading at the correct level for the current accordion body. */
export function BodyHeading({ children, className }: { children: ReactNode; className?: string }) {
  const level = useBodyHeadingLevel();
  const Tag = `h${level}` as const;
  return (
    <Tag className={cn("text-muted-foreground text-xs font-semibold tracking-wide uppercase", className)}>
      {children}
    </Tag>
  );
}

/** A titled block inside an item body. */
export function DetailBlock({
  title,
  children,
  className,
  actions,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BodyHeading>{title}</BodyHeading>
        {actions}
      </div>
      {children}
    </div>
  );
}

function LangTag({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="bg-muted text-muted-foreground mr-1.5 inline-block rounded px-1 font-mono text-[10px] leading-4"
    >
      {children}
    </span>
  );
}

/** Bilingual paragraph(s) that follow the language switch, with EN/VI tags in bilingual mode. */
export function BilingualParagraphs({ value, className }: { value: Bilingual; className?: string }) {
  const { en, vi } = useVisibleLanguages();
  const both = en && vi;
  return (
    <div className={cn("space-y-1.5 text-sm leading-relaxed", className)}>
      {en ? (
        <p lang="en" className="whitespace-pre-line">
          {both ? <LangTag>EN</LangTag> : null}
          {value.en}
        </p>
      ) : null}
      {vi ? (
        <p lang="vi" className={cn("whitespace-pre-line", both && "text-muted-foreground")}>
          {both ? <LangTag>VI</LangTag> : null}
          {value.vi}
        </p>
      ) : null}
    </div>
  );
}

/** Inline bilingual text (no tags) following the language switch. */
export function BilingualInline({ value, className }: { value: Bilingual; className?: string }) {
  const { en, vi } = useVisibleLanguages();
  return (
    <span className={className}>
      {en ? <span lang="en">{value.en}</span> : null}
      {en && vi ? <span aria-hidden> · </span> : null}
      {vi ? (
        <span lang="vi" className={en ? "text-muted-foreground" : undefined}>
          {value.vi}
        </span>
      ) : null}
    </span>
  );
}

/** List of bilingual entries. */
export function BilingualList({
  items,
  ordered = false,
  className,
}: {
  items: readonly Bilingual[];
  ordered?: boolean;
  className?: string;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <List className={cn("space-y-1.5 pl-5 text-sm leading-relaxed", ordered ? "list-decimal" : "list-disc", className)}>
      {items.map((item, i) => (
        <li key={i}>
          <BilingualInline value={item} />
        </li>
      ))}
    </List>
  );
}

/** Vietnamese-only text block (hidden in English mode by the caller). */
export function ViParagraph({ children, className }: { children: string; className?: string }) {
  return (
    <p lang="vi" className={cn("text-sm leading-relaxed whitespace-pre-line", className)}>
      {children}
    </p>
  );
}

/** Highlighted memory aid (memory shortcut / key takeaway). */
export function Callout({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: Bilingual;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={cn("rounded-lg border p-3", tone === "accent" ? "border-amber-500/30 bg-amber-500/5" : "bg-muted/40")}
    >
      <BodyHeading className="mb-1.5">{title}</BodyHeading>
      <BilingualParagraphs value={value} />
    </div>
  );
}

/** Interviewer follow-up questions with bilingual answers. */
export function FollowUpList({
  followUps,
  title = "Interviewer follow-ups",
}: {
  followUps: readonly FollowUp[];
  title?: string;
}) {
  const { en, vi } = useVisibleLanguages();
  if (followUps.length === 0) return null;
  return (
    <DetailBlock title={title}>
      <ol className="space-y-3">
        {followUps.map((f, i) => (
          <li key={f.id} className="rounded-lg border p-3">
            <p className="text-sm font-medium">
              <span className="text-muted-foreground mr-1.5 font-mono text-xs">F{i + 1}.</span>
              <BilingualInline value={f.question} />
            </p>
            <div className="mt-2 space-y-1.5 border-l-2 pl-3 text-sm leading-relaxed">
              {en ? (
                <p lang="en">
                  <LangTag>EN</LangTag>
                  {f.answer.en}
                </p>
              ) : null}
              {vi ? (
                <p lang="vi" className={en ? "text-muted-foreground" : undefined}>
                  <LangTag>VI</LangTag>
                  {f.answer.vi}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </DetailBlock>
  );
}

const EXPERIENCE_LABELS: Record<ExperienceRef["kind"], string> = {
  actual: "Actual experience",
  theoretical: "Theoretical",
  "recommended-approach": "Recommended approach",
};

const EXPERIENCE_STYLES: Record<ExperienceRef["kind"], string> = {
  actual: "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  theoretical: "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300",
  "recommended-approach": "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

export function ExperienceKindBadge({ kind, className }: { kind: ExperienceRef["kind"]; className?: string }) {
  return (
    <Badge variant="outline" className={cn(EXPERIENCE_STYLES[kind], className)}>
      {EXPERIENCE_LABELS[kind]}
    </Badge>
  );
}

/** Experience reference: kind badge + company + bilingual note. */
export function ExperienceRefView({ value }: { value: ExperienceRef }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <ExperienceKindBadge kind={value.kind} />
        {value.company ? <span className="text-muted-foreground text-xs font-medium">{value.company}</span> : null}
      </div>
      <BilingualParagraphs value={value.note} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

interface StudyActionsProps {
  slug: string;
  id: string;
  /** Overrides the default studied toggle (e.g. to also update topic completion). */
  onToggleStudied?: (id: string) => void;
  children?: ReactNode;
}

/** Mark-as-studied + favorite toggles (aria-pressed) plus optional extra actions. */
export const StudyActions = memo(function StudyActions({ slug, id, onToggleStudied, children }: StudyActionsProps) {
  const studied = useIsStudied(slug, id);
  const favorite = useIsFavorite(slug, id);
  const toggleIn = useProgressStore((s) => s.toggleIn);
  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
      <Button
        type="button"
        size="sm"
        variant={studied ? "secondary" : "outline"}
        aria-pressed={studied}
        onClick={() => (onToggleStudied ? onToggleStudied(id) : toggleIn(slug, "studied", id))}
      >
        <CircleCheck aria-hidden className={cn(studied && "text-emerald-600 dark:text-emerald-400")} />
        {studied ? "Studied" : "Mark as studied"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={favorite ? "secondary" : "outline"}
        aria-pressed={favorite}
        onClick={() => toggleIn(slug, "favorites", id)}
      >
        <Star aria-hidden className={cn(favorite && "fill-amber-400 text-amber-500")} />
        {favorite ? "Favorited" : "Favorite"}
      </Button>
      {children}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

/** Horizontally scrollable, accessible table wrapper. */
export function DataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-muted/50 text-muted-foreground text-xs">
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col" className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t align-top">
              {row.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-3 py-2 font-medium">
                    {cell}
                  </th>
                ) : (
                  <td key={j} className="px-3 py-2">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Simple "studied / total" pill for section toolbars and topic headings. */
export function StudiedCount({ studied, total, className }: { studied: number; total: number; className?: string }) {
  const done = total > 0 && studied >= total;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs tabular-nums",
        done
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "text-muted-foreground",
        className,
      )}
    >
      {done ? <CircleCheck className="size-3" aria-hidden /> : null}
      {studied}/{total} studied
    </span>
  );
}
