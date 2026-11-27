import type { InterviewPackage } from "@/domain/package/schema";
import { SECTION_KEYS } from "@/domain/package/sections";
import { renderMarkdown } from "@/lib/markdown";
import { sanitizeMermaid } from "@/lib/mermaid-sanitize";
import {
  buildExportDocument,
  collectToc,
  isSafeHref,
  type Block,
  type ExportDocument,
  type ExportSection,
  type Inline,
  type ListItem,
  type TocEntry,
} from "./document";
import { EXPORT_CSS, EXPORT_SCRIPT, MERMAID_CDN_URL, MERMAID_SRI, STANDALONE_PAGE_CSS } from "./html-assets";
import { LANGUAGE_LABELS, type ExportLanguage, type ExportTextOptions } from "./shared";

/**
 * Standalone HTML export: one self-contained file with inline CSS, accordion
 * items as <details> (works without JS), bookmark markers, a TOC sidebar,
 * a small language switch, and Mermaid diagrams that stay readable offline.
 * Every text value is HTML-escaped; Markdown fields go through renderMarkdown (sanitize-html allowlist).
 */

export interface HtmlOptions extends ExportTextOptions {
  /** Render every <details> open (print view). */
  expanded?: boolean;
  /** Include the JS-only toolbar (language switch, expand/collapse, print). Default true. */
  interactive?: boolean;
  exportedAt?: Date | string;
}

export interface StandaloneHtmlParts {
  title: string;
  /** Scoped stylesheet (no <style> tag). */
  css: string;
  /** Root `.jh-export` element markup (safe to inject). */
  body: string;
  /** Inline progressive-enhancement script (no <script> tag). */
  script: string;
}

/* ------------------------------------------------------------------ */
/* Escaping helpers                                                     */
/* ------------------------------------------------------------------ */

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

const attr = escapeHtml;

/** Plain text -> paragraphs (blank lines) with <br> for single newlines. */
function paragraphs(value: string, attrs = ""): string {
  return value
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p${attrs}>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/* ------------------------------------------------------------------ */
/* Inline + blocks                                                      */
/* ------------------------------------------------------------------ */

/** Inline rendering; both languages are emitted and toggled by CSS classes on the root. */
function inlineHtml(inline: Inline): string {
  if (inline.kind === "text") {
    const langAttr = inline.lang === "vi" ? ` lang="vi" data-lang="vi"` : ` lang="en"`;
    return `<span${langAttr}>${escapeHtml(inline.text)}</span>`;
  }
  return (
    `<span lang="en" data-lang="en">${escapeHtml(inline.value.en)}</span>` +
    `<span class="jh-sep" data-lang="both" aria-hidden="true"> / </span>` +
    `<span lang="vi" data-lang="vi">${escapeHtml(inline.value.vi)}</span>`
  );
}

function textBlockHtml(inline: Inline): string {
  if (inline.kind === "text") {
    return inline.lang === "vi"
      ? `<div class="jh-vi-block" lang="vi" data-lang="vi">${paragraphs(inline.text)}</div>`
      : `<div lang="en">${paragraphs(inline.text)}</div>`;
  }
  return (
    `<div class="jh-bi">` +
    `<div lang="en" data-lang="en">${paragraphs(inline.value.en)}</div>` +
    `<div lang="vi" data-lang="vi">${paragraphs(inline.value.vi)}</div>` +
    `</div>`
  );
}

function tagClass(tag: string): string {
  return `jh-tag jh-tag-${tag.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function tagsHtml(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return "";
  return ` <span class="jh-tags">${tags.map((t) => `<span class="${attr(tagClass(t))}">${escapeHtml(t)}</span>`).join("")}</span>`;
}

function linkHtml(href: string, content: string): string {
  if (!isSafeHref(href)) return content;
  const external = !href.startsWith("#");
  return `<a href="${attr(href)}"${external ? ` target="_blank" rel="noopener noreferrer"` : ""}>${content}</a>`;
}

function listItemContent(item: ListItem): string {
  const text = inlineHtml(item.text);
  let out = item.prefix ? `<strong>${escapeHtml(item.prefix)}</strong> ` : "";
  out += item.href ? linkHtml(item.href, text) : text;
  out += tagsHtml(item.tags);
  if (item.source && isSafeHref(item.source))
    out += ` <span class="jh-source">(${linkHtml(item.source, "source")})</span>`;
  if (item.detail) out += `<span class="jh-detail">${inlineHtml(item.detail)}</span>`;
  return out;
}

function headingTag(level: number): string {
  return `h${Math.min(6, Math.max(2, level))}`;
}

interface HtmlCtx {
  expanded: boolean;
}

function blocksHtml(blocks: Block[], ctx: HtmlCtx, depth: number): string {
  return blocks.map((block) => blockHtml(block, ctx, depth)).join("\n");
}

function blockHtml(block: Block, ctx: HtmlCtx, depth: number): string {
  switch (block.type) {
    case "text":
      return textBlockHtml(block.text);
    case "markdown": {
      const langAttr = block.lang === "vi" ? ` lang="vi" data-lang="vi"` : ` lang="en"`;
      return `<div class="jh-md${block.lang === "vi" ? " jh-vi-block" : ""}"${langAttr}>${renderMarkdown(block.source)}</div>`;
    }
    case "field": {
      const h = headingTag(depth + 3);
      return `<div class="jh-field"><${h} class="jh-field-label">${escapeHtml(block.label)}</${h}>${blocksHtml(block.blocks, ctx, depth + 1)}</div>`;
    }
    case "kv":
      return `<dl class="jh-kv">${block.rows
        .map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${listItemContent(row)}</dd></div>`)
        .join("")}</dl>`;
    case "list": {
      if (block.task) {
        return `<ul class="jh-list jh-tasks">${block.items
          .map((item) => `<li><label><input type="checkbox"> <span>${listItemContent(item)}</span></label></li>`)
          .join("")}</ul>`;
      }
      const tag = block.ordered ? "ol" : "ul";
      return `<${tag} class="jh-list">${block.items.map((item) => `<li>${listItemContent(item)}</li>`).join("")}</${tag}>`;
    }
    case "table":
      return (
        `<div class="jh-table-wrap" role="region" aria-label="${attr(block.headers.join(", "))}" tabindex="0"><table>` +
        `<thead><tr>${block.headers.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join("")}</tr></thead>` +
        `<tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${inlineHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>` +
        `</table></div>`
      );
    case "code": {
      const language = block.code.language.replace(/[^\w+#.-]/g, "");
      const pre = `<pre tabindex="0"><code class="language-${attr(language)}">${escapeHtml(block.code.code)}</code></pre>`;
      return block.code.caption
        ? `<figure class="jh-figure">${pre}<figcaption>${escapeHtml(block.code.caption)}</figcaption></figure>`
        : pre;
    }
    case "diagram": {
      const caption = block.diagram.caption
        ? `<figcaption>${inlineHtml({ kind: "bi", value: block.diagram.caption })}</figcaption>`
        : "";
      return (
        `<figure class="jh-figure jh-diagram" aria-label="${attr(`${block.diagram.kind} diagram`)}">` +
        `<pre class="mermaid" tabindex="0">${escapeHtml(sanitizeMermaid(block.diagram.code))}</pre>${caption}</figure>`
      );
    }
    case "tags":
      return `<ul class="jh-chips">${block.tags.map((t) => `<li><code>${escapeHtml(t)}</code></li>`).join("")}</ul>`;
    case "followUps":
      return `<ol class="jh-followups">${block.items
        .map(
          (f) =>
            `<li><p class="jh-followup-q">${inlineHtml({ kind: "bi", value: f.question })}</p>${textBlockHtml({ kind: "bi", value: f.answer })}</li>`,
        )
        .join("")}</ol>`;
    case "group": {
      const h = headingTag(depth + 3);
      const id = block.anchorId ? ` id="${attr(block.anchorId)}"` : "";
      const bookmark = block.bookmark && block.anchorId ? bookmarkHtml(block.bookmark, block.anchorId) : "";
      return `<section class="jh-group"${id}>${bookmark}<${h}>${inlineHtml(block.title)}</${h}>${blocksHtml(block.blocks, ctx, depth + 1)}</section>`;
    }
    case "item":
      return (
        `<details class="jh-item" id="${attr(block.anchorId)}"${ctx.expanded ? " open" : ""}>` +
        `<summary>${block.prefix ? `<span class="jh-item-prefix">${escapeHtml(block.prefix)}</span>` : ""}` +
        `<span class="jh-item-title">${inlineHtml(block.title)}</span>${tagsHtml(block.tags)}</summary>` +
        `<div class="jh-item-body">${blocksHtml(block.blocks, ctx, depth + 1)}</div></details>`
      );
    case "note":
      return `<p class="jh-note">${escapeHtml(block.text)}</p>`;
  }
}

function bookmarkHtml(bookmark: string, anchorId: string): string {
  return (
    `<p class="jh-bookmark"><code data-bookmark="${attr(bookmark)}">${escapeHtml(bookmark)}</code>` +
    `<a class="jh-anchor" href="#${attr(anchorId)}" aria-label="${attr(`Link to ${bookmark}`)}">#</a></p>`
  );
}

/* ------------------------------------------------------------------ */
/* Document                                                             */
/* ------------------------------------------------------------------ */

function tocEntriesHtml(entries: TocEntry[]): string {
  if (entries.length === 0) return "";
  return `<ol>${entries
    .map(
      (e) =>
        `<li><a href="#${attr(e.anchorId)}">${e.prefix ? `${escapeHtml(e.prefix)} ` : ""}${inlineHtml(e.title)}</a>${tocEntriesHtml(e.children)}</li>`,
    )
    .join("")}</ol>`;
}

function countEntries(entries: TocEntry[]): number {
  return entries.reduce((n, e) => n + 1 + countEntries(e.children), 0);
}

function sectionTitleHtml(section: ExportSection): string {
  return `${section.definition.number}. ${inlineHtml({ kind: "bi", value: section.definition.title })}`;
}

function tocHtml(doc: ExportDocument): string {
  const items = doc.sections
    .map((section) => {
      const children = collectToc(section.blocks);
      const nested =
        children.length > 0
          ? `<details><summary>${countEntries(children)} entries</summary>${tocEntriesHtml(children)}</details>`
          : "";
      return `<li><a href="#${attr(section.anchorId)}">${sectionTitleHtml(section)}</a>${nested}</li>`;
    })
    .join("");
  return `<nav class="jh-toc" aria-labelledby="jh-toc-title"><h2 class="jh-toc-title" id="jh-toc-title">Contents</h2><ol>${items}</ol></nav>`;
}

function controlsHtml(lang: ExportLanguage): string {
  const langButton = (mode: ExportLanguage, label: string, title: string) =>
    `<button type="button" class="jh-btn" data-set-lang="${mode}" aria-pressed="${mode === lang}" title="${attr(title)}">${label}</button>`;
  return (
    `<div class="jh-controls" data-js-only hidden role="toolbar" aria-label="Display options">` +
    `<div class="jh-segmented" role="group" aria-label="Language">` +
    langButton("en", "EN", "English only") +
    langButton("vi", "VI", "Vietnamese only") +
    langButton("bilingual", "EN + VI", "Bilingual") +
    `</div>` +
    `<button type="button" class="jh-btn" data-action="expand">Expand all</button>` +
    `<button type="button" class="jh-btn" data-action="collapse">Collapse all</button>` +
    `<button type="button" class="jh-btn" data-action="print">Print / PDF</button>` +
    `</div>`
  );
}

function formatDate(value: Date | string | undefined): string {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

export function renderHtmlDocument(doc: ExportDocument, options: Omit<HtmlOptions, "sections">): StandaloneHtmlParts {
  const lang = options.language;
  const interactive = options.interactive ?? true;
  const ctx: HtmlCtx = { expanded: options.expanded ?? false };
  const { meta } = doc;
  const title = `${meta.companyName} — ${meta.jobTitle} · Interview package`;

  const metaRows: Array<[string, string]> = [
    ["Company", `${escapeHtml(meta.companyName)} (<code>${escapeHtml(meta.companyCode)}</code>)`],
    ["Position", escapeHtml(meta.jobTitle)],
    ["Package", `<code>${escapeHtml(meta.slug)}</code>${meta.isSample ? " (sample)" : ""}`],
    ...(meta.sourceUrl && isSafeHref(meta.sourceUrl)
      ? ([["Job posting", linkHtml(meta.sourceUrl, escapeHtml(meta.sourceUrl))]] as Array<[string, string]>)
      : []),
    ["Language", escapeHtml(LANGUAGE_LABELS[lang])],
    ["Sections", `${doc.sections.length} of ${SECTION_KEYS.length}`],
    ["Updated", escapeHtml(meta.updatedAt)],
    ["Exported", escapeHtml(formatDate(options.exportedAt))],
  ];

  const sectionsHtml =
    doc.sections.length === 0
      ? `<p class="jh-note">No sections with content were selected.</p>`
      : doc.sections
          .map(
            (section) =>
              `<section class="jh-section" id="${attr(section.anchorId)}" aria-labelledby="${attr(`${section.anchorId}-title`)}">` +
              bookmarkHtml(section.bookmark, section.anchorId) +
              `<h2 id="${attr(`${section.anchorId}-title`)}">${sectionTitleHtml(section)}</h2>` +
              blocksHtml(section.blocks, ctx, 0) +
              `<p class="jh-back"><a href="#jh-top">Back to top</a></p>` +
              `</section>`,
          )
          .join("\n");

  const body =
    `<div class="jh-export lang-${lang}" data-jh-export data-lang-mode="${lang}" lang="en">` +
    `<a class="jh-skip" href="#jh-main">Skip to content</a>` +
    `<header class="jh-header" id="jh-top"><div>` +
    `<p class="jh-eyebrow">Interview preparation package · ${escapeHtml(meta.run)}</p>` +
    `<h1>${escapeHtml(`${meta.companyName} — ${meta.jobTitle}`)}</h1>` +
    `<dl class="jh-meta">${metaRows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>` +
    `</div>${interactive ? controlsHtml(lang) : ""}</header>` +
    `<div class="jh-layout">${doc.sections.length > 0 ? tocHtml(doc) : ""}` +
    `<main class="jh-main" id="jh-main" tabindex="-1">${sectionsHtml}</main></div>` +
    `<footer class="jh-footer">Generated by Job Hunter. Facts are tagged verified / unverified / assumption — confirm anything unverified with the recruiter.</footer>` +
    `</div>`;

  return { title, css: EXPORT_CSS, body, script: EXPORT_SCRIPT };
}

/** Builds the scoped parts (used by the print route to embed the export in the app). */
export function buildStandaloneHtmlParts(pkg: InterviewPackage, options: HtmlOptions): StandaloneHtmlParts {
  return renderHtmlDocument(buildExportDocument(pkg, options.sections), options);
}

const MERMAID_BLOCK = '<pre class="mermaid"';

/** True when the rendered body contains at least one Mermaid block (see `blocksHtml`). */
function hasDiagrams(body: string): boolean {
  return body.includes(MERMAID_BLOCK);
}

/** Complete, self-contained HTML document. */
export function buildStandaloneHtml(pkg: InterviewPackage, options: HtmlOptions): string {
  const parts = buildStandaloneHtmlParts(pkg, options);
  const interactive = options.interactive ?? true;
  return [
    "<!doctype html>",
    `<html lang="en">`,
    "<head>",
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<meta name="color-scheme" content="light dark">`,
    `<meta name="generator" content="Job Hunter">`,
    `<title>${escapeHtml(parts.title)}</title>`,
    `<style>${STANDALONE_PAGE_CSS}${parts.css}</style>`,
    // The loader is only useful to the inline script, and only when there is a diagram to render.
    interactive && hasDiagrams(parts.body)
      ? `<script defer src="${MERMAID_CDN_URL}" integrity="${MERMAID_SRI}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>`
      : "",
    "</head>",
    "<body>",
    parts.body,
    interactive ? `<script>${parts.script}</script>` : "",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
