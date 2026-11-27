import { z } from "zod";
import type { CreatePackageRequest } from "@/domain/generation/schema";
import { MAX_JD_TEXT_LENGTH } from "./normalize";

/**
 * Form model for the "New Run #10 package" wizard. Field rules mirror JdInputSchema; the
 * extra `mode` makes the URL/paste requirement explicit (in paste mode the text must be
 * at least MIN_PASTED_JD_LENGTH characters even when a URL is also given).
 */

export const JD_INPUT_MODES = ["url", "paste"] as const;
export type JdInputMode = (typeof JD_INPUT_MODES)[number];

export const MIN_PASTED_JD_LENGTH = 80;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const NewPackageFormSchema = z
  .object({
    mode: z.enum(JD_INPUT_MODES),
    companyName: z
      .string()
      .trim()
      .min(1, "Company name is required.")
      .max(120, "Keep the company name under 120 characters."),
    jobTitle: z.string().trim().max(160, "Keep the job title under 160 characters."),
    url: z
      .string()
      .trim()
      .max(2048, "The URL is too long.")
      .refine((v) => v === "" || isHttpUrl(v), "Enter a full link starting with https://."),
    rawText: z
      .string()
      .trim()
      .max(
        MAX_JD_TEXT_LENGTH,
        `The job description is too long (max ${MAX_JD_TEXT_LENGTH.toLocaleString("en-US")} characters).`,
      ),
  })
  .superRefine(
    (values, ctx) => {
      // Runs even when other fields are invalid, so every step error shows at once.
      const v = values as Partial<Record<"mode" | "url" | "rawText", unknown>>;
      const url = typeof v.url === "string" ? v.url.trim() : "";
      const rawText = typeof v.rawText === "string" ? v.rawText.trim() : "";
      if (v.mode === "url" && !url) {
        ctx.addIssue({
          code: "custom",
          path: ["url"],
          message: "Enter the job URL, or switch to “Paste description”.",
        });
      }
      if (v.mode === "paste" && rawText.length < MIN_PASTED_JD_LENGTH) {
        ctx.addIssue({
          code: "custom",
          path: ["rawText"],
          message:
            rawText.length === 0
              ? "Paste the job description."
              : `The job description is too short (${rawText.length}/${MIN_PASTED_JD_LENGTH} characters minimum).`,
        });
      }
    },
    { when: () => true },
  );

export type NewPackageFormInput = z.input<typeof NewPackageFormSchema>;
export type NewPackageFormValues = z.output<typeof NewPackageFormSchema>;

export const EMPTY_NEW_PACKAGE_FORM: NewPackageFormInput = {
  mode: "url",
  companyName: "",
  jobTitle: "",
  url: "",
  rawText: "",
};

/** Builds the POST /api/packages body. In URL mode the server extracts the JD itself. */
export function toCreatePackageRequest(values: NewPackageFormValues): CreatePackageRequest {
  const request: CreatePackageRequest = { companyName: values.companyName };
  if (values.jobTitle) request.jobTitle = values.jobTitle;
  if (values.url) request.sourceUrl = values.url;
  if (values.mode === "paste" && values.rawText) request.rawText = values.rawText;
  return request;
}
