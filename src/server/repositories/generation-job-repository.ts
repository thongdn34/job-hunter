import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import {
  GenerationJobStatusSchema,
  SectionKeySchema,
  SectionProgressSchema,
  type GenerationJobDto,
  type GenerationJobStatus,
  type SectionProgress,
} from "@/domain/generation/schema";
import type { SectionKey } from "@/domain/package/sections";
import { prisma } from "@/server/db";

/**
 * GenerationJob persistence (Prisma). Json columns are validated with Zod on read and write;
 * invalid stored payloads degrade to empty values instead of crashing the progress endpoint.
 */

export type JobProgress = Partial<Record<SectionKey, SectionProgress>>;

const SectionsSchema = z.array(SectionKeySchema);
const ProgressSchema = z.partialRecord(SectionKeySchema, SectionProgressSchema);

const jobInclude = { package: { select: { slug: true } } } as const;
type JobRow = Prisma.GenerationJobGetPayload<{ include: typeof jobInclude }>;

/** Internal view used by the pipeline (includes the package id and cancel flag). */
export interface GenerationJobRecord extends GenerationJobDto {
  packageId: string;
  cancelRequested: boolean;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function toGenerationJobRecord(row: JobRow): GenerationJobRecord {
  const sections = SectionsSchema.safeParse(row.sections);
  const progress = ProgressSchema.safeParse(row.progress);
  const status = GenerationJobStatusSchema.safeParse(row.status);
  return {
    id: row.id,
    packageId: row.packageId,
    packageSlug: row.package.slug,
    status: status.success ? status.data : "failed",
    sections: sections.success ? sections.data : [],
    progress: progress.success ? progress.data : {},
    provider: row.provider ?? undefined,
    model: row.model ?? undefined,
    error: row.error ?? undefined,
    cancelRequested: row.cancelRequested,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString(),
    finishedAt: row.finishedAt?.toISOString(),
  };
}

/** Strips internal fields for the wire format. */
export function toGenerationJobDto(record: GenerationJobRecord): GenerationJobDto {
  const { packageId, cancelRequested, ...dto } = record;
  void packageId;
  void cancelRequested;
  return dto;
}

export interface CreateGenerationJobInput {
  packageId: string;
  sections: SectionKey[];
  provider?: string;
  model?: string;
}

export async function createGenerationJob(input: CreateGenerationJobInput): Promise<GenerationJobRecord> {
  const sections = SectionsSchema.parse(input.sections);
  const progress: JobProgress = Object.fromEntries(sections.map((k) => [k, { status: "pending", attempts: 0 }]));
  const row = await prisma.generationJob.create({
    data: {
      packageId: input.packageId,
      status: "queued",
      sections: toJson(sections),
      progress: toJson(progress),
      provider: input.provider ?? null,
      model: input.model ?? null,
    },
    include: jobInclude,
  });
  return toGenerationJobRecord(row);
}

export async function getGenerationJob(id: string): Promise<GenerationJobRecord | null> {
  const row = await prisma.generationJob.findUnique({ where: { id }, include: jobInclude });
  return row ? toGenerationJobRecord(row) : null;
}

export async function getLatestJobForPackage(packageId: string): Promise<GenerationJobRecord | null> {
  const row = await prisma.generationJob.findFirst({
    where: { packageId },
    orderBy: { createdAt: "desc" },
    include: jobInclude,
  });
  return row ? toGenerationJobRecord(row) : null;
}

export interface GenerationJobPatch {
  status?: GenerationJobStatus;
  progress?: JobProgress;
  error?: string | null;
  startedAt?: Date;
  finishedAt?: Date;
}

export async function updateGenerationJob(id: string, patch: GenerationJobPatch): Promise<GenerationJobRecord> {
  const data: Prisma.GenerationJobUpdateInput = {};
  if (patch.status !== undefined) data.status = GenerationJobStatusSchema.parse(patch.status);
  if (patch.progress !== undefined) data.progress = toJson(ProgressSchema.parse(patch.progress));
  if (patch.error !== undefined) data.error = patch.error;
  if (patch.startedAt !== undefined) data.startedAt = patch.startedAt;
  if (patch.finishedAt !== undefined) data.finishedAt = patch.finishedAt;
  const row = await prisma.generationJob.update({ where: { id }, data, include: jobInclude });
  return toGenerationJobRecord(row);
}

/** Sets cancelRequested (polled by the pipeline between steps). Returns null when the job does not exist. */
export async function requestJobCancel(id: string): Promise<GenerationJobRecord | null> {
  const existing = await prisma.generationJob.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  const row = await prisma.generationJob.update({
    where: { id },
    data: { cancelRequested: true },
    include: jobInclude,
  });
  return toGenerationJobRecord(row);
}

export async function isJobCancelRequested(id: string): Promise<boolean> {
  const row = await prisma.generationJob.findUnique({ where: { id }, select: { cancelRequested: true } });
  return row?.cancelRequested ?? false;
}
