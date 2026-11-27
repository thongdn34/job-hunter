/**
 * Defensive pre-processing of Mermaid source before rendering. Mermaid itself
 * runs with securityLevel "strict" (no click handlers, HTML labels escaped);
 * this additionally removes directives/interactions that could execute code.
 */
export function sanitizeMermaid(source: string): string {
  return source
    .replace(/%%\{[\s\S]*?\}%%/g, "") // init directives (could change securityLevel)
    .split("\n")
    .filter((line) => !/^\s*(click|callback|href)\b/i.test(line))
    .join("\n")
    .replace(/<\/?script[^>]*>/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}
