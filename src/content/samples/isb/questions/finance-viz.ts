import type { InterviewQuestion } from "@/domain/package/schema";

/**
 * ISB Vietnam — Section 7, topic "finance-viz" (questions 31–36).
 * Financial visualization and trading fundamentals.
 *
 * Honesty note: the candidate has NO production trading / market-data experience.
 * Trading concepts are presented as domain knowledge and recommended approaches;
 * only the accessibility work (Persefoni) is referenced as actual experience.
 */
export const financeVizQuestions: InterviewQuestion[] = [
  /* ------------------------------------------------------------------ */
  /* Q31 — Order book basics and efficient rendering                     */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q31",
    number: 31,
    topicId: "finance-viz",
    question: {
      en: "Explain order book basics — bid, ask, spread and depth — and how you would render a live order book efficiently in React.",
      vi: "Hãy giải thích các khái niệm cơ bản của order book — bid, ask, spread và depth — và cách bạn render một order book cập nhật liên tục trong React một cách hiệu quả.",
    },
    answer: `An order book is the list of resting limit orders for an instrument, aggregated by price level. Bids are buyers, sorted from the highest price down; asks are sellers, sorted from the lowest price up. The best bid and best ask form the top of book, the gap between them is the spread, and depth is how much size is resting at each level — usually shown as cumulative bars so a trader can read liquidity at a glance.

For rendering, I'd split it into three parts. First, the model: I keep bids and asks in Maps keyed by price, apply snapshot-plus-delta updates outside React — ideally in a Web Worker — and treat a size of zero as "remove this level". Second, the hand-off: the UI only shows the top N levels, say twenty per side, so the worker publishes that small sorted slice at most once per animation frame instead of on every message. Third, the view: a fixed number of row slots keyed by position, not by price, so when the book shifts React updates text in place instead of unmounting and remounting rows. Depth bars use transform scaleX, so they stay on the compositor.

The failure mode I watch for is a crossed book — best bid at or above best ask on a feed that shouldn't cross — which usually means we missed a delta, so I trigger a resync from a fresh snapshot.`,
    viExplanation: `Order book là danh sách các lệnh limit đang chờ khớp, được gom theo từng mức giá (price level). Phía bid là người mua, sắp xếp giá từ cao xuống thấp; phía ask là người bán, sắp xếp từ thấp lên cao. Best bid và best ask tạo thành top of book, khoảng cách giữa hai giá này là spread, còn depth là khối lượng đang chờ ở mỗi mức giá — thường hiển thị bằng thanh cumulative để trader nhìn nhanh thanh khoản.

Khi trả lời, hãy chia thành ba lớp. Lớp model: giữ bids/asks trong Map theo giá, áp dụng snapshot + delta bên ngoài React (tốt nhất là trong Web Worker), size = 0 nghĩa là xoá mức giá đó. Lớp chuyển giao: UI chỉ cần top N mức giá, nên worker chỉ publish một lát cắt nhỏ đã sắp xếp, tối đa một lần mỗi frame. Lớp hiển thị: số dòng cố định, key theo vị trí dòng chứ không theo giá, để khi giá dịch chuyển React chỉ cập nhật text thay vì unmount/mount lại DOM. Thanh depth dùng transform: scaleX để chỉ chạy ở bước composite, không gây layout.

Điểm ghi điểm senior: nhắc đến crossed book (best bid ≥ best ask) — đây thường là dấu hiệu bị mất delta, cần resync từ snapshot mới thay vì tiếp tục hiển thị dữ liệu sai.`,
    technicalExplanation: `### Core concepts
- **Market-by-price (Level 2)**: one row per price with aggregated size (sometimes order count). Market-by-order (Level 3) shows individual orders — much heavier and rarely needed in a UI.
- **Top of book**: best bid = highest bid price, best ask = lowest ask price. **Spread** = bestAsk − bestBid; **mid** = (bestBid + bestAsk) / 2.
- **Depth**: size per level. **Cumulative depth** sums from the top of book outward and drives depth bars or a depth chart.
- **Tick size**: the minimum price increment. It defines price grouping ("aggregate to 0.5") and display decimals.

### Data path
- Feeds usually send a **snapshot**, then **deltas** ("set level size"; size 0 = delete) with a sequence number. A sequence gap means discard and resubscribe for a fresh snapshot (gap recovery is covered in the real-time section).
- Store each side as \`Map<priceInTicks, size>\` keyed by an **integer** price in ticks, not a float or string, so \`0.1 + 0.2\`-style mismatches can never create duplicate levels.
- Top N: sorting every level is O(L log L) per publish. For a few hundred levels that is cheap; for thousands, keep a sorted array with binary-search insertion (or a tree/heap) and slice the first N.
- **Price grouping** (0.01 → 0.1 → 1) is just re-bucketing the same map. Do it in the worker so the main thread only ever sees N rows per side.

### Rendering
- **Fixed row slots**: render exactly N rows per side and key them by index. A price-keyed list makes React insert, move and remove DOM nodes every time the book shifts by one level — which is precisely what a live book does all day.
- **Coalesce per frame**: apply every delta to the model, but publish the visible slice at most once per frame (about 16.7 ms at 60 Hz). Users cannot perceive faster changes.
- **Compositor-friendly bars**: \`transform: scaleX(cum / maxCum)\` with \`transform-origin\` on the outer edge; never animate \`width\`, which forces layout.
- **Change flashes**: toggle a class when a level's size changes, keep it short and respect \`prefers-reduced-motion\`.
- With many ladders on one screen or very high update rates, paint the ladder body to \`<canvas>\` and keep an accessible text summary (best bid, best ask, spread) in the DOM.

### Failure scenarios
- **Crossed or locked book** (bestBid ≥ bestAsk) on a feed that should never cross → probably a missed delta → resync.
- **Stale book**: no update or heartbeat within the expected interval → grey out and label it stale; never show old prices as live.
- **Unbounded levels**: far-from-market levels accumulate over a session; cap stored depth or prune beyond a price range.

### Maintainability
Keep the book model a pure, unit-tested module (\`applyDelta\`, \`topN\`, \`spread\`) with no React imports. The component only renders rows, which makes both parts easy to test and to move between worker and main thread.`,
    practicalExample: {
      description: {
        en: "One side of an order book ladder: the worker publishes a sorted top-N slice once per frame, and the component renders fixed slots keyed by index with primitive props so memoized rows only re-render when their own numbers change.",
        vi: "Một phía của order book: worker publish lát cắt top N đã sắp xếp mỗi frame một lần, component render số dòng cố định với key theo index và props kiểu primitive, nên các row được memo chỉ re-render khi chính số liệu của nó thay đổi.",
      },
      code: {
        language: "tsx",
        code: `import { memo } from "react";
import { useBookStore } from "./book-store"; // Zustand store fed by the worker
import { formatPrice, formatSize } from "./format";

const ROWS = 20;

type RowProps = { price?: number; size?: number; cum?: number; maxCum: number; side: "bid" | "ask" };

const BookRow = memo(function BookRow({ price, size, cum = 0, maxCum, side }: RowProps) {
  if (price === undefined || size === undefined) return <div className="book-row empty" />;
  const ratio = maxCum > 0 ? cum / maxCum : 0;
  return (
    <div className={"book-row " + side}>
      {/* compositor-only depth bar: no layout on update */}
      <span className="depth-bar" style={{ transform: "scaleX(" + ratio + ")" }} aria-hidden="true" />
      <span className="price">{formatPrice(price)}</span>
      <span className="size">{formatSize(size)}</span>
    </div>
  );
});

export function BookSide({ side }: { side: "bid" | "ask" }) {
  // Narrow selectors: this side's slice (replaced at most once per frame) + shared scale.
  const levels = useBookStore((s) => (side === "bid" ? s.bids : s.asks));
  const maxCum = useBookStore((s) => s.maxCum);
  return (
    <div className="book-side" aria-label={side === "bid" ? "Bids" : "Asks"}>
      {Array.from({ length: ROWS }, (_, i) => {
        const l = levels[i];
        // key = slot index, so a price shift updates text instead of moving DOM nodes
        return <BookRow key={i} price={l?.price} size={l?.size} cum={l?.cum} maxCum={maxCum} side={side} />;
      })}
    </div>
  );
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  WS["WebSocket feed - snapshot then deltas"] --> WK["Web Worker"]
  WK --> CHK{"Sequence gap or crossed book?"}
  CHK -- yes --> RS["Resubscribe for a fresh snapshot"]
  RS --> WS
  CHK -- no --> MAP["Bid and ask Maps keyed by price in ticks"]
  MAP --> TOP["Sort and slice top N per side"]
  TOP --> RAF["Publish once per animation frame"]
  RAF --> ST["Zustand store slice"]
  ST --> UI["Fixed row slots keyed by index"]
  UI --> BAR["Depth bars via transform scaleX"]`,
      caption: {
        en: "The full book lives in a worker; the UI only receives a top-N slice per frame and renders fixed slots.",
        vi: "Toàn bộ order book nằm trong worker; UI chỉ nhận lát cắt top N mỗi frame và render các dòng cố định.",
      },
    },
    memoryShortcut: {
      en: '"Map → Slice → Slots": keep the book in Maps, publish a top-N slice per frame, render fixed slots.',
      vi: '"Map → Slice → Slots": giữ order book trong Map, publish lát cắt top N mỗi frame, render các slot cố định.',
    },
    keyTakeaway: {
      en: "Keep the full book outside React, hand the UI only a top-N slice per frame, and render fixed row slots so price shifts update text instead of DOM structure.",
      vi: "Giữ toàn bộ order book bên ngoài React, chỉ đưa cho UI lát cắt top N mỗi frame, và render dòng cố định để khi giá dịch chuyển chỉ text thay đổi chứ không phải cấu trúc DOM.",
    },
    followUps: [
      {
        id: "isb-q31-f1",
        question: {
          en: "How would you implement price grouping — for example aggregating 0.01 levels into 0.1 buckets — without hurting performance?",
          vi: "Bạn sẽ làm price grouping — ví dụ gom các mức giá 0.01 thành bucket 0.1 — như thế nào mà không ảnh hưởng hiệu năng?",
        },
        answer: {
          en: "Grouping is just re-bucketing the same price map. For bids I floor the price in ticks to the group size, for asks I ceil it, so the grouped best bid never looks better than what really exists and the spread is never understated. I do it in the worker over the full map, then slice the top N, so the main-thread cost doesn't change at all. Switching grouping must not reset the subscription — it's a pure view transform over the model. I'd unit-test boundary cases, like a level that lands exactly on a bucket edge.",
          vi: "Grouping thực chất chỉ là gom lại (re-bucket) cùng một price map. Với bid thì làm tròn xuống (floor) theo bước group, với ask thì làm tròn lên (ceil), để best bid sau khi gom không bao giờ trông tốt hơn thực tế và spread không bị hiển thị nhỏ hơn thật. Việc này chạy trong worker trên toàn bộ map rồi mới cắt top N, nên chi phí trên main thread không đổi. Đổi grouping không được reset subscription — nó chỉ là một phép biến đổi view trên model. Nên viết unit test cho các trường hợp biên, ví dụ mức giá rơi đúng vào ranh giới bucket.",
        },
      },
      {
        id: "isb-q31-f2",
        question: {
          en: "When would you move the order book from DOM rendering to canvas?",
          vi: "Khi nào bạn chuyển order book từ render bằng DOM sang canvas?",
        },
        answer: {
          en: "When profiling shows the ladder itself dominating frame time — typically many books on one screen, deep ladders with per-cell flashing, or update rates where even one React commit per frame of dozens of rows produces long tasks. Canvas lets me repaint only changed cells with no reconciliation, style recalculation or layout. The cost is accessibility, text selection, hit-testing and testability. So I'd keep best bid, best ask and spread as real text in the DOM, map clicks to price levels by coordinates for click-to-trade, and keep visual regression tests for the canvas.",
          vi: "Khi profiling cho thấy chính ladder chiếm phần lớn thời gian của frame — thường là khi có nhiều order book trên cùng màn hình, ladder sâu với hiệu ứng flash từng ô, hoặc tần suất cập nhật cao đến mức chỉ một lần commit React mỗi frame cho vài chục dòng cũng tạo long task. Canvas cho phép vẽ lại đúng những ô thay đổi, không có reconciliation, style recalculation hay layout. Cái giá phải trả là accessibility, chọn text, hit-testing và khả năng test. Vì vậy vẫn giữ best bid, best ask, spread là text thật trong DOM, ánh xạ click theo toạ độ sang mức giá cho click-to-trade, và dùng visual regression test cho phần canvas.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement:
      "Low-latency dashboards for high-volume market data; trading workflows and market data feeds (preferred)",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "No production order-book or trading experience. Present this as domain knowledge plus a recommended approach. You can honestly bridge from real-time Socket.IO work at Ninja Van (streaming updates into a UI) without claiming market-data experience.",
        vi: "Chưa có kinh nghiệm production về order book hay trading. Trình bày như kiến thức domain kèm cách tiếp cận đề xuất. Có thể liên hệ trung thực với kinh nghiệm Socket.IO realtime ở Ninja Van (đẩy cập nhật streaming lên UI), nhưng không nhận là đã làm với market data.",
      },
    },
    tags: ["order-book", "market-data", "rendering", "web-worker", "trading"],
  },

  /* ------------------------------------------------------------------ */
  /* Q32 — Candlestick / OHLC aggregation on the client                  */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q32",
    number: 32,
    topicId: "finance-viz",
    question: {
      en: "How would you aggregate live trades into candlestick (OHLC) bars on the client? Cover intervals, time zones and the partial, in-progress candle.",
      vi: "Bạn sẽ gom các trade realtime thành nến OHLC (candlestick) phía client như thế nào? Hãy nói về interval, time zone và cây nến đang hình thành (partial candle).",
    },
    answer: `A candle summarises every trade in a time bucket: open is the first price, high and low are the extremes, close is the last price, plus volume. I'd structure it as history plus a live edge.

First, history comes from the server as closed candles. The backend has the complete trade record, so I don't rebuild a day of bars from ticks in the browser. Second, the live edge: for each incoming trade I compute the bucket start — the timestamp floored to the interval. If it matches the current candle, I update high, low, close and volume. If it's newer, I close the current candle and open a new one at that trade's price. Then I call the chart's incremental update for just the last bar, never setData on the whole series.

Third, time. I bucket on the exchange timestamp in UTC, never the client clock. Intraday intervals like one or five minutes align cleanly to the epoch, but daily and weekly bars depend on the market's session and time zone, so the server should own those boundaries. The user's time zone only affects axis labels.

The failure cases I plan for are late trades for a bucket that's already closed — I patch high, low and volume, and let the server's candles win on the next reconciliation — and quiet markets, where I decide explicitly whether to show gaps or flat bars.`,
    viExplanation: `Một cây nến (candle) tóm tắt mọi trade trong một khoảng thời gian: open là giá đầu tiên, high/low là giá cao nhất/thấp nhất, close là giá cuối cùng, kèm volume. Cách trả lời tốt là tách thành "history + live edge".

History: các nến đã đóng lấy từ server qua REST, vì backend có đầy đủ dữ liệu trade — không nên dựng lại cả ngày nến từ tick trên trình duyệt. Live edge: với mỗi trade mới, tính bucket start = floor(timestamp / interval) × interval. Nếu trùng nến hiện tại thì cập nhật high, low, close, volume; nếu mới hơn thì đóng nến cũ và mở nến mới với open = giá trade đó. Sau đó chỉ gọi update cho cây nến cuối, không setData toàn bộ series.

Về thời gian: luôn bucket theo timestamp của sàn/server (UTC), không dùng đồng hồ client vì có thể lệch. Nến 1m, 5m căn theo epoch là ổn, nhưng nến ngày/tuần phụ thuộc phiên giao dịch và time zone của thị trường, nên để server quyết định. Time zone của người dùng chỉ ảnh hưởng nhãn trục.

Các trường hợp lỗi cần nêu: trade đến trễ cho nến đã đóng, và thị trường im ắng — phải chọn rõ hiển thị khoảng trống (gap) hay nến phẳng.`,
    technicalExplanation: `### Anatomy of a candle
- Each bucket holds **OHLCV** and is identified by its **start time** (most chart libraries use the open time).
- Common intervals: 1s, 1m, 5m, 15m, 1h, 4h, 1D, 1W. Coarser bars can be derived exactly from finer ones: open of the first, close of the last, max of highs, min of lows, sum of volumes. Unlike averages, OHLC composes without loss.

### History plus live edge
- Load closed bars via REST, paginated by time ("500 bars before T"). Subscribe to trades, or better, to server-pushed updates of the **in-progress bar**.
- If the server streams the current bar, the client simply replaces the last bar — the simplest and most consistent option. Client-side aggregation from trades is the fallback, or for sub-minute intervals the backend doesn't provide.
- **Load race**: subscribe first and buffer trades, then fetch history, then replay only the buffered trades that the history doesn't already include: those at or after the end of the last closed bar (\`ts >= lastBar.t + intervalMs\`). If the history response also contains the in-progress bar, dedupe by trade ID or sequence number instead. Fetch-then-subscribe loses trades in between; naive replay double counts them.

### Time and time zones
- Bucket on **exchange or server timestamps** (UTC epoch ms). Client clocks can be off by seconds, and Date.now() makes two users disagree about the same trade.
- Epoch-aligned intraday intervals work for most markets, but **daily and weekly bars follow the trading session**: sessions that open at a local time, half-hour time-zone offsets, DST changes in markets that observe it. Let the server define session boundaries.
- Format axis labels with \`Intl.DateTimeFormat\` and an explicit \`timeZone\` — pick exchange time or user time consistently and show which one.

### The partial candle
- The last bar is mutable until its bucket closes. Some UIs style it as live or show a countdown to close.
- Rollover is triggered by the **next trade**, so in a quiet market the bar can look "stuck". A timer can roll over at the boundary, but only if the product wants flat bars (O = H = L = C = previous close, volume 0) rather than gaps.

### Failure scenarios
- **Late or out-of-order trades**: patch high, low and volume of the older bar; open and close may be wrong, so server bars stay the source of truth. Many chart APIs only allow updating the most recent bar, so a historical patch may require re-setting that range.
- **Reconnect**: refetch the last few bars and replace overlapping ones instead of appending duplicates.
- **Trade corrections or cancellations**: only the server can apply them; periodic reconciliation picks them up.

### Performance
- Per-trade work is O(1). Use the chart's incremental update for the last bar — calling setData with thousands of bars per tick reprocesses the entire series.
- Coalesce: if hundreds of trades land within one frame, fold all of them into the model but push one chart update per frame.`,
    practicalExample: {
      description: {
        en: "An incremental aggregator for the live edge: O(1) per trade, buckets on the exchange timestamp, and tells the caller whether to update or append the last bar — or to reconcile with the server for a late trade.",
        vi: "Bộ gom nến cho live edge: O(1) cho mỗi trade, bucket theo timestamp của sàn, và báo cho caller biết nên update hay append cây nến cuối — hoặc cần đối chiếu với server khi có trade đến trễ.",
      },
      code: {
        language: "ts",
        code: `export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };
export type Trade = { ts: number; px: number; qty: number }; // ts = exchange time, UTC epoch ms

export const bucketStart = (ts: number, intervalMs: number) => Math.floor(ts / intervalMs) * intervalMs;

export type Change = { kind: "update" | "append" | "late"; bar: Candle } | { kind: "resync" };

/** Folds one trade into the bar list (owned by a worker or store, not React state). */
export function applyTrade(bars: Candle[], tr: Trade, intervalMs: number): Change {
  const t = bucketStart(tr.ts, intervalMs);
  const last = bars[bars.length - 1];

  if (!last || t > last.t) {
    const bar: Candle = { t, o: tr.px, h: tr.px, l: tr.px, c: tr.px, v: tr.qty };
    bars.push(bar); // previous bar is now closed
    return { kind: "append", bar };
  }
  if (t === last.t) {
    last.h = Math.max(last.h, tr.px);
    last.l = Math.min(last.l, tr.px);
    last.c = tr.px; // assumes in-order delivery within the live bucket
    last.v += tr.qty;
    return { kind: "update", bar: last };
  }
  // Late trade: search backwards (late trades are usually recent).
  for (let i = bars.length - 2; i >= 0; i--) {
    const b = bars[i];
    if (b.t === t) {
      b.h = Math.max(b.h, tr.px);
      b.l = Math.min(b.l, tr.px);
      b.v += tr.qty; // open/close can't be trusted here; server candles win on reconcile
      return { kind: "late", bar: b };
    }
    if (b.t < t) break;
  }
  return { kind: "resync" }; // bucket missing locally: refetch that range from the server
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  H["REST history - closed candles"] --> CH["Chart series"]
  T["Trade with exchange timestamp"] --> B["Bucket = timestamp floored to interval"]
  B --> C{"Compare with last candle"}
  C -- "same bucket" --> U["Update high, low, close, volume"]
  C -- "newer bucket" --> N["Close bar and open new one at trade price"]
  C -- "older bucket" --> L["Late trade - patch high, low, volume"]
  U --> UP["Incremental update of last bar only"]
  N --> UP
  UP --> CH
  L --> RC["Reconcile with server candles"]
  RC --> CH`,
      caption: {
        en: "Server owns closed history; the client folds trades into the live last bar and reconciles late trades with the server.",
        vi: "Server sở hữu lịch sử nến đã đóng; client gom trade vào cây nến cuối đang chạy và đối chiếu trade đến trễ với server.",
      },
    },
    memoryShortcut: {
      en: '"Floor, Fold, Flush": floor the timestamp to the bucket, fold the trade into OHLCV, flush only the last bar to the chart.',
      vi: '"Floor, Fold, Flush": làm tròn timestamp xuống bucket, gộp trade vào OHLCV, chỉ đẩy cây nến cuối sang chart.',
    },
    keyTakeaway: {
      en: "The server owns history and session boundaries; the client folds trades into the live last bar using exchange UTC timestamps and updates only that bar.",
      vi: "Server sở hữu lịch sử và ranh giới phiên giao dịch; client chỉ gộp trade vào cây nến cuối theo timestamp UTC của sàn và chỉ cập nhật đúng cây nến đó.",
    },
    followUps: [
      {
        id: "isb-q32-f1",
        question: {
          en: "A user switches from 1-minute to 1-hour candles. What happens under the hood?",
          vi: "Người dùng chuyển từ nến 1 phút sang nến 1 giờ. Bên dưới chuyện gì xảy ra?",
        },
        answer: {
          en: "The interval is part of the query key, so the chart shows cached 1-hour history if it exists, otherwise a skeleton, while I fetch 1-hour bars from the server. I don't rebuild them from 1-minute bars unless I hold the full range, because a partial first hour would produce a wrong open and low. The live aggregator is recreated with the new interval and seeded with the server's current in-progress bar, then buffered trades with later timestamps are replayed. I also cancel the old request so a slow 1-minute response can't overwrite the 1-hour series.",
          vi: "Interval là một phần của query key, nên chart hiển thị lịch sử nến 1 giờ trong cache nếu có, nếu không thì hiện skeleton, trong lúc fetch nến 1 giờ từ server. Không tự dựng lại từ nến 1 phút trừ khi đang giữ đủ toàn bộ khoảng thời gian, vì giờ đầu tiên thiếu dữ liệu sẽ cho open và low sai. Bộ gom live được tạo lại với interval mới, khởi tạo bằng nến đang chạy từ server, rồi replay các trade đã buffer có timestamp mới hơn. Đồng thời huỷ request cũ để response 1 phút chậm không ghi đè lên series 1 giờ.",
        },
      },
      {
        id: "isb-q32-f2",
        question: {
          en: "Why not use the client's clock to decide when a candle closes?",
          vi: "Tại sao không dùng đồng hồ của client để quyết định khi nào một cây nến đóng?",
        },
        answer: {
          en: "Because client clocks drift and can be off by seconds or more, and users can be in any time zone or change it mid-session. If two users bucket the same trade differently, they see different charts — and both disagree with the server's history after a refresh. So I bucket on the exchange timestamp carried in each message. The client clock is acceptable only for cosmetic things like a countdown to the next bar, and even then I'd estimate the server offset from heartbeat timestamps rather than trust the local time.",
          vi: "Vì đồng hồ client có thể lệch vài giây hoặc hơn, và người dùng có thể ở bất kỳ time zone nào hoặc đổi giữa phiên. Nếu hai người dùng xếp cùng một trade vào hai bucket khác nhau, họ sẽ thấy hai chart khác nhau — và cả hai đều lệch với lịch sử của server sau khi refresh. Vì vậy luôn bucket theo timestamp của sàn có trong mỗi message. Đồng hồ client chỉ dùng cho việc hiển thị như đếm ngược đến cây nến kế tiếp, và kể cả khi đó cũng nên ước lượng độ lệch với server qua timestamp của heartbeat.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement: "Interactive, low-latency charts for complex, high-volume market data",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "No production charting of market data. Present as a recommended design; the general patterns (incremental updates, server as source of truth, reconciliation after reconnect) can be explained confidently without claiming trading work.",
        vi: "Chưa từng làm chart dữ liệu thị trường trên production. Trình bày như một thiết kế đề xuất; các pattern chung (cập nhật incremental, server là source of truth, đối chiếu sau reconnect) có thể giải thích tự tin mà không nhận là đã làm trading.",
      },
    },
    tags: ["candlestick", "ohlc", "time-series", "charting", "time-zones"],
  },

  /* ------------------------------------------------------------------ */
  /* Q33 — Order types and order lifecycle                               */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q33",
    number: 33,
    topicId: "finance-viz",
    question: {
      en: "Walk me through the main order types — market, limit, stop and stop-limit — and the order lifecycle. How should the UI reflect each state?",
      vi: "Hãy trình bày các loại lệnh chính — market, limit, stop và stop-limit — và vòng đời của một lệnh. UI nên thể hiện từng trạng thái như thế nào?",
    },
    answer: `Quick definitions first. A market order executes immediately at the best available prices — you get certainty of execution but not of price, so slippage is the risk. A limit order sets the worst price you'll accept; it may rest on the book and may never fill. A stop order is dormant until the market trades through a trigger price, then it becomes a market order — the classic stop-loss. A stop-limit becomes a limit order at the trigger, so it protects the price but might not fill in a fast market. Time-in-force — day, good-till-cancelled, immediate-or-cancel, fill-or-kill — controls how long an order lives.

For the lifecycle I'd model an explicit state machine: pending-new while we wait for acknowledgement, then working, partially filled, and the terminal states filled, cancelled, rejected or expired, plus pending-cancel and pending-replace for in-flight changes.

In the UI that means three rules. One, never show an order as working or filled optimistically — show "submitting" until the server acknowledges. Two, show filled quantity against total plus the average fill price, because partial fills are normal. Three, make transitions monotonic: events can arrive late or twice, so a stale "working" update must never overwrite a terminal "filled". I key everything by a client order ID so retries are idempotent, and I disable cancel once an order is terminal.`,
    viExplanation: `Market order khớp ngay ở giá tốt nhất hiện có — chắc chắn khớp nhưng không chắc giá, rủi ro là slippage. Limit order đặt mức giá tệ nhất chấp nhận được; lệnh có thể nằm chờ trên order book và có thể không bao giờ khớp. Stop order "ngủ" cho đến khi giá thị trường chạm trigger rồi mới trở thành market order — thường dùng làm stop-loss. Stop-limit thì khi chạm trigger sẽ thành limit order: bảo vệ được giá nhưng có thể không khớp khi thị trường biến động mạnh. Time-in-force (DAY, GTC, IOC, FOK) quyết định lệnh sống bao lâu.

Phần ghi điểm là vòng đời lệnh: mô hình hoá bằng state machine rõ ràng — pending-new (chờ xác nhận), working, partially filled, và các trạng thái kết thúc filled, cancelled, rejected, expired; thêm pending-cancel, pending-replace cho các thao tác đang xử lý.

Ba nguyên tắc cho UI: (1) không hiển thị optimistic là đã working hay filled — chỉ "submitting" cho đến khi server ack; (2) hiển thị số lượng đã khớp trên tổng và giá khớp trung bình vì partial fill là chuyện bình thường; (3) chuyển trạng thái phải monotonic — event đến trễ hoặc trùng không được ghi đè trạng thái kết thúc. Dùng client order ID để retry idempotent.`,
    technicalExplanation: `### Order types
- **Market**: executes now against the book and walks down the levels if the size exceeds top-of-book liquidity → slippage. UI guard: estimate cost from current depth and warn on thin books.
- **Limit**: buy at or below, sell at or above the limit price. A marketable limit (crossing the spread) fills immediately; otherwise it rests and adds liquidity.
- **Stop (stop-market)**: inactive until the trigger; then a market order. Buy stops sit above the market, sell stops below. Risk: a price gap through the trigger can fill far away.
- **Stop-limit**: trigger, then a limit order — price-protected but may never fill.
- **Time in force**: DAY, GTC (good-till-cancelled), IOC (fill what's available immediately, cancel the rest), FOK (fill completely immediately or cancel).
- Which types and TIFs exist depends on the venue and the platform — confirm with the team instead of assuming.

### Lifecycle model
- States resemble the FIX protocol's order status values: PendingNew, New, PartiallyFilled, Filled, PendingCancel, Canceled, PendingReplace, Replaced, Rejected, Expired. Stop orders held by a broker may have an extra "untriggered" state.
- **Terminal states** — Filled, Cancelled, Rejected, Expired — are final; nothing leaves them.
- **Cumulative quantities**: execution reports typically carry cumulative filled quantity and average price. Use those rather than summing per-fill deltas, which double-counts when events are replayed after a reconnect.

### UI implications
- **Submitting is not working**: insert a pending row keyed by \`clientOrderId\` and reconcile it with the server acknowledgement. Optimistic display is fine only if clearly marked as pending.
- **Cancel races**: a cancel can lose to a fill. PendingCancel → Filled is legitimate; never show "Cancelled" before the acknowledgement.
- **Rejections**: show the reason (insufficient margin, price outside band, market closed) next to the order ticket, not only as a disappearing toast.
- **Amend (cancel/replace)**: keep showing the old price and quantity until the replace is acknowledged.
- **Actions by state**: no cancel on terminal orders; block double submits with an idempotency key, not only a disabled button.

### Failure scenarios
- Duplicate or out-of-order events after reconnect → per-order sequence numbers plus monotonic rules.
- Lost acknowledgement (timeout) → never resubmit blindly; query status by \`clientOrderId\`.
- Client-side expiry based on the local clock → avoid; expiry comes from the server.

### Maintainability
Encode statuses as a union with exhaustive \`Record<Status, …>\` maps for labels, colors and allowed actions. Adding a new state then fails the type-check everywhere it matters, and the reducer is a pure function that is trivial to unit-test with recorded event sequences.`,
    practicalExample: {
      description: {
        en: "Order specs as a discriminated union (each type requires exactly its prices) and a pure reducer that ignores duplicate or stale events and never leaves a terminal state.",
        vi: "Định nghĩa lệnh bằng discriminated union (mỗi loại lệnh bắt buộc đúng các giá cần có) và một reducer thuần bỏ qua event trùng/cũ, không bao giờ rời khỏi trạng thái kết thúc.",
      },
      code: {
        language: "ts",
        code: `export type OrderSpec =
  | { type: "market" }
  | { type: "limit"; limitPx: number }
  | { type: "stop"; stopPx: number }
  | { type: "stop_limit"; stopPx: number; limitPx: number };

export type Status =
  | "pending_new" | "working" | "partially_filled" | "pending_cancel"
  | "filled" | "cancelled" | "rejected" | "expired";

const TERMINAL: ReadonlySet<Status> = new Set(["filled", "cancelled", "rejected", "expired"]);

export interface Order {
  clientOrderId: string; // created by the UI once per order, reused on retries
  spec: OrderSpec;
  side: "buy" | "sell";
  qty: number;
  status: Status;
  filledQty: number; // cumulative, from the server
  avgPx?: number;
  seq: number; // last applied per-order sequence
}

export type ExecReport = { seq: number; status: Status; filledQty: number; avgPx?: number; reason?: string };

export function applyReport(order: Order, ev: ExecReport): Order {
  if (ev.seq <= order.seq) return order; // duplicate or stale
  if (TERMINAL.has(order.status)) return order; // terminal is final
  return {
    ...order,
    status: ev.status,
    filledQty: Math.max(order.filledQty, ev.filledQty), // quantities only go up
    avgPx: ev.avgPx ?? order.avgPx,
    seq: ev.seq,
  };
}

export const canCancel = (o: Order) => !TERMINAL.has(o.status) && o.status !== "pending_cancel";`,
      },
    },
    diagram: {
      kind: "state",
      code: `stateDiagram-v2
  [*] --> PendingNew: submit
  PendingNew --> Rejected: venue or risk rejects
  PendingNew --> Working: acknowledged
  Working --> PartiallyFilled: partial fill
  PartiallyFilled --> PartiallyFilled: more fills
  Working --> Filled: full fill
  PartiallyFilled --> Filled: remaining qty filled
  Working --> PendingCancel: user cancels
  PartiallyFilled --> PendingCancel: user cancels
  PendingCancel --> Cancelled: cancel acknowledged
  PendingCancel --> Filled: fill wins the race
  Working --> Expired: time in force ends
  Filled --> [*]
  Cancelled --> [*]
  Rejected --> [*]
  Expired --> [*]`,
      caption: {
        en: "Order lifecycle as a state machine: the UI moves only on server events, and terminal states are final.",
        vi: "Vòng đời lệnh dưới dạng state machine: UI chỉ chuyển trạng thái khi có event từ server, và trạng thái kết thúc là cuối cùng.",
      },
    },
    memoryShortcut: {
      en: 'Market = now, Limit = price, Stop = trigger, Stop-limit = trigger + price. Lifecycle rule: "Ack before badge, terminal is final, quantities only go up."',
      vi: 'Market = ngay, Limit = giá, Stop = trigger, Stop-limit = trigger + giá. Quy tắc vòng đời: "Có ack mới đổi badge, kết thúc là kết thúc, số lượng chỉ tăng."',
    },
    keyTakeaway: {
      en: "Model orders as an explicit, monotonic state machine driven by server acknowledgements, so the UI never claims a fill, cancel or state it hasn't been told about.",
      vi: "Mô hình hoá lệnh bằng state machine rõ ràng, monotonic, chạy theo xác nhận từ server, để UI không bao giờ hiển thị một lần khớp, huỷ hay trạng thái mà server chưa báo.",
    },
    followUps: [
      {
        id: "isb-q33-f1",
        question: {
          en: "The user clicks Cancel and, a moment later, the order shows Filled. Is that a bug?",
          vi: "Người dùng bấm Cancel và ngay sau đó lệnh hiển thị Filled. Đó có phải bug không?",
        },
        answer: {
          en: 'Not necessarily — it\'s the classic cancel/fill race. The cancel request travels to the venue while the order may already be matching. If the fill wins, the cancel is rejected as too late and the order ends Filled. The UI should show PendingCancel while the request is in flight, then accept whichever terminal state the server reports, and explain it clearly: "Cancel rejected — order already filled." The real bug would be showing Cancelled optimistically, because the user would then believe they have no position when they actually do.',
          vi: 'Chưa chắc — đây là race kinh điển giữa cancel và fill. Request huỷ đang trên đường tới sàn trong khi lệnh có thể đã đang khớp. Nếu fill thắng, lệnh huỷ bị từ chối vì quá muộn và lệnh kết thúc ở trạng thái Filled. UI nên hiển thị PendingCancel trong lúc request đang xử lý, sau đó chấp nhận trạng thái kết thúc mà server báo, và giải thích rõ: "Huỷ bị từ chối — lệnh đã khớp." Bug thật sự là hiển thị Cancelled một cách optimistic, vì người dùng sẽ tưởng mình không có vị thế trong khi thực tế là có.',
        },
      },
      {
        id: "isb-q33-f2",
        question: {
          en: "How do you prevent duplicate orders when the network is flaky?",
          vi: "Làm sao để tránh đặt lệnh trùng khi mạng chập chờn?",
        },
        answer: {
          en: "Every submission carries a client-generated order ID created once per order, not per retry. If the request times out I don't send a new order — I retry with the same ID or query the order status by that ID, and the backend deduplicates on it. In the UI I disable the submit button while pending, but that's only UX; idempotency on the server is the real guarantee. I also show the pending order in the blotter immediately, so the user doesn't click again because nothing seemed to happen.",
          vi: "Mỗi lần gửi lệnh đều kèm một order ID do client tạo, tạo một lần cho mỗi lệnh chứ không phải mỗi lần retry. Nếu request bị timeout thì không gửi lệnh mới — chỉ retry với cùng ID hoặc truy vấn trạng thái lệnh theo ID đó, và backend dedupe dựa trên ID này. Trên UI có disable nút submit khi đang chờ, nhưng đó chỉ là UX; idempotency ở server mới là đảm bảo thật sự. Ngoài ra hiển thị ngay lệnh đang chờ trong blotter để người dùng không bấm lại vì tưởng chưa có gì xảy ra.",
        },
      },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "Trading analytics and execution workflows; trading workflows and fintech UI/UX (preferred)",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "No production trading or order-management experience. Present order types as domain knowledge you have studied, and the state-machine and idempotency approach as recommended engineering practice.",
        vi: "Chưa có kinh nghiệm production về trading hay quản lý lệnh. Trình bày các loại lệnh như kiến thức domain đã tìm hiểu, còn cách tiếp cận state machine và idempotency là thực hành kỹ thuật được khuyến nghị.",
      },
    },
    tags: ["order-types", "order-lifecycle", "state-machine", "trading", "idempotency"],
  },

  /* ------------------------------------------------------------------ */
  /* Q34 — Choosing a charting library                                   */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q34",
    number: 34,
    topicId: "finance-viz",
    question: {
      en: "How would you choose a charting library for real-time financial data — TradingView Lightweight Charts, ECharts, D3/visx, Highcharts or Recharts?",
      vi: "Bạn chọn thư viện chart cho dữ liệu tài chính realtime như thế nào — TradingView Lightweight Charts, ECharts, D3/visx, Highcharts hay Recharts?",
    },
    answer: `I'd decide on four criteria: renderer, update model, feature fit, and licence.

Renderer first. For thousands of points updating several times a second, I want canvas. Lightweight Charts and Chart.js draw to canvas, ECharts lets you pick canvas or SVG, and Highcharts is SVG by default with a WebGL boost module for large series. Recharts and visx are SVG — great for a dozen dashboard charts, but cost grows with the number of DOM nodes.

Second, the update model. For streaming I need an incremental API — append a point or update the last bar — rather than re-rendering the chart from React props on every tick. Lightweight Charts has series.update; Recharts re-renders from props, which fights high-frequency data.

Third, feature fit. For price charts — candles, crosshair, time scale, panning — Lightweight Charts is purpose-built and small. For analytics dashboards with heatmaps, scatter plots and many chart types, ECharts or Highcharts. For a bespoke visual like a depth chart, D3 or visx gives full control, but I build interactions myself.

Fourth, licensing: Highcharts needs a commercial licence for commercial use, and Lightweight Charts asks for TradingView attribution, so I'd check that with the team early.

In practice I'd wrap whichever we pick behind our own chart component so it can be swapped, and run a quick spike with realistic data rates before committing.`,
    viExplanation: `Câu này kiểm tra khả năng ra quyết định có tiêu chí, không phải thuộc lòng tên thư viện. Hãy trả lời theo bốn tiêu chí: renderer, update model, feature fit và licence.

Renderer: với hàng nghìn điểm cập nhật nhiều lần mỗi giây thì nên dùng canvas. Lightweight Charts và Chart.js vẽ bằng canvas, ECharts cho chọn canvas hoặc SVG, Highcharts mặc định là SVG nhưng có boost module dùng WebGL cho series lớn. Recharts và visx dùng SVG — rất tốt cho khoảng một chục chart dashboard, nhưng chi phí tăng theo số DOM node.

Update model: dữ liệu streaming cần API incremental (thêm điểm, cập nhật cây nến cuối) thay vì re-render cả chart từ props mỗi tick. Lightweight Charts có series.update; Recharts thì re-render theo props nên không hợp với dữ liệu tần suất cao.

Feature fit: chart giá (nến, crosshair, time scale) → Lightweight Charts; dashboard phân tích nhiều loại chart → ECharts hoặc Highcharts; visual tuỳ biến như depth chart → D3 hoặc visx.

Licence: Highcharts cần licence thương mại; Lightweight Charts yêu cầu ghi attribution cho TradingView. Cuối cùng, luôn bọc thư viện sau một component chart nội bộ và làm spike với dữ liệu thực tế trước khi chốt.`,
    technicalExplanation: `### Evaluation criteria
- **Renderer**
  - SVG: one DOM node per mark — easy styling, hit-testing, accessibility and crisp export, but every update pays for style, layout and paint across many nodes.
  - Canvas: a single bitmap — cost scales with pixels and draw calls, not DOM nodes; you own hit-testing and accessibility.
  - WebGL: GPU rendering for very large point counts; highest complexity and the hardest to debug.
- **Update API**: imperative incremental updates (\`series.update\`, append) versus declarative re-render from props. Streams favour the former; occasional data favours the latter for simplicity.
- **Domain features**: time scale with gaps for non-trading periods, crosshair, price scale with tick formatting, multiple panes (volume, indicators), drawing tools.
- **Bundle size** and tree-shaking (ECharts supports modular imports).
- **Licensing**: Highcharts is commercial; Lightweight Charts is Apache-2.0 with an attribution requirement; ECharts is Apache-2.0; D3 is ISC; visx, Recharts and Chart.js are MIT. Always confirm current terms.
- **Accessibility**: canvas needs an alternative (summary text, data table); Highcharts ships an accessibility module.

### Library notes
- **Lightweight Charts**: canvas, built for financial time series, small footprint, limited chart types — not a general dashboard library. TradingView's full charting product is separate, with different licensing.
- **ECharts**: broad catalogue, canvas or SVG renderer, built-in zoom, progressive rendering for large series.
- **Highcharts / Highcharts Stock**: very rich (navigator, indicators, accessibility), SVG with a WebGL boost module.
- **D3 / visx**: primitives — scales, axes, shapes. visx wraps them as React components. Ideal for custom visuals; you implement zoom, tooltips and performance yourself. D3 scales also pair well with your own canvas drawing.
- **Recharts / Chart.js**: quick and friendly for low-frequency KPI charts.

### React integration pattern
- Create the chart once in an effect, keep the instance in a ref, push ticks imperatively, and call \`remove()\` / \`dispose()\` on unmount — otherwise canvases, observers and listeners leak.
- Throttle chart updates to the frame rate; the data model can update more often.
- Hide the library behind an internal interface (\`setHistory\`, \`pushBar\`, \`setTheme\`) so a future swap doesn't touch feature code.

### Failure scenarios
- Choosing SVG for a stream and discovering frame drops late in the project.
- Discovering a licence obligation at release time.
- Charts not disposed on route or tab changes → memory growth over a trading session.
- Passing a freshly created history array on every render → \`setData\` on every render → flicker and wasted work.`,
    practicalExample: {
      description: {
        en: "A thin React wrapper around Lightweight Charts (v5 API): the chart is created once, history is set only when it changes, and live bars go straight to series.update without touching React state.",
        vi: "Một wrapper React mỏng cho Lightweight Charts (API v5): chart chỉ tạo một lần, history chỉ set khi thay đổi, còn bar realtime đi thẳng vào series.update mà không đụng tới React state.",
      },
      code: {
        language: "tsx",
        code: `import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";

export type Bar = { time: number; open: number; high: number; low: number; close: number }; // UTC seconds

type Props = {
  history: Bar[]; // stable reference; changes only on load or interval switch
  subscribe: (onBar: (bar: Bar) => void) => () => void; // returns unsubscribe
};

const toLw = (b: Bar) => ({ ...b, time: b.time as UTCTimestamp });

export function PriceChart({ history, subscribe }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, { autoSize: true });
    seriesRef.current = chart.addSeries(CandlestickSeries);
    return () => {
      chart.remove(); // frees canvas, observers and listeners
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    seriesRef.current?.setData(history.map(toLw));
  }, [history]);

  // Live bars bypass React state: no re-render per tick.
  useEffect(() => subscribe((bar) => seriesRef.current?.update(toLw(bar))), [subscribe]);

  return <div ref={containerRef} style={{ height: 400 }} role="img" aria-label="Price chart" />;
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  S["Charting need"] --> Q1{"Price chart with candles, crosshair, time scale?"}
  Q1 -- yes --> LW["Lightweight Charts - canvas, incremental update"]
  Q1 -- no --> Q2{"Many chart types for analytics?"}
  Q2 -- yes --> Q3{"Commercial licence acceptable?"}
  Q3 -- yes --> HC["Highcharts - rich features, WebGL boost"]
  Q3 -- no --> EC["ECharts - canvas or SVG renderer"]
  Q2 -- no --> Q4{"Bespoke visual such as a depth chart?"}
  Q4 -- yes --> DV["D3 or visx - full control, build interactions"]
  Q4 -- no --> RC["Recharts - simple low-frequency SVG charts"]
  LW --> W["Wrap behind our own Chart component"]
  HC --> W
  EC --> W
  DV --> W
  RC --> W`,
      caption: {
        en: "A decision path: start from the use case, check renderer and licence, and always wrap the library behind an internal interface.",
        vi: "Lộ trình ra quyết định: bắt đầu từ use case, kiểm tra renderer và licence, và luôn bọc thư viện sau một interface nội bộ.",
      },
    },
    memoryShortcut: {
      en: '"R-U-F-L, then wrap": Renderer, Update API, Feature fit, Licence — then hide it behind your own component.',
      vi: '"R-U-F-L rồi bọc lại": Renderer, Update API, Feature fit, Licence — sau đó giấu thư viện sau component của mình.',
    },
    keyTakeaway: {
      en: "Pick by renderer and incremental update API first, domain features second, licence always — and hide the choice behind your own chart interface.",
      vi: "Chọn theo renderer và API cập nhật incremental trước, tính năng domain sau, luôn kiểm tra licence — và giấu lựa chọn đó sau interface chart của riêng mình.",
    },
    followUps: [
      {
        id: "isb-q34-f1",
        question: {
          en: "How do you keep a canvas-based chart accessible?",
          vi: "Làm sao để chart vẽ bằng canvas vẫn đảm bảo accessibility?",
        },
        answer: {
          en: "To assistive technology a canvas is a single image, so I give the container role img with a meaningful label and provide an equivalent: a text summary — last price, change and range for the visible period — plus a \"view as table\" toggle that renders the visible bars in a real, virtualized table. Keyboard users need the crosshair too, so arrow keys step through bars and announce OHLC through a polite live region, throttled so it doesn't flood screen readers. Up and down candles shouldn't rely on color alone — hollow versus filled bodies help.",
          vi: 'Với công nghệ hỗ trợ, canvas chỉ là một hình ảnh, nên container cần role img và nhãn có ý nghĩa, kèm một phiên bản tương đương: đoạn text tóm tắt — giá cuối, mức thay đổi, biên độ của khoảng đang xem — và nút "xem dạng bảng" render các bar đang hiển thị trong một bảng thật có virtualization. Người dùng bàn phím cũng cần crosshair: phím mũi tên di chuyển qua từng bar và đọc OHLC qua live region kiểu polite, có throttle để không làm ngập screen reader. Nến tăng/giảm không nên chỉ phân biệt bằng màu — thân nến rỗng/đặc sẽ giúp ích.',
        },
      },
      {
        id: "isb-q34-f2",
        question: {
          en: "Charts flicker or memory keeps growing when users switch tabs in the dashboard. What would you check?",
          vi: "Chart bị nháy hoặc bộ nhớ liên tục tăng khi người dùng chuyển tab trong dashboard. Bạn sẽ kiểm tra gì?",
        },
        answer: {
          en: "First, whether each tab switch creates a new chart instance without calling remove or dispose — every instance holds a canvas, resize observers and event listeners. Second, whether the stream subscription is cleaned up, because a closure can keep pushing data into a detached series. Third, whether we call setData on every render because a new history array is created each time, which causes the flicker. I'd confirm with heap snapshots after switching tabs several times, looking for detached canvas elements and growing listener counts.",
          vi: "Thứ nhất, mỗi lần chuyển tab có tạo chart instance mới mà không gọi remove hoặc dispose không — mỗi instance giữ một canvas, resize observer và event listener. Thứ hai, subscription của stream có được huỷ không, vì một closure có thể vẫn đẩy dữ liệu vào series đã bị tách khỏi DOM. Thứ ba, có gọi setData ở mỗi lần render vì mảng history được tạo mới mỗi lần hay không — đó là nguyên nhân gây nháy. Xác nhận bằng heap snapshot sau vài lần chuyển tab, tìm các phần tử canvas bị detached và số listener tăng dần.",
        },
      },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "Canvas/SVG charting libraries (D3.js, Highcharts, Chart.js, Lightweight Charts, visx) — preferred",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "No specific charting library is listed in the profile as production experience. Frame the answer as evaluation criteria plus a spike plan; the React integration pattern (refs, effect cleanup, imperative updates) comes from general React experience.",
        vi: "Hồ sơ không ghi thư viện chart cụ thể nào đã dùng trên production. Hãy trình bày theo tiêu chí đánh giá kèm kế hoạch làm spike; pattern tích hợp với React (ref, cleanup trong effect, cập nhật imperative) là từ kinh nghiệm React nói chung.",
      },
    },
    tags: ["charting", "canvas", "svg", "lightweight-charts", "library-selection"],
  },

  /* ------------------------------------------------------------------ */
  /* Q35 — Displaying prices, P&L and positions                          */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q35",
    number: 35,
    topicId: "finance-viz",
    question: {
      en: "How do you display prices, P&L and positions correctly — rounding, tick size, locale formatting, and color and accessibility conventions?",
      vi: "Bạn hiển thị giá, P&L và vị thế (position) như thế nào cho đúng — làm tròn, tick size, định dạng theo locale, và quy ước màu sắc cùng accessibility?",
    },
    answer: `I treat formatting as a domain layer, not something each component does with toFixed. I'd cover it in three parts.

First, precision. Prices arrive from the server as integers in ticks or minor units, or as decimal strings, and the instrument metadata gives me the tick size. Display decimals derive from the tick size — a tick of 0.25 means two decimals, a tick of 0.0001 means four — so every row in a column lines up. Order entry snaps or validates prices to a multiple of the tick, because the venue will reject anything else.

Second, formatting. I use cached Intl.NumberFormat instances per locale and options; constructing one per cell is expensive in a big grid. P&L always shows an explicit sign, and I use tabular numerals so digits don't jitter as values change.

Third, meaning beyond color. Green-up, red-down isn't universal — in mainland China, for example, red means up — so I store direction as data and map it to theme tokens that can be configured per user or tenant. Color is never the only signal: the sign, an arrow and a text label carry the meaning, contrast meets WCAG, and price flashes respect reduced motion.

The accessibility part — WCAG, keyboard navigation and ARIA — is work I've done in production at Persefoni; the financial formatting rules are what I'd layer on top.`,
    viExplanation: `Ý chính: định dạng số là một tầng domain, không phải mỗi component tự gọi toFixed. Trả lời theo ba phần.

Precision: giá từ server nên ở dạng số nguyên theo tick/minor unit hoặc chuỗi decimal; metadata của instrument cho biết tick size. Số chữ số thập phân hiển thị suy ra từ tick size (tick 0.25 → 2 chữ số, tick 0.0001 → 4 chữ số) để cả cột thẳng hàng. Khi nhập lệnh phải snap hoặc validate giá theo bội số của tick, vì sàn sẽ từ chối giá không hợp lệ.

Formatting: dùng Intl.NumberFormat được cache theo locale và options — tạo mới cho từng ô trong grid lớn rất tốn. P&L luôn có dấu +/− rõ ràng, dùng tabular numerals để chữ số không "nhảy" khi giá thay đổi.

Ý nghĩa không chỉ bằng màu: quy ước xanh tăng, đỏ giảm không phổ quát — ví dụ ở Trung Quốc đại lục, đỏ là tăng — nên lưu hướng (up/down/flat) như dữ liệu và ánh xạ sang theme token có thể cấu hình. Màu không bao giờ là tín hiệu duy nhất: luôn có dấu, mũi tên, nhãn text; độ tương phản đạt WCAG; hiệu ứng flash tôn trọng reduced motion.

Phần accessibility (WCAG, keyboard, ARIA) có thể nói là kinh nghiệm thật ở Persefoni; phần quy tắc định dạng tài chính là cách tiếp cận đề xuất.`,
    technicalExplanation: `### Precision before presentation
- Never format a value that has already drifted. Keep prices as integer ticks or minor units, or decimal strings, and convert only at the display boundary (representation itself is covered in Q21).
- **Tick size** drives decimals and validation. Some markets use price-dependent tick tables (the tick changes with the price band), so decimals come from instrument metadata, not a hard-coded constant.
- **Rounding depends on context**:
  - Display: one consistent rule across the app.
  - Order entry: snap buy limits down and sell limits up, or reject with a clear message.
  - P&L: round only the final figure, never intermediate results.
- Newer \`Intl.NumberFormat\` implementations add a \`roundingMode\` option; check browser support before relying on it.

### Locale formatting
- \`Intl.NumberFormat\` handles decimal and grouping separators ("1,234.5" in en-US versus "1.234,5" in de-DE), currency symbol placement, and currencies without minor units such as JPY.
- **Cache formatters**: constructing Intl objects costs far more than calling \`format\`. A grid with thousands of cells updating every frame must reuse instances.
- Compact notation ("1.2M") for summary tiles; full precision in grids and tooltips.
- \`font-variant-numeric: tabular-nums\` and right-aligned numeric columns keep digits aligned and stop horizontal jitter during updates.

### P&L and positions
- Unrealized P&L for a long position = (mark price − average entry) × quantity × contract multiplier; the sign flips for shorts. Realized P&L comes from closed fills.
- Label the mark source (last, mid or a published mark price) — users compare numbers across screens and will notice differences.
- Authoritative P&L comes from the server; a client-side live estimate between server updates must be labelled as such.

### Color and accessibility
- Store direction as data (\`up\` / \`down\` / \`flat\`) and map it to theme tokens; conventions vary by market and by user.
- **WCAG 1.4.1 Use of Color**: add a sign, an arrow or text. **WCAG 1.4.3 Contrast**: at least 4.5:1 for normal text — saturated red and green on dark backgrounds often fail and are hard to distinguish for color-blind users.
- **Flashes**: keep them short, throttle them on fast-updating cells (WCAG 2.3.1 limits flashing to three times per second) and honour \`prefers-reduced-motion\`.
- Don't put rapidly changing prices in \`aria-live\`; announce user-relevant events (order filled, alert triggered) instead.

### Failure scenarios
- \`toFixed\` on a drifted float, or inconsistent decimals within one column.
- Negative zero rendered as "-0.00" after rounding — use \`signDisplay: "exceptZero"\` (or \`"negative"\` where supported) or normalise first.
- Hard-coded green/red that means the opposite for some users.
- A new formatter per cell causing long tasks in a large, live grid.`,
    practicalExample: {
      description: {
        en: "A small formatting module: decimals derived from tick size, cached Intl formatters, and P&L returned as text plus a direction so the component maps it to a configurable theme token and an accessible label.",
        vi: "Một module định dạng nhỏ: số chữ số thập phân suy ra từ tick size, Intl formatter được cache, và P&L trả về text kèm hướng (direction) để component ánh xạ sang theme token có thể cấu hình và nhãn accessible.",
      },
      code: {
        language: "ts",
        code: `export type Instrument = { tickSize: string; currency: string }; // tickSize as a decimal string, e.g. "0.25"
export type Direction = "up" | "down" | "flat";

const cache = new Map<string, Intl.NumberFormat>();
function nf(locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) cache.set(key, (f = new Intl.NumberFormat(locale, opts))); // build once, reuse everywhere
  return f;
}

export const decimalsOf = (tick: string) => (tick.split(".")[1] ?? "").replace(/0+$/, "").length;

/** priceTicks is an integer from the server; the rounding to tick decimals absorbs float noise. */
export function formatPrice(priceTicks: number, inst: Instrument, locale: string): string {
  const d = decimalsOf(inst.tickSize);
  return nf(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(priceTicks * Number(inst.tickSize));
}

export function formatPnl(value: number, currency: string, locale: string) {
  const dir: Direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const text = nf(locale, { style: "currency", currency, signDisplay: "exceptZero" }).format(value);
  const word = dir === "up" ? "Profit" : dir === "down" ? "Loss" : "Unchanged";
  // The component maps dir to a theme token (configurable up/down colors) and an arrow icon.
  return { text, dir, ariaLabel: word + " " + text };
}

// formatPrice(4025, { tickSize: "0.25", currency: "USD" }, "en-US") -> "1,006.25"
// formatPnl(-12.5, "USD", "en-US").text -> "-$12.50"`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  S["Server value - integer ticks or decimal string"] --> D["Derive decimals from tick size"]
  M["Instrument metadata - tick size, currency"] --> D
  D --> F["Cached Intl.NumberFormat per locale"]
  F --> SG["Explicit sign and tabular numerals"]
  SG --> C{"Direction up, down or flat"}
  C --> T["Theme token - configurable colors"]
  C --> A["Arrow, text and aria label"]
  T --> R["Rendered cell"]
  A --> R`,
      caption: {
        en: "Exact value in, formatted text out: decimals from tick size, cached formatters, and direction expressed by both color token and non-color cues.",
        vi: "Giá trị chính xác đi vào, text đã định dạng đi ra: số chữ số từ tick size, formatter được cache, và hướng tăng/giảm thể hiện bằng cả theme token lẫn tín hiệu không phải màu.",
      },
    },
    memoryShortcut: {
      en: '"T-I-N": Tick size sets decimals, Intl formats (cached), Not color alone.',
      vi: '"T-I-N": Tick size quyết định số thập phân, Intl để định dạng (có cache), Not color alone — không chỉ dựa vào màu.',
    },
    keyTakeaway: {
      en: "Keep exact values until the display boundary, derive decimals from tick size, format with cached Intl formatters, and never rely on color alone to say up or down.",
      vi: "Giữ giá trị chính xác đến tận lúc hiển thị, suy ra số thập phân từ tick size, định dạng bằng Intl formatter được cache, và không bao giờ chỉ dùng màu để thể hiện tăng hay giảm.",
    },
    followUps: [
      {
        id: "isb-q35-f1",
        question: {
          en: "Your grid has thousands of numeric cells updating several times a second. How do you keep formatting cheap?",
          vi: "Grid của bạn có hàng nghìn ô số cập nhật vài lần mỗi giây. Làm sao để việc định dạng không tốn kém?",
        },
        answer: {
          en: "Formatting is fast if I reuse formatter instances, so step one is a cache keyed by locale and options — never a new Intl.NumberFormat inside render. Step two, I only format what's visible: the grid is virtualized, so it's a few hundred cells, not thousands. Step three, I skip work when the raw value hasn't changed, by memoizing cells on the integer value. If profiling still shows formatting as hot, I'd precompute a formatter per instrument when metadata loads and format inside the worker, sending display strings to the main thread.",
          vi: "Định dạng sẽ nhanh nếu tái sử dụng formatter, nên bước một là cache theo locale và options — không bao giờ tạo Intl.NumberFormat mới trong render. Bước hai, chỉ định dạng những gì đang hiển thị: grid có virtualization nên chỉ vài trăm ô chứ không phải hàng nghìn. Bước ba, bỏ qua khi giá trị gốc không đổi bằng cách memo ô theo giá trị số nguyên. Nếu profiling vẫn cho thấy formatting tốn thời gian, có thể tạo sẵn formatter cho từng instrument khi metadata tải xong và định dạng ngay trong worker, gửi chuỗi đã định dạng sang main thread.",
        },
      },
      {
        id: "isb-q35-f2",
        question: {
          en: "How would you handle the up/down color convention for users in different markets?",
          vi: "Bạn xử lý quy ước màu tăng/giảm cho người dùng ở các thị trường khác nhau như thế nào?",
        },
        answer: {
          en: "I store direction as data — up, down or flat — and map it to theme tokens, never to literal colors inside components. The mapping is a user or tenant preference with a default for the client's market, which I'd confirm with the product team rather than assume. Because color is never the only cue — sign, arrow and label are always present — a user with an unfamiliar mapping or a color-vision deficiency still reads the value correctly. Tests can then assert on the token, not on a hex value.",
          vi: "Lưu hướng (up, down, flat) như dữ liệu và ánh xạ sang theme token, không bao giờ gán màu cứng trong component. Cách ánh xạ là tuỳ chọn theo người dùng hoặc tenant, với mặc định theo thị trường của khách hàng — điều này cần xác nhận với team product chứ không tự giả định. Vì màu không bao giờ là tín hiệu duy nhất — luôn có dấu, mũi tên và nhãn — nên người dùng quen quy ước khác hoặc bị khiếm khuyết sắc giác vẫn đọc đúng giá trị. Test cũng có thể kiểm tra token thay vì mã màu hex.",
        },
      },
    ],
    difficulty: "medium",
    priority: "medium",
    jdRequirement:
      "Accessible UX that simplifies financial workflows; fintech UI/UX patterns and financial metrics (preferred)",
    candidateExperience: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "Actual: WCAG accessibility, keyboard navigation and ARIA work at Persefoni. Not actual: price, tick-size and P&L formatting for trading — present that part as a recommended approach.",
        vi: "Kinh nghiệm thật: accessibility theo WCAG, điều hướng bàn phím và ARIA ở Persefoni. Không phải kinh nghiệm thật: định dạng giá, tick size và P&L cho trading — phần này trình bày như cách tiếp cận đề xuất.",
      },
    },
    tags: ["formatting", "intl", "accessibility", "pnl", "tick-size"],
  },

  /* ------------------------------------------------------------------ */
  /* Q36 — Time-series data at scale in the browser                      */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q36",
    number: 36,
    topicId: "finance-viz",
    question: {
      en: "How do you handle time-series data at scale in the browser — ring buffers, downsampling such as LTTB, and memory caps — for a trading screen that runs all day?",
      vi: "Bạn xử lý dữ liệu time-series quy mô lớn trên trình duyệt như thế nào — ring buffer, downsampling như LTTB, và giới hạn bộ nhớ — cho một màn hình trading chạy suốt cả ngày?",
    },
    answer: `My starting principle is that a long-running screen must have bounded memory by design, not by luck. So I'd answer in three parts: store, shrink, and shed.

Store: live points go into a fixed-capacity ring buffer, ideally backed by typed arrays — one Float64Array for timestamps and one for values. Pushing is O(1), there are no per-point objects for the garbage collector to chase, and the footprint is known up front: a million points across two Float64Arrays is sixteen megabytes, full stop.

Shrink: the chart is maybe two thousand pixels wide, so drawing two hundred thousand points is wasted work. I downsample the visible range to roughly one or two points per pixel. LTTB — largest triangle three buckets — keeps the visual shape of a line very well. For prices, though, I prefer min-max per pixel column, or re-aggregating into coarser candles, because those guarantee the true highs and lows stay visible, and traders care about extremes.

Shed: when the buffer is full, the oldest points are simply overwritten. If the user scrolls back further than the buffer holds, I fetch that range from the server, already aggregated, instead of keeping everything since the market opened.

The failure I'm designing against is the classic one: an array that grows by push for eight hours until the tab slows down and eventually crashes.`,
    viExplanation: `Nguyên tắc cốt lõi: màn hình chạy lâu phải có bộ nhớ bị giới hạn ngay từ thiết kế, không phải nhờ may mắn. Trả lời theo ba bước: store, shrink, shed.

Store: điểm dữ liệu realtime được ghi vào ring buffer có dung lượng cố định, tốt nhất dùng typed array — một Float64Array cho timestamp, một cho giá trị. Thao tác push là O(1), không tạo object cho từng điểm nên garbage collector nhẹ hơn, và biết trước dung lượng: một triệu điểm với hai Float64Array là 16 MB.

Shrink: chart chỉ rộng khoảng vài nghìn pixel, vẽ hàng trăm nghìn điểm là lãng phí. Downsample khoảng hiển thị về 1–2 điểm mỗi pixel. LTTB giữ hình dạng đường rất tốt, nhưng với giá thì nên dùng min-max theo từng cột pixel hoặc gom lại thành nến khung lớn hơn, vì cách đó đảm bảo đỉnh và đáy thật luôn hiển thị — trader rất quan tâm các giá trị cực trị.

Shed: khi buffer đầy, điểm cũ nhất bị ghi đè. Nếu người dùng cuộn về quá khứ xa hơn buffer, fetch khoảng đó từ server ở dạng đã aggregate.

Lỗi kinh điển cần tránh: một mảng cứ push suốt tám tiếng cho đến khi tab chậm dần rồi crash.`,
    technicalExplanation: `### Why bounded structures
- A tab running a full trading session accumulates data continuously. Unbounded arrays mean a steadily rising heap, longer garbage-collection pauses, and eventually a slow or killed tab.
- Budget explicitly: series × capacity × bytes per point. Typed arrays make this exact (8 bytes per Float64 value). Arrays of objects carry per-object headers and pointers — typically several times larger — and create GC pressure.

### Ring buffer mechanics
- Fixed capacity, a head index and a size. \`push\` writes at head and advances modulo capacity: O(1), zero allocation.
- Logical index i maps to physical index \`(head − size + i) mod capacity\`; copying a window out needs at most two contiguous \`subarray\` calls.
- The underlying \`ArrayBuffer\` is **transferable**, so a worker can own the buffer and post only downsampled output to the main thread. \`SharedArrayBuffer\` is also possible but requires cross-origin isolation (COOP/COEP headers).
- Size by time ("last 30 minutes at the expected rate") or by count, and revisit when feed rates change.

### Downsampling
- Target roughly the pixel width of the plot (1–2 points per column); more points are invisible.
- **LTTB** (Largest-Triangle-Three-Buckets): split the data into buckets; from each, keep the point forming the largest triangle with the previously kept point and the average of the next bucket. O(n), preserves visual shape, but does **not** guarantee every extreme survives.
- **Min-max / M4**: per pixel column keep the min and max (M4 also keeps first and last). Spikes are always visible — the right default for prices and spreads.
- **OHLC re-aggregation** for candles: exact highs and lows at the coarser interval.
- Cache downsampled output per zoom level and recompute only the tail when new points arrive.

### Eviction and history
- Overwritten data is gone client-side by design. Scrolling back fetches server-aggregated ranges — the server holds full history and can pre-aggregate.
- Zoomed-out views use server aggregates; only the live edge needs raw ticks.

### Measuring
- Heap snapshots and the allocation timeline in Chrome DevTools. In a soak test, a healthy heap looks like a sawtooth with a flat baseline; a rising baseline means a leak or an unbounded structure.
- \`performance.measureUserAgentSpecificMemory()\` gives field measurements but requires cross-origin isolation; \`performance.memory\` is non-standard and Chromium-only.

### Failure scenarios
- Capacity too small → gaps when zooming out; fall back to server data and say so in the UI.
- Downsampling on every tick on the main thread → long tasks; run it in a worker or at most once per frame.
- LTTB on price data hiding a one-print spike → use min-max for prices.`,
    practicalExample: {
      description: {
        en: "A typed-array ring buffer with O(1) push and fixed memory, plus min-max downsampling per pixel column that keeps true extremes visible (index buckets assume roughly even spacing; bucket by time for irregular ticks).",
        vi: "Ring buffer dùng typed array với push O(1) và bộ nhớ cố định, kèm downsampling min-max theo từng cột pixel để luôn giữ cực trị thật (bucket theo index giả định dữ liệu khá đều; với tick không đều thì bucket theo thời gian).",
      },
      code: {
        language: "ts",
        code: `export class RingBuffer {
  private readonly ts: Float64Array;
  private readonly val: Float64Array;
  private head = 0; // next write position
  size = 0;

  constructor(readonly capacity: number) {
    this.ts = new Float64Array(capacity); // memory fixed up front: 16 bytes per point
    this.val = new Float64Array(capacity);
  }

  push(t: number, v: number): void {
    this.ts[this.head] = t;
    this.val[this.head] = v;
    this.head = (this.head + 1) % this.capacity; // oldest point is overwritten when full
    if (this.size < this.capacity) this.size++;
  }

  /** i = 0 is the oldest retained point. */
  at(i: number): [number, number] {
    const idx = (this.head - this.size + i + this.capacity) % this.capacity;
    return [this.ts[idx], this.val[idx]];
  }
}

/** Min-max per pixel column: at most 2 points per column, extremes always kept. */
export function minMaxPerPixel(buf: RingBuffer, width: number): Array<[number, number]> {
  const n = buf.size;
  if (n <= width * 2) return Array.from({ length: n }, (_, i) => buf.at(i));
  const out: Array<[number, number]> = [];
  const per = n / width;
  for (let col = 0; col < width; col++) {
    const start = Math.floor(col * per);
    const end = Math.min(n, Math.floor((col + 1) * per));
    let min = buf.at(start), max = min;
    for (let i = start + 1; i < end; i++) {
      const p = buf.at(i);
      if (p[1] < min[1]) min = p;
      if (p[1] > max[1]) max = p;
    }
    if (min === max) out.push(min);
    else out.push(...(min[0] <= max[0] ? [min, max] : [max, min])); // keep time order
  }
  return out;
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  WS["Tick stream"] --> RB["Ring buffer - typed arrays, fixed capacity"]
  RB -- "when full" --> EV["Oldest points overwritten"]
  RB --> VR["Slice visible time range"]
  VR --> DS{"More than 2 points per pixel?"}
  DS -- yes --> AG["Min-max per column or LTTB"]
  DS -- no --> RAW["Use raw points"]
  AG --> CV["Canvas draw once per frame"]
  RAW --> CV
  SC["User scrolls past buffer"] --> API["Fetch aggregated range from server"]
  API --> CV`,
      caption: {
        en: "Store in a bounded ring buffer, shrink to the pixel budget before drawing, and shed old data to the server.",
        vi: "Lưu trong ring buffer có giới hạn, thu gọn theo số pixel trước khi vẽ, và để server giữ dữ liệu cũ.",
      },
    },
    memoryShortcut: {
      en: '"Store, Shrink, Shed": store in a ring buffer, shrink to the pixel budget, shed old data to the server.',
      vi: '"Store, Shrink, Shed": lưu vào ring buffer, thu gọn theo số pixel, đẩy dữ liệu cũ về server.',
    },
    keyTakeaway: {
      en: "Bound memory by design with typed-array ring buffers, draw only one to two points per pixel, and let the server own deep history.",
      vi: "Giới hạn bộ nhớ ngay từ thiết kế bằng ring buffer dùng typed array, chỉ vẽ 1–2 điểm mỗi pixel, và để server giữ lịch sử dài hạn.",
    },
    followUps: [
      {
        id: "isb-q36-f1",
        question: {
          en: "When would you choose LTTB over min-max downsampling?",
          vi: "Khi nào bạn chọn LTTB thay vì downsampling min-max?",
        },
        answer: {
          en: "LTTB is great for smooth line charts where the overall shape matters — P&L over time, exposure, latency — because it picks visually significant points and produces a clean line with exactly the target number of points. Min-max is better when the extremes are the information: price lines, spreads, error spikes. LTTB can drop a single-point spike if it isn't the largest triangle in its bucket, which on a price chart means hiding a real print. For candles I don't downsample points at all; I re-aggregate into a coarser interval, which keeps highs and lows exact.",
          vi: "LTTB rất hợp với line chart mượt, nơi hình dạng tổng thể quan trọng — P&L theo thời gian, exposure, latency — vì nó chọn các điểm có ý nghĩa thị giác và cho ra đường gọn với đúng số điểm mục tiêu. Min-max tốt hơn khi chính cực trị là thông tin: đường giá, spread, các đột biến lỗi. LTTB có thể bỏ mất một spike chỉ có một điểm nếu nó không tạo tam giác lớn nhất trong bucket — trên chart giá, điều đó nghĩa là che mất một giao dịch có thật. Với nến thì không downsample điểm mà gom lại theo interval lớn hơn, giữ chính xác high và low.",
        },
      },
      {
        id: "isb-q36-f2",
        question: {
          en: "How would you verify that the screen really has bounded memory?",
          vi: "Bạn kiểm chứng thế nào rằng màn hình thật sự có bộ nhớ bị giới hạn?",
        },
        answer: {
          en: "With a soak test: run the screen against a recorded or synthetic feed at production-like rates for an hour or more and take heap snapshots at intervals. Healthy memory is a sawtooth with a flat baseline; a rising baseline means something grows. I'd compare snapshots to find retained objects by constructor, check for detached DOM nodes and growing listener counts, and expose buffer sizes as debug metrics. In CI, a Playwright run in Chromium can sample JS heap size through the DevTools protocol and fail the build if the baseline keeps climbing.",
          vi: "Bằng soak test: chạy màn hình với feed đã ghi lại hoặc feed giả lập ở tốc độ gần production trong một giờ hoặc lâu hơn, chụp heap snapshot theo từng mốc. Bộ nhớ khoẻ mạnh có dạng răng cưa với baseline phẳng; baseline tăng dần nghĩa là có thứ đang phình ra. So sánh các snapshot để tìm object bị giữ lại theo constructor, kiểm tra DOM node bị detached và số listener tăng dần, đồng thời expose kích thước buffer làm metric debug. Trong CI, Playwright chạy Chromium có thể lấy JS heap size qua DevTools protocol và fail build nếu baseline cứ tăng.",
        },
      },
    ],
    difficulty: "expert",
    priority: "high",
    jdRequirement: "Memory leak detection; large datasets with high-frequency updates; market data charts",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "No production time-series or market-data charting experience. Present this as a recommended design. You can connect it to general caching discipline from Persefoni (TanStack Query prefetching and caching) without claiming chart or trading work.",
        vi: "Chưa có kinh nghiệm production về chart time-series hay market data. Trình bày như một thiết kế đề xuất. Có thể liên hệ với tư duy quản lý cache ở Persefoni (prefetching và caching với TanStack Query) nhưng không nhận là đã làm chart hay trading.",
      },
    },
    tags: ["time-series", "ring-buffer", "downsampling", "lttb", "memory"],
  },
];
