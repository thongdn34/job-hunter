import type { SystemDesignScenario } from "@/domain/package/schema";

/**
 * Section 8 — Frontend system design scenarios for the ISB Vietnam sample.
 *
 * Grounding rules:
 * - The JD (verified) names TypeScript/React, Next.js, Zustand/Redux Toolkit/Jotai, WebSockets + SSE,
 *   REST from Rust/Python backends, virtualized tables, memory-leak detection, canvas/SVG charting,
 *   accessible component libraries, Jest/RTL/Playwright/Cypress and Linux build environments.
 * - The backend topology, message shapes and volumes below are ASSUMPTIONS used to make the design
 *   concrete. Confirm them in the interview with the clarifying questions.
 * - Candidate experience is referenced only where it is real (Persefoni, Ninja Van, NAB). There is no
 *   production trading experience: trading-specific parts are a recommended approach.
 * - Numbers such as "16.7 ms per frame at 60 Hz" are general technical facts, not candidate metrics.
 */
export const isbSystemDesign: SystemDesignScenario[] = [
  /* ================================================================== */
  /* SD1 — Real-time trading dashboard                                    */
  /* ================================================================== */
  {
    id: "isb-sd1",
    number: 1,
    title: {
      en: "Design a real-time trading dashboard (watchlist, chart, order book, blotter)",
      vi: "Thiết kế dashboard giao dịch thời gian thực (watchlist, biểu đồ, order book, blotter)",
    },
    prompt: {
      en: "Design the frontend of a trading analytics dashboard for internal power users. One screen shows a watchlist of ~200 instruments with live prices, a candlestick chart for the selected instrument, a live order book (depth), an order ticket, and a blotter of the user's orders and trades. Market data arrives from Rust/Python backend services over WebSocket or SSE at high frequency. Walk me through the architecture, data flow, state management and how you keep the UI smooth.",
      vi: "Thiết kế phần frontend của một dashboard phân tích giao dịch cho người dùng nội bộ (power user). Một màn hình gồm watchlist khoảng 200 mã với giá live, biểu đồ nến cho mã đang chọn, order book (độ sâu thị trường) live, order ticket để đặt lệnh, và blotter hiển thị lệnh và giao dịch của người dùng. Dữ liệu thị trường đến từ các service backend Rust/Python qua WebSocket hoặc SSE với tần suất cao. Hãy trình bày kiến trúc, luồng dữ liệu, quản lý state và cách giữ UI mượt.",
    },
    functionalRequirements: [
      {
        en: "Watchlist: show last price, change, change %, bid/ask for ~200 instruments, updating live; users can add, remove and reorder symbols.",
        vi: "Watchlist: hiển thị giá khớp gần nhất, thay đổi, % thay đổi, bid/ask cho khoảng 200 mã, cập nhật live; người dùng có thể thêm, xoá và sắp xếp lại mã.",
      },
      {
        en: "Candlestick chart for the selected instrument: historical candles via REST plus a live partial candle built from the trade stream; interval switching (1m, 5m, 1h, 1D).",
        vi: "Biểu đồ nến cho mã đang chọn: nến lịch sử lấy qua REST cộng với nến đang hình thành (partial candle) dựng từ luồng trade; đổi khung thời gian (1m, 5m, 1h, 1D).",
      },
      {
        en: "Order book: top N bid/ask levels with size and cumulative depth, highlighting levels that changed.",
        vi: "Order book: N mức giá bid/ask tốt nhất với khối lượng và độ sâu luỹ kế, highlight các mức vừa thay đổi.",
      },
      {
        en: "Order ticket: place market/limit/stop orders with client-side validation (tick size, lot size, buying power hint) and clear pending/accepted/rejected feedback.",
        vi: "Order ticket: đặt lệnh market/limit/stop, validate phía client (tick size, lot size, gợi ý sức mua) và phản hồi rõ ràng các trạng thái pending/accepted/rejected.",
      },
      {
        en: "Blotter: the user's open orders, fills and positions, updated in real time from execution events, sortable and filterable.",
        vi: "Blotter: lệnh đang mở, lệnh đã khớp và vị thế của người dùng, cập nhật real-time từ execution event, có thể sort và filter.",
      },
      {
        en: "Connection status indicator and per-widget stale-data warnings when a feed stops updating.",
        vi: "Chỉ báo trạng thái kết nối và cảnh báo dữ liệu cũ (stale) cho từng widget khi feed ngừng cập nhật.",
      },
      {
        en: "Layout persistence: users can resize/rearrange panels and the layout is restored on reload.",
        vi: "Lưu layout: người dùng có thể resize/sắp xếp lại các panel và layout được khôi phục khi tải lại trang.",
      },
    ],
    nonFunctionalRequirements: [
      {
        en: "Smoothness: keep the main thread under the frame budget (about 16.7 ms at 60 Hz); no long tasks over 50 ms during normal streaming.",
        vi: "Độ mượt: giữ main thread trong frame budget (khoảng 16.7 ms ở 60 Hz); không có long task quá 50 ms khi stream bình thường.",
      },
      {
        en: "Input responsiveness: typing in the order ticket and clicking stay responsive under peak load (good INP).",
        vi: "Độ phản hồi: gõ vào order ticket và click vẫn phản hồi nhanh khi tải cao nhất (INP tốt).",
      },
      {
        en: "Correctness: never show a price out of order or silently drop a gap; stale data must be visibly marked.",
        vi: "Tính đúng đắn: không bao giờ hiển thị giá sai thứ tự hoặc âm thầm bỏ qua gap; dữ liệu stale phải được đánh dấu rõ ràng.",
      },
      {
        en: "Stable memory over an 8–10 hour trading session: bounded buffers, no leaked subscriptions.",
        vi: "Bộ nhớ ổn định trong phiên làm việc 8–10 giờ: buffer có giới hạn, không rò rỉ subscription.",
      },
      {
        en: "Resilience: automatic reconnect with resubscribe and resync, without a page reload.",
        vi: "Khả năng phục hồi: tự động reconnect, resubscribe và resync mà không cần tải lại trang.",
      },
      {
        en: "Security: authenticated WebSocket, no tokens in URLs or localStorage, strict CSP.",
        vi: "Bảo mật: WebSocket có xác thực, không đặt token trong URL hay localStorage, CSP nghiêm ngặt.",
      },
      {
        en: "Accessibility: keyboard-operable ticket and grids, colour is never the only signal for up/down.",
        vi: "Accessibility: ticket và grid thao tác được bằng bàn phím, màu sắc không bao giờ là tín hiệu duy nhất cho tăng/giảm.",
      },
    ],
    clarifyingQuestions: [
      {
        en: "What are the peak message rates per channel (quotes, book, trades), and how many instruments does one user watch at once?",
        vi: "Tần suất message cao nhất cho từng kênh (quotes, book, trades) là bao nhiêu, và một người dùng theo dõi bao nhiêu mã cùng lúc?",
      },
      {
        en: "Does the backend send full snapshots or snapshot + delta with sequence numbers? Is there a resync endpoint?",
        vi: "Backend gửi full snapshot hay snapshot + delta có sequence number? Có endpoint để resync không?",
      },
      {
        en: "Is the gateway WebSocket, SSE, or both? Which streams are one-way (market data) vs two-way (order events)?",
        vi: "Gateway dùng WebSocket, SSE hay cả hai? Luồng nào là một chiều (market data), luồng nào hai chiều (order event)?",
      },
      {
        en: "Who are the users — internal traders on large multi-monitor desktops, external customers on the web portal, or both?",
        vi: "Người dùng là ai — trader nội bộ dùng desktop nhiều màn hình, khách hàng bên ngoài qua web portal, hay cả hai?",
      },
      {
        en: "What is the acceptable latency from backend event to pixel, and is 'conflated' (latest value only) display acceptable for prices?",
        vi: "Độ trễ chấp nhận được từ lúc backend phát event đến lúc hiển thị là bao nhiêu, và hiển thị kiểu 'conflated' (chỉ giá trị mới nhất) có chấp nhận được không?",
      },
      {
        en: "Is this built on Next.js, and must the dashboard support multiple browser tabs or windows per user?",
        vi: "Ứng dụng có dùng Next.js không, và dashboard có cần hỗ trợ nhiều tab hoặc nhiều cửa sổ trình duyệt cho mỗi người dùng không?",
      },
      {
        en: "What are the browser targets and hardware (corporate Linux/Windows desktops, GPU availability)?",
        vi: "Trình duyệt và phần cứng mục tiêu là gì (desktop Linux/Windows của công ty, có GPU hay không)?",
      },
    ],
    highLevelArchitecture: `**Assumed backend (confirm in interview):** Rust services publish market data, Python services expose REST for reference data, history and orders, and a streaming gateway fans data out over **WebSocket** (two-way: subscriptions + order events) and possibly **SSE** for simpler one-way feeds.

**Frontend layers:**

1. **App shell** — Next.js App Router renders the shell, auth and static reference data on the server. The trading screen itself is a **client-only island**, because everything on it is live and per-user.
2. **Streaming data layer** — one multiplexed WebSocket owned by a **Web Worker**. The worker parses, validates, applies sequence checks, conflates and batches, then posts one update per animation frame to the main thread.
3. **State** — a **Zustand live store** for hot, high-frequency data (quotes, book, live candle) read through narrow selectors; **TanStack Query** for request/response server state (history, instruments, orders snapshot). WebSocket order events are merged into the query cache with \`setQueryData\`.
4. **Widgets** — watchlist and blotter as **virtualized grids**, chart and depth on **canvas**, order ticket as a normal React form.
5. **Cross-cutting** — error boundaries per widget, connection status, telemetry.`,
    componentResponsibilities: [
      {
        name: "App shell (Next.js)",
        responsibility: {
          en: "Auth, routing, layout chrome and server-rendered reference data; mounts the trading workspace as a client-only island.",
          vi: "Xử lý auth, routing, khung layout và dữ liệu tham chiếu render phía server; mount workspace giao dịch như một client-only island.",
        },
      },
      {
        name: "StreamClient (Web Worker)",
        responsibility: {
          en: "Owns the WebSocket: connect, heartbeat, reconnect with backoff, resubscribe, parse, validate, sequence-check, conflate and batch per frame.",
          vi: "Sở hữu WebSocket: kết nối, heartbeat, reconnect với backoff, resubscribe, parse, validate, kiểm tra sequence, conflate và gom batch theo frame.",
        },
      },
      {
        name: "Subscription registry",
        responsibility: {
          en: "Ref-counts subscriptions from widgets so one symbol/channel is subscribed once and unsubscribed when the last consumer unmounts.",
          vi: "Đếm tham chiếu (ref-count) các subscription từ widget để mỗi symbol/channel chỉ subscribe một lần và unsubscribe khi consumer cuối cùng unmount.",
        },
      },
      {
        name: "Live store (Zustand)",
        responsibility: {
          en: "Holds normalized hot data keyed by symbol; applies batches in one set() call; exposes narrow selectors and transient subscribe for canvas.",
          vi: "Lưu dữ liệu nóng đã normalize theo symbol; áp dụng mỗi batch trong một lần set(); cung cấp selector hẹp và transient subscribe cho canvas.",
        },
      },
      {
        name: "Server-state cache (TanStack Query)",
        responsibility: {
          en: "History candles, instruments, orders/positions snapshots; retries, caching and invalidation after resync.",
          vi: "Nến lịch sử, danh sách mã, snapshot lệnh/vị thế; xử lý retry, cache và invalidation sau khi resync.",
        },
      },
      {
        name: "Watchlist and Blotter grids",
        responsibility: {
          en: "Virtualized rows; each row subscribes to its own symbol or order id so only changed rows re-render.",
          vi: "Các hàng được virtualize; mỗi hàng subscribe vào symbol hoặc order id của riêng nó nên chỉ hàng thay đổi mới re-render.",
        },
      },
      {
        name: "Chart and Depth (canvas)",
        responsibility: {
          en: "Imperative canvas drawing driven by requestAnimationFrame, reading the store outside React to avoid per-tick reconciliation.",
          vi: "Vẽ canvas theo kiểu imperative bằng requestAnimationFrame, đọc store bên ngoài React để tránh reconciliation mỗi tick.",
        },
      },
      {
        name: "Order ticket",
        responsibility: {
          en: "Form validation, idempotency key per submit, optimistic 'pending' row, reconciliation with execution events.",
          vi: "Validate form, tạo idempotency key cho mỗi lần submit, hiển thị hàng 'pending' lạc quan, đối chiếu với execution event.",
        },
      },
    ],
    dataFlow: `1. **Bootstrap** — the shell loads the user, instruments and saved layout. Widgets mount and register interest (\`subscribe("quotes", ["AAPL", ...])\`) with the subscription registry.
2. **Subscribe** — the worker sends one \`subscribe\` message per channel. The gateway replies with a **snapshot** carrying a sequence number, then streams **deltas**.
3. **Ingest in the worker** — every message is parsed and checked: if \`seq !== lastSeq + 1\` for that stream, the worker marks the stream *resyncing*, requests a new snapshot and drops deltas until it arrives.
4. **Conflate** — for prices, only the latest value per symbol matters inside a frame, so the worker keeps a \`Map<symbol, Quote>\` and overwrites. Trades and order events are **not** conflated; they are appended in order.
5. **Flush** — on a timer aligned to roughly once per frame, the worker posts one batch to the main thread.
6. **Apply** — the main thread applies the batch to Zustand in a single \`set()\`. Watchlist rows re-render only if their selector output changed; canvas widgets redraw in their own \`requestAnimationFrame\` loop.
7. **Orders** — the ticket \`POST\`s via REST with an idempotency key; acceptance and fills arrive later as WebSocket execution events and are merged into the TanStack Query orders cache.`,
    apiDesign: `**Streaming (WebSocket, JSON first; binary is an option later):**

\`\`\`ts
// client -> server
type ClientMsg =
  | { op: "subscribe"; reqId: string; channel: "quotes" | "book" | "trades" | "orders"; symbols?: string[] }
  | { op: "unsubscribe"; reqId: string; channel: string; symbols?: string[] }
  | { op: "resync"; channel: string; symbol: string }
  | { op: "ping"; ts: number };

// server -> client
type ServerMsg =
  | { type: "snapshot"; channel: "book"; symbol: string; seq: number; bids: [string, string][]; asks: [string, string][] }
  | { type: "delta"; channel: "book"; symbol: string; seq: number; side: "bid" | "ask"; price: string; size: string }
  | { type: "quote"; symbol: string; seq: number; bid: string; ask: string; last: string; ts: number }
  | { type: "execution"; orderId: string; clientOrderId: string; status: OrderStatus; filledQty: string; avgPx?: string }
  | { type: "pong"; ts: number }
  | { type: "error"; reqId?: string; code: string; message: string };
\`\`\`

Prices and sizes are **strings** (decimal-safe), converted to integer minor units client-side.

**REST:**

\`\`\`http
GET  /api/instruments
GET  /api/candles?symbol=AAPL&interval=1m&to=1732700000&limit=500
GET  /api/orders?status=open
POST /api/orders   Idempotency-Key: <uuid>
     { "symbol": "AAPL", "side": "buy", "type": "limit", "qty": "100", "price": "189.25", "tif": "DAY" }
  -> 202 { "orderId": "o-123", "status": "PENDING_NEW" }
\`\`\``,
    stateManagement: `I split state by **update frequency and ownership**:

- **Hot stream state → Zustand.** Quotes, book levels and the live candle change many times per second. They live in a normalized store (\`quotes: Record<symbol, Quote>\`) updated once per batch. Components read with **narrow selectors** (\`useLive(s => s.quotes[symbol]?.last)\`) so one changed symbol re-renders one row, not the whole watchlist. Canvas widgets use \`store.subscribe\` (transient updates) and never re-render through React.
- **Server state → TanStack Query.** Instruments, candle history, the initial orders/positions snapshot. It gives caching, retries and invalidation. WebSocket execution events update this cache with \`queryClient.setQueryData\`, so the blotter has one source of truth.
- **UI state → local state or a small UI store.** Selected symbol, panel layout, ticket form values. Layout is persisted to the backend (or \`localStorage\` as a convenience).
- **Derived state** (P&L, cumulative depth) is computed in selectors or in the worker, never stored twice.

The rule I'd say out loud: *never put a firehose into React context*, because every consumer would re-render on every tick.`,
    scalability: `Scalability on the frontend means **more symbols, more widgets, more tabs and more teams** without the UI degrading.

- **More symbols/rows:** virtualization keeps DOM size constant; the cost is proportional to visible rows, not total rows.
- **More messages:** conflation makes the main-thread cost proportional to *changed symbols per frame*, not messages per second. If the worker itself becomes the bottleneck, move to a binary protocol (e.g. protobuf/FlatBuffers) and ask the backend for server-side conflation or throttled channels.
- **More widgets:** the subscription registry ref-counts, so ten widgets watching AAPL still cost one server subscription.
- **More tabs:** a \`SharedWorker\` (or a leader tab elected with the Web Locks API, fanning data out over \`BroadcastChannel\`) keeps one connection per user instead of one per tab, which also protects the gateway.
- **More teams:** widgets are packages in a monorepo with a shared design system and a shared data-layer package, so a new widget plugs into the same streaming contract instead of opening its own socket.`,
    performance: `- **Off the main thread:** JSON parsing, validation and conflation run in the worker. The main thread only applies small batches.
- **Frame-aligned flushing:** one batch per frame means at most one React commit per frame for hot data. Use \`startTransition\` for non-urgent updates (e.g. re-sorting the watchlist) so input stays responsive.
- **Canvas for dense visuals:** chart and depth are drawn on canvas; React only renders the container and controls. Redraw only the dirty region or the last candle when possible.
- **Virtualized grids** with fixed row height for predictable layout; \`memo\` row components keyed by stable ids.
- **Flash-on-change via CSS classes** using \`transform\`/\`opacity\`, not layout-affecting properties.
- **Bounded memory:** ring buffers for trades and candles, capped blotter history with paging.
- **Measure:** React Profiler and Chrome Performance panel for long tasks, \`PerformanceObserver\` for long tasks/INP in production, and a synthetic load replay to test peak rates before release.`,
    security: `- **Authentication:** the WebSocket handshake uses an HttpOnly session cookie (same-site) or a short-lived token sent in the first message — never a long-lived token in the URL, because URLs end up in logs. Re-authenticate before token expiry without dropping the connection where the protocol allows it.
- **Authorization:** the server must check every subscription (entitlements per market/product) and every order; the client only hides UI.
- **Origin checks** on the WebSocket upgrade to prevent cross-site WebSocket hijacking.
- **XSS:** React escapes by default; no \`dangerouslySetInnerHTML\` for server text (instrument names, rejection messages). Strict **CSP** with \`connect-src\` limited to the gateway.
- **CSRF** for REST orders: SameSite cookies plus a CSRF token or custom header.
- **Validation:** treat stream data as untrusted; validate shape in the worker (Zod at the boundary, or lighter hand-written guards on hot paths).
- **Order safety:** confirmation for large orders, idempotency keys to avoid duplicate submissions on retry.`,
    reliability: `- **Connection lifecycle:** heartbeat (ping/pong); if no message or pong within a timeout, treat the socket as dead even if \`readyState\` says OPEN.
- **Reconnect** with exponential backoff and jitter, then **resubscribe** from the registry and **resync** from snapshots. Sequence numbers prevent showing a book built on missing deltas.
- **Stale-data UX:** each widget tracks \`lastUpdateTs\`; past a threshold it greys out and shows "Stale" so a trader never acts on a frozen price that looks live.
- **Isolation:** an error boundary per widget; a chart crash must not take down the order ticket.
- **Degraded modes:** if streaming is down, fall back to REST polling for the blotter and disable order entry or require confirmation, depending on business rules.
- **Orders are server-authoritative:** the UI shows "pending" until an execution event or REST status confirms; on reconnect it refetches open orders so nothing is lost.`,
    errorRecovery: `| Failure | Detection | Recovery |
| --- | --- | --- |
| Socket drops | \`close\` event or missed heartbeat | Backoff + jitter reconnect, resubscribe, resync snapshots, mark widgets stale meanwhile |
| Sequence gap | \`seq !== last + 1\` | Drop deltas, request snapshot for that symbol, show "resyncing" |
| Malformed message | Validation fails in worker | Drop message, count it, report to telemetry; never crash the stream |
| Main thread overloaded | Worker queue grows / long tasks | Increase conflation, lower flush rate, pause hidden widgets |
| Order POST timeout | No response | Retry with the **same** idempotency key; reconcile via execution events |
| Auth expired | 401 / close code | Refresh token, reconnect; if refresh fails, keep data read-only and prompt login |
| Widget render error | Error boundary | Show fallback with retry, log with component stack |

The key point: recovery is **automatic and visible**. The user always knows whether the data on screen is live.`,
    monitoring: `I'd monitor the dashboard as a real-time system, not just a web page:

- **Stream health (RUM):** connection state changes, reconnect count, time to resync, sequence gaps per hour, messages per second received vs applied, worker queue length.
- **Freshness:** end-to-end latency using the server timestamp in each message vs the client clock (with clock-skew correction from ping/pong).
- **Rendering:** long tasks via \`PerformanceObserver\`, INP and LCP from \`web-vitals\`, dropped frames during streaming, JS heap trend over a session (\`performance.memory\` where available) to catch leaks.
- **Errors:** Sentry (or similar) with release tags and source maps; error boundaries report widget name and the last message type.
- **Business events:** order submit → ack latency, rejection reasons, duplicate-submit attempts blocked by idempotency.

Alerts go to dashboards and on-call channels; sampling keeps telemetry volume low because the app itself is high-frequency.`,
    tradeOffs: [
      {
        decision: "WebSocket for everything vs SSE for market data + REST for orders",
        pros: "WebSocket: one connection, two-way subscriptions, binary support. SSE: simple, auto-reconnect, works well through HTTP infrastructure for one-way feeds.",
        cons: "WebSocket: you build heartbeat, reconnect and resubscribe yourself. SSE: text only, one-way, per-origin connection limits on HTTP/1.1, dynamic subscriptions need extra REST calls.",
      },
      {
        decision: "Parse and conflate in a Web Worker vs on the main thread",
        pros: "Keeps parsing and bursts off the main thread; input stays responsive; natural place for sequencing and batching.",
        cons: "postMessage copy cost, more complex debugging and testing, need a message protocol between worker and UI.",
      },
      {
        decision: "Zustand live store + TanStack Query vs a single Redux Toolkit store",
        pros: "Right tool per state type; fine-grained selectors; transient subscribe for canvas; query cache handles server-state concerns.",
        cons: "Two mental models; must define clearly which data lives where; Redux DevTools-style time travel is weaker.",
      },
      {
        decision: "Canvas chart/depth vs SVG/DOM",
        pros: "Canvas scales to thousands of points and high redraw rates without DOM cost.",
        cons: "Accessibility and hit-testing are manual; needs an accessible text alternative and custom tooltips.",
      },
      {
        decision: "Conflate prices (latest wins) vs render every tick",
        pros: "Main-thread cost bounded by changed symbols per frame; humans cannot read faster than the screen refresh anyway.",
        cons: "Intermediate ticks are not displayed; must not conflate trades, order events or anything used for audit.",
      },
    ],
    recommendedAnswer: `I'd approach this in four parts: requirements, the data path, state and rendering, and then failure handling.

First, I'd clarify the numbers: peak message rates per channel, whether the backend gives me snapshot plus delta with sequence numbers, and whether users are internal traders, external customers, or both. Those answers decide almost everything else.

Second, the data path. I'd keep one multiplexed WebSocket per user, owned by a Web Worker. The worker handles connect, heartbeat, reconnect with backoff and jitter, and resubscribe. It parses and validates every message, checks sequence numbers, and if there's a gap it requests a fresh snapshot instead of showing a broken order book. For prices it conflates, so only the latest value per symbol survives within a frame, and then it posts one batch to the main thread roughly once per frame. Trades and order events are never conflated.

Third, state and rendering. Hot data like quotes and book levels goes into a Zustand store, updated with a single set per batch, and components read it with narrow selectors, so one price change re-renders one row. Server state like candle history, instruments and the orders snapshot goes into TanStack Query, and execution events from the socket update that cache with setQueryData. The watchlist and blotter are virtualized grids; the chart and depth view are canvas, driven by requestAnimationFrame and reading the store outside React. Next.js renders the shell, but the trading workspace itself is a client-only island.

Fourth, reliability and security. Every widget tracks when it last updated and shows a clear stale state, because a frozen price that looks live is the worst failure in trading. Each widget has its own error boundary. Orders use idempotency keys and are server-authoritative: the UI shows pending until an execution event confirms. The socket is authenticated with a cookie or a short-lived token, never in the URL, and the server enforces entitlements.

Finally, I'd measure it: long tasks, INP, reconnects, sequence gaps, end-to-end latency and heap growth over a full session. I haven't built a trading screen in production, but I've worked with real-time Socket.IO at Ninja Van and TanStack Query caching at Persefoni, and this design builds on both.`,
    viExplanation: `Câu này kiểm tra xem bạn có tư duy kiến trúc frontend cho dữ liệu real-time tần suất cao hay không. Hãy trả lời theo bốn phần: requirement, đường đi của dữ liệu, state và rendering, cuối cùng là xử lý lỗi.

Ý cốt lõi là tách dữ liệu theo tần suất cập nhật. Dữ liệu "nóng" như giá và order book đi qua một WebSocket duy nhất do Web Worker quản lý. Worker lo parse, validate, kiểm tra sequence number, conflate (mỗi symbol chỉ giữ giá mới nhất trong một frame) rồi gửi một batch về main thread khoảng một lần mỗi frame. Nhờ vậy main thread không bị "ngập" và input của người dùng vẫn mượt. Lưu ý: chỉ conflate giá, không conflate trade hay order event.

Ở main thread, dữ liệu nóng nằm trong Zustand và component đọc bằng selector hẹp, nên một mã đổi giá chỉ re-render đúng một hàng. Dữ liệu server như lịch sử nến, danh sách lệnh nằm trong TanStack Query, và execution event từ socket được merge vào cache bằng setQueryData. Watchlist và blotter dùng virtualization; chart và depth vẽ bằng canvas, đọc store bên ngoài React để tránh reconciliation mỗi tick. Next.js chỉ render phần shell, còn workspace giao dịch là client-only island.

Về reliability: heartbeat để phát hiện kết nối "chết ngầm", reconnect với exponential backoff và jitter, resubscribe và resync bằng snapshot khi có gap. Mỗi widget có trạng thái stale rõ ràng — giá đứng yên nhưng trông như đang live là lỗi nguy hiểm nhất. Lệnh đặt dùng idempotency key và server là nguồn sự thật.

Khi nhắc đến kinh nghiệm, hãy nói thật: bạn chưa làm hệ thống trading trong production, nhưng đã làm real-time với Socket.IO ở Ninja Van và caching với TanStack Query ở Persefoni. Không đưa ra số liệu thành tích nào không có thật.`,
    architectureDiagram: {
      kind: "flowchart",
      caption: {
        en: "Assumed end-to-end architecture of the trading dashboard frontend",
        vi: "Kiến trúc giả định end-to-end của frontend dashboard giao dịch",
      },
      code: `flowchart LR
  MD["Market data services - Rust, assumed"] --> GW["Streaming gateway WS and SSE"]
  OMS["Order and history APIs - Python REST"] --> BFF["BFF or API gateway"]
  GW --> WK["Web Worker: parse, sequence, conflate, batch"]
  WK --> ST["Zustand live store"]
  BFF --> TQ["TanStack Query cache"]
  WK --> TQ
  ST --> WL["Watchlist - virtualized"]
  ST --> CH["Candle chart - canvas"]
  ST --> OB["Order book - canvas"]
  TQ --> BL["Blotter - virtualized"]
  TK["Order ticket"] --> BFF
  TQ --> TK`,
    },
    sequenceDiagram: {
      kind: "sequence",
      caption: { en: "Subscribe, stream, and place an order", vi: "Subscribe, nhận stream và đặt lệnh" },
      code: `sequenceDiagram
  actor U as Trader
  participant UI as React UI
  participant W as Data Worker
  participant G as WS Gateway
  participant A as Order API
  UI->>W: register interest in AAPL quotes and book
  W->>G: subscribe quotes and book for AAPL
  G-->>W: book snapshot seq 1000
  loop every incoming delta
    G-->>W: delta seq n
    W->>W: check sequence and conflate
  end
  W->>UI: one batch per animation frame
  U->>UI: submit limit buy order
  UI->>A: POST /api/orders with Idempotency-Key
  A-->>UI: 202 accepted PENDING_NEW
  G-->>W: execution event FILLED
  W->>UI: update blotter via setQueryData`,
    },
    memoryShortcut: {
      en: '"One socket, one worker, one batch per frame" — then: hot data in Zustand, server data in Query, grids virtualized, charts on canvas, stale is visible.',
      vi: '"Một socket, một worker, một batch mỗi frame" — sau đó: dữ liệu nóng ở Zustand, dữ liệu server ở Query, grid được virtualize, chart vẽ canvas, stale phải hiển thị rõ.',
    },
    followUps: [
      {
        id: "isb-sd1-f1",
        question: {
          en: "The trader opens the dashboard in three browser tabs. What changes in your design?",
          vi: "Trader mở dashboard trên ba tab trình duyệt. Thiết kế của bạn thay đổi thế nào?",
        },
        answer: {
          en: "Without changes we'd open three sockets and triple both server load and client parsing. I'd move the stream client into a SharedWorker so all tabs share one connection and one subscription registry; each tab registers its interests and receives only its own batches. Where SharedWorker isn't available, I'd elect a leader tab with BroadcastChannel and the Web Locks API, and the other tabs receive data through BroadcastChannel. When the leader closes, the lock is released and another tab takes over and resubscribes. Order submissions still go through REST from each tab, and idempotency keys protect against duplicates.",
          vi: "Nếu không thay đổi, ta sẽ mở ba socket và tăng gấp ba tải server lẫn chi phí parse phía client. Tôi sẽ chuyển stream client vào SharedWorker để mọi tab dùng chung một kết nối và một subscription registry; mỗi tab đăng ký nhu cầu của mình và chỉ nhận batch của mình. Nếu trình duyệt không hỗ trợ SharedWorker, tôi bầu một leader tab bằng BroadcastChannel và Web Locks API, các tab khác nhận dữ liệu qua BroadcastChannel. Khi leader đóng, lock được giải phóng, tab khác tiếp quản và resubscribe. Việc đặt lệnh vẫn đi qua REST từ từng tab, có idempotency key để chống trùng.",
        },
      },
      {
        id: "isb-sd1-f2",
        question: {
          en: "Profiling shows the watchlist still re-renders entirely on every batch. How do you debug and fix it?",
          vi: "Khi profiling, watchlist vẫn re-render toàn bộ mỗi batch. Bạn debug và sửa thế nào?",
        },
        answer: {
          en: "I'd open the React Profiler with 'record why each component rendered' and check what changed for the rows. The usual causes are: the list subscribes to the whole quotes object instead of the symbol list; a selector returns a new object or array each time, so the equality check always fails; or row props include an inline callback or a freshly created style object. Fixes: the list selects only the ordered list of symbol ids, each row selects its own quote with a narrow selector (useShallow when it returns an object), callbacks are stable, and rows are wrapped in memo. Then I'd re-profile under a replayed peak load to confirm only changed rows commit.",
          vi: "Tôi mở React Profiler với tuỳ chọn ghi lại lý do mỗi component render và kiểm tra cái gì thay đổi ở các hàng. Nguyên nhân thường gặp: list subscribe vào toàn bộ object quotes thay vì danh sách symbol; selector trả về object hoặc array mới mỗi lần nên so sánh bằng luôn sai; hoặc props của hàng chứa callback inline hay style object mới tạo. Cách sửa: list chỉ select danh sách id symbol đã sắp xếp, mỗi hàng select quote của riêng nó bằng selector hẹp (dùng useShallow nếu trả về object), callback ổn định, và bọc hàng bằng memo. Sau đó profile lại với tải đỉnh được replay để xác nhận chỉ hàng thay đổi mới commit.",
        },
      },
    ],
    difficulty: "expert",
    priority: "critical",
    relatedQuestionIds: [
      "isb-q01",
      "isb-q02",
      "isb-q03",
      "isb-q04",
      "isb-q13",
      "isb-q14",
      "isb-q26",
      "isb-q27",
      "isb-q28",
      "isb-q30",
      "isb-q31",
      "isb-q37",
    ],
  },

  /* ================================================================== */
  /* SD2 — Client-side streaming data layer                               */
  /* ================================================================== */
  {
    id: "isb-sd2",
    number: 2,
    title: {
      en: "Design a client-side streaming data layer (multiplexed WebSocket, workers, backpressure)",
      vi: "Thiết kế tầng dữ liệu streaming phía client (WebSocket multiplex, worker, backpressure)",
    },
    prompt: {
      en: "Several teams build widgets (prices, order book, trades, positions, alerts) that all need live data. Today each widget opens its own WebSocket and the app slows down and drops connections at market open. Design a reusable client-side streaming data layer: one connection, a subscription API for React components, off-main-thread processing, backpressure handling, and correct recovery after disconnects.",
      vi: "Nhiều team xây các widget (giá, order book, trade, vị thế, cảnh báo) đều cần dữ liệu live. Hiện tại mỗi widget tự mở một WebSocket riêng nên app bị chậm và rớt kết nối lúc thị trường mở cửa. Hãy thiết kế một tầng dữ liệu streaming phía client có thể tái sử dụng: một kết nối duy nhất, API subscription cho React component, xử lý ngoài main thread, xử lý backpressure và khôi phục đúng sau khi mất kết nối.",
    },
    functionalRequirements: [
      {
        en: "A single multiplexed connection per user session (per browser, ideally) carrying many channels and symbols.",
        vi: "Một kết nối multiplex duy nhất cho mỗi phiên người dùng (lý tưởng là mỗi trình duyệt), mang nhiều channel và symbol.",
      },
      {
        en: "A declarative React API: useStream(channel, key, selector) that subscribes on mount and unsubscribes on unmount.",
        vi: "API React dạng khai báo: useStream(channel, key, selector) tự subscribe khi mount và unsubscribe khi unmount.",
      },
      {
        en: "Ref-counted subscriptions: many consumers of the same channel/key share one server subscription.",
        vi: "Subscription có ref-count: nhiều consumer của cùng channel/key dùng chung một subscription phía server.",
      },
      {
        en: "Per-channel delivery policy: conflate (latest wins) for quotes, ordered and lossless for trades and order events.",
        vi: "Chính sách phân phối theo channel: conflate (giữ giá trị mới nhất) cho quote, giữ thứ tự và không mất dữ liệu cho trade và order event.",
      },
      {
        en: "Snapshot + delta handling with sequence checks, gap detection and automatic resync.",
        vi: "Xử lý snapshot + delta với kiểm tra sequence, phát hiện gap và tự động resync.",
      },
      {
        en: "Expose connection and per-stream status (connecting, live, stale, resyncing, offline) to the UI.",
        vi: "Cung cấp trạng thái kết nối và trạng thái từng stream (connecting, live, stale, resyncing, offline) cho UI.",
      },
      {
        en: "Transport abstraction: WebSocket primary, SSE or REST polling fallback where WebSocket is blocked.",
        vi: "Trừu tượng hoá transport: WebSocket là chính, fallback sang SSE hoặc REST polling khi WebSocket bị chặn.",
      },
    ],
    nonFunctionalRequirements: [
      {
        en: "Main thread does at most one store update per animation frame for hot channels.",
        vi: "Main thread chỉ cập nhật store tối đa một lần mỗi animation frame cho các channel nóng.",
      },
      {
        en: "Bounded memory and queues: no unbounded buffers, even when a tab is hidden for hours.",
        vi: "Bộ nhớ và hàng đợi có giới hạn: không có buffer vô hạn, kể cả khi tab bị ẩn hàng giờ.",
      },
      {
        en: "Graceful degradation under overload instead of freezing (shed load predictably).",
        vi: "Suy giảm có kiểm soát khi quá tải thay vì đóng băng (giảm tải một cách có thể dự đoán).",
      },
      {
        en: "Framework-agnostic core with a thin React binding, so other apps or a micro-frontend can reuse it.",
        vi: "Core không phụ thuộc framework với một lớp binding React mỏng, để app khác hoặc micro-frontend có thể dùng lại.",
      },
      {
        en: "Fully testable without a real server: deterministic mock transport and fake timers.",
        vi: "Có thể test đầy đủ mà không cần server thật: mock transport có tính tất định và fake timer.",
      },
      {
        en: "Type-safe message contracts shared with the backend schema.",
        vi: "Hợp đồng message type-safe, dùng chung schema với backend.",
      },
    ],
    clarifyingQuestions: [
      {
        en: "Does the gateway already support multiplexing (subscribe/unsubscribe per channel), or do we need a BFF to add it?",
        vi: "Gateway đã hỗ trợ multiplex (subscribe/unsubscribe theo channel) chưa, hay cần một BFF để bổ sung?",
      },
      {
        en: "Which channels can be conflated and which must be lossless and ordered?",
        vi: "Channel nào được phép conflate và channel nào bắt buộc không mất dữ liệu và đúng thứ tự?",
      },
      {
        en: "Are messages JSON or binary (protobuf, FlatBuffers, MessagePack)? Is the schema versioned?",
        vi: "Message là JSON hay binary (protobuf, FlatBuffers, MessagePack)? Schema có được version hoá không?",
      },
      {
        en: "Does the server support throttle or conflation requests per subscription, and a snapshot/resync endpoint?",
        vi: "Server có hỗ trợ yêu cầu throttle hoặc conflation cho từng subscription, và endpoint snapshot/resync không?",
      },
      {
        en: "How many tabs or windows do users typically open, and which browsers must we support (SharedWorker availability)?",
        vi: "Người dùng thường mở bao nhiêu tab hoặc cửa sổ, và cần hỗ trợ trình duyệt nào (có SharedWorker không)?",
      },
      {
        en: "How is the socket authenticated, and how long do tokens live?",
        vi: "Socket được xác thực thế nào, và token sống bao lâu?",
      },
    ],
    highLevelArchitecture: `The data layer has a **framework-agnostic core** and a **thin React binding**:

- **Transport adapter** — \`WebSocketTransport\` (primary), \`SseTransport\` and \`PollingTransport\` behind one interface (\`connect\`, \`send\`, \`onMessage\`, \`onStatus\`). Swapping transports never touches widget code.
- **Stream worker** (dedicated \`Worker\`, or \`SharedWorker\` for one connection across tabs) — owns the transport, heartbeat, reconnect, decoding, validation, sequencing, conflation and frame-aligned flushing.
- **Subscription registry** (main thread) — maps \`channel:key\` to a ref-count and a listener set. First acquire sends \`subscribe\` to the worker; last release schedules \`unsubscribe\` after a short grace period, so fast remounts (tab switches, virtualized rows) don't churn the server.
- **Live store** — a normalized store (Zustand, or a tiny custom store) that applies each batch in one update and notifies only affected keys.
- **React binding** — \`useStream\` built on \`useSyncExternalStore\`, so reads are tear-free under concurrent rendering, plus a \`useStreamStatus\` hook for connection UX.

At Ninja Van I worked with Socket.IO for real-time communication; this design makes explicit the reconnect, multiplexing and batching concerns that a library like Socket.IO partly hides.`,
    componentResponsibilities: [
      {
        name: "Transport adapter",
        responsibility: {
          en: "Uniform interface over WebSocket, SSE and polling; reports raw status; no business logic.",
          vi: "Giao diện thống nhất cho WebSocket, SSE và polling; báo trạng thái thô; không chứa business logic.",
        },
      },
      {
        name: "Connection manager (worker)",
        responsibility: {
          en: "Connect, authenticate, heartbeat, detect dead sockets, reconnect with exponential backoff + jitter, resubscribe the active set.",
          vi: "Kết nối, xác thực, heartbeat, phát hiện socket chết, reconnect với exponential backoff + jitter, resubscribe các subscription đang hoạt động.",
        },
      },
      {
        name: "Decoder and validator (worker)",
        responsibility: {
          en: "Parse JSON/binary, validate against the shared schema (full Zod on cold channels, cheap guards on hot ones), drop and count bad messages.",
          vi: "Parse JSON/binary, validate theo schema dùng chung (Zod đầy đủ cho channel ít tải, guard nhẹ cho channel nóng), bỏ qua và đếm message lỗi.",
        },
      },
      {
        name: "Sequencer (worker)",
        responsibility: {
          en: "Track last sequence per stream, buffer or drop deltas on a gap, request snapshot, emit 'resyncing' status.",
          vi: "Theo dõi sequence cuối của từng stream, buffer hoặc bỏ delta khi có gap, yêu cầu snapshot, phát trạng thái 'resyncing'.",
        },
      },
      {
        name: "Conflation buffer and flusher (worker)",
        responsibility: {
          en: "Latest-wins map for conflatable channels, bounded ordered queues for lossless ones; flush one batch per frame tick; shed load when lagging.",
          vi: "Map giữ giá trị mới nhất cho channel được conflate, hàng đợi có giới hạn và đúng thứ tự cho channel lossless; flush một batch mỗi frame; giảm tải khi bị trễ.",
        },
      },
      {
        name: "Subscription registry (main)",
        responsibility: {
          en: "Ref-counting, grace-period unsubscribe, listener sets per key, routing batches to affected listeners only.",
          vi: "Đếm tham chiếu, unsubscribe sau grace period, tập listener theo key, chỉ định tuyến batch đến listener bị ảnh hưởng.",
        },
      },
      {
        name: "React binding",
        responsibility: {
          en: "useStream / useStreamStatus via useSyncExternalStore with selector + equality to avoid needless re-renders.",
          vi: "useStream / useStreamStatus dùng useSyncExternalStore với selector + hàm so sánh để tránh re-render thừa.",
        },
      },
    ],
    dataFlow: `1. A component calls \`useStream("book", "AAPL", s => s.top10)\`. The registry increments \`book:AAPL\`; on 0 → 1 it posts \`{ kind: "sub", channel: "book", key: "AAPL" }\` to the worker.
2. The worker sends a wire \`subscribe\`. The gateway answers with a **snapshot** (\`seq: 500\`) and then **deltas** (\`seq: 501, 502…\`).
3. Each message is **decoded → validated → sequenced**. A gap triggers resync: deltas for that key are dropped until a fresh snapshot arrives, and the key's status becomes \`resyncing\`.
4. Valid updates go into the **conflation buffer** (quotes, book tops) or an **ordered queue** (trades, executions).
5. A flush tick (about every 16 ms; a SharedWorker has no \`requestAnimationFrame\` and a dedicated worker's rAF isn't tied to the page's rendering, so it uses a timer, or the main thread requests the next batch from its own rAF) builds one batch: \`{ updates, statuses, stats }\`. Binary payloads are sent as **transferables** to avoid copying.
6. The main thread applies the batch to the store in one update, then notifies only listeners whose keys changed. \`useSyncExternalStore\` re-runs selectors; components re-render only if the selected value changed.
7. On unmount, ref-count drops to 0 → after a grace period, \`unsubscribe\` is sent.`,
    apiDesign: `**Public API (framework-agnostic core + React):**

\`\`\`ts
interface StreamClient {
  acquire<C extends Channel>(channel: C, key: string, listener: (v: ChannelValue<C>) => void): () => void; // returns release
  getSnapshot<C extends Channel>(channel: C, key: string): ChannelValue<C> | undefined;
  status(): ConnectionStatus; // "connecting" | "live" | "reconnecting" | "offline"
  onStatus(listener: (s: ConnectionStatus) => void): () => void;
}

declare function useStream<C extends Channel, T>(channel: C, key: string, select: (v: ChannelValue<C>) => T, eq?: (a: T, b: T) => boolean): T | undefined;
\`\`\`

**Main ↔ worker protocol:**

\`\`\`ts
type ToWorker =
  | { kind: "sub"; channel: Channel; key: string }
  | { kind: "unsub"; channel: Channel; key: string }
  | { kind: "visibility"; hidden: boolean }
  | { kind: "auth"; token: string };

type FromWorker = {
  kind: "batch";
  updates: Array<{ channel: Channel; key: string; value: unknown }>;
  statuses: Array<{ channel: Channel; key: string; status: "live" | "stale" | "resyncing" }>;
  stats: { received: number; applied: number; dropped: number; lagMs: number };
};
\`\`\`

**Wire protocol additions for backpressure:** \`{ op: "throttle", channel, key, maxHz: 4 }\` and server \`{ type: "slow_consumer" }\` warnings.`,
    stateManagement: `State lives in **three places with clear ownership**:

1. **Worker-owned state** — connection state, last sequence per stream, conflation buffers, ordered queues, the authoritative "desired subscriptions" set used for resubscribe. None of this is in React.
2. **Main-thread live store** — the latest applied value per \`channel:key\`, plus per-key status. It is a normalized map, updated immutably at the key level so unchanged keys keep their references (structural sharing). That makes equality checks in selectors cheap.
3. **React** — only reads. \`useStream\` uses \`useSyncExternalStore(subscribe, getSnapshot)\` so all components see the same version of the store during a concurrent render (no tearing). Selectors plus an equality function (\`Object.is\` or shallow) decide whether to re-render.

For the order book specifically, the worker keeps the full sorted book and sends only the **top N levels** the UI needs, already aggregated. That keeps the main-thread store small and the diff cheap. Canvas consumers skip React entirely and call \`acquire\` with an imperative listener that marks the canvas dirty for the next frame.`,
    scalability: `The layer must scale along three axes:

- **Throughput** — main-thread cost is proportional to *changed keys per frame*, not messages per second, thanks to conflation. Worker cost is mostly decoding; if JSON parsing dominates the profile, the next step is a binary protocol, and after that asking the server to conflate or throttle at the source.
- **Consumers** — ref-counting means 50 rows showing AAPL is still one subscription; listener routing by key means a batch touching 20 symbols wakes up only those 20 groups of listeners.
- **Tabs and apps** — a \`SharedWorker\` gives one connection per browser profile. Where it's unavailable, elect a leader tab with the Web Locks API and fan out with \`BroadcastChannel\`. Because the core is framework-agnostic and published as a package, a second app or a micro-frontend reuses the same client instead of opening another connection.

Server-side scalability is out of scope, but the client protects the gateway: grace-period unsubscribes, jittered reconnects (no thundering herd after an outage), and one connection per user instead of one per widget.`,
    performance: `- **Batch per frame:** one store update and at most one React commit per frame for hot channels.
- **Transferables:** when using binary frames, pass \`ArrayBuffer\`s to/from the worker with zero-copy transfer; with JSON, keep batches small and flat because \`postMessage\` structured-clones them.
- **Cheap validation on hot paths:** full Zod parsing per tick can dominate CPU. Validate the envelope on every message and the full payload on snapshots, or use precompiled guards.
- **Avoid allocation churn:** reuse maps in the conflation buffer and avoid creating per-message closures; garbage-collection pauses show up as jank.
- **Visibility-aware:** when the tab is hidden, the worker stops flushing hot channels to the main thread (it keeps only latest values) and can ask the server to throttle. On visible, it flushes one fresh batch.
- **Selectors with equality:** the React binding compares selected values, so a quote change that doesn't affect the displayed rounded price doesn't re-render.`,
    security: `- **Auth on connect:** use an HttpOnly cookie on the same site, or send a short-lived access token as the first message after open — not in the query string, where it leaks into logs and proxies. The worker cannot read HttpOnly cookies, but the browser still attaches them to the WebSocket handshake on the same site.
- **Token refresh:** the main thread refreshes the token and posts \`{ kind: "auth" }\` to the worker, which re-authenticates in-band or reconnects.
- **Server-side authorization per subscription** — the client registry is not a security boundary.
- **Validate everything** coming from the wire; never \`eval\` or render server strings as HTML.
- **CSP:** \`connect-src\` restricted to the gateway origin; \`worker-src 'self'\` so only our own worker scripts can load.
- **Multi-tab:** \`BroadcastChannel\` is same-origin only, but don't broadcast tokens; share data, not credentials.`,
    reliability: `- **Dead-connection detection:** heartbeat every few seconds; if nothing arrives within the timeout, close and reconnect. \`readyState === OPEN\` is not proof of a healthy connection (half-open TCP).
- **Reconnect policy:** exponential backoff with full jitter and a cap; reset after a stable period. Respect server close codes (e.g. auth failure → don't retry blindly).
- **Resubscribe from desired state:** the worker keeps the set of active subscriptions and replays it after reconnect, then requests snapshots, so no consumer has to know a reconnect happened.
- **Gap handling:** sequence numbers per stream; on gap, resync that stream only, not the whole connection.
- **Lossless channels:** for executions, also track the last event id and ask the server to replay from it after reconnect, or refetch via REST and reconcile.
- **Status propagation:** every key carries a status so widgets can show "stale" or "resyncing" instead of silently freezing.`,
    errorRecovery: `**Backpressure is the main error mode**, because a browser WebSocket has no read-side flow control (the \`message\` event fires as fast as data arrives; the newer \`WebSocketStream\` API with stream backpressure has limited browser support).

Detection:
- Worker queue length and age of the oldest queued item.
- \`lagMs\` = now − server timestamp (skew-corrected) trending up.
- Main thread reporting late batch application (long tasks).

Escalating responses:
1. **Conflate harder** — lower flush frequency for non-visible or low-priority widgets.
2. **Shed** — unsubscribe off-screen keys (virtualized rows out of view), pause hidden tabs.
3. **Ask the server** — \`throttle\` per subscription, or switch to periodic snapshots.
4. **Fail visibly** — if lossless queues still overflow, mark the channel \`stale\`, drop the queue and do a full resync rather than grow memory without bound.

Other cases: malformed messages are dropped and counted; a worker crash (\`error\` event) is caught by the main thread, which restarts the worker and replays desired subscriptions.`,
    monitoring: `The layer reports its own health through a small telemetry module (sampled, batched, sent with \`navigator.sendBeacon\` or a periodic POST):

- **Connection:** connects, disconnects by close code, reconnect attempts, time to live after reconnect.
- **Data integrity:** sequence gaps, resyncs per channel, malformed messages, replay requests.
- **Throughput and lag:** messages received vs applied per second, conflation ratio, queue depth, \`lagMs\` percentiles.
- **Main-thread impact:** batch apply time, long tasks attributed to the stream, INP.
- **Memory:** heap trend per session where \`performance.memory\` or \`measureUserAgentSpecificMemory\` is available, and active subscription count over time (a slowly rising count is a classic leak signal).

A hidden debug panel (feature-flagged) showing live subscriptions, ref-counts and per-channel rates makes production debugging much faster. Errors go to Sentry with the channel and last message type attached.`,
    tradeOffs: [
      {
        decision: "Dedicated Worker vs SharedWorker vs main thread",
        pros: "Dedicated: simple, widely supported. SharedWorker: one connection across tabs. Main thread: simplest to debug.",
        cons: "Dedicated: one connection per tab. SharedWorker: harder debugging and lifecycle, not available everywhere. Main thread: parsing competes with rendering and input.",
      },
      {
        decision: "Conflation vs lossless delivery",
        pros: "Conflation bounds work to changed keys per frame and is ideal for prices.",
        cons: "Loses intermediate values; unacceptable for trades, executions and audit-relevant data, which need ordered queues.",
      },
      {
        decision: "useSyncExternalStore binding vs React context",
        pros: "Fine-grained subscriptions, tear-free with concurrent rendering, no provider re-render cascades.",
        cons: "Requires careful selector/equality design; a bad selector that returns new objects re-renders every frame.",
      },
      {
        decision: "JSON vs binary protocol",
        pros: "JSON: readable, easy to debug, trivial Zod validation. Binary: smaller, faster to decode, transferable buffers.",
        cons: "JSON: parse cost at high rates. Binary: schema tooling, harder debugging, needs coordinated versioning with Rust/Python teams.",
      },
      {
        decision: "Grace-period unsubscribe vs immediate unsubscribe",
        pros: "Avoids churn when components remount quickly (scrolling virtualized rows, tab switches).",
        cons: "Slightly more data received for a few seconds after a widget closes.",
      },
    ],
    recommendedAnswer: `I'd frame this as building a small internal library with a framework-agnostic core and a thin React binding, and I'd walk through it in four layers.

The first layer is transport. I'd hide WebSocket, SSE and polling behind one interface, so widgets never know which one is in use. WebSocket is primary because we need two-way subscribe and unsubscribe.

The second layer is a stream worker that owns the connection. It handles authentication, heartbeats, and reconnect with exponential backoff and jitter. It keeps the set of desired subscriptions, so after a reconnect it resubscribes and requests fresh snapshots on its own. Every message is decoded, validated, and checked against a sequence number; on a gap it resyncs that one stream. Then each channel gets a delivery policy. Prices are conflated, so only the latest value per key survives. Trades and executions go into bounded, ordered queues. About once per frame the worker flushes a single batch to the main thread, using transferables if the protocol is binary.

The third layer, on the main thread, is a subscription registry plus a normalized live store. The registry ref-counts, so fifty components showing the same symbol cost one server subscription, and it unsubscribes after a short grace period so scrolling a virtualized list doesn't create churn. Each batch is applied in one update, and only listeners for changed keys are notified.

The fourth layer is the React binding: a useStream hook built on useSyncExternalStore, with a selector and an equality function. It's tear-free under concurrent rendering and re-renders only when the selected value changes. Canvas widgets skip React and use an imperative listener.

The hard part is backpressure, because a browser WebSocket has no read-side flow control. I'd detect it from queue depth and lag against server timestamps, then escalate: conflate harder, unsubscribe what's off-screen or in hidden tabs, ask the server to throttle, and if lossless queues still overflow, mark the stream stale and resync rather than let memory grow.

I've used Socket.IO for real-time features at Ninja Van, and this design makes explicit the pieces a library like that partly hides.`,
    viExplanation: `Đề bài này thực chất hỏi: làm sao biến "mỗi widget một WebSocket" thành một tầng dữ liệu dùng chung, an toàn và hiệu năng cao. Hãy trình bày như đang thiết kế một thư viện nội bộ gồm bốn lớp.

Lớp transport: gói WebSocket, SSE và polling sau một interface chung, widget không cần biết đang dùng loại nào.

Lớp worker: Web Worker sở hữu kết nối, lo xác thực, heartbeat, reconnect với exponential backoff và jitter. Worker giữ danh sách subscription mong muốn để tự resubscribe sau khi reconnect. Mỗi message được decode, validate và kiểm tra sequence number; nếu có gap thì chỉ resync đúng stream đó. Quan trọng nhất là chính sách theo channel: giá thì conflate (chỉ giữ giá trị mới nhất), còn trade và execution thì phải giữ thứ tự, không được mất. Khoảng mỗi frame, worker gửi một batch duy nhất về main thread.

Lớp registry và store trên main thread: ref-count để nhiều component cùng xem một mã chỉ tốn một subscription; unsubscribe sau grace period để khi scroll danh sách virtualized không bị subscribe/unsubscribe liên tục.

Lớp React: hook useStream dựa trên useSyncExternalStore, có selector và hàm so sánh, tránh tearing khi dùng concurrent rendering và chỉ re-render khi giá trị được chọn thay đổi.

Điểm "ăn điểm" là backpressure: WebSocket trong trình duyệt không có flow control phía đọc. Bạn cần phát hiện qua độ dài queue và độ trễ so với timestamp của server, rồi xử lý theo mức độ: conflate mạnh hơn, huỷ subscription của phần không hiển thị, yêu cầu server throttle, và cuối cùng là đánh dấu stale rồi resync thay vì để bộ nhớ tăng vô hạn.

Về kinh nghiệm thật: bạn đã dùng Socket.IO cho tính năng real-time ở Ninja Van. Không bịa số liệu throughput hay thành tích.`,
    architectureDiagram: {
      kind: "flowchart",
      caption: {
        en: "Streaming data layer: worker pipeline, registry and React binding",
        vi: "Tầng dữ liệu streaming: pipeline trong worker, registry và binding React",
      },
      code: `flowchart LR
  GW["Gateway WS or SSE"]
  subgraph WRK["Stream worker - dedicated or shared"]
    CM["Connection manager"] --> DEC["Decoder and validator"]
    DEC --> SEQ["Sequencer and gap detector"]
    SEQ --> CF["Conflation buffer and ordered queues"]
    CF --> FL["Frame flusher"]
  end
  subgraph MAIN["Main thread"]
    REG["Subscription registry - ref-count"]
    LS["Normalized live store"]
    HK["useStream hook"]
    W1["Order book widget"]
    W2["Canvas chart"]
  end
  GW <--> CM
  FL --> LS
  LS --> HK
  HK --> W1
  LS --> W2
  W1 --> REG
  REG --> CM`,
    },
    sequenceDiagram: {
      kind: "sequence",
      caption: {
        en: "Ref-counted subscribe, disconnect, resubscribe and resync",
        vi: "Subscribe có ref-count, mất kết nối, resubscribe và resync",
      },
      code: `sequenceDiagram
  participant C as Widget
  participant R as Registry
  participant W as Stream Worker
  participant G as Gateway
  C->>R: acquire book AAPL
  R->>W: sub book AAPL with refCount 1
  W->>G: subscribe book AAPL
  G-->>W: snapshot seq 500
  G-->>W: delta seq 501
  G--xW: connection lost
  W->>R: status reconnecting
  W->>W: backoff with full jitter
  W->>G: reconnect and authenticate
  W->>G: resubscribe desired set
  G-->>W: fresh snapshot seq 900
  W->>R: batch with status live
  R->>C: notify changed keys only
  C->>R: release book AAPL
  R->>W: unsub after grace period`,
    },
    memoryShortcut: {
      en: '"T-W-R-R": Transport adapter, Worker pipeline (decode → sequence → conflate → flush), Registry with ref-counts, React via useSyncExternalStore. Backpressure ladder: conflate → shed → throttle → stale + resync.',
      vi: '"T-W-R-R": Transport adapter, Worker pipeline (decode → sequence → conflate → flush), Registry có ref-count, React qua useSyncExternalStore. Thang backpressure: conflate → cắt bớt → throttle → stale + resync.',
    },
    followUps: [
      {
        id: "isb-sd2-f1",
        question: {
          en: "How would you test this data layer without a real backend?",
          vi: "Bạn test tầng dữ liệu này thế nào khi không có backend thật?",
        },
        answer: {
          en: "Because the transport is an interface, unit tests inject a mock transport that I control step by step: emit a snapshot, a delta, a sequence gap, a close event. With fake timers I can assert backoff delays, heartbeat timeouts and grace-period unsubscribes deterministically. The registry and store get pure unit tests for ref-counting and listener routing. For the React binding I use React Testing Library with the mock client and assert that a row re-renders only when its key changes. End to end, Playwright can route WebSocket traffic to a scripted mock server and replay a recorded burst to check that the UI stays responsive and shows the stale and resync states.",
          vi: "Vì transport là một interface, unit test sẽ inject một mock transport mà tôi điều khiển từng bước: phát snapshot, delta, gap sequence, sự kiện close. Với fake timer, tôi kiểm tra được thời gian backoff, timeout heartbeat và unsubscribe sau grace period một cách tất định. Registry và store có unit test thuần cho ref-count và định tuyến listener. Với binding React, tôi dùng React Testing Library cùng mock client và kiểm tra một hàng chỉ re-render khi key của nó thay đổi. Ở mức end-to-end, Playwright có thể route traffic WebSocket sang một mock server có kịch bản và replay một đợt burst đã ghi để kiểm tra UI vẫn phản hồi và hiển thị đúng trạng thái stale và resync.",
        },
      },
      {
        id: "isb-sd2-f2",
        question: {
          en: "Would you put Zod validation on every tick? What are the trade-offs?",
          vi: "Bạn có validate bằng Zod cho mọi tick không? Trade-off là gì?",
        },
        answer: {
          en: "Not on every hot tick by default. Zod gives strong guarantees and good error messages, but at thousands of messages per second the per-message allocation and checks become visible in the profile. I'd validate the envelope on every message, which is cheap, run full schema validation on snapshots, control messages and lossless channels like executions, and use lightweight precompiled guards for hot quote deltas. In development and in a sampled fraction of production traffic I'd run full validation everywhere, so contract drift from the Rust or Python side is still caught early. It runs in the worker, so even full validation never blocks input.",
          vi: "Mặc định thì không validate đầy đủ cho mọi tick nóng. Zod đảm bảo mạnh và báo lỗi rõ, nhưng ở mức hàng nghìn message mỗi giây, chi phí cấp phát và kiểm tra trên mỗi message sẽ hiện rõ trong profile. Tôi validate envelope cho mọi message vì rất rẻ, chạy validate schema đầy đủ cho snapshot, message điều khiển và channel lossless như execution, còn delta giá nóng thì dùng guard nhẹ đã biên dịch sẵn. Ở môi trường development và một phần traffic production được lấy mẫu, tôi chạy validate đầy đủ ở mọi nơi để phát hiện sớm việc contract từ phía Rust hoặc Python bị lệch. Việc này chạy trong worker nên kể cả validate đầy đủ cũng không chặn input.",
        },
      },
    ],
    difficulty: "expert",
    priority: "critical",
    relatedQuestionIds: [
      "isb-q02",
      "isb-q03",
      "isb-q04",
      "isb-q05",
      "isb-q06",
      "isb-q07",
      "isb-q22",
      "isb-q23",
      "isb-q26",
      "isb-q38",
      "isb-q45",
    ],
  },

  /* ================================================================== */
  /* SD3 — High-frequency virtualized order/trade blotter                 */
  /* ================================================================== */
  {
    id: "isb-sd3",
    number: 3,
    title: {
      en: "Design a high-frequency virtualized order and trade blotter",
      vi: "Thiết kế blotter lệnh và giao dịch virtualized cho dữ liệu tần suất cao",
    },
    prompt: {
      en: "Design a blotter (data grid) that shows a user's or desk's orders and trades. It can hold 100k+ rows for the day, receives new trades and order status changes continuously, and users must be able to sort, filter, select rows, use the keyboard, and scroll without jumps while data keeps arriving. Focus on the frontend: rendering, data structures, state and UX.",
      vi: "Thiết kế một blotter (data grid) hiển thị lệnh và giao dịch của người dùng hoặc của cả desk. Grid có thể chứa hơn 100k hàng trong ngày, liên tục nhận trade mới và thay đổi trạng thái lệnh, và người dùng phải sort, filter, chọn hàng, dùng bàn phím và cuộn mà không bị nhảy trong khi dữ liệu vẫn đổ về. Tập trung vào frontend: rendering, cấu trúc dữ liệu, state và UX.",
    },
    functionalRequirements: [
      {
        en: "Show orders and trades with columns such as time, symbol, side, quantity, price, filled quantity, average price, status; 100k+ rows per day.",
        vi: "Hiển thị lệnh và trade với các cột như thời gian, symbol, side, khối lượng, giá, khối lượng đã khớp, giá trung bình, trạng thái; hơn 100k hàng mỗi ngày.",
      },
      {
        en: "Live inserts (new trades/orders) and in-place updates (status, fills) keyed by id.",
        vi: "Chèn hàng mới live (trade/lệnh mới) và cập nhật tại chỗ (trạng thái, khớp lệnh) theo id.",
      },
      {
        en: "Sort by any column and filter (symbol, side, status, text search) while streaming continues.",
        vi: "Sort theo bất kỳ cột nào và filter (symbol, side, trạng thái, tìm kiếm text) trong khi stream vẫn tiếp tục.",
      },
      {
        en: "Stable scrolling: if the user has scrolled away from the top, new rows must not push the content; show a 'N new rows' indicator instead.",
        vi: "Cuộn ổn định: nếu người dùng đã cuộn khỏi đầu danh sách, hàng mới không được đẩy nội dung; thay vào đó hiển thị chỉ báo 'N hàng mới'.",
      },
      {
        en: "Row selection by id that survives sorting, filtering and updates; context actions (cancel order, copy, export).",
        vi: "Chọn hàng theo id, giữ nguyên khi sort, filter và cập nhật; các thao tác ngữ cảnh (huỷ lệnh, copy, export).",
      },
      {
        en: "Full keyboard navigation (arrows, Page Up/Down, Home/End) and screen-reader grid semantics.",
        vi: "Điều hướng hoàn toàn bằng bàn phím (mũi tên, Page Up/Down, Home/End) và ngữ nghĩa grid cho screen reader.",
      },
      {
        en: "Column resize, reorder, pin and show/hide, persisted per user.",
        vi: "Đổi kích thước, sắp xếp, ghim và ẩn/hiện cột, lưu lại theo từng người dùng.",
      },
    ],
    nonFunctionalRequirements: [
      {
        en: "Constant DOM size regardless of row count (only visible rows + overscan are rendered).",
        vi: "Kích thước DOM không đổi bất kể số hàng (chỉ render hàng đang hiển thị + overscan).",
      },
      {
        en: "Scrolling stays smooth during bursts; no long tasks from sorting or filtering on the main thread.",
        vi: "Cuộn vẫn mượt khi có burst; sort hay filter không tạo long task trên main thread.",
      },
      {
        en: "Status updates visible within one or two frames of arrival.",
        vi: "Cập nhật trạng thái hiển thị trong vòng một đến hai frame kể từ khi nhận.",
      },
      {
        en: "Bounded memory across a full trading day; older history paged from the server.",
        vi: "Bộ nhớ có giới hạn trong cả ngày giao dịch; lịch sử cũ hơn được phân trang từ server.",
      },
      {
        en: "WCAG-conformant: keyboard-operable, visible focus, status not conveyed by colour alone.",
        vi: "Đạt chuẩn WCAG: thao tác được bằng bàn phím, focus hiển thị rõ, trạng thái không chỉ truyền đạt bằng màu sắc.",
      },
      {
        en: "No duplicated or lost rows after reconnects.",
        vi: "Không có hàng bị trùng hoặc bị mất sau khi reconnect.",
      },
    ],
    clarifyingQuestions: [
      {
        en: "What is the realistic maximum row count per session, and what is the peak insert/update rate?",
        vi: "Số hàng tối đa thực tế mỗi phiên là bao nhiêu, và tốc độ chèn/cập nhật cao nhất là bao nhiêu?",
      },
      {
        en: "Is the blotter per user or per desk? That changes volume and entitlement rules.",
        vi: "Blotter là theo người dùng hay theo desk? Điều này thay đổi khối lượng dữ liệu và quy tắc phân quyền.",
      },
      {
        en: "Does the backend support server-side sort/filter with cursor pagination for history?",
        vi: "Backend có hỗ trợ sort/filter phía server và phân trang bằng cursor cho lịch sử không?",
      },
      {
        en: "Do rows have fixed height, or can they expand (e.g. child fills under an order)?",
        vi: "Hàng có chiều cao cố định không, hay có thể mở rộng (ví dụ các lần khớp con dưới một lệnh)?",
      },
      {
        en: "Is there an existing grid library standard (AG Grid, TanStack Table) or licensing constraints?",
        vi: "Đã có thư viện grid chuẩn nào (AG Grid, TanStack Table) hoặc ràng buộc về license không?",
      },
      {
        en: "What actions are allowed from the blotter (cancel, amend), and do they need confirmation?",
        vi: "Những thao tác nào được phép từ blotter (huỷ, sửa lệnh), và có cần xác nhận không?",
      },
    ],
    highLevelArchitecture: `I'd use a **"remote viewport" model**: the full dataset and the expensive work live in a **Web Worker**, and the main thread renders only what is on screen.

- **Blotter worker** — holds \`Map<id, Row>\` for the loaded rows, applies inserts/updates from the stream, deduplicates by id, and maintains the **sorted + filtered index** (an array of ids) incrementally.
- **Viewport protocol** — the main thread tells the worker the visible range (plus overscan); the worker answers with those rows and the total count, and pushes patches only for rows inside the current viewport.
- **Virtualizer** (TanStack Virtual or the grid library's own) — computes the visible range from \`scrollTop\`, row height and total count; renders absolutely positioned rows inside a spacer.
- **Row components** — memoized, keyed by row id, fixed height, CSS-only flash on change.
- **Grid shell** — sticky header, pinned columns, column model, selection model (a \`Set\` of ids), keyboard focus model, ARIA grid semantics.
- **History pager** — beyond the in-memory cap, older rows come from REST with cursor pagination.

Alternative: AG Grid's built-in transaction updates and row models solve much of this out of the box; build vs buy is a key trade-off.`,
    componentResponsibilities: [
      {
        name: "Blotter worker",
        responsibility: {
          en: "Row map, dedupe/upsert by id, incremental sorted+filtered index, viewport slicing, memory cap.",
          vi: "Row map, dedupe/upsert theo id, index đã sort+filter cập nhật tăng dần, cắt dữ liệu theo viewport, giới hạn bộ nhớ.",
        },
      },
      {
        name: "Virtualizer",
        responsibility: {
          en: "Map scroll position to row range, render only visible rows + overscan, keep total height correct.",
          vi: "Chuyển vị trí cuộn thành khoảng hàng, chỉ render hàng hiển thị + overscan, giữ tổng chiều cao đúng.",
        },
      },
      {
        name: "Scroll anchor controller",
        responsibility: {
          en: "Detect 'pinned to top' vs 'reading history'; compensate scrollTop when rows are inserted above the viewport; show the new-rows pill.",
          vi: "Phân biệt 'đang ghim ở đầu' và 'đang đọc lịch sử'; bù scrollTop khi có hàng chèn phía trên viewport; hiển thị nút 'hàng mới'.",
        },
      },
      {
        name: "Row component",
        responsibility: {
          en: "Pure, memoized render of one row from its row object; flash animation via CSS class; no data fetching.",
          vi: "Render thuần, có memo cho một hàng từ row object; hiệu ứng flash bằng CSS class; không fetch dữ liệu.",
        },
      },
      {
        name: "Selection and focus model",
        responsibility: {
          en: "Selection as a Set of ids; focused cell as (rowId, columnId); roving tabindex and aria-activedescendant-style navigation.",
          vi: "Selection là một Set id; ô đang focus là (rowId, columnId); điều hướng bằng roving tabindex hoặc kiểu aria-activedescendant.",
        },
      },
      {
        name: "Column model",
        responsibility: {
          en: "Order, width, pinning and visibility; persisted per user; formatters for price/qty with tick-size rules.",
          vi: "Thứ tự, độ rộng, ghim và ẩn/hiện cột; lưu theo người dùng; formatter cho giá/khối lượng theo quy tắc tick size.",
        },
      },
      {
        name: "History pager",
        responsibility: {
          en: "Cursor-based REST loading for older rows and server-side sort/filter beyond the client cap.",
          vi: "Tải hàng cũ hơn qua REST bằng cursor và sort/filter phía server khi vượt giới hạn phía client.",
        },
      },
    ],
    dataFlow: `1. **Initial load** — REST returns the most recent page (e.g. 2,000 rows) plus a cursor and the stream sequence at snapshot time. The worker builds the row map and sorted index.
2. **Live events** — execution/trade events arrive via the shared streaming layer. The worker **upserts by id** (ignoring events whose version is older than the stored one), then updates the index:
   - New row: binary-search the insertion position for the current sort (O(log n) search + array insert).
   - Updated row whose sort key changed: remove and reinsert. If the sort key didn't change, the index is untouched.
   - Filter: evaluate only the changed row against the active predicate.
3. **Viewport** — the main thread sends \`{ start, end }\` on scroll (throttled to animation frames). The worker replies with the rows in that range and \`totalCount\`.
4. **Patches** — once per frame, the worker sends patches for rows inside the viewport, plus \`insertedAbove\` (how many rows were inserted above the first visible row).
5. **Render** — the virtualizer adjusts total height; the anchor controller corrects \`scrollTop\` by \`insertedAbove × rowHeight\` when the user is reading history; memoized rows re-render only if their row object changed.
6. **Sort/filter change** — the worker rebuilds the index off-thread (O(n log n)), then sends the new viewport.`,
    apiDesign: `**REST (history, cursor-based):**

\`\`\`http
GET /api/blotter/trades?limit=2000&cursor=eyJ0cyI6...&sort=time:desc&symbol=AAPL&status=FILLED
-> { "rows": [ { "id": "t-881", "orderId": "o-77", "ts": 1732700000123, "symbol": "AAPL",
                 "side": "buy", "qty": "100", "price": "189.25", "version": 3 } ],
     "nextCursor": "eyJ0cyI6...", "snapshotSeq": 48211 }
\`\`\`

**Stream events (from the shared data layer):**

\`\`\`ts
type BlotterEvent =
  | { type: "order_upsert"; seq: number; order: { id: string; version: number; status: OrderStatus; filledQty: string; avgPx?: string } }
  | { type: "trade"; seq: number; trade: { id: string; orderId: string; ts: number; qty: string; price: string } };
\`\`\`

**Main ↔ worker:**

\`\`\`ts
type ToBlotterWorker =
  | { kind: "viewport"; start: number; end: number }
  | { kind: "sort"; column: string; dir: "asc" | "desc" }
  | { kind: "filter"; predicate: FilterSpec }; // serializable spec, not a function

type FromBlotterWorker =
  | { kind: "rows"; start: number; rows: Row[]; totalCount: number }
  | { kind: "patch"; changed: Row[]; insertedAbove: number; totalCount: number };
\`\`\`

\`version\` makes upserts idempotent and order-safe after reconnect replays.`,
    stateManagement: `- **Row data lives in the worker**, not in React or Zustand. Holding 100k objects in a React-observed store would make every update expensive and invite accidental full re-renders.
- **Main-thread view state** (small, in Zustand or component state): current viewport rows, \`totalCount\`, sort/filter spec, column model, selected ids, focused cell, "pinned to top" flag, new-rows counter.
- **Selection by id, never by index.** Indexes shift on every insert; ids don't. The same applies to the focused cell and expanded rows.
- **Server state** — the initial page and history pages can still be fetched through TanStack Query (caching, retries), then handed to the worker.
- **Persistence** — column layout and saved filters are user preferences stored on the server, with \`localStorage\` only as a fast-start cache.
- **Derived values** (notional = qty × price, P&L) are computed in the worker using integer minor units or a decimal library, never floating-point arithmetic on display strings.`,
    scalability: `Virtualization makes **render cost proportional to visible rows** (typically 30–60), so the remaining limits are data and computation:

- **In-memory cap** — keep a bounded window (e.g. the most recent N rows, a business decision) in the worker. Beyond that, sorting and filtering move to the server with cursor pagination; the UI switches to a "server-side row model" where the virtualizer requests pages by range.
- **Incremental index maintenance** — inserts are O(log n) search plus an array insert; for very high insert rates, batch inserts per frame and merge a small sorted batch into the index instead of inserting one by one.
- **Columns** — with many columns, virtualize horizontally too and pin key columns.
- **Multiple blotters** — orders, trades and positions grids share the same worker infrastructure and streaming layer; each gets its own index.
- **Desk-level views** — aggregation (by symbol/trader) is computed in the worker or server-side, not by grouping 100k rows in React.`,
    performance: `- **Fixed row height** gives O(1) offset math and avoids measuring rows; variable heights need measurement caches and cause scroll jumps.
- **Absolutely positioned rows with \`transform: translateY\`** inside a container sized to \`totalCount × rowHeight\`; \`contain: strict\` on the scroller limits layout scope.
- **Overscan** a few rows to hide the worker round trip while scrolling fast.
- **Memoized rows** keyed by id; the row object reference changes only when that row changes.
- **Flash animations** with a CSS class toggling \`background-color\` or \`opacity\` on a pseudo-element, removed on \`animationend\` — no timers per row.
- **Throttle scroll → viewport messages** to one per animation frame.
- **Formatting** via cached \`Intl.NumberFormat\` instances (creating them per cell is expensive).
- **Sorting/filtering off-thread** so the main thread never runs an O(n log n) pass during a burst.
- **Verify** with the Performance panel (long tasks, layout/paint cost during scroll) and the React Profiler under a replayed burst.`,
    security: `- **Authorization is server-side:** a desk blotter must only stream rows the user is entitled to; the client filter is a view, not a permission.
- **Actions (cancel/amend)** go through REST with CSRF protection and idempotency keys, with confirmation for bulk actions; the button state reflects server-confirmed status, not optimistic guesses.
- **XSS:** free-text fields (notes, rejection reasons, counterparty names) are rendered as text, never HTML.
- **Export:** CSV export must guard against **CSV/formula injection** — neutralise cells starting with \`=\`, \`+\`, \`-\`, \`@\`, a tab or a carriage return (e.g. prefix a single quote) — and respect entitlements (export only what the user can see).
- **Data at rest in the browser:** avoid persisting trade data in \`localStorage\`/IndexedDB unless required and approved; it's sensitive financial data on shared desktops.
- **Audit:** user actions from the blotter are logged server-side with user, time and order id.`,
    reliability: `- **Idempotent upserts:** every event carries an id and a version; applying the same event twice, or an older version after a newer one, is a no-op. That makes reconnect replays safe.
- **Gap recovery:** if the stream reports a sequence gap, the worker refetches rows changed since the last good sequence (or the latest page) via REST and reconciles by id + version.
- **Never lose user context:** selection, focus and scroll position are id-based, so a resync doesn't reset what the user was looking at.
- **Stale indicator** on the blotter header when the stream is not live; actions on stale rows require confirmation or are disabled.
- **Worker crash:** the main thread restarts the worker and re-hydrates from REST; the grid shows a short loading state rather than an empty table.
- **Memory over a full day:** the cap plus eviction (oldest rows beyond the window are evicted and become server-paged) keeps the heap flat.`,
    errorRecovery: `| Scenario | What the user sees | Recovery |
| --- | --- | --- |
| Burst of 1,000s of fills | Smooth scrolling, rows update, maybe a 'N new rows' pill | Worker batches inserts per frame and merges into the index |
| Reconnect with replay | Brief "resyncing" badge | Upsert by id + version dedupes replayed events |
| Sequence gap | "Resyncing" badge, rows stay visible | REST fetch of changes since last good sequence, reconcile |
| Sort on 100k rows | Brief inline spinner on the header, grid still scrollable | Index rebuilt in worker, viewport replaced atomically |
| Cancel order fails | Row shows error tooltip and status unchanged | Server status is the source of truth; offer retry |
| Worker error | Short skeleton, then data | Restart worker, rehydrate from REST, restore viewport by anchor id |

Restoring the viewport by **anchor id** (the first visible row's id) rather than by index is what keeps the user in place after any recovery.`,
    monitoring: `- **Rendering health:** long tasks during scroll, dropped frames, time from event arrival to row patch (event timestamp vs patch apply time).
- **Data health:** duplicate events ignored (id + version), gaps and resyncs, rows evicted by the memory cap, history page load times and errors.
- **Usage:** which columns, sorts and filters are used — this tells you which server-side indexes matter and which columns could be hidden by default.
- **Memory:** heap trend over the session and worker row count, to verify the cap works.
- **Errors:** Sentry with grid id, active sort/filter spec and row count attached (no sensitive row contents in logs).
- **Accessibility regressions:** automated axe checks in CI for the grid's ARIA structure, plus keyboard-navigation Playwright tests.

A small developer overlay showing visible range, total rows, patches per second and index rebuild time helps a lot during performance work.`,
    tradeOffs: [
      {
        decision: "Build on TanStack Virtual/Table vs buy AG Grid (enterprise)",
        pros: "Build: full control, small bundle, tailored to our streaming model. AG Grid: battle-tested transactions, row models, pinning, Excel export, accessibility features.",
        cons: "Build: many edge cases (keyboard, a11y, resize, pinning) are our responsibility. AG Grid: licence cost for enterprise features, larger bundle, less control over internals.",
      },
      {
        decision: "Data and sorting in a worker vs on the main thread",
        pros: "Worker keeps O(n log n) work and bursts off the main thread; scrolling stays smooth.",
        cons: "Viewport round trip adds latency (hidden by overscan); more complex code and tests; need a serializable filter spec.",
      },
      {
        decision: "Fixed row height vs variable/expandable rows",
        pros: "Fixed: O(1) offsets, no measurement, stable scroll anchoring.",
        cons: "Less flexible; expandable details need a side panel or a separate detail row strategy.",
      },
      {
        decision: "Auto-scroll to new rows vs anchored scroll with 'new rows' pill",
        pros: "Anchoring respects what the user is reading; the pill keeps them aware of new data.",
        cons: "Users at the top expect live inserts; needs a clear 'pinned to top' state and threshold logic.",
      },
      {
        decision: "Client cap + server paging vs keep everything in memory",
        pros: "Bounded memory and predictable performance for a full day.",
        cons: "Sort/filter across the full history becomes a server call with latency; two code paths to maintain.",
      },
    ],
    recommendedAnswer: `I'd split this into rendering, data, and UX, because each has its own trap.

For rendering, the grid is virtualized: only the visible rows plus a small overscan exist in the DOM, positioned with translateY inside a container sized to total rows times row height. I'd use a fixed row height, because it makes offset math constant-time and keeps scroll anchoring stable. Rows are memoized and keyed by id, and the change flash is a CSS animation, not a timer per row.

For data, I'd move the dataset out of React entirely. A Web Worker holds a map of rows by id and a sorted, filtered index of ids. Every stream event is an upsert by id with a version number, so replays after a reconnect are idempotent. When a row arrives, the worker binary-searches its position in the current sort; if an update doesn't change the sort key, the index isn't touched. The main thread just tells the worker the visible range, and the worker returns those rows plus the total count, then pushes patches only for rows inside the viewport. Sorting a hundred thousand rows happens off-thread, so scrolling never freezes. To keep memory flat over a trading day, I'd cap what's in memory and page older history from the server with cursors.

For UX, the subtle part is scroll stability. If the user is pinned to the top, new rows flow in. If they've scrolled down to read, I compensate scrollTop for rows inserted above and show a 'twelve new rows' pill instead of moving the content. Selection, focus and scroll restoration are all by id, never by index, because indexes shift on every insert.

Accessibility matters here too. It's a proper grid role with aria-rowcount and aria-rowindex, so screen readers understand virtualization, plus full keyboard navigation and status shown with text or icons, not only colour. I did WCAG, keyboard navigation and ARIA work at Persefoni, so I'd bring that discipline to the grid.

Finally, I'd raise build versus buy early: AG Grid solves a lot of this out of the box, at a licence and bundle cost.`,
    viExplanation: `Câu này kiểm tra ba thứ: bạn có hiểu virtualization thật sự không, bạn có biết đưa dữ liệu lớn ra khỏi React không, và bạn có nghĩ đến trải nghiệm cuộn khi dữ liệu liên tục đổ về không.

Về rendering: chỉ render các hàng đang hiển thị cộng một ít overscan, đặt vị trí bằng translateY trong một container có chiều cao bằng tổng số hàng nhân chiều cao hàng. Chọn row height cố định để tính offset nhanh và giữ scroll ổn định. Hàng được memo và key theo id; hiệu ứng flash dùng CSS animation chứ không dùng timer cho từng hàng.

Về dữ liệu: đừng đặt 100k object vào store mà React theo dõi. Hãy để Web Worker giữ Map các hàng theo id và một index đã sort/filter. Mỗi event là một upsert theo id kèm version, nên khi reconnect và server replay lại thì không bị trùng. Hàng mới được tìm vị trí bằng binary search. Main thread chỉ gửi khoảng đang hiển thị, worker trả về các hàng trong khoảng đó và tổng số hàng. Sort 100k hàng diễn ra trong worker nên cuộn không bị đơ. Để bộ nhớ không tăng mãi trong cả ngày, giới hạn số hàng trong bộ nhớ và phân trang lịch sử từ server bằng cursor.

Về UX: nếu người dùng đang ở đầu danh sách thì hàng mới cứ chảy vào; nếu họ đã cuộn xuống để đọc thì bù scrollTop cho các hàng chèn phía trên và hiện nút "N hàng mới". Selection, focus và vị trí cuộn đều theo id, không theo index.

Accessibility: dùng role grid với aria-rowcount và aria-rowindex, điều hướng bàn phím đầy đủ, trạng thái không chỉ thể hiện bằng màu. Đây là chỗ bạn có thể nhắc kinh nghiệm thật về WCAG, keyboard navigation và ARIA ở Persefoni. Cuối cùng, nêu trade-off build hay mua AG Grid.`,
    architectureDiagram: {
      kind: "flowchart",
      caption: {
        en: "Remote-viewport blotter: data and index in a worker, rendering on the main thread",
        vi: "Blotter theo mô hình remote viewport: dữ liệu và index trong worker, render trên main thread",
      },
      code: `flowchart TD
  WS["Order and trade stream"] --> WK["Blotter worker: upsert by id and version"]
  REST["REST history - cursor paging"] --> WK
  WK --> MAP["Row map - id to row"]
  WK --> IDX["Sorted and filtered id index"]
  CTRL["Sort, filter and column controls"] --> WK
  IDX --> VP["Viewport slice plus total count"]
  MAP --> VP
  VP --> VIRT["Virtualizer - visible range and overscan"]
  VIRT --> ROWS["Memoized row components"]
  VIRT --> ANCH["Scroll anchor and new-rows pill"]
  ROWS --> ARIA["Grid semantics and keyboard focus"]
  VIRT -->|"visible range"| WK`,
    },
    sequenceDiagram: {
      kind: "sequence",
      caption: {
        en: "Scrolling while new fills arrive above the viewport",
        vi: "Cuộn trong khi có lệnh khớp mới chèn phía trên viewport",
      },
      code: `sequenceDiagram
  actor U as User
  participant G as Grid UI
  participant V as Virtualizer
  participant W as Blotter Worker
  participant S as Stream
  U->>G: scroll down to read history
  G->>V: scrollTop changed
  V->>W: viewport rows 5000 to 5060
  W-->>G: rows for range and totalCount
  S-->>W: new trade t-901 for order o-77
  W->>W: upsert by id and binary insert into index
  W-->>G: patch with insertedAbove 1
  G->>G: add one row height to scrollTop
  G-->>U: content stays still and pill shows 1 new row
  U->>G: click new rows pill
  G->>V: scroll to top and pin`,
    },
    memoryShortcut: {
      en: '"Window, Worker, Ids": render only the window, keep data and sorting in a worker, and key everything (upserts, selection, scroll anchor) by id + version — never by index.',
      vi: '"Window, Worker, Id": chỉ render phần đang hiển thị, để dữ liệu và việc sort trong worker, và mọi thứ (upsert, selection, scroll anchor) đều dựa trên id + version — không bao giờ dựa trên index.',
    },
    followUps: [
      {
        id: "isb-sd3-f1",
        question: {
          en: "How do you make a virtualized grid accessible to screen readers when most rows aren't in the DOM?",
          vi: "Làm sao để grid virtualized vẫn accessible với screen reader khi phần lớn các hàng không có trong DOM?",
        },
        answer: {
          en: "I'd use role grid on the container with aria-rowcount set to the total number of rows, and on each rendered row role row with aria-rowindex set to its real position, so assistive technology knows where it is in the full set. Cells get role gridcell, headers columnheader with aria-sort. Focus is managed in the grid itself, with roving tabindex or aria-activedescendant, and arrow keys move a logical focus by id; when focus moves outside the rendered window I scroll first and then focus the newly rendered row. Live updates should not be announced on every tick. I'd use a polite live region only for important events, such as an order being filled or rejected. Status is shown with text or icons as well as colour. This follows the same WCAG and keyboard-navigation principles I applied at Persefoni, but the virtualization specifics here are a recommended approach, and I'd verify them with a screen reader.",
          vi: "Tôi dùng role grid cho container với aria-rowcount bằng tổng số hàng, và mỗi hàng được render có role row với aria-rowindex là vị trí thật, để công nghệ hỗ trợ biết hàng đó nằm ở đâu trong toàn bộ tập dữ liệu. Ô có role gridcell, header có role columnheader kèm aria-sort. Focus được quản lý trong grid bằng roving tabindex hoặc aria-activedescendant, phím mũi tên di chuyển focus logic theo id; khi focus đi ra ngoài vùng đang render, tôi cuộn trước rồi mới focus hàng vừa được render. Không nên thông báo mỗi tick cập nhật; chỉ dùng live region dạng polite cho sự kiện quan trọng như lệnh được khớp hoặc bị từ chối. Trạng thái thể hiện bằng chữ hoặc icon chứ không chỉ bằng màu. Cách làm này theo cùng nguyên tắc WCAG và keyboard navigation tôi đã áp dụng ở Persefoni, còn phần chi tiết về virtualization là cách tiếp cận đề xuất mà tôi sẽ kiểm chứng lại bằng screen reader.",
        },
      },
      {
        id: "isb-sd3-f2",
        question: {
          en: "Why not just use react-window and keep all rows in a Zustand store?",
          vi: "Sao không dùng react-window và giữ toàn bộ hàng trong Zustand store cho đơn giản?",
        },
        answer: {
          en: "For a few thousand rows with moderate update rates, that's a perfectly good, simpler design, and I'd start there. It breaks down at 100k+ rows with continuous inserts and user-driven sorting. Every insert in a sorted view means touching a large array on the main thread, re-sorting after a sort change is a long task, and a careless selector can re-render the whole list. Moving the dataset and index into a worker keeps the main thread doing only what it must: scroll, render the window, handle input. So my answer is to measure first. If the Profiler shows long tasks from sorting, filtering or applying batches, that's the signal to move to the worker model.",
          vi: "Với vài nghìn hàng và tần suất cập nhật vừa phải, đó là thiết kế tốt và đơn giản hơn, và tôi sẽ bắt đầu từ đó. Nó bắt đầu gặp vấn đề khi có hơn 100k hàng, chèn liên tục và người dùng tự sort. Mỗi lần chèn vào view đã sort nghĩa là phải xử lý một mảng lớn trên main thread, sort lại sau khi đổi cột là một long task, và chỉ cần một selector bất cẩn là cả danh sách re-render. Đưa dữ liệu và index vào worker giúp main thread chỉ làm đúng việc của nó: cuộn, render vùng hiển thị, xử lý input. Vì vậy câu trả lời của tôi là đo trước. Nếu Profiler cho thấy long task do sort, filter hoặc áp dụng batch, đó là dấu hiệu nên chuyển sang mô hình worker.",
        },
      },
    ],
    difficulty: "hard",
    priority: "critical",
    relatedQuestionIds: [
      "isb-q09",
      "isb-q10",
      "isb-q12",
      "isb-q13",
      "isb-q15",
      "isb-q18",
      "isb-q25",
      "isb-q33",
      "isb-q35",
      "isb-q36",
      "isb-q40",
    ],
  },

  /* ================================================================== */
  /* SD4 — Frontend platform for multiple trading apps                    */
  /* ================================================================== */
  {
    id: "isb-sd4",
    number: 4,
    title: {
      en: "Design a frontend platform for multiple trading applications (monorepo, design system, CI, observability)",
      vi: "Thiết kế nền tảng frontend cho nhiều ứng dụng giao dịch (monorepo, design system, CI, observability)",
    },
    prompt: {
      en: "The platform has several frontends: a trading analytics app for internal power users, an execution workflow app, and a customer web portal where external customers buy products. Several teams contribute. Design the frontend platform: repository structure, shared component library, shared data/streaming client, API contracts with the Rust/Python backends, CI/CD, quality gates and observability. Discuss monorepo vs micro-frontends.",
      vi: "Nền tảng có nhiều frontend: ứng dụng phân tích giao dịch cho power user nội bộ, ứng dụng quy trình thực thi lệnh (execution workflow), và web portal để khách hàng bên ngoài mua sản phẩm. Nhiều team cùng đóng góp. Hãy thiết kế nền tảng frontend: cấu trúc repository, thư viện component dùng chung, client dữ liệu/streaming dùng chung, API contract với backend Rust/Python, CI/CD, quality gate và observability. Thảo luận monorepo so với micro-frontend.",
    },
    functionalRequirements: [
      {
        en: "Host three or more apps (internal analytics, execution workflows, customer portal) with shared building blocks.",
        vi: "Chứa ba ứng dụng trở lên (phân tích nội bộ, execution workflow, customer portal) với các khối dùng chung.",
      },
      {
        en: "A modular, accessible, reusable component library with design tokens, dense 'trader' and spacious 'customer' themes.",
        vi: "Thư viện component dạng module, accessible, tái sử dụng được, có design token, theme 'trader' dày đặc và theme 'customer' thoáng hơn.",
      },
      {
        en: "Shared packages for the streaming client, data grid, charts, formatting (prices, quantities, dates) and auth.",
        vi: "Các package dùng chung cho streaming client, data grid, chart, định dạng (giá, khối lượng, ngày giờ) và auth.",
      },
      {
        en: "Typed API clients generated from backend contracts (OpenAPI / JSON Schema / protobuf).",
        vi: "API client có type được sinh tự động từ contract của backend (OpenAPI / JSON Schema / protobuf).",
      },
      {
        en: "Independent build and deployment per app, with feature flags and fast rollback.",
        vi: "Build và deploy độc lập cho từng app, có feature flag và rollback nhanh.",
      },
      {
        en: "Automated quality gates: lint, typecheck, unit/integration/E2E tests, accessibility and visual regression checks.",
        vi: "Quality gate tự động: lint, typecheck, test unit/integration/E2E, kiểm tra accessibility và visual regression.",
      },
      {
        en: "Platform-wide observability: errors, Web Vitals, stream health and business events per app and per release.",
        vi: "Observability toàn nền tảng: lỗi, Web Vitals, sức khoẻ stream và business event theo từng app và từng bản release.",
      },
    ],
    nonFunctionalRequirements: [
      {
        en: "Fast feedback: CI runs only what a change affects, with remote caching.",
        vi: "Phản hồi nhanh: CI chỉ chạy những gì bị ảnh hưởng bởi thay đổi, có remote cache.",
      },
      {
        en: "Consistency: one version of React, the design system and the streaming client per app; no duplicate runtimes.",
        vi: "Nhất quán: mỗi app chỉ có một phiên bản React, design system và streaming client; không có runtime trùng lặp.",
      },
      {
        en: "Team autonomy with clear ownership boundaries (CODEOWNERS, enforced package boundaries).",
        vi: "Team tự chủ với ranh giới sở hữu rõ ràng (CODEOWNERS, ranh giới package được cưỡng chế).",
      },
      {
        en: "Security separation: internal-only code must never ship in the customer portal bundle.",
        vi: "Tách biệt bảo mật: code chỉ dành cho nội bộ không bao giờ được đưa vào bundle của customer portal.",
      },
      {
        en: "Performance budgets per app (bundle size, LCP/INP) enforced in CI.",
        vi: "Performance budget cho từng app (kích thước bundle, LCP/INP) được kiểm soát trong CI.",
      },
      {
        en: "Reproducible builds on Linux CI runners and Linux developer desktops.",
        vi: "Build có thể tái lập trên CI runner Linux và máy desktop Linux của developer.",
      },
      {
        en: "WCAG 2.2 AA as the baseline for shared components, especially for the customer portal.",
        vi: "WCAG 2.2 AA là chuẩn tối thiểu cho component dùng chung, đặc biệt với customer portal.",
      },
    ],
    clarifyingQuestions: [
      {
        en: "How many teams and apps are there today, and do they need to release on independent schedules?",
        vi: "Hiện có bao nhiêu team và app, và họ có cần release theo lịch độc lập không?",
      },
      {
        en: "Is there an existing repository layout, CI system and hosting (cloud provider, CDN, Kubernetes)?",
        vi: "Đã có cấu trúc repository, hệ thống CI và hạ tầng hosting (cloud provider, CDN, Kubernetes) nào chưa?",
      },
      {
        en: "Do the Rust/Python teams publish OpenAPI or protobuf contracts, and who owns versioning?",
        vi: "Team Rust/Python có publish contract OpenAPI hoặc protobuf không, và ai chịu trách nhiệm versioning?",
      },
      {
        en: "Does any app need to be embedded in another (e.g. analytics widgets inside the portal) at runtime?",
        vi: "Có app nào cần được nhúng vào app khác lúc runtime không (ví dụ widget phân tích bên trong portal)?",
      },
      {
        en: "What are the compliance requirements: audit, data residency, approval gates before production?",
        vi: "Yêu cầu compliance là gì: audit, nơi lưu trữ dữ liệu, các bước phê duyệt trước khi lên production?",
      },
      {
        en: "Is the customer portal on Next.js with SEO needs, while internal apps are pure client-side SPAs?",
        vi: "Customer portal có dùng Next.js và cần SEO không, trong khi các app nội bộ là SPA thuần client-side?",
      },
    ],
    highLevelArchitecture: `I'd start with a **monorepo with build-time composition** and add runtime micro-frontends only where independent runtime deployment is truly needed.

\`\`\`text
apps/
  analytics/        # internal SPA (Vite + React)
  execution/        # internal SPA
  portal/           # customer-facing Next.js app
packages/
  ui/               # design system: tokens, primitives, dense + customer themes
  data-grid/        # virtualized blotter
  charts/           # canvas chart wrappers
  stream-client/    # multiplexed WebSocket/SSE client + React hooks
  api-client/       # generated from OpenAPI / protobuf
  formatting/       # prices, quantities, time zones
  config/           # tsconfig, eslint, vitest, playwright presets
\`\`\`

- **Tooling:** pnpm workspaces + Turborepo for task graph and remote caching; Vite for SPAs, Next.js for the portal; Changesets for versioning shared packages if they're also consumed outside the repo.
- **Boundaries:** lint rules forbid \`portal\` from importing internal-only packages; CODEOWNERS per package.
- **Delivery:** each app deploys independently to a CDN (or container), behind feature flags.

This mirrors the Vite + Turborepo monorepo setup I worked in at Persefoni, extended for real-time trading needs.`,
    componentResponsibilities: [
      {
        name: "packages/ui (design system)",
        responsibility: {
          en: "Tokens, accessible primitives, dense and customer themes, Storybook docs; owned by a platform team with contributions from app teams.",
          vi: "Token, primitive accessible, theme dày đặc và theme khách hàng, tài liệu Storybook; do team platform sở hữu với đóng góp từ các team app.",
        },
      },
      {
        name: "packages/stream-client",
        responsibility: {
          en: "One multiplexed connection, worker pipeline, ref-counted subscriptions, React hooks; the only allowed way to open a market-data socket.",
          vi: "Một kết nối multiplex, pipeline trong worker, subscription có ref-count, React hook; là cách duy nhất được phép để mở socket market data.",
        },
      },
      {
        name: "packages/api-client",
        responsibility: {
          en: "Typed REST clients and message types generated from backend contracts; runtime validation at the boundary.",
          vi: "REST client có type và kiểu message được sinh từ contract backend; validate runtime tại ranh giới.",
        },
      },
      {
        name: "packages/data-grid and charts",
        responsibility: {
          en: "Virtualized blotter and canvas chart wrappers with consistent formatting and accessibility.",
          vi: "Blotter virtualized và wrapper chart canvas với định dạng và accessibility nhất quán.",
        },
      },
      {
        name: "apps/* (product teams)",
        responsibility: {
          en: "Compose shared packages into product features; own their routes, feature flags and release cadence.",
          vi: "Ghép các package dùng chung thành tính năng sản phẩm; sở hữu route, feature flag và nhịp release của mình.",
        },
      },
      {
        name: "CI/CD pipeline",
        responsibility: {
          en: "Affected-only lint/typecheck/test, visual and a11y checks, bundle budgets, preview deploys, production deploy with rollback.",
          vi: "Chỉ chạy lint/typecheck/test cho phần bị ảnh hưởng, kiểm tra visual và a11y, bundle budget, preview deploy, deploy production có rollback.",
        },
      },
      {
        name: "Observability package",
        responsibility: {
          en: "Shared Sentry/RUM setup, Web Vitals, stream metrics and business event helpers with consistent tags.",
          vi: "Thiết lập Sentry/RUM dùng chung, Web Vitals, metric stream và helper cho business event với tag nhất quán.",
        },
      },
    ],
    dataFlow: `For a platform, the important "data flow" is **how changes flow from code to users**, plus how contracts flow from backend to frontend:

1. **Contract flow** — the Rust/Python teams publish OpenAPI (REST) and protobuf or JSON Schema (streams). A CI job regenerates \`packages/api-client\`; a contract change shows up as a TypeScript error in every affected app, in the same PR or a bot PR.
2. **Change flow** — a developer opens a PR. Turborepo computes the affected package graph (e.g. a change in \`ui/Button\` affects all three apps). CI runs lint, typecheck and unit tests only for affected packages, using the remote cache for the rest.
3. **Quality gates** — Storybook/Playwright visual snapshots and axe accessibility checks for changed components; Playwright E2E smoke tests for affected apps against a mock streaming server.
4. **Preview** — each affected app gets a preview URL for product and design review.
5. **Release** — on merge, affected apps build and deploy independently, tagged with a release id and uploaded source maps. Risky features ship dark behind flags.
6. **Feedback** — RUM and error data by release flow back to dashboards; regressions trigger flag-off or rollback.`,
    apiDesign: `Platform "APIs" are the **public interfaces of shared packages** and the **contracts with the backend**.

\`\`\`ts
// packages/stream-client — the only sanctioned way to get live data
export declare function createStreamClient(opts: { url: string; getToken: () => Promise<string>; transport?: "ws" | "sse" }): StreamClient;
export declare function useStream<C extends Channel, T>(channel: C, key: string, select: (v: ChannelValue<C>) => T): T | undefined;

// packages/ui — tokens and themed, accessible primitives
export declare const tokens: { color: Record<"up" | "down" | "neutral" | "bg" | "fg", string>; density: "compact" | "comfortable" };
export declare function PriceCell(props: { value: string; tickSize: string; previous?: string }): React.JSX.Element; // shows arrow + colour, never colour alone
\`\`\`

\`\`\`yaml
# backend contract (OpenAPI excerpt) -> generated into packages/api-client
paths:
  /api/orders:
    post:
      parameters: [{ name: Idempotency-Key, in: header, required: true }]
      requestBody: { $ref: "#/components/schemas/NewOrder" }
      responses: { "202": { $ref: "#/components/schemas/OrderAck" } }
\`\`\`

Rules: shared packages follow **semver** with Changesets; breaking changes require a migration note and a codemod when practical; backend schema changes are **additive first** (new optional fields), removals only after all apps have migrated.`,
    stateManagement: `The platform defines **conventions**, not one global store:

- **Hot streaming state** — always through \`stream-client\` (Zustand-backed live store + \`useSyncExternalStore\` hooks). One instance per app shell, so every widget shares one connection.
- **Server state** — TanStack Query with a shared \`QueryClient\` factory: default \`staleTime\`, retry policy, and error-to-telemetry hooks. WebSocket events update query caches through shared helpers.
- **UI state** — local component state first, small feature stores (Zustand) when shared across distant components. No app-wide Redux "god store".
- **Cross-app state** — avoided at runtime. If two apps must share context (selected account), it goes through the URL or the backend, not a shared in-memory store, which keeps apps independently deployable.
- **Micro-frontend case** — if a runtime-composed micro-frontend is introduced, React, the stream client and the query client must be **singletons** provided by the host; otherwise you get duplicate React copies and duplicate sockets.

These conventions are documented and enforced with lint rules (e.g. no raw \`new WebSocket\` outside \`stream-client\`).`,
    scalability: `Scaling here means **more teams, more apps and more code** without slowing everyone down:

- **Build scalability** — Turborepo's task graph plus remote caching means CI time grows with the size of a change, not the size of the repo. Affected-only testing keeps PR feedback fast.
- **Team scalability** — CODEOWNERS, package boundaries enforced by lint, and a contribution model for the design system (platform team reviews, app teams contribute).
- **App scalability** — a new app is generated from a template that already wires auth, stream-client, query client, telemetry, Playwright and budgets.
- **When to go micro-frontend** — if teams need to deploy parts of one screen independently at runtime, or embed internal widgets into the portal, use Module Federation or a similar runtime composition — with shared singletons, versioned contracts and a fallback when a remote fails to load. Until then, build-time composition is simpler, faster at runtime and easier to test.
- **Repository health** — dependency updates automated (Renovate/Dependabot), one version policy for core libraries to avoid duplicate React or design-system versions in a bundle.`,
    performance: `- **Per-app budgets in CI** — bundle size per route (e.g. via \`size-limit\` or bundle analyzer output), failing the PR when a budget is exceeded.
- **Shared packages are tree-shakable** — ESM, \`sideEffects: false\`, no barrel files that pull in the whole library; heavy parts (charts, grid) are lazy-loaded per route.
- **Customer portal (Next.js)** — server components and static/streamed rendering for marketing and product pages to keep LCP low; trading-like live widgets are client islands.
- **Internal apps** — pure client SPAs optimized for long sessions: memory stability, INP under streaming load, worker-based data processing from \`stream-client\`.
- **Lab + field** — Lighthouse CI or Playwright traces in CI for lab metrics; RUM Web Vitals (LCP, INP, CLS) per app and per release for field metrics.
- **Performance regression tests** — a replayed market-data burst in Playwright that asserts no long tasks over a threshold in key screens.`,
    security: `- **Code separation:** the customer portal must not import internal-only packages (lint boundaries + a CI check on the built bundle for forbidden module names). Internal and customer apps use separate auth configurations and entitlements.
- **Supply chain:** lockfile committed, \`pnpm\` strict dependency resolution, automated audit, pinned CI actions, and review of new dependencies — a shared package compromise affects every app.
- **Secrets:** only in CI secret stores and server runtime; no secrets in \`NEXT_PUBLIC_*\` or Vite \`VITE_*\` variables, which are embedded in client bundles.
- **CSP per app** with nonces where server rendering is used; strict \`connect-src\` to the platform gateways.
- **Auth patterns centralized** in a shared package: HttpOnly cookies or short-lived tokens, refresh flows, WebSocket auth — implemented once, reviewed once.
- **Compliance:** protected branches, required reviews, audit trail of deployments; production approvals where regulation requires them.`,
    reliability: `- **Independent deploys** reduce blast radius: a broken analytics release does not take down the customer portal.
- **Feature flags** decouple deploy from release; risky features ship dark and roll out by user group.
- **Fast rollback:** immutable, versioned build artifacts on the CDN; rolling back means pointing to the previous version, not rebuilding.
- **Contract safety:** generated types catch most breaking backend changes at compile time; runtime validation at the boundary catches the rest and reports them instead of crashing the UI.
- **Design system stability:** visual regression snapshots and accessibility checks on every component change; semver and deprecation windows for breaking changes.
- **E2E smoke tests against a mock streaming server** for each app, so the critical paths (login, view prices, place order, see fill) are verified on every release.

At NAB I supported AEM deployments and stakeholders in an enterprise banking environment, so I've seen first-hand why controlled, predictable releases matter as much as the code itself.`,
    errorRecovery: `| Failure | Detection | Recovery |
| --- | --- | --- |
| Bad app release | Error rate / Web Vitals regression by release tag | Flag off, or roll back to previous immutable build |
| Breaking change in a shared package | Affected apps fail typecheck/tests in CI | Fix forward in the same PR, or release a patch; consumers pin until migrated |
| Backend contract drift | Generated types change; runtime validation errors in telemetry | Additive-first schema evolution; show degraded UI for unknown fields, alert both teams |
| Micro-frontend remote fails to load | Load error / timeout | Fallback UI with retry; host continues working |
| Flaky E2E tests block CI | Flake tracking dashboard | Quarantine with an owner and deadline; fix root cause (timing, mocks) |
| CI cache poisoning or broken cache | Inconsistent builds | Cache keys include lockfile and env; ability to bypass remote cache |

The principle: **every failure has an owner, a signal and a reversible action.**`,
    monitoring: `One shared observability package so all apps report consistently:

- **Errors:** Sentry (or similar) with \`app\`, \`release\`, \`route\` and \`team\` tags, source maps uploaded in CI, alerts routed to the owning team via CODEOWNERS mapping.
- **Field performance:** LCP, INP, CLS per app/route/release; long tasks and memory trend for long-running internal apps.
- **Stream health:** reconnects, gaps, lag and dropped messages from \`stream-client\`, comparable across apps.
- **Business events:** order submit → ack latency, rejection reasons, portal checkout funnel.
- **Platform health:** CI duration, remote cache hit rate, flaky test rate, bundle size trend, dependency freshness, design-system adoption (which apps use deprecated components).
- **Dashboards per team plus one platform view**; SLOs on the critical paths (e.g. portal availability, order-entry error rate).

Privacy: scrub tokens, account numbers and order details from telemetry; sample high-volume events.`,
    tradeOffs: [
      {
        decision: "Monorepo with build-time composition vs runtime micro-frontends",
        pros: "Monorepo: one version policy, atomic cross-package changes, simple testing, best runtime performance. Micro-frontends: independent runtime deploys per team, technology isolation.",
        cons: "Monorepo: needs good tooling (Turborepo, caching) and governance as it grows. Micro-frontends: duplicate dependencies risk, shared singleton complexity, harder E2E testing and versioning.",
      },
      {
        decision: "Central design system team vs federated contribution",
        pros: "Central: consistency and quality. Federated: faster, closer to product needs.",
        cons: "Central: bottleneck. Federated: drift and inconsistency without strong review and tokens.",
      },
      {
        decision: "Generated API clients from contracts vs hand-written clients",
        pros: "Single source of truth, compile-time detection of breaking changes, less boilerplate.",
        cons: "Depends on backend teams keeping specs accurate; generated code can be awkward; build step needed.",
      },
      {
        decision: "Next.js for the customer portal vs SPA for everything",
        pros: "Next.js: SEO, fast LCP via server rendering, good for content and purchase flows. SPA: simpler for internal real-time tools.",
        cons: "Two runtime models to support in shared packages (server vs client components); shared packages must be marked client-safe.",
      },
      {
        decision: "Strict CI quality gates vs speed of delivery",
        pros: "Catches regressions in accessibility, visuals, budgets and contracts before users do.",
        cons: "Slower pipelines and flaky-test friction unless affected-only runs and caching are in place.",
      },
    ],
    recommendedAnswer: `I'd structure the answer around four platform pillars: repository and boundaries, shared building blocks, delivery pipeline, and observability.

For the repository, I'd start with a monorepo using pnpm workspaces and Turborepo: apps for internal analytics, execution workflows and the customer portal, plus shared packages for the design system, data grid, charts, the streaming client, a generated API client and shared configs. I worked in a Vite and Turborepo monorepo at Persefoni, and the big win is atomic changes across packages with one version of React and one design system. I'd enforce boundaries with CODEOWNERS and lint rules, especially so internal-only code can never end up in the customer portal bundle.

For shared building blocks, three packages matter most. The design system has tokens, a dense trader theme and a calmer customer theme, and accessibility built in: keyboard support, ARIA and never using colour alone for up and down. The stream client is the only sanctioned way to open a market-data connection, so every app gets multiplexing, reconnect and batching for free. The API client is generated from the Rust and Python teams' OpenAPI or protobuf contracts, so a breaking backend change shows up as a TypeScript error, not a production bug.

For delivery, CI runs only what a change affects, with remote caching. That covers lint, typecheck, unit and integration tests, visual regression and axe checks for components, and Playwright smoke tests against a mock streaming server. Each app deploys independently as an immutable artifact behind feature flags, so rollback is a pointer change. CI runs on Linux runners with pinned Node versions, so builds are reproducible.

For observability, a shared package tags errors and Web Vitals by app, route and release, and adds stream-health metrics, so we can compare apps and catch regressions per release.

On micro-frontends: I wouldn't start there. I'd move to runtime composition only when teams truly need to deploy parts of one screen independently, and then with shared singletons and fallbacks. Until then, build-time composition is simpler, faster and easier to test.`,
    viExplanation: `Đây là câu hỏi về tư duy "platform": làm sao để nhiều team cùng xây nhiều app giao dịch mà vẫn nhất quán, nhanh và an toàn. Hãy trả lời theo bốn trụ cột.

Thứ nhất, repository và ranh giới: đề xuất monorepo với pnpm workspaces và Turborepo, gồm các app (phân tích nội bộ, execution workflow, customer portal) và các package dùng chung (design system, data grid, chart, streaming client, API client sinh tự động, config). Đây là chỗ bạn nhắc kinh nghiệm thật: đã làm việc trong monorepo Vite + Turborepo ở Persefoni. Dùng CODEOWNERS và lint rule để cưỡng chế ranh giới, đặc biệt là không để code nội bộ lọt vào bundle của customer portal.

Thứ hai, các khối dùng chung: design system có token, theme dày đặc cho trader và theme thoáng cho khách hàng, accessibility sẵn có (bàn phím, ARIA, không chỉ dùng màu cho tăng/giảm). Stream client là cách duy nhất được phép mở kết nối market data. API client sinh từ contract OpenAPI hoặc protobuf của team Rust/Python, nên thay đổi phá vỡ contract sẽ lộ ra thành lỗi TypeScript ngay trong CI.

Thứ ba, delivery: CI chỉ chạy phần bị ảnh hưởng, có remote cache; có visual regression, kiểm tra axe, Playwright smoke test với mock streaming server. Mỗi app deploy độc lập dưới dạng artifact bất biến, có feature flag, rollback chỉ là đổi con trỏ phiên bản. CI chạy trên Linux runner — khớp với yêu cầu môi trường Linux trong JD.

Thứ tư, observability: package dùng chung gắn tag lỗi và Web Vitals theo app, route, release, kèm metric sức khoẻ stream.

Về micro-frontend: đừng bắt đầu bằng nó. Chỉ chuyển sang runtime composition khi thật sự cần deploy độc lập từng phần của một màn hình, và khi đó phải chia sẻ singleton (React, stream client) và có fallback. Khi nhắc NAB, chỉ nói đúng: hỗ trợ deployment và stakeholder trong môi trường ngân hàng.`,
    architectureDiagram: {
      kind: "flowchart",
      caption: {
        en: "Monorepo-based frontend platform with shared packages, CI and observability",
        vi: "Nền tảng frontend dựa trên monorepo với package dùng chung, CI và observability",
      },
      code: `flowchart TD
  subgraph REPO["Monorepo - pnpm workspaces and Turborepo"]
    A1["Analytics app - Vite SPA"]
    A2["Execution app - Vite SPA"]
    A3["Customer portal - Next.js"]
    UI["Design system and tokens"]
    GC["Data grid and charts"]
    SC["Stream client"]
    AC["Generated API client"]
  end
  BE["Rust and Python contracts - OpenAPI, protobuf"] --> AC
  A1 --> UI
  A2 --> UI
  A3 --> UI
  A1 --> GC
  A2 --> SC
  A1 --> SC
  A3 --> AC
  REPO --> CI["CI: affected tests, visual, a11y, budgets"]
  CI --> CD["Deploy per app with feature flags"]
  CD --> OBS["Observability: errors, Web Vitals, stream health"]`,
    },
    sequenceDiagram: {
      kind: "sequence",
      caption: {
        en: "A shared component change flowing from PR to production",
        vi: "Một thay đổi component dùng chung đi từ PR đến production",
      },
      code: `sequenceDiagram
  actor D as Developer
  participant R as Monorepo
  participant CI as CI Pipeline
  participant VT as Visual and a11y checks
  participant CD as CDN and Flags
  participant M as Monitoring
  D->>R: PR changes PriceCell in design system
  R->>CI: Turborepo computes affected apps
  CI->>CI: lint, typecheck and unit tests for affected only
  CI->>VT: visual snapshots and axe checks
  VT-->>CI: diffs reviewed and approved
  CI->>CD: deploy affected apps behind flag
  CD->>M: release tag and source maps
  M-->>D: errors and Web Vitals by release
  alt regression detected
    D->>CD: flag off or roll back to previous build
  end`,
    },
    memoryShortcut: {
      en: '"Repo, Blocks, Pipeline, Signals": monorepo with boundaries; design system + stream client + generated API client; affected-only CI with visual/a11y gates and per-app deploys; telemetry tagged by app and release. Micro-frontends only when runtime independence is truly needed.',
      vi: '"Repo, Khối, Pipeline, Tín hiệu": monorepo có ranh giới; design system + stream client + API client sinh tự động; CI chỉ chạy phần bị ảnh hưởng, có gate visual/a11y và deploy theo từng app; telemetry gắn tag theo app và release. Chỉ dùng micro-frontend khi thật sự cần độc lập lúc runtime.',
    },
    followUps: [
      {
        id: "isb-sd4-f1",
        question: {
          en: "A team wants to ship a widget into the customer portal without waiting for the portal's release. Do you introduce micro-frontends?",
          vi: "Một team muốn đưa widget vào customer portal mà không phải chờ lịch release của portal. Bạn có đưa micro-frontend vào không?",
        },
        answer: {
          en: "First I'd ask whether the real problem is release coupling or release speed. If the portal can deploy daily with feature flags, a build-time package plus a flag usually solves it with less risk. If the team truly needs independent runtime deploys, I'd introduce runtime composition for that one slot only, using Module Federation or a similar approach. The host provides React, the design system and the stream client as shared singletons. The widget has a versioned props contract, the remote loads lazily with a timeout and an error-boundary fallback, and its bundle has its own budget. I'd also add a contract test in CI that loads the remote into the host. So it's a targeted micro-frontend, not a platform-wide rewrite.",
          vi: "Trước tiên tôi hỏi vấn đề thật sự là release bị phụ thuộc nhau hay chỉ là tốc độ release. Nếu portal có thể deploy hằng ngày với feature flag, thì một package build-time cộng với flag thường giải quyết được và ít rủi ro hơn. Nếu team thực sự cần deploy độc lập lúc runtime, tôi chỉ đưa runtime composition vào đúng vị trí đó, bằng Module Federation hoặc cách tương tự. Host cung cấp React, design system và stream client dưới dạng singleton dùng chung. Widget có contract props được version hoá, remote được load lazy với timeout và fallback bằng error boundary, và bundle của nó có budget riêng. Tôi cũng thêm contract test trong CI để load remote vào host. Như vậy đây là micro-frontend có mục tiêu cụ thể, không phải viết lại toàn bộ nền tảng.",
        },
      },
      {
        id: "isb-sd4-f2",
        question: {
          en: "How do you keep the design system accessible as many teams contribute to it?",
          vi: "Làm sao giữ design system luôn accessible khi có nhiều team cùng đóng góp?",
        },
        answer: {
          en: "I'd make accessibility part of the definition of done, enforced by tooling rather than by memory. Every component has Storybook stories that run axe checks in CI, interaction tests for keyboard behaviour (focus order, Escape, arrow keys), and visual snapshots for focus states and contrast in both themes. Tokens encode accessible colour pairs, so teams can't easily pick failing contrast, and price direction always pairs colour with an arrow or sign. Lint rules such as jsx-a11y catch common mistakes in app code. For complex widgets like grids and comboboxes, we follow WAI-ARIA Authoring Practices and do periodic manual screen-reader checks. That's the same discipline I practised with WCAG, keyboard navigation and ARIA at Persefoni, scaled up through automation.",
          vi: "Tôi đưa accessibility vào definition of done và cưỡng chế bằng công cụ thay vì dựa vào trí nhớ. Mỗi component có Storybook story chạy kiểm tra axe trong CI, interaction test cho hành vi bàn phím (thứ tự focus, phím Escape, phím mũi tên), và visual snapshot cho trạng thái focus và độ tương phản ở cả hai theme. Token mã hoá sẵn các cặp màu đạt chuẩn để team khó chọn nhầm màu thiếu tương phản, và hướng giá luôn đi kèm mũi tên hoặc dấu chứ không chỉ dùng màu. Lint rule như jsx-a11y bắt các lỗi phổ biến trong code của app. Với widget phức tạp như grid hay combobox, chúng tôi theo WAI-ARIA Authoring Practices và định kỳ kiểm tra thủ công bằng screen reader. Đó là cùng một kỷ luật tôi đã thực hành với WCAG, keyboard navigation và ARIA ở Persefoni, được mở rộng bằng tự động hoá.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    relatedQuestionIds: [
      "isb-q17",
      "isb-q28",
      "isb-q29",
      "isb-q39",
      "isb-q40",
      "isb-q41",
      "isb-q42",
      "isb-q43",
      "isb-q44",
      "isb-q45",
      "isb-q47",
      "isb-q50",
    ],
  },
];
