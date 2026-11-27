import type { z } from "zod";

/** Repair prompt used once when the model's output fails Zod validation. */
export const REPAIR_TEMPLATE_VERSION = "1";

const MAX_ISSUES = 30;

/** Formats Zod issues as "path: message" lines (bounded, so the repair prompt stays small). */
export function formatZodIssues(
  error: z.ZodError | { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> },
): string {
  const lines = error.issues.slice(0, MAX_ISSUES).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.map(String).join(".") : "(root)";
    return `- ${path}: ${issue.message}`;
  });
  if (error.issues.length > MAX_ISSUES) lines.push(`- …and ${error.issues.length - MAX_ISSUES} more issue(s)`);
  return lines.join("\n");
}

export function buildRepairPrompt(errors: string): string {
  return [
    "Your previous output did not pass schema validation.",
    "<validation_errors>",
    errors,
    "</validation_errors>",
    "Return the COMPLETE corrected JSON object (not a diff) that satisfies the schema and all original instructions. Keep valid content unchanged; fix only what is wrong. Output JSON only.",
  ].join("\n");
}
