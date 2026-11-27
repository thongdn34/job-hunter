/**
 * CV upload rules shared by the browser (pre-validation) and the server (authoritative check).
 * Pure TypeScript — no Node or DOM APIs.
 */

/** Maximum accepted upload size: 5 MB. */
export const CV_MAX_BYTES = 5 * 1024 * 1024;
/** Maximum stored CV text length (matches CandidateProfileSchema.cvText). */
export const CV_MAX_CHARS = 100_000;
/** Value for `<input type="file" accept>`. */
export const CV_ACCEPT = ".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown";
export const CV_SUPPORTED_LABEL = "PDF, TXT or Markdown";

export type CvFileKind = "pdf" | "text";

export type CvRejectReason = "empty" | "too-large" | "word" | "unsupported-type";

export type CvFileCheck = { ok: true; kind: CvFileKind } | { ok: false; reason: CvRejectReason; message: string };

export interface CvFileDescriptor {
  name: string;
  size: number;
  /** MIME type as reported by the browser / multipart part. May be empty. */
  type?: string;
}

const TEXT_EXTENSIONS = new Set(["txt", "md", "markdown"]);
const WORD_EXTENSIONS = new Set(["docx", "doc", "odt", "rtf", "pages"]);
const TEXT_MIME = new Set(["text/plain", "text/markdown", "text/x-markdown"]);

export function fileExtension(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Classifies an upload by extension (preferred) or MIME type and enforces the size limit. */
export function checkCvFile(file: CvFileDescriptor): CvFileCheck {
  const ext = fileExtension(file.name);
  const mime = (file.type ?? "").split(";")[0]!.trim().toLowerCase();

  let kind: CvFileKind | null = null;
  if (ext === "pdf") kind = "pdf";
  else if (TEXT_EXTENSIONS.has(ext)) kind = "text";
  else if (WORD_EXTENSIONS.has(ext) || mime.includes("wordprocessingml") || mime === "application/msword") {
    return {
      ok: false,
      reason: "word",
      message:
        "Word documents (.docx/.doc) aren't supported yet. Export your CV as PDF, or save it as a .txt or .md file, and upload that instead.",
    };
  } else if (!ext && mime === "application/pdf") kind = "pdf";
  else if (!ext && TEXT_MIME.has(mime)) kind = "text";

  if (!kind) {
    return {
      ok: false,
      reason: "unsupported-type",
      message: `Unsupported file type${ext ? ` (.${ext})` : ""}. Upload a ${CV_SUPPORTED_LABEL} file.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, reason: "empty", message: "The file is empty." };
  }
  if (file.size > CV_MAX_BYTES) {
    return {
      ok: false,
      reason: "too-large",
      message: `The file is ${formatBytes(file.size)}; the maximum size is ${formatBytes(CV_MAX_BYTES)}.`,
    };
  }
  return { ok: true, kind };
}

/**
 * Normalizes extracted CV text: unifies line endings, removes control characters and BOMs,
 * collapses runs of horizontal whitespace, trims lines and limits blank lines to one.
 */
export function normalizeCvText(raw: string): string {
  return (
    raw
      .replace(/^﻿/, "")
      .replace(/\r\n?/g, "\n")
      // Form feeds / vertical tabs (page breaks) become line breaks.
      .replace(/[\f\v]/g, "\n")
      // Remove remaining control characters except tab and newline.
      .replace(/[\u0000-\u0008\u000E-\u001F\u007F]/g, "")
      // Non-breaking and other exotic spaces -> regular space.
      .replace(/[\t   -   　]+/g, " ")
      .replace(/[​‌‍⁠﻿]/g, "")
      .replace(/ {2,}/g, " ")
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Caps text at `max` characters without splitting a surrogate pair. */
export function truncateCvText(text: string, max: number = CV_MAX_CHARS): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  let end = max;
  const code = text.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  return { text: text.slice(0, end).trimEnd(), truncated: true };
}

/** Strips path segments and control characters from an uploaded file name. */
export function sanitizeCvFileName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
  return (base || "cv").slice(0, 255);
}
