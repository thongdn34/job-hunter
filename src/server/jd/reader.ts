import "server-only";
import { JdExtractionError } from "./errors";

/**
 * Optional fallback for pages that block direct fetching (LinkedIn answers HTTP 429/999 to
 * datacenter IPs such as Cloudflare Workers). The job URL is handed to the Jina Reader service
 * (https://r.jina.ai), which fetches the page from its own network and returns Markdown.
 *
 * PRIVACY: enabling this sends the job URL to a third party, so it is opt-in per deployment:
 * JD_READER_FALLBACK=jina. JINA_API_KEY (optional) raises Jina's rate limit. The response is
 * untrusted text, handled exactly like any other fetched page.
 */
const READER_BASE = "https://r.jina.ai/";
const READER_TIMEOUT_MS = 30_000;
const MAX_READER_CHARS = 1_000_000;

export interface ReaderPage {
  /** The page's <title>, possibly empty. */
  title: string;
  /** Page content as Markdown. */
  text: string;
}

export interface ReaderOptions {
  signal?: AbortSignal;
  /** Focus on the LinkedIn job description instead of the whole (login-gated) page. */
  linkedIn: boolean;
}

export type ReaderFetcher = (url: URL, options: ReaderOptions) => Promise<ReaderPage>;

type Env = Record<string, string | undefined>;

/** The configured reader, or undefined when the fallback is not enabled. */
export function readerFallbackFromEnv(
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): ReaderFetcher | undefined {
  if (env.JD_READER_FALLBACK?.trim().toLowerCase() !== "jina") return undefined;
  const apiKey = env.JINA_API_KEY?.trim() || undefined;
  return (url, options) => fetchViaJina(url, options, apiKey, fetchImpl);
}

async function fetchViaJina(
  url: URL,
  options: ReaderOptions,
  apiKey: string | undefined,
  fetchImpl: typeof fetch,
): Promise<ReaderPage> {
  const headers: Record<string, string> = {
    Accept: "text/plain",
    "X-Retain-Images": "none",
    "X-Remove-Selector": "header, footer, nav, aside, form",
  };
  if (options.linkedIn) headers["X-Target-Selector"] = ".description__text";
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const timeout = AbortSignal.timeout(READER_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let res: Response;
  try {
    res = await fetchImpl(`${READER_BASE}${url.href}`, { method: "GET", headers, signal, redirect: "manual" });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    console.warn(
      "[jd/reader] request failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    );
    throw new JdExtractionError("FETCH_FAILED", "The reader service could not be reached.", { cause: error });
  }
  // redirect: "manual" (workerd rejects "error"): a redirect answers 3xx, which is not ok either.
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new JdExtractionError("FETCH_FAILED", `The reader service responded with HTTP ${res.status}.`);
  }
  const body = (await res.text()).slice(0, MAX_READER_CHARS);
  return parseReaderResponse(body);
}

/** Jina answers "Title: …\n\nURL Source: …\n\nMarkdown Content:\n<markdown>". */
export function parseReaderResponse(body: string): ReaderPage {
  const head = body.slice(0, 1_000);
  const upstream = /^Warning: Target URL returned error (\d{3})/m.exec(head);
  if (upstream) {
    throw new JdExtractionError("FETCH_FAILED", `The reader service was refused by the site (HTTP ${upstream[1]}).`);
  }
  const marker = /^Markdown Content:[ \t]*\r?\n/m.exec(body);
  const title = /^Title:[ \t]*(.*)$/m.exec(head)?.[1]?.trim() ?? "";
  const text = marker ? body.slice(marker.index + marker[0].length) : body;
  return { title, text };
}

/** "Senior Dev at ACME — Ho Chi Minh City, Vietnam | LinkedIn Jobs" -> { title, company }. */
export function parseLinkedInPageTitle(pageTitle: string): { title?: string; company?: string } {
  const withoutSite = pageTitle.replace(/\s*\|\s*LinkedIn(?:\s+Jobs)?\s*$/i, "").trim();
  const match = /^(.+?)\s+at\s+(.+?)(?:\s+[—–]\s+.*)?$/.exec(withoutSite);
  if (!match) return {};
  return { title: match[1]?.trim() || undefined, company: match[2]?.trim() || undefined };
}
