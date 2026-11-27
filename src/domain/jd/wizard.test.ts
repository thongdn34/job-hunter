import { describe, expect, it } from "vitest";
import { CreatePackageRequestSchema } from "@/domain/generation/schema";
import { JdInputSchema } from "./schema";
import { EMPTY_NEW_PACKAGE_FORM, NewPackageFormSchema, toCreatePackageRequest } from "./wizard";

const longText = "We are hiring a senior engineer to build real-time trading dashboards with React and TypeScript.";

function issues(input: unknown) {
  const result = NewPackageFormSchema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
}

describe("NewPackageFormSchema", () => {
  it("requires company name and a URL in url mode", () => {
    expect(issues(EMPTY_NEW_PACKAGE_FORM)).toEqual({
      companyName: "Company name is required.",
      url: expect.stringContaining("Enter the job URL"),
    });
  });

  it("rejects non-http URLs", () => {
    expect(issues({ ...EMPTY_NEW_PACKAGE_FORM, companyName: "ACME", url: "ftp://x.y" })).toHaveProperty("url");
  });

  it("requires at least 80 characters of pasted text in paste mode, even with a URL", () => {
    const result = issues({
      ...EMPTY_NEW_PACKAGE_FORM,
      mode: "paste",
      companyName: "ACME",
      url: "https://a.example/j",
      rawText: "short",
    });
    expect(result).toEqual({ rawText: "The job description is too short (5/80 characters minimum)." });
  });

  it("builds a request body valid for both JdInputSchema and CreatePackageRequestSchema", () => {
    const paste = NewPackageFormSchema.parse({
      mode: "paste",
      companyName: " ACME ",
      jobTitle: "",
      url: "",
      rawText: ` ${longText} `,
    });
    const body = toCreatePackageRequest(paste);
    expect(body).toEqual({ companyName: "ACME", rawText: longText });
    expect(CreatePackageRequestSchema.parse(body)).toEqual(body);
    expect(JdInputSchema.safeParse({ companyName: body.companyName, rawText: body.rawText }).success).toBe(true);

    const url = NewPackageFormSchema.parse({
      mode: "url",
      companyName: "ACME",
      jobTitle: "Senior FE",
      url: "https://www.linkedin.com/jobs/view/1234567/",
      rawText: "ignored in url mode",
    });
    expect(toCreatePackageRequest(url)).toEqual({
      companyName: "ACME",
      jobTitle: "Senior FE",
      sourceUrl: "https://www.linkedin.com/jobs/view/1234567/",
    });
  });
});
