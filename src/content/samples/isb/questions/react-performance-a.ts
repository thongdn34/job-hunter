import type { InterviewQuestion } from "@/domain/package/schema";

/**
 * ISB Vietnam sample — Section 7, topic "react-performance", questions 8–13.
 * Rendering fundamentals, re-render hunting, memoization, concurrent rendering,
 * the browser pipeline and virtualized tables. Numbers in explanations are general
 * technical facts, never candidate achievements.
 */
export const reactPerformanceQuestionsA: InterviewQuestion[] = [
  /* ---------------------------------------------------------------- */
  /* Q08 — Render vs commit, triggers, reconciliation and keys         */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q08",
    number: 8,
    topicId: "react-performance",
    question: {
      en: "Explain React's render and commit phases. What actually triggers a re-render, and how do reconciliation and keys decide what happens to the DOM?",
      vi: "Hãy giải thích hai phase render và commit của React. Điều gì thực sự gây ra re-render, và reconciliation cùng key quyết định DOM thay đổi như thế nào?",
    },
    answer:
      "I'd split this into three parts: what triggers a render, the render phase, and the commit phase.\n\nA component re-renders for only a few reasons: its own state changes, a context it reads changes, an external store it subscribes to changes, or its parent re-renders. That last one surprises people — changing props is not the trigger, the parent rendering is. And if I set state to the same value by Object.is, React bails out.\n\nThe render phase is pure computation. React calls my components, builds a work-in-progress fiber tree and diffs it against the current one. With concurrent features this phase can be paused, restarted or thrown away, so render must be free of side effects.\n\nReconciliation uses two heuristics. If the element type at a position changes, React tears down the whole subtree, state included. If the type matches, it reuses the fiber and updates props. In lists, the key is the identity. Index keys on a live order list are a classic bug: insert a new order at the top and every row's local state shifts to the wrong order, and every row re-renders.\n\nThe commit phase is synchronous: React applies the minimal DOM mutations, runs layout effects and refs, the browser paints, and then passive effects run.\n\nSo in a trading UI my rules are stable domain ids as keys, stable component types, and a cheap, pure render — because it runs far more often than people think.",
    viExplanation:
      "Câu trả lời chia làm ba phần rõ ràng. Thứ nhất là trigger: component chỉ re-render khi state của chính nó thay đổi, context nó đọc thay đổi, external store nó subscribe thay đổi, hoặc component cha re-render. Điểm nhiều người hiểu sai là “props đổi thì con render” — thực ra cha render lại thì con render theo mặc định, dù props có đổi hay không. Nếu setState với giá trị giống hệt (so sánh bằng Object.is), React sẽ bail out.\n\nThứ hai là render phase: đây chỉ là tính toán thuần. React gọi các component, dựng cây fiber work-in-progress rồi diff với cây hiện tại. Với concurrent rendering, phase này có thể bị tạm dừng, chạy lại hoặc bỏ đi, nên tuyệt đối không đặt side effect (ví dụ mở WebSocket) trong render.\n\nThứ ba là commit phase: chạy đồng bộ, áp dụng thay đổi tối thiểu lên DOM, chạy useLayoutEffect và gắn ref, trình duyệt paint, sau đó mới tới useEffect.\n\nReconciliation dựa vào type và key. Đổi type ở cùng vị trí thì cả subtree bị unmount và mất state. Trong danh sách, key chính là danh tính của item — dùng index làm key cho danh sách lệnh cập nhật liên tục sẽ làm state cục bộ “nhảy” sang nhầm dòng. Hãy luôn dùng id ổn định từ domain.",
    technicalExplanation: `### What triggers a re-render
- **Own state**: \`setState\` / \`dispatch\`. If the new value is \`Object.is\`-equal to the current one, React bails out.
- **Context**: every consumer re-renders when the provider \`value\` changes identity. A provider that builds \`{ quotes, setQuotes }\` inline creates a new object on every render, so all consumers render on every tick.
- **External store**: Zustand and Redux use \`useSyncExternalStore\`; the component re-renders when its *selected snapshot* changes.
- **Parent render**: children render by default. Only \`memo\` (with shallow-equal props) or passing elements in as \`children\` from higher up stops this.

### Render phase (pure, interruptible)
- React keeps two fiber trees: *current* (on screen) and *work-in-progress*. It walks down from the updated fiber, calls components and builds the new tree.
- Updates get **lanes** (priorities). With transitions, React yields to the browser in small time slices and can discard half-finished work.
- In development, StrictMode double-invokes render so impure code shows up early.

### Reconciliation heuristics
- A general tree diff is O(n³). React gets O(n) from two assumptions: **different type means a different tree**, and **keys identify siblings**.
- Different type at the same position means unmount (cleanup runs, state is lost) and mount a fresh subtree. Defining a component *inside* another component creates a new type every render, so the child remounts every time. That is both a performance bug and a lost-focus bug.
- Index keys are fine for static lists only. In a live blotter that inserts at the top, every row receives different props (all re-render) and local state, focus and uncontrolled inputs attach to the wrong row.
- Changing a key on purpose is a legitimate **reset** tool, for example \`key={accountId}\` on an order form.

### Commit phase (synchronous)
1. Mutation: insert, update and remove DOM nodes.
2. Layout effects and ref attachment run before paint. Heavy \`useLayoutEffect\` measurement therefore delays the frame.
3. The browser paints.
4. Passive effects (\`useEffect\`) flush, usually after paint.

### Failure scenarios
- \`Math.random()\` keys remount every row on every render: lost focus, lost scroll and expensive DOM churn.
- A side effect in render, such as subscribing to a socket, runs twice when React restarts the render, which duplicates subscriptions.
- A context value created inline re-renders the whole consumer tree on every price tick.

### Performance perspective
- A re-render is not a DOM update. React may render and find nothing to commit, but the CPU cost of rendering is already paid. At 60 Hz a frame is about 16.7 ms in total, so in high-frequency UIs the **render cost**, not the DOM mutation, usually dominates.
- Scalability comes from keeping the set of components that render per update small. Later questions (selectors, memo, virtualization) all build on this model.`,
    practicalExample: {
      description: {
        en: "A live order list where index keys would attach each row's local note to the wrong order after a new order is inserted at the top. Stable ids keep fiber identity, and React only touches the inserted row.",
        vi: "Danh sách lệnh realtime: nếu dùng index làm key, ghi chú cục bộ của mỗi dòng sẽ dính sang lệnh khác khi có lệnh mới chèn lên đầu. Dùng id ổn định giữ đúng danh tính fiber, React chỉ thêm đúng một dòng mới.",
      },
      code: {
        language: "tsx",
        code: `import { useState } from "react";

type Order = { id: string; symbol: string; qty: number };

function OrderRow({ order }: { order: Order }) {
  // Local state lives on the fiber; React matches fibers by key.
  const [note, setNote] = useState("");
  return (
    <li>
      {order.symbol} x {order.qty}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label={"Note for order " + order.id}
      />
    </li>
  );
}

export function OrderList({ orders }: { orders: Order[] }) {
  // BAD:  key={index} -> inserting at index 0 shifts every key, so notes
  //       move to the wrong order and every row re-renders.
  // GOOD: a stable domain id keeps identity across inserts and re-sorts.
  return (
    <ul>
      {orders.map((o) => (
        <OrderRow key={o.id} order={o} />
      ))}
    </ul>
  );
}

// Anti-pattern: a component type defined inside render is a NEW type each
// time, so React unmounts and remounts it on every parent render.
export function Panel() {
  const Cell = () => <span>stale</span>; // move this to module scope
  return <Cell />;
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  T["setState, context or store change"] --> Q{"Value differs by Object.is?"}
  Q -- "No" --> BAIL["Bail out, nothing rendered"]
  Q -- "Yes" --> RENDER["Render phase - call components, build work-in-progress fibers"]
  P["Parent re-renders"] --> RENDER
  RENDER --> REC["Reconcile children by type and key"]
  REC --> COMMIT["Commit phase - apply minimal DOM mutations"]
  COMMIT --> LAYOUT["useLayoutEffect and refs"]
  LAYOUT --> PAINT["Browser paint"]
  PAINT --> EFFECT["useEffect"]
  RENDER -.->|"concurrent rendering may pause or discard"| RENDER`,
      caption: {
        en: "From trigger to paint: render is pure and interruptible, commit is synchronous, and type plus key decide update versus remount.",
        vi: "Từ trigger tới paint: render thuần và có thể bị ngắt, commit chạy đồng bộ; type và key quyết định cập nhật hay remount.",
      },
    },
    memoryShortcut: {
      en: "TRC: Trigger (state, context, store, parent) → Render (pure, interruptible) → Commit (sync, DOM). Keys = identity, type = tree.",
      vi: "TRC: Trigger (state, context, store, cha) → Render (thuần, có thể ngắt) → Commit (đồng bộ, đụng DOM). Key = danh tính, type = cây.",
    },
    keyTakeaway: {
      en: "Re-renders come from state, context, store or a parent render; render is pure and interruptible, commit is synchronous, and stable keys and types decide whether React updates or remounts.",
      vi: "Re-render đến từ state, context, store hoặc cha render; render thuần và có thể ngắt, commit đồng bộ, còn key và type ổn định quyết định React cập nhật hay remount.",
    },
    followUps: [
      {
        id: "isb-q08-f1",
        question: {
          en: "Does a re-render always mean the DOM is updated?",
          vi: "Re-render có luôn đồng nghĩa với việc DOM bị cập nhật không?",
        },
        answer: {
          en: "No. Rendering means React called the component and diffed the output. If the output is identical, the commit phase has nothing to mutate and the DOM is untouched. The catch is that the render CPU cost is already paid: running hooks, building elements and diffing. In a dashboard receiving many updates per second, hundreds of 'useless' renders that commit nothing can still eat most of a 16 ms frame. That's why I measure render counts and durations in the Profiler, not just DOM mutations, and why I reduce how many components render per tick through selectors and memoized rows.",
          vi: "Không. Render nghĩa là React gọi component và diff kết quả. Nếu kết quả giống hệt, commit không có gì để thay đổi và DOM giữ nguyên. Nhưng chi phí CPU của render đã tốn rồi: chạy hooks, tạo element, diff. Với dashboard nhận nhiều update mỗi giây, hàng trăm lần render “vô ích” vẫn có thể ăn gần hết khung 16 ms. Vì vậy tôi đo số lần render và thời gian render trong Profiler, không chỉ nhìn DOM, và giảm số component render mỗi tick bằng selector và memo cho từng dòng.",
        },
      },
      {
        id: "isb-q08-f2",
        question: {
          en: "When would you deliberately change a component's key?",
          vi: "Khi nào bạn cố ý thay đổi key của một component?",
        },
        answer: {
          en: "When I want a clean reset of all internal state instead of syncing it with effects. For example, an order ticket form keyed by instrument id: when the trader switches from one instrument to another, the form remounts with fresh quantity, price and validation state, and there's no risk of a stale limit price carrying over. It's simpler and safer than a useEffect that resets ten fields. The trade-off is that remounting costs more than updating and runs cleanup and mount effects, so I use it for user-level context switches, not for high-frequency data changes.",
          vi: "Khi tôi muốn reset sạch toàn bộ state nội bộ thay vì đồng bộ bằng effect. Ví dụ form đặt lệnh dùng key là instrument id: khi trader chuyển sang mã khác, form remount với quantity, price và trạng thái validate mới, không có rủi ro giữ lại limit price cũ. Cách này đơn giản và an toàn hơn một useEffect reset mười field. Đổi lại, remount tốn hơn update và chạy lại cleanup cùng mount effect, nên tôi chỉ dùng cho việc chuyển ngữ cảnh do người dùng, không dùng cho dữ liệu cập nhật tần suất cao.",
        },
      },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement:
      "Strong mastery of modern React; rendering optimization for high-frequency updates (strong assumption)",
    candidateExperience: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "Grounded in day-to-day React + TypeScript enterprise frontend work at Persefoni. Speak to the fundamentals; do not claim a specific key or reconciliation incident or any metric unless you remember a real case.",
        vi: "Dựa trên công việc React + TypeScript frontend enterprise hằng ngày tại Persefoni. Nói về kiến thức nền tảng; không bịa sự cố cụ thể về key/reconciliation hay số liệu nếu không nhớ trường hợp thật.",
      },
    },
    tags: ["react", "reconciliation", "keys", "fiber", "rendering"],
  },

  /* ---------------------------------------------------------------- */
  /* Q09 — Finding and fixing unnecessary re-renders                   */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q09",
    number: 9,
    topicId: "react-performance",
    question: {
      en: "Your live trading dashboard feels sluggish while the feed is running. How do you find and fix unnecessary re-renders?",
      vi: "Dashboard giao dịch realtime bị giật khi feed đang chạy. Bạn tìm và xử lý các re-render không cần thiết như thế nào?",
    },
    answer:
      "I'd approach it as measure, locate, then fix at the subscription level — not by sprinkling memo everywhere.\n\nFirst, measure. I record a session in the React DevTools Profiler while the feed is running, with 'record why each component rendered' turned on. The flame graph shows which components render on every tick and why: props changed, hooks changed, or the parent rendered. I pair that with the Chrome Performance panel, because sometimes the long task isn't React at all — it's layout or JSON parsing. In development, why-did-you-render flags renders where props are deep-equal but referentially new.\n\nSecond, find the root cause. In live dashboards it's almost always one of three things: a component subscribing to the whole store instead of a slice, a context provider whose value is a new object every tick, or a parent holding fast-changing state so the whole tree renders.\n\nThird, fix where the data enters the tree. Each row gets a narrow selector — subscribe to one symbol's quote — so a tick for one instrument re-renders one row, not the table. I push fast-changing state down into leaves, split contexts by update frequency, and only then add memo on list rows. One trap: a selector that returns a new object each time re-renders on every store change, so I return primitives or use a shallow comparator.\n\nFinally, I re-profile under the same feed to prove the fix. The same idea applies to TanStack Query: the select option plus structural sharing keeps unrelated components quiet.",
    viExplanation:
      "Ý chính: đo trước, tìm nguyên nhân gốc, rồi sửa ở tầng subscription — không phải rải memo khắp nơi.\n\nBước đo: dùng React DevTools Profiler khi feed đang chạy, bật tuỳ chọn “record why each component rendered” để biết component nào render mỗi tick và vì sao (props đổi, hook đổi hay cha render). Kết hợp với tab Performance của Chrome vì đôi khi long task không nằm ở React mà ở layout hoặc parse JSON. Trong môi trường dev, why-did-you-render giúp phát hiện props bằng nhau về giá trị nhưng khác reference.\n\nNguyên nhân thường gặp có ba: component subscribe cả store thay vì một lát cắt; context provider tạo object value mới mỗi tick; hoặc component cha giữ state thay đổi nhanh nên cả cây render theo.\n\nCách sửa: mỗi dòng dùng selector hẹp, chỉ subscribe quote của đúng một mã, nên tick của mã A chỉ làm dòng A render lại. Đẩy state thay đổi nhanh xuống component lá, tách context theo tần suất cập nhật, sau đó mới memo các dòng. Cẩn thận selector trả về object mới mỗi lần — nó sẽ re-render liên tục; hãy trả về primitive hoặc dùng shallow compare. Cuối cùng, profile lại với cùng feed để chứng minh hiệu quả.",
    technicalExplanation: `### Measure before touching code
- **React DevTools Profiler**: enable *Record why each component rendered while profiling*. Ranked and flame charts show render count and \`actualDuration\` per commit. Look for components that render on *every* commit while the feed runs.
- **Chrome Performance panel**: confirms whether long tasks (over 50 ms) are React render work, style and layout, GC or message parsing. A fix in the wrong layer wastes time.
- **why-did-you-render** (development only): logs renders caused by props that are deep-equal but referentially different, which is the typical memo-defeating bug.
- The \`<Profiler onRender>\` API can sample render durations. It needs a profiling build in production, so it is a targeted tool, not always-on telemetry.

### The usual root causes in real-time UIs
- **Over-broad store subscriptions**: \`const { quotes } = useStore()\` re-renders on any change to any symbol.
- **Context as a high-frequency bus**: context has no selectors, so every consumer renders when the value changes. Context fits low-frequency data (theme, user, locale), not ticks.
- **State lifted too high**: the dashboard root holds \`lastPrice\`, so the whole page renders on every tick.
- **Unstable props**: inline objects, arrays and callbacks into memoized children.
- **Selectors that allocate**: \`s => ({ bid: s.bid, ask: s.ask })\` returns a new object every call, so \`Object.is\` always fails. Return primitives, or use \`useShallow\` in Zustand or \`shallowEqual\` in Redux.

### Fix at the subscription boundary
1. Normalize live data into a map keyed by id and update **only the changed entries**, so untouched entries keep their reference.
2. Give each row a selector scoped to its id; wrap rows in \`memo\` so a parent re-render with the same id is skipped.
3. Batch incoming ticks (for example one store update per animation frame) so N messages become one commit.
4. Keep fast state in leaves: a \`<LastPrice symbol>\` leaf can update while the surrounding layout stays still.
5. For server state in TanStack Query, use \`select\` to subscribe to a slice; structural sharing keeps unchanged parts referentially stable.

### Trade-offs and failure scenarios
- Fine-grained subscriptions mean more subscriptions. Thousands of listeners cost memory and notification time, which is one reason virtualization (only visible rows subscribe) matters.
- Over-memoization adds comparison cost and hides design problems; fix data identity first.
- Batching per frame adds up to one frame of latency, which is acceptable for display but should not apply to order acknowledgements.

### Maintainability
- Codify the rules: lint for inline context values, document "selectors return primitives", and keep a Profiler-based regression check (a recorded scenario with an agreed render budget) for critical screens.`,
    practicalExample: {
      description: {
        en: "A watchlist where each row subscribes to exactly one symbol's quote. Updating one symbol keeps every other entry's reference, so only the changed row re-renders. A Profiler callback flags slow commits during development.",
        vi: "Watchlist trong đó mỗi dòng chỉ subscribe quote của đúng một mã. Cập nhật một mã giữ nguyên reference của các mã khác nên chỉ dòng thay đổi được render lại. Profiler callback cảnh báo các commit chậm khi phát triển.",
      },
      code: {
        language: "tsx",
        code: `import { memo, Profiler, type ProfilerOnRenderCallback } from "react";
import { create } from "zustand";

type Quote = { bid: number; ask: number };
type QuoteState = {
  quotes: Record<string, Quote>;
  applyBatch: (batch: Record<string, Quote>) => void;
};

export const useQuotes = create<QuoteState>((set) => ({
  quotes: {},
  // Only changed symbols get new objects; the rest keep their reference.
  applyBatch: (batch) => set((s) => ({ quotes: { ...s.quotes, ...batch } })),
}));

const QuoteRow = memo(function QuoteRow({ symbol }: { symbol: string }) {
  // Narrow selector: re-renders only when THIS symbol's quote changes.
  const quote = useQuotes((s) => s.quotes[symbol]);
  if (!quote) return null;
  return (
    <tr>
      <td>{symbol}</td>
      <td>{quote.bid}</td>
      <td>{quote.ask}</td>
    </tr>
  );
});

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  if (actualDuration > 8) console.warn(id, phase, actualDuration.toFixed(1) + " ms");
};

export function Watchlist({ symbols }: { symbols: string[] }) {
  return (
    <Profiler id="watchlist" onRender={onRender}>
      <table>
        <tbody>{symbols.map((s) => <QuoteRow key={s} symbol={s} />)}</tbody>
      </table>
    </Profiler>
  );
}`,
      },
    },
    diagram: {
      kind: "sequence",
      code: `sequenceDiagram
  participant WS as WebSocket batch
  participant Store as Quote store
  participant RowA as Row AAA
  participant RowB as Row BBB
  participant Table as Watchlist table
  WS->>Store: ticks for AAA only
  Store->>Store: replace quotes.AAA, keep other references
  Store-->>RowA: selector result changed
  RowA->>RowA: re-render one row
  Store-->>RowB: selector result is same reference
  Note over RowB,Table: Object.is equal, no re-render
  Note over Table: table body never re-renders on ticks`,
      caption: {
        en: "Narrow selectors turn a store update into a single-row re-render instead of a full-table render.",
        vi: "Selector hẹp biến một lần cập nhật store thành re-render đúng một dòng thay vì cả bảng.",
      },
    },
    memoryShortcut: {
      en: "MLF: Measure (Profiler), Locate (store, context, lifted state), Fix at the subscription — selectors before memo.",
      vi: "MLF: Measure (đo bằng Profiler), Locate (store, context, state đặt quá cao), Fix ở subscription — selector trước, memo sau.",
    },
    keyTakeaway: {
      en: "Unnecessary re-renders in live dashboards are fixed where data enters the tree — narrow selectors, stable references and state pushed into leaves — and proven with the Profiler.",
      vi: "Re-render thừa trong dashboard realtime được xử lý ở nơi dữ liệu đi vào cây component — selector hẹp, reference ổn định, state đẩy xuống lá — và được chứng minh bằng Profiler.",
    },
    followUps: [
      {
        id: "isb-q09-f1",
        question: {
          en: "Why not just put the live quotes in React Context?",
          vi: "Tại sao không đưa quote realtime vào React Context cho đơn giản?",
        },
        answer: {
          en: "Context has no selector mechanism: when the provider value changes, every consumer re-renders, whether it cares about that symbol or not. With ticks arriving many times per second, that turns into whole-tree renders on every update. Splitting into many contexts helps a little but doesn't scale to hundreds of symbols. Context is great for low-frequency, widely shared values like theme, locale or the current account. For high-frequency data I'd use an external store with selectors — Zustand or Redux via useSyncExternalStore — or even a plain subscription that writes to a ref and updates the DOM directly for the hottest cells.",
          vi: "Context không có cơ chế selector: khi value của provider đổi, mọi consumer đều re-render, dù có quan tâm mã đó hay không. Với tick đến nhiều lần mỗi giây, điều này thành render cả cây mỗi lần cập nhật. Tách nhiều context giúp một chút nhưng không scale tới hàng trăm mã. Context phù hợp cho dữ liệu ít thay đổi, dùng chung rộng như theme, locale, tài khoản hiện tại. Với dữ liệu tần suất cao, tôi dùng external store có selector — Zustand hoặc Redux qua useSyncExternalStore — hoặc với các ô “nóng” nhất thì subscribe trực tiếp, ghi vào ref và cập nhật DOM.",
        },
      },
    ],
    difficulty: "hard",
    priority: "critical",
    jdRequirement: "Optimize rendering and state management for high-frequency real-time updates",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "Present as your recommended approach. You can say you used TanStack Query (and its caching) at Persefoni, but do not claim you profiled or optimized a live trading dashboard or quote any before/after numbers.",
        vi: "Trình bày như cách tiếp cận đề xuất. Có thể nói bạn đã dùng TanStack Query (và caching) ở Persefoni, nhưng không nói đã profile/tối ưu dashboard giao dịch realtime hay đưa ra số liệu trước/sau.",
      },
    },
    tags: ["react", "re-render", "profiler", "selectors", "zustand"],
  },

  /* ---------------------------------------------------------------- */
  /* Q10 — useMemo / useCallback / React.memo / React Compiler          */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q10",
    number: 10,
    topicId: "react-performance",
    question: {
      en: "When do useMemo, useCallback and React.memo actually help, when do they hurt, and how does the React Compiler change your approach?",
      vi: "Khi nào useMemo, useCallback và React.memo thực sự có ích, khi nào chúng gây hại, và React Compiler thay đổi cách tiếp cận của bạn ra sao?",
    },
    answer:
      "My default is: measure first, memoize at the boundaries that matter, and let the React Compiler handle the rest where we can adopt it.\n\nReact.memo skips re-rendering a component when its props are shallow-equal. useMemo caches a computed value and useCallback caches a function's identity. They help in two situations: when the computation itself is expensive — say filtering and sorting ten thousand trades — or when referential stability matters, because the value is a prop of a memoized child or a dependency of an effect.\n\nThey hurt when the work is trivial. Every useMemo costs a dependency comparison, a closure and retained memory, and it makes code harder to read. Worse, memo is fragile: one inline object or arrow function in the props and the comparison fails silently, so you pay for the comparison and still re-render. And if upstream data produces a new array on every tick, memoizing downstream is pointless — I fix data identity first.\n\nThe React Compiler changes the calculus. It analyzes components at build time and memoizes values and JSX automatically with finer granularity than I'd write by hand, as long as the code follows the Rules of React. So on a codebase that can adopt it, I'd enable it incrementally, use the ESLint plugin to catch rule violations, and keep manual memoization only as an escape hatch — for example stable callbacks handed to a third-party chart library.\n\nIn a trading screen, the one place I'd always memoize is rows in a high-frequency grid. That's where skipped renders compound.",
    viExplanation:
      "Nguyên tắc: đo trước, chỉ memo ở những “ranh giới” quan trọng, phần còn lại để React Compiler lo nếu dự án áp dụng được.\n\nReact.memo bỏ qua re-render khi props bằng nhau theo shallow compare; useMemo cache giá trị tính toán; useCallback cache danh tính (reference) của hàm. Chúng có ích trong hai trường hợp: phép tính thực sự đắt (ví dụ filter và sort hàng chục nghìn trade), hoặc cần reference ổn định vì giá trị được truyền vào component đã memo hay nằm trong dependency của effect.\n\nChúng gây hại khi công việc quá rẻ: mỗi useMemo tốn so sánh dependency, closure và bộ nhớ, đồng thời code khó đọc hơn. Tệ hơn, memo rất dễ bị vô hiệu hoá âm thầm — chỉ một object hay arrow function inline trong props là so sánh thất bại, vừa tốn so sánh vừa vẫn render. Nếu dữ liệu phía trên tạo mảng mới mỗi tick thì memo phía dưới vô nghĩa — phải sửa danh tính dữ liệu trước.\n\nReact Compiler phân tích component lúc build và tự động memo giá trị và JSX chi tiết hơn viết tay, miễn code tuân thủ Rules of React. Khi áp dụng được, tôi bật dần, dùng ESLint plugin để bắt vi phạm, và chỉ giữ memo thủ công như escape hatch, ví dụ callback ổn định cho thư viện chart bên thứ ba.",
    technicalExplanation: `### What each tool actually does
- **\`React.memo(Component)\`**: before rendering, compares each prop with \`Object.is\` (or your custom comparator). Equal means reuse the last output, and the subtree is skipped.
- **\`useMemo(fn, deps)\`**: re-runs \`fn\` only when a dependency changes by \`Object.is\`. It is a cache with one slot, not a guarantee; React may discard it.
- **\`useCallback(fn, deps)\`**: is \`useMemo(() => fn, deps)\`. It preserves identity, not performance by itself.

### When they help
- **Expensive derivations**: filtering, sorting or grouping thousands of rows; building chart series; parsing. Rule of thumb: if a computation is consistently around 1 ms or more per render, measure it.
- **Referential stability at a boundary**: props into a \`memo\` child, values in effect dependency arrays (to avoid re-subscribing a socket), values passed to context providers, and callbacks given to imperative libraries that re-bind on identity change.
- **High-fanout lists**: memoized rows in a grid where the parent renders often but most rows are unchanged.

### When they hurt
- Trivial computations: the dependency array allocation and comparison can cost more than the work.
- **Silent invalidation**: \`<Grid style={{ height: 400 }} onRowClick={() => ...} />\` defeats \`memo\` every render. You pay the comparison and still render.
- **Unstable upstream data**: if the store or query returns a fresh array per tick, every memo downstream recomputes. Fix the source with structural sharing or normalized updates.
- **Stale values**: wrong dependency arrays freeze old data, for example a callback that reads an outdated account id. Lint with \`react-hooks/exhaustive-deps\`.
- **Memory**: memoized values stay alive with the fiber, so large cached arrays in long-running dashboards add to the heap.

### React Compiler
- A build-time Babel plugin (\`babel-plugin-react-compiler\`; in Next.js 16 it is enabled with the \`reactCompiler\` option) that auto-memoizes components and hooks at a granularity close to individual JSX expressions, including values that manual code rarely memoizes.
- It relies on the **Rules of React**: pure render, no mutation of props or state, hooks called unconditionally. When the compiler *detects* a violation it skips that component instead of optimizing it; violations it cannot detect can still cause subtle bugs once memoized, which is why linting and tests matter. The compiler's diagnostics ship as rules in \`eslint-plugin-react-hooks\` (recommended preset).
- Adoption strategy: enable per directory or with an opt-in annotation, run the test suite, profile critical screens, then widen. Keep \`useMemo\` / \`useCallback\` where identity is a semantic contract (effect dependencies, third-party APIs).

### Trade-offs at scale
- Manual memoization is a maintenance tax: every new prop can break it. The compiler removes most of that tax but adds a build step and a requirement to keep code rule-compliant.
- Neither replaces architecture. Memoization reduces the cost of a render; selectors and virtualization reduce the *number* of renders. In high-frequency UIs the second matters more.`,
    practicalExample: {
      description: {
        en: "A blotter where memoization is justified (an expensive filter feeding a memoized grid, plus a stable callback) and comments that show where it is wasted or silently defeated.",
        vi: "Một blotter nơi memo là hợp lý (filter tốn kém truyền vào grid đã memo, kèm callback ổn định), và comment chỉ ra chỗ memo bị lãng phí hoặc vô hiệu hoá âm thầm.",
      },
      code: {
        language: "tsx",
        code: `import { memo, useCallback, useMemo, useState } from "react";

type Trade = { id: string; symbol: string; price: number; qty: number };

const TradeGrid = memo(function TradeGrid(props: {
  rows: Trade[];
  onSelect: (id: string) => void;
}) {
  return (
    <ul>
      {props.rows.map((r) => (
        <li key={r.id} onClick={() => props.onSelect(r.id)}>{r.symbol}</li>
      ))}
    </ul>
  );
});

export function Blotter({ trades }: { trades: Trade[] }) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  // Worth it: O(n) over thousands of rows AND the result feeds a memo child.
  const rows = useMemo(() => {
    const f = filter.toUpperCase();
    return trades.filter((t) => t.symbol.includes(f));
  }, [trades, filter]);

  // Worth it only because TradeGrid is memoized.
  const onSelect = useCallback((id: string) => setSelected(id), []);

  // Wasted:   useMemo(() => qty * price, [qty, price])
  // Defeated: <TradeGrid rows={rows} onSelect={(id) => setSelected(id)} />
  return (
    <>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter symbol" />
      <p>Selected: {selected ?? "none"}</p>
      <TradeGrid rows={rows} onSelect={onSelect} />
    </>
  );
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  A["Profiler shows a slow or frequent render"] --> B{"Is the computation expensive?"}
  B -- "Yes" --> C["useMemo the derived data"]
  B -- "No" --> D{"Value goes to a memo child or effect deps?"}
  D -- "Yes" --> E["useMemo or useCallback for stable identity"]
  D -- "No" --> F["Do not memoize"]
  C --> G{"Upstream data stable per tick?"}
  E --> G
  G -- "No" --> H["Fix data identity first - normalize, structural sharing"]
  G -- "Yes" --> I["Re-profile under live feed"]
  H --> I
  K["React Compiler enabled"] -.-> L["Most of this automated at build time"]`,
      caption: {
        en: "A decision path for manual memoization; with the React Compiler most of it becomes automatic, but data identity still has to be fixed upstream.",
        vi: "Lộ trình quyết định khi memo thủ công; với React Compiler phần lớn được tự động hoá, nhưng danh tính dữ liệu vẫn phải được xử lý từ phía nguồn.",
      },
    },
    memoryShortcut: {
      en: '"Expensive or Equality" — memoize only when the work is expensive or the identity is consumed by memo/effects; otherwise let the Compiler do it.',
      vi: "“Đắt hoặc Danh tính” — chỉ memo khi phép tính đắt hoặc reference được memo/effect sử dụng; còn lại để Compiler lo.",
    },
    keyTakeaway: {
      en: "Memoization pays off only for expensive work or identity consumed by memoized children and effects; fix unstable upstream data first and let the React Compiler remove most manual memo.",
      vi: "Memo chỉ có lợi với phép tính đắt hoặc reference được component memo và effect sử dụng; hãy sửa dữ liệu không ổn định từ nguồn trước và để React Compiler thay phần lớn memo thủ công.",
    },
    followUps: [
      {
        id: "isb-q10-f1",
        question: {
          en: "If we adopt the React Compiler, should we delete all existing useMemo and useCallback calls?",
          vi: "Nếu áp dụng React Compiler, có nên xoá hết useMemo và useCallback hiện có không?",
        },
        answer: {
          en: "Not in one sweep. The compiler works alongside manual memoization, so existing calls are safe to keep. I'd first enable it incrementally and fix the rule violations the ESLint plugin reports, because a component that breaks the Rules of React is simply skipped. Then I'd remove manual memo opportunistically when touching code, keeping it where identity is part of a contract: effect dependencies that would re-subscribe a WebSocket, or callbacks passed into an imperative chart library. Each removal on a critical screen should be followed by a Profiler check, since the compiler's output can differ from what we assumed.",
          vi: "Không nên xoá một lượt. Compiler hoạt động song song với memo thủ công nên giữ lại vẫn an toàn. Tôi sẽ bật compiler dần dần, sửa các vi phạm mà ESLint plugin báo, vì component vi phạm Rules of React sẽ bị compiler bỏ qua. Sau đó gỡ memo thủ công dần khi chạm vào code, nhưng giữ lại ở nơi reference là một “hợp đồng”: dependency của effect mà nếu đổi sẽ subscribe lại WebSocket, hay callback truyền vào thư viện chart dạng imperative. Mỗi lần gỡ ở màn hình quan trọng nên kiểm tra lại bằng Profiler.",
        },
      },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "React rendering optimization and state management for large, high-frequency datasets",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "General React expertise from your React + TypeScript work. Present the React Compiler adoption plan as a recommendation, not something you have rolled out in production.",
        vi: "Kiến thức React chung từ kinh nghiệm React + TypeScript. Trình bày kế hoạch áp dụng React Compiler như một đề xuất, không phải điều bạn đã triển khai trên production.",
      },
    },
    tags: ["react", "memoization", "usememo", "react-compiler", "performance"],
  },

  /* ---------------------------------------------------------------- */
  /* Q11 — useTransition and useDeferredValue                          */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q11",
    number: 11,
    topicId: "react-performance",
    question: {
      en: "How do useTransition and useDeferredValue keep input responsive while a dashboard is under heavy updates? What are their limits?",
      vi: "useTransition và useDeferredValue giúp giữ input phản hồi nhanh như thế nào khi dashboard đang chịu tải cập nhật lớn? Giới hạn của chúng là gì?",
    },
    answer:
      "Both are about priority, not speed. React separates urgent updates — typing, clicking — from non-urgent ones that are allowed to lag a little.\n\nuseTransition lets me mark a state update as non-urgent. I wrap the setState in startTransition, React renders it in the background, yields to the browser every few milliseconds, and if an urgent update arrives — another keystroke — it abandons the stale render and starts over with the latest state. isPending lets me show a subtle loading hint instead of freezing the screen. I use it when I own the update, like switching from a positions tab to a heavy analytics tab.\n\nuseDeferredValue is the same idea when I only receive a value, such as a filter string or a fast-changing prop. React first renders with the old value, then re-renders with the new one in the background. The detail people miss: the heavy child must be wrapped in memo, otherwise it re-renders with the old value anyway and nothing is gained.\n\nThere are limits I'd call out. It doesn't make work cheaper — a single component that takes two hundred milliseconds still blocks, because React can only yield between components. Updates from external stores like Zustand go through useSyncExternalStore and are always synchronous, so a tick-driven store update can't be a transition; instead I defer the derived value. And for thousands of ticks per second, the real fix is still batching and virtualization — concurrency just keeps the input responsive on top of that.",
    viExplanation:
      "Cả hai đều nói về độ ưu tiên, không phải tốc độ. React tách update “khẩn cấp” (gõ phím, click) khỏi update “không khẩn cấp” có thể chậm một chút.\n\nuseTransition: bọc setState trong startTransition để đánh dấu là không khẩn cấp. React render nó ở nền, cứ vài mili-giây lại nhường (yield) cho trình duyệt; nếu có update khẩn cấp mới (một phím gõ tiếp), React bỏ render cũ và render lại với state mới nhất. isPending giúp hiển thị trạng thái loading nhẹ thay vì đứng hình. Dùng khi mình là người gọi setState, ví dụ chuyển tab sang màn hình analytics nặng.\n\nuseDeferredValue: cùng ý tưởng nhưng dùng khi chỉ nhận được giá trị, như chuỗi filter hay prop thay đổi nhanh. React render trước với giá trị cũ, sau đó render lại ở nền với giá trị mới. Điểm hay bị bỏ sót: component nặng phải được bọc memo, nếu không nó vẫn render với giá trị cũ và chẳng được lợi gì.\n\nGiới hạn: không làm công việc rẻ hơn — một component chạy 200 ms vẫn chặn vì React chỉ yield giữa các component. Update từ external store như Zustand đi qua useSyncExternalStore nên luôn đồng bộ, không thể đưa vào transition; thay vào đó hãy defer giá trị dẫn xuất. Với hàng nghìn tick mỗi giây, giải pháp chính vẫn là batching và virtualization.",
    technicalExplanation: `### How it works under the hood
- Every update gets a **lane**. Discrete events (click, keypress) use a sync lane; \`startTransition\` assigns a transition lane.
- Transition renders run in **time slices**. The work loop checks the clock between fibers and yields to the browser (about every 5 ms in current React), so input events, paint and other tasks can run.
- If a higher-priority update arrives, React **interrupts** the in-progress transition render, handles the urgent update, then restarts the transition with the newest state. Half-built work-in-progress trees are discarded, which is safe only because render is pure.
- \`isPending\` is true while the transition is still in flight, so the old UI stays on screen and interactive.

### useTransition versus useDeferredValue
- **useTransition**: you own the state setter. Good for tab switches, applying a filter to a large grid, or changing the chart range. In React 19 \`startTransition\` also accepts async functions (Actions).
- **useDeferredValue(value)**: you only have the value. React renders once with the previous value (urgent), then schedules a background render with the new value. It needs a \`memo\` child that receives the deferred value, so the urgent render can skip it.
- Both show stale content during the lag. Signal it, for example with reduced opacity when \`query !== deferredQuery\`.

### Limits and failure scenarios
- **No speed-up for a monolithic component**: yielding happens between components. A single 200 ms render is still one long task. Split the work, virtualize or move computation to a Web Worker.
- **External stores are synchronous**: \`useSyncExternalStore\` updates cannot be time-sliced. Wrapping a Zustand \`set\` in \`startTransition\` de-opts to a sync render. Pattern: subscribe normally, then \`useDeferredValue\` on the derived heavy value.
- **Not for controlled inputs**: never put the input's own \`setValue\` in a transition, or typing will lag. Keep the input urgent and defer the consumer.
- **Starvation under constant ticks**: if a deferred value changes faster than the background render completes, the deferred UI may keep restarting. Throttle or batch the source (for example per animation frame) so a transition can finish.
- **Effects, timers and \`await\`**: \`setTimeout\` inside a transition callback runs outside it, and in an async Action the state updates after an \`await\` are no longer marked as a transition; wrap those later setState calls in their own \`startTransition\`.

### When to reach for it in a trading UI
- Typing in a symbol search over a large instrument list.
- Switching heavy panels or changing chart time ranges.
- Recomputing analytics from a deferred snapshot while the live ticker stays synchronous.

Concurrency is the **last layer**. Reduce render count (selectors), render size (virtualization) and message rate (batching) first.`,
    practicalExample: {
      description: {
        en: "A symbol search where the input stays urgent, the heavy instrument list renders from a deferred value (and is memoized so it can be skipped), and a tab switch uses a transition with a pending hint.",
        vi: "Ô tìm mã chứng khoán: input luôn là update khẩn cấp, danh sách instrument nặng render từ giá trị deferred (và được memo để có thể bỏ qua), còn chuyển tab dùng transition kèm trạng thái pending.",
      },
      code: {
        language: "tsx",
        code: `import { memo, useDeferredValue, useState, useTransition } from "react";

type Instrument = { id: string; symbol: string; name: string };

const InstrumentList = memo(function InstrumentList(props: { items: Instrument[]; query: string }) {
  const q = props.query.toUpperCase();
  const visible = props.items.filter((i) => i.symbol.includes(q)); // heavy for large lists
  return <ul>{visible.slice(0, 200).map((i) => <li key={i.id}>{i.symbol} - {i.name}</li>)}</ul>;
});

export function SymbolSearch({ items }: { items: Instrument[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query); // lags behind while typing
  const isStale = query !== deferredQuery;

  const [tab, setTab] = useState<"watchlist" | "analytics">("watchlist");
  const [isPending, startTransition] = useTransition();

  return (
    <section>
      {/* Urgent: never wrap the input's own setter in a transition */}
      <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search symbol" />
      <button onClick={() => startTransition(() => setTab("analytics"))} aria-busy={isPending}>
        Analytics {isPending ? "..." : ""}
      </button>
      <div style={{ opacity: isStale ? 0.6 : 1 }}>
        {tab === "watchlist" && <InstrumentList items={items} query={deferredQuery} />}
      </div>
    </section>
  );
}`,
      },
    },
    diagram: {
      kind: "sequence",
      code: `sequenceDiagram
  participant U as User
  participant R as React scheduler
  participant I as Search input
  participant G as Heavy list
  U->>R: types A
  R->>I: urgent render with A
  R->>G: background render with A
  Note over R,G: yields to the browser between components
  U->>R: types AB
  R->>I: urgent render with AB
  R--xG: abandon stale render for A
  R->>G: background render with AB
  G-->>R: commit when finished`,
      caption: {
        en: "Urgent input renders always win; the deferred list render is interrupted and restarted with the latest value.",
        vi: "Render của input khẩn cấp luôn được ưu tiên; render nền của danh sách bị ngắt và chạy lại với giá trị mới nhất.",
      },
    },
    memoryShortcut: {
      en: '"Priority, not speed": Transition = I own the setter; Deferred = I only have the value (plus memo); external stores stay sync.',
      vi: "“Ưu tiên, không phải tốc độ”: Transition = mình giữ setter; Deferred = mình chỉ có giá trị (kèm memo); external store luôn đồng bộ.",
    },
    keyTakeaway: {
      en: "useTransition and useDeferredValue keep urgent input responsive by making heavy renders interruptible, but they don't reduce work, can't time-slice external-store updates, and come after batching and virtualization.",
      vi: "useTransition và useDeferredValue giữ input phản hồi nhanh nhờ làm cho render nặng có thể bị ngắt, nhưng không giảm khối lượng công việc, không áp dụng cho update từ external store, và chỉ là lớp sau batching và virtualization.",
    },
    followUps: [
      {
        id: "isb-q11-f1",
        question: {
          en: "Our prices live in Zustand. Can I wrap the store update from the WebSocket handler in startTransition?",
          vi: "Giá đang nằm trong Zustand. Tôi có thể bọc update store từ WebSocket handler trong startTransition không?",
        },
        answer: {
          en: "It won't give you what you expect. Zustand subscribes through useSyncExternalStore, and React must render external-store changes synchronously to avoid tearing — different components showing different versions of the store. So a transition around set() is de-opted to a blocking render. Instead I'd keep the store update cheap and batched per animation frame, let the small live components such as last price subscribe directly, and for heavy derived views like analytics or a re-sorted grid, read the value and pass it through useDeferredValue into a memoized component. That gives the interruptibility where it actually matters.",
          vi: "Sẽ không như mong đợi. Zustand subscribe qua useSyncExternalStore, và React buộc phải render thay đổi của external store một cách đồng bộ để tránh tearing (các component hiển thị phiên bản store khác nhau). Vì vậy transition bọc quanh set() sẽ bị chuyển thành render chặn. Thay vào đó, tôi giữ update store nhẹ và batch theo animation frame, để các component nhỏ như last price subscribe trực tiếp, còn các view dẫn xuất nặng như analytics hay grid sắp xếp lại thì đọc giá trị rồi truyền qua useDeferredValue vào component đã memo.",
        },
      },
      {
        id: "isb-q11-f2",
        question: {
          en: "How is useDeferredValue different from debouncing the input?",
          vi: "useDeferredValue khác gì so với debounce input?",
        },
        answer: {
          en: "Debounce waits a fixed delay, say 250 ms, even on a fast machine, and does nothing to make the eventual render interruptible — if that render is long, it still blocks. useDeferredValue has no fixed delay: on a fast device the background render finishes almost immediately, and on a slow one React keeps the input responsive by interrupting stale renders. Debounce is still the right tool when the cost is outside React, like a network request per keystroke; there I debounce the request and use deferred rendering for the local list. They complement each other.",
          vi: "Debounce chờ một khoảng cố định, ví dụ 250 ms, kể cả trên máy nhanh, và không làm cho lần render sau đó có thể bị ngắt — render dài vẫn chặn. useDeferredValue không có độ trễ cố định: máy nhanh thì render nền xong gần như ngay, máy chậm thì React vẫn giữ input mượt bằng cách ngắt render cũ. Debounce vẫn đúng khi chi phí nằm ngoài React, như gọi API mỗi lần gõ phím; khi đó tôi debounce request và dùng deferred rendering cho danh sách cục bộ. Hai cách bổ trợ nhau.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement: "Low-latency, interactive dashboards under high-frequency real-time updates",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "Theoretical knowledge of React concurrent features. Do not claim you used them on a production trading screen; frame it as how you would apply them.",
        vi: "Kiến thức lý thuyết về concurrent features của React. Không nói đã dùng trên màn hình giao dịch production; trình bày là cách bạn sẽ áp dụng.",
      },
    },
    tags: ["react", "concurrent-rendering", "usetransition", "usedeferredvalue", "inp"],
  },

  /* ---------------------------------------------------------------- */
  /* Q12 — Browser rendering pipeline and layout thrashing             */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q12",
    number: 12,
    topicId: "react-performance",
    question: {
      en: "Walk me through the browser rendering pipeline. What is layout thrashing, and why do you prefer compositor-only animations for live price updates?",
      vi: "Hãy mô tả pipeline render của trình duyệt. Layout thrashing là gì, và vì sao bạn ưu tiên animation chỉ chạy ở compositor cho cập nhật giá realtime?",
    },
    answer:
      "I think of every frame as a pipeline: JavaScript, then style recalculation, layout, paint, and composite. The cost of a visual change depends on which stage it invalidates.\n\nChanging geometry — width, height, top, font size, inserting rows — invalidates layout, which then forces paint and composite. Changing only color or background skips layout but still repaints. Changing transform or opacity on an element with its own compositor layer can skip both, and the compositor thread handles it — that keeps running smoothly even when the main thread is busy. That's why I animate price flashes and sliding panels with opacity and transform, not with top or background-color transitions on hundreds of cells.\n\nLayout thrashing is the classic failure. Code writes a style, then reads offsetHeight or getBoundingClientRect, then writes again, in a loop. Each read forces the browser to run layout synchronously, so a loop over a thousand rows can trigger a thousand layouts in a single frame. The fix is to batch all reads first, then all writes, ideally inside requestAnimationFrame, or to use ResizeObserver instead of polling sizes.\n\nOn top of that, I use CSS containment — contain or content-visibility — so a change inside one panel doesn't invalidate layout for the whole dashboard. And I'm careful with will-change, because every extra layer costs GPU memory.\n\nTo verify, I record in the Performance panel and look for purple layout blocks flagged as forced reflow.",
    viExplanation:
      "Mỗi frame là một pipeline: JavaScript → style recalc → layout → paint → composite. Chi phí của một thay đổi giao diện phụ thuộc vào việc nó làm “bẩn” giai đoạn nào.\n\nThay đổi hình học (width, height, top, font-size, chèn thêm dòng) làm layout chạy lại, kéo theo paint và composite. Chỉ đổi màu hay background thì bỏ qua layout nhưng vẫn phải paint. Còn transform và opacity trên phần tử có compositor layer riêng có thể bỏ qua cả hai, do compositor thread xử lý — vẫn mượt kể cả khi main thread đang bận. Vì vậy hiệu ứng nháy giá hay trượt panel nên dùng opacity/transform, không dùng top hay transition background-color trên hàng trăm ô.\n\nLayout thrashing là lỗi kinh điển: ghi style, rồi đọc offsetHeight hoặc getBoundingClientRect, rồi lại ghi, trong một vòng lặp. Mỗi lần đọc buộc trình duyệt chạy layout đồng bộ (forced reflow), nên lặp qua một nghìn dòng có thể gây một nghìn lần layout trong một frame. Cách sửa: gom tất cả thao tác đọc trước, ghi sau, tốt nhất trong requestAnimationFrame, hoặc dùng ResizeObserver thay vì liên tục đo kích thước.\n\nThêm vào đó, dùng CSS containment (contain, content-visibility) để thay đổi trong một panel không làm layout lại cả dashboard, và hạn chế will-change vì mỗi layer tốn bộ nhớ GPU. Kiểm chứng bằng tab Performance, tìm các khối Layout bị cảnh báo forced reflow.",
    technicalExplanation: `### The pipeline, stage by stage
1. **JavaScript**: event handlers, React render and commit, timers.
2. **Style**: match selectors and compute styles for dirty elements. Cost grows with selector complexity and the number of affected nodes.
3. **Layout (reflow)**: compute geometry. It is often tree-wide because a parent's size depends on its children, so one changed cell can relayout a whole table without containment.
4. **Paint**: record draw commands for layers, then rasterize (often off the main thread).
5. **Composite**: the compositor thread assembles layers on the GPU and handles scrolling and transform or opacity animations.

At 60 Hz the browser has about 16.7 ms per frame for all of this. Work over 50 ms counts as a *long task* and hurts INP.

### What invalidates what
- Geometry (\`width\`, \`height\`, \`top\`, \`margin\`, \`font-size\`, DOM insertion): layout, then paint, then composite.
- Visual only (\`color\`, \`background\`, \`box-shadow\`): paint, then composite.
- \`transform\` and \`opacity\` on a promoted layer: composite only. They can animate smoothly even while the main thread is blocked by React work.

### Layout thrashing (forced synchronous layout)
- The browser normally defers layout until the frame. **Reading** a geometry property (\`offsetHeight\`, \`getBoundingClientRect\`, \`scrollTop\`, \`getComputedStyle\`) after a **write** forces it to compute layout *now*.
- An interleaved read-write loop over N elements means N layouts per frame, so cost grows with N times tree size.
- Fixes: read everything, then write everything; schedule writes in \`requestAnimationFrame\`; use \`ResizeObserver\` and \`IntersectionObserver\` instead of polling; in React, measure in one \`useLayoutEffect\` per list, not per row.

### Containment and layers
- \`contain: layout paint\` (or \`contain: strict\` with a fixed size) isolates a widget, so a ticking order book doesn't relayout the chart next to it.
- \`content-visibility: auto\` skips rendering of off-screen sections, which suits long report pages but not virtualized grids that already render only visible rows.
- \`will-change: transform\` promotes a layer. Overuse multiplies GPU memory and compositing cost; apply it to a handful of animating elements, not to every cell.

### Failure scenarios in a trading UI
- A price flash implemented as a \`background-color\` transition on thousands of cells means continuous paint and frame drops during volatile periods.
- Auto-sizing columns by measuring each cell after every update causes repeated forced reflows.
- Tooltips positioned with \`getBoundingClientRect\` inside a scroll handler thrash on every scroll event.

### Debugging
- Chrome Performance panel: purple *Layout* blocks with a "Forced reflow" warning, and green *Paint* blocks.
- Rendering tab: *Paint flashing* and *Layer borders* to see what repaints and which layers exist.`,
    practicalExample: {
      description: {
        en: "Interleaved reads and writes cause one forced layout per row; batching reads then writes in a single animation frame causes one layout. The price flash animates opacity on an overlay, so it stays on the compositor.",
        vi: "Đọc và ghi xen kẽ gây một lần layout cưỡng bức cho mỗi dòng; gom đọc trước, ghi sau trong một animation frame chỉ gây một lần layout. Hiệu ứng nháy giá animate opacity trên lớp phủ nên chỉ chạy ở compositor.",
      },
      code: {
        language: "ts",
        code: `// BAD: read -> write -> read -> write forces a synchronous layout per row.
export function growRowsBad(rows: HTMLElement[]): void {
  for (const row of rows) {
    const h = row.offsetHeight;        // read: forces layout if styles are dirty
    row.style.height = h + 4 + "px";   // write: invalidates layout again
  }
}

// GOOD: all reads, then all writes, inside one animation frame.
export function growRowsGood(rows: HTMLElement[]): void {
  requestAnimationFrame(() => {
    const heights = rows.map((r) => r.offsetHeight); // one layout
    rows.forEach((r, i) => {
      r.style.height = heights[i] + 4 + "px";         // writes only
    });
  });
}

// Compositor-only price flash: animate an overlay's opacity, not background-color.
// CSS: .cell { position: relative; contain: paint; }
//      .flash { position: absolute; inset: 0; opacity: 0; pointer-events: none; }
export function flashPrice(overlay: HTMLElement, direction: "up" | "down"): void {
  overlay.dataset.dir = direction; // color set by CSS once, not animated
  overlay.animate([{ opacity: 0.5 }, { opacity: 0 }], {
    duration: 400,
    easing: "ease-out",
  });
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  JS["JavaScript and React commit"] --> ST["Style recalc"]
  ST --> LA["Layout"]
  LA --> PA["Paint"]
  PA --> CO["Composite on GPU"]
  W["width, top, inserted rows"] -.->|"invalidates"| LA
  C["color, background"] -.->|"invalidates"| PA
  T["transform, opacity"] -.->|"compositor only"| CO
  R["Read offsetHeight after a write"] -.->|"forced sync layout"| LA`,
      caption: {
        en: "Each property change re-enters the pipeline at a different stage; transform and opacity skip layout and paint, while read-after-write forces layout immediately.",
        vi: "Mỗi thay đổi thuộc tính đi vào pipeline ở một giai đoạn khác nhau; transform và opacity bỏ qua layout và paint, còn đọc-sau-ghi buộc layout chạy ngay lập tức.",
      },
    },
    memoryShortcut: {
      en: '"JS-S-L-P-C" (Just Style Lets Pixels Compose) — and "read all, then write all" to avoid thrashing.',
      vi: "“JS-S-L-P-C” (JavaScript, Style, Layout, Paint, Composite) — và “đọc hết rồi mới ghi” để tránh thrashing.",
    },
    keyTakeaway: {
      en: "Know which pipeline stage a change invalidates: animate with transform and opacity, batch DOM reads before writes, and contain widgets so one ticking panel doesn't relayout the whole dashboard.",
      vi: "Biết thay đổi nào làm bẩn giai đoạn nào trong pipeline: animate bằng transform và opacity, gom đọc DOM trước khi ghi, và dùng containment để một panel đang cập nhật không làm layout lại cả dashboard.",
    },
    followUps: [
      {
        id: "isb-q12-f1",
        question: {
          en: "Why can a transform animation stay smooth while the main thread is blocked, but a top animation can't?",
          vi: "Vì sao animation bằng transform vẫn mượt khi main thread bị chặn, còn animation bằng top thì không?",
        },
        answer: {
          en: "Because they run on different threads. Animating top changes geometry, so every frame needs style, layout and paint on the main thread — if React is busy with a 100 ms render, those frames simply don't happen and the animation stutters. A transform or opacity animation on a promoted layer, declared via CSS or the Web Animations API, is handed to the compositor thread. The compositor only re-composes existing rasterized layers with a new matrix or alpha, so it keeps producing frames independent of main-thread JavaScript. The caveat is that JS-driven animations using requestAnimationFrame still depend on the main thread.",
          vi: "Vì chúng chạy trên các thread khác nhau. Animate top làm đổi hình học, nên mỗi frame cần style, layout và paint trên main thread — nếu React đang render mất 100 ms thì các frame đó không được tạo và animation bị giật. Animation transform hoặc opacity trên layer riêng, khai báo bằng CSS hoặc Web Animations API, được giao cho compositor thread. Compositor chỉ ghép lại các layer đã rasterize với ma trận hoặc alpha mới, nên vẫn tạo frame độc lập với JavaScript trên main thread. Lưu ý: animation điều khiển bằng JS qua requestAnimationFrame vẫn phụ thuộc main thread.",
        },
      },
    ],
    difficulty: "medium",
    priority: "critical",
    jdRequirement: "Deep understanding of browser rendering mechanics and DOM manipulation for large datasets",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "Browser-internals knowledge. Explain it as how you reason about rendering; don't attribute specific layout-thrashing fixes or frame-rate numbers to past projects unless you have a real example.",
        vi: "Kiến thức về cơ chế bên trong trình duyệt. Trình bày như cách bạn suy luận về rendering; không gán việc sửa layout thrashing hay số liệu FPS cụ thể cho dự án cũ nếu không có ví dụ thật.",
      },
    },
    tags: ["browser-rendering", "layout-thrashing", "compositor", "css-containment", "performance"],
  },

  /* ---------------------------------------------------------------- */
  /* Q13 — Virtualized table for 100k+ rows with live updates          */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q13",
    number: 13,
    topicId: "react-performance",
    question: {
      en: "Design a virtualized table that shows 100k+ trades with live updates. How do you handle row heights, sticky headers and keeping the scroll position stable?",
      vi: "Thiết kế một bảng virtualized hiển thị hơn 100 nghìn giao dịch với cập nhật realtime. Bạn xử lý chiều cao dòng, sticky header và giữ vị trí scroll ổn định như thế nào?",
    },
    answer:
      "For 100k rows the rule is simple: never put 100k rows in the DOM. I render only what's visible plus a small overscan — typically a few dozen rows — inside a scroll container with a spacer sized to the full height, and I position rows with transforms.\n\nThen there are four decisions I'd make explicitly.\n\nRow height. Fixed heights make offset math O(1) and scrolling rock-solid. Variable heights need measurement and cached offsets, which costs more and causes jumps, so for a blotter I push hard for fixed rows.\n\nData flow. The table shouldn't re-render on every tick. I keep row data in a store keyed by id; the virtualizer only works with the ordered id list, and each visible row subscribes to its own id. A price tick updates one row, not the table. Re-sorting on live data is throttled, otherwise rows jump under the user's cursor.\n\nScroll stability. New trades arriving at the top would push content down. If the user is at the top, I let them flow in. If they've scrolled away, I either compensate scrollTop by the inserted height, or pause insertion and show a 'new trades' pill they can click.\n\nHeaders and accessibility. The header is position sticky inside the scroll container, and I use role grid with aria-rowcount and aria-rowindex so screen readers know the real size, because off-screen rows don't exist in the DOM.\n\nI'd build on TanStack Virtual or a proven grid like AG Grid rather than hand-roll it, and validate by profiling while scrolling during a burst of updates.",
    viExplanation:
      "Nguyên tắc với 100 nghìn dòng: không bao giờ đưa 100 nghìn dòng vào DOM. Chỉ render những dòng đang nhìn thấy cộng thêm một ít overscan (vài chục dòng) trong một scroll container, có một phần tử spacer cao bằng tổng chiều cao, và định vị các dòng bằng transform.\n\nBốn quyết định cần nói rõ:\n\n1. Chiều cao dòng: chiều cao cố định giúp tính offset O(1), scroll rất ổn định. Chiều cao thay đổi cần đo và cache offset, tốn hơn và dễ “nhảy”, nên với blotter nên cố gắng dùng dòng cố định.\n\n2. Luồng dữ liệu: bảng không được re-render mỗi tick. Lưu dữ liệu dòng trong store theo id; virtualizer chỉ làm việc với danh sách id đã sắp xếp, mỗi dòng đang hiển thị subscribe đúng id của nó. Một tick giá chỉ cập nhật một dòng. Việc sort lại trên dữ liệu live cần throttle, nếu không các dòng sẽ nhảy dưới con trỏ chuột của người dùng.\n\n3. Ổn định scroll: trade mới chèn lên đầu sẽ đẩy nội dung xuống. Nếu người dùng đang ở đầu bảng thì cho chảy vào; nếu đã scroll đi chỗ khác thì bù scrollTop theo chiều cao đã chèn, hoặc tạm giữ và hiện nút “có trade mới”.\n\n4. Header và accessibility: header dùng position sticky trong scroll container; dùng role grid với aria-rowcount và aria-rowindex để screen reader biết kích thước thật, vì các dòng ngoài màn hình không tồn tại trong DOM.",
    technicalExplanation: `### Windowing mechanics
- A scroll container with a fixed height holds a **spacer** of \`count × rowHeight\` pixels, which gives a native scrollbar with the right size.
- On scroll, compute \`start = floor(scrollTop / rowHeight)\` and \`end = start + ceil(viewport / rowHeight)\`, then add **overscan** (5–15 rows) on both sides so fast scrolling doesn't flash blank space.
- Visible rows are absolutely positioned with \`transform: translateY(...)\`, which stays cheap for the compositor. DOM size stays constant (tens of rows) whether the dataset has 1k or 1M rows.
- Browsers cap element height (on the order of millions of pixels in some engines). At very large counts with tall rows, libraries scale the spacer or use paging.

### Row heights
- **Fixed**: O(1) offsets, no measurement, no layout reads. Best for blotters.
- **Variable or measured**: requires a \`ResizeObserver\` per rendered row, a prefix-sum offset cache and scroll correction when a measured size differs from the estimate. Expect jank when estimates are poor.
- Expandable detail rows: keep the base row fixed and render details in an overlay or a separate panel where possible.

### Live updates at scale
- Normalize: \`Map<id, Row>\` plus an **ordered id array**. Ticks mutate entries; only membership or sort changes touch the id array.
- Visible rows subscribe by id with memoized row components, so the per-tick cost is proportional to *visible changed rows*, not the dataset.
- Sorting 100k rows is O(n log n). Throttle re-sorts (for example a few times per second), or maintain order incrementally with binary insertion for append-mostly feeds. Heavy sorting and filtering can move to a Web Worker.
- Cap retained history (a ring buffer or server-side paging) so memory doesn't grow without limit in a long session.

### Scroll stability
- Inserting above the viewport shifts content. Native \`overflow-anchor\` doesn't help with absolutely positioned virtual rows.
- Strategies: (1) if at top, auto-follow; (2) otherwise add \`inserted × rowHeight\` to \`scrollTop\` in the same frame; (3) or buffer inserts and show a "N new trades" affordance. Option 3 is the most predictable for traders.
- Keep the key as the trade id, so focus and selection survive re-sorts.

### Sticky headers and columns
- \`position: sticky\` header inside the scroll container; sticky first column for symbol. Horizontal virtualization is only worth it beyond a few dozen columns.

### Accessibility and UX trade-offs
- \`role="grid"\`, \`aria-rowcount\` (total), \`aria-rowindex\` (absolute index) and roving-tabindex keyboard navigation.
- Browser find (Ctrl+F) can't see unrendered rows, so provide in-grid search. Printing and export must use the data, not the DOM.

### Build versus buy
- TanStack Virtual (headless, small) fits custom designs; AG Grid offers built-in virtualization, delta row updates, pinned columns and keyboard support at the cost of bundle size and licensing for enterprise features.`,
    practicalExample: {
      description: {
        en: "A trade blotter built on TanStack Virtual: fixed row height, stable keys from trade ids, a sticky header inside the scroll container, and grid ARIA attributes that expose the real row count.",
        vi: "Trade blotter dùng TanStack Virtual: chiều cao dòng cố định, key ổn định từ trade id, sticky header nằm trong scroll container, và các thuộc tính ARIA của grid cho biết tổng số dòng thật.",
      },
      code: {
        language: "tsx",
        code: `import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

type Trade = { id: string; symbol: string; price: number; qty: number };
const ROW_HEIGHT = 28;

export function TradeBlotter({ trades }: { trades: Trade[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: trades.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT, // fixed height: O(1) offsets, no measuring
    overscan: 10,
    getItemKey: (index) => trades[index].id, // identity survives inserts and sorts
  });

  return (
    <div ref={scrollRef} role="grid" aria-rowcount={trades.length + 1}
      style={{ height: 600, overflow: "auto", contain: "strict" }}>
      <div role="row" aria-rowindex={1} style={{ position: "sticky", top: 0, zIndex: 1, height: ROW_HEIGHT }}>
        <span role="columnheader">Symbol</span>
        <span role="columnheader">Price</span>
        <span role="columnheader">Qty</span>
      </div>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((item) => {
          const t = trades[item.index];
          return (
            <div key={item.key} role="row" aria-rowindex={item.index + 2}
              style={{ position: "absolute", top: 0, width: "100%", height: ROW_HEIGHT,
                transform: "translateY(" + item.start + "px)" }}>
              <span role="gridcell">{t.symbol}</span>
              <span role="gridcell">{t.price}</span>
              <span role="gridcell">{t.qty}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  WS["Live trade and price stream"] --> ST["Row store keyed by trade id"]
  ST --> IDX["Ordered id list, throttled re-sort"]
  SC["Scroll offset and viewport height"] --> V["Virtualizer - visible range plus overscan"]
  IDX --> V
  V --> SP["Spacer sized to count times row height"]
  V --> DOM["A few dozen row elements positioned with translateY"]
  ST -->|"per-id subscription"| DOM
  NEW["New trades arrive at top"] --> AT{"User scrolled to top?"}
  AT -- "Yes" --> IDX
  AT -- "No" --> PILL["Buffer inserts and show new trades pill"]`,
      caption: {
        en: "Only the visible window becomes DOM; ticks flow to rows by id, and top inserts are buffered when the user has scrolled away.",
        vi: "Chỉ cửa sổ đang hiển thị mới thành DOM; tick đi tới từng dòng theo id, và trade mới chèn đầu bảng được giữ lại khi người dùng đã scroll đi chỗ khác.",
      },
    },
    memoryShortcut: {
      en: '"Window, Fixed, Keyed, Anchored": render a window, fix row heights, key by id and subscribe by id, anchor the scroll on inserts.',
      vi: "“Window, Fixed, Keyed, Anchored”: chỉ render cửa sổ, cố định chiều cao dòng, key và subscribe theo id, giữ neo scroll khi chèn dòng.",
    },
    keyTakeaway: {
      en: "A 100k-row live blotter stays fast when DOM size is constant (windowing), per-tick cost is limited to visible changed rows (id-keyed subscriptions), and inserts never yank the user's scroll position.",
      vi: "Blotter realtime 100 nghìn dòng vẫn nhanh khi số node DOM là hằng số (windowing), chi phí mỗi tick chỉ giới hạn ở các dòng đang hiển thị có thay đổi (subscribe theo id), và việc chèn dòng không bao giờ làm nhảy vị trí scroll.",
    },
    followUps: [
      {
        id: "isb-q13-f1",
        question: {
          en: "The product team wants rows of different heights because some trades show extra details. What changes?",
          vi: "Team product muốn các dòng có chiều cao khác nhau vì một số trade hiển thị thêm chi tiết. Điều gì thay đổi?",
        },
        answer: {
          en: "Offsets stop being simple multiplication. The virtualizer needs an estimated size, then measures each rendered row with a ResizeObserver and keeps a cached offset table. When a measured height differs from the estimate above the viewport, it must correct scrollTop or content jumps. That adds layout reads and some jank during fast scrolling. I'd first push back on the design: keep base rows fixed and show details in an expandable panel or side drawer. If variable rows are truly needed, I'd keep the variety small, make estimates accurate per row type, and avoid measuring during live tick updates.",
          vi: "Offset không còn là phép nhân đơn giản. Virtualizer cần một kích thước ước lượng, sau đó đo từng dòng đã render bằng ResizeObserver và lưu bảng offset. Khi chiều cao đo được khác ước lượng ở phía trên viewport, phải bù scrollTop, nếu không nội dung sẽ nhảy. Điều đó thêm thao tác đọc layout và có thể giật khi scroll nhanh. Trước hết tôi sẽ trao đổi lại thiết kế: giữ dòng cơ bản cố định và hiển thị chi tiết trong panel mở rộng hoặc drawer bên cạnh. Nếu thực sự cần, giới hạn số loại dòng, ước lượng chính xác theo từng loại và tránh đo trong lúc tick đang cập nhật.",
        },
      },
      {
        id: "isb-q13-f2",
        question: {
          en: "Would you build this yourself or use AG Grid?",
          vi: "Bạn sẽ tự xây hay dùng AG Grid?",
        },
        answer: {
          en: "It depends on the feature list. If the blotter needs column pinning, resizing, grouping, keyboard navigation, cell editing and Excel-style filtering, AG Grid gives that out of the box, with transaction-based delta updates designed for streaming data. The costs are bundle size, a styling model to fight, and licensing for enterprise features. If the table is a focused, custom-designed view inside a design system, a headless virtualizer like TanStack Virtual plus our own row components is lighter and fully controllable. I'd prototype both against a recorded high-volume feed and decide on measured scroll smoothness and developer effort.",
          vi: "Tuỳ danh sách tính năng. Nếu blotter cần pin cột, resize, grouping, điều hướng bàn phím, sửa ô và filter kiểu Excel, AG Grid có sẵn tất cả, kèm cơ chế cập nhật theo transaction dành cho dữ liệu streaming. Đổi lại là bundle lớn, phải “vật lộn” với cách styling của nó, và license cho tính năng enterprise. Nếu bảng là một view tập trung, thiết kế riêng trong design system, thì virtualizer headless như TanStack Virtual cùng component dòng tự viết sẽ nhẹ và kiểm soát hoàn toàn. Tôi sẽ prototype cả hai với một feed khối lượng lớn đã ghi lại và quyết định dựa trên độ mượt đo được và công sức phát triển.",
        },
      },
    ],
    difficulty: "hard",
    priority: "critical",
    jdRequirement: "Virtualized lists/tables for large datasets with high-frequency updates",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "Present as a recommended design. You can genuinely connect the grid ARIA and keyboard-navigation points to your WCAG/ARIA work at Persefoni, but do not claim you built a 100k-row live virtualized blotter.",
        vi: "Trình bày như thiết kế đề xuất. Có thể liên hệ thật phần ARIA và điều hướng bàn phím với kinh nghiệm WCAG/ARIA tại Persefoni, nhưng không nói đã xây blotter virtualized realtime 100 nghìn dòng.",
      },
    },
    tags: ["virtualization", "tables", "tanstack-virtual", "accessibility", "real-time"],
  },
];
