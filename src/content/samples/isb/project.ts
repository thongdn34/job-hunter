import type { PracticeProject } from "@/domain/package/schema";

/**
 * Section 12 — Practical preparation project for the ISB Vietnam Senior Front-End role.
 *
 * Targets the largest gaps from the match analysis: no production trading / Rust / WebGL
 * experience, and only theoretical depth on high-frequency streaming, virtualization at scale,
 * canvas charting and long-session memory management. All numbers below are TARGETS to hit
 * and measure while building — not claims about past work.
 */
export const isbProject: PracticeProject = {
  name: "Real-time Market Dashboard",
  objective: {
    en: "Build a small but production-shaped real-time market dashboard in about one to two weeks of evenings: a mock exchange feed streams thousands of ticks per second over WebSocket and SSE, and a React + TypeScript client keeps a watchlist, a live candlestick chart, an order book and a 100k-row virtualized trade blotter responsive at 60 fps with bounded memory. The goal is to turn theoretical knowledge of streaming, rendering and trading concepts into something you have actually built, measured and can talk about honestly in the ISB interview as a personal practice project.",
    vi: 'Xây một dashboard thị trường real-time nhỏ nhưng có "hình dáng" production trong khoảng một đến hai tuần buổi tối: một mock exchange feed stream hàng nghìn tick mỗi giây qua WebSocket và SSE, và client React + TypeScript giữ cho watchlist, candlestick chart live, order book và trade blotter virtualized 100k dòng luôn mượt ở 60 fps với memory có giới hạn. Mục tiêu là biến kiến thức lý thuyết về streaming, rendering và trading thành thứ bạn đã thực sự xây, đo đạc và có thể nói một cách trung thực trong buổi phỏng vấn ISB như một dự án luyện tập cá nhân.',
  },
  targetGaps: [
    "High-frequency data streaming (batching, conflation, backpressure) — theoretical only today",
    "WebSocket vs SSE side by side, reconnection with backoff, sequence numbers and gap recovery",
    "Virtualized tables with 100k+ rows and live updates",
    "Canvas-based financial charting (candlesticks, partial candles)",
    "Trading concepts: order book, bid/ask/spread, OHLC, order lifecycle",
    "Integration with Python and Rust backends (no production Rust experience)",
    "Memory management and leak detection in long-running sessions",
    "Web Workers for off-main-thread parsing and aggregation",
    "Performance measurement: React Profiler, Performance panel, render counts, INP",
  ],
  techStack: [
    {
      name: "React 19 + TypeScript + Vite",
      reason: {
        en: "Matches the JD's core stack; Vite gives a fast dev loop. A client-only SPA keeps the focus on rendering and streaming rather than server rendering concerns.",
        vi: "Khớp với stack cốt lõi trong JD; Vite cho vòng lặp dev nhanh. SPA chỉ chạy client giúp tập trung vào rendering và streaming thay vì các vấn đề server rendering.",
      },
    },
    {
      name: "Zustand (with selectors and transient subscribe)",
      reason: {
        en: "Zustand is one of the state libraries named in the JD. Fine-grained selectors and subscribe-without-render are exactly the techniques needed for high-frequency updates.",
        vi: "Zustand là một trong các thư viện state được nêu trong JD. Selector chi tiết và subscribe mà không re-render chính là kỹ thuật cần cho update tần suất cao.",
      },
    },
    {
      name: "TanStack Query",
      reason: {
        en: "Handles REST snapshots (instrument list, historical candles, initial order book) with caching; live deltas are merged via setQueryData or kept in Zustand — a deliberate split you can explain. Builds on real Persefoni TanStack Query experience.",
        vi: "Xử lý REST snapshot (danh sách instrument, nến lịch sử, order book ban đầu) có caching; delta live được merge bằng setQueryData hoặc giữ trong Zustand — một cách chia tách có chủ đích mà bạn giải thích được. Dựa trên kinh nghiệm TanStack Query thật ở Persefoni.",
      },
    },
    {
      name: "Python FastAPI mock feed (WebSocket + SSE + REST)",
      reason: {
        en: "The JD's backends are Python and Rust. A FastAPI service with a random-walk price generator lets you practise reading and writing async Python, Pydantic models and both streaming transports.",
        vi: "Backend trong JD là Python và Rust. Một service FastAPI với bộ sinh giá random-walk giúp bạn luyện đọc và viết async Python, Pydantic model và cả hai transport streaming.",
      },
    },
    {
      name: "Rust + axum + tokio (optional stretch feed)",
      reason: {
        en: "A tiny Rust WebSocket server emitting the same message schema gives hands-on Rust exposure and lets you compare throughput — framed honestly as a learning exercise, not production experience.",
        vi: "Một WebSocket server Rust nhỏ phát cùng schema message giúp bạn có trải nghiệm Rust thực tế và so sánh throughput — trình bày trung thực là bài tập học, không phải kinh nghiệm production.",
      },
    },
    {
      name: "Zod + JSON Schema (shared message contract)",
      reason: {
        en: "One versioned message contract with discriminated unions on the client and Pydantic on the server; practises schema evolution across language boundaries and cheap validation on hot paths.",
        vi: "Một message contract có version, dùng discriminated union ở client và Pydantic ở server; luyện schema evolution giữa các ngôn ngữ và validation nhẹ trên hot path.",
      },
    },
    {
      name: "Web Worker (Comlink optional)",
      reason: {
        en: "Moves JSON parsing, conflation and candle aggregation off the main thread so React only receives small batched snapshots.",
        vi: "Chuyển JSON parsing, conflation và gom nến ra khỏi main thread để React chỉ nhận các snapshot nhỏ đã được batch.",
      },
    },
    {
      name: "TanStack Virtual",
      reason: {
        en: "Headless virtualization for the 100k-row blotter and the order book ladder; you control row rendering, sticky headers and scroll anchoring yourself.",
        vi: "Virtualization dạng headless cho blotter 100k dòng và order book ladder; bạn tự kiểm soát việc render dòng, sticky header và giữ vị trí scroll.",
      },
    },
    {
      name: "TradingView Lightweight Charts + a hand-written canvas depth chart",
      reason: {
        en: "Lightweight Charts is named in the JD's preferred skills and is canvas-based; writing one small chart by hand on canvas proves you understand what the library does underneath.",
        vi: "Lightweight Charts có trong preferred skills của JD và dựa trên canvas; tự viết một chart nhỏ bằng canvas chứng minh bạn hiểu thư viện làm gì bên dưới.",
      },
    },
    {
      name: "Vitest + React Testing Library + Playwright",
      reason: {
        en: "Covers the JD's unit, integration and E2E expectations; Playwright's WebSocket routing lets you script deterministic feeds for streaming UI tests.",
        vi: "Đáp ứng kỳ vọng unit, integration và E2E trong JD; tính năng WebSocket routing của Playwright cho phép tạo feed có thể dự đoán để test UI streaming.",
      },
    },
    {
      name: "Docker Compose + GitHub Actions on Linux",
      reason: {
        en: "Runs the feed and the app together and executes tests in a Linux CI runner — practising the Linux build environment the JD requires.",
        vi: "Chạy feed và app cùng nhau, thực thi test trên Linux CI runner — luyện môi trường build Linux mà JD yêu cầu.",
      },
    },
  ],
  architectureDiagram: {
    kind: "flowchart",
    code: `flowchart LR
  PY["Python FastAPI mock feed"]
  RS["Rust axum feed - optional"]
  REST["REST snapshots"]
  WS["WebSocket stream"]
  SSE["SSE stream"]
  WK["Web Worker: parse, conflate, aggregate candles"]
  RAF["rAF flush loop"]
  ZS["Zustand live store"]
  TQ["TanStack Query cache"]
  WL["Watchlist"]
  CH["Canvas candlestick chart"]
  OB["Order book ladder"]
  BL["Virtualized trade blotter"]
  PY --> REST
  PY --> WS
  PY --> SSE
  RS --> WS
  WS --> WK
  SSE --> WK
  WK --> RAF
  RAF --> ZS
  REST --> TQ
  TQ --> CH
  ZS --> WL
  ZS --> CH
  ZS --> OB
  ZS --> BL`,
    caption: {
      en: "Python (and optional Rust) feeds stream ticks over WebSocket or SSE into a Web Worker that parses, conflates and aggregates; a requestAnimationFrame loop flushes one batch per frame into Zustand, while REST snapshots live in TanStack Query. Components subscribe with narrow selectors.",
      vi: "Feed Python (và Rust tùy chọn) stream tick qua WebSocket hoặc SSE vào một Web Worker để parse, conflate và gom nến; vòng lặp requestAnimationFrame flush mỗi frame một batch vào Zustand, còn REST snapshot nằm trong TanStack Query. Các component subscribe bằng selector hẹp.",
    },
  },
  features: [
    {
      id: "feat-1",
      title: {
        en: "Mock market feed: random-walk prices for ~50 instruments, configurable tick rate (10 to 5,000 msgs/sec), sequence numbers, WebSocket + SSE + REST snapshot endpoints",
        vi: "Mock market feed: giá random-walk cho khoảng 50 instrument, tần suất tick cấu hình được (10 tới 5.000 msg/giây), sequence number, endpoint WebSocket + SSE + REST snapshot",
      },
      priority: "critical",
    },
    {
      id: "feat-2",
      title: {
        en: "Resilient connection manager: exponential backoff with jitter, resubscribe on reconnect, heartbeat and stale-data indicator, transport toggle WebSocket vs SSE",
        vi: "Connection manager bền vững: exponential backoff có jitter, resubscribe khi reconnect, heartbeat và chỉ báo dữ liệu stale, nút chuyển transport WebSocket hoặc SSE",
      },
      priority: "critical",
    },
    {
      id: "feat-3",
      title: {
        en: "Worker-based ingestion: parse and conflate ticks per instrument off the main thread, flush one batch per animation frame",
        vi: "Ingestion bằng Worker: parse và conflate tick theo từng instrument ngoài main thread, flush mỗi animation frame một batch",
      },
      priority: "critical",
    },
    {
      id: "feat-4",
      title: {
        en: "Live watchlist with last price, change %, bid/ask and up/down flash that does not rely on color alone",
        vi: "Watchlist live với giá cuối, % thay đổi, bid/ask và hiệu ứng nháy tăng/giảm không chỉ dựa vào màu sắc",
      },
      priority: "high",
    },
    {
      id: "feat-5",
      title: {
        en: "Order book ladder: snapshot + delta application, size 0 removes a level, top N levels, spread and cumulative depth, gap detection triggers resync",
        vi: "Order book ladder: áp snapshot + delta, size 0 thì xóa level, top N level, spread và depth cộng dồn, phát hiện gap thì resync",
      },
      priority: "critical",
    },
    {
      id: "feat-6",
      title: {
        en: "Candlestick chart: historical candles from REST plus a live partial candle aggregated from ticks, selectable intervals (1s, 1m, 5m)",
        vi: "Candlestick chart: nến lịch sử từ REST cộng với nến đang hình thành gom từ tick, chọn được interval (1s, 1m, 5m)",
      },
      priority: "high",
    },
    {
      id: "feat-7",
      title: {
        en: "Virtualized trade blotter: 100k+ rows in a ring buffer, sticky header, sort and filter, scroll position stays stable while new trades arrive",
        vi: "Trade blotter virtualized: hơn 100k dòng trong ring buffer, sticky header, sort và filter, vị trí scroll giữ ổn định khi có trade mới",
      },
      priority: "critical",
    },
    {
      id: "feat-8",
      title: {
        en: "Simulated order ticket: market and limit orders with an optimistic pending state, idempotency key and lifecycle states (new, partially filled, filled, rejected, cancelled) driven by server events",
        vi: "Order ticket giả lập: lệnh market và limit với trạng thái pending optimistic, idempotency key và các trạng thái vòng đời (new, partially filled, filled, rejected, cancelled) do event từ server điều khiển",
      },
      priority: "medium",
    },
    {
      id: "feat-9",
      title: {
        en: "Performance HUD: FPS, long tasks, messages/sec in vs flushes/sec out, buffer sizes, JS heap (where available), per-component render counts",
        vi: "Performance HUD: FPS, long task, số message/giây vào so với số lần flush/giây ra, kích thước buffer, JS heap (nếu trình duyệt hỗ trợ), số lần render theo từng component",
      },
      priority: "high",
    },
    {
      id: "feat-10",
      title: {
        en: 'Backpressure simulation: a "slow consumer" switch that throttles the client, showing conflation, dropped-update counters and a degraded-mode banner',
        vi: 'Mô phỏng backpressure: công tắc "slow consumer" làm chậm client, hiển thị conflation, bộ đếm update bị bỏ và banner chế độ degraded',
      },
      priority: "medium",
    },
    {
      id: "feat-11",
      title: {
        en: "Keyboard-accessible layout: grid navigation with arrow keys, ARIA roles for the blotter, live-region announcements throttled for screen readers",
        vi: "Layout dùng được bằng bàn phím: điều hướng grid bằng phím mũi tên, ARIA role cho blotter, live-region thông báo cho screen reader có throttle",
      },
      priority: "medium",
    },
    {
      id: "feat-12",
      title: {
        en: "Stretch: Rust axum feed with the same schema, and an optional binary encoding (MessagePack or protobuf) to compare payload size and parse cost",
        vi: "Mở rộng: feed Rust axum cùng schema, và encoding binary tùy chọn (MessagePack hoặc protobuf) để so sánh kích thước payload và chi phí parse",
      },
      priority: "low",
    },
  ],
  implementationChecklist: [
    {
      id: "proj-1",
      text: {
        en: "Define the message contract: a TypeScript discriminated union (snapshot, delta, trade, heartbeat, orderEvent) with a version field and a sequence number, plus matching Pydantic models.",
        vi: "Định nghĩa message contract: discriminated union TypeScript (snapshot, delta, trade, heartbeat, orderEvent) có trường version và sequence number, cùng các Pydantic model tương ứng.",
      },
    },
    {
      id: "proj-2",
      text: {
        en: "Build the FastAPI feed: async random-walk generator, WebSocket endpoint with subscribe/unsubscribe, SSE endpoint, REST snapshot and candle history endpoints, configurable tick rate.",
        vi: "Xây FastAPI feed: async random-walk generator, endpoint WebSocket có subscribe/unsubscribe, endpoint SSE, endpoint REST cho snapshot và lịch sử nến, tần suất tick cấu hình được.",
      },
    },
    {
      id: "proj-3",
      text: {
        en: "Scaffold the Vite + React + TypeScript app with strict mode, path aliases, ESLint and a dashboard layout shell.",
        vi: "Khởi tạo app Vite + React + TypeScript với strict mode, path alias, ESLint và khung layout dashboard.",
      },
    },
    {
      id: "proj-4",
      text: {
        en: "Write the connection manager as a framework-free class: state machine (connecting, open, reconnecting, closed), backoff with jitter, heartbeat timeout, resubscribe and a single multiplexed connection.",
        vi: "Viết connection manager dạng class không phụ thuộc framework: state machine (connecting, open, reconnecting, closed), backoff có jitter, heartbeat timeout, resubscribe và một kết nối multiplexed duy nhất.",
      },
    },
    {
      id: "proj-5",
      text: {
        en: "Move parsing and per-instrument conflation into a Web Worker; post one batched update per frame (or on a fixed interval) to the main thread.",
        vi: "Đưa parsing và conflation theo instrument vào Web Worker; mỗi frame (hoặc theo chu kỳ cố định) chỉ post một batch update về main thread.",
      },
    },
    {
      id: "proj-6",
      text: {
        en: "Create the Zustand live store with normalized state keyed by instrument id; expose narrow selectors and a transient subscribe path for canvas consumers.",
        vi: "Tạo Zustand live store với state normalized theo instrument id; cung cấp selector hẹp và đường subscribe transient cho các consumer dùng canvas.",
      },
    },
    {
      id: "proj-7",
      text: {
        en: "Load snapshots with TanStack Query, buffer live deltas until the snapshot arrives, then apply deltas whose sequence is newer than the snapshot.",
        vi: "Tải snapshot bằng TanStack Query, buffer các delta live cho tới khi có snapshot, sau đó chỉ áp các delta có sequence mới hơn snapshot.",
      },
    },
    {
      id: "proj-8",
      text: {
        en: "Implement the order book reducer (sorted bids and asks, size 0 removes a level, top N) as a pure function with unit tests, then render the ladder with memoized rows.",
        vi: "Cài đặt reducer cho order book (bid và ask đã sort, size 0 thì xóa level, top N) dưới dạng pure function có unit test, rồi render ladder với các dòng được memo.",
      },
    },
    {
      id: "proj-9",
      text: {
        en: "Implement tick-to-candle aggregation in the worker (bucket by interval start in UTC, update the partial candle) and wire it to Lightweight Charts via series.update.",
        vi: "Cài đặt gom tick thành nến trong worker (chia bucket theo thời điểm bắt đầu interval theo UTC, cập nhật nến đang hình thành) và nối vào Lightweight Charts qua series.update.",
      },
    },
    {
      id: "proj-10",
      text: {
        en: "Draw a small depth chart directly on canvas: handle devicePixelRatio, redraw only on rAF when data is dirty, no per-tick React renders.",
        vi: "Tự vẽ một depth chart nhỏ trực tiếp trên canvas: xử lý devicePixelRatio, chỉ vẽ lại trong rAF khi dữ liệu thay đổi, không re-render React theo từng tick.",
      },
    },
    {
      id: "proj-11",
      text: {
        en: "Build the trade blotter with TanStack Virtual over a fixed-capacity ring buffer; keep the scroll anchored when rows are prepended and the user is not at the top.",
        vi: "Xây trade blotter bằng TanStack Virtual trên một ring buffer dung lượng cố định; giữ nguyên vị trí scroll khi thêm dòng mới ở đầu mà user không đứng ở trên cùng.",
      },
    },
    {
      id: "proj-12",
      text: {
        en: "Add the simulated order ticket: optimistic pending row, idempotency key, reconcile with server order events, roll back on rejection.",
        vi: "Thêm order ticket giả lập: dòng pending optimistic, idempotency key, đối chiếu với order event từ server, rollback khi bị reject.",
      },
    },
    {
      id: "proj-13",
      text: {
        en: "Add the performance HUD and React Profiler instrumentation; record a baseline before any optimisation so improvements are measured, not guessed.",
        vi: "Thêm performance HUD và đo bằng React Profiler; ghi lại baseline trước khi tối ưu để mọi cải thiện đều được đo, không phải đoán.",
      },
    },
    {
      id: "proj-14",
      text: {
        en: "Run a 30-minute soak test at high tick rate, take heap snapshots at start and end, and fix anything that grows (listeners, buffers, detached nodes).",
        vi: "Chạy soak test 30 phút ở tần suất tick cao, chụp heap snapshot lúc đầu và lúc cuối, sửa mọi thứ tăng dần (listener, buffer, detached node).",
      },
    },
    {
      id: "proj-15",
      text: {
        en: "Write unit, integration and Playwright E2E tests (see testing requirements) and run them in GitHub Actions on Ubuntu with the feed in Docker Compose.",
        vi: "Viết unit, integration và Playwright E2E test (xem phần yêu cầu testing) và chạy trên GitHub Actions với Ubuntu, feed chạy trong Docker Compose.",
      },
    },
    {
      id: "proj-16",
      text: {
        en: "Stretch: port the feed to Rust with axum and tokio using the same JSON contract; optionally add a binary encoding behind a version flag and compare parse cost in the worker.",
        vi: "Mở rộng: viết lại feed bằng Rust với axum và tokio, dùng cùng JSON contract; tùy chọn thêm encoding binary sau một version flag và so sánh chi phí parse trong worker.",
      },
    },
    {
      id: "proj-17",
      text: {
        en: "Write a short README with an architecture diagram, measured results and trade-offs — this becomes your talking material for system design and behavioral questions.",
        vi: "Viết README ngắn gồm sơ đồ kiến trúc, kết quả đo được và các trade-off — đây sẽ là chất liệu để nói trong câu hỏi system design và behavioral.",
      },
    },
  ],
  testingRequirements: [
    {
      en: "Unit tests (Vitest) for every pure function: order book delta application, candle aggregation including interval boundaries and time zones, ring buffer wrap-around, backoff calculation, sequence-gap detection.",
      vi: "Unit test (Vitest) cho mọi pure function: áp delta order book, gom nến bao gồm ranh giới interval và time zone, ring buffer khi quay vòng, tính backoff, phát hiện gap sequence.",
    },
    {
      en: "Connection manager tests with a mock WebSocket and fake timers: reconnect after close, jittered delay stays within bounds, resubscribe happens once, heartbeat timeout marks data as stale.",
      vi: "Test connection manager với mock WebSocket và fake timer: reconnect sau khi đóng, delay có jitter nằm trong giới hạn, resubscribe chỉ xảy ra một lần, heartbeat timeout đánh dấu dữ liệu là stale.",
    },
    {
      en: "React Testing Library integration tests: watchlist updates from a scripted feed, connection-status banner states, order ticket optimistic state and rollback — queries by role and accessible name, no arbitrary sleeps.",
      vi: "Integration test bằng React Testing Library: watchlist cập nhật từ feed có kịch bản, các trạng thái banner kết nối, trạng thái optimistic và rollback của order ticket — query theo role và accessible name, không dùng sleep tùy ý.",
    },
    {
      en: "Render-count assertions: a price tick for one instrument must not re-render other watchlist rows or the blotter (via React Profiler onRender or a render counter).",
      vi: "Kiểm tra số lần render: một tick giá của một instrument không được làm re-render các dòng watchlist khác hay blotter (qua React Profiler onRender hoặc bộ đếm render).",
    },
    {
      en: "Playwright E2E with WebSocket routing (page.routeWebSocket) to inject deterministic messages, a dropped connection and a sequence gap; assert reconnection, resync and that the blotter keeps its scroll position.",
      vi: "Playwright E2E dùng WebSocket routing (page.routeWebSocket) để bơm message có thể dự đoán, mô phỏng mất kết nối và gap sequence; kiểm tra reconnect, resync và blotter giữ nguyên vị trí scroll.",
    },
    {
      en: "Contract test: sample messages from the Python (and Rust) feed validate against the shared schema, so a backend change that breaks the frontend fails in CI.",
      vi: "Contract test: các message mẫu từ feed Python (và Rust) phải pass schema dùng chung, để thay đổi backend làm hỏng frontend sẽ fail ngay trong CI.",
    },
    {
      en: "Accessibility checks with axe in Playwright and a keyboard-only walkthrough of the watchlist, blotter and order ticket.",
      vi: "Kiểm tra accessibility bằng axe trong Playwright và thao tác chỉ bằng bàn phím qua watchlist, blotter và order ticket.",
    },
  ],
  performanceRequirements: [
    {
      en: "Target: hold about 60 fps (16.7 ms frame budget) with the feed at 2,000+ messages/sec; no main-thread long tasks over 50 ms during steady streaming.",
      vi: "Target: giữ khoảng 60 fps (frame budget 16,7 ms) khi feed ở mức 2.000+ message/giây; không có long task nào trên main thread vượt 50 ms khi đang stream ổn định.",
    },
    {
      en: "Target: at most one store flush per animation frame, regardless of incoming message rate; the HUD shows messages in vs flushes out.",
      vi: "Target: tối đa một lần flush store mỗi animation frame, bất kể tần suất message vào; HUD hiển thị message vào so với số lần flush ra.",
    },
    {
      en: "Target: a tick for one instrument re-renders only that instrument's row and the components that display it; the blotter renders only visible rows plus a small overscan.",
      vi: "Target: một tick của một instrument chỉ re-render dòng của instrument đó và các component đang hiển thị nó; blotter chỉ render các dòng đang thấy cộng một ít overscan.",
    },
    {
      en: "Target: memory stays flat within a fixed cap (for example under ~150 MB JS heap) across a 30-minute soak test — buffers are bounded and heap snapshots show no growing listeners or detached DOM.",
      vi: "Target: memory đi ngang trong một ngưỡng cố định (ví dụ dưới khoảng 150 MB JS heap) suốt soak test 30 phút — buffer có giới hạn và heap snapshot không cho thấy listener hay detached DOM tăng dần.",
    },
    {
      en: "Target: INP under 200 ms for typing in the instrument search and switching chart intervals while streaming (use useDeferredValue or useTransition where needed).",
      vi: "Target: INP dưới 200 ms khi gõ ô tìm instrument và đổi interval chart trong lúc đang stream (dùng useDeferredValue hoặc useTransition khi cần).",
    },
    {
      en: "Target: scrolling the 100k-row blotter stays smooth while new trades arrive, with a constant number of DOM rows.",
      vi: "Target: cuộn blotter 100k dòng vẫn mượt khi có trade mới, số dòng DOM luôn cố định.",
    },
    {
      en: 'Record every result as "measured on my machine with these settings" — these are practice targets, not claims about any past employer\'s system.',
      vi: 'Ghi lại mọi kết quả theo dạng "đo trên máy của tôi với cấu hình này" — đây là target luyện tập, không phải tuyên bố về hệ thống của bất kỳ công ty cũ nào.',
    },
  ],
  learningOutcomes: [
    {
      en: "Explain from first-hand practice how batching, conflation and requestAnimationFrame flushing keep a UI responsive under high-frequency data.",
      vi: "Giải thích từ trải nghiệm thực tế cách batching, conflation và flush bằng requestAnimationFrame giữ UI mượt khi dữ liệu tần suất cao.",
    },
    {
      en: "Compare WebSocket and SSE with concrete trade-offs you observed: reconnection behaviour, bidirectional needs, proxies, and binary support.",
      vi: "So sánh WebSocket và SSE bằng các trade-off cụ thể bạn đã quan sát: cách reconnect, nhu cầu hai chiều, proxy và hỗ trợ binary.",
    },
    {
      en: "Implement and defend snapshot + delta with sequence numbers, gap detection and resync for an order book.",
      vi: "Cài đặt và bảo vệ được cách làm snapshot + delta với sequence number, phát hiện gap và resync cho order book.",
    },
    {
      en: "Build a virtualized table and a canvas chart and explain when DOM, SVG, canvas or WebGL is the right choice.",
      vi: "Xây được bảng virtualized và chart canvas, đồng thời giải thích khi nào nên dùng DOM, SVG, canvas hay WebGL.",
    },
    {
      en: "Find and fix memory leaks using heap snapshots, and design bounded buffers for long-running trading sessions.",
      vi: "Tìm và sửa memory leak bằng heap snapshot, và thiết kế buffer có giới hạn cho các phiên trading chạy lâu.",
    },
    {
      en: "Read and write a small async FastAPI service and a minimal Rust axum server, and keep a typed contract in sync across TypeScript, Python and Rust.",
      vi: "Đọc và viết được một service FastAPI async nhỏ và một Rust axum server tối giản, đồng thời giữ contract có type đồng bộ giữa TypeScript, Python và Rust.",
    },
    {
      en: "Speak confidently about order books, spreads, OHLC candles and order lifecycle states as a frontend engineer — while being honest that this is a practice project, not production trading experience.",
      vi: "Tự tin nói về order book, spread, nến OHLC và các trạng thái vòng đời lệnh dưới góc nhìn frontend engineer — đồng thời trung thực rằng đây là dự án luyện tập, không phải kinh nghiệm trading production.",
    },
    {
      en: "Test streaming UIs deterministically with fake timers, mock sockets and Playwright WebSocket routing in a Linux CI pipeline.",
      vi: "Test UI streaming một cách ổn định bằng fake timer, mock socket và Playwright WebSocket routing trong pipeline CI chạy Linux.",
    },
  ],
};
