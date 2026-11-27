import { describe, expect, it } from "vitest";
import type { TailoredCv } from "@/domain/package/schema";
import {
  buildCvPlainText,
  buildMessageCopyText,
  countFactsByStatus,
  countWords,
  estimateSpeakingSeconds,
  formatDate,
  formatDuration,
  sortByPriority,
} from "./text";

const bi = (en: string, vi = `${en} (vi)`) => ({ en, vi });

describe("countWords / estimateSpeakingSeconds / formatDuration", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("Hello there,\n  I'm  Thong.")).toBe(4);
  });

  it("estimates speaking time at 130 wpm by default", () => {
    const text = Array.from({ length: 130 }, () => "word").join(" ");
    expect(estimateSpeakingSeconds(text)).toBe(60);
    expect(estimateSpeakingSeconds(text, 260)).toBe(30);
  });

  it("formats m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(42)).toBe("0:42");
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(-3)).toBe("0:00");
  });
});

describe("buildMessageCopyText", () => {
  it("prefixes the subject when present", () => {
    expect(buildMessageCopyText({ subject: "Application", body: { en: "Hi team" } })).toBe(
      "Subject: Application\n\nHi team",
    );
  });
  it("returns only the body without a subject", () => {
    expect(buildMessageCopyText({ body: { en: " Hi team \n" } })).toBe("Hi team");
  });
});

describe("buildCvPlainText", () => {
  const cv: TailoredCv = {
    professionalTitle: "Senior Frontend Engineer",
    summary: bi("Ten years building web apps."),
    experienceHighlights: [
      { company: "Acme", role: "Lead Engineer", period: "2020–2024", bullets: [bi("Built X"), bi("Led Y")] },
      { company: "Beta", role: "Engineer", bullets: [bi("Shipped Z")] },
    ],
    achievementBullets: [bi("Cut load time")],
    technicalSkills: [{ category: "Frontend", skills: ["React", "TypeScript"] }],
    atsKeywords: ["React"],
    missingSkillsToStudy: [{ skill: "Go", reason: bi("Backend"), priority: "low" }],
    claimNotes: [bi("Do not claim Kubernetes")],
  };

  it("assembles English plain text in CV order without study notes", () => {
    expect(buildCvPlainText(cv)).toBe(
      [
        "Senior Frontend Engineer",
        "SUMMARY\nTen years building web apps.",
        "EXPERIENCE\nLead Engineer — Acme (2020–2024)\n- Built X\n- Led Y\n\nEngineer — Beta\n- Shipped Z",
        "KEY ACHIEVEMENTS\n- Cut load time",
        "TECHNICAL SKILLS\nFrontend: React, TypeScript",
      ].join("\n\n"),
    );
    const text = buildCvPlainText(cv);
    expect(text).not.toContain("(vi)");
    expect(text).not.toContain("Kubernetes");
    expect(text).not.toContain("Go");
  });

  it("omits empty blocks", () => {
    const text = buildCvPlainText({ ...cv, experienceHighlights: [], achievementBullets: [], technicalSkills: [] });
    expect(text).toBe("Senior Frontend Engineer\n\nSUMMARY\nTen years building web apps.");
  });
});

describe("countFactsByStatus", () => {
  it("counts statuses and skips undefined", () => {
    const f = (status: "verified" | "unverified" | "assumption") => ({ text: bi("x"), status });
    expect(countFactsByStatus([f("verified"), f("verified"), f("assumption"), undefined])).toEqual({
      verified: 2,
      unverified: 0,
      assumption: 1,
    });
  });
});

describe("sortByPriority", () => {
  it("sorts critical first and is stable", () => {
    const items = [
      { id: "a", p: "low" as const },
      { id: "b", p: "critical" as const },
      { id: "c", p: "medium" as const },
      { id: "d", p: "critical" as const },
    ];
    expect(sortByPriority(items, (i) => i.p).map((i) => i.id)).toEqual(["b", "d", "c", "a"]);
    expect(items.map((i) => i.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("formatDate", () => {
  it("formats ISO dates in UTC and passes through invalid input", () => {
    expect(formatDate("2026-03-05T23:30:00Z")).toBe("5 Mar 2026");
    expect(formatDate("not a date")).toBe("not a date");
  });
});
