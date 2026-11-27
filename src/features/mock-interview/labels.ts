import type { Bilingual } from "@/domain/common/schema";
import type { MockCriterion } from "@/domain/mock/schema";
import type { MockEvaluation } from "@/domain/mock/schema";

export const CRITERION_LABELS: Record<MockCriterion, Bilingual> = {
  technicalAccuracy: { en: "Technical accuracy", vi: "Độ chính xác kỹ thuật" },
  seniorJudgment: { en: "Senior judgment", vi: "Tư duy senior" },
  communication: { en: "Communication", vi: "Giao tiếp" },
  completeness: { en: "Completeness", vi: "Độ đầy đủ" },
};

export const EVALUATOR_LABELS: Record<MockEvaluation["evaluator"], { label: string; description: string }> = {
  ai: { label: "AI evaluator", description: "Scored by the configured AI model against the rubric." },
  heuristic: {
    label: "Heuristic evaluator",
    description: "Scored offline by key-term coverage and structure signals (no AI key needed).",
  },
};

export function formatScore(score: number): string {
  return Number.isInteger(score) ? `${score}.0` : score.toFixed(1);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}
