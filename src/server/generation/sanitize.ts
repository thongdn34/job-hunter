import { DIAGRAM_KINDS } from "@/domain/common/schema";
import { sanitizeMermaid } from "@/lib/mermaid-sanitize";

/**
 * Defence-in-depth sanitization of generated content BEFORE it is stored. Rendering still goes
 * through renderMarkdown (sanitize-html allowlist) and Mermaid securityLevel "strict"; this removes the
 * dangerous constructs at the source so exports (Markdown/HTML/JSON) are clean too.
 *
 * - Diagram objects ({ kind, code }) → sanitizeMermaid.
 * - Code blocks ({ language, code }) and coding solutions are rendered as escaped text → untouched.
 * - Every other string (Markdown / plain text): <script>/<iframe>/<object>/<embed>/<style> blocks,
 *   inline event handlers and javascript:/vbscript:/data: URLs in links, autolinks, link reference
 *   definitions and HTML tag attributes are removed. Fenced code blocks and inline code spans are
 *   left untouched: they render as escaped text, and interview answers legitimately show
 *   `onClick` handlers, XSS examples or prose such as "JavaScript: ES2022".
 */

const DIAGRAM_KIND_SET = new Set<string>(DIAGRAM_KINDS);

const DANGEROUS_BLOCK = /<\s*(script|iframe|object|embed|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_TAG = /<\s*\/?\s*(?:script|iframe|object|embed|style|form|meta|link|base)\b[^>]*>/gi;
const HTML_TAG = /<[a-z!/][^>]*>/gi;
const EVENT_HANDLER = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const UNSAFE_SCHEME = /\b(?:javascript|vbscript)\s*:|\bdata\s*:\s*text\/html/gi;
const UNSAFE_URL_START = "<?\\s*(?:javascript|vbscript|data)\\s*:";
/** `](javascript:alert(1))` — one level of nested parentheses in the target is allowed. */
const MARKDOWN_UNSAFE_LINK = new RegExp(`\\]\\(\\s*${UNSAFE_URL_START}(?:[^()]|\\([^()]*\\))*\\)`, "gi");
/** `<javascript:alert(1)>` autolinks. */
const UNSAFE_AUTOLINK = /<\s*(?:javascript|vbscript|data)\s*:[^>\s]*>/gi;
/** `[ref]: javascript:alert(1)` link reference definitions. */
const UNSAFE_REFERENCE = new RegExp(`^([ \\t]{0,3}\\[[^\\]\\n]+\\]:[ \\t]*)${UNSAFE_URL_START}\\S*`, "gim");

/** Sanitizes Markdown prose (never code). */
function sanitizeProse(text: string): string {
  return text
    .replace(DANGEROUS_BLOCK, "")
    .replace(DANGEROUS_TAG, "")
    .replace(UNSAFE_AUTOLINK, "")
    .replace(HTML_TAG, (tag) => tag.replace(EVENT_HANDLER, "").replace(UNSAFE_SCHEME, ""))
    .replace(MARKDOWN_UNSAFE_LINK, "](#)")
    .replace(UNSAFE_REFERENCE, "$1#");
}

interface Segment {
  code: boolean;
  text: string;
}

const FENCE_OPEN = /^[ \t]*(`{3,}|~{3,})(.*)$/;

/** Splits Markdown into fenced code blocks (``` / ~~~ up to the closing fence or the end) and the rest. */
function splitFencedBlocks(input: string): Segment[] {
  const segments: Segment[] = [];
  const lines = input.split(/(?<=\n)/);
  let prose = "";
  let code = "";
  let fence: { char: string; length: number } | null = null;
  for (const line of lines) {
    const body = line.replace(/\r?\n$/, "");
    if (fence) {
      code += line;
      const close = /^[ \t]*(`{3,}|~{3,})[ \t]*$/.exec(body);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) {
        segments.push({ code: true, text: code });
        code = "";
        fence = null;
      }
      continue;
    }
    const open = FENCE_OPEN.exec(body);
    // A backtick fence's info string cannot contain backticks (CommonMark).
    if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
      if (prose) segments.push({ code: false, text: prose });
      prose = "";
      code = line;
      fence = { char: open[1][0], length: open[1].length };
      continue;
    }
    prose += line;
  }
  if (fence) segments.push({ code: true, text: code });
  else if (prose) segments.push({ code: false, text: prose });
  return segments;
}

/** Splits prose into inline code spans (matching backtick runs, within one paragraph) and the rest. */
function splitInlineCode(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === "\\") {
      i += 2;
      continue;
    }
    if (char !== "`") {
      i += 1;
      continue;
    }
    let run = 1;
    while (text[i + run] === "`") run += 1;
    const closer = findClosingRun(text, i + run, run);
    if (closer === -1) {
      i += run;
      continue;
    }
    if (i > last) segments.push({ code: false, text: text.slice(last, i) });
    segments.push({ code: true, text: text.slice(i, closer + run) });
    i = closer + run;
    last = i;
  }
  if (last < text.length) segments.push({ code: false, text: text.slice(last) });
  return segments;
}

/** Index of the next backtick run of exactly `length`, or -1 (code spans never cross a blank line). */
function findClosingRun(text: string, from: number, length: number): number {
  const paragraphEnd = text.slice(from).search(/\n[ \t]*\n/);
  const end = paragraphEnd === -1 ? text.length : from + paragraphEnd;
  let i = from;
  while (i < end) {
    if (text[i] !== "`") {
      i += 1;
      continue;
    }
    let run = 1;
    while (text[i + run] === "`") run += 1;
    if (run === length) return i;
    i += run;
  }
  return -1;
}

export function sanitizeGeneratedText(input: string): string {
  return splitFencedBlocks(input)
    .map((block) =>
      block.code
        ? block.text
        : splitInlineCode(block.text)
            .map((span) => (span.code ? span.text : sanitizeProse(span.text)))
            .join(""),
    )
    .join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDiagram(value: Record<string, unknown>): boolean {
  return typeof value.code === "string" && typeof value.kind === "string" && DIAGRAM_KIND_SET.has(value.kind);
}

function isCodeBlock(value: Record<string, unknown>): boolean {
  return typeof value.code === "string" && typeof value.language === "string";
}

/** Deep-sanitizes generated section content. Returns a new object; input is not mutated. */
export function sanitizeGeneratedContent<T>(value: T): T {
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") return sanitizeGeneratedText(node);
    if (Array.isArray(node)) return node.map(walk);
    if (!isRecord(node)) return node;
    const out: Record<string, unknown> = {};
    const diagram = isDiagram(node);
    const codeBlock = !diagram && isCodeBlock(node);
    for (const [key, child] of Object.entries(node)) {
      if (key === "code" && typeof child === "string" && diagram) out[key] = sanitizeMermaid(child);
      else if (key === "code" && typeof child === "string" && codeBlock) out[key] = child;
      else out[key] = walk(child);
    }
    return out;
  };
  return walk(value) as T;
}
