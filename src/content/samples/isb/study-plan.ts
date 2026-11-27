import type { StudyPlan, StudyTask } from "@/domain/package/schema";

/**
 * Section 13 — Study plans for the ISB Vietnam Senior Front-End Developer sample.
 *
 * Priority order follows the verified JD: real-time streaming (WebSocket/SSE, high-frequency data),
 * then browser/React rendering performance, virtualization and memory, then trading/visualization,
 * state, TypeScript, architecture, testing and Python/Rust/Linux awareness.
 *
 * Durations: 1-day ≈ 7.5h total; 3-day ≈ 5h/day; 7-day ≈ 3–3.5h/day.
 * relatedItemIds reference ONLY existing item ids (isb-q01…isb-q61, isb-sd1…isb-sd4).
 */

const q = (...nums: number[]): string[] => nums.map((n) => `isb-q${String(n).padStart(2, "0")}`);

const task = (
  id: string,
  en: string,
  vi: string,
  durationMinutes: number,
  priority: StudyTask["priority"],
  relatedItemIds: string[] = [],
): StudyTask => ({ id, title: { en, vi }, durationMinutes, priority, relatedItemIds });

/* ------------------------------------------------------------------ */
/* 1-day plan — interview is tomorrow: only the critical core          */
/* ------------------------------------------------------------------ */

const oneDay: StudyPlan = {
  id: "1d",
  title: {
    en: "1-day crash plan — real-time and performance first (~7.5h)",
    vi: "Kế hoạch cấp tốc 1 ngày — ưu tiên real-time và performance (~7,5 giờ)",
  },
  days: [
    {
      day: 1,
      focus: {
        en: "Cover the verified core of the JD: streaming (WebSocket/SSE), rendering performance, virtualization, memory, one system design answer, then rehearse aloud.",
        vi: "Bao quát phần lõi đã xác minh trong JD: streaming (WebSocket/SSE), rendering performance, virtualization, memory, một bài system design, sau đó luyện nói thành tiếng.",
      },
      tasks: [
        task(
          "1d-t1",
          "Real-time core: WebSocket vs SSE vs polling, reconnect with backoff + jitter, batching ticks per animation frame, sequence numbers and snapshot + delta resync",
          "Lõi real-time: WebSocket vs SSE vs polling, reconnect với backoff + jitter, gom tick theo animation frame, sequence number và resync bằng snapshot + delta",
          75,
          "critical",
          q(1, 2, 3, 4),
        ),
        task(
          "1d-t2",
          "Backpressure, Web Worker offloading and heartbeat / stale-data UX — prepare one sentence each for detection and mitigation",
          "Backpressure, đẩy xử lý sang Web Worker và heartbeat / UX khi dữ liệu stale — chuẩn bị mỗi ý một câu về cách phát hiện và cách xử lý",
          45,
          "critical",
          q(5, 6, 7),
        ),
        task(
          "1d-t3",
          "React rendering: render vs commit, what triggers a re-render, profiling a live dashboard, memoization trade-offs, useTransition / useDeferredValue",
          "React rendering: render vs commit, điều gì gây re-render, profile một dashboard live, trade-off của memoization, useTransition / useDeferredValue",
          60,
          "critical",
          q(8, 9, 10, 11),
        ),
        task(
          "1d-t4",
          "Browser pipeline and big data: layout thrashing, frame budget, virtualized 100k-row table, memory-leak hunting with heap snapshots",
          "Browser pipeline và dữ liệu lớn: layout thrashing, frame budget, bảng virtualized 100k dòng, tìm memory leak bằng heap snapshot",
          60,
          "critical",
          q(12, 18, 13, 15),
        ),
        task(
          "1d-t5",
          "System design: say the real-time trading dashboard answer end-to-end in 10 minutes, including the client-side data layer",
          "System design: nói trọn bài real-time trading dashboard trong 10 phút, bao gồm data layer phía client",
          60,
          "critical",
          ["isb-sd1", ...q(37, 38)],
        ),
        task(
          "1d-t6",
          "Trading and state basics: order book, money precision, Zustand selectors / transient updates, TanStack Query + WebSocket merging",
          "Kiến thức giao dịch và state: order book, độ chính xác số tiền, Zustand selector / transient update, kết hợp TanStack Query + WebSocket",
          40,
          "high",
          q(31, 21, 26, 27),
        ),
        task(
          "1d-t7",
          "Coding warm-up: implement order book delta aggregation and throttle/debounce from memory, then explain complexity aloud",
          "Khởi động coding: tự viết order book delta aggregation và throttle/debounce không nhìn tài liệu, rồi giải thích độ phức tạp thành tiếng",
          40,
          "high",
          q(52, 51),
        ),
        task(
          "1d-t8",
          "Behavioral: rehearse three STAR stories from real experience (Persefoni prefetching/caching, Ninja Van label printing) — no invented numbers",
          "Behavioral: luyện ba câu chuyện STAR từ kinh nghiệm thật (prefetching/caching ở Persefoni, in nhãn ở Ninja Van) — không bịa số liệu",
          30,
          "high",
          q(56, 57, 58),
        ),
        task(
          "1d-t9",
          "Flashcard rapid review: critical cards only, mark anything you hesitate on for review",
          "Ôn nhanh flashcard: chỉ các thẻ critical, đánh dấu ôn lại những thẻ còn ngập ngừng",
          20,
          "high",
        ),
        task(
          "1d-t10",
          "Mock interview: 5 questions, answer aloud with a timer (2–3 minutes each), then compare with the recommended answers",
          "Mock interview: 5 câu, trả lời thành tiếng có bấm giờ (2–3 phút mỗi câu), sau đó so với đáp án gợi ý",
          30,
          "critical",
          [...q(1, 3, 13, 15), "isb-sd1"],
        ),
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 3-day plan — ~5h/day                                                */
/* ------------------------------------------------------------------ */

const threeDay: StudyPlan = {
  id: "3d",
  title: {
    en: "3-day focused plan — streaming, performance, then breadth (~5h/day)",
    vi: "Kế hoạch tập trung 3 ngày — streaming, performance, rồi mở rộng (~5 giờ/ngày)",
  },
  days: [
    {
      day: 1,
      focus: {
        en: "Real-time streaming end-to-end: transport choice, resilience, high-frequency data, correctness and the client data layer.",
        vi: "Real-time streaming từ đầu đến cuối: chọn transport, khả năng phục hồi, dữ liệu tần suất cao, tính đúng đắn và data layer phía client.",
      },
      tasks: [
        task(
          "3d-d1-t1",
          "Transport and lifecycle: WebSocket vs SSE vs long polling, reconnect strategy, heartbeats and connection-status UX",
          "Transport và vòng đời kết nối: WebSocket vs SSE vs long polling, chiến lược reconnect, heartbeat và UX trạng thái kết nối",
          60,
          "critical",
          q(1, 2, 7),
        ),
        task(
          "3d-d1-t2",
          "High-frequency data: batching and conflation, ordering / gap recovery, backpressure strategies",
          "Dữ liệu tần suất cao: batching và conflation, thứ tự / khôi phục khi mất gói, các chiến lược backpressure",
          75,
          "critical",
          q(3, 4, 5),
        ),
        task(
          "3d-d1-t3",
          "Event loop, stale closures in WebSocket callbacks and Web Worker / SharedWorker offloading",
          "Event loop, stale closure trong callback WebSocket và đẩy xử lý sang Web Worker / SharedWorker",
          45,
          "critical",
          q(19, 20, 6),
        ),
        task(
          "3d-d1-t4",
          "System design: client-side streaming data layer (multiplexed connection, subscription registry, workers, backpressure)",
          "System design: streaming data layer phía client (một kết nối multiplexed, subscription registry, worker, backpressure)",
          60,
          "critical",
          ["isb-sd2", ...q(38)],
        ),
        task(
          "3d-d1-t5",
          "Practice project, part 1: a local mock WebSocket price feed plus a store that buffers ticks and flushes once per requestAnimationFrame",
          "Practice project, phần 1: dựng mock WebSocket price feed chạy local và một store gom tick, flush một lần mỗi requestAnimationFrame",
          45,
          "high",
          q(3),
        ),
        task("3d-d1-t6", "Flashcard review: real-time cards", "Ôn flashcard: nhóm real-time", 15, "medium"),
      ],
    },
    {
      day: 2,
      focus: {
        en: "React and browser performance: re-renders, concurrency, rendering pipeline, virtualization, charts, memory and Web Vitals.",
        vi: "Hiệu năng React và trình duyệt: re-render, concurrency, rendering pipeline, virtualization, chart, memory và Web Vitals.",
      },
      tasks: [
        task(
          "3d-d2-t1",
          "React rendering model, finding unnecessary re-renders, memoization and the React Compiler",
          "Mô hình rendering của React, tìm re-render thừa, memoization và React Compiler",
          60,
          "critical",
          q(8, 9, 10),
        ),
        task(
          "3d-d2-t2",
          "Concurrent features, the browser pixel pipeline and frame budget / long tasks",
          "Concurrent feature, pixel pipeline của trình duyệt và frame budget / long task",
          50,
          "critical",
          q(11, 12, 18),
        ),
        task(
          "3d-d2-t3",
          "Virtualized tables with live updates, then the high-frequency blotter design scenario",
          "Bảng virtualized có cập nhật live, sau đó bài system design blotter tần suất cao",
          60,
          "critical",
          ["isb-sd3", ...q(13)],
        ),
        task(
          "3d-d2-t4",
          "Canvas vs SVG vs WebGL, memory leaks and heap snapshots, Core Web Vitals (INP), code splitting",
          "Canvas vs SVG vs WebGL, memory leak và heap snapshot, Core Web Vitals (INP), code splitting",
          60,
          "high",
          q(14, 15, 16, 17),
        ),
        task(
          "3d-d2-t5",
          "Coding: throttle/debounce with leading/trailing options and an O(1) LRU cache",
          "Coding: throttle/debounce có tuỳ chọn leading/trailing và LRU cache O(1)",
          40,
          "high",
          q(51, 55),
        ),
        task(
          "3d-d2-t6",
          "Practice project, part 2: render the feed in a virtualized table, record a Performance profile and a heap snapshot, note what you see",
          "Practice project, phần 2: hiển thị feed trong bảng virtualized, ghi Performance profile và heap snapshot, ghi chú những gì quan sát được",
          30,
          "high",
          q(13, 15),
        ),
        task(
          "3d-d2-t7",
          "Flashcard review: React performance and browser cards",
          "Ôn flashcard: nhóm React performance và trình duyệt",
          15,
          "medium",
        ),
      ],
    },
    {
      day: 3,
      focus: {
        en: "Breadth and rehearsal: trading and charts, state and Next.js, TypeScript, architecture, testing, Python/Rust/Linux, STAR stories and a full mock.",
        vi: "Mở rộng và luyện tập: giao dịch và chart, state và Next.js, TypeScript, kiến trúc, testing, Python/Rust/Linux, câu chuyện STAR và một buổi mock đầy đủ.",
      },
      tasks: [
        task(
          "3d-d3-t1",
          "Trading fundamentals and financial visualization: order book, candles, order types, charting libraries, P&L display, time-series memory",
          "Kiến thức giao dịch và trực quan hoá tài chính: order book, nến, loại lệnh, thư viện chart, hiển thị P&L, bộ nhớ cho time-series",
          60,
          "high",
          q(31, 32, 33, 34, 35, 36),
        ),
        task(
          "3d-d3-t2",
          "State and TypeScript: Zustand vs RTK, TanStack Query merging, Next.js boundaries, optimistic orders; money precision, discriminated unions, Zod, generics, immutability",
          "State và TypeScript: Zustand vs RTK, kết hợp TanStack Query, ranh giới Next.js, optimistic order; độ chính xác số tiền, discriminated union, Zod, generic, immutability",
          60,
          "high",
          q(26, 27, 28, 29, 30, 21, 22, 23, 24, 25),
        ),
        task(
          "3d-d3-t3",
          "Architecture: trading dashboard overview plus microfrontends/monorepo, design system and accessibility, resilience, observability, security, Rust/Python contracts",
          "Kiến trúc: tổng quan trading dashboard cùng microfrontend/monorepo, design system và accessibility, resilience, observability, security, contract với Rust/Python",
          50,
          "high",
          ["isb-sd1", "isb-sd4", ...q(37, 39, 40, 41, 42, 43, 44)],
        ),
        task(
          "3d-d3-t4",
          "Testing, Python, Rust and Linux: strategy for streaming UIs, RTL with fake timers, Playwright WebSocket routing, FastAPI/Pydantic, Rust awareness, CI debugging",
          "Testing, Python, Rust và Linux: chiến lược test UI streaming, RTL với fake timer, Playwright routing WebSocket, FastAPI/Pydantic, hiểu biết về Rust, debug CI",
          40,
          "medium",
          q(45, 46, 47, 48, 49, 50),
        ),
        task(
          "3d-d3-t5",
          "Coding: OHLC candle aggregation and sliding-window moving average / VWAP; re-do order book aggregation under a 20-minute timer",
          "Coding: gom trade thành nến OHLC và moving average / VWAP với sliding window; làm lại order book aggregation trong 20 phút",
          45,
          "high",
          q(53, 54, 52),
        ),
        task(
          "3d-d3-t6",
          "Behavioral: rehearse all six STAR answers; replace the theoretical disagreement template with your own real story",
          "Behavioral: luyện cả sáu câu STAR; thay template tranh luận kỹ thuật (theoretical) bằng câu chuyện thật của bạn",
          30,
          "high",
          q(56, 57, 58, 59, 60, 61),
        ),
        task(
          "3d-d3-t7",
          "Full mock interview (45 minutes): 6 technical questions, 1 system design, 1 behavioral — then review weak answers and flashcards marked for review",
          "Mock interview đầy đủ (45 phút): 6 câu kỹ thuật, 1 system design, 1 behavioral — sau đó xem lại các câu yếu và flashcard đã đánh dấu",
          45,
          "critical",
          [...q(2, 4, 9, 13, 15, 26), "isb-sd2", ...q(57)],
        ),
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 7-day plan — ~3h/day, deeper practice                               */
/* ------------------------------------------------------------------ */

const sevenDay: StudyPlan = {
  id: "7d",
  title: {
    en: "7-day deep plan — build, profile and rehearse (~3h/day)",
    vi: "Kế hoạch chuyên sâu 7 ngày — tự build, profile và luyện nói (~3 giờ/ngày)",
  },
  days: [
    {
      day: 1,
      focus: {
        en: "Real-time foundations and the event loop.",
        vi: "Nền tảng real-time và event loop.",
      },
      tasks: [
        task(
          "7d-d1-t1",
          "WebSocket vs SSE vs long polling, connection lifecycle and reconnection, heartbeats and stale-data UX",
          "WebSocket vs SSE vs long polling, vòng đời kết nối và reconnect, heartbeat và UX khi dữ liệu stale",
          55,
          "critical",
          q(1, 2, 7),
        ),
        task(
          "7d-d1-t2",
          "Event loop: microtasks vs macrotasks vs rendering — draw it from memory",
          "Event loop: microtask vs macrotask vs rendering — tự vẽ lại không nhìn tài liệu",
          25,
          "high",
          q(19),
        ),
        task(
          "7d-d1-t3",
          "High-frequency ticks: batching, conflation and requestAnimationFrame flushing",
          "Tick tần suất cao: batching, conflation và flush bằng requestAnimationFrame",
          35,
          "critical",
          q(3),
        ),
        task(
          "7d-d1-t4",
          "Practice project setup: Vite + React + TypeScript app and a small Node mock server that streams random prices over WebSocket",
          "Khởi tạo practice project: app Vite + React + TypeScript và một mock server Node nhỏ stream giá ngẫu nhiên qua WebSocket",
          50,
          "high",
        ),
        task("7d-d1-t5", "Flashcard review: real-time cards", "Ôn flashcard: nhóm real-time", 15, "medium"),
      ],
    },
    {
      day: 2,
      focus: {
        en: "Streaming correctness and scale: ordering, backpressure, workers, typed protocols.",
        vi: "Tính đúng đắn và khả năng mở rộng của streaming: thứ tự, backpressure, worker, protocol có kiểu.",
      },
      tasks: [
        task(
          "7d-d2-t1",
          "Sequence numbers, deduplication, snapshot + delta and gap recovery",
          "Sequence number, khử trùng lặp, snapshot + delta và khôi phục khi mất gói",
          30,
          "critical",
          q(4),
        ),
        task(
          "7d-d2-t2",
          "Backpressure detection and strategies; Web Worker / SharedWorker and transferables",
          "Phát hiện backpressure và các chiến lược xử lý; Web Worker / SharedWorker và transferable",
          50,
          "critical",
          q(5, 6),
        ),
        task(
          "7d-d2-t3",
          "Typed protocols: discriminated unions, runtime validation with Zod, generic type-safe event emitter",
          "Protocol có kiểu: discriminated union, validate runtime bằng Zod, event emitter type-safe với generic",
          45,
          "high",
          q(22, 23, 24),
        ),
        task(
          "7d-d2-t4",
          "System design: client-side streaming data layer — whiteboard it, then say it aloud",
          "System design: streaming data layer phía client — vẽ ra giấy rồi nói thành tiếng",
          45,
          "critical",
          ["isb-sd2", ...q(38)],
        ),
        task(
          "7d-d2-t5",
          "Practice project: add sequence numbers, a reconnect with backoff + jitter, and a status badge (live / reconnecting / stale)",
          "Practice project: thêm sequence number, reconnect với backoff + jitter và badge trạng thái (live / reconnecting / stale)",
          30,
          "high",
          q(2, 4, 7),
        ),
      ],
    },
    {
      day: 3,
      focus: {
        en: "React rendering and state for high-frequency updates.",
        vi: "React rendering và state cho cập nhật tần suất cao.",
      },
      tasks: [
        task(
          "7d-d3-t1",
          "Render vs commit, reconciliation and keys; profiling unnecessary re-renders",
          "Render vs commit, reconciliation và key; profile để tìm re-render thừa",
          55,
          "critical",
          q(8, 9),
        ),
        task(
          "7d-d3-t2",
          "useMemo / useCallback / React.memo / React Compiler; useTransition and useDeferredValue",
          "useMemo / useCallback / React.memo / React Compiler; useTransition và useDeferredValue",
          45,
          "high",
          q(10, 11),
        ),
        task(
          "7d-d3-t3",
          "Stale closures and immutability / structural sharing",
          "Stale closure và immutability / structural sharing",
          35,
          "high",
          q(20, 25),
        ),
        task(
          "7d-d3-t4",
          "Practice project: move the price store to Zustand with per-symbol selectors and a transient subscription for the ticker cell",
          "Practice project: chuyển price store sang Zustand với selector theo từng symbol và transient subscription cho ô ticker",
          40,
          "high",
          q(26),
        ),
        task(
          "7d-d3-t5",
          "Coding: LRU cache with O(1) get/put",
          "Coding: LRU cache với get/put O(1)",
          25,
          "medium",
          q(55),
        ),
      ],
    },
    {
      day: 4,
      focus: {
        en: "Browser rendering, virtualization and memory.",
        vi: "Browser rendering, virtualization và memory.",
      },
      tasks: [
        task(
          "7d-d4-t1",
          "Pixel pipeline, layout thrashing, frame budget, long tasks and yielding",
          "Pixel pipeline, layout thrashing, frame budget, long task và yield",
          50,
          "critical",
          q(12, 18),
        ),
        task(
          "7d-d4-t2",
          "Virtualized 100k-row table with live updates, plus the high-frequency blotter scenario",
          "Bảng virtualized 100k dòng có cập nhật live, kèm bài system design blotter tần suất cao",
          50,
          "critical",
          ["isb-sd3", ...q(13)],
        ),
        task(
          "7d-d4-t3",
          "Memory leaks in long-running SPAs; Core Web Vitals and INP; code splitting",
          "Memory leak trong SPA chạy lâu; Core Web Vitals và INP; code splitting",
          50,
          "critical",
          q(15, 16, 17),
        ),
        task(
          "7d-d4-t4",
          "Practice project: add a virtualized blotter, then take three heap snapshots after subscribe/unsubscribe cycles and confirm nothing grows",
          "Practice project: thêm blotter virtualized, sau đó chụp ba heap snapshot sau các vòng subscribe/unsubscribe và xác nhận bộ nhớ không tăng",
          45,
          "high",
          q(13, 15),
        ),
      ],
    },
    {
      day: 5,
      focus: {
        en: "Trading fundamentals and financial charting.",
        vi: "Kiến thức giao dịch và chart tài chính.",
      },
      tasks: [
        task(
          "7d-d5-t1",
          "Order book, order types and lifecycle, displaying prices / P&L, money precision",
          "Order book, loại lệnh và vòng đời lệnh, hiển thị giá / P&L, độ chính xác số tiền",
          55,
          "high",
          q(31, 33, 35, 21),
        ),
        task(
          "7d-d5-t2",
          "Candles, charting libraries, Canvas vs SVG vs WebGL, ring buffers and downsampling",
          "Nến, thư viện chart, Canvas vs SVG vs WebGL, ring buffer và downsampling",
          55,
          "high",
          q(32, 34, 14, 36),
        ),
        task(
          "7d-d5-t3",
          "Coding: order book delta aggregation and OHLC candle aggregation",
          "Coding: order book delta aggregation và gom nến OHLC",
          45,
          "high",
          q(52, 53),
        ),
        task(
          "7d-d5-t4",
          "Practice project: add a canvas candlestick chart (e.g. Lightweight Charts) fed by client-side candle aggregation",
          "Practice project: thêm candlestick chart bằng canvas (ví dụ Lightweight Charts) lấy dữ liệu từ phần gom nến phía client",
          40,
          "medium",
          q(32, 34),
        ),
      ],
    },
    {
      day: 6,
      focus: {
        en: "State, Next.js and frontend architecture.",
        vi: "State, Next.js và kiến trúc frontend.",
      },
      tasks: [
        task(
          "7d-d6-t1",
          "Zustand vs Redux Toolkit vs Context; TanStack Query with WebSocket updates; optimistic order placement",
          "Zustand vs Redux Toolkit vs Context; TanStack Query kết hợp cập nhật WebSocket; optimistic order placement",
          40,
          "high",
          q(26, 27, 30),
        ),
        task(
          "7d-d6-t2",
          "Next.js App Router: Server vs Client Components and rendering strategies for a trading screen",
          "Next.js App Router: Server vs Client Component và chiến lược rendering cho màn hình giao dịch",
          30,
          "medium",
          q(28, 29),
        ),
        task(
          "7d-d6-t3",
          "System design: real-time trading dashboard end-to-end, timed at 15 minutes",
          "System design: real-time trading dashboard từ đầu đến cuối, bấm giờ 15 phút",
          45,
          "critical",
          ["isb-sd1", ...q(37)],
        ),
        task(
          "7d-d6-t4",
          "Platform topics: monorepo vs microfrontends, design system and WCAG for data grids, frontend platform scenario",
          "Chủ đề platform: monorepo vs microfrontend, design system và WCAG cho data grid, bài system design frontend platform",
          40,
          "high",
          ["isb-sd4", ...q(39, 40)],
        ),
        task(
          "7d-d6-t5",
          "Resilience, observability, fintech security and Rust/Python API contracts",
          "Resilience, observability, bảo mật fintech và API contract với Rust/Python",
          40,
          "high",
          q(41, 42, 43, 44),
        ),
      ],
    },
    {
      day: 7,
      focus: {
        en: "Testing, Python/Rust/Linux, STAR stories and the final mock interview.",
        vi: "Testing, Python/Rust/Linux, câu chuyện STAR và buổi mock interview cuối cùng.",
      },
      tasks: [
        task(
          "7d-d7-t1",
          "Testing strategy for streaming UIs, RTL with fake timers, Playwright WebSocket routing; add one RTL and one Playwright test to the practice project",
          "Chiến lược test UI streaming, RTL với fake timer, Playwright routing WebSocket; thêm một test RTL và một test Playwright vào practice project",
          45,
          "high",
          q(45, 46, 47),
        ),
        task(
          "7d-d7-t2",
          "Python for frontend engineers, Rust awareness, Linux and CI/CD debugging",
          "Python cho frontend engineer, hiểu biết về Rust, Linux và debug CI/CD",
          30,
          "medium",
          q(48, 49, 50),
        ),
        task(
          "7d-d7-t3",
          "Coding: throttle/debounce and sliding-window moving average / VWAP",
          "Coding: throttle/debounce và moving average / VWAP với sliding window",
          35,
          "medium",
          q(51, 54),
        ),
        task(
          "7d-d7-t4",
          "Behavioral: rehearse all six STAR answers aloud; fill the disagreement template with your own real story",
          "Behavioral: luyện nói cả sáu câu STAR; điền template tranh luận kỹ thuật bằng câu chuyện thật của bạn",
          35,
          "high",
          q(56, 57, 58, 59, 60, 61),
        ),
        task(
          "7d-d7-t5",
          "Final mock interview (45 minutes) followed by a full flashcard pass on cards marked for review",
          "Mock interview cuối cùng (45 phút), sau đó ôn toàn bộ flashcard đã đánh dấu cần ôn lại",
          60,
          "critical",
          [...q(1, 5, 11, 13, 21, 31), "isb-sd1", ...q(56)],
        ),
      ],
    },
  ],
};

export const isbStudyPlans: StudyPlan[] = [oneDay, threeDay, sevenDay];
