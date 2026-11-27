import "server-only";
import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AiStatus } from "@/domain/generation/schema";
import { createMockLanguageModel, mockOptionsFromEnv, type MockGenerationContext, type MockModelOptions } from "./mock";

/**
 * AI provider abstraction.
 *
 * Selection (server-side env only — keys never reach the browser):
 *   AI_PROVIDER = openai | anthropic | openai-compatible | mock   (empty → auto-detect from keys)
 *   AI_MODEL    = model id (empty → DEFAULT_MODELS[provider])
 *   OPENAI_API_KEY, ANTHROPIC_API_KEY
 *   OPENAI_COMPATIBLE_BASE_URL, OPENAI_COMPATIBLE_API_KEY (key optional for local servers)
 *
 * Optional Cloudflare AI Gateway (caching, cost analytics, rate limiting, fallbacks) for OpenAI and
 * Anthropic: AI_GATEWAY_URL = https://gateway.ai.cloudflare.com/v1/<ACCOUNT_ID>/<GATEWAY_ID>
 * (+ AI_GATEWAY_TOKEN for authenticated gateways). Provider keys still come from the env above.
 *
 * Auto-detect order when AI_PROVIDER is empty: openai → anthropic → openai-compatible.
 * The mock provider is never auto-selected; it must be requested explicitly (tests / e2e / demo).
 */

export const AI_PROVIDER_IDS = ["openai", "anthropic", "openai-compatible", "mock"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

/** Default model per provider. Change here to upgrade every generation at once. */
export const DEFAULT_MODELS: Record<AiProviderId, string> = {
  openai: "gpt-5-mini",
  anthropic: "claude-sonnet-5-5",
  "openai-compatible": "llama-3.3-70b-instruct",
  mock: "mock-run10-v1",
};

export const PROVIDER_LABELS: Record<AiProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  "openai-compatible": "OpenAI-compatible",
  mock: "Mock (offline, deterministic)",
};

/** Env variables each provider needs (names only — values are never exposed). */
export const PROVIDER_ENV_VARS: Record<AiProviderId, { required: string[]; optional: string[] }> = {
  openai: { required: ["OPENAI_API_KEY"], optional: ["AI_MODEL", "AI_GATEWAY_URL", "AI_GATEWAY_TOKEN"] },
  anthropic: { required: ["ANTHROPIC_API_KEY"], optional: ["AI_MODEL", "AI_GATEWAY_URL", "AI_GATEWAY_TOKEN"] },
  "openai-compatible": {
    required: ["OPENAI_COMPATIBLE_BASE_URL"],
    optional: ["OPENAI_COMPATIBLE_API_KEY", "AI_MODEL"],
  },
  mock: {
    required: [],
    optional: ["MOCK_FAIL_SECTIONS", "MOCK_MALFORMED_ONCE_SECTIONS", "MOCK_RATE_LIMIT_ONCE_SECTIONS", "MOCK_DELAY_MS"],
  },
};

type Env = Record<string, string | undefined>;

function read(env: Env, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

export function isProviderConfigured(id: AiProviderId, env: Env = process.env): boolean {
  switch (id) {
    case "openai":
      return Boolean(read(env, "OPENAI_API_KEY"));
    case "anthropic":
      return Boolean(read(env, "ANTHROPIC_API_KEY"));
    case "openai-compatible":
      return Boolean(read(env, "OPENAI_COMPATIBLE_BASE_URL"));
    case "mock":
      return true;
  }
}

/** Upstream path of each provider on Cloudflare AI Gateway (appended to AI_GATEWAY_URL). */
const AI_GATEWAY_PATHS = { openai: "/openai", anthropic: "/anthropic/v1" } as const;

export interface GatewaySettings {
  baseURL: string;
  headers?: Record<string, string>;
}

/**
 * Cloudflare AI Gateway settings for a provider, or undefined when AI_GATEWAY_URL is unset.
 * Only https://gateway.ai.cloudflare.com/v1/<account>/<gateway> URLs are accepted, so a typo can't
 * send API keys to another host.
 */
export function aiGatewaySettings(
  provider: keyof typeof AI_GATEWAY_PATHS,
  env: Env = process.env,
): GatewaySettings | undefined {
  const raw = read(env, "AI_GATEWAY_URL");
  if (!raw) return undefined;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("AI_GATEWAY_URL is not a valid URL.");
  }
  const segments = url.pathname.split("/").filter(Boolean);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "gateway.ai.cloudflare.com" ||
    segments.length !== 3 ||
    segments[0] !== "v1" ||
    url.search ||
    url.hash
  ) {
    throw new Error("AI_GATEWAY_URL must look like https://gateway.ai.cloudflare.com/v1/<ACCOUNT_ID>/<GATEWAY_ID>.");
  }
  const token = read(env, "AI_GATEWAY_TOKEN");
  return {
    baseURL: `${url.origin}/${segments.join("/")}${AI_GATEWAY_PATHS[provider]}`,
    headers: token ? { "cf-aig-authorization": `Bearer ${token}` } : undefined,
  };
}

export interface ResolvedAiConfig {
  provider: AiProviderId | "none";
  model?: string;
  configured: boolean;
  /** Human-readable reason when not configured (no secrets). */
  reason?: string;
}

function isProviderId(value: string): value is AiProviderId {
  return (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

/** Pure resolution of the active provider from env (injectable for tests). */
export function resolveAiConfig(env: Env = process.env): ResolvedAiConfig {
  const requested = read(env, "AI_PROVIDER")?.toLowerCase();
  const modelOverride = read(env, "AI_MODEL");

  if (requested) {
    if (!isProviderId(requested)) {
      return {
        provider: "none",
        configured: false,
        reason: `Unknown AI_PROVIDER "${requested}". Use one of: ${AI_PROVIDER_IDS.join(", ")}.`,
      };
    }
    const configured = isProviderConfigured(requested, env);
    return {
      provider: requested,
      model: modelOverride ?? DEFAULT_MODELS[requested],
      configured,
      reason: configured
        ? undefined
        : `AI_PROVIDER=${requested} but ${PROVIDER_ENV_VARS[requested].required.join(", ")} is not set.`,
    };
  }

  const detected = (["openai", "anthropic", "openai-compatible"] as const).find((id) => isProviderConfigured(id, env));
  if (!detected) {
    return {
      provider: "none",
      configured: false,
      reason: "No AI provider key found. Set OPENAI_API_KEY, ANTHROPIC_API_KEY or OPENAI_COMPATIBLE_BASE_URL.",
    };
  }
  return { provider: detected, model: modelOverride ?? DEFAULT_MODELS[detected], configured: true };
}

/** Public status for the settings page and GET /api/ai/status. Never includes secrets. */
export function getAiStatus(env: Env = process.env): AiStatus {
  const resolved = resolveAiConfig(env);
  return {
    provider: resolved.provider,
    model: resolved.configured ? resolved.model : undefined,
    configured: resolved.configured,
    availableProviders: AI_PROVIDER_IDS.map((id) => ({
      id,
      configured: isProviderConfigured(id, env),
      defaultModel: DEFAULT_MODELS[id],
    })),
  };
}

export interface GenerationProvider {
  id: AiProviderId;
  modelId: string;
  label: string;
  isMock: boolean;
  /**
   * Creates the AI SDK model. `mockContext` is only used by the mock provider (it builds
   * deterministic content from the run's JD/profile/dependencies instead of calling a network API).
   */
  createModel(mockContext?: () => MockGenerationContext): LanguageModel;
  /** Provider options passed to every generateText call. */
  providerOptions?: Record<string, Record<string, string | number | boolean | null>>;
}

export interface ProviderOverrides {
  env?: Env;
  mock?: MockModelOptions;
}

/** Richer provider object used by the generation pipeline. Null when nothing is configured. */
export function getProviderForGeneration(overrides: ProviderOverrides = {}): GenerationProvider | null {
  const env = overrides.env ?? process.env;
  const resolved = resolveAiConfig(env);
  if (!resolved.configured || resolved.provider === "none" || !resolved.model) return null;
  const modelId = resolved.model;
  const id = resolved.provider;
  const base = { id, modelId, label: PROVIDER_LABELS[id], isMock: id === "mock" };

  switch (id) {
    case "openai": {
      const openai = createOpenAI({ apiKey: read(env, "OPENAI_API_KEY"), ...aiGatewaySettings("openai", env) });
      return {
        ...base,
        createModel: () => openai(modelId),
        // Domain schemas use optional fields; OpenAI strict mode requires all-required objects.
        providerOptions: { openai: { strictJsonSchema: false } },
      };
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: read(env, "ANTHROPIC_API_KEY"),
        ...aiGatewaySettings("anthropic", env),
      });
      return { ...base, createModel: () => anthropic(modelId) };
    }
    case "openai-compatible": {
      const compatible = createOpenAICompatible({
        name: "openai-compatible",
        baseURL: read(env, "OPENAI_COMPATIBLE_BASE_URL") ?? "",
        apiKey: read(env, "OPENAI_COMPATIBLE_API_KEY"),
        supportsStructuredOutputs: true,
      });
      return { ...base, createModel: () => compatible.chatModel(modelId) };
    }
    case "mock": {
      const options = { ...mockOptionsFromEnv(env), ...overrides.mock };
      return {
        ...base,
        createModel: (mockContext) => createMockLanguageModel({ ...options, modelId, getContext: mockContext }),
      };
    }
  }
}

/** The configured AI SDK model, or null when no provider is configured. */
export function getLanguageModel(): LanguageModel | null {
  return getProviderForGeneration()?.createModel() ?? null;
}
