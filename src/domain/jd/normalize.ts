import type { NormalizedJd } from "./schema";

/**
 * Pure job-description normalization helpers (no DOM, no network).
 *
 * Job descriptions are UNTRUSTED data. Nothing here interprets the content
 * beyond text cleanup and structural heading detection; any "instructions"
 * found in the text are only flagged with a warning, never followed.
 */

/** Hard cap aligned with JdInputSchema / CreatePackageRequestSchema. */
export const MAX_JD_TEXT_LENGTH = 60_000;
/** Below this many characters a JD is very likely incomplete. */
export const SHORT_JD_THRESHOLD = 300;

export const JD_SECTION_KINDS = [
  "overview",
  "responsibilities",
  "requirements",
  "niceToHave",
  "benefits",
  "company",
  "compensation",
  "other",
] as const;
export type JdSectionKind = (typeof JD_SECTION_KINDS)[number];

export interface DetectedJdSection {
  kind: JdSectionKind;
  heading: string;
  items: string[];
}

/* ------------------------------------------------------------------ */
/* Text cleanup                                                        */
/* ------------------------------------------------------------------ */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  bull: "•",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
  euro: "€",
  laquo: "«",
  raquo: "»",
  times: "×",
  shy: "",
  zwj: "",
  zwnj: "",
};

/** Decodes named (common subset) and numeric HTML entities. Unknown entities are left untouched. */
export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z][a-z0-9]{1,31});/gi, (match, body: string) => {
    if (body[0] === "#") {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = Number.parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return match;
      return String.fromCodePoint(code);
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? match;
  });
}

/**
 * Whitespace + entity cleanup. Keeps line structure (one logical line per row),
 * collapses runs of spaces, trims lines and limits consecutive blank lines to one.
 */
export function cleanJdText(input: string): string {
  return (
    decodeHtmlEntities(input)
      .normalize("NFC")
      .replace(/\r\n?/g, "\n")
      .replace(/[\u2028\u2029]/g, "\n")
      .replace(/[\u200b-\u200d\u2060\ufeff\u00ad]/g, "")
      .replace(/[\t\f\v\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]+/g, " ")
      // Strip remaining control characters (keep \n).
      .replace(/[\u0000-\u0008\u000e-\u001f\u007f]/g, "")
      .split("\n")
      .map((line) => line.replace(/ {2,}/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/* ------------------------------------------------------------------ */
/* Heading detection                                                   */
/* ------------------------------------------------------------------ */

/**
 * Ordered: the first matching rule wins, so more specific rules come first
 * ("Preferred qualifications" is nice-to-have, not requirements).
 * Each alternative must match the WHOLE heading (plus an optional short qualifier such as
 * "for this role" or "(Must have)"), so content lines like "Requirements gathering with
 * stakeholders" are not mistaken for headings.
 */
const HEADING_ALTERNATIVES: ReadonlyArray<{ kind: JdSectionKind; alternatives: string[] }> = [
  {
    kind: "niceToHave",
    alternatives: [
      "(?:it'?s |it is )?nice[- ]to[- ]haves?",
      "good[- ]to[- ]haves?",
      "bonus(?: points?)?",
      "(?:preferred|desired|desirable|additional) (?:qualifications?|skills?|requirements?|experience)",
      "preferred",
      "pluses",
      "(?:it'?s |would be )?a plus",
      "what would make you stand out",
      "ưu tiên",
      "điểm cộng",
      "(?:các )?(?:yêu cầu|kỹ năng) ưu tiên",
      "ưu tiên ứng viên",
    ],
  },
  {
    kind: "benefits",
    alternatives: [
      "benefits?",
      "perks(?: (?:and|&) benefits)?",
      "(?:our |the )?benefits (?:and|&) perks",
      "what we offer",
      "we offer",
      "what (?:you(?:'ll| will)) get",
      "why you'?ll love working here",
      "why (?:join us|work with us)",
      "top \\d+ reasons to join us",
      "compensation (?:and|&) benefits",
      "quyền lợi(?: được hưởng)?",
      "phúc lợi",
      "chế độ(?: đãi ngộ| phúc lợi)?",
      "đãi ngộ",
      "tại sao bạn sẽ yêu thích làm việc tại đây",
      "vì sao nên gia nhập",
    ],
  },
  {
    kind: "compensation",
    alternatives: ["salary(?: range)?", "compensation", "pay(?: range)?", "mức lương", "lương", "thu nhập"],
  },
  {
    kind: "requirements",
    alternatives: [
      "(?:job |key |minimum |basic |technical |our |the )?requirements?",
      "(?:required |minimum |basic |key )?qualifications?",
      "(?:required |must[- ]have |technical |key )?skills(?: (?:and|&) (?:experience|qualifications))?",
      "your skills (?:and|&) experience",
      "must[- ]haves?",
      "who you are",
      "what (?:we'?re|we are) looking for",
      "what you(?:'ll)? (?:need|bring)",
      "about you",
      "you have",
      "experience (?:and|&) skills",
      "yêu cầu(?: công việc| ứng viên| kỹ năng| chuyên môn)?",
      "kỹ năng(?: (?:và|&) kinh nghiệm)?",
      "trình độ",
      "tiêu chuẩn",
    ],
  },
  {
    kind: "responsibilities",
    alternatives: [
      "(?:key |main |job |your |primary |core |the )?(?:responsibilit(?:y|ies)|duties)",
      "roles? (?:and|&) responsibilities",
      "what you(?:'ll| will) do",
      "job descriptions?",
      "(?:the |your )?role",
      "in this role(?:,? you will)?",
      "day[- ]to[- ]day",
      "you will",
      "trách nhiệm(?: công việc)?",
      "nhiệm vụ",
      "công việc(?: chính)?",
      "mô tả công việc",
      "chi tiết công việc",
    ],
  },
  {
    kind: "company",
    alternatives: [
      "about (?:us|the company|the team|our company)",
      "who we are",
      "our (?:company|mission|story|team)",
      "company (?:overview|description|profile)",
      "về (?:chúng tôi|công ty)",
      "giới thiệu(?: về)? công ty",
    ],
  },
  {
    kind: "overview",
    alternatives: [
      "job (?:summary|overview)",
      "about (?:the|this) (?:job|role|position|opportunity)",
      "(?:position|role) (?:summary|overview)",
      "overview",
      "summary",
      "the opportunity",
      "mô tả",
      "tổng quan",
    ],
  },
];

/** Optional trailing qualifier: "(Must have)", "for this role", "at ISB", "của bạn". */
const HEADING_SUFFIX =
  "(?:\\s*\\(.{1,40}\\)|\\s+(?:for|of|at|in|tại|của|cho|dành cho)\\s.{1,40}|\\s+(?:bạn|you'?ll get))?";

const HEADING_RULES: ReadonlyArray<{ kind: JdSectionKind; pattern: RegExp }> = HEADING_ALTERNATIVES.map(
  ({ kind, alternatives }) => ({ kind, pattern: new RegExp(`^(?:${alternatives.join("|")})${HEADING_SUFFIX}$`, "u") }),
);

/** Lines longer than this are treated as content, never as headings. */
const MAX_HEADING_LENGTH = 80;

/** Removes Markdown heading/bold markers and trailing colons so the heading text is display-ready. */
/** "1. ", "2) ", "IV. " numbering in front of a heading. */
const HEADING_NUMBER = /^(?:\d{1,2}|[IVX]{1,4})[.)]\s+/u;

/**
 * Display-ready heading text: removes Markdown heading/bold markers, numbering, leading
 * decorative symbols/emoji ("🔹 Key Responsibilities") and trailing colons.
 */
export function cleanHeadingText(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/^__(.+)__$/, "$1")
    .replace(HEADING_NUMBER, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[\s:：]+$/, "")
    .trim();
}

/**
 * Classifies a line as a known JD section heading (EN + VI). Returns null for content lines.
 * Explicit Markdown headings ("## Anything") and short lines ending in ":" are "other" headings.
 * Numbered lines ("2. Yêu cầu") count only when they name a known section.
 */
export function classifyHeading(rawLine: string): JdSectionKind | null {
  const line = rawLine.trim();
  if (!line || line.length > MAX_HEADING_LENGTH) return null;
  const isMarkdownHeading = /^#{1,6}\s+\S/.test(line);
  const isNumbered = HEADING_NUMBER.test(line);
  if (!isMarkdownHeading && !isNumbered && BULLET_PREFIX.test(line)) return null;

  const text = cleanHeadingText(line);
  if (!text) return null;
  const lower = text.toLowerCase().normalize("NFC");
  // A heading is short; a sentence that merely starts with "Requirements are ..." is not.
  const words = lower.split(/\s+/).length;
  const endsLikeSentence = /[.!?]$/.test(lower);

  if (!endsLikeSentence && words <= 10) {
    for (const rule of HEADING_RULES) {
      if (rule.pattern.test(lower)) return rule.kind;
    }
  }
  if (isNumbered) return null;
  if (isMarkdownHeading) return "other";
  if (/[:：]$/.test(line) && words <= 8 && !endsLikeSentence) return "other";
  return null;
}

/* ------------------------------------------------------------------ */
/* Bullets                                                             */
/* ------------------------------------------------------------------ */

const BULLET_PREFIX = /^(?:[-*+>–—](?=\s)|[•·●○◦▪▫■□‣⁃✓✔➢➤►▶]|\d{1,2}[.)](?=\s)|\(\d{1,2}\)(?=\s)|[a-z][)](?=\s))\s*/u;
const INLINE_BULLET = /\s+[•·●▪◦‣➢➤►✓✔]\s+/u;

/** Strips a leading bullet / list-number marker from a line. */
export function stripBullet(line: string): string {
  return line.replace(BULLET_PREFIX, "").trim();
}

/**
 * Splits a block into list items: one per line, inline "• a • b" bullets expanded,
 * markers stripped, empty items dropped.
 */
export function splitBullets(block: string): string[] {
  const items: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    for (const part of line.split(INLINE_BULLET)) {
      const item = stripBullet(part);
      if (item && /[\p{L}\p{N}]/u.test(item)) items.push(item);
    }
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

/** Splits cleaned text into heading-delimited sections. Content before the first heading becomes "Overview". */
export function detectJdSections(text: string): DetectedJdSection[] {
  const sections: DetectedJdSection[] = [];
  let current: DetectedJdSection | null = null;
  const preamble: string[] = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const kind = classifyHeading(line);
    // "Experience with:" inside a known section is a lead-in item, not a new section.
    const isLeadIn = kind === "other" && !/^#{1,6}\s/.test(line) && current !== null && current.kind !== "other";
    if (kind && !isLeadIn) {
      current = { kind, heading: cleanHeadingText(line), items: [] };
      sections.push(current);
      continue;
    }
    const items = splitBullets(line);
    if (current) current.items.push(...items);
    else preamble.push(...items);
  }

  const result = sections.filter((s) => s.items.length > 0);
  if (preamble.length > 0) result.unshift({ kind: "overview", heading: "Overview", items: preamble });
  return result;
}

/* ------------------------------------------------------------------ */
/* Warnings                                                            */
/* ------------------------------------------------------------------ */

const LOGIN_WALL_PATTERNS: readonly RegExp[] = [
  /\b(?:sign|log) ?in to (?:view|see|apply|continue|access)\b/i,
  /\bjoin (?:linkedin|now) to (?:see|view)\b/i,
  /\bplease (?:sign|log) ?in\b/i,
  /\byou must be (?:signed|logged) in\b/i,
  /\b(?:enable|turn on) javascript\b/i,
  /\b(?:are you a robot|verify you are (?:a )?human|captcha|unusual traffic)\b/i,
  /\baccess denied\b/i,
  /đăng nhập để (?:xem|tiếp tục|ứng tuyển)/iu,
  /vui lòng đăng nhập/iu,
];

/** True when the text looks like a login wall / bot check rather than a job description. */
export function looksLikeLoginWall(text: string): boolean {
  const sample = text.slice(0, 4000);
  return LOGIN_WALL_PATTERNS.some((p) => p.test(sample));
}

const INJECTION_PATTERNS: readonly RegExp[] = [
  /\bignore (?:all |any )?(?:the )?(?:previous|prior|above) (?:instructions|prompts?)\b/i,
  /\b(?:system prompt|you are (?:now )?(?:chatgpt|an? ai|a language model))\b/i,
  /\bdisregard (?:all |the )?(?:previous|above) (?:instructions|rules)\b/i,
];

/** Flags text that appears to contain instructions aimed at an AI model (it is still treated as data). */
export function containsPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

export function buildJdWarnings(
  text: string,
  sections: DetectedJdSection[],
  opts: { truncated?: boolean } = {},
): string[] {
  const warnings: string[] = [];
  if (looksLikeLoginWall(text)) {
    warnings.push(
      "The page looks like a sign-in wall or bot check, not a job description. Paste the job description manually for accurate results.",
    );
  }
  if (text.length < SHORT_JD_THRESHOLD) {
    warnings.push(
      `The job description is very short (${text.length} characters) and may be incomplete. Consider pasting the full text.`,
    );
  }
  const known = sections.filter((s) => s.kind !== "overview" && s.kind !== "other");
  if (text.length >= SHORT_JD_THRESHOLD && known.length === 0) {
    warnings.push(
      "No standard sections (responsibilities, requirements, benefits) were detected; the analysis may be less precise.",
    );
  }
  if (opts.truncated) {
    warnings.push(`The job description was truncated to ${MAX_JD_TEXT_LENGTH.toLocaleString("en-US")} characters.`);
  }
  if (containsPromptInjection(text)) {
    warnings.push(
      "The text contains phrases that look like instructions to an AI. They will be treated as plain data and ignored.",
    );
  }
  return warnings;
}

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

export interface NormalizeJdInput {
  companyName: string;
  jobTitle?: string;
  rawText: string;
  sourceUrl?: string;
  origin: NormalizedJd["origin"];
  location?: string;
  employmentType?: string;
  /** Extra warnings from the extractor (e.g. "title not detected"). */
  warnings?: string[];
  /** Injected clock for deterministic tests. */
  now?: Date;
}

function cleanInline(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = cleanJdText(value)
    .replace(/\s*\n\s*/g, " ")
    .trim();
  return cleaned || undefined;
}

function safeHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Builds a NormalizedJd from raw (already HTML-free) text. Pure and deterministic given `now`. */
export function normalizeJdText(input: NormalizeJdInput): NormalizedJd {
  let text = cleanJdText(input.rawText);
  const truncated = text.length > MAX_JD_TEXT_LENGTH;
  if (truncated) text = text.slice(0, MAX_JD_TEXT_LENGTH).trimEnd();

  const detected = detectJdSections(text);
  const warnings = [...(input.warnings ?? []), ...buildJdWarnings(text, detected, { truncated })];

  return {
    companyName: cleanInline(input.companyName) ?? "",
    jobTitle: cleanInline(input.jobTitle) ?? "",
    location: cleanInline(input.location),
    employmentType: cleanInline(input.employmentType),
    sourceUrl: safeHttpUrl(input.sourceUrl),
    origin: input.origin,
    text: text || "(empty)",
    sections: detected.map(({ heading, items }) => ({ heading, items })),
    extractedAt: (input.now ?? new Date()).toISOString(),
    warnings: Array.from(new Set(warnings)),
  };
}

/** Human label for an employment type token such as "FULL_TIME". */
export function formatEmploymentType(value: string): string {
  return value
    .split(/[,/]/)
    .map((v) =>
      v
        .trim()
        .replace(/[_-]+/g, " ")
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase()),
    )
    .filter(Boolean)
    .join(", ");
}
