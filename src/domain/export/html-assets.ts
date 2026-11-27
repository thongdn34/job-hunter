/**
 * Inline assets for the standalone HTML export. Everything is scoped under
 * `.jh-export` so the same markup can be embedded in the app's print route
 * without leaking styles into (or inheriting from) the app shell.
 */

/**
 * Mermaid UMD build for the standalone export, pinned to the exact version the app bundles
 * (package.json `mermaid`) and loaded with Subresource Integrity, so a later publish or a CDN
 * compromise cannot run script inside an exported file (it holds CV-derived answers and contact
 * details). When bumping mermaid, update both constants:
 *   curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A
 */
export const MERMAID_VERSION = "12.3.0";
export const MERMAID_CDN_URL = `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`;
export const MERMAID_SRI = "sha384-HHW54r639fK42Ip0coGF3mz8oSiGn0eEoWNTLs75X7H63pLSDBa0Tqs0RwGmLlXE";

const LIGHT_VARS = `
  --jh-bg: #ffffff;
  --jh-fg: #1f2328;
  --jh-muted: #59636e;
  --jh-border: #d1d9e0;
  --jh-card: #f6f8fa;
  --jh-accent: #0a58ca;
  --jh-accent-soft: #ddebff;
  --jh-code-bg: #f3f4f6;
  --jh-vi: #4a5563;
  --jh-ok: #1a7f37;
  --jh-ok-bg: #dafbe1;
  --jh-warn: #9a6700;
  --jh-warn-bg: #fff8c5;
  --jh-risk: #b42318;
  --jh-risk-bg: #ffebe9;
  color-scheme: light;`;

const DARK_VARS = `
  --jh-bg: #0d1117;
  --jh-fg: #e6edf3;
  --jh-muted: #9198a1;
  --jh-border: #30363d;
  --jh-card: #151b23;
  --jh-accent: #6cb6ff;
  --jh-accent-soft: #12263f;
  --jh-code-bg: #161b22;
  --jh-vi: #b6bec8;
  --jh-ok: #57d364;
  --jh-ok-bg: #12261e;
  --jh-warn: #e3b341;
  --jh-warn-bg: #2b2111;
  --jh-risk: #ff7b72;
  --jh-risk-bg: #2d1416;
  color-scheme: dark;`;

export const EXPORT_CSS = `
.jh-export {${LIGHT_VARS}
  background: var(--jh-bg);
  color: var(--jh-fg);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
@media (prefers-color-scheme: dark) {
  .jh-export {${DARK_VARS}
  }
}
html.dark .jh-export {${DARK_VARS}
}
html.light .jh-export {${LIGHT_VARS}
}
.jh-export *, .jh-export *::before, .jh-export *::after { box-sizing: border-box; }
.jh-export a { color: var(--jh-accent); text-decoration: underline; text-underline-offset: 2px; }
.jh-export a:hover { text-decoration-thickness: 2px; }
.jh-export :focus-visible { outline: 3px solid var(--jh-accent); outline-offset: 2px; border-radius: 4px; }
.jh-export h1, .jh-export h2, .jh-export h3, .jh-export h4, .jh-export h5, .jh-export h6 { line-height: 1.3; margin: 1.4em 0 0.5em; font-weight: 650; }
.jh-export h1 { font-size: 1.75rem; margin-top: 0.25em; }
.jh-export h2 { font-size: 1.45rem; }
.jh-export h3 { font-size: 1.2rem; }
.jh-export h4 { font-size: 1.05rem; }
.jh-export h5, .jh-export h6 { font-size: 0.95rem; }
.jh-export p { margin: 0.5em 0; }
.jh-export ul, .jh-export ol { margin: 0.5em 0; padding-left: 1.5em; }
.jh-export ul { list-style: disc; }
.jh-export ol { list-style: decimal; }
.jh-export li { margin: 0.25em 0; }
.jh-export code, .jh-export pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size: 0.875em; }
.jh-export :not(pre) > code { background: var(--jh-code-bg); border: 1px solid var(--jh-border); border-radius: 4px; padding: 0.05em 0.35em; overflow-wrap: anywhere; }
.jh-export pre { background: var(--jh-code-bg); border: 1px solid var(--jh-border); border-radius: 8px; padding: 0.75rem 1rem; overflow-x: auto; line-height: 1.5; margin: 0.75em 0; }
.jh-export pre code { background: none; border: 0; padding: 0; font-size: inherit; }
.jh-export table { border-collapse: collapse; width: 100%; font-size: 0.925em; }
.jh-export th, .jh-export td { border: 1px solid var(--jh-border); padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; }
.jh-export th { background: var(--jh-card); font-weight: 600; }
.jh-export blockquote { margin: 0.75em 0; padding: 0.25em 1em; border-left: 4px solid var(--jh-border); color: var(--jh-muted); }
.jh-export img { max-width: 100%; height: auto; }

.jh-skip { position: absolute; left: -9999px; top: 0; z-index: 10; background: var(--jh-bg); padding: 0.5rem 1rem; }
.jh-skip:focus { left: 1rem; top: 1rem; }

.jh-header { border-bottom: 1px solid var(--jh-border); padding: 1.25rem 1rem; display: flex; flex-direction: column; gap: 1rem; }
.jh-eyebrow { margin: 0; color: var(--jh-muted); font-size: 0.85rem; letter-spacing: 0.02em; text-transform: uppercase; }
.jh-meta { display: grid; grid-template-columns: max-content 1fr; gap: 0.15rem 1rem; margin: 0.75rem 0 0; font-size: 0.9rem; }
.jh-meta dt { color: var(--jh-muted); }
.jh-meta dd { margin: 0; overflow-wrap: anywhere; }
.jh-controls { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.jh-controls[hidden] { display: none; }
.jh-segmented { display: inline-flex; border: 1px solid var(--jh-border); border-radius: 8px; overflow: hidden; }
.jh-btn { font: inherit; font-size: 0.875rem; color: var(--jh-fg); background: var(--jh-bg); border: 1px solid var(--jh-border); border-radius: 8px; padding: 0.35rem 0.75rem; cursor: pointer; min-height: 2.25rem; }
.jh-btn:hover { background: var(--jh-card); }
.jh-segmented .jh-btn { border: 0; border-radius: 0; border-right: 1px solid var(--jh-border); }
.jh-segmented .jh-btn:last-child { border-right: 0; }
.jh-btn[aria-pressed="true"] { background: var(--jh-accent-soft); color: var(--jh-accent); font-weight: 600; }

.jh-layout { display: block; }
.jh-toc { padding: 1rem; border-bottom: 1px solid var(--jh-border); font-size: 0.9rem; }
.jh-toc-title { margin: 0 0 0.5rem; font-size: 1rem; }
.jh-toc ol { list-style: none; padding-left: 0; margin: 0; }
.jh-toc ol ol { padding-left: 0.9rem; border-left: 1px solid var(--jh-border); margin: 0.25rem 0 0.25rem 0.25rem; }
.jh-toc li { margin: 0.15rem 0; }
.jh-toc a { text-decoration: none; color: var(--jh-fg); display: inline-block; padding: 0.1rem 0; }
.jh-toc a:hover { color: var(--jh-accent); text-decoration: underline; }
.jh-toc details > summary { cursor: pointer; color: var(--jh-muted); font-size: 0.85rem; }
.jh-main { padding: 0 1rem 3rem; min-width: 0; }
@media (min-width: 960px) {
  .jh-header { flex-direction: row; justify-content: space-between; align-items: flex-start; padding: 1.5rem 2rem; }
  .jh-layout { display: grid; grid-template-columns: 300px minmax(0, 1fr); }
  .jh-toc { position: sticky; top: 0; align-self: start; max-height: 100vh; overflow-y: auto; border-bottom: 0; border-right: 1px solid var(--jh-border); padding: 1.25rem; }
  .jh-main { padding: 0 2.5rem 4rem; max-width: 980px; }
}

.jh-section { padding-top: 1.5rem; border-top: 1px solid var(--jh-border); margin-top: 1.5rem; scroll-margin-top: 1rem; }
.jh-section:first-child { border-top: 0; margin-top: 0; }
.jh-section > h2 { margin-top: 0.25rem; }
.jh-bookmark { display: flex; align-items: center; gap: 0.5rem; margin: 0; font-size: 0.8rem; }
.jh-bookmark code { color: var(--jh-muted); }
.jh-anchor { color: var(--jh-muted) !important; text-decoration: none !important; font-weight: 600; padding: 0 0.25rem; }
.jh-group { margin: 1.25rem 0; scroll-margin-top: 1rem; }
.jh-field { margin: 0.9rem 0; }
.jh-field > .jh-field-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--jh-muted); margin: 0 0 0.25rem; }

.jh-item { border: 1px solid var(--jh-border); border-radius: 10px; margin: 0.75rem 0; background: var(--jh-bg); scroll-margin-top: 1rem; }
.jh-item > summary { cursor: pointer; padding: 0.75rem 1rem; list-style: none; display: flex; flex-wrap: wrap; gap: 0.35rem 0.6rem; align-items: baseline; border-radius: 10px; }
.jh-item > summary::-webkit-details-marker { display: none; }
.jh-item > summary::before { content: "▸"; color: var(--jh-muted); transition: transform 0.15s; display: inline-block; width: 1em; flex: none; }
.jh-item[open] > summary::before { transform: rotate(90deg); }
.jh-item[open] > summary { border-bottom: 1px solid var(--jh-border); border-radius: 10px 10px 0 0; background: var(--jh-card); }
.jh-item > summary:hover { background: var(--jh-card); }
.jh-item-prefix { font-weight: 700; color: var(--jh-accent); flex: none; }
.jh-item-title { font-weight: 600; flex: 1 1 16rem; min-width: 0; }
.jh-item-title [data-lang="vi"] { display: block; font-weight: 500; }
.jh-item-body { padding: 0.25rem 1rem 1rem; }
.jh-tags { display: inline-flex; flex-wrap: wrap; gap: 0.3rem; }
.jh-tag { display: inline-block; font-size: 0.72rem; line-height: 1.4; padding: 0.05rem 0.45rem; border-radius: 999px; border: 1px solid var(--jh-border); color: var(--jh-muted); background: var(--jh-card); white-space: nowrap; font-weight: 500; }
.jh-tag-verified { color: var(--jh-ok); background: var(--jh-ok-bg); border-color: transparent; }
.jh-tag-unverified { color: var(--jh-warn); background: var(--jh-warn-bg); border-color: transparent; }
.jh-tag-assumption { color: var(--jh-risk); background: var(--jh-risk-bg); border-color: transparent; }
.jh-chips { list-style: none !important; padding: 0 !important; display: flex; flex-wrap: wrap; gap: 0.35rem; }
.jh-chips li { margin: 0; }
.jh-kv { display: grid; grid-template-columns: 1fr; gap: 0.35rem; margin: 0.5rem 0; }
.jh-kv > div { display: grid; grid-template-columns: 1fr; gap: 0.1rem; }
.jh-kv dt { color: var(--jh-muted); font-size: 0.875rem; font-weight: 600; }
.jh-kv dd { margin: 0; }
@media (min-width: 640px) {
  .jh-kv > div { grid-template-columns: 12rem 1fr; gap: 1rem; }
}
.jh-detail { display: block; color: var(--jh-muted); font-size: 0.925em; }
.jh-source { font-size: 0.85em; }
.jh-tasks { list-style: none !important; padding-left: 0.25rem !important; }
.jh-tasks label { display: inline-flex; gap: 0.5rem; align-items: baseline; }
.jh-bi > [data-lang="vi"], .jh-vi-block { color: var(--jh-vi); }
.jh-export.lang-bilingual .jh-bi > [data-lang="vi"] { border-left: 3px solid var(--jh-border); padding-left: 0.75rem; margin-top: 0.4rem; font-style: normal; }
.jh-export.lang-bilingual .jh-sep { color: var(--jh-muted); }
.jh-md > :first-child { margin-top: 0; }
.jh-md > :last-child { margin-bottom: 0; }
.jh-followups { padding-left: 1.25rem; }
.jh-followups > li { margin: 0.6rem 0; }
.jh-followup-q { font-weight: 600; margin-bottom: 0.25rem; }
.jh-figure { margin: 0.75rem 0; }
.jh-figure figcaption { color: var(--jh-muted); font-size: 0.875rem; margin-top: 0.35rem; }
.jh-export pre.mermaid { background: var(--jh-card); white-space: pre; }
.jh-export pre.mermaid[data-processed] { background: transparent; border-color: transparent; text-align: center; white-space: normal; }
.jh-export pre.mermaid svg { max-width: 100%; height: auto; }
.jh-table-wrap { overflow-x: auto; margin: 0.5rem 0; }
.jh-note { color: var(--jh-muted); font-style: italic; }
.jh-back { font-size: 0.85rem; margin-top: 1.5rem; }
.jh-footer { border-top: 1px solid var(--jh-border); padding: 1rem; color: var(--jh-muted); font-size: 0.8rem; }

/* Language switch: content for every language is in the DOM; classes choose what is visible. */
.jh-export.lang-en [data-lang="vi"], .jh-export.lang-en [data-lang="both"],
.jh-export.lang-vi [data-lang="en"], .jh-export.lang-vi [data-lang="both"],
.jh-export.lang-bilingual .jh-toc [data-lang="vi"], .jh-export.lang-bilingual .jh-toc [data-lang="both"] { display: none !important; }

@media (prefers-reduced-motion: reduce) {
  .jh-item > summary::before { transition: none; }
}

@media print {
  .jh-export, html.dark .jh-export, html.light .jh-export {${LIGHT_VARS}
    font-size: 11pt;
    background: #fff;
  }
  .jh-toc, .jh-controls, .jh-skip, .jh-back, .jh-anchor, .jh-print-hidden { display: none !important; }
  .jh-layout { display: block; }
  .jh-header { padding: 0 0 0.75rem; }
  .jh-main { padding: 0; max-width: none; }
  .jh-section { break-before: page; border-top: 0; margin-top: 0; padding-top: 0; }
  .jh-section:first-child { break-before: auto; }
  .jh-export h2, .jh-export h3, .jh-export h4, .jh-export h5 { break-after: avoid; }
  .jh-export pre, .jh-export table, .jh-figure, .jh-kv > div { break-inside: avoid; }
  .jh-export pre { white-space: pre-wrap; overflow-wrap: anywhere; overflow: visible; }
  /* Print expands everything (the inline script also opens all <details> on beforeprint). */
  .jh-export details::details-content { content-visibility: visible; display: contents; }
  .jh-export details > :not(summary) { display: block !important; }
  .jh-item { border: 0; border-top: 1px solid var(--jh-border); border-radius: 0; margin: 1rem 0 0; }
  .jh-item > summary { padding: 0.5rem 0; background: none !important; border: 0 !important; break-after: avoid; }
  .jh-item > summary::before { content: none; }
  .jh-item-body { padding: 0; }
  .jh-main a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 0.8em; color: var(--jh-muted); overflow-wrap: anywhere; }
}
`;

/** Extra page-level CSS used only by the downloadable standalone file. */
export const STANDALONE_PAGE_CSS = `
html { color-scheme: light dark; }
body { margin: 0; background: #ffffff; }
@media (prefers-color-scheme: dark) { body { background: #0d1117; } }
@media print { body { background: #fff; } }
`;

/**
 * Progressive enhancement for the standalone file: language switch,
 * expand/collapse all, open <details> for #hash targets, expand everything
 * on print, and lazy Mermaid rendering (only for visible diagrams).
 * Content stays fully readable when scripts are disabled or offline.
 */
export const EXPORT_SCRIPT = `
(function () {
  "use strict";
  var root = document.querySelector("[data-jh-export]");
  if (!root) return;
  var MODES = ["en", "vi", "bilingual"];
  var langButtons = root.querySelectorAll("[data-set-lang]");
  var mermaidReady = false;

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function itemDetails() { return root.querySelectorAll(".jh-main details"); }

  function setLang(mode) {
    if (MODES.indexOf(mode) === -1) return;
    each(MODES, function (m) { root.classList.remove("lang-" + m); });
    root.classList.add("lang-" + mode);
    root.setAttribute("data-lang-mode", mode);
    each(langButtons, function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === mode)); });
  }

  function renderDiagrams(scope) {
    var m = window.mermaid;
    if (!m || !mermaidReady) return;
    var nodes = Array.prototype.filter.call(scope.querySelectorAll("pre.mermaid:not([data-processed])"), function (n) {
      return !(n.parentElement && n.parentElement.closest("details:not([open])"));
    });
    if (nodes.length === 0) return;
    try {
      var result = m.run({ nodes: nodes, suppressErrors: true });
      if (result && typeof result.catch === "function") result.catch(function () {});
    } catch (e) { /* keep diagram source visible */ }
  }

  function setAll(open) {
    each(itemDetails(), function (d) { d.open = open; });
    if (open) renderDiagrams(root);
  }

  function openTarget() {
    var id = "";
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
    if (!id) return;
    var el = document.getElementById(id);
    if (!el || !root.contains(el)) return;
    for (var n = el; n && n !== root; n = n.parentElement) if (n.tagName === "DETAILS") n.open = true;
    el.scrollIntoView();
  }

  each(root.querySelectorAll("[data-js-only]"), function (el) { el.hidden = false; });
  setLang(root.getAttribute("data-lang-mode") || "bilingual");

  root.addEventListener("click", function (event) {
    var target = event.target instanceof Element ? event.target.closest("button[data-set-lang], button[data-action]") : null;
    if (!target) return;
    var lang = target.getAttribute("data-set-lang");
    if (lang) return setLang(lang);
    var action = target.getAttribute("data-action");
    if (action === "expand") setAll(true);
    else if (action === "collapse") setAll(false);
    else if (action === "print") window.print();
  });
  root.addEventListener("toggle", function (event) {
    var d = event.target;
    if (d && d.open) renderDiagrams(d);
  }, true);
  window.addEventListener("hashchange", openTarget);

  var reclose = [];
  window.addEventListener("beforeprint", function () {
    reclose = Array.prototype.filter.call(itemDetails(), function (d) { return !d.open; });
    each(reclose, function (d) { d.open = true; });
  });
  window.addEventListener("afterprint", function () {
    each(reclose, function (d) { d.open = false; });
    reclose = [];
  });

  function initMermaid() {
    var m = window.mermaid;
    if (!m) return;
    var dark = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    m.startOnLoad = false;
    m.initialize({ startOnLoad: false, securityLevel: "strict", theme: dark ? "dark" : "default" });
    mermaidReady = true;
    renderDiagrams(root);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initMermaid);
  else initMermaid();
  openTarget();
})();
`;
