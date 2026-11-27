import { MATCH_LEVELS, type MatchLevel, type MatchRequirement } from "@/domain/package/schema";

/**
 * Transparent candidate-match scoring.
 *
 *   score = round( Σ(weight × LEVEL_POINTS[level]) / Σ(weight × 1.0) × 100 )
 *
 * - Every requirement contributes `weight` (1..5) to the maximum.
 * - It earns `weight × points` where points depend only on its match level.
 * - "unverified" earns a little credit (the candidate may have it, but it is not evidenced).
 *
 * This is an INTERNAL ESTIMATE for interview preparation, never an employer or ATS evaluation.
 */
export const MATCH_LEVEL_POINTS: Readonly<Record<MatchLevel, number>> = Object.freeze({
  strong: 1.0,
  relevant: 0.75,
  partial: 0.4,
  gap: 0,
  unverified: 0.2,
});

/** Mandatory label shown next to every rendered match score. */
export const MATCH_SCORE_DISCLAIMER = "Internal estimate — not an official employer or ATS evaluation";

/** Human-readable label for every match level (English UI copy). */
export const MATCH_LEVEL_LABELS: Readonly<Record<MatchLevel, string>> = Object.freeze({
  strong: "Strong",
  relevant: "Relevant",
  partial: "Partial",
  gap: "Gap",
  unverified: "Unverified",
});

export type MatchCategory = MatchRequirement["category"];

export const MATCH_CATEGORIES = [
  "required",
  "preferred",
  "domain",
  "soft-skill",
] as const satisfies readonly MatchCategory[];

export const MATCH_CATEGORY_LABELS: Readonly<Record<MatchCategory, string>> = Object.freeze({
  required: "Required",
  preferred: "Preferred",
  domain: "Domain",
  "soft-skill": "Soft skill",
});

/** Only the fields the formula needs, so callers can score partial data. */
export type ScorableRequirement = Pick<MatchRequirement, "weight" | "matchLevel" | "category">;

export interface CategoryScore {
  /** Number of requirements in this category. */
  count: number;
  maxPoints: number;
  earnedPoints: number;
  /** 0–100 for this category alone; 0 when the category is empty. */
  score: number;
}

export interface MatchScore {
  /** 0–100, rounded to the nearest integer. */
  score: number;
  /** Number of requirements per match level (every level present, possibly 0). */
  byLevel: Record<MatchLevel, number>;
  /** Per-category breakdown (every category present, possibly empty). */
  byCategory: Record<MatchCategory, CategoryScore>;
  /** Σ weight (the score if every requirement were "strong"). */
  maxPoints: number;
  /** Σ weight × level points (rounded to 2 decimals to avoid float noise). */
  earnedPoints: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function percent(earned: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((earned / max) * 100)));
}

/** Clamp the weight to the schema's 1..5 range so malformed data cannot skew the result. */
function safeWeight(weight: number): number {
  if (!Number.isFinite(weight)) return 1;
  return Math.min(5, Math.max(1, weight));
}

export function computeMatchScore(requirements: readonly ScorableRequirement[]): MatchScore {
  const byLevel = Object.fromEntries(MATCH_LEVELS.map((l) => [l, 0])) as Record<MatchLevel, number>;
  const raw = Object.fromEntries(
    MATCH_CATEGORIES.map((c) => [c, { count: 0, maxPoints: 0, earnedPoints: 0 }]),
  ) as Record<MatchCategory, { count: number; maxPoints: number; earnedPoints: number }>;

  let maxPoints = 0;
  let earnedPoints = 0;

  for (const req of requirements) {
    const weight = safeWeight(req.weight);
    const earned = weight * MATCH_LEVEL_POINTS[req.matchLevel];
    byLevel[req.matchLevel] += 1;
    maxPoints += weight;
    earnedPoints += earned;
    const cat = raw[req.category];
    cat.count += 1;
    cat.maxPoints += weight;
    cat.earnedPoints += earned;
  }

  const byCategory = Object.fromEntries(
    MATCH_CATEGORIES.map((c) => {
      const v = raw[c];
      return [
        c,
        {
          count: v.count,
          maxPoints: round2(v.maxPoints),
          earnedPoints: round2(v.earnedPoints),
          score: percent(v.earnedPoints, v.maxPoints),
        },
      ];
    }),
  ) as Record<MatchCategory, CategoryScore>;

  return {
    score: percent(earnedPoints, maxPoints),
    byLevel,
    byCategory,
    maxPoints: round2(maxPoints),
    earnedPoints: round2(earnedPoints),
  };
}

/** Qualitative band for the score (display only). */
export function scoreBand(score: number): "strong" | "good" | "moderate" | "low" {
  if (score >= 80) return "strong";
  if (score >= 65) return "good";
  if (score >= 45) return "moderate";
  return "low";
}
