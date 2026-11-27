import type { MockConfig } from "@/domain/package/schema";

const pad = (n: number) => String(n).padStart(2, "0");

export const isbMock: MockConfig = {
  intro: {
    en: "You are interviewing for the Senior Front-End Developer role at ISB Vietnam. The interviewer asks one question at a time. Answer out loud first, then type your answer. The recommended answer stays hidden until you submit (or explicitly reveal it).",
    vi: "Bạn đang phỏng vấn vị trí Senior Front-End Developer tại ISB Vietnam. Người phỏng vấn hỏi từng câu một. Hãy trả lời thành tiếng trước, sau đó gõ câu trả lời. Đáp án gợi ý sẽ được ẩn cho đến khi bạn nộp bài (hoặc chủ động xem).",
  },
  // Priority-ordered pool: realtime + performance first, then the rest, then system design, coding and STAR.
  questionPool: [
    ...[1, 3, 4, 9, 13, 15, 2, 5, 6, 8, 10, 11, 12, 14, 16, 17, 18, 7].map((n) => `isb-q${pad(n)}`),
    ...Array.from({ length: 32 }, (_, i) => `isb-q${pad(i + 19)}`),
    "isb-sd1",
    "isb-sd2",
    "isb-sd3",
    "isb-sd4",
    ...[51, 52, 53, 54, 55].map((n) => `isb-q${n}`),
    ...[56, 57, 58, 59, 60, 61].map((n) => `isb-q${n}`),
  ],
  rubric: [
    {
      criterion: "technicalAccuracy",
      description: {
        en: "Correct concepts, APIs and terminology; no factual errors.",
        vi: "Khái niệm, API và thuật ngữ chính xác; không sai kiến thức.",
      },
    },
    {
      criterion: "seniorJudgment",
      description: {
        en: "Discusses trade-offs, failure scenarios, scalability and maintainability.",
        vi: "Phân tích trade-off, tình huống lỗi, khả năng mở rộng và bảo trì.",
      },
    },
    {
      criterion: "communication",
      description: {
        en: "Structured, concise, easy to follow when spoken aloud.",
        vi: "Có cấu trúc, ngắn gọn, dễ theo dõi khi nói.",
      },
    },
    {
      criterion: "completeness",
      description: {
        en: "Covers the key points an interviewer expects, with a concrete example.",
        vi: "Bao quát các ý chính người phỏng vấn mong đợi, có ví dụ cụ thể.",
      },
    },
  ],
};
