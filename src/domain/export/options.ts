import { z } from "zod";
import { LanguageModeSchema } from "@/domain/common/schema";
import { SECTION_KEYS, type SectionKey } from "@/domain/package/sections";
import { EXPORT_FORMATS, type ExportFormat, type ExportLanguage } from "./shared";

/**
 * Query-string contracts for the export API (`/api/packages/[slug]/export`),
 * the print view (`/print/[slug]`) and its body fragment (`/api/packages/[slug]/print`). Client-safe.
 */

/** "jd,bilingual" -> ["jd", "bilingual"] (deduped). Absent = all sections. */
export const SectionsParamSchema = z
  .string()
  .transform((value) => [
    ...new Set(
      value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ])
  .pipe(
    z
      .array(z.enum(SECTION_KEYS, { error: (issue) => `Unknown section "${String(issue.input)}"` }))
      .min(1, "Select at least one section"),
  )
  .optional();

const LangParamSchema = LanguageModeSchema.default("bilingual");

export const ExportQuerySchema = z.object({
  format: z.enum(EXPORT_FORMATS, { error: `format must be one of: ${EXPORT_FORMATS.join(", ")}` }),
  sections: SectionsParamSchema,
  lang: LangParamSchema,
});
export type ExportQuery = z.infer<typeof ExportQuerySchema>;

export const PrintQuerySchema = z.object({
  sections: SectionsParamSchema,
  lang: LangParamSchema,
  autoprint: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});
export type PrintQuery = z.infer<typeof PrintQuerySchema>;

type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined>;

/** Flattens URLSearchParams / Next.js searchParams into a plain object (first value wins). */
export function searchParamsToObject(input: SearchParamsInput): Record<string, string> {
  const out: Record<string, string> = {};
  if (input instanceof URLSearchParams) {
    for (const [key, value] of input) if (!(key in out)) out[key] = value;
    return out;
  }
  for (const [key, value] of Object.entries(input)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) out[key] = first;
  }
  return out;
}

function sectionsParam(sections: readonly SectionKey[] | undefined): string | undefined {
  if (!sections || sections.length === 0) return undefined;
  return SECTION_KEYS.filter((key) => sections.includes(key)).join(",");
}

export interface ExportUrlOptions {
  format: ExportFormat;
  /** Omit (or pass undefined) to export every section with content. */
  sections?: readonly SectionKey[];
  lang: ExportLanguage;
}

export function buildExportUrl(slug: string, { format, sections, lang }: ExportUrlOptions): string {
  const params = new URLSearchParams({ format });
  const s = sectionsParam(sections);
  if (s) params.set("sections", s);
  if (format !== "json") params.set("lang", lang);
  return `/api/packages/${encodeURIComponent(slug)}/export?${params.toString()}`;
}

export interface PrintUrlOptions {
  sections?: readonly SectionKey[];
  lang: ExportLanguage;
  autoprint?: boolean;
}

export function buildPrintUrl(slug: string, { sections, lang, autoprint }: PrintUrlOptions): string {
  const params = new URLSearchParams();
  const s = sectionsParam(sections);
  if (s) params.set("sections", s);
  params.set("lang", lang);
  if (autoprint) params.set("autoprint", "1");
  return `/print/${encodeURIComponent(slug)}?${params.toString()}`;
}

/** Query for the print body fragment: the print view's options minus `autoprint`. */
export const PrintBodyQuerySchema = PrintQuerySchema.pick({ sections: true, lang: true });
export type PrintBodyQuery = z.infer<typeof PrintBodyQuerySchema>;

/**
 * URL of the print view's HTML body (`.jh-export` fragment, fully expanded, non-interactive).
 * The print page fetches it after mount so the large body is sent once, not also in the RSC payload.
 */
export function buildPrintBodyUrl(slug: string, { sections, lang }: Omit<PrintUrlOptions, "autoprint">): string {
  const params = new URLSearchParams();
  const s = sectionsParam(sections);
  if (s) params.set("sections", s);
  params.set("lang", lang);
  return `/api/packages/${encodeURIComponent(slug)}/print?${params.toString()}`;
}

/** Compact, user-facing summary of Zod issues for 400 responses. */
export function describeIssues(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({ path: issue.path.join(".") || "(root)", message: issue.message }));
}
