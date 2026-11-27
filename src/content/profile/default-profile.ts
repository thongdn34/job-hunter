import type { CandidateProfile, SkillCategory, TechnicalSkill } from "@/domain/profile/schema";

/**
 * Initial, editable candidate profile. Seeded into the database on first run.
 * Facts here come ONLY from the candidate's brief — no invented dates, metrics or roles.
 * Unknown fields (exact periods, role titles per company) are left empty for the user to fill in.
 */
const skills = (category: SkillCategory, names: string[]): TechnicalSkill[] =>
  names.map((name) => ({ name, category, proficiency: "production" }));

export const defaultProfile: CandidateProfile = {
  fullName: "",
  headline: "Senior Software Engineer",
  yearsOfExperience: 7,
  location: "Ho Chi Minh City, Vietnam",
  targetRoles: ["Senior Frontend Engineer", "Senior Full-stack JavaScript Engineer"],
  workingArrangement: "hybrid",
  summary:
    "Senior Software Engineer with 7+ years of software development experience across enterprise frontend platforms, logistics applications and banking content platforms. Strongest in React, TypeScript and modern frontend architecture, with full-stack experience in Node.js and Go.",
  skills: [
    ...skills("frontend", [
      "React",
      "Next.js",
      "Vue.js",
      "TypeScript",
      "JavaScript",
      "HTML",
      "CSS",
      "Tailwind CSS",
      "TanStack Query",
      "Redux",
      "Zustand",
      "GraphQL",
      "Apollo Client",
    ]),
    ...skills("backend", [
      "Node.js",
      "NestJS",
      "Express.js",
      "Python",
      "FastAPI",
      "Go",
      "REST APIs",
      "Microservices",
      "Prisma",
      "TypeORM",
    ]),
    ...skills("database", ["PostgreSQL", "MongoDB", "Redis"]),
    ...skills("architecture", [
      "Monorepo",
      "Microfrontend",
      "BFF",
      "Microservices Architecture",
      "Event-driven Architecture",
    ]),
    ...skills("devops", ["Docker", "Kubernetes", "GitHub Actions", "AWS", "GCP", "Vite", "Webpack", "Turborepo"]),
    ...skills("testing", ["Jest", "React Testing Library", "Playwright", "Cypress"]),
  ],
  experiences: [
    {
      company: "Persefoni",
      role: "",
      period: "",
      summary: "Carbon accounting and climate management platform (enterprise SaaS).",
      highlights: [
        "Built enterprise frontend features with React, TypeScript, GraphQL and TanStack Query.",
        "Implemented background prefetching and caching strategies for data-heavy views.",
        "Worked in a monorepo architecture using Vite and Turborepo.",
        "Delivered WCAG accessibility improvements: keyboard navigation and ARIA semantics.",
        "Wrote automated tests as part of enterprise frontend development.",
      ],
      technologies: ["React", "TypeScript", "GraphQL", "TanStack Query", "Vite", "Turborepo"],
      includeInGeneration: true,
      order: 0,
    },
    {
      company: "Ninja Van — TechLab",
      role: "",
      period: "",
      summary: "Logistics applications.",
      highlights: [
        "Implemented real-time communication with Socket.IO.",
        "Integrated thermal printers for warehouse/logistics workflows.",
        "Generated shipping labels with Labelary and ZPL.",
        "Integrated REST APIs in a microservices environment.",
        "Gained hands-on experience with Go services.",
      ],
      technologies: ["Socket.IO", "ZPL", "Labelary", "REST APIs", "Microservices", "Go"],
      includeInGeneration: true,
      order: 1,
    },
    {
      company: "NAB",
      role: "",
      period: "",
      summary: "Enterprise banking environment working on Adobe Experience Manager (AEM).",
      highlights: [
        "Worked with AEM Assets / DAM, AEM Sites and AEM Forms.",
        "Operated within Author and Publish workflows.",
        "Handled asset integration.",
        "Supported deployments and worked with business stakeholders.",
      ],
      technologies: ["Adobe Experience Manager", "AEM Assets", "AEM Sites", "AEM Forms"],
      includeInGeneration: true,
      order: 2,
    },
  ],
};
