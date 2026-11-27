import { InterviewPackageSchema, type InterviewPackage } from "@/domain/package/schema";
import { SECTION_KEYS } from "@/domain/package/sections";
import { resolveSections, type ExportSectionOptions } from "./shared";

/**
 * Returns a copy of the package containing only the selected sections,
 * validated by InterviewPackageSchema (throws a ZodError on invalid content).
 * `sectionStates` is kept for every section so the result stays schema-valid;
 * excluded sections simply have no content.
 */
export function buildJson(pkg: InterviewPackage, options: ExportSectionOptions = {}): InterviewPackage {
  const keep = new Set(resolveSections(pkg, options.sections));
  const sections = Object.fromEntries(
    SECTION_KEYS.filter((key) => keep.has(key)).map((key) => [key, pkg.sections[key]]),
  ) as InterviewPackage["sections"];
  return InterviewPackageSchema.parse({ meta: pkg.meta, sections, sectionStates: pkg.sectionStates });
}

/** Pretty-printed JSON document for download. */
export function serializeJson(pkg: InterviewPackage, options: ExportSectionOptions = {}): string {
  return `${JSON.stringify(buildJson(pkg, options), null, 2)}\n`;
}
