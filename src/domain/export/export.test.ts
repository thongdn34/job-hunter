import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { InterviewPackageSchema } from "@/domain/package/schema";
import { itemAnchorId, sectionAnchorId, sectionBookmark, topicBookmark } from "@/domain/package/bookmarks";
import { SECTION_KEYS } from "@/domain/package/sections";
import { exportFixture as pkg } from "./__fixtures__/export-fixture";
import { buildMarkdown, neutralizeRawHtml } from "./markdown";
import { buildJson, serializeJson } from "./json";
import { buildStandaloneHtml, buildStandaloneHtmlParts, escapeHtml } from "./html";
import { buildExportDocument } from "./document";
import { exportBaseName, exportFileName, resolveSections, slugifySegment } from "./shared";
import { MERMAID_CDN_URL, MERMAID_SRI, MERMAID_VERSION } from "./html-assets";

const EXPORTED_AT = "2026-11-27T10:00:00.000Z";
const questions = pkg.sections.bilingual!.questions;

describe("shared helpers", () => {
  it("builds file names like isb-senior-front-end-developer-run10.md", () => {
    expect(exportBaseName(pkg.meta)).toBe("isb-senior-front-end-developer-run10");
    expect(exportFileName(pkg.meta, "md")).toBe("isb-senior-front-end-developer-run10.md");
    expect(slugifySegment("Lập trình viên Đà Nẵng")).toBe("lap-trinh-vien-da-nang");
  });

  it("resolves sections in canonical order and skips sections without content", () => {
    const partial = { ...pkg, sections: { ...pkg.sections, company: undefined } };
    expect(resolveSections(partial, ["bilingual", "jd", "company"])).toEqual(["jd", "bilingual"]);
    expect(resolveSections(partial)).toHaveLength(SECTION_KEYS.length - 1);
  });
});

describe("buildMarkdown", () => {
  const markdown = buildMarkdown(pkg, { language: "bilingual", exportedAt: EXPORTED_AT });

  it("includes every answer, explanation and follow-up answer (collapsed content too)", () => {
    for (const q of questions) {
      expect(markdown).toContain(q.answer);
      expect(markdown).toContain(q.viExplanation);
      expect(markdown).toContain(q.memoryShortcut.en);
      expect(markdown).toContain(q.memoryShortcut.vi);
      expect(markdown).toContain(q.keyTakeaway.en);
      for (const f of q.followUps) {
        expect(markdown).toContain(f.answer.en);
        expect(markdown).toContain(f.answer.vi);
      }
    }
    const sd = pkg.sections.systemDesign!.scenarios[0]!;
    expect(markdown).toContain(sd.recommendedAnswer);
    expect(markdown).toContain(sd.followUps[0]!.answer.vi);
    expect(markdown).toContain("STAR situation");
    expect(markdown).toContain("STAR result");
    expect(markdown).toContain(pkg.sections.coding!.exercises[0]!.followUp.answer.en);
    expect(markdown).toContain("Flashcard answer");
    expect(markdown).toContain("Plan 7d");
    expect(markdown).toContain("Intro script 90s");
  });

  it("renders diagrams as mermaid fences and code with safe fences", () => {
    expect(markdown).toContain("```mermaid\nflowchart LR\n  A1[Client] --> B1[Server]\n```");
    expect(markdown).toContain("```mermaid\nsequenceDiagram\n  C->>G: subscribe\n```");
    // solution code contains ``` so the fence must be longer
    expect(markdown).toContain("````ts\nexport function debounce()");
  });

  it("has a metadata header, bookmarks, anchors and a TOC with internal links", () => {
    expect(markdown).toMatch(/^<a id="top"><\/a>\n\n# ISB Vietnam — Senior Front-End Developer/);
    expect(markdown).toContain("**Exported:** 2026-11-27T10:00:00.000Z");
    expect(markdown).toContain("## Table of contents");
    for (const key of SECTION_KEYS) {
      const anchor = sectionAnchorId("ISB", key);
      expect(markdown).toContain(`\`${sectionBookmark("ISB", key)}\``);
      expect(markdown).toContain(`<a id="${anchor}"></a>`);
      expect(markdown).toContain(`](#${anchor})`);
    }
    expect(markdown).toContain(`\`${topicBookmark("ISB", "REALTIME")}\``);
    for (const q of questions) {
      expect(markdown).toContain(`<a id="${itemAnchorId(q.id)}"></a>`);
      expect(markdown).toContain(`](#${itemAnchorId(q.id)})`);
    }
  });

  it("every internal link target exists", () => {
    const ids = new Set([...markdown.matchAll(/<a id="([^"]+)"><\/a>/g)].map((m) => m[1]));
    const targets = [...markdown.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]);
    expect(targets.length).toBeGreaterThan(20);
    for (const t of targets) expect(ids.has(t), t).toBe(true);
  });

  it("escapes raw HTML in plain text", () => {
    expect(markdown).not.toContain("What does <script>");
    expect(markdown).toContain("What does \\<script>");
  });

  it("neutralizes raw HTML in markdown fields but keeps code untouched", () => {
    expect(markdown).not.toMatch(/(^|[^\\])<script>alert\('x'\)/m);
    expect(markdown).not.toMatch(/(^|[^\\])<img src=x/m);
    expect(markdown).toContain("\\<script>alert('x')");
    expect(neutralizeRawHtml("a <b>x</b> `<i>` <https://x.dev>\n```html\n<div>\n```")).toBe(
      "a \\<b>x\\</b> `<i>` <https://x.dev>\n```html\n<div>\n```",
    );
  });

  it("respects section selection", () => {
    const md = buildMarkdown(pkg, { language: "bilingual", sections: ["jd"], exportedAt: EXPORTED_AT });
    expect(md).toContain(sectionBookmark("ISB", "jd"));
    expect(md).not.toContain(sectionBookmark("ISB", "bilingual"));
    expect(md).not.toContain(questions[0]!.answer);
    expect(md).toContain("**Sections:** 1 of 16");
  });

  it("filters bilingual pairs by language", () => {
    const enOnly = buildMarkdown(pkg, { language: "en", sections: ["bilingual"], exportedAt: EXPORTED_AT });
    expect(enOnly).toContain("Takeaway 1");
    expect(enOnly).not.toContain("Điểm chính 1");
    expect(enOnly).not.toContain(questions[0]!.viExplanation);
    expect(enOnly).toContain(questions[0]!.answer);
    const viOnly = buildMarkdown(pkg, { language: "vi", sections: ["bilingual"], exportedAt: EXPORTED_AT });
    expect(viOnly).toContain("Điểm chính 1");
    expect(viOnly).not.toContain("Takeaway 1");
    expect(viOnly).toContain("## 7. Câu hỏi kỹ thuật song ngữ");
  });

  it("renders links only to items that are exported", () => {
    const md = buildMarkdown(pkg, { language: "en", sections: ["mock"], exportedAt: EXPORTED_AT });
    expect(md).toContain("**SD1.** Design a trading dashboard");
    expect(md).not.toContain(`](#${itemAnchorId("isb-q01")})`);
  });

  it("shows an empty state when nothing is selected", () => {
    const empty = { ...pkg, sections: {} };
    expect(buildMarkdown(empty, { language: "en" })).toContain("No sections with content were selected");
  });
});

describe("buildJson", () => {
  it("round-trips through InterviewPackageSchema", () => {
    const full = buildJson(pkg);
    expect(InterviewPackageSchema.parse(JSON.parse(JSON.stringify(full)))).toEqual(full);
    expect(full).toEqual(InterviewPackageSchema.parse(pkg));
  });

  it("keeps only selected sections", () => {
    const partial = buildJson(pkg, { sections: ["jd", "coding"] });
    expect(Object.keys(partial.sections)).toEqual(["jd", "coding"]);
    expect(Object.keys(partial.sectionStates)).toHaveLength(SECTION_KEYS.length);
    const text = serializeJson(pkg, { sections: ["jd"] });
    expect(InterviewPackageSchema.parse(JSON.parse(text)).sections.jd).toEqual(pkg.sections.jd);
  });

  it("throws on invalid content", () => {
    const broken = { ...pkg, meta: { ...pkg.meta, slug: "Not A Slug" } };
    expect(() => buildJson(broken)).toThrow();
  });
});

describe("buildStandaloneHtml", () => {
  const html = buildStandaloneHtml(pkg, { language: "bilingual", exportedAt: EXPORTED_AT });
  const doc = new DOMParser().parseFromString(html, "text/html");

  it("is a self-contained document with inline CSS, print styles and the mermaid loader", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<style>");
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).toContain("@media print");
    expect(html).toContain(`<script defer src="${MERMAID_CDN_URL}"`);
    expect(html).toContain('securityLevel: "strict"');
    expect(doc.querySelectorAll('link[rel="stylesheet"]')).toHaveLength(0);
  });

  it("loads an exactly pinned Mermaid build with Subresource Integrity", () => {
    expect(MERMAID_CDN_URL).toBe(`https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`);
    expect(MERMAID_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    const loader = doc.querySelector<HTMLScriptElement>("script[src]");
    expect(loader?.getAttribute("src")).toBe(MERMAID_CDN_URL);
    expect(loader?.getAttribute("integrity")).toBe(MERMAID_SRI);
    expect(loader?.getAttribute("crossorigin")).toBe("anonymous");
  });

  it("pins the Mermaid version the app bundles, and the SRI matches that build", () => {
    const mermaidDir = join(process.cwd(), "node_modules", "mermaid");
    const installed = JSON.parse(readFileSync(join(mermaidDir, "package.json"), "utf8")) as { version: string };
    expect(MERMAID_VERSION).toBe(installed.version);
    // jsDelivr serves npm package files verbatim, so the local dist file has the CDN file's hash.
    const digest = createHash("sha384")
      .update(readFileSync(join(mermaidDir, "dist", "mermaid.min.js")))
      .digest("base64");
    expect(MERMAID_SRI).toBe(`sha384-${digest}`);
  });

  it("omits the remote Mermaid script when there is nothing for it to render", () => {
    const noDiagrams = buildStandaloneHtml(pkg, {
      language: "en",
      sections: ["coding", "hr"],
      exportedAt: EXPORTED_AT,
    });
    expect(noDiagrams).not.toContain('<pre class="mermaid"');
    expect(noDiagrams).not.toContain(MERMAID_CDN_URL);
    const nonInteractive = buildStandaloneHtml(pkg, { language: "en", interactive: false, exportedAt: EXPORTED_AT });
    expect(nonInteractive).toContain('<pre class="mermaid"');
    expect(nonInteractive).not.toContain("<script");
  });

  it("renders every question as <details id=item-…> with summary", () => {
    for (const q of questions) {
      const el = doc.getElementById(itemAnchorId(q.id));
      expect(el?.tagName).toBe("DETAILS");
      expect(el?.querySelector(":scope > summary")).not.toBeNull();
      expect(el?.hasAttribute("open")).toBe(false);
      expect(el?.textContent).toContain(q.answer);
      for (const f of q.followUps) expect(el?.textContent).toContain(f.answer.vi);
    }
    expect(html).toContain('<details class="jh-item" id="item-isb-sd01"');
    expect(html).toContain('<details class="jh-item" id="item-isb-c01"');
    expect(html).toContain('<details class="jh-item" id="item-isb-b01"');
  });

  it("has visible bookmark markers with stable section ids", () => {
    for (const key of SECTION_KEYS) {
      const bookmark = sectionBookmark("ISB", key);
      const marker = doc.querySelector(`code[data-bookmark="${bookmark}"]`);
      expect(marker?.textContent).toBe(bookmark);
      expect(doc.getElementById(sectionAnchorId("ISB", key))?.contains(marker!)).toBe(true);
    }
  });

  it("has TOC links that all point at existing ids", () => {
    const links = [...doc.querySelectorAll<HTMLAnchorElement>("nav.jh-toc a[href^='#']")];
    expect(links.length).toBeGreaterThan(SECTION_KEYS.length);
    for (const a of links)
      expect(doc.getElementById(a.getAttribute("href")!.slice(1)), a.getAttribute("href")!).not.toBeNull();
    const allInternal = [...doc.querySelectorAll<HTMLAnchorElement>("a[href^='#']")];
    for (const a of allInternal) expect(doc.getElementById(a.getAttribute("href")!.slice(1))).not.toBeNull();
  });

  it("escapes <script> from content and sanitizes markdown", () => {
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toMatch(/onerror=/i);
    // only our two scripts exist
    expect(doc.querySelectorAll("script")).toHaveLength(2);
  });

  it("includes data-lang attributes and the language switch", () => {
    expect(doc.querySelectorAll('[data-lang="en"]').length).toBeGreaterThan(10);
    expect(doc.querySelectorAll('[data-lang="vi"][lang="vi"]').length).toBeGreaterThan(10);
    const root = doc.querySelector("[data-jh-export]");
    expect(root?.classList.contains("lang-bilingual")).toBe(true);
    expect([...doc.querySelectorAll("[data-set-lang]")].map((b) => b.getAttribute("data-set-lang"))).toEqual([
      "en",
      "vi",
      "bilingual",
    ]);
    expect(doc.querySelector('[data-action="expand"]')).not.toBeNull();
    expect(doc.querySelector('[data-action="collapse"]')).not.toBeNull();
  });

  it("renders code in <pre><code> and diagrams as <pre class=mermaid>", () => {
    expect(doc.querySelector("pre > code.language-ts")?.textContent).toContain("export const value1 = 1;");
    const diagrams = [...doc.querySelectorAll("pre.mermaid")].map((p) => p.textContent);
    expect(diagrams).toContain("flowchart LR\n  A1[Client] --> B1[Server]");
    expect(diagrams.some((d) => d?.startsWith("sequenceDiagram"))).toBe(true);
  });

  it("applies the initial language class and respects section selection", () => {
    const enHtml = buildStandaloneHtml(pkg, { language: "en", sections: ["jd"], exportedAt: EXPORTED_AT });
    expect(enHtml).toContain('class="jh-export lang-en"');
    expect(enHtml).toContain(sectionBookmark("ISB", "jd"));
    expect(enHtml).not.toContain(sectionBookmark("ISB", "bilingual"));
  });

  it("can render a fully expanded, non-interactive body for print", () => {
    const parts = buildStandaloneHtmlParts(pkg, { language: "vi", expanded: true, interactive: false });
    const body = new DOMParser().parseFromString(parts.body, "text/html");
    const details = [...body.querySelectorAll(".jh-main details")];
    expect(details.length).toBeGreaterThan(0);
    expect(details.every((d) => d.hasAttribute("open"))).toBe(true);
    expect(body.querySelector("[data-set-lang]")).toBeNull();
    expect(parts.css).toContain(".jh-export");
  });

  it("produces unique ids", () => {
    const ids = [...doc.querySelectorAll("[id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("buildExportDocument", () => {
  it("links related items only when their section is exported", () => {
    const find = (keys: Parameters<typeof buildExportDocument>[1]) =>
      JSON.stringify(buildExportDocument(pkg, keys).sections.find((s) => s.key === "systemDesign")?.blocks);
    expect(find(["systemDesign"])).not.toContain(`"href":"#${itemAnchorId("isb-q01")}"`);
    expect(find(["systemDesign", "bilingual"])).toContain(`"href":"#${itemAnchorId("isb-q01")}"`);
    // unknown ids are kept as plain text
    expect(find(["systemDesign"])).toContain("unknown-id");
  });

  it("escapeHtml escapes all special characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});
