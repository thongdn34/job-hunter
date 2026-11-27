import type { InterviewQuestion } from "@/domain/package/schema";

/**
 * ISB Vietnam — Section 7, topic "fe-system-design" (questions 37–44).
 * Candidate experience is only marked "actual" where it maps to facts in the candidate profile
 * (Persefoni, Ninja Van — TechLab, NAB). Trading-domain material is theoretical / recommended approach.
 */
export const feSystemDesignQuestions: InterviewQuestion[] = [
  /* ------------------------------------------------------------------ */
  /* Q37 — End-to-end architecture of a real-time trading dashboard      */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q37",
    number: 37,
    topicId: "fe-system-design",
    question: {
      en: "How would you architect the frontend of a real-time trading dashboard end to end?",
      vi: "Bạn sẽ thiết kế kiến trúc frontend cho một trading dashboard thời gian thực từ đầu đến cuối như thế nào?",
    },
    answer:
      "I'd approach it in four layers, and the one rule that drives everything is: market data never flows straight from the socket into React.\n\nFirst, transport. One multiplexed WebSocket per tab, owned by a connection manager that handles auth, heartbeats, reconnection with backoff and resubscription. SSE works for one-way feeds like alerts. Snapshots and reference data come over REST and live in a query cache such as TanStack Query.\n\nSecond, a data layer, ideally inside a Web Worker. It parses messages, checks sequence numbers, applies order-book deltas and conflates ticks, so the UI receives at most one update per symbol per animation frame.\n\nThird, state. Hot streaming data sits in a Zustand store outside React, and components subscribe with narrow selectors, so a price change in one row re-renders that row, not the page. Server state stays in the query cache, and UI state like layout stays local.\n\nFourth, the view: virtualized grids for the watchlist and blotter, canvas-based charts, and an error boundary plus Suspense boundary per panel, so one broken widget never takes down the screen.\n\nI'd design explicitly for three failure modes: slow consumers, reconnect storms and stale data — every panel shows connection status and data age. I haven't built a trading platform in production, but I've done real-time work with Socket.IO at Ninja Van and caching with TanStack Query at Persefoni, and this design scales those same ideas.",
    viExplanation:
      "Ý chính cần nói ngay từ đầu: dữ liệu thị trường không bao giờ đi thẳng từ socket vào React. Câu trả lời chia thành bốn tầng để người phỏng vấn dễ theo dõi. Tầng transport: một WebSocket multiplexed cho mỗi tab, có connection manager lo auth, heartbeat, reconnect với backoff và resubscribe; snapshot và reference data lấy qua REST và cache bằng TanStack Query. Tầng data: chạy trong Web Worker để parse message, kiểm tra sequence number, áp delta vào order book và conflate tick — UI chỉ nhận tối đa một update cho mỗi symbol trong mỗi frame. Tầng state: dữ liệu “nóng” nằm trong Zustand store bên ngoài React, component subscribe bằng selector hẹp nên một giá thay đổi chỉ re-render đúng một dòng. Tầng view: virtualized grid, chart vẽ bằng canvas, mỗi panel có error boundary và Suspense boundary riêng. Kết thúc bằng các failure mode (slow consumer, reconnect storm, stale data) để thể hiện tư duy senior. Lưu ý trung thực: bạn chưa làm trading platform production, nhưng đã làm real-time với Socket.IO ở Ninja Van và caching với TanStack Query ở Persefoni — hãy trình bày thiết kế này như sự mở rộng hợp lý từ những kinh nghiệm đó.",
    technicalExplanation: `### Why layers matter
A trading screen combines very different data shapes: high-frequency ticks (quotes, trades, book deltas), medium-frequency server state (positions, orders, P&L) and slow reference data (instruments, user settings). Mixing them in one store or pushing every tick into React state is the most common cause of a frozen UI. Separating **transport → data → state → view** gives each layer one job and one failure mode.

### Layer by layer
- **Transport** — one multiplexed WebSocket per tab (or one per browser via SharedWorker). A connection manager owns the lifecycle: auth ticket, heartbeat, reconnect with exponential backoff + jitter, resubscribe from a registry. SSE is fine for one-way, low-rate feeds and benefits from automatic reconnection and HTTP/2 multiplexing.
- **Data layer** — parsing, schema/version checks, sequence-gap detection, snapshot + delta merge and **conflation** (keep only the latest value per key until the next flush). Running it in a Web Worker keeps JSON parsing and book maintenance off the main thread; the worker posts one batch per frame.
- **State** — a vanilla Zustand store for hot data, read via selectors (\`useStore(store, s => s.quotes[symbol])\`) so only the affected row re-renders. TanStack Query owns REST-backed server state (snapshots, history) with explicit \`staleTime\`. UI state (layout, selected symbol) stays in component state or a small UI store.
- **View** — virtualized tables (only visible rows in the DOM), canvas charts (no per-point DOM nodes), \`memo\`-ized rows, and per-panel error and Suspense boundaries.

### Frame budget
At 60 Hz a frame is roughly 16.7 ms, and the browser needs part of that for style, layout and paint. Any task over 50 ms counts as a long task and hurts INP. Conflation is what turns "thousands of messages per second" into "one render per frame".

### Failure scenarios to design for
- **Slow consumer** — the worker buffers and conflates; if its queue still grows, it drops intermediate ticks (never order or fill events) and reports it.
- **Reconnect storm** — jittered backoff so thousands of clients don't reconnect together after a gateway restart.
- **Stale data** — every panel shows a status (live / reconnecting / stale) and the age of its data; order entry is disabled or requires confirmation while stale.
- **Panel crash** — error boundary per panel with a "reload panel" action.

### Scalability and maintainability
- The data layer is framework-agnostic TypeScript, so it can be unit-tested with a fake socket and reused by the customer portal.
- Panels depend on channel names and selectors, not on socket details, so adding a new widget is a subscription + a component.
- Keep the copy cost in mind: replacing a whole record per frame is fine for hundreds of symbols; for tens of thousands, use per-symbol stores or mutable buffers with a version counter.`,
    practicalExample: {
      description: {
        en: "The main-thread side of the pipeline: the worker posts conflated quote batches, and the app applies them to a vanilla Zustand store at most once per animation frame. Rows subscribe to a single symbol.",
        vi: "Phía main thread của pipeline: worker gửi các batch quote đã conflate, app áp chúng vào Zustand store (vanilla) tối đa một lần mỗi animation frame. Mỗi dòng chỉ subscribe đúng một symbol.",
      },
      code: {
        language: "ts",
        code: `import { createStore, useStore } from "zustand";

type Quote = { symbol: string; bid: number; ask: number; ts: number };
type Status = "live" | "reconnecting" | "stale";
type QuoteState = { quotes: Record<string, Quote>; status: Status };
type WorkerMsg = { type: "quotes"; quotes: Quote[] } | { type: "status"; status: Status };

export const quoteStore = createStore<QuoteState>(() => ({ quotes: {}, status: "reconnecting" }));

const worker = new Worker(new URL("./market-data.worker.ts", import.meta.url), { type: "module" });

let pending: Quote[] = [];
let scheduled = false;

worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
  const msg = e.data;
  if (msg.type === "status") {
    quoteStore.setState({ status: msg.status });
    return;
  }
  pending.push(...msg.quotes);
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    const next = { ...quoteStore.getState().quotes };
    for (const q of pending) next[q.symbol] = q; // last write wins = conflation
    pending = [];
    scheduled = false;
    quoteStore.setState({ quotes: next });
  });
};

// A watchlist row re-renders only when its own symbol changes
export const useQuote = (symbol: string) => useStore(quoteStore, (s) => s.quotes[symbol]);
export const useFeedStatus = () => useStore(quoteStore, (s) => s.status);`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  RS["Rust ingestion - assumed"] --> GW["WS / SSE gateway"]
  PY["Python analytics REST - assumed"] --> RQ["TanStack Query cache"]
  GW --> CM["Connection manager"]
  CM --> WK["Web Worker - parse, sequence, conflate"]
  WK -->|"one batch per frame"| ST["Zustand live store"]
  ST --> WL["Virtualized watchlist"]
  ST --> OB["Order book"]
  ST --> CH["Canvas chart"]
  RQ --> BL["Blotter and positions"]
  ST --> BL`,
      caption: {
        en: "Four layers: transport, worker-based data layer, live store, and view. Backend shapes are assumptions inferred from the JD (Rust/Python).",
        vi: "Bốn tầng: transport, data layer trong worker, live store và view. Phần backend là giả định suy ra từ JD (Rust/Python).",
      },
    },
    memoryShortcut: {
      en: "T-D-S-V: Transport → Data → State → View — the socket never touches React.",
      vi: "T-D-S-V: Transport → Data → State → View — socket không bao giờ chạm trực tiếp vào React.",
    },
    keyTakeaway: {
      en: "Decouple the stream from rendering: conflate in a worker, store hot data outside React, and render only what is visible and changed.",
      vi: "Tách luồng dữ liệu khỏi việc render: conflate trong worker, giữ dữ liệu nóng ngoài React, và chỉ render những gì đang hiển thị và vừa thay đổi.",
    },
    followUps: [
      {
        id: "isb-q37-f1",
        question: {
          en: "Why put parsing and conflation in a Web Worker instead of the main thread?",
          vi: "Tại sao lại đưa việc parse và conflate vào Web Worker thay vì main thread?",
        },
        answer: {
          en: "The main thread already runs React, style, layout, paint and input handling. Parsing thousands of JSON messages per second and maintaining an order book can easily create long tasks over 50 ms, which shows up as janky scrolling and bad INP. A worker moves that CPU work off the critical path. The trade-off is postMessage cost — structured cloning large objects isn't free — so I send small conflated batches, or transfer ArrayBuffers for binary data. It also adds debugging complexity, so I'd measure first: if the feed is a few hundred messages per second, rAF batching on the main thread may be enough.",
          vi: "Main thread vốn đã phải chạy React, style, layout, paint và xử lý input. Parse hàng nghìn JSON message mỗi giây cộng với duy trì order book rất dễ tạo long task trên 50 ms, gây giật khi scroll và làm INP xấu đi. Worker đưa phần việc CPU đó ra khỏi critical path. Trade-off là chi phí postMessage — structured clone object lớn không miễn phí — nên chỉ gửi batch nhỏ đã conflate, hoặc transfer ArrayBuffer với dữ liệu binary. Worker cũng làm debug phức tạp hơn, nên cần đo trước: nếu feed chỉ vài trăm message mỗi giây thì rAF batching trên main thread có thể là đủ.",
        },
      },
      {
        id: "isb-q37-f2",
        question: {
          en: "A user has twenty panels open on an old laptop and the UI starts to lag. What do you do?",
          vi: "Người dùng mở hai mươi panel trên một laptop cũ và UI bắt đầu lag. Bạn xử lý thế nào?",
        },
        answer: {
          en: "I'd make the update rate adaptive instead of fixed. Panels that are hidden or scrolled out of view — detected with IntersectionObserver or the Page Visibility API — pause rendering and, after a grace period, unsubscribe. Panels that are visible but not focused can flush at a lower rate, say a few times per second, while the focused panel stays at frame rate. I'd watch long tasks with a PerformanceObserver and step down chart resolution or animation when the budget is exceeded, showing a small 'reduced update rate' indicator so the user understands. Critical events like fills are never throttled.",
          vi: "Tôi sẽ làm tốc độ update thích ứng thay vì cố định. Panel bị ẩn hoặc nằm ngoài viewport — phát hiện bằng IntersectionObserver hoặc Page Visibility API — sẽ ngừng render và sau một khoảng grace thì unsubscribe. Panel đang hiển thị nhưng không được focus có thể flush với tần suất thấp hơn, ví dụ vài lần mỗi giây, còn panel đang focus giữ theo frame rate. Dùng PerformanceObserver theo dõi long task và giảm độ phân giải chart hoặc animation khi vượt budget, kèm một chỉ báo nhỏ “đang giảm tốc độ cập nhật” để người dùng hiểu. Các sự kiện quan trọng như fill thì không bao giờ bị throttle.",
        },
      },
    ],
    difficulty: "hard",
    priority: "critical",
    jdRequirement: "Architect high-performance TS/React apps with low-latency dashboards for high-volume market data",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "No production trading-platform experience. Anchor on real Socket.IO real-time work (Ninja Van) and TanStack Query caching/prefetching (Persefoni), then present the trading architecture as your recommended design.",
        vi: "Chưa có kinh nghiệm production với trading platform. Hãy neo vào kinh nghiệm thật: real-time với Socket.IO (Ninja Van) và caching/prefetching với TanStack Query (Persefoni), rồi trình bày kiến trúc trading như thiết kế bạn đề xuất.",
      },
    },
    tags: ["architecture", "real-time", "trading-dashboard", "web-worker", "zustand"],
  },

  /* ------------------------------------------------------------------ */
  /* Q38 — Client-side real-time data layer                              */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q38",
    number: 38,
    topicId: "fe-system-design",
    question: {
      en: "Design a client-side real-time data layer: one multiplexed connection, a subscription registry with ref-counting, and pub/sub delivery to components.",
      vi: "Hãy thiết kế một real-time data layer phía client: một connection multiplexed, subscription registry có ref-counting và cơ chế pub/sub tới các component.",
    },
    answer:
      "The goal is that components declare what they need, and the data layer decides what actually goes over the wire. I'd build it in three pieces.\n\nFirst, one connection per tab — or per browser through a SharedWorker — that multiplexes many channels, like quotes for one symbol or the book for another, over a single socket. A socket per widget wastes handshakes, hits server connection limits and makes reconnection chaotic.\n\nSecond, a subscription registry keyed by channel with a reference count. The first subscriber triggers a subscribe frame; the second just increments the count and immediately gets the last known value. When the count drops to zero, I don't unsubscribe right away — I wait for a short grace period, because Strict Mode and fast route changes mount and unmount components quickly, and I don't want subscribe-unsubscribe churn on the server.\n\nThird, delivery to React through useSyncExternalStore, so reads are tear-free under concurrent rendering and each listener only hears its own channel.\n\nOn reconnect, the registry is the source of truth: it resubscribes every channel with a non-zero count and marks that data stale until a fresh snapshot arrives. The failure modes I watch for are leaked subscriptions — a missing cleanup keeps a channel alive forever — and fan-out cost, so I'd expose the active-channel count as a metric. At Ninja Van I worked with Socket.IO for real-time features; this registry is the same idea made explicit, testable and framework-independent.",
    viExplanation:
      "Mục tiêu: component chỉ khai báo “tôi cần dữ liệu gì”, còn data layer quyết định cái gì thật sự được gửi qua mạng. Có ba phần. Một: chỉ một connection cho mỗi tab (hoặc mỗi trình duyệt nếu dùng SharedWorker), multiplex nhiều channel trên cùng một socket — mỗi widget mở một socket riêng sẽ tốn handshake, chạm giới hạn connection của server và làm reconnect rối loạn. Hai: subscription registry theo channel, có reference count. Subscriber đầu tiên mới gửi frame subscribe; subscriber thứ hai chỉ tăng count và nhận ngay giá trị cuối cùng. Khi count về 0, không unsubscribe ngay mà chờ một khoảng grace, vì Strict Mode và chuyển route nhanh khiến component mount/unmount liên tục. Ba: đưa dữ liệu vào React bằng useSyncExternalStore để tránh tearing khi concurrent rendering. Khi reconnect, registry là nguồn sự thật: resubscribe mọi channel có count > 0 và đánh dấu stale tới khi có snapshot mới. Nhấn mạnh failure mode: subscription bị leak do quên cleanup, và chi phí fan-out — nên đo số channel đang active. Về kinh nghiệm: chỉ nói bạn đã làm real-time với Socket.IO ở Ninja Van, còn registry này là cách bạn tổ chức lại ý tưởng đó.",
    technicalExplanation: `### Responsibilities of the data layer
- **Connection** — exactly one socket per tab (or per browser with a SharedWorker), with auth, heartbeat and reconnect.
- **Registry** — \`Map<channel, { count, lastValue, listeners }>\`. It is the single source of truth for "what should the server be sending me right now".
- **Router** — incoming frames carry a channel id; the router looks up the entry and notifies only its listeners (O(listeners of that channel), not O(all components)).
- **React binding** — \`useSyncExternalStore(subscribe, getSnapshot)\`, which React guarantees is tear-free under concurrent rendering.

### Ref-counting and the grace period
- First subscriber → send \`sub\`. Later subscribers → increment and replay the cached value, so a newly mounted panel paints instantly instead of waiting for the next tick.
- Last unsubscriber → start a timer (e.g. a couple of seconds). If someone resubscribes in that window, cancel the timer. This absorbs React Strict Mode's double mount in development, tab switches and quick navigation back and forth.
- The \`subscribe\` function passed to \`useSyncExternalStore\` must be stable (\`useCallback\`), otherwise React unsubscribes and resubscribes on every render.

### Reconnect semantics
- On \`close\`, keep the registry, mark every entry stale and notify listeners so the UI can show "reconnecting".
- On \`open\`, re-authenticate, then send all subscriptions in one batched frame — not one frame per channel.
- For snapshot + delta channels, drop deltas whose sequence number is older than the snapshot, and request a resync if a gap is detected.

### Failure scenarios
- **Leaked subscriptions** — a component that never calls cleanup keeps a channel alive. Mitigation: the hook owns subscribe/unsubscribe, never components directly; expose active channel count in dev tools and metrics.
- **Fan-out explosion** — subscribing to "all symbols" from a 10k-row table. Subscribe only to visible rows (driven by the virtualizer's visible range) plus a small overscan.
- **Slow listener** — one expensive listener blocks the router. Listeners should only mark data dirty; actual rendering happens on the next frame.
- **Multi-tab duplication** — five tabs equal five connections and five times the bandwidth. A SharedWorker, or a leader tab elected with the Web Locks API plus BroadcastChannel, can share one connection; SharedWorker support has historically been missing on some mobile browsers (notably Chrome on Android), so keep a per-tab fallback.

### Why not just a socket hook per component?
It is simple for one widget, but it duplicates connections and subscriptions, makes reconnection order unpredictable and is hard to test. A registry is plain TypeScript: you can unit-test it with a fake transport and assert exactly which frames were sent.`,
    practicalExample: {
      description: {
        en: "A ref-counted subscription registry with a grace period, plus a React hook built on useSyncExternalStore. The transport is injected, so the registry can be unit-tested with a fake send function.",
        vi: "Subscription registry có ref-count và grace period, kèm React hook dựa trên useSyncExternalStore. Transport được inject vào nên có thể unit test registry bằng một hàm send giả.",
      },
      code: {
        language: "ts",
        code: `import { useCallback, useSyncExternalStore } from "react";

type Frame = { op: "sub" | "unsub"; channel: string };
type Entry = { count: number; value: unknown; listeners: Set<() => void>; timer?: ReturnType<typeof setTimeout> };

export class SubscriptionRegistry {
  private entries = new Map<string, Entry>();
  constructor(private send: (f: Frame) => void, private graceMs = 2000) {}
  subscribe(channel: string, listener: () => void): () => void {
    let entry = this.entries.get(channel);
    if (!entry) {
      entry = { count: 0, value: undefined, listeners: new Set() };
      this.entries.set(channel, entry);
      this.send({ op: "sub", channel });
    }
    clearTimeout(entry.timer);
    entry.count++;
    entry.listeners.add(listener);
    const e = entry;
    return () => {
      e.listeners.delete(listener);
      if (--e.count > 0) return;
      e.timer = setTimeout(() => {
        this.entries.delete(channel);
        this.send({ op: "unsub", channel });
      }, this.graceMs);
    };
  }
  publish(channel: string, value: unknown): void {
    const e = this.entries.get(channel);
    if (!e) return; // late frame for a channel we already dropped
    e.value = value;
    e.listeners.forEach((notify) => notify());
  }
  getSnapshot(channel: string): unknown {
    return this.entries.get(channel)?.value;
  }
  // After reconnect + re-auth, resubscribe all of these in one batched frame
  activeChannels = (): string[] => [...this.entries.keys()];
}

export function useChannel<T>(registry: SubscriptionRegistry, channel: string): T | undefined {
  const subscribe = useCallback((cb: () => void) => registry.subscribe(channel, cb), [registry, channel]);
  return useSyncExternalStore(subscribe, () => registry.getSnapshot(channel) as T | undefined);
}`,
      },
    },
    diagram: {
      kind: "sequence",
      code: `sequenceDiagram
  participant A as Order book panel
  participant B as Depth chart
  participant R as Registry
  participant S as WebSocket
  A->>R: subscribe book.BTC-USD
  R->>S: sub book.BTC-USD
  B->>R: subscribe book.BTC-USD
  Note over R: count is 2, no new frame, replay last value
  S-->>R: delta for book.BTC-USD
  R-->>A: notify
  R-->>B: notify
  A->>R: unsubscribe
  B->>R: unsubscribe
  Note over R: count is 0, start grace timer
  R->>S: unsub book.BTC-USD after grace period`,
      caption: {
        en: "Two components share one wire subscription; the server only hears about the first subscribe and the final unsubscribe.",
        vi: "Hai component dùng chung một subscription trên đường truyền; server chỉ nhận lệnh subscribe đầu tiên và unsubscribe cuối cùng.",
      },
    },
    memoryShortcut: {
      en: "One pipe, many taps — count the taps before you close the pipe.",
      vi: "Một đường ống, nhiều vòi — đếm số vòi trước khi khoá ống.",
    },
    keyTakeaway: {
      en: "A ref-counted registry over one multiplexed connection turns component mounts into minimal wire traffic and makes reconnection deterministic.",
      vi: "Registry có ref-count trên một connection multiplexed biến việc mount component thành lưu lượng mạng tối thiểu và giúp reconnect có tính xác định.",
    },
    followUps: [
      {
        id: "isb-q38-f1",
        question: {
          en: "How would you share one connection across several browser tabs?",
          vi: "Làm sao để nhiều tab trình duyệt dùng chung một connection?",
        },
        answer: {
          en: "The cleanest option is a SharedWorker that owns the socket and the registry; each tab connects through a MessagePort, and ref-counts are tracked per port. The tricky part is tab death — historically there's been no close event for a MessagePort that works across browsers — so tabs send a lightweight heartbeat and the worker drops ports that go quiet. Because SharedWorker isn't supported everywhere, I'd keep a fallback: elect a leader tab with the Web Locks API, let it own the socket and fan data out over BroadcastChannel; if the leader closes, the lock is released and another tab takes over. It's real complexity, so I'd only do it if users commonly open many tabs.",
          vi: "Cách gọn nhất là dùng SharedWorker giữ socket và registry; mỗi tab kết nối qua một MessagePort, ref-count được theo dõi theo từng port. Phần khó là khi tab bị đóng — từ trước tới nay MessagePort không có sự kiện close hoạt động ổn định trên mọi trình duyệt — nên các tab gửi heartbeat nhẹ và worker loại bỏ port im lặng quá lâu. Vì SharedWorker không được hỗ trợ ở mọi nơi, tôi giữ một fallback: bầu leader tab bằng Web Locks API, leader giữ socket và phát dữ liệu qua BroadcastChannel; khi leader đóng, lock được giải phóng và tab khác lên thay. Độ phức tạp là có thật, nên chỉ làm khi người dùng thường mở nhiều tab.",
        },
      },
      {
        id: "isb-q38-f2",
        question: {
          en: "What exactly happens to subscriptions during a reconnect?",
          vi: "Chính xác thì điều gì xảy ra với các subscription trong lúc reconnect?",
        },
        answer: {
          en: "Nothing is removed from the registry — it describes what the UI still needs. On close, I mark every entry stale and notify listeners so panels show 'reconnecting' and the data age. After the socket reopens, I re-authenticate first, then send all active channels in one batched subscribe frame. For snapshot-plus-delta channels, I wait for the new snapshot, discard any delta older than the snapshot's sequence number and then clear the stale flag. Reconnect attempts use exponential backoff with jitter, so a gateway restart doesn't cause every client to reconnect in the same second.",
          vi: "Không có gì bị xoá khỏi registry — nó mô tả những gì UI vẫn đang cần. Khi socket đóng, tôi đánh dấu mọi entry là stale và notify listener để panel hiển thị “reconnecting” cùng tuổi của dữ liệu. Khi socket mở lại, tôi re-authenticate trước, sau đó gửi toàn bộ channel đang active trong một frame subscribe gộp. Với channel kiểu snapshot + delta, tôi chờ snapshot mới, bỏ mọi delta có sequence number cũ hơn snapshot rồi mới xoá cờ stale. Việc reconnect dùng exponential backoff có jitter để khi gateway restart, các client không reconnect cùng một giây.",
        },
      },
    ],
    difficulty: "hard",
    priority: "critical",
    jdRequirement: "Integrate WebSockets/SSE and handle high-frequency real-time updates efficiently",
    candidateExperience: {
      company: "Ninja Van — TechLab",
      kind: "actual",
      note: {
        en: "Real Socket.IO real-time communication in logistics apps. Present the ref-counted registry and multi-tab sharing as how you would scale that pattern for market data — don't claim you built this exact registry.",
        vi: "Kinh nghiệm thật: giao tiếp real-time bằng Socket.IO trong ứng dụng logistics. Trình bày registry có ref-count và chia sẻ connection giữa các tab như cách bạn sẽ mở rộng pattern đó cho market data — không nói rằng bạn đã xây đúng registry này.",
      },
    },
    tags: ["websocket", "data-layer", "pub-sub", "use-sync-external-store", "multiplexing"],
  },

  /* ------------------------------------------------------------------ */
  /* Q39 — Microfrontends vs monorepo                                    */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q39",
    number: 39,
    topicId: "fe-system-design",
    question: {
      en: "Microfrontends or a monorepo for a multi-team trading platform — how would you decide?",
      vi: "Microfrontend hay monorepo cho một trading platform có nhiều team — bạn sẽ quyết định thế nào?",
    },
    answer:
      "I'd start by separating two things people often mix up: a monorepo is about how code is stored and built, while microfrontends are about how the app is deployed and composed at runtime. You can have either without the other.\n\nFor a platform with trading analytics plus a customer portal, my default is a monorepo with shared packages — the design system, the real-time data layer, API types and clients — and a small number of deployable apps. At Persefoni I worked in a monorepo with Vite and Turborepo, and the big win is that a change to a shared type or component is one pull request, type-checked against every consumer, with cached builds and tests so CI stays fast.\n\nI'd only reach for runtime microfrontends, for example Module Federation, when teams genuinely need independent release cadences, or we're integrating apps built by different vendors. The costs are real: duplicated or mismatched React and design-system versions, state shared across boundaries, harder end-to-end testing — and in a trading UI, two microfrontends each opening their own WebSocket, which defeats the multiplexed data layer.\n\nSo my answer is: monorepo first, with enforced module boundaries and code owners. If a team really needs independent deploys, split at a route or screen boundary, have the shell own the data layer as a singleton, and keep a small typed contract between the shell and each microfrontend.",
    viExplanation:
      "Ý ghi điểm là tách bạch hai khái niệm hay bị nhầm: monorepo là cách tổ chức và build code, còn microfrontend là cách deploy và ghép ứng dụng lúc runtime — có thể dùng cái này mà không cần cái kia. Mặc định nên chọn monorepo với các shared package (design system, real-time data layer, API types/clients) và vài app deploy được. Đây là chỗ bạn có kinh nghiệm thật: ở Persefoni bạn làm việc trong monorepo dùng Vite và Turborepo — lợi ích lớn là thay đổi shared type hay component chỉ cần một pull request, được type-check với mọi nơi dùng nó, và Turborepo cache build/test nên CI nhanh. Chỉ dùng microfrontend runtime (ví dụ Module Federation) khi các team thật sự cần release độc lập hoặc phải ghép app từ vendor khác. Chi phí: trùng hoặc lệch version React và design system, state chia sẻ qua ranh giới, e2e test khó hơn, và đặc biệt với trading UI là mỗi microfrontend tự mở WebSocket riêng, phá vỡ data layer multiplexed. Kết luận: monorepo trước, có module boundary và code owner; nếu buộc phải tách thì tách theo route/màn hình, shell giữ data layer dạng singleton và có contract TypeScript rõ ràng. Lưu ý: microfrontend chỉ là skill liệt kê, đừng nói đã dùng Module Federation trong production nếu không có.",
    technicalExplanation: `### Two different axes
- **Repository strategy** (monorepo vs polyrepo) — where code lives, how dependencies are versioned, how CI builds and tests.
- **Composition strategy** (single app vs microfrontends) — whether parts of the UI are built and deployed independently and stitched together at build time or runtime.

A monorepo with several independently deployed apps is very common; microfrontends inside a monorepo are also possible.

### Monorepo strengths (Turborepo / Nx style)
- **Atomic changes** — rename a field in \`packages/api-types\` and every app fails type-check in the same PR.
- **Task graph + caching** — Turborepo hashes inputs per package and replays cached outputs, so CI only rebuilds what changed (\`--filter\` for affected packages).
- **One version of React and the design system** — no runtime duplication.
- Risks: slow CI without caching, unclear ownership, packages reaching into each other's internals. Mitigate with package \`exports\` fields, lint rules for dependency boundaries, CODEOWNERS and ADRs.

### Microfrontend strengths and costs
- Independent deploys and team autonomy; useful for very large orgs, vendor-built modules or gradual migrations (strangler pattern).
- Costs in a trading UI:
  - **Duplicate dependencies** — two React copies break hooks and inflate bundles; Module Federation \`shared\` singletons help but add version-skew risk.
  - **Shared real-time state** — each remote opening its own socket multiplies connections and bandwidth. The shell must own the connection and inject a client.
  - **Consistency** — design tokens, keyboard shortcuts and focus management must work across boundaries.
  - **Testing** — contract tests between shell and remotes plus e2e on the composed app.
  - **Failure isolation** — a remote that fails to load must degrade to a placeholder, not crash the shell.

### Decision heuristics
- Fewer than ~3–4 teams on one product, same release train → monorepo, single or few apps.
- Teams blocked by each other's releases, or different tech stacks → consider microfrontends at **route/screen** boundaries, not per widget.
- Never split a tightly coupled screen (order ticket + order book + chart that share selection and live data) across microfrontends.

### Scalability and maintainability
Whatever you choose, the long-term cost is in the contracts: a typed shell ↔ remote API, a single real-time client, a shared design system, and CI that tests the integrated result.`,
    practicalExample: {
      description: {
        en: "A small typed contract between a shell and microfrontends living in the same monorepo. The shell injects the single real-time client and degrades gracefully if a remote fails to load.",
        vi: "Một contract TypeScript nhỏ giữa shell và các microfrontend trong cùng monorepo. Shell inject real-time client duy nhất và degrade an toàn nếu remote không tải được.",
      },
      code: {
        language: "ts",
        code: `// packages/mfe-contract/src/index.ts — shared through the monorepo
import type { RealtimeClient } from "@platform/realtime";

export interface MfeContext {
  basePath: string;
  realtime: RealtimeClient; // singleton owned by the shell: one socket per tab
  getAccessToken: () => Promise<string>;
  navigate: (path: string) => void;
  locale: string;
}

export interface MicroFrontend {
  mount(el: HTMLElement, ctx: MfeContext): void;
  unmount(el: HTMLElement): void;
}

// apps/shell/src/load-remote.ts
const remotes = {
  blotter: () => import("blotter/entry"), // Module Federation remote
  portal: () => import("portal/entry"),
} satisfies Record<string, () => Promise<{ default: MicroFrontend }>>;

export async function mountRemote(name: keyof typeof remotes, el: HTMLElement, ctx: MfeContext) {
  try {
    const { default: mfe } = await remotes[name]();
    mfe.mount(el, ctx);
    return () => mfe.unmount(el);
  } catch (err) {
    el.textContent = "This module is temporarily unavailable.";
    reportError(err); // forwarded to error monitoring
    return () => {};
  }
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  subgraph Repo["Monorepo - Turborepo task graph"]
    UI["packages/ui - design system"]
    RT["packages/realtime - data layer"]
    API["packages/api-types"]
    T["apps/trading"]
    P["apps/portal"]
  end
  UI --> T
  UI --> P
  RT --> T
  API --> T
  API --> P
  T --> D1["Deploy trading"]
  P --> D2["Deploy portal"]
  SH["Optional runtime shell"] -.->|"Module Federation at route level"| T`,
      caption: {
        en: "Monorepo first: shared packages, few deployable apps; runtime composition is an optional layer at route boundaries.",
        vi: "Ưu tiên monorepo: shared package, ít app deploy; ghép runtime là lớp tuỳ chọn ở ranh giới route.",
      },
    },
    memoryShortcut: {
      en: "Repo is storage, MFE is deployment — split by route, never by widget.",
      vi: "Repo là cách lưu code, MFE là cách deploy — tách theo route, đừng tách theo widget.",
    },
    keyTakeaway: {
      en: "Default to a well-bounded monorepo; adopt microfrontends only for real independent-deploy needs, with the shell owning the real-time connection.",
      vi: "Mặc định dùng monorepo có ranh giới rõ; chỉ dùng microfrontend khi thật sự cần deploy độc lập, và shell phải giữ real-time connection.",
    },
    followUps: [
      {
        id: "isb-q39-f1",
        question: {
          en: "How do you stop a monorepo from turning into a big ball of mud?",
          vi: "Làm sao để monorepo không biến thành một mớ hỗn độn?",
        },
        answer: {
          en: "Make the boundaries enforceable, not just documented. Each package exposes a public API through its exports field, and lint rules block deep imports and forbidden dependency directions — for example, ui can't import from realtime, and apps can't import from each other. CODEOWNERS gives every package an owning team that reviews changes. CI runs only affected tasks with Turborepo filters and remote caching, so the repo doesn't get slow as it grows. And significant structural decisions go into short ADRs, so new engineers understand why a package exists before adding to it.",
          vi: "Làm cho ranh giới có thể được kiểm tra tự động, không chỉ nằm trên tài liệu. Mỗi package công khai API qua trường exports, lint rule chặn deep import và các hướng phụ thuộc bị cấm — ví dụ ui không được import từ realtime, các app không import lẫn nhau. CODEOWNERS gán team sở hữu để review thay đổi. CI chỉ chạy task bị ảnh hưởng bằng filter của Turborepo kèm remote cache, để repo không chậm dần khi lớn lên. Các quyết định cấu trúc quan trọng được ghi vào ADR ngắn, để kỹ sư mới hiểu vì sao package tồn tại trước khi thêm code vào.",
        },
      },
      {
        id: "isb-q39-f2",
        question: {
          en: "If you do use Module Federation, how do you handle shared React and design-system versions?",
          vi: "Nếu dùng Module Federation, bạn xử lý việc chia sẻ version React và design system thế nào?",
        },
        answer: {
          en: "React and React DOM must be shared singletons — two copies on the page break hooks and context. I'd declare them as shared singletons with a required version range and fail loudly in staging if a remote is built against an incompatible major. For the design system, I'd share it as a singleton too, and keep design tokens as CSS variables owned by the shell, so visual consistency doesn't depend on every remote upgrading in lockstep. Then I'd add contract tests that mount each remote in the current shell in CI, and a policy that remotes support the current and previous shell version.",
          vi: "React và React DOM phải là singleton dùng chung — hai bản trên cùng trang sẽ làm hỏng hooks và context. Tôi khai báo chúng là shared singleton với khoảng version bắt buộc, và báo lỗi rõ ràng ở staging nếu remote build với major version không tương thích. Design system cũng nên là singleton, còn design token để dưới dạng CSS variable do shell quản lý, để giao diện nhất quán mà không cần mọi remote nâng cấp cùng lúc. Thêm contract test trong CI để mount từng remote vào shell hiện tại, cùng quy ước remote phải hỗ trợ version shell hiện tại và version trước đó.",
        },
      },
    ],
    difficulty: "medium",
    priority: "medium",
    jdRequirement: "Microservices or micro-frontend architecture (preferred); modular, reusable component libraries",
    candidateExperience: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "Monorepo architecture with Vite and Turborepo is real experience. Microfrontend is a listed skill without a specific production claim — discuss Module Federation as trade-off knowledge unless you have a real project to cite.",
        vi: "Kiến trúc monorepo với Vite và Turborepo là kinh nghiệm thật. Microfrontend là skill liệt kê, chưa có dự án production cụ thể — hãy trình bày Module Federation như kiến thức về trade-off, trừ khi bạn có dự án thật để dẫn chứng.",
      },
    },
    tags: ["monorepo", "microfrontend", "turborepo", "module-federation", "architecture"],
  },

  /* ------------------------------------------------------------------ */
  /* Q40 — Design system + accessibility for dense financial UIs         */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q40",
    number: 40,
    topicId: "fe-system-design",
    question: {
      en: "How would you design a component library for dense financial UIs, and make data grids and keyboard-driven trading accessible (WCAG)?",
      vi: "Bạn sẽ thiết kế component library cho giao diện tài chính dày đặc dữ liệu như thế nào, và làm sao để data grid và thao tác trading bằng bàn phím đạt chuẩn accessibility (WCAG)?",
    },
    answer:
      "I'd treat density and accessibility as one design problem, because power users and assistive-technology users both depend on predictable structure and the keyboard.\n\nFor the design system, I'd start from tokens: spacing, typography with tabular numerals so digits line up, and semantic colors like price-up, price-down and warning. That lets the same components ship a compact density for trading screens and a comfortable one for the customer portal. Components are layered — accessible primitives, then composites like DataGrid, PriceCell and OrderTicket — documented in Storybook with interaction and accessibility checks in CI.\n\nFor grids, I follow the WAI-ARIA grid pattern: one tab stop for the whole grid, roving tabindex with arrow keys, Home, End and Page keys, and aria-rowcount plus aria-rowindex so a screen reader understands a virtualized table even when only a few dozen rows are in the DOM. Price direction is never color-only; I add a sign or arrow, because red and green are the hardest pair for color-blind users. And I never put aria-live on ticking cells — that would flood a screen reader. Only meaningful events, like an order being filled or rejected, go to a single live region.\n\nFor keyboard trading, shortcuts must be discoverable, configurable and safe: no single key that can place an order by accident, plus confirmation or undo for destructive actions.\n\nAt Persefoni I worked directly on WCAG accessibility, keyboard navigation and ARIA, so this is an area where I bring real experience; the trading-specific patterns I'd build on top of it.",
    viExplanation:
      "Thông điệp chính: density (giao diện dày đặc) và accessibility không mâu thuẫn — cả power user lẫn người dùng công nghệ hỗ trợ đều cần cấu trúc dễ đoán và thao tác bàn phím tốt. Design system bắt đầu từ design token: spacing, typography dùng tabular numerals để các chữ số thẳng cột, màu ngữ nghĩa như price-up, price-down, warning. Nhờ vậy cùng một bộ component có thể có chế độ compact cho màn hình trading và comfortable cho customer portal. Component chia lớp: primitive có sẵn accessibility, rồi đến composite như DataGrid, PriceCell, OrderTicket; tài liệu hoá trong Storybook và có kiểm tra accessibility trong CI. Với grid, theo WAI-ARIA grid pattern: cả grid chỉ có một tab stop, roving tabindex với phím mũi tên, Home/End/Page; dùng aria-rowcount và aria-rowindex để screen reader hiểu bảng virtualized dù chỉ vài chục dòng nằm trong DOM. Không bao giờ chỉ dùng màu để thể hiện tăng/giảm giá — thêm dấu hoặc mũi tên. Không gắn aria-live lên ô giá đang nhảy liên tục; chỉ thông báo sự kiện quan trọng (lệnh khớp, bị từ chối) qua một live region. Phím tắt trading phải dễ khám phá, cấu hình được và an toàn. Đây là phần bạn có kinh nghiệm thật ở Persefoni (WCAG, keyboard navigation, ARIA) — hãy nói tự tin.",
    technicalExplanation: `### Design system layers
- **Tokens** — spacing scale with a compact density, \`font-variant-numeric: tabular-nums\` for aligned digits, semantic colors (\`--price-up\`, \`--price-down\`, \`--stale\`) with light/dark variants that meet WCAG contrast (4.5:1 for normal text, 3:1 for large text and UI component boundaries).
- **Primitives** — headless, accessible building blocks (button, menu, dialog, listbox, grid) that own focus management and ARIA.
- **Composites** — DataGrid, PriceCell (formatting + flash on change + direction icon), OrderTicket (validation, confirmation), StatusBadge (live / delayed / stale).
- **Docs and gates** — Storybook stories for every state, automated axe checks and keyboard interaction tests in CI, visual regression for density modes.

### Accessible data grids
- **Pattern** — \`role="grid"\` with \`row\`, \`columnheader\` and \`gridcell\`. The grid is a single tab stop; arrow keys move between cells (roving \`tabindex\`: active cell \`0\`, others \`-1\`).
- **Virtualization** — only visible rows exist in the DOM, so set \`aria-rowcount\` on the grid and \`aria-rowindex\` on each row; on keyboard navigation, scroll the virtualizer to the target row first, then move focus once it renders.
- **Sorting** — \`aria-sort\` on the active column header; announce the change.
- **Focus stability** — live updates must not re-mount rows (stable keys), or focus is lost every tick.

### Real-time content and screen readers
- Never put \`aria-live\` on ticking prices; a screen reader would read continuously and become unusable.
- Use one polite live region for user-relevant events (own order filled, partially filled), and an assertive alert only for errors such as a rejection.
- Offer an on-demand shortcut to read the current price of the focused instrument.
- Respect \`prefers-reduced-motion\` for flash/blink effects.

### Color and meaning
- Red/green is the most common color-vision-deficiency confusion, so direction is always also conveyed by sign (+/−) or icon. Some markets also invert the convention (red for up in parts of East Asia), so make it configurable.

### Keyboard trading safety
- Shortcuts are listed in a help overlay, configurable, and scoped (they don't fire inside text inputs).
- Order-placing actions need a modifier or a confirmation step; destructive bulk actions (cancel all) need confirmation or undo.

### Failure scenarios
- Focus jumps to the top after a re-sort or data refresh → keep focus by row id, not index.
- Virtualizer recycles the focused row out of the DOM → keep the active cell mounted or restore focus when it scrolls back.`,
    practicalExample: {
      description: {
        en: "A roving-tabindex hook for a virtualized grid: one tab stop, arrow/Home/End/Page navigation, and ARIA row/column counts so screen readers understand the full table size.",
        vi: "Hook roving tabindex cho grid virtualized: một tab stop, điều hướng bằng mũi tên/Home/End/Page, và aria rowcount/colcount để screen reader biết kích thước thật của bảng.",
      },
      code: {
        language: "tsx",
        code: `import { useRef, useState, type KeyboardEvent } from "react";

type Pos = { row: number; col: number };
const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));

export function useGridNavigation(rowCount: number, colCount: number, scrollToRow: (i: number) => void) {
  const [active, setActive] = useState<Pos>({ row: 0, col: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const move = (row: number, col: number) => {
    const next = { row: clamp(row, rowCount - 1), col: clamp(col, colCount - 1) };
    setActive(next);
    scrollToRow(next.row); // let the virtualizer render the row first, then focus it
    const selector = '[data-row="' + next.row + '"][data-col="' + next.col + '"]';
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(selector)?.focus());
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const { row, col } = active;
    const keys: Record<string, () => void> = {
      ArrowDown: () => move(row + 1, col),
      ArrowUp: () => move(row - 1, col),
      ArrowRight: () => move(row, col + 1),
      ArrowLeft: () => move(row, col - 1),
      Home: () => move(row, 0),
      End: () => move(row, colCount - 1),
      PageDown: () => move(row + 20, col),
      PageUp: () => move(row - 20, col),
    };
    const action = keys[e.key];
    if (action) { e.preventDefault(); action(); }
  };

  const cellProps = (row: number, col: number) => ({
    role: "gridcell" as const,
    "aria-colindex": col + 1,
    tabIndex: row === active.row && col === active.col ? 0 : -1, // roving tabindex
    "data-row": row,
    "data-col": col,
  });

  // rowCount + 1 accounts for the header row; each row element also gets aria-rowindex
  const gridProps = { ref: gridRef, role: "grid" as const, "aria-rowcount": rowCount + 1, "aria-colcount": colCount, onKeyDown };
  return { gridProps, cellProps };
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  T["Design tokens - density, tabular nums, semantic colors"] --> P["Accessible primitives"]
  P --> C["Composites - DataGrid, PriceCell, OrderTicket"]
  C --> A1["Trading app - compact density"]
  C --> A2["Customer portal - comfortable density"]
  C --> SB["Storybook stories"]
  SB --> AX["axe + keyboard tests in CI"]
  AX -->|"violations block merge"| C`,
      caption: {
        en: "One token-driven component library serves both dense trading screens and the customer portal, with accessibility enforced in CI.",
        vi: "Một component library dựa trên token phục vụ cả màn hình trading dày đặc lẫn customer portal, accessibility được kiểm tra bắt buộc trong CI.",
      },
    },
    memoryShortcut: {
      en: "Tokens, Tab stop, Talk less: tokens for density, one tab stop per grid, announce only what matters.",
      vi: "Token, Tab stop, Nói ít: token cho density, mỗi grid một tab stop, chỉ thông báo điều quan trọng.",
    },
    keyTakeaway: {
      en: "A dense financial UI can be fully accessible if the grid follows the ARIA grid pattern, meaning is never color-only, and live regions announce events, not ticks.",
      vi: "Giao diện tài chính dày đặc vẫn có thể accessible hoàn toàn nếu grid theo ARIA grid pattern, ý nghĩa không chỉ dựa vào màu, và live region chỉ thông báo sự kiện chứ không đọc từng tick.",
    },
    followUps: [
      {
        id: "isb-q40-f1",
        question: {
          en: "How do you tell screen-reader users about important real-time changes without flooding them?",
          vi: "Làm sao thông báo thay đổi real-time quan trọng cho người dùng screen reader mà không làm họ bị “ngập” thông tin?",
        },
        answer: {
          en: "I separate events from ticks. Ticking prices are never in a live region. Instead there's one polite live region at the app level, and only user-relevant events go into it — 'Buy 100 filled at 25.40' — aggregated if several arrive within a short window. Errors such as an order rejection use an assertive alert, because the user must react. I'd also give an on-demand shortcut that reads the focused instrument's current price and change, and a setting to choose which events are announced. Then I'd test it manually with NVDA or VoiceOver, because automated tools can't judge verbosity.",
          vi: "Tôi tách “sự kiện” khỏi “tick”. Giá nhảy liên tục không bao giờ nằm trong live region. Thay vào đó có một live region dạng polite ở cấp ứng dụng, chỉ chứa sự kiện liên quan tới người dùng — ví dụ “lệnh mua 100 đã khớp ở giá 25.40” — và gộp lại nếu nhiều sự kiện đến trong thời gian ngắn. Lỗi như lệnh bị từ chối dùng alert dạng assertive vì người dùng cần phản ứng. Tôi cũng thêm phím tắt để đọc giá hiện tại và mức thay đổi của mã đang focus, cùng tuỳ chọn để người dùng chọn loại sự kiện được thông báo. Cuối cùng test thủ công với NVDA hoặc VoiceOver, vì công cụ tự động không đánh giá được độ “ồn”.",
        },
      },
      {
        id: "isb-q40-f2",
        question: {
          en: "How do you keep a design system consistently adopted across several teams?",
          vi: "Làm sao để nhiều team sử dụng design system một cách nhất quán?",
        },
        answer: {
          en: "Make the right thing the easy thing and the wrong thing visible. Storybook is the source of truth, with every state documented and copyable. Lint rules flag raw hex colors, hard-coded spacing and native elements where an accessible primitive exists. Versioning with changelogs and codemods makes upgrades cheap, and visual regression tests catch unintended changes before release. Finally, a clear contribution model — teams can propose components, with a small core group reviewing API and accessibility — prevents each team from building its own slightly different data grid.",
          vi: "Làm cho cách đúng trở nên dễ dàng và cách sai trở nên dễ thấy. Storybook là nguồn sự thật, mọi trạng thái đều được tài liệu hoá và copy được. Lint rule cảnh báo khi dùng mã màu hex trực tiếp, spacing hard-code hoặc phần tử native trong khi đã có primitive accessible. Versioning kèm changelog và codemod giúp nâng cấp rẻ, còn visual regression test bắt thay đổi ngoài ý muốn trước khi release. Cuối cùng là quy trình đóng góp rõ ràng — team nào cũng có thể đề xuất component, một nhóm core nhỏ review API và accessibility — để tránh mỗi team tự làm một data grid hơi khác nhau.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement: "Build modular, accessible, reusable component libraries; accessible UX for financial workflows",
    candidateExperience: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "WCAG accessibility, keyboard navigation and ARIA work at Persefoni is real — lead with it. Trading-specific parts (order shortcuts, live-region policy for ticks) are recommended patterns; don't claim you shipped them.",
        vi: "Kinh nghiệm thật ở Persefoni: WCAG accessibility, keyboard navigation và ARIA — hãy mở đầu bằng phần này. Phần riêng cho trading (phím tắt đặt lệnh, chính sách live region cho tick) là pattern đề xuất; đừng nói bạn đã triển khai chúng.",
      },
    },
    tags: ["design-system", "accessibility", "wcag", "data-grid", "keyboard"],
  },

  /* ------------------------------------------------------------------ */
  /* Q41 — Resilience: boundaries, degraded modes, retries, breakers     */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q41",
    number: 41,
    topicId: "fe-system-design",
    question: {
      en: "How do you make a real-time trading frontend resilient — error boundaries, degraded modes, retries, circuit breakers and fallbacks?",
      vi: "Làm sao để frontend trading thời gian thực có khả năng chống chịu lỗi — error boundary, chế độ degraded, retry, circuit breaker và fallback?",
    },
    answer:
      "I think about resilience in three steps: contain the failure, degrade honestly, and recover automatically without making things worse.\n\nContainment first. Every panel — chart, order book, blotter — gets its own error boundary, so a rendering bug in the depth chart shows a 'reload this panel' card instead of a white screen. Error boundaries only catch errors thrown while rendering, in lifecycle methods and in effects, not in event handlers or async callbacks, so stream and async errors are routed into state and rendered through the same fallback.\n\nSecond, degraded modes. In trading, wrong data is worse than no data. If the socket drops, I keep the last values but clearly mark them stale with their age, and I disable order entry or require explicit confirmation, because nobody should trade on a price they think is live. If streaming is down but REST works, I fall back to slow polling and label the data as delayed.\n\nThird, recovery. Retries use exponential backoff with jitter, so thousands of clients don't reconnect in the same second after a deploy. For a failing dependency, say the analytics API, I wrap calls in a client-side circuit breaker: after several consecutive failures it opens and fails fast with a cached fallback, then after a cool-down it lets one trial request through. That protects the backend and keeps the UI responsive.\n\nThe one rule I never break: non-idempotent actions are never blindly retried. Orders carry an idempotency key, and if a response is lost, I reconcile against the order stream instead of resubmitting.",
    viExplanation:
      "Cấu trúc câu trả lời theo ba bước dễ nhớ: cô lập lỗi, degrade một cách trung thực, và tự phục hồi mà không làm tình hình tệ hơn. Cô lập: mỗi panel (chart, order book, blotter) có error boundary riêng, nên lỗi render ở một chart chỉ hiện thẻ “tải lại panel” thay vì trắng cả màn hình. Lưu ý error boundary chỉ bắt lỗi xảy ra khi render, trong lifecycle và trong effect — lỗi trong event handler, lỗi async hoặc lỗi stream phải được đưa vào state rồi hiển thị qua cùng fallback. Degrade: trong trading, dữ liệu sai còn tệ hơn không có dữ liệu. Khi mất socket, vẫn giữ giá trị cuối nhưng đánh dấu rõ là stale kèm tuổi dữ liệu, đồng thời khoá hoặc yêu cầu xác nhận khi đặt lệnh. Nếu streaming hỏng nhưng REST còn chạy, chuyển sang polling chậm và ghi rõ “delayed”. Phục hồi: retry dùng exponential backoff có jitter để tránh hàng nghìn client reconnect cùng lúc; với dependency hay lỗi như analytics API thì dùng circuit breaker phía client — lỗi liên tiếp đủ ngưỡng thì “mở mạch”, trả fallback ngay, sau thời gian cool-down cho một request thử. Quy tắc quan trọng nhất: không bao giờ tự động retry hành động không idempotent như đặt lệnh — dùng idempotency key và đối chiếu với order stream.",
    technicalExplanation: `### 1. Contain
- **Per-panel error boundaries** with a reset action (\`resetKeys\` tied to the selected symbol, or a "reload panel" button). A boundary at the app root is the last resort, not the main strategy.
- Error boundaries do **not** catch errors in event handlers, async callbacks, timers or WebSocket handlers. Capture those, store them in state, and render the fallback; or rethrow during render so the nearest boundary handles it. TanStack Query's \`throwOnError\` does this for queries.
- Isolate third-party widgets (e.g. a charting library) so their failures can't crash the order ticket.

### 2. Degrade honestly
A small, explicit ladder of modes per data source:
- **Live** — streaming, sequence checks passing.
- **Stale** — no data or heartbeat within a threshold; show last value, its age and a muted style.
- **Delayed** — streaming unavailable, REST polling at a low rate; label it.
- **Unavailable** — panel error card with retry.

Thresholds depend on the data: quotes go stale within seconds; risk analytics can be minutes old. Trading actions follow the mode: disabled or confirm-required when the price source isn't live.

### 3. Recover without amplifying the outage
- **Exponential backoff with full jitter**: wait a random time between 0 and min(cap, base × 2^attempt). Without jitter, a gateway restart produces synchronized reconnect waves (thundering herd).
- **Circuit breaker**: closed → open after N consecutive failures → half-open after a cool-down, letting a single trial request through → closed on success or open again on failure. While open, fail fast and serve a cached fallback.
- **Retry budget**: cap total retries per time window so a broken backend isn't hammered by every open tab.
- **Respect server hints**: \`Retry-After\` on 429/503, and server-initiated "reconnect later" control messages.

### Non-idempotent actions
- Retrying \`POST /orders\` after a timeout can create a duplicate order. Generate an idempotency key on the client per user intent; the server returns the original result for a repeated key.
- If the response is lost, show "submission pending", then reconcile from the order/execution stream or a status lookup by key.

### Failure scenarios worth rehearsing
- Gateway restart with thousands of connected clients.
- Analytics API slow (not down) — timeouts must be shorter than user patience; a slow dependency without timeouts never trips the breaker.
- Partial outage: quotes live but order service down — order ticket disabled with a clear message while viewing continues.

### Testing resilience
Simulate these with a mock WebSocket server and network interception in Playwright (drop connection, delay frames, return 503), and assert on the visible mode, not on internals.`,
    practicalExample: {
      description: {
        en: "A small client-side circuit breaker with a correct half-open state (one trial request at a time) and an optional fallback, used to protect an analytics endpoint.",
        vi: "Một circuit breaker phía client với trạng thái half-open đúng nghĩa (mỗi lần chỉ một request thử) và fallback tuỳ chọn, dùng để bảo vệ một endpoint analytics.",
      },
      code: {
        language: "ts",
        code: `type BreakerState = "closed" | "open" | "half-open";

export class CircuitBreaker {
  private state: BreakerState = "closed";
  private failures = 0;
  private openedAt = 0;

  constructor(private readonly threshold = 5, private readonly coolDownMs = 15_000) {}

  async call<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    if (this.state !== "closed") {
      const coolingDown = this.state === "open" && Date.now() - this.openedAt < this.coolDownMs;
      if (coolingDown || this.state === "half-open") return this.reject(fallback); // fail fast
      this.state = "half-open"; // this call is the single trial request
    }
    try {
      const result = await fn();
      this.state = "closed";
      this.failures = 0;
      return result;
    } catch (err) {
      this.failures++;
      if (this.state === "half-open" || this.failures >= this.threshold) {
        this.state = "open";
        this.openedAt = Date.now();
      }
      if (fallback) return fallback();
      throw err;
    }
  }

  get status(): BreakerState { return this.state; }
  private reject<T>(fallback?: () => T): T {
    if (fallback) return fallback();
    throw new Error("circuit-open");
  }
}

// Usage: the risk panel shows the last cached result (marked stale) while the breaker is open
type RiskSummary = { exposure: string; asOf: string };
declare function fetchJson<T>(url: string, init?: RequestInit): Promise<T>;
const riskBreaker = new CircuitBreaker();
export const loadRiskSummary = (cached: () => RiskSummary) =>
  riskBreaker.call(() => fetchJson<RiskSummary>("/api/risk/summary", { signal: AbortSignal.timeout(3000) }), cached);`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  C["Closed - requests pass"] -->|"N consecutive failures"| O["Open - fail fast, serve fallback"]
  O -->|"cool-down elapsed"| H["Half-open - one trial request"]
  H -->|"trial succeeds"| C
  H -->|"trial fails"| O
  subgraph Modes["Panel data modes"]
    L["Live"] -->|"no heartbeat"| S["Stale - last value + age"]
    S -->|"stream down, REST ok"| D["Delayed - slow polling"]
    D -->|"REST down too"| U["Unavailable - error card"]
  end`,
      caption: {
        en: "Left: circuit-breaker states for a failing dependency. Right: the explicit degradation ladder each panel moves through.",
        vi: "Trái: các trạng thái của circuit breaker cho dependency đang lỗi. Phải: các bậc degrade rõ ràng mà mỗi panel đi qua.",
      },
    },
    memoryShortcut: {
      en: "Contain, Degrade, Recover — and never auto-retry an order.",
      vi: "Cô lập, Degrade, Phục hồi — và không bao giờ tự retry lệnh đặt.",
    },
    keyTakeaway: {
      en: "Resilience in a trading UI means isolating failures per panel, showing data freshness honestly, backing off with jitter, and treating order submission as idempotent-only.",
      vi: "Khả năng chống chịu trong trading UI nghĩa là cô lập lỗi theo panel, hiển thị trung thực độ mới của dữ liệu, backoff có jitter, và chỉ gửi lệnh theo cách idempotent.",
    },
    followUps: [
      {
        id: "isb-q41-f1",
        question: {
          en: "What don't error boundaries catch, and how do you handle those errors?",
          vi: "Error boundary không bắt được những lỗi nào, và bạn xử lý chúng ra sao?",
        },
        answer: {
          en: "They don't catch errors in event handlers, async code like promises and timers, WebSocket callbacks, server-side rendering, or errors thrown inside the boundary itself. For those I capture the error where it happens and put it into state — for example a per-panel status of 'error' in the store — then render the same fallback UI. Another option is to store the error and rethrow it during render so the nearest boundary handles it; TanStack Query's throwOnError works that way. Globally, window error and unhandledrejection listeners report anything that slips through to monitoring, so nothing fails silently.",
          vi: "Chúng không bắt lỗi trong event handler, code async như promise và timer, callback của WebSocket, server-side rendering, hoặc lỗi phát sinh bên trong chính boundary. Với những lỗi đó, tôi bắt lỗi tại chỗ và đưa vào state — ví dụ trạng thái “error” cho từng panel trong store — rồi render cùng fallback UI. Cách khác là lưu lỗi lại và throw lại trong lúc render để boundary gần nhất xử lý; throwOnError của TanStack Query hoạt động theo cách này. Ở mức toàn cục, listener cho window error và unhandledrejection sẽ gửi mọi lỗi lọt lưới về hệ thống monitoring, để không có lỗi nào “im lặng”.",
        },
      },
      {
        id: "isb-q41-f2",
        question: {
          en: "How do you show stale data without confusing or alarming users?",
          vi: "Làm sao hiển thị dữ liệu stale mà không khiến người dùng bối rối hay hoảng?",
        },
        answer: {
          en: "Be proportional and specific. A brief blip shouldn't flash a red banner, so I use thresholds: within a few seconds there's only a subtle indicator; beyond the threshold, values get a muted style and an 'as of' time; after a longer outage, a clear banner explains what's affected and that we're reconnecting. The message names the impact — 'Prices delayed, order entry paused' — instead of a generic error. Thresholds differ per data type, and when the connection recovers, the indicator clears automatically with a short confirmation so users know they can trust the screen again.",
          vi: "Hiển thị tương xứng và cụ thể. Một lần chập chờn ngắn không nên bật banner đỏ, nên tôi dùng ngưỡng: trong vài giây chỉ có chỉ báo nhẹ; vượt ngưỡng thì giá trị được làm mờ và kèm thời điểm “as of”; mất kết nối lâu hơn thì có banner rõ ràng nói phần nào bị ảnh hưởng và hệ thống đang reconnect. Thông điệp nêu rõ tác động — “Giá đang bị trễ, tạm dừng đặt lệnh” — thay vì báo lỗi chung chung. Ngưỡng khác nhau theo loại dữ liệu, và khi kết nối phục hồi, chỉ báo tự biến mất kèm xác nhận ngắn để người dùng biết có thể tin màn hình trở lại.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement: "Reliable low-latency dashboards and execution workflows on streaming data",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "Resilience patterns here are general engineering knowledge. Socket.IO reconnection at Ninja Van is real context you can mention; don't claim you built client-side circuit breakers or trading degraded modes in production.",
        vi: "Các pattern ở đây là kiến thức kỹ thuật chung. Có thể nhắc bối cảnh thật về reconnect với Socket.IO ở Ninja Van; đừng nói bạn đã xây circuit breaker phía client hay chế độ degraded cho trading trong production.",
      },
    },
    tags: ["resilience", "error-boundary", "circuit-breaker", "retry", "degraded-mode"],
  },

  /* ------------------------------------------------------------------ */
  /* Q42 — Frontend observability                                        */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q42",
    number: 42,
    topicId: "fe-system-design",
    question: {
      en: "What would you monitor in a real-time frontend, and how would you set up observability — logging, metrics, RUM, tracing and Sentry?",
      vi: "Bạn sẽ giám sát những gì trong một frontend real-time, và thiết lập observability thế nào — logging, metrics, RUM, tracing và Sentry?",
    },
    answer:
      "Standard frontend monitoring — errors and page-load vitals — is necessary but not enough here, because the worst real-time failures are silent: the screen looks fine, but the data is five seconds old.\n\nSo I'd monitor three levels. First, errors: Sentry or a similar tool with source maps, release tags and breadcrumbs, and I'd attach the connection state as context, so I can tell 'crashed while reconnecting' apart from a plain render bug.\n\nSecond, user experience: real user monitoring for INP, LCP and CLS, plus long tasks and a sampled frame rate on the trading screen, broken down by device class — power users on older laptops feel problems first.\n\nThird, and most important, stream health — custom metrics: end-to-end latency, measured as receive time minus the server timestamp and sampled; messages per second; how many ticks were conflated or dropped; sequence gaps and resyncs; reconnect count; and time spent stale. Those tell me whether the data layer keeps up.\n\nFor tracing, I'd propagate a W3C traceparent header on REST calls and attach a correlation id to every order submission, so one slow order can be followed from the click to the Python or Rust service.\n\nTwo practical rules: sample and batch, sending with sendBeacon, so monitoring never competes with the feed; and scrub personal and account data before anything leaves the browser. Then I'd alert on stream-health metrics, not just error counts.",
    viExplanation:
      "Ý mở đầu quan trọng: monitoring frontend thông thường (lỗi và vitals lúc load trang) là cần nhưng chưa đủ, vì lỗi tệ nhất của app real-time thường “im lặng” — màn hình trông bình thường nhưng dữ liệu đã cũ vài giây. Chia ba tầng. Một là lỗi: Sentry có source map, release tag, breadcrumb, gắn thêm trạng thái connection để phân biệt lỗi khi đang reconnect với lỗi render thuần. Hai là trải nghiệm người dùng: RUM cho INP, LCP, CLS, thêm long task và frame rate lấy mẫu trên màn hình trading, chia theo loại thiết bị. Ba — quan trọng nhất — là sức khoẻ của stream: các metric tự định nghĩa như độ trễ end-to-end (thời điểm nhận trừ timestamp của server, có lấy mẫu), số message mỗi giây, số tick bị conflate hoặc drop, sequence gap và resync, số lần reconnect, thời gian ở trạng thái stale. Tracing: truyền header traceparent chuẩn W3C cho REST và correlation id cho mỗi lệnh đặt, để lần theo từ cú click tới service Python/Rust. Hai nguyên tắc thực tế: lấy mẫu và gửi theo batch bằng sendBeacon để monitoring không tranh tài nguyên với feed; và xoá dữ liệu cá nhân/tài khoản trước khi gửi. Đây là phần đề xuất, không phải kinh nghiệm production đã có — hãy nói “tôi sẽ…”.",
    technicalExplanation: `### Three layers of signals
- **Errors** — exceptions with source maps, release and environment tags, breadcrumbs (route changes, subscription changes, reconnects) and context (connection status, active panel). Group by release to catch regressions right after a deploy.
- **User experience (RUM)** — Core Web Vitals via the \`web-vitals\` library (INP matters most for an interactive trading screen), long tasks (> 50 ms) via \`PerformanceObserver\`, and sampled frame timing. Segment by device class, browser and network type.
- **Stream health** — the domain-specific part nobody gives you for free:
  - end-to-end lag (client receive time − server event timestamp), as percentiles, sampled
  - inbound messages per second and bytes per second
  - conflated / dropped tick counts (should be explainable, never silent)
  - sequence gaps, resyncs and snapshot reloads
  - reconnects, time to reconnect, and total time in stale mode
  - active subscriptions (catches leaks)
  - JS heap trend over a long session (\`performance.memory\` is Chromium-only and coarse, so treat it as a hint)

### Tracing across the stack
- Propagate a W3C \`traceparent\` header on fetch calls so frontend spans join backend traces in OpenTelemetry-compatible tools. Allow it in CORS headers.
- WebSocket frames carry no headers, so include a correlation id in order messages and log it on both sides.

### Clock skew
Client clocks can be off by seconds. Estimate the offset with heartbeat round trips (offset ≈ serverTime − (t0 + t1) / 2), or track lag trends rather than trusting absolute values. Use \`performance.now()\` for client-side durations.

### Cost and safety
- **Sampling** — keep all errors (with rate limits), sample performance data, aggregate stream metrics in memory and flush periodically.
- **Transport** — \`navigator.sendBeacon\` or \`fetch(..., { keepalive: true })\` on an interval and on \`pagehide\`, so data survives tab close without blocking the main thread.
- **Privacy** — scrub tokens, account ids and order amounts in a \`beforeSend\` hook; mask inputs in any session replay; agree on data residency with the client's compliance rules.

### Alerting
Alert on symptoms users feel: p95 lag above a threshold, stale-time ratio, reconnect-rate spikes, INP regressions per release — not only on raw error counts, which can stay flat during a silent data outage.`,
    practicalExample: {
      description: {
        en: "A lightweight stream-health collector: it counts messages, gaps, reconnects and long tasks, samples end-to-end lag, and flushes an aggregate with sendBeacon every 30 seconds and on page hide.",
        vi: "Bộ thu thập metric sức khoẻ stream gọn nhẹ: đếm message, gap, reconnect và long task, lấy mẫu độ trễ end-to-end, và gửi bản tổng hợp bằng sendBeacon mỗi 30 giây và khi trang bị ẩn.",
      },
      code: {
        language: "ts",
        code: `type Counters = { msgs: number; conflated: number; gaps: number; reconnects: number; longTasks: number };
const zero = (): Counters => ({ msgs: 0, conflated: 0, gaps: 0, reconnects: 0, longTasks: 0 });

export class StreamMetrics {
  private c = zero();
  private lags: number[] = [];

  constructor(private readonly endpoint: string, intervalMs = 30_000, private readonly sampleEvery = 50) {
    // "longtask" entries are Chromium-only; elsewhere this observer simply records nothing
    new PerformanceObserver((list) => {
      this.c.longTasks += list.getEntries().length;
    }).observe({ type: "longtask", buffered: true });
    setInterval(() => this.flush(), intervalMs);
    addEventListener("pagehide", () => this.flush());
  }

  onMessage(serverTs: number): void {
    this.c.msgs++;
    if (this.c.msgs % this.sampleEvery === 0) this.lags.push(Date.now() - serverTs); // skew-sensitive
  }
  onConflated(n: number): void { this.c.conflated += n; }
  onGap(): void { this.c.gaps++; }
  onReconnect(): void { this.c.reconnects++; }

  private flush(): void {
    if (this.c.msgs === 0 && this.c.reconnects === 0) return;
    const sorted = [...this.lags].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? null;
    const payload = JSON.stringify({ ...this.c, lagP95Ms: p95, at: Date.now() });
    navigator.sendBeacon(this.endpoint, payload); // non-blocking, survives tab close
    this.c = zero();
    this.lags = [];
  }
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  WS["Stream client"] -->|"lag, gaps, reconnects"| M["Metrics collector"]
  UI["React app"] -->|"INP, long tasks, frame time"| M
  UI -->|"exceptions + breadcrumbs"| SE["Sentry"]
  M -->|"sendBeacon every 30s"| IN["Metrics ingest"]
  IN --> DB["Dashboards"]
  IN --> AL["Alerts on stream health"]
  UI -->|"traceparent header"| API["Python or Rust API"]
  API --> TR["Tracing backend"]`,
      caption: {
        en: "Errors, user-experience metrics and stream-health metrics flow to separate tools; trace context links frontend actions to backend spans.",
        vi: "Lỗi, metric trải nghiệm người dùng và metric sức khoẻ stream đi tới các công cụ riêng; trace context nối hành động frontend với span phía backend.",
      },
    },
    memoryShortcut: {
      en: "E-U-S: Errors, User experience, Stream health — and the silent killer is stale data.",
      vi: "E-U-S: Errors, User experience, Stream health — “sát thủ thầm lặng” là dữ liệu cũ.",
    },
    keyTakeaway: {
      en: "In a real-time app, monitor stream health (lag, gaps, drops, stale time) alongside errors and Web Vitals, because data can be wrong while nothing throws.",
      vi: "Với app real-time, cần giám sát sức khoẻ stream (độ trễ, gap, drop, thời gian stale) song song với lỗi và Web Vitals, vì dữ liệu có thể sai mà không hề có exception nào.",
    },
    followUps: [
      {
        id: "isb-q42-f1",
        question: {
          en: "How do you measure end-to-end latency when client and server clocks differ?",
          vi: "Làm sao đo độ trễ end-to-end khi đồng hồ của client và server lệch nhau?",
        },
        answer: {
          en: "I don't trust raw clock differences. I estimate the offset like NTP does: the client sends a heartbeat with its time t0, the server replies with its own time, and the client records t1 on receipt. The offset is roughly server time minus the midpoint of t0 and t1, assuming symmetric network delay. I keep a smoothed estimate and correct the lag metric with it. Even without perfect correction, trends and percentiles per release are still meaningful. For pure client-side durations, like time from message receipt to paint, I use performance.now, which is monotonic and not affected by clock changes.",
          vi: "Tôi không tin vào hiệu số đồng hồ thô. Tôi ước lượng độ lệch giống cách NTP làm: client gửi heartbeat kèm thời điểm t0, server trả về thời gian của nó, client ghi t1 khi nhận. Độ lệch xấp xỉ bằng thời gian server trừ điểm giữa của t0 và t1, giả định độ trễ mạng hai chiều như nhau. Tôi giữ một giá trị ước lượng đã làm mượt và dùng nó để hiệu chỉnh metric độ trễ. Kể cả khi không hiệu chỉnh hoàn hảo, xu hướng và percentile theo từng release vẫn có ý nghĩa. Với khoảng thời gian thuần phía client, như từ lúc nhận message đến lúc paint, tôi dùng performance.now — vốn đơn điệu và không bị ảnh hưởng khi đồng hồ hệ thống thay đổi.",
        },
      },
      {
        id: "isb-q42-f2",
        question: {
          en: "How do you stop monitoring from hurting performance or leaking sensitive data?",
          vi: "Làm sao để việc monitoring không làm giảm hiệu năng hoặc rò rỉ dữ liệu nhạy cảm?",
        },
        answer: {
          en: "For performance: never report per message. Aggregate counters in memory, sample latency, flush on an interval and on page hide with sendBeacon, and keep the collector's work trivial on the hot path — an increment, not an allocation. Error reporting gets rate limits so an error loop can't flood the network. For data safety: a beforeSend hook strips tokens, account identifiers and order details; breadcrumbs record actions, not values; any session replay masks all inputs and numbers by default. And I'd confirm with the client's security team where telemetry may be stored, since financial clients often have data-residency rules.",
          vi: "Về hiệu năng: không bao giờ gửi theo từng message. Gộp counter trong bộ nhớ, lấy mẫu độ trễ, flush theo chu kỳ và khi trang bị ẩn bằng sendBeacon, và giữ phần việc của collector trên hot path thật nhẹ — chỉ tăng biến đếm, không cấp phát object. Báo lỗi có rate limit để một vòng lặp lỗi không làm ngập mạng. Về an toàn dữ liệu: hook beforeSend xoá token, định danh tài khoản và chi tiết lệnh; breadcrumb ghi hành động chứ không ghi giá trị; session replay mặc định che mọi input và con số. Tôi cũng xác nhận với team security của khách hàng nơi được phép lưu telemetry, vì khách hàng tài chính thường có yêu cầu về data residency.",
        },
      },
    ],
    difficulty: "medium",
    priority: "medium",
    jdRequirement: "Web performance tools and reliable high-frequency real-time dashboards",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "Observability tooling (Sentry, RUM, tracing) is not part of your documented production experience. Present this as how you would instrument a real-time app ('I would…'), not as dashboards you built.",
        vi: "Công cụ observability (Sentry, RUM, tracing) không nằm trong kinh nghiệm production đã ghi nhận. Trình bày như cách bạn sẽ instrument một app real-time (“tôi sẽ…”), không phải dashboard bạn đã xây.",
      },
    },
    tags: ["observability", "monitoring", "rum", "sentry", "metrics"],
  },

  /* ------------------------------------------------------------------ */
  /* Q43 — Frontend security in fintech                                  */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q43",
    number: 43,
    topicId: "fe-system-design",
    question: {
      en: "What are the main frontend security concerns in a fintech trading app — XSS, CSP, token storage, CSRF and WebSocket authentication?",
      vi: "Những mối lo về bảo mật frontend chính trong một ứng dụng trading fintech là gì — XSS, CSP, lưu token, CSRF và xác thực WebSocket?",
    },
    answer:
      "In a trading app the threat that matters most is XSS, because injected script runs with the user's session and can place orders. So most of my controls are about preventing injection and limiting the blast radius.\n\nPrevention: rely on React's escaping, ban dangerouslySetInnerHTML unless content goes through a sanitizer like DOMPurify, and treat feed data such as instrument names or news headlines as untrusted. Then a strict Content Security Policy with nonces, no unsafe-inline, a connect-src limited to our API and WebSocket hosts, and frame-ancestors to stop clickjacking.\n\nTokens: I avoid long-lived tokens in localStorage, since any XSS can read them. My preference is a BFF: the session lives in an HttpOnly, Secure, SameSite cookie, and the browser never sees the refresh token. Cookies bring CSRF back, so state-changing requests also need a CSRF token or a custom-header check.\n\nWebSockets are a common gap. The handshake isn't protected by CORS, so the server must validate the Origin header. I'd authenticate with a short-lived, single-use ticket fetched over an authenticated request — never a long-lived token in the URL, because URLs end up in logs. Authorization is checked per subscription, and when the session expires the server should re-authenticate or close the socket.\n\nAnd the frontend is never the security boundary: limits and permissions are enforced server-side, the UI only reflects them.",
    viExplanation:
      "Mở đầu bằng mức độ ưu tiên: trong app trading, XSS là mối đe doạ lớn nhất vì script bị chèn chạy với session của người dùng và có thể đặt lệnh thay họ. Vì vậy phần lớn biện pháp xoay quanh việc ngăn chèn script và giới hạn thiệt hại. Phòng ngừa: dựa vào cơ chế escape của React, cấm dangerouslySetInnerHTML trừ khi nội dung đã qua sanitizer như DOMPurify, coi dữ liệu từ feed (tên mã, tiêu đề tin tức) là không tin cậy; thêm CSP nghiêm ngặt dùng nonce, không unsafe-inline, connect-src chỉ cho phép host API và WebSocket của mình, frame-ancestors để chống clickjacking. Lưu token: tránh để token sống lâu trong localStorage vì XSS đọc được; ưu tiên mô hình BFF với session trong cookie HttpOnly, Secure, SameSite. Dùng cookie thì phải xử lý lại CSRF bằng CSRF token hoặc kiểm tra custom header. WebSocket hay bị bỏ sót: handshake không được CORS bảo vệ nên server phải kiểm tra header Origin; xác thực bằng ticket ngắn hạn, dùng một lần, không đặt token dài hạn trong URL vì URL bị ghi vào log; phân quyền theo từng subscription. Chốt lại: frontend không bao giờ là ranh giới bảo mật. Lưu ý: đây là kiến thức, không phải trách nhiệm bảo mật bạn từng đảm nhận ở NAB.",
    technicalExplanation: `### Threat model first
The highest-impact client-side threat in trading is **script execution in the user's session** (XSS, compromised third-party script). It can read the DOM, call APIs with the user's cookies and submit orders. Everything else is defence in depth around that.

### XSS prevention
- React escapes text by default; the risky paths are \`dangerouslySetInnerHTML\`, \`href\` with \`javascript:\` URLs, injecting HTML into chart tooltips, and third-party widgets.
- Sanitize any rich content (news, research notes) with DOMPurify; validate URLs against an allowlist of protocols.
- Treat market-data strings as untrusted too — instrument names and headlines come from external systems.

### Content Security Policy
- \`script-src 'nonce-…' 'strict-dynamic'\` (no \`unsafe-inline\`, no \`unsafe-eval\`), \`connect-src\` restricted to API and WebSocket origins (which also blocks exfiltration to arbitrary hosts), \`frame-ancestors 'none'\` against clickjacking, \`object-src 'none'\`, \`base-uri 'none'\`.
- Roll out with \`Content-Security-Policy-Report-Only\` first, collect violations, then enforce.
- Add Trusted Types where supported to make DOM XSS sinks fail closed.

### Token storage
- **localStorage / sessionStorage** — readable by any script, so a single XSS steals the token. Acceptable only for short-lived access tokens with strong CSP, and still the weakest option.
- **In-memory access token + refresh via HttpOnly cookie** — better; refresh token never exposed to JS.
- **BFF / token-handler pattern** — browser holds only an HttpOnly, Secure, SameSite session cookie; the BFF attaches tokens to upstream calls. Strongest for a financial app.

### CSRF
Cookies are sent automatically, so state-changing requests need protection: SameSite=Lax/Strict, plus a synchronizer or double-submit CSRF token, or a required custom header (which forces a CORS preflight cross-origin). Never change state with GET.

### WebSocket authentication and authorization
- Browsers don't let you set custom headers on the WebSocket handshake, and the handshake isn't subject to CORS. Cookies are sent, so **cross-site WebSocket hijacking** is possible unless the server validates \`Origin\` against an allowlist.
- Prefer a short-lived, single-use ticket obtained over an authenticated, CSRF-protected request; send it in the first message (server closes the socket if no auth arrives within a few seconds) or as a query parameter that is useless once consumed.
- Authorize **every subscription** (user may see account A's positions, not account B's), not just the connection.
- Long-lived sockets outlive tokens: the server must re-check on expiry (re-auth message or forced close), and revoke on logout.

### Order-level safeguards
Server-side limits, idempotency keys, step-up confirmation for unusual actions, and audit logging. The UI mirrors these rules for usability, but enforcement is always on the server.`,
    practicalExample: {
      description: {
        en: "Authenticating a WebSocket with a single-use ticket: the HttpOnly session cookie (plus a CSRF header) is exchanged for a short-lived ticket via the BFF, which is sent in the first message instead of the URL. The server also handles re-authentication requests.",
        vi: "Xác thực WebSocket bằng ticket dùng một lần: cookie session HttpOnly (kèm CSRF header) được đổi lấy ticket ngắn hạn qua BFF, ticket được gửi trong message đầu tiên thay vì đặt trên URL. Có xử lý cả yêu cầu re-authenticate từ server.",
      },
      code: {
        language: "ts",
        code: `// 1) Exchange the HttpOnly session cookie for a short-lived, single-use WS ticket (via the BFF)
async function getWsTicket(): Promise<string> {
  const res = await fetch("/bff/ws-ticket", {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": readCsrfToken() },
  });
  if (!res.ok) throw new Error("ws-ticket failed with status " + res.status);
  const body = (await res.json()) as { ticket: string };
  return body.ticket;
}

const isReauth = (m: unknown): boolean =>
  typeof m === "object" && m !== null && (m as { op?: unknown }).op === "reauth";

// 2) Authenticate in the first frame; the ticket never appears in URLs or access logs.
//    The server validates Origin on upgrade and closes the socket if auth doesn't arrive quickly.
export async function connectSecure(url: string, onMessage: (msg: unknown) => void): Promise<WebSocket> {
  const ticket = await getWsTicket();
  const ws = new WebSocket(url);
  ws.addEventListener("open", () => ws.send(JSON.stringify({ op: "auth", ticket })));
  ws.addEventListener("message", (e: MessageEvent<string>) => {
    const msg: unknown = JSON.parse(e.data);
    if (!isReauth(msg)) return onMessage(msg);
    // Session is about to expire: fetch a fresh ticket, or close if the session is gone
    getWsTicket()
      .then((t) => ws.send(JSON.stringify({ op: "auth", ticket: t })))
      .catch(() => ws.close(4001, "session expired"));
  });
  return ws;
}

function readCsrfToken(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? "";
}`,
      },
    },
    diagram: {
      kind: "sequence",
      code: `sequenceDiagram
  participant B as Browser
  participant F as BFF
  participant G as WS gateway
  B->>F: POST ws-ticket with session cookie and CSRF header
  F-->>B: single-use ticket with short TTL
  B->>G: WebSocket upgrade
  Note over G: validate Origin against allowlist
  B->>G: auth message with ticket
  G->>F: verify and consume ticket
  F-->>G: user id and scopes
  B->>G: subscribe positions for account A
  G-->>B: authorized, snapshot follows
  G-->>B: reauth request before session expiry`,
      caption: {
        en: "Ticket-based WebSocket authentication with Origin validation and per-subscription authorization; no long-lived token ever appears in a URL.",
        vi: "Xác thực WebSocket bằng ticket, có kiểm tra Origin và phân quyền theo từng subscription; không có token dài hạn nào xuất hiện trên URL.",
      },
    },
    memoryShortcut: {
      en: "SCOOT: Sanitize, CSP, Origin check, One-time ticket, Tokens stay HttpOnly.",
      vi: "SCOOT: Sanitize, CSP, kiểm tra Origin, ticket dùng Một lần, Token nằm trong cookie HttpOnly.",
    },
    keyTakeaway: {
      en: "Prevent XSS first, keep tokens out of JavaScript's reach, and authenticate and authorize WebSockets explicitly — the browser's usual protections don't cover them.",
      vi: "Ưu tiên chặn XSS, giữ token ngoài tầm với của JavaScript, và xác thực + phân quyền WebSocket một cách tường minh — các cơ chế bảo vệ mặc định của trình duyệt không bao phủ WebSocket.",
    },
    followUps: [
      {
        id: "isb-q43-f1",
        question: {
          en: "Why not just put the access token in the WebSocket URL query string?",
          vi: "Tại sao không đặt luôn access token vào query string của URL WebSocket?",
        },
        answer: {
          en: "Because URLs are logged everywhere — load balancers, reverse proxies, gateway access logs, APM tools — so a long-lived token in the query string ends up stored in places with much weaker access control than your auth server. Anyone who reads those logs can replay it until it expires. If the protocol forces you to authenticate in the URL, the token should be a single-use ticket that expires within seconds and is consumed on first use, so a logged copy is worthless. Otherwise, sending the credential in the first message after the socket opens avoids the problem entirely.",
          vi: "Vì URL bị ghi log ở khắp nơi — load balancer, reverse proxy, access log của gateway, công cụ APM — nên token dài hạn trong query string sẽ bị lưu ở những chỗ có kiểm soát truy cập yếu hơn nhiều so với auth server. Ai đọc được log đều có thể dùng lại token cho tới khi hết hạn. Nếu giao thức buộc phải xác thực qua URL, token đó phải là ticket dùng một lần, hết hạn trong vài giây và bị huỷ ngay khi dùng, để bản bị ghi log trở nên vô giá trị. Còn không thì gửi thông tin xác thực trong message đầu tiên sau khi socket mở là tránh được hoàn toàn vấn đề.",
        },
      },
      {
        id: "isb-q43-f2",
        question: {
          en: "How would you roll out a strict CSP on a large existing app without breaking it?",
          vi: "Bạn triển khai CSP nghiêm ngặt cho một app lớn đang chạy thế nào để không làm hỏng nó?",
        },
        answer: {
          en: "Incrementally and with data. First I'd ship the policy as Content-Security-Policy-Report-Only with a reporting endpoint, so nothing breaks but every violation is recorded. Then I'd work through the reports: move inline scripts and event handlers into bundled code, generate a per-request nonce in middleware for the scripts that must stay inline, and inventory third-party scripts — each one either gets an explicit allowance or gets removed. Once violations drop to known, accepted noise, I'd switch to enforcing mode, keep reporting on, and add a CI check so new inline scripts are caught in review.",
          vi: "Làm từng bước và dựa trên dữ liệu. Đầu tiên đưa policy lên dưới dạng Content-Security-Policy-Report-Only kèm endpoint nhận báo cáo, để không có gì bị hỏng nhưng mọi vi phạm đều được ghi lại. Sau đó xử lý dần theo báo cáo: chuyển inline script và inline event handler vào code được bundle, sinh nonce theo từng request trong middleware cho những script buộc phải inline, và kiểm kê script bên thứ ba — mỗi script hoặc được cho phép tường minh, hoặc bị loại bỏ. Khi vi phạm chỉ còn những nhiễu đã biết và chấp nhận được, chuyển sang chế độ enforce, vẫn giữ reporting, và thêm kiểm tra trong CI để bắt inline script mới ngay khi review.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement:
      "Fintech UI for internal power users and external customers via a web portal; secure WebSocket/REST integration",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "NAB was an enterprise banking environment, but your documented work there is Adobe Experience Manager (Sites, Assets/DAM, Forms, Author/Publish, deployment and stakeholder support). Don't claim ownership of security controls; present this as knowledge and recommended practice.",
        vi: "NAB là môi trường ngân hàng doanh nghiệp, nhưng công việc được ghi nhận của bạn ở đó là Adobe Experience Manager (Sites, Assets/DAM, Forms, Author/Publish, deployment và hỗ trợ stakeholder). Đừng nói bạn phụ trách các biện pháp bảo mật; trình bày đây là kiến thức và cách làm đề xuất.",
      },
    },
    tags: ["security", "xss", "csp", "websocket-auth", "csrf", "bff"],
  },

  /* ------------------------------------------------------------------ */
  /* Q44 — Integrating with Python and Rust backends                     */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q44",
    number: 44,
    topicId: "fe-system-design",
    question: {
      en: "How would you integrate a React frontend with Python and Rust backends — API contracts, BFF, schema evolution and binary protocols?",
      vi: "Bạn sẽ tích hợp frontend React với backend Python và Rust thế nào — API contract, BFF, schema evolution và giao thức binary?",
    },
    answer:
      "I'd treat the contract as the product: generated, versioned and checked in CI, never hand-written twice.\n\nFor REST from Python, FastAPI already produces an OpenAPI spec from its Pydantic models, so I'd generate TypeScript types and a typed client from that spec in CI. If the backend makes a breaking change, the frontend build fails before production does. For Rust streaming services, I'd go schema-first — JSON Schema for JSON messages, or protobuf if the volume justifies binary — and generate both the Rust structs and the TypeScript decoders from the same source.\n\nTypes disappear at runtime, so at the boundary I validate: a Zod schema on REST responses, and on streams I validate the envelope and version cheaply rather than every field of every tick.\n\nFor evolution, the rules are simple: additive changes within a version, unknown fields ignored, unknown enum values mapped to an 'unknown' state instead of crashing, and breaking changes behind a new version, with both served during rollout — trading screens stay open for days, so old clients exist.\n\nA BFF earns its place when the UI needs aggregation from several services, when tokens should stay server-side, or when data must be shaped per screen. I wouldn't route the hot market-data stream through it unless it adds value, because it's another hop.\n\nAt Persefoni I worked with GraphQL APIs from React and TypeScript, where the schema is the contract between frontend and backend; I'd bring that schema-as-contract mindset to the Python and Rust services.",
    viExplanation:
      "Thông điệp chính: coi API contract là “sản phẩm” — được sinh tự động, có version và kiểm tra trong CI, không viết tay hai lần ở hai phía. Với REST từ Python: FastAPI tự sinh OpenAPI spec từ Pydantic model, nên frontend sinh TypeScript type và typed client từ spec đó trong CI; backend đổi phá vỡ tương thích thì build frontend fail trước khi lên production. Với streaming service viết bằng Rust: làm schema-first — JSON Schema cho message JSON, hoặc protobuf nếu lưu lượng đủ lớn để đáng dùng binary — và sinh cả struct Rust lẫn decoder TypeScript từ cùng một nguồn. Type biến mất lúc runtime nên vẫn phải validate ở ranh giới: Zod cho REST response, còn với stream chỉ validate envelope và version cho rẻ, không validate từng field của từng tick. Quy tắc schema evolution: trong một version chỉ thêm field, bỏ qua field lạ, enum lạ thì map về “unknown” thay vì crash, thay đổi phá vỡ thì ra version mới và phục vụ song song — vì màn hình trading có thể mở nhiều ngày liền. BFF chỉ đáng dùng khi cần gộp dữ liệu nhiều service, giữ token phía server hoặc định hình dữ liệu cho từng màn hình; không nên cho luồng market data nóng đi qua BFF nếu không có lợi ích, vì thêm một hop. Kinh nghiệm thật để dẫn: làm việc với GraphQL API từ React + TypeScript ở Persefoni (schema GraphQL chính là contract); Rust thì chỉ là kiến thức.",
    technicalExplanation: `### Contract-first pipeline
- **Python (FastAPI)** — Pydantic models generate an OpenAPI 3 document at \`/openapi.json\`. In CI, generate TypeScript types (e.g. openapi-typescript) and a thin typed fetch client, then run a breaking-change diff against the previous spec (removed fields, narrowed types, renamed paths fail the pipeline).
- **Rust streaming** — define messages in JSON Schema or \`.proto\` files in a shared contract repo or package; generate Rust types (serde / prost) and TypeScript types/decoders from the same files. One source of truth, two languages.
- Version the contract package and pin it in the frontend, so upgrades are explicit PRs.

### Runtime validation at the boundary
- TypeScript types are erased at runtime; a backend bug or a mismatched deploy still delivers wrong shapes.
- REST: parse responses with Zod (or a generated validator) and surface failures as typed errors, reported to monitoring.
- Streams: validating every field of thousands of ticks per second costs CPU. Validate the envelope (\`type\`, \`v\`, sequence) always, validate payloads fully in development and on a sample in production, and validate rare-but-critical messages (order updates, fills) always.

### Schema evolution rules
- **Tolerant reader** — ignore unknown fields (Zod objects strip them by default); map unknown enum values to \`"unknown"\` and render a neutral state.
- **Additive within a version**; renames are add-new + deprecate-old (expand → migrate → contract).
- **Breaking changes** get a new version; serve N and N−1 together, because trading screens stay open for days on an old bundle. A version endpoint lets the client prompt for a reload.
- **Decimals** — Rust \`rust_decimal\` and Python \`Decimal\` don't survive JSON numbers (IEEE 754 doubles in JS); send prices and quantities as strings or integer minor units with an explicit scale.

### BFF trade-offs
- **Pros** — aggregates several services per screen, keeps tokens server-side, adapts backend models to UI needs, a place for caching and rate limiting.
- **Cons** — another hop and another service to operate; risk of business logic drifting into it. Keep it thin; let latency-sensitive streams go directly to the WS gateway.

### Binary protocols
- Protobuf, FlatBuffers or MessagePack reduce payload size; protobuf adds field-number-based evolution.
- But \`JSON.parse\` is highly optimized in modern engines, so binary is not automatically faster to decode in JS — measure with realistic messages. Try \`permessage-deflate\` compression first.
- Costs: codegen tooling, unreadable frames in DevTools (ship a debug decoder), larger client bundle for the decoder.`,
    practicalExample: {
      description: {
        en: "A tolerant-reader decoder for an order-update message from a Rust/Python service: envelope check, unknown enum values mapped to 'unknown', decimals kept as strings, and unknown fields stripped.",
        vi: "Decoder theo kiểu tolerant reader cho message order-update từ service Rust/Python: kiểm tra envelope, enum lạ được map về “unknown”, số thập phân giữ dạng string, field lạ bị loại bỏ.",
      },
      code: {
        language: "ts",
        code: `import { z } from "zod";

const KNOWN_STATUS = ["new", "partially_filled", "filled", "cancelled", "rejected"] as const;
type OrderStatus = (typeof KNOWN_STATUS)[number] | "unknown";

const StatusSchema = z
  .string()
  .transform((s): OrderStatus => ((KNOWN_STATUS as readonly string[]).includes(s) ? (s as OrderStatus) : "unknown"));

const Envelope = z.object({ type: z.string(), v: z.number().int() });

// Mirrors the shared contract; z.object strips unknown keys, so additive backend changes are safe
const OrderUpdate = z.object({
  orderId: z.string(),
  status: StatusSchema,
  filledQty: z.string(), // decimal as string: no float drift between Rust, Python and JS
  avgPrice: z.string().nullable(),
  ts: z.number().int(),
});
export type OrderUpdate = z.infer<typeof OrderUpdate>;

const SUPPORTED_MAJOR = 2;
declare function reportOnce(key: string, detail?: unknown): void;

export function decodeOrderUpdate(raw: unknown): OrderUpdate | null {
  const env = Envelope.safeParse(raw);
  if (!env.success || env.data.type !== "order_update") return null;
  if (env.data.v > SUPPORTED_MAJOR) reportOnce("order_update.newer_version", env.data.v); // still try: tolerant reader
  const parsed = OrderUpdate.safeParse(raw);
  if (!parsed.success) {
    reportOnce("order_update.invalid", parsed.error.issues); // never crash the stream on one bad frame
    return null;
  }
  return parsed.data;
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  PY["Python FastAPI + Pydantic"] -->|"generates"| OA["OpenAPI spec"]
  RS["Rust stream service"] -->|"defined by"| SC["JSON Schema or proto files"]
  OA --> CG["CI codegen + breaking-change check"]
  SC --> CG
  CG --> TS["TS types + typed client"]
  TS --> V["Runtime validation at boundary"]
  V --> FE["React app"]
  FE -->|"REST"| BFF["Thin BFF - aggregate, hold tokens"]
  BFF --> PY
  FE -->|"WebSocket stream"| RS`,
      caption: {
        en: "Contracts flow from the backends through CI codegen into typed, runtime-validated clients; REST goes via a thin BFF, the hot stream goes direct.",
        vi: "Contract đi từ backend qua bước codegen trong CI thành client có type và được validate lúc runtime; REST đi qua BFF mỏng, luồng stream nóng đi thẳng.",
      },
    },
    memoryShortcut: {
      en: "Generate, Validate, Tolerate: generate types from one schema, validate at the edge, tolerate what you don't know.",
      vi: "Generate, Validate, Tolerate: sinh type từ một schema, validate ở ranh giới, chấp nhận những gì chưa biết.",
    },
    keyTakeaway: {
      en: "Make backend contracts the single source of truth via codegen and CI checks, validate at runtime boundaries, and evolve schemas additively so long-lived clients keep working.",
      vi: "Biến contract của backend thành nguồn sự thật duy nhất qua codegen và kiểm tra trong CI, validate ở ranh giới runtime, và mở rộng schema theo kiểu chỉ thêm để client chạy lâu vẫn hoạt động.",
    },
    followUps: [
      {
        id: "isb-q44-f1",
        question: {
          en: "When would you choose protobuf or another binary format over JSON for the stream?",
          vi: "Khi nào bạn chọn protobuf hoặc định dạng binary khác thay cho JSON cho luồng stream?",
        },
        answer: {
          en: "When bandwidth or payload size is the measured bottleneck — very high message rates, deep order books, or users on constrained networks — or when we want strict, field-number-based schema evolution shared with the Rust services. I wouldn't assume binary is faster to decode in the browser: JSON.parse is native and heavily optimized, while a JavaScript protobuf decoder may be slower for small messages. So I'd benchmark with real messages, try permessage-deflate compression first, and if we go binary, decode in a Web Worker, keep a debug decoder for DevTools, and watch the extra bundle size.",
          vi: "Khi băng thông hoặc kích thước payload là nút thắt đã được đo đạc — tần suất message rất cao, order book sâu, hoặc người dùng ở mạng hạn chế — hoặc khi muốn schema evolution chặt chẽ dựa trên field number và dùng chung với service Rust. Tôi không mặc định binary sẽ decode nhanh hơn trên trình duyệt: JSON.parse là native và được tối ưu rất kỹ, trong khi decoder protobuf viết bằng JavaScript có thể chậm hơn với message nhỏ. Vì vậy tôi benchmark với message thật, thử nén permessage-deflate trước; nếu chuyển sang binary thì decode trong Web Worker, giữ một debug decoder cho DevTools và theo dõi phần bundle tăng thêm.",
        },
      },
      {
        id: "isb-q44-f2",
        question: {
          en: "How do you roll out a breaking API change when users keep trading screens open for days?",
          vi: "Làm sao triển khai một thay đổi API phá vỡ tương thích khi người dùng để màn hình trading mở nhiều ngày liền?",
        },
        answer: {
          en: "I assume old bundles are always out there. The backend serves both the old and new versions for an overlap window — for WebSockets the client announces its protocol version in the auth or hello message and the gateway responds in that version. The frontend ships support for the new version first, behind a flag if needed. A lightweight version endpoint or a server control message tells outdated clients a new release is available, and the UI asks the user to reload at a safe moment, never in the middle of an order. Only when metrics show the old version's traffic is gone do we remove it — expand, migrate, contract.",
          vi: "Tôi luôn giả định rằng bundle cũ vẫn đang chạy ở đâu đó. Backend phục vụ song song cả version cũ và mới trong một khoảng thời gian chồng lấn — với WebSocket, client khai báo protocol version trong message auth hoặc hello và gateway trả lời theo đúng version đó. Frontend phát hành hỗ trợ version mới trước, có thể sau feature flag. Một version endpoint nhẹ hoặc control message từ server báo cho client cũ biết có bản mới, và UI mời người dùng reload vào thời điểm an toàn, không bao giờ giữa lúc đang đặt lệnh. Chỉ khi metric cho thấy không còn lưu lượng từ version cũ mới gỡ bỏ — expand, migrate, contract.",
        },
      },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "Hands-on REST/WebSocket/SSE integration with Rust/Python backend services",
    candidateExperience: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "GraphQL APIs consumed from React + TypeScript at Persefoni and REST/microservices integration at Ninja Van are real. Don't claim GraphQL code generation or contract tooling unless you actually used it. Python/FastAPI is a listed skill, and there is no production Rust experience — present OpenAPI/protobuf codegen for Rust/Python as your recommended approach.",
        vi: "Kinh nghiệm thật: dùng GraphQL API từ React + TypeScript ở Persefoni và tích hợp REST/microservices ở Ninja Van. Không nhận đã dùng GraphQL codegen hay công cụ contract nếu thực tế không dùng. Python/FastAPI là skill liệt kê, không có kinh nghiệm Rust production — trình bày codegen OpenAPI/protobuf cho Rust/Python như cách làm bạn đề xuất.",
      },
    },
    tags: ["api-contracts", "openapi", "protobuf", "bff", "schema-evolution", "python-rust"],
  },
];
