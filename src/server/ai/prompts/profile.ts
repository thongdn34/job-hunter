import { generationExperiences, type CandidateProfile } from "@/domain/profile/schema";
import { fenceUntrusted } from "./fencing";

/**
 * Candidate profile serializer. Only experiences with includeInGeneration=true are serialized
 * (Elfie is disabled by default); CV lines that mention an excluded company are dropped so the
 * excluded experience cannot leak back in through the uploaded CV text.
 */

export const MAX_CV_CHARS = 12_000;

export function excludedCompanies(profile: CandidateProfile): string[] {
  return profile.experiences.filter((e) => !e.includeInGeneration).map((e) => e.company);
}

function stripExcluded(text: string, excluded: string[]): string {
  if (excluded.length === 0) return text;
  const patterns = excluded.map((name) => new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  return text
    .split("\n")
    .filter((line) => !patterns.some((p) => p.test(line)))
    .join("\n");
}

/** The structured, generation-safe view of the profile (also used for input hashing). */
export function profileForGeneration(profile: CandidateProfile) {
  return {
    headline: profile.headline,
    yearsOfExperience: profile.yearsOfExperience,
    location: profile.location,
    targetRoles: profile.targetRoles,
    workingArrangement: profile.workingArrangement,
    summary: profile.summary,
    skills: {
      production: profile.skills.filter((s) => s.proficiency !== "familiar").map((s) => `${s.name} (${s.category})`),
      familiar: profile.skills.filter((s) => s.proficiency === "familiar").map((s) => `${s.name} (${s.category})`),
    },
    experiences: [...generationExperiences(profile)]
      .sort((a, b) => a.order - b.order)
      .map((e) => ({
        company: e.company,
        role: e.role || undefined,
        period: e.period || undefined,
        summary: e.summary || undefined,
        highlights: e.highlights,
        technologies: e.technologies,
      })),
    cvText: profile.cvText
      ? stripExcluded(profile.cvText, excludedCompanies(profile)).slice(0, MAX_CV_CHARS)
      : undefined,
  };
}

export function serializeCandidateProfile(profile: CandidateProfile): string {
  const { cvText, ...structured } = profileForGeneration(profile);
  const excluded = excludedCompanies(profile);
  const parts = [
    "Candidate profile (the ONLY source of truth about the candidate's experience; empty fields are unknown — do not fill them in):",
    "<candidate_profile>",
    JSON.stringify(structured, null, 2),
    "</candidate_profile>",
    excluded.length > 0
      ? `Excluded experience (disabled by the user): never mention, reference or draw examples from: ${excluded.join(", ")}.`
      : "No experiences are excluded.",
    'Skills under "familiar" are NOT production experience — present them as learning/side-project knowledge only.',
  ];
  if (cvText) {
    parts.push(
      fenceUntrusted(cvText, {
        tag: "candidate_cv",
        label: "uploaded CV text",
        maxChars: MAX_CV_CHARS,
      }),
    );
  }
  return parts.join("\n");
}
