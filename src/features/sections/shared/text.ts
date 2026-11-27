import type { Fact, Priority, VerificationStatus } from "@/domain/common/schema";
import { PRIORITIES, VERIFICATION_STATUSES } from "@/domain/common/schema";
import type { TailoredCv } from "@/domain/package/schema";

/** Average conversational pace for interview answers (words per minute). */
export const SPEAKING_WPM = 130;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/u).length;
}

/** Estimated speaking time in whole seconds at `wpm`. */
export function estimateSpeakingSeconds(text: string, wpm = SPEAKING_WPM): number {
  return Math.round((countWords(text) / wpm) * 60);
}

/** 75 -> "1:15", 42 -> "0:42". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Plain text for email-style drafts: subject line (when present) + English body. */
export function buildMessageCopyText(draft: { subject?: string; body: { en: string } }): string {
  const body = draft.body.en.trim();
  return draft.subject ? `Subject: ${draft.subject.trim()}\n\n${body}` : body;
}

const bulletList = (items: readonly string[]) => items.map((b) => `- ${b}`).join("\n");

export function cvExperienceText(cv: Pick<TailoredCv, "experienceHighlights">): string {
  return cv.experienceHighlights
    .map((e) => {
      const header = [e.role, e.company].filter(Boolean).join(" — ") + (e.period ? ` (${e.period})` : "");
      return `${header}\n${bulletList(e.bullets.map((b) => b.en))}`;
    })
    .join("\n\n");
}

export function cvSkillsText(cv: Pick<TailoredCv, "technicalSkills">): string {
  return cv.technicalSkills.map((s) => `${s.category}: ${s.skills.join(", ")}`).join("\n");
}

export function cvAchievementsText(cv: Pick<TailoredCv, "achievementBullets">): string {
  return bulletList(cv.achievementBullets.map((b) => b.en));
}

/**
 * Assemble the English CV as ATS-friendly plain text.
 * Study notes (missing skills, claim notes) are intentionally excluded — they are for the candidate only.
 */
export function buildCvPlainText(cv: TailoredCv): string {
  const blocks: string[] = [cv.professionalTitle.trim(), `SUMMARY\n${cv.summary.en.trim()}`];
  if (cv.experienceHighlights.length) blocks.push(`EXPERIENCE\n${cvExperienceText(cv)}`);
  if (cv.achievementBullets.length) blocks.push(`KEY ACHIEVEMENTS\n${cvAchievementsText(cv)}`);
  if (cv.technicalSkills.length) blocks.push(`TECHNICAL SKILLS\n${cvSkillsText(cv)}`);
  return blocks.join("\n\n");
}

export function countFactsByStatus(facts: readonly (Fact | undefined)[]): Record<VerificationStatus, number> {
  const counts = Object.fromEntries(VERIFICATION_STATUSES.map((s) => [s, 0])) as Record<VerificationStatus, number>;
  for (const f of facts) if (f) counts[f.status] += 1;
  return counts;
}

/** Stable sort by priority, critical first. */
export function sortByPriority<T>(items: readonly T[], get: (item: T) => Priority): T[] {
  const rank = (p: Priority) => PRIORITIES.indexOf(p);
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => rank(get(a.item)) - rank(get(b.item)) || a.i - b.i)
    .map((x) => x.item);
}

/** Locale-stable date (fixed locale + UTC so server and client render the same string). */
export function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
