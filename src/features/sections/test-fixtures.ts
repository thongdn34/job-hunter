import type { InterviewPackage } from "@/domain/package/schema";
import { SECTION_KEYS } from "@/domain/package/sections";

/** Minimal package shell for section renderer tests (sections are passed separately as `data`). */
export function makeTestPackage(overrides: Partial<InterviewPackage["sections"]> = {}): InterviewPackage {
  const sectionStates = Object.fromEntries(
    SECTION_KEYS.map((k) => [k, { status: "ready" as const }]),
  ) as InterviewPackage["sectionStates"];
  return {
    meta: {
      id: "pkg-test",
      slug: "test-co",
      run: "RUN_10",
      companyName: "Test Co",
      companyCode: "TEST",
      jobTitle: "Senior Frontend Engineer",
      isSample: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    sections: overrides,
    sectionStates,
  };
}

export const bi = (en: string, vi = `VI: ${en}`) => ({ en, vi });
