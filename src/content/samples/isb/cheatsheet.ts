import type { CheatConcept, Flashcard } from "@/domain/package/schema";

/**
 * Section 14 — Interview cheat sheet + flashcards for the ISB Vietnam Senior Front-End Developer sample.
 *
 * Weighted toward the verified JD focus: real-time streaming (WebSocket/SSE), browser and React rendering,
 * virtualization, memory leaks, charting, then state, TypeScript, trading basics, architecture and testing.
 * Example numbers (16.7ms frame, 50ms long task, 200ms INP) are general web-platform facts, not candidate metrics.
 * relatedItemIds / relatedItemId reference ONLY existing item ids (isb-q01…isb-q61, isb-sd1…isb-sd4).
 */

/* ------------------------------------------------------------------ */
/* Top concepts (rapid review)                                         */
/* ------------------------------------------------------------------ */

export const isbCheatConcepts: CheatConcept[] = [
  /* ---------- Real-time ---------- */
  {
    id: "isb-cc01",
    title: { en: "WebSocket vs SSE vs long polling", vi: "WebSocket vs SSE vs long polling" },
    memoryShortcut: {
      en: "One-way news → SSE. Two-way chat → WebSocket. Orders → REST.",
      vi: "Một chiều → SSE. Hai chiều → WebSocket. Đặt lệnh → REST.",
    },
    takeaway: {
      en: "SSE is server-to-client over HTTP with built-in reconnect and Last-Event-ID; WebSocket is full-duplex with binary frames for dynamic subscriptions and high volume. Use HTTP/2 for SSE (HTTP/1.1 caps ~6 connections per origin). Keep order placement on REST for idempotency and clear errors.",
      vi: "SSE là server → client qua HTTP, tự reconnect, có Last-Event-ID; WebSocket là full-duplex, hỗ trợ binary, hợp với subscription động và lưu lượng lớn. Dùng HTTP/2 cho SSE (HTTP/1.1 giới hạn ~6 kết nối mỗi origin). Đặt lệnh vẫn qua REST để có idempotency và xử lý lỗi rõ ràng.",
    },
    priority: "critical",
    topicId: "realtime",
    relatedItemIds: ["isb-q01"],
  },
  {
    id: "isb-cc02",
    title: { en: "Resilient reconnection", vi: "Reconnect bền vững" },
    memoryShortcut: {
      en: "Back off, jitter, re-auth, resubscribe, resync.",
      vi: "Lùi dần, ngẫu nhiên, xác thực lại, đăng ký lại, đồng bộ lại.",
    },
    takeaway: {
      en: "Model the connection as a state machine. Exponential backoff with jitter and a cap prevents a thundering herd; refresh auth before reconnecting; replay subscriptions from a registry; fetch a fresh snapshot because deltas missed while offline are gone.",
      vi: "Mô hình hoá kết nối thành state machine. Exponential backoff + jitter có giới hạn trần để tránh thundering herd; refresh auth trước khi kết nối lại; gửi lại subscription từ registry; lấy snapshot mới vì delta trong lúc offline đã mất.",
    },
    priority: "critical",
    topicId: "realtime",
    relatedItemIds: ["isb-q02", "isb-q04"],
  },
  {
    id: "isb-cc03",
    title: { en: "Batch, conflate, flush per frame", vi: "Batch, conflate, flush mỗi frame" },
    memoryShortcut: {
      en: "Never setState per message — one flush per frame.",
      vi: "Không setState cho từng message — mỗi frame flush một lần.",
    },
    takeaway: {
      en: "Buffer incoming ticks keyed by symbol so only the latest survives (conflation), then flush once per requestAnimationFrame into the store. React renders at most once per frame and the main thread stays free for input.",
      vi: "Gom tick vào buffer theo symbol để chỉ giữ bản mới nhất (conflation), rồi flush một lần mỗi requestAnimationFrame vào store. React render tối đa một lần mỗi frame và main thread còn thời gian xử lý input.",
    },
    priority: "critical",
    topicId: "realtime",
    relatedItemIds: ["isb-q03", "isb-q18"],
  },
  {
    id: "isb-cc04",
    title: { en: "Sequence numbers and snapshot + delta", vi: "Sequence number và snapshot + delta" },
    memoryShortcut: {
      en: "Snapshot first, then seq + 1 only; a gap means resync.",
      vi: "Snapshot trước, chỉ nhận seq + 1; có gap thì resync.",
    },
    takeaway: {
      en: "Drop duplicates (seq ≤ last). On a gap, stop applying, buffer new deltas, fetch a snapshot and replay buffered deltas newer than it. Never patch over a gap — a wrong order book is worse than a short loading state.",
      vi: "Bỏ message trùng (seq ≤ last). Gặp gap thì dừng áp dụng, buffer delta mới, lấy snapshot rồi replay các delta mới hơn snapshot. Không vá qua gap — order book sai còn tệ hơn một thoáng loading.",
    },
    priority: "critical",
    topicId: "realtime",
    relatedItemIds: ["isb-q04", "isb-q31"],
  },
  {
    id: "isb-cc05",
    title: { en: "Client-side backpressure", vi: "Backpressure phía client" },
    memoryShortcut: {
      en: "Bound the queue, conflate prices, never drop orders, tell the server.",
      vi: "Giới hạn queue, gộp giá, không bỏ lệnh, báo server.",
    },
    takeaway: {
      en: "Detect it via a growing queue, rising server-to-client lag and long tasks. Prices can be conflated; trades and order events must not be dropped. Ask the server to throttle or downgrade the channel, and show a degraded state instead of silently stale data.",
      vi: "Phát hiện qua queue phình to, độ trễ server → client tăng dần và long task. Giá có thể conflate; trade và order event thì không được bỏ. Yêu cầu server throttle hoặc hạ tần suất kênh, và hiển thị trạng thái degraded thay vì âm thầm hiển thị dữ liệu cũ.",
    },
    priority: "critical",
    topicId: "realtime",
    relatedItemIds: ["isb-q05", "isb-sd2"],
  },
  {
    id: "isb-cc06",
    title: { en: "Streaming data layer and workers", vi: "Streaming data layer và worker" },
    memoryShortcut: {
      en: "One pipe, ref-counted topics; main thread paints, worker thinks.",
      vi: "Một đường ống, topic có ref-count; main thread vẽ, worker tính.",
    },
    takeaway: {
      en: "Multiplex one connection, keep a subscription registry with ref-counting (first in subscribes, last out unsubscribes), and move parsing/aggregation to a Web Worker that posts compact batches — transferable ArrayBuffers avoid copies. SharedWorker (or a leader tab elected with Web Locks, fanning out over BroadcastChannel) shares one connection across tabs.",
      vi: "Multiplex một kết nối, có subscription registry với ref-counting (người đầu vào subscribe, người cuối ra unsubscribe), chuyển parse/aggregate sang Web Worker và gửi batch gọn về — transferable ArrayBuffer tránh copy. SharedWorker (hoặc leader tab bầu bằng Web Locks, phát dữ liệu qua BroadcastChannel) chia sẻ một kết nối cho nhiều tab.",
    },
    priority: "high",
    topicId: "realtime",
    relatedItemIds: ["isb-q06", "isb-q38", "isb-sd2"],
  },
  {
    id: "isb-cc07",
    title: { en: "Heartbeats and stale-data UX", vi: "Heartbeat và UX cho dữ liệu stale" },
    memoryShortcut: {
      en: "Heartbeat for the pipe, timestamp for the data.",
      vi: "Heartbeat cho đường ống, timestamp cho dữ liệu.",
    },
    takeaway: {
      en: "A TCP socket can look open while nothing arrives, so ping/pong detects dead connections; per-stream last-update times detect stale symbols. Show live / reconnecting / offline clearly and warn or block order entry on stale prices.",
      vi: "Socket TCP có thể trông vẫn mở dù không có dữ liệu, nên dùng ping/pong để phát hiện kết nối chết; thời điểm cập nhật cuối theo stream để phát hiện symbol stale. Hiển thị rõ live / reconnecting / offline và cảnh báo hoặc khoá đặt lệnh khi giá đã cũ.",
    },
    priority: "high",
    topicId: "realtime",
    relatedItemIds: ["isb-q07"],
  },

  /* ---------- React + browser performance ---------- */
  {
    id: "isb-cc08",
    title: { en: "What triggers a re-render", vi: "Điều gì gây re-render" },
    memoryShortcut: {
      en: "State, parent, context. Render is cheap; commit touches the DOM.",
      vi: "State, cha, context. Render rẻ; commit mới đụng DOM.",
    },
    takeaway: {
      en: "A component re-renders when its state changes, its parent renders or a consumed context changes. Reconciliation diffs the output; stable keys preserve row identity and DOM nodes — index keys break when rows reorder.",
      vi: "Component re-render khi state đổi, cha render hoặc context đang dùng thay đổi. Reconciliation so sánh kết quả; key ổn định giữ được danh tính dòng và DOM node — index key sẽ lỗi khi dòng đổi thứ tự.",
    },
    priority: "critical",
    topicId: "react-performance",
    relatedItemIds: ["isb-q08"],
  },
  {
    id: "isb-cc09",
    title: { en: "Profile first, then narrow subscriptions", vi: "Profile trước, rồi thu hẹp subscription" },
    memoryShortcut: {
      en: "Measure, find the hot source, narrow it.",
      vi: "Đo, tìm nguồn nóng, thu hẹp.",
    },
    takeaway: {
      en: "Use the React DevTools Profiler and highlight updates. Usual culprits: a context changing every tick, selectors returning new objects, inline props defeating memo. Fix with per-row selectors, split contexts and state colocated low in the tree.",
      vi: "Dùng React DevTools Profiler và highlight updates. Thủ phạm quen thuộc: context đổi mỗi tick, selector trả object mới, prop inline làm memo vô dụng. Sửa bằng selector theo từng dòng, tách context và đặt state ở thấp trong cây.",
    },
    priority: "critical",
    topicId: "react-performance",
    relatedItemIds: ["isb-q09", "isb-q26"],
  },
  {
    id: "isb-cc10",
    title: { en: "Memoization and the React Compiler", vi: "Memoization và React Compiler" },
    memoryShortcut: {
      en: "Memo pays only when inputs are stable and work is expensive.",
      vi: "Memo chỉ đáng khi input ổn định và việc tính toán nặng.",
    },
    takeaway: {
      en: "useMemo/useCallback/React.memo cost memory and comparisons. They help for expensive work and stable references to memoized children; they hurt when props change every render anyway. The React Compiler automates much of it — clean data flow matters more.",
      vi: "useMemo/useCallback/React.memo tốn bộ nhớ và phép so sánh. Có ích cho tính toán nặng và giữ reference ổn định cho con đã memo; có hại khi prop vẫn đổi mỗi lần render. React Compiler tự động hoá phần lớn — data flow sạch quan trọng hơn.",
    },
    priority: "high",
    topicId: "react-performance",
    relatedItemIds: ["isb-q10"],
  },
  {
    id: "isb-cc11",
    title: { en: "useTransition and useDeferredValue", vi: "useTransition và useDeferredValue" },
    memoryShortcut: {
      en: "Transition wraps the setter; deferred wraps the value.",
      vi: "Transition bọc setter; deferred bọc value.",
    },
    takeaway: {
      en: "Both mark rendering as interruptible so typing and clicks stay responsive. They reorder priority; they don't make slow rendering faster — pair them with virtualization and narrow subscriptions.",
      vi: "Cả hai đánh dấu render có thể bị ngắt để gõ phím và click vẫn mượt. Chúng sắp xếp lại độ ưu tiên chứ không làm render chậm trở nên nhanh — cần kết hợp với virtualization và subscription hẹp.",
    },
    priority: "high",
    topicId: "react-performance",
    relatedItemIds: ["isb-q11"],
  },
  {
    id: "isb-cc12",
    title: { en: "Pixel pipeline and layout thrashing", vi: "Pixel pipeline và layout thrashing" },
    memoryShortcut: {
      en: "Style → layout → paint → composite. Read all, then write all.",
      vi: "Style → layout → paint → composite. Đọc hết rồi ghi hết.",
    },
    takeaway: {
      en: "Interleaving DOM writes with layout reads (offsetHeight, getBoundingClientRect) forces synchronous layout. Batch reads before writes, ideally in requestAnimationFrame, and animate price flashes with transform/opacity so they stay on the compositor.",
      vi: "Xen kẽ ghi DOM và đọc layout (offsetHeight, getBoundingClientRect) buộc trình duyệt tính layout đồng bộ. Gom đọc trước ghi sau, tốt nhất trong requestAnimationFrame, và animate hiệu ứng nháy giá bằng transform/opacity để chạy trên compositor.",
    },
    priority: "critical",
    topicId: "react-performance",
    relatedItemIds: ["isb-q12"],
  },
  {
    id: "isb-cc13",
    title: { en: "Virtualized tables", vi: "Bảng virtualized" },
    memoryShortcut: {
      en: "Render the window, not the world.",
      vi: "Render cửa sổ, không render cả thế giới.",
    },
    takeaway: {
      en: "Render only visible rows plus overscan inside a full-height spacer. Fixed row heights keep scroll math cheap; variable heights need measured, cached offsets. Rows subscribe to their own slice by id, and scroll stays anchored when rows insert above.",
      vi: "Chỉ render dòng đang hiển thị cộng overscan trong một spacer có chiều cao đầy đủ. Chiều cao cố định giúp tính scroll rẻ; chiều cao thay đổi cần đo và cache offset. Mỗi dòng subscribe phần dữ liệu riêng theo id, và giữ vị trí scroll khi chèn dòng phía trên.",
    },
    priority: "critical",
    topicId: "react-performance",
    relatedItemIds: ["isb-q13", "isb-sd3"],
  },
  {
    id: "isb-cc14",
    title: { en: "Canvas vs SVG vs WebGL", vi: "Canvas vs SVG vs WebGL" },
    memoryShortcut: {
      en: "Few elements → SVG, many → canvas, massive → WebGL.",
      vi: "Ít phần tử → SVG, nhiều → canvas, cực nhiều → WebGL.",
    },
    takeaway: {
      en: "SVG is DOM: easy styling and accessibility, but each node costs. Canvas scales to many points but you own hit-testing and accessibility. WebGL uses the GPU for very large datasets at higher complexity. Canvas plus an SVG/DOM overlay is a common middle ground.",
      vi: "SVG là DOM: dễ style và accessibility nhưng mỗi node đều tốn chi phí. Canvas chịu được nhiều điểm nhưng phải tự làm hit-testing và accessibility. WebGL dùng GPU cho dữ liệu rất lớn nhưng phức tạp hơn. Canvas kèm lớp SVG/DOM overlay là lựa chọn cân bằng phổ biến.",
    },
    priority: "high",
    topicId: "react-performance",
    relatedItemIds: ["isb-q14", "isb-q34"],
  },
  {
    id: "isb-cc15",
    title: { en: "Memory leaks in long-running SPAs", vi: "Memory leak trong SPA chạy lâu" },
    memoryShortcut: {
      en: "Snapshot, repeat, snapshot — follow the retainers.",
      vi: "Chụp, lặp lại, chụp — lần theo retainer.",
    },
    takeaway: {
      en: "Use the three-snapshot technique and filter for detached DOM nodes. Usual causes: listeners and subscriptions without cleanup, timers, closures holding big arrays, unbounded tick buffers and caches. Every effect that subscribes must return a cleanup.",
      vi: "Dùng kỹ thuật ba snapshot và lọc detached DOM node. Nguyên nhân thường gặp: listener và subscription không cleanup, timer, closure giữ mảng lớn, buffer tick và cache không giới hạn. Effect nào subscribe cũng phải trả về hàm cleanup.",
    },
    priority: "critical",
    topicId: "react-performance",
    relatedItemIds: ["isb-q15", "isb-q36"],
  },
  {
    id: "isb-cc16",
    title: { en: "INP, long tasks and yielding", vi: "INP, long task và yield" },
    memoryShortcut: {
      en: "16.7 ms per frame, 50 ms is a long task, 200 ms is good INP.",
      vi: "16,7ms mỗi frame, 50ms là long task, INP tốt là 200ms.",
    },
    takeaway: {
      en: "INP measures interaction-to-next-paint near the worst interaction on a page. Keep handlers small, chunk heavy work and yield (scheduler.yield where supported, setTimeout otherwise), use transitions for non-urgent renders and measure field data with web-vitals.",
      vi: "INP đo thời gian từ tương tác đến lần vẽ kế tiếp, lấy gần mức tệ nhất của trang. Giữ handler gọn, chia nhỏ việc nặng và yield (scheduler.yield nếu được hỗ trợ, nếu không thì setTimeout), dùng transition cho render không khẩn cấp và đo dữ liệu thực bằng web-vitals.",
    },
    priority: "high",
    topicId: "react-performance",
    relatedItemIds: ["isb-q16", "isb-q18", "isb-q17"],
  },

  /* ---------- JavaScript + TypeScript ---------- */
  {
    id: "isb-cc17",
    title: { en: "Event loop and rendering", vi: "Event loop và rendering" },
    memoryShortcut: {
      en: "One task, all microtasks, then maybe render.",
      vi: "Một task, hết microtask, rồi mới có thể render.",
    },
    takeaway: {
      en: "The microtask queue is fully drained after each task, so long promise chains block paint like synchronous code. Schedule visual work in requestAnimationFrame, which runs right before the browser paints.",
      vi: "Microtask queue được chạy hết sau mỗi task, nên chuỗi promise dài cũng chặn việc vẽ như code đồng bộ. Lên lịch công việc hiển thị trong requestAnimationFrame — chạy ngay trước khi trình duyệt vẽ.",
    },
    priority: "high",
    topicId: "js-ts",
    relatedItemIds: ["isb-q19"],
  },
  {
    id: "isb-cc18",
    title: { en: "Stale closures in hooks", vi: "Stale closure trong hook" },
    memoryShortcut: {
      en: "Functional updater, ref, or store — not re-subscribe.",
      vi: "Functional updater, ref hoặc store — không subscribe lại.",
    },
    takeaway: {
      en: "A socket handler registered once captures first-render state. Read fresh values via setX(prev => …), a ref, or an external store's getState instead of tearing down the connection on every change.",
      vi: "Handler socket đăng ký một lần sẽ giữ state của lần render đầu. Đọc giá trị mới qua setX(prev => …), ref, hoặc getState của store bên ngoài thay vì đóng mở kết nối mỗi lần state đổi.",
    },
    priority: "high",
    topicId: "js-ts",
    relatedItemIds: ["isb-q20"],
  },
  {
    id: "isb-cc19",
    title: { en: "Money and floating-point precision", vi: "Số tiền và độ chính xác dấu phẩy động" },
    memoryShortcut: {
      en: "Display with floats, calculate with decimals, round once.",
      vi: "Hiển thị dùng float, tính toán dùng decimal, làm tròn một lần.",
    },
    takeaway: {
      en: "0.1 + 0.2 !== 0.3. Use integer minor units or a decimal library for order prices, quantities and P&L; receive decimals as strings; format by the instrument's tick size; round once at the boundary with an explicit rule.",
      vi: "0.1 + 0.2 !== 0.3. Dùng số nguyên theo đơn vị nhỏ nhất hoặc thư viện decimal cho giá đặt lệnh, khối lượng và P&L; nhận số thập phân dạng string; format theo tick size của sản phẩm; làm tròn một lần ở biên với quy tắc rõ ràng.",
    },
    priority: "critical",
    topicId: "js-ts",
    relatedItemIds: ["isb-q21", "isb-q35"],
  },
  {
    id: "isb-cc20",
    title: { en: "Typed protocols: unions + Zod at the edge", vi: "Protocol có kiểu: union + Zod ở biên" },
    memoryShortcut: {
      en: "Tag it, switch it, never forget it — validate at the edge.",
      vi: "Gắn tag, switch theo tag, dùng never — validate ở biên.",
    },
    takeaway: {
      en: "Model messages as a discriminated union with an exhaustive switch (default assigns to never). Types vanish at runtime, so validate untrusted frames with Zod at the boundary — on hot paths validate the envelope or sample, or validate in a worker.",
      vi: "Mô hình message bằng discriminated union với switch đầy đủ (nhánh default gán vào never). Type biến mất ở runtime, nên validate dữ liệu không tin cậy bằng Zod tại biên — với hot path thì chỉ validate envelope, lấy mẫu, hoặc validate trong worker.",
    },
    priority: "high",
    topicId: "js-ts",
    relatedItemIds: ["isb-q22", "isb-q23", "isb-q24"],
  },

  /* ---------- State + Next.js ---------- */
  {
    id: "isb-cc21",
    title: { en: "Zustand selectors and TanStack Query merging", vi: "Selector Zustand và kết hợp TanStack Query" },
    memoryShortcut: {
      en: "Select narrow; hot values outside React; stale = refetch, gc = forget.",
      vi: "Chọn hẹp; giá trị nóng ở ngoài React; stale = refetch, gc = xoá.",
    },
    takeaway: {
      en: "Zustand components re-render only when their selected slice changes; store.subscribe enables transient updates with no render. TanStack Query owns REST snapshots (staleTime = fresh window, gcTime = unused cache lifetime); merge low-frequency socket events with setQueryData, keep high-frequency ticks in a dedicated store.",
      vi: "Component dùng Zustand chỉ re-render khi phần được chọn thay đổi; store.subscribe cho phép transient update không cần render. TanStack Query quản lý snapshot REST (staleTime = thời gian còn mới, gcTime = thời gian giữ cache khi không dùng); merge event socket tần suất thấp bằng setQueryData, còn tick tần suất cao để ở store riêng.",
    },
    priority: "high",
    topicId: "state-nextjs",
    relatedItemIds: ["isb-q26", "isb-q27"],
  },
  {
    id: "isb-cc22",
    title: { en: "Next.js: server shell, client island", vi: "Next.js: server dựng khung, client island" },
    memoryShortcut: {
      en: "Server renders the frame, client streams the numbers.",
      vi: "Server dựng khung, client stream con số.",
    },
    takeaway: {
      en: "Server Components fit layout, navigation and the initial snapshot. WebSockets, timers and subscriptions live in Client Components, so the live grid, chart and order ticket form a client island seeded with snapshot props.",
      vi: "Server Component hợp với layout, navigation và snapshot ban đầu. WebSocket, timer và subscription nằm trong Client Component, nên grid live, chart và order ticket là một client island nhận snapshot qua props.",
    },
    priority: "medium",
    topicId: "state-nextjs",
    relatedItemIds: ["isb-q28", "isb-q29"],
  },
  {
    id: "isb-cc23",
    title: { en: "Optimistic orders with idempotency", vi: "Optimistic order với idempotency" },
    memoryShortcut: {
      en: "Show pending, send with a key, let the server decide.",
      vi: "Hiện pending, gửi kèm key, để server quyết định.",
    },
    takeaway: {
      en: "Show the order as pending immediately, send it with a client-generated idempotency key so retries don't duplicate it, then reconcile with the server's acknowledgement and execution events. Roll back clearly on rejection — never show filled before the server says so.",
      vi: "Hiện lệnh ở trạng thái pending ngay, gửi kèm idempotency key do client tạo để retry không bị trùng lệnh, rồi đối chiếu với acknowledgement và execution event từ server. Rollback rõ ràng khi bị reject — không bao giờ hiện filled trước khi server xác nhận.",
    },
    priority: "high",
    topicId: "state-nextjs",
    relatedItemIds: ["isb-q30", "isb-q33"],
  },

  /* ---------- Trading + financial visualization ---------- */
  {
    id: "isb-cc24",
    title: { en: "Order book basics", vi: "Kiến thức cơ bản về order book" },
    memoryShortcut: {
      en: "Bids down, asks up, spread = ask − bid, size zero deletes.",
      vi: "Bid giảm dần, ask tăng dần, spread = ask − bid, size 0 là xoá.",
    },
    takeaway: {
      en: "Keep each side in a map keyed by price, apply deltas (size 0 removes the level), and render only the top N levels with cumulative depth bars. Recompute the sorted view per frame, not per message.",
      vi: "Lưu mỗi phía trong map theo giá, áp delta (size 0 thì xoá mức giá), và chỉ render top N mức với thanh depth cộng dồn. Tính lại view đã sắp xếp theo frame, không theo từng message.",
    },
    priority: "high",
    topicId: "finance-viz",
    relatedItemIds: ["isb-q31", "isb-q52"],
  },
  {
    id: "isb-cc25",
    title: { en: "Building OHLC candles", vi: "Dựng nến OHLC" },
    memoryShortcut: {
      en: "Floor the time; first is open, last is close.",
      vi: "Làm tròn thời gian; đầu là open, cuối là close.",
    },
    takeaway: {
      en: "bucket = floor(ts / interval) × interval. Update high, low, close and volume per trade; the latest candle is partial. Bucket in UTC, convert only for display, and handle empty intervals and late trades explicitly.",
      vi: "bucket = floor(ts / interval) × interval. Mỗi trade cập nhật high, low, close và volume; nến mới nhất là nến dở dang. Chia bucket theo UTC, chỉ đổi múi giờ khi hiển thị, xử lý rõ interval trống và trade đến trễ.",
    },
    priority: "high",
    topicId: "finance-viz",
    relatedItemIds: ["isb-q32", "isb-q53"],
  },
  {
    id: "isb-cc26",
    title: { en: "Time-series memory: ring buffers + LTTB", vi: "Bộ nhớ time-series: ring buffer + LTTB" },
    memoryShortcut: {
      en: "Cap it with a ring; min-max for prices, LTTB for smooth lines.",
      vi: "Giới hạn bằng ring buffer; min-max cho giá, LTTB cho đường mượt.",
    },
    takeaway: {
      en: "A fixed-size ring buffer (ideally typed arrays) caps memory for streaming points. Downsample to one or two points per pixel: Largest-Triangle-Three-Buckets keeps the shape of smooth lines but can drop a one-point spike, so use min-max per pixel column for prices; load older, coarser history from the server on zoom-out.",
      vi: "Ring buffer kích thước cố định (tốt nhất dùng typed array) giới hạn bộ nhớ cho dữ liệu streaming. Downsample về một đến hai điểm mỗi pixel: Largest-Triangle-Three-Buckets giữ hình dạng đường mượt nhưng có thể bỏ mất spike chỉ có một điểm, nên với giá hãy dùng min-max theo từng cột pixel; khi zoom out thì lấy lịch sử cũ, độ phân giải thô hơn từ server.",
    },
    priority: "medium",
    topicId: "finance-viz",
    relatedItemIds: ["isb-q36", "isb-q54"],
  },

  /* ---------- Testing + backend integration ---------- */
  {
    id: "isb-cc27",
    title: { en: "Testing streaming UIs", vi: "Kiểm thử UI streaming" },
    memoryShortcut: {
      en: "Logic in unit, UI with a mock socket, flows with routeWebSocket.",
      vi: "Logic ở unit, UI với mock socket, luồng E2E với routeWebSocket.",
    },
    takeaway: {
      en: "Unit-test pure reducers and aggregators; RTL tests query by role, await outcomes and control time with fake timers; Playwright's routeWebSocket scripts snapshots, gaps and disconnects deterministically for E2E checks in CI.",
      vi: "Unit test cho reducer và aggregator thuần; test RTL query theo role, chờ kết quả và điều khiển thời gian bằng fake timer; routeWebSocket của Playwright giúp kịch bản hoá snapshot, gap và mất kết nối một cách xác định cho test E2E trên CI.",
    },
    priority: "high",
    topicId: "testing-python-linux",
    relatedItemIds: ["isb-q45", "isb-q46", "isb-q47"],
  },
  {
    id: "isb-cc28",
    title: { en: "Contracts with Rust and Python backends", vi: "Contract với backend Rust và Python" },
    memoryShortcut: {
      en: "Contract first, generate types, evolve additively.",
      vi: "Contract trước, sinh type, thay đổi kiểu bổ sung.",
    },
    takeaway: {
      en: "OpenAPI (FastAPI generates it from Pydantic) → generated TypeScript types or Zod schemas checked in CI. Version streaming schemas (JSON Schema or protobuf for binary), make changes additive and ignore unknown fields. Rust's speed and safety explain why it owns low-latency paths — awareness, not production experience.",
      vi: "OpenAPI (FastAPI sinh từ Pydantic) → sinh TypeScript type hoặc Zod schema và kiểm tra trên CI. Đánh version cho schema streaming (JSON Schema hoặc protobuf cho binary), thay đổi theo kiểu bổ sung và bỏ qua field lạ. Tốc độ và độ an toàn của Rust giải thích vì sao nó đảm nhận phần độ trễ thấp — đây là hiểu biết, không phải kinh nghiệm production.",
    },
    priority: "medium",
    topicId: "fe-system-design",
    relatedItemIds: ["isb-q44", "isb-q48", "isb-q49"],
  },
];

/* ------------------------------------------------------------------ */
/* Flashcards                                                          */
/* ------------------------------------------------------------------ */

export const isbFlashcards: Flashcard[] = [
  /* ---------- Real-time (7) ---------- */
  {
    id: "isb-fc01",
    topicId: "realtime",
    relatedItemId: "isb-q01",
    priority: "critical",
    front: {
      en: "WebSocket or SSE for a real-time trading dashboard?",
      vi: "Dùng WebSocket hay SSE cho dashboard giao dịch real-time?",
    },
    back: {
      answer:
        "It depends on direction and payload. SSE is one-way, server to client, over plain HTTP, with built-in reconnect and Last-Event-ID, so it's great for prices and notifications. WebSocket is full-duplex and supports binary frames, so I'd pick it when the client sends frequent subscribe and unsubscribe messages or the feed is high-volume. Long polling is only a fallback. Order placement still goes over REST, for idempotency and clear error handling.",
      viExplanation:
        "SSE chỉ một chiều server → client trên HTTP thường, tự reconnect và có Last-Event-ID nên rất hợp cho giá và thông báo. WebSocket là full-duplex, hỗ trợ binary, phù hợp khi client gửi subscribe/unsubscribe liên tục hoặc feed có lưu lượng lớn. Long polling chỉ là phương án dự phòng. Lưu ý SSE trên HTTP/1.1 bị giới hạn khoảng 6 kết nối mỗi origin, nên dùng HTTP/2. Đặt lệnh vẫn nên đi qua REST để có idempotency.",
      memoryShortcut: {
        en: "One-way news → SSE; two-way chat → WebSocket; orders → REST.",
        vi: "Một chiều → SSE; hai chiều → WebSocket; đặt lệnh → REST.",
      },
    },
  },
  {
    id: "isb-fc02",
    topicId: "realtime",
    relatedItemId: "isb-q02",
    priority: "critical",
    front: {
      en: "How do you reconnect a dropped WebSocket safely?",
      vi: "Làm sao reconnect WebSocket bị rớt một cách an toàn?",
    },
    back: {
      answer:
        "I treat the connection as a state machine: connecting, open, reconnecting, closed. On an unexpected close I retry with exponential backoff plus jitter, with a cap, so thousands of clients don't reconnect at the same instant. Before reconnecting I refresh the auth token if needed. Once open, I resubscribe from a subscription registry and resync each stream with a fresh snapshot, because deltas sent while I was offline are gone.",
      viExplanation:
        "Coi kết nối là một state machine. Khi mất kết nối bất thường, retry với exponential backoff + jitter và có giới hạn trần để tránh thundering herd — hàng nghìn client cùng reconnect một lúc. Refresh token trước khi kết nối lại nếu cần. Sau khi open, resubscribe từ subscription registry và lấy snapshot mới cho từng stream, vì các delta gửi trong lúc mất kết nối đã bị mất.",
      memoryShortcut: {
        en: "Back off, jitter, re-auth, resubscribe, resync.",
        vi: "Lùi dần, ngẫu nhiên, xác thực lại, đăng ký lại, đồng bộ lại.",
      },
    },
  },
  {
    id: "isb-fc03",
    topicId: "realtime",
    relatedItemId: "isb-q03",
    priority: "critical",
    front: {
      en: "Thousands of ticks per second — how do you keep the UI smooth?",
      vi: "Hàng nghìn tick mỗi giây — làm sao giữ UI mượt?",
    },
    back: {
      answer:
        "I never call setState per message. Messages go into a buffer keyed by symbol, so only the latest price per symbol survives — that's conflation. Once per requestAnimationFrame I flush the buffer into the store in a single update, so React renders at most once per frame. Heavy parsing can move to a Web Worker, and components subscribe with narrow selectors, so only the rows that actually changed re-render.",
      viExplanation:
        "Không setState cho từng message. Gom message vào buffer theo symbol, chỉ giữ giá mới nhất (conflation). Mỗi requestAnimationFrame flush một lần vào store, nên React render tối đa một lần mỗi frame (khoảng 16,7ms ở màn hình 60Hz). Parse nặng thì chuyển sang Web Worker. Component subscribe bằng selector hẹp để chỉ những dòng thực sự thay đổi mới re-render.",
      memoryShortcut: {
        en: "Buffer, conflate, flush once per frame.",
        vi: "Gom lại, giữ bản mới nhất, flush mỗi frame.",
      },
    },
  },
  {
    id: "isb-fc04",
    topicId: "realtime",
    relatedItemId: "isb-q04",
    priority: "critical",
    front: {
      en: "How do you detect and recover from a missed message?",
      vi: "Làm sao phát hiện và khôi phục khi bị mất message?",
    },
    back: {
      answer:
        "Each message carries a sequence number per stream. I start from a snapshot that includes its last sequence, then only apply deltas whose sequence is last plus one. Lower or equal is a duplicate, so I drop it. A jump is a gap, so I stop applying, buffer new deltas, fetch a fresh snapshot and replay the buffered deltas newer than it. I never patch over a gap — a wrong order book is worse than a brief loading state.",
      viExplanation:
        "Mỗi message có sequence number theo stream. Bắt đầu từ snapshot kèm seq cuối, chỉ áp dụng delta có seq = last + 1. Seq nhỏ hơn hoặc bằng là trùng lặp → bỏ qua. Seq nhảy cóc là gap → dừng áp dụng, buffer delta mới, lấy snapshot mới rồi replay các delta mới hơn snapshot. Không vá qua gap: order book sai còn tệ hơn một thoáng loading.",
      memoryShortcut: {
        en: "Snapshot, then seq + 1 only; a gap means resync.",
        vi: "Snapshot trước, chỉ nhận seq + 1; có gap thì resync.",
      },
    },
  },
  {
    id: "isb-fc05",
    topicId: "realtime",
    relatedItemId: "isb-q05",
    priority: "critical",
    front: {
      en: "What is client-side backpressure and how do you handle it?",
      vi: "Backpressure phía client là gì và xử lý thế nào?",
    },
    back: {
      answer:
        "Backpressure is when messages arrive faster than I can process and render them. The signals are a growing queue, increasing lag between server timestamps and local time, and long tasks. I use a bounded queue, conflate prices to the latest value per key, but never drop trades or order events. I ask the server to throttle or switch to a lower-frequency channel, and I show a degraded indicator instead of silently displaying stale data.",
      viExplanation:
        "Backpressure là khi message đến nhanh hơn khả năng xử lý và render. Dấu hiệu: queue phình ra, độ trễ giữa timestamp server và thời gian local tăng dần, xuất hiện long task. Cách xử lý: queue có giới hạn, conflation cho dữ liệu giá, nhưng không bao giờ bỏ trade hay order event; yêu cầu server throttle hoặc chuyển sang kênh tần suất thấp hơn; hiển thị trạng thái degraded thay vì âm thầm hiển thị dữ liệu cũ.",
      memoryShortcut: {
        en: "Bound the queue, conflate prices, never drop orders, tell the server.",
        vi: "Giới hạn queue, gộp giá, không bỏ lệnh, báo server.",
      },
    },
  },
  {
    id: "isb-fc06",
    topicId: "realtime",
    relatedItemId: "isb-q06",
    priority: "high",
    front: {
      en: "When would you move stream processing into a Web Worker?",
      vi: "Khi nào nên chuyển xử lý stream sang Web Worker?",
    },
    back: {
      answer:
        "When parsing, decoding or aggregation shows up as long tasks on the main thread. The worker owns the socket or receives raw frames, decodes JSON or binary, conflates and aggregates, then posts compact batches back — ideally as transferable ArrayBuffers so nothing is copied. Across several tabs, a SharedWorker can hold one connection for all of them, with a leader tab elected via the Web Locks API, fanning out over BroadcastChannel, as a fallback where SharedWorker isn't supported.",
      viExplanation:
        "Khi parse, decode hoặc aggregate gây long task trên main thread. Worker giữ socket hoặc nhận frame thô, decode JSON/binary, conflate và aggregate, rồi gửi batch gọn về main thread — tốt nhất dùng transferable ArrayBuffer để không phải copy, vì postMessage thông thường tốn chi phí structured clone. Nhiều tab thì dùng SharedWorker để chia sẻ một kết nối; nơi không hỗ trợ thì fallback bằng leader tab bầu qua Web Locks API và phát dữ liệu qua BroadcastChannel.",
      memoryShortcut: {
        en: "Main thread paints; worker thinks.",
        vi: "Main thread để vẽ; worker để tính.",
      },
    },
  },
  {
    id: "isb-fc07",
    topicId: "realtime",
    relatedItemId: "isb-q07",
    priority: "high",
    front: {
      en: "How do you show the user that prices are stale?",
      vi: "Làm sao cho người dùng biết giá đã cũ (stale)?",
    },
    back: {
      answer:
        "I use two checks. A heartbeat detects a dead connection, because a TCP socket can look open while nothing arrives. Separately, I track the last update time per stream: if a symbol hasn't ticked within its expected interval, I grey out the price or show its age instead of presenting it as live. A connection badge shows live, reconnecting or offline, and order entry is warned or blocked when data is stale.",
      viExplanation:
        "Dùng hai lớp kiểm tra. Heartbeat/ping để phát hiện kết nối chết, vì socket TCP có thể trông vẫn mở dù không có dữ liệu. Ngoài ra theo dõi thời điểm cập nhật cuối của từng stream; quá ngưỡng thì làm mờ giá hoặc hiện tuổi dữ liệu thay vì giả vờ là live. Badge kết nối hiển thị live / reconnecting / offline, và khi dữ liệu stale thì cảnh báo hoặc khoá đặt lệnh.",
      memoryShortcut: {
        en: "Heartbeat for the pipe, timestamp for the data.",
        vi: "Heartbeat cho đường ống, timestamp cho dữ liệu.",
      },
    },
  },

  /* ---------- React + browser performance (10) ---------- */
  {
    id: "isb-fc08",
    topicId: "react-performance",
    relatedItemId: "isb-q08",
    priority: "critical",
    front: {
      en: "What actually triggers a React re-render?",
      vi: "Điều gì thực sự gây ra re-render trong React?",
    },
    back: {
      answer:
        "A component re-renders when its state changes, when its parent re-renders, or when a context it consumes changes. Changed props aren't the trigger on their own — the parent rendering is. Rendering just calls the component and diffs the result; the commit phase is where React touches the DOM. Keys tell reconciliation which item is which, so stable ids keep row state and DOM nodes, while index keys break when rows reorder.",
      viExplanation:
        "Component re-render khi state của nó đổi, khi component cha re-render, hoặc khi context nó dùng thay đổi. Bản thân props đổi không phải nguyên nhân — cha render mới là nguyên nhân. Render phase chỉ gọi hàm component và so sánh kết quả; commit phase mới thao tác DOM. Key giúp reconciliation nhận diện phần tử: id ổn định giữ được state và DOM node, còn index key sẽ lỗi khi danh sách đổi thứ tự.",
      memoryShortcut: {
        en: "State, parent, context — render is cheap, commit touches the DOM.",
        vi: "State, cha, context — render rẻ, commit mới đụng DOM.",
      },
    },
  },
  {
    id: "isb-fc09",
    topicId: "react-performance",
    relatedItemId: "isb-q09",
    priority: "critical",
    front: {
      en: "How do you find unnecessary re-renders in a live dashboard?",
      vi: "Làm sao tìm re-render thừa trong một dashboard live?",
    },
    back: {
      answer:
        "Measure first. I record with the React DevTools Profiler, turn on highlight updates and check why each component rendered. Typical culprits are a large context value that changes every tick, selectors that return new objects, and inline props that defeat memo. The fixes are narrow store selectors per row or cell, split contexts, fast-changing state moved down the tree, and memoized rows with stable props. Then I profile again to confirm.",
      viExplanation:
        "Đo trước khi sửa. Dùng React DevTools Profiler, bật highlight updates và xem lý do mỗi component render. Thủ phạm thường gặp: context lớn thay đổi mỗi tick, selector trả về object mới, prop inline làm memo vô dụng. Cách sửa: selector hẹp theo từng row/cell, tách context, đẩy state thay đổi nhanh xuống thấp, memo row component với prop ổn định. Sau đó profile lại để xác nhận.",
      memoryShortcut: {
        en: "Profile, find the hot source, narrow the subscription.",
        vi: "Profile, tìm nguồn nóng, thu hẹp subscription.",
      },
    },
  },
  {
    id: "isb-fc10",
    topicId: "react-performance",
    relatedItemId: "isb-q10",
    priority: "high",
    front: {
      en: "When does useMemo or React.memo hurt instead of help?",
      vi: "Khi nào useMemo hoặc React.memo gây hại thay vì có ích?",
    },
    back: {
      answer:
        "Memoization costs memory plus a comparison on every render, so it hurts when the work is cheap or the inputs change every time anyway — like memoizing a row whose props are a new object each tick. It helps for expensive calculations, stable references passed to memoized children, and effect dependencies. With the React Compiler much of this becomes automatic, so I focus on clean data flow and component boundaries.",
      viExplanation:
        "Memoization tốn bộ nhớ và một lần so sánh mỗi lần render, nên có hại khi tính toán vốn rẻ hoặc input lần nào cũng đổi — ví dụ memo một row mà prop là object mới mỗi tick. Nó có ích cho tính toán nặng, giữ reference ổn định cho component con đã memo và cho dependency của effect. Với React Compiler, phần lớn việc này được tự động hoá, nên ưu tiên data flow và ranh giới component rõ ràng.",
      memoryShortcut: {
        en: "Memo pays only if inputs are stable and work is expensive.",
        vi: "Memo chỉ đáng khi input ổn định và tính toán nặng.",
      },
    },
  },
  {
    id: "isb-fc11",
    topicId: "react-performance",
    relatedItemId: "isb-q11",
    priority: "high",
    front: {
      en: "useTransition vs useDeferredValue — what's the difference?",
      vi: "useTransition và useDeferredValue khác nhau thế nào?",
    },
    back: {
      answer:
        "Both mark work as non-urgent so React can interrupt it and keep input responsive. useTransition wraps a state update you own — for example switching a filter that re-renders a big table — and gives you isPending. useDeferredValue is for a value you receive, like a search term from props: React renders the urgent UI first, then the expensive part with the deferred value. Neither makes slow code faster; they reorder priorities.",
      viExplanation:
        "Cả hai đánh dấu công việc là không khẩn cấp để React có thể ngắt giữa chừng và giữ input mượt. useTransition bọc state update do bạn kiểm soát — ví dụ đổi filter làm bảng lớn re-render — và có isPending. useDeferredValue dùng cho giá trị nhận vào, như từ khoá search từ props: React render phần khẩn cấp trước, phần nặng dùng giá trị deferred sau. Chúng không làm code chậm nhanh hơn, chỉ sắp xếp lại độ ưu tiên.",
      memoryShortcut: {
        en: "Transition wraps the setter; deferred wraps the value.",
        vi: "Transition bọc setter; deferred bọc value.",
      },
    },
  },
  {
    id: "isb-fc12",
    topicId: "react-performance",
    relatedItemId: "isb-q12",
    priority: "critical",
    front: {
      en: "What is layout thrashing and how do you avoid it?",
      vi: "Layout thrashing là gì và tránh nó thế nào?",
    },
    back: {
      answer:
        "The pipeline is style, layout, paint, composite. Layout thrashing happens when code alternates DOM writes and layout reads — setting a width, then reading offsetHeight, in a loop — which forces a synchronous layout on every iteration. I batch all reads first, then all writes, ideally inside requestAnimationFrame. For animations and price-flash effects I use transform and opacity, which the compositor can handle without layout or paint.",
      viExplanation:
        "Pipeline gồm style → layout → paint → composite. Layout thrashing xảy ra khi code xen kẽ ghi DOM và đọc layout — ví dụ set width rồi đọc offsetHeight trong vòng lặp — buộc trình duyệt tính layout đồng bộ ở mỗi lần lặp. Cách tránh: gom đọc trước, ghi sau, tốt nhất trong requestAnimationFrame. Animation và hiệu ứng nháy giá nên dùng transform và opacity để chạy trên compositor, không cần layout hay paint.",
      memoryShortcut: {
        en: "Read all, then write all; animate transform and opacity.",
        vi: "Đọc hết rồi ghi hết; animate bằng transform và opacity.",
      },
    },
  },
  {
    id: "isb-fc13",
    topicId: "react-performance",
    relatedItemId: "isb-q13",
    priority: "critical",
    front: {
      en: "How do you render 100k rows with live updates?",
      vi: "Làm sao render 100k dòng có cập nhật live?",
    },
    back: {
      answer:
        "Virtualize. Only the rows in the viewport plus a small overscan are rendered, inside a spacer with the full height — for example with TanStack Virtual. Fixed row heights keep scroll math cheap and stable; variable heights need measurement and cached offsets. Live updates go into a store keyed by row id, and each visible row subscribes to its own slice, so a tick updates one row, not the table. Scroll stays anchored when rows are inserted above.",
      viExplanation:
        "Dùng virtualization: chỉ render các dòng trong viewport cộng một ít overscan, đặt trong spacer có chiều cao đầy đủ, ví dụ dùng TanStack Virtual. Chiều cao dòng cố định giúp tính scroll rẻ và ổn định; chiều cao thay đổi thì cần đo và cache offset. Cập nhật live vào store theo row id, mỗi dòng hiển thị subscribe phần dữ liệu riêng, nên một tick chỉ cập nhật một dòng. Giữ vị trí scroll khi chèn dòng phía trên.",
      memoryShortcut: {
        en: "Render the window, not the world.",
        vi: "Render cửa sổ, không render cả thế giới.",
      },
    },
  },
  {
    id: "isb-fc14",
    topicId: "react-performance",
    relatedItemId: "isb-q14",
    priority: "high",
    front: {
      en: "Canvas, SVG or WebGL for a financial chart?",
      vi: "Chọn Canvas, SVG hay WebGL cho chart tài chính?",
    },
    back: {
      answer:
        "SVG is DOM-based, easy to style and make accessible, and fine for hundreds to a few thousand elements, but every node costs layout and memory. Canvas draws pixels in immediate mode, so it scales to tens of thousands of points, but I own hit-testing and accessibility. WebGL uses the GPU for far larger datasets at much higher complexity. For live charts I'd start with canvas and add an SVG or DOM overlay for annotations.",
      viExplanation:
        "SVG dựa trên DOM, dễ style, dễ làm accessibility, hợp với vài trăm đến vài nghìn phần tử, nhưng mỗi node đều tốn layout và bộ nhớ. Canvas vẽ pixel theo immediate mode nên chịu được hàng chục nghìn điểm, nhưng phải tự làm hit-testing và accessibility. WebGL dùng GPU cho dữ liệu lớn hơn nhiều nhưng phức tạp hơn hẳn. Với chart live, bắt đầu bằng canvas và thêm lớp SVG/DOM overlay cho annotation.",
      memoryShortcut: {
        en: "Few elements → SVG, many → canvas, massive → WebGL.",
        vi: "Ít phần tử → SVG, nhiều → canvas, cực nhiều → WebGL.",
      },
    },
  },
  {
    id: "isb-fc15",
    topicId: "react-performance",
    relatedItemId: "isb-q15",
    priority: "critical",
    front: {
      en: "How do you find a memory leak in a long-running dashboard?",
      vi: "Làm sao tìm memory leak trong dashboard chạy lâu?",
    },
    back: {
      answer:
        "I use the three-snapshot technique in Chrome DevTools: take a heap snapshot, repeat an action like opening and closing a chart several times, take more snapshots, and compare what keeps growing. I filter for detached DOM nodes and follow the retainers. Common causes are listeners and subscriptions without cleanup, timers, closures holding large arrays, and unbounded tick buffers or caches. The fix is proper effect cleanup plus bounded buffers.",
      viExplanation:
        "Dùng kỹ thuật ba snapshot trong Chrome DevTools: chụp heap snapshot, lặp lại một thao tác như mở/đóng chart nhiều lần, chụp tiếp và so sánh những gì cứ tăng. Lọc detached DOM node và lần theo retainer. Nguyên nhân phổ biến: listener và subscription không được gỡ trong cleanup, timer, closure giữ mảng lớn, buffer tick hoặc cache không giới hạn. Cách sửa: cleanup đầy đủ trong effect và buffer có giới hạn.",
      memoryShortcut: {
        en: "Snapshot, repeat, snapshot — follow the retainers.",
        vi: "Chụp, lặp lại, chụp — lần theo retainer.",
      },
    },
  },
  {
    id: "isb-fc16",
    topicId: "react-performance",
    relatedItemId: "isb-q16",
    priority: "high",
    front: {
      en: "What is INP and how do you improve it in a data-heavy app?",
      vi: "INP là gì và cải thiện nó thế nào trong app nhiều dữ liệu?",
    },
    back: {
      answer:
        "Interaction to Next Paint measures the delay from a user interaction until the next frame is painted, reported near the worst interaction on the page; good is 200 milliseconds or less. In data-heavy apps it's usually hurt by long tasks from processing updates or re-rendering big tables. I keep event handlers minimal, chunk work and yield, use transitions for non-urgent renders, and virtualize. I measure field data with the web-vitals library.",
      viExplanation:
        "INP (Interaction to Next Paint) đo thời gian từ lúc người dùng tương tác đến khi frame tiếp theo được vẽ, lấy gần mức tệ nhất trong các tương tác của trang; tốt là ≤ 200ms. Trong app nhiều dữ liệu, INP thường xấu do long task khi xử lý cập nhật hoặc re-render bảng lớn. Cách cải thiện: giữ event handler tối giản, chia nhỏ công việc và yield, dùng transition cho render không khẩn cấp, dùng virtualization. Đo dữ liệu thực tế bằng thư viện web-vitals.",
      memoryShortcut: {
        en: "Short handlers, chunked work, paint fast.",
        vi: "Handler ngắn, chia nhỏ việc, vẽ sớm.",
      },
    },
  },
  {
    id: "isb-fc17",
    topicId: "react-performance",
    relatedItemId: "isb-q18",
    priority: "high",
    front: {
      en: "How do you keep work inside the frame budget?",
      vi: "Làm sao giữ công việc trong frame budget?",
    },
    back: {
      answer:
        "At 60 hertz a frame is about 16.7 milliseconds, and the browser needs part of that for style, layout and paint. Any task over 50 milliseconds counts as a long task and delays input. I batch updates into one requestAnimationFrame flush, split big loops into chunks and yield between them — scheduler.yield where it's supported, a setTimeout fallback otherwise — and move pure computation into a worker.",
      viExplanation:
        "Ở 60Hz mỗi frame khoảng 16,7ms, và trình duyệt cần một phần thời gian đó cho style, layout, paint. Task dài hơn 50ms được tính là long task và làm chậm phản hồi input. Cách xử lý: gom cập nhật vào một lần flush bằng requestAnimationFrame, chia vòng lặp lớn thành nhiều phần và yield giữa các phần bằng scheduler.yield (nếu trình duyệt hỗ trợ) hoặc fallback setTimeout, và chuyển tính toán thuần sang worker.",
      memoryShortcut: {
        en: "16.7 ms per frame, 50 ms is a long task — chunk and yield.",
        vi: "16,7ms mỗi frame, 50ms là long task — chia nhỏ và yield.",
      },
    },
  },

  /* ---------- JavaScript + TypeScript (4) ---------- */
  {
    id: "isb-fc18",
    topicId: "js-ts",
    relatedItemId: "isb-q19",
    priority: "high",
    front: {
      en: "Microtasks vs macrotasks — why does it matter for a live UI?",
      vi: "Microtask và macrotask — vì sao quan trọng với UI live?",
    },
    back: {
      answer:
        "After each task — a timer, a message event, a click handler — the browser drains the entire microtask queue, meaning promise callbacks and queueMicrotask, before it can render. So a long chain of microtasks blocks painting just like synchronous code. For a live UI I schedule visual work with requestAnimationFrame, which runs right before paint, and avoid processing a whole burst of socket messages in one promise chain.",
      viExplanation:
        "Sau mỗi task (timer, message event, click handler), trình duyệt chạy hết toàn bộ microtask queue (promise callback, queueMicrotask) rồi mới có thể render. Vì vậy chuỗi microtask dài cũng chặn việc vẽ giống như code đồng bộ. Với UI live, lên lịch công việc hiển thị bằng requestAnimationFrame — chạy ngay trước khi paint — và tránh xử lý cả loạt message socket trong một chuỗi promise.",
      memoryShortcut: {
        en: "One task, all microtasks, then maybe render.",
        vi: "Một task, hết microtask, rồi mới có thể render.",
      },
    },
  },
  {
    id: "isb-fc19",
    topicId: "js-ts",
    relatedItemId: "isb-q20",
    priority: "high",
    front: {
      en: "What is a stale closure in a WebSocket handler, and how do you fix it?",
      vi: "Stale closure trong handler WebSocket là gì và sửa thế nào?",
    },
    back: {
      answer:
        "If I register socket.onmessage inside a useEffect with an empty dependency array, the handler closes over the state from the first render and keeps reading old values forever. The fixes are the functional updater form, setX(prev => …), keeping the latest value in a ref, or moving the logic into an external store like Zustand and reading it with getState. Re-subscribing on every change is usually the wrong fix for a socket.",
      viExplanation:
        "Nếu đăng ký socket.onmessage trong useEffect với dependency rỗng, handler sẽ 'đóng băng' state của lần render đầu và luôn đọc giá trị cũ. Cách sửa: dùng functional updater setX(prev => …), lưu giá trị mới nhất vào ref, hoặc chuyển logic ra store bên ngoài như Zustand và đọc bằng getState. Subscribe lại mỗi lần state đổi thường là cách sửa sai với socket, vì gây đóng mở kết nối liên tục.",
      memoryShortcut: {
        en: "Functional updater, ref, or store — not re-subscribe.",
        vi: "Functional updater, ref hoặc store — không subscribe lại.",
      },
    },
  },
  {
    id: "isb-fc20",
    topicId: "js-ts",
    relatedItemId: "isb-q21",
    priority: "critical",
    front: {
      en: "How do you represent prices and quantities safely in JavaScript?",
      vi: "Biểu diễn giá và khối lượng an toàn trong JavaScript thế nào?",
    },
    back: {
      answer:
        "JavaScript numbers are binary floating point, so 0.1 plus 0.2 isn't exactly 0.3. For display-only market data, numbers are usually fine if I format with the instrument's tick size. For anything summed, compared or sent back — order prices, quantities, P&L — I use integers in minor units or a decimal library, and ideally receive decimals as strings from the backend. Rounding happens once, at the boundary, with an explicit rule.",
      viExplanation:
        "Number trong JavaScript là số dấu phẩy động nhị phân, nên 0.1 + 0.2 không bằng chính xác 0.3. Dữ liệu chỉ để hiển thị thì thường dùng number được nếu format theo tick size. Với thứ cần cộng dồn, so sánh hoặc gửi lại server — giá đặt lệnh, khối lượng, P&L — dùng số nguyên theo đơn vị nhỏ nhất hoặc thư viện decimal, và nên nhận số thập phân dạng string từ backend. Làm tròn một lần, ở biên, với quy tắc rõ ràng.",
      memoryShortcut: {
        en: "Display with floats, calculate with decimals, round once.",
        vi: "Hiển thị dùng float, tính toán dùng decimal, làm tròn một lần.",
      },
    },
  },
  {
    id: "isb-fc21",
    topicId: "js-ts",
    relatedItemId: "isb-q22",
    priority: "high",
    front: {
      en: "How do you type a WebSocket message protocol in TypeScript?",
      vi: "Định nghĩa kiểu cho protocol message WebSocket bằng TypeScript thế nào?",
    },
    back: {
      answer:
        "With a discriminated union on a type field — say trade, book delta, heartbeat and error, each with its own payload. A switch on message.type narrows the payload automatically, and a default branch that assigns the message to never makes the compiler fail when a new message type appears that I haven't handled. At runtime I still validate with Zod at the boundary, because types disappear after compilation.",
      viExplanation:
        "Dùng discriminated union với trường type: ví dụ trade, book delta, heartbeat, error, mỗi loại có payload riêng. Switch theo message.type sẽ tự thu hẹp kiểu của payload, và nhánh default gán message vào kiểu never giúp compiler báo lỗi khi có loại message mới chưa được xử lý. Ở runtime vẫn phải validate bằng Zod tại biên, vì type biến mất sau khi compile.",
      memoryShortcut: {
        en: "Tag it, switch it, never forget it.",
        vi: "Gắn tag, switch theo tag, dùng never để không bỏ sót.",
      },
    },
  },

  /* ---------- State + Next.js (3) ---------- */
  {
    id: "isb-fc22",
    topicId: "state-nextjs",
    relatedItemId: "isb-q26",
    priority: "high",
    front: {
      en: "Why Zustand for high-frequency state, and what is a transient update?",
      vi: "Vì sao dùng Zustand cho state tần suất cao, transient update là gì?",
    },
    back: {
      answer:
        "Zustand is a small external store: components subscribe with selectors and only re-render when their selected slice changes, without a Provider re-rendering the tree. For very hot values, like a flashing price cell, I can use store.subscribe to update a DOM node or a canvas directly — a transient update — with no React render at all. Redux Toolkit works too, with more structure; Context is a poor fit for values that change every tick.",
      viExplanation:
        "Zustand là store bên ngoài, nhỏ gọn; component subscribe bằng selector và chỉ re-render khi phần dữ liệu được chọn thay đổi, không có Provider làm re-render cả cây. Với giá trị cực nóng như ô giá nhấp nháy, có thể dùng store.subscribe để cập nhật trực tiếp DOM node hoặc canvas — gọi là transient update — không cần React render. Redux Toolkit cũng ổn nhưng nhiều cấu trúc hơn; Context không hợp với giá trị đổi mỗi tick.",
      memoryShortcut: {
        en: "Select narrow; subscribe hot values outside React.",
        vi: "Chọn hẹp; giá trị nóng thì subscribe ngoài React.",
      },
    },
  },
  {
    id: "isb-fc23",
    topicId: "state-nextjs",
    relatedItemId: "isb-q27",
    priority: "high",
    front: {
      en: "staleTime vs gcTime — and how do WebSocket updates fit TanStack Query?",
      vi: "staleTime và gcTime khác nhau thế nào — cập nhật WebSocket kết hợp TanStack Query ra sao?",
    },
    back: {
      answer:
        "staleTime is how long data counts as fresh, so no refetch happens; gcTime is how long an unused query stays cached before it's garbage-collected. For streamed data I load the snapshot with useQuery, set a long staleTime because the socket keeps it current, and apply deltas with queryClient.setQueryData. Very high-frequency ticks belong in a dedicated store instead, because every setQueryData notifies observers. I used TanStack Query prefetching and caching at Persefoni.",
      viExplanation:
        "staleTime là khoảng thời gian dữ liệu được coi là còn mới, không refetch; gcTime là thời gian query không còn ai dùng vẫn được giữ trong cache trước khi bị dọn. Với dữ liệu streaming: lấy snapshot bằng useQuery, đặt staleTime dài vì socket giữ dữ liệu luôn mới, và áp delta bằng queryClient.setQueryData. Tick tần suất rất cao nên để ở store riêng, vì mỗi lần setQueryData đều notify các observer.",
      memoryShortcut: {
        en: "Stale = when to refetch; gc = when to forget.",
        vi: "Stale = khi nào refetch; gc = khi nào xoá khỏi cache.",
      },
    },
  },
  {
    id: "isb-fc24",
    topicId: "state-nextjs",
    relatedItemId: "isb-q28",
    priority: "medium",
    front: {
      en: "Where does live data belong in a Next.js App Router app?",
      vi: "Dữ liệu live nên nằm ở đâu trong app Next.js App Router?",
    },
    back: {
      answer:
        "Server Components are great for the shell: layout, navigation, user settings and the initial snapshot, fetched close to the data with no client JavaScript. But WebSockets, timers and subscriptions need the browser, so the live grid, chart and order ticket are Client Components — effectively a client island. I pass the initial snapshot as props for a fast first paint, then the client data layer takes over the stream.",
      viExplanation:
        "Server Component hợp cho phần khung: layout, navigation, cài đặt người dùng và snapshot ban đầu, fetch gần nguồn dữ liệu và không tốn JavaScript phía client. Nhưng WebSocket, timer và subscription cần trình duyệt, nên grid live, chart và order ticket là Client Component — một 'client island'. Truyền snapshot ban đầu qua props để first paint nhanh, sau đó data layer phía client tiếp quản stream.",
      memoryShortcut: {
        en: "Server renders the frame, client streams the numbers.",
        vi: "Server dựng khung, client stream con số.",
      },
    },
  },

  /* ---------- Trading + financial visualization (4) ---------- */
  {
    id: "isb-fc25",
    topicId: "finance-viz",
    relatedItemId: "isb-q31",
    priority: "high",
    front: {
      en: "Explain bid, ask, spread and depth — and how you render an order book.",
      vi: "Giải thích bid, ask, spread, depth — và cách render order book.",
    },
    back: {
      answer:
        "The bid is the highest price buyers are willing to pay, the ask is the lowest price sellers will accept, and the spread is ask minus bid. Depth is the total size available at each price level. In the UI, bids are sorted descending and asks ascending, with cumulative size bars. I keep each side in a map keyed by price, apply deltas where size zero removes a level, and render only the top N levels.",
      viExplanation:
        "Bid là giá cao nhất người mua sẵn sàng trả, ask là giá thấp nhất người bán chấp nhận, spread = ask − bid. Depth là tổng khối lượng có sẵn tại mỗi mức giá. Trên UI, bid sắp xếp giảm dần, ask tăng dần, kèm thanh khối lượng cộng dồn. Mỗi phía lưu trong map theo giá, áp delta trong đó size = 0 nghĩa là xoá mức giá, và chỉ render top N mức, tính lại theo frame chứ không theo từng message.",
      memoryShortcut: {
        en: "Bids down, asks up, size zero deletes.",
        vi: "Bid giảm dần, ask tăng dần, size 0 là xoá.",
      },
    },
  },
  {
    id: "isb-fc26",
    topicId: "finance-viz",
    relatedItemId: "isb-q32",
    priority: "high",
    front: {
      en: "How do you build OHLC candles from ticks on the client?",
      vi: "Dựng nến OHLC từ tick ở phía client thế nào?",
    },
    back: {
      answer:
        "Bucket each trade by flooring its timestamp to the interval: bucket equals floor of timestamp divided by interval, times interval. The first trade in a bucket sets open, high and low; later trades update high, low and close and add volume. The latest candle is partial and keeps changing until its bucket closes. I align buckets in UTC, convert only for display, and handle empty intervals and late trades explicitly.",
      viExplanation:
        "Gom mỗi trade vào bucket bằng cách làm tròn xuống timestamp theo interval: bucket = floor(ts / interval) * interval. Trade đầu tiên trong bucket đặt open, high, low; các trade sau cập nhật high, low, close và cộng volume. Nến mới nhất là nến dở dang, còn thay đổi đến khi bucket đóng. Căn bucket theo UTC, chỉ đổi múi giờ khi hiển thị, và xử lý rõ ràng các interval trống và trade đến trễ.",
      memoryShortcut: {
        en: "Floor the time; first is open, last is close.",
        vi: "Làm tròn thời gian; đầu là open, cuối là close.",
      },
    },
  },
  {
    id: "isb-fc27",
    topicId: "finance-viz",
    relatedItemId: "isb-q33",
    priority: "high",
    front: {
      en: "Market, limit, stop, stop-limit — and how should the UI show order state?",
      vi: "Lệnh market, limit, stop, stop-limit — UI hiển thị trạng thái lệnh thế nào?",
    },
    back: {
      answer:
        "A market order executes immediately at the best available price; a limit order only at the limit price or better. A stop order becomes a market order once the stop price is reached, and a stop-limit becomes a limit order. The UI should follow the server's lifecycle — pending, accepted, partially filled, filled, cancelled, rejected — show filled versus remaining quantity, and never mark an order filled based on a local assumption.",
      viExplanation:
        "Lệnh market khớp ngay ở giá tốt nhất hiện có; lệnh limit chỉ khớp ở giá limit hoặc tốt hơn. Lệnh stop trở thành lệnh market khi chạm giá stop, còn stop-limit trở thành lệnh limit. UI phải đi theo vòng đời lệnh từ server — pending, accepted, partially filled, filled, cancelled, rejected — hiển thị khối lượng đã khớp và còn lại, và không bao giờ đánh dấu filled chỉ dựa trên giả định phía client.",
      memoryShortcut: {
        en: "Market now, limit at price, stop triggers — the server owns the status.",
        vi: "Market khớp ngay, limit theo giá, stop là kích hoạt — server quyết định trạng thái.",
      },
    },
  },
  {
    id: "isb-fc28",
    topicId: "finance-viz",
    relatedItemId: "isb-q36",
    priority: "medium",
    front: {
      en: "How do you stop a long-running live chart from eating memory?",
      vi: "Làm sao để chart live chạy lâu không ngốn bộ nhớ?",
    },
    back: {
      answer:
        "I store points in a fixed-size ring buffer, ideally backed by typed arrays, so memory is capped and old points are overwritten instead of an array growing forever. For display, I downsample to one or two points per pixel. LTTB — Largest-Triangle-Three-Buckets — keeps the visual shape of smooth lines, but it can drop a one-point spike, so for prices I use min-max per pixel column, which always keeps the true highs and lows. Older history comes from the server at a coarser resolution when the user zooms out.",
      viExplanation:
        "Lưu điểm dữ liệu trong ring buffer kích thước cố định, tốt nhất dùng typed array, để bộ nhớ có giới hạn và điểm cũ bị ghi đè thay vì mảng tăng mãi. Khi hiển thị, downsample về một đến hai điểm mỗi pixel. LTTB (Largest-Triangle-Three-Buckets) giữ hình dạng của đường mượt nhưng có thể bỏ mất spike chỉ có một điểm, nên với giá thì dùng min-max theo từng cột pixel để luôn giữ đúng đỉnh và đáy thật. Dữ liệu lịch sử cũ hơn lấy từ server với độ phân giải thô hơn khi người dùng zoom out.",
      memoryShortcut: {
        en: "Cap it with a ring; min-max for prices, LTTB for smooth lines.",
        vi: "Giới hạn bằng ring buffer; min-max cho giá, LTTB cho đường mượt.",
      },
    },
  },

  /* ---------- Frontend system design (4) ---------- */
  {
    id: "isb-fc29",
    topicId: "fe-system-design",
    relatedItemId: "isb-q37",
    priority: "critical",
    front: {
      en: "How would you structure a real-time trading dashboard frontend?",
      vi: "Bạn sẽ tổ chức frontend cho dashboard giao dịch real-time thế nào?",
    },
    back: {
      answer:
        "I'd approach it in three layers. Transport: one multiplexed WebSocket, possibly in a worker, handling auth, reconnect, sequence checks and backpressure. Data: a subscription registry with ref-counting and per-symbol stores — Zustand for live data, TanStack Query for REST snapshots. View: virtualized blotters, canvas charts and an order ticket, each subscribing narrowly. Around it: an error boundary per panel, stale-data indicators and observability.",
      viExplanation:
        "Chia làm ba lớp. Transport: một WebSocket multiplexed, có thể đặt trong worker, lo auth, reconnect, kiểm tra sequence và backpressure. Data layer: subscription registry có ref-counting và store theo symbol — Zustand cho dữ liệu live, TanStack Query cho snapshot REST. View: blotter virtualized, chart canvas và order ticket, mỗi phần subscribe hẹp. Bao quanh là error boundary cho từng panel, chỉ báo dữ liệu stale và observability.",
      memoryShortcut: {
        en: "Transport, data, view — plus guards around each panel.",
        vi: "Transport, data, view — và lớp bảo vệ quanh từng panel.",
      },
    },
  },
  {
    id: "isb-fc30",
    topicId: "fe-system-design",
    relatedItemId: "isb-q38",
    priority: "high",
    front: {
      en: "Why ref-count subscriptions in a client data layer?",
      vi: "Vì sao cần ref-count subscription trong data layer phía client?",
    },
    back: {
      answer:
        "Several components often need the same stream — the watchlist, the chart and the order ticket all want prices for the same symbol. A registry keeps one server subscription per topic and counts subscribers. The first subscriber sends subscribe, later ones just attach, and the last one to unmount sends unsubscribe, ideally after a short delay so quick remounts don't cause churn. After a reconnect, the registry replays every active topic.",
      viExplanation:
        "Nhiều component thường cần cùng một stream — watchlist, chart và order ticket cùng cần giá của một symbol. Registry giữ một subscription phía server cho mỗi topic và đếm số subscriber. Subscriber đầu tiên gửi subscribe, các subscriber sau chỉ gắn vào, subscriber cuối cùng unmount thì gửi unsubscribe — nên có độ trễ ngắn để tránh đóng mở liên tục khi remount. Sau reconnect, registry gửi lại toàn bộ topic đang active.",
      memoryShortcut: {
        en: "First in subscribes, last out unsubscribes.",
        vi: "Người đầu vào thì subscribe, người cuối ra thì unsubscribe.",
      },
    },
  },
  {
    id: "isb-fc31",
    topicId: "fe-system-design",
    relatedItemId: "isb-q43",
    priority: "high",
    front: {
      en: "How do you authenticate and authorize a WebSocket in a fintech app?",
      vi: "Xác thực và phân quyền WebSocket trong app fintech thế nào?",
    },
    back: {
      answer:
        "Browsers can't set custom headers on the WebSocket handshake, so I rely on a Secure, HttpOnly, SameSite cookie with an Origin check on the server, or a short-lived token sent in the first message — not a long-lived token in the URL, because URLs end up in logs. The server must authorize every subscription, not just the connection, and close or re-authenticate the socket when the token expires.",
      viExplanation:
        "Trình duyệt không cho đặt custom header khi handshake WebSocket, nên dùng cookie Secure, HttpOnly, SameSite kèm kiểm tra Origin ở server, hoặc token ngắn hạn gửi trong message đầu tiên — không đặt token dài hạn trong URL vì URL bị ghi vào log. Server phải phân quyền cho từng subscription chứ không chỉ cho kết nối, và đóng hoặc yêu cầu xác thực lại khi token hết hạn.",
      memoryShortcut: {
        en: "Cookie or first-message token, check Origin, authorize every subscribe.",
        vi: "Cookie hoặc token ở message đầu, kiểm tra Origin, phân quyền từng subscribe.",
      },
    },
  },
  {
    id: "isb-fc32",
    topicId: "fe-system-design",
    relatedItemId: "isb-q44",
    priority: "medium",
    front: {
      en: "How do you integrate safely with Rust and Python backends?",
      vi: "Tích hợp an toàn với backend Rust và Python thế nào?",
    },
    back: {
      answer:
        "Contract first. REST APIs are described with OpenAPI — FastAPI generates it from Pydantic models — and I generate TypeScript types or Zod schemas from it, so drift fails in CI rather than in production. Streaming messages get a versioned schema: JSON Schema, or protobuf if the Rust side uses a binary encoding. Changes are additive, unknown fields are ignored, and a BFF can adapt backend shapes to what the UI needs.",
      viExplanation:
        "Contract-first. REST API được mô tả bằng OpenAPI — FastAPI tự sinh từ model Pydantic — rồi sinh TypeScript type hoặc Zod schema từ đó, nên sai lệch sẽ lỗi ở CI thay vì ở production. Message streaming có schema có version: JSON Schema, hoặc protobuf nếu phía Rust dùng binary. Thay đổi theo kiểu bổ sung (additive), bỏ qua field lạ, và BFF có thể chuyển đổi dữ liệu backend thành dạng UI cần.",
      memoryShortcut: {
        en: "Contract first, generate types, evolve additively.",
        vi: "Contract trước, sinh type, thay đổi kiểu bổ sung.",
      },
    },
  },

  /* ---------- Testing, Python, Rust (3) ---------- */
  {
    id: "isb-fc33",
    topicId: "testing-python-linux",
    relatedItemId: "isb-q45",
    priority: "high",
    front: {
      en: "How do you test a WebSocket-driven UI?",
      vi: "Kiểm thử UI chạy bằng WebSocket thế nào?",
    },
    back: {
      answer:
        "In layers. Pure logic — reducers, order book merging, candle aggregation — gets fast unit tests. Components get React Testing Library tests against a mock socket, with fake timers for throttled updates. End to end, Playwright can intercept WebSocket traffic with routeWebSocket, so I can script snapshots, deltas, gaps and disconnects deterministically and assert that the UI resyncs and shows the right connection status.",
      viExplanation:
        "Test theo tầng. Logic thuần — reducer, merge order book, gom nến — dùng unit test nhanh. Component dùng React Testing Library với mock socket, kèm fake timer cho cập nhật được throttle. Ở mức end-to-end, Playwright có thể chặn lưu lượng WebSocket bằng routeWebSocket, nên có thể kịch bản hoá snapshot, delta, gap và mất kết nối một cách xác định, rồi kiểm tra UI có resync và hiển thị đúng trạng thái kết nối.",
      memoryShortcut: {
        en: "Logic in unit, UI with a mock socket, flows with routeWebSocket.",
        vi: "Logic ở unit, UI với mock socket, luồng E2E với routeWebSocket.",
      },
    },
  },
  {
    id: "isb-fc34",
    topicId: "testing-python-linux",
    relatedItemId: "isb-q46",
    priority: "medium",
    front: {
      en: "How do you avoid flaky async tests with React Testing Library?",
      vi: "Tránh test async bị flaky với React Testing Library thế nào?",
    },
    back: {
      answer:
        "Query like a user, by role and accessible name, and wait for outcomes with findBy or waitFor instead of fixed sleeps. For throttled or debounced streams, use fake timers and advance them explicitly, and configure user-event with advanceTimers so the two cooperate. Clean up sockets and timers after each test, reset stores between tests, and avoid asserting on implementation details like internal state; keep render-count assertions to a few targeted hot-path tests.",
      viExplanation:
        "Query giống người dùng, theo role và accessible name, chờ kết quả bằng findBy hoặc waitFor thay vì sleep cố định. Với stream có throttle/debounce, dùng fake timer và chủ động advance thời gian — cấu hình user-event với advanceTimers để hai bên phối hợp. Dọn socket và timer sau mỗi test, reset store giữa các test, và tránh assert vào chi tiết implementation như state nội bộ; chỉ giữ vài test đếm số lần render cho những hot path thật sự quan trọng.",
      memoryShortcut: {
        en: "Query by role, await outcomes, control time.",
        vi: "Query theo role, chờ kết quả, điều khiển thời gian.",
      },
    },
  },
  {
    id: "isb-fc35",
    topicId: "testing-python-linux",
    relatedItemId: "isb-q49",
    priority: "medium",
    front: {
      en: "Why do trading backends use Rust, and what should a frontend engineer know about it?",
      vi: "Vì sao backend giao dịch dùng Rust, frontend engineer cần biết gì?",
    },
    back: {
      answer:
        "Rust gives C-level performance with memory safety and no garbage-collector pauses, which suits low-latency ingestion and processing. Its ownership model — one owner per value, with borrowing checked at compile time — prevents data races. As a frontend engineer I don't need to write Rust daily, but I should understand its serialization formats and error contracts, and know that Rust compiled to WebAssembly can speed up CPU-bound hot paths in the browser, but only after profiling shows JavaScript execution is the bottleneck. For me this is theoretical knowledge, not production experience.",
      viExplanation:
        "Rust cho hiệu năng tương đương C, an toàn bộ nhớ và không có pause do garbage collector, phù hợp cho ingestion và xử lý độ trễ thấp. Mô hình ownership — mỗi giá trị có một owner, borrowing được kiểm tra lúc compile — ngăn data race. Frontend engineer không cần viết Rust hằng ngày nhưng nên hiểu format serialize, contract lỗi, và biết Rust compile sang WebAssembly có thể tăng tốc hot path nặng CPU trên trình duyệt, nhưng chỉ khi profiling cho thấy thực thi JavaScript là điểm nghẽn. Đây là kiến thức lý thuyết, không phải kinh nghiệm production.",
      memoryShortcut: {
        en: "Fast, safe, no GC — talk contracts, not syntax.",
        vi: "Nhanh, an toàn, không GC — nói về contract, không phải cú pháp.",
      },
    },
  },
];
