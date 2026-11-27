import type { InterviewQuestion } from "@/domain/package/schema";

/**
 * ISB Vietnam — Section 7, questions 14–18 (topic "react-performance").
 * Charting renderers, memory leaks, Core Web Vitals / INP, code splitting, frame budget.
 * Numbers in explanations are general platform facts, never candidate achievements.
 */
export const reactPerformanceQuestionsB: InterviewQuestion[] = [
  /* ------------------------------------------------------------------ */
  /* Q14 — Canvas vs SVG vs WebGL                                        */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q14",
    number: 14,
    topicId: "react-performance",
    question: {
      en: "Canvas vs SVG vs WebGL for financial charts: what are the trade-offs, and when would you switch from one to another?",
      vi: "Canvas, SVG hay WebGL cho biểu đồ tài chính: trade-off của từng loại là gì, và khi nào bạn chuyển từ loại này sang loại khác?",
    },
    answer:
      "I'd frame the choice around two numbers: how many marks are on screen, and how often they change. SVG is retained mode. Every candle, line and label is a DOM element, so I get CSS styling, hit testing, accessibility and crisp scaling for free. That's ideal up to a few thousand elements with modest update rates, like an allocation chart or a small sparkline. Beyond that, every tick goes through style, layout and paint for each node, and memory grows with the DOM. Canvas 2D is immediate mode. I issue draw calls and the browser keeps only pixels, so cost scales with what I draw per frame, not with DOM size. That's why most real-time trading charts, including TradingView Lightweight Charts, are canvas-based. The price is that I own hit testing, tooltips, high-DPI scaling and accessibility. WebGL moves drawing to the GPU. It shines with hundreds of thousands to millions of points, like dense heatmaps, depth charts or every-trade scatter plots, but it's a big complexity jump: shaders, context loss, harder text rendering. In practice I'd use a hybrid: layered canvases for series and crosshair, and an HTML or SVG overlay for labels and accessible annotations. And I switch only when profiling shows paint or layout dominating the frame, not by default. To be transparent, I haven't shipped WebGL charts in production; this is the approach I'd take and validate with a prototype.",
    viExplanation:
      "Ý chính: chọn công nghệ render dựa trên hai yếu tố — số lượng phần tử (marks) trên màn hình và tần suất cập nhật. SVG là retained mode: mỗi cây nến, mỗi đường là một DOM node, nên bạn có sẵn CSS, hit testing, accessibility và hình ảnh sắc nét khi zoom. Nhưng khi số node lên đến hàng nghìn và cập nhật theo từng tick, mỗi thay đổi đều kéo theo style, layout, paint — dễ gây jank và tốn memory. Canvas 2D là immediate mode: bạn vẽ pixel rồi trình duyệt không giữ lại cấu trúc, chi phí phụ thuộc vào số draw call mỗi frame chứ không phụ thuộc vào kích thước DOM, nên phù hợp với hầu hết biểu đồ trading real-time (Lightweight Charts dùng canvas). Đổi lại, bạn phải tự lo hit testing, tooltip, devicePixelRatio và accessibility. WebGL đẩy việc vẽ sang GPU, mạnh khi có hàng trăm nghìn đến hàng triệu điểm (heatmap, depth chart, scatter từng giao dịch), nhưng phức tạp hơn nhiều: shader, xử lý context loss, render chữ khó. Câu trả lời mang tính senior là đề xuất kiến trúc hybrid: nhiều lớp canvas (nền, series, crosshair) cộng lớp HTML/SVG cho nhãn và chú thích truy cập được, và chỉ đổi công nghệ khi profiling chứng minh paint hoặc layout là nút thắt. Lưu ý trung thực: nếu chưa dùng WebGL trong production, hãy nói rõ đây là kiến thức và cách tiếp cận đề xuất.",
    technicalExplanation: `### How each renderer works
- **SVG (retained mode):** every mark is a node in the DOM. The browser keeps the scene graph, does hit testing, applies CSS and exposes nodes to the accessibility tree. Changing an attribute invalidates style, layout and paint for that subtree.
- **Canvas 2D (immediate mode):** a single bitmap. You issue draw calls and the browser keeps only pixels. Cost scales with draw calls per frame, not with DOM size. There is no built-in hit testing or semantics.
- **WebGL / WebGPU:** you upload vertex buffers to GPU memory and draw with shaders. Once data is on the GPU, per-point cost is tiny; the frame cost is dominated by a few draw calls.

### Rules of thumb (general guidance, always confirm by profiling)
- **SVG:** up to low thousands of elements, low update rate, rich interactivity and accessibility (allocation donut, P&L bars, small sparklines). D3 and visx are commonly used with SVG.
- **Canvas 2D:** thousands to a few hundred thousand points with frequent updates (candlesticks, live line charts, depth charts). Lightweight Charts, Chart.js and the ECharts canvas renderer work this way.
- **WebGL:** millions of points, heatmaps, every-trade scatter, or when canvas draw time alone exceeds the frame budget.

### A hybrid architecture that scales
- Stack layers: a grid canvas (rarely redrawn), a series canvas (redrawn when data changes), an interaction canvas (crosshair, redrawn on pointer move) and an HTML overlay for tooltips and axis labels.
- Redraw only **dirty layers**, at most once per animation frame.
- Scale the backing store by \`devicePixelRatio\` and call \`setTransform\` so you draw in CSS pixels; re-run on resize with a \`ResizeObserver\`.
- Hide the renderer behind a tiny adapter (\`setData\`, \`update\`, \`destroy\`) so swapping canvas for WebGL later does not ripple through the React tree.

### Failure scenarios
- SVG with thousands of nodes updated per tick: long style recalculation, INP spikes, growing memory.
- Canvas without DPR handling looks blurry on HiDPI screens; redrawing every layer on every \`pointermove\` wastes frames.
- **WebGL context loss** (GPU reset, driver issue, too many live contexts per page): listen for \`webglcontextlost\` / \`webglcontextrestored\` and re-upload buffers, otherwise the chart silently goes blank.
- Canvas is invisible to screen readers: provide a summary label, a data-table alternative and keyboard navigation.

### Maintainability and performance notes
- Prefer a proven library over hand-rolled rendering; write custom canvas only for the one view that needs it.
- \`OffscreenCanvas\` in a worker can isolate chart drawing from React work, at the cost of forwarding pointer events and tooltip positions.
- Text is the expensive part in canvas: cache measured label widths and avoid re-measuring on every frame.`,
    practicalExample: {
      description: {
        en: "A minimal canvas candle layer: HiDPI-aware, resized with ResizeObserver, and redrawn at most once per animation frame only when data changed.",
        vi: "Một layer nến tối giản dùng canvas: hỗ trợ HiDPI, tự resize bằng ResizeObserver, và chỉ vẽ lại tối đa một lần mỗi animation frame khi dữ liệu thay đổi.",
      },
      code: {
        language: "ts",
        code: `type Candle = { o: number; h: number; l: number; c: number };

export function createCandleLayer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("2D context unavailable");
  let candles: Candle[] = [];
  let frame = 0;

  const draw = () => {
    frame = 0;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    let lo = Infinity;
    let hi = -Infinity;
    for (const k of candles) { lo = Math.min(lo, k.l); hi = Math.max(hi, k.h); }
    const y = (p: number) => h - ((p - lo) / (hi - lo || 1)) * h;
    const step = w / Math.max(candles.length, 1);
    ctx.fillStyle = "#0b0e11";
    ctx.fillRect(0, 0, w, h);
    candles.forEach((k, i) => {
      const x = i * step + step / 2;
      ctx.strokeStyle = ctx.fillStyle = k.c >= k.o ? "#16a34a" : "#dc2626";
      ctx.beginPath(); ctx.moveTo(x, y(k.h)); ctx.lineTo(x, y(k.l)); ctx.stroke();
      const top = y(Math.max(k.o, k.c));
      ctx.fillRect(x - step * 0.35, top, step * 0.7, Math.max(1, y(Math.min(k.o, k.c)) - top));
    });
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };

  const ro = new ResizeObserver(() => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
    schedule();
  });
  ro.observe(canvas);

  return {
    setData(next: Candle[]) { candles = next; schedule(); },
    destroy() { ro.disconnect(); cancelAnimationFrame(frame); },
  };
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  A["New chart requirement"] --> B{"How many marks on screen?"}
  B -->|"up to low thousands"| C["SVG or HTML - CSS, a11y, built-in hit testing"]
  B -->|"thousands to a few 100k"| D["Canvas 2D - immediate mode, own hit testing"]
  B -->|"millions or GPU effects"| E["WebGL - shaders, handle context loss"]
  C --> F{"Updates many times per second?"}
  F -->|"yes"| D
  F -->|"no"| G["Keep SVG"]
  D --> H["Layered canvases plus HTML overlay for labels"]
  E --> H
  H --> I["Profile again - switch only on evidence"]`,
      caption: {
        en: "Decision flow: mark count and update rate drive the renderer; most real-time trading charts land on layered canvas.",
        vi: "Luồng quyết định: số lượng phần tử và tần suất cập nhật quyết định renderer; phần lớn biểu đồ trading real-time sẽ dùng canvas nhiều lớp.",
      },
    },
    memoryShortcut: {
      en: '"Few & fancy → SVG, many & moving → Canvas, massive → WebGL."',
      vi: '"Ít mà cầu kỳ → SVG, nhiều mà liên tục → Canvas, khổng lồ → WebGL."',
    },
    keyTakeaway: {
      en: "Pick the renderer by mark count and update rate, default to layered canvas for live market charts, and switch only when profiling proves the bottleneck.",
      vi: "Chọn renderer theo số lượng phần tử và tần suất cập nhật, mặc định dùng canvas nhiều lớp cho biểu đồ thị trường real-time, và chỉ đổi khi profiling chứng minh được nút thắt.",
    },
    followUps: [
      {
        id: "isb-q14-f1",
        question: {
          en: "A canvas chart is a single bitmap. How do you make it accessible?",
          vi: "Biểu đồ canvas chỉ là một bitmap. Bạn làm thế nào để nó accessible?",
        },
        answer: {
          en: "I treat the canvas as a visual layer and provide the semantics separately. The canvas gets role img and an aria-label summary, such as symbol, range, last price and change. Next to it I offer a data-table view of the visible range for screen-reader and keyboard users. The crosshair should be keyboard-operable: arrow keys move between candles, and a throttled, polite aria-live region announces open, high, low and close. I never rely on red and green alone; I add arrows or signs and respect reduced-motion settings. These are the same WCAG, keyboard-navigation and ARIA principles I applied at Persefoni, applied to a chart.",
          vi: "Tôi coi canvas là lớp hiển thị và cung cấp phần ngữ nghĩa riêng. Canvas có role img và aria-label tóm tắt: mã, khoảng thời gian, giá cuối, mức thay đổi. Bên cạnh đó có chế độ xem dạng bảng dữ liệu cho vùng đang hiển thị, dành cho người dùng screen reader và bàn phím. Crosshair phải điều khiển được bằng bàn phím: phím mũi tên di chuyển giữa các nến, và một vùng aria-live polite (có throttle) đọc giá open, high, low, close. Không bao giờ chỉ dựa vào màu xanh/đỏ; thêm mũi tên hoặc dấu +/− và tôn trọng prefers-reduced-motion. Đây chính là các nguyên tắc WCAG, keyboard navigation và ARIA tôi đã áp dụng ở Persefoni, giờ áp dụng cho biểu đồ.",
        },
      },
      {
        id: "isb-q14-f2",
        question: {
          en: "When would you move chart rendering into a worker with OffscreenCanvas?",
          vi: "Khi nào bạn chuyển việc render biểu đồ sang worker với OffscreenCanvas?",
        },
        answer: {
          en: "When profiling shows chart drawing competing with React renders or garbage collection on the main thread, and the chart is the hot path. With transferControlToOffscreen, the worker owns drawing, and market data can flow straight from a worker-side parser into the renderer without touching the main thread. The costs are real: pointer events still arrive on the main thread and must be forwarded with postMessage, DOM tooltips need coordinates sent back, many charting libraries don't support it, and debugging is harder. So I'd keep it for one or two heavy views and check the target browser matrix first.",
          vi: "Khi profiling cho thấy việc vẽ biểu đồ đang tranh main thread với React render hoặc garbage collection, và biểu đồ chính là hot path. Với transferControlToOffscreen, worker sở hữu việc vẽ, và dữ liệu thị trường có thể đi thẳng từ parser trong worker sang renderer mà không chạm vào main thread. Chi phí thì có thật: pointer event vẫn đến main thread và phải chuyển qua postMessage, tooltip bằng DOM cần gửi toạ độ ngược lại, nhiều thư viện chart chưa hỗ trợ, và debug khó hơn. Vì vậy tôi chỉ dùng cho một hai view nặng nhất và kiểm tra danh sách trình duyệt mục tiêu trước.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement:
      "Preferred: canvas/SVG charting (D3.js, Highcharts, Chart.js, Lightweight Charts, visx) for high-volume market data",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "No production charting-engine or WebGL experience is claimed. Present this as technical knowledge and a recommended approach; the accessibility angle can honestly reference your WCAG/ARIA work at Persefoni.",
        vi: "Không khẳng định kinh nghiệm production với charting engine hay WebGL. Trình bày như kiến thức kỹ thuật và cách tiếp cận đề xuất; phần accessibility có thể liên hệ trung thực với công việc WCAG/ARIA ở Persefoni.",
      },
    },
    tags: ["canvas", "svg", "webgl", "charting", "rendering"],
  },

  /* ------------------------------------------------------------------ */
  /* Q15 — Memory leaks in long-running SPAs                             */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q15",
    number: 15,
    topicId: "react-performance",
    question: {
      en: "A trading dashboard gets slower the longer it stays open. How do you detect and fix memory leaks in a long-running SPA?",
      vi: "Một dashboard trading càng mở lâu càng chậm. Bạn phát hiện và xử lý memory leak trong một SPA chạy lâu dài như thế nào?",
    },
    answer:
      "I'd approach it in three steps: confirm, locate, fix, and then prevent regressions. First, confirm it's really a leak and not just allocation churn. I run a soak scenario, say switching symbols or opening and closing a panel fifty times, with the Performance monitor showing JS heap size, DOM node count and event listener count. A healthy app looks like a sawtooth that keeps returning to the same floor after garbage collection. A rising floor is a leak. Second, locate it with the three-snapshot technique: take a heap snapshot after warm-up, repeat the action, take another, repeat again, take a third. Objects created between the first two that still survive in the third are my suspects. I filter for detached DOM nodes and read the retainer path, which tells me exactly who still holds the reference. In real-time dashboards the culprits are predictable: WebSocket or store listeners never removed on unmount, heartbeat intervals, chart instances never destroyed, closures capturing a whole snapshot, and unbounded tick-history arrays or per-symbol caches. Third, fix it structurally: every effect returns a cleanup, listeners are registered with an AbortController signal, and every buffer has a cap, such as ring buffers, LRU caches and a maximum number of points per series. Finally, I'd add a memory soak test to a nightly CI job, so a leak fails a build instead of ruining a trader's afternoon.",
    viExplanation:
      'Câu trả lời đi theo ba bước: xác nhận, khoanh vùng, sửa — rồi chống tái phát. Trong JavaScript, "leak" không phải bộ nhớ bị mất, mà là object vẫn còn reachable từ GC root dù ta không cần nữa. Bước 1: chạy soak test (đổi symbol hoặc đóng/mở panel nhiều lần) và theo dõi Performance monitor: JS heap, số DOM node, số event listener. Ứng dụng khoẻ có dạng răng cưa (sawtooth) quay về cùng một mức nền sau GC; nếu mức nền cứ tăng dần thì đó là leak. Bước 2: dùng kỹ thuật ba heap snapshot — object được tạo giữa snapshot 1 và 2 mà vẫn còn ở snapshot 3 là nghi phạm. Lọc "Detached" để tìm DOM đã bị gỡ khỏi trang nhưng vẫn bị JS giữ, rồi đọc retainer path để biết ai đang giữ tham chiếu. Thủ phạm quen thuộc trong app real-time: listener WebSocket/store không gỡ khi unmount, setInterval cho heartbeat, instance biểu đồ không gọi destroy, closure giữ cả snapshot lớn, mảng lịch sử tick hoặc cache theo symbol không giới hạn. Bước 3: sửa theo cấu trúc — mọi effect đều có cleanup, dùng AbortController signal cho listener, mọi buffer đều có giới hạn (ring buffer, LRU cache). Cuối cùng thêm memory soak test vào CI chạy hằng đêm.',
    technicalExplanation: `### What a leak actually is
- V8 uses a generational garbage collector (a scavenger for the young generation, mark-sweep-compact for the old generation): an object is collectable when it is **not reachable** from a root (globals, the active stack, the live DOM tree, pending callbacks and timers).
- A JavaScript leak is memory that is still reachable but no longer needed. Typical shape: a long-lived object (the WebSocket, a store, \`window\`) holds a listener, the listener's closure holds component state, and that state holds large data or DOM.
- **Detached DOM**: a node removed from the document but still referenced from JS. It retains its whole subtree and the listeners attached to it.

### Detecting
- **Performance monitor**: watch JS heap, DOM nodes and JS event listeners during a soak scenario. Healthy is a sawtooth returning to a baseline; a leak is a rising floor.
- **Three-snapshot technique** (Memory panel): baseline after warm-up, then after N repetitions, then after N more. Use the Comparison view, filter by "Detached", and read the **Retainers** pane from the object back to the GC root.
- **Allocation instrumentation on timeline** separates leaks (allocations that survive) from churn (allocations that die young).
- **Automation**: a Playwright scenario plus Chrome DevTools Protocol (force GC, read \`JSHeapUsedSize\`, \`Nodes\`, \`JSEventListeners\` metrics), or Meta's memlab, which diffs snapshots and reports leak traces.

### Common causes in a real-time SPA
- Listeners and subscriptions not removed: socket \`message\` handlers, store \`subscribe\`, \`window\` resize, ResizeObserver / IntersectionObserver, BroadcastChannel.
- Timers: heartbeat or polling intervals that outlive the component.
- Closures capturing big objects (a full snapshot) when only an id was needed.
- **Unbounded buffers**: tick history, per-symbol caches, query caches with long retention for hundreds of symbols, in-memory log arrays.
- Third-party charts and grids that are never destroyed and keep canvases, workers and listeners alive.
- Dev-only noise: \`console.log\` retains logged objects while DevTools is open; React StrictMode double-invokes effects precisely to expose missing cleanups.

### Fixing and preventing
- Every effect returns a cleanup; register listeners with an \`AbortController\` signal so one \`abort()\` removes them all.
- Cap everything: ring buffers, LRU caches, max points per series, downsampling for older history.
- Use \`WeakMap\` for metadata keyed by objects so entries die with their keys.
- Ref-count shared subscriptions so the last unmount really unsubscribes upstream.

### Trade-offs and related risks
- Caps mean dropping data: design how older history is fetched or downsampled on demand.
- **GC churn** is not a leak but still hurts: allocating new objects for every tick triggers frequent minor collections and dropped frames. Reuse objects or typed arrays in hot paths.
- Memory tests are noisy; run them nightly with trend-based thresholds rather than on every PR.`,
    practicalExample: {
      description: {
        en: "A hook that subscribes to ticks for one symbol with AbortController-based cleanup and keeps history in a bounded ring buffer, so unmounting releases the closure and memory stays capped.",
        vi: "Một hook subscribe tick cho một symbol, cleanup bằng AbortController và lưu lịch sử trong ring buffer có giới hạn, nên khi unmount closure được giải phóng và bộ nhớ luôn bị chặn trên.",
      },
      code: {
        language: "tsx",
        code: `import { useEffect, useRef } from "react";

type Tick = { symbol: string; price: number; ts: number };

class RingBuffer<T> {
  private buf: (T | undefined)[];
  private head = 0;
  size = 0;
  constructor(private readonly capacity: number) { this.buf = new Array(capacity); }
  push(item: T) {
    this.buf[this.head] = item; // overwrite the oldest entry: memory never grows
    this.head = (this.head + 1) % this.capacity;
    this.size = Math.min(this.size + 1, this.capacity);
  }
}

export function useTickHistory(socket: WebSocket, symbol: string, capacity = 5000) {
  const historyRef = useRef<RingBuffer<Tick> | null>(null);
  if (historyRef.current === null) historyRef.current = new RingBuffer<Tick>(capacity);

  useEffect(() => {
    const controller = new AbortController();
    const onMessage = (e: MessageEvent<string>) => {
      const tick = JSON.parse(e.data) as Tick;
      if (tick.symbol === symbol) historyRef.current?.push(tick);
    };
    socket.addEventListener("message", onMessage, { signal: controller.signal });
    // send() throws while CONNECTING; real code queues this until "open" (or a data layer owns subscriptions)
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ op: "subscribe", symbol }));

    return () => {
      controller.abort(); // removes the listener, so its closure can be collected
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ op: "unsubscribe", symbol }));
      }
    };
  }, [socket, symbol]);

  return historyRef;
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  ROOT["GC root - long-lived WebSocket"] --> L["message listener"]
  L --> C["closure scope of unmounted panel"]
  C --> B["tick array - unbounded"]
  C --> R["component ref"]
  R --> D["detached chart DOM and canvas"]
  U["Panel unmounted without cleanup"] -.->|"chain stays reachable"| L
  F["Cleanup calls controller.abort"] -->|"breaks the chain"| L
  F --> G["GC can reclaim closure, array and DOM"]`,
      caption: {
        en: "A retainer chain: a long-lived socket keeps a listener alive, which keeps the unmounted panel's closure, data and detached DOM reachable. Cleanup breaks the chain at the listener.",
        vi: "Chuỗi retainer: socket sống lâu giữ listener, listener giữ closure của panel đã unmount, kéo theo dữ liệu và DOM đã detach. Cleanup cắt chuỗi ngay tại listener.",
      },
    },
    memoryShortcut: {
      en: '"Sawtooth, Snapshots, Retainers, Caps" — confirm the rising floor, diff three snapshots, read who retains it, cap every buffer.',
      vi: '"Răng cưa, Snapshot, Retainer, Giới hạn" — xác nhận mức nền tăng, so sánh ba snapshot, đọc ai đang giữ tham chiếu, đặt giới hạn cho mọi buffer.',
    },
    keyTakeaway: {
      en: "A leak is unwanted reachability: prove it with a rising heap floor, find the retainer path with snapshot diffs, and prevent it with mandatory cleanups and bounded buffers.",
      vi: "Leak là object vẫn reachable ngoài ý muốn: chứng minh bằng mức nền heap tăng dần, tìm retainer path bằng so sánh snapshot, và phòng ngừa bằng cleanup bắt buộc cùng buffer có giới hạn.",
    },
    followUps: [
      {
        id: "isb-q15-f1",
        question: {
          en: "How would you catch memory regressions automatically before they reach users?",
          vi: "Bạn tự động phát hiện regression về memory trước khi đến tay người dùng bằng cách nào?",
        },
        answer: {
          en: "I'd write a Playwright scenario that repeats a realistic action, like switching symbols or opening and closing a blotter, a fixed number of times against a mocked market feed. Through the Chrome DevTools Protocol I force garbage collection, then read heap size, DOM node count and listener count before and after. The test asserts growth stays under a generous threshold. Alternatively memlab automates the snapshot diffing and prints the retainer trace, which makes failures actionable. Because these tests are slow and noisy, I'd run them nightly, track trends over time and alert on a consistent rise rather than gate every pull request.",
          vi: "Tôi viết một kịch bản Playwright lặp lại một thao tác thực tế, như đổi symbol hoặc đóng/mở blotter, một số lần cố định với market feed giả lập. Qua Chrome DevTools Protocol, tôi ép garbage collection rồi đọc heap size, số DOM node và số listener trước và sau. Test kiểm tra mức tăng nằm dưới một ngưỡng rộng rãi. Hoặc dùng memlab để tự động so sánh snapshot và in ra retainer trace, giúp lỗi dễ xử lý. Vì loại test này chậm và nhiễu, tôi chạy hằng đêm, theo dõi xu hướng và cảnh báo khi mức tăng lặp lại ổn định, thay vì chặn mọi pull request.",
        },
      },
      {
        id: "isb-q15-f2",
        question: {
          en: "What is the difference between a memory leak and GC churn, and why does churn matter in a trading UI?",
          vi: "Memory leak khác GC churn thế nào, và vì sao churn lại quan trọng trong UI trading?",
        },
        answer: {
          en: "A leak is retained memory: the heap floor keeps rising. Churn is a high rate of short-lived allocations: the heap stays flat, but the garbage collector runs very often. Each minor collection pauses the main thread briefly, and at thousands of ticks per second, creating new objects, spread copies and closures per message adds up to dropped frames and worse INP. I find hot allocators with the allocation sampling profiler, then reuse objects in the parsing path, store numeric series in typed arrays, and only create new references where React actually needs them to detect changes.",
          vi: "Leak là bộ nhớ bị giữ lại: mức nền heap tăng liên tục. Churn là tốc độ cấp phát object ngắn hạn rất cao: heap không tăng nhưng garbage collector chạy liên tục. Mỗi lần minor GC dừng main thread trong thời gian ngắn, và với hàng nghìn tick mỗi giây, việc tạo object mới, spread copy và closure cho mỗi message cộng dồn thành mất frame và INP tệ hơn. Tôi tìm điểm cấp phát nóng bằng allocation sampling profiler, sau đó tái sử dụng object trong đường parse, lưu chuỗi số bằng typed array, và chỉ tạo reference mới ở chỗ React thật sự cần để phát hiện thay đổi.",
        },
      },
    ],
    difficulty: "hard",
    priority: "critical",
    jdRequirement: "Required: memory leak detection and web performance tools for long-running real-time apps",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "Do not claim a specific leak incident or memory numbers. Describe this as your debugging method; you can note that listener cleanup is part of real-time code such as the Socket.IO work at Ninja Van, without inventing a story.",
        vi: "Không khẳng định một sự cố leak cụ thể hay số liệu bộ nhớ. Trình bày như phương pháp debug của bạn; có thể nhắc rằng cleanup listener là một phần của code real-time như phần Socket.IO ở Ninja Van, nhưng không bịa câu chuyện.",
      },
    },
    tags: ["memory", "heap-snapshot", "leaks", "devtools", "cleanup"],
  },

  /* ------------------------------------------------------------------ */
  /* Q16 — Core Web Vitals and INP                                       */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q16",
    number: 16,
    topicId: "react-performance",
    question: {
      en: "How do Core Web Vitals (LCP, INP, CLS) apply to a data-heavy trading app, and how would you measure and improve INP?",
      vi: "Core Web Vitals (LCP, INP, CLS) áp dụng thế nào cho một ứng dụng trading nhiều dữ liệu, và bạn đo lường, cải thiện INP ra sao?",
    },
    answer:
      "For a data-heavy trading app I treat the three vitals differently. LCP and CLS are mostly about the first load and layout stability. INP covers every interaction for the whole session, so it's the one that hurts most when streams are busy. The good thresholds are LCP under 2.5 seconds, INP under 200 milliseconds and CLS under 0.1, at the 75th percentile. I break INP into three parts, because each has a different fix. Input delay is the main thread being busy when the user clicks, typically tick parsing, a large snapshot or garbage collection; I move parsing to a worker and batch updates to once per frame. Processing time is our event handlers and the React render they trigger; I show feedback immediately and defer heavy work, like re-filtering a big blotter, with a transition. Presentation delay is style, layout and paint before the next frame; I virtualize and keep the DOM small. Measurement matters more than tricks. An internal dashboard behind a login usually isn't in Chrome's public field data, so I'd ship our own RUM with the web-vitals attribution build and Long Animation Frame data, segmented by route and by how busy the stream was. For CLS, I reserve space for charts and grids and use tabular numbers so changing prices never shift columns.",
    viExplanation:
      'Điểm mấu chốt: với dashboard trading, LCP và CLS chủ yếu liên quan đến lần tải đầu và độ ổn định layout, còn INP đo mọi tương tác trong suốt phiên làm việc — nên khi dữ liệu stream dồn dập, INP là chỉ số dễ "vỡ" nhất. Ngưỡng tốt: LCP dưới 2,5 giây, INP dưới 200 ms, CLS dưới 0,1, tính ở percentile 75. Hãy tách INP thành ba phần vì mỗi phần có cách sửa riêng: input delay (main thread đang bận parse tick, xử lý snapshot lớn hoặc GC khi người dùng click) → chuyển parse sang Web Worker, gom update mỗi frame một lần; processing time (event handler và React render) → phản hồi ngay lập tức, đẩy việc nặng như lọc lại blotter lớn vào useTransition; presentation delay (style, layout, paint) → virtualization, giảm kích thước DOM. Điểm thể hiện kinh nghiệm senior: dashboard nội bộ sau đăng nhập thường không có trong dữ liệu CrUX công khai, nên phải tự xây RUM bằng thư viện web-vitals bản attribution và Long Animation Frames API, phân nhóm theo route và theo mức tải của stream. Với CLS: đặt sẵn kích thước cho chart và grid, dùng tabular-nums để giá thay đổi không làm xô lệch cột.',
    technicalExplanation: `### The three metrics (assessed at the 75th percentile)
- **LCP** (Largest Contentful Paint): good at 2.5 s or less. In a dashboard the LCP element is often a grid header, a chart canvas or a hero number.
- **INP** (Interaction to Next Paint): good at 200 ms or less, poor above 500 ms. It replaced FID as a Core Web Vital in March 2024. It observes clicks, taps and key presses over the whole page lifetime and reports one of the slowest interactions (outliers are ignored on pages with many interactions).
- **CLS** (Cumulative Layout Shift): good at 0.1 or less. Shifts within 500 ms of user input are excluded.

### INP anatomy
- **Input delay**: the event waits because the main thread is busy (tick processing, GC, a long render).
- **Processing duration**: event handlers plus the synchronous React work they trigger.
- **Presentation delay**: style, layout, paint and composite until the next frame is shown.

### Measuring
- **Lab**: Performance panel with CPU throttling and the Interactions track; replay a recorded market session so the stream load is realistic. Lighthouse navigation mode cannot measure INP (TBT is only a proxy); use timespan mode or manual traces.
- **Field**: the \`web-vitals\` attribution build reports which element was interacted with and how the time split across the three phases. The **Long Animation Frames (LoAF)** API attributes slow frames to specific scripts.
- Authenticated internal apps are usually not in the Chrome UX Report, so **your own RUM is mandatory**. Segment by route, device class, session length and messages per second at the time of the interaction.

### Improving INP in a streaming dashboard
- Input delay: parse and aggregate in a Web Worker; coalesce updates to one render per frame; chunk large snapshot processing and yield.
- Processing: keep handlers minimal; render the immediate feedback (pressed state, selected row) first and defer expensive work with \`useTransition\` or by yielding.
- Presentation: virtualize grids, reduce DOM size, avoid forced synchronous layout, use \`content-visibility: auto\` and CSS containment for off-screen widgets.

### LCP and CLS in an app shell
- LCP: server-render or statically serve the shell, render the last known REST snapshot first, never wait for the WebSocket to paint; preload the critical font.
- CLS: fixed dimensions for charts and grids, skeletons with exact sizes, \`font-variant-numeric: tabular-nums\` for prices, no banners injected above content.

### Failure modes
- Optimizing a cold-load Lighthouse score while traders suffer after hours of streaming with many panels open.
- Looking at averages instead of p75, which hides the slow tail.
- Treating INP fixes as one-off; without RUM alerts, the next feature quietly regresses it.`,
    practicalExample: {
      description: {
        en: "Field RUM for an authenticated dashboard: report INP with phase attribution and Long Animation Frame scripts, plus LCP and CLS, batched and sent with sendBeacon when the page is hidden.",
        vi: "RUM thực tế cho dashboard cần đăng nhập: gửi INP kèm phân tách theo từng pha và script từ Long Animation Frames, cùng LCP và CLS, gom lại và gửi bằng sendBeacon khi trang bị ẩn.",
      },
      code: {
        language: "ts",
        code: `import { onCLS, onINP, onLCP } from "web-vitals/attribution";

type VitalPayload = {
  name: string;
  value: number;
  rating: string;
  route: string;
  detail?: Record<string, unknown>;
};

const queue: VitalPayload[] = [];
const route = () => location.pathname.split("/").slice(0, 3).join("/");

function flush() {
  if (queue.length === 0) return;
  const body = JSON.stringify(queue.splice(0));
  // sendBeacon survives page unload; fall back to a keepalive fetch
  if (!navigator.sendBeacon("/rum/vitals", body)) {
    void fetch("/rum/vitals", { method: "POST", body, keepalive: true });
  }
}
addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush();
});

onINP(({ name, value, rating, attribution: a }) => {
  queue.push({
    name, value, rating, route: route(),
    detail: {
      target: a.interactionTarget, // selector of the element the user touched
      inputDelay: a.inputDelay, // main thread busy, e.g. tick processing
      processing: a.processingDuration, // handlers + synchronous render
      presentation: a.presentationDelay, // style, layout, paint
      scripts: a.longAnimationFrameEntries
        .flatMap((f) => f.scripts.map((s) => s.sourceURL))
        .slice(0, 5),
    },
  });
});
onLCP(({ name, value, rating }) => queue.push({ name, value, rating, route: route() }));
onCLS(({ name, value, rating }) => queue.push({ name, value, rating, route: route() }));`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  A["User clicks Buy tab"] --> B["Input delay - main thread busy with tick batch"]
  B --> C["Processing - handlers and React render"]
  C --> D["Presentation delay - style, layout, paint"]
  D --> E["Next frame painted - INP measured"]
  B -.-> F["Fix - worker parsing and per-frame batching"]
  C -.-> G["Fix - instant feedback, useTransition, yield"]
  D -.-> H["Fix - virtualization and smaller DOM"]`,
      caption: {
        en: "INP is the sum of three phases; each phase points to a different fix in a streaming dashboard.",
        vi: "INP là tổng của ba pha; mỗi pha tương ứng với một cách khắc phục khác nhau trong dashboard có dữ liệu stream.",
      },
    },
    memoryShortcut: {
      en: '"Delay, Do, Draw" — input Delay, handler Do-time, Draw (presentation): fix INP phase by phase.',
      vi: '"Chờ, Làm, Vẽ" — Chờ (input delay), Làm (processing), Vẽ (presentation delay): sửa INP theo từng pha.',
    },
    keyTakeaway: {
      en: "In a trading app INP is the vital that matters all session long; measure it with your own RUM and attribution, then fix input delay, processing and presentation separately.",
      vi: "Trong ứng dụng trading, INP là chỉ số quan trọng suốt cả phiên; hãy đo bằng RUM riêng có attribution, rồi xử lý riêng input delay, processing và presentation.",
    },
    followUps: [
      {
        id: "isb-q16-f1",
        question: {
          en: "Lighthouse gives the dashboard 95, but traders say it feels sluggish. How do you explain and investigate that?",
          vi: "Lighthouse chấm dashboard 95 điểm nhưng trader vẫn thấy chậm. Bạn giải thích và điều tra thế nào?",
        },
        answer: {
          en: "Lighthouse measures a cold load in a lab: no live stream, no long session, no real interactions, and in navigation mode it can't measure INP at all. Traders feel the app after an hour with many panels open in a busy market, which is a completely different workload. I'd look at field INP from our RUM, broken down by phase, session length, number of open widgets and messages per second, and use Long Animation Frame scripts to find the culprit. Then I'd reproduce it locally by replaying a recorded market session with CPU throttling and profile the specific interaction.",
          vi: "Lighthouse đo lần tải nguội trong môi trường lab: không có stream thật, không có phiên dài, không có tương tác thật, và ở chế độ navigation thì không đo được INP. Trader cảm nhận ứng dụng sau một giờ với nhiều panel mở trong lúc thị trường sôi động — một khối lượng công việc hoàn toàn khác. Tôi sẽ xem INP thực tế từ RUM, tách theo pha, độ dài phiên, số widget đang mở và số message mỗi giây, rồi dùng script từ Long Animation Frames để tìm thủ phạm. Sau đó tái hiện ở local bằng cách replay một phiên thị trường đã ghi lại với CPU throttling và profile đúng tương tác đó.",
        },
      },
      {
        id: "isb-q16-f2",
        question: {
          en: "How do you stop live-updating numbers from causing layout shift or jitter?",
          vi: "Làm sao để các con số cập nhật liên tục không gây layout shift hay rung giật?",
        },
        answer: {
          en: "Price width must not depend on its value. I use tabular-nums so every digit has the same width, give price and size columns fixed or minimum widths, and right-align numbers so decimals line up. Highlights for up and down ticks use background color or opacity, never font weight, because bold text is wider. Badges or flash indicators get reserved space instead of being inserted. Skeletons match the real dimensions of charts and grids. Strictly speaking, text changing inside a fixed box doesn't count as CLS, but visual jitter still hurts readability, so I treat both the same way.",
          vi: "Độ rộng của giá không được phụ thuộc vào giá trị. Tôi dùng tabular-nums để mọi chữ số có cùng độ rộng, đặt độ rộng cố định hoặc tối thiểu cho cột giá và khối lượng, và căn phải để dấu thập phân thẳng hàng. Hiệu ứng tick tăng/giảm dùng background color hoặc opacity, không đổi font weight vì chữ đậm rộng hơn. Badge hay chỉ báo nhấp nháy có chỗ dành sẵn thay vì chèn thêm. Skeleton có kích thước đúng với chart và grid thật. Nói chính xác thì text thay đổi trong một khung cố định không tính vào CLS, nhưng rung giật thị giác vẫn làm khó đọc, nên tôi xử lý cả hai như nhau.",
        },
      },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "Web performance tools; interactive, low-latency dashboards for high-volume market data",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "No Web Vitals figures from past projects are claimed. Present the measurement and fix strategy as your approach; you may mention general enterprise frontend performance work at Persefoni only in the terms you can actually back up.",
        vi: "Không khẳng định số liệu Web Vitals từ dự án cũ. Trình bày chiến lược đo và cải thiện như cách tiếp cận của bạn; chỉ nhắc đến công việc frontend doanh nghiệp ở Persefoni trong phạm vi bạn thật sự chứng minh được.",
      },
    },
    tags: ["core-web-vitals", "inp", "rum", "performance", "cls"],
  },

  /* ------------------------------------------------------------------ */
  /* Q17 — Code splitting and bundle analysis                            */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q17",
    number: 17,
    topicId: "react-performance",
    question: {
      en: "How do you approach code splitting, lazy loading and bundle analysis in a large React application?",
      vi: "Bạn tiếp cận code splitting, lazy loading và phân tích bundle trong một ứng dụng React lớn như thế nào?",
    },
    answer:
      "I think about splitting in layers, and the rule is: split what isn't on the critical path, and preload what the user is about to need. First, route-level splitting. Each workspace, such as trading, analytics or a customer portal, is its own chunk. Next.js App Router does this per route segment automatically; in a Vite app I'd use lazy routes. Second, component-level splitting for heavy, non-critical pieces: advanced charting with indicators, spreadsheet export, report builders, admin screens. What I would not lazy-load is the order ticket or anything a trader needs in the first second, because a spinner there costs far more than a few extra kilobytes. Third, avoid waterfalls: start the chunk and the data fetch in parallel, and preload on intent, like hover, focus or idle time. Tree-shaking only works if the code allows it: ES modules, sideEffects false on internal packages, no giant barrel files, and lighter dependencies, for example Intl instead of a heavy date library. In a Vite and Turborepo monorepo like the one I worked in at Persefoni, shared packages need clean ESM exports, otherwise every app pays for the whole library. I verify with a bundle visualizer and enforce size budgets in CI. One failure mode people forget: users who keep a tab open for days hit missing chunks after a deploy, so I keep old assets around and handle ChunkLoadError with a reload prompt.",
    viExplanation:
      "Nguyên tắc cốt lõi: tách những gì không nằm trên critical path, và preload những gì người dùng sắp cần. Tách theo ba lớp: (1) theo route — mỗi workspace (trading, analytics, customer portal) là một chunk riêng; Next.js App Router tự làm việc này theo route segment, còn với Vite thì dùng lazy route; (2) theo component — những phần nặng và không cần ngay như chart nâng cao, export Excel, report builder, màn hình admin; (3) tránh waterfall — tải chunk và data song song, preload theo ý định người dùng (hover, focus) hoặc lúc trình duyệt rảnh. Điểm thể hiện tư duy senior: không lazy-load order ticket hay bất cứ thứ gì trader cần ngay lập tức, vì một spinner sai thời điểm tốn kém hơn nhiều so với vài KB. Tree-shaking chỉ hoạt động khi code cho phép: dùng ESM, khai báo sideEffects false cho package nội bộ, tránh barrel file khổng lồ, chọn thư viện nhẹ hơn. Với monorepo Vite + Turborepo (kinh nghiệm thật ở Persefoni), các shared package phải export ESM sạch, nếu không mọi app đều phải gánh toàn bộ thư viện. Kiểm chứng bằng bundle visualizer và đặt size budget trong CI. Đừng quên lỗi ChunkLoadError khi trader mở tab nhiều ngày rồi gặp bản deploy mới.",
    technicalExplanation: `### Levels of splitting
- **Route-level:** each workspace is a dynamic import. Next.js App Router splits per route segment automatically, and Server Components ship no client JavaScript at all. In Vite with React Router, use lazy routes.
- **Component-level:** heavy and off the critical path: charting libraries with indicator packs, rich-text editors, spreadsheet export, modals, admin screens.
- **Vendor chunks:** stable dependencies in long-cached chunks. Over-splitting creates many tiny requests and more parse units, so let the bundler's defaults work unless analysis says otherwise.

### Preloading without waterfalls
- The classic waterfall: route chunk loads, then it discovers a lazy component chunk, then that component starts fetching data. Start code and data in parallel (route loaders, \`<Link>\` prefetching in Next.js, TanStack Query prefetching).
- **Intent-based preload:** on hover, focus or pointer down; **idle preload** with \`requestIdleCallback\`; \`<link rel="modulepreload">\` for chunks you know are next.
- Never lazy-load critical trading controls (order ticket, cancel-all). A loading state at the wrong moment is a business risk, not a UX nit.

### Tree-shaking
- Works on static ESM imports. It breaks with CommonJS, top-level side effects, dynamic property access and barrel files that re-export everything.
- In a monorepo, mark internal packages with \`"sideEffects": false\` (listing CSS files as exceptions), ship ESM, and expose subpath \`exports\`.
- Prefer platform APIs: \`Intl.NumberFormat\` and \`Intl.DateTimeFormat\` instead of large formatting libraries; \`lodash-es\` per-function imports instead of the CommonJS build.

### Bundle analysis and budgets
- Vite: \`rollup-plugin-visualizer\`; Next.js 16 with Turbopack (the default bundler): the built-in \`next analyze\` command (16.1+), while \`@next/bundle-analyzer\` only works with webpack builds; any bundler: \`source-map-explorer\`.
- Look at parsed size (CPU cost) as well as compressed size (network cost), and look for **duplicated packages**, such as two versions of a date library.
- Enforce budgets in CI (for example with size-limit) so a regression fails the pull request instead of being discovered in production.

### Failure scenarios
- **ChunkLoadError after deploy:** traders keep tabs open for days, the old hashed chunks disappear from the CDN, and the next lazy import fails. Keep previous build assets for a while, retry once, then show a non-blocking reload prompt; never auto-reload during an active order flow.
- Suspense fallbacks without reserved size cause layout shift.
- A lazy boundary placed too high hides the whole screen behind a spinner; place boundaries around the heavy widget, not the page.

### Maintainability
- Keep split points explicit and few, named after features. Review bundle diffs in PRs the same way you review API changes.`,
    practicalExample: {
      description: {
        en: "A lazy component with a preload handle: the chart chunk is warmed during idle time and on hover or focus, failed loads can be retried, and Suspense reserves the space to avoid layout shift.",
        vi: "Một component lazy có hàm preload: chunk biểu đồ được tải trước khi trình duyệt rảnh và khi hover hoặc focus, lần tải lỗi có thể thử lại, và Suspense giữ sẵn chỗ để tránh layout shift.",
      },
      code: {
        language: "tsx",
        code: `import { lazy, Suspense, type ComponentType } from "react";

function lazyWithPreload<P extends object>(factory: () => Promise<{ default: ComponentType<P> }>) {
  let promise: Promise<{ default: ComponentType<P> }> | null = null;
  const load = () =>
    (promise ??= factory().catch((err: unknown) => {
      promise = null; // let the next attempt retry, e.g. after a flaky network
      throw err;
    }));
  return Object.assign(lazy(load), { preload: load });
}

// Heavy and not needed for first paint: charting library plus indicators.
const AdvancedChart = lazyWithPreload(() => import("./charts/AdvancedChart"));
const preloadChart = () => { AdvancedChart.preload().catch(() => {}); };

if (typeof window !== "undefined" && "requestIdleCallback" in window) {
  requestIdleCallback(preloadChart); // warm the chunk when the browser is idle
}

type Props = { symbol: string; active: boolean; onSelect: () => void };

export function ChartTab({ symbol, active, onSelect }: Props) {
  return (
    <section>
      <button type="button" onPointerEnter={preloadChart} onFocus={preloadChart} onClick={onSelect}>
        Advanced chart
      </button>
      {active && (
        <Suspense fallback={<div style={{ height: 320 }} aria-busy="true" />}>
          <AdvancedChart symbol={symbol} />
        </Suspense>
      )}
    </section>
  );
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  V["Vendor chunk - React, state library"] --> E["Entry chunk - shell, router, auth, WS client"]
  E --> R1["Route chunk - Trading workspace with order ticket"]
  E --> R2["Route chunk - Analytics"]
  E --> R3["Route chunk - Customer portal"]
  R1 --> C1["Lazy - advanced chart and indicators"]
  R1 --> C2["Lazy - trade history export"]
  R2 --> C3["Lazy - report builder"]
  P["Preload on idle, hover or focus"] -.-> C1
  B["CI bundle budget check"] -.-> E`,
      caption: {
        en: "A chunk graph: critical trading controls stay in the route chunk, heavy widgets are lazy and preloaded on intent, and CI guards the budget.",
        vi: "Sơ đồ chunk: các control trading quan trọng nằm trong route chunk, widget nặng được lazy và preload theo ý định người dùng, còn CI giữ ngân sách kích thước bundle.",
      },
    },
    memoryShortcut: {
      en: '"Route, Widget, Warm, Watch" — split by route, lazy heavy widgets, warm chunks on intent, watch budgets in CI.',
      vi: '"Route, Widget, Làm nóng, Canh chừng" — tách theo route, lazy widget nặng, preload theo ý định, canh size budget trong CI.',
    },
    keyTakeaway: {
      en: "Split everything off the critical path, keep trading-critical controls eager, preload on intent to avoid waterfalls, and make bundle budgets a CI gate.",
      vi: "Tách mọi thứ không nằm trên critical path, giữ control trading quan trọng ở dạng tải sẵn, preload theo ý định để tránh waterfall, và biến size budget thành cổng kiểm tra trong CI.",
    },
    followUps: [
      {
        id: "isb-q17-f1",
        question: {
          en: "In Next.js App Router, how would you load a charting library that only works in the browser?",
          vi: "Trong Next.js App Router, bạn tải một thư viện chart chỉ chạy được trên trình duyệt như thế nào?",
        },
        answer: {
          en: 'Server Components don\'t ship JavaScript, so I keep the page shell, layout and static content on the server and push the "use client" boundary as low as possible, around the chart widget only. Inside that client component I load the chart with next/dynamic and ssr set to false, because the library touches window and canvas at import time. In App Router that option must be used from a client component. I give it a loading placeholder with the exact chart height to avoid layout shift, and I rely on Link prefetching in production so the route code is already warm when the trader navigates.',
          vi: 'Server Component không gửi JavaScript xuống client, nên tôi giữ page shell, layout và nội dung tĩnh ở server, và đẩy ranh giới "use client" xuống thấp nhất có thể, chỉ bao quanh widget biểu đồ. Bên trong client component đó, tôi tải chart bằng next/dynamic với ssr false, vì thư viện truy cập window và canvas ngay khi import. Trong App Router, tuỳ chọn này phải được dùng từ một client component. Tôi đặt placeholder có đúng chiều cao của chart để tránh layout shift, và dựa vào cơ chế prefetch của Link ở production để code của route đã sẵn sàng khi trader chuyển trang.',
        },
      },
      {
        id: "isb-q17-f2",
        question: {
          en: "After a deployment, some users get ChunkLoadError. What is happening and how do you handle it?",
          vi: "Sau một lần deploy, một số người dùng gặp ChunkLoadError. Chuyện gì đang xảy ra và bạn xử lý ra sao?",
        },
        answer: {
          en: "Those users are still running the previous build. When they open a lazy screen, the browser requests an old hashed chunk that the new deployment removed. First, prevention: hashed assets are immutable, so I keep the previous builds' files on the CDN for a retention window. Second, recovery: an error boundary around lazy segments retries the import once, and if it still fails, shows a non-blocking 'new version available, reload' message, preserving drafts such as an unsent order ticket. Third, detection: a version endpoint or a server message tells the client a new build exists, and I prompt at a safe moment, never auto-reloading mid-trade.",
          vi: 'Những người dùng đó vẫn đang chạy bản build cũ. Khi mở một màn hình lazy, trình duyệt yêu cầu một chunk có hash cũ mà bản deploy mới đã xoá. Thứ nhất, phòng ngừa: asset có hash là bất biến, nên tôi giữ file của các bản build trước trên CDN trong một khoảng thời gian. Thứ hai, phục hồi: error boundary quanh các phần lazy sẽ thử import lại một lần, nếu vẫn lỗi thì hiện thông báo không chặn thao tác "có phiên bản mới, tải lại", đồng thời giữ lại bản nháp như order ticket chưa gửi. Thứ ba, phát hiện: một endpoint version hoặc message từ server báo cho client biết có bản build mới, và tôi chỉ nhắc ở thời điểm an toàn, không bao giờ tự reload giữa lúc đang giao dịch.',
        },
      },
    ],
    difficulty: "medium",
    priority: "medium",
    jdRequirement: "Architect modern, high-performance web applications (React, Next.js); web performance tools",
    candidateExperience: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "The Vite + Turborepo monorepo and TanStack Query background prefetching at Persefoni are real and can be referenced. Present route/component splitting details and CI size budgets as your approach unless you personally implemented them, and never quote bundle-size numbers.",
        vi: "Monorepo Vite + Turborepo và background prefetching với TanStack Query ở Persefoni là kinh nghiệm thật, có thể nhắc đến. Chi tiết tách route/component và size budget trong CI nên trình bày như cách tiếp cận của bạn trừ khi bạn trực tiếp làm, và không bao giờ nêu số liệu kích thước bundle.",
      },
    },
    tags: ["code-splitting", "lazy-loading", "bundle", "tree-shaking", "nextjs"],
  },

  /* ------------------------------------------------------------------ */
  /* Q18 — Frame budget, long tasks and yielding                         */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q18",
    number: 18,
    topicId: "react-performance",
    question: {
      en: "Explain the frame budget. How do you batch DOM and React updates with requestAnimationFrame and break up long tasks with scheduler.yield or chunking?",
      vi: "Hãy giải thích frame budget. Bạn gom các cập nhật DOM và React bằng requestAnimationFrame, và chia nhỏ long task bằng scheduler.yield hoặc chunking như thế nào?",
    },
    answer:
      "I start with the budget. At 60 hertz the browser has about 16.7 milliseconds per frame, and that has to cover input handling, my JavaScript, style, layout, paint and composite, so realistically I aim for well under ten milliseconds of script per frame. On a 120 hertz display the whole frame is half that. Anything over 50 milliseconds is a long task, and that's what users feel as a frozen click. With that in mind, I use three techniques. One: coalesce. WebSocket messages arrive as separate tasks, so a naive setState per message means a render per message. I buffer updates, keep only the latest value per key, and flush once per frame in requestAnimationFrame: one commit instead of hundreds. Two: chunk big work. If I need to apply a fifty-thousand-row snapshot or recompute indicators, I process a slice for a few milliseconds, then yield with scheduler.yield where it's supported, or a macrotask fallback, so clicks and paints get in between. I also pass an AbortSignal so stale work stops when the user changes symbol. Three: move work off the main thread entirely when it isn't UI; parsing and aggregation belong in a worker. The trade-offs: batching adds up to one frame of latency, which is fine for display but never acceptable on the order-sending path, and requestAnimationFrame pauses in background tabs, so buffers must be bounded and I resync from a snapshot when the tab comes back.",
    viExplanation:
      'Bắt đầu từ con số: ở 60 Hz, mỗi frame chỉ có khoảng 16,7 ms cho tất cả — xử lý input, JavaScript, style, layout, paint, composite — nên thực tế JavaScript chỉ nên chiếm dưới 10 ms; màn hình 120 Hz thì frame chỉ còn một nửa. Task nào dài hơn 50 ms là long task, và người dùng sẽ cảm thấy click bị "đơ". Ba kỹ thuật chính: (1) Coalesce — mỗi message WebSocket là một task riêng, nên gọi setState cho từng message sẽ tạo ra một lần render cho mỗi message (automatic batching của React từ bản 18 chỉ gom trong cùng một task, còn update từ external store như Zustand được flush đồng bộ). Hãy buffer lại, giữ giá trị mới nhất theo key (conflation) và flush một lần mỗi frame trong requestAnimationFrame. (2) Chunking — với việc lớn như áp dụng snapshot 50 nghìn dòng, xử lý từng lát vài ms rồi yield bằng scheduler.yield (hoặc fallback bằng macrotask) để input và paint được chen vào; dùng AbortSignal để dừng việc đã lỗi thời khi người dùng đổi symbol. (3) Chuyển việc không liên quan đến UI sang Web Worker. Trade-off cần nói rõ: batching thêm tối đa một frame độ trễ — chấp nhận được cho hiển thị nhưng không bao giờ áp dụng cho luồng gửi lệnh; và requestAnimationFrame bị tạm dừng ở tab nền, nên buffer phải có giới hạn và cần resync từ snapshot khi tab hiển thị lại.',
    technicalExplanation: `### Anatomy of a frame
- At 60 Hz a frame is about **16.7 ms**; at 120 Hz about **8.3 ms**. In each frame the browser may run input events, \`requestAnimationFrame\` callbacks, style, layout, paint and composite.
- A **long task** is any main-thread task over **50 ms** (Long Tasks API). It delays input handling and shows up directly as INP input delay. The **Long Animation Frames** API reports frames over 50 ms with script attribution.

### Batching with requestAnimationFrame
- rAF callbacks run once per frame, just before style and layout, which makes them the natural flush point for visual updates.
- WebSocket messages are separate tasks. React (18+) batches state updates **within one task**, and external-store updates (Zustand, Redux) are flushed synchronously, so one \`setState\` per message typically means one render per message. Coalescing into a per-frame flush turns hundreds of renders into one.
- **Conflate by key** for state-like data (last price per symbol). Append-only data (trade tape) goes into a bounded queue instead, because dropping intermediate values there would be wrong.
- Batch DOM **reads before writes** in the flush to avoid forced synchronous layout.
- rAF is paused in hidden tabs: buffers must be bounded, and on \`visibilitychange\` you resync from a snapshot instead of replaying everything.

### Chunking and yielding
- Large synchronous work (apply a big snapshot, recompute indicators over a long series) should run in slices with a time budget, yielding between slices.
- \`scheduler.yield()\` (Prioritized Task Scheduling API; Chromium 129+ and Firefox 142+, not Safari) resumes your continuation **ahead of** other queued tasks, so you don't lose your place behind unrelated work. Fallbacks: \`setTimeout(0)\` (clamped to at least 4 ms once nested five or more levels deep) or a \`MessageChannel\` post.
- \`scheduler.postTask\` accepts priorities: \`user-blocking\`, \`user-visible\`, \`background\`.
- Cancel stale work with an \`AbortSignal\` when inputs change, so slices from the old symbol don't keep running.

### React-specific notes
- Concurrent rendering (\`useTransition\`) lets React yield between components, but only for transition updates. Urgent updates and your own non-React code still block.
- For the hottest leaf cells, a transient update (store subscription plus direct \`textContent\` write in the rAF flush) skips reconciliation entirely. It is a maintainability trade-off, so use it only where profiling demands it.

### Trade-offs and failure scenarios
- Yielding increases total completion time; slices that are too small waste overhead, too large create long tasks.
- rAF batching adds up to one frame of latency: fine for display, never for order submission or risk checks.
- Over-conflation hides intermediate values: correct for last price, incorrect for an audit trail or trade tape.`,
    practicalExample: {
      description: {
        en: "Two utilities: a per-frame batcher that conflates updates by key, and a time-sliced snapshot applier that yields to the main thread every ~8 ms and stops when aborted.",
        vi: "Hai tiện ích: bộ gom update theo frame có conflation theo key, và hàm áp dụng snapshot theo lát thời gian, nhường main thread mỗi khoảng 8 ms và dừng khi bị abort.",
      },
      code: {
        language: "ts",
        code: `type Row = { id: string; price: number; qty: number };
type YieldingScheduler = { yield?: () => Promise<void> };

// scheduler.yield resumes ahead of other queued tasks; fall back to a macrotask elsewhere.
const yieldToMain = (): Promise<void> => {
  const s = (globalThis as { scheduler?: YieldingScheduler }).scheduler;
  return s?.yield ? s.yield() : new Promise((resolve) => setTimeout(resolve, 0));
};

/** Apply a large snapshot without creating a long task: ~8 ms of work, then yield. */
export async function applySnapshot(rows: Row[], apply: (r: Row) => void, signal: AbortSignal) {
  let deadline = performance.now() + 8;
  for (const row of rows) {
    apply(row);
    if (performance.now() >= deadline) {
      await yieldToMain(); // input events and rendering run here
      if (signal.aborted) return; // user switched symbol: drop stale work
      deadline = performance.now() + 8;
    }
  }
}

/** Coalesce many updates into one commit per frame; latest value per key wins. */
export function createFrameBatcher<T>(flush: (batch: Map<string, T>) => void) {
  let pending = new Map<string, T>();
  let frame = 0;
  return (key: string, value: T) => {
    pending.set(key, value);
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const batch = pending;
      pending = new Map();
      flush(batch); // e.g. one Zustand setState for all symbols in this frame
    });
  };
}`,
      },
    },
    diagram: {
      kind: "sequence",
      code: `sequenceDiagram
  participant WS as WebSocket
  participant FB as Frame batcher
  participant MT as Main thread
  participant BR as Browser render
  WS->>FB: tick for symbol A
  WS->>FB: tick for symbol B
  WS->>FB: newer tick for symbol A overwrites
  FB->>MT: requestAnimationFrame callback
  MT->>MT: one state update with 2 symbols
  MT->>BR: commit then style, layout, paint
  Note over MT,BR: aim for well under 10 ms of script in a 16.7 ms frame
  MT->>MT: snapshot slice 1 for about 8 ms
  MT-->>BR: scheduler.yield lets input and paint run
  MT->>MT: snapshot slice 2 unless aborted`,
      caption: {
        en: "Ticks are conflated and flushed once per frame; heavy snapshot work runs in time slices that yield so input and paint are never starved.",
        vi: "Tick được conflate và flush một lần mỗi frame; việc nặng như áp dụng snapshot chạy theo lát thời gian và nhường main thread để input và paint không bị bỏ đói.",
      },
    },
    memoryShortcut: {
      en: '"16-50-1": 16 ms per frame, 50 ms is a long task, 1 flush per frame.',
      vi: '"16-50-1": 16 ms mỗi frame, 50 ms là long task, 1 lần flush mỗi frame.',
    },
    keyTakeaway: {
      en: "Protect the frame: coalesce updates into one per-frame flush, slice heavy work and yield between slices, and keep non-UI work off the main thread.",
      vi: "Bảo vệ frame: gom update thành một lần flush mỗi frame, chia nhỏ việc nặng và yield giữa các lát, đồng thời đưa việc không phải UI ra khỏi main thread.",
    },
    followUps: [
      {
        id: "isb-q18-f1",
        question: {
          en: "Why not just batch with setInterval at 16 ms instead of requestAnimationFrame?",
          vi: "Tại sao không gom update bằng setInterval 16 ms thay vì requestAnimationFrame?",
        },
        answer: {
          en: "Timers aren't aligned with the display refresh. A 16 ms interval drifts against vsync, so sometimes it fires just after a frame was produced, adding latency, and sometimes twice within one frame, doing wasted work. It also ignores the real refresh rate, so on a 120 hertz screen you only use half the frames. Nested timers are clamped to at least 4 milliseconds and heavily throttled in background tabs. requestAnimationFrame runs exactly once per frame right before rendering and is skipped when the tab is hidden. For non-visual batching, such as acknowledgements or analytics, a timer or microtask is perfectly fine.",
          vi: "Timer không đồng bộ với tần số làm mới của màn hình. Interval 16 ms sẽ lệch dần so với vsync, có lúc chạy ngay sau khi frame vừa được vẽ (tăng độ trễ), có lúc chạy hai lần trong một frame (tốn công vô ích). Nó cũng bỏ qua tần số thật, nên trên màn hình 120 Hz bạn chỉ dùng một nửa số frame. Timer lồng nhau bị giới hạn tối thiểu 4 ms và bị throttle mạnh ở tab nền. requestAnimationFrame chạy đúng một lần mỗi frame ngay trước khi render và bị bỏ qua khi tab ẩn. Với việc gom không liên quan đến hiển thị, như gửi ack hay analytics, dùng timer hoặc microtask là hoàn toàn ổn.",
        },
      },
      {
        id: "isb-q18-f2",
        question: {
          en: "A price cell changes twenty times a second. How would you update it without re-rendering the whole row?",
          vi: "Một ô giá thay đổi hai mươi lần mỗi giây. Bạn cập nhật nó thế nào mà không re-render cả dòng?",
        },
        answer: {
          en: "First I'd make the cell its own component with a narrow store selector, so only that cell re-renders. If profiling still shows reconciliation cost, I'd use a transient update: subscribe to the store inside an effect without causing renders, and in the per-frame flush write textContent and a data attribute for the up or down flash directly through a ref. React still owns structure; the ref owns only the hot value. The trade-offs are that it bypasses React's model, so the cell must re-sync on remount, tests need to assert the DOM rather than props, and the value must not be inside an aria-live region announcing every tick.",
          vi: "Trước hết tôi tách ô giá thành component riêng với selector hẹp từ store, để chỉ ô đó re-render. Nếu profiling vẫn cho thấy chi phí reconciliation, tôi dùng transient update: subscribe vào store trong một effect mà không gây render, và trong lần flush mỗi frame thì ghi trực tiếp textContent cùng data attribute cho hiệu ứng tăng/giảm qua ref. React vẫn quản lý cấu trúc, còn ref chỉ quản lý giá trị nóng. Trade-off: cách này đi vòng qua mô hình của React, nên ô phải đồng bộ lại khi remount, test phải kiểm tra DOM thay vì props, và giá trị không được nằm trong vùng aria-live đọc lên từng tick.",
        },
      },
    ],
    difficulty: "hard",
    priority: "critical",
    jdRequirement: "Optimize browser rendering and DOM manipulation for high-frequency real-time updates",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "No production high-frequency market-data UI is claimed. Present this as browser-platform knowledge and the approach you would take; Ninja Van Socket.IO real-time work can be mentioned only as general real-time context, without invented volumes or results.",
        vi: "Không khẳng định đã làm UI dữ liệu thị trường tần suất cao trong production. Trình bày như kiến thức nền tảng trình duyệt và cách bạn sẽ tiếp cận; phần Socket.IO real-time ở Ninja Van chỉ nên nhắc như bối cảnh real-time chung, không bịa khối lượng hay kết quả.",
      },
    },
    tags: ["frame-budget", "requestanimationframe", "long-tasks", "scheduler-yield", "batching"],
  },
];
