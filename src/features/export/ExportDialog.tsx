"use client";

import { memo, useCallback, useId, useMemo, useState, type ComponentType } from "react";
import { Download, FileCode2, FileJson, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import type { LanguageMode } from "@/domain/common/schema";
import type { InterviewPackage } from "@/domain/package/schema";
import { SECTIONS, type SectionDefinition, type SectionKey } from "@/domain/package/sections";
import { buildExportUrl, buildPrintUrl } from "@/domain/export/options";
import { availableSections, exportFileName, LANGUAGE_LABELS, type ExportFormat } from "@/domain/export/shared";
import { usePreferencesStore } from "@/stores/preferences-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DialogFormat = ExportFormat | "pdf";

interface FormatOption {
  value: DialogFormat;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: "md", label: "Markdown", description: "Every answer, TOC and bookmarks (.md)", icon: FileText },
  { value: "json", label: "JSON", description: "Structured data, schema-validated (.json)", icon: FileJson },
  {
    value: "html",
    label: "Standalone HTML",
    description: "Single offline file with accordions (.html)",
    icon: FileCode2,
  },
  { value: "pdf", label: "PDF (print)", description: "Print view, everything expanded", icon: Printer },
];

const LANGUAGE_OPTIONS: { value: LanguageMode; label: string }[] = (["bilingual", "en", "vi"] as const).map(
  (value) => ({
    value,
    label: LANGUAGE_LABELS[value],
  }),
);

const isLanguageMode = (value: unknown): value is LanguageMode =>
  value === "en" || value === "vi" || value === "bilingual";

/* ------------------------------------------------------------------ */

const SectionOption = memo(function SectionOption({
  definition,
  available,
  checked,
  onToggle,
}: {
  definition: SectionDefinition;
  available: boolean;
  checked: boolean;
  onToggle: (key: SectionKey, checked: boolean) => void;
}) {
  return (
    <li>
      <label
        className={cn(
          "flex min-h-9 items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
          available ? "hover:bg-muted cursor-pointer" : "text-muted-foreground cursor-not-allowed",
        )}
      >
        <Checkbox
          checked={available && checked}
          disabled={!available}
          onCheckedChange={(value) => onToggle(definition.key, value === true)}
        />
        <span className="min-w-0 flex-1">
          <span className="text-muted-foreground tabular-nums">{definition.number}.</span> {definition.title.en}
          <span className="text-muted-foreground block text-xs" lang="vi">
            {definition.title.vi}
          </span>
        </span>
        {!available && <span className="shrink-0 text-xs">Not ready</span>}
      </label>
    </li>
  );
});

/* ------------------------------------------------------------------ */

/** "Export" button + dialog: format, language and section selection, then download or print view. */
export function ExportDialog({ pkg }: { pkg: InterviewPackage }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<DialogFormat>("md");
  const [language, setLanguage] = useState<LanguageMode>("bilingual");
  /** Sections the user unticked (newly generated sections are included by default). */
  const [excluded, setExcluded] = useState<ReadonlySet<SectionKey>>(() => new Set());

  const available = useMemo(() => availableSections(pkg), [pkg]);
  const availableSet = useMemo(() => new Set(available), [available]);
  const selected = useMemo(() => available.filter((key) => !excluded.has(key)), [available, excluded]);
  const allSelected = selected.length === available.length;
  const noneAvailable = available.length === 0;
  const nothingSelected = selected.length === 0;

  const handleOpenChange = useCallback((next: boolean) => {
    if (next) setLanguage(usePreferencesStore.getState().language);
    setOpen(next);
  }, []);

  const toggleSection = useCallback((key: SectionKey, checked: boolean) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (checked) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setExcluded(new Set()), []);
  const selectNone = useCallback(() => setExcluded(new Set(available)), [available]);

  const slug = pkg.meta.slug;
  const sectionsParam = allSelected ? undefined : selected;
  const href =
    format === "pdf"
      ? buildPrintUrl(slug, { sections: sectionsParam, lang: language, autoprint: true })
      : buildExportUrl(slug, { format, sections: sectionsParam, lang: language });
  const filename = format === "pdf" ? undefined : exportFileName(pkg.meta, format);

  const onAction = () => {
    if (format === "pdf") {
      toast.info("Print view opened in a new tab", { description: "Choose “Save as PDF” in the print dialog." });
    } else {
      toast.success("Export started", { description: filename });
    }
    setOpen(false);
  };

  const formatName = `${id}-format`;
  const langLabelId = `${id}-lang-label`;
  const hintId = `${id}-hint`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Download aria-hidden />
        Export
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export package</DialogTitle>
          <DialogDescription>
            Exports include all content, including answers that are collapsed in the app.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Format</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {FORMAT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const checked = format === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "hover:bg-muted flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
                    "has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-3",
                    checked && "border-primary bg-primary/5",
                  )}
                >
                  <input
                    type="radio"
                    name={formatName}
                    value={option.value}
                    checked={checked}
                    onChange={() => setFormat(option.value)}
                    className="accent-primary mt-0.5 size-4 shrink-0 focus-visible:outline-none"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Icon className="text-muted-foreground size-4" aria-hidden />
                      {option.label}
                    </span>
                    <span className="text-muted-foreground block text-xs">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <span id={langLabelId} className="text-sm font-medium">
            Language
          </span>
          <Select
            items={LANGUAGE_OPTIONS}
            value={language}
            onValueChange={(value) => {
              if (isLanguageMode(value)) setLanguage(value);
            }}
            disabled={format === "json"}
          >
            <SelectTrigger className="w-full sm:w-64" aria-labelledby={langLabelId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {format === "json" ? (
            <p className="text-muted-foreground text-xs">JSON always contains both languages.</p>
          ) : format === "html" ? (
            <p className="text-muted-foreground text-xs">Initial language; the HTML file has its own EN / VI switch.</p>
          ) : null}
        </div>

        <fieldset className="space-y-2" aria-describedby={hintId}>
          <legend className="text-sm font-medium">Sections</legend>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p id={hintId} className="text-muted-foreground text-xs" aria-live="polite">
              {noneAvailable
                ? "No sections are ready to export yet."
                : `${selected.length} of ${available.length} ready sections selected.`}
            </p>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={selectAll}
                disabled={noneAvailable || allSelected}
              >
                Select all
              </Button>
              <Button type="button" variant="ghost" size="xs" onClick={selectNone} disabled={nothingSelected}>
                None
              </Button>
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto rounded-lg border p-1">
            {SECTIONS.map((definition) => (
              <SectionOption
                key={definition.key}
                definition={definition}
                available={availableSet.has(definition.key)}
                checked={!excluded.has(definition.key)}
                onToggle={toggleSection}
              />
            ))}
          </ul>
        </fieldset>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          {nothingSelected ? (
            <Button disabled aria-describedby={hintId}>
              {format === "pdf" ? <Printer aria-hidden /> : <Download aria-hidden />}
              {format === "pdf" ? "Open print view" : "Download"}
            </Button>
          ) : format === "pdf" ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className={buttonVariants()} onClick={onAction}>
              <Printer aria-hidden />
              Open print view
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <a href={href} download={filename} className={buttonVariants()} onClick={onAction}>
              <Download aria-hidden />
              Download
            </a>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
