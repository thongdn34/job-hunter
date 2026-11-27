import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  CommunicationSection as CommunicationData,
  CompanyResearch,
  FinalAssessment,
  InterviewerQuestions,
  JdAnalysis,
  PracticeProject,
  TailoredCv,
} from "@/domain/package/schema";
import type { Fact } from "@/domain/common/schema";
import { useProgressStore } from "@/stores/progress-store";
import { JdSection } from "./JdSection";
import { CompanySection } from "./CompanySection";
import { CvSection } from "./CvSection";
import { CommunicationSection } from "./CommunicationSection";
import { InterviewerQuestionsSection } from "./InterviewerQuestionsSection";
import { PracticeProjectSection } from "./PracticeProjectSection";
import { AssessmentSection } from "./AssessmentSection";
import { bi, makeTestPackage } from "./test-fixtures";

const fact = (en: string, status: Fact["status"] = "verified", extra: Partial<Fact> = {}): Fact => ({
  text: bi(en),
  status,
  ...extra,
});

describe("JdSection", () => {
  const jd: JdAnalysis = {
    jobTitle: fact("Senior Frontend Engineer"),
    company: fact("Test Co"),
    location: fact("Ho Chi Minh City"),
    workingArrangement: fact("Hybrid", "assumption"),
    seniority: fact("Senior"),
    responsibilities: [
      fact("Build the trading UI", "verified", { sourceUrl: "https://jobs.example.com/1", note: "From JD" }),
    ],
    requiredSkills: [fact("React")],
    preferredSkills: [],
    benefits: [],
    keyExpectations: [fact("Own frontend architecture", "unverified")],
    inferredArchitecture: { summary: bi("SPA with a BFF"), components: [fact("BFF layer", "assumption")] },
    sourceUrls: ["https://jobs.example.com/1"],
    verification: {
      overallStatus: "unverified",
      notes: [bi("Salary not published")],
      checkedAt: "2026-03-05T00:00:00Z",
    },
  };

  it("shows a Not verified notice when compensation is absent", () => {
    render(<JdSection pkg={makeTestPackage()} data={jd} />);
    expect(screen.getByText(/Not verified — not published/)).toBeInTheDocument();
    expect(screen.getByText("No preferred skills listed.")).toBeInTheDocument();
  });

  it("renders source links safely and the verification legend with counts", () => {
    render(<JdSection pkg={makeTestPackage()} data={jd} />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(screen.getByText(/Confirmed from a cited source/)).toBeInTheDocument();
    expect(screen.getByText(/Inferred by the generator/)).toBeInTheDocument();
    // assumption facts: workingArrangement + BFF layer
    expect(screen.getByText("2 facts")).toBeInTheDocument();
  });

  it("renders compensation when present", () => {
    render(<JdSection pkg={makeTestPackage()} data={{ ...jd, compensation: fact("$4k–$6k / month") }} />);
    expect(screen.getByText("$4k–$6k / month")).toBeInTheDocument();
    expect(screen.queryByText(/Not verified — not published/)).not.toBeInTheDocument();
  });
});

describe("CompanySection", () => {
  const company: CompanyResearch = {
    overview: fact("Fintech company"),
    businessModel: fact("B2B SaaS"),
    productsAndServices: [fact("Trading platform")],
    industry: fact("Finance"),
    engineeringCulture: [],
    companySize: fact("200–500", "unverified"),
    potentialProjects: [fact("New dashboard", "assumption")],
    applicationRisks: [fact("Long hiring process", "unverified")],
    recruiterQuestions: [bi("What is the team size?")],
    sources: [{ title: "Company site", url: "https://example.com", accessedAt: "2026-01-02" }],
  };

  it("renders overview, risks and recruiter questions", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<CompanySection pkg={makeTestPackage()} data={company} />);
    expect(screen.getByText("Fintech company")).toBeInTheDocument();
    expect(screen.getByText("Long hiring process")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Company site/ })).toHaveAttribute("href", "https://example.com");
    await user.click(screen.getByRole("button", { name: "Copy question 1" }));
    expect(writeText).toHaveBeenLastCalledWith("What is the team size?");
  });
});

describe("CvSection", () => {
  const cv: TailoredCv = {
    professionalTitle: "Senior Frontend Engineer",
    summary: bi("Builder of fast UIs."),
    experienceHighlights: [{ company: "Acme", role: "Lead", bullets: [bi("Shipped dashboards")] }],
    achievementBullets: [bi("Reduced bundle size")],
    technicalSkills: [{ category: "Frontend", skills: ["React", "Next.js"] }],
    atsKeywords: ["React", "TypeScript"],
    missingSkillsToStudy: [{ skill: "Kafka", reason: bi("Event streaming in JD"), priority: "high" }],
    claimNotes: [bi("Do not claim Kafka production use")],
  };

  it("copies the full English CV as plain text", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<CvSection pkg={makeTestPackage()} data={cv} />);
    await user.click(screen.getByRole("button", { name: "Copy full CV (English)" }));
    const copied = writeText.mock.lastCall?.[0] ?? "";
    expect(copied).toContain("Senior Frontend Engineer");
    expect(copied).toContain("SUMMARY\nBuilder of fast UIs.");
    expect(copied).toContain("- Shipped dashboards");
    expect(copied).not.toContain("VI:");
    expect(copied).not.toContain("Kafka");
  });

  it("renders ATS keyword chips and missing skills", () => {
    render(<CvSection pkg={makeTestPackage()} data={cv} />);
    const chips = screen.getByRole("list", { name: "ATS keywords" });
    expect(within(chips).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Kafka")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
  });
});

describe("CommunicationSection", () => {
  const draft = (en: string, subject?: string) => ({ subject, body: bi(en) });
  const comms: CommunicationData = {
    applicationEmail: draft("Dear team, I am applying.", "Application — Senior FE"),
    linkedinMessage: draft("Hi! Interested in the role."),
    coverLetter: draft("Cover letter body."),
    followUpEmail: draft("Following up.", "Follow-up"),
  };

  it("copies the email with its subject and the LinkedIn body alone", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<CommunicationSection pkg={makeTestPackage()} data={comms} />);
    await user.click(screen.getByRole("button", { name: "Copy email (English)" }));
    expect(writeText).toHaveBeenLastCalledWith("Subject: Application — Senior FE\n\nDear team, I am applying.");
    await user.click(screen.getByRole("button", { name: "Copy message (English)" }));
    expect(writeText).toHaveBeenLastCalledWith("Hi! Interested in the role.");
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });
});

describe("InterviewerQuestionsSection", () => {
  const hr: InterviewerQuestions = {
    groups: [
      {
        category: "team-structure",
        title: bi("Team"),
        questions: [{ id: "q1", text: bi("How big is the team?"), why: bi("Scope of ownership") }],
      },
    ],
  };

  it("renders groups with why-ask notes and per-question copy", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<InterviewerQuestionsSection pkg={makeTestPackage()} data={hr} />);
    expect(screen.getByText("Team structure")).toBeInTheDocument();
    expect(screen.getByText("Scope of ownership")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy question 1" }));
    expect(writeText).toHaveBeenLastCalledWith("How big is the team?");
  });
});

describe("PracticeProjectSection", () => {
  const project: PracticeProject = {
    name: "Realtime board",
    objective: bi("Practice websockets"),
    targetGaps: ["WebSocket"],
    techStack: [{ name: "Next.js", reason: bi("Matches JD") }],
    architectureDiagram: { kind: "flowchart", code: "flowchart LR\n A-->B" },
    features: [
      { id: "f1", title: bi("Nice to have"), priority: "low" },
      { id: "f2", title: bi("Live updates"), priority: "critical" },
    ],
    implementationChecklist: [
      { id: "c1", text: bi("Scaffold app") },
      { id: "c2", text: bi("Add socket server") },
    ],
    testingRequirements: [bi("Unit tests")],
    performanceRequirements: [bi("60fps")],
    learningOutcomes: [bi("Explain reconnection")],
  };

  beforeEach(() => {
    useProgressStore.setState({ byPackage: {} });
  });

  it("persists checklist items to the progress store and updates the progress bar", async () => {
    const user = userEvent.setup();
    render(<PracticeProjectSection pkg={makeTestPackage()} data={project} />);
    expect(screen.getByText("0 of 2 steps done")).toBeInTheDocument();

    const box = screen.getByRole("checkbox", { name: /Scaffold app/ });
    await user.click(box);
    expect(useProgressStore.getState().byPackage["test-co"]?.projectChecklist).toEqual(["c1"]);
    expect(screen.getByRole("checkbox", { name: /Scaffold app/ })).toBeChecked();
    expect(screen.getByText("1 of 2 steps done")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");

    // Clicking the label toggles too.
    await user.click(screen.getByText("Scaffold app"));
    expect(useProgressStore.getState().byPackage["test-co"]?.projectChecklist).toEqual([]);
  });

  it("orders features by priority", () => {
    render(<PracticeProjectSection pkg={makeTestPackage()} data={project} />);
    const live = screen.getByText("Live updates");
    const nice = screen.getByText("Nice to have");
    expect(live.compareDocumentPosition(nice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("AssessmentSection", () => {
  const assessment: FinalAssessment = {
    overallMatch: bi("Good fit"),
    sellingPoints: [bi("React depth")],
    knowledgeGaps: [{ gap: bi("Kafka"), priority: "high" }],
    interviewPriorities: [bi("System design")],
    recommendation: { decision: "apply-after-prep", rationale: bi("Close the Kafka gap first") },
    verificationNotes: [],
    unsupportedClaims: [bi("10x performance claim")],
  };

  it("renders the decision, gaps and unsupported claims, plus the computed match estimate", () => {
    const pkg = makeTestPackage({
      match: {
        summary: bi("s"),
        scoringNotes: bi("n"),
        requirements: [
          {
            id: "r1",
            requirement: bi("React"),
            category: "required",
            weight: 2,
            candidateExperience: bi("x"),
            matchLevel: "relevant",
            evidence: [],
          },
        ],
      },
    });
    render(<AssessmentSection pkg={pkg} data={assessment} />);
    expect(screen.getByText("Apply after preparation")).toBeInTheDocument();
    expect(screen.getByText("10x performance claim")).toBeInTheDocument();
    expect(screen.getByText("No verification notes.")).toBeInTheDocument();
    expect(screen.getByText("75/100")).toBeInTheDocument();
    expect(screen.getByText(/Internal estimate/)).toBeInTheDocument();
  });
});

describe("ISB sample smoke test", () => {
  // Renders whichever of this module's sections the curated sample currently contains.
  it.each(["jd", "company", "match", "cv", "intro", "email", "hr", "project", "assessment"] as const)(
    "renders %s without crashing",
    async (key) => {
      const { isbSamplePackage } = await import("@/content/samples/isb");
      const { SECTION_COMPONENTS } = await import("@/features/package-view/section-registry");
      const data = isbSamplePackage.sections[key];
      if (!data) return;
      const Comp = SECTION_COMPONENTS[key] as React.ComponentType<{ pkg: typeof isbSamplePackage; data: typeof data }>;
      const { container } = render(<Comp pkg={isbSamplePackage} data={data} />);
      expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
    },
  );
});
