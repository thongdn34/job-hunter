import { z } from "zod";

/** User input to start a Run #10 package. Either a URL or pasted text is required. */
export const JdInputSchema = z
  .object({
    companyName: z.string().trim().min(1, "Company name is required").max(120),
    jobTitle: z.string().trim().max(160).optional(),
    url: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
    rawText: z.string().trim().max(60_000).optional(),
  })
  .refine((v) => Boolean(v.url) || Boolean(v.rawText && v.rawText.length >= 80), {
    message: "Provide a job URL or paste the job description (at least 80 characters).",
    path: ["rawText"],
  });
export type JdInput = z.infer<typeof JdInputSchema>;

/** Normalized job description, the untrusted input for the generation pipeline. */
export const NormalizedJdSchema = z.object({
  companyName: z.string(),
  jobTitle: z.string(),
  location: z.string().optional(),
  employmentType: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  /** "url" when extracted from the page, "manual" when pasted. */
  origin: z.enum(["url", "manual", "seed"]),
  /** Plain text, whitespace-normalized, prompt-injection-fenced at prompt build time. */
  text: z.string().min(1),
  sections: z.array(z.object({ heading: z.string(), items: z.array(z.string()) })),
  extractedAt: z.string(),
  warnings: z.array(z.string()),
});
export type NormalizedJd = z.infer<typeof NormalizedJdSchema>;
