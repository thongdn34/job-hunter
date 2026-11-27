import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CandidateProfile } from "@/domain/profile/schema";
import type { NormalizedJd } from "@/domain/jd/schema";
import { NewPackageWizard } from "./NewPackageWizard";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const profile: CandidateProfile = {
  fullName: "Test Candidate",
  headline: "Senior Software Engineer",
  yearsOfExperience: 7,
  location: "Ho Chi Minh City",
  targetRoles: ["Senior Frontend Engineer"],
  workingArrangement: "hybrid",
  summary: "",
  skills: [{ name: "React", category: "frontend", proficiency: "production" }],
  experiences: [
    {
      company: "Acme Bank",
      role: "Frontend Engineer",
      period: "",
      summary: "",
      highlights: [],
      technologies: [],
      includeInGeneration: true,
      order: 0,
    },
  ],
};

const extractedJd: NormalizedJd = {
  companyName: "Example Fintech",
  jobTitle: "Senior Frontend Engineer",
  location: "Ho Chi Minh City",
  origin: "url",
  sourceUrl: "https://careers.example.com/jobs/1",
  text: "Requirements\n• React",
  sections: [{ heading: "Requirements", items: ["React", "TypeScript"] }],
  extractedAt: "2026-01-01T00:00:00.000Z",
  warnings: [
    "The job description is very short (20 characters) and may be incomplete. Consider pasting the full text.",
  ],
};

const LONG_JD =
  "We are hiring a Senior Front-End Developer to build real-time trading dashboards with React, TypeScript and WebSocket streaming.";

type Handler = (init: RequestInit | undefined) => { status: number; body: unknown };

function mockFetch(overrides: Record<string, Handler> = {}) {
  const handlers: Record<string, Handler> = {
    "GET /api/profile": () => ({ status: 200, body: { profile } }),
    "GET /api/ai/status": () => ({
      status: 200,
      body: { provider: "openai", model: "gpt-test", configured: true, availableProviders: [] },
    }),
    "POST /api/packages": () => ({ status: 201, body: { slug: "acme-senior-fe", jobId: "job_1" } }),
    ...overrides,
  };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${String(input)}`;
    const handler = handlers[key];
    if (!handler) return new Response(JSON.stringify({ error: `Unhandled ${key}` }), { status: 500 });
    const { status, body } = handler(init);
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <NewPackageWizard />
    </QueryClientProvider>,
  );
  return { user };
}

function bodyOf(fetchMock: ReturnType<typeof mockFetch>, key: string): unknown {
  const call = fetchMock.mock.calls.find(([input, init]) => `${init?.method ?? "GET"} ${String(input)}` === key);
  return call ? JSON.parse(String(call[1]?.body)) : undefined;
}

describe("NewPackageWizard", () => {
  beforeEach(() => {
    push.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates the pasted description length and submits the manual-paste body", async () => {
    const fetchMock = mockFetch();
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Company name is required.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /company name/i })).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByRole("textbox", { name: /company name/i }), "ACME");
    await user.click(screen.getByRole("tab", { name: /paste description/i }));
    const textarea = await screen.findByRole("textbox", { name: "Job description" });
    await user.type(textarea, "Too short");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("The job description is too short (9/80 characters minimum).")).toBeInTheDocument();
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("heading", { level: 2, name: /job description/i })).toBeInTheDocument();

    await user.clear(textarea);
    await user.type(textarea, LONG_JD);
    await user.click(screen.getByRole("button", { name: "Next" }));

    // Step 2 — profile summary.
    expect(await screen.findByRole("heading", { level: 3, name: "Test Candidate" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit profile" })).toHaveAttribute("href", "/profile");
    await user.click(screen.getByRole("button", { name: "Next" }));

    // Step 3 — review + AI status + generate.
    expect(await screen.findByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("gpt-test")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Generate package" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/packages/acme-senior-fe"));
    expect(bodyOf(fetchMock, "POST /api/packages")).toEqual({ companyName: "ACME", rawText: LONG_JD });
    expect(fetchMock.mock.calls.some(([input]) => String(input) === "/api/jd/extract")).toBe(false);
  });

  it("previews an extracted URL and prefills empty company/title", async () => {
    const fetchMock = mockFetch({ "POST /api/jd/extract": () => ({ status: 200, body: { jd: extractedJd } }) });
    const { user } = setup();

    await user.type(screen.getByRole("textbox", { name: /job posting url/i }), "https://careers.example.com/jobs/1");
    await user.click(screen.getByRole("button", { name: /fetch & preview/i }));

    const preview = await screen.findByRole("region", { name: "Extracted job description" });
    expect(within(preview).getByText("Requirements")).toBeInTheDocument();
    expect(within(preview).getByText(/very short/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /company name/i })).toHaveValue("Example Fintech");
    expect(screen.getByRole("textbox", { name: /job title/i })).toHaveValue("Senior Frontend Engineer");
    expect(bodyOf(fetchMock, "POST /api/jd/extract")).toEqual({ url: "https://careers.example.com/jobs/1" });
  });

  it("falls back to the paste tab when extraction fails", async () => {
    mockFetch({
      "POST /api/jd/extract": () => ({
        status: 422,
        body: { error: "This page requires signing in.", code: "LOGIN_REQUIRED" },
      }),
    });
    const { user } = setup();

    await user.type(
      screen.getByRole("textbox", { name: /job posting url/i }),
      "https://www.linkedin.com/jobs/view/123456789/",
    );
    await user.click(screen.getByRole("button", { name: /fetch & preview/i }));

    expect(await screen.findByText(/This page requires signing in\./)).toBeInTheDocument();
    const textarea = await screen.findByRole("textbox", { name: "Job description" });
    await waitFor(() => expect(textarea).toHaveFocus());
    expect(screen.getByRole("tab", { name: /paste description/i })).toHaveAttribute("aria-selected", "true");
  });

  it("shows provider setup help when the server answers AI_NOT_CONFIGURED", async () => {
    mockFetch({
      "GET /api/ai/status": () => ({ status: 503, body: { error: "unavailable" } }),
      "POST /api/packages": () => ({
        status: 503,
        body: { error: "No AI provider is configured.", code: "AI_NOT_CONFIGURED" },
      }),
    });
    const { user } = setup();

    await user.type(screen.getByRole("textbox", { name: /company name/i }), "ACME");
    await user.click(screen.getByRole("tab", { name: /paste description/i }));
    await user.type(await screen.findByRole("textbox", { name: "Job description" }), LONG_JD);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByRole("heading", { level: 3, name: "Test Candidate" });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(await screen.findByRole("button", { name: "Generate package" }));

    expect(await screen.findByText("No AI provider is configured")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open AI settings" })).toHaveAttribute("href", "/settings");
    expect(push).not.toHaveBeenCalled();
  });
});
