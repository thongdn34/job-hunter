import { NextResponse } from "next/server";
import { CV_MAX_BYTES, formatBytes } from "@/domain/profile/cv";
import { CvExtractionError, extractCvFromFile } from "@/server/cv/extract-cv-text";
import { clearCv, saveCv } from "@/server/repositories/profile-repository";
import { internalError, jsonError } from "../_lib/responses";

export const dynamic = "force-dynamic";
// unpdf / pdf.js needs the Node.js runtime.
export const runtime = "nodejs";

/** Allowance for multipart boundaries and part headers on top of the file itself. */
const MULTIPART_OVERHEAD = 64 * 1024;

/** POST /api/profile/cv (multipart/form-data, field "file") -> { profile, extractedChars, truncated } */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return jsonError(415, 'Upload the CV as multipart/form-data with a "file" field.', {
      code: "unsupported_media_type",
    });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > CV_MAX_BYTES + MULTIPART_OVERHEAD) {
    return jsonError(413, `The file is too large; the maximum size is ${formatBytes(CV_MAX_BYTES)}.`, {
      code: "too-large",
    });
  }

  // Content-Length may be absent (chunked uploads), so the body is read with a hard byte cap
  // before multipart parsing; formData() alone would buffer an unbounded body.
  let form: FormData;
  try {
    const body = await readBodyCapped(request, CV_MAX_BYTES + MULTIPART_OVERHEAD);
    if (body === null) {
      return jsonError(413, `The file is too large; the maximum size is ${formatBytes(CV_MAX_BYTES)}.`, {
        code: "too-large",
      });
    }
    form = await new Response(body, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    return jsonError(400, "The upload could not be read. Please try again.", { code: "invalid_form" });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, 'No file was uploaded. Attach the CV in a "file" field.', { code: "missing_file" });
  }

  let extracted;
  try {
    extracted = await extractCvFromFile(file);
  } catch (error) {
    if (error instanceof CvExtractionError) {
      return jsonError(error.status, error.message, { code: error.code });
    }
    return internalError("POST cv (extract)", error);
  }

  try {
    const profile = await saveCv({ fileName: extracted.fileName, text: extracted.text });
    return NextResponse.json({
      profile,
      extractedChars: extracted.text.length,
      truncated: extracted.truncated,
    });
  } catch (error) {
    return internalError("POST cv (save)", error);
  }
}

/** DELETE /api/profile/cv -> { profile } */
export async function DELETE() {
  try {
    const profile = await clearCv();
    return NextResponse.json({ profile });
  } catch (error) {
    return internalError("DELETE cv", error);
  }
}

/** Reads the request body, returning null as soon as it exceeds `maxBytes`. */
async function readBodyCapped(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}
