import type { InterviewQuestion } from "@/domain/package/schema";

/**
 * ISB Vietnam — Section 7, topic "state-nextjs" (questions 26–30).
 * State management for high-frequency data, TanStack Query, Next.js App Router
 * rendering choices and optimistic order placement.
 */
export const stateNextjsQuestions: InterviewQuestion[] = [
  /* ---------------------------------------------------------------- */
  /* Q26 — Zustand vs Redux Toolkit vs Context                         */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q26",
    number: 26,
    topicId: "state-nextjs",
    question: {
      en: "Zustand vs Redux Toolkit vs React Context for high-frequency state: how do you choose, and how do selectors and transient updates (subscribing without re-rendering) keep a live dashboard fast?",
      vi: "Zustand, Redux Toolkit hay React Context cho state cập nhật tần suất cao: bạn chọn thế nào, và selector cùng transient update (subscribe mà không re-render) giúp dashboard real-time nhanh ra sao?",
    },
    answer:
      "I'd frame it around one question: who needs to know when a value changes? With high-frequency state, that's the whole game. Context is a dependency-injection tool, not a state manager. When the provider value changes, every consumer re-renders and there's no built-in selector, so I use Context for theme, locale or the current account, never for ticks. Redux Toolkit and Zustand both sit on useSyncExternalStore and support selectors, so a component only re-renders when its selected slice changes by reference. Redux Toolkit gives me strict structure, Immer reducers, great devtools and RTK Query, which matters on a large team. Zustand gives me the same selector model with much less ceremony and a vanilla store I can subscribe to outside React. For the live market slice of a trading dashboard I'd usually pick Zustand and do three things. First, never write each tick to the store; buffer ticks and flush once per animation frame. Second, keep selectors narrow: a row subscribes to one symbol, not the whole quotes map, and I wrap selectors that return new arrays or objects in useShallow. Third, for the hottest cells, like a flashing last price, I use a transient update: subscribe to the store in an effect and write to a DOM ref, so React doesn't re-render at all. The failure mode I watch for is a selector that returns a fresh object every call. It re-renders on every flush, and in newer Zustand versions it can even trigger an infinite render loop.",
    viExplanation:
      "Ý chính: với state thay đổi hàng trăm lần mỗi giây, câu hỏi quan trọng nhất là component nào thật sự cần biết khi giá trị đổi. React Context thực chất là cơ chế dependency injection: mỗi lần value của Provider đổi, mọi consumer đều re-render và không có selector, nên chỉ dùng cho theme, locale, account hiện tại. Redux Toolkit và Zustand đều dựa trên useSyncExternalStore và có selector, nên component chỉ re-render khi phần state nó chọn đổi reference. Redux Toolkit mạnh về cấu trúc, Immer, devtools và RTK Query, hợp với team lớn. Zustand gọn hơn, và quan trọng là có vanilla store để subscribe bên ngoài React. Với market data, mình trình bày ba kỹ thuật: gom tick trong buffer rồi flush một lần mỗi frame bằng requestAnimationFrame; selector hẹp theo từng symbol, dùng useShallow khi selector trả về object hoặc mảng mới; và transient update, tức subscribe store trong useEffect rồi ghi thẳng vào DOM qua ref cho những ô giá nhấp nháy, React không phải re-render. Lỗi hay gặp nhất là selector trả về object mới mỗi lần gọi, khiến component re-render liên tục hoặc thậm chí lặp vô hạn. Khi trả lời, nhấn mạnh tiêu chí chọn công cụ thay vì nói thư viện nào tốt hơn.",
    technicalExplanation: `### How subscriptions actually work
- **Context**: React compares the Provider \`value\` with \`Object.is\`. If it changed, React walks the tree and schedules a re-render for **every** consumer of that context, whatever part of the value it reads. Splitting into many contexts helps a little but doesn't scale to thousands of symbols.
- **Redux Toolkit / Zustand**: both are external stores read through \`useSyncExternalStore\`. On each store change, every subscribed hook re-runs its selector and compares the result (\`===\` by default, or a custom equality). Only components whose selected value changed re-render. Running selectors is cheap; re-rendering is the expensive part.
- **Transient updates**: Zustand exposes \`store.subscribe\` (with the \`subscribeWithSelector\` middleware for slice subscriptions). A component can subscribe in an effect and mutate a DOM node through a ref. React never renders, so there's no reconciliation cost. Use it only for leaf display cells, because React no longer "owns" that text.

### Choosing
| Need | Good fit |
| --- | --- |
| Rarely changing app-wide values (theme, locale, auth user) | Context |
| Large team, strict conventions, time-travel debugging, RTK Query | Redux Toolkit |
| Hot, high-frequency slices; subscriptions outside React; little boilerplate | Zustand |
| Many independent fine-grained pieces with derived values | Jotai (atoms) |

These can coexist: Context injects a store **instance**, not its changing values.

### Making high-frequency writes cheap
- **Batch before the store**: a socket can deliver hundreds of messages per second, but a 60 Hz display only shows about 60 frames per second (around 16.7 ms each). Coalesce ticks per symbol in a buffer and call \`set\` once per \`requestAnimationFrame\`.
- **Normalize by id**: \`quotes[symbol]\` means an update replaces one object reference. Selectors on other symbols return the same reference, so those components bail out.
- **Watch copy cost**: \`{ ...state.quotes, ...batch }\` is O(n) in the number of symbols per flush. That's fine for a few thousand keys at 60 Hz. For much larger universes, use per-symbol stores, a \`Map\` with a version counter, or keep raw data in a worker and only expose visible rows.

### Failure scenarios
- **Unstable selector output**: \`useStore(s => ({ bid: s.bid, ask: s.ask }))\` creates a new object every time, so it re-renders on every flush. In Zustand v5 it can cause a "Maximum update depth" loop. Fix it with \`useShallow\` or separate primitive selectors.
- **Selecting the whole map** in a parent and passing it down defeats the point, because the whole grid re-renders each frame.
- **Transient subscriptions without cleanup** leak listeners when rows unmount, which is common with virtualized tables. Always return the unsubscribe function from the effect.
- **Mixing concerns**: putting server snapshots, UI flags and ticks in one giant store makes every action touch everything. Split slices or stores by update frequency.

### Maintainability
Expose **hooks, not the store**: \`useQuote(symbol)\`, \`useLastPrice(symbol)\`. That lets you change the internals (buffering, workers, a different library) without touching hundreds of components.`,
    practicalExample: {
      description: {
        en: "A Zustand market store that receives one batched write per animation frame, a narrow per-symbol selector, a useShallow selector for derived lists, and a transient subscription that updates a price cell without re-rendering React.",
        vi: "Store Zustand cho market data: nhận một lần ghi gộp mỗi frame, selector hẹp theo symbol, useShallow cho danh sách dẫn xuất, và transient subscription cập nhật ô giá mà không re-render React.",
      },
      code: {
        language: "tsx",
        code: `import { useEffect, useRef } from "react";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

type Quote = { bid: number; ask: number; ts: number };
type MarketState = {
  quotes: Record<string, Quote>;
  applyBatch: (batch: Record<string, Quote>) => void; // called once per rAF flush
};

export const useMarket = create<MarketState>()(
  subscribeWithSelector((set) => ({
    quotes: {},
    applyBatch: (batch) => set((s) => ({ quotes: { ...s.quotes, ...batch } })),
  })),
);

// Re-renders only when THIS symbol's quote object is replaced
export const useQuote = (symbol: string) => useMarket((s) => s.quotes[symbol]);

// Derived list: useShallow prevents re-renders when the keys are unchanged
export const useSymbols = () => useMarket(useShallow((s) => Object.keys(s.quotes)));

// Transient update: the DOM text changes, React does not re-render
export function LastBid({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      useMarket.subscribe(
        (s) => s.quotes[symbol]?.bid,
        (bid) => {
          if (ref.current && bid !== undefined) ref.current.textContent = bid.toFixed(2); // display only
        },
        { fireImmediately: true },
      ),
    [symbol],
  );
  return <span ref={ref} className="tabular-nums" />;
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  WS["WebSocket ticks"] --> BUF["Tick buffer, coalesce per symbol"]
  BUF -->|"one flush per frame"| STORE["Zustand store"]
  STORE -->|"selector result changed"| ROW1["Row AAPL re-renders"]
  STORE -->|"selector result same ref"| ROW2["Row MSFT bails out"]
  STORE -->|"store.subscribe outside React"| CELL["Price cell ref, no re-render"]
  CTX["React Context value"] -->|"any change"| ALL["Every consumer re-renders"]`,
      caption: {
        en: "Selectors decide who re-renders; transient subscriptions skip React entirely; Context re-renders every consumer.",
        vi: "Selector quyết định component nào re-render; transient subscription bỏ qua React hoàn toàn; Context thì re-render mọi consumer.",
      },
    },
    memoryShortcut: {
      en: "BNT: Buffer the ticks, Narrow the selectors, Transient for the hottest cells. Context is for config, not for prices.",
      vi: "BNT: Buffer tick, Narrow selector (selector hẹp), Transient cho ô nóng nhất. Context dành cho config, không dành cho giá.",
    },
    keyTakeaway: {
      en: "For high-frequency data, pick a selector-based external store, batch writes per frame, and bypass React for the hottest cells. Keep Context for rarely changing values.",
      vi: "Với dữ liệu tần suất cao, hãy dùng external store có selector, gộp ghi theo frame và bỏ qua React cho ô nóng nhất; Context chỉ dành cho giá trị ít thay đổi.",
    },
    followUps: [
      {
        id: "isb-q26-f1",
        question: {
          en: "The JD also lists Jotai. When would you choose Jotai over Zustand?",
          vi: "JD cũng nhắc tới Jotai. Khi nào bạn chọn Jotai thay vì Zustand?",
        },
        answer: {
          en: "Jotai is bottom-up: state is a graph of small atoms, and derived atoms recompute only when their dependencies change. That's attractive when you have many independent, fine-grained pieces, like per-widget settings in a configurable dashboard or complex form state with lots of derived values. You get precise re-renders without writing selectors. The trade-off for streaming data is lifecycle: an atomFamily per symbol must be cleaned up explicitly or it grows forever, and fanning one socket out to many atoms is less direct than one store with a per-frame flush. So I'd use Zustand for the market-data pipeline and would be happy with Jotai for UI and derived state.",
          vi: "Jotai đi từ dưới lên: state là đồ thị các atom nhỏ, derived atom chỉ tính lại khi dependency đổi. Hợp với nhiều mảnh state độc lập, chi tiết như setting từng widget hoặc form phức tạp có nhiều giá trị dẫn xuất, re-render chính xác mà không cần viết selector. Nhược điểm với dữ liệu streaming là vòng đời: atomFamily theo symbol phải dọn dẹp thủ công nếu không sẽ phình mãi, và fan-out một socket ra nhiều atom kém trực tiếp hơn một store flush theo frame. Vì vậy mình dùng Zustand cho pipeline market data, còn Jotai rất ổn cho UI state và derived state.",
        },
      },
      {
        id: "isb-q26-f2",
        question: {
          en: "How would you prove, in a test, that a row doesn't re-render when an unrelated symbol ticks?",
          vi: "Làm sao chứng minh bằng test rằng một row không re-render khi symbol khác nhảy giá?",
        },
        answer: {
          en: "I'd wrap the row in React's Profiler component, or increment a render counter inside it, and render it with React Testing Library. Then I call the store's setState directly, inside act, to update a different symbol, and assert that the onRender callback or the counter didn't change. Next I update the row's own symbol and assert that it rendered exactly once more. That turns 'selectors are narrow' into a regression test, so a refactor that selects the whole map fails CI. During development I'd back it up with React DevTools' highlight-updates option and the Profiler flame chart on a recorded tick stream.",
          vi: "Bọc row trong component Profiler của React, hoặc đặt một biến đếm số lần render, rồi render bằng React Testing Library. Gọi trực tiếp setState của store trong act để cập nhật một symbol khác, sau đó assert onRender hoặc biến đếm không đổi. Tiếp theo cập nhật đúng symbol của row và assert nó render thêm đúng một lần. Như vậy nguyên tắc 'selector hẹp' trở thành regression test: ai refactor sang select cả map thì CI sẽ fail. Khi dev thì bổ sung bằng highlight updates của React DevTools và flame chart của Profiler.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement:
      "Modern React state management (Zustand / Redux Toolkit / Jotai) for high-frequency real-time updates",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "Zustand and Redux are in the candidate's skill list, but production use in a high-frequency trading context is not verified. Present this as your design approach and reasoning. Don't claim you built a tick store in production.",
        vi: "Zustand và Redux có trong danh sách kỹ năng nhưng chưa có kinh nghiệm production trong bối cảnh trading tần suất cao. Hãy trình bày như cách tiếp cận và lập luận thiết kế, không nói đã xây tick store ở production.",
      },
    },
    tags: ["zustand", "redux-toolkit", "context", "selectors", "re-render"],
  },

  /* ---------------------------------------------------------------- */
  /* Q27 — TanStack Query server state + WebSocket merge               */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q27",
    number: 27,
    topicId: "state-nextjs",
    question: {
      en: "TanStack Query: how do you separate server state from client state, what is the difference between staleTime and gcTime, and how do you merge WebSocket updates into the cache with setQueryData?",
      vi: "TanStack Query: bạn tách server state và client state thế nào, staleTime khác gcTime ra sao, và làm sao merge cập nhật WebSocket vào cache bằng setQueryData?",
    },
    answer:
      "I separate state by who owns the truth. Server state, like positions, orders and reference data, is owned by the backend. My cache is a copy that can go stale. Client state, like the selected symbol, layout or form drafts, is owned by the browser. TanStack Query handles the first kind; a small store like Zustand handles the second. People often confuse staleTime and gcTime. staleTime is how long data counts as fresh. While it's fresh, mounting a component or refocusing the window won't refetch, and the default is zero. gcTime is how long an unused query stays in memory after its last observer unmounts, five minutes by default, so navigating back feels instant. For live data I combine REST and WebSocket. The REST call gives me a snapshot, then socket events patch the cache with setQueryData. I patch immutably, so structural sharing keeps unchanged rows referentially equal and only the changed rows re-render. Because the socket keeps the data fresh, I set a long staleTime to avoid pointless refetches. On reconnect I invalidate the query to resync, because I may have missed events. There are two caveats. An event that arrives before the snapshot has nothing to patch, so I either buffer it or rely on the refetch. And I don't route tick-level data through the query cache, because that's the streaming store's job. At Persefoni I worked with TanStack Query on top of GraphQL, including background prefetching and caching, so these cache semantics are something I've used directly.",
    viExplanation:
      "Nguyên tắc đầu tiên: tách state theo việc ai giữ sự thật. Server state (positions, orders, reference data) thuộc về backend, cache phía client chỉ là bản sao có thể cũ. Client state (symbol đang chọn, layout, form nháp) thuộc về trình duyệt. TanStack Query lo phần đầu, Zustand lo phần sau. staleTime là thời gian dữ liệu được coi là còn tươi: trong khoảng này, mount lại component hay focus lại cửa sổ sẽ không refetch. Mặc định là 0. gcTime là thời gian một query không còn observer được giữ trong bộ nhớ, mặc định 5 phút, giúp quay lại trang hiển thị ngay. Với dữ liệu real-time, REST trả về snapshot, sau đó event từ WebSocket vá cache bằng setQueryData theo kiểu immutable. Nhờ structural sharing, row không đổi giữ nguyên reference nên chỉ row thay đổi re-render. Vì socket đã giữ dữ liệu tươi, đặt staleTime dài; khi reconnect thì invalidateQueries để đồng bộ lại vì có thể đã mất event. Lưu ý: event đến trước snapshot thì không có gì để vá, và tick tần suất cao không nên đi qua query cache. Phần Persefoni là kinh nghiệm thật (TanStack Query, GraphQL, prefetching, caching), nhưng phần merge WebSocket là cách tiếp cận đề xuất.",
    technicalExplanation: `### Mental model
- **QueryCache** holds one \`Query\` per serialized \`queryKey\`. Each \`useQuery\` is an **observer**. A query with zero observers is "inactive", and its \`gcTime\` timer starts.
- **staleTime** (default \`0\`) only decides whether a *trigger* causes a background refetch. Triggers include a new observer mounting, window focus, the browser going back online, or \`invalidateQueries\`. Stale data is still shown immediately.
- **gcTime** (default 5 minutes, named \`cacheTime\` before v5) decides when inactive data is removed from memory. A long \`staleTime\` with a short \`gcTime\` is valid: fresh while used, freed soon after.

### Merging push updates
- \`setQueryData(key, updater)\` writes to the cache synchronously and then notifies observers (notifications are batched by TanStack Query's notifyManager). The updater **must return a new reference** for changed data and the **same reference** for unchanged data. Never mutate \`old\`.
- **Structural sharing** (on by default) deep-compares new data with old and reuses unchanged sub-trees. Combined with \`React.memo\` rows, only changed rows re-render. The comparison is O(size of the data), which is fine for hundreds of positions and wasteful at tick frequency.
- Use **versions or sequence numbers** in events. Drop an event if \`incoming.version <= current.version\`, because it's a duplicate or arrived out of order.
- \`select\` derives a view (for example, only open positions) per observer, and observers re-render only if the selected result changes.

### Reconnect and resync
1. While disconnected, mark the data as possibly stale in the UI.
2. On reconnect, call \`invalidateQueries({ queryKey })\` to fetch a fresh snapshot.
3. **Race**: socket events applied during the refetch can be newer than the snapshot. Either buffer events until the snapshot resolves and then replay those with \`seq > snapshot.seq\`, or keep per-row versions so the merge never goes backwards.

### Trade-offs and failure scenarios
- **Default staleTime 0 with live data** causes refetch storms on every focus or mount. Set \`staleTime: Infinity\` (or minutes) when a socket keeps the data fresh.
- **Event before snapshot**: \`old\` is \`undefined\` and the updater must return it unchanged. Otherwise you create a partial list that looks complete.
- **Key mismatch**: patching \`["positions", id]\` while the UI reads \`["positions", id, filters]\` silently does nothing. Centralize keys in a factory.
- **Ticks in the query cache**: each write notifies observers and runs structural sharing. At hundreds of writes per second this is wasted CPU, so ticks belong in a dedicated store with frame batching.
- **Memory**: many parameterized keys (one per symbol or per filter) stay resident for \`gcTime\` after use. Keep it short for high-cardinality keys.

### Maintainability
Use a **query-key factory** and one **stream-to-cache bridge module** per domain (positions, orders). Components never call \`setQueryData\` directly, which keeps merge rules (versions, upserts) in one testable place.`,
    practicalExample: {
      description: {
        en: "Positions are loaded once over REST, kept fresh by WebSocket events through version-checked immutable updates, and resynced on reconnect.",
        vi: "Positions tải một lần qua REST, được giữ tươi bằng event WebSocket qua cập nhật immutable có kiểm tra version, và đồng bộ lại khi reconnect.",
      },
      code: {
        language: "ts",
        code: `import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

type Position = { id: string; symbol: string; qty: number; avgPrice: string; version: number };
type ServerEvent = { type: "position.updated"; position: Position } | { type: "pong" };

export const positionKeys = { byAccount: (accountId: string) => ["positions", accountId] as const };

export function useLivePositions(accountId: string, socket: WebSocket) {
  const qc = useQueryClient();
  const key = positionKeys.byAccount(accountId);

  useEffect(() => {
    const onMessage = (e: MessageEvent<string>) => {
      const msg = JSON.parse(e.data) as ServerEvent; // validate with Zod in production
      if (msg.type !== "position.updated") return;
      qc.setQueryData<Position[]>(key, (old) => {
        if (!old) return old; // snapshot not loaded yet: the fetch will include it
        const i = old.findIndex((p) => p.id === msg.position.id);
        if (i === -1) return [...old, msg.position];
        if (old[i].version >= msg.position.version) return old; // duplicate or out of order
        const next = old.slice();
        next[i] = msg.position; // only this row gets a new reference
        return next;
      });
    };
    const onOpen = () => void qc.invalidateQueries({ queryKey: key }); // resync after a gap
    socket.addEventListener("message", onMessage);
    socket.addEventListener("open", onOpen);
    return () => {
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("open", onOpen);
    };
  }, [qc, socket, accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  return useQuery({
    queryKey: key,
    queryFn: () => fetch("/api/accounts/" + accountId + "/positions").then((r) => r.json() as Promise<Position[]>),
    staleTime: Infinity, // the socket keeps it fresh; refetch only on invalidate
    gcTime: 60_000,
  });
}`,
      },
    },
    diagram: {
      kind: "sequence",
      code: `sequenceDiagram
  participant C as Component
  participant Q as QueryCache
  participant API as REST API
  participant WS as WebSocket
  C->>Q: useQuery positions
  Q->>API: GET snapshot
  API-->>Q: positions at version 10
  Q-->>C: render rows
  WS-->>Q: setQueryData row v11
  Q-->>C: re-render changed row only
  WS-->>Q: socket reconnected after a drop
  Q->>API: invalidateQueries then refetch
  API-->>Q: fresh snapshot at version 15
  Q-->>C: render resynced rows`,
      caption: {
        en: "Snapshot over REST, deltas over WebSocket via setQueryData, and a full resync on reconnect.",
        vi: "Snapshot qua REST, delta qua WebSocket bằng setQueryData, và resync toàn bộ khi reconnect.",
      },
    },
    memoryShortcut: {
      en: "Stale = when to refetch, GC = when to forget. Snapshot by REST, patch by socket, resync on reconnect.",
      vi: "Stale = khi nào refetch, GC = khi nào quên. Snapshot bằng REST, vá bằng socket, resync khi reconnect.",
    },
    keyTakeaway: {
      en: "TanStack Query owns server state. Patch it immutably from the socket with version checks, set a long staleTime when push keeps it fresh, and invalidate after reconnect.",
      vi: "TanStack Query quản lý server state: vá cache immutable từ socket có kiểm tra version, đặt staleTime dài khi đã có push, và invalidate sau khi reconnect.",
    },
    followUps: [
      {
        id: "isb-q27-f1",
        question: {
          en: "After reconnecting, your refetched snapshot is older than events you already applied. How do you avoid jumping backwards?",
          vi: "Sau khi reconnect, snapshot refetch về lại cũ hơn các event đã áp dụng. Làm sao tránh dữ liệu bị lùi?",
        },
        answer: {
          en: "I make versions explicit. Either the snapshot carries a global sequence number, or every row carries its own version. With a global sequence, I buffer socket events while the refetch is in flight, apply the snapshot, then replay only the buffered events whose sequence is greater than the snapshot's. With per-row versions, the queryFn result goes through the same merge function as the events, and any row is kept if the cache already has a higher version. Either way, the rule is that data only moves forward. If the backend provides neither, I'd raise that as an API contract issue rather than guess on the client.",
          vi: "Làm version trở nên tường minh. Hoặc snapshot có sequence number toàn cục, hoặc mỗi row có version riêng. Với sequence toàn cục: buffer event socket trong lúc refetch, áp snapshot, rồi replay các event có seq lớn hơn seq của snapshot. Với version từng row: kết quả queryFn đi qua cùng hàm merge như event, row nào cache đang có version cao hơn thì giữ lại. Quy tắc chung: dữ liệu chỉ được đi tới. Nếu backend không cung cấp cả hai, nêu ra như một vấn đề API contract thay vì đoán ở client.",
        },
      },
      {
        id: "isb-q27-f2",
        question: {
          en: "Why not push every market tick through setQueryData too?",
          vi: "Sao không đẩy luôn mọi tick giá qua setQueryData?",
        },
        answer: {
          en: "Because the query cache is optimized for request and response, not streams. Every setQueryData call runs structural sharing over the data, updates query state and schedules a notification for every observer of that query. At hundreds of ticks per second that's a lot of wasted comparison and notification work, and it bypasses any frame batching. Ticks also aren't really cacheable server state: they're ephemeral and replaced continuously. So I keep ticks in a dedicated store fed by a per-frame flush, often from a worker, and use the query cache for slower entities like positions, orders and instrument metadata, where caching, deduplication and refetch logic actually pay off.",
          vi: "Vì query cache được tối ưu cho request/response, không phải stream. Mỗi lần setQueryData đều chạy structural sharing trên dữ liệu, cập nhật state của query và lên lịch notify cho mọi observer của query đó. Với hàng trăm tick mỗi giây, việc so sánh và notify đó rất lãng phí, lại bỏ qua cơ chế gộp theo frame. Tick cũng không phải server state đáng cache vì nó tạm thời và bị thay liên tục. Nên tick để trong store riêng, flush theo frame (thường từ worker), còn query cache dành cho thực thể chậm hơn như positions, orders, metadata instrument.",
        },
      },
    ],
    difficulty: "medium",
    priority: "medium",
    jdRequirement:
      "REST + WebSocket integration and state management (TanStack Query is not in the JD; assumption from initial focus)",
    candidateExperience: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "Actual: React, TypeScript, GraphQL and TanStack Query, including background prefetching and caching, at Persefoni. Merging WebSocket events into the query cache is a recommended approach. Don't claim it was done at Persefoni, and don't add metrics.",
        vi: "Thực tế: React, TypeScript, GraphQL và TanStack Query với background prefetching và caching tại Persefoni. Phần merge event WebSocket vào query cache là cách tiếp cận đề xuất, không nói đã làm ở Persefoni, không thêm số liệu.",
      },
    },
    tags: ["tanstack-query", "server-state", "caching", "websocket", "setquerydata"],
  },

  /* ---------------------------------------------------------------- */
  /* Q28 — Next.js App Router: Server vs Client Components             */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q28",
    number: 28,
    topicId: "state-nextjs",
    question: {
      en: "In the Next.js App Router, how do you split a real-time dashboard between Server Components and Client Components? Where does the streaming data belong?",
      vi: "Trong Next.js App Router, bạn chia một dashboard real-time giữa Server Components và Client Components thế nào? Dữ liệu streaming nên nằm ở đâu?",
    },
    answer:
      "I'd split it by what each environment is good at. Server Components run only on the server. They ship no JavaScript of their own, can read data and secrets directly, and render per request or from cache. But they can't hold state, run effects or open a WebSocket. Client Components are the interactive layer: they hydrate in the browser and can subscribe to streams. So for a real-time dashboard, the server owns the shell: the auth check, layout, navigation, instrument metadata, user preferences and the initial snapshot. The streaming data lives entirely on the client: the WebSocket connection, the live store, the chart, the order book and the blotter. The handoff is the key design point. The server fetches a snapshot that carries a sequence number and passes it as serializable props to a client component. The client then subscribes from that sequence, so there's no gap and no flash of empty state. I keep the 'use client' boundary as low as is practical so static chrome stays server-rendered. I also don't fight the model: a trading workspace is mostly client code, and that's fine. The failure modes I watch for are passing non-serializable props like functions or class instances across the boundary, importing a server-only module into client code, and creating a global store module that gets shared between users during server rendering. And I'd never try to push ticks through Server Components or server actions. RSC is request and response, not a push channel.",
    viExplanation:
      "Server Components chỉ chạy trên server: không gửi JavaScript của chính nó xuống client, đọc được dữ liệu và secret trực tiếp, nhưng không có state, không có effect và không mở được WebSocket. Client Components là lớp tương tác: được hydrate ở trình duyệt và có thể subscribe stream. Vì vậy server lo phần khung (shell): kiểm tra auth, layout, điều hướng, metadata của instrument và snapshot ban đầu. Mọi thứ streaming (kết nối WebSocket, live store, chart, order book, blotter) nằm hoàn toàn ở client. Điểm thiết kế quan trọng là bàn giao: server lấy snapshot có sequence number, truyền qua props dạng serializable cho client component, client subscribe tiếp từ đúng sequence đó nên không mất dữ liệu và không bị nháy màn hình trống. Đặt ranh giới 'use client' càng thấp càng tốt nhưng không cố ép: workspace trading phần lớn là client code, điều đó hoàn toàn bình thường. Các lỗi hay gặp: truyền function hoặc class instance qua ranh giới, import module server-only vào client, và tạo Zustand store global ở cấp module khiến state bị dùng chung giữa các user khi SSR. Không bao giờ đẩy tick qua RSC hay server action vì đó là cơ chế request/response, không phải kênh push.",
    technicalExplanation: `### How the boundary works
- A **Server Component** renders to the RSC payload, a serialized tree. Its code never reaches the browser, so it can import database clients, use secrets and \`await\` data directly.
- \`"use client"\` marks an **entry point** into the client bundle. That module and everything it imports become client code. Client components are still pre-rendered to HTML on the server for the first load, then **hydrated**.
- Props crossing the boundary must be **serializable**: plain objects, arrays, strings, numbers, \`Date\`, \`Map\`/\`Set\`, promises, and server actions. Functions, class instances, sockets and stores cannot cross.
- Server Components can be passed **as children** into Client Components. That's how a client layout (resizable panels) can still wrap server-rendered content.

### Recommended split for a trading dashboard
- **Server**: auth/session checks, permissions, layout chrome, instrument metadata (cacheable), saved workspace layout, and an initial **snapshot with a sequence number**.
- **Client**: a connection provider (one multiplexed WebSocket), live stores, charts (canvas), order book, virtualized blotters, order ticket and keyboard shortcuts.
- **Handoff**: \`<LiveWidget initial={snapshot} />\`, then subscribe with \`fromSeq = snapshot.seq\`. Events with \`seq <= snapshot.seq\` are dropped. A gap triggers a resync.

### Failure scenarios
- **Shared state across requests**: a Zustand store created at module scope lives as long as the server process, so during SSR one user's data can leak into another user's HTML. Create the store per request inside a client provider (\`useState(() => createStore(initial))\`).
- **Hydration mismatch**: server HTML renders a price or a \`new Date()\` that differs on the client. Render time-dependent values client-only, or use \`useSyncExternalStore\` with a stable \`getServerSnapshot\`.
- **Boundary too high**: \`"use client"\` on the page root drags the whole tree into the bundle and loses server data fetching. **Too low** creates prop-drilling through many tiny islands. Aim for one island per interactive widget group.
- **Leaking server code**: import modules guarded with \`import "server-only"\` so an accidental client import fails the build instead of shipping secrets.
- **Stale snapshot**: the snapshot is already old when it reaches the browser, so the client must resync from its sequence number. Never assume the snapshot is current.

### Performance and scalability
- Server-rendered chrome reduces client JavaScript and improves LCP. The heavy part (charting libraries, grids) stays in client chunks and can be lazy-loaded.
- Keep the WebSocket provider in a **layout** so it persists across client-side navigations between dashboard routes. Layouts don't remount on navigation in the App Router.
- Keep serialized snapshots small (visible depth, recent trades), because the RSC payload is part of the initial response size.`,
    practicalExample: {
      description: {
        en: "A Server Component page fetches metadata and a sequence-numbered snapshot, streams it behind Suspense, and hands off to a Client Component that subscribes from that sequence.",
        vi: "Trang Server Component lấy metadata và snapshot có sequence number, stream qua Suspense, rồi bàn giao cho Client Component subscribe tiếp từ sequence đó.",
      },
      code: {
        language: "tsx",
        code: `// app/trade/[symbol]/page.tsx (Server Component)
import { Suspense } from "react";
import { getInstrument, getQuoteSnapshot } from "@/server/market"; // guarded by "server-only"
import { LiveQuote } from "./live-quote";

export default async function TradePage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const instrument = await getInstrument(symbol); // slow-changing, cacheable
  return (
    <main>
      <h1>{instrument.displayName}</h1>
      <Suspense fallback={<p aria-busy="true">Loading quote…</p>}>
        <QuoteSection symbol={symbol} />
      </Suspense>
    </main>
  );
}

async function QuoteSection({ symbol }: { symbol: string }) {
  const snapshot = await getQuoteSnapshot(symbol); // { bid, ask, seq }, plain serializable data
  return <LiveQuote symbol={symbol} initial={snapshot} />;
}

// app/trade/[symbol]/live-quote.tsx (Client Component)
"use client";
import { useEffect, useState } from "react";
import { subscribeQuotes, type QuoteSnapshot } from "@/lib/market-stream";

export function LiveQuote({ symbol, initial }: { symbol: string; initial: QuoteSnapshot }) {
  const [quote, setQuote] = useState(initial);
  // Resume from the snapshot's sequence: no gap, no empty flash; returns unsubscribe
  useEffect(() => subscribeQuotes(symbol, { fromSeq: initial.seq }, setQuote), [symbol, initial.seq]);
  return (
    <p className="tabular-nums">
      {quote.bid} / {quote.ask}
    </p>
  );
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  REQ["Request for trade page"] --> RSC["Server Component page"]
  RSC --> AUTH["Auth and permissions check"]
  RSC --> META["Instrument metadata, cacheable"]
  RSC --> SNAP["Snapshot with sequence number"]
  SNAP -->|"serializable props"| CC["Client Component LiveQuote"]
  CC --> HYD["Hydrate in browser"]
  HYD --> SUB["Subscribe on shared WebSocket from seq"]
  SUB --> STORE["Client live store"]
  STORE --> UI["Ticking chart, book, blotter"]`,
      caption: {
        en: "The server renders the shell and the snapshot, then the client takes over the stream from the snapshot's sequence number.",
        vi: "Server render shell và snapshot; client tiếp quản stream từ sequence number của snapshot.",
      },
    },
    memoryShortcut: {
      en: "Server serves the Shell and the Snapshot; the Client owns the Connection and the Churn.",
      vi: "Server lo Shell và Snapshot; Client giữ Connection và mọi thứ thay đổi liên tục.",
    },
    keyTakeaway: {
      en: "Render the shell and a sequence-numbered snapshot on the server, keep every live subscription in Client Components, and resume the stream exactly where the snapshot ended.",
      vi: "Render shell và snapshot có sequence trên server, giữ mọi subscription live ở Client Components, và tiếp tục stream đúng chỗ snapshot kết thúc.",
    },
    followUps: [
      {
        id: "isb-q28-f1",
        question: {
          en: "How do you use a Zustand store with SSR in the App Router without leaking state between users?",
          vi: "Dùng Zustand với SSR trong App Router thế nào để không rò state giữa các user?",
        },
        answer: {
          en: "I don't create the store at module scope, because on the server a module lives for the whole process and is shared by every request. Instead I export a createStore factory using zustand's vanilla API. A client provider component creates the instance once with useState and an initializer, seeded from server props, and exposes it through Context. Components read it with a hook that takes a selector. Context only carries the store instance, which never changes, so it doesn't cause re-renders. That gives each request and each browser tab its own isolated store, and it also makes tests simpler because every test can create a fresh store.",
          vi: "Không tạo store ở cấp module, vì trên server module sống suốt vòng đời process và bị mọi request dùng chung. Thay vào đó export hàm createStore bằng vanilla API của zustand. Một client provider tạo instance đúng một lần bằng useState với initializer, seed từ props của server, rồi đưa qua Context. Component đọc bằng hook có selector. Context chỉ mang instance của store, vốn không đổi, nên không gây re-render. Mỗi request và mỗi tab có store riêng biệt, và test cũng dễ hơn vì mỗi test tạo store mới.",
        },
      },
      {
        id: "isb-q28-f2",
        question: {
          en: "You see hydration mismatch warnings on price and timestamp cells. What's happening, and how do you fix it?",
          vi: "Bạn thấy cảnh báo hydration mismatch ở ô giá và thời gian. Chuyện gì xảy ra và sửa thế nào?",
        },
        answer: {
          en: "The HTML rendered on the server differs from the first client render. Typical causes are a price that changed between the two renders, Date.now() or new Date(), or locale and time-zone formatting that depends on the server's environment. First, the first client render must use exactly the same input as the server, which is the serialized snapshot, not a live value. Second, format with an explicit locale and time zone. Third, for values that are inherently client-only, like a 'seconds ago' label, render a placeholder on the server and fill it in after mount, or use useSyncExternalStore with a getServerSnapshot. suppressHydrationWarning is a last resort for a single text node, not a fix.",
          vi: "HTML render trên server khác với lần render đầu ở client. Nguyên nhân thường gặp: giá thay đổi giữa hai lần render, Date.now() hoặc new Date(), hoặc format locale và múi giờ phụ thuộc môi trường server. Cách sửa: lần render đầu ở client phải dùng đúng input như server (snapshot đã serialize), không dùng giá live; format với locale và time zone tường minh; giá trị vốn chỉ có ở client như 'mấy giây trước' thì render placeholder trên server rồi điền sau khi mount, hoặc dùng useSyncExternalStore có getServerSnapshot. suppressHydrationWarning chỉ là giải pháp cuối cho một text node.",
        },
      },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "Modern React ecosystem including Next.js; real-time, low-latency dashboards",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "Next.js is in the candidate's skill list, but no production Next.js trading or real-time app is documented. Answer from fundamentals and say you'd confirm the team's Next.js version and caching model. Don't claim a production App Router migration.",
        vi: "Next.js có trong danh sách kỹ năng nhưng chưa có ứng dụng trading hay real-time bằng Next.js ở production. Trả lời dựa trên nguyên lý, nói sẽ xác nhận phiên bản Next.js và mô hình caching của team, không nhận đã migrate App Router ở production.",
      },
    },
    tags: ["nextjs", "app-router", "server-components", "hydration", "real-time"],
  },

  /* ---------------------------------------------------------------- */
  /* Q29 — Next.js rendering strategies and client-only islands        */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q29",
    number: 29,
    topicId: "state-nextjs",
    question: {
      en: "Compare the Next.js rendering strategies: SSR, SSG, ISR and streaming with Suspense. When should a trading screen be a client-only island instead?",
      vi: "So sánh các chiến lược render của Next.js: SSR, SSG, ISR, streaming với Suspense. Khi nào một màn hình trading nên là client-only island?",
    },
    answer:
      "I pick per route, not per app. SSG is for content that's the same for everyone and rarely changes, like docs or legal pages: it's built once and served from the CDN. ISR is SSG with a revalidation window, which suits a public product catalogue in the customer portal where a few minutes of staleness is fine. Dynamic SSR renders per request. I'd use it when a page is personalized or must be correct at request time, like an account overview. Streaming with Suspense sits on top of SSR: the shell flushes immediately and slower sections stream in as their data resolves, so one slow analytics query doesn't block the whole page. A trading screen is different. Its value is in data that changes many times a second. It's behind auth, so SEO is irrelevant, and anything rendered on the server is stale before it hydrates. So I'd render a thin server shell with the auth check and layout, and make the workspace a client-only island loaded with next/dynamic and ssr set to false. That avoids hydration mismatches on time-sensitive values, avoids spending server CPU on HTML nobody needs, and lets heavy chart libraries that touch window or canvas load lazily. The trade-off is a slower first paint for that island. I mitigate it with a skeleton, by preloading the chunk on hover or after login, and with a connection that persists across navigation. The mistakes I'd avoid are making the whole app client-only, which loses fast portal pages, or the opposite: server-rendering a grid that gets overwritten immediately.",
    viExplanation:
      "Chọn chiến lược theo từng route, không áp một kiểu cho cả app. SSG: nội dung giống nhau cho mọi người, ít đổi (docs, trang pháp lý), build một lần, phục vụ từ CDN. ISR: SSG kèm khoảng revalidate, hợp với catalogue sản phẩm công khai trên customer portal, cũ vài phút cũng không sao. SSR động: render theo từng request, dùng khi trang cá nhân hoá hoặc cần đúng tại thời điểm request. Streaming với Suspense chạy trên nền SSR: shell được gửi ngay, phần chậm stream về sau, một query chậm không chặn cả trang. Màn hình trading thì khác: giá trị nằm ở dữ liệu đổi nhiều lần mỗi giây, nằm sau đăng nhập nên SEO không quan trọng, và HTML render ở server đã cũ trước khi hydrate xong. Vì vậy chỉ render shell mỏng trên server (auth, layout), còn workspace là client-only island nạp bằng next/dynamic với ssr: false. Lợi ích: tránh hydration mismatch, không tốn CPU server cho HTML vô ích, lazy-load thư viện chart dùng window hoặc canvas. Đổi lại, island hiển thị chậm hơn một chút, nên bù bằng skeleton, preload chunk và giữ kết nối WebSocket qua các lần điều hướng. JD có nhắc cả customer web portal lẫn ứng dụng trading analytics nên câu trả lời theo từng route rất phù hợp.",
    technicalExplanation: `### The options, mechanically
- **SSG**: HTML and RSC payload are produced at build time and served from a CDN. TTFB is the fastest possible, and server cost per request is zero. Data is only as fresh as the last build.
- **ISR**: a static result plus a revalidation interval (\`export const revalidate = 300\`) or on-demand revalidation (\`revalidatePath\` / \`revalidateTag\`). It uses stale-while-revalidate: the first request after expiry still gets the old page while a regeneration happens in the background.
- **Dynamic SSR**: renders on every request. Reading \`cookies()\`, \`headers()\`, \`searchParams\` or \`connection()\`, or a \`fetch\` with \`cache: "no-store"\`, makes a route dynamic. (A plain \`fetch\` with no cache option that runs before any of these can still be prerendered at build time.) It's always fresh, but it costs server CPU per request, and TTFB depends on the slowest awaited data unless you stream.
- **Streaming and Suspense**: the server flushes the shell and \`fallback\`s first, then streams each boundary's HTML as its promise resolves. It improves perceived performance and TTFB without changing data freshness. \`loading.tsx\` is a route-level Suspense boundary.
- **Newer models**: recent Next.js versions add Partial Prerendering through the Cache Components model (\`"use cache"\`, \`cacheLife\`), with a static shell and dynamic holes. Check which caching model and version the team uses before relying on segment configs.

### Why a trading workspace is a client-only island
- **Freshness**: market data rendered on the server is stale on arrival, so the client resubscribes anyway. Server rendering it is wasted work.
- **No SEO** behind auth, so the main benefit of SSR here is first paint, and a skeleton covers that.
- **Browser-only APIs**: canvas, WebGL, \`ResizeObserver\`, workers and many charting libraries touch \`window\` at import time. \`next/dynamic(..., { ssr: false })\` avoids both crashes and hydration mismatches. In the App Router it must be called from a Client Component.
- **Server cost**: rendering large grids on the server for every request scales poorly and gives nothing to a trader.

### Trade-offs and failure scenarios
- **Slower first contentful widget**: mitigate with a meaningful skeleton, \`import()\` preloading on hover or after login, and a persistent connection provider in the shared layout.
- **All-client app**: loses fast, cacheable portal pages and server-side auth redirects, and ships more JavaScript to non-technical portal users on slower devices.
- **Over-caching**: ISR on a personalized page can serve one user's data to another. Anything reading the session must be dynamic.
- **Long ISR windows** on prices or product availability show outdated information. Use on-demand revalidation triggered by backend events instead.

### Decision summary
| Route | Strategy |
| --- | --- |
| Docs, legal, marketing | SSG |
| Public product catalogue | ISR or on-demand revalidation |
| Account overview, reports | Dynamic SSR with Suspense streaming |
| Live trading workspace | Server shell plus client-only island |`,
    practicalExample: {
      description: {
        en: "One app with an ISR product catalogue for the customer portal and a trading workspace rendered as a server-authenticated shell plus a client-only island.",
        vi: "Một app gồm catalogue sản phẩm dùng ISR cho customer portal và workspace trading gồm shell xác thực ở server cộng client-only island.",
      },
      code: {
        language: "tsx",
        code: `// app/(portal)/products/page.tsx: same for everyone, ISR
import { getProducts } from "@/server/catalog";
import { ProductGrid } from "./product-grid";
export const revalidate = 300; // regenerate at most every 5 minutes
export default async function ProductsPage() {
  return <ProductGrid items={await getProducts()} />;
}

// app/(trading)/workspace/page.tsx: per-user, auth on the server
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { WorkspaceIsland } from "./workspace-island";
export default async function WorkspacePage() {
  const session = await getSession(); // reads cookies, so the route is dynamic
  if (!session) redirect("/login");
  return <WorkspaceIsland accountId={session.accountId} />;
}

// app/(trading)/workspace/workspace-island.tsx: client-only island
"use client";
import dynamic from "next/dynamic";
const Workspace = dynamic(() => import("./workspace"), {
  ssr: false, // canvas charts and live data: nothing useful to pre-render
  loading: () => <div aria-busy="true">Connecting to market data…</div>,
});
export function WorkspaceIsland({ accountId }: { accountId: string }) {
  return <Workspace accountId={accountId} />;
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  R["New route"] --> Q1{"Same for every user?"}
  Q1 -->|"yes, rarely changes"| SSG["SSG"]
  Q1 -->|"yes, changes sometimes"| ISR["ISR or on-demand revalidation"]
  Q1 -->|"no"| Q2{"Updates many times per second?"}
  Q2 -->|"no"| SSR["Dynamic SSR plus Suspense streaming"]
  Q2 -->|"yes"| ISL["Server shell plus client-only island"]
  ISL --> PRE["Skeleton and chunk preload"]`,
      caption: {
        en: "Decide per route: static where possible, dynamic SSR when personalized, and a client-only island when data changes faster than the server can render it.",
        vi: "Quyết định theo route: static khi có thể, SSR động khi cá nhân hoá, client-only island khi dữ liệu đổi nhanh hơn tốc độ server render.",
      },
    },
    memoryShortcut: {
      en: "Static if shared, ISR if slowly shared, SSR if personal, Island if it ticks.",
      vi: "Dùng chung thì Static, dùng chung nhưng đổi chậm thì ISR, cá nhân hoá thì SSR, nhảy giá liên tục thì Island.",
    },
    keyTakeaway: {
      en: "Choose the rendering strategy per route by freshness and personalization. A live trading workspace is best as a server-authenticated shell around a lazily loaded client-only island.",
      vi: "Chọn chiến lược render theo từng route dựa trên độ tươi và mức cá nhân hoá; workspace trading tốt nhất là shell xác thực trên server bọc một client-only island nạp lazy.",
    },
    followUps: [
      {
        id: "isb-q29-f1",
        question: {
          en: "Users switch between dashboard routes all day. How do you avoid reconnecting the WebSocket on every navigation?",
          vi: "User chuyển qua lại giữa các route dashboard cả ngày. Làm sao tránh reconnect WebSocket mỗi lần điều hướng?",
        },
        answer: {
          en: "In the App Router, layouts stay mounted across client-side navigation between their child routes. I put a client ConnectionProvider in the shared trading layout, so the socket lives as long as the user stays in that section. Widgets register subscriptions through the provider with reference counting. When a route unmounts, its widgets unsubscribe, and the provider only sends an unsubscribe to the server when a topic's count drops to zero, ideally after a short grace period so quickly going back doesn't churn. I'd also make the connection itself a module-level singleton on the client side only, which is safe in the browser, so a remount in development or under Strict Mode doesn't open duplicates.",
          vi: "Trong App Router, layout vẫn giữ nguyên khi điều hướng phía client giữa các route con. Đặt một client ConnectionProvider trong layout chung của khu trading, socket sống suốt thời gian user ở khu đó. Widget đăng ký subscription qua provider có reference counting. Khi route unmount, widget unsubscribe, và provider chỉ gửi unsubscribe lên server khi bộ đếm của topic về 0, tốt nhất sau một khoảng grace period ngắn để việc quay lại nhanh không gây churn. Kết nối cũng có thể là singleton cấp module chỉ ở client (an toàn trên trình duyệt), để remount trong dev hay Strict Mode không mở thêm kết nối trùng.",
        },
      },
    ],
    difficulty: "medium",
    priority: "medium",
    jdRequirement: "Next.js; trading analytics apps and an external customer web portal",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "Next.js is a listed skill, not a documented production system. Explain the strategies as knowledge and design judgment. Don't claim you shipped ISR or client-only islands for a trading product.",
        vi: "Next.js là kỹ năng được liệt kê, không phải hệ thống production đã ghi nhận. Giải thích như kiến thức và phán đoán thiết kế, không nói đã triển khai ISR hay client-only island cho sản phẩm trading.",
      },
    },
    tags: ["nextjs", "ssr", "isr", "streaming", "rendering-strategy"],
  },

  /* ---------------------------------------------------------------- */
  /* Q30 — Optimistic order placement                                   */
  /* ---------------------------------------------------------------- */
  {
    id: "isb-q30",
    number: 30,
    topicId: "state-nextjs",
    question: {
      en: "How would you implement optimistic updates and rollback for order placement, including idempotency keys and reconciliation with server execution events?",
      vi: "Bạn triển khai optimistic update và rollback cho việc đặt lệnh thế nào, gồm cả idempotency key và đối chiếu với event thực thi từ server?",
    },
    answer:
      "For orders I'd be deliberately less optimistic than for, say, a like button, because a wrong UI costs real money. My rule is to be optimistic about the intent, never about the outcome. When the trader clicks buy, I immediately insert the order into the blotter as pending, with a client-generated order ID, so the UI feels instant. But I never show it as working or filled, and I never adjust positions or buying power until the server confirms. The client order ID doubles as an idempotency key. If the request times out, I can't know whether the order reached the backend, and retrying without a key could double the order. With the key, the server returns the original result instead of creating a second order. Then there's reconciliation. The HTTP acknowledgement and the WebSocket execution report race, and either can arrive first. So I upsert by client order ID with a status rank, so a late 'accepted' ack can never overwrite a 'filled' event that already arrived. Rollback is targeted. On a rejection I mark that one row rejected and show the reason, rather than restoring a whole cache snapshot, which would wipe out other updates that arrived in the meantime. On an ambiguous failure the row goes to 'unknown' and I refetch open orders, because the server is the source of truth. On top of that come UX guards: prevent double submit, confirm large orders, and announce status changes to screen readers.",
    viExplanation:
      "Với lệnh giao dịch, phải optimistic có chừng mực vì UI sai là mất tiền thật. Nguyên tắc: lạc quan về ý định, không lạc quan về kết quả. Khi trader bấm mua, thêm ngay lệnh vào blotter ở trạng thái pending với clientOrderId sinh ở client để UI phản hồi tức thì, nhưng tuyệt đối không hiển thị đã khớp, không trừ buying power hay đổi position trước khi server xác nhận. clientOrderId cũng chính là idempotency key: khi request timeout, ta không biết lệnh đã tới backend chưa; retry không có key có thể tạo lệnh trùng, còn có key thì server trả lại kết quả cũ. Phần đối chiếu (reconciliation): HTTP ack và execution report qua WebSocket chạy đua nhau, cái nào cũng có thể đến trước, nên upsert theo clientOrderId kèm thứ hạng trạng thái, để ack 'accepted' đến muộn không ghi đè trạng thái 'filled'. Rollback phải nhắm đúng mục tiêu: bị reject thì chỉ đánh dấu đúng dòng đó kèm lý do, không khôi phục cả snapshot cache vì sẽ xoá mất các cập nhật khác vừa đến. Lỗi không rõ ràng (timeout, mất mạng) thì chuyển sang 'unknown' và refetch danh sách lệnh, server là nguồn sự thật. Thêm các bảo vệ UX: chống double submit, xác nhận lệnh lớn, thông báo trạng thái cho screen reader.",
    technicalExplanation: `### Optimistic about intent, not outcome
- **Safe to show immediately**: the order row with status \`pending-new\`, a spinner, and the trader's entered price and quantity.
- **Never show optimistically**: fills, average price, position changes, buying power or P&L. These depend on the market and the risk checks. Showing them early and then reverting erodes trust and can drive wrong decisions.

### Idempotency
- Generate \`clientOrderId\` (for example with \`crypto.randomUUID()\`) **once per user intent**, before the first attempt. Send it as an \`Idempotency-Key\` header or a body field.
- The backend stores key to result. A repeated request with the same key returns the original response and never creates a second order.
- Retries are safe **only** with the same key. Use bounded retries with backoff for network errors and 5xx responses. Never retry 4xx business rejections.
- **Ambiguous outcomes** (timeout, connection reset) are the dangerous case. Move the order to \`unknown\` and query by \`clientOrderId\`. Don't silently auto-resubmit minutes later, because the market may have moved, so ask the trader.

### Reconciliation with execution events
- Two channels report the same order: the HTTP response (ack) and the stream of execution reports. Their order of arrival isn't guaranteed.
- **Upsert by \`clientOrderId\`** (the server ID may not be known yet) and apply a **status rank** such as \`pending-new < new < partially-filled < filled/cancelled/rejected\`. Never downgrade a status. For partial fills, also compare \`cumQty\` or an event sequence number.
- On reconnect, refetch open orders and merge them with the same function, so there's one merge rule for every source.

### Rollback done right
- The common optimistic-update example snapshots the whole list in \`onMutate\` and restores it in \`onError\`. For a blotter receiving live events, that **overwrites concurrent updates**. Use a targeted change to the one row instead.
- \`cancelQueries\` before inserting prevents an in-flight refetch from erasing the optimistic row.
- After settling, invalidate so that the server-confirmed list replaces local assumptions.

### Failure scenarios to design for
- Double-click or Enter key repeat: disable the submit button while the mutation is pending, and the idempotency key makes duplicates harmless anyway.
- The WS report arrives before the ack: the row is already \`new\` or \`filled\`, and the ack must not downgrade it.
- The tab closes mid-request: on the next load, open orders from the server are the truth, and the pending row was never persisted locally as fact.
- Accessibility: status changes are announced through a polite live region. Color is never the only signal for rejected or filled.`,
    practicalExample: {
      description: {
        en: "A TanStack Query mutation that inserts a pending order, retries safely with an idempotency key, never downgrades status when the ack and the stream race, and rolls back only the affected row.",
        vi: "Mutation TanStack Query thêm lệnh pending, retry an toàn nhờ idempotency key, không hạ cấp trạng thái khi ack và stream chạy đua, và chỉ rollback đúng dòng bị ảnh hưởng.",
      },
      code: {
        language: "ts",
        code: `import { useMutation, useQueryClient } from "@tanstack/react-query";

type Status = "unknown" | "pending-new" | "new" | "partially-filled" | "filled" | "cancelled" | "rejected";
export type Order = { clientOrderId: string; symbol: string; side: "buy" | "sell"; qty: string; limitPrice: string; status: Status; reason?: string };
class RejectedError extends Error {}
const RANK: Record<Status, number> = { "pending-new": 0, unknown: 1, new: 2, "partially-filled": 3, filled: 4, cancelled: 4, rejected: 4 };
const openOrdersKey = ["orders", "open"] as const;

// One merge rule for HTTP acks, WS execution reports and refetches
export const upsertOrder = (list: Order[], o: Order): Order[] => {
  const i = list.findIndex((x) => x.clientOrderId === o.clientOrderId);
  if (i === -1) return [o, ...list];
  if (RANK[list[i].status] > RANK[o.status]) return list; // never downgrade
  const next = list.slice();
  next[i] = { ...list[i], ...o };
  return next;
};

async function postOrder(o: Order): Promise<Order> {
  const r = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": o.clientOrderId },
    body: JSON.stringify(o),
  });
  if (r.status >= 400 && r.status < 500) throw new RejectedError(await r.text());
  if (!r.ok) throw new Error("Server error " + r.status);
  return (await r.json()) as Order; // validate with Zod in production
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  const patch = (o: Order) => qc.setQueryData<Order[]>(openOrdersKey, (old = []) => upsertOrder(old, o));
  return useMutation({
    mutationFn: postOrder,
    retry: (count, err) => !(err instanceof RejectedError) && count < 2, // safe only thanks to the key
    onMutate: async (o) => {
      await qc.cancelQueries({ queryKey: openOrdersKey });
      patch({ ...o, status: "pending-new" }); // optimistic about intent only
    },
    onSuccess: (ack) => patch(ack),
    onError: (err, o) =>
      patch(err instanceof RejectedError ? { ...o, status: "rejected", reason: err.message } : { ...o, status: "unknown" }),
    onSettled: () => qc.invalidateQueries({ queryKey: openOrdersKey }), // server is the source of truth
  });
}`,
      },
    },
    diagram: {
      kind: "sequence",
      code: `sequenceDiagram
  participant T as Trader
  participant UI as Order UI
  participant API as Order API
  participant WS as Execution stream
  T->>UI: Submit limit buy
  UI->>UI: Insert row pending-new with clientOrderId
  UI->>API: POST order with Idempotency-Key
  WS-->>UI: Execution report NEW
  API-->>UI: 201 ack
  UI->>UI: Upsert by clientOrderId, never downgrade
  alt Timeout or 5xx
    UI->>API: Retry with the same key
    API-->>UI: Original order returned, no duplicate
  else Rejected 4xx
    UI->>UI: Mark only this row rejected with reason
  end
  UI->>API: Refetch open orders as source of truth`,
      caption: {
        en: "Show the intent instantly, retry safely with the same key, reconcile ack and stream events by client order ID, and let the server have the final word.",
        vi: "Hiển thị ý định ngay, retry an toàn với cùng key, đối chiếu ack và event stream theo clientOrderId, và để server quyết định cuối cùng.",
      },
    },
    memoryShortcut: {
      en: "PIRR: Pending row, Idempotency key, Rank-based reconcile, targeted Rollback. Optimistic about intent, never about fills.",
      vi: "PIRR: Pending row, Idempotency key, Reconcile theo thứ hạng trạng thái, Rollback đúng dòng. Lạc quan về ý định, không bao giờ lạc quan về khớp lệnh.",
    },
    keyTakeaway: {
      en: "Show the order as pending instantly, make retries safe with an idempotency key, merge acks and execution events with a never-downgrade rule, and roll back only the affected row.",
      vi: "Hiển thị lệnh pending ngay, dùng idempotency key để retry an toàn, merge ack và execution event theo quy tắc không hạ cấp trạng thái, và chỉ rollback đúng dòng bị ảnh hưởng.",
    },
    followUps: [
      {
        id: "isb-q30-f1",
        question: {
          en: "The trader's network drops right after clicking buy, and the request times out. What does the UI do?",
          vi: "Mạng của trader rớt ngay sau khi bấm mua và request bị timeout. UI xử lý thế nào?",
        },
        answer: {
          en: "That's the ambiguous case, so the UI must not guess. The row moves to an 'unknown' or 'confirming' state with a clear message, and the submit button stays guarded so the trader doesn't place a second order by reflex. When connectivity returns, I first look the order up by clientOrderId, through a dedicated endpoint or by refetching open orders, and resubscribe to execution reports. If the server has it, the row adopts the server state. If it doesn't, I ask the trader whether to resubmit, because the market may have moved, rather than automatically sending a stale order. Any automatic retry within the short retry window reuses the same idempotency key.",
          vi: "Đây là trường hợp mơ hồ nên UI không được đoán. Dòng lệnh chuyển sang trạng thái 'unknown' hoặc 'đang xác nhận' với thông báo rõ ràng, nút submit vẫn được chặn để trader không phản xạ đặt thêm lệnh. Khi có mạng lại, tra lệnh theo clientOrderId (qua endpoint riêng hoặc refetch open orders) và subscribe lại execution report. Nếu server có lệnh, dòng nhận trạng thái từ server. Nếu không có, hỏi trader có muốn gửi lại không, vì giá có thể đã đổi, thay vì tự động gửi một lệnh đã cũ. Mọi lần retry tự động trong khoảng ngắn đều dùng lại cùng idempotency key.",
        },
      },
      {
        id: "isb-q30-f2",
        question: {
          en: "How would you test the race between the HTTP ack and the WebSocket execution report?",
          vi: "Bạn test cuộc đua giữa HTTP ack và execution report qua WebSocket thế nào?",
        },
        answer: {
          en: "First, unit-test the pure upsertOrder function with table-driven cases: an ack after a fill, a fill after an ack, duplicate reports and unknown before new. That's where the logic lives, so those tests are fast and exhaustive. Then I write an integration test with React Testing Library and a mocked API, using MSW for HTTP with a controllable delay and a mock socket that I push events into. I emit the 'filled' report, then release the delayed ack, and assert the blotter still shows filled. I also assert the retry sent the same Idempotency-Key header. Finally, one Playwright e2e test covers the happy path against a mock server in CI.",
          vi: "Trước hết unit test hàm thuần upsertOrder theo dạng bảng: ack đến sau fill, fill đến sau ack, report trùng, unknown trước new. Logic nằm ở đây nên test nhanh và đầy đủ. Sau đó viết integration test với React Testing Library: mock HTTP bằng MSW có delay điều khiển được và một mock socket để đẩy event. Phát report 'filled' trước, rồi mới thả ack bị trễ, assert blotter vẫn hiển thị filled; đồng thời assert lần retry gửi đúng header Idempotency-Key cũ. Cuối cùng một Playwright e2e cho happy path với mock server trong CI.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement: "Execution workflows and trading UX on a trade capture platform; REST + WebSocket integration",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "No trading or order-management production experience. Present this as the approach you'd take. You can mention general REST API integration work (Ninja Van) and TanStack Query experience (Persefoni) as foundations, but don't claim you built order placement.",
        vi: "Không có kinh nghiệm production về trading hay quản lý lệnh. Trình bày như cách tiếp cận đề xuất; có thể nhắc kinh nghiệm tích hợp REST API (Ninja Van) và TanStack Query (Persefoni) làm nền tảng, nhưng không nói đã xây tính năng đặt lệnh.",
      },
    },
    tags: ["optimistic-updates", "idempotency", "reconciliation", "orders", "tanstack-query"],
  },
];
