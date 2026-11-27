"use client";

import { memo } from "react";
import { AlertTriangle, FileText } from "lucide-react";
import type { NormalizedJd } from "@/domain/jd/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const PREVIEW_ITEMS = 4;

/** Read-only preview of an extracted job description (title, company, sections, warnings). */
export const JdPreview = memo(function JdPreview({
  jd,
  onEditAsText,
}: {
  jd: NormalizedJd;
  /** Copies the extracted text into the paste tab for manual editing. */
  onEditAsText?: () => void;
}) {
  const facts: Array<[string, string | undefined]> = [
    ["Job title", jd.jobTitle || undefined],
    ["Company", jd.companyName || undefined],
    ["Location", jd.location],
    ["Employment type", jd.employmentType],
  ];

  return (
    <section
      aria-labelledby="jd-preview-title"
      className="bg-card text-card-foreground space-y-4 rounded-xl border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id="jd-preview-title" className="flex items-center gap-2 font-medium">
          <FileText className="text-muted-foreground size-4" aria-hidden />
          Extracted job description
        </h3>
        {onEditAsText ? (
          <Button type="button" variant="outline" size="sm" onClick={onEditAsText}>
            Edit as text
          </Button>
        ) : null}
      </div>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className={value ? "break-words" : "text-muted-foreground italic"}>{value ?? "Not detected"}</dd>
          </div>
        ))}
      </dl>

      {jd.warnings.length > 0 ? (
        <Alert className="border-amber-500/40 text-amber-800 dark:text-amber-200">
          <AlertTriangle aria-hidden />
          <AlertTitle>Check the extracted content</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {jd.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {jd.sections.length > 0 ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-xs">
            {jd.sections.length} section{jd.sections.length === 1 ? "" : "s"} · {jd.text.length.toLocaleString("en-US")}{" "}
            characters
          </p>
          <ul className="space-y-3">
            {jd.sections.map((section, index) => (
              <li key={`${section.heading}-${index}`} className="bg-background rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {section.heading} <span className="text-muted-foreground font-normal">({section.items.length})</span>
                </p>
                <ul className="text-muted-foreground mt-1.5 list-disc space-y-1 pl-5 text-sm">
                  {section.items.slice(0, PREVIEW_ITEMS).map((item, i) => (
                    <li key={i} className="break-words">
                      {item}
                    </li>
                  ))}
                </ul>
                {section.items.length > PREVIEW_ITEMS ? (
                  <details className="mt-1 text-sm">
                    <summary className="text-primary focus-visible:ring-ring/50 cursor-pointer rounded underline-offset-2 hover:underline focus-visible:ring-3 focus-visible:outline-none">
                      Show {section.items.length - PREVIEW_ITEMS} more
                    </summary>
                    <ul className="text-muted-foreground mt-1 list-disc space-y-1 pl-5">
                      {section.items.slice(PREVIEW_ITEMS).map((item, i) => (
                        <li key={i} className="break-words">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No sections were detected. The full text will still be analyzed.
        </p>
      )}
    </section>
  );
});
