import type { LanguageMode } from "@/domain/common/schema";
import type { InterviewPackage, PackageMeta } from "@/domain/package/schema";
import { SECTION_KEYS, type SectionKey } from "@/domain/package/sections";

/**
 * Client-safe export helpers (no Markdown/sanitizer imports) shared by the
 * builders, the export route, the print page and the ExportDialog.
 */

export type ExportLanguage = LanguageMode;

/** Formats downloadable through the export API ("pdf" is produced by the print view). */
export const EXPORT_FORMATS = ["md", "json", "html"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  md: "text/markdown; charset=utf-8",
  json: "application/json; charset=utf-8",
  html: "text/html; charset=utf-8",
};

export interface ExportSectionOptions {
  /** Sections to include; omitted = every section with content. Order is always canonical. */
  sections?: readonly SectionKey[];
}

export interface ExportTextOptions extends ExportSectionOptions {
  language: ExportLanguage;
}

export function hasSectionContent(pkg: InterviewPackage, key: SectionKey): boolean {
  return pkg.sections[key] != null;
}

/** Section keys that currently have content, in canonical order. */
export function availableSections(pkg: InterviewPackage): SectionKey[] {
  return SECTION_KEYS.filter((key) => hasSectionContent(pkg, key));
}

/** Resolves the requested sections to the canonical order, dropping sections without content. */
export function resolveSections(pkg: InterviewPackage, sections?: readonly SectionKey[]): SectionKey[] {
  const wanted = sections ? new Set(sections) : null;
  return SECTION_KEYS.filter((key) => (wanted ? wanted.has(key) : true) && hasSectionContent(pkg, key));
}

/** "Senior Front-End Developer" -> "senior-front-end-developer" (diacritics stripped). */
export function slugifySegment(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** e.g. "isb-senior-front-end-developer-run10". */
export function exportBaseName(meta: Pick<PackageMeta, "companyCode" | "jobTitle" | "run">): string {
  const parts = [
    slugifySegment(meta.companyCode),
    slugifySegment(meta.jobTitle),
    slugifySegment(meta.run).replace(/-/g, ""),
  ];
  return parts.filter(Boolean).join("-") || "interview-package";
}

export function exportFileName(
  meta: Pick<PackageMeta, "companyCode" | "jobTitle" | "run">,
  format: ExportFormat,
): string {
  return `${exportBaseName(meta)}.${format}`;
}

export const LANGUAGE_LABELS: Record<ExportLanguage, string> = {
  en: "English",
  vi: "Tiếng Việt",
  bilingual: "Bilingual (EN + VI)",
};
