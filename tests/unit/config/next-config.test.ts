import { describe, expect, it } from "vitest";
import nextConfig, { CONTENT_SECURITY_POLICY } from "../../../next.config";

describe("next.config Content-Security-Policy", () => {
  it("blocks remote images and cross-origin connections", () => {
    const directives = new Map(
      CONTENT_SECURITY_POLICY.split(";").map((d) => {
        const [name, ...values] = d.trim().split(/\s+/);
        return [name, values] as const;
      }),
    );
    expect(directives.get("img-src")).toEqual(["'self'", "data:", "blob:"]);
    expect(directives.get("connect-src")).toEqual(["'self'"]);
    expect(directives.get("object-src")).toEqual(["'none'"]);
  });

  it("applies the policy to every route", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const rule = rules.find((r) => r.source === "/:path*");
    expect(rule?.headers).toContainEqual({ key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY });
  });
});
