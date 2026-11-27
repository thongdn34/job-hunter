import http, { type IncomingHttpHeaders, type IncomingMessage } from "node:http";
import https from "node:https";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import type { Readable } from "node:stream";
import { JdExtractionError } from "./errors";
import { isCloudflareRuntime } from "@/server/cloudflare/runtime";
import { assertSafeUrl, createDohResolver, defaultResolver, guardedLookup, type HostResolver } from "./url-guard";

export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export const MAX_REDIRECTS = 3;

/**
 * Realistic but generic desktop browser identity. Contains no personal or deployment
 * data; some career sites serve an empty shell to unknown agents.
 */
export const FETCH_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent": FETCH_USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
  "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export interface FetchedPage {
  /** Final URL after redirects. */
  url: URL;
  status: number;
  contentType: string;
  body: string;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  resolver?: HostResolver;
  /** Additional caller-controlled abort (e.g. the incoming request was cancelled). */
  signal?: AbortSignal;
  /**
   * "node": node:http(s) with a guarded DNS lookup at connect time (default under Node.js).
   * "fetch": global fetch with manual redirects (default on Cloudflare Workers, where the
   * `global_fetch_strictly_public` flag blocks private destinations at connect time).
   */
  transport?: "node" | "fetch";
  /** fetch implementation for the "fetch" transport (tests). */
  fetchImpl?: typeof fetch;
}

interface RawResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

/**
 * SSRF-safe GET: http(s) only, public addresses only (checked before the request AND at
 * socket connect time), redirects re-validated, bounded size (after decompression) and time.
 */
export async function safeFetch(input: string | URL, options: SafeFetchOptions = {}): Promise<FetchedPage> {
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? MAX_RESPONSE_BYTES;
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const transport = options.transport ?? (isCloudflareRuntime() ? "fetch" : "node");
  const resolver = options.resolver ?? (transport === "fetch" ? createDohResolver(options.fetchImpl) : defaultResolver);
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout;

  let current = await assertSafeUrl(input, resolver);
  for (let hop = 0; ; hop++) {
    const res =
      transport === "fetch"
        ? await requestOnceWithFetch(current, signal, maxBytes, timeout, options.fetchImpl ?? fetch)
        : await requestOnce(current, signal, maxBytes, timeout);
    if (REDIRECT_STATUSES.has(res.status)) {
      const location = res.headers.location;
      if (!location)
        throw new JdExtractionError(
          "FETCH_FAILED",
          `The page returned a redirect (${res.status}) without a destination.`,
        );
      if (hop >= maxRedirects) throw new JdExtractionError("FETCH_FAILED", "The page redirected too many times.");
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new JdExtractionError("FETCH_FAILED", "The page redirected to an invalid address.");
      }
      current = await assertSafeUrl(next, resolver);
      continue;
    }
    const contentType = headerValue(res.headers["content-type"]) ?? "";
    return { url: current, status: res.status, contentType, body: decodeBody(res.body, contentType) };
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function requestOnce(url: URL, signal: AbortSignal, maxBytes: number, timeout: AbortSignal): Promise<RawResponse> {
  return new Promise<RawResponse>((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(mapNetworkError(error, signal, timeout));
    };

    const req = transport.request(url, {
      method: "GET",
      headers: DEFAULT_HEADERS,
      lookup: guardedLookup,
      signal,
      // No connection pooling: every request goes through guardedLookup.
      agent: false,
    });

    req.on("error", fail);
    req.on("response", (res: IncomingMessage) => {
      const status = res.statusCode ?? 0;
      if (REDIRECT_STATUSES.has(status)) {
        res.resume();
        settled = true;
        resolve({ status, headers: res.headers, body: Buffer.alloc(0) });
        return;
      }

      const declared = Number(headerValue(res.headers["content-length"]));
      if (Number.isFinite(declared) && declared > maxBytes) {
        req.destroy();
        fail(tooLarge());
        return;
      }

      let stream: Readable = res;
      const encoding = (headerValue(res.headers["content-encoding"]) ?? "").trim().toLowerCase();
      if (encoding === "gzip" || encoding === "x-gzip") stream = res.pipe(createGunzip());
      else if (encoding === "deflate") stream = res.pipe(createInflate());
      else if (encoding === "br") stream = res.pipe(createBrotliDecompress());

      const chunks: Buffer[] = [];
      let size = 0;
      stream.on("data", (chunk: Buffer) => {
        size += chunk.length;
        // Counted after decompression, so compression bombs are bounded too.
        if (size > maxBytes) {
          req.destroy();
          stream.destroy();
          fail(tooLarge());
          return;
        }
        chunks.push(chunk);
      });
      stream.on("error", fail);
      res.on("error", fail);
      stream.on("end", () => {
        if (settled) return;
        settled = true;
        resolve({ status, headers: res.headers, body: Buffer.concat(chunks) });
      });
    });
    req.end();
  });
}

const FETCH_HEADERS: Record<string, string> = Object.fromEntries(
  // fetch negotiates and decodes compression itself.
  Object.entries(DEFAULT_HEADERS).filter(([name]) => name !== "Accept-Encoding"),
);

/** One hop with global fetch (no automatic redirects, bounded size after decompression). */
async function requestOnceWithFetch(
  url: URL,
  signal: AbortSignal,
  maxBytes: number,
  timeout: AbortSignal,
  fetchImpl: typeof fetch,
): Promise<RawResponse> {
  let res: Response;
  try {
    res = await fetchImpl(url.href, { method: "GET", headers: FETCH_HEADERS, redirect: "manual", signal });
  } catch (error) {
    throw mapNetworkError(error, signal, timeout);
  }
  const headers: IncomingHttpHeaders = {};
  res.headers.forEach((value, name) => {
    headers[name.toLowerCase()] = value;
  });
  if (REDIRECT_STATUSES.has(res.status)) {
    await res.body?.cancel().catch(() => undefined);
    return { status: res.status, headers, body: Buffer.alloc(0) };
  }
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await res.body?.cancel().catch(() => undefined);
    throw tooLarge();
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (res.body) {
    const reader = res.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel().catch(() => undefined);
          throw tooLarge();
        }
        chunks.push(value);
      }
    } catch (error) {
      throw mapNetworkError(error, signal, timeout);
    }
  }
  return { status: res.status, headers, body: Buffer.concat(chunks) };
}

function tooLarge(): JdExtractionError {
  return new JdExtractionError(
    "TOO_LARGE",
    `The page is larger than ${Math.round(MAX_RESPONSE_BYTES / 1024 / 1024)} MB. Paste the job description instead.`,
  );
}

function mapNetworkError(error: unknown, signal: AbortSignal, timeout: AbortSignal): JdExtractionError {
  if (error instanceof JdExtractionError) return error;
  if (timeout.aborted) {
    return new JdExtractionError(
      "TIMEOUT",
      "The page took too long to respond (10 s). Try again or paste the job description.",
      {
        cause: error,
      },
    );
  }
  if (signal.aborted) return new JdExtractionError("FETCH_FAILED", "The request was cancelled.", { cause: error });
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (code === "EBLOCKEDHOST") {
    return new JdExtractionError(
      "BLOCKED_HOST",
      "This address points to a private or internal network and can't be fetched.",
      {
        cause: error,
      },
    );
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return new JdExtractionError("FETCH_FAILED", "Couldn't find that website. Check the link and try again.", {
      cause: error,
    });
  }
  if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "ETIMEDOUT") {
    return new JdExtractionError("FETCH_FAILED", "The website refused or dropped the connection.", { cause: error });
  }
  return new JdExtractionError("FETCH_FAILED", "Couldn't download the page.", { cause: error });
}

/** Decodes the body using the HTTP charset, then a <meta charset> sniff, then UTF-8. */
export function decodeBody(body: Buffer, contentType: string): string {
  const fromHeader = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType)?.[1];
  const head = body.subarray(0, 2048).toString("latin1");
  const fromMeta = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1];
  for (const label of [fromHeader, fromMeta, "utf-8"]) {
    if (!label) continue;
    try {
      return new TextDecoder(label.toLowerCase(), { fatal: false }).decode(body);
    } catch {
      // Unknown label — try the next candidate.
    }
  }
  return body.toString("utf8");
}
