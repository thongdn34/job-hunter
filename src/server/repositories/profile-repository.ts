import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { CandidateProfile } from "@/domain/profile/schema";
import {
  EMPTY_CV_ROW_DATA,
  LOCAL_PROFILE_ID,
  ProfileInputSchema,
  cvToRowData,
  experiencesToRowData,
  parseUploadedAt,
  profileFromRows,
  profileToRowData,
  skillsToRowData,
} from "@/domain/profile/persistence";
import { defaultProfile } from "@/content/profile/default-profile";
import { prisma } from "@/server/db";

/**
 * The single local candidate profile (CandidateProfile + WorkExperience + TechnicalSkill rows).
 *
 * - getProfile(): returns the profile, creating it from `defaultProfile` on first use
 *   (idempotent and safe under concurrent calls).
 * - saveProfile(): validates with CandidateProfileSchema, then replaces experiences and skills
 *   in one transaction, preserving array order. CV columns are only touched when the payload
 *   carries `cvText` — otherwise the stored CV is kept (use saveCv / clearCv to manage it).
 * - saveCv() / clearCv(): manage the uploaded CV text.
 */

const profileInclude = {
  experiences: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
  skills: { orderBy: [{ createdAt: "asc" }, { name: "asc" }] },
} satisfies Prisma.CandidateProfileInclude;

type ProfileRecord = Prisma.CandidateProfileGetPayload<{ include: typeof profileInclude }>;

function toDomain(record: ProfileRecord): CandidateProfile {
  return profileFromRows(record, record.experiences, record.skills);
}

function findProfileRecord(): Promise<ProfileRecord | null> {
  // Oldest first, so a profile created by the seed script (any id) wins over later duplicates.
  return prisma.candidateProfile.findFirst({ orderBy: { createdAt: "asc" }, include: profileInclude });
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function createDefaultProfile(): Promise<ProfileRecord> {
  const seed = ProfileInputSchema.parse(defaultProfile);
  try {
    // A single nested create is atomic; the fixed primary key turns a cross-process race
    // into a unique violation instead of a duplicate profile.
    await prisma.candidateProfile.create({
      data: {
        id: LOCAL_PROFILE_ID,
        ...profileToRowData(seed),
        experiences: { create: experiencesToRowData(seed.experiences) },
        skills: { create: skillsToRowData(seed.skills) },
      },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
  const record = await findProfileRecord();
  if (!record) throw new Error("Candidate profile could not be created.");
  return record;
}

/** De-duplicates concurrent first-run creation within this process. */
let pendingCreate: Promise<ProfileRecord> | null = null;

async function ensureProfileRecord(): Promise<ProfileRecord> {
  const existing = await findProfileRecord();
  if (existing) return existing;
  pendingCreate ??= createDefaultProfile().finally(() => {
    pendingCreate = null;
  });
  return pendingCreate;
}

export async function getProfile(): Promise<CandidateProfile> {
  return toDomain(await ensureProfileRecord());
}

/** Throws a ZodError when the payload is invalid. */
export async function saveProfile(profile: CandidateProfile): Promise<CandidateProfile> {
  const input = ProfileInputSchema.parse(profile);
  const { id: profileId } = await ensureProfileRecord();

  const cvData =
    input.cvText === undefined
      ? {}
      : input.cvText.trim()
        ? cvToRowData(
            { fileName: input.cvFileName ?? "cv.txt", text: input.cvText },
            parseUploadedAt(input.cvUploadedAt),
          )
        : EMPTY_CV_ROW_DATA;

  const experiences = experiencesToRowData(input.experiences).map((e) => ({ ...e, profileId }));
  const skills = skillsToRowData(input.skills).map((s) => ({ ...s, profileId }));

  const [, , , , , record] = await prisma.$transaction([
    prisma.candidateProfile.update({
      where: { id: profileId },
      data: { ...profileToRowData(input), ...cvData },
    }),
    prisma.workExperience.deleteMany({ where: { profileId } }),
    prisma.technicalSkill.deleteMany({ where: { profileId } }),
    prisma.workExperience.createMany({ data: experiences }),
    prisma.technicalSkill.createMany({ data: skills }),
    prisma.candidateProfile.findUniqueOrThrow({ where: { id: profileId }, include: profileInclude }),
  ]);
  return toDomain(record);
}

export interface SaveCvInput {
  fileName: string;
  /** Extracted, normalized plain text. Capped at 100k characters. */
  text: string;
}

export async function saveCv(input: SaveCvInput): Promise<CandidateProfile> {
  const { id } = await ensureProfileRecord();
  const record = await prisma.candidateProfile.update({
    where: { id },
    data: cvToRowData(input),
    include: profileInclude,
  });
  return toDomain(record);
}

export async function clearCv(): Promise<CandidateProfile> {
  const { id } = await ensureProfileRecord();
  const record = await prisma.candidateProfile.update({
    where: { id },
    data: EMPTY_CV_ROW_DATA,
    include: profileInclude,
  });
  return toDomain(record);
}
