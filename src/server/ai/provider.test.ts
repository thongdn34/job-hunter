import { afterEach, describe, expect, it, vi } from "vitest";
import { generateText, Output } from "ai";
import { aiGatewaySettings, DEFAULT_MODELS, getAiStatus, getProviderForGeneration, resolveAiConfig } from "./provider";
import { renderTaskSpec } from "./prompts/task-spec";
import { SectionGenerationSchemas } from "./schemas";

describe("resolveAiConfig", () => {
  it("is not configured without keys", () => {
    expect(resolveAiConfig({})).toMatchObject({ provider: "none", configured: false });
    expect(getProviderForGeneration({ env: {} })).toBeNull();
  });

  it("auto-detects openai → anthropic → openai-compatible", () => {
    expect(resolveAiConfig({ ANTHROPIC_API_KEY: "k", OPENAI_API_KEY: "k" })).toMatchObject({
      provider: "openai",
      model: DEFAULT_MODELS.openai,
      configured: true,
    });
    expect(resolveAiConfig({ ANTHROPIC_API_KEY: "k" })).toMatchObject({
      provider: "anthropic",
      model: DEFAULT_MODELS.anthropic,
    });
    expect(resolveAiConfig({ OPENAI_COMPATIBLE_BASE_URL: "http://localhost:11434/v1" })).toMatchObject({
      provider: "openai-compatible",
    });
  });

  it("honours AI_PROVIDER and AI_MODEL", () => {
    expect(resolveAiConfig({ AI_PROVIDER: "Anthropic", ANTHROPIC_API_KEY: "k", AI_MODEL: "claude-x" })).toMatchObject({
      provider: "anthropic",
      model: "claude-x",
      configured: true,
    });
    expect(resolveAiConfig({ AI_PROVIDER: "anthropic" })).toMatchObject({ provider: "anthropic", configured: false });
    expect(resolveAiConfig({ AI_PROVIDER: "gemini" })).toMatchObject({ provider: "none", configured: false });
  });

  it("never auto-selects the mock provider", () => {
    expect(resolveAiConfig({}).provider).toBe("none");
    expect(resolveAiConfig({ AI_PROVIDER: "mock" })).toMatchObject({ provider: "mock", configured: true });
  });
});

describe("getAiStatus", () => {
  it("never exposes secrets", () => {
    const status = getAiStatus({ OPENAI_API_KEY: "sk-secret-value", ANTHROPIC_API_KEY: "sk-ant-secret" });
    expect(JSON.stringify(status)).not.toContain("secret");
    expect(status).toMatchObject({ provider: "openai", configured: true, model: DEFAULT_MODELS.openai });
    expect(status.availableProviders.find((p) => p.id === "anthropic")?.configured).toBe(true);
    expect(status.availableProviders.find((p) => p.id === "openai-compatible")?.configured).toBe(false);
  });
});

describe("provider models", () => {
  it("creates real provider models without network calls", () => {
    const openai = getProviderForGeneration({ env: { OPENAI_API_KEY: "k" } });
    expect(openai?.createModel()).toMatchObject({ modelId: DEFAULT_MODELS.openai });
    expect(openai?.providerOptions).toEqual({ openai: { strictJsonSchema: false } });
    expect(getProviderForGeneration({ env: { ANTHROPIC_API_KEY: "k" } })?.createModel()).toMatchObject({
      modelId: DEFAULT_MODELS.anthropic,
    });
    expect(
      getProviderForGeneration({
        env: { OPENAI_COMPATIBLE_BASE_URL: "http://localhost:1/v1", AI_MODEL: "llama" },
      })?.createModel(),
    ).toMatchObject({ modelId: "llama" });
  });

  it("the mock model answers structured output requests through the AI SDK", async () => {
    const provider = getProviderForGeneration({ env: { AI_PROVIDER: "mock" } });
    const { output } = await generateText({
      model: provider!.createModel(),
      output: Output.object({ schema: SectionGenerationSchemas.hr }),
      prompt: `Generate.\n${renderTaskSpec({ kind: "section", section: "hr" })}`,
    });
    expect(output.groups).toHaveLength(8);
  });

  it("reads failure injection from env", async () => {
    const provider = getProviderForGeneration({ env: { AI_PROVIDER: "mock", MOCK_FAIL_SECTIONS: "hr, nope" } });
    await expect(
      generateText({
        model: provider!.createModel(),
        output: Output.object({ schema: SectionGenerationSchemas.hr }),
        prompt: renderTaskSpec({ kind: "section", section: "hr" }),
      }),
    ).rejects.toThrow();
  });
});

describe("aiGatewaySettings (Cloudflare AI Gateway)", () => {
  const gw = "https://gateway.ai.cloudflare.com/v1/acc123/job-hunter";

  it("is disabled without AI_GATEWAY_URL", () => {
    expect(aiGatewaySettings("openai", {})).toBeUndefined();
  });

  it("builds per-provider base URLs and the optional auth header", () => {
    expect(aiGatewaySettings("openai", { AI_GATEWAY_URL: `${gw}/` })).toEqual({
      baseURL: `${gw}/openai`,
      headers: undefined,
    });
    expect(aiGatewaySettings("anthropic", { AI_GATEWAY_URL: gw, AI_GATEWAY_TOKEN: "t0k" })).toEqual({
      baseURL: `${gw}/anthropic/v1`,
      headers: { "cf-aig-authorization": "Bearer t0k" },
    });
  });

  it.each([
    "http://gateway.ai.cloudflare.com/v1/a/b",
    "https://evil.example/v1/a/b",
    "https://gateway.ai.cloudflare.com/v1/a",
    "https://gateway.ai.cloudflare.com/v1/a/b/openai",
    "not a url",
  ])("rejects %s so keys never go to another host", (url) => {
    expect(() => aiGatewaySettings("openai", { AI_GATEWAY_URL: url })).toThrow(/AI_GATEWAY_URL/);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    [{ AI_PROVIDER: "openai", OPENAI_API_KEY: "sk-test" }, `${gw}/openai/`],
    [{ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-ant" }, `${gw}/anthropic/v1/messages`],
  ])("sends %o model calls to the gateway", async (providerEnv, expectedPrefix) => {
    const seen: Array<{ url: string; headers: Headers }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        seen.push({ url: String(input), headers: new Headers(init?.headers) });
        return new Response("{}", { status: 500 });
      }),
    );
    const env = { ...providerEnv, AI_GATEWAY_URL: gw, AI_GATEWAY_TOKEN: "t0k" };
    const model = getProviderForGeneration({ env })!.createModel();
    await generateText({ model, prompt: "hi", maxRetries: 0 }).catch(() => undefined);
    expect(seen[0]?.url.startsWith(expectedPrefix)).toBe(true);
    expect(seen[0]?.headers.get("cf-aig-authorization")).toBe("Bearer t0k");
  });
});
