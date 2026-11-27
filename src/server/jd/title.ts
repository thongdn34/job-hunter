/**
 * Best-effort job title detection for pasted job descriptions (the wizard's job title field is
 * optional and says "Detected from the job description"). Returns undefined when unsure —
 * callers then fall back to "Untitled role". Pure; the text is untrusted data and only matched.
 */

const ROLE_WORDS = [
  "engineer",
  "developer",
  "programmer",
  "designer",
  "architect",
  "manager",
  "lead",
  "leader",
  "analyst",
  "scientist",
  "specialist",
  "consultant",
  "intern",
  "director",
  "officer",
  "administrator",
  "tester",
  "qa",
  "qc",
  "devops",
  "sre",
  "coordinator",
  "executive",
  "technician",
  "kỹ sư",
  "lập trình viên",
  "chuyên viên",
  "trưởng nhóm",
  "thực tập sinh",
];

const ROLE = `(?:${ROLE_WORDS.map((w) => w.replace(/\s+/g, "\\s+")).join("|")})`;
const ROLE_RE = new RegExp(`(?:^|[^\\p{L}])${ROLE}(?:s)?(?=$|[^\\p{L}])`, "iu");
const LABELED_RE =
  /^[\s*_#>]*(?:job\s*title|position|role|title|vị\s*trí(?:\s*tuyển\s*dụng)?|chức\s*danh)\s*[*_]*\s*[:：\-–—]\s*[*_]*\s*(.+?)\s*$/imu;
const HIRING_RE = new RegExp(
  `(?:hiring|looking\\s+for|seeking|recruiting|tuyển(?:\\s+dụng)?)\\s+(?:(?:an?|one|our|two|several)\\s+)?((?:(?!(?:to|who|with|that|and|for|in|at|of|the|will|you|is|are|someone|people)\\s)[\\p{L}\\d+#./&-]+\\s+){0,6}?${ROLE}s?)(?=$|[^\\p{L}])`,
  "iu",
);
const FILLER_ADJECTIVES =
  /^(?:(?:talented|passionate|motivated|experienced|skilled|great|strong|highly|self-driven|curious|new|next)\s+)+/i;
const MAX_TITLE_LENGTH = 100;

function clean(candidate: string): string | undefined {
  let title = candidate
    .replace(/[*_#`>]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[\s.,;:!-]+$/u, "")
    .trim();
  // "Senior Engineer | ACME Careers" / "Senior Engineer - ACME" -> "Senior Engineer"
  title = title.split(/\s+[|–—]\s+|\s+-\s+/)[0]?.trim() ?? "";
  title = title.replace(FILLER_ADJECTIVES, "");
  if (title.length < 2 || title.length > MAX_TITLE_LENGTH) return undefined;
  return title.charAt(0).toLocaleUpperCase() + title.slice(1);
}

function firstLine(text: string): string | undefined {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

export function detectJobTitle(rawText: string): string | undefined {
  const text = rawText.slice(0, 4_000);

  const labeled = LABELED_RE.exec(text)?.[1];
  if (labeled) {
    const title = clean(labeled);
    if (title) return title;
  }

  const first = firstLine(text);
  if (first && first.length <= 80 && first.split(/\s+/).length <= 10 && !/[.!?]$/.test(first) && ROLE_RE.test(first)) {
    const title = clean(first);
    if (title && ROLE_RE.test(title)) return title;
  }

  const hiring = HIRING_RE.exec(text.slice(0, 800))?.[1];
  if (hiring) return clean(hiring);
  return undefined;
}
