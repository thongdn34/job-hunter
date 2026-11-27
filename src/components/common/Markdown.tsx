"use client";

import { memo, useMemo } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

/** Renders sanitized Markdown with consistent prose styles. */
export const Markdown = memo(function Markdown({ source, className }: { source: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  return <div className={cn("prose-content", className)} dangerouslySetInnerHTML={{ __html: html }} />;
});
