import { PackageProgressSchema, type PackageProgress } from "@/domain/progress/schema";

/**
 * Pure last-write-wins logic for StudyProgress (unit-tested in progress-mapper.test.ts).
 */

function timeOf(value: string | undefined): number {
  if (!value) return Number.NaN;
  return Date.parse(value);
}

/** Parses a stored StudyProgress.data value; invalid payloads are treated as absent. */
export function parseStoredProgress(data: unknown): PackageProgress | null {
  const parsed = PackageProgressSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Decides whether `incoming` replaces `stored`. Older writes lose; equal timestamps are accepted
 * (idempotent re-sends). An unparsable incoming timestamp never overwrites valid stored progress,
 * while an unparsable stored timestamp is always replaced.
 */
export function shouldAcceptProgress(stored: PackageProgress | null, incoming: PackageProgress): boolean {
  if (!stored) return true;
  const storedTime = timeOf(stored.updatedAt);
  if (Number.isNaN(storedTime)) return true;
  const incomingTime = timeOf(incoming.updatedAt);
  if (Number.isNaN(incomingTime)) return false;
  return incomingTime >= storedTime;
}
