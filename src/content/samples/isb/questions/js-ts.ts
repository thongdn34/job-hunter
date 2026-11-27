import type { InterviewQuestion } from "@/domain/package/schema";

/**
 * ISB Vietnam — Senior Front-End Developer
 * Section 7, topic "js-ts" (JavaScript and TypeScript), questions 19–25.
 * JD (verified): "Strong mastery of TypeScript and modern React ecosystems";
 * streaming via WebSockets/SSE from Rust/Python backends; high-frequency updates.
 */
export const jsTsQuestions: InterviewQuestion[] = [
  /* ---------------------------------------------------------------- */
  /* Q19 — Event loop                                                   */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q19",
    number: 19,
    topicId: "js-ts",
    question: {
      en: "Explain the JavaScript event loop: the call stack, microtasks vs macrotasks, and where rendering fits. How does it affect a real-time trading UI?",
      vi: "Hãy giải thích event loop của JavaScript: call stack, microtask và macrotask, và bước rendering nằm ở đâu. Điều đó ảnh hưởng thế nào đến một UI giao dịch real-time?",
    },
    answer: `I'd explain it in three parts: the loop itself, the queues, and what it means for a live dashboard.

First, JavaScript runs on one main thread with one call stack. The event loop picks a single macrotask, like a timer callback, a click, or a WebSocket message event, and runs it to completion. Then it drains the entire microtask queue: resolved promises, queueMicrotask, MutationObserver callbacks. Only after that does the browser get a chance to render a frame: requestAnimationFrame callbacks, then style, layout, paint and composite. On a 60 hertz screen that's roughly every 16 milliseconds, but only if the main thread is free.

Second, the subtle part: microtasks are drained completely. If a promise chain keeps queuing more microtasks, rendering and input are starved, and the page freezes even though no single function looks slow.

Third, for a trading dashboard, every WebSocket message is its own macrotask. If I call setState or touch the DOM inside each onmessage handler at thousands of messages per second, I'm doing far more work than the screen can ever show. So I keep the handler tiny: parse, write the latest value into a buffer, and schedule one flush per frame with requestAnimationFrame. Heavy parsing or aggregation moves to a Web Worker. And I watch for long tasks over 50 milliseconds, because that's exactly what a trader feels as lag when they click Buy.`,
    viExplanation: `Ý chính: JavaScript chỉ có một main thread. Mỗi vòng event loop lấy đúng một macrotask (timer, click, hoặc một message WebSocket), chạy xong hoàn toàn, rồi xử lý hết toàn bộ microtask (Promise.then, queueMicrotask). Chỉ sau đó trình duyệt mới có cơ hội render một frame: chạy requestAnimationFrame, rồi style, layout, paint, composite. Màn hình 60Hz cho khoảng 16ms mỗi frame, nhưng chỉ khi main thread rảnh.

Điểm hay bị hỏi: microtask queue được "xả" đến khi rỗng. Nếu code cứ tạo thêm microtask liên tục, trình duyệt không thể render hay nhận input, nên UI bị đơ dù không có hàm nào trông có vẻ chậm.

Áp dụng cho dashboard giao dịch: mỗi message WebSocket là một macrotask riêng. Nếu mỗi message đều gọi setState hoặc sửa DOM, ta làm nhiều việc hơn mức màn hình có thể hiển thị. Cách làm đúng là giữ handler thật nhẹ: parse, ghi giá trị mới nhất vào buffer (conflation), rồi flush một lần mỗi frame bằng requestAnimationFrame. Phần parse/aggregate nặng nên chuyển sang Web Worker. Ngoài ra cần theo dõi long task (trên 50ms), vì đó chính là độ trễ người dùng cảm nhận khi bấm đặt lệnh.`,
    technicalExplanation: `### One iteration of the loop
- **Macrotask (task):** the browser picks one task from a task queue: a \`setTimeout\` callback, a \`MessageChannel\` message, a user input event, a WebSocket \`message\` event. It runs to completion; nothing can interrupt it.
- **Microtask checkpoint:** after the task, the engine drains the microtask queue completely: promise reactions, \`queueMicrotask\`, \`MutationObserver\`. Microtasks queued *by* microtasks also run in the same checkpoint.
- **Rendering opportunity:** if a frame is due (about 16.7 ms at 60 Hz, 8.3 ms at 120 Hz), the browser runs \`requestAnimationFrame\` callbacks, then style, layout, paint and composite. Rendering is skipped if nothing changed or the tab is hidden.

### Why this matters for streaming UIs
- Each incoming WebSocket frame is a separate task. Thousands of messages per second mean thousands of tasks competing with input events and rendering.
- Updating React state per message is wasted work: React 18+ batches updates within one task, but separate tasks may each trigger a render, and external-store updates (Zustand, Redux via \`useSyncExternalStore\`) are always flushed synchronously. You only see one frame per vsync anyway.
- **Pattern:** buffer and conflate in the handler (latest value per key), schedule a single \`requestAnimationFrame\` flush, and apply one store update per frame.
- React's own scheduler yields between units of work using \`MessageChannel\` (a macrotask), which is why concurrent rendering can let input events in between.

### Failure scenarios
- **Microtask starvation:** a recursive promise loop or \`await\` inside a tight loop over a large array never yields to rendering. Use chunking with \`scheduler.yield()\` (where supported) or \`setTimeout\` / \`MessageChannel\` to yield.
- **Long tasks:** any task over 50 ms is a "long task" and directly hurts INP. Typical culprits: \`JSON.parse\` of a huge snapshot, sorting 100k rows, synchronous layout reads after writes.
- **Background tabs:** \`requestAnimationFrame\` pauses when the tab is hidden, and timers are throttled (often to once per second or less). A buffer that is not conflated will grow without bound; plan for it.
- **Timer clamping:** nested \`setTimeout(fn, 0)\` calls are clamped to at least 4 ms after five levels of nesting, so \`setTimeout\` is a poor high-frequency scheduler.

### Scalability and maintainability
- Keep the main thread for input and rendering. Move parsing, validation and aggregation into a Web Worker and send batched, already-aggregated data back.
- Put the scheduling policy (rAF flush, conflation, batch size) in one data-layer module so components never subscribe to raw sockets.
- Measure with the Performance panel (long tasks, frames) and the Long Animation Frames API in production RUM.`,
    practicalExample: {
      description: {
        en: "A WebSocket handler that does O(1) work per message, conflates ticks per symbol and applies at most one batched update per animation frame, with a cleanup function to avoid leaks.",
        vi: "Một handler WebSocket chỉ làm việc O(1) cho mỗi message, gộp (conflate) tick theo symbol và áp dụng tối đa một lần cập nhật theo batch cho mỗi animation frame, kèm hàm cleanup để tránh leak.",
      },
      code: {
        language: "ts",
        code: `type Tick = { symbol: string; price: number; seq: number };

export function attachFeed(ws: WebSocket, apply: (batch: Tick[]) => void): () => void {
  const pending = new Map<string, Tick>(); // bounded by the number of symbols
  let rafId: number | null = null;

  const flush = () => {
    rafId = null;
    const batch = [...pending.values()];
    pending.clear();
    apply(batch); // one store update, so at most one React render per frame
  };

  const onMessage = (event: MessageEvent<string>) => {
    // This is a macrotask: no React state, no DOM access here.
    const tick = JSON.parse(event.data) as Tick; // validate at the boundary in real code
    pending.set(tick.symbol, tick); // conflate: keep only the latest tick per symbol
    rafId ??= requestAnimationFrame(flush);
  };

  ws.addEventListener("message", onMessage);
  return () => {
    ws.removeEventListener("message", onMessage);
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}

// Ordering reminder:
// console.log("sync") -> Promise.then / queueMicrotask -> next task (setTimeout, WS message)
// requestAnimationFrame runs right before the next paint, only if a frame is rendered.`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  A["Pick ONE macrotask - WS message, timer, click"] --> B["Run it to completion on the call stack"]
  B --> C{"Microtask queue empty?"}
  C -->|No| D["Run next microtask - promise, queueMicrotask"]
  D --> C
  C -->|Yes| E{"Frame due and main thread free?"}
  E -->|No| A
  E -->|Yes| F["requestAnimationFrame callbacks - flush buffered ticks"]
  F --> G["Style, layout, paint, composite"]
  G --> A`,
      caption: {
        en: "One event-loop iteration: one task, all microtasks, then maybe a frame. Buffered ticks are flushed in rAF right before paint.",
        vi: "Một vòng event loop: một task, toàn bộ microtask, rồi có thể render một frame. Tick đã buffer được flush trong rAF ngay trước khi paint.",
      },
    },
    memoryShortcut: {
      en: '"One macro, all micros, then maybe paint" — and "buffer per message, flush per frame".',
      vi: '"Một macro, hết micro, rồi mới (có thể) paint" — và "buffer theo message, flush theo frame".',
    },
    keyTakeaway: {
      en: "The screen only updates between tasks, so a real-time UI should do minimal work per message and render at most once per frame.",
      vi: "Màn hình chỉ cập nhật giữa các task, nên UI real-time phải làm tối thiểu việc cho mỗi message và render tối đa một lần mỗi frame.",
    },
    followUps: [
      {
        id: "isb-q19-f1",
        question: {
          en: "When would you use queueMicrotask, setTimeout(0), or requestAnimationFrame to schedule work?",
          vi: "Khi nào bạn dùng queueMicrotask, setTimeout(0) hay requestAnimationFrame để lên lịch công việc?",
        },
        answer: {
          en: "They answer different questions. queueMicrotask runs before the browser can render, so I use it only to defer something until the current synchronous code finishes, such as coalescing several calls into one notification. It never yields to rendering. setTimeout(0) creates a new task, so input and rendering can happen first, but it is clamped and throttled in background tabs, so it is a poor clock. requestAnimationFrame is tied to the display refresh. That makes it the right place to flush visual updates: one batched write per frame. For CPU-heavy chunks I'd prefer scheduler.yield or a Web Worker.",
          vi: "Ba cách này giải quyết ba nhu cầu khác nhau. queueMicrotask chạy trước khi trình duyệt kịp render, nên tôi chỉ dùng nó để hoãn việc đến khi code đồng bộ hiện tại chạy xong, ví dụ gộp nhiều lần gọi thành một notification. Nó không hề nhường cho việc render. setTimeout(0) tạo một task mới, nên input và render có thể chạy trước, nhưng nó bị clamp và bị throttle khi tab chạy nền, nên không dùng làm đồng hồ được. requestAnimationFrame gắn với tần số làm mới màn hình, nên đây là nơi đúng để flush cập nhật giao diện: mỗi frame một lần ghi theo batch. Với các đoạn việc nặng CPU, tôi ưu tiên scheduler.yield hoặc Web Worker.",
        },
      },
      {
        id: "isb-q19-f2",
        question: {
          en: "What happens to your rAF-based batching when the user switches to another tab?",
          vi: "Điều gì xảy ra với cơ chế batching dựa trên rAF khi người dùng chuyển sang tab khác?",
        },
        answer: {
          en: "requestAnimationFrame stops firing in hidden tabs, so nothing flushes. Messages still arrive, though. If the buffer is a queue, memory grows without limit. I avoid that in three ways. First, conflation: I keep only the latest value per key, so the buffer is bounded by the number of instruments. Second, I listen to visibilitychange. When the tab is hidden, I unsubscribe from non-essential streams or switch to a slow timer flush. Third, when the tab becomes visible again, I request a fresh snapshot instead of replaying a backlog, because stale intermediate ticks have no value to the trader.",
          vi: "requestAnimationFrame ngừng chạy khi tab bị ẩn, nên không có gì được flush. Nhưng message vẫn tiếp tục đến. Nếu buffer là một hàng đợi, bộ nhớ sẽ tăng không giới hạn. Tôi xử lý theo ba cách. Thứ nhất là conflation: chỉ giữ giá trị mới nhất cho mỗi key, nên kích thước buffer bị chặn bởi số lượng instrument. Thứ hai, tôi lắng nghe sự kiện visibilitychange. Khi tab bị ẩn, tôi hủy subscribe các stream không quan trọng hoặc chuyển sang flush bằng timer chậm. Thứ ba, khi tab hiện lại, tôi lấy snapshot mới thay vì phát lại toàn bộ backlog, vì các tick trung gian đã cũ thì không còn giá trị với trader.",
        },
      },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "High-frequency real-time updates; browser rendering mechanics",
    candidateExperience: {
      company: "Ninja Van — TechLab",
      kind: "actual",
      note: {
        en: "You built Socket.IO real-time communication at Ninja Van, which is honest context for event-driven UI updates. High-frequency market-data handling is theoretical: frame it as how you would apply the same event-loop knowledge at trading volumes.",
        vi: "Bạn đã làm real-time communication với Socket.IO ở Ninja Van, đây là bối cảnh thật cho việc cập nhật UI theo sự kiện. Phần xử lý market data tần suất cao là kiến thức lý thuyết: hãy trình bày như cách bạn sẽ áp dụng hiểu biết về event loop ở quy mô giao dịch.",
      },
    },
    tags: ["event-loop", "microtasks", "requestanimationframe", "performance", "websocket"],
  },

  /* ---------------------------------------------------------------- */
  /* Q20 — Stale closures                                               */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q20",
    number: 20,
    topicId: "js-ts",
    question: {
      en: "What is a stale closure in React hooks? Walk through a WebSocket callback example and explain how you would fix it.",
      vi: "Stale closure trong React hooks là gì? Hãy phân tích một ví dụ với callback WebSocket và cách bạn sửa nó.",
    },
    answer: `A closure captures the variables of the scope where the function was created. In React, every render is its own scope with its own props and state. So a callback created during render one keeps seeing render one's values forever, unless something re-creates it.

The classic bug in a trading screen: I register a WebSocket message handler inside a useEffect with an empty dependency array. The handler filters by the selected symbol and appends to the trades list. The user switches from EURUSD to USDJPY, but the handler still holds EURUSD and the original empty list. The tape looks dead, or updates get lost because I wrote setTrades with a stale array.

I fix it in layers. First, if the update only depends on previous state, I use a functional update: setTrades with prev. That removes half the dependencies. Second, I separate the connection from the subscription. The socket effect depends only on the socket, so changing the symbol doesn't tear down the connection. Third, for values the handler must read but shouldn't trigger a resubscribe, I use useEffectEvent, which is stable since React 19.2. On older versions I use a latest-value ref updated in an effect.

And I keep the exhaustive-deps lint rule on. Silencing it is how stale closures get into production.`,
    viExplanation: `Closure "nhớ" các biến của scope nơi nó được tạo ra. Trong React, mỗi lần render là một scope riêng với props và state riêng. Vì vậy callback tạo ở render đầu tiên sẽ mãi thấy giá trị của render đó, trừ khi nó được tạo lại.

Bug kinh điển: đăng ký handler cho WebSocket trong useEffect với dependency rỗng []. Handler lọc theo symbol đang chọn và thêm trade vào danh sách. Khi người dùng đổi từ EURUSD sang USDJPY, handler vẫn giữ EURUSD và danh sách rỗng ban đầu, nên bảng trade "đứng hình" hoặc mất dữ liệu.

Cách sửa theo từng lớp: (1) dùng functional update setTrades(prev => ...) để không phụ thuộc vào state cũ; (2) tách effect quản lý connection khỏi phần subscription, để đổi symbol không làm reconnect WebSocket; (3) với giá trị cần đọc mới nhất nhưng không muốn re-subscribe, dùng useEffectEvent (stable từ React 19.2), hoặc pattern "latest ref" ở phiên bản cũ hơn. Cuối cùng, luôn bật rule eslint exhaustive-deps; tắt nó đi là cách stale closure lọt vào production.`,
    technicalExplanation: `### Why it happens
- Function components are called on every render; each call creates **new** local bindings for props and state.
- A callback captures the bindings of the render that created it. React state is a snapshot, not a live variable.
- \`useEffect(fn, [])\` runs once, so any handler created inside it is frozen to the first render's snapshot.
- Long-lived subscriptions (WebSocket, \`setInterval\`, event emitters, chart library callbacks) are where this hurts most, because they outlive many renders.

### The fixes, in order of preference
1. **Functional updates:** \`setTrades(prev => [t, ...prev])\` reads the latest state from React's queue instead of the closure. No dependency needed.
2. **Correct dependencies:** include what the effect reads. This is correct by default, but for a socket it may cause reconnect churn. So **split effects**: one owns the connection (\`[url]\`), another owns the subscription message (\`[symbol]\`).
3. **\`useEffectEvent\`:** returns a function that always sees the latest props/state but is not reactive, so it doesn't belong in deps. Only call it from effects, never during render.
4. **Latest ref (pre-19.2):** \`const ref = useRef(value)\` updated in \`useLayoutEffect\`; the stable handler reads \`ref.current\`. Do not read refs during render; that breaks concurrent rendering guarantees.

### Failure scenarios
- **Lost updates:** \`setTrades([...trades, t])\` with stale \`trades\` overwrites messages that arrived in between.
- **Wrong subscription:** handler filters by an old symbol, so the UI silently shows nothing. This is worse than a crash because it looks like a quiet market.
- **Listener leaks:** fixing staleness by re-adding listeners without cleanup creates N handlers; each message is processed N times and memory grows.
- **Retained memory:** closures keep everything they reference alive. A handler capturing a 100k-row array keeps that array alive as long as the socket lives.

### Maintainability
- Keep \`react-hooks/exhaustive-deps\` as an error. A disabled lint line is a code smell in review.
- Better still, components shouldn't own sockets at all: a data-layer module owns the connection and components subscribe through a store selector (\`useSyncExternalStore\` or Zustand), which avoids most closure problems.
- The React Compiler memoizes automatically but **does not** fix stale closures in effects; dependency correctness still matters.`,
    practicalExample: {
      description: {
        en: "A trade tape that keeps one WebSocket listener per socket, reads the latest selected symbol through useEffectEvent, uses functional updates with a bounded list, and cleans up on unmount.",
        vi: "Một trade tape chỉ giữ một listener cho mỗi socket, đọc symbol đang chọn mới nhất qua useEffectEvent, dùng functional update với danh sách có giới hạn, và cleanup khi unmount.",
      },
      code: {
        language: "tsx",
        code: `import { useEffect, useEffectEvent, useState } from "react";

type Trade = { id: string; symbol: string; price: string; qty: string };

export function TradeTape({ socket, symbol }: { socket: WebSocket; symbol: string }) {
  const [trades, setTrades] = useState<Trade[]>([]);

  // BUG (stale closure):
  // useEffect(() => {
  //   socket.onmessage = (e) => {
  //     const t = JSON.parse(e.data);
  //     if (t.symbol === symbol) setTrades([...trades, t]); // symbol and trades frozen at mount
  //   };
  // }, []);

  // Always sees the latest symbol, but is not a dependency of the effect.
  const onTrade = useEffectEvent((t: Trade) => {
    if (t.symbol !== symbol) return;
    setTrades((prev) => [t, ...prev].slice(0, 200)); // functional update + bounded list
  });

  useEffect(() => {
    const handler = (e: MessageEvent<string>) => onTrade(JSON.parse(e.data) as Trade);
    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler); // no leaked listeners
  }, [socket]); // changing symbol does NOT re-attach or reconnect

  return (
    <ul aria-label={symbol + " trades"}>
      {trades.map((t) => (
        <li key={t.id}>{t.price} x {t.qty}</li>
      ))}
    </ul>
  );
}`,
      },
    },
    diagram: {
      kind: "sequence",
      code: `sequenceDiagram
  participant R1 as Render 1 - symbol EURUSD
  participant R2 as Render 2 - symbol USDJPY
  participant H as onmessage handler
  participant WS as WebSocket
  R1->>H: useEffect with empty deps creates handler, captures EURUSD
  R2-->>H: Handler is not re-created because deps did not change
  WS->>H: USDJPY trade arrives
  H->>H: Compares with captured EURUSD and drops the trade
  Note over H: Stale closure - the tape looks frozen
  Note over R2,H: Fix - useEffectEvent or a latest ref reads the current symbol`,
      caption: {
        en: "The handler created in render 1 keeps render 1's symbol, so messages for the newly selected symbol are dropped.",
        vi: "Handler tạo ở render 1 vẫn giữ symbol của render 1, nên message cho symbol mới được chọn bị bỏ qua.",
      },
    },
    memoryShortcut: {
      en: '"Each render is a photo": callbacks remember the photo, not the live scene. Fix with FSE: Functional updates, Split effects, Effect events.',
      vi: '"Mỗi lần render là một tấm ảnh": callback nhớ tấm ảnh, không phải cảnh thật. Sửa bằng FSE: Functional update, Split effect, Effect event.',
    },
    keyTakeaway: {
      en: "Long-lived callbacks must read the latest values through functional updates, correct deps, useEffectEvent or a ref; never by silencing exhaustive-deps.",
      vi: "Callback sống lâu phải đọc giá trị mới nhất qua functional update, deps đúng, useEffectEvent hoặc ref; không bao giờ bằng cách tắt exhaustive-deps.",
    },
    followUps: [
      {
        id: "isb-q20-f1",
        question: {
          en: "Why not just add symbol and trades to the dependency array?",
          vi: "Sao không thêm luôn symbol và trades vào dependency array?",
        },
        answer: {
          en: "It would be correct, but expensive. Trades changes on every message, so the effect would tear down and re-attach the listener on every tick. If the effect also opens the socket, I'd reconnect constantly. Messages can arrive between cleanup and setup and get lost, and the server may see subscription churn. The functional update removes trades from the deps entirely. For symbol, the right dependency is a separate effect that sends subscribe and unsubscribe messages over the existing connection. Effects should be keyed by what they synchronize with, and the connection and the subscription are two different things.",
          vi: "Làm vậy thì đúng nhưng tốn kém. trades thay đổi với mỗi message, nên effect sẽ gỡ và gắn lại listener ở mỗi tick. Nếu effect còn mở socket thì ứng dụng sẽ reconnect liên tục. Message có thể đến giữa lúc cleanup và setup rồi bị mất, và server cũng phải chịu việc subscription bị tạo rồi hủy liên tục. Functional update giúp bỏ hẳn trades khỏi deps. Với symbol, dependency đúng là một effect riêng gửi message subscribe và unsubscribe qua connection hiện có. Effect nên được key theo thứ nó đồng bộ, và connection với subscription là hai thứ khác nhau.",
        },
      },
      {
        id: "isb-q20-f2",
        question: {
          en: "How would you solve this before useEffectEvent was available?",
          vi: "Trước khi có useEffectEvent thì bạn giải quyết thế nào?",
        },
        answer: {
          en: "With the latest-ref pattern. I store the value in a useRef and update ref.current in a useLayoutEffect after each render. The long-lived handler reads ref.current when the message arrives. The handler stays stable, so the effect doesn't re-run. There are two caveats. First, never assign the ref during render, because in concurrent rendering a render can be thrown away, and the ref would hold uncommitted values. Second, only read the ref inside events or effects, not during render. I'd wrap it in a small useLatest hook so the pattern is consistent and easy to remove after upgrading.",
          vi: "Dùng pattern latest ref. Tôi lưu giá trị vào useRef và cập nhật ref.current trong useLayoutEffect sau mỗi lần render. Handler sống lâu sẽ đọc ref.current khi message đến. Handler giữ ổn định nên effect không chạy lại. Có hai lưu ý. Thứ nhất, không gán ref trong lúc render, vì với concurrent rendering một lần render có thể bị bỏ đi, và ref sẽ giữ giá trị chưa được commit. Thứ hai, chỉ đọc ref trong event hoặc effect, không đọc trong render. Tôi sẽ gói nó vào một hook useLatest nhỏ để pattern thống nhất và dễ gỡ bỏ sau khi nâng cấp.",
        },
      },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "Strong TypeScript and modern React; WebSocket streaming integration",
    candidateExperience: {
      company: "Ninja Van — TechLab",
      kind: "recommended-approach",
      note: {
        en: "Socket.IO real-time communication at Ninja Van is real context for long-lived event handlers. Describe React hook specifics (useEffectEvent, latest ref) as your recommended approach unless you actually implemented them in that codebase.",
        vi: "Việc làm real-time với Socket.IO ở Ninja Van là bối cảnh thật về event handler sống lâu. Hãy trình bày chi tiết về React hook (useEffectEvent, latest ref) như cách tiếp cận bạn đề xuất, trừ khi bạn thực sự đã triển khai chúng trong codebase đó.",
      },
    },
    tags: ["closures", "react-hooks", "useeffectevent", "websocket", "bugs"],
  },

  /* ---------------------------------------------------------------- */
  /* Q21 — Floating-point precision                                     */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q21",
    number: 21,
    topicId: "js-ts",
    question: {
      en: "How do you handle floating-point precision in a financial frontend? How should prices, quantities and P&L be represented, calculated and formatted?",
      vi: "Bạn xử lý vấn đề độ chính xác số thực (floating-point) trong frontend tài chính thế nào? Nên biểu diễn, tính toán và hiển thị giá, khối lượng và P&L ra sao?",
    },
    answer: `JavaScript numbers are IEEE 754 doubles, so 0.1 plus 0.2 isn't exactly 0.3, and integers are only exact up to 2 to the 53rd minus one. In a trading UI that's not academic: a P&L that rounds the wrong way is a support ticket, and in a regulated product it's a trust problem.

I follow three rules. One: the backend is the source of truth for money. I ask the Rust or Python services to send prices, quantities and amounts as decimal strings, and large IDs as strings too, because JSON.parse silently loses precision past 2 to the 53rd.

Two: when the client must calculate, like unrealized P&L or order notional before submit, I convert to integers in minor units using the instrument's scale. That means BigInt or scaled integers, or a decimal library like big.js for division-heavy math. The rounding mode, half-even or half-up, must match the backend exactly, or the two numbers will disagree by a cent.

Three: formatting is separate from storage. I format with Intl.NumberFormat, using fraction digits derived from the instrument's tick size, at the very last step.

The trade-off is performance. Decimal objects allocate memory, so for hot paths like chart coordinates I use plain numbers, because a pixel doesn't need cent accuracy. Anything a trader reads as a value goes through the exact path.`,
    viExplanation: `Number trong JavaScript là số thực IEEE 754 double, nên 0.1 + 0.2 không đúng bằng 0.3, và số nguyên chỉ chính xác đến 2^53 - 1. Với ứng dụng giao dịch, sai số làm tròn ở P&L là vấn đề niềm tin, không chỉ là lỗi hiển thị.

Ba nguyên tắc cần nhớ: (1) Backend là nguồn sự thật cho tiền: yêu cầu service Rust/Python trả giá, khối lượng, số tiền dưới dạng decimal string, và ID lớn cũng là string, vì JSON.parse làm mất độ chính xác với số lớn hơn 2^53. (2) Khi client buộc phải tính (P&L tạm tính, notional trước khi đặt lệnh), hãy chuyển sang số nguyên theo đơn vị nhỏ nhất (minor units) dựa trên scale của instrument, dùng BigInt hoặc thư viện decimal như big.js. Rounding mode (half-even hay half-up) phải khớp với backend. (3) Tách việc lưu trữ khỏi việc hiển thị: format bằng Intl.NumberFormat với số chữ số thập phân suy ra từ tick size, ở bước cuối cùng.

Trade-off: thư viện decimal tạo nhiều object nên chậm hơn. Với hot path như toạ độ vẽ chart, dùng number bình thường là đủ; còn giá trị người dùng đọc như con số tài chính thì phải đi qua đường tính chính xác.`,
    technicalExplanation: `### What goes wrong with doubles
- \`Number\` is a 64-bit IEEE 754 double: 53 bits of mantissa, so most decimal fractions (0.1, 0.2) cannot be represented exactly.
- \`(101.4 - 101.25) * 0.3\` evaluates to \`0.045000000000001705\`, not \`0.045\`. Rounding that to cents can flip the result.
- \`(1.005).toFixed(2)\` returns \`"1.00"\` because 1.005 is stored as 1.00499999...
- Integers are exact only up to \`Number.MAX_SAFE_INTEGER\` (2^53 - 1, about 9 x 10^15). 64-bit order IDs or 18-decimal crypto quantities exceed that, and \`JSON.parse\` rounds them silently.
- Summing many floats accumulates drift; order of summation changes the result.

### Representation options
| Option | Good for | Cost |
| --- | --- | --- |
| Decimal **string** from API | transport, display | must convert before math |
| **Scaled integer** (number) | prices within 2^53 at fixed scale | must track scale per instrument |
| **BigInt** minor units | exact add/sub/mul at any size | no fractions, division needs explicit rounding; slower than number |
| **Decimal library** (big.js, decimal.js) | division, percentages, configurable rounding | object allocation, bundle size |

### Rules I apply
- **Contract first:** agree with backend teams that money fields are strings with a known scale per instrument (tick size, lot size). In Python that means \`Decimal\` (Pydantic v2 serializes it as a JSON string); in Rust a decimal crate or integer minor units.
- **Rounding is a business rule:** choose half-even vs half-up explicitly and match the server. \`Intl.NumberFormat\` supports a \`roundingMode\` option and accepts exact decimal strings in modern engines.
- **Validate tick size on input:** an order price must be a multiple of the tick; compare in integer units, not with \`%\` on floats.
- **Display last:** format with \`Intl.NumberFormat\` per locale; never store formatted strings.

### Failure scenarios
- Client and server P&L differ by one cent because of different rounding modes, and users report "wrong numbers".
- An order is rejected because \`price % tick !== 0\` failed on floats (\`0.3 % 0.1\` is not 0).
- Duplicate or mismatched orders because two IDs collapsed into the same double after \`JSON.parse\`.

### Performance
- Decimal libraries allocate per operation; at thousands of ticks per second that adds GC pressure. Keep exact math for values users read or submit, and use plain numbers for pixel geometry (chart y-coordinates, sparklines).
- Do heavy aggregation in a Web Worker; pass strings or scaled integers across.`,
    practicalExample: {
      description: {
        en: "Exact P&L with BigInt minor units: parse decimal strings using the instrument's scale, multiply in integers, then format with Intl.NumberFormat using an explicit half-even rounding mode. The float version rounds the other way.",
        vi: "Tính P&L chính xác bằng BigInt theo minor units: parse decimal string theo scale của instrument, nhân bằng số nguyên, rồi format bằng Intl.NumberFormat với rounding mode half-even rõ ràng. Phiên bản dùng float sẽ làm tròn theo hướng ngược lại.",
      },
      code: {
        language: "ts",
        code: `type Instrument = { symbol: string; priceScale: number; qtyScale: number };

export function toUnits(decimal: string, scale: number): bigint {
  const [int = "0", frac = ""] = decimal.split(".");
  if (frac.length > scale) throw new Error("Too many decimals for scale: " + decimal);
  return BigInt(int + frac.padEnd(scale, "0")); // "101.25" @2 -> 10125n
}

export function fromUnits(units: bigint, scale: number): string {
  const neg = units < 0n;
  const s = (neg ? -units : units).toString().padStart(scale + 1, "0");
  const out = scale === 0 ? s : s.slice(0, -scale) + "." + s.slice(-scale);
  return neg ? "-" + out : out;
}

// Unrealized P&L = (mark - entry) * qty, exact in integer units.
export function unrealizedPnl(entry: string, mark: string, qty: string, inst: Instrument): string {
  const diff = toUnits(mark, inst.priceScale) - toUnits(entry, inst.priceScale);
  const product = diff * toUnits(qty, inst.qtyScale);
  return fromUnits(product, inst.priceScale + inst.qtyScale);
}

const inst: Instrument = { symbol: "DEMO", priceScale: 2, qtyScale: 1 };
const pnl = unrealizedPnl("101.25", "101.40", "0.3", inst); // "0.045" (exact)

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", roundingMode: "halfEven" });
usd.format(pnl as Intl.StringNumericLiteral); // "$0.04": exact decimal string, half-even

// Float path: (101.4 - 101.25) * 0.3 === 0.045000000000001705, which rounds to "$0.05"`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  A["Rust or Python backend - Decimal or minor units"] --> B["JSON - decimal strings, IDs as strings"]
  B --> C["Parse to scaled BigInt or decimal lib"]
  C --> D["Exact math - P&L, notional, tick check"]
  D --> E["Round with mode agreed with backend"]
  E --> F["Intl.NumberFormat per instrument and locale"]
  F --> G["UI value the trader reads"]
  C --> H["Plain number - chart pixels only"]
  H --> I["Canvas or SVG geometry"]`,
      caption: {
        en: "Exact path for values users read or submit; a cheap float path only for drawing.",
        vi: "Đường tính chính xác cho giá trị người dùng đọc hoặc gửi đi; đường float rẻ chỉ dùng để vẽ.",
      },
    },
    memoryShortcut: {
      en: '"Strings in, integers inside, Intl out" — and round like the server does.',
      vi: '"Nhận string, tính bằng số nguyên, hiển thị bằng Intl" — và làm tròn giống hệt server.',
    },
    keyTakeaway: {
      en: "Never do money math in floats: transport decimals as strings, calculate in integer minor units with the backend's rounding rule, and format only at the edge.",
      vi: "Không tính tiền bằng float: truyền decimal dưới dạng string, tính bằng minor units số nguyên theo quy tắc làm tròn của backend, và chỉ format ở bước hiển thị.",
    },
    followUps: [
      {
        id: "isb-q21-f1",
        question: {
          en: "BigInt, a decimal library, or plain numbers: how do you decide, and what about performance?",
          vi: "BigInt, thư viện decimal hay number thường: bạn quyết định thế nào, và còn hiệu năng thì sao?",
        },
        answer: {
          en: "It depends on the operation and how often it runs. For add, subtract and multiply at a fixed scale, like P&L, notional and tick validation, BigInt or scaled integers are exact and have no dependency. When I need division, percentages or configurable rounding, such as average price or return percent, a decimal library like big.js is safer than hand-rolling it. Plain numbers are fine for geometry and for values that never become money, like a chart's y-pixel. Both BigInt and decimal objects are slower than numbers, so I keep them off the per-tick hot path and compute at display time for visible rows only.",
          vi: "Còn tùy vào phép tính và tần suất chạy. Với cộng, trừ, nhân ở scale cố định, như P&L, notional hay kiểm tra tick, BigInt hoặc số nguyên scale là chính xác và không cần thêm thư viện. Khi cần phép chia, phần trăm hoặc rounding có thể cấu hình, như giá trung bình hay phần trăm lợi nhuận, thư viện decimal như big.js an toàn hơn tự viết. Number thường vẫn ổn cho hình học và cho giá trị không bao giờ trở thành tiền, như toạ độ y khi vẽ chart. Cả BigInt lẫn object decimal đều chậm hơn number, nên tôi không đặt chúng trên hot path của mỗi tick, mà chỉ tính khi hiển thị cho các dòng đang thấy trên màn hình.",
        },
      },
      {
        id: "isb-q21-f2",
        question: {
          en: "The backend sends order IDs as 64-bit integers in JSON. What's the problem and how do you fix it?",
          vi: "Backend trả order ID dạng số nguyên 64-bit trong JSON. Vấn đề là gì và sửa thế nào?",
        },
        answer: {
          en: "JSON.parse turns every number into a double, so any ID above 2 to the 53rd gets silently rounded. Two different orders can end up with the same ID in the client, and cancel requests can target the wrong order. There are no errors anywhere, so it is very hard to debug. The proper fix is in the contract: serialize 64-bit IDs as strings, which is common practice for Snowflake-style IDs. If I can't change the API right away, I'd use a JSON parser that supports BigInt, or the reviver context.source feature where the browser supports it. Then I'd add a contract test that fails if an ID comes back as a number.",
          vi: "JSON.parse biến mọi số thành double, nên mọi ID lớn hơn 2^53 đều bị làm tròn mà không báo lỗi. Hai order khác nhau có thể có cùng ID ở phía client, và lệnh cancel có thể nhắm nhầm order. Không có lỗi nào xuất hiện, nên rất khó debug. Cách sửa đúng là sửa ở contract: serialize ID 64-bit thành string, đây là cách làm phổ biến với các ID kiểu Snowflake. Nếu chưa đổi được API ngay, tôi dùng JSON parser hỗ trợ BigInt, hoặc tính năng context.source của reviver ở những trình duyệt hỗ trợ. Sau đó tôi thêm một contract test để test fail nếu ID trả về dạng number.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement: "Fintech UI: financial metrics and market data feeds from Rust/Python backends",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "You have no production trading or financial-calculation experience; NAB work was on the AEM content platform, not money math. Present this as how you would design it, and say you'd align rounding rules with the backend team.",
        vi: "Bạn chưa có kinh nghiệm production về giao dịch hay tính toán tài chính; công việc ở NAB là nền tảng nội dung AEM, không phải tính tiền. Hãy trình bày đây là cách bạn sẽ thiết kế, và nói rằng bạn sẽ thống nhất quy tắc làm tròn với team backend.",
      },
    },
    tags: ["floating-point", "bigint", "decimal", "intl", "fintech"],
  },

  /* ---------------------------------------------------------------- */
  /* Q22 — Discriminated unions for message protocols                   */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q22",
    number: 22,
    topicId: "js-ts",
    question: {
      en: "How would you model a WebSocket message protocol in TypeScript using discriminated unions and exhaustive checks?",
      vi: "Bạn mô hình hoá giao thức message WebSocket trong TypeScript bằng discriminated union và exhaustive check như thế nào?",
    },
    answer: `I'd model every server message as one variant of a union, with a literal type field as the discriminant: snapshot, delta, trade, order update, heartbeat. Each variant has exactly the fields it needs, with no optional fields shared across types.

That gives me three things. First, narrowing: inside a switch on message.type, TypeScript knows that a delta has a side and a price, and that a heartbeat doesn't. Second, exhaustiveness: in the default branch I assign the message to a variable of type never. When someone adds a new variant, say a funding-rate message, every switch that doesn't handle it fails to compile. That's the compiler acting as a checklist. Third, I can derive other types from the union, like a handler map with one handler per type, using a mapped type with Extract.

There's an important trade-off between exhaustiveness and forward compatibility. The compile-time check covers my code, but at runtime the Rust or Python backend may deploy a new message type before the frontend ships. So the runtime default branch logs and ignores unknown types instead of throwing. One unexpected message must never kill the stream.

And types are only a promise. I validate at the socket boundary, then trust the union inside. Ideally the union is generated from a shared schema, such as JSON Schema, AsyncAPI or protobuf, so frontend and backend can't drift apart.`,
    viExplanation: `Mỗi message từ server là một nhánh (variant) của union, phân biệt bằng trường type có giá trị literal: snapshot, delta, trade, orderUpdate, heartbeat. Mỗi variant chỉ có đúng các field cần thiết, không dùng một object lớn với hàng loạt field optional.

Lợi ích: (1) Narrowing: trong switch theo message.type, TypeScript biết delta có side và price, còn heartbeat thì không. (2) Exhaustive check: ở nhánh default, gán message vào biến kiểu never. Khi ai đó thêm variant mới, mọi switch chưa xử lý sẽ báo lỗi compile; compiler trở thành checklist. (3) Có thể suy ra type khác từ union, ví dụ handler map dùng mapped type và Extract.

Điểm senior cần nói: exhaustive ở compile-time khác với forward compatibility ở runtime. Backend Rust/Python có thể deploy message type mới trước khi frontend cập nhật, nên nhánh default ở runtime chỉ log và bỏ qua, không throw làm sập cả stream. Type chỉ là "lời hứa": vẫn phải validate ở biên (socket boundary), và tốt nhất là generate type từ schema chung (JSON Schema, AsyncAPI, protobuf) để frontend và backend không lệch nhau.`,
    technicalExplanation: `### How narrowing works
- A **discriminated union** is a union of object types that share a property with **literal** types (\`type: "trade"\`).
- Checking \`msg.type === "trade"\` (or a \`switch\`) narrows \`msg\` to that variant; the other fields become available without casts.
- In the \`default\` branch, the remaining type is \`never\` if all cases are handled. Assigning to \`const _x: never = msg\` turns a missing case into a compile error.

### Patterns that scale
- **Derived types:** \`ServerMessage["type"]\` gives the tag union; \`Extract<ServerMessage, { type: "delta" }>\` picks one variant.
- **Handler maps:** \`{ [K in ServerMessage["type"]]: (m: Extract<ServerMessage, { type: K }>) => void }\` forces one handler per type. Calling \`handlers[msg.type](msg)\` needs a small cast or generic helper because TypeScript cannot correlate the key and the argument (the "correlated union" limitation).
- **Nested unions:** an \`orderUpdate\` can carry its own \`status\` union (\`"new" | "partiallyFilled" | "filled" | "cancelled" | "rejected"\`) so UI state machines are exhaustive too.
- **Client-to-server messages** get their own union (\`subscribe\`, \`unsubscribe\`, \`ping\`), so you can't accidentally send a server-only shape.

### Why not alternatives
- **One interface with optional fields** (\`price?: string; side?: Side\`): every consumer needs null checks, and invalid combinations are representable.
- **Class hierarchies with \`instanceof\`:** they don't survive \`JSON.parse\` or \`postMessage\` to a worker; plain data plus a tag does.
- **Enums for the tag:** they work, but string literal unions are erased at compile time, tree-shake to nothing and read naturally in JSON.

### Failure scenarios
- **Throwing on unknown types:** a backend deploys a new variant and every client disconnects. Prefer log, count and ignore; track the metric.
- **Lying casts:** \`JSON.parse(data) as ServerMessage\` gives you narrowing on garbage. Validate at the boundary (see Q23).
- **Drift:** hand-written types diverge from the Rust/Python serializer (e.g. \`snake_case\` vs \`camelCase\`, a renamed field). Generate types from a shared schema and add contract tests.

### Maintainability
- Keep the protocol in one module (\`protocol.ts\`), versioned. Add \`v\` or capability negotiation on connect when breaking changes are unavoidable.
- Exhaustive switches act as a checklist during code review: adding a variant shows every place that needs a decision.`,
    practicalExample: {
      description: {
        en: "A typed server protocol with a compile-time exhaustive router whose runtime default ignores unknown message types instead of crashing the stream.",
        vi: "Một giao thức server có type rõ ràng, với router exhaustive ở compile-time và nhánh default ở runtime bỏ qua message type lạ thay vì làm sập stream.",
      },
      code: {
        language: "ts",
        code: `type Side = "buy" | "sell";
type Level = [price: string, size: string];
type OrderStatus = "new" | "partiallyFilled" | "filled" | "cancelled" | "rejected";

export type ServerMessage =
  | { type: "snapshot"; seq: number; symbol: string; bids: Level[]; asks: Level[] }
  | { type: "delta"; seq: number; symbol: string; side: Side; price: string; size: string }
  | { type: "trade"; seq: number; symbol: string; side: Side; price: string; qty: string }
  | { type: "orderUpdate"; orderId: string; status: OrderStatus; reason?: string }
  | { type: "heartbeat"; ts: number };

export type Handlers = {
  [K in ServerMessage["type"]]: (msg: Extract<ServerMessage, { type: K }>) => void;
};

export function route(msg: ServerMessage, h: Handlers): void {
  switch (msg.type) {
    case "snapshot": return h.snapshot(msg); // narrowed: bids/asks available
    case "delta": return h.delta(msg);
    case "trade": return h.trade(msg);
    case "orderUpdate": return h.orderUpdate(msg);
    case "heartbeat": return h.heartbeat(msg);
    default: {
      const unhandled: never = msg; // compile error if a variant is missing above
      // Runtime: a newer backend may send new types. Log and ignore, never throw.
      console.warn("Unknown message type", (unhandled as { type?: unknown }).type);
    }
  }
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  A["WebSocket frame"] --> B["Parse and validate at boundary"]
  B --> C["ServerMessage union"]
  C --> D{"switch on msg.type"}
  D -->|snapshot| E["Order book store - replace"]
  D -->|delta| F["Order book store - apply level"]
  D -->|trade| G["Trade tape buffer"]
  D -->|orderUpdate| H["Order blotter state machine"]
  D -->|heartbeat| I["Connection health"]
  D -->|"unknown at runtime"| J["Log metric and ignore"]`,
      caption: {
        en: "One validated union, one exhaustive router; unknown runtime types are counted and ignored rather than crashing the stream.",
        vi: "Một union đã validate, một router exhaustive; type lạ ở runtime được đếm và bỏ qua thay vì làm sập stream.",
      },
    },
    memoryShortcut: {
      en: '"Tag, Narrow, Never, Ignore": tag every message, narrow by switch, never at compile time, ignore unknowns at runtime.',
      vi: '"Tag, Narrow, Never, Ignore": gắn tag cho mọi message, narrow bằng switch, dùng never khi compile, bỏ qua type lạ khi runtime.',
    },
    keyTakeaway: {
      en: "Discriminated unions make the compiler enforce that every message type is handled, while a tolerant runtime default keeps the stream alive when the backend evolves first.",
      vi: "Discriminated union giúp compiler đảm bảo mọi message type đều được xử lý, còn nhánh default dễ dãi ở runtime giữ cho stream sống khi backend thay đổi trước.",
    },
    followUps: [
      {
        id: "isb-q22-f1",
        question: {
          en: "How do you keep these TypeScript types in sync with a Rust or Python backend?",
          vi: "Làm sao để giữ type TypeScript này đồng bộ với backend Rust hoặc Python?",
        },
        answer: {
          en: "Hand-written types will drift, so I'd make a schema the single source of truth and generate both sides from it. For REST, that's OpenAPI. FastAPI produces it from Pydantic models, and tools like openapi-typescript generate TS types. For streaming, I'd use AsyncAPI or JSON Schema, or protobuf if the team wants binary messages. On the Rust side, serde with schema generation, or crates that emit TS types directly. Then I'd add a contract test in CI that fails when generated types change without a matching frontend update. A shared naming convention, like camelCase versus snake_case, should be decided once in the serializer, not patched in every component.",
          vi: "Type viết tay sớm muộn sẽ bị lệch, nên tôi chọn schema làm nguồn sự thật duy nhất và generate cả hai phía từ nó. Với REST là OpenAPI: FastAPI tự sinh OpenAPI từ model Pydantic, và các tool như openapi-typescript sinh ra type TS. Với streaming thì dùng AsyncAPI hoặc JSON Schema, hoặc protobuf nếu team muốn message dạng binary. Ở phía Rust có serde kèm công cụ sinh schema, hoặc các crate xuất thẳng type TS. Sau đó tôi thêm contract test trong CI, để CI fail nếu type được generate thay đổi mà frontend chưa cập nhật theo. Quy ước đặt tên, như camelCase hay snake_case, nên được quyết định một lần trong serializer, thay vì vá ở từng component.",
        },
      },
      {
        id: "isb-q22-f2",
        question: {
          en: "Why a discriminated union instead of one interface with optional fields?",
          vi: "Vì sao dùng discriminated union thay vì một interface với nhiều field optional?",
        },
        answer: {
          en: "Optional fields make invalid states representable. A message could have a price but no side, or a status on a heartbeat, and every consumer has to guess which fields go together. That leads to defensive null checks everywhere and bugs where the checks are missing. A discriminated union encodes the rule that a trade always has price, qty and side, and a heartbeat only has a timestamp. The compiler then removes the guessing. It also documents the protocol: reading the union is reading the spec. The cost is a bit more type code up front, which is cheap compared to debugging a malformed message at runtime.",
          vi: "Field optional cho phép biểu diễn những trạng thái không hợp lệ. Một message có thể có price mà thiếu side, hoặc heartbeat lại có status, và mọi chỗ sử dụng phải tự đoán field nào đi cùng nhau. Kết quả là code null check phòng thủ ở khắp nơi, và bug ở những chỗ quên check. Discriminated union mã hóa luôn quy tắc: trade luôn có price, qty và side, còn heartbeat chỉ có timestamp. Khi đó compiler loại bỏ việc phải đoán. Union cũng là tài liệu cho protocol: đọc union là đọc spec. Cái giá là viết thêm một chút code type ngay từ đầu, rất rẻ so với việc debug một message sai định dạng ở runtime.",
        },
      },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "Strong TypeScript mastery; integrate WebSockets/SSE with Rust/Python backends",
    candidateExperience: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "You used TypeScript with GraphQL in production at Persefoni, so typed API data is real experience. The WebSocket trading protocol here is an illustrative design: don't claim you built one. Mention GraphQL __typename narrowing only if you actually used it.",
        vi: "Bạn đã dùng TypeScript với GraphQL trong production ở Persefoni, nên làm việc với dữ liệu API có type là kinh nghiệm thật. Giao thức WebSocket giao dịch ở đây chỉ là thiết kế minh hoạ: đừng nói rằng bạn đã xây dựng nó. Chỉ nhắc đến narrowing bằng __typename của GraphQL nếu bạn thực sự đã dùng.",
      },
    },
    tags: ["typescript", "discriminated-unions", "websocket", "protocol", "type-safety"],
  },

  /* ---------------------------------------------------------------- */
  /* Q23 — Runtime validation vs compile-time types                     */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q23",
    number: 23,
    topicId: "js-ts",
    question: {
      en: "TypeScript types vanish at runtime. How do you validate untrusted data (for example with Zod), and how do you validate a high-frequency stream without killing performance?",
      vi: "Type của TypeScript biến mất ở runtime. Bạn validate dữ liệu không tin cậy (ví dụ bằng Zod) thế nào, và làm sao validate một stream tần suất cao mà không làm giảm hiệu năng?",
    },
    answer: `TypeScript checks my code, not my inputs. Writing JSON.parse of data as Trade is a promise to the compiler, not a check. Anything that crosses a trust boundary needs runtime validation: API responses, WebSocket frames, postMessage from a worker, URL params and localStorage.

My rule is to validate at the boundary and trust inside. I define a Zod schema once and infer the TypeScript type from it, so there's a single source of truth. For REST responses and snapshots I always do a full safeParse. They're low frequency, and a bad snapshot corrupts everything after it.

Streams need more care. At thousands of messages per second, full schema validation on the main thread adds allocation and CPU time on every message. I handle that in a few ways. First, I move parsing and validation into a Web Worker, so the main thread only receives validated, batched data. That's my default. Second, if profiling still shows validation as the bottleneck, I always check a cheap envelope, the type and sequence number, and fully validate a sample, while keeping full validation in development and staging. Third, for the hottest feeds, I'd discuss compiled validators like Ajv from JSON Schema, or a binary protocol where decoding is schema-driven anyway.

Just as important is the failure policy. An invalid message is dropped, counted and reported, never thrown. And if dropping it creates a sequence gap, I trigger a resync from a snapshot.`,
    viExplanation: `TypeScript chỉ kiểm tra code của mình, không kiểm tra dữ liệu đầu vào. Viết JSON.parse(data) as Trade chỉ là "lời hứa" với compiler, không phải là kiểm tra. Mọi thứ đi qua ranh giới tin cậy (trust boundary) như response API, frame WebSocket, postMessage từ worker, URL params hay localStorage đều cần validate ở runtime.

Nguyên tắc: validate ở biên, tin tưởng ở bên trong. Định nghĩa schema Zod một lần và dùng z.infer để suy ra type, như vậy chỉ có một nguồn sự thật. REST response và snapshot luôn được safeParse đầy đủ, vì chúng ít khi đến và một snapshot sai sẽ làm hỏng toàn bộ dữ liệu sau đó.

Với stream tần suất cao: (1) mặc định chuyển parse + validate sang Web Worker, main thread chỉ nhận dữ liệu đã validate theo batch; (2) nếu profiling cho thấy validate vẫn là bottleneck, chỉ check nhanh phần envelope (type, seq) cho mọi message và validate đầy đủ theo mẫu (sampling), còn môi trường dev/staging thì validate 100%; (3) với feed nóng nhất, cân nhắc validator được compile sẵn (Ajv + JSON Schema) hoặc protocol binary. Quan trọng không kém là chính sách khi lỗi: message sai thì drop, đếm metric, báo cáo, không throw; nếu tạo ra gap về sequence thì resync bằng snapshot.`,
    technicalExplanation: `### Compile-time vs runtime
- TypeScript types are erased; \`as\` casts and generic \`fetch<T>()\` helpers add **zero** runtime checks.
- Zod (and similar libraries) describe the shape as a runtime value. \`z.infer<typeof Schema>\` derives the static type from it, so schema and type can't drift.
- \`safeParse\` returns \`{ success, data | error }\` instead of throwing, which makes it a better fit for streams where one bad message must not break the loop.
- Zod object schemas strip unknown keys by default and return a **new** object; that is safer but allocates per message.

### Where to validate
- **Always fully:** REST responses, initial snapshots, auth/session payloads, anything persisted (localStorage, IndexedDB), \`postMessage\` from other origins.
- **Stream deltas:** validate in the worker. Main-thread code receives already-typed batches.
- **User input:** forms validate with the same schema the API uses, and the server validates again; client validation is UX, not security.

### Performance options for hot streams
- **Off main thread:** a dedicated worker does \`JSON.parse\` + validation + conflation; it costs one structured clone per batch, not per message.
- **Envelope + sampling:** check the routing fields (\`type\`, \`seq\`, \`symbol\`) on every message, and fully validate 1 in N in production (100% in dev/staging). The risk is that an unvalidated malformed payload renders as \`NaN\`, so add cheap per-field invariants where a wrong value is dangerous (prices).
- **Compiled validators:** Ajv compiles JSON Schema into plain JS functions; TypeBox gives TS types plus JSON Schema that a Python/Rust backend can share.
- **Lighter libraries:** Valibot is modular and tree-shakes to a smaller bundle; Zod 4 improved parse speed and offers \`zod/mini\` for bundle size.
- **Binary formats:** protobuf/FlatBuffers decode against a schema, so structural validation is part of decoding; semantic checks are still yours.

### Failure policy
- **Never throw out of \`onmessage\`.** Drop, increment a counter, sample the raw payload to logging (redact sensitive fields), and alert if the error rate spikes.
- **Gaps:** if a dropped delta breaks the sequence, mark the book stale and request a snapshot (snapshot + delta recovery).
- **Version skew:** unknown \`type\` values are expected during rolling deploys; treat them as "ignore", not "invalid".

### Maintainability
- Co-locate schemas with the protocol module; generate them from the backend's JSON Schema/OpenAPI where possible.
- Unit-test schemas with real captured payloads, including edge cases (negative prices for spreads, empty books).`,
    practicalExample: {
      description: {
        en: "A trade decoder meant to run inside a Web Worker. It checks the envelope on every message and fully validates with Zod on a sampling ratio (1 = always, which is the default and what dev/staging use). It reports failures instead of throwing.",
        vi: "Một decoder cho message trade, chạy trong Web Worker. Nó kiểm tra envelope cho mọi message và validate đầy đủ bằng Zod theo tỉ lệ sampling (1 = luôn luôn, là mặc định và dùng cho dev/staging). Khi lỗi, nó báo cáo thay vì throw.",
      },
      code: {
        language: "ts",
        code: `import { z } from "zod";

const Decimal = z.string().regex(/^-?\\d+(\\.\\d+)?$/);

export const TradeMsg = z.object({
  type: z.literal("trade"),
  seq: z.number().int().nonnegative(),
  symbol: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  price: Decimal,
  qty: Decimal,
});
export type TradeMsg = z.infer<typeof TradeMsg>; // type derived from the schema

const Envelope = z.looseObject({ type: z.literal("trade"), seq: z.number().int() });

type Options = { sampleEvery?: number; onInvalid: (reason: unknown, raw: string) => void };

export function makeTradeDecoder({ sampleEvery = 1, onInvalid }: Options) {
  let n = 0;
  return (raw: string): TradeMsg | null => {
    let data: unknown;
    try { data = JSON.parse(raw); } catch (err) { onInvalid(err, raw); return null; }

    const env = Envelope.safeParse(data); // cheap routing check on every message
    if (!env.success) { onInvalid(env.error, raw); return null; }

    if (++n % sampleEvery === 0) {
      const full = TradeMsg.safeParse(data); // full check (always when sampleEvery = 1)
      if (!full.success) { onInvalid(full.error, raw); return null; }
      return full.data;
    }
    return data as TradeMsg; // explicit, measured trade-off: envelope-only on this message
  };
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  A["WebSocket frame"] --> B["Web Worker - JSON.parse"]
  B --> C{"Envelope valid? type, seq"}
  C -->|No| X["Drop, count metric, report"]
  C -->|Yes| D{"Full check for this message?"}
  D -->|Yes| E["Zod safeParse"]
  D -->|"No - sampled out"| F["Cheap invariants"]
  E -->|Invalid| X
  E -->|Valid| G["Conflate and batch"]
  F --> G
  G --> H["postMessage batch to main thread"]
  X --> Y{"Sequence gap?"}
  Y -->|Yes| Z["Mark stale and request snapshot"]`,
      caption: {
        en: "Validation lives in the worker at the trust boundary; failures are dropped and counted, and a gap triggers a snapshot resync.",
        vi: "Việc validate nằm trong worker ở trust boundary; message lỗi bị drop và đếm, còn gap về sequence sẽ kích hoạt resync bằng snapshot.",
      },
    },
    memoryShortcut: {
      en: '"Types are promises, schemas are proof" — validate at the edge, in the worker, drop don\'t throw.',
      vi: '"Type là lời hứa, schema là bằng chứng" — validate ở biên, trong worker, drop chứ không throw.',
    },
    keyTakeaway: {
      en: "Derive types from runtime schemas, validate every trust boundary, and keep stream validation off the main thread with a drop-count-resync failure policy.",
      vi: "Suy ra type từ schema runtime, validate ở mọi trust boundary, và đưa việc validate stream ra khỏi main thread với chính sách drop, đếm và resync khi lỗi.",
    },
    followUps: [
      {
        id: "isb-q23-f1",
        question: {
          en: "Zod, Valibot, or TypeBox with Ajv: how would you choose?",
          vi: "Zod, Valibot hay TypeBox với Ajv: bạn chọn thế nào?",
        },
        answer: {
          en: "I'd choose based on where the schema comes from and where it runs. If the frontend owns the schema and developer experience matters most, Zod is the default: a great API, inferred types, and wide ecosystem support for forms and tRPC-style tools. If bundle size matters, for example on a public customer portal, Valibot or zod/mini tree-shake better. If the backend already publishes JSON Schema, from Pydantic or a Rust crate, then TypeBox plus Ajv lets both sides share one schema, and Ajv's compiled validators are very fast for hot paths. I'd benchmark with real payloads before switching, not rely on library marketing.",
          vi: "Tôi chọn dựa trên việc schema đến từ đâu và chạy ở đâu. Nếu frontend sở hữu schema và trải nghiệm developer là quan trọng nhất, Zod là lựa chọn mặc định: API tốt, suy ra được type, và có hệ sinh thái rộng cho form và các tool kiểu tRPC. Nếu kích thước bundle quan trọng, ví dụ cho portal khách hàng công khai, Valibot hoặc zod/mini tree-shake tốt hơn. Nếu backend đã xuất JSON Schema, từ Pydantic hoặc một crate Rust, thì TypeBox kết hợp Ajv cho phép hai bên dùng chung một schema, và validator được compile của Ajv rất nhanh cho hot path. Tôi sẽ benchmark với payload thật trước khi đổi, thay vì tin vào quảng cáo của thư viện.",
        },
      },
      {
        id: "isb-q23-f2",
        question: {
          en: "Validation starts failing in production for 5% of messages after a backend deploy. What do you do?",
          vi: "Sau một lần deploy backend, 5% message bắt đầu validate lỗi trên production. Bạn làm gì?",
        },
        answer: {
          en: "First, the UI must stay up. Because the policy is drop and count, users just see slightly less data, and any affected book that hit a gap resyncs from a snapshot. Second, I use the sampled, redacted raw payloads and the Zod error paths in our error tracker to see exactly which field changed. Typical causes are a number that became a string, a renamed field, or a new enum value. Third, I decide with the backend team whether to roll back or relax the schema, for example by accepting the new enum value. Afterwards I'd add a contract test to CI, so schema changes break the build instead of production.",
          vi: "Trước hết, UI phải tiếp tục chạy. Vì chính sách là drop và đếm, người dùng chỉ thấy ít dữ liệu hơn một chút, và order book nào bị gap sẽ resync bằng snapshot. Tiếp theo, tôi xem các raw payload được lấy mẫu (đã che dữ liệu nhạy cảm) và error path của Zod trong error tracker để biết chính xác field nào thay đổi. Nguyên nhân thường gặp là một số bị đổi thành string, một field bị đổi tên, hoặc enum có giá trị mới. Sau đó, tôi cùng team backend quyết định rollback hay nới lỏng schema, ví dụ chấp nhận giá trị enum mới. Cuối cùng, tôi thêm contract test vào CI, để thay đổi schema làm hỏng build chứ không làm hỏng production.",
        },
      },
    ],
    difficulty: "hard",
    priority: "medium",
    jdRequirement: "Integrate REST/WebSocket/SSE from Rust/Python backends; performance for high-frequency data",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "Zod isn't part of your proven production stack, so present this as your recommended approach. You can honestly say that REST and GraphQL integration at Ninja Van and Persefoni is where you dealt with external API data.",
        vi: "Zod không nằm trong stack bạn đã dùng thực tế ở production, nên hãy trình bày đây là cách tiếp cận bạn đề xuất. Bạn có thể nói thật rằng tích hợp REST và GraphQL ở Ninja Van và Persefoni là nơi bạn đã làm việc với dữ liệu API bên ngoài.",
      },
    },
    tags: ["zod", "validation", "typescript", "web-workers", "streaming"],
  },

  /* ---------------------------------------------------------------- */
  /* Q24 — Advanced TypeScript                                          */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q24",
    number: 24,
    topicId: "js-ts",
    question: {
      en: "Show how you use generics, conditional types and mapped types to build a type-safe event emitter or API client. Where do you draw the line on type-level complexity?",
      vi: "Hãy cho thấy cách bạn dùng generics, conditional type và mapped type để xây dựng một event emitter hoặc API client an toàn về type. Bạn đặt giới hạn độ phức tạp ở mức type đến đâu?",
    },
    answer: `I'd use three tools, each for a specific job.

Generics preserve relationships. In an event emitter, on takes a key K that extends keyof Events, and the listener receives Events of K. So if I subscribe to 'tick', the payload is a tick, and emitting the wrong payload is a compile error. No casts, and autocomplete on event names.

Mapped types transform a shape. For an API client, I describe routes once in a type, as a map from route to params and response, and a mapped type over its keys generates the client's method signatures. With key remapping and template literal types I can even derive names like onTick from the event map.

Conditional types with infer extract information, for example pulling the response type out of a route definition, or the payload type out of a message union.

Where I draw the line: type-level code is still code that teammates must read and debug, and it costs compile time. So I keep the clever types inside one small, well-tested module. I write type tests with Vitest's expectTypeOf to lock the behaviour, and consumers only see simple signatures. If a type needs more than one screen to understand, I simplify it or generate it. For API clients specifically, I'd prefer generating types from the backend's OpenAPI over hand-crafting them, because the generated types match the backend by construction.`,
    viExplanation: `Ba công cụ, mỗi cái một nhiệm vụ:

Generics giữ mối quan hệ giữa input và output. Với event emitter, on<K extends keyof Events>(event: K, fn: (p: Events[K]) => void): đăng ký "tick" thì payload chắc chắn là tick; emit sai payload sẽ lỗi compile. Không cần cast, có autocomplete cho tên event.

Mapped type biến đổi một shape. Với API client, khai báo routes một lần (route → params và response), rồi mapped type trên các key sẽ sinh ra signature cho từng method. Kết hợp key remapping (as) và template literal type có thể suy ra tên như onTick từ event map.

Conditional type với infer dùng để "trích xuất" type, ví dụ lấy response type từ định nghĩa route.

Điểm senior: code ở mức type vẫn là code mà đồng nghiệp phải đọc và debug, và nó tốn thời gian compile. Vì vậy hãy gói các type phức tạp vào một module nhỏ, viết type test (expectTypeOf của Vitest) để khoá hành vi, còn người dùng chỉ thấy signature đơn giản. Nếu một type cần hơn một màn hình để hiểu thì nên đơn giản hoá hoặc generate. Với API client, ưu tiên generate type từ OpenAPI của backend hơn là tự viết tay.`,
    technicalExplanation: `### Generics: keeping relationships
- \`on<K extends keyof Events>(event: K, fn: (p: Events[K]) => void)\` ties the key and the payload together. TypeScript infers \`K\` from the string literal at the call site.
- Constraints (\`extends\`) document intent and give better error messages than unconstrained \`T\`.
- Returning an unsubscribe function from \`on\` makes cleanup part of the type contract, which helps prevent listener leaks in long-running dashboards.

### Mapped types: transforming shapes
- \`{ [K in keyof Routes]: (params: Routes[K]["params"]) => Promise<ResponseOf<Routes[K]>> }\` generates one method per route.
- **Key remapping** with \`as\` plus a **template literal type** as the new key (\`on\${Capitalize<K>}\`) turns an event map key \`tick\` into a prop name \`onTick\`.
- Modifiers: \`-?\` and \`readonly\` let you derive "required" or "immutable" variants without duplicating interfaces.

### Conditional types: extracting and branching
- \`ResponseOf<R> = R extends { response: infer T } ? T : never\` pulls a type out of a structure.
- **Distributive behaviour:** a conditional on a naked type parameter distributes over unions. \`Extract<Msg, { type: "trade" }>\` relies on this. Wrap in \`[T] extends [U]\` to turn it off when you need to treat the union as a whole.
- \`never\` disappears from unions, which is how filtering types (\`Exclude\`, \`Extract\`) work.

### Trade-offs and failure scenarios
- **Readability:** deeply nested conditionals produce error messages that nobody can act on. Hide them behind named aliases and keep public signatures simple.
- **Compile time:** recursive types and large unions (thousands of members) slow \`tsc\` and the editor. Use \`tsc --extendedDiagnostics\` or \`--generateTrace\` to find hot spots.
- **False safety:** perfect types over unvalidated runtime data are still wrong at runtime. Pair typed clients with runtime validation at the boundary.
- **Index signatures:** constraints like \`Record<string, unknown>\` accept type aliases but not interfaces without an index signature, which is a common surprise for consumers.

### Maintainability
- Put type utilities in one module with **type tests** (\`expectTypeOf\` in Vitest, or \`// @ts-expect-error\` lines that must keep failing).
- Prefer generated types (OpenAPI, JSON Schema, protobuf) for anything owned by the backend; reserve hand-written type-level code for frontend-owned abstractions like the event bus.
- Review rule: if a type needs a long comment to explain, the abstraction is probably in the wrong place.`,
    practicalExample: {
      description: {
        en: "A typed event emitter (generics + mapped types) and a typed API client derived from a route map (conditional types with infer). Wrong event names, payloads or params fail at compile time.",
        vi: "Một event emitter có type (generics + mapped type) và một API client được suy ra từ route map (conditional type với infer). Sai tên event, payload hoặc params sẽ lỗi ngay khi compile.",
      },
      code: {
        language: "ts",
        code: `type Listener<T> = (payload: T) => void;

export class TypedEmitter<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    const set = this.listeners.get(event) ?? new Set<Listener<never>>();
    this.listeners.set(event, set);
    set.add(fn as Listener<never>);
    return () => { set.delete(fn as Listener<never>); }; // unsubscribe is part of the contract
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners.get(event)?.forEach((fn) => (fn as Listener<Events[K]>)(payload));
  }
}

type MarketEvents = { tick: { symbol: string; price: string }; status: "open" | "reconnecting" | "closed" };
const bus = new TypedEmitter<MarketEvents>();
bus.on("tick", (t) => console.log(t.symbol)); // t inferred as the tick payload
// bus.emit("status", "down"); // compile error: not assignable

// Typed API client from a route map
type Position = { symbol: string; qty: string };
type Routes = {
  getPositions: { params: { accountId: string }; response: Position[] };
  placeOrder: { params: { symbol: string; side: "buy" | "sell"; qty: string }; response: { orderId: string } };
};
type ResponseOf<R> = R extends { response: infer T } ? T : never;
export type ApiClient = { [K in keyof Routes]: (params: Routes[K]["params"]) => Promise<ResponseOf<Routes[K]>> };
export type EventProps<E> = { [K in keyof E & string as \`on\${Capitalize<K>}\`]?: (payload: E[K]) => void };
// EventProps<MarketEvents> -> { onTick?: ...; onStatus?: ... }`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  A["Routes type map - single source"] --> B["keyof Routes - route names"]
  B --> C["Mapped type over each key"]
  A --> D["Conditional type with infer - ResponseOf"]
  C --> E["ApiClient method signatures"]
  D --> E
  E --> F["Call site - autocomplete and compile errors"]
  G["Backend OpenAPI"] -.->|"generate instead when backend-owned"| A
  H["Type tests - expectTypeOf"] -.->|"lock behaviour"| E`,
      caption: {
        en: "One route map drives the whole client type: keys via a mapped type, responses via infer. Generate the map from OpenAPI when the backend owns it.",
        vi: "Một route map quyết định toàn bộ type của client: key qua mapped type, response qua infer. Generate map từ OpenAPI khi backend là bên sở hữu.",
      },
    },
    memoryShortcut: {
      en: '"G-M-C": Generics relate, Mapped types transform, Conditional types extract. And keep it under one screen.',
      vi: '"G-M-C": Generics liên kết, Mapped type biến đổi, Conditional type trích xuất. Và giữ mỗi type gọn trong một màn hình.',
    },
    keyTakeaway: {
      en: "Use generics, mapped and conditional types to make wrong calls unrepresentable, but hide the complexity behind simple, type-tested public signatures.",
      vi: "Dùng generics, mapped type và conditional type để những lời gọi sai không thể viết ra được, nhưng giấu độ phức tạp sau các signature công khai đơn giản và có type test.",
    },
    followUps: [
      {
        id: "isb-q24-f1",
        question: {
          en: "What is a distributive conditional type, and when does it surprise you?",
          vi: "Distributive conditional type là gì, và khi nào nó gây bất ngờ?",
        },
        answer: {
          en: "When a conditional type checks a naked type parameter, like T extends U ? X : Y, and T is a union, TypeScript applies the condition to each member separately and unions the results. That's why Extract and Exclude work. It surprises you when you want to check the union as a whole. For example, an IsString helper given string or number returns boolean instead of false. And never input returns never, because an empty union has nothing to distribute over. The fix is to wrap both sides in a tuple, as in [T] extends [string], which turns distribution off. I'd write a type test for that case so a later refactor can't silently change it.",
          vi: "Khi conditional type kiểm tra một type parameter đứng trần, như T extends U ? X : Y, và T là một union, TypeScript áp dụng điều kiện lên từng thành viên riêng lẻ rồi hợp các kết quả lại. Đó là lý do Extract và Exclude hoạt động được. Nó gây bất ngờ khi ta muốn kiểm tra cả union như một khối. Ví dụ, helper IsString nhận string hoặc number lại trả về boolean thay vì false. Còn input never thì trả về never, vì union rỗng thì không có gì để phân phối. Cách sửa là bọc cả hai vế trong tuple, như [T] extends [string], để tắt cơ chế phân phối. Tôi sẽ viết type test cho trường hợp đó, để lần refactor sau không thể âm thầm làm thay đổi hành vi.",
        },
      },
      {
        id: "isb-q24-f2",
        question: {
          en: "How do you test types and keep compile times reasonable in a large monorepo?",
          vi: "Bạn test type và giữ thời gian compile hợp lý trong một monorepo lớn như thế nào?",
        },
        answer: {
          en: "For testing, I use Vitest's expectTypeOf, or ts-expect-error lines that must keep failing, next to the utility types. That way a refactor that loosens a type breaks CI. For compile time, I'd use project references or per-package tsc, so each package type-checks against built declarations instead of re-checking everything. Turborepo can then cache the typecheck task per package. When something is slow, tsc with extendedDiagnostics and generateTrace shows which types are expensive. Usually the cause is a huge union or a recursive conditional, and I'd simplify it. Explicit return types on exported functions also help, because the compiler doesn't need to re-infer them in every consumer.",
          vi: "Để test, tôi dùng expectTypeOf của Vitest, hoặc các dòng ts-expect-error phải luôn báo lỗi, đặt ngay cạnh các utility type. Như vậy, nếu refactor làm type bị nới lỏng thì CI sẽ fail. Về thời gian compile, tôi dùng project references hoặc chạy tsc theo từng package, để mỗi package type-check dựa trên declaration đã build thay vì kiểm tra lại toàn bộ. Khi đó Turborepo có thể cache task typecheck cho từng package. Khi có chỗ chậm, tsc với extendedDiagnostics và generateTrace cho biết type nào tốn kém. Thường nguyên nhân là một union quá lớn hoặc một conditional type đệ quy, và tôi sẽ đơn giản hoá nó. Khai báo return type rõ ràng cho các hàm được export cũng giúp ích, vì compiler không phải suy luận lại ở mọi nơi sử dụng.",
        },
      },
    ],
    difficulty: "hard",
    priority: "medium",
    jdRequirement: "Strong mastery of TypeScript; modular, reusable component libraries",
    candidateExperience: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "Production TypeScript in a Vite + Turborepo monorepo at Persefoni is real experience. The emitter and client here are illustrative: say you'd apply these patterns, not that you shipped this exact library.",
        vi: "TypeScript production trong monorepo Vite + Turborepo ở Persefoni là kinh nghiệm thật. Emitter và client ở đây chỉ để minh hoạ: hãy nói bạn sẽ áp dụng các pattern này, không nói rằng bạn đã ship đúng thư viện này.",
      },
    },
    tags: ["typescript", "generics", "mapped-types", "conditional-types", "api-client"],
  },

  /* ---------------------------------------------------------------- */
  /* Q25 — Immutability and structural sharing                          */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q25",
    number: 25,
    topicId: "js-ts",
    question: {
      en: "Why do React and state libraries rely on immutability? Explain structural sharing and the real cost of updating large nested state at high frequency.",
      vi: "Vì sao React và các thư viện state dựa vào immutability? Hãy giải thích structural sharing và chi phí thực sự khi cập nhật state lồng nhau lớn với tần suất cao.",
    },
    answer: `React, Zustand selectors and memo all detect change by reference: Object.is on the old and new value. Immutability makes that check cheap and reliable. If I mutate an object in place, the reference doesn't change and the UI silently doesn't update. If I replace everything, every component thinks something changed and re-renders.

Structural sharing is the middle ground. When one order changes, I copy only the path from the root to that order. Every other branch keeps its old reference. So a memoized row for an untouched order skips rendering, and a selector for another symbol returns the same object. TanStack Query does the same thing automatically when it refetches: replaceEqualDeep keeps references for unchanged parts of the response, which avoids re-renders when the server sends identical data.

The cost is real at high frequency. If I store a hundred thousand orders in one flat object and spread it on every message, each update is an O(n) copy, plus garbage-collection pressure, which shows up as jank. So I do three things. I normalize and shard state, for example by symbol, so a copy touches one small shard. I batch messages and apply them once per frame, so I copy once per frame instead of once per message. And for truly hot data like tick buffers, I keep a mutable structure outside React with a version counter, and expose it through useSyncExternalStore.

I'd also avoid Immer on the hot path. It's great for ergonomics, but proxies add overhead per update.`,
    viExplanation: `React, selector của Zustand và memo đều phát hiện thay đổi bằng so sánh tham chiếu (Object.is). Immutability giúp phép so sánh này rẻ và đáng tin. Nếu mutate trực tiếp, tham chiếu không đổi nên UI không cập nhật. Nếu thay mới toàn bộ, mọi component đều tưởng có thay đổi và re-render.

Structural sharing là cách ở giữa: khi một order thay đổi, chỉ copy đường đi từ root đến order đó; các nhánh khác giữ nguyên tham chiếu cũ. Nhờ vậy row đã memo của order không đổi sẽ bỏ qua render, và selector của symbol khác trả về đúng object cũ. TanStack Query cũng tự làm điều này khi refetch (replaceEqualDeep), nên dữ liệu giống hệt từ server không gây re-render.

Chi phí khi tần suất cao: nếu lưu 100k order trong một object phẳng và spread nó ở mỗi message, mỗi lần cập nhật là một lần copy O(n), cộng thêm áp lực lên GC, và đó chính là nguồn gây giật lag (jank). Giải pháp: (1) normalize và chia shard theo symbol để mỗi lần copy chỉ đụng đến một shard nhỏ; (2) gom message theo batch, áp dụng mỗi frame một lần; (3) với dữ liệu cực nóng như tick buffer, dùng cấu trúc mutable bên ngoài React kèm version counter, rồi expose qua useSyncExternalStore. Tránh dùng Immer trên hot path vì proxy có overhead cho mỗi lần cập nhật.`,
    technicalExplanation: `### Why reference equality
- React bails out of re-rendering when \`Object.is(prev, next)\` for state, and \`React.memo\` compares props shallowly. Zustand and Redux \`useSelector\` re-render only when the selected value's reference changes.
- Deep equality on every update would be O(size of state); reference checks are O(1). Immutability is the contract that makes O(1) checks correct.
- Mutation breaks the contract: \`state.orders[id].status = "filled"\` keeps the same reference, so selectors and memoized rows never see the change.

### Structural sharing
- An update copies only the **path** from root to the changed leaf; siblings are reused by reference.
- Cost per update is O(depth x width of copied nodes), not O(total state). This is why the **width** of each copied object matters: spreading a 100k-key object copies 100k keys.
- TanStack Query applies structural sharing to query results (\`replaceEqualDeep\`): unchanged sub-trees keep their identity after a refetch. For very large payloads you can disable it with \`structuralSharing: false\`, because the deep comparison itself costs CPU.

### Costs at high frequency
- **Allocation and GC:** each copied object is garbage after the next update. Thousands of updates per second create steady minor-GC pauses that show up as dropped frames.
- **Wide objects:** \`{ ...orders, [id]: o }\` on a flat map with N orders is O(N) per message.
- **Immer:** proxy-based drafts make updates readable, but add per-update overhead, and auto-freeze (deep \`Object.freeze\`) adds more. Fine for forms and settings, questionable on a tick path.
- **Selectors that create new objects** (\`state => ({ a: state.a, b: state.b })\`) break sharing unless you use a shallow-equality selector (\`useShallow\` in Zustand).

### Strategies that scale
- **Normalize and shard:** \`bySymbol -> byId\`. A change copies one shard, so rows for other symbols keep their references.
- **Batch per frame:** apply 500 deltas as one copy per frame, not 500 copies.
- **Mutable core, immutable edge:** keep ring buffers, order book arrays or chart series as mutable typed arrays in a data layer; publish a \`version\` number; components subscribe via \`useSyncExternalStore\` and read a snapshot. Canvas charts read the buffer directly.
- **Persistent data structures** (HAMT-based maps) give O(log n) updates on huge maps, at the cost of a dependency and slower reads.

### Failure scenarios
- An in-place mutation, often inside a library callback, leads to a "UI doesn't update until I hover" bug.
- A fresh object on every tick at the root causes the whole dashboard to re-render 60 times per second.
- Unbounded history kept "for undo" in immutable snapshots becomes a memory leak.`,
    practicalExample: {
      description: {
        en: "Applying a frame's worth of order updates with path copying: the shard index is copied once, each touched symbol shard is copied once per batch, and untouched shards and orders keep their references so memoized rows skip rendering.",
        vi: "Áp dụng các cập nhật order của một frame bằng path copying: shard index chỉ copy một lần, mỗi shard symbol bị ảnh hưởng chỉ copy một lần cho mỗi batch, còn shard và order không đổi giữ nguyên tham chiếu, nhờ đó các row đã memo bỏ qua render.",
      },
      code: {
        language: "ts",
        code: `type Order = { id: string; symbol: string; status: string; filledQty: string };
type OrdersState = { bySymbol: Record<string, Record<string, Order>>; version: number };

// Naive: O(total orders) per message, plus GC churn.
// set((s) => ({ orders: { ...s.orders, [o.id]: o } })); // spreads 100k keys every tick

export function applyOrderUpdates(state: OrdersState, updates: Order[]): OrdersState {
  if (updates.length === 0) return state; // same reference, so nobody re-renders
  const bySymbol = { ...state.bySymbol }; // copy the (small) shard index once
  const copied = new Set<string>();

  for (const o of updates) {
    if (!copied.has(o.symbol)) {
      bySymbol[o.symbol] = { ...bySymbol[o.symbol] }; // copy each touched shard once per batch
      copied.add(o.symbol);
    }
    bySymbol[o.symbol]![o.id] = o; // mutating our own fresh copy is safe
  }
  return { bySymbol, version: state.version + 1 };
}

// Zustand usage, called once per animation frame with the buffered deltas:
// useOrders.setState((s) => applyOrderUpdates(s, drainBuffer()));
// const order = useOrders((s) => s.bySymbol[symbol]?.[id]); // re-renders only if THIS order changed`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  R1["state v1"] --> S1["EURUSD shard v1"]
  R1 --> S2["USDJPY shard - shared"]
  S1 --> A["Order A - shared"]
  S1 --> B1["Order B v1"]
  R2["state v2 - new root"] --> S1n["EURUSD shard v2 - copied"]
  R2 --> S2
  S1n --> A
  S1n --> B2["Order B v2 - updated"]
  S2 --> C["Order C - shared"]`,
      caption: {
        en: "Updating order B copies only root, the EURUSD shard and B; order A, order C and the USDJPY shard keep their references, so their memoized rows skip rendering.",
        vi: "Cập nhật order B chỉ copy root, shard EURUSD và B; order A, order C và shard USDJPY giữ nguyên tham chiếu, nên các row đã memo của chúng bỏ qua render.",
      },
    },
    memoryShortcut: {
      en: '"Copy the path, share the rest" — and "shard, batch, or go mutable" when it gets hot.',
      vi: '"Copy đường đi, chia sẻ phần còn lại" — và khi dữ liệu nóng thì "chia shard, gom batch, hoặc dùng mutable".',
    },
    keyTakeaway: {
      en: "Immutability makes change detection O(1), but at high frequency you must keep copies narrow by sharding, batching per frame and keeping the hottest data mutable outside React.",
      vi: "Immutability giúp phát hiện thay đổi với chi phí O(1), nhưng khi tần suất cao phải giữ phần copy thật nhỏ bằng cách chia shard, gom batch theo frame và để dữ liệu nóng nhất ở dạng mutable bên ngoài React.",
    },
    followUps: [
      {
        id: "isb-q25-f1",
        question: {
          en: "Is Immer a good fit for a high-frequency market-data store?",
          vi: "Immer có phù hợp cho store market data tần suất cao không?",
        },
        answer: {
          en: "For most of the app, yes. Forms, settings and layout state benefit from Immer's readable mutable-style syntax, and it still produces structural sharing. On the tick path, I'd avoid it. Every produce call creates proxies, tracks changes and, by default, freezes the result, so the overhead is paid thousands of times per second. There, I write the path copy by hand, as in the example, or keep data in a mutable buffer outside React with a version counter. I'd still profile before deciding. If updates are already batched per frame, Immer may run only 60 times a second, which can be perfectly fine.",
          vi: "Với phần lớn ứng dụng thì có. Form, settings hay state bố cục được lợi từ cú pháp kiểu mutable dễ đọc của Immer, mà vẫn giữ được structural sharing. Trên đường đi của tick thì tôi tránh dùng. Mỗi lần gọi produce sẽ tạo proxy, theo dõi thay đổi và mặc định freeze kết quả, nên overhead bị trả hàng nghìn lần mỗi giây. Ở đó tôi tự viết path copy như trong ví dụ, hoặc giữ dữ liệu trong buffer mutable bên ngoài React kèm version counter. Dù vậy, tôi vẫn profile trước khi quyết định. Nếu cập nhật đã được gom batch theo frame, Immer có thể chỉ chạy khoảng 60 lần mỗi giây, và như vậy hoàn toàn ổn.",
        },
      },
      {
        id: "isb-q25-f2",
        question: {
          en: "When would you deliberately use mutable data in a React app, and how do you do it safely?",
          vi: "Khi nào bạn chủ động dùng dữ liệu mutable trong ứng dụng React, và làm sao để làm an toàn?",
        },
        answer: {
          en: "I'd use it when the data changes faster than React should render, and when the consumer isn't React. Examples are a ring buffer of ticks for a canvas chart, or order book arrays updated per delta. I'd do it safely in three ways. First, the mutable structure lives in a data-layer module, never in component state. Second, it exposes an immutable boundary: a version number plus a getSnapshot function, consumed through useSyncExternalStore, so React reads a consistent value and doesn't tear during concurrent rendering. Third, the canvas renderer reads the buffer directly inside requestAnimationFrame. React only renders the low-frequency parts, like headers, totals and selection.",
          vi: "Tôi dùng khi dữ liệu thay đổi nhanh hơn tốc độ React nên render, và khi nơi tiêu thụ dữ liệu không phải là React. Ví dụ là ring buffer chứa tick cho chart vẽ bằng canvas, hoặc mảng order book được cập nhật theo từng delta. Tôi đảm bảo an toàn theo ba cách. Thứ nhất, cấu trúc mutable nằm trong một module data layer, không bao giờ nằm trong state của component. Thứ hai, nó lộ ra một biên immutable: một version number kèm hàm getSnapshot, được dùng qua useSyncExternalStore, để React đọc được giá trị nhất quán và không bị tearing khi concurrent rendering. Thứ ba, renderer canvas đọc trực tiếp buffer bên trong requestAnimationFrame. React chỉ render các phần thay đổi chậm như header, tổng và vùng chọn.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement: "Optimize state management and rendering for large datasets with high-frequency updates",
    candidateExperience: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "TanStack Query caching and background prefetching at Persefoni is real experience, and structural sharing is its default behaviour for query data, so you can explain it honestly. The high-frequency sharding and mutable-buffer parts are recommended approaches. Don't claim measured gains.",
        vi: "Caching và background prefetching với TanStack Query ở Persefoni là kinh nghiệm thật, và structural sharing là hành vi mặc định của nó với dữ liệu query, nên bạn có thể giải thích một cách trung thực. Phần chia shard và buffer mutable cho dữ liệu tần suất cao là cách tiếp cận đề xuất. Đừng đưa ra số liệu cải thiện đã đo.",
      },
    },
    tags: ["immutability", "structural-sharing", "zustand", "tanstack-query", "performance"],
  },
];
