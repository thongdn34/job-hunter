import type { TailoredCv } from "@/domain/package/schema";

/**
 * Section 4 — Tailored CV for ISB Vietnam, Senior Front-End Developer (TypeScript / React - Python).
 * Only claims supported by the candidate profile. No metrics, no invented roles/periods.
 * Role titles and periods per company are unknown and left for the candidate to fill in.
 */
export const isbCv: TailoredCv = {
  professionalTitle: "Senior Front-End Engineer — React, TypeScript, Real-time Data UIs",
  summary: {
    en: "Senior Software Engineer with 7+ years of experience building enterprise web applications, specializing in React and TypeScript front-end architecture. Built data-heavy enterprise frontends with React, TypeScript, GraphQL and TanStack Query, including background prefetching and caching strategies, inside a Vite + Turborepo monorepo. Delivered real-time features with Socket.IO and integrated REST APIs across microservices in logistics applications. Strong focus on WCAG accessibility (keyboard navigation, ARIA), automated testing (Jest, React Testing Library, Playwright, Cypress) and maintainable, reusable component design. Full-stack background with Node.js, Go and Python/FastAPI, comfortable working closely with backend engineers on API contracts. Experienced in regulated enterprise banking environments and stakeholder collaboration.",
    vi: "Senior Software Engineer với hơn 7 năm kinh nghiệm xây dựng ứng dụng web cho doanh nghiệp, chuyên sâu về kiến trúc front-end với React và TypeScript. Đã xây dựng các frontend enterprise nhiều dữ liệu với React, TypeScript, GraphQL và TanStack Query, bao gồm chiến lược background prefetching và caching, trong một monorepo dùng Vite + Turborepo. Đã làm các tính năng real-time bằng Socket.IO và tích hợp REST API với hệ thống microservices trong mảng logistics. Chú trọng accessibility theo WCAG (keyboard navigation, ARIA), automated testing (Jest, React Testing Library, Playwright, Cypress) và thiết kế component tái sử dụng, dễ bảo trì. Có nền tảng full-stack với Node.js, Go và Python/FastAPI, quen phối hợp chặt với backend engineer về API contract. Có kinh nghiệm làm việc trong môi trường ngân hàng có quy định chặt chẽ và phối hợp với stakeholder.",
  },
  experienceHighlights: [
    {
      company: "Persefoni",
      role: "",
      bullets: [
        {
          en: "Built enterprise front-end features for a carbon accounting and climate management platform using React, TypeScript, GraphQL and TanStack Query.",
          vi: "Xây dựng các tính năng front-end enterprise cho nền tảng kế toán carbon và quản lý khí hậu với React, TypeScript, GraphQL và TanStack Query.",
        },
        {
          en: "Implemented background prefetching and caching strategies with TanStack Query so data-heavy views load from cache and stay responsive.",
          vi: "Triển khai chiến lược background prefetching và caching với TanStack Query để các màn hình nhiều dữ liệu lấy từ cache và phản hồi mượt.",
        },
        {
          en: "Worked in a monorepo architecture with Vite and Turborepo, sharing code and components across packages.",
          vi: "Làm việc trong kiến trúc monorepo với Vite và Turborepo, chia sẻ code và component giữa các package.",
        },
        {
          en: "Delivered WCAG accessibility improvements, including keyboard navigation and ARIA semantics for interactive UI.",
          vi: "Cải thiện accessibility theo WCAG, gồm keyboard navigation và ARIA semantics cho các UI tương tác.",
        },
        {
          en: "Wrote automated tests as part of day-to-day enterprise front-end development.",
          vi: "Viết automated test như một phần của quy trình phát triển front-end enterprise hằng ngày.",
        },
      ],
    },
    {
      company: "Ninja Van — TechLab",
      role: "",
      bullets: [
        {
          en: "Implemented real-time communication with Socket.IO for logistics applications.",
          vi: "Triển khai giao tiếp real-time bằng Socket.IO cho các ứng dụng logistics.",
        },
        {
          en: "Integrated thermal printers and generated shipping labels with Labelary and ZPL, owning the flow from data to printed label.",
          vi: "Tích hợp máy in nhiệt và tạo nhãn vận chuyển với Labelary và ZPL, chịu trách nhiệm luồng từ dữ liệu đến nhãn in ra.",
        },
        {
          en: "Integrated REST APIs in a microservices environment and worked with Go services.",
          vi: "Tích hợp REST API trong môi trường microservices và làm việc với các service viết bằng Go.",
        },
      ],
    },
    {
      company: "NAB",
      role: "",
      bullets: [
        {
          en: "Worked on Adobe Experience Manager in an enterprise banking environment: AEM Assets / DAM, AEM Sites and AEM Forms.",
          vi: "Làm việc với Adobe Experience Manager trong môi trường ngân hàng enterprise: AEM Assets / DAM, AEM Sites và AEM Forms.",
        },
        {
          en: "Operated within Author and Publish workflows and handled asset integration.",
          vi: "Làm việc trong quy trình Author và Publish, xử lý tích hợp asset.",
        },
        {
          en: "Supported deployments and worked directly with business stakeholders.",
          vi: "Hỗ trợ deployment và làm việc trực tiếp với các stakeholder phía business.",
        },
      ],
    },
  ],
  achievementBullets: [
    {
      en: "Designed data-fetching layers with TanStack Query (background prefetching and caching) to keep data-heavy enterprise views responsive.",
      vi: "Thiết kế tầng data-fetching với TanStack Query (background prefetching and caching) để các màn hình enterprise nhiều dữ liệu luôn phản hồi nhanh.",
    },
    {
      en: "Shipped real-time features over Socket.IO, handling live server-to-client updates in logistics workflows.",
      vi: "Đưa vào sử dụng các tính năng real-time qua Socket.IO, xử lý cập nhật trực tiếp từ server xuống client trong các quy trình logistics.",
    },
    {
      en: "Built accessible, keyboard-operable UI with WCAG-aligned ARIA patterns in an enterprise React/TypeScript codebase.",
      vi: "Xây dựng UI có accessibility, thao tác được bằng bàn phím, dùng ARIA pattern theo WCAG trong codebase React/TypeScript enterprise.",
    },
    {
      en: "Worked in a Vite + Turborepo monorepo with shared packages, applying modular front-end architecture in practice.",
      vi: "Làm việc trong monorepo Vite + Turborepo với các package dùng chung, áp dụng kiến trúc front-end dạng module trong thực tế.",
    },
    {
      en: "Owned an end-to-end hardware integration: thermal printer support and ZPL shipping-label generation via Labelary.",
      vi: "Chịu trách nhiệm end-to-end một tích hợp phần cứng: hỗ trợ máy in nhiệt và tạo nhãn vận chuyển ZPL qua Labelary.",
    },
    {
      en: "Integrated front-end applications with REST APIs backed by microservices, collaborating with backend engineers (including Go services).",
      vi: "Tích hợp ứng dụng front-end với REST API chạy trên microservices, phối hợp với backend engineer (bao gồm các service Go).",
    },
    {
      en: "Supported AEM deployments and stakeholder requests in a regulated enterprise banking environment.",
      vi: "Hỗ trợ deployment AEM và các yêu cầu từ stakeholder trong môi trường ngân hàng có quy định chặt chẽ.",
    },
  ],
  technicalSkills: [
    {
      category: "Front-end",
      skills: ["React", "TypeScript", "JavaScript", "Next.js", "HTML5", "CSS3", "Tailwind CSS", "Vue.js"],
    },
    {
      category: "State management & data fetching",
      skills: ["Zustand", "Redux", "TanStack Query", "GraphQL", "Apollo Client", "REST APIs"],
    },
    {
      category: "Real-time",
      skills: ["Socket.IO", "WebSockets"],
    },
    {
      category: "Testing",
      skills: ["Jest", "React Testing Library", "Playwright", "Cypress"],
    },
    {
      category: "Accessibility",
      skills: ["WCAG", "ARIA", "Keyboard navigation"],
    },
    {
      category: "Build & architecture",
      skills: [
        "Vite",
        "Webpack",
        "Turborepo",
        "Monorepo",
        "Micro-frontend",
        "BFF",
        "Microservices",
        "Event-driven architecture",
      ],
    },
    {
      category: "Backend (integration & full-stack)",
      skills: ["Node.js", "NestJS", "Express.js", "Python", "FastAPI", "Go", "Prisma", "TypeORM"],
    },
    {
      category: "Data & infrastructure",
      skills: ["PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes", "GitHub Actions", "AWS", "GCP"],
    },
  ],
  atsKeywords: [
    "Senior Front-End Developer",
    "TypeScript",
    "React",
    "Next.js",
    "Zustand",
    "Redux Toolkit",
    "WebSockets",
    "Server-Sent Events",
    "SSE",
    "REST APIs",
    "Real-time data",
    "High-frequency updates",
    "Data streaming",
    "Dashboards",
    "Data visualization",
    "Charts",
    "Browser rendering performance",
    "Web performance",
    "Memory leak detection",
    "Virtualized lists",
    "Virtualized tables",
    "Large datasets",
    "DOM optimization",
    "State management",
    "Component library",
    "Reusable components",
    "Accessibility",
    "WCAG",
    "Automated UI testing",
    "Jest",
    "React Testing Library",
    "Playwright",
    "Cypress",
    "Unit testing",
    "Integration testing",
    "E2E testing",
    "Python",
    "Rust",
    "Backend integration",
    "Microservices",
    "Micro-frontend",
    "Linux",
    "Fintech",
    "Trading",
    "Market data",
  ],
  missingSkillsToStudy: [
    {
      skill: "High-frequency streaming at scale in the browser (batching, conflation, backpressure, Web Workers)",
      reason: {
        en: "The JD centers on turning high-frequency data streams into fluid UIs. Socket.IO experience is relevant, but tick-rate batching, conflation and worker offloading must be explained confidently as approaches, not as past production work.",
        vi: "JD xoay quanh việc biến các luồng dữ liệu high-frequency thành UI mượt. Kinh nghiệm Socket.IO là liên quan, nhưng batching theo tick, conflation và offload sang worker cần được giải thích tự tin như hướng tiếp cận, không phải như kinh nghiệm production đã có.",
      },
      priority: "critical",
    },
    {
      skill: "Trading domain fundamentals (order book, order types, order lifecycle, P&L, market data feeds)",
      reason: {
        en: "Preferred in the JD (trading workflows, financial metrics, market data feeds) and the platform is described as trade capture and analytics. There is no trading production experience, so vocabulary and UI conventions must be learned.",
        vi: "JD ưu tiên (trading workflows, financial metrics, market data feeds) và nền tảng được mô tả là trade capture và analytics. Ứng viên chưa có kinh nghiệm production về trading nên cần học thuật ngữ và các quy ước UI.",
      },
      priority: "critical",
    },
    {
      skill: "Virtualized tables for large datasets (TanStack Virtual / AG Grid) with live updates",
      reason: {
        en: "Explicitly required (virtualized lists/tables for large datasets). Be ready to explain windowing, variable row heights, sticky headers and keeping scroll stable while rows update.",
        vi: "Được yêu cầu rõ ràng (virtualized lists/tables cho dữ liệu lớn). Cần sẵn sàng giải thích windowing, row height thay đổi, sticky header và giữ scroll ổn định khi dữ liệu cập nhật liên tục.",
      },
      priority: "critical",
    },
    {
      skill: "Browser rendering internals and memory leak detection (Chrome DevTools Performance, heap snapshots)",
      reason: {
        en: "Explicitly required (browser rendering mechanics, memory leak detection, web performance tools). Practice a heap-snapshot comparison and a performance trace on a demo app before the interview.",
        vi: "Được yêu cầu rõ ràng (browser rendering mechanics, memory leak detection, web performance tools). Nên thực hành so sánh heap snapshot và đọc performance trace trên một app demo trước buổi phỏng vấn.",
      },
      priority: "high",
    },
    {
      skill: "Canvas / SVG financial charting (Lightweight Charts, D3.js, Highcharts, visx); WebGL awareness",
      reason: {
        en: "Preferred in the JD. No production charting experience is listed, so build a small candlestick chart demo and know when canvas beats SVG. WebGL should be presented only as theoretical knowledge.",
        vi: "JD ưu tiên. Hồ sơ không có kinh nghiệm production về charting, nên hãy làm một demo candlestick chart nhỏ và nắm khi nào canvas tốt hơn SVG. WebGL chỉ trình bày như kiến thức lý thuyết.",
      },
      priority: "high",
    },
    {
      skill: "Server-Sent Events (SSE) in practice",
      reason: {
        en: "Named alongside WebSockets in the JD. Experience is with Socket.IO, so review EventSource, reconnection with Last-Event-ID, and when SSE is a better fit than WebSockets.",
        vi: "JD nhắc SSE cùng với WebSocket. Kinh nghiệm hiện có là Socket.IO, nên cần ôn EventSource, cơ chế reconnect với Last-Event-ID và khi nào SSE phù hợp hơn WebSocket.",
      },
      priority: "high",
    },
    {
      skill: "Zustand at high update rates (selectors, transient updates)",
      reason: {
        en: "Zustand is one of the JD's state options. It is a listed skill, but be ready to discuss narrow selectors, subscribe-without-render and how it compares with Redux Toolkit and Jotai.",
        vi: "Zustand là một trong các lựa chọn state trong JD. Đây là skill có trong hồ sơ, nhưng cần sẵn sàng thảo luận về selector hẹp, subscribe không gây re-render và so sánh với Redux Toolkit, Jotai.",
      },
      priority: "medium",
    },
    {
      skill: "Rust basics and backend integration (ownership, serde, binary protocols, WebAssembly)",
      reason: {
        en: "Backend engineers work in Rust/Python. A front-end engineer does not need to write Rust, but should understand why it is used and how API contracts and serialization are shared. No Rust production experience exists.",
        vi: "Backend engineer làm việc với Rust/Python. Front-end engineer không cần viết Rust, nhưng nên hiểu vì sao Rust được dùng và cách chia sẻ API contract, serialization. Ứng viên chưa có kinh nghiệm production với Rust.",
      },
      priority: "medium",
    },
    {
      skill: "Linux desktop and build environments",
      reason: {
        en: "Required in the JD. Refresh shell basics for debugging builds: processes, ports, logs, environment variables, file permissions.",
        vi: "JD yêu cầu. Ôn lại kiến thức shell cơ bản để debug build: process, port, log, biến môi trường, quyền file.",
      },
      priority: "medium",
    },
    {
      skill: "Python for reading backend code (FastAPI, Pydantic, asyncio)",
      reason: {
        en: "Python is in the job title. Whether the front-end engineer writes Python is unverified, so be ready to read and discuss FastAPI/Pydantic services and confirm the expectation with the recruiter.",
        vi: "Python có trong tên vị trí. Việc front-end engineer có phải viết Python hay không là chưa xác minh, nên hãy sẵn sàng đọc và thảo luận các service FastAPI/Pydantic và hỏi lại recruiter.",
      },
      priority: "low",
    },
  ],
  claimNotes: [
    {
      en: "Do not claim trading, market-data or finance production experience. NAB work was on AEM content platforms, not trading systems. Present trading knowledge as studied concepts.",
      vi: "Không nhận là có kinh nghiệm production về trading, market data hay tài chính. Công việc ở NAB là nền tảng nội dung AEM, không phải hệ thống trading. Trình bày kiến thức trading như các khái niệm đã tìm hiểu.",
    },
    {
      en: "Do not claim high-frequency streaming (thousands of updates per second). Socket.IO real-time experience at Ninja Van is real; tick-rate techniques are recommended approaches.",
      vi: "Không nhận là đã làm streaming high-frequency (hàng nghìn cập nhật mỗi giây). Kinh nghiệm real-time với Socket.IO ở Ninja Van là thật; các kỹ thuật xử lý tick rate cao là hướng tiếp cận đề xuất.",
    },
    {
      en: "Do not claim Rust or WebGL production experience. Present them as theoretical knowledge.",
      vi: "Không nhận là có kinh nghiệm production với Rust hay WebGL. Trình bày như kiến thức lý thuyết.",
    },
    {
      en: "Do not add metrics (load-time reductions, percentages, user counts) unless you can personally verify and explain them. None are included here.",
      vi: "Không thêm số liệu (giảm thời gian tải, phần trăm, số lượng user) trừ khi bạn tự xác minh và giải thích được. Bản CV này không có số liệu nào.",
    },
    {
      en: "Skills such as Next.js, Zustand, Python/FastAPI and Kubernetes are listed skills, not tied to a specific company. Do not attach them to Persefoni, Ninja Van or NAB unless that is true.",
      vi: "Các skill như Next.js, Zustand, Python/FastAPI và Kubernetes là skill liệt kê, không gắn với công ty cụ thể. Đừng gán chúng cho Persefoni, Ninja Van hay NAB nếu không đúng sự thật.",
    },
    {
      en: "The ATS keywords mirror the JD. Use a keyword in the CV only where it is true. SSE, Rust, Linux, trading and market data belong in a 'familiar with / currently studying' line, not in experience bullets.",
      vi: "ATS keywords được lấy từ JD. Chỉ đưa keyword vào CV ở chỗ đúng sự thật. SSE, Rust, Linux, trading và market data nên nằm ở dòng 'familiar with / currently studying', không nằm trong bullet kinh nghiệm.",
    },
    {
      en: "Role titles and employment periods are left blank on purpose. Fill them in from your real records before sending the CV.",
      vi: "Chức danh và thời gian làm việc được để trống có chủ ý. Hãy điền từ thông tin thật của bạn trước khi gửi CV.",
    },
    {
      en: "Virtualized tables, canvas charting and memory-leak profiling are JD requirements. Only list them as experience if you have used them in real work; otherwise keep them in the study list.",
      vi: "Virtualized table, canvas charting và memory-leak profiling là yêu cầu của JD. Chỉ ghi là kinh nghiệm nếu bạn đã thực sự dùng trong công việc; nếu không, hãy để trong danh sách cần học.",
    },
  ],
};
