import type { InterviewPackage } from "@/domain/package/schema";
import { sanitizeMermaid } from "@/lib/mermaid-sanitize";
import {
  buildExportDocument,
  collectToc,
  isSafeHref,
  type Block,
  type ExportDocument,
  type Inline,
  type ListItem,
  type TocEntry,
} from "./document";
import { LANGUAGE_LABELS, type ExportLanguage, type ExportTextOptions } from "./shared";
import { SECTION_KEYS } from "@/domain/package/sections";

/**
 * Markdown export. Contains ALL content — including everything that is
 * collapsed in the app — plus bookmark markers, explicit anchors and a TOC.
 */

export interface MarkdownOptions extends ExportTextOptions {
  /** Timestamp shown in the header (defaults to now). */
  exportedAt?: Date | string;
}

/* ------------------------------------------------------------------ */
/* Text helpers                                                         */
/* ------------------------------------------------------------------ */

/** Escapes characters that would otherwise be parsed as raw HTML. */
export function escapeMarkdownText(value: string): string {
  return value.replace(/\\(?=[<>])/g, "\\\\").replace(/</g, "\\<");
}

/**
 * Neutralizes raw HTML inside Markdown fields (outside code fences / code spans)
 * so an exported file cannot carry live <script>/<img onerror> markup into
 * viewers that render HTML. Autolinks (<https://…>) are kept.
 */
export function neutralizeRawHtml(markdown: string): string {
  let fence: string | null = null;
  return markdown
    .split("\n")
    .map((line) => {
      const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (fence) {
        if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
        return line;
      }
      if (marker) {
        fence = marker;
        return line;
      }
      return line
        .split(/(`+[^`]*?`+)/g)
        .map((part, i) => (i % 2 === 1 ? part : part.replace(/<(?=[A-Za-z/!?])(?!(?:https?|mailto):)/g, "\\<")))
        .join("");
    })
    .join("\n");
}

const oneLine = (value: string) => value.replace(/\s*\n+\s*/g, " ").trim();
const escapeLinkText = (value: string) => escapeMarkdownText(value).replace(/([[\]])/g, "\\$1");
const escapeCell = (value: string) => escapeMarkdownText(value).replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");

/** Visible parts of an inline for the given language (empty = hidden). */
function parts(inline: Inline, lang: ExportLanguage): string[] {
  if (inline.kind === "text") return inline.lang === "vi" && lang === "en" ? [] : [inline.text];
  if (lang === "en") return [inline.value.en];
  if (lang === "vi") return [inline.value.vi];
  return [inline.value.en, inline.value.vi];
}

/** Single-line rendering (headings, link text). */
function inlineLine(inline: Inline, lang: ExportLanguage, separator = " / "): string {
  return parts(inline, lang).map(oneLine).join(separator);
}

/** TOC labels stay short: English only in bilingual mode. */
function tocText(inline: Inline, lang: ExportLanguage): string {
  return inlineLine(inline, lang === "bilingual" ? "en" : lang);
}

function fence(code: string, language: string): string {
  const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map((m) => m[0].length));
  const ticks = "`".repeat(longest + 1);
  const info = language.replace(/[^\w+#.-]/g, "");
  return `${ticks}${info}\n${code.replace(/\n+$/, "")}\n${ticks}`;
}

const tagLine = (tags: string[] | undefined) =>
  tags && tags.length > 0 ? tags.map((t) => `\`${t.replace(/`/g, "'")}\``).join(" · ") : "";

/* ------------------------------------------------------------------ */
/* Block rendering                                                      */
/* ------------------------------------------------------------------ */

interface RenderCtx {
  lang: ExportLanguage;
}

function textBlock(inline: Inline, lang: ExportLanguage): string {
  const [first, second] = parts(inline, lang).map((p) => escapeMarkdownText(p.trim()));
  if (first === undefined) return "";
  if (second === undefined) return first;
  return `${first}\n\n${second
    .split("\n")
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n")}`;
}

/** Text inside a list item: bilingual pairs are joined with a hard line break. */
function listText(inline: Inline, lang: ExportLanguage, indent: string): string {
  return parts(inline, lang)
    .map((p) => escapeMarkdownText(oneLine(p)))
    .join(`\\\n${indent}`);
}

function listItemBody(item: ListItem, lang: ExportLanguage, indent: string): string | null {
  const body = listText(item.text, lang, indent);
  if (!body) return null;
  const linked = item.href && isSafeHref(item.href) ? `[${body.replace(/([[\]])/g, "\\$1")}](${item.href})` : body;
  let out = [item.prefix ? `**${escapeMarkdownText(item.prefix)}**` : "", linked, tagLine(item.tags)]
    .filter(Boolean)
    .join(" ");
  if (item.source && isSafeHref(item.source)) out += ` ([source](${item.source}))`;
  if (item.detail) {
    const detail = listText(item.detail, lang, indent);
    if (detail) out += `\\\n${indent}${detail}`;
  }
  return out;
}

function renderList(items: ListItem[], ordered: boolean, task: boolean, lang: ExportLanguage): string {
  const lines: string[] = [];
  let n = 0;
  for (const item of items) {
    const marker = ordered ? `${n + 1}.` : task ? "- [ ]" : "-";
    const indent = " ".repeat((ordered ? `${n + 1}.` : "-").length + 1);
    const body = listItemBody(item, lang, indent);
    if (body === null) continue;
    n++;
    lines.push(`${marker} ${body}`);
  }
  return lines.join("\n");
}

function heading(level: number, value: string): string {
  return `${"#".repeat(Math.min(6, Math.max(1, level)))} ${value}`;
}

function renderBlocks(blocks: Block[], ctx: RenderCtx, depth: number): string[] {
  return blocks.flatMap((block) => renderBlock(block, ctx, depth)).filter((chunk) => chunk.trim().length > 0);
}

function renderBlock(block: Block, ctx: RenderCtx, depth: number): string[] {
  const { lang } = ctx;
  switch (block.type) {
    case "text":
      return [textBlock(block.text, lang)];
    case "markdown":
      return block.lang === "vi" && lang === "en" ? [] : [neutralizeRawHtml(block.source.trim())];
    case "field": {
      const body = renderBlocks(block.blocks, ctx, depth);
      return body.length > 0 ? [`**${escapeMarkdownText(block.label)}**`, ...body] : [];
    }
    case "kv":
      return [
        block.rows
          .map((row) => {
            const body = listItemBody(row, lang, "  ");
            return body === null ? null : `- **${escapeMarkdownText(row.label)}:** ${body}`;
          })
          .filter((line): line is string => line !== null)
          .join("\n"),
      ];
    case "list":
      return [renderList(block.items, Boolean(block.ordered), Boolean(block.task), lang)];
    case "table": {
      const header = `| ${block.headers.map(escapeCell).join(" | ")} |`;
      const divider = `| ${block.headers.map(() => "---").join(" | ")} |`;
      const rows = block.rows.map(
        (row) => `| ${row.map((cell) => escapeCell(parts(cell, lang).join("\n"))).join(" | ")} |`,
      );
      return [[header, divider, ...rows].join("\n")];
    }
    case "code":
      return [
        ...(block.code.caption ? [`_${escapeMarkdownText(oneLine(block.code.caption))}_`] : []),
        fence(block.code.code, block.code.language),
      ];
    case "diagram":
      return [
        fence(sanitizeMermaid(block.diagram.code), "mermaid"),
        ...(block.diagram.caption ? [textBlock({ kind: "bi", value: block.diagram.caption }, lang)] : []),
      ];
    case "tags":
      return [block.tags.map((t) => `\`${t.replace(/`/g, "'")}\``).join(" ")];
    case "followUps":
      return block.items.flatMap((f, i) => [
        `**Follow-up ${i + 1}: ${escapeMarkdownText(inlineLine({ kind: "bi", value: f.question }, lang))}**`,
        textBlock({ kind: "bi", value: f.answer }, lang),
      ]);
    case "group": {
      const title = inlineLine(block.title, lang);
      return [
        ...(block.anchorId ? [`<a id="${block.anchorId}"></a>`] : []),
        heading(depth + 3, escapeMarkdownText(title)),
        ...(block.bookmark ? [`\`${block.bookmark}\``] : []),
        ...renderBlocks(block.blocks, ctx, depth + 1),
      ];
    }
    case "item": {
      const title = [block.prefix, inlineLine(block.title, lang)].filter(Boolean).join(" ");
      const tags = tagLine(block.tags);
      return [
        `<a id="${block.anchorId}"></a>`,
        heading(depth + 3, escapeMarkdownText(title)),
        ...(tags ? [tags] : []),
        ...renderBlocks(block.blocks, ctx, depth + 1),
      ];
    }
    case "note":
      return [`> ${escapeMarkdownText(block.text)}`];
  }
}

/* ------------------------------------------------------------------ */
/* Document                                                             */
/* ------------------------------------------------------------------ */

function renderToc(entries: TocEntry[], lang: ExportLanguage, indent: string): string[] {
  return entries.flatMap((entry) => [
    `${indent}- [${escapeLinkText([entry.prefix, tocText(entry.title, lang)].filter(Boolean).join(" "))}](#${entry.anchorId})`,
    ...renderToc(entry.children, lang, `${indent}  `),
  ]);
}

function sectionTitle(doc: ExportDocument["sections"][number], lang: ExportLanguage): string {
  return `${doc.definition.number}. ${inlineLine({ kind: "bi", value: doc.definition.title }, lang)}`;
}

export function renderMarkdownDocument(
  doc: ExportDocument,
  options: Pick<MarkdownOptions, "language" | "exportedAt">,
): string {
  const { meta } = doc;
  const lang = options.language;
  const exportedAt = options.exportedAt ? new Date(options.exportedAt) : new Date();
  const ctx: RenderCtx = { lang };
  const chunks: string[] = [];

  chunks.push(`<a id="top"></a>`);
  chunks.push(`# ${escapeMarkdownText(`${meta.companyName} — ${meta.jobTitle}`)}`);
  chunks.push(`**Interview preparation package · ${meta.run}**`);
  chunks.push(
    [
      `- **Company:** ${escapeMarkdownText(meta.companyName)} (\`${meta.companyCode}\`)`,
      `- **Position:** ${escapeMarkdownText(meta.jobTitle)}`,
      `- **Package:** \`${meta.slug}\`${meta.isSample ? " (sample)" : ""}`,
      ...(meta.sourceUrl && isSafeHref(meta.sourceUrl) ? [`- **Job posting:** <${meta.sourceUrl}>`] : []),
      `- **Language:** ${LANGUAGE_LABELS[lang]}`,
      `- **Sections:** ${doc.sections.length} of ${SECTION_KEYS.length}`,
      `- **Package updated:** ${meta.updatedAt}`,
      `- **Exported:** ${Number.isNaN(exportedAt.getTime()) ? String(options.exportedAt) : exportedAt.toISOString()}`,
    ].join("\n"),
  );
  chunks.push(
    "> Facts are tagged `verified`, `unverified` or `assumption`. Confirm anything not verified with the recruiter before relying on it.",
  );

  if (doc.sections.length === 0) {
    chunks.push("_No sections with content were selected._");
    return `${chunks.join("\n\n")}\n`;
  }

  chunks.push("## Table of contents");
  chunks.push(
    doc.sections
      .flatMap((section) => [
        `- [${escapeLinkText(`${section.definition.number}. ${tocText({ kind: "bi", value: section.definition.title }, lang)}`)}](#${section.anchorId})`,
        ...renderToc(collectToc(section.blocks), lang, "  "),
      ])
      .join("\n"),
  );

  for (const section of doc.sections) {
    chunks.push("---");
    chunks.push(`<a id="${section.anchorId}"></a>`);
    chunks.push(`## ${escapeMarkdownText(sectionTitle(section, lang))}`);
    chunks.push(`\`${section.bookmark}\``);
    chunks.push(...renderBlocks(section.blocks, ctx, 0));
    chunks.push("[Back to top](#top)");
  }

  return `${chunks.join("\n\n")}\n`;
}

/** Full Markdown export of the selected sections. */
export function buildMarkdown(pkg: InterviewPackage, options: MarkdownOptions): string {
  return renderMarkdownDocument(buildExportDocument(pkg, options.sections), options);
}
