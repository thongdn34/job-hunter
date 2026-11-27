import { MOCK_CRITERIA, type MockCriterion } from "./schema";

/**
 * Pure scoring helpers for the mock interview (Section 15).
 * Shared by the heuristic evaluator, the AI evaluator (overall is always recomputed
 * deterministically) and the session repository (average score).
 */

export type CriterionScores = Record<MockCriterion, number>;

/** Weighted average used for the overall /10 score. Weights sum to 1. */
export const CRITERION_WEIGHTS: Readonly<CriterionScores> = Object.freeze({
  technicalAccuracy: 0.35,
  seniorJudgment: 0.25,
  communication: 0.2,
  completeness: 0.2,
});

/** Points removed from the overall score when the recommended answer was revealed before submitting. */
export const REVEAL_PENALTY = 2;

export const MAX_SCORE = 10;

/** Clamps to [0, 10]. Non-finite input (NaN, ±Infinity) maps to 0. */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_SCORE, Math.max(0, value));
}

/** Rounds to one decimal place (half away from zero for positive scores), avoiding float noise like 7.000000001. */
export function roundOneDecimal(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

/** Clamp + round every criterion. */
export function normalizeScores(scores: CriterionScores): CriterionScores {
  const out = {} as CriterionScores;
  for (const c of MOCK_CRITERIA) out[c] = roundOneDecimal(clampScore(scores[c]));
  return out;
}

/** Weighted overall score (0–10, one decimal). Criterion scores are clamped first. */
export function weightedOverall(scores: CriterionScores): number {
  let total = 0;
  for (const c of MOCK_CRITERIA) total += clampScore(scores[c]) * CRITERION_WEIGHTS[c];
  return roundOneDecimal(clampScore(total));
}

/** Applies the reveal penalty to an overall score (never below 0). */
export function applyRevealPenalty(overall: number, revealedBeforeSubmit: boolean): number {
  if (!revealedBeforeSubmit) return roundOneDecimal(clampScore(overall));
  return roundOneDecimal(clampScore(overall - REVEAL_PENALTY));
}

/** Average of overall scores, one decimal; null for an empty list. */
export function averageScore(values: readonly number[]): number | null {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return null;
  return roundOneDecimal(clampScore(valid.reduce((a, b) => a + b, 0) / valid.length));
}

export type ScoreBand = "strong" | "solid" | "developing" | "weak";

/** Qualitative band for a /10 score (used for labels; never color alone). */
export function scoreBand(score: number): ScoreBand {
  if (score >= 8) return "strong";
  if (score >= 6) return "solid";
  if (score >= 4) return "developing";
  return "weak";
}

export const SCORE_BAND_LABELS: Record<ScoreBand, { en: string; vi: string }> = {
  strong: { en: "Strong", vi: "Tốt" },
  solid: { en: "Solid", vi: "Khá" },
  developing: { en: "Developing", vi: "Cần cải thiện" },
  weak: { en: "Needs work", vi: "Cần luyện thêm" },
};

/* ------------------------------------------------------------------ */
/* Key-term extraction                                                 */
/* ------------------------------------------------------------------ */

/** Common English function words + filler words of spoken interview answers. */
export const STOPWORDS: ReadonlySet<string> = new Set(
  `a about above after again against all almost also although always am among an and any anything are aren't around as at
  be because been before being below between both but by can can't cannot could couldn't did didn't do does doesn't doing
  don't done down during each either else enough especially etc even ever every everything few first for from further get
  gets getting give given go goes going good got great had hadn't has hasn't have haven't having he her here hers herself
  him himself his how however i i'd i'll i'm i've if in into is isn't it it's its itself just keep kind know last least
  less let like likely lot lots made main make makes making many may maybe me might more most mostly much must my myself
  need needs never new next no nor not nothing now of off often on once one only onto or other others otherwise our ours
  ourselves out over own part per perhaps pretty quite rather really right said same say says see seem seems several shall
  she should shouldn't simply since so some something sometimes still such sure take takes than that that's the their
  theirs them themselves then there there's these they they're thing things think this those though through thus to
  together too toward towards two under until up upon us use used uses using usually very via want wants was wasn't way
  ways we we'd we'll we're we've well were weren't what what's whatever when where whether which while who whole whom whose
  why will with within without won't would wouldn't yes yet you you'd you'll you're you've your yours yourself yourselves
  actually basically answer question interview example instance mean means simple simply important typically generally
  usually approach answer also able across already another based better best big bit called case cases different easy
  even fact far found getting hard help helps high higher instead keep large less long low lower mainly mean much
  need number often okay put real really several small start step steps talk tell three understand whole work works
  working e.g i.e etc vs`.split(/\s+/),
);

/** Short tokens that are meaningful technical terms despite their length. */
const SHORT_TECH_TERMS: ReadonlySet<string> = new Set([
  "js",
  "ts",
  "ui",
  "ux",
  "io",
  "db",
  "id",
  "ci",
  "cd",
  "qa",
  "ip",
  "os",
  "vm",
  "go",
  "ai",
  "ml",
  "rx",
  "sse",
  "api",
  "dom",
  "css",
  "ssr",
  "csr",
  "isr",
  "rsc",
  "cdn",
  "tcp",
  "udp",
  "tls",
  "jwt",
  "xss",
  "sql",
  "orm",
  "bff",
  "fps",
  "gpu",
  "cpu",
  "lru",
  "ttl",
  "url",
  "sla",
  "slo",
  "ws",
  "rpc",
  "aws",
  "gcp",
  "k8s",
  "vue",
  "jsx",
  "tsx",
  "npm",
  "rum",
  "lcp",
  "inp",
  "cls",
  "ttfb",
  "dag",
  "fifo",
  "lifo",
  "csp",
  "cors",
  "csrf",
  "spa",
  "mfe",
]);

export interface ExtractedToken {
  /** Lower-cased surface form, e.g. "next.js", "usememo", "server-sent". */
  term: string;
  /** Normalized stem used for matching. */
  stem: string;
  /** Looks like a technical term (camelCase, dotted, digits, acronym, hyphenated, known short tech term). */
  technical: boolean;
}

const TOKEN_RE = /[A-Za-z][A-Za-z0-9]*(?:[.\-+#/][A-Za-z0-9]+)*[+#]?/g;

/** Light suffix stripping so "caching"/"cached"/"caches"/"cache" all match. Deterministic, no dictionary. */
export function stem(word: string): string {
  let w = word.toLowerCase();
  if (w.length <= 3 || /[.\-+#/0-9]/.test(w)) return w;
  const rules: Array<[RegExp, string]> = [
    [/ies$/, "y"],
    [/(ss)es$/, "$1"],
    [/(x|ch|sh)es$/, "$1"],
    [/([^s])s$/, "$1"],
    [/ing$/, ""],
    [/ed$/, ""],
    [/ation$/, ""],
    [/ment$/, ""],
    [/ly$/, ""],
    [/e$/, ""],
  ];
  for (const [re, rep] of rules) {
    if (re.test(w)) {
      const next = w.replace(re, rep);
      if (next.length >= 3) w = next;
      break;
    }
  }
  // A trailing "e" left after a plural strip ("caches" -> "cache") is normalized as well.
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

/** Splits text into tokens, preserving technical shapes like `Next.js`, `useMemo`, `HTTP/2`, `C#`. */
export function tokenize(text: string): ExtractedToken[] {
  const out: ExtractedToken[] = [];
  for (const match of text.matchAll(TOKEN_RE)) {
    const raw = match[0].replace(/[./\-]+$/, "");
    if (!raw) continue;
    const term = raw.toLowerCase();
    const technical =
      /[a-z][A-Z]/.test(raw) || // camelCase / PascalCase inner capital
      /^[A-Z0-9]{2,}s?$/.test(raw) || // ACRONYM(s)
      /[.+#/]/.test(raw) || // dotted / slashed / C++ / C#
      /\d/.test(raw) ||
      (raw.includes("-") && raw.length > 4) ||
      SHORT_TECH_TERMS.has(term);
    out.push({ term, stem: stem(term), technical });
  }
  return out;
}

function isCandidate(token: ExtractedToken): boolean {
  if (STOPWORDS.has(token.term)) return false;
  if (SHORT_TECH_TERMS.has(token.term)) return true;
  if (token.term.length < 4 && !token.technical) return false;
  return true;
}

export interface KeyTerm {
  term: string;
  stem: string;
  technical: boolean;
  weight: number;
}

/**
 * Extracts the most salient terms of a reference text: stopwords removed, technical terms
 * boosted, ranked by (frequency × technical boost), ties broken by first occurrence.
 */
export function extractKeyTerms(text: string, limit = 20): KeyTerm[] {
  const byStem = new Map<string, { term: string; technical: boolean; count: number; first: number }>();
  tokenize(text).forEach((tok, index) => {
    if (!isCandidate(tok)) return;
    const prev = byStem.get(tok.stem);
    if (prev) {
      prev.count += 1;
      prev.technical ||= tok.technical;
    } else {
      byStem.set(tok.stem, { term: tok.term, technical: tok.technical, count: 1, first: index });
    }
  });
  return [...byStem.entries()]
    .map(([s, v]) => ({
      term: v.term,
      stem: s,
      technical: v.technical,
      weight: Math.min(v.count, 3) * (v.technical ? 2 : 1),
      first: v.first,
    }))
    .sort((a, b) => b.weight - a.weight || a.first - b.first)
    .slice(0, Math.max(0, limit))
    .map(({ term, stem: s, technical, weight }) => ({ term, stem: s, technical, weight }));
}

export interface TermCoverage {
  matched: KeyTerm[];
  missing: KeyTerm[];
  /** Weighted coverage ratio 0..1 (1 when there are no terms). */
  ratio: number;
}

/** How many of the key terms the answer mentions (stem match; dotted terms also match without the dot). */
export function termCoverage(terms: readonly KeyTerm[], answer: string): TermCoverage {
  const stems = new Set<string>();
  for (const tok of tokenize(answer)) {
    stems.add(tok.stem);
    if (/[.\-]/.test(tok.term)) {
      stems.add(tok.term.replace(/[.\-]/g, ""));
      for (const part of tok.term.split(/[.\-]/)) if (part) stems.add(stem(part));
    }
  }
  const matched: KeyTerm[] = [];
  const missing: KeyTerm[] = [];
  let total = 0;
  let hit = 0;
  for (const t of terms) {
    total += t.weight;
    const alt = t.term.replace(/[.\-]/g, "");
    if (stems.has(t.stem) || stems.has(alt)) {
      matched.push(t);
      hit += t.weight;
    } else {
      missing.push(t);
    }
  }
  return { matched, missing, ratio: total === 0 ? 1 : hit / total };
}

/** Word count of free text. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
