"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string | (() => string);
  label?: string;
  className?: string;
  size?: "sm" | "default" | "icon" | "xs";
  variant?: "outline" | "ghost" | "secondary" | "default";
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for insecure contexts.
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    try {
      el.select();
      return typeof document.execCommand === "function" && document.execCommand("copy");
    } catch {
      return false;
    } finally {
      document.body.removeChild(el);
    }
  }
}

/**
 * Copies text and reports the result through a toast (a polite live region), so screen-reader
 * users hear "Copied" / the failure (WCAG 4.1.3). The accessible name stays the stable `label`
 * (visible text, or `aria-label` for icon-only buttons); only the icon swaps briefly.
 */
export function CopyButton({ text, label = "Copy", className, size = "sm", variant = "outline" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);
  // The icon reset must not fire after unmount (it would update a removed component).
  useEffect(() => () => window.clearTimeout(resetTimer.current), []);
  const iconOnly = size === "icon";
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-1.5", className)}
      aria-label={iconOnly ? label : undefined}
      onClick={async () => {
        const value = typeof text === "function" ? text() : text;
        if (await copyToClipboard(value)) {
          setCopied(true);
          toast.success("Copied to clipboard");
          window.clearTimeout(resetTimer.current);
          resetTimer.current = window.setTimeout(() => setCopied(false), 1500);
        } else {
          toast.error("Could not copy to clipboard");
        }
      }}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {!iconOnly && <span>{label}</span>}
    </Button>
  );
}
