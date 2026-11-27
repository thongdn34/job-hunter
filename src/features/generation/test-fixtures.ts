import type { GenerationJobDto } from "@/domain/generation/schema";
import type { InterviewPackage, SectionState } from "@/domain/package/schema";
import { SECTION_KEYS, type SectionKey } from "@/domain/package/sections";

/** Minimal user package (no section content) for generation-status tests. */
export function makePackage(
  states: Partial<Record<SectionKey, SectionState>> = {},
  meta: Partial<InterviewPackage["meta"]> = {},
): InterviewPackage {
  const sectionStates = Object.fromEntries(
    SECTION_KEYS.map((key) => [key, states[key] ?? { status: "pending" }]),
  ) as InterviewPackage["sectionStates"];
  return {
    meta: {
      id: "pkg_1",
      slug: "acme-senior-fe",
      run: "RUN_10",
      companyName: "ACME",
      companyCode: "ACME",
      jobTitle: "Senior Frontend Engineer",
      isSample: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...meta,
    },
    sections: {},
    sectionStates,
  };
}

export function allStates(status: SectionState["status"]): Record<SectionKey, SectionState> {
  return Object.fromEntries(SECTION_KEYS.map((key) => [key, { status }])) as Record<SectionKey, SectionState>;
}

export function makeJob(overrides: Partial<GenerationJobDto> = {}): GenerationJobDto {
  return {
    id: "job_1",
    packageSlug: "acme-senior-fe",
    status: "running",
    sections: [...SECTION_KEYS],
    progress: {},
    provider: "openai",
    model: "gpt-test",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
