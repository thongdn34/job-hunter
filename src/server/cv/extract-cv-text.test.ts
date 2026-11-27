// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CV_MAX_BYTES, CV_MAX_CHARS } from "@/domain/profile/cv";
import { CvExtractionError, extractCvFromFile, extractCvText } from "./extract-cv-text";

const enc = (s: string) => new TextEncoder().encode(s);

/** Builds a minimal single-page PDF that draws `text` with Helvetica. */
function makePdf(text: string): Uint8Array {
  const stream = `BT /F1 24 Tf 72 700 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return enc(out);
}

async function expectRejection(promise: Promise<unknown>, status: number, code?: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(CvExtractionError);
  expect((error as CvExtractionError).status).toBe(status);
  if (code) expect((error as CvExtractionError).code).toBe(code);
  return error as CvExtractionError;
}

describe("extractCvText", () => {
  it("decodes .txt as UTF-8 and normalizes whitespace", async () => {
    const result = await extractCvText({
      name: "cv.txt",
      type: "text/plain",
      bytes: enc("Nguyễn Văn A\t\tSenior Engineer\r\n\r\n\r\nReact   TypeScript  "),
    });
    expect(result).toEqual({
      fileName: "cv.txt",
      kind: "text",
      text: "Nguyễn Văn A Senior Engineer\n\nReact TypeScript",
      originalChars: "Nguyễn Văn A Senior Engineer\n\nReact TypeScript".length,
      truncated: false,
    });
  });

  it("accepts Markdown files", async () => {
    const result = await extractCvText({ name: "cv.md", bytes: enc("# Jane\n\n- React") });
    expect(result.kind).toBe("text");
    expect(result.text).toBe("# Jane\n\n- React");
  });

  it("caps stored text at 100k characters", async () => {
    const result = await extractCvText({ name: "cv.txt", bytes: enc("a".repeat(CV_MAX_CHARS + 50)) });
    expect(result.text).toHaveLength(CV_MAX_CHARS);
    expect(result.truncated).toBe(true);
    expect(result.originalChars).toBe(CV_MAX_CHARS + 50);
  });

  it("rejects .docx with a clear 415 message", async () => {
    const error = await expectRejection(
      extractCvText({
        name: "cv.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        bytes: enc("PK"),
      }),
      415,
      "word",
    );
    expect(error.message).toMatch(/aren't supported yet/);
  });

  it("rejects unsupported types with 415", async () => {
    await expectRejection(
      extractCvText({ name: "photo.png", type: "image/png", bytes: enc("x") }),
      415,
      "unsupported-type",
    );
  });

  it("rejects empty, whitespace-only and non-UTF-8 text with 400", async () => {
    await expectRejection(extractCvText({ name: "cv.txt", bytes: new Uint8Array() }), 400, "empty");
    await expectRejection(extractCvText({ name: "cv.txt", bytes: enc(" \n\t ") }), 400, "no_text");
    await expectRejection(
      extractCvText({ name: "cv.txt", bytes: new Uint8Array([0xff, 0xfe, 0xfd]) }),
      400,
      "invalid_encoding",
    );
  });

  it("rejects files over 5MB with 413", async () => {
    await expectRejection(extractCvText({ name: "cv.txt", bytes: new Uint8Array(CV_MAX_BYTES + 1) }), 413, "too-large");
  });

  it("rejects files that are not really PDFs", async () => {
    await expectRejection(extractCvText({ name: "cv.pdf", bytes: enc("hello") }), 400, "invalid_pdf");
  });

  it("extracts text from a PDF", async () => {
    const result = await extractCvText({
      name: "cv.pdf",
      type: "application/pdf",
      bytes: makePdf("Hello   CV Senior Engineer"),
    });
    expect(result.kind).toBe("pdf");
    expect(result.text).toBe("Hello CV Senior Engineer");
  });

  it("extractCvFromFile reads a File", async () => {
    const file = new File(["Jane Doe"], "folder/cv.txt", { type: "text/plain" });
    const result = await extractCvFromFile(file);
    expect(result.text).toBe("Jane Doe");
  });
});
