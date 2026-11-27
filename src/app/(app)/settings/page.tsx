import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleDashed, KeyRound, ShieldCheck, UserRoundX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/common/CodeBlock";
import {
  AI_PROVIDER_IDS,
  DEFAULT_MODELS,
  getAiStatus,
  PROVIDER_ENV_VARS,
  PROVIDER_LABELS,
  resolveAiConfig,
  type AiProviderId,
} from "@/server/ai/provider";
import { excludedCompanies } from "@/server/ai/prompts/profile";
import { getProfile } from "@/server/repositories/profile-repository";

export const metadata: Metadata = {
  title: "Settings",
  description: "AI provider status and generation settings. API keys stay on the server.",
};

// Reads server env + the local profile on every request.
export const dynamic = "force-dynamic";

const ENV_EXAMPLE = `# .env (server only — never prefix keys with NEXT_PUBLIC_)
# Pick one provider, or leave AI_PROVIDER empty to auto-detect from the keys below.
AI_PROVIDER=openai            # openai | anthropic | openai-compatible | mock
AI_MODEL=                     # optional, defaults per provider

OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Any OpenAI-compatible endpoint (Ollama, LM Studio, OpenRouter, vLLM ...)
OPENAI_COMPATIBLE_BASE_URL=http://localhost:11434/v1
OPENAI_COMPATIBLE_API_KEY=    # optional for local servers

# Offline demo / tests: AI_PROVIDER=mock (deterministic, labelled [MOCK])`;

const PROVIDER_NOTES: Record<AiProviderId, string> = {
  openai: "OpenAI models via @ai-sdk/openai.",
  anthropic: "Claude models via @ai-sdk/anthropic.",
  "openai-compatible": "Any server that speaks the OpenAI Chat Completions API.",
  mock: "Deterministic offline content for tests, e2e and demos. Never selected automatically.",
};

async function loadExcludedExperiences(): Promise<{ excluded: string[]; error: boolean }> {
  try {
    return { excluded: excludedCompanies(await getProfile()), error: false };
  } catch {
    return { excluded: [], error: true };
  }
}

export default async function SettingsPage() {
  const status = getAiStatus();
  const resolved = resolveAiConfig();
  const { excluded, error: profileError } = await loadExcludedExperiences();
  const activeLabel = status.provider === "none" ? "Not configured" : PROVIDER_LABELS[status.provider];

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          AI provider configuration and what is used when generating interview packages.
        </p>
      </header>

      <section aria-labelledby="ai-status-heading">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 id="ai-status-heading" className="flex items-center gap-2 text-lg font-semibold">
                {status.configured ? (
                  <CheckCircle2 aria-hidden className="size-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <CircleDashed aria-hidden className="text-muted-foreground size-5" />
                )}
                AI generation
              </h2>
            </CardTitle>
            <CardDescription>
              {status.configured
                ? "Generation is available. New packages and section retries use the provider below."
                : "Generation is disabled until a provider is configured. The ISB sample package works without an API key."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="bg-muted/30 grid gap-0.5 rounded-lg border p-3">
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Active provider</dt>
                <dd className="font-medium">{activeLabel}</dd>
              </div>
              <div className="bg-muted/30 grid gap-0.5 rounded-lg border p-3">
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Model</dt>
                <dd className="font-mono text-sm break-all">{status.model ?? "—"}</dd>
              </div>
            </dl>
            {!status.configured && resolved.reason && (
              <p
                role="status"
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
              >
                {resolved.reason}
              </p>
            )}
            {status.provider === "mock" && (
              <p
                role="status"
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
              >
                The mock provider is active: generated packages contain placeholder content labelled [MOCK].
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="providers-heading" className="grid gap-3">
        <h2 id="providers-heading" className="text-lg font-semibold">
          Providers
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {AI_PROVIDER_IDS.map((id) => {
            const info = status.availableProviders.find((p) => p.id === id);
            const configured = info?.configured ?? false;
            const active = status.provider === id;
            return (
              <li key={id} className="bg-card text-card-foreground grid gap-2 rounded-xl border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">{PROVIDER_LABELS[id]}</h3>
                  <div className="flex gap-1.5">
                    {active && <Badge>Active</Badge>}
                    <Badge variant={configured ? "secondary" : "outline"}>
                      {configured ? "Configured" : "Not configured"}
                    </Badge>
                  </div>
                </div>
                <p className="text-muted-foreground">{PROVIDER_NOTES[id]}</p>
                <p className="text-muted-foreground text-xs">
                  Default model: <code className="text-foreground font-mono">{DEFAULT_MODELS[id]}</code>
                </p>
                {PROVIDER_ENV_VARS[id].required.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    Requires:{" "}
                    {PROVIDER_ENV_VARS[id].required.map((name) => (
                      <code key={name} className="bg-muted text-foreground mr-1 rounded px-1 py-0.5 font-mono">
                        {name}
                      </code>
                    ))}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="configure-heading" className="grid gap-3">
        <h2 id="configure-heading" className="flex items-center gap-2 text-lg font-semibold">
          <KeyRound aria-hidden className="text-muted-foreground size-5" />
          How to configure
        </h2>
        <ol className="text-muted-foreground marker:text-foreground grid list-decimal gap-1 pl-5 text-sm">
          <li>
            Copy <code className="text-foreground font-mono">.env.example</code> to{" "}
            <code className="text-foreground font-mono">.env</code> in the project root.
          </li>
          <li>Set one provider key (and optionally AI_PROVIDER / AI_MODEL).</li>
          <li>Restart the server so the new environment is loaded.</li>
        </ol>
        <CodeBlock
          block={{ language: "bash", code: ENV_EXAMPLE, caption: "Example .env — values are placeholders." }}
        />
        <p className="bg-muted/30 flex items-start gap-2 rounded-lg border p-3 text-sm">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            API keys are read only on the server from <code className="font-mono">process.env</code>. They are never
            sent to the browser, never stored in the database and never shown on this page.
          </span>
        </p>
      </section>

      <section aria-labelledby="elfie-heading" className="grid gap-3">
        <h2 id="elfie-heading" className="flex items-center gap-2 text-lg font-semibold">
          <UserRoundX aria-hidden className="text-muted-foreground size-5" />
          Excluded experience (Elfie)
        </h2>
        <div className="bg-card text-card-foreground grid gap-2 rounded-xl border p-4 text-sm">
          <p>
            Experience at Elfie is excluded from generated introductions, CVs and interview answers unless you enable
            it. The switch is per experience: open{" "}
            <Link
              href="/profile"
              className="hover:text-primary focus-visible:ring-ring font-medium underline underline-offset-4 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              Profile
            </Link>{" "}
            and toggle <span className="font-medium">&ldquo;Include in generation&rdquo;</span> on the work experience.
          </p>
          <p className="text-muted-foreground">
            {profileError
              ? "The profile could not be loaded right now."
              : excluded.length > 0
                ? `Currently excluded from generation: ${excluded.join(", ")}.`
                : "No experiences are currently excluded — every experience in your profile may be used."}
          </p>
          <p className="text-muted-foreground text-xs">
            Existing packages are not rewritten automatically — profile changes apply the next time a section is
            generated or regenerated.
          </p>
        </div>
      </section>
    </div>
  );
}
