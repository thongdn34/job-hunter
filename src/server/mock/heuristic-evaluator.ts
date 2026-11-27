import { GENERIC_FOLLOW_UP } from "@/domain/mock/item-context";
import { MockEvaluationSchema, type MockEvaluation } from "@/domain/mock/schema";
import {
  applyRevealPenalty,
  clampScore,
  countWords,
  extractKeyTerms,
  normalizeScores,
  REVEAL_PENALTY,
  roundOneDecimal,
  scoreBand,
  termCoverage,
  weightedOverall,
  type CriterionScores,
  type KeyTerm,
} from "@/domain/mock/scoring";
import type { EvaluateAnswerInput, MockEvaluator } from "./types";

/**
 * Deterministic evaluator — works without any AI provider.
 *
 * 1. Key terms are extracted from the reference answer (+ memory shortcut and key takeaway,
 *    weighted double because they are the essence of a good answer).
 * 2. Coverage of those terms in the candidate answer drives technical accuracy / completeness.
 * 3. Structure signals (trade-offs, failure/edge cases, scale, examples, signposting) drive
 *    senior judgment / communication.
 * 4. Length bands dampen everything for very short answers and penalize rambling.
 */

const PATTERNS = {
  tradeOff:
    /\b(trade-?offs?|however|but|depends|it depends|on the other hand|whereas|versus|vs\.?|downsides?|drawbacks?|pros|cons|cost of|at the cost|instead of|alternatively|compared (to|with)|balance)\b/i,
  failure:
    /\b(fail(s|ed|ure|ures)?|edge[- ]cases?|errors?|fallbacks?|retr(y|ies)|timeouts?|race conditions?|memory leaks?|back-?pressure|degrad\w*|reconnect\w*|offline|rollback|stale|out of order|duplicates?|idempoten\w*|circuit breaker|monitor\w*|alert\w*)\b/i,
  example:
    /\b(for example|for instance|e\.g\.?|such as|in my (last|previous|current) (role|project|team|job)|at (persefoni|ninja ?van|nab)|i (built|implemented|used|led|designed|migrated|introduced|shipped)|we (built|used|implemented|designed|migrated|introduced|shipped)|imagine|let's say)\b/i,
  scale:
    /\b(scal\w*|performance|latency|throughput|maintainab\w*|observab\w*|bottlenecks?|p9[59]|memory|bundle size|load|concurren\w*|cach\w*)\b/i,
  structure:
    /\b(first(ly)?|second(ly)?|third(ly)?|then|finally|in short|to summari[sz]e|in summary|overall|the key (idea|point) is|step \d)\b|^\s*([-*•]|\d+[.)])\s+/im,
};

export interface AnswerSignals {
  words: number;
  sentences: number;
  avgSentenceWords: number;
  tradeOff: boolean;
  failure: boolean;
  example: boolean;
  scale: boolean;
  structure: boolean;
}

export function detectSignals(answer: string): AnswerSignals {
  const words = countWords(answer);
  const sentences = Math.max(1, answer.split(/[.!?]+(?:\s|$)|\n+/).filter((s) => s.trim().length > 0).length);
  return {
    words,
    sentences,
    avgSentenceWords: words / sentences,
    tradeOff: PATTERNS.tradeOff.test(answer),
    failure: PATTERNS.failure.test(answer),
    example: PATTERNS.example.test(answer),
    scale: PATTERNS.scale.test(answer),
    structure: PATTERNS.structure.test(answer),
  };
}

export type LengthBand = "empty" | "very-short" | "short" | "ok" | "ideal" | "long" | "too-long";

export function lengthBand(words: number): LengthBand {
  if (words < 5) return "empty";
  if (words < 20) return "very-short";
  if (words < 40) return "short";
  if (words < 70) return "ok";
  if (words <= 300) return "ideal";
  if (words <= 450) return "long";
  return "too-long";
}

const LENGTH_FACTOR: Record<LengthBand, number> = {
  empty: 0,
  "very-short": 0.35,
  short: 0.6,
  ok: 0.85,
  ideal: 1,
  long: 0.95,
  "too-long": 0.85,
};

const COMMUNICATION_BASE: Record<LengthBand, number> = {
  empty: 0.5,
  "very-short": 3,
  short: 5,
  ok: 6.5,
  ideal: 8,
  long: 6.5,
  "too-long": 5,
};

/** Key terms: shortcut/takeaway terms (double weight) first, then reference-answer terms. */
export function referenceTerms(input: EvaluateAnswerInput["item"]): KeyTerm[] {
  const essence = [input.memoryShortcut?.en, input.keyTakeaway?.en].filter(Boolean).join("\n");
  const core = extractKeyTerms(essence, 8).map((t) => ({ ...t, weight: t.weight * 2 }));
  const coreStems = new Set(core.map((t) => t.stem));
  const rest = extractKeyTerms(input.referenceAnswer, 20).filter((t) => !coreStems.has(t.stem));
  return [...core, ...rest];
}

export function computeHeuristicScores(signals: AnswerSignals, coverage: number): CriterionScores {
  const band = lengthBand(signals.words);
  const lf = LENGTH_FACTOR[band];
  const damp = 0.4 + 0.6 * lf;
  const cov = Math.min(1, Math.max(0, coverage));

  const technicalAccuracy = (0.5 + 9.5 * Math.sqrt(cov)) * damp;
  const seniorJudgment =
    (1 + (signals.tradeOff ? 3 : 0) + (signals.failure ? 2.5 : 0) + (signals.scale ? 1.5 : 0) + 2 * cov) * damp;
  const communication =
    COMMUNICATION_BASE[band] + (signals.structure ? 1.5 : 0) - (signals.avgSentenceWords > 35 ? 1 : 0);
  const completeness = (0.5 + 6 * cov + (signals.example ? 2 : 0) + 1.5 * lf) * damp;

  let scores: CriterionScores = { technicalAccuracy, seniorJudgment, communication, completeness };
  if (band === "empty") {
    scores = {
      technicalAccuracy: Math.min(technicalAccuracy, 1),
      seniorJudgment: Math.min(seniorJudgment, 1),
      communication: Math.min(communication, 1),
      completeness: Math.min(completeness, 1),
    };
  }
  return normalizeScores(scores);
}

const STRUCTURE_TIPS = {
  short:
    "Structure tip: lead with the one-sentence core idea, explain how it works, name one trade-off, then close with a concrete example.",
  tradeOff: 'Structure tip: after explaining the mechanism, say explicitly what you give up — "the trade-off is …".',
  failure: "Structure tip: add one failure scenario or edge case and how you would detect and recover from it.",
  example: "Structure tip: ground the answer in a concrete example from your own project or a realistic scenario.",
  long: "Structure tip: keep it to 3–4 key points (about 1–2 minutes spoken) and stop — let the interviewer dig deeper.",
  default: "Structure tip: core idea → how it works → trade-off → failure case → real example.",
} as const;

function formatTerms(terms: KeyTerm[], n: number): string {
  return terms
    .slice(0, n)
    .map((t) => t.term)
    .join(", ");
}

export function heuristicEvaluate({ item, answer, revealedBeforeSubmit }: EvaluateAnswerInput): MockEvaluation {
  const text = answer.trim();
  const signals = detectSignals(text);
  const band = lengthBand(signals.words);
  const terms = referenceTerms(item);
  const coverage = termCoverage(terms, text);
  const scores = computeHeuristicScores(signals, coverage.ratio);
  const overall = applyRevealPenalty(weightedOverall(scores), revealedBeforeSubmit);

  const strengths: string[] = [];
  const gaps: string[] = [];
  const vi: string[] = [];

  const covPct = Math.round(coverage.ratio * 100);
  if (band !== "empty") {
    if (coverage.matched.length > 0 && coverage.ratio >= 0.35) {
      strengths.push(
        `Covers key concepts (${covPct}% of the reference terms), e.g. ${formatTerms(coverage.matched, 5)}.`,
      );
    }
    if (signals.tradeOff) strengths.push("Discusses trade-offs — a strong senior-level signal.");
    if (signals.failure) strengths.push("Mentions failure modes or edge cases.");
    if (signals.scale) strengths.push("Considers performance / scalability / maintainability.");
    if (signals.example) strengths.push("Grounds the answer in a concrete example.");
    if (signals.structure) strengths.push("Clear, signposted structure that is easy to follow when spoken.");
    if (band === "ideal") strengths.push(`Good length for a spoken answer (~${signals.words} words).`);
  }

  if (coverage.missing.length > 0 && coverage.ratio < 0.85) {
    gaps.push(`Missing key concepts: ${formatTerms(coverage.missing, 6)}.`);
    vi.push(`Bạn còn thiếu một số ý chính: ${formatTerms(coverage.missing, 6)}.`);
  }
  if (!signals.tradeOff) {
    gaps.push("No trade-offs discussed — say what you gain and what you give up with this approach.");
    vi.push("Hãy nêu rõ trade-off (đánh đổi): giải pháp này được gì và mất gì.");
  }
  if (!signals.failure) {
    gaps.push("No failure scenarios or edge cases (disconnects, slow network, bad data, errors).");
    vi.push("Nên đề cập tình huống lỗi hoặc edge case (mất kết nối, mạng chậm, dữ liệu sai, lỗi server…).");
  }
  if (!signals.example) {
    gaps.push("No concrete example from your experience or a realistic scenario.");
    vi.push(
      "Thêm một ví dụ cụ thể (từ dự án thực tế của bạn hoặc một tình huống thực tế) để câu trả lời thuyết phục hơn.",
    );
  }
  if (band === "empty" || band === "very-short" || band === "short") {
    gaps.push(`Too short for a senior-level answer (${signals.words} words) — aim for roughly 120–250 words.`);
    vi.push(
      "Câu trả lời còn quá ngắn; hãy triển khai theo cấu trúc: ý chính → cách hoạt động → trade-off → ví dụ (khoảng 120–250 từ).",
    );
  } else if (band === "long" || band === "too-long") {
    gaps.push(`Quite long (${signals.words} words) — tighten it to the 3–4 points that matter most.`);
    vi.push("Câu trả lời hơi dài; hãy tập trung vào 3–4 ý quan trọng nhất để dễ nói trong buổi phỏng vấn.");
  }
  if (signals.avgSentenceWords > 35 && band !== "empty") {
    gaps.push("Sentences are long — shorter sentences are easier to follow when spoken.");
    vi.push("Câu văn khá dài; nên chia thành các câu ngắn để người nghe dễ theo dõi.");
  }
  if (revealedBeforeSubmit) {
    gaps.push(`Recommended answer was revealed before submitting (−${REVEAL_PENALTY} points).`);
    vi.push(`Lưu ý: bạn đã xem đáp án gợi ý trước khi nộp nên tổng điểm bị trừ ${REVEAL_PENALTY} điểm.`);
  }

  const bandVi: Record<ReturnType<typeof scoreBand>, string> = {
    strong: "Câu trả lời tốt",
    solid: "Câu trả lời khá",
    developing: "Câu trả lời cần cải thiện thêm",
    weak: "Câu trả lời còn yếu",
  };
  const opening = `${bandVi[scoreBand(overall)]} (${overall}/10).`;
  const shortcut = item.memoryShortcut ? `Mẹo ghi nhớ: ${item.memoryShortcut.vi}` : "";
  const closing =
    gaps.length === 0
      ? "Hãy luyện nói lại câu trả lời thành tiếng trong khoảng 1–2 phút để thật trôi chảy."
      : "Hãy đọc câu trả lời mẫu bằng tiếng Anh bên dưới rồi luyện nói lại bằng lời của bạn.";
  const feedbackVi = [opening, ...vi, shortcut, closing].filter(Boolean).join(" ");

  const tip =
    band === "empty" || band === "very-short" || band === "short"
      ? STRUCTURE_TIPS.short
      : band === "long" || band === "too-long"
        ? STRUCTURE_TIPS.long
        : !signals.tradeOff
          ? STRUCTURE_TIPS.tradeOff
          : !signals.failure
            ? STRUCTURE_TIPS.failure
            : !signals.example
              ? STRUCTURE_TIPS.example
              : STRUCTURE_TIPS.default;
  const reference = item.referenceAnswer.trim();
  const improvedAnswer = reference ? `${tip}\n\n${reference}` : tip;

  const evaluation: MockEvaluation = {
    scores,
    overall: roundOneDecimal(clampScore(overall)),
    strengths,
    gaps,
    improvedAnswer,
    feedbackVi,
    followUpQuestion: item.followUp?.question ?? GENERIC_FOLLOW_UP,
    evaluator: "heuristic",
  };
  return MockEvaluationSchema.parse(evaluation);
}

export const heuristicEvaluator: MockEvaluator = {
  name: "heuristic",
  evaluate: async (input) => heuristicEvaluate(input),
};
