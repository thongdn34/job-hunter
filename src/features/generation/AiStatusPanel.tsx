"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bot, CircleAlert, KeyRound } from "lucide-react";
import type { AiStatus } from "@/domain/generation/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAiStatus, generationKeys } from "./api";

export const PROVIDER_LABELS: Record<AiStatus["provider"], string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  "openai-compatible": "OpenAI-compatible",
  mock: "Mock (offline)",
  none: "Not configured",
};

export function providerLabel(provider: string | undefined): string {
  if (!provider) return "AI";
  return (PROVIDER_LABELS as Record<string, string>)[provider] ?? provider;
}

export function useAiStatus() {
  return useQuery({ queryKey: generationKeys.aiStatus, queryFn: fetchAiStatus, staleTime: 60_000 });
}

/** How to configure an AI provider (shown when none is configured or the API returned AI_NOT_CONFIGURED). */
export function AiSetupHelp({ message }: { message?: string }) {
  return (
    <Alert className="border-amber-500/40">
      <KeyRound aria-hidden className="text-amber-600 dark:text-amber-400" />
      <AlertTitle>No AI provider is configured</AlertTitle>
      <AlertDescription>
        <p>
          {message ??
            "Generating a new package needs an AI provider. API keys stay on the server and are never sent to the browser."}
        </p>
        <p className="mt-2">
          Add one of these to{" "}
          <code className="bg-muted text-foreground rounded px-1 py-0.5 font-mono text-xs">.env</code> and restart the
          server:
        </p>
        <pre className="bg-muted text-foreground mt-2 overflow-x-auto rounded-md p-3 font-mono text-xs">
          {`# OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# or Anthropic
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=...

# or any OpenAI-compatible endpoint (Ollama, LM Studio, OpenRouter)
AI_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_BASE_URL=http://localhost:11434/v1

# optional model override
AI_MODEL=`}
        </pre>
        <div className="mt-3">
          <Link href="/settings" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open AI settings
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/** Provider/model that will run the generation. */
export function AiStatusPanel() {
  const { data, isPending, isError } = useAiStatus();

  if (isPending) {
    return (
      <div role="status" aria-label="Checking AI configuration" className="flex items-center gap-2">
        <Skeleton className="size-4 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }
  if (isError) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <CircleAlert className="size-4" aria-hidden />
        Couldn&apos;t check the AI configuration. Generation will report any problem.
      </p>
    );
  }
  if (!data.configured || data.provider === "none") return <AiSetupHelp />;

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <Bot className="text-muted-foreground size-4" aria-hidden />
      <span className="text-muted-foreground">Generating with</span>
      <span className="font-medium">{providerLabel(data.provider)}</span>
      {data.model ? <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{data.model}</code> : null}
    </p>
  );
}
