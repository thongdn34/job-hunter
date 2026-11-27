"use client";

import { memo, useMemo } from "react";
import { FilePen, Mail, MailCheck, MessageSquareText, type LucideIcon } from "lucide-react";
import type { CommunicationSection as CommunicationData } from "@/domain/package/schema";
import type { SectionProps } from "@/features/package-view/section-types";
import { BilingualText, useVisibleLanguages } from "@/components/common/BilingualText";
import { CopyButton } from "@/components/common/CopyButton";
import { cn } from "@/lib/utils";
import { buildMessageCopyText, countWords } from "./shared/text";
import { Panel } from "./shared/ui";

type Draft = CommunicationData["applicationEmail"];

const DRAFTS: { key: keyof CommunicationData; title: string; icon: LucideIcon; copyLabel: string }[] = [
  { key: "applicationEmail", title: "Application email", icon: Mail, copyLabel: "Copy email (English)" },
  {
    key: "linkedinMessage",
    title: "LinkedIn recruiter message",
    icon: MessageSquareText,
    copyLabel: "Copy message (English)",
  },
  { key: "coverLetter", title: "Short cover letter", icon: FilePen, copyLabel: "Copy cover letter (English)" },
  { key: "followUpEmail", title: "Follow-up email", icon: MailCheck, copyLabel: "Copy follow-up (English)" },
];

const DraftCard = memo(function DraftCard({
  draft,
  title,
  icon: Icon,
  copyLabel,
}: {
  draft: Draft;
  title: string;
  icon: LucideIcon;
  copyLabel: string;
}) {
  const { en, vi } = useVisibleLanguages();
  const copyText = useMemo(() => buildMessageCopyText(draft), [draft]);
  const words = countWords(draft.body.en);

  return (
    <Panel as="article" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Icon className="text-muted-foreground size-4" aria-hidden />
            {title}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">{words} words (English)</p>
        </div>
        <CopyButton text={copyText} label={copyLabel} size="sm" />
      </header>

      {draft.subject && (
        <div className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Subject</span>
          <span className="min-w-0 flex-1 font-medium break-words" lang="en">
            {draft.subject}
          </span>
          <CopyButton text={draft.subject} label="Copy subject" size="icon" variant="ghost" className="size-7" />
        </div>
      )}

      {en && (
        <div lang="en" className="space-y-1">
          {vi && <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">English</p>}
          <p className="text-sm leading-relaxed whitespace-pre-line">{draft.body.en}</p>
        </div>
      )}
      {vi && (
        <div lang="vi" className={cn("space-y-1", en && "border-t pt-4")}>
          {en && <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Tiếng Việt</p>}
          <p className={cn("text-sm leading-relaxed whitespace-pre-line", en && "text-muted-foreground")}>
            {draft.body.vi}
          </p>
        </div>
      )}

      {draft.notes && (
        <div className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
          <span className="font-medium">Notes: </span>
          <BilingualText value={draft.notes} className="text-xs" />
        </div>
      )}
    </Panel>
  );
});

export function CommunicationSection({ data }: SectionProps<"email">) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {DRAFTS.map(({ key, title, icon, copyLabel }) => (
        <DraftCard key={key} draft={data[key]} title={title} icon={icon} copyLabel={copyLabel} />
      ))}
    </div>
  );
}
