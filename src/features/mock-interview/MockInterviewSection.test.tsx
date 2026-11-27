import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildMockClientItems } from "@/domain/mock/client-items";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { MockEvaluation } from "@/domain/mock/schema";
import { makeTestPackage } from "@/domain/mock/test-fixtures";
import { usePreferencesStore } from "@/stores/preferences-store";
import { MockInterview, MockInterviewSection } from "./MockInterviewSection";
import { answerLengthState, MAX_ANSWER_CHARS } from "./QuestionTurn";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const pkg = makeTestPackage(6);
const data = pkg.sections.mock!;

const evaluation = (overall: number, evaluator: MockEvaluation["evaluator"] = "heuristic"): MockEvaluation => ({
  scores: { technicalAccuracy: overall, seniorJudgment: overall, communication: overall, completeness: overall },
  overall,
  strengths: ["Discusses trade-offs."],
  gaps: ["No concrete example."],
  improvedAnswer: "Structure tip: core idea first.\n\nUse exponential backoff with jitter.",
  feedbackVi: "Câu trả lời khá.",
  followUpQuestion: { en: "How do you avoid a thundering herd?", vi: "Làm sao tránh thundering herd?" },
  evaluator,
});

type Handler = (url: string, init: RequestInit | undefined) => { status: number; body: unknown } | undefined;
let handler: Handler;
const calls: Array<{ url: string; method: string; body: unknown }> = [];

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const session = {
  id: "sess_1",
  packageSlug: pkg.meta.slug,
  status: "active",
  startedAt: "2026-11-27T10:00:00.000Z",
  completedAt: null,
  averageScore: null,
  answerCount: 0,
};

function defaultHandler(url: string, init: RequestInit | undefined) {
  const method = init?.method ?? "GET";
  if (url.startsWith("/api/mock/sessions?")) return { status: 200, body: { sessions: [] } };
  if (url === "/api/mock/sessions" && method === "POST") return { status: 201, body: { session } };
  if (url.endsWith("/answers")) {
    const body = JSON.parse(String(init?.body)) as { itemId: string; answer: string; revealedBeforeSubmit: boolean };
    const ev = evaluation(body.revealedBeforeSubmit ? 5 : 7.4);
    return {
      status: 201,
      body: {
        answer: {
          id: `ans_${calls.length}`,
          sessionId: "sess_1",
          itemId: body.itemId,
          answer: body.answer,
          revealedBeforeSubmit: body.revealedBeforeSubmit,
          overall: ev.overall,
          evaluation: ev,
          createdAt: "2026-11-27T10:01:00.000Z",
        },
        evaluation: ev,
      },
    };
  }
  if (url.endsWith("/complete")) {
    return {
      status: 200,
      body: {
        session: { ...session, status: "completed", completedAt: session.startedAt, averageScore: 7.4, answerCount: 1 },
      },
    };
  }
  return undefined;
}

beforeEach(() => {
  calls.length = 0;
  handler = defaultHandler;
  usePreferencesStore.setState({ language: "en" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
      const res = handler(url, init);
      return res ? json(res.status, res.body) : json(404, { error: "not found" });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderSection(ui: ReactNode = <MockInterviewSection pkg={pkg} data={data} />) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

/** Matches elements whose full text is exactly `text` (scores render as "7.4" + "/10" spans). */
const fullText = (text: string) => (_: string, el: Element | null) => el?.textContent === text;

async function startInterview(user: ReturnType<typeof userEvent.setup>, ui?: ReactNode) {
  renderSection(ui);
  await user.click(screen.getByRole("button", { name: /start mock interview/i }));
  return screen.findByRole("heading", { name: /Question 1: How do you handle WebSocket/i });
}

describe("MockInterviewSection", () => {
  it("renders the start screen with intro, rubric, options and empty history", async () => {
    renderSection();
    expect(screen.getByText("Mock interview intro.")).toBeInTheDocument();
    expect(screen.getByText("Scoring rubric")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "5" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /In order by priority/i })).toBeChecked();
    expect(screen.getByRole("switch", { name: /include behavioral/i })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /include system design/i })).toHaveAttribute("aria-disabled", "true");
    expect(await screen.findByText(/No mock interviews yet/i)).toBeInTheDocument();
  });

  it("shows the db:setup hint when the session cannot be created (409)", async () => {
    const user = userEvent.setup();
    handler = (url, init) =>
      url === "/api/mock/sessions" && init?.method === "POST"
        ? { status: 409, body: { error: "Run pnpm db:setup to seed it, then try again." } }
        : defaultHandler(url, init);
    renderSection();
    await user.click(screen.getByRole("button", { name: /start mock interview/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/pnpm db:setup/);
  });

  it("validates, submits with Ctrl+Enter and shows the evaluation", async () => {
    const user = userEvent.setup();
    await startInterview(user);
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(await screen.findByText(/Write your answer before submitting/i)).toBeInTheDocument();

    const textarea = screen.getByLabelText("Your answer");
    await user.type(textarea, "Exponential backoff with jitter.");
    expect(screen.getByText(/^32 \/ 10,000$/)).toBeInTheDocument();
    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(await screen.findByRole("heading", { name: "Score" })).toBeInTheDocument();
    expect(screen.getAllByText(fullText("7.4/10")).length).toBeGreaterThan(0);
    expect(screen.getByText("Heuristic evaluator")).toBeInTheDocument();
    expect(screen.getByText("Câu trả lời khá.")).toHaveAttribute("lang", "vi");
    expect(screen.getByText("How do you avoid a thundering herd?")).toBeInTheDocument();
    const answerCall = calls.find((c) => c.url.endsWith("/answers"));
    expect(answerCall?.body).toEqual({
      itemId: "t-q01",
      answer: "Exponential backoff with jitter.",
      revealedBeforeSubmit: false,
    });
  });

  it("requires confirmation to reveal and records it", async () => {
    const user = userEvent.setup();
    await startInterview(user);
    await user.click(screen.getByRole("button", { name: /reveal recommended answer/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /keep it hidden/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByText(/Recommended answer \(revealed\)/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reveal recommended answer/i }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /^reveal answer$/i }));
    expect(await screen.findByText(/Recommended answer \(revealed\)/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Your answer"), "Backoff.");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(await screen.findByText("Answer revealed (−2)")).toBeInTheDocument();
    expect(calls.find((c) => c.url.endsWith("/answers"))?.body).toMatchObject({ revealedBeforeSubmit: true });
  });

  it("answers the follow-up as the next turn, then finishes with a summary", async () => {
    const user = userEvent.setup();
    await startInterview(user);
    await user.type(screen.getByLabelText("Your answer"), "Backoff with jitter.");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    await user.click(await screen.findByRole("button", { name: /answer this follow-up next/i }));

    expect(await screen.findByText("Question 2 of 6")).toBeInTheDocument();
    expect(screen.getByText("Follow-up")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Your answer"), "Add jitter and cap the delay.");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    await screen.findByRole("heading", { name: "Score" });
    expect(calls.filter((c) => c.url.endsWith("/answers")).at(-1)?.body).toMatchObject({ itemId: "t-q01-f1" });

    await user.click(screen.getAllByRole("button", { name: /end session/i })[0]!);
    expect(await screen.findByRole("heading", { name: /session summary/i })).toBeInTheDocument();
    expect(screen.getByText("2 answers evaluated")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /scores per question/i }).querySelectorAll("li")).toHaveLength(2);
    expect(calls.some((c) => c.url === "/api/mock/sessions/sess_1/complete" && c.method === "POST")).toBe(true);

    await user.click(screen.getByRole("button", { name: /start a new session/i }));
    expect(screen.getByRole("button", { name: /start mock interview/i })).toBeInTheDocument();
  });

  it("shows an error and keeps the answer when evaluation fails", async () => {
    const user = userEvent.setup();
    handler = (url, init) =>
      url.endsWith("/answers") ? { status: 500, body: { error: "Server exploded" } } : defaultHandler(url, init);
    await startInterview(user);
    await user.type(screen.getByLabelText("Your answer"), "Some answer");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(await screen.findByText("Server exploded")).toBeInTheDocument();
    expect(screen.getByLabelText("Your answer")).toHaveValue("Some answer");
  });

  it("drills down into a previous session", async () => {
    const user = userEvent.setup();
    const ev = evaluation(6.5);
    handler = (url, init) => {
      if (url.startsWith("/api/mock/sessions?")) {
        return {
          status: 200,
          body: {
            sessions: [
              {
                id: "old_1",
                status: "completed",
                startedAt: session.startedAt,
                completedAt: session.startedAt,
                averageScore: 6.5,
                answerCount: 1,
              },
            ],
          },
        };
      }
      if (url === "/api/mock/sessions/old_1") {
        return {
          status: 200,
          body: {
            session: {
              ...session,
              id: "old_1",
              status: "completed",
              completedAt: session.startedAt,
              averageScore: 6.5,
              answerCount: 1,
            },
            answers: [
              {
                id: "a1",
                sessionId: "old_1",
                itemId: "t-q02",
                answer: "Old answer text",
                revealedBeforeSubmit: false,
                overall: 6.5,
                evaluation: ev,
                createdAt: session.startedAt,
              },
            ],
          },
        };
      }
      return defaultHandler(url, init);
    };
    renderSection();
    const row = await screen.findByRole("button", { name: /1 answer · Completed/i });
    expect(row).toHaveAttribute("aria-expanded", "false");
    await user.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    const answerToggle = await screen.findByRole("button", { name: /Question 2: How do you handle WebSocket/i });
    await user.click(answerToggle);
    expect(await screen.findByText("Old answer text")).toBeInTheDocument();
  });

  it("runs from the slim client items alone (standalone page props, no package)", async () => {
    const user = userEvent.setup();
    const items = buildMockClientItems(pkg);
    await startInterview(user, <MockInterview slug={pkg.meta.slug} config={data} items={items} variant="page" />);
    expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open full-page mode/i })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Your answer"), "Backoff with jitter.");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    await user.click(await screen.findByRole("button", { name: /answer this follow-up next/i }));
    expect(await screen.findByText("Question 2 of 6")).toBeInTheDocument();
    expect(screen.getByText("Follow-up")).toBeInTheDocument();
  });

  it("does not announce the character counter on every keystroke, only on threshold crossings", async () => {
    const user = userEvent.setup();
    await startInterview(user);
    const textarea = screen.getByLabelText("Your answer");
    const counter = screen.getByText(/^0 \/ 10,000$/);
    expect(counter).not.toHaveAttribute("aria-live");
    expect(textarea.getAttribute("aria-describedby")?.split(" ")).toContain(counter.id);

    const status = screen.getByTestId("answer-length-status");
    expect(status).toHaveAttribute("aria-live", "polite");
    await user.type(textarea, "Short answer.");
    expect(status).toHaveTextContent(/^$/);

    await user.click(textarea);
    await user.paste("x".repeat(9_000 - "Short answer.".length));
    expect(status).toHaveTextContent("Approaching the 10,000 character limit.");

    await user.paste("x".repeat(1_001));
    expect(status).toHaveTextContent("Over the 10,000 character limit.");
  });
});

describe("answerLengthState", () => {
  it("only changes at the 90% and over-limit thresholds", () => {
    expect(answerLengthState(0)).toBe("ok");
    expect(answerLengthState(8_999)).toBe("ok");
    expect(answerLengthState(9_000)).toBe("near");
    expect(answerLengthState(MAX_ANSWER_CHARS)).toBe("near");
    expect(answerLengthState(MAX_ANSWER_CHARS + 1)).toBe("over");
  });
});
