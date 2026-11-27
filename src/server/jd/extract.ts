import "server-only";
import type { NormalizedJd } from "@/domain/jd/schema";
import { cleanJdText, looksLikeLoginWall, normalizeJdText } from "@/domain/jd/normalize";
import { JdExtractionError } from "./errors";
import { extractFieldsFromHtml, htmlToText, type ExtractedFields } from "./html";
import { canonicalLinkedInJobUrl, isLinkedInHost, toLinkedInGuestUrl } from "./linkedin";
import { safeFetch, type FetchedPage, type SafeFetchOptions } from "./safe-fetch";
import { parseLinkedInPageTitle, readerFallbackFromEnv, type ReaderFetcher } from "./reader";
import { parsePublicHttpUrl } from "./url-guard";
import { detectJobTitle } from "./title";

/** Below this many characters the page did not contain a usable job description. */
const MIN_EXTRACTED_CHARS = 80;

export interface ExtractJobOptions {
  /** Injected fetcher (tests). Defaults to the SSRF-safe fetcher. */
  fetchPage?: (url: URL, options: SafeFetchOptions) => Promise<FetchedPage>;
  signal?: AbortSignal;
  now?: Date;
  /**
   * Third-party reader tried when the site blocks direct fetching. Defaults to the one enabled by
   * JD_READER_FALLBACK; pass null to disable it.
   */
  reader?: ReaderFetcher | null;
}

const READER_NOTE =
  "The site blocked direct access, so this page was read through the Jina Reader service. Check the text for completeness.";

/** Failures a different network vantage point could fix (not unsafe URLs, size limits or 404s). */
function readerMayHelp(error: unknown): boolean {
  if (!(error instanceof JdExtractionError) || error.pageGone) return false;
  return error.code === "LOGIN_REQUIRED" || error.code === "FETCH_FAILED" || error.code === "NO_CONTENT";
}

/**
 * Downloads a job page (LinkedIn guest endpoint, ITviec, generic career pages) and returns
 * a normalized JD. Throws JdExtractionError with a user-facing message on any failure so
 * the UI can fall back to manual paste.
 */
export async function extractJobFromUrl(rawUrl: string, options: ExtractJobOptions = {}): Promise<NormalizedJd> {
  const inputUrl = parsePublicHttpUrl(rawUrl);
  const linkedIn = isLinkedInHost(inputUrl.hostname);
  const guestUrl = toLinkedInGuestUrl(inputUrl);
  if (linkedIn && !guestUrl) {
    throw new JdExtractionError(
      "INVALID_URL",
      "This LinkedIn link isn't a job posting. Open the job and copy a link containing /jobs/view/<id>, or paste the description.",
    );
  }

  try {
    return await extractDirect(inputUrl, guestUrl, linkedIn, options);
  } catch (error) {
    const reader = options.reader === undefined ? readerFallbackFromEnv() : (options.reader ?? undefined);
    if (!reader || !readerMayHelp(error)) throw error;
    const viaReader = await extractViaReader(inputUrl, linkedIn, reader, options);
    // The reader could not help either: report why the direct fetch failed.
    if (!viaReader) throw error;
    return viaReader;
  }
}

async function extractDirect(
  inputUrl: URL,
  guestUrl: URL | null,
  linkedIn: boolean,
  options: ExtractJobOptions,
): Promise<NormalizedJd> {
  const fetchPage = options.fetchPage ?? safeFetch;
  const page = await fetchPage(guestUrl ?? inputUrl, { signal: options.signal });
  assertUsableResponse(page, linkedIn);

  const fields = fieldsFromPage(page, Boolean(guestUrl));
  if (fields.text.length < MIN_EXTRACTED_CHARS || (looksLikeLoginWall(fields.text) && fields.text.length < 1500)) {
    if (looksLikeLoginWall(fields.text) || looksLikeLoginWall(page.body.slice(0, 20_000))) {
      throw new JdExtractionError(
        "LOGIN_REQUIRED",
        "This page requires signing in, so the job description can't be read automatically. Paste it instead.",
      );
    }
    throw new JdExtractionError(
      "NO_CONTENT",
      "No job description was found on that page (it may be rendered by JavaScript). Paste the description instead.",
    );
  }

  return buildJd(fields, inputUrl, options, []);
}

/** Returns null when the reader produced nothing usable (the caller then reports the original error). */
async function extractViaReader(
  inputUrl: URL,
  linkedIn: boolean,
  reader: ReaderFetcher,
  options: ExtractJobOptions,
): Promise<NormalizedJd | null> {
  const target = canonicalLinkedInJobUrl(inputUrl) ?? inputUrl;
  let page;
  try {
    page = await reader(new URL(target.toString()), { signal: options.signal, linkedIn });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    // Messages are user-safe (no keys or URLs); visible in Workers logs when a fallback silently fails.
    console.warn("[jd/extract] reader fallback failed:", error instanceof Error ? error.message : String(error));
    return null;
  }
  const text = cleanJdText(page.text);
  if (text.length < MIN_EXTRACTED_CHARS || (looksLikeLoginWall(text) && text.length < 1500)) {
    console.warn(`[jd/extract] reader fallback returned no usable text (${text.length} chars)`);
    return null;
  }

  const fromTitle = linkedIn ? parseLinkedInPageTitle(page.title) : { title: page.title || undefined };
  return buildJd(
    {
      title: fromTitle.title,
      company: "company" in fromTitle ? fromTitle.company : undefined,
      text,
      strategy: "main-content",
    },
    inputUrl,
    options,
    [READER_NOTE],
  );
}

function buildJd(
  fields: ExtractedFields,
  inputUrl: URL,
  options: ExtractJobOptions,
  extraWarnings: string[],
): NormalizedJd {
  const warnings: string[] = [...extraWarnings];
  if (!fields.title) warnings.push("The job title couldn't be detected — enter it manually.");
  if (!fields.company) warnings.push("The company name couldn't be detected — enter it manually.");

  return normalizeJdText({
    companyName: fields.company ?? "",
    // Titles from <title>/og:title often carry a " | Site" suffix; structured titles don't.
    jobTitle: fields.title && fields.strategy === "main-content" ? stripSiteSuffix(fields.title) : fields.title,
    rawText: fields.text,
    sourceUrl: canonicalLinkedInJobUrl(inputUrl) ?? inputUrl.toString(),
    origin: "url",
    location: fields.location,
    employmentType: fields.employmentType,
    warnings,
    now: options.now,
  });
}

function assertUsableResponse(page: FetchedPage, linkedIn: boolean): void {
  const { status } = page;
  if (status >= 200 && status < 300) return;
  if (status === 401 || status === 403 || status === 999) {
    throw new JdExtractionError(
      "LOGIN_REQUIRED",
      linkedIn
        ? "LinkedIn refused the request (sign-in or bot check). Paste the job description instead."
        : "The site requires signing in or blocked automated access. Paste the job description instead.",
    );
  }
  if (status === 404 || status === 410) {
    throw new JdExtractionError("FETCH_FAILED", "The job page was not found — the posting may have been removed.", {
      pageGone: true,
    });
  }
  if (status === 429) {
    throw new JdExtractionError(
      "FETCH_FAILED",
      "The site is rate-limiting requests. Wait a minute or paste the description.",
    );
  }
  throw new JdExtractionError("FETCH_FAILED", `The site responded with an error (HTTP ${status}).`);
}

function fieldsFromPage(page: FetchedPage, linkedInGuest: boolean): ExtractedFields {
  const type = page.contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (type === "text/plain") return { text: cleanJdText(page.body), strategy: "main-content" };
  if (type && !/html|xml/.test(type)) {
    throw new JdExtractionError(
      "NO_CONTENT",
      `The link points to a ${type} file, not a web page. Paste the job description instead.`,
    );
  }
  return extractFieldsFromHtml(page.body, { linkedIn: linkedInGuest });
}

/** "Senior Engineer | ACME Careers" -> "Senior Engineer". */
export function stripSiteSuffix(title: string): string {
  const parts = title.split(/\s+[|–—]\s+|\s+-\s+(?=[^-]*$)/);
  const first = parts[0]?.trim();
  return first && first.length >= 3 ? first : title.trim();
}

export interface ManualJdInput {
  companyName: string;
  jobTitle?: string;
  rawText: string;
  sourceUrl?: string;
}

/**
 * Normalizes a pasted job description. Pasted HTML (e.g. copied page source) is converted to text
 * first. Without an explicit job title, one is detected from the text when possible.
 */
export function normalizeManualJd(input: ManualJdInput, now?: Date): NormalizedJd {
  const looksLikeHtml = /<(?:p|div|li|ul|br|h[1-6]|strong|span)\b[^>]*>/i.test(input.rawText);
  const rawText = looksLikeHtml ? htmlToText(input.rawText) : input.rawText;
  return normalizeJdText({
    companyName: input.companyName,
    jobTitle: input.jobTitle?.trim() || detectJobTitle(rawText),
    rawText,
    sourceUrl: input.sourceUrl,
    origin: "manual",
    now,
  });
}
