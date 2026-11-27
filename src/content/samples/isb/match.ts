import type { MatchSection } from "@/domain/package/schema";

/**
 * Section 3 — Candidate Matching (ISB Vietnam, Senior Front-End Developer).
 *
 * Requirements come from the JD read on 2026-11-27 (LinkedIn guest endpoint + Joboko copy).
 * Items from the initial interview focus that the real JD does NOT state are still listed,
 * but their requirement text says "unverified requirement".
 *
 * Evidence rules: `kind: "actual"` only for experience in the candidate's brief
 * (Persefoni, Ninja Van — TechLab, NAB). Skills that are listed but not tied to a company
 * are never attributed to an employer. No metrics are invented.
 *
 * The score is computed by src/domain/match/score.ts from weight × level — never hand-written.
 */
export const isbMatch: MatchSection = {
  requirements: [
    /* ---------------------------------------------------------------- */
    /* Core: React / TypeScript and architecture                         */
    /* ---------------------------------------------------------------- */
    {
      id: "match-react-ts",
      requirement: {
        en: "Strong mastery of TypeScript and the modern React ecosystem (React, Next.js) — verified JD requirement.",
        vi: "Thành thạo TypeScript và hệ sinh thái React hiện đại (React, Next.js) — yêu cầu đã xác minh trong JD.",
      },
      category: "required",
      weight: 5,
      candidateExperience: {
        en: "Production React + TypeScript on an enterprise SaaS frontend at Persefoni (with GraphQL and TanStack Query). Next.js is on the skills list but is not tied to a specific employer in the profile.",
        vi: "Có kinh nghiệm production với React + TypeScript trên frontend enterprise SaaS tại Persefoni (kèm GraphQL và TanStack Query). Next.js có trong danh sách kỹ năng nhưng hồ sơ không gắn với công ty cụ thể nào.",
      },
      matchLevel: "strong",
      evidence: [
        {
          company: "Persefoni",
          kind: "actual",
          note: {
            en: "Built enterprise frontend features with React, TypeScript, GraphQL and TanStack Query.",
            vi: "Xây dựng tính năng frontend enterprise với React, TypeScript, GraphQL và TanStack Query.",
          },
        },
      ],
      knowledgeGap: {
        en: "Next.js App Router specifics (Server vs Client Components, streaming) are not evidenced in production.",
        vi: "Chi tiết Next.js App Router (Server vs Client Components, streaming) chưa có bằng chứng production.",
      },
      recommendedImprovement: {
        en: "Review Q28–Q29 and be ready to explain why a trading screen is usually a client-only island inside a Next.js app.",
        vi: "Ôn Q28–Q29 và chuẩn bị giải thích vì sao màn hình trading thường là client-only island trong app Next.js.",
      },
    },
    {
      id: "match-fe-architecture",
      requirement: {
        en: "Architect and lead front-end development of high-performance web apps for trading analytics, execution workflows and customer portals — verified JD responsibility.",
        vi: "Thiết kế kiến trúc và dẫn dắt phát triển frontend cho web app hiệu năng cao: trading analytics, execution workflow và customer portal — trách nhiệm đã xác minh trong JD.",
      },
      category: "required",
      weight: 4,
      candidateExperience: {
        en: "7+ years of software development. Enterprise frontend at Persefoni inside a Vite + Turborepo monorepo, with background prefetching and caching for data-heavy views. No trading-platform architecture experience.",
        vi: "Hơn 7 năm phát triển phần mềm. Frontend enterprise tại Persefoni trong monorepo Vite + Turborepo, có background prefetching và caching cho các màn hình nhiều dữ liệu. Chưa có kinh nghiệm thiết kế kiến trúc cho nền tảng trading.",
      },
      matchLevel: "relevant",
      evidence: [
        {
          company: "Persefoni",
          kind: "actual",
          note: {
            en: "Worked in a monorepo architecture with Vite and Turborepo on an enterprise frontend.",
            vi: "Làm việc trong kiến trúc monorepo với Vite và Turborepo trên frontend enterprise.",
          },
        },
        {
          kind: "recommended-approach",
          note: {
            en: "Real-time trading dashboard architecture (data layer, workers, virtualized grids, canvas charts) is prepared as a recommended approach in Section 8.",
            vi: "Kiến trúc dashboard trading real-time (data layer, worker, grid virtualization, chart canvas) được chuẩn bị như một recommended approach ở Section 8.",
          },
        },
      ],
      knowledgeGap: {
        en: "Has not architected a low-latency, high-frequency trading UI end-to-end.",
        vi: "Chưa từng thiết kế end-to-end một UI trading low-latency, tần suất cao.",
      },
      recommendedImprovement: {
        en: "Practice the 5-minute overview (Q37) and the deep dives isb-sd1 and isb-sd2 out loud; anchor trade-offs in the Persefoni monorepo and caching work.",
        vi: "Luyện nói phần tổng quan 5 phút (Q37) và deep dive isb-sd1, isb-sd2; gắn các trade-off với kinh nghiệm monorepo và caching ở Persefoni.",
      },
    },

    /* ---------------------------------------------------------------- */
    /* Real-time and streaming                                           */
    /* ---------------------------------------------------------------- */
    {
      id: "match-websocket-sse",
      requirement: {
        en: "Hands-on real-time streaming with WebSockets and Server-Sent Events (SSE), plus REST integration — verified JD requirement.",
        vi: "Kinh nghiệm thực tế với streaming real-time qua WebSocket và Server-Sent Events (SSE), cùng tích hợp REST — yêu cầu đã xác minh trong JD.",
      },
      category: "required",
      weight: 5,
      candidateExperience: {
        en: "Implemented real-time communication with Socket.IO (WebSocket-based) and integrated REST APIs in logistics apps at Ninja Van — TechLab. No production SSE experience.",
        vi: "Đã triển khai giao tiếp real-time bằng Socket.IO (dựa trên WebSocket) và tích hợp REST API trong các ứng dụng logistics tại Ninja Van — TechLab. Chưa có kinh nghiệm SSE ở production.",
      },
      matchLevel: "relevant",
      evidence: [
        {
          company: "Ninja Van — TechLab",
          kind: "actual",
          note: {
            en: "Implemented Socket.IO real-time communication in logistics applications.",
            vi: "Triển khai giao tiếp real-time bằng Socket.IO trong ứng dụng logistics.",
          },
        },
        {
          company: "Ninja Van — TechLab",
          kind: "actual",
          note: {
            en: "Integrated REST APIs in a microservices environment.",
            vi: "Tích hợp REST API trong môi trường microservices.",
          },
        },
        {
          kind: "theoretical",
          note: {
            en: "SSE (EventSource, Last-Event-ID, auto-reconnect) is theoretical knowledge only.",
            vi: "SSE (EventSource, Last-Event-ID, auto-reconnect) mới chỉ là kiến thức lý thuyết.",
          },
        },
      ],
      knowledgeGap: {
        en: "Socket.IO hides reconnection and framing; raw WebSocket lifecycle, SSE semantics and protocol-level resync are not evidenced.",
        vi: "Socket.IO che đi phần reconnect và framing; vòng đời WebSocket thuần, ngữ nghĩa SSE và resync ở mức protocol chưa có bằng chứng.",
      },
      recommendedImprovement: {
        en: "Study Q1, Q2, Q4 and Q7. Build a tiny raw WebSocket + SSE demo (the Section 12 project) to speak from hands-on practice, and say clearly that the production experience was Socket.IO.",
        vi: "Học Q1, Q2, Q4, Q7. Làm demo nhỏ với WebSocket thuần + SSE (project ở Section 12) để có trải nghiệm thực hành, và nói rõ kinh nghiệm production là Socket.IO.",
      },
    },
    {
      id: "match-high-frequency",
      requirement: {
        en: "Turn high-frequency data streams into fluid UIs (batching, conflation, backpressure, off-main-thread processing) — verified JD responsibility.",
        vi: "Biến các luồng dữ liệu tần suất cao thành UI mượt (batching, conflation, backpressure, xử lý ngoài main thread) — trách nhiệm đã xác minh trong JD.",
      },
      category: "required",
      weight: 5,
      candidateExperience: {
        en: "Real-time events at Ninja Van were logistics events, not market-data rates. High-frequency patterns are theoretical knowledge.",
        vi: "Sự kiện real-time ở Ninja Van là sự kiện logistics, không phải tốc độ market data. Các pattern cho dữ liệu tần suất cao mới là kiến thức lý thuyết.",
      },
      matchLevel: "partial",
      evidence: [
        {
          company: "Ninja Van — TechLab",
          kind: "actual",
          note: {
            en: "Socket.IO real-time communication — transferable event-handling foundation (no throughput claims).",
            vi: "Giao tiếp real-time bằng Socket.IO — nền tảng xử lý event có thể chuyển giao (không nêu số liệu throughput).",
          },
        },
        {
          kind: "recommended-approach",
          note: {
            en: "Buffer ticks, conflate by symbol, flush once per requestAnimationFrame, move parsing to a Web Worker.",
            vi: "Buffer tick, conflate theo symbol, flush mỗi requestAnimationFrame, chuyển parsing sang Web Worker.",
          },
        },
      ],
      knowledgeGap: {
        en: "No hands-on experience with thousands of updates per second, backpressure or worker-based stream processing.",
        vi: "Chưa có kinh nghiệm thực tế với hàng nghìn update mỗi giây, backpressure hay xử lý stream bằng worker.",
      },
      recommendedImprovement: {
        en: "Top priority: Q3, Q5, Q6, Q18 and isb-sd2. Build the simulated tick feed in Section 12 and profile it in Chrome DevTools.",
        vi: "Ưu tiên cao nhất: Q3, Q5, Q6, Q18 và isb-sd2. Làm tick feed giả lập ở Section 12 và profile bằng Chrome DevTools.",
      },
    },

    /* ---------------------------------------------------------------- */
    /* Rendering, memory, virtualization                                 */
    /* ---------------------------------------------------------------- */
    {
      id: "match-rendering-perf",
      requirement: {
        en: "Deep understanding of browser rendering mechanics; optimize rendering, state management and DOM manipulation for large datasets; web performance tools — verified JD requirement. (React rendering optimization specifically is implied, not stated.)",
        vi: "Hiểu sâu cơ chế rendering của trình duyệt; tối ưu rendering, state management và thao tác DOM cho dữ liệu lớn; dùng công cụ đo hiệu năng web — yêu cầu đã xác minh trong JD. (Riêng tối ưu React rendering là suy ra, JD không ghi trực tiếp.)",
      },
      category: "required",
      weight: 5,
      candidateExperience: {
        en: "Background prefetching and caching for data-heavy views at Persefoni is performance work at the data-fetching layer. Rendering-pipeline and React Profiler work at high update rates is not documented.",
        vi: "Background prefetching và caching cho màn hình nhiều dữ liệu ở Persefoni là tối ưu hiệu năng ở tầng data fetching. Kinh nghiệm tối ưu rendering pipeline và dùng React Profiler ở tần suất update cao chưa được ghi nhận.",
      },
      matchLevel: "partial",
      evidence: [
        {
          company: "Persefoni",
          kind: "actual",
          note: {
            en: "Implemented background prefetching and caching strategies with TanStack Query.",
            vi: "Triển khai chiến lược background prefetching và caching với TanStack Query.",
          },
        },
        {
          kind: "theoretical",
          note: {
            en: "Render vs commit, layout thrashing, compositor-only animation, INP and long tasks — theoretical preparation.",
            vi: "Render vs commit, layout thrashing, animation chỉ chạy trên compositor, INP và long task — chuẩn bị ở mức lý thuyết.",
          },
        },
      ],
      knowledgeGap: {
        en: "Can describe the pipeline but lacks rehearsed, concrete profiling walkthroughs for streaming UIs.",
        vi: "Có thể mô tả pipeline nhưng thiếu các ví dụ profiling cụ thể, đã luyện sẵn cho UI streaming.",
      },
      recommendedImprovement: {
        en: "Study Q8–Q12, Q16 and Q18; record one Performance-panel trace of the practice project and learn to narrate it.",
        vi: "Học Q8–Q12, Q16, Q18; ghi một trace trên Performance panel từ project luyện tập và tập diễn giải nó.",
      },
    },
    {
      id: "match-memory",
      requirement: {
        en: "Memory leak detection in long-running SPAs (heap snapshots, detached DOM, unbounded buffers) — verified JD requirement.",
        vi: "Phát hiện memory leak trong SPA chạy lâu (heap snapshot, detached DOM, buffer không giới hạn) — yêu cầu đã xác minh trong JD.",
      },
      category: "required",
      weight: 4,
      candidateExperience: {
        en: "Not documented in the profile. The candidate may have done this, but there is no evidence to cite yet.",
        vi: "Hồ sơ chưa ghi nhận. Ứng viên có thể đã làm, nhưng hiện chưa có bằng chứng để trích dẫn.",
      },
      matchLevel: "unverified",
      evidence: [
        {
          kind: "theoretical",
          note: {
            en: "Heap snapshot comparison, allocation timeline, cleanup of subscriptions and listeners — theoretical knowledge.",
            vi: "So sánh heap snapshot, allocation timeline, dọn subscription và listener — kiến thức lý thuyết.",
          },
        },
      ],
      knowledgeGap: {
        en: "No concrete leak-hunting story to tell in an interview.",
        vi: "Chưa có câu chuyện cụ thể về việc truy tìm memory leak để kể khi phỏng vấn.",
      },
      recommendedImprovement: {
        en: "Study Q15 and Q36. Deliberately introduce a leak in the practice project, then find it with three heap snapshots. If the candidate has a real story, add it to the profile first.",
        vi: "Học Q15 và Q36. Cố tình tạo leak trong project luyện tập rồi tìm bằng ba heap snapshot. Nếu ứng viên có câu chuyện thật, hãy bổ sung vào hồ sơ trước.",
      },
    },
    {
      id: "match-virtualization",
      requirement: {
        en: "Virtualized lists/tables for large datasets with live updates — verified JD requirement.",
        vi: "Virtualized list/table cho dữ liệu lớn có cập nhật live — yêu cầu đã xác minh trong JD.",
      },
      category: "required",
      weight: 4,
      candidateExperience: {
        en: "Enterprise data-heavy views at Persefoni, but windowing/virtualization is not documented in the profile.",
        vi: "Có làm màn hình enterprise nhiều dữ liệu ở Persefoni, nhưng hồ sơ không ghi nhận windowing/virtualization.",
      },
      matchLevel: "unverified",
      evidence: [
        {
          kind: "recommended-approach",
          note: {
            en: "TanStack Virtual or react-window with overscan, stable row keys, sticky headers and row-level subscriptions.",
            vi: "TanStack Virtual hoặc react-window với overscan, row key ổn định, sticky header và subscription theo từng row.",
          },
        },
      ],
      knowledgeGap: {
        en: "Variable row heights, scroll anchoring under inserts and per-row live updates are not practised.",
        vi: "Chưa luyện các tình huống row cao thấp khác nhau, giữ vị trí scroll khi chèn dòng và update live theo từng row.",
      },
      recommendedImprovement: {
        en: "Study Q13 and isb-sd3; build a 100k-row virtualized blotter in the practice project.",
        vi: "Học Q13 và isb-sd3; làm blotter virtualized 100k dòng trong project luyện tập.",
      },
    },

    /* ---------------------------------------------------------------- */
    /* State management                                                  */
    /* ---------------------------------------------------------------- */
    {
      id: "match-state-management",
      requirement: {
        en: "Client state management with Zustand / Redux Toolkit / Jotai for high-frequency updates — verified JD requirement (Zustand is one of three options).",
        vi: "Quản lý client state với Zustand / Redux Toolkit / Jotai cho update tần suất cao — yêu cầu đã xác minh trong JD (Zustand là một trong ba lựa chọn).",
      },
      category: "required",
      weight: 4,
      candidateExperience: {
        en: "Zustand and Redux are on the skills list; the profile does not tie them to a specific employer. Server-state experience with TanStack Query at Persefoni is actual.",
        vi: "Zustand và Redux có trong danh sách kỹ năng nhưng hồ sơ không gắn với công ty cụ thể. Kinh nghiệm server state với TanStack Query ở Persefoni là thực tế.",
      },
      matchLevel: "relevant",
      evidence: [
        {
          company: "Persefoni",
          kind: "actual",
          note: {
            en: "Server-state caching with TanStack Query in an enterprise React app.",
            vi: "Caching server state bằng TanStack Query trong app React enterprise.",
          },
        },
        {
          kind: "theoretical",
          note: {
            en: "Zustand narrow selectors and transient updates (subscribe without re-render) for tick data.",
            vi: "Selector hẹp và transient update của Zustand (subscribe mà không re-render) cho dữ liệu tick.",
          },
        },
      ],
      knowledgeGap: {
        en: "No documented use of Zustand/RTK under high-frequency load.",
        vi: "Chưa có ghi nhận dùng Zustand/RTK dưới tải update tần suất cao.",
      },
      recommendedImprovement: {
        en: "Study Q25–Q26; implement the live store in the practice project with Zustand selectors and a transient subscription.",
        vi: "Học Q25–Q26; xây live store trong project luyện tập bằng selector Zustand và transient subscription.",
      },
    },
    {
      id: "match-tanstack-query",
      requirement: {
        en: "TanStack Query for server state and merging stream updates into the cache — unverified requirement (from the initial focus; not mentioned in the real JD).",
        vi: "TanStack Query cho server state và merge update từ stream vào cache — yêu cầu chưa xác minh (từ focus ban đầu; JD thật không nhắc tới).",
      },
      category: "preferred",
      weight: 2,
      candidateExperience: {
        en: "Production TanStack Query at Persefoni, including background prefetching and caching.",
        vi: "Dùng TanStack Query ở production tại Persefoni, bao gồm background prefetching và caching.",
      },
      matchLevel: "strong",
      evidence: [
        {
          company: "Persefoni",
          kind: "actual",
          note: {
            en: "Background prefetching and caching with TanStack Query for data-heavy views.",
            vi: "Background prefetching và caching với TanStack Query cho màn hình nhiều dữ liệu.",
          },
        },
      ],
      recommendedImprovement: {
        en: "Use it as a bridge story (Q27, Q56), but do not assume the ISB team uses TanStack Query — ask.",
        vi: "Dùng làm câu chuyện bắc cầu (Q27, Q56), nhưng đừng mặc định team ISB dùng TanStack Query — hãy hỏi.",
      },
    },

    /* ---------------------------------------------------------------- */
    /* Charting, UI library, accessibility                               */
    /* ---------------------------------------------------------------- */
    {
      id: "match-financial-charting",
      requirement: {
        en: "Interactive, low-latency financial charts with Canvas/SVG libraries (D3.js, Highcharts, Chart.js, Lightweight Charts, visx) — verified responsibility; libraries are a preferred skill.",
        vi: "Chart tài chính tương tác, độ trễ thấp với thư viện Canvas/SVG (D3.js, Highcharts, Chart.js, Lightweight Charts, visx) — trách nhiệm đã xác minh; các thư viện là kỹ năng ưu tiên.",
      },
      category: "preferred",
      weight: 3,
      candidateExperience: {
        en: "No charting library or financial chart work in the profile.",
        vi: "Hồ sơ không có thư viện chart hay kinh nghiệm làm chart tài chính.",
      },
      matchLevel: "gap",
      evidence: [
        {
          kind: "theoretical",
          note: {
            en: "Canvas vs SVG trade-offs, OHLC aggregation and downsampling — theoretical preparation only.",
            vi: "Trade-off Canvas vs SVG, gộp OHLC và downsampling — chỉ chuẩn bị lý thuyết.",
          },
        },
      ],
      knowledgeGap: {
        en: "No hands-on experience with any of the listed charting libraries or real-time chart updates.",
        vi: "Chưa có kinh nghiệm thực tế với các thư viện chart được liệt kê hay chart cập nhật real-time.",
      },
      recommendedImprovement: {
        en: "Study Q14, Q32, Q34 and Q36; add a Lightweight Charts candlestick view fed by the simulated tick stream in the practice project.",
        vi: "Học Q14, Q32, Q34, Q36; thêm biểu đồ nến bằng Lightweight Charts lấy dữ liệu từ tick stream giả lập trong project luyện tập.",
      },
    },
    {
      id: "match-component-library",
      requirement: {
        en: "Build modular, accessible and reusable component libraries — verified JD responsibility.",
        vi: "Xây dựng thư viện component dạng module, accessible và tái sử dụng được — trách nhiệm đã xác minh trong JD.",
      },
      category: "required",
      weight: 4,
      candidateExperience: {
        en: "WCAG accessibility (keyboard navigation, ARIA) and a Vite + Turborepo monorepo at Persefoni. Owning a shared component library is not explicitly documented.",
        vi: "Accessibility theo WCAG (keyboard navigation, ARIA) và monorepo Vite + Turborepo tại Persefoni. Việc sở hữu một thư viện component dùng chung chưa được ghi nhận rõ.",
      },
      matchLevel: "relevant",
      evidence: [
        {
          company: "Persefoni",
          kind: "actual",
          note: {
            en: "Delivered WCAG accessibility improvements with keyboard navigation and ARIA semantics.",
            vi: "Thực hiện cải thiện accessibility theo WCAG với keyboard navigation và ARIA.",
          },
        },
        {
          company: "Persefoni",
          kind: "actual",
          note: {
            en: "Monorepo with Vite and Turborepo — the usual home for shared packages.",
            vi: "Monorepo với Vite và Turborepo — nơi thường đặt các package dùng chung.",
          },
        },
      ],
      knowledgeGap: {
        en: "Design-system concerns for dense financial UIs (density, tokens, versioning, grid accessibility) are not evidenced.",
        vi: "Các vấn đề design system cho UI tài chính dày đặc (density, token, versioning, accessibility cho grid) chưa có bằng chứng.",
      },
      recommendedImprovement: {
        en: "Study Q40 and isb-sd4; describe how you would package and version a component library in a Turborepo monorepo.",
        vi: "Học Q40 và isb-sd4; mô tả cách đóng gói và version thư viện component trong monorepo Turborepo.",
      },
    },
    {
      id: "match-accessibility-ux",
      requirement: {
        en: "Accessible, intuitive UX that simplifies financial workflows for non-technical users (customer web portal) — verified JD responsibility.",
        vi: "UX accessible, trực quan, đơn giản hoá workflow tài chính cho người dùng không chuyên (customer web portal) — trách nhiệm đã xác minh trong JD.",
      },
      category: "required",
      weight: 3,
      candidateExperience: {
        en: "WCAG, keyboard navigation and ARIA work at Persefoni on an enterprise platform used by business users.",
        vi: "Làm WCAG, keyboard navigation và ARIA tại Persefoni trên nền tảng enterprise cho người dùng nghiệp vụ.",
      },
      matchLevel: "strong",
      evidence: [
        {
          company: "Persefoni",
          kind: "actual",
          note: {
            en: "WCAG accessibility, keyboard navigation and ARIA semantics.",
            vi: "Accessibility theo WCAG, keyboard navigation và ARIA.",
          },
        },
      ],
      recommendedImprovement: {
        en: "Connect it to trading: keyboard-driven order entry, aria-live politeness for price updates, color + icon for up/down (Q35, Q40).",
        vi: "Liên hệ với trading: nhập lệnh bằng bàn phím, mức aria-live phù hợp cho cập nhật giá, kết hợp màu + icon cho tăng/giảm (Q35, Q40).",
      },
    },

    /* ---------------------------------------------------------------- */
    /* Testing                                                           */
    /* ---------------------------------------------------------------- */
    {
      id: "match-testing",
      requirement: {
        en: "Proven experience setting up and maintaining automated UI test suites — unit, integration, E2E (Jest, RTL, Playwright, Cypress) — verified JD requirement.",
        vi: "Có kinh nghiệm thiết lập và duy trì bộ test UI tự động — unit, integration, E2E (Jest, RTL, Playwright, Cypress) — yêu cầu đã xác minh trong JD.",
      },
      category: "required",
      weight: 4,
      candidateExperience: {
        en: "Automated testing as part of enterprise frontend work at Persefoni. Jest, RTL, Playwright and Cypress are on the skills list; which tools were used at which company is not documented.",
        vi: "Viết test tự động trong quá trình phát triển frontend enterprise tại Persefoni. Jest, RTL, Playwright, Cypress có trong danh sách kỹ năng; hồ sơ không ghi rõ công cụ nào dùng ở công ty nào.",
      },
      matchLevel: "relevant",
      evidence: [
        {
          company: "Persefoni",
          kind: "actual",
          note: {
            en: "Wrote automated tests as part of enterprise frontend development.",
            vi: "Viết test tự động trong quá trình phát triển frontend enterprise.",
          },
        },
      ],
      knowledgeGap: {
        en: "Testing streaming UIs (mock WebSocket servers, fake timers, Playwright WebSocket routing) is not evidenced; neither is setting up a suite from scratch.",
        vi: "Chưa có bằng chứng về test UI streaming (mock WebSocket server, fake timer, Playwright WebSocket routing) hay tự dựng bộ test từ đầu.",
      },
      recommendedImprovement: {
        en: "Study Q45–Q47; add Vitest + RTL tests and one Playwright test with a mocked WebSocket to the practice project.",
        vi: "Học Q45–Q47; thêm test Vitest + RTL và một test Playwright có mock WebSocket vào project luyện tập.",
      },
    },

    /* ---------------------------------------------------------------- */
    /* Backend integration                                               */
    /* ---------------------------------------------------------------- */
    {
      id: "match-python-backend",
      requirement: {
        en: 'Integrate REST APIs and streams from Python backend services — verified ("Python" is in the job title). Whether the front-end engineer also writes Python is unverified.',
        vi: 'Tích hợp REST API và stream từ backend Python — đã xác minh ("Python" có trong tiêu đề job). Việc kỹ sư frontend có phải viết Python hay không thì chưa xác minh.',
      },
      category: "required",
      weight: 3,
      candidateExperience: {
        en: "REST API integration in a microservices environment at Ninja Van (with Go services). Python and FastAPI are on the skills list, not tied to a specific employer.",
        vi: "Tích hợp REST API trong môi trường microservices tại Ninja Van (với các service Go). Python và FastAPI có trong danh sách kỹ năng, không gắn với công ty cụ thể.",
      },
      matchLevel: "relevant",
      evidence: [
        {
          company: "Ninja Van — TechLab",
          kind: "actual",
          note: {
            en: "Integrated REST APIs across microservices; hands-on with Go services.",
            vi: "Tích hợp REST API giữa các microservice; có làm thực tế với service Go.",
          },
        },
        {
          kind: "theoretical",
          note: {
            en: "FastAPI/Pydantic contracts and OpenAPI-generated TypeScript clients.",
            vi: "Contract FastAPI/Pydantic và TypeScript client sinh từ OpenAPI.",
          },
        },
      ],
      knowledgeGap: {
        en: "No production Python service work is documented.",
        vi: "Chưa có ghi nhận làm service Python ở production.",
      },
      recommendedImprovement: {
        en: "Study Q44 and Q48; be able to read a FastAPI endpoint and map Pydantic models to Zod/TypeScript types. Ask the recruiter how much Python the role involves.",
        vi: "Học Q44 và Q48; đọc được endpoint FastAPI và map model Pydantic sang Zod/TypeScript. Hỏi recruiter vai trò này cần viết Python đến mức nào.",
      },
    },
    {
      id: "match-rust-backend",
      requirement: {
        en: "Work with Rust backend services (contracts, binary protocols, schema evolution) — verified JD context (backend engineers use Rust/Python).",
        vi: "Làm việc với backend Rust (contract, binary protocol, schema evolution) — bối cảnh đã xác minh trong JD (kỹ sư backend dùng Rust/Python).",
      },
      category: "required",
      weight: 2,
      candidateExperience: {
        en: "No Rust experience. Integration is through language-agnostic contracts, so REST/microservices experience transfers, but Rust itself is a gap.",
        vi: "Không có kinh nghiệm Rust. Việc tích hợp đi qua contract độc lập ngôn ngữ nên kinh nghiệm REST/microservices vẫn chuyển giao được, nhưng bản thân Rust là gap.",
      },
      matchLevel: "gap",
      evidence: [
        {
          kind: "theoretical",
          note: {
            en: "Rust awareness: ownership and borrowing, why trading backends choose Rust, WebAssembly for browser hot paths.",
            vi: "Hiểu biết về Rust: ownership và borrowing, vì sao backend trading chọn Rust, WebAssembly cho hot path trên trình duyệt.",
          },
        },
      ],
      knowledgeGap: {
        en: "Cannot read Rust code or discuss serde/protobuf contracts from experience.",
        vi: "Chưa đọc được code Rust hay bàn về contract serde/protobuf từ kinh nghiệm thực tế.",
      },
      recommendedImprovement: {
        en: "Study Q44 and Q49. Frame it honestly: \"I haven't written Rust in production; I integrate through contracts and I'm comfortable reading typed backend code.\"",
        vi: 'Học Q44 và Q49. Trả lời trung thực: "Tôi chưa viết Rust ở production; tôi tích hợp qua contract và đọc được code backend có kiểu dữ liệu chặt."',
      },
    },
    {
      id: "match-microservices-mfe",
      requirement: {
        en: "Familiarity with microservices or micro-frontend architectures — verified preferred skill.",
        vi: "Quen với kiến trúc microservices hoặc micro-frontend — kỹ năng ưu tiên đã xác minh.",
      },
      category: "preferred",
      weight: 2,
      candidateExperience: {
        en: "Microservices environment at Ninja Van; monorepo at Persefoni. Micro-frontend is on the skills list without a specific employer.",
        vi: "Làm trong môi trường microservices ở Ninja Van; monorepo ở Persefoni. Micro-frontend có trong danh sách kỹ năng nhưng không gắn với công ty cụ thể.",
      },
      matchLevel: "relevant",
      evidence: [
        {
          company: "Ninja Van — TechLab",
          kind: "actual",
          note: {
            en: "REST integration in a microservices environment.",
            vi: "Tích hợp REST trong môi trường microservices.",
          },
        },
        {
          company: "Persefoni",
          kind: "actual",
          note: {
            en: "Vite + Turborepo monorepo.",
            vi: "Monorepo Vite + Turborepo.",
          },
        },
      ],
      knowledgeGap: {
        en: "Production micro-frontend experience (Module Federation, shared runtime) is not evidenced.",
        vi: "Chưa có bằng chứng kinh nghiệm micro-frontend ở production (Module Federation, shared runtime).",
      },
      recommendedImprovement: {
        en: "Study Q39; argue monorepo-first and adopt micro-frontends only when team autonomy needs it.",
        vi: "Học Q39; lập luận ưu tiên monorepo trước, chỉ dùng micro-frontend khi thật sự cần sự độc lập giữa các team.",
      },
    },

    /* ---------------------------------------------------------------- */
    /* Domain                                                            */
    /* ---------------------------------------------------------------- */
    {
      id: "match-trading-domain",
      requirement: {
        en: "Trading workflows, financial metrics, market data feeds and fintech UI/UX patterns (order book, OHLC, order types, P&L) — verified preferred skill; the platform does trade capture and analytics.",
        vi: "Workflow trading, chỉ số tài chính, market data feed và pattern UI/UX fintech (order book, OHLC, loại lệnh, P&L) — kỹ năng ưu tiên đã xác minh; nền tảng làm trade capture và analytics.",
      },
      category: "domain",
      weight: 4,
      candidateExperience: {
        en: "No trading or market-data experience. NAB was an enterprise banking environment working on AEM content and assets, not trading systems.",
        vi: "Không có kinh nghiệm trading hay market data. NAB là môi trường ngân hàng enterprise, làm AEM về nội dung và tài sản số, không phải hệ thống trading.",
      },
      matchLevel: "gap",
      evidence: [
        {
          company: "NAB",
          kind: "actual",
          note: {
            en: "Worked in a regulated banking environment (AEM Sites, Assets, Forms) — domain exposure only, not trading.",
            vi: "Làm việc trong môi trường ngân hàng có quy định chặt (AEM Sites, Assets, Forms) — chỉ là tiếp xúc với ngành, không phải trading.",
          },
        },
        {
          kind: "theoretical",
          note: {
            en: "Order book, spread, order lifecycle, tick size and P&L conventions — theoretical preparation.",
            vi: "Order book, spread, vòng đời lệnh, tick size và quy ước P&L — chuẩn bị lý thuyết.",
          },
        },
      ],
      knowledgeGap: {
        en: "Missing trading vocabulary and UI conventions that the team will assume.",
        vi: "Thiếu thuật ngữ trading và quy ước UI mà team sẽ mặc định là ứng viên biết.",
      },
      recommendedImprovement: {
        en: "Study Q31–Q36 and code isb-q52/isb-q53. Learn the vocabulary well enough to ask good questions; never claim trading experience.",
        vi: "Học Q31–Q36 và code isb-q52/isb-q53. Nắm thuật ngữ đủ để đặt câu hỏi tốt; tuyệt đối không nhận là có kinh nghiệm trading.",
      },
    },

    /* ---------------------------------------------------------------- */
    /* Environment and soft skills                                       */
    /* ---------------------------------------------------------------- */
    {
      id: "match-linux",
      requirement: {
        en: "Comfortable working in Linux-based desktop and build environments — verified JD requirement.",
        vi: "Làm việc thoải mái trên môi trường desktop và build dựa trên Linux — yêu cầu đã xác minh trong JD.",
      },
      category: "required",
      weight: 2,
      candidateExperience: {
        en: "Docker, Kubernetes and GitHub Actions are on the skills list, which implies CLI familiarity, but daily Linux desktop use is not documented.",
        vi: "Docker, Kubernetes, GitHub Actions có trong danh sách kỹ năng, cho thấy quen CLI, nhưng việc dùng Linux desktop hằng ngày chưa được ghi nhận.",
      },
      matchLevel: "unverified",
      evidence: [
        {
          kind: "theoretical",
          note: {
            en: "Processes, ports, logs, curl/websocat and environment debugging in CI.",
            vi: "Process, port, log, curl/websocat và debug biến môi trường trong CI.",
          },
        },
      ],
      knowledgeGap: {
        en: "No concrete Linux troubleshooting examples prepared.",
        vi: "Chưa chuẩn bị ví dụ cụ thể về xử lý sự cố trên Linux.",
      },
      recommendedImprovement: {
        en: "Study Q50; run the practice project's dev server and tests from a Linux shell (e.g. a container) and note the commands used.",
        vi: "Học Q50; chạy dev server và test của project luyện tập từ shell Linux (ví dụ trong container) và ghi lại các lệnh đã dùng.",
      },
    },
    {
      id: "match-collaboration",
      requirement: {
        en: 'Collaborate closely with Rust/Python backend engineers and product designers — verified. English communication is likely expected (the Joboko title says "English"; the required level is unverified).',
        vi: 'Phối hợp chặt với kỹ sư backend Rust/Python và product designer — đã xác minh. Khả năng cao cần giao tiếp tiếng Anh (tiêu đề Joboko có chữ "English"; mức độ yêu cầu chưa xác minh).',
      },
      category: "soft-skill",
      weight: 3,
      candidateExperience: {
        en: "Deployment and stakeholder support in an enterprise banking environment at NAB; cross-service REST integration with backend teams at Ninja Van.",
        vi: "Hỗ trợ deployment và làm việc với stakeholder trong môi trường ngân hàng enterprise tại NAB; tích hợp REST liên service với các team backend ở Ninja Van.",
      },
      matchLevel: "relevant",
      evidence: [
        {
          company: "NAB",
          kind: "actual",
          note: {
            en: "Supported deployments and worked with business stakeholders within Author/Publish workflows.",
            vi: "Hỗ trợ deployment và làm việc với stakeholder nghiệp vụ trong quy trình Author/Publish.",
          },
        },
        {
          company: "Ninja Van — TechLab",
          kind: "actual",
          note: {
            en: "Integrated with backend microservices, including Go services.",
            vi: "Tích hợp với microservice backend, bao gồm service Go.",
          },
        },
      ],
      knowledgeGap: {
        en: "No documented experience in an offshore dedicated-team setup or working with Japanese clients (IVC's main market).",
        vi: "Chưa có ghi nhận làm việc theo mô hình dedicated team offshore hay với khách hàng Nhật (thị trường chính của IVC).",
      },
      recommendedImprovement: {
        en: "Prepare Q60 (stakeholder management) and Q59 (disagreement — must be a real story). Ask about the client communication flow (Section 11).",
        vi: "Chuẩn bị Q60 (quản lý stakeholder) và Q59 (bất đồng kỹ thuật — phải là câu chuyện thật). Hỏi về luồng giao tiếp với khách hàng (Section 11).",
      },
    },
  ],
  scoringNotes: {
    en: 'Score = round( Σ(weight × points) / Σ(weight) × 100 ). Points per level: Strong 1.0, Relevant 0.75, Partial 0.4, Unverified 0.2, Gap 0. Each requirement has a weight of 1–5: 5 = core to the role in the verified JD (React/TS, WebSocket/SSE, high-frequency streaming, rendering), 4 = explicitly required or a central responsibility, 3 = required but narrower or preferred-but-visible, 2 = supporting or preferred. "Unverified" means the candidate may have the skill but the profile has no evidence yet; adding real evidence to the profile raises the score. The TanStack Query item is an unverified requirement (not in the real JD), so it carries a low weight. This is an internal estimate for interview preparation, not an official employer or ATS evaluation.',
    vi: 'Điểm = round( Σ(weight × điểm) / Σ(weight) × 100 ). Điểm theo mức: Strong 1.0, Relevant 0.75, Partial 0.4, Unverified 0.2, Gap 0. Mỗi yêu cầu có weight 1–5: 5 = cốt lõi của vị trí theo JD đã xác minh (React/TS, WebSocket/SSE, streaming tần suất cao, rendering), 4 = yêu cầu rõ ràng hoặc trách nhiệm trọng tâm, 3 = bắt buộc nhưng hẹp hơn hoặc ưu tiên nhưng nổi bật, 2 = hỗ trợ hoặc ưu tiên. "Unverified" nghĩa là ứng viên có thể có kỹ năng nhưng hồ sơ chưa có bằng chứng; bổ sung bằng chứng thật vào hồ sơ sẽ tăng điểm. Mục TanStack Query là yêu cầu chưa xác minh (JD thật không có) nên weight thấp. Đây là ước tính nội bộ để chuẩn bị phỏng vấn, không phải đánh giá chính thức của nhà tuyển dụng hay hệ thống ATS.',
  },
  summary: {
    en: "A moderate match, with strong foundations and clear domain gaps. The core stack lines up: production React + TypeScript, TanStack Query caching and prefetching, WCAG accessibility and a Vite + Turborepo monorepo at Persefoni, plus real-time Socket.IO and REST microservices at Ninja Van. The gaps are what makes this role specific: high-frequency market-data streaming, virtualized live tables, memory-leak hunting, financial charting, trading concepts and Rust. Every one of them can be studied, but none can be claimed as experience. The best preparation is to rehearse the streaming and rendering answers (Q1–Q18), learn the trading vocabulary (Q31–Q36) and build the small hands-on project in Section 12, so the answers come from practice rather than theory alone.",
    vi: "Mức độ phù hợp trung bình: nền tảng vững nhưng có khoảng trống rõ về domain. Stack cốt lõi khớp: React + TypeScript ở production, caching và prefetching với TanStack Query, accessibility theo WCAG và monorepo Vite + Turborepo tại Persefoni, cộng với real-time bằng Socket.IO và REST trong microservices tại Ninja Van. Các gap lại chính là phần đặc thù của vị trí: streaming market data tần suất cao, bảng virtualized cập nhật live, truy tìm memory leak, chart tài chính, kiến thức trading và Rust. Tất cả đều học được, nhưng không được nhận là đã có kinh nghiệm. Cách chuẩn bị tốt nhất là luyện các câu trả lời về streaming và rendering (Q1–Q18), học thuật ngữ trading (Q31–Q36) và làm project thực hành nhỏ ở Section 12 để câu trả lời đến từ thực hành chứ không chỉ lý thuyết.",
  },
};
