import type { Bilingual, Priority } from "@/domain/common/schema";
import type { NormalizedJd } from "@/domain/jd/schema";

/** Keyword library used by the offline mock provider to derive deterministic content from a JD. */

export interface MockTopicDef {
  id: string;
  code: string;
  title: Bilingual;
  keywords: string[];
  focus: string[];
}

export const MOCK_TOPIC_LIBRARY: MockTopicDef[] = [
  {
    id: "javascript",
    code: "JS",
    title: { en: "JavaScript fundamentals", vi: "Nền tảng JavaScript" },
    keywords: ["javascript", "es6", "ecmascript", "js"],
    focus: ["event loop", "closures", "async/await", "prototypes"],
  },
  {
    id: "typescript",
    code: "TS",
    title: { en: "TypeScript", vi: "TypeScript" },
    keywords: ["typescript", "ts"],
    focus: ["generics", "type narrowing", "utility types", "strict mode"],
  },
  {
    id: "react",
    code: "REACT",
    title: { en: "React", vi: "React" },
    keywords: ["react", "hooks", "jsx", "redux"],
    focus: ["rendering", "hooks", "reconciliation", "memoization"],
  },
  {
    id: "nextjs",
    code: "NEXTJS",
    title: { en: "Next.js", vi: "Next.js" },
    keywords: ["next.js", "nextjs", "ssr", "server components"],
    focus: ["App Router", "server components", "caching", "streaming"],
  },
  {
    id: "vue",
    code: "VUE",
    title: { en: "Vue.js", vi: "Vue.js" },
    keywords: ["vue", "nuxt"],
    focus: ["reactivity", "composition API", "Pinia"],
  },
  {
    id: "html-css",
    code: "HTML_CSS",
    title: { en: "HTML & CSS internals", vi: "Nội tại HTML & CSS" },
    keywords: ["html", "css", "tailwind", "sass", "responsive"],
    focus: ["layout", "specificity", "accessibility", "responsive design"],
  },
  {
    id: "browser",
    code: "BROWSER",
    title: { en: "Browser internals", vi: "Cơ chế trình duyệt" },
    keywords: ["browser", "dom", "rendering"],
    focus: ["critical rendering path", "layout and paint", "memory"],
  },
  {
    id: "performance",
    code: "PERFORMANCE",
    title: { en: "Web performance", vi: "Hiệu năng web" },
    keywords: ["performance", "optimization", "core web vitals", "lighthouse", "high-performance"],
    focus: ["Core Web Vitals", "bundle size", "virtualization", "profiling"],
  },
  {
    id: "state",
    code: "STATE",
    title: { en: "State management", vi: "Quản lý state" },
    keywords: ["redux", "zustand", "mobx", "state management", "pinia"],
    focus: ["server vs client state", "normalization", "selectors"],
  },
  {
    id: "data-fetching",
    code: "DATA_FETCHING",
    title: { en: "Data fetching & APIs", vi: "Data fetching & API" },
    keywords: ["graphql", "rest", "api", "tanstack", "react query", "apollo"],
    focus: ["caching", "invalidation", "pagination", "error handling"],
  },
  {
    id: "realtime",
    code: "REALTIME",
    title: { en: "Real-time communication", vi: "Giao tiếp thời gian thực" },
    keywords: ["websocket", "real-time", "realtime", "socket.io", "sse", "server-sent events", "streaming"],
    focus: ["WebSocket", "SSE", "reconnection", "backpressure"],
  },
  {
    id: "fe-architecture",
    code: "FE_ARCHITECTURE",
    title: { en: "Frontend architecture", vi: "Kiến trúc frontend" },
    keywords: ["architecture", "monorepo", "microfrontend", "micro-frontend", "design system", "scalable"],
    focus: ["module boundaries", "monorepo", "microfrontend", "design systems"],
  },
  {
    id: "backend",
    code: "BACKEND",
    title: { en: "Backend & microservices", vi: "Backend & microservices" },
    keywords: ["node", "node.js", "nestjs", "express", "microservices", "go", "golang", "python", "java", "backend"],
    focus: ["API design", "service boundaries", "messaging"],
  },
  {
    id: "security",
    code: "SECURITY",
    title: { en: "Web security", vi: "Bảo mật web" },
    keywords: ["security", "oauth", "authentication", "xss", "csrf", "owasp"],
    focus: ["XSS", "CSRF", "auth flows", "CSP"],
  },
  {
    id: "database",
    code: "DATABASE",
    title: { en: "Databases", vi: "Cơ sở dữ liệu" },
    keywords: ["sql", "postgresql", "postgres", "mysql", "mongodb", "redis", "database"],
    focus: ["indexing", "transactions", "caching"],
  },
  {
    id: "testing",
    code: "TESTING",
    title: { en: "Testing", vi: "Kiểm thử" },
    keywords: ["testing", "jest", "vitest", "playwright", "cypress", "unit test", "e2e", "tdd"],
    focus: ["test pyramid", "mocking", "E2E strategy"],
  },
  {
    id: "cicd",
    code: "CICD",
    title: { en: "CI/CD & DevOps", vi: "CI/CD & DevOps" },
    keywords: ["ci/cd", "github actions", "docker", "kubernetes", "jenkins", "devops"],
    focus: ["pipelines", "containers", "release strategy"],
  },
  {
    id: "cloud",
    code: "CLOUD",
    title: { en: "Cloud", vi: "Cloud" },
    keywords: ["aws", "gcp", "azure", "cloud", "serverless"],
    focus: ["CDN", "serverless", "observability"],
  },
];

/** Baseline topics used when the JD mentions too few keywords. */
const BASELINE_TOPIC_IDS = [
  "javascript",
  "typescript",
  "react",
  "performance",
  "fe-architecture",
  "testing",
  "security",
  "data-fetching",
];

export const MOCK_SKILL_KEYWORDS = [
  "React",
  "TypeScript",
  "JavaScript",
  "Next.js",
  "Vue",
  "Angular",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Redux",
  "Zustand",
  "TanStack Query",
  "GraphQL",
  "REST",
  "WebSocket",
  "Node.js",
  "NestJS",
  "Express",
  "Python",
  "Go",
  "Java",
  "Rust",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "Azure",
  "Jest",
  "Vitest",
  "Playwright",
  "Cypress",
  "CI/CD",
  "Microservices",
  "Microfrontend",
  "Monorepo",
  "Webpack",
  "Vite",
  "Accessibility",
  "Performance",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMatches(text: string, keyword: string): number {
  const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(keyword.toLowerCase())}(?![a-z0-9])`, "g");
  return text.match(pattern)?.length ?? 0;
}

export function jdHaystack(jd: NormalizedJd): string {
  return [jd.jobTitle, jd.text, ...jd.sections.flatMap((s) => [s.heading, ...s.items])].join("\n").toLowerCase();
}

/** Skills mentioned in the JD, in library order (deterministic). */
export function detectSkills(jd: NormalizedJd): string[] {
  const text = jdHaystack(jd);
  return MOCK_SKILL_KEYWORDS.filter((k) => countMatches(text, k) > 0);
}

export interface ScoredTopic extends MockTopicDef {
  hits: number;
  priority: Priority;
}

/** Picks 8 topics ranked by JD keyword hits, padded with a baseline set. */
export function pickTopics(jd: NormalizedJd, count = 8): ScoredTopic[] {
  const text = jdHaystack(jd);
  const scored = MOCK_TOPIC_LIBRARY.map((t, index) => ({
    ...t,
    index,
    hits: t.keywords.reduce((sum, k) => sum + countMatches(text, k), 0),
  }));
  const ranked = scored.filter((t) => t.hits > 0).sort((a, b) => b.hits - a.hits || a.index - b.index);
  for (const id of BASELINE_TOPIC_IDS) {
    if (ranked.length >= count) break;
    const topic = scored.find((t) => t.id === id);
    if (topic && !ranked.includes(topic)) ranked.push(topic);
  }
  return ranked.slice(0, count).map(({ index, ...t }) => {
    void index;
    const priority: Priority = t.hits >= 3 ? "critical" : t.hits >= 1 ? "high" : "medium";
    return { ...t, priority };
  });
}
