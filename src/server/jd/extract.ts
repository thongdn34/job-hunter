import "server-only";
import type { NormalizedJd } from "@/domain/jd/schema";
import { cleanJdText, looksLikeLoginWall, normalizeJdText } from "@/domain/jd/normalize";
import { JdExtractionError } from "./errors";
import { extractFieldsFromHtml, htmlToText, type ExtractedFields } from "./html";
import { canonicalLinkedInJobUrl, isLinkedInHost, toLinkedInGuestUrl } from "./linkedin";
import { safeFetch, type FetchedPage, type SafeFetchOptions } from "./safe-fetch";
import { parsePublicHttpUrl } from "./url-guard";
import { detectJobTitle } from "./title";

/** Below this many characters the page did not contain a usable job description. */
const MIN_EXTRACTED_CHARS = 80;

export interface ExtractJobOptions {
  /** Injected fetcher (tests). Defaults to the SSRF-safe fetcher. */
  fetchPage?: (url: URL, options: SafeFetchOptions) => Promise<FetchedPage>;
  signal?: AbortSignal;
  now?: Date;
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

  const warnings: string[] = [];
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
    throw new JdExtractionError("FETCH_FAILED", "The job page was not found — the posting may have been removed.");
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
