/**
 * In-memory fakes of the package / profile / generation-job repositories for pipeline tests
 * (wired with vi.mock). Not imported by production code.
 */
import type { GenerationJobStatus } from "@/domain/generation/schema";
import type { NormalizedJd } from "@/domain/jd/schema";
import {
  InterviewQuestionSchema,
  SectionContentSchemas,
  type InterviewPackage,
  type InterviewQuestion,
  type PackageMeta,
  type SectionContentMap,
  type SectionState,
} from "@/domain/package/schema";
import { SECTION_KEYS, type SectionKey } from "@/domain/package/sections";
import type { CandidateProfile } from "@/domain/profile/schema";
import { defaultProfile } from "@/content/profile/default-profile";
import type {
  CreateGenerationJobInput,
  GenerationJobPatch,
  GenerationJobRecord,
  JobProgress,
} from "@/server/repositories/generation-job-repository";

export const FAKE_PACKAGE_ID = "pkg_acme";
export const FAKE_SLUG = "acme-senior-frontend";

export const fakeJd: NormalizedJd = {
  companyName: "Acme Trading",
  jobTitle: "Senior Frontend Engineer",
  location: "Ho Chi Minh City",
  origin: "manual",
  text: [
    "Acme Trading builds real-time trading dashboards.",
    "Responsibilities: build high-performance React and TypeScript interfaces; stream market data over WebSocket; write tests with Playwright.",
    "Requirements: React, TypeScript, Next.js, WebSocket, performance optimization, Zustand, TanStack Query, Rust (nice to have).",
  ].join("\n"),
  sections: [
    {
      heading: "Responsibilities",
      items: ["Build high-performance React interfaces", "Stream market data over WebSocket"],
    },
  ],
  extractedAt: "2026-11-01T00:00:00.000Z",
  warnings: [],
};

export const fakeProfile: CandidateProfile = {
  ...defaultProfile,
  experiences: [
    ...defaultProfile.experiences,
    {
      company: "Elfie",
      role: "",
      period: "",
      summary: "Health app (excluded from generation).",
      highlights: ["Elfie highlight that must never appear."],
      technologies: ["React Native"],
      includeInGeneration: false,
      order: 99,
    },
  ],
};

interface Store {
  meta: PackageMeta;
  sections: Partial<Record<SectionKey, unknown>>;
  states: Record<SectionKey, SectionState>;
  jd: NormalizedJd | null;
  profile: CandidateProfile;
  jobs: Map<string, GenerationJobRecord>;
  saveCalls: SectionKey[];
  /** Hook invoked after every successful save (used to trigger cancellation mid-run). */
  onSave?: (key: SectionKey) => void;
}

function freshMeta(isSample = false): PackageMeta {
  return {
    id: FAKE_PACKAGE_ID,
    slug: FAKE_SLUG,
    run: "RUN_10",
    companyName: "Acme Trading",
    companyCode: "ACME",
    jobTitle: "Senior Frontend Engineer",
    isSample,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  };
}

function pendingStates(): Record<SectionKey, SectionState> {
  return Object.fromEntries(SECTION_KEYS.map((k) => [k, { status: "pending" }])) as Record<SectionKey, SectionState>;
}

export const fakeStore: Store = {
  meta: freshMeta(),
  sections: {},
  states: pendingStates(),
  jd: fakeJd,
  profile: fakeProfile,
  jobs: new Map(),
  saveCalls: [],
};

export function resetFakeStore(options: { isSample?: boolean } = {}): void {
  fakeStore.meta = freshMeta(options.isSample);
  fakeStore.sections = {};
  fakeStore.states = pendingStates();
  fakeStore.jd = fakeJd;
  fakeStore.profile = fakeProfile;
  fakeStore.jobs = new Map();
  fakeStore.saveCalls = [];
  fakeStore.onSave = undefined;
  jobCounter = 0;
}

const clone = <T>(value: T): T => structuredClone(value);

/* ---------------------------- package repository ---------------------------- */

export const packageRepositoryFake = {
  async getPackageBySlug(slug: string): Promise<InterviewPackage | null> {
    if (slug !== fakeStore.meta.slug) return null;
    return clone({
      meta: fakeStore.meta,
      sections: fakeStore.sections as InterviewPackage["sections"],
      sectionStates: fakeStore.states as InterviewPackage["sectionStates"],
    });
  },
  async getPackageIdBySlug(slug: string): Promise<string | null> {
    return slug === fakeStore.meta.slug ? fakeStore.meta.id : null;
  },
  async getNormalizedJd(packageId: string): Promise<NormalizedJd | null> {
    return packageId === fakeStore.meta.id ? clone(fakeStore.jd) : null;
  },
  async saveSectionContent<K extends SectionKey>(
    packageId: string,
    key: K,
    content: SectionContentMap[K],
    info: { model?: string; inputHash?: string },
  ): Promise<void> {
    if (packageId !== fakeStore.meta.id) throw new Error("unknown package");
    const validated = SectionContentSchemas[key].parse(content);
    fakeStore.sections[key] = clone(validated);
    fakeStore.states[key] = {
      status: "ready",
      model: info.model,
      inputHash: info.inputHash,
      generatedAt: new Date().toISOString(),
    };
    fakeStore.saveCalls.push(key);
    fakeStore.onSave?.(key);
  },
  async setSectionState(packageId: string, key: SectionKey, state: Partial<SectionState>): Promise<void> {
    if (packageId !== fakeStore.meta.id) throw new Error("unknown package");
    const next = { ...fakeStore.states[key], ...state };
    if ("error" in state && state.error === undefined) delete next.error;
    fakeStore.states[key] = next;
  },
  async replaceQuestion(
    packageId: string,
    question: InterviewQuestion,
    options: { isUnchanged?: (stored: InterviewQuestion) => boolean } = {},
  ): Promise<boolean> {
    if (packageId !== fakeStore.meta.id) throw new Error("unknown package");
    const parsed = InterviewQuestionSchema.parse(question);
    const bank = fakeStore.sections.bilingual as SectionContentMap["bilingual"];
    const stored = bank.questions.find((q) => q.id === parsed.id);
    if (stored && options.isUnchanged && !options.isUnchanged(clone(stored))) return false;
    bank.questions = bank.questions.map((q) => (q.id === parsed.id ? parsed : q));
    return true;
  },
};

/* ---------------------------- profile repository ---------------------------- */

export const profileRepositoryFake = {
  async getProfile(): Promise<CandidateProfile> {
    return clone(fakeStore.profile);
  },
};

/* ---------------------------- job repository -------------------------------- */

let jobCounter = 0;

function stripInternal(record: GenerationJobRecord) {
  const { packageId, cancelRequested, ...dto } = record;
  void packageId;
  void cancelRequested;
  return dto;
}

export const jobRepositoryFake = {
  async createGenerationJob(input: CreateGenerationJobInput): Promise<GenerationJobRecord> {
    jobCounter += 1;
    const progress: JobProgress = Object.fromEntries(
      input.sections.map((k) => [k, { status: "pending", attempts: 0 }]),
    );
    const record: GenerationJobRecord = {
      id: `job_${jobCounter}`,
      packageId: input.packageId,
      packageSlug: fakeStore.meta.slug,
      status: "queued",
      sections: [...input.sections],
      progress,
      provider: input.provider,
      model: input.model,
      cancelRequested: false,
      createdAt: new Date().toISOString(),
    };
    fakeStore.jobs.set(record.id, record);
    return clone(record);
  },
  async getGenerationJob(id: string): Promise<GenerationJobRecord | null> {
    const job = fakeStore.jobs.get(id);
    return job ? clone(job) : null;
  },
  async getLatestJobForPackage(packageId: string): Promise<GenerationJobRecord | null> {
    const jobs = [...fakeStore.jobs.values()].filter((j) => j.packageId === packageId);
    const latest = jobs.at(-1);
    return latest ? clone(latest) : null;
  },
  async updateGenerationJob(id: string, patch: GenerationJobPatch): Promise<GenerationJobRecord> {
    const job = fakeStore.jobs.get(id);
    if (!job) throw new Error(`job ${id} not found`);
    if (patch.status) job.status = patch.status as GenerationJobStatus;
    if (patch.progress) job.progress = clone(patch.progress);
    if (patch.error !== undefined) job.error = patch.error ?? undefined;
    if (patch.startedAt) job.startedAt = patch.startedAt.toISOString();
    if (patch.finishedAt) job.finishedAt = patch.finishedAt.toISOString();
    return clone(job);
  },
  async requestJobCancel(id: string): Promise<GenerationJobRecord | null> {
    const job = fakeStore.jobs.get(id);
    if (!job) return null;
    job.cancelRequested = true;
    return clone(job);
  },
  async isJobCancelRequested(id: string): Promise<boolean> {
    return fakeStore.jobs.get(id)?.cancelRequested ?? false;
  },
  toGenerationJobDto: stripInternal,
};
