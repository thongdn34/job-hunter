import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { PackageProgressSchema, type PackageProgress } from "@/domain/progress/schema";
import { prisma, withTransaction } from "@/server/db";
import { ensureSamplePackageStored, isSamplePackageSlug } from "./package-repository";
import { parseStoredProgress, shouldAcceptProgress } from "./progress-mapper";
import { PackageNotFoundError } from "./repository-errors";

/**
 * Study progress per package (StudyProgress.data, validated with PackageProgressSchema).
 * Last-write-wins by the progress payload's `updatedAt`: an older write is ignored and the stored
 * copy is returned, so clients can reconcile with whatever the server kept.
 *
 * The built-in sample works before it is seeded (or with the DB down): reads return null and
 * writes are accepted as a no-op (the client keeps progress in localStorage).
 */

/** Returns the stored progress, or null when nothing (valid) is stored yet. */
export async function getProgress(slug: string): Promise<PackageProgress | null> {
  try {
    const row = await prisma.interviewPackage.findUnique({
      where: { slug },
      select: { progress: { select: { data: true } } },
    });
    if (!row?.progress) return null;
    const stored = parseStoredProgress(row.progress.data);
    if (!stored) console.warn(`[progress-repository] getProgress(${slug}): stored progress is invalid; ignoring it`);
    return stored;
  } catch (error) {
    if (!isSamplePackageSlug(slug)) throw error;
    console.error(`[progress-repository] getProgress(${slug}): database unavailable`, error);
    return null;
  }
}

/**
 * Validates and stores `progress` unless the stored copy is newer. Returns the copy the server
 * keeps. Throws ZodError for invalid payloads and PackageNotFoundError for unknown (non-sample) slugs.
 */
export async function saveProgress(slug: string, progress: PackageProgress): Promise<PackageProgress> {
  const incoming = PackageProgressSchema.parse(progress);
  const sample = isSamplePackageSlug(slug);

  try {
    // Store the built-in sample on first use so its progress syncs too (no seed step on D1).
    if (sample) await ensureSamplePackageStored(slug);
    return await withTransaction(async (tx) => {
      const pkg = await tx.interviewPackage.findUnique({
        where: { slug },
        select: { id: true, progress: { select: { data: true } } },
      });
      if (!pkg) {
        if (sample) return incoming; // sample could not be stored: accept as a no-op
        throw new PackageNotFoundError(slug);
      }

      const stored = pkg.progress ? parseStoredProgress(pkg.progress.data) : null;
      if (!shouldAcceptProgress(stored, incoming)) return stored ?? incoming;

      const data = JSON.parse(JSON.stringify(incoming)) as Prisma.InputJsonValue;
      await tx.studyProgress.upsert({
        where: { packageId: pkg.id },
        create: { packageId: pkg.id, data },
        update: { data },
      });
      return incoming;
    });
  } catch (error) {
    if (error instanceof PackageNotFoundError || !sample) throw error;
    console.error(
      `[progress-repository] saveProgress(${slug}): database unavailable; progress kept client-side`,
      error,
    );
    return incoming;
  }
}
