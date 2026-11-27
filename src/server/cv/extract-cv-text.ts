import "server-only";
import {
  CV_MAX_CHARS,
  checkCvFile,
  normalizeCvText,
  sanitizeCvFileName,
  truncateCvText,
  type CvFileCheck,
  type CvFileKind,
} from "@/domain/profile/cv";

export type CvErrorStatus = 400 | 413 | 415;

/** A user-facing extraction failure with the HTTP status the API should return. */
export class CvExtractionError extends Error {
  readonly status: CvErrorStatus;
  readonly code: string;

  constructor(message: string, status: CvErrorStatus, code: string) {
    super(message);
    this.name = "CvExtractionError";
    this.status = status;
    this.code = code;
  }
}

export interface CvUpload {
  name: string;
  /** MIME type reported by the client (untrusted; extension wins). */
  type?: string;
  bytes: Uint8Array;
}

export interface ExtractedCv {
  fileName: string;
  kind: CvFileKind;
  /** Normalized text, capped at CV_MAX_CHARS. */
  text: string;
  /** Characters after normalization, before capping. */
  originalChars: number;
  truncated: boolean;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

function looksLikePdf(bytes: Uint8Array): boolean {
  // The header may be preceded by a few junk bytes; the spec allows it within the first 1024.
  const limit = Math.min(bytes.length - PDF_MAGIC.length, 1024);
  for (let start = 0; start <= limit; start++) {
    if (PDF_MAGIC.every((b, i) => bytes[start + i] === b)) return true;
  }
  return false;
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  if (!looksLikePdf(bytes)) {
    throw new CvExtractionError("This file doesn't look like a valid PDF.", 400, "invalid_pdf");
  }
  try {
    const { extractText } = await import("unpdf");
    // pdf.js may transfer/detach the buffer, so hand it a copy.
    const { text } = await extractText(new Uint8Array(bytes), { mergePages: true });
    return text;
  } catch (error) {
    const isPassword = error instanceof Error && /password/i.test(error.name + error.message);
    throw new CvExtractionError(
      isPassword
        ? "This PDF is password-protected. Remove the password and upload it again."
        : "We couldn't read this PDF. It may be corrupted — try exporting it again.",
      400,
      isPassword ? "pdf_encrypted" : "pdf_unreadable",
    );
  }
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CvExtractionError(
      "The file isn't valid UTF-8 text. Save it as UTF-8 and try again.",
      400,
      "invalid_encoding",
    );
  }
}

function rejection(check: Extract<CvFileCheck, { ok: false }>): CvExtractionError {
  const status: CvErrorStatus = check.reason === "too-large" ? 413 : check.reason === "empty" ? 400 : 415;
  return new CvExtractionError(check.message, status, check.reason);
}

/**
 * Extracts plain text from an uploaded CV.
 * PDF via unpdf (pages merged); .txt / .md decoded as UTF-8. Max 5 MB; other types are rejected.
 */
export async function extractCvText(upload: CvUpload): Promise<ExtractedCv> {
  const check = checkCvFile({ name: upload.name, size: upload.bytes.byteLength, type: upload.type });
  if (!check.ok) throw rejection(check);

  const raw = check.kind === "pdf" ? await extractPdfText(upload.bytes) : decodeUtf8(upload.bytes);
  const normalized = normalizeCvText(raw);
  if (!normalized) {
    throw new CvExtractionError(
      check.kind === "pdf"
        ? "No text could be extracted. Scanned (image-only) PDFs aren't supported — upload a text-based PDF or a .txt file."
        : "The file contains no text.",
      400,
      "no_text",
    );
  }

  const { text, truncated } = truncateCvText(normalized, CV_MAX_CHARS);
  return {
    fileName: sanitizeCvFileName(upload.name),
    kind: check.kind,
    text,
    originalChars: normalized.length,
    truncated,
  };
}

/** Convenience wrapper for a `File` from `request.formData()`. */
export async function extractCvFromFile(file: File): Promise<ExtractedCv> {
  // Reject by type/size before buffering the upload.
  const check = checkCvFile({ name: file.name, size: file.size, type: file.type });
  if (!check.ok) throw rejection(check);
  const bytes = new Uint8Array(await file.arrayBuffer());
  return extractCvText({ name: file.name, type: file.type, bytes });
}
