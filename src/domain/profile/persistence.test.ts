import { describe, expect, it } from "vitest";
import { defaultProfile } from "@/content/profile/default-profile";
import type { CandidateProfile } from "./schema";
import {
  ProfileInputSchema,
  cvToRowData,
  experiencesToRowData,
  parseUploadedAt,
  profileFromRows,
  profileToRowData,
  sanitizeProfile,
  skillsToRowData,
  toStringArray,
  type ExperienceRow,
  type ProfileRow,
  type SkillRow,
} from "./persistence";

const profileRow: ProfileRow = {
  id: "p1",
  fullName: "Jane",
  headline: "Senior Engineer",
  yearsOfExperience: 7,
  location: "HCMC",
  targetRoles: ["Senior Frontend Engineer", 42, " "],
  workingArrangement: "hybrid",
  summary: "Summary",
  cvText: null,
  cvFileName: null,
  cvUploadedAt: null,
};

function expRow(id: string, order: number, extra: Partial<ExperienceRow> = {}): ExperienceRow {
  return {
    id,
    company: id.toUpperCase(),
    role: "",
    period: "",
    summary: "",
    highlights: ["a", "b"],
    technologies: ["React"],
    includeInGeneration: true,
    order,
    ...extra,
  };
}

function skillRow(name: string, ms: number, extra: Partial<SkillRow> = {}): SkillRow {
  return { id: name, name, category: "frontend", proficiency: "production", createdAt: new Date(ms), ...extra };
}

describe("toStringArray", () => {
  it("keeps trimmed non-empty strings and tolerates corrupted Json", () => {
    expect(toStringArray([" a ", "", 3, null, "b"])).toEqual(["a", "b"]);
    expect(toStringArray({ not: "an array" })).toEqual([]);
    expect(toStringArray(null)).toEqual([]);
  });
});

describe("profileFromRows", () => {
  it("maps rows to the domain profile, ordering experiences and skills", () => {
    const profile = profileFromRows(
      profileRow,
      [expRow("b", 5), expRow("a", 1), expRow("c", 5, { includeInGeneration: false, highlights: "oops" })],
      [skillRow("Vue", 30), skillRow("React", 10), skillRow("Go", 20, { category: "backend" })],
    );
    expect(profile.targetRoles).toEqual(["Senior Frontend Engineer"]);
    expect(profile.experiences.map((e) => [e.id, e.order])).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
    ]);
    expect(profile.experiences[2]).toMatchObject({ includeInGeneration: false, highlights: [] });
    expect(profile.skills.map((s) => s.name)).toEqual(["React", "Go", "Vue"]);
    expect(profile).not.toHaveProperty("cvText");
    expect(profile).not.toHaveProperty("cvUploadedAt");
  });

  it("falls back safely for unknown enum values without inflating proficiency", () => {
    const profile = profileFromRows(
      { ...profileRow, workingArrangement: "space" },
      [],
      [skillRow("X", 1, { category: "quantum", proficiency: "expert" })],
    );
    expect(profile.workingArrangement).toBe("flexible");
    expect(profile.skills[0]).toMatchObject({ category: "other", proficiency: "familiar" });
  });

  it("includes CV fields when present", () => {
    const uploaded = new Date("2026-01-02T03:04:05.000Z");
    const profile = profileFromRows(
      { ...profileRow, cvText: "text", cvFileName: "cv.pdf", cvUploadedAt: uploaded },
      [],
      [],
    );
    expect(profile).toMatchObject({ cvText: "text", cvFileName: "cv.pdf", cvUploadedAt: uploaded.toISOString() });
  });
});

describe("domain -> rows", () => {
  it("profileToRowData copies scalar columns only", () => {
    const data = profileToRowData({ ...defaultProfile, cvText: "secret" });
    expect(data).not.toHaveProperty("cvText");
    expect(data.targetRoles).toEqual(defaultProfile.targetRoles);
    expect(data.targetRoles).not.toBe(defaultProfile.targetRoles);
  });

  it("experiencesToRowData uses array position as order and keeps only valid unique ids", () => {
    const rows = experiencesToRowData([
      { ...defaultProfile.experiences[2]!, id: "keep_1", order: 9 },
      { ...defaultProfile.experiences[0]!, id: "keep_1", order: 0 },
      { ...defaultProfile.experiences[1]!, id: "bad id!", order: 3 },
    ]);
    expect(rows.map((r) => [r.company, r.order, r.id])).toEqual([
      ["NAB", 0, "keep_1"],
      ["Persefoni", 1, undefined],
      ["Ninja Van — TechLab", 2, undefined],
    ]);
  });

  it("skillsToRowData dedupes names and assigns increasing createdAt", () => {
    const base = new Date(1_000);
    const rows = skillsToRowData(
      [
        { name: "React", category: "frontend", proficiency: "production" },
        { name: " react ", category: "frontend", proficiency: "familiar" },
        { name: "Go", category: "backend", proficiency: "familiar" },
      ],
      base,
    );
    expect(rows.map((r) => [r.name, r.createdAt.getTime()])).toEqual([
      ["React", 1_000],
      ["Go", 1_001],
    ]);
  });

  it("round-trips through rows without losing order", () => {
    const base = new Date(5_000);
    const exps = experiencesToRowData(defaultProfile.experiences).map((e, i) => ({ ...e, id: `e${i}` }));
    const skills = skillsToRowData(defaultProfile.skills, base).map((s, i) => ({ ...s, id: `s${i}` }));
    const back = profileFromRows(
      { ...profileRow, ...profileToRowData(defaultProfile) },
      [...exps].reverse(),
      [...skills].reverse(),
    );
    expect(back.experiences.map((e) => e.company)).toEqual(defaultProfile.experiences.map((e) => e.company));
    expect(back.skills.map((s) => s.name)).toEqual(defaultProfile.skills.map((s) => s.name));
  });

  it("cvToRowData sanitizes the file name and caps text", () => {
    const at = new Date(0);
    const row = cvToRowData({ fileName: "C:\\docs\\my cv.pdf", text: "x".repeat(100_010) }, at);
    expect(row.cvFileName).toBe("my cv.pdf");
    expect(row.cvText).toHaveLength(100_000);
    expect(row.cvUploadedAt).toBe(at);
  });
});

describe("sanitizeProfile / ProfileInputSchema", () => {
  const base: CandidateProfile = {
    ...defaultProfile,
    headline: "  Senior  ",
    targetRoles: ["A", " a ", "", "B"],
    skills: [
      { name: "React", category: "frontend", proficiency: "production" },
      { name: "REACT", category: "frontend", proficiency: "familiar" },
    ],
    experiences: [{ ...defaultProfile.experiences[0]!, highlights: ["  one ", "   "], technologies: ["TS", "ts"] }],
  };

  it("trims and dedupes", () => {
    const out = sanitizeProfile(base);
    expect(out.headline).toBe("Senior");
    expect(out.targetRoles).toEqual(["A", "B"]);
    expect(out.skills).toHaveLength(1);
    expect(out.experiences[0]).toMatchObject({ highlights: ["one"], technologies: ["TS"], order: 0 });
  });

  it("rejects values that are only invalid after trimming", () => {
    const result = ProfileInputSchema.safeParse({ ...defaultProfile, headline: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["headline"]);
  });

  it("rejects structurally invalid payloads", () => {
    expect(ProfileInputSchema.safeParse({ headline: "x" }).success).toBe(false);
    expect(ProfileInputSchema.safeParse({ ...base, targetRoles: [] }).success).toBe(false);
  });

  it("accepts the default profile", () => {
    expect(ProfileInputSchema.safeParse(defaultProfile).success).toBe(true);
  });

  it("accepts ISO cvUploadedAt values, including those produced by profileFromRows", () => {
    const iso = new Date("2026-01-02T03:04:05.678Z").toISOString();
    expect(ProfileInputSchema.safeParse({ ...defaultProfile, cvText: "cv", cvUploadedAt: iso }).success).toBe(true);
    expect(
      ProfileInputSchema.safeParse({ ...defaultProfile, cvText: "cv", cvUploadedAt: "2026-01-02T10:04:05+07:00" })
        .success,
    ).toBe(true);
  });

  it("rejects a cvUploadedAt that is not an ISO datetime", () => {
    for (const cvUploadedAt of ["yesterday", "", "2026-13-45T00:00:00Z"]) {
      const result = ProfileInputSchema.safeParse({ ...defaultProfile, cvText: "cv", cvUploadedAt });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["cvUploadedAt"]);
    }
  });
});

describe("parseUploadedAt", () => {
  const now = new Date("2026-05-05T00:00:00.000Z");

  it("parses valid timestamps", () => {
    expect(parseUploadedAt("2026-01-02T03:04:05.000Z", now).toISOString()).toBe("2026-01-02T03:04:05.000Z");
  });

  it("falls back to now for missing or invalid values", () => {
    expect(parseUploadedAt(undefined, now)).toBe(now);
    expect(parseUploadedAt("", now)).toBe(now);
    expect(parseUploadedAt("yesterday", now)).toBe(now);
  });
});
