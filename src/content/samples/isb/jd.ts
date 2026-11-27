import type { JdAnalysis } from "@/domain/package/schema";

/**
 * Section 1 — Job Description Analysis (ISB Vietnam, Senior Front-End Developer).
 *
 * Research log (checked 2026-11-27):
 * - The JD text was read from LinkedIn's public guest endpoint for job 4492566584
 *   (the canonical /jobs/view/ URL returns a sign-in wall / 404 to anonymous clients).
 * - A near-identical copy was read on Joboko (vn.joboko.com), which adds the office address,
 *   "4–10 years" experience, negotiable salary and a 26/12/2026 deadline.
 * - Anything not stated in those two pages is marked "unverified" or "assumption".
 */

const LINKEDIN_GUEST = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4492566584";
const LINKEDIN_VIEW = "https://www.linkedin.com/jobs/view/4492566584/";
const JOBOKO = "https://vn.joboko.com/viec-lam-senior-frontend-dev-english-xvi6755251";
const TOPDEV = "https://topdev.vn/companies/isb-vietnam-84189";

export const isbJd: JdAnalysis = {
  jobTitle: {
    text: {
      en: "Senior Front-End Developer (TypeScript / React - Python)",
      vi: "Senior Front-End Developer (TypeScript / React - Python)",
    },
    status: "verified",
    sourceUrl: LINKEDIN_GUEST,
    note: 'Exact LinkedIn title. The same role is listed on Joboko as "Senior Frontend Dev English".',
  },
  company: {
    text: {
      en: "ISB Vietnam Company (IVC) — ISB VIETNAM CO., LTD, a Japanese-invested offshore software development company in Ho Chi Minh City",
      vi: "ISB Vietnam Company (IVC) — ISB VIETNAM CO., LTD, công ty phát triển phần mềm offshore vốn Nhật tại TP. Hồ Chí Minh",
    },
    status: "verified",
    sourceUrl: LINKEDIN_GUEST,
    note: "Poster name from LinkedIn; legal name and ownership from https://isb-vietnam.com.vn/company/.",
  },
  location: {
    text: {
      en: "Ho Chi Minh City, Vietnam — office at E-town 2 Building, 364 Cong Hoa St., Tan Binh",
      vi: "TP. Hồ Chí Minh — văn phòng tại toà nhà E-town 2, 364 Cộng Hoà, Tân Bình",
    },
    status: "verified",
    sourceUrl: JOBOKO,
    note: "City verified on LinkedIn; street address on Joboko and the company site.",
  },
  workingArrangement: {
    text: {
      en: "Not stated in the JD. Full-time; likely on-site at the Tan Binh office (company pages list office hours Mon–Fri 08:00–17:00). Hybrid is NOT confirmed.",
      vi: "JD không ghi rõ. Full-time; nhiều khả năng làm onsite tại văn phòng Tân Bình (trang công ty ghi giờ làm Thứ 2–Thứ 6, 08:00–17:00). Chưa xác nhận có hybrid.",
    },
    status: "assumption",
    sourceUrl: TOPDEV,
    note: "Full-time is verified (LinkedIn employment type). On-site vs hybrid must be confirmed with the recruiter — the candidate prefers hybrid.",
  },
  seniority: {
    text: {
      en: "Senior individual contributor who leads front-end development (LinkedIn level: Mid-Senior; Joboko: 4–10 years of experience)",
      vi: "Senior IC dẫn dắt phần front-end (LinkedIn: Mid-Senior level; Joboko: 4–10 năm kinh nghiệm)",
    },
    status: "verified",
    sourceUrl: LINKEDIN_GUEST,
    note: '"Lead the front-end development" is in the role overview; whether that includes people management is not stated.',
  },
  responsibilities: [
    {
      text: {
        en: "Design and build highly responsive, intuitive UIs for a cloud-native trade capture and analytics platform that visualizes complex financial data in real time.",
        vi: "Thiết kế và xây dựng UI phản hồi nhanh, trực quan cho một nền tảng trade capture và analytics cloud-native, hiển thị dữ liệu tài chính phức tạp theo thời gian thực.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Architect and build high-performance web apps with TypeScript and React for trading analytics, execution workflows and customer web portals.",
        vi: "Thiết kế kiến trúc và xây dựng web app hiệu năng cao bằng TypeScript và React cho trading analytics, execution workflow và customer web portal.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Design and implement interactive, low-latency dashboards and charts that process and visualize complex, high-volume market data.",
        vi: "Thiết kế và hiện thực dashboard và chart tương tác, độ trễ thấp, xử lý và hiển thị market data khối lượng lớn.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Integrate UI components with REST APIs, WebSockets and Server-Sent Events (SSE) for live streaming data feeds.",
        vi: "Tích hợp UI component với REST API, WebSocket và Server-Sent Events (SSE) để nhận live streaming data feed.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Optimize browser rendering, state management and DOM manipulation to handle large datasets and high-frequency real-time updates smoothly.",
        vi: "Tối ưu browser rendering, state management và thao tác DOM để xử lý mượt dataset lớn và các cập nhật real-time tần suất cao.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Build modular, accessible, reusable component libraries to keep design consistent across multiple web applications.",
        vi: "Xây dựng component library dạng module, accessible, tái sử dụng được để giữ thiết kế nhất quán giữa nhiều web app.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Write unit, integration and E2E automated test suites (e.g. Jest, React Testing Library, Playwright, Cypress) to catch UI regressions early.",
        vi: "Viết bộ test tự động unit, integration và E2E (ví dụ Jest, React Testing Library, Playwright, Cypress) để bắt UI regression sớm.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Collaborate closely with Rust/Python backend engineers and product designers; craft clean, accessible UX that simplifies complex financial workflows for non-technical users and external portal customers.",
        vi: "Phối hợp chặt với backend engineer (Rust/Python) và product designer; tạo UX rõ ràng, accessible, đơn giản hoá workflow tài chính phức tạp cho người dùng không chuyên và khách hàng dùng portal.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
  ],
  requiredSkills: [
    {
      text: {
        en: "Strong mastery of TypeScript and the modern React ecosystem (React, Next.js, modern state management such as Zustand, Redux Toolkit or Jotai).",
        vi: "Thành thạo TypeScript và hệ sinh thái React hiện đại (React, Next.js, state management như Zustand, Redux Toolkit hoặc Jotai).",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Hands-on experience integrating front-ends with streaming data (WebSockets, SSE) and REST APIs powered by Rust/Python backends.",
        vi: "Kinh nghiệm thực tế tích hợp front-end với streaming data (WebSocket, SSE) và REST API từ backend Rust/Python.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Deep understanding of browser rendering mechanics, memory leak detection, virtualized lists/tables for large datasets, and web performance tooling.",
        vi: "Hiểu sâu cơ chế browser rendering, phát hiện memory leak, virtualized list/table cho dataset lớn và các công cụ đo web performance.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Proven experience setting up and maintaining automated UI test suites for critical user flows.",
        vi: "Có kinh nghiệm dựng và duy trì bộ test UI tự động cho các user flow quan trọng.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Comfortable working in Linux-based desktop and build environments.",
        vi: "Quen làm việc trên môi trường desktop và build dựa trên Linux.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: 'Working English for collaboration (the Joboko copy is titled "Senior Frontend Dev English"); the exact level expected and whether Japanese is useful are not stated.',
        vi: 'Tiếng Anh làm việc (bản trên Joboko có tên "Senior Frontend Dev English"); mức độ yêu cầu cụ thể và việc tiếng Nhật có lợi thế hay không thì chưa được nêu.',
      },
      status: "assumption",
      sourceUrl: JOBOKO,
    },
    {
      text: {
        en: 'Some Python ability — "Python" appears in the LinkedIn title, but the body only mentions Python as the backend. Whether the front-end engineer writes Python is unclear.',
        vi: 'Một mức Python nhất định — "Python" xuất hiện trong tiêu đề LinkedIn, nhưng nội dung JD chỉ nhắc Python như backend. Chưa rõ front-end engineer có phải viết Python hay không.',
      },
      status: "unverified",
      sourceUrl: LINKEDIN_GUEST,
      note: "Ask the recruiter.",
    },
  ],
  preferredSkills: [
    {
      text: {
        en: "Canvas/SVG charting libraries such as D3.js, Highcharts, Chart.js, Lightweight Charts or visx.",
        vi: "Thư viện chart canvas/SVG như D3.js, Highcharts, Chart.js, Lightweight Charts hoặc visx.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Familiarity with trading workflows, financial metrics, market data feeds or fintech UI/UX patterns.",
        vi: "Hiểu biết về trading workflow, chỉ số tài chính, market data feed hoặc pattern UI/UX của fintech.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Exposure to microservices or micro-frontend architectures for scaling large web applications.",
        vi: "Từng làm với kiến trúc microservices hoặc micro-frontend để scale web app lớn.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Server-state libraries such as TanStack Query — not named in the JD, but a natural fit for the REST side of the platform.",
        vi: "Thư viện server state như TanStack Query — JD không nhắc tên, nhưng hợp lý cho phần REST của nền tảng.",
      },
      status: "assumption",
      note: "Listed in the initial interview focus from the user brief; not present in the JD text.",
    },
  ],
  benefits: [
    {
      text: {
        en: "Competitive salary and benefits, including Premium Healthcare insurance",
        vi: "Lương cạnh tranh và phúc lợi, gồm bảo hiểm Premium Healthcare",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: { en: "13th-month salary and performance bonus", vi: "Lương tháng 13 và thưởng theo hiệu suất" },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: { en: "16 days of annual leave", vi: "16 ngày phép năm" },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Training courses (languages, technical, soft skills) and a language-certificate allowance (TOEIC, IELTS, Japanese)",
        vi: "Khoá đào tạo (ngoại ngữ, kỹ thuật, kỹ năng mềm) và phụ cấp chứng chỉ ngoại ngữ (TOEIC, IELTS, tiếng Nhật)",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: { en: "Lunch and bus/parking allowance", vi: "Phụ cấp ăn trưa và xe buýt/gửi xe" },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Team activities and outings, sponsored happy hour and sport clubs",
        vi: "Hoạt động team, du lịch, happy hour và câu lạc bộ thể thao được tài trợ",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
  ],
  keyExpectations: [
    {
      text: {
        en: "Own front-end architecture for data-heavy, real-time screens — not just build components to spec.",
        vi: "Chịu trách nhiệm kiến trúc front-end cho các màn hình real-time nặng dữ liệu — không chỉ code component theo spec.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
      note: 'Based on "lead the front-end development" and "Architect and build".',
    },
    {
      text: {
        en: "Keep the UI smooth under high-frequency streams: batching updates, avoiding unnecessary re-renders, virtualization and canvas charts for large datasets.",
        vi: "Giữ UI mượt khi stream tần suất cao: batching update, tránh re-render thừa, virtualization và chart dùng canvas cho dataset lớn.",
      },
      status: "assumption",
      note: 'React-level rendering optimization techniques are inferred from "optimize browser rendering performance, state management, and DOM manipulation".',
    },
    {
      text: {
        en: "Be able to find and fix memory leaks in long-running dashboard sessions (subscriptions, listeners, unbounded buffers).",
        vi: "Có khả năng tìm và sửa memory leak trong các phiên dashboard chạy lâu (subscription, listener, buffer không giới hạn).",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
      note: 'JD says "memory leak detection"; the concrete leak sources are the writer\'s examples.',
    },
    {
      text: {
        en: "Work fluently with Rust/Python backend engineers on API and streaming contracts (message schemas, reconnection, snapshots vs deltas).",
        vi: "Làm việc trơn tru với backend engineer Rust/Python về contract API và streaming (message schema, reconnect, snapshot vs delta).",
      },
      status: "assumption",
      note: "Collaboration is verified; the specific contract topics are inferred.",
    },
    {
      text: {
        en: "Treat automated testing as part of delivery — unit, integration and E2E around critical trading and portal flows.",
        vi: "Coi automated testing là một phần của delivery — unit, integration và E2E cho các flow trading và portal quan trọng.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Design for two audiences: internal power users (dense, fast trading screens) and external customers buying products through a web portal (clarity, accessibility).",
        vi: "Thiết kế cho hai nhóm người dùng: power user nội bộ (màn hình trading dày đặc, nhanh) và khách hàng bên ngoài mua sản phẩm qua web portal (rõ ràng, accessible).",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "The platform probably belongs to an overseas client served by IVC's offshore/dedicated-team model, not to IVC itself.",
        vi: "Nền tảng này có lẽ thuộc về một khách hàng nước ngoài mà IVC phục vụ theo mô hình offshore/dedicated team, không phải sản phẩm của chính IVC.",
      },
      status: "assumption",
      note: 'IVC describes itself as an offshore outsourcing company; the JD says "our platform" without naming a client. Confirm with the recruiter.',
    },
  ],
  inferredArchitecture: {
    summary: {
      en: "A cloud-native trade capture and analytics platform: Rust/Python services ingest market data and trades, then expose REST for queries and commands plus WebSocket/SSE for live streams. The React + TypeScript front-end has two faces — dense internal trading/analytics screens and an external customer portal — sharing a component library. On the client, a streaming layer (ideally off the main thread) normalizes and batches ticks into a store such as Zustand, while server data comes over REST; virtualized grids and canvas charts render large, fast-changing datasets.",
      vi: "Một nền tảng trade capture và analytics cloud-native: các service Rust/Python nhận market data và trade, rồi mở REST cho query/command cùng WebSocket/SSE cho live stream. Front-end React + TypeScript có hai mặt — các màn hình trading/analytics nội bộ dày đặc dữ liệu và một customer portal bên ngoài — dùng chung component library. Ở client, một streaming layer (lý tưởng là chạy ngoài main thread) chuẩn hoá và batching tick vào store như Zustand, còn dữ liệu server lấy qua REST; virtualized grid và chart canvas render dataset lớn, thay đổi liên tục.",
    },
    components: [
      {
        text: {
          en: "Rust services for latency-sensitive ingestion (market data, trade capture)",
          vi: "Service Rust cho phần ingest nhạy về độ trễ (market data, trade capture)",
        },
        status: "assumption",
        note: "JD only says the backend is Rust/Python; the split of responsibilities is inferred.",
      },
      {
        text: {
          en: "Python services for analytics, risk/metrics calculations and REST APIs",
          vi: "Service Python cho analytics, tính toán risk/metric và REST API",
        },
        status: "assumption",
      },
      {
        text: {
          en: "Streaming gateway exposing WebSocket (bi-directional) and SSE (one-way) channels",
          vi: "Streaming gateway cung cấp kênh WebSocket (hai chiều) và SSE (một chiều)",
        },
        status: "assumption",
        note: "WebSocket and SSE are verified JD requirements; a dedicated gateway is inferred.",
      },
      {
        text: {
          en: "Client streaming layer, possibly in a Web Worker: parse, normalize, coalesce and batch ticks per animation frame",
          vi: "Streaming layer phía client, có thể chạy trong Web Worker: parse, chuẩn hoá, gộp và batching tick theo animation frame",
        },
        status: "assumption",
      },
      {
        text: {
          en: "Client state: Zustand (or Redux Toolkit/Jotai) for live state, plus a server-state cache for REST data",
          vi: "Client state: Zustand (hoặc Redux Toolkit/Jotai) cho live state, kèm cache server state cho dữ liệu REST",
        },
        status: "assumption",
      },
      {
        text: {
          en: "Virtualized blotters/tables and canvas/SVG charts (e.g. Lightweight Charts, D3, Highcharts)",
          vi: "Blotter/table dạng virtualized và chart canvas/SVG (ví dụ Lightweight Charts, D3, Highcharts)",
        },
        status: "assumption",
      },
      {
        text: {
          en: "Shared accessible component library used by the trading app and the customer portal",
          vi: "Component library accessible dùng chung cho app trading và customer portal",
        },
        status: "assumption",
        note: "Component library is verified; sharing it across these two specific apps is inferred.",
      },
      {
        text: {
          en: "Automated test pipeline: Jest/RTL for units, Playwright/Cypress for E2E, running in Linux-based CI",
          vi: "Pipeline test tự động: Jest/RTL cho unit, Playwright/Cypress cho E2E, chạy trên CI nền Linux",
        },
        status: "assumption",
      },
    ],
    diagram: {
      kind: "architecture",
      code: `flowchart LR
  MD["Market data feeds"] --> RS["Rust ingestion services"]
  RS --> PY["Python analytics and REST APIs"]
  RS --> GW["Streaming gateway: WS and SSE"]
  PY --> GW
  PY --> REST["REST endpoints"]
  GW --> WK["Web Worker: parse, coalesce, batch"]
  WK --> ST["Live store - Zustand"]
  REST --> QC["Server-state cache"]
  ST --> GRID["Virtualized blotter and tables"]
  ST --> CH["Canvas charts"]
  QC --> PORTAL["Customer web portal"]
  QC --> GRID
  LIB["Shared component library"] --> PORTAL
  LIB --> GRID`,
      caption: {
        en: "Inferred architecture (assumption) — not confirmed by ISB Vietnam.",
        vi: "Kiến trúc suy luận (assumption) — chưa được ISB Vietnam xác nhận.",
      },
    },
  },
  sourceUrls: [LINKEDIN_VIEW, LINKEDIN_GUEST, JOBOKO, "https://isb-vietnam.com.vn/company/", TOPDEV],
  verification: {
    overallStatus: "verified",
    checkedAt: "2026-11-27",
    notes: [
      {
        en: "Checked 2026-11-27: the full JD text was read from LinkedIn's public guest endpoint for job 4492566584. Title, company, location, responsibilities, required/preferred skills, benefits, seniority (Mid-Senior) and employment type (Full-time) are verified from that page.",
        vi: "Kiểm tra ngày 2026-11-27: toàn bộ JD được đọc từ guest endpoint công khai của LinkedIn cho job 4492566584. Tiêu đề, công ty, địa điểm, trách nhiệm, kỹ năng bắt buộc/ưu tiên, phúc lợi, seniority (Mid-Senior) và loại hình (Full-time) đều đã được xác minh từ trang này.",
      },
      {
        en: 'IMPORTANT: on 2026-11-27 LinkedIn showed this posting as "No longer accepting applications" (posted about 6 days earlier). A near-identical copy on Joboko was still open with a deadline of 26/12/2026 — apply through that channel or the company careers page, or contact the recruiter directly.',
        vi: 'QUAN TRỌNG: ngày 2026-11-27 LinkedIn hiển thị tin này "No longer accepting applications" (đăng khoảng 6 ngày trước). Một bản gần như giống hệt trên Joboko vẫn còn mở, hạn nộp 26/12/2026 — nên nộp qua kênh đó hoặc trang careers của công ty, hoặc liên hệ trực tiếp recruiter.',
      },
      {
        en: 'Not stated anywhere we checked: working arrangement (on-site/hybrid), salary range (Joboko says "negotiable"), team size, end client and interview process. These are marked unverified/assumption.',
        vi: 'Chưa thấy ở bất kỳ nguồn nào đã kiểm tra: hình thức làm việc (onsite/hybrid), mức lương (Joboko ghi "thoả thuận"), quy mô team, khách hàng cuối và quy trình phỏng vấn. Các mục này được đánh dấu unverified/assumption.',
      },
      {
        en: "Compared with the initial interview focus: TanStack Query is not in the JD; React-specific re-render optimization is implied rather than stated; Linux, Next.js, accessible component libraries and micro-frontends ARE in the JD and were not in the initial list.",
        vi: "So với danh sách focus ban đầu: TanStack Query không có trong JD; tối ưu re-render riêng của React chỉ được ngụ ý chứ không nêu rõ; Linux, Next.js, component library accessible và micro-frontend CÓ trong JD nhưng không nằm trong danh sách ban đầu.",
      },
      {
        en: "The inferred architecture, the split between Rust and Python services and the end-client assumption are the writer's inferences — confirm them with the recruiter.",
        vi: "Kiến trúc suy luận, cách chia việc giữa service Rust và Python, và giả định về khách hàng cuối đều là suy luận của người viết — cần xác nhận với recruiter.",
      },
    ],
  },
};
