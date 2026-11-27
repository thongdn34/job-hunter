"use client";

import { useProgressSync } from "./use-progress-sync";

/** Render-nothing helper so server components can enable progress sync for a package. */
export function ProgressSync({ slug }: { slug: string }) {
  useProgressSync(slug);
  return null;
}
