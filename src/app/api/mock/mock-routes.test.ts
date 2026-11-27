import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockAnswerDto, MockSessionDto } from "@/domain/mock/dto";
import { makeTestPackage } from "@/domain/mock/test-fixtures";

const repo = vi.hoisted(() => {
  class MockRepositoryError extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly code: string,
    ) {
      super(message);
    }
  }
  return {
    MockRepositoryError,
    createSession: vi.fn(),
    listSessions: vi.fn(),
    getSession: vi.fn(),
    getSessionInfo: vi.fn(),
    addAnswer: vi.fn(),
    completeSession: vi.fn(),
  };
});

vi.mock("@/server/repositories/mock-repository", () => repo);
vi.mock("@/server/repositories/package-repository", () => ({
  getPackageBySlug: vi.fn(async (slug: string) => (slug === "test-co-senior-fe" ? makeTestPackage(3) : null)),
}));
vi.mock("@/server/ai/provider", () => ({
  getLanguageModel: () => null,
  getAiStatus: () => ({ provider: "none", configured: false, availableProviders: [] }),
}));

import { GET as listRoute, POST as createRoute } from "./sessions/route";
import { GET as getRoute } from "./sessions/[id]/route";
import { POST as answerRoute } from "./sessions/[id]/answers/route";
import { POST as completeRoute } from "./sessions/[id]/complete/route";

const session: MockSessionDto = {
  id: "sess_1",
  packageSlug: "test-co-senior-fe",
  status: "active",
  startedAt: "2026-11-27T00:00:00.000Z",
  completedAt: null,
  averageScore: null,
  answerCount: 0,
};

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function jsonRequest(url: string, body: unknown, init: RequestInit = {}): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
    ...init,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/mock/sessions", () => {
  it("creates a session (201)", async () => {
    repo.createSession.mockResolvedValue(session);
    const res = await createRoute(jsonRequest("http://test/api/mock/sessions", { packageSlug: "test-co-senior-fe" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ session });
    expect(repo.createSession).toHaveBeenCalledWith("test-co-senior-fe");
  });

  it("rejects an invalid body (400) without touching the repository", async () => {
    const res = await createRoute(jsonRequest("http://test/api/mock/sessions", { packageSlug: "Bad Slug!" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTruthy();
    expect(repo.createSession).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON (400) and wrong content type (415)", async () => {
    expect((await createRoute(jsonRequest("http://test/api/mock/sessions", "{oops"))).status).toBe(400);
    const res = await createRoute(
      new Request("http://test/api/mock/sessions", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "x",
      }),
    );
    expect(res.status).toBe(415);
    // A typeless Blob body sends no Content-Type at all.
    const typeless = await createRoute(
      new Request("http://test/api/mock/sessions", { method: "POST", body: new Blob(['{"packageSlug":"x"}']) }),
    );
    expect(typeless.status).toBe(415);
  });

  it("maps the not-seeded repository error to 409 with the db:setup hint", async () => {
    repo.createSession.mockRejectedValue(
      new repo.MockRepositoryError("Run pnpm db:setup to seed it.", 409, "PACKAGE_NOT_SEEDED"),
    );
    const res = await createRoute(jsonRequest("http://test/api/mock/sessions", { packageSlug: "test-co-senior-fe" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/pnpm db:setup/);
  });

  it("hides unexpected errors behind a 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    repo.createSession.mockRejectedValue(new Error("SQLITE_BUSY secret detail"));
    const res = await createRoute(jsonRequest("http://test/api/mock/sessions", { packageSlug: "test-co-senior-fe" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).not.toMatch(/SQLITE/);
    spy.mockRestore();
  });
});

describe("GET /api/mock/sessions", () => {
  it("requires packageSlug", async () => {
    const res = await listRoute(new Request("http://test/api/mock/sessions"));
    expect(res.status).toBe(400);
  });

  it("lists sessions", async () => {
    const item = {
      id: "sess_1",
      status: "completed",
      startedAt: session.startedAt,
      completedAt: session.startedAt,
      averageScore: 7.2,
      answerCount: 5,
    };
    repo.listSessions.mockResolvedValue([item]);
    const res = await listRoute(new Request("http://test/api/mock/sessions?packageSlug=test-co-senior-fe"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sessions: [item] });
  });
});

describe("GET /api/mock/sessions/[id]", () => {
  it("validates the id", async () => {
    const res = await getRoute(new Request("http://test"), ctx("bad id!"));
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown sessions", async () => {
    repo.getSession.mockRejectedValue(
      new repo.MockRepositoryError("Mock interview session not found.", 404, "SESSION_NOT_FOUND"),
    );
    const res = await getRoute(new Request("http://test"), ctx("missing"));
    expect(res.status).toBe(404);
  });

  it("returns the session with answers", async () => {
    repo.getSession.mockResolvedValue({ session, answers: [] });
    const res = await getRoute(new Request("http://test"), ctx("sess_1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ session, answers: [] });
  });
});

describe("POST /api/mock/sessions/[id]/answers", () => {
  const url = "http://test/api/mock/sessions/sess_1/answers";

  it("rejects empty answers and missing itemId (400)", async () => {
    expect((await answerRoute(jsonRequest(url, { itemId: "t-q01", answer: "   " }), ctx("sess_1"))).status).toBe(400);
    expect((await answerRoute(jsonRequest(url, { answer: "hello" }), ctx("sess_1"))).status).toBe(400);
    expect(
      (await answerRoute(jsonRequest(url, { itemId: "t-q01", answer: "x".repeat(10_001) }), ctx("sess_1"))).status,
    ).toBe(400);
    expect(repo.getSessionInfo).not.toHaveBeenCalled();
  });

  it("returns 404 for an item that is not in the package", async () => {
    repo.getSessionInfo.mockResolvedValue(session);
    const res = await answerRoute(jsonRequest(url, { itemId: "nope", answer: "My answer" }), ctx("sess_1"));
    expect(res.status).toBe(404);
    expect(repo.addAnswer).not.toHaveBeenCalled();
  });

  it("returns 409 for a completed session", async () => {
    repo.getSessionInfo.mockResolvedValue({ ...session, status: "completed" });
    const res = await answerRoute(jsonRequest(url, { itemId: "t-q01", answer: "My answer" }), ctx("sess_1"));
    expect(res.status).toBe(409);
  });

  it("evaluates (heuristic without an AI key), persists and returns 201 { answer, evaluation }", async () => {
    repo.getSessionInfo.mockResolvedValue(session);
    repo.addAnswer.mockImplementation(
      async (
        sessionId: string,
        itemId: string,
        answer: string,
        evaluation: MockAnswerDto["evaluation"],
        revealed: boolean,
      ) => ({
        id: "ans_1",
        sessionId,
        itemId,
        answer,
        revealedBeforeSubmit: revealed,
        overall: evaluation.overall,
        evaluation,
        createdAt: "2026-11-27T00:00:00.000Z",
      }),
    );
    const res = await answerRoute(
      jsonRequest(url, {
        itemId: "t-q01-f1",
        answer: "Add jitter to the backoff and cap the delay.",
        revealedBeforeSubmit: true,
      }),
      ctx("sess_1"),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.evaluation.evaluator).toBe("heuristic");
    expect(json.answer.revealedBeforeSubmit).toBe(true);
    expect(repo.addAnswer).toHaveBeenCalledWith("sess_1", "t-q01-f1", expect.any(String), expect.any(Object), true);
  });
});

describe("POST /api/mock/sessions/[id]/complete", () => {
  it("completes the session", async () => {
    const done = { ...session, status: "completed", averageScore: 6.4, completedAt: session.startedAt };
    repo.completeSession.mockResolvedValue(done);
    const res = await completeRoute(new Request("http://test", { method: "POST" }), ctx("sess_1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ session: done });
  });
});
