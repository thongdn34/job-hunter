"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, RotateCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DiagramStatus = "ready" | "failed";
type PrintStatus = "loading" | "diagrams" | "error" | DiagramStatus;

/** Renders every `pre.mermaid` in the injected export body (strict security level, light theme for paper). */
async function renderExportDiagrams(container: HTMLElement): Promise<DiagramStatus> {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(".jh-export pre.mermaid:not([data-processed])"));
  if (nodes.length === 0) return "ready";
  try {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default" });
    await mermaid.run({ nodes, suppressErrors: true });
    return "ready";
  } catch {
    // Diagram sources stay visible as text.
    return "failed";
  }
}

export interface PrintViewProps {
  /** `/api/packages/[slug]/print?…` — the sanitized `.jh-export` body fragment (see buildPrintBodyUrl). */
  bodyUrl: string;
  backHref: string;
  autoprint: boolean;
  sectionCount: number;
}

const MESSAGES: Record<Exclude<PrintStatus, "ready">, string> = {
  loading: "Loading the package…",
  diagrams: "Preparing diagrams…",
  failed: "Diagrams could not be rendered; their source is shown instead.",
  error: "The print view could not be loaded.",
};

/**
 * Print view body + screen-only toolbar. The (large) export body is fetched after mount and
 * injected once, instead of being rendered by the Server Component — that would send it twice
 * (SSR markup + RSC payload). Then diagrams render, fonts settle, and the print dialog opens
 * when `autoprint` is set.
 */
export function PrintView({ bodyUrl, backHref, autoprint, sectionCount }: PrintViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<PrintStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const printed = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const controller = new AbortController();
    const { signal } = controller;
    void (async () => {
      let html: string;
      try {
        const res = await fetch(bodyUrl, { signal, cache: "no-store", headers: { Accept: "text/html" } });
        if (!res.ok) throw new Error(`Print body request failed (${res.status})`);
        html = await res.text();
      } catch {
        if (!signal.aborted) setStatus("error");
        return;
      }
      if (signal.aborted) return;
      // Server-built from HTML-escaped text + sanitize-html-sanitized Markdown (src/domain/export/html.ts).
      // React renders no children into this container, so it never reconciles over the injected markup.
      container.innerHTML = html;
      setStatus("diagrams");
      const diagrams = await renderExportDiagrams(container);
      if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
      if (signal.aborted) return;
      setStatus(diagrams);
      if (autoprint && !printed.current) {
        printed.current = true;
        window.print();
      }
    })();
    return () => controller.abort();
  }, [bodyUrl, autoprint, attempt]);

  const retry = () => {
    setStatus("loading");
    setAttempt((n) => n + 1);
  };

  const message =
    status === "ready"
      ? `Ready to print · ${sectionCount} section${sectionCount === 1 ? "" : "s"}, everything expanded.`
      : MESSAGES[status];
  const bodyReady = status !== "loading" && status !== "error";

  return (
    <>
      <div
        className="bg-background/95 sticky top-0 z-10 border-b backdrop-blur print:hidden"
        role="region"
        aria-label="Print options"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2">
          <Link href={backHref} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            <ArrowLeft aria-hidden />
            Back to package
          </Link>
          <p className="text-muted-foreground min-w-0 flex-1 text-sm" role="status" aria-live="polite">
            {message}
          </p>
          {status === "error" ? (
            <Button type="button" variant="outline" onClick={retry}>
              <RotateCw aria-hidden />
              Try again
            </Button>
          ) : null}
          <Button type="button" onClick={() => window.print()} disabled={!bodyReady} aria-describedby="print-hint">
            <Printer aria-hidden />
            Print / Save as PDF
          </Button>
          <span id="print-hint" className="sr-only">
            Opens the browser print dialog. Choose &quot;Save as PDF&quot; as the destination to create a PDF.
          </span>
        </div>
      </div>
      <div ref={containerRef} aria-busy={status === "loading" || status === "diagrams"} />
    </>
  );
}
