import { describe, expect, it } from "vitest";
import { NormalizedJdSchema } from "@/domain/jd/schema";
import {
  InterviewPackageSchema,
  type InterviewPackage,
  type JdAnalysis,
  type SectionState,
} from "@/domain/package/schema";
import { SECTION_KEYS, type SectionKey } from "@/domain/package/sections";
import {
  assemblePackage,
  assembleSection,
  buildPackageSlugBase,
  collectResearchSources,
  isNormalizedSectionKey,
  jdFromPackage,
  mergeSummaries,
  normalizeSectionRows,
  overlayBuiltInSections,
  pickUniqueSlug,
  replaceQuestionInBank,
  clampCompanyCode,
  resolveCompany,
  truncateText,
  sectionStatePatch,
  slugifyText,
  summarizePackage,
  summarizePackageRow,
  toPackageMeta,
  type PackageRowLike,
  type SectionRowLike,
} from "./package-mapper";
import { InvalidSectionContentError, QuestionNotFoundError } from "./repository-errors";
import { fixtureBank, makeQuestion } from "./test-fixtures";

const row: PackageRowLike = {
  id: "pkg_1",
  slug: "acme-senior-front-end-engineer",
  companyName: "Acme",
  companyCode: "ACME",
  jobTitle: "Senior Front-End Engineer",
  sourceUrl: "https://jobs.example.com/1",
  isSample: false,
  createdAt: new Date("2026-11-20T00:00:00.000Z"),
  updatedAt: new Date("2026-11-21T00:00:00.000Z"),
};

function sectionRow(key: string, content: unknown, extra: Partial<SectionRowLike> = {}): SectionRowLike {
  return {
    key,
    status: "ready",
    content,
    error: null,
    inputHash: "h1",
    model: "gpt-test",
    generatedAt: new Date("2026-11-21T00:00:00.000Z"),
    ...extra,
  };
}

const counter = () => {
  let n = 0;
  return () => `id${++n}`;
};

describe("slugs", () => {
  it("slugifies with diacritics stripped", () => {
    expect(slugifyText("Công ty Đà Nẵng — Senior FE!")).toBe("cong-ty-da-nang-senior-fe");
  });

  it("builds a slug base from company + job title, bounded in length", () => {
    expect(buildPackageSlugBase("ISB Vietnam", "Senior Front-End Developer")).toBe(
      "isb-vietnam-senior-front-end-developer",
    );
    const long = buildPackageSlugBase("A".repeat(50), "very long title ".repeat(10));
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long).toMatch(/^[a-z0-9-]+$/);
    expect(long.endsWith("-")).toBe(false);
    expect(buildPackageSlugBase("!!!", "???")).toBe("package");
  });

  it("suffixes -2, -3 on conflict", () => {
    expect(pickUniqueSlug("acme-fe", [])).toBe("acme-fe");
    expect(pickUniqueSlug("acme-fe", ["acme-fe"])).toBe("acme-fe-2");
    expect(pickUniqueSlug("acme-fe", ["acme-fe", "acme-fe-2", "acme-fe-extra"])).toBe("acme-fe-3");
  });
});

describe("resolveCompany", () => {
  it("creates a new company with the normalized code", () => {
    expect(resolveCompany("", "Acme Corp", [])).toEqual({ kind: "create", code: "ACME_CORP" });
    expect(resolveCompany("isb", "ISB Vietnam", [])).toEqual({ kind: "create", code: "ISB" });
  });

  it("reuses the same company and suffixes when another company owns the code", () => {
    const candidates = [
      { id: "c1", code: "ACME", name: "Acme" },
      { id: "c2", code: "ACME_2", name: "ACME  " },
    ];
    expect(resolveCompany("ACME", "acme", candidates)).toEqual({ kind: "reuse", id: "c1", code: "ACME" });
    expect(resolveCompany("ACME", "Acme Robotics", candidates)).toEqual({ kind: "create", code: "ACME_3" });
  });
});

describe("clampCompanyCode / truncateText", () => {
  it("caps derived company codes at 60 characters without a trailing underscore", () => {
    const code = clampCompanyCode("Công ty TNHH Giải pháp Phần mềm Quốc tế ISB Việt Nam Chi nhánh Hồ Chí Minh");
    expect(code.length).toBeLessThanOrEqual(60);
    expect(code).toBe("CONG_TY_TNHH_GIAI_PHAP_PHAN_MEM_QUOC_TE_ISB_VIET_NAM_CHI_NHA");
    expect(clampCompanyCode(`${"A".repeat(59)} B`)).toBe("A".repeat(59));
    expect(clampCompanyCode("Acme Đà Nẵng")).toBe("ACME_DA_NANG");
    expect(clampCompanyCode("!!!")).toBe("COMPANY");
  });

  it("truncates long text at a word boundary with an ellipsis", () => {
    expect(truncateText("  Short title  ", 160)).toBe("Short title");
    const long = "word ".repeat(50).trim();
    const out = truncateText(long, 160);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("word…")).toBe(true);
    expect(truncateText("x".repeat(200), 160)).toBe(`${"x".repeat(159)}…`);
  });
});

describe("assembly", () => {
  it("maps a row to valid PackageMeta", () => {
    const meta = toPackageMeta({ ...row, companyCode: "acme corp", sourceUrl: "not a url" });
    expect(meta.companyCode).toBe("ACME_CORP");
    expect(meta.sourceUrl).toBeUndefined();
    expect(meta.run).toBe("RUN_10");
    expect(meta.updatedAt).toBe("2026-11-21T00:00:00.000Z");
  });

  it("returns pending for missing rows and keeps state metadata", () => {
    expect(assembleSection("jd", undefined)).toEqual({ state: { status: "pending" } });
    const ok = assembleSection("bilingual", sectionRow("bilingual", fixtureBank));
    expect(ok.content?.questions).toHaveLength(2);
    expect(ok.state).toEqual({
      status: "ready",
      generatedAt: "2026-11-21T00:00:00.000Z",
      model: "gpt-test",
      inputHash: "h1",
    });
  });

  it("omits invalid content and marks the section failed", () => {
    const bad = assembleSection("bilingual", sectionRow("bilingual", { topics: [], questions: "nope" }));
    expect(bad.content).toBeUndefined();
    expect(bad.state.status).toBe("failed");
    expect(bad.state.error).toMatch(/Stored content is invalid/);
  });

  it("flags ready rows without content and tolerates unknown statuses", () => {
    expect(assembleSection("jd", sectionRow("jd", null)).state.status).toBe("failed");
    expect(assembleSection("jd", sectionRow("jd", null, { status: "generating" })).state.status).toBe("generating");
    expect(assembleSection("jd", sectionRow("jd", null, { status: "weird" })).state.status).toBe("pending");
  });

  it("assembles a schema-valid package with all 16 section states", () => {
    const pkg = assemblePackage(row, [
      sectionRow("bilingual", fixtureBank),
      sectionRow("coding", { exercises: "broken" }),
      sectionRow("legacy-key", { anything: true }),
    ]);
    expect(InterviewPackageSchema.safeParse(pkg).success).toBe(true);
    expect(Object.keys(pkg.sectionStates)).toEqual([...SECTION_KEYS]);
    expect(pkg.sections.bilingual?.questions.map((q) => q.id)).toEqual(["fx-q01", "fx-q02"]);
    expect(pkg.sections.coding).toBeUndefined();
    expect(pkg.sectionStates.coding.status).toBe("failed");
    expect(pkg.sectionStates.jd.status).toBe("pending");
  });
});

describe("overlayBuiltInSections", () => {
  it("fills sections missing from a stale seeded sample without overriding stored ones", () => {
    const stored = assemblePackage({ ...row, isSample: true }, [sectionRow("coding", { exercises: "broken" })]);
    const builtIn = assemblePackage(row, [sectionRow("bilingual", fixtureBank, { model: "curated-sample" })]);
    const merged = overlayBuiltInSections(stored, builtIn);
    expect(merged.meta).toBe(stored.meta);
    expect(merged.sections.bilingual).toEqual(fixtureBank);
    expect(merged.sectionStates.bilingual.model).toBe("curated-sample");
    expect(merged.sectionStates.coding.status).toBe("failed");
    expect(InterviewPackageSchema.safeParse(merged).success).toBe(true);
  });
});

describe("summaries", () => {
  it("summarizes rows and packages", () => {
    const s = summarizePackageRow(
      row,
      [
        { key: "jd", status: "ready" },
        { key: "bilingual", status: "ready" },
        { key: "coding", status: "failed" },
        { key: "unknown", status: "ready" },
      ],
      2,
    );
    expect(s).toMatchObject({ readySections: 2, totalSections: 16, questionCount: 2, isSample: false });

    const pkg = assemblePackage(row, [sectionRow("bilingual", fixtureBank)]);
    expect(summarizePackage(pkg)).toMatchObject({ slug: row.slug, readySections: 1, questionCount: 2 });
  });

  it("merges DB and built-in summaries without duplicates, newest first", () => {
    const base = summarizePackageRow(row, [], 0);
    const sample = { ...base, slug: "sample", isSample: true, updatedAt: "2026-01-01T00:00:00.000Z" };
    const dbSample = { ...sample, updatedAt: "2026-11-25T00:00:00.000Z", questionCount: 80 };
    expect(mergeSummaries([base], [sample]).map((s) => s.slug)).toEqual([row.slug, "sample"]);
    const merged = mergeSummaries([dbSample, base], [sample]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual(dbSample);

    const staleSample = { ...sample, readySections: 3, questionCount: 0, updatedAt: "2026-11-25T00:00:00.000Z" };
    const builtIn = { ...sample, readySections: 16, questionCount: 80 };
    expect(mergeSummaries([staleSample], [builtIn])[0]).toMatchObject({
      updatedAt: staleSample.updatedAt,
      readySections: 16,
      questionCount: 80,
    });
  });
});

describe("sectionStatePatch", () => {
  it("writes only present keys and clears stale errors on non-failed status", () => {
    expect(sectionStatePatch({ status: "generating" })).toEqual({ status: "generating", error: null });
    expect(sectionStatePatch({ status: "failed", error: "boom" })).toEqual({ status: "failed", error: "boom" });
    expect(sectionStatePatch({ status: "failed" })).toEqual({ status: "failed" });
    expect(sectionStatePatch({ model: "m", inputHash: undefined })).toEqual({ model: "m", inputHash: null });
    expect(sectionStatePatch({ generatedAt: "2026-11-21T00:00:00.000Z" }).generatedAt).toEqual(
      new Date("2026-11-21T00:00:00.000Z"),
    );
  });

  it("rejects invalid statuses", () => {
    expect(() => sectionStatePatch({ status: "done" as SectionState["status"] })).toThrow();
  });
});

describe("normalizeSectionRows", () => {
  it("normalizes the question bank into topics, questions and follow-ups", () => {
    const rows = normalizeSectionRows("pkg_1", "bilingual", fixtureBank, counter());
    expect(rows.topics.map((t) => [t.id, t.topicKey, t.code, t.order])).toEqual([
      ["id1", "react", "REACT", 0],
      ["id2", "realtime", "WEBSOCKET", 1],
    ]);
    expect(rows.questions.map((q) => [q.id, q.itemId, q.topicId, q.number])).toEqual([
      ["id3", "fx-q01", "id1", 1],
      ["id4", "fx-q02", "id2", 2],
    ]);
    expect(rows.questions[0]!.data).not.toHaveProperty("followUps");
    expect(rows.followUps).toHaveLength(4);
    expect(rows.followUps[1]).toMatchObject({ questionId: "id3", itemId: "fx-q01-f2", order: 1 });
  });

  it("links questions with unknown topics to null", () => {
    const rows = normalizeSectionRows(
      "p",
      "bilingual",
      { ...fixtureBank, questions: [makeQuestion(3, "nope")] },
      counter(),
    );
    expect(rows.questions[0]!.topicId).toBeNull();
  });

  it("rejects duplicate ids", () => {
    const dup = { ...fixtureBank, questions: [makeQuestion(1, "react"), makeQuestion(1, "react")] };
    expect(() => normalizeSectionRows("p", "bilingual", dup, counter())).toThrow(InvalidSectionContentError);
  });

  it("returns empty rows for document sections", () => {
    expect(isNormalizedSectionKey("jd")).toBe(false);
    expect(isNormalizedSectionKey("cheatsheet")).toBe(true);
    const rows = normalizeSectionRows("p", "hr" as SectionKey, { groups: [] } as never, counter());
    expect(Object.values(rows).every((list) => list.length === 0)).toBe(true);
  });

  it("normalizes flashcards and study plans", () => {
    const front = { en: "Front", vi: "Mặt trước" };
    const flashcards = [
      { id: "fc1", front, back: { answer: "a", viExplanation: "b", memoryShortcut: front }, priority: "high" as const },
      { id: "fc2", front, back: { answer: "a", viExplanation: "b", memoryShortcut: front }, priority: "low" as const },
    ];
    const cheat = normalizeSectionRows("p", "cheatsheet", { concepts: [], flashcards }, counter());
    expect(cheat.flashcards.map((f) => [f.itemId, f.order])).toEqual([
      ["fc1", 0],
      ["fc2", 1],
    ]);
    const plan = (id: "1d" | "3d" | "7d") => ({ id, title: front, days: [] });
    const plans = normalizeSectionRows("p", "studyPlan", { plans: [plan("1d"), plan("3d"), plan("7d")] }, counter());
    expect(plans.studyPlans.map((p) => p.planKey)).toEqual(["1d", "3d", "7d"]);
  });
});

describe("replaceQuestionInBank", () => {
  it("replaces by id without mutating the original", () => {
    const updated = makeQuestion(2, "realtime", { answer: "A better answer." });
    const next = replaceQuestionInBank(fixtureBank, updated);
    expect(next.questions[1]!.answer).toBe("A better answer.");
    expect(fixtureBank.questions[1]!.answer).toBe("Answer to question 2.");
  });

  it("throws for unknown ids", () => {
    expect(() => replaceQuestionInBank(fixtureBank, makeQuestion(9, "react"))).toThrow(QuestionNotFoundError);
  });
});

describe("seed helpers", () => {
  const fact = (en: string, status: "verified" | "unverified" | "assumption", sourceUrl?: string) => ({
    text: { en, vi: en },
    status,
    ...(sourceUrl ? { sourceUrl } : {}),
  });
  const jd: JdAnalysis = {
    jobTitle: fact("Senior FE", "verified", "https://jobs.example.com/1"),
    company: fact("Acme", "verified", "https://jobs.example.com/1"),
    location: fact("Hanoi", "verified"),
    workingArrangement: fact("Hybrid", "unverified"),
    seniority: fact("Senior", "assumption"),
    responsibilities: [fact("Ship features", "verified")],
    requiredSkills: [fact("React", "verified")],
    preferredSkills: [],
    benefits: [fact("Laptop", "unverified", "https://mirror.example.org/job")],
    keyExpectations: [],
    inferredArchitecture: { summary: { en: "SPA", vi: "SPA" }, components: [] },
    sourceUrls: ["https://jobs.example.com/1", "https://mirror.example.org/job"],
    verification: { overallStatus: "verified", notes: [], checkedAt: "2026-11-20T00:00:00.000Z" },
  };
  const pkg = (withJd: boolean): InterviewPackage => {
    const base = assemblePackage(row, withJd ? [sectionRow("jd", jd)] : []);
    return {
      ...base,
      sections: {
        ...base.sections,
        company: withJd
          ? {
              overview: fact("o", "verified"),
              businessModel: fact("b", "verified"),
              productsAndServices: [],
              industry: fact("i", "verified"),
              engineeringCulture: [],
              companySize: fact("s", "unverified"),
              potentialProjects: [],
              applicationRisks: [],
              recruiterQuestions: [],
              sources: [{ title: "Acme careers", url: "https://acme.example.com/careers", accessedAt: "2026-11-19" }],
            }
          : undefined,
      },
    };
  };

  it("derives a valid seed NormalizedJd from the JD analysis", () => {
    const normalized = jdFromPackage(pkg(true));
    expect(NormalizedJdSchema.safeParse(normalized).success).toBe(true);
    expect(normalized.origin).toBe("seed");
    expect(normalized.location).toBe("Hanoi");
    expect(normalized.sections.map((s) => s.heading)).toEqual(["Responsibilities", "Required skills", "Benefits"]);
    expect(normalized.text).toContain("- React");
  });

  it("falls back to metadata when there is no JD analysis", () => {
    const normalized = jdFromPackage(pkg(false));
    expect(NormalizedJdSchema.safeParse(normalized).success).toBe(true);
    expect(normalized.warnings).toHaveLength(1);
  });

  it("collects deduplicated research sources with verification", () => {
    const sources = collectResearchSources(pkg(true));
    expect(sources.map((s) => [s.url, s.kind, s.verified])).toEqual([
      ["https://jobs.example.com/1", "jd", true],
      ["https://mirror.example.org/job", "jd", false],
      ["https://acme.example.com/careers", "web", false],
    ]);
    expect(sources[2]!.accessedAt).toEqual(new Date("2026-11-19"));
    expect(collectResearchSources(pkg(false)).map((s) => s.url)).toEqual(["https://jobs.example.com/1"]);
  });
});
