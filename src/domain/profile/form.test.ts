import { describe, expect, it } from "vitest";
import { defaultProfile } from "@/content/profile/default-profile";
import { ProfileFormSchema, formValuesToPayload, profileToFormValues } from "./form";
import { CandidateProfileSchema } from "./schema";

describe("profile form mapping", () => {
  it("round-trips the default profile into a valid API payload", () => {
    const values = profileToFormValues({ ...defaultProfile, cvText: "x", cvFileName: "cv.pdf" });
    expect(values).not.toHaveProperty("cvText");
    expect(ProfileFormSchema.safeParse(values).success).toBe(true);

    const payload = formValuesToPayload(values);
    expect(payload).not.toHaveProperty("cvText");
    expect(CandidateProfileSchema.parse(payload)).toMatchObject({
      headline: defaultProfile.headline,
      experiences: defaultProfile.experiences.map((e, order) => ({ company: e.company, order })),
    });
  });

  it("sorts experiences by order when building form values", () => {
    const [a, b] = defaultProfile.experiences;
    const values = profileToFormValues({
      ...defaultProfile,
      experiences: [
        { ...a!, order: 5 },
        { ...b!, order: 1 },
      ],
    });
    expect(values.experiences.map((e) => e.company)).toEqual([b!.company, a!.company]);
  });

  it("drops blank highlights and trims text in the payload", () => {
    const values = profileToFormValues(defaultProfile);
    values.headline = "  Lead  ";
    values.experiences[0]!.highlights = ["  Did X  ", "   ", ""];
    const payload = formValuesToPayload(values);
    expect(payload.headline).toBe("Lead");
    expect(payload.experiences[0]!.highlights).toEqual(["Did X"]);
  });

  it("reports friendly validation messages", () => {
    const values = {
      ...profileToFormValues(defaultProfile),
      headline: " ",
      yearsOfExperience: Number.NaN,
      targetRoles: [],
    };
    const result = ProfileFormSchema.safeParse(values);
    expect(result.success).toBe(false);
    const messages = Object.fromEntries(result.error!.issues.map((i) => [i.path.join("."), i.message]));
    expect(messages).toMatchObject({
      headline: "Headline is required",
      yearsOfExperience: "Enter your years of experience",
      targetRoles: "Add at least one target role",
    });
  });
});
