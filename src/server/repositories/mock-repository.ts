import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { MockAnswerDto, MockSessionDto, MockSessionListItem } from "@/domain/mock/dto";
import { MockEvaluationSchema, type MockEvaluation } from "@/domain/mock/schema";
import { averageScore } from "@/domain/mock/scoring";
import { prisma } from "@/server/db";
import { ensureSamplePackageStored } from "@/server/repositories/package-repository";

/**
 * Persistence for mock interview sessions (MockInterviewSession / MockInterviewAnswer).
 * Errors that map to HTTP statuses are thrown as MockRepositoryError.
 */

export class MockRepositoryError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
    readonly code:
      "PACKAGE_NOT_FOUND" | "PACKAGE_NOT_SEEDED" | "SESSION_NOT_FOUND" | "SESSION_COMPLETED" | "INVALID_EVALUATION",
  ) {
    super(message);
    this.name = "MockRepositoryError";
  }
}

const sessionInclude = {
  package: { select: { slug: true } },
  _count: { select: { answers: true } },
} as const;

type SessionRow = Prisma.MockInterviewSessionGetPayload<{ include: typeof sessionInclude }>;
type AnswerRow = Prisma.MockInterviewAnswerGetPayload<object>;

function toSessionDto(row: SessionRow): MockSessionDto {
  return {
    id: row.id,
    packageSlug: row.package.slug,
    status: row.status === "completed" ? "completed" : "active",
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    averageScore: row.averageScore ?? null,
    answerCount: row._count.answers,
  };
}

/** Rows whose stored JSON no longer validates are skipped by callers (returns null). */
function toAnswerDto(row: AnswerRow): MockAnswerDto | null {
  const evaluation = MockEvaluationSchema.safeParse(row.evaluation);
  if (!evaluation.success) return null;
  return {
    id: row.id,
    sessionId: row.sessionId,
    itemId: row.itemId,
    answer: row.answer,
    revealedBeforeSubmit: row.revealedBeforeSubmit,
    overall: row.overall,
    evaluation: evaluation.data,
    createdAt: row.createdAt.toISOString(),
  };
}

async function requirePackageId(packageSlug: string): Promise<string> {
  // Built-in samples are stored on first use (no seed step needed, e.g. on Cloudflare D1).
  const id = await ensureSamplePackageStored(packageSlug);
  if (id) return id;
  throw new MockRepositoryError(`Package "${packageSlug}" was not found.`, 404, "PACKAGE_NOT_FOUND");
}

async function requireSession(id: string): Promise<SessionRow> {
  const row = await prisma.mockInterviewSession.findUnique({ where: { id }, include: sessionInclude });
  if (!row) throw new MockRepositoryError("Mock interview session not found.", 404, "SESSION_NOT_FOUND");
  return row;
}

export async function createSession(packageSlug: string): Promise<MockSessionDto> {
  const packageId = await requirePackageId(packageSlug);
  const row = await prisma.mockInterviewSession.create({
    data: { packageId, status: "active" },
    include: sessionInclude,
  });
  return toSessionDto(row);
}

/** Lightweight lookup used by the answers route (package slug + status). */
export async function getSessionInfo(id: string): Promise<MockSessionDto> {
  return toSessionDto(await requireSession(id));
}

export async function addAnswer(
  sessionId: string,
  itemId: string,
  answer: string,
  evaluation: MockEvaluation,
  revealed: boolean,
): Promise<MockAnswerDto> {
  const parsed = MockEvaluationSchema.safeParse(evaluation);
  if (!parsed.success) throw new MockRepositoryError("Evaluation failed validation.", 400, "INVALID_EVALUATION");
  const session = await requireSession(sessionId);
  if (session.status === "completed") {
    throw new MockRepositoryError("This mock interview session is already completed.", 409, "SESSION_COMPLETED");
  }
  const row = await prisma.mockInterviewAnswer.create({
    data: {
      sessionId,
      itemId,
      answer,
      revealedBeforeSubmit: revealed,
      overall: parsed.data.overall,
      evaluation: parsed.data as unknown as Prisma.InputJsonValue,
    },
  });
  const dto = toAnswerDto(row);
  if (!dto) throw new MockRepositoryError("Stored evaluation failed validation.", 400, "INVALID_EVALUATION");
  return dto;
}

/** Marks the session completed and stores the average overall score. Idempotent. */
export async function completeSession(id: string): Promise<MockSessionDto> {
  const session = await requireSession(id);
  if (session.status === "completed") return toSessionDto(session);
  const answers = await prisma.mockInterviewAnswer.findMany({ where: { sessionId: id }, select: { overall: true } });
  const row = await prisma.mockInterviewSession.update({
    where: { id },
    data: {
      status: "completed",
      completedAt: new Date(),
      averageScore: averageScore(answers.map((a) => a.overall)),
    },
    include: sessionInclude,
  });
  return toSessionDto(row);
}

/** Sessions of a package, newest first. A package that is not in the DB simply has no sessions. */
export async function listSessions(packageSlug: string, limit = 50): Promise<MockSessionListItem[]> {
  const rows = await prisma.mockInterviewSession.findMany({
    where: { package: { slug: packageSlug } },
    include: sessionInclude,
    orderBy: { startedAt: "desc" },
    take: limit,
  });
  return rows.map((row) => {
    const dto = toSessionDto(row);
    return {
      id: dto.id,
      status: dto.status,
      startedAt: dto.startedAt,
      completedAt: dto.completedAt,
      averageScore: dto.averageScore,
      answerCount: dto.answerCount,
    };
  });
}

export async function getSession(id: string): Promise<{ session: MockSessionDto; answers: MockAnswerDto[] }> {
  const session = await requireSession(id);
  const rows = await prisma.mockInterviewAnswer.findMany({ where: { sessionId: id }, orderBy: { createdAt: "asc" } });
  const answers = rows.map(toAnswerDto).filter((a): a is MockAnswerDto => a !== null);
  return { session: toSessionDto(session), answers };
}
