/**
 * Run #10 section registry. Order here is the canonical render/export order.
 * `code` is the bookmark suffix: BOOKMARK_[COMPANY]_[code].
 */
export const SECTION_KEYS = [
  "jd",
  "company",
  "match",
  "cv",
  "intro",
  "email",
  "bilingual",
  "systemDesign",
  "coding",
  "star",
  "hr",
  "project",
  "studyPlan",
  "cheatsheet",
  "mock",
  "assessment",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export interface SectionDefinition {
  key: SectionKey;
  number: number;
  code: string;
  title: { en: string; vi: string };
  /** Sections whose output this section depends on (for generation ordering). */
  dependsOn: SectionKey[];
}

export const SECTION_DEFINITIONS: Record<SectionKey, SectionDefinition> = {
  jd: {
    key: "jd",
    number: 1,
    code: "JD",
    title: { en: "Job Description Analysis", vi: "Phân tích mô tả công việc" },
    dependsOn: [],
  },
  company: {
    key: "company",
    number: 2,
    code: "COMPANY",
    title: { en: "Company Research", vi: "Nghiên cứu công ty" },
    dependsOn: ["jd"],
  },
  match: {
    key: "match",
    number: 3,
    code: "MATCH",
    title: { en: "Candidate Matching", vi: "Mức độ phù hợp" },
    dependsOn: ["jd"],
  },
  cv: {
    key: "cv",
    number: 4,
    code: "CV",
    title: { en: "Tailored CV", vi: "CV tùy chỉnh" },
    dependsOn: ["jd", "match"],
  },
  intro: {
    key: "intro",
    number: 5,
    code: "INTRO",
    title: { en: "Self-introduction", vi: "Giới thiệu bản thân" },
    dependsOn: ["jd", "match"],
  },
  email: {
    key: "email",
    number: 6,
    code: "EMAIL",
    title: { en: "Application Communication", vi: "Email & tin nhắn ứng tuyển" },
    dependsOn: ["jd", "match"],
  },
  bilingual: {
    key: "bilingual",
    number: 7,
    code: "BILINGUAL",
    title: { en: "Bilingual Technical Interview", vi: "Câu hỏi kỹ thuật song ngữ" },
    dependsOn: ["jd", "match"],
  },
  systemDesign: {
    key: "systemDesign",
    number: 8,
    code: "SYSTEM_DESIGN",
    title: { en: "System Design", vi: "Thiết kế hệ thống" },
    dependsOn: ["jd", "match"],
  },
  coding: {
    key: "coding",
    number: 9,
    code: "CODING",
    title: { en: "Coding and Algorithms", vi: "Lập trình & thuật toán" },
    dependsOn: ["jd"],
  },
  star: {
    key: "star",
    number: 10,
    code: "STAR",
    title: { en: "Behavioral Interview (STAR)", vi: "Phỏng vấn hành vi (STAR)" },
    dependsOn: ["jd", "match"],
  },
  hr: {
    key: "hr",
    number: 11,
    code: "HR",
    title: { en: "Questions for the Interviewer", vi: "Câu hỏi dành cho nhà tuyển dụng" },
    dependsOn: ["jd", "company"],
  },
  project: {
    key: "project",
    number: 12,
    code: "PROJECT",
    title: { en: "Practical Preparation Project", vi: "Dự án luyện tập thực hành" },
    dependsOn: ["match"],
  },
  studyPlan: {
    key: "studyPlan",
    number: 13,
    code: "STUDY_PLAN",
    title: { en: "Study Plan", vi: "Kế hoạch ôn tập" },
    dependsOn: ["bilingual", "systemDesign", "coding", "star"],
  },
  cheatsheet: {
    key: "cheatsheet",
    number: 14,
    code: "CHEATSHEET",
    title: { en: "Interview Cheat Sheet", vi: "Tóm tắt ôn nhanh" },
    dependsOn: ["bilingual"],
  },
  mock: {
    key: "mock",
    number: 15,
    code: "MOCK",
    title: { en: "Mock Interview", vi: "Phỏng vấn thử" },
    dependsOn: ["bilingual"],
  },
  assessment: {
    key: "assessment",
    number: 16,
    code: "ASSESSMENT",
    title: { en: "Final Assessment", vi: "Đánh giá tổng kết" },
    dependsOn: ["match", "bilingual"],
  },
};

export const SECTIONS: SectionDefinition[] = SECTION_KEYS.map((k) => SECTION_DEFINITIONS[k]);

export function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(value);
}
