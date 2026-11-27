import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { GenerationJobDto } from "@/domain/generation/schema";
import { GenerationProgressBanner } from "./GenerationProgressBanner";
import { RegenerateItemButton } from "./RegenerateItemButton";
import { SectionStatusPlaceholder } from "./SectionStatusPlaceholder";
import { allStates, makeJob, makePackage } from "./test-fixtures";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

type Reply = { status: number; body: unknown };

function stubFetch(handler: (method: string, url: string) => Reply) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { status, body } = handler(init?.method ?? "GET", String(input));
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  refresh.mockReset();
  Object.values(toast).forEach((fn) => fn.mockReset());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("GenerationProgressBanner", () => {
  it("renders nothing for sample or complete packages", () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: null }));
    const { container, rerender } = render(<GenerationProgressBanner pkg={makePackage({}, { isSample: true })} />, {
      wrapper: wrapper(),
    });
    expect(container).toBeEmptyDOMElement();
    rerender(<GenerationProgressBanner pkg={makePackage(allStates("ready"))} />);
    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows per-section progress and cancels the running job", async () => {
    const job = makeJob({
      progress: { jd: { status: "ready" }, company: { status: "generating" }, match: { status: "failed" } },
    });
    const fetchMock = stubFetch((method, url) => {
      if (method === "POST" && url === "/api/generation-jobs/job_1/cancel") return { status: 200, body: { ok: true } };
      return { status: 200, body: job };
    });
    const user = userEvent.setup();
    render(<GenerationProgressBanner pkg={makePackage({ jd: { status: "ready" } })} />, { wrapper: wrapper() });

    const banner = await screen.findByRole("region", { name: "Generating your package…" });
    expect(within(banner).getByText("1/16")).toBeInTheDocument();
    expect(within(banner).getByRole("progressbar")).toHaveAttribute("aria-valuetext", "1 of 16 sections ready");
    expect(within(banner).getByText("gpt-test")).toBeInTheDocument();

    const chips = within(within(banner).getByRole("list", { name: "Section status" })).getAllByRole("link");
    expect(chips).toHaveLength(16);
    expect(chips[0]).toHaveAccessibleName("1. Job Description Analysis: Ready");
    expect(chips[1]).toHaveAccessibleName("2. Company Research: Generating");
    expect(chips[2]).toHaveAccessibleName("3. Candidate Matching: Failed");
    expect(chips[0]).toHaveAttribute("href", "#bookmark-acme-jd");

    await user.click(within(banner).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Generation cancelled", expect.anything()));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/generation-jobs/job_1/cancel",
      expect.objectContaining({ method: "POST" }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("polls every 2 s, refreshes when a section finishes and stops when the job ends", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const responses: GenerationJobDto[] = [
      makeJob({
        sections: ["jd", "company"],
        progress: { jd: { status: "generating" }, company: { status: "pending" } },
      }),
      makeJob({
        sections: ["jd", "company"],
        progress: { jd: { status: "ready" }, company: { status: "generating" } },
      }),
      makeJob({
        status: "succeeded",
        sections: ["jd", "company"],
        progress: { jd: { status: "ready" }, company: { status: "ready" } },
      }),
    ];
    let call = 0;
    const fetchMock = stubFetch(() => ({
      status: 200,
      body: { job: responses[Math.min(call++, responses.length - 1)] },
    }));
    const pkg = makePackage({ ...allStates("ready"), jd: { status: "generating" }, company: { status: "pending" } });
    render(<GenerationProgressBanner pkg={pkg} />, { wrapper: wrapper() });

    await screen.findByRole("region", { name: "Generating your package…" });
    expect(refresh).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenCalledWith("/api/packages/acme-senior-fe/jobs/latest", expect.anything());
  });
});

describe("GenerationProgressBanner after an interrupted run", () => {
  it("labels stalled sections and generates the missing ones in one job", async () => {
    let latest: GenerationJobDto = makeJob({
      status: "succeeded",
      sections: ["jd"],
      progress: { jd: { status: "ready" } },
    });
    const fetchMock = stubFetch((method, url) => {
      if (method === "POST" && url === "/api/packages/acme-senior-fe/generate") {
        latest = makeJob({ id: "job_2", sections: ["company"], progress: { company: { status: "pending" } } });
        return { status: 202, body: { jobId: "job_2", sections: ["company"] } };
      }
      return { status: 200, body: { job: latest } };
    });
    const user = userEvent.setup();
    const pkg = makePackage({ ...allStates("ready"), company: { status: "pending" } });
    pkg.sections = Object.fromEntries(
      Object.keys(pkg.sectionStates)
        .filter((key) => key !== "company")
        .map((key) => [key, {}]),
    ) as typeof pkg.sections;
    render(<GenerationProgressBanner pkg={pkg} />, { wrapper: wrapper() });

    const banner = await screen.findByRole("region", { name: "1 section not generated yet" });
    const chips = within(within(banner).getByRole("list", { name: "Section status" })).getAllByRole("link");
    expect(chips[1]).toHaveAccessibleName("2. Company Research: Not generated");

    await user.click(within(banner).getByRole("button", { name: "Generate 1 missing section" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Generating the missing sections"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/packages/acme-senior-fe/generate",
      expect.objectContaining({ method: "POST" }),
    );
    expect(refresh).toHaveBeenCalled();
    await screen.findByRole("region", { name: "Generating your package…" });
  });
});

describe("GenerationProgressBanner with outdated sections", () => {
  it("offers to regenerate the outdated sections", async () => {
    const fetchMock = stubFetch((method) =>
      method === "POST"
        ? { status: 202, body: { jobId: "job_2", sections: ["hr"] } }
        : {
            status: 200,
            body: {
              job: makeJob({ status: "succeeded", sections: ["company"], progress: { company: { status: "ready" } } }),
            },
          },
    );
    const user = userEvent.setup();
    const pkg = makePackage({ ...allStates("ready"), hr: { status: "stale" } });
    pkg.sections = Object.fromEntries(Object.keys(pkg.sectionStates).map((key) => [key, {}])) as typeof pkg.sections;
    render(<GenerationProgressBanner pkg={pkg} />, { wrapper: wrapper() });

    const banner = await screen.findByRole("region", { name: "Generation finished" });
    await user.click(within(banner).getByRole("button", { name: "Regenerate 1 outdated section" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Regenerating the outdated sections"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/packages/acme-senior-fe/generate",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("SectionStatusPlaceholder", () => {
  it("offers 'Generate section' for a pending section that no running job covers", async () => {
    const job = makeJob({ status: "cancelled", sections: ["jd"], progress: { jd: { status: "ready" } } });
    const fetchMock = stubFetch((method) =>
      method === "POST" ? { status: 202, body: { jobId: "job_2" } } : { status: 200, body: { job } },
    );
    const user = userEvent.setup();
    const pkg = makePackage({ jd: { status: "ready" } });
    // The banner owns the latest-job query; the placeholder reads the shared cache.
    render(
      <>
        <GenerationProgressBanner pkg={pkg} />
        <SectionStatusPlaceholder pkg={pkg} sectionKey="coding" />
      </>,
      { wrapper: wrapper() },
    );
    expect(screen.getByRole("status", { name: /Coding and Algorithms: waiting/ })).toBeInTheDocument();
    expect(await screen.findByText("This section hasn't been generated")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: /Coding and Algorithms/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Generate section: Coding and Algorithms" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/packages/acme-senior-fe/sections/coding",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("shows a busy skeleton for pending sections", () => {
    stubFetch(() => ({ status: 200, body: null }));
    render(<SectionStatusPlaceholder pkg={makePackage()} sectionKey="coding" />, { wrapper: wrapper() });
    expect(screen.getByRole("status", { name: /Coding and Algorithms: waiting/ })).toHaveAttribute("aria-busy", "true");
  });

  it("shows the error and retries a failed section", async () => {
    const fetchMock = stubFetch(() => ({ status: 202, body: { jobId: "job_2" } }));
    const user = userEvent.setup();
    const pkg = makePackage({ coding: { status: "failed", error: "Model returned invalid JSON" } });
    render(<SectionStatusPlaceholder pkg={pkg} sectionKey="coding" />, { wrapper: wrapper() });

    expect(screen.getByRole("alert")).toHaveTextContent("Model returned invalid JSON");
    await user.click(screen.getByRole("button", { name: "Retry section: Coding and Algorithms" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/packages/acme-senior-fe/sections/coding",
      expect.objectContaining({ method: "POST" }),
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it("offers Regenerate for stale sections and no actions for samples", () => {
    stubFetch(() => ({ status: 200, body: null }));
    const { rerender } = render(
      <SectionStatusPlaceholder pkg={makePackage({ hr: { status: "stale" } })} sectionKey="hr" />,
      {
        wrapper: wrapper(),
      },
    );
    expect(screen.getByRole("button", { name: /Regenerate/ })).toBeInTheDocument();
    rerender(
      <SectionStatusPlaceholder pkg={makePackage({ hr: { status: "failed" } }, { isSample: true })} sectionKey="hr" />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("disables retry while another job runs for the package", async () => {
    stubFetch(() => ({
      status: 200,
      body: { job: makeJob({ sections: ["jd"], progress: { jd: { status: "generating" } } }) },
    }));
    const pkg = makePackage({ jd: { status: "generating" }, coding: { status: "failed", error: "bad" } });
    render(
      <>
        <GenerationProgressBanner pkg={pkg} />
        <SectionStatusPlaceholder pkg={pkg} sectionKey="coding" />
      </>,
      { wrapper: wrapper() },
    );
    await screen.findByRole("region", { name: "Generating your package…" });
    expect(screen.getByRole("button", { name: "Retry section: Coding and Algorithms" })).toBeDisabled();
  });

  it("reports retry failures with a toast", async () => {
    stubFetch(() => ({ status: 503, body: { error: "No provider", code: "AI_NOT_CONFIGURED" } }));
    const user = userEvent.setup();
    render(<SectionStatusPlaceholder pkg={makePackage({ jd: { status: "failed" } })} sectionKey="jd" />, {
      wrapper: wrapper(),
    });
    await user.click(screen.getByRole("button", { name: /Retry section/ }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Couldn't regenerate"),
        expect.objectContaining({ description: expect.stringContaining("No AI provider is configured") }),
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("RegenerateItemButton", () => {
  it("confirms, regenerates the item and refreshes the page", async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { ok: true } }));
    const user = userEvent.setup();
    render(<RegenerateItemButton packageSlug="acme-senior-fe" itemId="q-07" />, { wrapper: wrapper() });

    await user.click(screen.getByRole("button", { name: "Regenerate answer" }));
    const dialog = await screen.findByRole("dialog", { name: "Regenerate this answer?" });
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Regenerate" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Answer regenerated"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/packages/acme-senior-fe/items/q-07/regenerate",
      expect.objectContaining({ method: "POST" }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("is disabled when requested", () => {
    stubFetch(() => ({ status: 200, body: null }));
    render(<RegenerateItemButton packageSlug="s" itemId="i" disabled />, { wrapper: wrapper() });
    expect(screen.getByRole("button", { name: "Regenerate answer" })).toBeDisabled();
  });
});
