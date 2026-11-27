import { describe, expect, it } from "vitest";
import { CV_MAX_BYTES, checkCvFile, fileExtension, normalizeCvText, sanitizeCvFileName, truncateCvText } from "./cv";

describe("checkCvFile", () => {
  it("accepts pdf, txt and md by extension", () => {
    expect(checkCvFile({ name: "cv.PDF", size: 10 })).toEqual({ ok: true, kind: "pdf" });
    expect(checkCvFile({ name: "cv.txt", size: 10 })).toEqual({ ok: true, kind: "text" });
    expect(checkCvFile({ name: "cv.md", size: 10, type: "" })).toEqual({ ok: true, kind: "text" });
  });

  it("falls back to MIME type when there is no extension", () => {
    expect(checkCvFile({ name: "cv", size: 10, type: "application/pdf" })).toEqual({ ok: true, kind: "pdf" });
    expect(checkCvFile({ name: "cv", size: 10, type: "text/plain; charset=utf-8" })).toEqual({
      ok: true,
      kind: "text",
    });
  });

  it("explains that Word documents are not supported yet", () => {
    const result = checkCvFile({ name: "cv.docx", size: 10 });
    expect(result).toMatchObject({ ok: false, reason: "word" });
    if (!result.ok) expect(result.message).toMatch(/\.docx.*aren't supported yet/);
  });

  it("rejects other types, empty and oversized files", () => {
    expect(checkCvFile({ name: "cv.png", size: 10, type: "image/png" })).toMatchObject({
      ok: false,
      reason: "unsupported-type",
    });
    expect(checkCvFile({ name: "cv.txt", size: 0 })).toMatchObject({ ok: false, reason: "empty" });
    expect(checkCvFile({ name: "cv.pdf", size: CV_MAX_BYTES + 1 })).toMatchObject({ ok: false, reason: "too-large" });
    expect(checkCvFile({ name: "cv.pdf", size: CV_MAX_BYTES })).toMatchObject({ ok: true });
  });
});

describe("text helpers", () => {
  it("normalizes whitespace", () => {
    const raw = "﻿Jane\tDoe  \r\n\r\n\r\n\r\nSenior  Engineer\u0007\fPage 2 ";
    expect(normalizeCvText(raw)).toBe("Jane Doe\n\nSenior Engineer\nPage 2");
  });

  it("truncates without splitting surrogate pairs", () => {
    expect(truncateCvText("abc", 5)).toEqual({ text: "abc", truncated: false });
    expect(truncateCvText("ab😀", 3)).toEqual({ text: "ab", truncated: true });
  });

  it("extracts extensions and sanitizes names", () => {
    expect(fileExtension("a/b/My.CV.Md")).toBe("md");
    expect(fileExtension(".bashrc")).toBe("");
    expect(sanitizeCvFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeCvFileName("   ")).toBe("cv");
  });
});
