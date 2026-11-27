import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defaultProfile } from "@/content/profile/default-profile";
import { CvCard } from "./CvCard";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const withCv = {
  cvText: "Jane Doe\nSenior Engineer",
  cvFileName: "jane.pdf",
  cvUploadedAt: "2026-01-02T03:04:05.000Z",
};

afterEach(() => vi.unstubAllGlobals());

describe("CvCard", () => {
  it("rejects .docx on the client with a clear message", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<CvCard profile={{}} />, { wrapper });

    const input = screen.getByTestId("cv-file-input");
    fireEvent.change(input, { target: { files: [new File(["PK"], "cv.docx")] } });

    expect(await screen.findByText(/Word documents \(\.docx\/\.doc\) aren't supported yet/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uploads a supported file as multipart form data", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ profile: { ...defaultProfile, ...withCv }, extractedChars: 24, truncated: false }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<CvCard profile={{}} />, { wrapper });

    expect(screen.getByRole("button", { name: "Choose file" })).toBeInTheDocument();
    const file = new File(["Jane Doe"], "cv.txt", { type: "text/plain" });
    fireEvent.change(screen.getByTestId("cv-file-input"), { target: { files: [file] } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/profile/cv");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("file")).toBe(file);
  });

  it("shows a server error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "No text could be extracted." }, { status: 400 })),
    );
    render(<CvCard profile={{}} />, { wrapper });
    fireEvent.change(screen.getByTestId("cv-file-input"), {
      target: { files: [new File(["%PDF-"], "scan.pdf", { type: "application/pdf" })] },
    });
    expect(await screen.findByText("No text could be extracted.")).toBeInTheDocument();
  });

  it("shows the current CV, previews its text and removes it after confirmation", async () => {
    const fetchMock = vi.fn(async () => Response.json({ profile: defaultProfile }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CvCard profile={withCv} />, { wrapper });

    expect(screen.getByText("jane.pdf")).toBeInTheDocument();
    expect(screen.getByText(/24 characters/)).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: /extracted text preview/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Extracted CV text")).toHaveTextContent("Senior Engineer");

    await user.click(screen.getByRole("button", { name: "Remove CV jane.pdf" }));
    await user.click(await screen.findByRole("button", { name: "Remove CV" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/profile/cv", expect.objectContaining({ method: "DELETE" })),
    );
  });
});
