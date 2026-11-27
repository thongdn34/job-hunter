import type { CodingExercise } from "@/domain/package/schema";

/**
 * ISB Vietnam — Section 9, coding exercises (items 51–55).
 *
 * Every `solution.code` (and every `alternative.code` that defines the same `functionName`)
 * is executed by src/content/samples/isb/coding.test.ts. The test type-checks it in strict mode,
 * transpiles it with the `typescript` package and runs each test case, so the displayed code is
 * the code that is proven to work. Keep the snippets self-contained: no imports, no template
 * literals (they would need escaping here).
 *
 * The exercises are generic engineering exercises tied to verified JD lines (high-frequency
 * streams, low-latency dashboards and charts, market data). They make no claim about the
 * candidate's past work.
 */

/* ------------------------------------------------------------------ */
/* Q51 — throttle + debounce                                           */
/* ------------------------------------------------------------------ */

const q51Solution = `/** A cancellable timer source: real timers in the app, a virtual clock in tests. */
export interface Scheduler {
  schedule(task: () => void, delayMs: number): () => void;
}

export interface RateLimitOptions {
  leading?: boolean;
  trailing?: boolean;
}

export interface RateLimited<A extends unknown[]> {
  (...args: A): void;
  cancel(): void;
  flush(): void;
}

export const browserScheduler: Scheduler = {
  schedule(task, delayMs) {
    const id = setTimeout(task, delayMs);
    return () => clearTimeout(id);
  },
};

/** At most one call per waitMs window. Defaults: leading and trailing. */
export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
  { leading = true, trailing = true }: RateLimitOptions = {},
  scheduler: Scheduler = browserScheduler,
): RateLimited<A> {
  let cancelWindow: (() => void) | null = null; // non-null while a window is open
  let pendingArgs: A | null = null; // latest args received inside the window

  function openWindow(): void {
    cancelWindow = scheduler.schedule(closeWindow, waitMs);
  }

  function closeWindow(): void {
    cancelWindow = null;
    const args = pendingArgs;
    pendingArgs = null;
    if (trailing && args) {
      fn(...args);
      openWindow(); // the trailing call starts a new window, so calls stay waitMs apart
    }
  }

  const throttled = (...args: A): void => {
    if (cancelWindow === null) {
      openWindow();
      if (leading) fn(...args);
      else pendingArgs = args;
    } else {
      pendingArgs = args; // keep only the latest value
    }
  };

  return Object.assign(throttled, {
    cancel(): void {
      cancelWindow?.();
      cancelWindow = null;
      pendingArgs = null;
    },
    flush(): void {
      if (cancelWindow === null) return;
      cancelWindow();
      closeWindow();
    },
  });
}

/** Runs once the calls have been quiet for waitMs. Defaults: trailing only. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
  { leading = false, trailing = true }: RateLimitOptions = {},
  scheduler: Scheduler = browserScheduler,
): RateLimited<A> {
  let cancelTimer: (() => void) | null = null; // non-null while a burst is active
  let pendingArgs: A | null = null;

  function onQuiet(): void {
    cancelTimer = null;
    const args = pendingArgs;
    pendingArgs = null;
    if (trailing && args) fn(...args);
  }

  const debounced = (...args: A): void => {
    const burstStart = cancelTimer === null;
    cancelTimer?.(); // every call pushes the deadline back
    cancelTimer = scheduler.schedule(onQuiet, waitMs);
    if (burstStart && leading) fn(...args);
    else pendingArgs = args;
  };

  return Object.assign(debounced, {
    cancel(): void {
      cancelTimer?.();
      cancelTimer = null;
      pendingArgs = null;
    },
    flush(): void {
      if (cancelTimer === null) return;
      cancelTimer();
      onQuiet();
    },
  });
}

/* ---------- Pure test harness: replay call times on a virtual clock ---------- */

export interface Invocation {
  at: number; // virtual time when fn actually ran
  arg: number; // which call's argument it ran with (the call time)
}

interface VirtualTimer {
  at: number;
  task: () => void;
}

function createVirtualScheduler() {
  let now = 0;
  let nextId = 0;
  const timers = new Map<number, VirtualTimer>();
  return {
    now: (): number => now,
    schedule(task: () => void, delayMs: number): () => void {
      const id = nextId++;
      timers.set(id, { at: now + delayMs, task });
      return () => {
        timers.delete(id);
      };
    },
    /** Fires due timers in time order. A timer due at t fires before a call made at t. */
    advanceTo(time: number): void {
      for (;;) {
        let dueId = -1;
        let due: VirtualTimer | undefined;
        for (const [id, timer] of timers) {
          if (timer.at <= time && (due === undefined || timer.at < due.at)) {
            dueId = id;
            due = timer;
          }
        }
        if (due === undefined) break;
        timers.delete(dueId);
        now = due.at;
        due.task();
      }
      now = time;
    },
  };
}

export function simulateRateLimit(
  kind: "throttle" | "debounce",
  callTimes: number[],
  waitMs: number,
  options: RateLimitOptions = {},
): Invocation[] {
  const clock = createVirtualScheduler();
  const invocations: Invocation[] = [];
  const record = (arg: number): void => {
    invocations.push({ at: clock.now(), arg });
  };
  const limited =
    kind === "throttle" ? throttle(record, waitMs, options, clock) : debounce(record, waitMs, options, clock);

  for (const time of callTimes) {
    clock.advanceTo(time);
    limited(time);
  }
  clock.advanceTo(Number.POSITIVE_INFINITY); // drain trailing calls
  return invocations;
}
`;

/* ------------------------------------------------------------------ */
/* Q52 — order book aggregation                                        */
/* ------------------------------------------------------------------ */

const q52Solution = `export type Level = [price: number, size: number];

export interface BookSnapshot {
  bids: Level[];
  asks: Level[];
}

export interface BookDelta {
  side: "bid" | "ask";
  price: number;
  /** Absolute size at this price level. 0 removes the level. */
  size: number;
}

type PriceOrder = (a: number, b: number) => number;

const bestBidFirst: PriceOrder = (a, b) => b - a; // highest bid is best
const bestAskFirst: PriceOrder = (a, b) => a - b; // lowest ask is best

export function applyOrderBookDeltas(snapshot: BookSnapshot, deltas: BookDelta[], depth: number): BookSnapshot {
  // price -> size. O(1) upsert/delete for every delta, whatever the batch size.
  const bids = new Map<number, number>(snapshot.bids);
  const asks = new Map<number, number>(snapshot.asks);

  for (const { side, price, size } of deltas) {
    const levels = side === "bid" ? bids : asks;
    if (size <= 0) levels.delete(price); // level emptied (deleting a missing level is a no-op)
    else levels.set(price, size); // replace, never add: deltas carry absolute sizes
  }

  return {
    bids: topLevels(bids, depth, bestBidFirst),
    asks: topLevels(asks, depth, bestAskFirst),
  };
}

function topLevels(levels: Map<number, number>, depth: number, order: PriceOrder): Level[] {
  if (depth <= 0) return [];
  return [...levels.entries()].sort((a, b) => order(a[0], b[0])).slice(0, depth);
}
`;

const q52Alternative = `export type Level = [price: number, size: number];

export interface BookSnapshot {
  bids: Level[];
  asks: Level[];
}

export interface BookDelta {
  side: "bid" | "ask";
  price: number;
  size: number;
}

/** Keeps each side sorted best-first, so reading the top N is a slice, not a sort. */
export function applyOrderBookDeltas(snapshot: BookSnapshot, deltas: BookDelta[], depth: number): BookSnapshot {
  const bids: Level[] = snapshot.bids.map(([p, s]): Level => [p, s]).sort((a, b) => b[0] - a[0]);
  const asks: Level[] = snapshot.asks.map(([p, s]): Level => [p, s]).sort((a, b) => a[0] - b[0]);

  for (const { side, price, size } of deltas) {
    const levels = side === "bid" ? bids : asks;
    const direction = side === "bid" ? -1 : 1; // bids descending, asks ascending
    const index = lowerBound(levels, price, direction);
    const found = levels[index]?.[0] === price;
    if (size <= 0) {
      if (found) levels.splice(index, 1);
    } else if (found) {
      levels[index] = [price, size];
    } else {
      levels.splice(index, 0, [price, size]);
    }
  }

  const n = Math.max(0, depth);
  return { bids: bids.slice(0, n), asks: asks.slice(0, n) };
}

/** First index whose price is not better than price, for this side's ordering. */
function lowerBound(levels: Level[], price: number, direction: 1 | -1): number {
  let lo = 0;
  let hi = levels.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const level = levels[mid];
    if (level !== undefined && direction * (level[0] - price) < 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
`;

/* ------------------------------------------------------------------ */
/* Q53 — OHLC candles                                                  */
/* ------------------------------------------------------------------ */

const q53Solution = `export interface Trade {
  time: number; // epoch ms (UTC)
  price: number;
  size: number;
}

export interface Candle {
  time: number; // bucket start, epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Bucket {
  candle: Candle;
  firstTime: number; // timestamp of the trade that set open
  lastTime: number; // timestamp of the trade that set close
}

export function aggregateCandles(trades: Trade[], intervalMs: number): Candle[] {
  if (!(intervalMs > 0)) throw new RangeError("intervalMs must be a positive number");

  const buckets = new Map<number, Bucket>();

  for (const { time, price, size } of trades) {
    const start = Math.floor(time / intervalMs) * intervalMs; // align to interval boundary
    const bucket = buckets.get(start);

    if (bucket === undefined) {
      buckets.set(start, {
        candle: { time: start, open: price, high: price, low: price, close: price, volume: size },
        firstTime: time,
        lastTime: time,
      });
      continue;
    }

    const candle = bucket.candle;
    candle.high = Math.max(candle.high, price);
    candle.low = Math.min(candle.low, price);
    candle.volume += size;
    // Use timestamps, not arrival order, so late trades still land correctly.
    if (time < bucket.firstTime) {
      bucket.firstTime = time;
      candle.open = price;
    }
    if (time >= bucket.lastTime) {
      bucket.lastTime = time;
      candle.close = price;
    }
  }

  return [...buckets.values()].map((b) => b.candle).sort((a, b) => a.time - b.time);
}
`;

const q53Alternative = `export interface Trade {
  time: number;
  price: number;
  size: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Streaming variant: keeps only the live (partial) candle and emits it when a trade
 * crosses into the next interval. Assumes trades arrive in time order.
 */
export function aggregateCandles(trades: Trade[], intervalMs: number): Candle[] {
  if (!(intervalMs > 0)) throw new RangeError("intervalMs must be a positive number");
  const closed: Candle[] = [];
  let live: Candle | null = null;

  for (const { time, price, size } of trades) {
    const start = Math.floor(time / intervalMs) * intervalMs;
    if (live === null || start !== live.time) {
      if (live !== null) closed.push(live); // the previous candle is final now
      live = { time: start, open: price, high: price, low: price, close: price, volume: size };
      continue;
    }
    live.high = Math.max(live.high, price);
    live.low = Math.min(live.low, price);
    live.close = price;
    live.volume += size;
  }

  if (live !== null) closed.push(live); // partial candle for the current interval
  return closed;
}
`;

/* ------------------------------------------------------------------ */
/* Q54 — sliding-window SMA / VWAP                                     */
/* ------------------------------------------------------------------ */

const q54Solution = `export interface Trade {
  time: number; // epoch ms, non-decreasing
  price: number;
  size: number;
}

export interface WindowStat {
  time: number;
  sma: number; // simple average of trade prices in the window
  vwap: number | null; // sum(price * size) / sum(size); null if the window has no volume
}

/** Time-based window (time - windowMs, time] evaluated at every trade, in O(n) total. */
export function slidingWindowStats(trades: Trade[], windowMs: number): WindowStat[] {
  if (!(windowMs > 0)) throw new RangeError("windowMs must be a positive number");

  const result: WindowStat[] = [];
  let left = 0; // oldest trade still inside the window
  let count = 0;
  let sumPrice = 0;
  let sumNotional = 0; // sum of price * size
  let sumVolume = 0;

  for (const incoming of trades) {
    count += 1;
    sumPrice += incoming.price;
    sumNotional += incoming.price * incoming.size;
    sumVolume += incoming.size;

    // Evict trades that fell out of the window. Each trade is evicted at most once.
    const cutoff = incoming.time - windowMs;
    for (;;) {
      const outgoing = trades[left];
      if (outgoing === undefined || outgoing.time > cutoff) break;
      count -= 1;
      sumPrice -= outgoing.price;
      sumNotional -= outgoing.price * outgoing.size;
      sumVolume -= outgoing.size;
      left += 1;
    }

    result.push({
      time: incoming.time,
      sma: sumPrice / count,
      vwap: sumVolume > 0 ? sumNotional / sumVolume : null,
    });
  }

  return result;
}
`;

/* ------------------------------------------------------------------ */
/* Q55 — LRU cache                                                     */
/* ------------------------------------------------------------------ */

const q55Solution = `export type LruOp<K, V> = readonly ["get", K] | readonly ["put", K, V];

/**
 * A Map iterates in insertion order, so "delete + set" moves a key to the
 * most-recently-used end and the first key is always the least recently used.
 */
export class LruCache<K, V> {
  private readonly entries = new Map<K, V>();
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = Math.max(0, Math.floor(capacity));
  }

  get size(): number {
    return this.entries.size;
  }

  get(key: K): V | undefined {
    if (!this.entries.has(key)) return undefined;
    const value = this.entries.get(key) as V; // has() guarantees presence
    this.entries.delete(key);
    this.entries.set(key, value); // mark as most recently used
    return value;
  }

  put(key: K, value: V): void {
    if (this.capacity === 0) return;
    this.entries.delete(key); // an update also refreshes recency
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }
  }
}

/** Test harness: replays operations, returns get results (null on miss) and null for put. */
export function runLruOps<K, V>(capacity: number, ops: ReadonlyArray<LruOp<K, V>>): Array<V | null> {
  const cache = new LruCache<K, V>(capacity);
  return ops.map((op) => {
    if (op[0] === "get") return cache.get(op[1]) ?? null;
    cache.put(op[1], op[2]);
    return null;
  });
}
`;

const q55Alternative = `export type LruOp<K, V> = readonly ["get", K] | readonly ["put", K, V];

interface ListNode<K, V> {
  key: K;
  value: V;
  prev: ListNode<K, V> | null;
  next: ListNode<K, V> | null;
}

/** Classic hash map + doubly linked list. Head = most recent, tail = least recent. */
export class LinkedLruCache<K, V> {
  private readonly index = new Map<K, ListNode<K, V>>();
  private head: ListNode<K, V> | null = null;
  private tail: ListNode<K, V> | null = null;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = Math.max(0, Math.floor(capacity));
  }

  get(key: K): V | undefined {
    const node = this.index.get(key);
    if (node === undefined) return undefined;
    this.moveToFront(node);
    return node.value;
  }

  put(key: K, value: V): void {
    if (this.capacity === 0) return;
    const existing = this.index.get(key);
    if (existing !== undefined) {
      existing.value = value;
      this.moveToFront(existing);
      return;
    }
    const node: ListNode<K, V> = { key, value, prev: null, next: null };
    this.index.set(key, node);
    this.pushFront(node);
    if (this.index.size > this.capacity && this.tail !== null) {
      const lru = this.tail;
      this.unlink(lru);
      this.index.delete(lru.key);
    }
  }

  private pushFront(node: ListNode<K, V>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head !== null) this.head.prev = node;
    this.head = node;
    if (this.tail === null) this.tail = node;
  }

  private unlink(node: ListNode<K, V>): void {
    if (node.prev !== null) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next !== null) node.next.prev = node.prev;
    else this.tail = node.prev;
    node.prev = null;
    node.next = null;
  }

  private moveToFront(node: ListNode<K, V>): void {
    if (this.head === node) return;
    this.unlink(node);
    this.pushFront(node);
  }
}

export function runLruOps<K, V>(capacity: number, ops: ReadonlyArray<LruOp<K, V>>): Array<V | null> {
  const cache = new LinkedLruCache<K, V>(capacity);
  return ops.map((op) => {
    if (op[0] === "get") return cache.get(op[1]) ?? null;
    cache.put(op[1], op[2]);
    return null;
  });
}
`;

/* ------------------------------------------------------------------ */
/* Exercises                                                           */
/* ------------------------------------------------------------------ */

export const isbCoding: CodingExercise[] = [
  {
    id: "isb-q51",
    number: 51,
    title: {
      en: "Throttle and debounce with leading/trailing options",
      vi: "Cài đặt throttle và debounce có tuỳ chọn leading/trailing",
    },
    statement: {
      en: `Implement \`throttle(fn, waitMs, { leading, trailing })\` and \`debounce(fn, waitMs, { leading, trailing })\`. Both return a wrapped function with \`cancel()\` and \`flush()\`.

- **throttle** runs \`fn\` at most once per \`waitMs\` window. With \`leading\` the first call in a window runs immediately. With \`trailing\` the latest call made during the window runs when the window ends. Defaults: \`leading: true, trailing: true\`.
- **debounce** runs \`fn\` only after calls have been quiet for \`waitMs\`. With \`leading\` the first call of a burst runs immediately. With \`trailing\` the last call of the burst runs once things go quiet. Defaults: \`leading: false, trailing: true\`.

Real timers are hard to test, so inject a \`Scheduler\`. Then write the pure harness \`simulateRateLimit(kind, callTimes, waitMs, options)\`. It replays call times on a virtual clock and returns every real invocation as \`{ at, arg }\`, where \`arg\` is the time of the call whose arguments were used.`,
      vi: `Cài đặt \`throttle(fn, waitMs, { leading, trailing })\` và \`debounce(fn, waitMs, { leading, trailing })\`. Cả hai trả về một hàm đã bọc, có thêm \`cancel()\` và \`flush()\`.

- **throttle** chạy \`fn\` nhiều nhất một lần trong mỗi cửa sổ \`waitMs\`. Bật \`leading\` thì lần gọi đầu tiên của cửa sổ chạy ngay. Bật \`trailing\` thì lần gọi mới nhất trong cửa sổ sẽ chạy khi cửa sổ kết thúc. Mặc định: \`leading: true, trailing: true\`.
- **debounce** chỉ chạy \`fn\` khi các lần gọi đã im lặng đủ \`waitMs\`. Bật \`leading\` thì lần gọi đầu của một burst chạy ngay. Bật \`trailing\` thì lần gọi cuối của burst chạy khi đã yên. Mặc định: \`leading: false, trailing: true\`.

Timer thật rất khó test, vì vậy hãy inject một \`Scheduler\`. Sau đó viết harness thuần \`simulateRateLimit(kind, callTimes, waitMs, options)\`. Harness này phát lại các mốc gọi trên một đồng hồ ảo và trả về mọi lần \`fn\` thực sự chạy dưới dạng \`{ at, arg }\`. \`arg\` là thời điểm của lần gọi có tham số được dùng.`,
    },
    examples: [
      {
        input: `simulateRateLimit("throttle", [0, 20, 50, 120, 130, 400], 100, {})`,
        output: `[{"at":0,"arg":0},{"at":100,"arg":50},{"at":200,"arg":130},{"at":400,"arg":400}]`,
        explanation: {
          en: "The call at 0 runs immediately (leading). The latest call in that window (50) runs when it closes at 100 (trailing), and that run opens a new window to 200. The call at 400 arrives after everything is idle, so it is a new leading call.",
          vi: "Lần gọi tại 0 chạy ngay (leading). Lần gọi mới nhất trong cửa sổ đó (50) chạy khi cửa sổ đóng lúc 100 (trailing), và lần chạy này mở cửa sổ mới tới 200. Lần gọi tại 400 đến khi mọi thứ đã rảnh nên nó là một lần leading mới.",
        },
      },
      {
        input: `simulateRateLimit("debounce", [0, 50, 90, 300, 350], 100, {})`,
        output: `[{"at":190,"arg":90},{"at":450,"arg":350}]`,
        explanation: {
          en: "Each call pushes the deadline back. The first burst ends 100ms after the call at 90, so it fires at 190 with that call's argument. The second burst fires at 450.",
          vi: "Mỗi lần gọi lại đẩy deadline ra sau. Burst đầu tiên kết thúc 100ms sau lần gọi tại 90, nên chạy lúc 190 với tham số của lần gọi đó. Burst thứ hai chạy lúc 450.",
        },
      },
    ],
    constraints: [
      "0 <= callTimes.length <= 10^5",
      "callTimes is sorted ascending",
      "waitMs > 0",
      "A timer due at time t fires before a call made at the same time t",
    ],
    approach: {
      en: `Both are small state machines on top of one timer.

**Throttle** state is "is a window open?" plus the latest pending args. A call with no window open starts one and either runs now (leading) or stores the args. A call inside a window only overwrites the pending args. When the window closes, a trailing run happens only if there are pending args, and that run opens a new window so two runs are never closer than \`waitMs\`.

**Debounce** state is "is a burst active?" plus the latest args. Every call cancels and reschedules the timer. Only the first call of a burst can run as leading. When the timer finally fires, the trailing run uses the last args, and only if a call came in after the leading run.

Injecting a \`Scheduler\` keeps the logic pure. The app passes real \`setTimeout\` and the tests pass a virtual clock, so the results are deterministic without fake timers.`,
      vi: `Cả hai đều là state machine nhỏ chạy trên một timer.

**Throttle** có hai trạng thái: "cửa sổ đang mở hay chưa" và args mới nhất đang chờ. Nếu chưa có cửa sổ, lần gọi sẽ mở cửa sổ rồi chạy ngay (leading) hoặc lưu args lại. Lần gọi trong cửa sổ chỉ ghi đè args đang chờ. Khi cửa sổ đóng, trailing chỉ chạy nếu còn args đang chờ, và lần chạy đó mở cửa sổ mới để hai lần chạy không bao giờ cách nhau ít hơn \`waitMs\`.

**Debounce** có hai trạng thái: "burst có đang diễn ra không" và args mới nhất. Mỗi lần gọi huỷ timer cũ và đặt lại timer. Chỉ lần gọi đầu của burst mới được chạy kiểu leading. Khi timer cuối cùng chạy, trailing dùng args cuối, và chỉ chạy nếu có lần gọi đến sau lần leading.

Inject \`Scheduler\` giúp logic thuần. App truyền \`setTimeout\` thật, còn test truyền đồng hồ ảo, nên kết quả luôn deterministic mà không cần fake timers.`,
    },
    functionName: "simulateRateLimit",
    solution: {
      language: "ts",
      code: q51Solution,
      caption: "throttle + debounce with an injectable scheduler, plus a pure simulation harness",
    },
    steps: [
      {
        en: "Define a `Scheduler` with `schedule(task, ms)` that returns a cancel function. Use `setTimeout` in production and a virtual clock in tests.",
        vi: "Định nghĩa `Scheduler` với `schedule(task, ms)` trả về hàm cancel. Production dùng `setTimeout`, test dùng đồng hồ ảo.",
      },
      {
        en: "Throttle: if no window is open, open one and either run now (leading) or store the args.",
        vi: "Throttle: nếu chưa có cửa sổ, mở cửa sổ rồi chạy ngay (leading) hoặc lưu args.",
      },
      {
        en: "Throttle: inside a window, only overwrite `pendingArgs`. Only the latest value matters, which fits a price stream.",
        vi: "Throttle: trong cửa sổ thì chỉ ghi đè `pendingArgs`. Chỉ giá trị mới nhất là quan trọng, rất hợp với luồng giá.",
      },
      {
        en: "Throttle: when the window closes and trailing args exist, run them and open a new window. Otherwise go idle.",
        vi: "Throttle: khi cửa sổ đóng mà còn args trailing thì chạy chúng và mở cửa sổ mới. Nếu không thì về trạng thái rảnh.",
      },
      {
        en: "Debounce: every call cancels the timer and reschedules it. Run leading only on the first call of a burst.",
        vi: "Debounce: mỗi lần gọi huỷ timer rồi đặt lại. Chỉ chạy leading ở lần gọi đầu của burst.",
      },
      {
        en: "Debounce: when the timer fires, run trailing with the last args if any arrived after the leading run.",
        vi: "Debounce: khi timer chạy, gọi trailing với args cuối nếu có lần gọi đến sau lần leading.",
      },
      {
        en: "Add `cancel()` (drop pending work, for example on unmount) and `flush()` (run pending work now, for example before unload).",
        vi: "Thêm `cancel()` (bỏ việc đang chờ, ví dụ khi unmount) và `flush()` (chạy ngay việc đang chờ, ví dụ trước khi rời trang).",
      },
    ],
    timeComplexity:
      "O(1) per call for throttle and debounce. The simulation harness is O(n · t) with a linear timer scan (t = live timers, at most 1–2 here).",
    spaceComplexity: "O(1) per wrapper: one timer handle and one args reference.",
    edgeCases: [
      {
        en: "`leading: false, trailing: false` never runs. Reject that combination or document it.",
        vi: "`leading: false, trailing: false` sẽ không bao giờ chạy. Nên chặn tổ hợp này hoặc ghi rõ trong tài liệu.",
      },
      {
        en: "A single call with leading and trailing both on runs once, not twice. Trailing needs a second call inside the window or burst.",
        vi: "Một lần gọi duy nhất khi bật cả leading lẫn trailing chỉ chạy một lần, không phải hai. Trailing cần lần gọi thứ hai trong cửa sổ hoặc burst.",
      },
      {
        en: "A call landing exactly on the window boundary is handled after the timer fires. If nothing was pending, the window closes and the call starts a new one as a leading run; if a trailing run fired, the call falls inside the new window that run opened.",
        vi: "Lần gọi rơi đúng biên cửa sổ được xử lý sau khi timer chạy. Nếu không có gì đang chờ, cửa sổ đóng và lần gọi đó mở cửa sổ mới như một lần leading; nếu trailing vừa chạy, lần gọi rơi vào cửa sổ mới mà lần trailing đó mở ra.",
      },
      {
        en: "Component unmount: call `cancel()` in the effect cleanup or a stale trailing call will touch dead state.",
        vi: "Khi component unmount: gọi `cancel()` trong cleanup của effect, nếu không lần trailing cũ sẽ chạm vào state đã chết.",
      },
      {
        en: "Stale closures: if `fn` closes over React state, keep it in a ref or recreate the wrapper with `useMemo`.",
        vi: "Stale closure: nếu `fn` capture state của React, hãy giữ nó trong ref hoặc tạo lại wrapper bằng `useMemo`.",
      },
    ],
    walkthrough: {
      steps: [
        "throttle, wait=100, calls at 0 20 50 120 130 400",
        "t=0    no window -> open [0,100), leading run (arg 0)",
        "t=20   in window -> pending=20\nt=50   in window -> pending=50",
        "t=100  window closes, pending=50 -> trailing run (arg 50), open [100,200)",
        "t=120  pending=120\nt=130  pending=130",
        "t=200  window closes -> trailing run (arg 130), open [200,300)",
        "t=300  window closes, nothing pending -> idle",
        "t=400  no window -> open [400,500), leading run (arg 400)",
        "Result: 0, 100, 200, 400. Never two runs within 100ms.",
      ],
      diagram: {
        kind: "state",
        code: `stateDiagram-v2
    [*] --> Idle
    Idle --> WindowOpen: call / run if leading else store args
    WindowOpen --> WindowOpen: call / pendingArgs = latest
    WindowOpen --> WindowOpen: window ends with pending / trailing run
    WindowOpen --> Idle: window ends, nothing pending
    WindowOpen --> Idle: cancel`,
        caption: { en: "Throttle state machine", vi: "State machine của throttle" },
      },
    },
    memoryShortcut: {
      en: "Throttle = a metronome (steady beat while calls keep coming). Debounce = an elevator door (waits until people stop walking in).",
      vi: "Throttle = máy đếm nhịp (đều đặn khi còn lời gọi). Debounce = cửa thang máy (đợi người ngừng bước vào mới đóng).",
    },
    followUp: {
      id: "isb-q51-f1",
      question: {
        en: "For a price ticker updating 1,000 times per second, would you throttle with setTimeout or use something else?",
        vi: "Với một ticker giá cập nhật 1.000 lần mỗi giây, bạn sẽ throttle bằng setTimeout hay dùng cách khác?",
      },
      answer: {
        en: "For anything visual I'd align with the frame instead of a fixed timeout. I'd buffer the latest value per symbol in a Map, which conflates the updates, and flush once per requestAnimationFrame. That gives at most one render per frame, and rAF pauses in background tabs, so we don't waste CPU there. The setTimeout throttle is still right for non-visual work like analytics events or a search request, where a fixed rate is what we want. Debounce is for 'wait until the user stops', like a filter input, never for a live price, because a constant stream would never go quiet and the UI would never update.",
        vi: "Với những gì hiển thị trên màn hình, tôi sẽ bám theo frame thay vì dùng timeout cố định. Tôi giữ giá trị mới nhất của mỗi symbol trong một Map (tức là conflation) rồi flush mỗi lần requestAnimationFrame, nên mỗi frame có nhiều nhất một lần render. rAF cũng tự dừng khi tab chạy nền nên không tốn CPU. Throttle bằng setTimeout vẫn đúng cho việc không hiển thị như gửi analytics hay gọi API search, khi ta cần một tốc độ cố định. Debounce dành cho kiểu 'đợi người dùng ngừng gõ' như ô filter, không bao giờ dùng cho giá live, vì luồng liên tục sẽ không bao giờ im lặng và UI sẽ không bao giờ cập nhật.",
      },
    },
    testCases: [
      {
        name: "throttle leading + trailing",
        args: ["throttle", [0, 20, 50, 120, 130, 400], 100, {}],
        expected: [
          { at: 0, arg: 0 },
          { at: 100, arg: 50 },
          { at: 200, arg: 130 },
          { at: 400, arg: 400 },
        ],
      },
      {
        name: "throttle trailing only",
        args: ["throttle", [0, 20, 50, 120, 130, 400], 100, { leading: false }],
        expected: [
          { at: 100, arg: 50 },
          { at: 200, arg: 130 },
          { at: 500, arg: 400 },
        ],
      },
      {
        name: "throttle leading only",
        args: ["throttle", [0, 20, 50, 120, 130, 400], 100, { trailing: false }],
        expected: [
          { at: 0, arg: 0 },
          { at: 120, arg: 120 },
          { at: 400, arg: 400 },
        ],
      },
      {
        name: "throttle call exactly on the window boundary",
        args: ["throttle", [0, 100], 100, {}],
        expected: [
          { at: 0, arg: 0 },
          { at: 100, arg: 100 },
        ],
      },
      {
        name: "debounce trailing (default)",
        args: ["debounce", [0, 50, 90, 300, 350], 100, {}],
        expected: [
          { at: 190, arg: 90 },
          { at: 450, arg: 350 },
        ],
      },
      {
        name: "debounce leading + trailing",
        args: ["debounce", [0, 50, 90, 300, 350], 100, { leading: true }],
        expected: [
          { at: 0, arg: 0 },
          { at: 190, arg: 90 },
          { at: 300, arg: 300 },
          { at: 450, arg: 350 },
        ],
      },
      {
        name: "debounce single call with leading + trailing runs once",
        args: ["debounce", [0], 100, { leading: true, trailing: true }],
        expected: [{ at: 0, arg: 0 }],
      },
      { name: "no calls", args: ["throttle", [], 100, {}], expected: [] },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement:
      "Optimize browser rendering, state management and DOM manipulation for large datasets and high-frequency updates (JD, verified)",
  },

  {
    id: "isb-q52",
    number: 52,
    title: {
      en: "Order book aggregation: apply bid/ask deltas and return the top N levels",
      vi: "Tổng hợp order book: áp dụng delta bid/ask và trả về N mức giá tốt nhất",
    },
    statement: {
      en: `A market-data feed sends an order book **snapshot** (\`bids\` and \`asks\` as \`[price, size]\` levels) followed by **deltas** \`{ side, price, size }\`. A delta's \`size\` is the new **absolute** size at that price, and \`size = 0\` removes the level.

Implement \`applyOrderBookDeltas(snapshot, deltas, depth)\`. It returns the top \`depth\` levels per side: bids sorted by price **descending** (best bid first) and asks sorted **ascending** (best ask first). Deleting a level that doesn't exist is a no-op.`,
      vi: `Một feed market data gửi **snapshot** order book (\`bids\` và \`asks\` dạng các mức \`[price, size]\`), sau đó là các **delta** \`{ side, price, size }\`. \`size\` của delta là kích thước **tuyệt đối** mới tại mức giá đó, và \`size = 0\` nghĩa là xoá mức giá.

Cài đặt \`applyOrderBookDeltas(snapshot, deltas, depth)\`. Hàm trả về \`depth\` mức tốt nhất mỗi bên: bids sắp xếp **giảm dần** theo giá (best bid đứng đầu), asks sắp xếp **tăng dần** (best ask đứng đầu). Xoá một mức không tồn tại thì không làm gì.`,
    },
    examples: [
      {
        input: `snapshot = { bids: [[100,5],[99,3],[98,10]], asks: [[101,4],[102,6],[103,1]] }
deltas = [{bid 100 -> 7}, {ask 101 -> 0}, {bid 99.5 -> 2}, {ask 104 -> 9}], depth = 3`,
        output: `{ bids: [[100,7],[99.5,2],[99,3]], asks: [[102,6],[103,1],[104,9]] }`,
        explanation: {
          en: "100 is replaced with 7 (absolute, not +7). Ask 101 is removed, so 102 becomes the best ask. 99.5 is a new level between 100 and 99. Bid 98 drops out of the top 3.",
          vi: "Mức 100 được thay bằng 7 (giá trị tuyệt đối, không phải +7). Ask 101 bị xoá nên 102 thành best ask. 99.5 là mức mới nằm giữa 100 và 99. Bid 98 rơi khỏi top 3.",
        },
      },
    ],
    constraints: [
      "0 <= levels per side <= 10^4",
      "0 <= deltas.length <= 10^5 per batch",
      "price > 0, size >= 0",
      "depth >= 0",
      "Prices are exact keys. In production, use integer ticks (price / tickSize) to avoid float key drift.",
    ],
    approach: {
      en: `Separate the **write path** from the **read path**.

Writes (deltas) are far more frequent than the user can see, so they must be O(1). A \`Map<price, size>\` per side gives O(1) upsert and delete. Because sizes are absolute, applying a delta is a plain replace with no arithmetic, which also makes replaying the same delta idempotent.

Reads happen at render time: sort the levels best-first and slice the top N. Sorting costs O(L log L), but it runs once per frame or batch, not once per delta. That's the right trade-off when thousands of deltas arrive between two frames.

If the book is deep and you render on every batch, keep each side sorted instead (the alternative below). Binary search gives O(log L) lookup and the top N becomes a slice.`,
      vi: `Tách **đường ghi** khỏi **đường đọc**.

Delta đến nhiều hơn rất nhiều so với những gì người dùng nhìn thấy, nên thao tác ghi phải O(1). Dùng một \`Map<price, size>\` cho mỗi bên để upsert và delete trong O(1). Vì size là giá trị tuyệt đối, áp dụng delta chỉ là thay thế, không cần cộng trừ, nên replay cùng một delta cũng idempotent.

Thao tác đọc diễn ra lúc render: sắp xếp các mức theo thứ tự tốt nhất rồi lấy N mức đầu. Sort tốn O(L log L) nhưng chỉ chạy mỗi frame hoặc mỗi batch, không phải mỗi delta. Đây là trade-off đúng khi hàng nghìn delta đến giữa hai frame.

Nếu book rất sâu và bạn render sau mỗi batch, hãy giữ mỗi bên luôn được sắp xếp (xem lời giải thay thế). Binary search cho lookup O(log L) và top N chỉ còn là một phép slice.`,
    },
    functionName: "applyOrderBookDeltas",
    solution: { language: "ts", code: q52Solution, caption: "Map per side for O(1) deltas, sort + slice on read" },
    steps: [
      {
        en: "Load each side of the snapshot into a `Map<price, size>`.",
        vi: "Nạp từng bên của snapshot vào một `Map<price, size>`.",
      },
      {
        en: "For each delta, choose the side's map by `side`.",
        vi: "Với mỗi delta, chọn map của bên tương ứng theo `side`.",
      },
      {
        en: "If `size <= 0`, delete the price (a missing price is a no-op). Otherwise set the absolute size.",
        vi: "Nếu `size <= 0` thì xoá mức giá (mức không tồn tại thì bỏ qua). Ngược lại set size tuyệt đối.",
      },
      {
        en: "On read, sort bids descending and asks ascending, since best is first on both sides.",
        vi: "Khi đọc, sort bids giảm dần và asks tăng dần, vì ở cả hai bên mức tốt nhất luôn đứng đầu.",
      },
      {
        en: "Slice to `depth` and return new arrays so React sees a new reference.",
        vi: "Slice còn `depth` phần tử và trả về mảng mới để React nhận được reference mới.",
      },
    ],
    timeComplexity: "O(D + L log L) — D deltas at O(1) each, plus one sort of the L levels per read.",
    spaceComplexity: "O(L) for the two maps and the output.",
    edgeCases: [
      {
        en: "A delta with size 0 for a price that doesn't exist: ignore it, don't throw.",
        vi: "Delta size 0 cho mức giá không tồn tại: bỏ qua, không throw.",
      },
      {
        en: "Update and delete of the same price in one batch: order matters, so apply deltas sequentially.",
        vi: "Cập nhật rồi xoá cùng một mức giá trong một batch: thứ tự quan trọng, nên áp dụng delta tuần tự.",
      },
      {
        en: "depth = 0 or a book shallower than depth: return what exists, never pad.",
        vi: "depth = 0 hoặc book có ít mức hơn depth: trả về những gì có, không thêm phần tử giả.",
      },
      {
        en: "Crossed book (best bid >= best ask) after deltas usually means a missed message. Trigger a resync from a fresh snapshot.",
        vi: "Book bị crossed (best bid >= best ask) sau khi áp delta thường là dấu hiệu mất message. Hãy resync từ snapshot mới.",
      },
      {
        en: "Floating-point prices as Map keys: 0.1 + 0.2 !== 0.3. Normalise to integer ticks at the edge.",
        vi: "Giá dạng số thực làm key của Map: 0.1 + 0.2 !== 0.3. Hãy chuẩn hoá thành tick số nguyên ngay khi nhận dữ liệu.",
      },
    ],
    walkthrough: {
      steps: [
        "bids Map {100:5, 99:3, 98:10}   asks Map {101:4, 102:6, 103:1}",
        "bid 100 -> 7     bids {100:7, 99:3, 98:10}",
        "ask 101 -> 0     asks {102:6, 103:1}          (level removed)",
        "bid 99.5 -> 2    bids {100:7, 99:3, 98:10, 99.5:2}",
        "ask 104 -> 9     asks {102:6, 103:1, 104:9}",
        "read: bids desc -> 100, 99.5, 99 | 98 cut     asks asc -> 102, 103, 104",
        "spread = best ask - best bid = 102 - 100 = 2",
      ],
      diagram: {
        kind: "flowchart",
        code: `flowchart LR
    S["Snapshot"] --> M["Map per side"]
    D["Delta stream"] --> Q{"size is 0?"}
    Q -->|yes| DEL["delete price"]
    Q -->|no| SET["set absolute size"]
    DEL --> M
    SET --> M
    M --> R["On frame: sort + slice top N"]
    R --> UI["Order book view"]`,
        caption: { en: "O(1) writes, sort only on read", vi: "Ghi O(1), chỉ sort khi đọc" },
      },
    },
    memoryShortcut: {
      en: "Write cheap, read sorted. Size is absolute, zero means gone, bids high-first, asks low-first.",
      vi: "Ghi rẻ, đọc mới sort. Size là tuyệt đối, bằng 0 là xoá, bid cao trước, ask thấp trước.",
    },
    followUp: {
      id: "isb-q52-f1",
      question: {
        en: "How do you know the deltas you applied are complete, and what do you do if one is missing?",
        vi: "Làm sao biết các delta đã áp dụng là đầy đủ, và nếu thiếu một delta thì xử lý thế nào?",
      },
      answer: {
        en: "Each message should carry a sequence number. I buffer deltas while the REST snapshot loads, then drop any delta with a sequence number at or below the snapshot's and apply the rest in order. If I see a gap, meaning the sequence jumps by more than one, the book is no longer trustworthy. I mark it stale in the UI, stop rendering it as live, request a fresh snapshot and replay the buffered deltas on top. A crossed book is a second signal that something was missed. I'd also run this whole loop in a Web Worker and post only the top N levels to the main thread once per frame, so a deep book never blocks input.",
        vi: "Mỗi message nên có sequence number. Trong lúc tải snapshot qua REST, tôi buffer các delta, sau đó bỏ những delta có sequence nhỏ hơn hoặc bằng sequence của snapshot và áp dụng phần còn lại theo thứ tự. Nếu thấy gap, tức là sequence nhảy hơn một, thì book không còn đáng tin. Tôi đánh dấu stale trên UI, ngừng hiển thị như dữ liệu live, lấy snapshot mới rồi replay các delta đã buffer lên trên. Book bị crossed là tín hiệu thứ hai cho thấy đã mất message. Tôi cũng sẽ chạy toàn bộ vòng này trong Web Worker và chỉ post top N mức sang main thread mỗi frame một lần, để book sâu không bao giờ chặn input.",
      },
    },
    alternative: {
      description: {
        en: "Keep each side as a sorted array and use binary search to find the price. Lookup is O(log L), and insert or delete is an O(L) splice, which is a fast memmove for a few thousand levels. Reading the top N becomes an O(N) slice with no sort, which is better when you render after every small batch.",
        vi: "Giữ mỗi bên là một mảng đã sắp xếp và dùng binary search để tìm giá. Lookup O(log L), còn insert hoặc delete là splice O(L), vốn rất nhanh (memmove) với vài nghìn mức. Đọc top N chỉ là slice O(N), không cần sort, nên tốt hơn khi render sau mỗi batch nhỏ.",
      },
      code: { language: "ts", code: q52Alternative, caption: "Sorted arrays + binary search" },
      complexity: "O(D · (log L + L)) worst case for writes, O(N) per read; O(L) space",
    },
    testCases: [
      {
        name: "update, remove, insert and depth cut",
        args: [
          {
            bids: [
              [100, 5],
              [99, 3],
              [98, 10],
            ],
            asks: [
              [101, 4],
              [102, 6],
              [103, 1],
            ],
          },
          [
            { side: "bid", price: 100, size: 7 },
            { side: "ask", price: 101, size: 0 },
            { side: "bid", price: 99.5, size: 2 },
            { side: "ask", price: 104, size: 9 },
          ],
          3,
        ],
        expected: {
          bids: [
            [100, 7],
            [99.5, 2],
            [99, 3],
          ],
          asks: [
            [102, 6],
            [103, 1],
            [104, 9],
          ],
        },
      },
      {
        name: "removing a missing level is a no-op",
        args: [{ bids: [[10, 1]], asks: [[11, 1]] }, [{ side: "bid", price: 9, size: 0 }], 5],
        expected: { bids: [[10, 1]], asks: [[11, 1]] },
      },
      {
        name: "build from an empty snapshot",
        args: [
          { bids: [], asks: [] },
          [
            { side: "ask", price: 52, size: 1 },
            { side: "bid", price: 49, size: 2 },
            { side: "ask", price: 51, size: 3 },
            { side: "bid", price: 50, size: 4 },
          ],
          10,
        ],
        expected: {
          bids: [
            [50, 4],
            [49, 2],
          ],
          asks: [
            [51, 3],
            [52, 1],
          ],
        },
      },
      {
        name: "same price updated then deleted in one batch",
        args: [
          {
            bids: [
              [100, 1],
              [99, 1],
            ],
            asks: [],
          },
          [
            { side: "bid", price: 100, size: 8 },
            { side: "bid", price: 100, size: 0 },
          ],
          2,
        ],
        expected: { bids: [[99, 1]], asks: [] },
      },
      {
        name: "depth 0 returns empty sides",
        args: [{ bids: [[1, 1]], asks: [[2, 1]] }, [], 0],
        expected: { bids: [], asks: [] },
      },
      {
        name: "unsorted snapshot is sorted on read",
        args: [
          {
            bids: [
              [97, 1],
              [99, 2],
              [98, 3],
            ],
            asks: [
              [105, 1],
              [103, 2],
              [104, 3],
            ],
          },
          [],
          2,
        ],
        expected: {
          bids: [
            [99, 2],
            [98, 3],
          ],
          asks: [
            [103, 2],
            [104, 3],
          ],
        },
      },
    ],
    difficulty: "medium",
    priority: "critical",
    jdRequirement:
      "Preferred: trading workflows and market data feeds; required: high-frequency data streams over WebSockets/SSE (JD, verified)",
  },

  {
    id: "isb-q53",
    number: 53,
    title: {
      en: "Aggregate trades into OHLC candles for an interval",
      vi: "Gom các trade thành nến OHLC theo khoảng thời gian",
    },
    statement: {
      en: `Given trades \`{ time, price, size }\` (epoch ms, UTC) and an \`intervalMs\`, return OHLC candles \`{ time, open, high, low, close, volume }\` sorted by \`time\`.

- \`time\` is the bucket start: \`floor(trade.time / intervalMs) * intervalMs\`.
- \`open\` is the price of the **earliest** trade in the bucket and \`close\` is the price of the **latest**, by timestamp rather than arrival order. If two trades share the latest timestamp, the one that arrived later wins.
- \`volume\` is the sum of sizes. Intervals without trades produce no candle.`,
      vi: `Cho danh sách trade \`{ time, price, size }\` (epoch ms, UTC) và \`intervalMs\`, trả về các nến OHLC \`{ time, open, high, low, close, volume }\` sắp xếp theo \`time\`.

- \`time\` là thời điểm bắt đầu bucket: \`floor(trade.time / intervalMs) * intervalMs\`.
- \`open\` là giá của trade **sớm nhất** trong bucket và \`close\` là giá của trade **muộn nhất**, xét theo timestamp chứ không theo thứ tự nhận. Nếu hai trade cùng timestamp muộn nhất thì trade đến sau thắng.
- \`volume\` là tổng size. Khoảng thời gian không có trade thì không tạo nến.`,
    },
    examples: [
      {
        input: `trades = [(0,100,1), (15000,102,2), (30000,99,1), (59999,101,3), (60000,101.5,1), (150000,103,2)], intervalMs = 60000`,
        output: `[{time:0,open:100,high:102,low:99,close:101,volume:7}, {time:60000,open:101.5,...,volume:1}, {time:120000,open:103,...,volume:2}]`,
        explanation: {
          en: "59999 still belongs to the first minute and 60000 starts the second. The trade at 150000 falls in the bucket starting at 120000.",
          vi: "59999 vẫn thuộc phút đầu tiên, còn 60000 mở phút thứ hai. Trade tại 150000 thuộc bucket bắt đầu từ 120000.",
        },
      },
    ],
    constraints: [
      "0 <= trades.length <= 10^6",
      "intervalMs > 0",
      "price > 0, size >= 0",
      "trades may arrive slightly out of order",
    ],
    approach: {
      en: `Bucket by aligned start time in a \`Map<bucketStart, Bucket>\`. High, low and volume are order-independent (max, min, sum). Open and close are not, so each bucket also stores the timestamps of the trades that set them. A late trade can still become the open if it is older, and it won't overwrite the close with stale data.

At the end, sort the buckets by start time. There are usually far fewer buckets than trades, so the sort is cheap.

In a live chart you don't recompute history. You keep only the **partial candle** for the current interval, update it on every trade, and emit it as final when a trade crosses into the next bucket. That's the streaming alternative.`,
      vi: `Gom theo thời điểm bắt đầu đã căn chỉnh, dùng \`Map<bucketStart, Bucket>\`. High, low và volume không phụ thuộc thứ tự (max, min, sum). Open và close thì có, nên mỗi bucket lưu thêm timestamp của trade đã đặt ra chúng. Nhờ vậy trade đến trễ vẫn có thể thành open nếu nó cũ hơn, và không ghi đè close bằng dữ liệu cũ.

Cuối cùng sort các bucket theo thời gian bắt đầu. Số bucket thường ít hơn số trade rất nhiều nên sort rẻ.

Trên chart live, bạn không tính lại lịch sử. Bạn chỉ giữ **nến đang hình thành** (partial candle) của khoảng hiện tại, cập nhật mỗi trade, và chốt nó khi có trade sang bucket kế tiếp. Đó là lời giải streaming ở phần thay thế.`,
    },
    functionName: "aggregateCandles",
    solution: { language: "ts", code: q53Solution, caption: "Bucket map with timestamp-aware open/close" },
    steps: [
      {
        en: "Validate `intervalMs > 0`, since a zero interval would divide by zero and produce NaN buckets.",
        vi: "Kiểm tra `intervalMs > 0`, vì khoảng bằng 0 sẽ chia cho 0 và tạo bucket NaN.",
      },
      {
        en: "Compute the bucket start with `Math.floor(time / intervalMs) * intervalMs`.",
        vi: "Tính thời điểm bắt đầu bucket bằng `Math.floor(time / intervalMs) * intervalMs`.",
      },
      {
        en: "First trade in a bucket: create the candle with open = high = low = close = price.",
        vi: "Trade đầu tiên của bucket: tạo nến với open = high = low = close = price.",
      },
      {
        en: "Later trades: update high, low and volume.",
        vi: "Các trade sau: cập nhật high, low và volume.",
      },
      {
        en: "Replace open only if the trade is older than the current open trade, and close only if it is at least as new as the current close trade.",
        vi: "Chỉ thay open nếu trade cũ hơn trade đang giữ open, và chỉ thay close nếu trade mới bằng hoặc mới hơn trade đang giữ close.",
      },
      {
        en: "Return the candles sorted by start time.",
        vi: "Trả về các nến đã sort theo thời điểm bắt đầu.",
      },
    ],
    timeComplexity: "O(n + k log k) — n trades, k candles (k ≤ n)",
    spaceComplexity: "O(k)",
    edgeCases: [
      {
        en: "A trade exactly on a boundary (time = 60000) opens the next candle. Buckets are half-open [start, start + interval).",
        vi: "Trade nằm đúng biên (time = 60000) mở nến kế tiếp. Bucket là nửa mở [start, start + interval).",
      },
      {
        en: "Out-of-order trades: compare timestamps for open and close instead of trusting arrival order.",
        vi: "Trade đến sai thứ tự: so sánh timestamp cho open và close thay vì tin vào thứ tự nhận.",
      },
      {
        en: "Empty intervals: no candle. A chart may want to fill them with a flat candle at the previous close and volume 0, which is a product decision.",
        vi: "Khoảng không có trade: không tạo nến. Chart có thể muốn lấp bằng nến phẳng theo close trước đó và volume 0, đây là quyết định của product.",
      },
      {
        en: "Daily or weekly candles: epoch alignment puts daily buckets at UTC midnight, and 7-day buckets would start on Thursdays because 1 January 1970 was a Thursday. Exchange-local days and Monday-based weeks need a timezone offset (and DST handling) before bucketing, which is why the server should own those boundaries.",
        vi: "Nến ngày hoặc tuần: căn theo epoch thì bucket ngày bắt đầu lúc nửa đêm UTC, còn bucket 7 ngày sẽ bắt đầu vào thứ Năm vì ngày 1/1/1970 là thứ Năm. Ngày theo giờ sàn và tuần bắt đầu từ thứ Hai cần cộng offset múi giờ (và xử lý DST) trước khi chia bucket, vì vậy nên để server quyết định các ranh giới này.",
      },
      {
        en: "Floating-point volume sums can drift. Sum sizes in integer lots when exactness matters.",
        vi: "Tổng volume dạng số thực có thể bị sai số. Hãy cộng theo lot số nguyên khi cần chính xác tuyệt đối.",
      },
    ],
    walkthrough: {
      steps: [
        "interval = 60000 (1 minute)",
        "t=0      price 100  -> bucket 0      O=100 H=100 L=100 C=100 V=1",
        "t=15000  price 102  -> bucket 0      H=102 C=102 V=3",
        "t=30000  price 99   -> bucket 0      L=99  C=99  V=4",
        "t=59999  price 101  -> bucket 0      C=101 V=7",
        "t=60000  price 101.5 -> bucket 60000 new candle",
        "t=150000 price 103  -> bucket 120000 new candle (bucket 60000..119999 has 1 trade)",
        "|-- 0 --------------|-- 60000 ------|-- 120000 -----|\n   O100 H102 L99 C101   O=H=L=C 101.5   O=H=L=C 103",
      ],
    },
    memoryShortcut: {
      en: "Floor to the bucket. High/low/volume don't care about order; open/close follow the timestamps.",
      vi: "Floor về bucket. High/low/volume không quan tâm thứ tự; open/close đi theo timestamp.",
    },
    followUp: {
      id: "isb-q53-f1",
      question: {
        en: "How would you feed this into a live chart without re-rendering the whole series on every trade?",
        vi: "Làm sao đưa dữ liệu này vào chart live mà không render lại cả series mỗi khi có trade?",
      },
      answer: {
        en: "I'd keep history and the live candle separate. History is loaded once from the backend, ideally already aggregated server-side, and handed to the chart in a single call. Trades then only update the partial candle. Libraries like TradingView Lightweight Charts expose an update method that replaces the last bar or appends a new one, which is O(1) for the chart. I'd batch trades and apply at most one update per animation frame, and do the aggregation in a worker if the trade rate is high. When the interval changes, I re-request history at the new resolution rather than re-aggregating raw trades in the browser, because the client rarely has the full tick history.",
        vi: "Tôi tách lịch sử và nến live. Lịch sử tải một lần từ backend, tốt nhất là đã được tổng hợp sẵn ở server, rồi đưa cho chart trong một lần gọi. Sau đó trade chỉ cập nhật partial candle. Các thư viện như TradingView Lightweight Charts có hàm update để thay bar cuối hoặc thêm bar mới, chi phí O(1) với chart. Tôi sẽ gom trade và chỉ update nhiều nhất một lần mỗi animation frame, và đưa phần tổng hợp vào worker nếu tốc độ trade cao. Khi đổi interval, tôi gọi lại lịch sử ở độ phân giải mới thay vì tổng hợp lại raw trade trên trình duyệt, vì client hiếm khi có đủ toàn bộ tick.",
      },
    },
    alternative: {
      description: {
        en: "Streaming version for ordered trades: keep a single live candle and push it to the result when a trade crosses into a new bucket. It uses O(1) working memory, needs no sort, and is the shape you want inside a WebSocket handler or Web Worker. It assumes trades arrive in time order.",
        vi: "Phiên bản streaming cho trade đã đúng thứ tự: giữ một nến live và đẩy nó vào kết quả khi có trade sang bucket mới. Bộ nhớ làm việc O(1), không cần sort, đúng dạng bạn cần trong WebSocket handler hoặc Web Worker. Lời giải này giả định trade đến theo thứ tự thời gian.",
      },
      code: { language: "ts", code: q53Alternative, caption: "Streaming partial-candle aggregation" },
      complexity: "O(n) time, O(1) working space (plus output)",
    },
    testCases: [
      {
        name: "three one-minute candles with a gap",
        args: [
          [
            { time: 0, price: 100, size: 1 },
            { time: 15000, price: 102, size: 2 },
            { time: 30000, price: 99, size: 1 },
            { time: 59999, price: 101, size: 3 },
            { time: 60000, price: 101.5, size: 1 },
            { time: 150000, price: 103, size: 2 },
          ],
          60000,
        ],
        expected: [
          { time: 0, open: 100, high: 102, low: 99, close: 101, volume: 7 },
          { time: 60000, open: 101.5, high: 101.5, low: 101.5, close: 101.5, volume: 1 },
          { time: 120000, open: 103, high: 103, low: 103, close: 103, volume: 2 },
        ],
      },
      {
        name: "single trade",
        args: [[{ time: 5000, price: 50, size: 4 }], 1000],
        expected: [{ time: 5000, open: 50, high: 50, low: 50, close: 50, volume: 4 }],
      },
      { name: "no trades", args: [[], 60000], expected: [] },
      {
        name: "five-second candles",
        args: [
          [
            { time: 1000, price: 10, size: 1 },
            { time: 4000, price: 12, size: 1 },
            { time: 5000, price: 11, size: 2 },
            { time: 9999, price: 9, size: 1 },
          ],
          5000,
        ],
        expected: [
          { time: 0, open: 10, high: 12, low: 10, close: 12, volume: 2 },
          { time: 5000, open: 11, high: 11, low: 9, close: 9, volume: 3 },
        ],
      },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement:
      "Build interactive, low-latency dashboards and charts for complex, high-volume market data (JD, verified)",
  },

  {
    id: "isb-q54",
    number: 54,
    title: {
      en: "Sliding-window moving average and VWAP in O(n)",
      vi: "Moving average và VWAP theo cửa sổ trượt trong O(n)",
    },
    statement: {
      en: `Given trades \`{ time, price, size }\` sorted by \`time\` and a \`windowMs\`, return one stat per trade, evaluated over the time window \`(time - windowMs, time]\`:

- \`sma\`: the simple average of trade prices in the window.
- \`vwap\`: \`Σ(price × size) / Σ(size)\`, or \`null\` if the window has zero volume.

The total work must be O(n). Recomputing each window from scratch is O(n·w) and is not acceptable.`,
      vi: `Cho danh sách trade \`{ time, price, size }\` đã sắp xếp theo \`time\` và \`windowMs\`, trả về một chỉ số cho mỗi trade, tính trên cửa sổ thời gian \`(time - windowMs, time]\`:

- \`sma\`: trung bình cộng giá các trade trong cửa sổ.
- \`vwap\`: \`Σ(price × size) / Σ(size)\`, hoặc \`null\` nếu cửa sổ có volume bằng 0.

Tổng chi phí phải là O(n). Tính lại từng cửa sổ từ đầu là O(n·w) và không được chấp nhận.`,
    },
    examples: [
      {
        input: `trades = [(0,10,1), (1000,12,3), (2000,14,4), (3000,16,1), (5500,13,1)], windowMs = 3000`,
        output: `[{time:0,sma:10,vwap:10}, {time:1000,sma:11,vwap:11.5}, {time:2000,sma:12,vwap:12.75}, {time:3000,sma:14,vwap:13.5}, {time:5500,sma:14.5,vwap:14.5}]`,
        explanation: {
          en: "At t=3000 the window is (0, 3000], so the trade at t=0 leaves. VWAP = (12·3 + 14·4 + 16·1) / 8 = 108 / 8 = 13.5. At t=5500 only the trades at 3000 and 5500 remain.",
          vi: "Tại t=3000 cửa sổ là (0, 3000], nên trade tại t=0 bị loại. VWAP = (12·3 + 14·4 + 16·1) / 8 = 108 / 8 = 13.5. Tại t=5500 chỉ còn trade tại 3000 và 5500.",
        },
      },
    ],
    constraints: [
      "0 <= trades.length <= 10^6",
      "trades sorted by time (non-decreasing)",
      "windowMs > 0",
      "price > 0, size >= 0",
    ],
    approach: {
      en: `Use **two pointers with running sums**. The right pointer walks every trade and adds it to \`count\`, \`sumPrice\`, \`sumNotional\` (price × size) and \`sumVolume\`. Then the left pointer advances past every trade whose time is at or before \`time - windowMs\`, subtracting it from the sums.

Each trade enters once and leaves once, so the total work is O(n) amortized even though there is a nested loop. We only keep sums plus an index into the input. In a live stream, where there is no input array, you'd keep a queue (a ring buffer) of the trades currently inside the window.

SMA treats every trade equally. VWAP weights by size, so one large trade moves it more than many small ones. That's why traders use VWAP as an execution benchmark.`,
      vi: `Dùng **hai con trỏ kèm tổng cộng dồn**. Con trỏ phải đi qua từng trade và cộng vào \`count\`, \`sumPrice\`, \`sumNotional\` (price × size) và \`sumVolume\`. Sau đó con trỏ trái tiến qua mọi trade có thời gian nhỏ hơn hoặc bằng \`time - windowMs\` và trừ chúng khỏi các tổng.

Mỗi trade vào một lần và ra một lần, nên tổng chi phí là O(n) amortized dù có vòng lặp lồng nhau. Ta chỉ giữ các tổng và một chỉ số vào mảng input. Với stream live, khi không có mảng input, bạn giữ một queue (ring buffer) chứa các trade đang nằm trong cửa sổ.

SMA coi mọi trade như nhau. VWAP có trọng số theo size, nên một lệnh lớn kéo VWAP mạnh hơn nhiều lệnh nhỏ. Vì vậy trader dùng VWAP làm benchmark khớp lệnh.`,
    },
    functionName: "slidingWindowStats",
    solution: { language: "ts", code: q54Solution, caption: "Two pointers + running sums" },
    steps: [
      {
        en: "Initialise `left = 0` and the running sums (count, price, notional, volume).",
        vi: "Khởi tạo `left = 0` và các tổng cộng dồn (count, price, notional, volume).",
      },
      {
        en: "For each incoming trade, add it to every sum.",
        vi: "Với mỗi trade mới, cộng nó vào tất cả các tổng.",
      },
      {
        en: "Compute `cutoff = time - windowMs`. While `trades[left].time <= cutoff`, subtract that trade and advance `left`.",
        vi: "Tính `cutoff = time - windowMs`. Trong khi `trades[left].time <= cutoff`, trừ trade đó và tăng `left`.",
      },
      {
        en: "Emit `sma = sumPrice / count` and `vwap = sumNotional / sumVolume`, or null when the volume is 0.",
        vi: "Xuất `sma = sumPrice / count` và `vwap = sumNotional / sumVolume`, hoặc null khi volume bằng 0.",
      },
      {
        en: "Explain why it's O(n): each index passes through `left` at most once.",
        vi: "Giải thích vì sao là O(n): mỗi chỉ số đi qua `left` nhiều nhất một lần.",
      },
    ],
    timeComplexity: "O(n) amortized — every trade is added once and evicted at most once",
    spaceComplexity: "O(1) working space beyond the output (O(w) queue in a pure streaming version)",
    edgeCases: [
      {
        en: "The window always contains the current trade (windowMs > 0), so `count >= 1` and SMA never divides by zero.",
        vi: "Cửa sổ luôn chứa trade hiện tại (windowMs > 0), nên `count >= 1` và SMA không bao giờ chia cho 0.",
      },
      {
        en: "Zero-volume window: VWAP is undefined, so return null rather than NaN or 0. The UI shows a dash.",
        vi: "Cửa sổ có volume bằng 0: VWAP không xác định, nên trả về null thay vì NaN hay 0. UI hiển thị dấu gạch.",
      },
      {
        en: "Several trades with the same timestamp: they all stay or leave together, because the window is time-based.",
        vi: "Nhiều trade cùng timestamp: chúng cùng ở lại hoặc cùng bị loại, vì cửa sổ tính theo thời gian.",
      },
      {
        en: "Floating-point drift from many add/subtract cycles in a long-running stream: periodically recompute the sums from the window, or use integer minor units.",
        vi: "Sai số số thực do cộng trừ liên tục trong stream chạy lâu: định kỳ tính lại tổng từ cửa sổ, hoặc dùng đơn vị nguyên nhỏ nhất.",
      },
      {
        en: "Unsorted input breaks the two-pointer invariant. Validate the order or sort first.",
        vi: "Input chưa sắp xếp sẽ phá vỡ bất biến của hai con trỏ. Hãy kiểm tra thứ tự hoặc sort trước.",
      },
    ],
    walkthrough: {
      steps: [
        "window = 3000ms, half-open (t - 3000, t]",
        "t=0     add (10,1)              window [0]            sma 10    vwap 10/1 = 10",
        "t=1000  add (12,3)              window [0,1000]       sma 11    vwap 46/4 = 11.5",
        "t=2000  add (14,4)              window [0..2000]      sma 12    vwap 102/8 = 12.75",
        "t=3000  add (16,1), cutoff 0 -> evict t=0     window [1000..3000]   sma 14   vwap 108/8 = 13.5",
        "t=5500  add (13,1), cutoff 2500 -> evict 1000, 2000   window [3000,5500]   sma 14.5   vwap 29/2 = 14.5",
        "left moved 0 -> 3 in total: 3 evictions for 5 trades, so the work stays linear",
      ],
      diagram: {
        kind: "flowchart",
        code: `flowchart LR
    IN["Incoming trade"] --> ADD["Add to sums"]
    ADD --> CHK{"oldest time <= cutoff?"}
    CHK -->|yes| EV["Subtract oldest, left++"]
    EV --> CHK
    CHK -->|no| OUT["Emit SMA and VWAP"]`,
        caption: { en: "Add right, evict left, emit", vi: "Thêm bên phải, loại bên trái, xuất kết quả" },
      },
    },
    memoryShortcut: {
      en: "Add on the right, evict on the left, divide at the end. Everyone enters once and leaves once.",
      vi: "Thêm bên phải, đuổi bên trái, chia ở cuối. Mỗi phần tử vào một lần, ra một lần.",
    },
    followUp: {
      id: "isb-q54-f1",
      question: {
        en: "What if the window was a fixed count of the last k trades, or you needed the window's max price too?",
        vi: "Nếu cửa sổ là k trade gần nhất, hoặc bạn cần thêm giá cao nhất trong cửa sổ thì sao?",
      },
      answer: {
        en: "A count-based window is the same pattern with simpler eviction. Once count exceeds k, subtract trades[i - k]. A fixed-size ring buffer is the natural structure there, and it caps memory. Max and min aren't invertible like sums, because you can't subtract a max. The standard trick is a monotonic deque: keep indices whose prices are decreasing, pop from the back when a bigger price arrives, and pop from the front when the index leaves the window. The front is always the max, still O(n) amortized. On a dashboard I'd compute this in a worker and post the results per frame.",
        vi: "Cửa sổ theo số lượng dùng cùng pattern, chỉ là loại phần tử đơn giản hơn. Khi count vượt k thì trừ trades[i - k]. Cấu trúc tự nhiên là ring buffer kích thước cố định, vừa giới hạn bộ nhớ. Max và min không đảo ngược được như tổng, vì không thể 'trừ' một giá trị max. Cách chuẩn là monotonic deque: giữ các chỉ số có giá giảm dần, pop từ cuối khi có giá lớn hơn, và pop từ đầu khi chỉ số rời cửa sổ. Phần tử đầu luôn là max, vẫn O(n) amortized. Trên dashboard tôi sẽ tính trong worker và post kết quả mỗi frame.",
      },
    },
    testCases: [
      {
        name: "time window with evictions",
        args: [
          [
            { time: 0, price: 10, size: 1 },
            { time: 1000, price: 12, size: 3 },
            { time: 2000, price: 14, size: 4 },
            { time: 3000, price: 16, size: 1 },
            { time: 5500, price: 13, size: 1 },
          ],
          3000,
        ],
        expected: [
          { time: 0, sma: 10, vwap: 10 },
          { time: 1000, sma: 11, vwap: 11.5 },
          { time: 2000, sma: 12, vwap: 12.75 },
          { time: 3000, sma: 14, vwap: 13.5 },
          { time: 5500, sma: 14.5, vwap: 14.5 },
        ],
      },
      { name: "empty input", args: [[], 1000], expected: [] },
      {
        name: "zero-volume window gives null VWAP",
        args: [[{ time: 0, price: 10, size: 0 }], 1000],
        expected: [{ time: 0, sma: 10, vwap: null }],
      },
      {
        name: "same timestamp trades and a full window reset",
        args: [
          [
            { time: 0, price: 20, size: 1 },
            { time: 0, price: 30, size: 3 },
            { time: 10000, price: 40, size: 2 },
          ],
          5000,
        ],
        expected: [
          { time: 0, sma: 20, vwap: 20 },
          { time: 0, sma: 25, vwap: 27.5 },
          { time: 10000, sma: 40, vwap: 40 },
        ],
      },
      {
        name: "large window behaves like a cumulative average",
        args: [
          [
            { time: 0, price: 2, size: 1 },
            { time: 1, price: 4, size: 1 },
            { time: 2, price: 6, size: 2 },
          ],
          1000000,
        ],
        expected: [
          { time: 0, sma: 2, vwap: 2 },
          { time: 1, sma: 3, vwap: 3 },
          { time: 2, sma: 4, vwap: 4.5 },
        ],
      },
    ],
    difficulty: "medium",
    priority: "medium",
    jdRequirement:
      "Preferred: financial metrics and market data feeds; visualize complex financial data in real time (JD, verified)",
  },

  {
    id: "isb-q55",
    number: 55,
    title: {
      en: "LRU cache with O(1) get and put",
      vi: "LRU cache với get và put O(1)",
    },
    statement: {
      en: `Implement an LRU (least recently used) cache with a fixed \`capacity\`:

- \`get(key)\` returns the value, or \`undefined\` if missing, and marks the key as most recently used.
- \`put(key, value)\` inserts or updates the key and marks it as most recently used. If the size then exceeds \`capacity\`, evict the least recently used key.

Both operations must be O(1). For testing, write \`runLruOps(capacity, ops)\`, where \`ops\` is a list of \`["put", key, value]\` or \`["get", key]\`. It returns one result per op: the value (or \`null\` on a miss) for \`get\`, and \`null\` for \`put\`.`,
      vi: `Cài đặt LRU cache (least recently used) với \`capacity\` cố định:

- \`get(key)\` trả về giá trị, hoặc \`undefined\` nếu không có, và đánh dấu key là vừa được dùng.
- \`put(key, value)\` thêm mới hoặc cập nhật key và đánh dấu nó là vừa được dùng. Nếu sau đó số phần tử vượt \`capacity\` thì loại key lâu chưa dùng nhất.

Cả hai thao tác phải O(1). Để test, viết \`runLruOps(capacity, ops)\`, trong đó \`ops\` là danh sách \`["put", key, value]\` hoặc \`["get", key]\`. Hàm trả về một kết quả cho mỗi op: giá trị (hoặc \`null\` nếu miss) với \`get\`, và \`null\` với \`put\`.`,
    },
    examples: [
      {
        input: `runLruOps(2, [["put","a",1],["put","b",2],["get","a"],["put","c",3],["get","b"],["put","a",10],["get","a"],["get","c"]])`,
        output: `[null,null,1,null,null,null,10,3]`,
        explanation: {
          en: "Reading 'a' makes 'b' the least recently used, so putting 'c' evicts 'b'. Updating 'a' keeps the size at 2 and refreshes its recency.",
          vi: "Đọc 'a' làm 'b' thành key lâu chưa dùng nhất, nên put 'c' sẽ loại 'b'. Cập nhật 'a' giữ size bằng 2 và làm mới thứ tự sử dụng của nó.",
        },
      },
    ],
    constraints: [
      "0 <= capacity <= 10^5",
      "0 <= ops.length <= 10^5",
      "keys are strings or numbers (compared with SameValueZero)",
    ],
    approach: {
      en: `You need two things in O(1): **find a key** (a hash map) and **know the recency order** (a list you can reorder in O(1)).

In JavaScript, a \`Map\` already gives you both, because it iterates in insertion order. To mark a key as most recently used, \`delete\` it and \`set\` it again, which moves it to the end. The least recently used key is always \`map.keys().next().value\`. That's the idiomatic interview answer, and it's honest to mention that it relies on the spec-guaranteed insertion order.

The classic, language-agnostic version is a hash map from key to node plus a doubly linked list, with the most recent at the head and the least recent at the tail. Moving a node or evicting the tail is a few pointer updates. Interviewers often ask for it as a follow-up, so it's included as the alternative.`,
      vi: `Bạn cần hai thứ trong O(1): **tìm key** (hash map) và **biết thứ tự sử dụng** (một danh sách có thể sắp xếp lại trong O(1)).

Trong JavaScript, \`Map\` đã có sẵn cả hai, vì nó duyệt theo thứ tự chèn. Để đánh dấu một key là vừa dùng, \`delete\` rồi \`set\` lại, key sẽ chuyển xuống cuối. Key lâu chưa dùng nhất luôn là \`map.keys().next().value\`. Đây là câu trả lời idiomatic khi phỏng vấn, và nên nói rõ nó dựa vào thứ tự chèn mà spec đảm bảo.

Phiên bản kinh điển, không phụ thuộc ngôn ngữ, là hash map từ key tới node cộng với doubly linked list: phần tử mới nhất ở head, cũ nhất ở tail. Di chuyển node hay loại tail chỉ là vài thao tác cập nhật con trỏ. Interviewer hay hỏi thêm phần này, nên nó có ở lời giải thay thế.`,
    },
    functionName: "runLruOps",
    solution: { language: "ts", code: q55Solution, caption: "Map-based LRU (insertion order = recency order)" },
    steps: [
      {
        en: "Store entries in a `Map<K, V>`, with the oldest first and the newest last.",
        vi: "Lưu các entry trong `Map<K, V>`, cũ nhất đứng đầu, mới nhất đứng cuối.",
      },
      {
        en: "get: on a miss return undefined. On a hit, delete and re-set the key to move it to the end, then return the value.",
        vi: "get: nếu miss thì trả về undefined. Nếu hit, delete rồi set lại key để chuyển nó xuống cuối, sau đó trả về giá trị.",
      },
      {
        en: "put: delete the key first so an update also refreshes recency, then set it.",
        vi: "put: delete key trước để thao tác cập nhật cũng làm mới thứ tự, sau đó set.",
      },
      {
        en: "If the size exceeds capacity, delete the first key from `keys().next()`.",
        vi: "Nếu size vượt capacity, xoá key đầu tiên lấy từ `keys().next()`.",
      },
      {
        en: "Handle capacity 0 by never storing anything.",
        vi: "Xử lý capacity 0 bằng cách không bao giờ lưu gì.",
      },
      {
        en: "The harness maps each op to its result: the get value or null, and null for put.",
        vi: "Harness chuyển mỗi op thành kết quả: giá trị get hoặc null, và null với put.",
      },
    ],
    timeComplexity: "O(1) amortized per get/put",
    spaceComplexity: "O(capacity)",
    edgeCases: [
      {
        en: "capacity 0: every put is dropped and every get misses.",
        vi: "capacity 0: mọi put bị bỏ qua và mọi get đều miss.",
      },
      {
        en: "Updating an existing key must not evict anything, because the size doesn't grow.",
        vi: "Cập nhật key đã có không được loại key nào, vì size không tăng.",
      },
      {
        en: "A stored value of `undefined` is indistinguishable from a miss through `get`. Use `has()` or store null.",
        vi: "Giá trị lưu là `undefined` không phân biệt được với miss qua `get`. Hãy dùng `has()` hoặc lưu null.",
      },
      {
        en: "Object keys compare by reference. For composite keys (symbol + interval), build a string key.",
        vi: "Key là object được so sánh theo reference. Với key ghép (symbol + interval), hãy tạo key dạng string.",
      },
    ],
    walkthrough: {
      steps: [
        "capacity 2, Map order shown oldest -> newest",
        "put a=1      [a]",
        "put b=2      [a, b]",
        "get a -> 1   [b, a]          (a moved to the newest end)",
        "put c=3      [b, a, c] -> size 3 > 2 -> evict first (b) -> [a, c]",
        "get b -> null",
        "put a=10     [c, a]          (update + refresh, no eviction)",
        "get a -> 10  [c, a]\nget c -> 3   [a, c]",
      ],
      diagram: {
        kind: "flowchart",
        code: `flowchart LR
    H["head: most recent"] --> A["a"]
    A --> C["c"]
    C --> T["tail: least recent"]
    M["Map key to node"] -.-> A
    M -.-> C
    P["put when full"] --> E["evict tail"]`,
        caption: { en: "Hash map + doubly linked list view", vi: "Góc nhìn hash map + doubly linked list" },
      },
    },
    memoryShortcut: {
      en: "Touch = move to the back of the line. Full = kick out the front of the line. In JS a Map is already the line.",
      vi: "Chạm vào = xếp lại cuối hàng. Đầy = đuổi người đầu hàng. Trong JS, Map chính là cái hàng đó.",
    },
    followUp: {
      id: "isb-q55-f1",
      question: {
        en: "Where would an LRU cache actually help in a trading frontend, and when is it the wrong tool?",
        vi: "LRU cache thực sự hữu ích ở đâu trong frontend trading, và khi nào nó là công cụ sai?",
      },
      answer: {
        en: "It's useful wherever a user flips between a bounded but unpredictable set of things. Examples are chart history for recently viewed symbols and intervals, decoded instrument metadata, and memoised formatter instances per locale and precision, since Intl.NumberFormat is relatively expensive to construct. The cap is what matters: an unbounded cache in a long-running dashboard is a memory leak. It's the wrong tool for live state like the order book, where freshness matters more than reuse, and for server data that TanStack Query already caches with staleTime and gcTime. In that case I'd tune the query cache instead of adding a second one. If values are large or time-sensitive, I'd add a TTL or size-based eviction on top of recency.",
        vi: "Nó hữu ích ở bất cứ đâu người dùng chuyển qua lại giữa một tập hữu hạn nhưng khó đoán. Ví dụ là lịch sử chart cho các symbol và interval vừa xem, metadata instrument đã decode, và các instance formatter theo locale và độ chính xác, vì khởi tạo Intl.NumberFormat khá tốn kém. Điểm quan trọng là giới hạn: cache không giới hạn trong dashboard chạy cả ngày chính là memory leak. Nó là công cụ sai cho state live như order book, nơi độ mới quan trọng hơn việc tái sử dụng, và cho dữ liệu server mà TanStack Query đã cache bằng staleTime và gcTime. Khi đó tôi sẽ tinh chỉnh query cache thay vì thêm một cache thứ hai. Nếu giá trị lớn hoặc nhạy cảm theo thời gian, tôi sẽ thêm TTL hoặc loại theo kích thước bên cạnh tiêu chí recency.",
      },
    },
    alternative: {
      description: {
        en: "The classic implementation: a hash map from key to node plus a doubly linked list (head = most recent, tail = least recent). It works the same in any language and makes the O(1) argument explicit, since every operation is a map lookup plus a constant number of pointer updates.",
        vi: "Cách cài đặt kinh điển: hash map từ key tới node cộng với doubly linked list (head = mới nhất, tail = cũ nhất). Cách này dùng được ở mọi ngôn ngữ và làm rõ vì sao là O(1), vì mỗi thao tác chỉ gồm một lần tra map và một số lần cập nhật con trỏ cố định.",
      },
      code: { language: "ts", code: q55Alternative, caption: "Hash map + doubly linked list" },
      complexity: "O(1) per get/put, O(capacity) space",
    },
    testCases: [
      {
        name: "classic eviction sequence",
        args: [
          2,
          [
            ["put", "a", 1],
            ["put", "b", 2],
            ["get", "a"],
            ["put", "c", 3],
            ["get", "b"],
            ["put", "a", 10],
            ["get", "a"],
            ["get", "c"],
          ],
        ],
        expected: [null, null, 1, null, null, null, 10, 3],
      },
      {
        name: "update refreshes recency",
        args: [
          2,
          [
            ["put", 1, 1],
            ["put", 2, 2],
            ["put", 1, 11],
            ["put", 3, 3],
            ["get", 2],
            ["get", 1],
            ["get", 3],
          ],
        ],
        expected: [null, null, null, null, null, 11, 3],
      },
      {
        name: "capacity 1",
        args: [
          1,
          [
            ["put", "x", "first"],
            ["put", "y", "second"],
            ["get", "x"],
            ["get", "y"],
          ],
        ],
        expected: [null, null, null, "second"],
      },
      {
        name: "capacity 0 stores nothing",
        args: [
          0,
          [
            ["put", "a", 1],
            ["get", "a"],
          ],
        ],
        expected: [null, null],
      },
      {
        name: "object values are returned as stored",
        args: [
          3,
          [
            ["put", "AAPL:1m", { bars: 2 }],
            ["get", "AAPL:1m"],
            ["get", "MSFT:1m"],
          ],
        ],
        expected: [null, { bars: 2 }, null],
      },
    ],
    difficulty: "medium",
    priority: "medium",
    jdRequirement:
      "Deep knowledge of browser rendering mechanics, memory leak detection and web performance tools (JD, verified)",
  },
];
