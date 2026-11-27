"use client";

import { memo, useId, type ReactNode } from "react";
import { AlertTriangle, ExternalLink as ExternalLinkIcon, Info, type LucideIcon } from "lucide-react";
import type { Bilingual, ExperienceRef, Fact } from "@/domain/common/schema";
import { BilingualText } from "@/components/common/BilingualText";
import { VerificationBadge } from "@/components/common/Badges";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/** A titled block inside a section body. The page renders the h2; sub-blocks use h3. */
export function SubSection({
  title,
  icon: Icon,
  actions,
  children,
  className,
  id,
}: {
  title: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const autoId = useId();
  const headingId = id ?? autoId;
  return (
    <section className={cn("space-y-3", className)} aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="flex items-center gap-2 text-base font-semibold tracking-tight">
          {Icon && <Icon className="text-muted-foreground size-4" aria-hidden />}
          {title}
        </h3>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function EmptyNote({ children = "None listed." }: { children?: ReactNode }) {
  return <p className="text-muted-foreground text-sm italic">{children}</p>;
}

type CalloutTone = "info" | "warning";

const CALLOUT_STYLES: Record<CalloutTone, string> = {
  info: "border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100",
};

/** Static, non-interrupting notice (role="note", not role="alert"). */
export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: CalloutTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div
      role="note"
      className={cn("flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm", CALLOUT_STYLES[tone], className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-medium">{title}</p>}
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Links                                                               */
/* ------------------------------------------------------------------ */

export function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname === "/" ? "" : u.pathname}`;
  } catch {
    return url;
  }
}

export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "text-primary hover:text-primary/80 focus-visible:ring-ring inline-flex max-w-full items-center gap-1 break-all underline underline-offset-3 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      <span className="min-w-0">{children ?? displayUrl(href)}</span>
      <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Facts                                                               */
/* ------------------------------------------------------------------ */

/** Verification badge + optional source link + note for a Fact. */
export function FactMeta({ fact, className }: { fact: Fact; className?: string }) {
  return (
    <div className={cn("text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs", className)}>
      <VerificationBadge status={fact.status} />
      {fact.sourceUrl && <ExternalLink href={fact.sourceUrl}>Source</ExternalLink>}
      {fact.note && <span className="min-w-0">{fact.note}</span>}
    </div>
  );
}

export const FactItem = memo(function FactItem({ fact, className }: { fact: Fact; className?: string }) {
  return (
    <div className={cn("space-y-1", className)} data-status={fact.status}>
      <BilingualText
        value={fact.text}
        as="p"
        className="text-sm leading-relaxed"
        viClassName="text-sm leading-relaxed"
      />
      <FactMeta fact={fact} />
    </div>
  );
});

export function FactList({ facts, empty, ordered }: { facts: readonly Fact[]; empty?: ReactNode; ordered?: boolean }) {
  if (facts.length === 0) return <EmptyNote>{empty}</EmptyNote>;
  const List = ordered ? "ol" : "ul";
  return (
    <List className="bg-card divide-y rounded-lg border">
      {facts.map((f, i) => (
        <li key={i} className="px-3 py-2.5">
          <FactItem fact={f} />
        </li>
      ))}
    </List>
  );
}

/* ------------------------------------------------------------------ */
/* Bilingual lists                                                     */
/* ------------------------------------------------------------------ */

export function BilingualList({
  items,
  ordered,
  empty,
  className,
}: {
  items: readonly Bilingual[];
  ordered?: boolean;
  empty?: ReactNode;
  className?: string;
}) {
  if (items.length === 0) return <EmptyNote>{empty}</EmptyNote>;
  const List = ordered ? "ol" : "ul";
  return (
    <List
      className={cn(
        "space-y-2 pl-5 text-sm leading-relaxed",
        ordered ? "list-decimal" : "list-disc",
        "marker:text-muted-foreground",
        className,
      )}
    >
      {items.map((item, i) => (
        <li key={i}>
          <BilingualText value={item} />
        </li>
      ))}
    </List>
  );
}

/* ------------------------------------------------------------------ */
/* Badges & chips                                                      */
/* ------------------------------------------------------------------ */

const EXPERIENCE_KIND_META: Record<ExperienceRef["kind"], { label: string; className: string; title: string }> = {
  actual: {
    label: "Actual",
    title: "Real production experience from the candidate profile",
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  theoretical: {
    label: "Theoretical",
    title: "Knowledge without production experience — do not present as hands-on",
    className: "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  "recommended-approach": {
    label: "Recommended approach",
    title: "How the candidate would approach it — not past experience",
    className: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
};

export function ExperienceKindBadge({ kind }: { kind: ExperienceRef["kind"] }) {
  const meta = EXPERIENCE_KIND_META[kind];
  return (
    <Badge variant="outline" className={meta.className} title={meta.title}>
      {meta.label}
    </Badge>
  );
}

export function ChipList({ items, label, className }: { items: readonly string[]; label: string; className?: string }) {
  if (items.length === 0) return <EmptyNote />;
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((item, i) => (
        <li key={`${item}-${i}`}>
          <Badge variant="secondary" className="h-auto py-0.5 font-normal whitespace-normal">
            {item}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/** Card surface used by the document-style sections. */
export function Panel({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section" | "li";
}) {
  return <Tag className={cn("bg-card text-card-foreground rounded-xl border p-4", className)}>{children}</Tag>;
}
