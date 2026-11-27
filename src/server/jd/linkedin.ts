/**
 * LinkedIn job pages require sign-in, but each posting is also served by a public guest
 * endpoint. Map any recognizable job URL to that endpoint.
 */

const LINKEDIN_HOST = /(?:^|\.)linkedin\.com$/i;
const GUEST_BASE = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/";

export function isLinkedInHost(hostname: string): boolean {
  return LINKEDIN_HOST.test(hostname.replace(/\.$/, ""));
}

/** Extracts the numeric job id from a LinkedIn job URL, or null when it isn't one. */
export function linkedInJobId(url: URL): string | null {
  if (!isLinkedInHost(url.hostname)) return null;
  const path = url.pathname;

  // /jobs/view/4492566584, /jobs/view/senior-dev-at-acme-4492566584/, /comm/jobs/view/4492566584
  const view = /\/jobs\/view\/(?:[^/]*?-)?(\d{6,})(?:[/?#]|$)/i.exec(path);
  if (view) return view[1]!;

  // Already the guest endpoint.
  const guest = /\/jobs-guest\/jobs\/api\/jobPosting\/(\d{6,})/i.exec(path);
  if (guest) return guest[1]!;

  // /jobs/search/?currentJobId=..., /jobs/collections/recommended/?currentJobId=...
  if (/^\/(?:comm\/)?jobs\//i.test(path)) {
    const current = url.searchParams.get("currentJobId");
    if (current && /^\d{6,}$/.test(current)) return current;
  }
  return null;
}

/** Maps a LinkedIn job URL to the public guest endpoint, or returns null for other URLs. */
export function toLinkedInGuestUrl(url: URL): URL | null {
  const id = linkedInJobId(url);
  return id ? new URL(`${GUEST_BASE}${id}`) : null;
}

/** Canonical, shareable job URL (used as `sourceUrl`). */
export function canonicalLinkedInJobUrl(url: URL): string | null {
  const id = linkedInJobId(url);
  return id ? `https://www.linkedin.com/jobs/view/${id}/` : null;
}
