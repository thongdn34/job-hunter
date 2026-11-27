/**
 * Export builders (server/test use). Client components should import from
 * `./options` and `./shared` only — this barrel pulls in marked + sanitize-html.
 */
export { buildMarkdown, escapeMarkdownText, type MarkdownOptions } from "./markdown";
export { buildJson, serializeJson } from "./json";
export {
  buildStandaloneHtml,
  buildStandaloneHtmlParts,
  escapeHtml,
  type HtmlOptions,
  type StandaloneHtmlParts,
} from "./html";
export { buildExportDocument, collectToc, type ExportDocument } from "./document";
export * from "./shared";
export * from "./options";
