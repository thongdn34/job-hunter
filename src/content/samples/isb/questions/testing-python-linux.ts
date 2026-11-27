import type { InterviewQuestion } from "@/domain/package/schema";

/**
 * ISB Vietnam — Section 7, questions 45–50 (topic "testing-python-linux").
 * Testing strategy, RTL, Playwright, Python/FastAPI literacy, Rust awareness, Linux + CI/CD debugging.
 * Candidate experience is only marked "actual" where it maps to profile facts (Persefoni automated testing / WCAG).
 */
export const testingPythonLinuxQuestions: InterviewQuestion[] = [
  /* ------------------------------------------------------------------ */
  /* Q45 — Testing strategy for a real-time dashboard                    */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q45",
    number: 45,
    topicId: "testing-python-linux",
    question: {
      en: "How would you design a testing strategy for a real-time trading dashboard — unit, integration and end-to-end — and how do you test WebSocket flows without a flaky dependency on a live server?",
      vi: "Bạn sẽ thiết kế chiến lược kiểm thử cho một real-time trading dashboard như thế nào — unit, integration và end-to-end — và làm sao test các luồng WebSocket mà không phụ thuộc vào một server thật dễ gây flaky?",
    },
    answer: `I'd structure it in three layers, and the most important decision comes before any test is written: the WebSocket lives behind a small transport interface, so every layer can swap it out.

First, unit tests for the pure logic, because that's where the dangerous bugs live: applying order-book deltas, detecting sequence gaps, aggregating ticks into candles, formatting prices. These are plain functions, so I use table-driven cases for the nasty edges: out-of-order messages, duplicates, a size of zero removing a level. They run in milliseconds and catch the bugs that would otherwise show up as a wrong number on a trader's screen.

Second, integration tests with React Testing Library. I render the real component tree with the real store, but inject a fake transport. The test pushes a snapshot, then deltas, then drops the connection, and asserts what the user actually sees: the updated row, the "reconnecting" badge, the stale-data warning. Fake timers make throttling and heartbeats deterministic.

Third, a thin layer of Playwright tests where the browser's WebSocket is routed to a scripted mock server, plus a handful of smoke tests against a real staging backend.

On top of that, I'd add contract tests on the message schemas. With Rust and Python backends, the most common real-world failure is schema drift, not a React bug. The trade-off is clear: I optimise CI for speed and determinism, and buy back realism with a small staging suite.`,
    viExplanation: `Ý chính: đừng để mọi test phải kết nối tới một WebSocket server thật. Hãy đặt WebSocket sau một transport interface nhỏ (connect, send, onMessage, onStatus) để mỗi tầng test có thể thay bằng bản fake.

Tầng 1 — unit test cho logic thuần: merge delta vào order book, phát hiện gap theo sequence number, gom tick thành candle, format giá. Đây là nơi bug nguy hiểm nhất nằm (hiển thị sai con số), và test chạy chỉ vài mili giây.

Tầng 2 — integration test với React Testing Library: render component thật + store thật, nhưng inject fake transport. Test chủ động đẩy snapshot, delta, rồi ngắt kết nối và kiểm tra đúng thứ người dùng nhìn thấy: dòng được cập nhật, badge "reconnecting", cảnh báo dữ liệu cũ. Fake timers giúp throttle và heartbeat chạy deterministic.

Tầng 3 — một ít Playwright E2E, route WebSocket của trình duyệt sang mock server có kịch bản, cộng vài smoke test với staging thật.

Cuối cùng là contract test cho schema của message. Với backend Rust/Python, lỗi hay gặp nhất ngoài thực tế là schema drift — backend đổi payload mà frontend không biết — chứ không phải bug React. Khi trả lời phỏng vấn, hãy nói rõ trade-off: ưu tiên tốc độ và độ ổn định của CI, và bù lại độ "thật" bằng một bộ staging test nhỏ.`,
    technicalExplanation: `### Design for testability first
- Hide the socket behind a \`Transport\` interface: \`connect\`, \`send\`, \`onMessage\`, \`onStatus\`. Components and stores never touch \`new WebSocket()\` directly.
- Keep protocol logic (snapshot + delta merge, gap detection, conflation) in **pure functions or a store** outside React. Pure code is the cheapest thing in the world to test.
- Inject time: throttles, heartbeats and backoff should use timers that fake timers (Vitest/Jest) or \`page.clock\` (Playwright) can control.

### What each layer owns
- **Unit (Vitest/Jest):** reducers and parsers. Table-driven cases: duplicate \`seq\`, gap → resync request, size \`0\` removes a level, crossed book, decimal strings that must not become floats.
- **Integration (RTL):** real component + real store + fake transport. Assert on what the user perceives: rows by role, status regions, disabled order buttons while stale.
- **E2E (Playwright):** a few critical journeys with \`page.routeWebSocket\` acting as the server: load, live update, disconnect → recover, place order → fill appears in blotter.
- **Contract:** the message schemas (Zod, JSON Schema, AsyncAPI or protobuf) are versioned. Backend fixtures are validated against them in CI on both sides.
- **Staging smoke:** one or two tests against the real Rust/Python services to catch infra issues (proxy buffering, auth, TLS) that mocks can't see.

### Failure scenarios worth an explicit test
- Connection drops mid-stream → status changes, data marked stale, resubscribe on reconnect.
- Sequence gap → client requests a snapshot instead of silently rendering a corrupt book.
- Burst of thousands of messages → UI still shows the latest value; no unbounded buffer growth.
- Auth token expiry during a long session → re-auth without losing subscriptions.
- Malformed message → rejected and reported, the stream keeps running.

### Flakiness and determinism
- No real network and no real clocks in unit and integration tests. The test decides *when* a message arrives.
- Reset stores, fakes and timers in \`afterEach\`; shared singletons are the number one source of order-dependent failures.
- Prefer assertions on final visible state over render counts. Use the React Profiler or a render counter only in a few targeted performance tests.

### Scalability of the suite
- The test pyramid keeps CI fast: hundreds of unit tests in seconds, dozens of RTL tests, a handful of E2E journeys sharded across workers.
- Canvas charts: test the **data series** fed into the chart in unit tests, and cover the pixels with a small number of visual snapshots instead of asserting on canvas internals.
- Treat a flaky test as a bug with an owner, not something a retry hides.`,
    practicalExample: {
      description: {
        en: "A fake transport that the test scripts directly, and an RTL integration test that pushes a snapshot, a delete-level delta and a disconnect, then asserts what the user sees.",
        vi: "Một fake transport do test điều khiển trực tiếp, và một integration test với RTL: đẩy snapshot, một delta xoá mức giá, rồi ngắt kết nối và kiểm tra những gì người dùng nhìn thấy.",
      },
      code: {
        language: "tsx",
        code: `// test/fake-transport.ts — no network, the test decides when messages arrive
import { act } from "@testing-library/react";
import type { ClientMsg, ServerMsg, Transport } from "../transport";

export function createFakeTransport() {
  const msgSubs = new Set<(m: ServerMsg) => void>();
  const statusSubs = new Set<(s: "open" | "closed") => void>();
  const sent: ClientMsg[] = [];
  const transport: Transport = {
    connect: () => statusSubs.forEach((cb) => cb("open")),
    send: (m) => void sent.push(m),
    onMessage: (cb) => (msgSubs.add(cb), () => void msgSubs.delete(cb)),
    onStatus: (cb) => (statusSubs.add(cb), () => void statusSubs.delete(cb)),
  };
  return {
    transport,
    sent,
    push: (m: ServerMsg) => act(() => msgSubs.forEach((cb) => cb(m))),
    drop: () => act(() => statusSubs.forEach((cb) => cb("closed"))),
  };
}

// order-book.test.tsx
it("removes a level on size 0 and shows the reconnecting state", async () => {
  const fake = createFakeTransport();
  render(<OrderBook symbol="ABC-USD" transport={fake.transport} />);
  expect(fake.sent).toContainEqual({ type: "subscribe", channel: "book", symbol: "ABC-USD" });

  fake.push({ type: "snapshot", seq: 1, bids: [["100.50", "2"]], asks: [["101.00", "1"]] });
  expect(screen.getByRole("row", { name: /100\\.50/ })).toBeInTheDocument();

  fake.push({ type: "delta", seq: 2, side: "bid", price: "100.50", size: "0" });
  expect(screen.queryByRole("row", { name: /100\\.50/ })).not.toBeInTheDocument();

  fake.drop();
  expect(await screen.findByRole("status")).toHaveTextContent(/reconnecting/i);
});`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  S["Message schemas: Zod or JSON Schema"] --> C["Contract tests vs Rust and Python fixtures"]
  S --> U["Unit: reducers, gap detection, candles"]
  U --> I["RTL integration: real store + FakeTransport"]
  I --> E["Playwright E2E: routeWebSocket mock server"]
  E --> R["Staging smoke: real WS and SSE"]
  T["Transport interface"] -.->|"fake injected"| I
  T -.->|"routed in browser"| E
  T -.->|"real socket"| R`,
      caption: {
        en: "Testing layers for a streaming dashboard: shared schemas feed contract and unit tests; the transport interface lets each higher layer swap the socket.",
        vi: "Các tầng kiểm thử cho dashboard streaming: schema dùng chung cho contract test và unit test; transport interface cho phép mỗi tầng phía trên thay socket.",
      },
    },
    memoryShortcut: {
      en: "Pure → Fake → Route → Real (plus Contract around everything).",
      vi: "Thuần → Giả → Route → Thật (và Contract bao quanh tất cả).",
    },
    keyTakeaway: {
      en: "Put the WebSocket behind an interface so most tests are fast and deterministic, and spend the expensive E2E and staging tests only on critical journeys and schema drift.",
      vi: "Đặt WebSocket sau một interface để phần lớn test nhanh và deterministic; chỉ dùng E2E và staging (đắt hơn) cho các luồng quan trọng và việc phát hiện schema drift.",
    },
    followUps: [
      {
        id: "isb-q45-f1",
        question: {
          en: "How do you stop the fake transport from drifting away from the real backend protocol?",
          vi: "Làm sao để fake transport không bị lệch so với protocol thật của backend?",
        },
        answer: {
          en: "The fake doesn't define its own messages. It's typed against the same ServerMsg union that's inferred from the shared schemas, so if the protocol changes, the fakes stop compiling. Fixtures are recorded from staging, sanitised and checked into the repo, and a CI job validates them against the current schema. On the backend side, the Rust or Python service runs the same fixtures, or a consumer-driven contract test, so a breaking change fails their pipeline before it reaches ours. Finally, a staging smoke test checks one real round-trip, because mocks can't catch proxy or auth problems.",
          vi: "Fake không tự định nghĩa message riêng. Nó được type theo đúng union ServerMsg suy ra từ schema dùng chung, nên khi protocol đổi thì fake sẽ không compile được. Fixture được ghi lại từ staging, làm sạch dữ liệu rồi commit vào repo, và một job CI validate chúng với schema hiện tại. Phía backend Rust/Python cũng chạy cùng bộ fixture đó hoặc consumer-driven contract test, nên breaking change sẽ làm pipeline của họ fail trước khi tới frontend. Cuối cùng, một staging smoke test kiểm tra một round-trip thật, vì mock không bắt được lỗi proxy hay auth.",
        },
      },
      {
        id: "isb-q45-f2",
        question: {
          en: "What would you deliberately not test?",
          vi: "Có những gì bạn cố ý không test?",
        },
        answer: {
          en: "I don't test library internals: whether TanStack Virtual computes offsets correctly or how a charting library draws a candle. I don't assert exact render counts everywhere, because that couples tests to implementation and breaks on harmless refactors; I keep a few targeted render-count tests only for the hot paths where re-renders really matter. And I don't assert pixels on canvas charts in unit tests. I test the data series fed into the chart, and cover the visuals with a small number of stable visual snapshots in Playwright.",
          vi: "Tôi không test phần bên trong của thư viện, ví dụ TanStack Virtual tính offset có đúng không hay thư viện chart vẽ một nến ra sao. Tôi không assert số lần render ở mọi nơi, vì như vậy test bị gắn chặt vào implementation và sẽ vỡ khi refactor vô hại; chỉ giữ vài test đếm render cho những hot path mà re-render thực sự quan trọng. Tôi cũng không assert pixel của chart canvas trong unit test, mà test chuỗi dữ liệu đưa vào chart, và để phần hình ảnh cho một số ít visual snapshot ổn định trong Playwright.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement:
      "Unit, integration and E2E test suites (Jest, RTL, Playwright, Cypress) for real-time WebSocket/SSE dashboards",
    candidateExperience: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "Automated testing in an enterprise React/TypeScript frontend at Persefoni is real experience. Testing WebSocket streams with a fake transport and contract tests is a recommended approach for this role. Present it as how you would apply your testing practice here, not as something you built at Persefoni.",
        vi: "Kinh nghiệm automated testing cho frontend React/TypeScript enterprise ở Persefoni là thật. Việc test WebSocket stream bằng fake transport và contract test là cách tiếp cận đề xuất cho vị trí này. Hãy trình bày đó là cách bạn sẽ áp dụng kinh nghiệm testing vào đây, không nói là đã xây dựng nó ở Persefoni.",
      },
    },
    tags: ["testing", "websocket", "test-pyramid", "contract-testing", "rtl"],
  },

  /* ------------------------------------------------------------------ */
  /* Q46 — React Testing Library, flaky async, fake timers                */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q46",
    number: 46,
    topicId: "testing-python-linux",
    question: {
      en: "What are your React Testing Library best practices, how do you avoid flaky async tests, and how do you test a component that throttles a high-frequency price stream?",
      vi: "Bạn có những best practice nào với React Testing Library, làm sao tránh async test bị flaky, và test một component throttle luồng giá tần suất cao như thế nào?",
    },
    answer: `I follow three principles.

First, query like a user. I reach for getByRole with an accessible name, then label text, and test IDs only as a last resort. That keeps tests resilient to refactors, and it quietly enforces accessibility: if I can't find the price cell by its role, a screen reader can't either. I use user-event rather than fireEvent, because it simulates the whole sequence of focus, key and input events.

Second, async discipline. Most flaky tests either assert before the UI has settled, or leak state between tests. I use findBy queries, or waitFor with a single assertion inside, never fixed sleeps, and never side effects inside waitFor, because it re-runs the callback. I reset stores, fake transports and MSW handlers after each test.

Third, control time. A trading widget might flush ticks every 250 milliseconds, and it has heartbeats and reconnect backoff. With real timers those tests are slow and nondeterministic, so I use fake timers: push five ticks, advance the clock by 250 milliseconds inside act, and assert that only the last price is shown. There are two gotchas. user-event needs the advanceTimers option, otherwise it hangs. And with Vitest, Testing Library's findBy doesn't auto-advance fake timers the way it does with Jest, so I advance explicitly and then use getBy.

The trade-off is that fake timers can hide bugs that depend on real scheduling, so I leave true timing behaviour to a couple of Playwright tests.`,
    viExplanation: `Câu trả lời gồm ba nguyên tắc dễ nhớ.

Một: query giống người dùng. Ưu tiên getByRole với accessible name, sau đó là label, và chỉ dùng test id khi không còn cách nào khác. Test sẽ ít vỡ khi refactor, và đồng thời ép component phải accessible — nếu test không tìm được ô giá theo role thì screen reader cũng không. Dùng user-event thay vì fireEvent vì nó mô phỏng đầy đủ chuỗi sự kiện focus, keydown, input.

Hai: kỷ luật với async. Phần lớn test flaky là do assert khi UI chưa ổn định, hoặc state bị rò rỉ giữa các test. Dùng findBy hoặc waitFor với một assertion duy nhất bên trong, không dùng sleep cố định, và không đặt side effect trong waitFor vì callback sẽ bị chạy lại nhiều lần. Reset store, fake transport và MSW handler sau mỗi test.

Ba: tự điều khiển thời gian. Component throttle tick mỗi 250ms, có heartbeat và reconnect backoff — dùng fake timers rồi advance thủ công bên trong act. Hai điểm hay bị hỏi: user-event cần option advanceTimers, nếu không sẽ bị treo; và với Vitest, findBy không tự advance fake timers như với Jest, nên hãy advance trước rồi dùng getBy. Trade-off: fake timers có thể che bug liên quan tới scheduling thật, nên để vài test Playwright kiểm tra timing thật.`,
    technicalExplanation: `### Query priority (and why it matters)
- \`getByRole\` with \`name\` → \`getByLabelText\` → \`getByText\` → \`getByTestId\` as the last resort.
- Role queries double as accessibility checks: grids, rows, \`status\` live regions and dialogs must be exposed correctly.
- \`getBy\` throws if missing, \`queryBy\` returns \`null\` (use it only for "is not there"), \`findBy\` returns a Promise that retries.

### Sources of flakiness
- **Asserting too early:** a state update lands after a microtask or a timer. Fix with \`findBy\` or a timer advance inside \`act\`, not with \`setTimeout\` sleeps.
- **Side effects inside \`waitFor\`:** the callback runs many times, so clicking or pushing a message inside it repeats the action.
- **Leaked state:** module-level Zustand stores, QueryClient caches, MSW handlers or fake transports reused between tests. Create a fresh QueryClient per test and reset stores in \`afterEach\`.
- **"not wrapped in act" warnings:** they mean a state update happened outside the test's control. Usually a timer or subscription fired late; treat it as a real bug in the test.
- **Unmocked network:** MSW with \`onUnhandledRequest: "error"\` makes a forgotten request fail loudly instead of hanging.

### Fake timers for throttled streams
- Since Vitest 3, \`vi.useFakeTimers()\` fakes every timer API the environment provides by default (\`setTimeout\`, \`setInterval\`, \`Date\`, \`requestAnimationFrame\`, \`performance.now\`…), except \`nextTick\` and \`queueMicrotask\`. Older Vitest versions faked a narrower set, so check \`toFake\` on older setups.
- Advance with \`vi.advanceTimersByTime(ms)\` inside \`act\` so React flushes the resulting update before you assert.
- \`userEvent.setup({ advanceTimers: vi.advanceTimersByTime })\`: user-event inserts small delays between keystrokes; without this it waits for a clock that never moves.
- Testing Library's async utilities auto-advance fake timers only when they detect **Jest** fake timers. Under Vitest, either advance manually and use \`getBy\`, or enable \`shouldAdvanceTime\`.
- If the component flushes on \`requestAnimationFrame\`, confirm rAF is actually faked in your setup (it is by default in Vitest 3+, but not if you pass a custom \`toFake\` list), or inject a scheduler so the test can call \`flush()\` directly.

### What to assert in a throttled component
- After a burst: the **latest** value is shown, intermediate values never committed.
- Before the window closes: the old value is still visible (proves throttling actually happens).
- Optionally, a render counter (\`React.Profiler\` \`onRender\`) confirms one commit per window. Keep this to hot-path components.

### Trade-offs
- Fake timers make tests fast and deterministic but can hide bugs that depend on real event-loop ordering.
- RTL tests run in jsdom: no layout, no real scrolling, no canvas. Virtualization and charts need either mocked measurements or Playwright.`,
    practicalExample: {
      description: {
        en: "Testing a price ticker that conflates ticks into one update every 250 ms, and a debounced watchlist search, with fake timers under Vitest.",
        vi: "Test một price ticker gộp tick thành một lần cập nhật mỗi 250 ms, và ô tìm kiếm watchlist có debounce, bằng fake timers trên Vitest.",
      },
      code: {
        language: "tsx",
        code: `import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createFakeTransport } from "./test/fake-transport"; // push() wraps act
import { PriceTicker } from "./PriceTicker"; // flushes at most once per 250 ms
import { Watchlist } from "./Watchlist"; // search input debounced by 300 ms

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("conflates a burst of ticks into one visible update per window", () => {
  const fake = createFakeTransport();
  render(<PriceTicker symbol="EURUSD" transport={fake.transport} />);
  const price = () => screen.getByRole("status", { name: /eurusd price/i });

  for (const px of ["1.0841", "1.0842", "1.0845"]) fake.push({ type: "tick", symbol: "EURUSD", px });
  expect(price()).not.toHaveTextContent("1.0845"); // window not closed yet

  act(() => {
    vi.advanceTimersByTime(250);
  });
  expect(price()).toHaveTextContent("1.0845"); // only the latest tick is committed
});

it("filters the watchlist after the debounce delay", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<Watchlist symbols={["EURUSD", "USDJPY", "GBPUSD"]} />);

  await user.type(screen.getByRole("searchbox", { name: /filter symbols/i }), "jpy");
  expect(screen.getAllByRole("row")).toHaveLength(3); // not filtered yet

  act(() => {
    vi.advanceTimersByTime(300);
  });
  expect(screen.getAllByRole("row")).toHaveLength(1);
  expect(screen.getByRole("row", { name: /usdjpy/i })).toBeInTheDocument();
});`,
      },
    },
    diagram: {
      kind: "sequence",
      code: `sequenceDiagram
  participant T as Test
  participant F as FakeTransport
  participant C as PriceTicker
  participant K as Fake clock
  participant D as DOM
  T->>F: push 3 ticks inside act
  F->>C: onMessage x3, keep only latest
  C->>K: schedule flush in 250 ms
  T->>D: assert old price still shown
  T->>K: advanceTimersByTime 250 inside act
  K->>C: run flush callback
  C->>D: one commit with the last tick
  T->>D: getByRole status shows 1.0845`,
      caption: {
        en: "The test owns both the message stream and the clock, so throttling becomes deterministic.",
        vi: "Test nắm quyền điều khiển cả luồng message lẫn đồng hồ, nên việc throttle trở nên deterministic.",
      },
    },
    memoryShortcut: {
      en: "ROLE · AWAIT · CLOCK — query by role, await the right way, own the clock.",
      vi: "ROLE · AWAIT · CLOCK — query theo role, chờ đúng cách, tự điều khiển đồng hồ.",
    },
    keyTakeaway: {
      en: "Reliable RTL tests query by accessible role, never sleep, isolate state per test, and drive throttles and debounces with fake timers advanced inside act.",
      vi: "Test RTL đáng tin cậy là test query theo accessible role, không dùng sleep, cô lập state cho từng test, và điều khiển throttle/debounce bằng fake timers được advance bên trong act.",
    },
    followUps: [
      {
        id: "isb-q46-f1",
        question: {
          en: 'You see "An update was not wrapped in act(...)" warnings in CI. How do you handle them?',
          vi: 'Bạn thấy cảnh báo "An update was not wrapped in act(...)" trong CI. Bạn xử lý thế nào?',
        },
        answer: {
          en: "I treat them as real bugs in the test, not noise. The warning means React state changed after the test thought it was done: a promise resolved late, a timer fired, or a subscription pushed a message. First I find the source, usually a fetch or a timer the test didn't await. Then I either await the visible result with findBy, or advance fake timers inside act. If the update happens after the test ends, the cleanup is missing: an unsubscribed socket or an uncancelled timer, which is also a memory-leak smell in production code. I'd also make the warning fail CI so it can't come back.",
          vi: "Tôi coi đó là bug thật của test chứ không phải nhiễu. Cảnh báo này nghĩa là state React thay đổi sau khi test nghĩ rằng mọi thứ đã xong: một promise resolve muộn, một timer chạy, hoặc subscription đẩy message tới. Đầu tiên tìm nguồn gốc, thường là fetch hoặc timer mà test không await. Sau đó await kết quả hiển thị bằng findBy, hoặc advance fake timers bên trong act. Nếu update xảy ra sau khi test kết thúc thì nghĩa là thiếu cleanup — socket chưa unsubscribe hoặc timer chưa huỷ — và đó cũng là dấu hiệu memory leak trong code production. Tôi cũng cấu hình để cảnh báo này làm fail CI, tránh tái diễn.",
        },
      },
      {
        id: "isb-q46-f2",
        question: {
          en: "How would you test a virtualized table in jsdom, which has no layout?",
          vi: "Bạn test một bảng virtualized trong jsdom — vốn không có layout — như thế nào?",
        },
        answer: {
          en: "In jsdom every element reports zero size, so a virtualizer usually renders nothing or everything. I'd split it. In RTL I test the row rendering and data logic, either by mocking the measurement, for example stubbing getBoundingClientRect or passing a fixed initial rect to the virtualizer, or by testing the row component on its own. Real scrolling behaviour, like that only a window of rows is in the DOM, the scroll position stays stable when live rows arrive, and sticky headers work, belongs in Playwright, where a real browser does real layout.",
          vi: "Trong jsdom mọi element đều có kích thước bằng 0, nên virtualizer thường render không dòng nào hoặc render tất cả. Tôi tách ra. Ở RTL, tôi test việc render dòng và logic dữ liệu, bằng cách mock phép đo (stub getBoundingClientRect hoặc truyền initial rect cố định cho virtualizer), hoặc test riêng component của dòng. Còn hành vi scroll thật — chỉ một cửa sổ dòng nằm trong DOM, vị trí scroll giữ ổn định khi có dòng mới đến, sticky header hoạt động — thì để cho Playwright, nơi trình duyệt thật tính layout thật.",
        },
      },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement:
      "Proven experience setting up and maintaining automated UI test suites (Jest, React Testing Library)",
    candidateExperience: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "Automated testing plus WCAG/ARIA work at Persefoni is real, so the role-based query plus accessibility angle is honest to connect. The throttled-stream and fake-timer example is a recommended approach for this role, not a Persefoni project.",
        vi: "Kinh nghiệm automated testing và WCAG/ARIA ở Persefoni là thật, nên liên hệ việc query theo role với accessibility là trung thực. Ví dụ stream có throttle và fake timers là cách tiếp cận đề xuất cho vị trí này, không phải dự án ở Persefoni.",
      },
    },
    tags: ["react-testing-library", "fake-timers", "flaky-tests", "user-event", "vitest"],
  },

  /* ------------------------------------------------------------------ */
  /* Q47 — Playwright E2E for streaming UIs                               */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q47",
    number: 47,
    topicId: "testing-python-linux",
    question: {
      en: "How do you write reliable Playwright end-to-end tests for a streaming UI — mocking WebSocket and SSE traffic, visual regression of live data, and running it all in CI?",
      vi: "Làm sao viết Playwright end-to-end test ổn định cho một UI streaming — mock lưu lượng WebSocket và SSE, visual regression cho dữ liệu đang chạy, và chạy tất cả trong CI?",
    },
    answer: `The hard part of end-to-end testing a streaming UI is that the data never stops, so assertions and screenshots race against it. My approach is to script the stream and control the clock.

For WebSockets, I use Playwright's routeWebSocket. The test becomes the server: when the client subscribes, I send a snapshot; then I push specific deltas at specific moments; and I can close the socket with an error code to test reconnection. For SSE, route.fulfill can return a scripted event-stream body, but it delivers everything at once, so for a truly incremental stream I run a tiny mock server instead. page.clock lets me fast-forward heartbeats and backoff without waiting real seconds.

For assertions I only use web-first expects like toBeVisible and toHaveText, which retry automatically, so there are no fixed waits.

For visual regression, I only screenshot a frozen state: stream paused, clock fixed, animations disabled, and volatile regions like timestamps masked. I generate and compare baselines inside the official Playwright Docker image, because fonts render differently on macOS and Linux, and laptop baselines will fail in CI.

In CI I shard across workers, allow one retry with a trace recorded on that retry, upload the HTML report, and track flaky tests explicitly instead of hiding them. And I keep E2E small: load the dashboard, see live updates, survive a disconnect, place an order. Everything else goes down to cheaper layers.`,
    viExplanation: `Khó khăn lớn nhất khi test E2E một UI streaming là dữ liệu chạy liên tục, nên assertion và screenshot luôn "chạy đua" với nó. Cách giải: tự viết kịch bản cho stream và tự điều khiển đồng hồ.

Với WebSocket, dùng page.routeWebSocket — test đóng vai server: client subscribe thì gửi snapshot, sau đó đẩy delta vào đúng thời điểm mong muốn, và có thể đóng socket với mã lỗi để test reconnect. Với SSE, route.fulfill trả về một body text/event-stream có sẵn, nhưng toàn bộ body được gửi một lần; nếu cần stream tăng dần thật sự thì chạy một mock server nhỏ. page.clock cho phép tua nhanh heartbeat và backoff thay vì chờ thật.

Assertion chỉ dùng web-first như toBeVisible, toHaveText — chúng tự retry nên không cần wait cố định.

Visual regression: chỉ chụp khi trạng thái đã "đóng băng" — dừng stream, cố định clock, tắt animation, mask các vùng hay thay đổi như timestamp. Baseline phải tạo trong Docker image chính thức của Playwright, vì font trên macOS và Linux render khác nhau.

Trong CI: shard theo worker, retry tối đa một lần và ghi trace ở lần retry, upload HTML report, theo dõi test flaky công khai thay vì giấu bằng retry. Giữ E2E ít và tập trung vào luồng quan trọng.`,
    technicalExplanation: `### Scripting the stream
- **WebSocket:** \`page.routeWebSocket(url, handler)\` intercepts sockets the page opens. Inside the handler, \`ws.onMessage\` sees client frames, \`ws.send\` pushes server frames, \`ws.close({ code, reason })\` simulates a drop. Call \`ws.connectToServer()\` instead if you want to proxy to a real backend and only tamper with some frames.
- The handler runs again for every **new** socket, so a reconnect test naturally exercises resubscribe → snapshot.
- **SSE:** \`page.route\` + \`route.fulfill({ contentType: "text/event-stream", body })\` works for "first events render correctly". The body is sent in one go, so for incremental or long-lived streams use a small local mock server (Node, or a FastAPI stub) started via \`webServer\` in the config.
- **REST:** \`page.route\` or MSW for snapshots and order placement.

### Controlling time
- \`page.clock.install()\` **before** \`page.goto\` fakes \`Date\`, timers and \`performance.now\` in the page.
- \`page.clock.runFor(ms)\` fast-forwards heartbeats, stale-data thresholds and backoff; \`setFixedTime\` freezes "now" for stable timestamps and candle boundaries.

### Assertions that don't race
- Web-first assertions (\`toBeVisible\`, \`toHaveText\`, \`toHaveCount\`) poll until the condition holds or the timeout expires.
- Avoid \`waitForTimeout\`; it is either too short (flaky) or too long (slow).
- Locate by role and accessible name, like RTL, so selectors survive refactors.

### Visual regression of live data
- Screenshot only a deterministic state: stream stopped, clock fixed, \`animations: "disabled"\`, \`mask\` over timestamps, latency counters and flashing price cells.
- Canvas charts are the main reason to do visual tests at all; seed them with a fixed series.
- Baselines differ per OS, browser and font stack. Generate and compare them in the same pinned \`mcr.microsoft.com/playwright\` image, matching the installed Playwright version.
- Keep \`maxDiffPixelRatio\` tight; a loose threshold silently accepts regressions.

### CI setup
- Build once, serve the production build, run tests against it (\`webServer\` in the config).
- \`--shard=i/n\` across machines plus \`workers\` per machine; tests must be independent and must not share accounts or server state.
- \`retries: 1\` on CI with \`trace: "on-first-retry"\`; upload the HTML report and traces as artifacts.
- Report flaky tests (passed on retry) separately and fix them; retries are a diagnostic, not a cure.

### Trade-offs and failure modes
- Mocked sockets can't catch proxy buffering, Upgrade-header stripping, auth cookies or TLS issues. Keep one or two smoke tests against staging.
- E2E is the slowest, most expensive layer. A suite of 10–20 critical journeys is usually more valuable than hundreds of brittle ones.`,
    practicalExample: {
      description: {
        en: "A Playwright test that acts as the WebSocket server: it sends a snapshot on subscribe, pushes a live fill, drops the socket, fast-forwards the reconnect backoff and finishes with a masked visual snapshot.",
        vi: "Một Playwright test đóng vai WebSocket server: gửi snapshot khi client subscribe, đẩy một fill mới, ngắt socket, tua nhanh thời gian backoff khi reconnect, và kết thúc bằng một visual snapshot có mask.",
      },
      code: {
        language: "ts",
        code: `import { test, expect, type WebSocketRoute } from "@playwright/test";

type Fill = { id: string; symbol: string; qty: number; px: string };
const json = (v: unknown) => JSON.stringify(v);

test("blotter streams fills and recovers from a dropped socket", async ({ page }) => {
  const fills: Fill[] = [{ id: "F1", symbol: "ABC", qty: 100, px: "10.25" }];
  let seq = 1;
  let server!: WebSocketRoute;

  // Runs for every new socket, so a reconnect gets a fresh snapshot
  await page.routeWebSocket(/\\/ws\\/stream$/, (ws) => {
    server = ws;
    ws.onMessage((raw) => {
      const msg = JSON.parse(String(raw)) as { type: string };
      if (msg.type === "subscribe") ws.send(json({ type: "snapshot", seq, fills }));
    });
  });
  await page.clock.install({ time: new Date("2026-01-05T09:30:00Z") });
  await page.goto("/blotter");
  await expect(page.getByRole("row", { name: /F1/ })).toBeVisible();

  const f2: Fill = { id: "F2", symbol: "XYZ", qty: 50, px: "99.10" };
  fills.push(f2);
  server.send(json({ type: "fill", seq: ++seq, fill: f2 }));
  await expect(page.getByRole("row", { name: /F2/ })).toBeVisible();

  await server.close({ code: 4000, reason: "test drop" });
  await expect(page.getByRole("status")).toHaveText(/reconnecting/i);
  await page.clock.runFor(5_000); // fast-forward the backoff timer
  await expect(page.getByRole("status")).toHaveText(/live/i);

  await expect(page.getByRole("grid", { name: /blotter/i })).toHaveScreenshot("blotter-recovered.png", {
    animations: "disabled",
    mask: [page.getByTestId("last-update-time")],
  });
});`,
      },
    },
    diagram: {
      kind: "sequence",
      code: `sequenceDiagram
  participant T as Playwright test
  participant B as Browser app
  participant R as routeWebSocket handler
  participant C as page.clock
  B->>R: open socket and send subscribe
  R-->>B: snapshot seq 1 with F1
  T->>R: push fill seq 2
  B-->>T: row F2 visible, web-first assert retries
  T->>R: close with code 4000
  B-->>T: status shows Reconnecting
  T->>C: runFor 5000 ms
  B->>R: new socket, subscribe again
  R-->>B: snapshot with F1 and F2
  T->>B: toHaveScreenshot with masks`,
      caption: {
        en: "The test plays the server and owns the clock, so live updates, disconnects and recovery happen exactly when the test says.",
        vi: "Test đóng vai server và nắm quyền điều khiển đồng hồ, nên update, ngắt kết nối và phục hồi xảy ra đúng lúc test muốn.",
      },
    },
    memoryShortcut: {
      en: "Script the stream, freeze the clock, mask the noise, pin the image.",
      vi: "Viết kịch bản cho stream, đóng băng đồng hồ, che phần nhiễu, cố định Docker image.",
    },
    keyTakeaway: {
      en: "Streaming E2E tests become reliable when the test acts as the server, controls time, uses retrying assertions, and only takes screenshots of a frozen, masked state inside a pinned Linux image.",
      vi: "E2E test cho UI streaming trở nên ổn định khi test đóng vai server, kiểm soát thời gian, dùng assertion tự retry, và chỉ chụp màn hình ở trạng thái đã đóng băng, có mask, trong một Linux image cố định.",
    },
    followUps: [
      {
        id: "isb-q47-f1",
        question: {
          en: "Your E2E suite has a 3% flake rate in CI. What do you do?",
          vi: "Bộ E2E của bạn có tỉ lệ flaky 3% trên CI. Bạn làm gì?",
        },
        answer: {
          en: "First I make flakiness visible: the reporter lists tests that passed only on retry, and I look at the trace of the failed attempt rather than guessing. The usual causes are a fixed wait instead of a web-first assertion, tests sharing server state or an account, animations or live data in screenshots, and real timers around reconnect logic. I quarantine a test only with a ticket and an owner, so it doesn't rot. And I check whether the flake is actually a product bug, for example a race between the snapshot and the first delta, because that kind of flake is the test doing its job.",
          vi: "Trước hết làm cho flaky hiện rõ: reporter liệt kê các test chỉ pass ở lần retry, và tôi xem trace của lần fail thay vì đoán. Nguyên nhân thường gặp: wait cố định thay vì web-first assertion, các test dùng chung state server hoặc tài khoản, animation hay dữ liệu live lọt vào screenshot, và timer thật xung quanh logic reconnect. Tôi chỉ quarantine một test khi có ticket và người phụ trách, để nó không bị bỏ quên. Và tôi kiểm tra xem flaky có phải bug thật của sản phẩm không — ví dụ race giữa snapshot và delta đầu tiên — vì khi đó test đang làm đúng nhiệm vụ.",
        },
      },
      {
        id: "isb-q47-f2",
        question: {
          en: "Playwright or Cypress for this platform?",
          vi: "Với nền tảng này nên dùng Playwright hay Cypress?",
        },
        answer: {
          en: "The JD lists both, so I'd follow whatever the team already has; consistency beats preference. If it's a fresh choice, I'd lean towards Playwright for a streaming trading UI: first-class WebSocket routing, a built-in clock API, multiple tabs and browser contexts, which matters for testing a SharedWorker or multi-tab single connection, plus WebKit and Firefox coverage and cheap parallelism. Cypress has a great interactive runner and a mature ecosystem, and its component testing is good. But it runs inside the browser and handles multi-tab scenarios and socket mocking less naturally.",
          vi: "JD liệt kê cả hai, nên tôi sẽ theo công cụ mà team đang dùng — nhất quán quan trọng hơn sở thích. Nếu được chọn từ đầu, tôi nghiêng về Playwright cho một UI trading streaming: hỗ trợ route WebSocket sẵn, có clock API, hỗ trợ nhiều tab và browser context (quan trọng khi test SharedWorker hay một kết nối dùng chung cho nhiều tab), chạy cả WebKit và Firefox, và chạy song song rẻ. Cypress có interactive runner rất tốt, hệ sinh thái trưởng thành và component testing tốt, nhưng vì chạy bên trong trình duyệt nên kịch bản nhiều tab và mock socket kém tự nhiên hơn.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement:
      "E2E test suites (Playwright/Cypress) for interactive, low-latency dashboards fed by WebSockets and SSE",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "Playwright and Cypress are listed skills and automated testing at Persefoni is real, but WebSocket routing and visual regression for live financial data are not documented in the profile. Frame this as how you would set it up here; mention your real automated-testing background without claiming these specific techniques at a previous company.",
        vi: "Playwright và Cypress là kỹ năng có trong profile, và automated testing ở Persefoni là thật, nhưng việc route WebSocket và visual regression cho dữ liệu tài chính live không có trong profile. Hãy trình bày đây là cách bạn sẽ thiết lập ở vị trí này; có thể nhắc nền tảng automated testing thật nhưng không nhận đã dùng chính các kỹ thuật này ở công ty cũ.",
      },
    },
    tags: ["playwright", "e2e", "websocket", "visual-regression", "ci"],
  },

  /* ------------------------------------------------------------------ */
  /* Q48 — Python for a frontend engineer                                 */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q48",
    number: 48,
    topicId: "testing-python-linux",
    question: {
      en: "The backend is partly Python. As a frontend engineer, how do you read a FastAPI service, how does Python's async/await differ from JavaScript's, and how do Pydantic and Zod fit together?",
      vi: "Một phần backend viết bằng Python. Là frontend engineer, bạn đọc một service FastAPI như thế nào, async/await của Python khác JavaScript ra sao, và Pydantic với Zod phối hợp với nhau thế nào?",
    },
    answer: `I'd say up front that in this role I expect to read Python more often than write it, but being able to open the FastAPI service and understand the contract saves a lot of back-and-forth.

When I read a FastAPI service, I look at three things. The path operations: the decorators tell me the method, route, response model and status codes. The Pydantic models, which are the real contract, including optional fields, defaults and validators. And the dependencies, which is where auth and database sessions get injected. Because FastAPI generates OpenAPI from those models, I'd generate TypeScript types from the OpenAPI document instead of hand-writing them.

On async, the syntax looks the same, but the model is different. In JavaScript, calling an async function starts running it immediately, and the standard I/O APIs are non-blocking by design. In Python, calling a coroutine does nothing until it's awaited or scheduled. And if someone calls a blocking library or does heavy CPU work inside an async endpoint, it blocks the entire event loop. On the frontend that shows up as random latency spikes on unrelated endpoints, including the streaming ones.

Pydantic and Zod play the same role on opposite sides of the wire: runtime validation at a trust boundary. I keep both, because generated types disappear at runtime and a backend deploy can change a payload before the frontend ships. One detail matters a lot in finance: Decimal fields should arrive as strings, never as floats.`,
    viExplanation: `Nên mở đầu trung thực: ở vị trí này mình chủ yếu đọc Python nhiều hơn viết, nhưng đọc hiểu được service FastAPI giúp giảm rất nhiều trao đổi qua lại với backend. (JD có chữ Python trong tiêu đề, nhưng việc frontend có phải viết Python hay không thì chưa được xác minh — nên hỏi lại khi phỏng vấn.)

Đọc FastAPI theo ba điểm: path operation (decorator cho biết method, route, response model, status code); Pydantic model — đây chính là contract thật, gồm field optional, default và validator; và dependency (Depends) — nơi inject auth và DB session. Vì FastAPI tự sinh OpenAPI từ model, hãy generate TypeScript type từ OpenAPI thay vì viết tay.

Về async: cú pháp giống nhưng mô hình khác. Trong JS, gọi hàm async là nó bắt đầu chạy ngay, và các API I/O chuẩn vốn non-blocking. Trong Python, gọi coroutine không làm gì cho tới khi được await hoặc schedule; và nếu trong endpoint async lại gọi thư viện blocking hoặc tính toán nặng thì cả event loop bị chặn — frontend sẽ thấy latency tăng đột biến ở những endpoint không liên quan, kể cả streaming.

Pydantic và Zod cùng một vai trò ở hai đầu: validate dữ liệu lúc runtime tại ranh giới tin cậy. Giữ cả hai vì type sinh ra sẽ biến mất lúc runtime. Với tài chính: Decimal phải truyền dưới dạng string, không bao giờ là float.`,
    technicalExplanation: `### Reading a FastAPI service in five minutes
\`\`\`python
class Order(BaseModel):
    id: UUID
    symbol: str
    side: Literal["buy", "sell"]
    qty: Decimal
    limit_price: Decimal | None = None

@router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: UUID, user: User = Depends(current_user)) -> Order:
    return await repo.get(order_id)  # must be a non-blocking driver
\`\`\`
- **Decorator:** method, path, \`response_model\` (what is serialised back), \`status_code\`.
- **Pydantic model:** types, optionality (\`X | None = None\`), \`Literal\` enums (→ TS string unions), validators and aliases (snake_case vs camelCase).
- **\`Depends\`:** auth, permissions, DB sessions. This is where 401/403 behaviour lives.
- **Errors:** request validation failures return **422** with \`{ detail: [{ loc, msg, type }] }\`, which the UI can map to form fields.
- \`/openapi.json\` is generated from all of the above, so tools like openapi-typescript can produce TS types.

### Python async vs JavaScript async
- **Eagerness:** a JS async function runs synchronously until its first \`await\`. A Python coroutine object does nothing until awaited or wrapped in a task (\`asyncio.create_task\`).
- **Blocking is opt-in in Python:** JS I/O APIs are non-blocking by design. In Python, a sync library (an HTTP client, a DB driver, a pandas computation) inside \`async def\` blocks the single event loop for every request on that worker.
- **FastAPI nuance:** plain \`def\` endpoints run in a thread pool, so a blocking call there is less harmful than inside \`async def\`.
- **CPU work and the GIL:** heavy computation needs a process pool or a separate worker service; threads don't give parallel CPU in standard CPython.
- **Concurrency primitives:** \`asyncio.gather\` ≈ \`Promise.all\`; \`asyncio.wait_for\` ≈ a race with a timeout; cancellation is explicit via task cancellation, similar to \`AbortController\`.

### Pydantic and Zod: same job, opposite sides
| | Pydantic (server) | Zod (browser) |
|---|---|---|
| Validates | incoming requests, outgoing responses | incoming responses, WS/SSE messages |
| Source of truth | Python classes | TS schemas, or generated from OpenAPI |
| Number handling | \`Decimal\` → JSON **string** (Pydantic v2 default) | keep as string, convert with a decimal library |

- Compile-time types from OpenAPI are free at runtime; Zod costs CPU. On hot WebSocket paths, validate the envelope or sample messages instead of deep-parsing every tick.

### Failure scenarios that reach the frontend
- **Schema drift:** a field renamed in Pydantic, frontend deployed later → Zod fails loudly at the boundary instead of rendering \`undefined\`.
- **Float leakage:** someone changes \`Decimal\` to \`float\` → prices like \`0.1 + 0.2\` artefacts. Guard with a string regex in Zod.
- **Event-loop stalls:** one blocking call → p99 latency spikes and heartbeat timeouts on SSE streams served by the same worker.
- **Mitigation:** an OpenAPI diff in CI on every backend PR, and shared fixtures validated on both sides.`,
    practicalExample: {
      description: {
        en: "A Zod schema that mirrors the Pydantic Order model (decimals as strings), plus a fetch helper that maps FastAPI's 422 validation errors and validates the response at the boundary.",
        vi: "Một Zod schema phản chiếu Pydantic model Order (decimal dạng string), cùng hàm fetch xử lý lỗi validation 422 của FastAPI và validate response ngay tại ranh giới.",
      },
      code: {
        language: "ts",
        code: `import { z } from "zod";

// Mirrors the Pydantic \`Order\` model. Pydantic v2 serialises Decimal as a JSON string.
const DecimalString = z.string().regex(/^-?\\d+(\\.\\d+)?$/, "expected a decimal string");

export const OrderSchema = z.object({
  id: z.uuid(),
  symbol: z.string().min(1),
  side: z.enum(["buy", "sell"]), // Literal["buy", "sell"]
  qty: DecimalString,
  limit_price: DecimalString.nullable(), // Decimal | None = None
});
export type Order = z.infer<typeof OrderSchema>;

const FastApiValidationError = z.object({
  detail: z.array(z.object({ loc: z.array(z.union([z.string(), z.number()])), msg: z.string() })),
});

export async function getOrder(id: string, signal?: AbortSignal): Promise<Order> {
  const res = await fetch("/api/orders/" + encodeURIComponent(id), { signal });
  if (res.status === 422) {
    const { detail } = FastApiValidationError.parse(await res.json());
    throw new Error("Invalid request: " + detail.map((d) => d.loc.join(".") + " " + d.msg).join("; "));
  }
  if (!res.ok) throw new Error("GET /orders failed: HTTP " + res.status);

  const parsed = OrderSchema.safeParse(await res.json());
  if (!parsed.success) {
    // Schema drift between the Python service and this client: fail loudly, report it.
    console.error("Order contract mismatch", z.prettifyError(parsed.error));
    throw new Error("Unexpected order payload from server");
  }
  return parsed.data;
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  P["Pydantic models"] --> F["FastAPI routes"]
  F --> O["openapi.json"]
  O --> G["openapi-typescript codegen"]
  G --> T["TS types, compile time only"]
  F --> W["JSON over HTTP, WS or SSE"]
  W --> Z["Zod parse at client boundary"]
  T -.-> Z
  Z --> U["Stores and React UI"]
  D["CI: OpenAPI diff on backend PRs"] -.-> O`,
      caption: {
        en: "Pydantic is the server-side source of truth; OpenAPI feeds compile-time TS types, while Zod re-checks the actual payload at runtime.",
        vi: "Pydantic là nguồn sự thật ở server; OpenAPI sinh ra TS type cho compile time, còn Zod kiểm tra lại payload thật lúc runtime.",
      },
    },
    memoryShortcut: {
      en: "Read the models, distrust the wire, don't block the loop, strings for money.",
      vi: "Đọc model, đừng tin dữ liệu trên đường truyền, đừng chặn event loop, tiền thì dùng string.",
    },
    keyTakeaway: {
      en: "Treat Pydantic models as the contract, generate TS types from OpenAPI, re-validate at the browser boundary with Zod, and remember that one blocking call in async Python stalls every request on that worker.",
      vi: "Coi Pydantic model là contract, sinh TS type từ OpenAPI, validate lại ở phía trình duyệt bằng Zod, và nhớ rằng chỉ một lời gọi blocking trong async Python cũng làm nghẽn mọi request trên worker đó.",
    },
    followUps: [
      {
        id: "isb-q48-f1",
        question: {
          en: "The price stream served by a FastAPI endpoint stutters whenever someone opens the reports page. What would you suspect?",
          vi: "Luồng giá do một endpoint FastAPI phục vụ bị giật mỗi khi có người mở trang báo cáo. Bạn nghi ngờ điều gì?",
        },
        answer: {
          en: "My first suspect is a blocking call inside an async endpoint: the reports handler runs a synchronous database query or a heavy computation inside async def, which freezes the event loop, so the SSE generator on the same worker can't yield its next event. I'd confirm it from the frontend side by checking the gaps between events in the Network panel, then with the backend team using worker logs or a profiler. Typical fixes are an async driver, running the work in a thread pool, moving CPU-heavy reports to a separate worker or service, or isolating streaming endpoints on their own workers.",
          vi: "Nghi ngờ đầu tiên là có lời gọi blocking trong endpoint async: handler của trang báo cáo chạy query DB đồng bộ hoặc tính toán nặng trong async def, làm đóng băng event loop, nên generator SSE trên cùng worker không thể yield event tiếp theo. Tôi sẽ xác nhận từ phía frontend bằng cách xem khoảng trống giữa các event trong tab Network, rồi cùng team backend kiểm tra log của worker hoặc dùng profiler. Cách sửa thường gặp: dùng async driver, đẩy việc sang thread pool, tách báo cáo nặng CPU sang worker hoặc service riêng, hoặc cho endpoint streaming chạy trên worker riêng.",
        },
      },
    ],
    difficulty: "medium",
    priority: "medium",
    jdRequirement:
      "Python in the job title; REST/WS/SSE APIs powered by Rust/Python backends (FE Python scope unverified)",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "Python and FastAPI are listed skills but are not tied to a named production project in the profile. Say you can read and contribute to FastAPI services and that you bring the same runtime-validation discipline you use with TypeScript; do not claim production Python at Persefoni, Ninja Van or NAB. Ask the interviewer how much Python the frontend role actually writes; that is unverified.",
        vi: "Python và FastAPI là kỹ năng có trong profile nhưng không gắn với dự án production cụ thể. Hãy nói bạn đọc hiểu và có thể đóng góp vào service FastAPI, và mang theo cùng tư duy validate runtime như với TypeScript; không nhận đã viết Python production ở Persefoni, Ninja Van hay NAB. Nên hỏi người phỏng vấn frontend thực sự viết Python tới mức nào — điểm này chưa được xác minh.",
      },
    },
    tags: ["python", "fastapi", "pydantic", "zod", "async"],
  },

  /* ------------------------------------------------------------------ */
  /* Q49 — Rust awareness and WebAssembly                                 */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q49",
    number: 49,
    topicId: "testing-python-linux",
    question: {
      en: "Our core services are written in Rust. Why do trading backends choose Rust, what do you understand about ownership, and when would you use Rust compiled to WebAssembly in the browser?",
      vi: "Các service lõi được viết bằng Rust. Vì sao backend giao dịch hay chọn Rust, bạn hiểu gì về ownership, và khi nào bạn dùng Rust biên dịch sang WebAssembly trong trình duyệt?",
    },
    answer: `To be precise, I haven't shipped Rust in production, but I understand why trading backends choose it and what it means for the frontend I'd build on top of it.

The main reason is predictable latency. Rust has no garbage collector, so there are no GC pauses in the hot path, and in trading the tail latency is what users feel. You get performance close to C++, but with memory safety enforced at compile time through ownership. Every value has exactly one owner. You can lend it out either as many shared, read-only borrows, or as one mutable borrow, but never both at once. That rule eliminates data races and use-after-free at compile time, which suits concurrent market-data pipelines.

For me as the frontend engineer, it matters mostly at the boundary. Rust services usually serialise with serde, so I care about the wire format. 64-bit integers, like order IDs or nanosecond timestamps, exceed JavaScript's safe integer range, so they should arrive as strings or be decoded as BigInt. Rust enums with serde's tagged representation map cleanly to TypeScript discriminated unions, and tools like ts-rs or specta can generate those types from the Rust source so they can't drift.

WebAssembly is the other angle. If a client-side hot path, like decoding a binary feed or downsampling a huge series, is genuinely CPU-bound, Rust compiled to WASM inside a Web Worker can help. But I'd profile first. The JavaScript JIT is often fast enough, and copying data across the WASM boundary can eat the gain for small payloads.`,
    viExplanation: `Trả lời trung thực: chưa viết Rust production, nhưng hiểu vì sao backend giao dịch chọn Rust và điều đó ảnh hưởng gì tới frontend.

Lý do chính là latency dễ dự đoán: Rust không có garbage collector nên không có GC pause trên hot path, mà trong giao dịch thì tail latency (p99) mới là thứ người dùng cảm nhận. Hiệu năng gần C++ nhưng an toàn bộ nhớ được kiểm tra lúc compile nhờ ownership: mỗi giá trị chỉ có một owner; có thể "cho mượn" dưới dạng nhiều borrow chỉ đọc, hoặc đúng một borrow có quyền ghi, không bao giờ cả hai cùng lúc. Nhờ vậy data race và use-after-free bị chặn từ compile time.

Với frontend, điều quan trọng nằm ở ranh giới dữ liệu. Rust thường dùng serde để serialize: số nguyên 64-bit như order ID hay timestamp nano giây vượt quá Number.MAX_SAFE_INTEGER của JS, nên phải truyền dạng string hoặc decode thành BigInt. Enum của Rust với tagged representation map rất đẹp sang discriminated union của TypeScript; ts-rs hoặc specta có thể sinh type từ code Rust để tránh lệch.

WebAssembly: chỉ dùng khi một hot path ở client thật sự nặng CPU (decode feed nhị phân, downsample chuỗi dữ liệu lớn) và chạy trong Web Worker. Nhưng phải profile trước — JIT của JS thường đã đủ nhanh, và chi phí copy dữ liệu qua ranh giới WASM có thể ăn hết phần lợi với payload nhỏ.`,
    technicalExplanation: `### Why trading backends pick Rust
- **No GC:** memory is freed deterministically when the owner goes out of scope, so there are no stop-the-world pauses; p99/p999 latency is more predictable than in GC'd runtimes.
- **Memory safety without runtime cost:** the borrow checker rejects dangling pointers, double frees and data races at compile time.
- **Fearless concurrency:** the \`Send\`/\`Sync\` traits make thread-safety part of the type system; async runtimes like tokio power the network services.
- **Zero-cost abstractions:** iterators, generics and enums compile down to code comparable to hand-written C.
- **Cost:** a steeper learning curve and slower compile times, which matter for team velocity.

### Ownership in three rules
1. Each value has a single **owner**; when the owner goes out of scope, the value is dropped.
2. Assignment or passing by value **moves** ownership (unless the type is \`Copy\`); the old binding can't be used.
3. You can **borrow**: any number of \`&T\` (shared, read-only) **or** exactly one \`&mut T\` (exclusive), and borrows can't outlive the owner (lifetimes).

A useful analogy for frontend engineers: it's the "immutable shared state vs single writer" discipline we apply to stores, but checked by the compiler.

### What it means at the wire boundary
\`\`\`rust
#[derive(Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ServerMsg {
    Trade { seq: u64, price: Decimal, qty: Decimal, ts_ns: i64 },
    Heartbeat { ts_ns: i64 },
}
\`\`\`
- \`#[serde(tag = "type")]\` produces \`{ "type": "trade", ... }\` → a TS discriminated union with exhaustive \`switch\`.
- **64-bit integers:** \`u64\`/\`i64\` above 2^53 − 1 lose precision in \`JSON.parse\`. Nanosecond timestamps (~1.7 × 10^18) always exceed it. Ask for strings, or milliseconds, or parse with a BigInt-aware decoder.
- **Decimals:** \`rust_decimal\` serialises to a JSON string by default (confirm the crate features); keep it a string on the client.
- **Binary formats:** protobuf, FlatBuffers or MessagePack cut payload size and parse cost for high-frequency feeds, at the price of tooling and harder debugging.
- **Type generation:** ts-rs or specta emit TS types from Rust structs; run it in CI and fail on diffs.

### WebAssembly in the browser: when it pays off
- **Good fits:** CPU-bound, data-parallel work on large typed arrays: binary feed decoding, compression, downsampling (LTTB) of millions of points, risk or Greeks calculations reused from Rust.
- **Poor fits:** DOM-heavy work (WASM can't touch the DOM directly), small payloads where boundary copies dominate, and code the JS JIT already optimises well.
- **Run it in a Web Worker** so even a fast WASM call never blocks input or rendering; transfer \`ArrayBuffer\`s instead of cloning them.
- **Operational costs:** extra bundle weight and compile time on first load (use streaming compilation and cache it), CSP needs \`'wasm-unsafe-eval'\`, and debugging is harder.
- **Rule:** measure with the Performance panel first, then prototype both paths behind the same interface and keep a JS fallback.`,
    practicalExample: {
      description: {
        en: "A Web Worker that downsamples a large price series with a Rust/WASM function when it's available and the input is large, falls back to a JS implementation otherwise, and transfers the result buffer back.",
        vi: "Một Web Worker downsample chuỗi giá lớn bằng hàm Rust/WASM khi module sẵn sàng và dữ liệu đủ lớn, nếu không thì fallback sang bản JS, rồi transfer buffer kết quả về main thread.",
      },
      code: {
        language: "ts",
        code: `// downsample.worker.ts — Rust built with \`wasm-pack build --target web\`, run off the main thread
import init, { lttb } from "./pkg/series_wasm";
import { lttbJs } from "./lttb";

type Req = { id: number; xs: Float64Array; ys: Float64Array; threshold: number };
type Res = { id: number; out: Float64Array; ms: number; engine: "wasm" | "js" };

// CSP without 'wasm-unsafe-eval', a failed fetch or an old browser -> degrade, don't crash
const wasmReady: Promise<boolean> = init().then(
  () => true,
  () => false,
);

// Below this size, copying into WASM linear memory costs more than it saves. Tune by profiling.
const WASM_MIN_POINTS = 50_000;

self.onmessage = async (e: MessageEvent<Req>) => {
  const { id, xs, ys, threshold } = e.data;
  const useWasm = (await wasmReady) && xs.length >= WASM_MIN_POINTS;

  const t0 = performance.now();
  const out: Float64Array = useWasm ? lttb(xs, ys, threshold) : lttbJs(xs, ys, threshold);
  const res: Res = { id, out, ms: performance.now() - t0, engine: useWasm ? "wasm" : "js" };

  // Transfer ownership of the buffer instead of structured-cloning it
  (self as unknown as Worker).postMessage(res, [out.buffer as ArrayBuffer]); // typed as ArrayBufferLike since TS 5.7
};`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  subgraph BE["Rust services"]
    I["Feed ingestion on tokio"] --> S["serde: JSON or protobuf"]
  end
  S --> G["WS and SSE gateway"]
  G --> W["Web Worker decode"]
  W --> X{"CPU-bound and profiled?"}
  X -->|"yes"| R["Rust compiled to WASM"]
  X -->|"no"| J["Plain TypeScript"]
  R --> M["Main thread store and UI"]
  J --> M
  T["ts-rs or specta generated types"] -.-> W`,
      caption: {
        en: "Rust matters to the frontend at the serialisation boundary and, optionally, as WASM for profiled CPU-bound hot paths inside a worker.",
        vi: "Rust ảnh hưởng tới frontend ở ranh giới serialize dữ liệu và, nếu cần, dưới dạng WASM cho các hot path nặng CPU đã được profile, chạy trong worker.",
      },
    },
    memoryShortcut: {
      en: "No pauses, one owner, big numbers as strings, WASM only after profiling.",
      vi: "Không GC pause, một owner, số lớn thì dùng string, WASM chỉ sau khi đã profile.",
    },
    keyTakeaway: {
      en: "Rust gives trading backends GC-free, memory-safe performance; the frontend's job is to respect its wire types (64-bit integers, decimals, tagged enums) and to reach for WASM only for measured CPU-bound hot paths in a worker.",
      vi: "Rust mang lại cho backend giao dịch hiệu năng không có GC pause và an toàn bộ nhớ; việc của frontend là tôn trọng kiểu dữ liệu trên đường truyền (số nguyên 64-bit, decimal, tagged enum) và chỉ dùng WASM cho hot path nặng CPU đã được đo đạc, chạy trong worker.",
    },
    followUps: [
      {
        id: "isb-q49-f1",
        question: {
          en: "The Rust service sends order IDs as u64 numbers in JSON. What's the problem and what do you propose?",
          vi: "Service Rust gửi order ID dạng số u64 trong JSON. Vấn đề là gì và bạn đề xuất gì?",
        },
        answer: {
          en: "JavaScript numbers are 64-bit floats, so integers are only exact up to 2^53 minus 1. A u64 ID above that gets silently rounded by JSON.parse, so two different orders can end up with the same ID in the UI, and an amend or cancel might target the wrong one. The clean fix is on the Rust side: serialise IDs as strings with a serde attribute, since IDs are identifiers, not numbers. If that's not possible right away, I'd parse with a BigInt-aware JSON parser for those fields, and add a contract test that sends an ID above 2^53.",
          vi: "Number trong JavaScript là số thực 64-bit, nên số nguyên chỉ chính xác tới 2^53 trừ 1. Một ID u64 lớn hơn sẽ bị JSON.parse làm tròn mà không báo lỗi, khiến hai lệnh khác nhau có thể mang cùng một ID trên UI, và thao tác sửa hay huỷ lệnh có thể nhắm nhầm. Cách sửa gọn nhất là ở phía Rust: serialize ID thành string bằng một attribute của serde, vì ID là định danh chứ không phải con số để tính toán. Nếu chưa sửa được ngay, dùng JSON parser hỗ trợ BigInt cho các field đó, và thêm contract test gửi một ID lớn hơn 2^53.",
        },
      },
      {
        id: "isb-q49-f2",
        question: {
          en: "When would you not use WebAssembly, even for a performance problem?",
          vi: "Khi nào bạn không dùng WebAssembly, kể cả khi đang có vấn đề hiệu năng?",
        },
        answer: {
          en: "When the bottleneck isn't JavaScript execution. Most dashboard slowness is rendering: too many React re-renders, layout thrashing, an unvirtualized table, or an SVG chart with too many nodes. WASM can't touch the DOM, so it doesn't help there. I'd also avoid it for small, frequent calls, where copying data in and out costs more than the computation. And I'd weigh the operational cost: a bigger first load, a CSP change, harder debugging and a Rust toolchain in the frontend build. The order is to profile, fix the rendering, move work to a worker, and only then consider WASM.",
          vi: "Khi điểm nghẽn không nằm ở việc thực thi JavaScript. Phần lớn dashboard chậm là do rendering: re-render React quá nhiều, layout thrashing, bảng chưa virtualize, hoặc chart SVG có quá nhiều node. WASM không thao tác được DOM nên không giúp gì ở đây. Tôi cũng tránh WASM cho những lời gọi nhỏ và dày đặc, khi chi phí copy dữ liệu vào ra lớn hơn phần tính toán. Ngoài ra còn chi phí vận hành: bundle tải lần đầu nặng hơn, phải sửa CSP, debug khó hơn, và build frontend phải có Rust toolchain. Thứ tự là: profile, sửa rendering, chuyển việc sang worker, rồi mới cân nhắc WASM.",
        },
      },
    ],
    difficulty: "medium",
    priority: "medium",
    jdRequirement:
      "Collaborate with Rust/Python backend engineers; consume APIs and high-frequency streams from Rust services",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "There is no Rust production experience in the profile. Say so plainly and present this as understanding of why Rust is chosen and how you'd integrate with it. The closest real experience is working with Go microservices at Ninja Van, a compiled backend language, but don't stretch it into Rust experience.",
        vi: "Profile không có kinh nghiệm Rust production. Hãy nói thẳng điều đó và trình bày phần này như hiểu biết về lý do chọn Rust và cách bạn sẽ tích hợp với nó. Kinh nghiệm thật gần nhất là làm việc với microservices Go ở Ninja Van (một ngôn ngữ backend biên dịch), nhưng đừng kéo nó thành kinh nghiệm Rust.",
      },
    },
    tags: ["rust", "webassembly", "serde", "bigint", "web-workers"],
  },

  /* ------------------------------------------------------------------ */
  /* Q50 — Linux and CI/CD debugging                                      */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q50",
    number: 50,
    topicId: "testing-python-linux",
    question: {
      en: "The JD asks for comfort with Linux desktop and build environments. How do you debug a frontend problem on Linux — logs, processes, ports, curl or websocat — and how would you structure the CI/CD pipeline for this frontend?",
      vi: "JD yêu cầu thành thạo môi trường desktop và build trên Linux. Bạn debug một vấn đề frontend trên Linux như thế nào — log, process, port, curl hay websocat — và bạn sẽ tổ chức pipeline CI/CD cho frontend này ra sao?",
    },
    answer: `I approach it like any debugging: reproduce, narrow down the layer, then fix the environment rather than the symptom.

On a Linux box, my first tools are logs and the process table: journalctl or docker logs for services, ps or top to see what's actually running and how much memory it uses, and ss or lsof to find which process holds a port. That's the classic "address already in use" after a crashed dev server. Then I test the network layer without the browser: curl -v for REST to see status, headers and TLS; curl -N to watch an SSE stream unbuffered; and websocat to open a WebSocket and type a subscribe message by hand. If websocat works but the browser doesn't, the problem is in the browser layer, like CORS, cookies or a proxy stripping the Upgrade header, not the backend.

For "works on my machine, fails in CI", the usual suspects are environmental: a different Node or pnpm version, missing environment variables, case-sensitive file paths, because macOS forgives a wrong import case and Linux doesn't, timezone and locale differences that break date tests, and missing fonts or system libraries for Playwright. So I pin versions and run CI in a container image I can also run locally.

For the pipeline, I put fast feedback first: install from a frozen lockfile with caching, lint and typecheck, unit and integration tests, a build with a bundle-size budget, sharded Playwright against the production build, then deploy, followed by a smoke test that checks health, one SSE event and one WebSocket round-trip.`,
    viExplanation: `Tinh thần trả lời: debug theo thứ tự tái hiện lỗi → khoanh vùng tầng bị lỗi → sửa môi trường chứ không chỉ chữa triệu chứng.

Trên Linux: xem log (journalctl, docker logs), xem process (ps, top — process nào đang chạy, tốn bao nhiêu RAM), xem port (ss -tlnp hoặc lsof -i — process nào đang giữ port, lỗi "address already in use" kinh điển khi dev server bị crash). Sau đó test tầng network mà không cần trình duyệt: curl -v cho REST để thấy status, header, TLS; curl -N để xem SSE stream không bị buffer; websocat để mở WebSocket và gõ tay message subscribe. Nếu websocat chạy mà trình duyệt không chạy thì lỗi nằm ở tầng trình duyệt (CORS, cookie, proxy làm mất header Upgrade), không phải backend.

Với lỗi "máy mình chạy, CI thì fail": thường do môi trường — khác version Node/pnpm, thiếu biến môi trường, đường dẫn phân biệt hoa thường (macOS bỏ qua, Linux thì không), khác timezone/locale làm test ngày giờ sai, thiếu font hoặc thư viện hệ thống cho Playwright. Giải pháp: pin version và chạy CI trong container image mà mình cũng chạy được ở local.

Pipeline: ưu tiên feedback nhanh — install với lockfile cố định + cache, lint/typecheck, unit + integration test, build kèm ngân sách bundle size, Playwright chia shard chạy trên bản build production, deploy, rồi smoke test kiểm tra health, một event SSE và một round-trip WebSocket.`,
    technicalExplanation: `### A layered debugging toolkit
- **Logs:** \`journalctl -u app -f\`, \`docker logs -f --since 10m api\`, \`kubectl logs -f deploy/api\`; \`grep\` or \`jq\` on structured logs.
- **Processes and resources:** \`ps aux | grep node\`, \`top\`/\`htop\` for CPU and RSS, \`free -h\`, \`df -h\` (a full disk breaks builds in confusing ways), \`dmesg\` for the OOM killer.
- **Ports:** \`ss -tlnp | grep 3000\` or \`lsof -i :3000\` → find and stop the stale process holding the port.
- **HTTP:** \`curl -v\` (status, headers, TLS, redirects), \`curl -I\` for cache headers, \`curl -N -H "Accept: text/event-stream"\` to watch SSE without buffering.
- **WebSocket:** \`websocat wss://host/ws\` then type a JSON subscribe frame; add \`-H "Authorization: Bearer ..."\` to test auth outside the browser.
- **DNS and network:** \`dig\`, \`nc -vz host 443\` to separate "can't resolve" from "can't connect" from "app error".

### Isolating the layer
- Works with curl or websocat, fails in the browser → CORS, cookies (\`SameSite\`, \`Secure\`), CSP \`connect-src\`, mixed content, or a proxy dropping \`Upgrade\`/\`Connection\` headers.
- SSE events arrive in bursts or only at the end → proxy buffering or compression in front of the stream (Nginx \`proxy_buffering\`, \`X-Accel-Buffering: no\`).
- Connections drop at a suspiciously round interval (often 60 seconds) → a proxy or load-balancer idle timeout; heartbeats must be shorter than it.

### "Works locally, fails in CI": usual suspects
- **Versions:** Node, pnpm and browser versions → pin with \`.nvmrc\` or \`engines\`, the \`packageManager\` field, and a fixed container image.
- **Case sensitivity:** \`import "./Chart"\` vs \`chart.tsx\` passes on default macOS file systems and fails on Linux.
- **Environment:** missing env vars or secrets; validate them with a schema at startup so the failure message is explicit.
- **TZ and locale:** CI runs in UTC with a minimal locale; set \`TZ\` explicitly in tests that format dates or candle boundaries.
- **Resources:** \`ENOSPC\` from the inotify watcher limit, out-of-memory builds (raise \`--max-old-space-size\` or reduce parallelism), missing fonts or shared libraries for Playwright browsers.
- **Permissions and line endings:** a script without \`chmod +x\`, or CRLF line endings in a shell script.

### Pipeline for this frontend
1. Install with \`pnpm install --frozen-lockfile\` and a cached store.
2. Lint, typecheck and format check, in parallel.
3. Unit and integration tests with coverage on the protocol and data layers.
4. Production build plus a bundle-size budget that fails on regressions.
5. Playwright, sharded, against the built app in the pinned Playwright image; traces and reports uploaded.
6. Preview deploy per PR, then staging and production with an approval gate.
7. Post-deploy smoke test (REST health, one SSE event, one WS round-trip) with automatic rollback on failure.

### Trade-offs
- More stages give more confidence but slower feedback. Keep the PR path under roughly 10–15 minutes by caching, sharding, and running only affected packages in a monorepo (Turborepo-style task graphs).`,
    practicalExample: {
      description: {
        en: "A post-deploy smoke script for CI (Node 22+, which has global fetch and WebSocket) that checks REST health, receives one SSE event and completes one WebSocket round-trip, each with a timeout.",
        vi: "Một script smoke test chạy sau deploy trong CI (Node 22+, có sẵn fetch và WebSocket toàn cục) kiểm tra health của REST, nhận một event SSE và hoàn thành một round-trip WebSocket, mỗi bước đều có timeout.",
      },
      code: {
        language: "ts",
        code: `// scripts/smoke.mts — run after deploy; any thrown error exits non-zero and fails the job
const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const WS_URL = BASE.replace(/^http/, "ws") + "/ws/stream";

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label + " timed out after " + ms + " ms")), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function checkHealth(): Promise<void> {
  const res = await fetch(BASE + "/api/health");
  if (!res.ok) throw new Error("health: HTTP " + res.status);
}

async function checkSse(): Promise<void> {
  const ac = new AbortController();
  const res = await fetch(BASE + "/api/prices/stream", { headers: { accept: "text/event-stream" }, signal: ac.signal });
  if (!res.body || !res.headers.get("content-type")?.includes("text/event-stream")) throw new Error("sse: wrong content-type");
  const { value } = await res.body.getReader().read(); // hangs here if a proxy buffers the stream
  ac.abort();
  if (!value || !new TextDecoder().decode(value).includes("data:")) throw new Error("sse: no event in first chunk");
}

function checkWs(): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => ws.send(JSON.stringify({ type: "subscribe", channel: "heartbeat" }));
    ws.onmessage = () => (ws.close(), resolve());
    ws.onerror = () => reject(new Error("ws: connection failed for " + WS_URL));
  });
}

const checks: Array<[string, () => Promise<void>]> = [["health", checkHealth], ["sse", checkSse], ["ws", checkWs]];
for (const [name, run] of checks) {
  await withTimeout(run(), 10_000, name);
  console.log("ok", name);
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  A["Fails in CI, passes locally"] --> B{"Reproduces in the CI image locally?"}
  B -->|"no"| C["Diff the environment: Node, pnpm, env vars, TZ, locale"]
  B -->|"yes"| D{"Which stage fails?"}
  D -->|"install or build"| E["Lockfile, case-sensitive imports, memory"]
  D -->|"unit tests"| F["Timers, TZ, shared state"]
  D -->|"e2e or runtime"| G["Logs, ss or lsof, curl -v, curl -N, websocat"]
  C --> H["Pin it: .nvmrc, packageManager, container image"]
  E --> H
  F --> I["Fix root cause, add a regression check"]
  G --> I
  H --> I`,
      caption: {
        en: "Triage for CI-only failures: first decide whether it's the environment or the code, then narrow to the failing stage and layer.",
        vi: "Quy trình phân loại lỗi chỉ xảy ra trên CI: xác định trước là do môi trường hay do code, sau đó khoanh vùng stage và tầng bị lỗi.",
      },
    },
    memoryShortcut: {
      en: "LOGS → PROCS → PORTS → CURL → DIFF the environment, then PIN it.",
      vi: "LOG → PROCESS → PORT → CURL → so sánh môi trường, rồi PIN lại.",
    },
    keyTakeaway: {
      en: "Debug on Linux layer by layer, with logs, processes, ports and curl or websocat outside the browser, and make CI reproducible by pinning versions and running in the same container image everywhere.",
      vi: "Debug trên Linux theo từng tầng — log, process, port, rồi curl/websocat ngoài trình duyệt — và làm CI có thể tái hiện bằng cách pin version và chạy cùng một container image ở mọi nơi.",
    },
    followUps: [
      {
        id: "isb-q50-f1",
        question: {
          en: "SSE works when you curl the service directly, but through the ingress the browser gets all events in one burst after a minute. What's happening?",
          vi: "SSE chạy tốt khi curl trực tiếp vào service, nhưng qua ingress thì trình duyệt nhận toàn bộ event cùng lúc sau một phút. Chuyện gì đang xảy ra?",
        },
        answer: {
          en: "Something between the service and the browser is buffering the response. Most likely the reverse proxy or ingress buffers upstream responses, or compression middleware is waiting to fill a gzip block. The burst after about a minute is probably the proxy's read timeout closing the connection and flushing what it held. I'd confirm it with curl -N through the ingress, then fix it by turning off buffering for the stream route, for example with an X-Accel-Buffering: no header or the proxy config, excluding text/event-stream from compression, and sending heartbeat comments more often than the idle timeout.",
          vi: "Có một thành phần giữa service và trình duyệt đang buffer response. Khả năng cao là reverse proxy hoặc ingress buffer response từ upstream, hoặc middleware nén đang chờ đủ một block gzip. Việc nhận dồn sau khoảng một phút nhiều khả năng là do read timeout của proxy đóng kết nối và xả hết phần đang giữ. Tôi sẽ xác nhận bằng curl -N đi qua ingress, sau đó sửa bằng cách tắt buffering cho route stream (header X-Accel-Buffering: no hoặc cấu hình proxy), loại text/event-stream khỏi việc nén, và gửi heartbeat comment với chu kỳ ngắn hơn idle timeout.",
        },
      },
      {
        id: "isb-q50-f2",
        question: {
          en: "Playwright screenshots pass on developers' Macs but fail in the Linux CI runner. How do you fix it for good?",
          vi: "Screenshot Playwright pass trên máy Mac của developer nhưng fail trên CI runner Linux. Bạn sửa triệt để thế nào?",
        },
        answer: {
          en: "The baselines are OS-specific: font rasterisation, anti-aliasing and installed fonts differ between macOS and Linux, so pixel comparisons will never agree. The durable fix is to have a single source of truth: generate and compare baselines only inside the official Playwright Docker image, pinned to the same version as the installed package, both in CI and locally through a docker run script for updating snapshots. I'd also bundle the app's web fonts instead of relying on system fonts, disable animations, and mask volatile regions, so the remaining diffs are real regressions.",
          vi: "Baseline phụ thuộc hệ điều hành: cách raster font, anti-aliasing và font được cài trên macOS và Linux khác nhau, nên so sánh pixel sẽ không bao giờ khớp. Cách sửa bền vững là có một nguồn chuẩn duy nhất: chỉ tạo và so sánh baseline bên trong Docker image chính thức của Playwright, pin cùng version với package đang cài, dùng cho cả CI lẫn local (qua một script docker run để cập nhật snapshot). Ngoài ra nên đóng gói web font của app thay vì dựa vào font hệ thống, tắt animation, và mask các vùng hay thay đổi, để những khác biệt còn lại thực sự là regression.",
        },
      },
    ],
    difficulty: "medium",
    priority: "medium",
    jdRequirement: "Comfortable working in Linux-based desktop and build environments; CI for automated UI test suites",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "Docker, Kubernetes, GitHub Actions, Vite and Turborepo are listed skills, and the Vite + Turborepo monorepo at Persefoni is real, but the profile doesn't document specific Linux incidents or pipeline ownership. Describe this as your working method; don't invent incidents or claim you designed a specific company's pipeline.",
        vi: "Docker, Kubernetes, GitHub Actions, Vite và Turborepo là kỹ năng có trong profile, và monorepo Vite + Turborepo ở Persefoni là thật, nhưng profile không ghi lại sự cố Linux cụ thể hay việc sở hữu pipeline. Hãy trình bày đây là phương pháp làm việc của bạn; không bịa sự cố và không nhận đã thiết kế pipeline của một công ty cụ thể.",
      },
    },
    tags: ["linux", "ci-cd", "debugging", "websocat", "github-actions"],
  },
];
