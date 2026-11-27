import type { InterviewTopic } from "@/domain/package/schema";

/**
 * Fixed topic plan for the ISB sample (Section 7 questions 1–50).
 * Questions 51–55 live in Section 9 (coding) and 56–61 in Section 10 (STAR).
 */
export const isbTopics: InterviewTopic[] = [
  {
    id: "realtime",
    code: "WEBSOCKET",
    range: "1–7",
    priority: "critical",
    title: { en: "Real-time communication", vi: "Giao tiếp thời gian thực" },
  },
  {
    id: "react-performance",
    code: "REACT",
    range: "8–18",
    priority: "critical",
    title: { en: "React and browser performance", vi: "Hiệu năng React và trình duyệt" },
  },
  {
    id: "js-ts",
    code: "JS_TS",
    range: "19–25",
    priority: "high",
    title: { en: "JavaScript and TypeScript", vi: "JavaScript và TypeScript" },
  },
  {
    id: "state-nextjs",
    code: "STATE",
    range: "26–30",
    priority: "high",
    title: { en: "State management and Next.js", vi: "Quản lý state và Next.js" },
  },
  {
    id: "finance-viz",
    code: "TRADING",
    range: "31–36",
    priority: "high",
    title: {
      en: "Financial visualization and trading fundamentals",
      vi: "Trực quan hoá dữ liệu tài chính và kiến thức giao dịch",
    },
  },
  {
    id: "fe-system-design",
    code: "FE_ARCHITECTURE",
    range: "37–44",
    priority: "high",
    title: { en: "Frontend system design", vi: "Thiết kế hệ thống frontend" },
  },
  {
    id: "testing-python-linux",
    code: "TESTING",
    range: "45–50",
    priority: "medium",
    title: { en: "Testing, Python and Linux", vi: "Kiểm thử, Python và Linux" },
  },
];
