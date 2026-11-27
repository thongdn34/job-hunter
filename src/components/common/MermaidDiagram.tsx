"use client";

import { memo, useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { Diagram } from "@/domain/common/schema";
import { sanitizeMermaid } from "@/lib/mermaid-sanitize";
import { BilingualText } from "./BilingualText";

type MermaidModule = typeof import("mermaid");
let mermaidPromise: Promise<MermaidModule["default"]> | null = null;
function loadMermaid() {
  mermaidPromise ??= import("mermaid").then((m) => m.default);
  return mermaidPromise;
}

/**
 * Lazily renders a Mermaid diagram once it scrolls near the viewport.
 * Mermaid (~1MB) is code-split and only loaded when the first diagram is visible.
 * securityLevel "strict" disables click handlers and escapes HTML labels.
 */
export const MermaidDiagram = memo(function MermaidDiagram({ diagram }: { diagram: Diagram }) {
  const ref = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const { resolvedTheme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: resolvedTheme === "dark" ? "dark" : "default",
          fontFamily: "inherit",
        });
        const id = `mmd-${reactId.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now().toString(36)}`;
        const { svg: out } = await mermaid.render(id, sanitizeMermaid(diagram.code));
        if (!cancelled) {
          setSvg(out);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          // Drop the previous SVG: it belongs to the old code (e.g. before a regenerate/retry)
          // and would otherwise hide the source fallback for the new, invalid code.
          setSvg(null);
          setError(e instanceof Error ? e.message : "Diagram failed to render");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, diagram.code, resolvedTheme, reactId]);

  return (
    <figure className="bg-card my-3 rounded-lg border p-3" data-diagram-kind={diagram.kind}>
      <div ref={ref} className="min-h-24 overflow-x-auto" aria-busy={!svg && !error}>
        {svg ? (
          // Mermaid output is generated from sanitized source with securityLevel=strict.
          <div
            className="mermaid-svg flex justify-center [&_svg]:h-auto [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : error ? (
          <div role="note" className="text-muted-foreground text-xs">
            <p className="mb-2">Diagram could not be rendered; showing source.</p>
            <pre className="bg-muted overflow-x-auto rounded p-2 font-mono">{diagram.code}</pre>
          </div>
        ) : (
          <div className="text-muted-foreground flex h-24 items-center justify-center text-xs">Loading diagram…</div>
        )}
      </div>
      {diagram.caption && (
        <figcaption className="text-muted-foreground mt-2 text-center text-xs">
          <BilingualText value={diagram.caption} />
        </figcaption>
      )}
    </figure>
  );
});
