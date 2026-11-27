import type { CommunicationSection } from "@/domain/package/schema";

/**
 * Section 6 — Application communication for ISB Vietnam, Senior Front-End Developer.
 * Only verified JD facts are referenced (trade capture and analytics platform, Rust/Python backends,
 * WebSockets/SSE, virtualized tables, automated testing). No invented ISB facts, no metrics.
 * Vietnamese versions are natural translations for the candidate's understanding.
 */
export const isbEmail: CommunicationSection = {
  applicationEmail: {
    subject: "Application: Senior Front-End Developer (TypeScript / React - Python) — [Your Name]",
    body: {
      en: `Dear ISB Vietnam Hiring Team,

I'm writing to apply for the Senior Front-End Developer (TypeScript / React - Python) position in Ho Chi Minh City.

I'm a senior software engineer with more than seven years of experience, focused on React and TypeScript front-end architecture. Two parts of my background match this role closely:

- Data-heavy enterprise UIs: at Persefoni, I built features with React, TypeScript, GraphQL and TanStack Query, including background prefetching and caching, inside a Vite + Turborepo monorepo. I also delivered WCAG accessibility work and automated tests.
- Real-time and integration work: at Ninja Van's TechLab, I built real-time features with Socket.IO and integrated REST APIs across microservices, working alongside Go services.

The role's focus on turning high-frequency data streams into fluid, accessible UIs, in close collaboration with Rust and Python backend engineers, is exactly the kind of problem I want to work on next. Trading is a new domain for me, and I have been studying market data, order books and streaming performance to prepare.

My CV is attached. I would welcome the chance to discuss how I can contribute to your team.

Best regards,
[Your Name]
[Phone] · [Email] · [LinkedIn URL]`,
      vi: `Kính gửi Bộ phận Tuyển dụng ISB Vietnam,

Tôi viết email này để ứng tuyển vị trí Senior Front-End Developer (TypeScript / React - Python) tại TP. Hồ Chí Minh.

Tôi là senior software engineer với hơn bảy năm kinh nghiệm, tập trung vào kiến trúc front-end với React và TypeScript. Có hai phần trong kinh nghiệm của tôi rất phù hợp với vị trí này:

- UI enterprise nhiều dữ liệu: ở Persefoni, tôi xây dựng tính năng với React, TypeScript, GraphQL và TanStack Query, bao gồm background prefetching và caching, trong monorepo Vite + Turborepo. Tôi cũng làm các cải thiện accessibility theo WCAG và viết automated test.
- Real-time và tích hợp hệ thống: ở TechLab của Ninja Van, tôi làm tính năng real-time với Socket.IO và tích hợp REST API trên hệ thống microservices, làm việc cùng các service Go.

Việc vị trí này tập trung biến các luồng dữ liệu high-frequency thành UI mượt mà, dễ tiếp cận, và phối hợp chặt với backend engineer Rust và Python, chính là loại bài toán tôi muốn theo đuổi tiếp theo. Trading là domain mới với tôi, và tôi đã tìm hiểu về market data, order book và hiệu năng streaming để chuẩn bị.

CV của tôi được đính kèm. Tôi rất mong có cơ hội trao đổi về cách tôi có thể đóng góp cho team.

Trân trọng,
[Tên của bạn]
[Số điện thoại] · [Email] · [LinkedIn URL]`,
    },
    notes: {
      en: 'On 2026-11-27 the LinkedIn posting showed "No longer accepting applications". The Joboko copy ("Senior Frontend Dev English") was still open, with a deadline of 26/12/2026 (verified on Joboko). Apply through Joboko or the ISB careers contact, and say which posting you saw. Write the email in English, since the Joboko title mentions English. Do not bring up hybrid work in the first email; the working arrangement is not stated in the JD (likely on-site, unverified), so confirm it with the recruiter later. Replace the bracketed placeholders.',
      vi: 'Ngày 2026-11-27, tin trên LinkedIn hiển thị "No longer accepting applications". Bản đăng trên Joboko ("Senior Frontend Dev English") vẫn còn mở, hạn nộp 26/12/2026 (đã xác minh trên Joboko). Hãy nộp qua Joboko hoặc kênh tuyển dụng của ISB, và nói rõ bạn thấy tin ở đâu. Viết email bằng tiếng Anh vì tiêu đề trên Joboko có ghi English. Đừng nhắc đến hybrid trong email đầu tiên; hình thức làm việc không được nêu trong JD (có thể là on-site, chưa xác minh), nên hãy hỏi recruiter ở bước sau. Thay các placeholder trong ngoặc vuông.',
    },
  },
  linkedinMessage: {
    body: {
      en: "Hi [Name], I saw ISB Vietnam's Senior Front-End Developer role. I'm a senior engineer with 7+ years in React/TypeScript, data-heavy UIs (TanStack Query) and real-time features (Socket.IO). Is the role still open? I'd love to apply. Thanks!",
      vi: "Chào [Tên], tôi thấy vị trí Senior Front-End Developer ở ISB Vietnam. Tôi là senior engineer với hơn 7 năm kinh nghiệm React/TypeScript, UI nhiều dữ liệu (TanStack Query) và tính năng real-time (Socket.IO). Vị trí này còn tuyển không ạ? Tôi rất muốn ứng tuyển. Cảm ơn bạn!",
    },
    notes: {
      en: "Under 300 characters so it fits a LinkedIn connection note. Asking whether the role is still open is deliberate, because the LinkedIn posting was closed on 2026-11-27 while the Joboko copy was still open.",
      vi: "Dưới 300 ký tự để vừa với lời nhắn khi gửi lời mời kết nối trên LinkedIn. Việc hỏi vị trí còn tuyển không là có chủ ý, vì tin trên LinkedIn đã đóng vào 2026-11-27 trong khi bản trên Joboko vẫn mở.",
    },
  },
  coverLetter: {
    subject: "Cover letter — Senior Front-End Developer (TypeScript / React - Python)",
    body: {
      en: `Dear Hiring Manager,

I'm applying for the Senior Front-End Developer role at ISB Vietnam. The chance to build interfaces for a cloud-native trade capture and analytics platform, where high-frequency data has to stay fast and readable, is the kind of front-end challenge I want to take on next.

Over more than seven years, I have focused on React and TypeScript front-end architecture. At Persefoni, I built enterprise features with React, GraphQL and TanStack Query, and spent much of my time on background prefetching and caching for data-heavy screens. I worked in a Vite and Turborepo monorepo, delivered WCAG accessibility work such as keyboard navigation and ARIA, and wrote automated tests as part of everyday development.

At Ninja Van's TechLab, I built real-time features with Socket.IO, integrated REST APIs across microservices, and owned a thermal printer flow that generated shipping labels with Labelary and ZPL. At NAB, I worked on Adobe Experience Manager in a regulated banking environment, supporting deployments and business stakeholders.

I haven't built trading systems before, and I won't pretend otherwise. I have been studying order books, market data feeds and streaming performance techniques such as batching, virtualization and worker offloading, and I learn new domains quickly by working closely with the engineers who know them.

Thank you for your time. I would be glad to talk further.

Sincerely,
[Your Name]`,
      vi: `Kính gửi Hiring Manager,

Tôi ứng tuyển vị trí Senior Front-End Developer tại ISB Vietnam. Cơ hội xây dựng giao diện cho một nền tảng trade capture và analytics cloud-native, nơi dữ liệu high-frequency phải luôn nhanh và dễ đọc, chính là thử thách front-end mà tôi muốn theo đuổi tiếp theo.

Trong hơn bảy năm, tôi tập trung vào kiến trúc front-end với React và TypeScript. Ở Persefoni, tôi xây dựng tính năng enterprise với React, GraphQL và TanStack Query, và dành nhiều thời gian cho background prefetching và caching cho các màn hình nhiều dữ liệu. Tôi làm việc trong monorepo Vite và Turborepo, thực hiện các cải thiện accessibility theo WCAG như keyboard navigation và ARIA, và viết automated test như một phần của công việc hằng ngày.

Ở TechLab của Ninja Van, tôi làm tính năng real-time với Socket.IO, tích hợp REST API trên microservices, và chịu trách nhiệm luồng in nhiệt tạo nhãn vận chuyển bằng Labelary và ZPL. Ở NAB, tôi làm với Adobe Experience Manager trong môi trường ngân hàng có quy định chặt, hỗ trợ deployment và các stakeholder phía business.

Tôi chưa từng xây dựng hệ thống trading và sẽ không nói khác đi. Tôi đã tìm hiểu về order book, market data feed và các kỹ thuật hiệu năng streaming như batching, virtualization và offload sang worker, và tôi học domain mới nhanh bằng cách làm việc sát với những engineer am hiểu domain đó.

Cảm ơn anh/chị đã dành thời gian. Tôi rất mong được trao đổi thêm.

Trân trọng,
[Tên của bạn]`,
    },
    notes: {
      en: "About 230 words. Every company fact used here (cloud-native trade capture and analytics platform, high-frequency data) comes from the verified JD. Keep the honest trading-gap paragraph: it builds trust and preempts the obvious interview question.",
      vi: "Khoảng 230 từ. Mọi thông tin về công ty dùng ở đây (nền tảng trade capture và analytics cloud-native, dữ liệu high-frequency) đều lấy từ JD đã xác minh. Giữ đoạn thừa nhận gap về trading: nó tạo sự tin tưởng và trả lời trước câu hỏi chắc chắn sẽ có trong phỏng vấn.",
    },
  },
  followUpEmail: {
    subject: "Following up: Senior Front-End Developer application — [Your Name]",
    body: {
      en: `Dear [Recruiter Name],

I hope you're well. I applied for the Senior Front-End Developer (TypeScript / React - Python) role on [date] and wanted to check in on the status of my application.

I'm still very interested in the role, especially the work on real-time dashboards and high-frequency data alongside Rust and Python backend engineers. My background in React, TypeScript, TanStack Query and Socket.IO real-time features fits that work well, and I'm happy to share more detail or code samples if useful.

Could you also let me know the next steps in the process and whether the role is on-site or hybrid?

Thank you for your time.

Best regards,
[Your Name]
[Phone] · [LinkedIn URL]`,
      vi: `Kính gửi [Tên recruiter],

Chúc anh/chị một ngày tốt lành. Tôi đã ứng tuyển vị trí Senior Front-End Developer (TypeScript / React - Python) vào [ngày] và muốn hỏi thăm tình trạng hồ sơ của mình.

Tôi vẫn rất quan tâm đến vị trí này, đặc biệt là công việc với dashboard real-time và dữ liệu high-frequency cùng các backend engineer Rust và Python. Kinh nghiệm của tôi với React, TypeScript, TanStack Query và các tính năng real-time bằng Socket.IO khá phù hợp với công việc đó, và tôi sẵn sàng chia sẻ thêm chi tiết hoặc code mẫu nếu cần.

Anh/chị có thể cho tôi biết các bước tiếp theo trong quy trình, và vị trí này làm on-site hay hybrid không ạ?

Cảm ơn anh/chị đã dành thời gian.

Trân trọng,
[Tên của bạn]
[Số điện thoại] · [LinkedIn URL]`,
    },
    notes: {
      en: "Send 5–7 working days after applying if you have no reply. After an interview, adapt it into a thank-you note within 24 hours: thank the interviewers by name and mention one specific topic you discussed. Asking about on-site vs hybrid here is reasonable, because the arrangement is unverified and your preference is hybrid.",
      vi: "Gửi sau 5–7 ngày làm việc kể từ khi nộp nếu chưa có phản hồi. Sau buổi phỏng vấn, chỉnh lại thành thư cảm ơn trong vòng 24 giờ: cảm ơn interviewer theo tên và nhắc lại một chủ đề cụ thể đã trao đổi. Hỏi về on-site hay hybrid ở bước này là hợp lý, vì hình thức làm việc chưa được xác minh và bạn ưu tiên hybrid.",
    },
  },
};
