import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProgressStore } from "@/stores/progress-store";
import { ProgressPanel } from "./ProgressPanel";
import { FIXTURE_SLUG, makeFixturePackage } from "./test-fixtures";

const pkg = makeFixturePackage();

function mockFetch(sessions: { status: number; body?: unknown }) {
  const fn = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.startsWith("/api/mock/sessions")) {
      return new Response(JSON.stringify(sessions.body ?? {}), { status: sessions.status });
    }
    if (url.startsWith("/api/progress/")) return new Response(JSON.stringify({ progress: null }), { status: 200 });
    return new Response("not found", { status: 404 });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProgressPanel pkg={pkg} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const stat = (label: string) => screen.getByText(label).closest("div") as HTMLElement;

describe("ProgressPanel", () => {
  it("shows a skeleton until hydrated, then the progress summary", async () => {
    mockFetch({
      status: 200,
      body: {
        sessions: [
          {
            id: "s1",
            startedAt: "2026-11-01T00:00:00.000Z",
            completedAt: "2026-11-01T01:00:00.000Z",
            averageScore: 6.25,
            answerCount: 4,
          },
          {
            id: "s2",
            startedAt: "2026-11-20T00:00:00.000Z",
            completedAt: "2026-11-20T01:00:00.000Z",
            averageScore: 7.5,
            answerCount: 3,
          },
          { id: "s3", startedAt: "2026-11-25T00:00:00.000Z", completedAt: null, averageScore: null, answerCount: 0 },
        ],
      },
    });
    renderPanel();
    expect(screen.getByLabelText("Loading progress")).toBeInTheDocument();

    await act(async () => {
      await useProgressStore.persist.rehydrate();
      useProgressStore.setState({ byPackage: {} });
      const s = useProgressStore.getState();
      s.toggleIn(FIXTURE_SLUG, "studied", "fx-q1");
      s.toggleIn(FIXTURE_SLUG, "favorites", "fx-q2");
      s.toggleIn(FIXTURE_SLUG, "completedTopics", "react");
      s.setIn(FIXTURE_SLUG, "studyPlanTasks", "t1", true);
      s.markFlashcard(FIXTURE_SLUG, "fx-fc1", "known");
      s.incrementFlashcardsReviewed(FIXTURE_SLUG);
      s.incrementFlashcardsReviewed(FIXTURE_SLUG);
    });

    expect(screen.queryByLabelText("Loading progress")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Items studied" })).toHaveAttribute("aria-valuenow", "33");
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Study plan" })).toHaveAttribute("aria-valuenow", "20");
    expect(within(stat("Favorites")).getByText("1")).toBeInTheDocument();
    expect(stat("Topics done")).toHaveTextContent("1/2");
    expect(stat("Cards reviewed")).toHaveTextContent("2");
    expect(stat("Cards known")).toHaveTextContent("1/3");
    // Screen-reader equivalent of the chart.
    expect(screen.getByText("React: 1 of 2 studied (50%)")).toBeInTheDocument();

    expect(await screen.findByText("Latest mock average")).toBeInTheDocument();
    expect(stat("Latest mock average")).toHaveTextContent("7.5/10");
  });

  it("treats a missing mock endpoint (404) as no sessions", async () => {
    mockFetch({ status: 404 });
    await act(async () => {
      await useProgressStore.persist.rehydrate();
    });
    renderPanel();
    expect(await screen.findByText("No sessions yet")).toBeInTheDocument();
  });

  it("shows 'Unavailable' when the mock endpoint fails", async () => {
    mockFetch({ status: 500 });
    await act(async () => {
      await useProgressStore.persist.rehydrate();
    });
    renderPanel();
    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
  });
});
