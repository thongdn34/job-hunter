import type { InterviewQuestion } from "@/domain/package/schema";

/**
 * ISB Vietnam — Section 7, topic "realtime" (questions 1–7).
 * JD (verified): "Integrate REST APIs, WebSockets and Server-Sent Events (SSE)",
 * "high-frequency data streams", "interactive, low-latency dashboards ... high-volume market data".
 * Candidate experience: only Ninja Van Socket.IO real-time work and Persefoni WCAG/ARIA work are "actual";
 * everything trading-specific is applied knowledge and is labelled as such.
 */
export const realtimeQuestions: InterviewQuestion[] = [
  /* ------------------------------------------------------------------ */
  /* Q01 — WebSocket vs SSE vs long polling                              */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q01",
    number: 1,
    topicId: "realtime",
    question: {
      en: "WebSocket, Server-Sent Events or long polling for a real-time trading dashboard: how do you choose?",
      vi: "Với một dashboard trading real-time, bạn chọn WebSocket, Server-Sent Events hay long polling như thế nào?",
    },
    answer: `I'd decide on three things: which direction the traffic flows, what infrastructure sits in between, and how the data behaves under load.

On a trading dashboard most traffic goes server to client: prices, order book updates and fills. The client still has to subscribe and unsubscribe symbols as the user moves around. That's why WebSocket is my default for the market-data channel. It's full-duplex, each message costs only a few bytes after the handshake, and it supports binary frames if we later move to protobuf or MessagePack.

SSE is a strong choice when the stream really is one-way, like order-status events, notifications or alerts. It runs over plain HTTP, so it works with HTTP/2, existing proxies and cookie auth, and EventSource reconnects automatically and sends Last-Event-ID so the server can replay what we missed. The limits are text-only payloads and, on HTTP/1.1, roughly six connections per origin.

I'd keep long polling only as a fallback for locked-down corporate networks. It's higher latency and much more expensive for the server.

In practice I'd mix them: WebSocket for market data, SSE for account and order events, and plain REST with idempotency keys for commands like placing or cancelling an order. Whatever we pick sits behind one client interface, so components never know which transport is underneath. At Ninja Van I used Socket.IO for real-time logistics updates. Socket.IO ships transport fallback and automatic reconnection out of the box, so with raw WebSocket or SSE I know those are the pieces I'd have to design myself.`,
    viExplanation: `Interviewer muốn biết bạn chọn transport vì lý do kỹ thuật hay chỉ vì thói quen. Hãy trả lời theo ba tiêu chí: chiều dữ liệu (một chiều hay hai chiều), hạ tầng ở giữa (proxy, load balancer, HTTP/2) và đặc tính tải (tần suất cao, binary hay text).

Với dashboard trading, market data nên đi qua WebSocket vì client phải subscribe/unsubscribe symbol liên tục và có thể cần binary frame để giảm kích thước payload. SSE rất hợp cho luồng một chiều như trạng thái lệnh hay thông báo. Nó chạy trên HTTP thông thường, tự reconnect và có Last-Event-ID để server replay sự kiện bị lỡ. Đổi lại, SSE chỉ hỗ trợ text, và trên HTTP/1.1 trình duyệt giới hạn khoảng 6 kết nối mỗi origin. Long polling chỉ nên là fallback cho mạng doanh nghiệp chặn WebSocket.

Bạn ghi điểm senior khi nói rõ có thể kết hợp nhiều kênh: WebSocket cho giá, SSE cho event, REST cho lệnh đặt/huỷ (kèm idempotency key). Tất cả nằm sau một interface chung để component không phụ thuộc vào transport. Khi nhắc Ninja Van, chỉ nói bạn đã dùng Socket.IO cho ứng dụng logistics real-time, không nói đã làm hệ thống trading.`,
    technicalExplanation: `### How each transport works
- **WebSocket** starts as an HTTP/1.1 \`Upgrade\` request. After \`101 Switching Protocols\` the TCP connection carries framed messages in both directions, with 2–14 bytes of frame overhead and either text or binary payloads.
- **SSE** is an ordinary HTTP response with \`Content-Type: text/event-stream\` that never finishes. \`EventSource\` parses the \`event\`, \`data\`, \`id\` and \`retry\` fields. It reconnects automatically and sends the last id in the \`Last-Event-ID\` header so the server can replay.
- **Long polling** means the server holds each request until data arrives or a timeout fires. Every message pays for a full request/response with headers.

### Trade-offs that matter for trading
- **Direction:** per-symbol subscribe/unsubscribe fits WebSocket naturally. With SSE you'd need a separate REST call to change subscriptions, which leaves two channels to keep consistent.
- **Payload:** SSE is UTF-8 text only. WebSocket can carry protobuf or MessagePack with \`binaryType = "arraybuffer"\`.
- **Connection limits:** over HTTP/1.1, browsers allow about 6 connections per origin, so several EventSources across tabs can starve normal requests. HTTP/2 multiplexes streams over one connection and removes most of that problem.
- **Auth:** neither \`EventSource\` nor the browser \`WebSocket\` API can set custom headers. Use cookies, a short-lived ticket in the URL, or a first-message auth handshake. A fetch-based SSE reader can send headers.
- **Infrastructure:** SSE is plain HTTP, so it works with CDNs, proxies and HTTP/2, as long as response buffering is turned off. WebSocket needs Upgrade support on every hop and sensible idle timeouts on the load balancer.

### Failure scenarios
- A corporate proxy strips the Upgrade header and the WebSocket never opens. Detect this and degrade to SSE or polling.
- A buffering reverse proxy holds SSE events back, so users see bursts instead of a stream.
- Idle timeouts kill quiet connections, so both transports need heartbeats.
- Long polling multiplies requests under load and makes the reconnect storm after an outage worse.

### Scalability and maintainability
- WebSocket and SSE both keep long-lived, stateful connections open. Plan for connection counts per gateway node, graceful drain during deploys, and reconnect storms.
- Hide the transport behind one client API (\`subscribe\`, \`unsubscribe\`, \`status\`). Then you can switch transport per channel without touching UI code.

### Rule of thumb
- Bidirectional, binary or very high rate: **WebSocket**.
- One-way events over existing HTTP infrastructure: **SSE**.
- Commands such as placing or cancelling an order: **REST** with idempotency keys.
- **Long polling** only as a fallback.`,
    practicalExample: {
      description: {
        en: "One dashboard, three channels: WebSocket for bidirectional market-data subscriptions, SSE for one-way order events with automatic replay, and REST for commands so they keep HTTP semantics and idempotency.",
        vi: "Một dashboard dùng ba kênh: WebSocket cho subscribe market data hai chiều, SSE cho order event một chiều (tự replay khi reconnect), và REST cho lệnh để giữ semantics HTTP và idempotency.",
      },
      code: {
        language: "ts",
        code: `type OrderUpdate = { orderId: string; status: string; version: number };
declare const marketStore: { ingest(raw: unknown): void };
declare const orderStore: { apply(evt: OrderUpdate): void };
declare const setStatus: (channel: string, s: "live" | "reconnecting") => void;

// 1) Market data: dynamic subscriptions, binary-capable, full-duplex
const ws = new WebSocket("wss://api.example.com/marketdata");
ws.binaryType = "arraybuffer";
ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ op: "subscribe", channel: "ticker", symbols: ["EURUSD", "USDJPY"] }));
});
ws.addEventListener("message", (e) => marketStore.ingest(e.data));

// 2) Order events: one-way push; EventSource reconnects and sends Last-Event-ID
const orders = new EventSource("/api/orders/stream", { withCredentials: true });
orders.addEventListener("order-update", (e) => {
  orderStore.apply(JSON.parse((e as MessageEvent<string>).data) as OrderUpdate);
  setStatus("orders", "live");
});
orders.onerror = () => setStatus("orders", "reconnecting");

// 3) Commands: REST, so retries are safe and errors have HTTP status codes
export async function placeOrder(order: { symbol: string; side: "buy" | "sell"; qty: string }) {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error("Order rejected: " + res.status);
  return (await res.json()) as { orderId: string };
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart TD
  A["New real-time feed"] --> B{"Client sends data on the same channel?"}
  B -->|yes| WS["WebSocket"]
  B -->|no| C{"Binary payloads or very high rate?"}
  C -->|yes| WS
  C -->|no| SSE["SSE over HTTP/2"]
  WS --> D{"Network blocks long-lived connections?"}
  SSE --> D
  D -->|yes| LP["Long polling fallback"]
  D -->|no| OK["Ship with heartbeats and reconnect"]
  CMD["Place or cancel order"] --> REST["REST plus idempotency key"]`,
      caption: {
        en: "Pick the transport per channel: WebSocket for bidirectional or binary streams, SSE for one-way events, REST for commands, long polling only as a fallback.",
        vi: "Chọn transport theo từng kênh: WebSocket cho luồng hai chiều hoặc binary, SSE cho event một chiều, REST cho lệnh, long polling chỉ làm fallback.",
      },
    },
    memoryShortcut: {
      en: "D-I-L: Direction, Infrastructure, Load. Two-way or binary means WS, one-way means SSE, commands go through REST, polling is the fallback.",
      vi: "D-I-L: Direction, Infrastructure, Load. Hai chiều hoặc binary dùng WS, một chiều dùng SSE, lệnh đi REST, polling là fallback.",
    },
    keyTakeaway: {
      en: "Choose the transport per channel, not per app, and hide it behind one client interface so you can change it later.",
      vi: "Chọn transport theo từng kênh chứ không phải cho cả app, và giấu nó sau một interface chung để sau này đổi được.",
    },
    followUps: [
      {
        id: "isb-q01-f1",
        question: {
          en: "Why not send order placement over the same WebSocket, since it's already open?",
          vi: "Sao không gửi lệnh đặt order qua luôn WebSocket đang mở sẵn?",
        },
        answer: {
          en: "You can, and some venues do, but you then have to rebuild what HTTP already gives you: a request/response correlation id, timeouts, status codes, retries and idempotency. The dangerous case is a socket that drops right after you send. You don't know whether the order reached the server, and a blind resend could create a duplicate. With REST plus an idempotency key, the retry is safe by design, and the confirmation still arrives as an event on the stream. If latency requirements force commands onto the socket, I'd add client-generated order ids and explicit acks with timeouts.",
          vi: "Làm được, và một số sàn cũng làm vậy, nhưng khi đó bạn phải tự xây lại những thứ HTTP có sẵn: correlation id cho request/response, timeout, status code, retry và idempotency. Trường hợp nguy hiểm là socket rớt ngay sau khi gửi: bạn không biết lệnh đã tới server chưa, và gửi lại mù quáng có thể tạo lệnh trùng. REST kèm idempotency key làm cho việc retry an toàn ngay từ thiết kế, còn xác nhận vẫn về qua stream dưới dạng event. Nếu yêu cầu latency bắt buộc gửi lệnh qua socket, mình sẽ thêm client-generated order id và ack có timeout rõ ràng.",
        },
      },
      {
        id: "isb-q01-f2",
        question: {
          en: "Does HTTP/2 or HTTP/3 change your recommendation?",
          vi: "HTTP/2 hoặc HTTP/3 có làm bạn đổi khuyến nghị không?",
        },
        answer: {
          en: "It makes SSE much more attractive. HTTP/2 multiplexes many streams over one TCP connection, so the six-connections-per-origin limit mostly goes away, and SSE can share the connection with normal API calls. WebSocket over HTTP/2 exists (RFC 8441) but support across proxies is uneven, so in practice it often still runs over HTTP/1.1. WebTransport over HTTP/3 is interesting for unreliable or unordered streams, but browser and infrastructure support is still maturing, so I'd treat it as a future option, not a default for a production trading UI.",
          vi: "Nó làm SSE hấp dẫn hơn nhiều. HTTP/2 multiplex nhiều stream trên một kết nối TCP, nên giới hạn 6 kết nối mỗi origin gần như không còn, và SSE dùng chung kết nối với các API call bình thường. WebSocket qua HTTP/2 có chuẩn (RFC 8441) nhưng proxy hỗ trợ không đồng đều, nên thực tế nó vẫn thường chạy trên HTTP/1.1. WebTransport trên HTTP/3 đáng chú ý cho stream unreliable hoặc không cần thứ tự, nhưng trình duyệt và hạ tầng chưa hỗ trợ đầy đủ, nên mình xem nó là lựa chọn tương lai chứ chưa phải mặc định cho UI trading production.",
        },
      },
    ],
    difficulty: "medium",
    priority: "critical",
    jdRequirement: "Integrate REST APIs, WebSockets and SSE for high-frequency data streams",
    candidateExperience: {
      company: "Ninja Van — TechLab",
      kind: "actual",
      note: {
        en: "Socket.IO real-time communication in logistics apps is real experience. The trading-specific transport decision is applied knowledge; don't claim production trading or SSE work.",
        vi: "Socket.IO real-time trong ứng dụng logistics là kinh nghiệm thật. Phần lựa chọn transport cho trading là kiến thức áp dụng; không nhận đã làm trading hay SSE trên production.",
      },
    },
    tags: ["websocket", "sse", "long-polling", "transport", "real-time"],
  },

  /* ------------------------------------------------------------------ */
  /* Q02 — Connection lifecycle and resilient reconnection               */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q02",
    number: 2,
    topicId: "realtime",
    question: {
      en: "Walk me through the WebSocket connection lifecycle. How do you build resilient reconnection with backoff and jitter, resubscription and auth refresh?",
      vi: "Hãy mô tả vòng đời kết nối WebSocket. Bạn xây cơ chế reconnect bền vững như thế nào, với backoff và jitter, resubscribe và refresh auth?",
    },
    answer: `I treat the connection as a small state machine (connecting, open, reconnecting, closed), and the UI always shows which state we're in. Resilience then comes down to four things.

First, backoff with full jitter. The delay is a random value between zero and the smaller of a cap and base times two to the attempt. Without jitter, thousands of clients reconnect at the same instant when a gateway restarts and knock it over again. I only reset the attempt counter once the connection has been stable for a few seconds, so a flapping server can't put us in a tight loop.

Second, subscriptions are desired state. I keep a registry of what the UI currently needs and replay it on every open. Then I ask for a fresh snapshot, because anything streamed while we were offline is gone.

Third, auth. Browsers can't set headers on a WebSocket, so I fetch a short-lived ticket before each attempt. If the server closes with an application code meaning "token expired", I refresh first instead of retrying blindly. On permanent errors like a revoked session I stop and tell the user instead of retrying forever.

Fourth, listen to the browser. The online and visibilitychange events let me reconnect right away when the network comes back instead of waiting out a long backoff.

At Ninja Van we used Socket.IO, which handles much of this for you. With a raw WebSocket you have to build it on purpose.`,
    viExplanation: `Ý chính: coi kết nối là một state machine nhỏ và UI luôn phản ánh đúng trạng thái. Có bốn điểm cần nói.

(1) Exponential backoff kèm full jitter: thời gian chờ là một số ngẫu nhiên từ 0 đến min(cap, base × 2^attempt). Jitter tránh "thundering herd", tức hàng nghìn client cùng reconnect một lúc làm sập gateway lần nữa. Chỉ reset attempt khi kết nối đã ổn định vài giây, để server chập chờn không gây vòng lặp reconnect liên tục.

(2) Subscription là "desired state": giữ registry những gì UI đang cần, mỗi lần open thì resubscribe toàn bộ và lấy snapshot mới, vì dữ liệu trong lúc mất kết nối đã mất.

(3) Auth: WebSocket trên trình duyệt không set được header, nên mỗi lần kết nối lấy một ticket ngắn hạn. Nếu server đóng với close code báo token hết hạn thì refresh trước rồi mới reconnect. Lỗi vĩnh viễn (session bị thu hồi) thì dừng hẳn và báo người dùng.

(4) Lắng nghe sự kiện online/offline và visibilitychange để reconnect ngay khi có mạng lại.

Lưu ý trung thực: ở Ninja Van bạn dùng Socket.IO, thư viện đã có sẵn reconnect. Đừng nhận là đã tự viết toàn bộ cơ chế này nếu không phải.`,
    technicalExplanation: `### Lifecycle under the hood
- \`readyState\` goes \`CONNECTING (0)\`, \`OPEN (1)\`, \`CLOSING (2)\`, \`CLOSED (3)\`. A socket object is never reused: every reconnect creates a new \`WebSocket\`.
- **Close codes** tell you what to do next. \`1000\` is a normal close, so don't reconnect. \`1001\` means going away (server deploy or page unload). \`1006\` is an abnormal close with no close frame, typical of network loss, and it's never sent explicitly. \`1008\` is a policy violation and \`1011\` a server error. \`4000–4999\` are free for application meanings such as "auth expired" or "slow consumer".
- The \`error\` event carries almost no detail on purpose, for security reasons. Make decisions in \`close\`.

### Backoff with full jitter
- \`delay = random(0, min(cap, base * 2^attempt))\`. Full jitter spreads reconnects evenly across the window, so the herd after an outage doesn't arrive in synchronized waves.
- Typical values are a base of a few hundred ms and a cap of tens of seconds. Add a maximum attempt count for permanent failures.
- **Reset only after stability.** If you reset on \`open\`, a server that accepts and immediately drops connections gives you an infinite fast loop.

### Resubscribe from desired state
- Keep a \`Set\` or ref-counted \`Map\` of topics the UI needs. Components add to and remove from it, and the socket layer replays it on every \`open\`.
- After resubscribing, **request a snapshot**. Deltas missed during the outage are not replayed unless the protocol supports resume-from-sequence.
- Mark data as stale between the drop and the new snapshot, so users don't trade on frozen prices.

### Auth on a long-lived connection
- The browser API can't send an \`Authorization\` header. Options:
  - a cookie, which is simple but needs CSRF-style origin checks on the server;
  - a short-lived single-use ticket from an authenticated REST call, passed in the URL;
  - an auth message as the first frame.
- Tokens can expire mid-connection. The server should close with an app code such as \`4001\`. The client refreshes the token (deduplicating concurrent refreshes) and reconnects without counting it as a failure.
- Never loop on \`1008\` or revoked sessions. Surface them and stop.

### Failure scenarios
- **Thundering herd** after a gateway deploy: handled with jitter plus server-side graceful drain.
- **Half-open connection** where nothing closes after a laptop sleep: needs heartbeats (see Q7).
- **Duplicate sockets** from React StrictMode double effects or racing reconnect timers: guard with a single owner and cancel pending timers on close.
- **Hidden tab:** decide whether to keep streaming or pause subscriptions to save battery and bandwidth.

### Maintainability
Put this in one framework-agnostic module with an explicit status stream. React then just subscribes to status and data, which keeps reconnection logic out of components and easy to unit test with fake timers.`,
    practicalExample: {
      description: {
        en: "A framework-agnostic resilient socket: a fresh short-lived ticket on every attempt, full-jitter backoff, resubscription from a desired-state registry, and a stable-period reset of the attempt counter.",
        vi: "Một resilient socket không phụ thuộc framework: lấy ticket ngắn hạn mới cho mỗi lần thử, backoff full jitter, resubscribe từ registry desired state, và chỉ reset attempt sau khi kết nối ổn định.",
      },
      code: {
        language: "ts",
        code: `type Status = "connecting" | "open" | "reconnecting" | "closed" | "auth-failed";
export class ResilientSocket {
  private ws?: WebSocket;
  private attempt = 0;
  private stableTimer?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private readonly topics = new Set<string>();

  constructor(
    private readonly url: string,
    private readonly getTicket: () => Promise<string>, // REST call, short-lived ticket
    private readonly onMessage: (raw: string) => void,
    private readonly onStatus: (s: Status) => void,
  ) {}

  async connect(): Promise<void> {
    this.onStatus(this.attempt === 0 ? "connecting" : "reconnecting");
    let ticket: string;
    try { ticket = await this.getTicket(); } catch { return this.scheduleReconnect(); }
    const ws = (this.ws = new WebSocket(this.url + "?ticket=" + encodeURIComponent(ticket)));
    ws.onopen = () => {
      this.onStatus("open");
      this.topics.forEach((t) => ws.send(JSON.stringify({ op: "subscribe", topic: t, snapshot: true })));
      this.stableTimer = setTimeout(() => (this.attempt = 0), 10_000); // reset only when stable
    };
    ws.onmessage = (e) => this.onMessage(e.data as string);
    ws.onclose = (e) => {
      clearTimeout(this.stableTimer);
      if (this.stopped || e.code === 1000) return this.onStatus("closed");
      if (e.code === 1008) return this.onStatus("auth-failed"); // permanent: don't loop
      this.scheduleReconnect(); // 1006, 1011, 4001 (ticket expired) ...
    };
  }

  private scheduleReconnect(): void {
    if (this.stopped) return; // close() was called while a ticket fetch or timer was pending
    const delay = Math.random() * Math.min(30_000, 500 * 2 ** this.attempt++); // full jitter
    this.retryTimer = setTimeout(() => void this.connect(), delay);
  }

  subscribe(topic: string): void {
    this.topics.add(topic);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ op: "subscribe", topic }));
  }
  close(): void { this.stopped = true; clearTimeout(this.retryTimer); this.ws?.close(1000); }
}`,
      },
    },
    diagram: {
      kind: "sequence",
      code: `sequenceDiagram
  participant UI as Dashboard
  participant C as Socket client
  participant A as Auth API
  participant S as WS gateway
  C->>A: POST ws-ticket
  A-->>C: short-lived ticket
  C->>S: Upgrade with ticket
  S-->>C: 101 Switching Protocols
  C->>S: subscribe topics from registry
  S-->>C: snapshot then deltas
  S--xC: connection lost, close code 1006
  C->>UI: status reconnecting, mark data stale
  Note over C: wait random delay up to min of cap and base times 2 to the n
  C->>A: POST ws-ticket again
  A-->>C: fresh ticket
  C->>S: Upgrade with new ticket
  C->>S: resubscribe all topics
  S-->>C: fresh snapshot
  C->>UI: status live`,
      caption: {
        en: "Each reconnect gets a fresh ticket, waits a jittered backoff, replays the subscription registry and only goes 'live' again after a new snapshot.",
        vi: "Mỗi lần reconnect lấy ticket mới, chờ backoff có jitter, resubscribe theo registry và chỉ chuyển lại 'live' sau khi có snapshot mới.",
      },
    },
    memoryShortcut: {
      en: "J-R-A-B: Jitter the backoff, Replay subscriptions, refresh Auth, listen to the Browser.",
      vi: "J-R-A-B: Jitter cho backoff, Replay subscription, refresh Auth, lắng nghe Browser (online/visibility).",
    },
    keyTakeaway: {
      en: "Reconnection isn't just reopening a socket: it's jittered backoff, replayed subscriptions, a fresh snapshot and fresh credentials, with the UI honest about staleness the whole time.",
      vi: "Reconnect không chỉ là mở lại socket: đó là backoff có jitter, resubscribe, snapshot mới và credential mới, trong khi UI luôn trung thực về việc dữ liệu đang cũ.",
    },
    followUps: [
      {
        id: "isb-q02-f1",
        question: {
          en: "How do you avoid opening two sockets in React StrictMode (18 and 19) or when components remount?",
          vi: "Làm sao tránh mở hai socket khi StrictMode của React (18 và 19) chạy effect hai lần hoặc component remount?",
        },
        answer: {
          en: "I don't let components own the socket. The connection lives in a module-level singleton or a context provider created once. Components only call subscribe and unsubscribe, and those are ref-counted, so StrictMode's mount, unmount and mount sequence just increments, decrements and increments a counter. The real unsubscribe is deferred a moment so a quick remount doesn't cause unsubscribe/resubscribe churn on the server. The socket closes only when the app or the last consumer is truly gone. This also makes the data layer testable without rendering React.",
          vi: "Mình không để component sở hữu socket. Kết nối nằm trong một singleton cấp module hoặc một provider chỉ tạo một lần. Component chỉ gọi subscribe/unsubscribe, và hai hàm này có ref-count, nên chuỗi mount, unmount, mount của StrictMode chỉ làm counter tăng, giảm rồi tăng. Việc unsubscribe thật được trì hoãn một chút để remount nhanh không gây unsubscribe/resubscribe liên tục lên server. Socket chỉ đóng khi app hoặc consumer cuối cùng thật sự biến mất. Cách này còn giúp test data layer mà không cần render React.",
        },
      },
      {
        id: "isb-q02-f2",
        question: {
          en: "What happens to the access token while the socket stays open for hours?",
          vi: "Access token sẽ ra sao khi socket mở liên tục nhiều giờ?",
        },
        answer: {
          en: "The handshake only proves identity at connect time, so the server has to enforce expiry on the live connection too. Usually it either closes with an application code when the token expires, or accepts a re-auth message carrying a new token over the existing socket. On the client, I'd refresh proactively a little before expiry, with a single in-flight refresh shared by REST and the socket so we don't race. If refresh fails because the session was revoked, I close cleanly, stop reconnecting and send the user to sign in. That matters in fintech, where sessions are often short and audited.",
          vi: "Handshake chỉ xác thực tại thời điểm kết nối, nên server cũng phải kiểm soát hạn token trên kết nối đang sống. Thường server sẽ đóng với một close code riêng khi token hết hạn, hoặc nhận một message re-auth chứa token mới ngay trên socket hiện tại. Ở client, mình refresh chủ động trước khi hết hạn một chút, dùng chung một refresh đang chạy cho cả REST và socket để tránh race. Nếu refresh thất bại vì session đã bị thu hồi thì đóng sạch, ngừng reconnect và chuyển người dùng sang đăng nhập. Điều này quan trọng trong fintech, nơi session thường ngắn và được audit.",
        },
      },
    ],
    difficulty: "hard",
    priority: "critical",
    jdRequirement: "Reliable WebSocket/SSE integration with Rust/Python backends for low-latency dashboards",
    candidateExperience: {
      company: "Ninja Van — TechLab",
      kind: "actual",
      note: {
        en: "You used Socket.IO for real-time communication, and Socket.IO ships reconnection with backoff built in. Present the custom backoff, ticket and auth-refresh design as how you'd build it on a raw WebSocket; don't claim you hand-wrote it unless you did.",
        vi: "Bạn đã dùng Socket.IO cho real-time, và Socket.IO có sẵn reconnect kèm backoff. Hãy trình bày thiết kế backoff, ticket và refresh auth như cách bạn sẽ xây trên WebSocket thuần; đừng nhận đã tự viết nếu không phải.",
      },
    },
    tags: ["websocket", "reconnection", "backoff", "jitter", "auth"],
  },

  /* ------------------------------------------------------------------ */
  /* Q03 — High-frequency ticks without freezing the UI                  */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q03",
    number: 3,
    topicId: "realtime",
    question: {
      en: "The feed sends thousands of market-data ticks per second. How do you keep the UI from freezing? Talk about batching, conflation and requestAnimationFrame flushing.",
      vi: "Feed gửi hàng nghìn tick market data mỗi giây. Làm sao giữ UI không bị đơ? Hãy nói về batching, conflation và flush bằng requestAnimationFrame.",
    },
    answer: `The key point is that the screen refreshes about 60 times a second, so rendering thousands of updates per second gains nothing. The user physically can't see them. I'd handle it in three layers.

First, separate ingestion from rendering. The WebSocket handler does the minimum, parsing and writing into a buffer, and never calls setState per message.

Second, conflate. For prices only the latest value per symbol matters, so I keep a Map keyed by symbol and overwrite. A thousand ticks for one symbol within a frame become one update. I'm careful about what can be conflated, though. Last price and best bid/ask can. Trades, fills and order-status events can't. They're append-only, so they must be kept or aggregated, for example into volume or the current candle.

Third, flush once per frame with requestAnimationFrame. One store update applies the whole batch, so React does a single render pass instead of hundreds. Components subscribe with narrow selectors, so only rows whose symbol changed re-render.

Then there are the failure modes I'd watch. requestAnimationFrame pauses in background tabs, so the buffer has to stay bounded, and conflation gives you that almost for free. If the flush itself blows the frame budget, I'd move parsing into a Web Worker and make sure the grid is virtualized. And visual effects like price flashes should be throttled per cell so the screen stays readable rather than strobing.`,
    viExplanation: `Ý cốt lõi: màn hình chỉ vẽ khoảng 60 frame/giây (tuỳ tần số màn hình), nên render hàng nghìn update mỗi giây là lãng phí vì mắt người không thấy kịp. Trả lời theo ba lớp.

(1) Tách ingestion khỏi rendering: handler của WebSocket chỉ parse và ghi vào buffer, tuyệt đối không gọi setState cho từng message.

(2) Conflation: với giá, chỉ giá trị mới nhất của mỗi symbol là quan trọng, nên dùng Map theo symbol và ghi đè. Một nghìn tick của cùng symbol trong một frame chỉ còn một update. Nhưng phải phân biệt: last price, best bid/ask thì conflate được; còn trade, fill, trạng thái lệnh là dữ liệu append-only, không được bỏ mà phải giữ hoặc aggregate (cộng volume, cập nhật nến hiện tại).

(3) Flush mỗi frame bằng requestAnimationFrame: một lần cập nhật store cho cả batch, React chỉ render một lượt. Component dùng selector hẹp nên chỉ row có symbol thay đổi mới re-render.

Failure mode cần nhắc: rAF dừng khi tab bị ẩn nên buffer phải có giới hạn (conflation giúp việc này); flush vượt frame budget thì chuyển parse sang Web Worker và virtualize bảng; hiệu ứng nhấp nháy giá cần throttle theo từng ô.`,
    technicalExplanation: `### Why per-message rendering fails
- At 60 Hz a frame lasts about **16.7 ms**. The browser has to fit JavaScript, style, layout, paint and compositing in that window, and in practice you have roughly 10 ms for your own work.
- Calling \`setState\` per tick means thousands of store notifications, selector runs and reconciliations per second. React (18+) batches updates made within the same task, but WebSocket messages arrive as **separate tasks**, and external-store updates (Zustand and Redux via \`useSyncExternalStore\`) are flushed synchronously, so each message can trigger its own render.
- Tasks over **50 ms** count as long tasks. They block input handling and hurt INP.

### The pipeline
1. **Ingest:** \`onmessage\` parses the payload and writes into a mutable structure. No React, no allocation-heavy work.
2. **Conflate:** \`Map<symbol, latestTick>\` with last-write-wins. Memory is bounded by the number of symbols, not the message rate.
3. **Flush:** \`requestAnimationFrame\` runs right before the browser paints. Apply the batch with **one** store update.
4. **Render selectively:** components read through narrow selectors (\`s => s.prices[symbol]\`), so unchanged rows bail out. Rows are \`memo\`-ized and the grid is virtualized, so only visible rows exist.

### What can and cannot be conflated
| Data | Conflate? | Why |
| --- | --- | --- |
| Last price, best bid/ask | Yes | Only the latest state matters |
| Order book levels | Yes, per price level | Size at a level is state |
| Trades / time & sales | No, aggregate instead | Each print matters for volume and candles |
| Fills, order status | Never | Lossless business events |

### Failure scenarios
- **Background tabs:** \`requestAnimationFrame\` stops while the tab is hidden. Conflated state stays bounded, but append-only buffers grow. Cap them, or drain on \`visibilitychange\` and resync from a snapshot.
- **Flush too heavy:** spreading a 5,000-key object every frame costs real time. Use mutable maps with version counters, or per-symbol stores, and profile it.
- **Unreadable UI:** a cell that changes 30 times a second is noise. Throttle flashes per cell, for example to a few hundred ms.
- **Wasted flushes:** if the flush runs on \`setTimeout(0)\`, it can fire more often than the screen paints and waste work. \`requestAnimationFrame\` aligns with paint.

### Scalability
- The flush rate scales with the frame rate, not the feed rate, which is the main point of the pattern.
- When parsing itself costs more than a few ms per frame, move ingest and conflation into a **Web Worker** (Q6) and post one batch per frame.
- Measure with the Performance panel (long tasks, frame drops), the React Profiler (commit count and duration) and a counter of messages vs flushes.`,
    practicalExample: {
      description: {
        en: "Conflate ticks per symbol in a Map, flush once per animation frame into a Zustand store, and let each cell subscribe to just its own symbol.",
        vi: "Conflate tick theo symbol trong một Map, flush mỗi animation frame vào Zustand store, và để mỗi ô chỉ subscribe đúng symbol của nó.",
      },
      code: {
        language: "tsx",
        code: `import { memo } from "react";
import { create } from "zustand";

type Tick = { symbol: string; bid: number; ask: number; ts: number };
type PriceState = { prices: Record<string, Tick> };

export const usePrices = create<PriceState>(() => ({ prices: {} }));

const pending = new Map<string, Tick>(); // conflation: latest tick per symbol wins
let scheduled = false;

export function onTick(tick: Tick): void {
  pending.set(tick.symbol, tick);
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(flush); // at most one flush per painted frame
}

function flush(): void {
  scheduled = false;
  if (pending.size === 0) return;
  const batch = Object.fromEntries(pending);
  pending.clear();
  // ONE store update per frame, no matter how many ticks arrived
  usePrices.setState((s) => ({ prices: { ...s.prices, ...batch } }));
}

// Narrow selector: this cell re-renders only when ITS symbol's bid changes
export const BidCell = memo(function BidCell({ symbol }: { symbol: string }) {
  const bid = usePrices((s) => s.prices[symbol]?.bid);
  return <td className="tabular-nums">{bid === undefined ? "–" : bid.toFixed(5)}</td>;
});`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  WS["WebSocket onmessage, thousands per sec"] --> P["Parse only"]
  P --> C{"Conflatable?"}
  C -->|"price, best bid/ask"| M["Map keyed by symbol, last write wins"]
  C -->|"trades, fills"| Q["Append buffer or aggregate"]
  M --> R["requestAnimationFrame flush, about 60 per sec"]
  Q --> R
  R --> S["One store update per frame"]
  S --> SEL["Narrow selectors"]
  SEL --> ROW["Only changed visible rows re-render"]`,
      caption: {
        en: "Ingestion runs at the feed rate, rendering at the frame rate. The conflation Map sits between them and bounds both memory and work.",
        vi: "Ingestion chạy theo tốc độ feed, rendering chạy theo frame rate. Map conflation đứng giữa và giới hạn cả bộ nhớ lẫn khối lượng xử lý.",
      },
    },
    memoryShortcut: {
      en: "Ingest fast, Conflate smart, Flush per Frame (I-C-F). Feed rate in, frame rate out.",
      vi: "Ingest nhanh, Conflate khéo, Flush theo Frame (I-C-F). Vào theo tốc độ feed, ra theo tốc độ frame.",
    },
    keyTakeaway: {
      en: "Render at the frame rate, not the feed rate: conflate state, preserve events, and apply one batched update per animation frame.",
      vi: "Render theo frame rate chứ không theo feed rate: conflate dữ liệu dạng state, giữ nguyên dữ liệu dạng event, và áp một update gộp cho mỗi animation frame.",
    },
    followUps: [
      {
        id: "isb-q03-f1",
        question: {
          en: "Why requestAnimationFrame rather than a throttle with setInterval at 100 ms?",
          vi: "Tại sao dùng requestAnimationFrame mà không throttle bằng setInterval 100 ms?",
        },
        answer: {
          en: "requestAnimationFrame lines up with the browser's paint, so each flush lands right before a frame is drawn, with no wasted work and no tearing between two half-applied updates. A fixed interval drifts against the frame clock: sometimes two flushes land in one frame, sometimes a frame has none. That said, a slower deliberate cadence is valid for some widgets. A P&L summary updating 4 times a second is easier to read. So I'd use requestAnimationFrame as the engine and let each widget choose a slower display throttle where that helps the user.",
          vi: "requestAnimationFrame khớp với nhịp paint của trình duyệt, nên mỗi lần flush rơi đúng trước khi vẽ frame: không có việc thừa, không có trạng thái nửa vời giữa hai update. Interval cố định thì lệch dần với frame clock, có frame bị flush hai lần, có frame không có lần nào. Tuy vậy, nhịp chậm có chủ đích vẫn hợp lý cho một số widget. Ví dụ tổng P&L cập nhật 4 lần mỗi giây sẽ dễ đọc hơn. Nên mình dùng requestAnimationFrame làm engine, và cho từng widget tự chọn throttle hiển thị chậm hơn khi điều đó có lợi cho người dùng.",
        },
      },
      {
        id: "isb-q03-f2",
        question: {
          en: "What if you also need a full tick history, for example for a time & sales panel?",
          vi: "Nếu vẫn cần toàn bộ lịch sử tick, ví dụ cho panel time & sales thì sao?",
        },
        answer: {
          en: "Then I keep two paths. The conflated path drives prices and the grid. The lossless path appends every trade to a fixed-size ring buffer, sized to what the panel can show plus some scroll-back. The panel renders from the ring buffer through a virtualized list, still flushed once per frame, and older history comes from a REST endpoint on demand. Aggregates like volume and the current candle are updated incrementally on every trade in the ingest step, so they stay exact while rendering stays cheap.",
          vi: "Khi đó mình giữ hai luồng. Luồng conflate điều khiển giá và grid. Luồng lossless append mọi trade vào một ring buffer kích thước cố định, đủ cho panel hiển thị cộng thêm một ít để cuộn lại. Panel render từ ring buffer qua virtualized list, vẫn flush mỗi frame, còn lịch sử cũ hơn thì lấy qua REST khi cần. Các aggregate như volume và nến hiện tại được cập nhật dần với từng trade ngay ở bước ingest, nên số liệu luôn chính xác mà chi phí render vẫn thấp.",
        },
      },
    ],
    difficulty: "hard",
    priority: "critical",
    jdRequirement: "Optimize browser rendering and state management for high-frequency real-time updates",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "No production market-data feed at this volume. Present it as the approach you'd take. You can bridge from real-time Socket.IO updates at Ninja Van, but don't claim tick-level volumes or measured gains.",
        vi: "Chưa có kinh nghiệm production với feed market data ở quy mô này. Trình bày như hướng tiếp cận bạn sẽ dùng. Có thể nối từ kinh nghiệm Socket.IO real-time ở Ninja Van, nhưng không nhận đã xử lý tick tần suất cao hay có số liệu cải thiện.",
      },
    },
    tags: ["high-frequency", "batching", "conflation", "requestanimationframe", "zustand"],
  },

  /* ------------------------------------------------------------------ */
  /* Q04 — Ordering, dedup, gap recovery                                 */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q04",
    number: 4,
    topicId: "realtime",
    question: {
      en: "How do you guarantee message ordering, deduplication and gap recovery on a streamed order book, using sequence numbers, snapshot plus delta, and resync?",
      vi: "Làm sao đảm bảo thứ tự message, loại trùng lặp và khôi phục khi thiếu message cho một order book dạng stream, với sequence number, snapshot + delta và resync?",
    },
    answer: `TCP gives you ordering within a single connection. You lose that guarantee the moment you combine a REST snapshot with a WebSocket stream, reconnect, or go through several gateway nodes. So I rely on server-assigned sequence numbers per stream, for example per symbol's order book.

The standard pattern is snapshot plus delta. I subscribe to the delta stream first and buffer it. Then I fetch a snapshot that carries its own sequence number. I drop buffered deltas at or below that number and apply the rest in order.

From then on, every delta must be exactly the last sequence plus one. If it's lower or equal, it's a duplicate from a retry or reconnect and I ignore it, which makes applying idempotent. If it's higher, there's a gap. I never guess the missing data. I mark the book as stale in the UI, keep buffering, and resync from a fresh snapshot.

For event-style data like order updates I dedupe by event id and keep a version per order. Then a late "partially filled" can never overwrite "filled".

The trade-off is snapshot cost. If gaps are frequent, re-downloading a deep book is expensive, so I'd ask the backend for replay-from-sequence support, or limit snapshot depth to what the UI actually shows. I'd also alert on resync frequency, because frequent gaps usually mean a backend or network problem worth fixing at the source.`,
    viExplanation: `TCP chỉ đảm bảo thứ tự trong một kết nối. Khi kết hợp snapshot REST với stream WebSocket, khi reconnect, hay khi đi qua nhiều gateway, thứ tự không còn được đảm bảo. Vì vậy cần sequence number do server gán cho từng stream (ví dụ order book của từng symbol).

Pattern chuẩn là snapshot + delta: subscribe delta trước và buffer lại, sau đó lấy snapshot có kèm sequence. Bỏ các delta có seq ≤ seq của snapshot, áp phần còn lại theo thứ tự.

Từ đó trở đi, mỗi delta phải đúng bằng last + 1. Nhỏ hơn hoặc bằng là duplicate (do retry hoặc reconnect) nên bỏ qua; nhờ vậy việc apply là idempotent. Lớn hơn là có gap. Khi đó không đoán dữ liệu thiếu, mà đánh dấu book là stale trên UI, tiếp tục buffer và resync bằng snapshot mới.

Với event như cập nhật lệnh, dedupe theo event id và giữ version cho từng order, để trạng thái "partially filled" đến muộn không ghi đè "filled".

Điểm senior: nói về chi phí snapshot. Gap xảy ra thường xuyên thì nên đề xuất backend hỗ trợ replay từ sequence, giới hạn độ sâu snapshot, và đặt alert cho tần suất resync.`,
    technicalExplanation: `### Where ordering breaks
- **Within one WebSocket:** TCP preserves byte order, so messages arrive in the order the server sent them.
- **Across channels:** a REST snapshot and a WebSocket delta stream are two independent connections, so the snapshot can be older or newer than the first delta you receive.
- **Across reconnects and nodes:** a new connection may land on a different gateway with its own lag, and messages sent around the disconnect may be lost or replayed.
- **Server clocks are not sequence numbers.** Timestamps from different machines drift, so use a monotonic per-stream \`seq\` (or \`lastUpdateId\`).

### Snapshot + delta algorithm
1. Subscribe to deltas and **buffer** them while not ready.
2. Fetch a snapshot with \`seq = N\`.
3. Discard buffered deltas with \`seq <= N\`. The first remaining one should be \`N + 1\`; if not, the snapshot is too old, so fetch again.
4. Apply in order. For each new delta:
   - \`seq <= last\`: duplicate or stale, **drop** (idempotent).
   - \`seq === last + 1\`: **apply**.
   - \`seq > last + 1\`: **gap**. Mark stale, keep buffering, resync.

Many exchange APIs document this exact pattern for depth streams, so interviewers will recognize it.

### Order and account events
- Dedupe by \`eventId\`. A bounded LRU of recent ids is enough.
- Keep a **version per entity** (\`orderId -> version\`) and ignore older versions. That protects against out-of-order delivery between REST responses and stream events, for example the POST response arriving after the "filled" event.
- Model order status as a state machine so illegal transitions (\`filled\` back to \`working\`) are rejected and logged.

### Failure scenarios
- **Resync loop:** a gap appears, the snapshot is fetched but already stale, another gap appears. Fix it with buffering during the fetch, retries with backoff and a max attempt count before showing a hard error.
- **Silent corruption:** applying deltas over a gap leaves phantom price levels that never get removed. That's the worst case, which is why you never apply across a gap.
- **Floating-point keys:** using \`1.1 + 0.2\`-style computed prices as map keys creates near-duplicate levels. Key by integer ticks or the server's string price.

### Performance and scalability
- Resyncing a deep book costs bandwidth and a burst of work. Limit depth to what's rendered (for example the top 20–50 levels), or ask for **replay from sequence**, which is cheaper than a full snapshot.
- Track metrics such as gaps per hour, resync duration and time spent stale. Frequent gaps usually point at backend or network problems.`,
    practicalExample: {
      description: {
        en: "An order-book side keeper that buffers deltas until the snapshot arrives, drops duplicates, detects gaps and triggers a resync without ever applying data across a gap.",
        vi: "Một order book buffer delta cho đến khi có snapshot, bỏ duplicate, phát hiện gap và kích hoạt resync, không bao giờ apply dữ liệu vượt qua gap.",
      },
      code: {
        language: "ts",
        code: `type Delta = { seq: number; side: "bid" | "ask"; priceTicks: number; size: number };
type Snapshot = { seq: number; bids: [number, number][]; asks: [number, number][] };

export class SequencedBook {
  private lastSeq = -1;
  private ready = false;
  private buffer: Delta[] = [];
  readonly bids = new Map<number, number>(); // priceTicks -> size (integer keys, no float drift)
  readonly asks = new Map<number, number>();

  constructor(private readonly requestSnapshot: () => void, private readonly onStale: (stale: boolean) => void) {}

  onDelta(d: Delta): void {
    if (!this.ready) { this.buffer.push(d); return; }    // waiting for snapshot
    if (d.seq <= this.lastSeq) return;                      // duplicate / stale: drop
    if (d.seq !== this.lastSeq + 1) {                        // gap: never guess
      this.resync();
      this.buffer.push(d);
      return;
    }
    const book = d.side === "bid" ? this.bids : this.asks;
    if (d.size === 0) book.delete(d.priceTicks); else book.set(d.priceTicks, d.size);
    this.lastSeq = d.seq;
  }

  onSnapshot(s: Snapshot): void {
    this.bids.clear(); this.asks.clear();
    for (const [p, q] of s.bids) this.bids.set(p, q);
    for (const [p, q] of s.asks) this.asks.set(p, q);
    this.lastSeq = s.seq;
    this.ready = true;
    this.onStale(false);
    const pending = this.buffer.filter((d) => d.seq > s.seq).sort((a, b) => a.seq - b.seq);
    this.buffer = [];
    for (const d of pending) this.onDelta(d); // replay through the same checks
  }

  private resync(): void {
    this.ready = false;
    this.buffer = [];
    this.onStale(true);    // UI greys out the book
    this.requestSnapshot(); // deltas keep buffering meanwhile
  }
}`,
      },
    },
    diagram: {
      kind: "sequence",
      code: `sequenceDiagram
  participant B as Book client
  participant W as WS stream
  participant R as REST snapshot
  B->>W: subscribe deltas for symbol
  W-->>B: delta 101 buffered
  W-->>B: delta 102 buffered
  B->>R: GET snapshot
  R-->>B: snapshot seq 101
  Note over B: drop deltas up to 101, apply 102
  W-->>B: delta 103 applied
  W-->>B: delta 103 again, duplicate dropped
  W-->>B: delta 105, gap detected
  Note over B: mark stale and keep buffering
  B->>R: GET snapshot
  R-->>B: snapshot seq 106
  Note over B: replay buffered deltas above 106, back to live`,
      caption: {
        en: "Snapshot plus delta: buffer first, align on the snapshot's sequence, drop duplicates, and resync instead of guessing when a gap appears.",
        vi: "Snapshot + delta: buffer trước, căn theo sequence của snapshot, bỏ duplicate, và resync thay vì đoán khi có gap.",
      },
    },
    memoryShortcut: {
      en: "Lower: drop. Next: apply. Higher: resync. Snapshot first, never guess.",
      vi: "Nhỏ hơn: bỏ. Kế tiếp: áp. Lớn hơn: resync. Snapshot trước, không bao giờ đoán.",
    },
    keyTakeaway: {
      en: "Sequence numbers turn a stream into a verifiable log: duplicates are dropped, gaps trigger a snapshot resync, and the UI shows stale instead of showing wrong data.",
      vi: "Sequence number biến stream thành một log kiểm chứng được: duplicate bị bỏ, gap kích hoạt resync snapshot, và UI hiển thị stale thay vì hiển thị dữ liệu sai.",
    },
    followUps: [
      {
        id: "isb-q04-f1",
        question: {
          en: "The POST /orders response and the 'order filled' stream event can arrive in either order. How do you reconcile?",
          vi: "Response của POST /orders và event 'order filled' trên stream có thể đến theo bất kỳ thứ tự nào. Bạn reconcile thế nào?",
        },
        answer: {
          en: "I key everything by a client-generated order id that I send with the request, so both sources describe the same entity from the start. Each update carries a server version or sequence, and the store applies an update only if its version is newer than what we hold. If the stream says filled at version 3 and the REST response arrives later at version 1, the response is ignored. Status changes also go through a state machine, so a terminal state like filled or cancelled can't regress. The UI shows pending until the first authoritative update arrives from either side.",
          vi: "Mình dùng client-generated order id gửi kèm request làm khoá chung, nên cả hai nguồn mô tả cùng một entity ngay từ đầu. Mỗi update có version hoặc sequence từ server, và store chỉ áp update có version mới hơn cái đang giữ. Nếu stream báo filled ở version 3 mà response REST đến sau với version 1 thì response bị bỏ qua. Thay đổi trạng thái cũng đi qua state machine, nên trạng thái cuối như filled hay cancelled không thể quay ngược. UI hiển thị pending cho đến khi có update chính thức đầu tiên từ bất kỳ phía nào.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement: "Trade capture and execution workflows over high-frequency data streams",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "No production order-book or market-data protocol experience. Frame it as the industry-standard pattern you'd apply, and ask the interviewer how their Rust/Python backend sequences streams.",
        vi: "Chưa có kinh nghiệm production với order book hay giao thức market data. Trình bày như pattern chuẩn của ngành mà bạn sẽ áp dụng, và hỏi lại interviewer backend Rust/Python của họ gán sequence cho stream thế nào.",
      },
    },
    tags: ["ordering", "sequence-numbers", "snapshot-delta", "deduplication", "order-book"],
  },

  /* ------------------------------------------------------------------ */
  /* Q05 — Backpressure                                                  */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q05",
    number: 5,
    topicId: "realtime",
    question: {
      en: "The server sends data faster than the client can process it. How do you detect backpressure, and what strategies do you use?",
      vi: "Server gửi dữ liệu nhanh hơn khả năng xử lý của client. Bạn phát hiện backpressure như thế nào và có những chiến lược gì?",
    },
    answer: `Backpressure in the browser is tricky because the standard WebSocket API has none on the receive side. onmessage fires for every message, and the queue just grows in memory until the tab janks or crashes. So I treat it as detect-and-react, across both client and server.

For detection I track three signals. One is inbound queue depth. Another is end-to-end lag: the server timestamp on each message compared with local time, corrected by a clock offset. The third is main-thread health, from long-task observers and dropped frames. A single spike isn't overload. I act when it lasts, say, half a second.

Then the strategies, from cheapest to most drastic. First, process with a time budget per frame and conflate lossy data, so the latest price per symbol wins. Lossless data like fills and order states is never dropped. Second, reduce demand: unsubscribe symbols that are off-screen or in hidden tabs, and move parsing into a worker. Third, tell the server to switch the subscription to a throttled or conflated mode, for example a few updates per second per symbol. Ideally the protocol supports credit-based flow control, where the client acknowledges batches. Fourth, as a last resort, drop the stream and resync from a snapshot rather than show data that's seconds behind.

The server needs its own guard too: bounded per-client queues and slow-consumer handling, so one slow browser can't hurt the gateway.`,
    viExplanation: `Điểm mấu chốt: WebSocket API chuẩn trên trình duyệt không có backpressure ở chiều nhận. onmessage được gọi cho mọi message, hàng đợi cứ phình ra trong bộ nhớ cho đến khi tab bị giật hoặc crash. Vì vậy phải chủ động "phát hiện rồi phản ứng" ở cả client lẫn server.

Phát hiện dựa trên ba tín hiệu: độ dài hàng đợi đầu vào, độ trễ end-to-end (timestamp của server so với giờ local đã hiệu chỉnh clock offset), và sức khoẻ main thread (long task, frame bị rớt). Chỉ phản ứng khi quá tải kéo dài, không phản ứng với một spike đơn lẻ.

Chiến lược từ nhẹ đến nặng: (1) xử lý theo time budget mỗi frame và conflate dữ liệu "lossy" như giá; dữ liệu "lossless" như fill và trạng thái lệnh thì tuyệt đối không bỏ. (2) Giảm nhu cầu: unsubscribe symbol ngoài màn hình hoặc ở tab ẩn, chuyển parse sang worker. (3) Báo server giảm tốc: đổi sang chế độ throttled/conflated, hoặc dùng flow control dạng credit (client ack theo batch). (4) Cuối cùng: bỏ stream và resync bằng snapshot, còn hơn hiển thị dữ liệu trễ vài giây.

Đừng quên phía server cũng cần hàng đợi có giới hạn cho từng client và xử lý slow consumer.`,
    technicalExplanation: `### Why the browser has no natural backpressure
- The network stack reads from the socket and queues a \`message\` task for every frame. JavaScript can't say "stop reading", so TCP flow control never kicks in and data piles up in memory, in the event-loop task queue and your own buffers.
- \`WebSocket.bufferedAmount\` only covers the **send** side.
- \`WebSocketStream\` exposes a ReadableStream with real backpressure, but so far only Chromium implements it, so cross-browser production code needs application-level strategies.

### Detecting overload
- **Queue depth:** the number of unprocessed messages in your own buffer, measured after each drain.
- **Lag:** \`now + clockOffset - msg.serverTs\`. Estimate the clock offset from heartbeat round-trips. Lag that rises steadily is the clearest overload signal.
- **Main thread:** \`PerformanceObserver\` for \`longtask\` (over 50 ms), frame timing, and INP regressions.
- **Hysteresis:** enter degraded mode after sustained overload and leave it only after sustained health, so the system doesn't oscillate.

### Strategies, cheapest first
1. **Time-budgeted draining:** process the queue for a few ms per frame and leave the rest for the next frame.
2. **Classify data:** *lossy* data (prices, quotes) can be conflated or sampled. *Lossless* data (trades for volume, fills, order states) must be kept or aggregated.
3. **Reduce demand:** viewport-driven subscriptions (only visible rows), pausing hidden tabs, and coarser chart resolution.
4. **Move work off the main thread:** parse and conflate in a worker (Q6), and use binary formats to cut parse cost.
5. **Upstream flow control:** ask the server to throttle (\`maxUpdatesPerSec\`), switch to a conflated channel, or use **credit-based** flow, where the server sends N messages and waits for an ack before sending more.
6. **Circuit-break:** drop the stream, show stale, and resync from a snapshot.

### The server side
- Keep a bounded outbound queue per connection. When it fills, conflate per key, downgrade the client to a slower tier, or disconnect it with a "slow consumer" close code.
- Never let one slow client block a fan-out loop shared with others.

### Failure scenarios
- **Hidden tab:** \`requestAnimationFrame\`-driven draining stops, so pause subscriptions or switch to a timer-based drain with conflation.
- **Dropping the wrong thing:** conflating fills corrupts positions. Keep the lossy/lossless split explicit in the message types.
- **Oscillation:** throttle on, healthy, throttle off, overloaded again. Hysteresis and cooldowns prevent this.

### Maintainability
Put the backpressure policy in the data layer, not in components, and expose metrics such as queue depth, lag and mode so you can see degradations in RUM dashboards.`,
    practicalExample: {
      description: {
        en: "A time-budgeted drain loop that measures queue depth and lag, enters throttled mode with hysteresis, asks the server to slow down, and conflates only lossy messages.",
        vi: "Vòng drain có time budget, đo độ dài hàng đợi và độ trễ, vào chế độ throttled có hysteresis, yêu cầu server giảm tốc, và chỉ conflate các message lossy.",
      },
      code: {
        language: "ts",
        code: `type Msg = { kind: "price" | "fill"; key: string; serverTs: number; body: unknown };
declare const ws: WebSocket;
declare const clockOffsetMs: number; // estimated from heartbeat round-trips
declare function handle(m: Msg): void;

let queue: Msg[] = [];
let mode: "full" | "throttled" = "full";
let badFrames = 0;
let goodFrames = 0;

ws.onmessage = (e) => queue.push(JSON.parse(e.data as string) as Msg);

function drain(): void {
  const start = performance.now();
  let i = 0;
  while (i < queue.length && performance.now() - start < 6) handle(queue[i++]); // ~6 ms budget
  queue = queue.slice(i);

  const lagMs = queue.length ? Date.now() + clockOffsetMs - queue[0].serverTs : 0;
  const overloaded = queue.length > 2_000 || lagMs > 500;
  badFrames = overloaded ? badFrames + 1 : 0;
  goodFrames = overloaded ? 0 : goodFrames + 1;

  if (mode === "full" && badFrames > 30) {           // ~0.5 s sustained at 60 fps
    mode = "throttled";
    ws.send(JSON.stringify({ op: "set-rate", maxUpdatesPerSec: 4 }));
    queue = conflateLossy(queue);
  } else if (mode === "throttled" && goodFrames > 600) { // ~10 s healthy: hysteresis
    mode = "full";
    ws.send(JSON.stringify({ op: "set-rate", maxUpdatesPerSec: null }));
  }
  requestAnimationFrame(drain);
}

function conflateLossy(msgs: Msg[]): Msg[] {
  const latest = new Map<string, Msg>();
  const lossless: Msg[] = [];
  for (const m of msgs) {
    if (m.kind === "fill") lossless.push(m); // never drop business events
    else latest.set(m.key, m);               // latest price per key wins
  }
  return [...lossless, ...latest.values()];
}

requestAnimationFrame(drain);`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  SQ["Server per-client queue, bounded"] --> WS["WebSocket"]
  WS --> IQ["Client inbound queue"]
  IQ --> D["Drain with time budget per frame"]
  D --> ST["Store and render"]
  D --> MON{"Queue depth or lag over threshold, sustained?"}
  MON -->|no| D
  MON -->|yes| CF["Conflate lossy, keep fills"]
  MON -->|yes| RD["Unsubscribe off-screen symbols"]
  MON -->|yes| SR["Send set-rate to server"]
  SR --> SQ
  MON -->|"still failing"| RS["Drop stream, resync snapshot"]`,
      caption: {
        en: "A closed feedback loop: measure depth and lag, then degrade locally first (conflate, reduce demand) and push the signal upstream (set-rate) before falling back to a resync.",
        vi: "Một vòng phản hồi khép kín: đo độ dài hàng đợi và độ trễ, xử lý tại chỗ trước (conflate, giảm nhu cầu), rồi đẩy tín hiệu ngược lên server (set-rate), cuối cùng mới resync.",
      },
    },
    memoryShortcut: {
      en: "M-D-T-R: Measure (depth, lag), Degrade (conflate lossy), Tell the server (throttle), Resync as last resort.",
      vi: "M-D-T-R: Measure (đo depth, lag), Degrade (conflate dữ liệu lossy), Tell server (throttle), Resync là phương án cuối.",
    },
    keyTakeaway: {
      en: "The browser won't push back for you, so build an explicit loop: measure lag, degrade lossy data locally, signal the server, and resync rather than show stale data.",
      vi: "Trình duyệt không tự backpressure giúp bạn, nên phải xây một vòng rõ ràng: đo độ trễ, giảm cấp dữ liệu lossy tại client, báo server, và resync thay vì hiển thị dữ liệu cũ.",
    },
    followUps: [
      {
        id: "isb-q05-f1",
        question: {
          en: "How would you design credit-based flow control between the browser and the gateway?",
          vi: "Bạn thiết kế flow control dạng credit giữa trình duyệt và gateway thế nào?",
        },
        answer: {
          en: "The client opens with a window, say 200 messages of credit. The gateway decrements credit as it sends and stops when it hits zero, conflating anything lossy per key in the meantime. After processing a batch, the client sends an ack that grants more credit, so the send rate automatically matches the client's real processing speed. Lossless events can bypass the window or get a reserved budget so fills are never delayed behind prices. The cost is protocol complexity and one extra message per batch, so I'd only do it for high-volume channels and keep a simple max-rate parameter for the rest.",
          vi: "Client mở kết nối với một cửa sổ credit, ví dụ 200 message. Gateway trừ credit mỗi lần gửi và dừng khi về 0, trong lúc đó conflate dữ liệu lossy theo key. Sau khi xử lý xong một batch, client gửi ack để cấp thêm credit, nên tốc độ gửi tự khớp với tốc độ xử lý thực của client. Event lossless có thể đi ngoài cửa sổ hoặc có ngân sách riêng để fill không bao giờ bị chờ sau giá. Đổi lại là protocol phức tạp hơn và thêm một message mỗi batch, nên mình chỉ dùng cho kênh khối lượng lớn, còn các kênh khác chỉ cần tham số max-rate đơn giản.",
        },
      },
      {
        id: "isb-q05-f2",
        question: {
          en: "How do you measure lag correctly when client and server clocks differ?",
          vi: "Làm sao đo độ trễ chính xác khi đồng hồ client và server lệch nhau?",
        },
        answer: {
          en: "I estimate the clock offset the way NTP does. The client sends a ping with its send time, the server replies with its own timestamp, and the client records the receive time. The offset is roughly the server time minus the midpoint of send and receive. I keep a moving estimate using the samples with the lowest round-trip time, since those have the least noise. Lag is then local now plus offset, minus the message's server timestamp. Trend matters more than the absolute value: steadily rising lag means we're falling behind, even if the offset is a few milliseconds off.",
          vi: "Mình ước lượng clock offset giống cách NTP làm. Client gửi ping kèm thời điểm gửi, server trả về timestamp của nó, client ghi lại thời điểm nhận. Offset xấp xỉ bằng giờ server trừ điểm giữa của thời điểm gửi và nhận. Mình giữ một ước lượng động dựa trên các mẫu có round-trip thấp nhất, vì chúng ít nhiễu nhất. Độ trễ khi đó bằng giờ local cộng offset, trừ timestamp server của message. Xu hướng quan trọng hơn giá trị tuyệt đối: độ trễ tăng đều nghĩa là client đang tụt lại, kể cả khi offset lệch vài mili giây.",
        },
      },
    ],
    difficulty: "expert",
    priority: "high",
    jdRequirement: "Turn high-frequency data streams from Rust/Python backends into fluid UIs",
    candidateExperience: {
      kind: "theoretical",
      note: {
        en: "Theoretical knowledge, not production experience. Say so plainly, then show depth: the missing browser backpressure, lossy vs lossless data, and server-side slow-consumer handling.",
        vi: "Đây là kiến thức lý thuyết, không phải kinh nghiệm production. Nói rõ điều đó, sau đó thể hiện chiều sâu: trình duyệt không có backpressure, phân biệt dữ liệu lossy và lossless, và xử lý slow consumer phía server.",
      },
    },
    tags: ["backpressure", "flow-control", "conflation", "performance", "websocket"],
  },

  /* ------------------------------------------------------------------ */
  /* Q06 — Web Workers / SharedWorker                                    */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q06",
    number: 6,
    topicId: "realtime",
    question: {
      en: "When and how would you move stream parsing and aggregation into a Web Worker or SharedWorker? How do transferables help, and how do you share one connection across tabs?",
      vi: "Khi nào và bằng cách nào bạn chuyển việc parse và aggregate stream sang Web Worker hoặc SharedWorker? Transferable giúp gì, và làm sao dùng chung một kết nối cho nhiều tab?",
    },
    answer: `The main thread is shared by everything: React rendering, input handling, layout. Every millisecond spent in JSON.parse or aggregation is a millisecond the user feels. So once profiling shows the data pipeline eating into frame time, I move it into a worker.

WebSocket is available inside workers, so the worker owns the connection. It parses, validates, conflates and aggregates, then posts one compact batch to the main thread per frame. Main-thread work shrinks to "apply batch, render".

Two details matter. First, postMessage uses structured clone, which copies, and large object graphs are expensive to copy. For numeric data I use typed arrays and transfer the ArrayBuffer, which moves ownership without a copy. Second, I batch. Posting once per tick just moves the bottleneck into the message channel.

For multiple tabs, a SharedWorker lets every tab share one WebSocket. A ref-counted subscription registry means a symbol is subscribed once and unsubscribed when the last tab stops needing it. That cuts server connections and keeps tabs consistent.

The trade-offs: SharedWorker support on mobile is recent (Chrome for Android only re-enabled it in 2026) and mobile browsers can terminate it unpredictably, so I'd keep a fallback: a dedicated worker per tab, or a leader tab elected with the Web Locks API that broadcasts over BroadcastChannel. Workers also make debugging, error handling and token passing harder. That's why I wait for profiling data before introducing them, rather than adding them by default.`,
    viExplanation: `Main thread phải lo mọi thứ: React render, xử lý input, layout. Mỗi mili giây tốn cho JSON.parse hay aggregate là mili giây người dùng cảm nhận được. Khi profiling cho thấy pipeline dữ liệu chiếm frame time, hãy chuyển nó sang worker.

WebSocket dùng được trong worker, nên worker sở hữu kết nối: parse, validate, conflate, aggregate, rồi post một batch gọn về main thread mỗi frame. Main thread chỉ còn "apply batch, render".

Hai chi tiết quan trọng. (1) postMessage dùng structured clone, tức là copy; object lớn copy rất tốn. Với dữ liệu số, dùng typed array và transfer ArrayBuffer: chuyển quyền sở hữu, không copy (zero-copy), và worker mất quyền truy cập buffer đó. (2) Phải batch; post từng tick chỉ chuyển nút thắt sang kênh message.

Với nhiều tab, SharedWorker cho phép các tab dùng chung một WebSocket, kèm subscription registry có ref-count: mỗi symbol chỉ subscribe một lần, unsubscribe khi tab cuối cùng không cần nữa.

Trade-off: SharedWorker trên mobile mới được hỗ trợ gần đây (Chrome Android đến năm 2026 mới bật lại) và có thể bị trình duyệt mobile dừng bất ngờ, nên vẫn cần fallback là dedicated worker mỗi tab, hoặc bầu "leader tab" bằng Web Locks API và phát dữ liệu qua BroadcastChannel. Worker cũng làm debug, xử lý lỗi và truyền token phức tạp hơn, nên chỉ đưa vào khi có số liệu profiling.`,
    technicalExplanation: `### What a worker buys you
- A worker runs on its own thread with its own event loop. CPU-heavy work there (parsing, validation, aggregation, indicator maths) can't block input or rendering on the main thread.
- Workers can use \`WebSocket\`, \`fetch\`, \`IndexedDB\` and timers, but not the DOM. With \`OffscreenCanvas\`, a worker can even draw charts.

### The cost of crossing threads
- \`postMessage\` uses **structured clone**, a deep copy whose cost is roughly proportional to the size of the object graph. Many small objects are the worst case.
- **Transferables** (\`ArrayBuffer\`, \`MessagePort\`, \`ImageBitmap\`, \`OffscreenCanvas\`) move ownership instead of copying. After the transfer the sender's buffer is detached (\`byteLength === 0\`).
- Columnar typed arrays (\`Float64Array\` of prices, \`Uint32Array\` of symbol ids) are cheap to transfer and cheap to iterate. Send a symbol dictionary once, then only send indices.
- **Batch per frame.** Thousands of postMessage calls per second each schedule a task on the receiver. Send one message per frame instead.
- \`SharedArrayBuffer\` avoids messages entirely but requires cross-origin isolation (COOP/COEP headers) and careful synchronization with \`Atomics\`.

### One connection for many tabs
- A **SharedWorker** is one instance per origin, script URL and name, and each tab connects through a \`MessagePort\`.
- A transferred buffer can only go to **one** receiver. To fan a batch out to several tabs, post it to each port (structured clone) or build a separate buffer per tab.
- The worker keeps \`Map<topic, Set<port>>\`. The first subscriber sends the upstream subscribe and the last one to leave sends unsubscribe.
- Detecting closed tabs is awkward: there's no cross-browser "port closed" event, so tabs send an explicit goodbye on \`pagehide\` plus periodic pings.
- **Fallbacks:** SharedWorker on mobile is recent (Chrome for Android re-enabled it only in 2026) and its lifetime there is less predictable. The alternative is leader election with \`navigator.locks.request\`. The lock holder opens the socket and rebroadcasts over \`BroadcastChannel\`, and when that tab closes the lock is released and another tab takes over.

### Failure scenarios
- Worker crashes or throws: listen to \`error\` and \`messageerror\`, restart the worker and resync.
- Auth: the worker has no access to \`localStorage\`, so pass tokens via postMessage or rely on cookies for same-origin WebSocket handshakes.
- Debugging and source maps are harder, and some bundler setups need \`new URL("./x.worker.ts", import.meta.url)\` to emit the worker chunk.
- Over-engineering: if parsing takes 1 ms per frame, a worker adds complexity for no visible gain.

### When to do it
Profile first. If long tasks show JSON parsing, validation or aggregation, and conflation plus virtualization aren't enough, introduce a dedicated worker. Add a SharedWorker when users commonly open several tabs and connection count or consistency across tabs matters.`,
    practicalExample: {
      description: {
        en: "A dedicated worker owns the WebSocket, conflates ticks, and transfers a Float64Array of prices to the main thread once per frame. The main thread only applies the batch.",
        vi: "Một dedicated worker sở hữu WebSocket, conflate tick, và transfer một Float64Array giá về main thread mỗi frame. Main thread chỉ việc apply batch.",
      },
      code: {
        language: "ts",
        code: `// ---------- market.worker.ts: owns the socket, runs off the main thread ----------
type Tick = { s: string; p: number };
const latest = new Map<string, number>();
const ctx = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<{ type: "connect"; url: string }>) => {
  const ws = new WebSocket(e.data.url);
  ws.onmessage = (m) => {
    for (const t of JSON.parse(m.data as string) as Tick[]) latest.set(t.s, t.p); // parse + conflate here
  };
};

setInterval(() => { // ~one batch per frame instead of one message per tick
  if (latest.size === 0) return;
  const symbols = [...latest.keys()];
  const prices = Float64Array.from(latest.values());
  latest.clear();
  ctx.postMessage({ symbols, prices }, [prices.buffer]); // transfer: zero-copy, buffer detached here
}, 16);

// ---------- main thread ----------
declare const priceStore: { applyBatch(symbols: string[], prices: Float64Array): void };

const worker = new Worker(new URL("./market.worker.ts", import.meta.url), { type: "module" });
worker.postMessage({ type: "connect", url: "wss://api.example.com/marketdata" });
worker.onmessage = (e: MessageEvent<{ symbols: string[]; prices: Float64Array }>) => {
  priceStore.applyBatch(e.data.symbols, e.data.prices); // one store update per batch
};
worker.onerror = () => {
  worker.terminate(); // in real code: recreate the worker and resync from a snapshot
};`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  subgraph Tabs["Browser tabs, same origin"]
    T1["Tab 1 watchlist"]
    T2["Tab 2 chart"]
    T3["Tab 3 blotter"]
  end
  T1 -->|"MessagePort"| SW["SharedWorker"]
  T2 -->|"MessagePort"| SW
  T3 -->|"MessagePort"| SW
  SW --> REG["Ref-counted subscription registry"]
  SW --> PARSE["Parse, validate, conflate"]
  REG --> WS["Single WebSocket"]
  WS --> GW["Market data gateway"]
  PARSE -->|"one batch per frame, per tab"| T1
  PARSE --> T2
  PARSE --> T3`,
      caption: {
        en: "One SharedWorker owns the only WebSocket, ref-counts subscriptions across tabs, and does the heavy parsing. Tabs receive compact per-frame batches.",
        vi: "Một SharedWorker giữ WebSocket duy nhất, ref-count subscription giữa các tab và làm phần parse nặng. Các tab nhận batch gọn theo từng frame.",
      },
    },
    memoryShortcut: {
      en: "Worker = Owns socket, Parses, Batches, Transfers (O-P-B-T). Clone copies, transfer moves.",
      vi: "Worker = Owns socket, Parses, Batches, Transfers (O-P-B-T). Clone thì copy, transfer thì chuyển quyền sở hữu.",
    },
    keyTakeaway: {
      en: "Move the data pipeline off the main thread only when profiling says so, then batch per frame and transfer typed arrays so crossing threads stays cheap.",
      vi: "Chỉ chuyển pipeline dữ liệu khỏi main thread khi profiling chứng minh cần thiết, sau đó batch theo frame và transfer typed array để việc qua lại giữa các thread luôn rẻ.",
    },
    followUps: [
      {
        id: "isb-q06-f1",
        question: {
          en: "Would you use SharedArrayBuffer instead of postMessage?",
          vi: "Bạn có dùng SharedArrayBuffer thay cho postMessage không?",
        },
        answer: {
          en: "Only for a measured need. SharedArrayBuffer gives true shared memory, for example a ring buffer of prices the worker writes and the main thread reads with no message overhead. But it requires cross-origin isolation through COOP and COEP headers, which can break third-party embeds, OAuth popups and some analytics scripts. You also have to handle synchronization yourself with Atomics or a sequence-lock pattern to avoid torn reads. For most dashboards, one transferred typed array per frame is fast enough and far simpler, so I'd start there and benchmark before reaching for shared memory.",
          vi: "Chỉ khi có nhu cầu đã đo đạc rõ ràng. SharedArrayBuffer cho bộ nhớ chia sẻ thật, ví dụ một ring buffer giá do worker ghi và main thread đọc mà không tốn chi phí message. Nhưng nó yêu cầu cross-origin isolation qua header COOP và COEP, điều này có thể làm hỏng embed bên thứ ba, popup OAuth và một số script analytics. Bạn còn phải tự đồng bộ bằng Atomics hoặc pattern sequence-lock để tránh đọc dữ liệu ghi dở. Với đa số dashboard, transfer một typed array mỗi frame là đủ nhanh và đơn giản hơn nhiều, nên mình bắt đầu từ đó và benchmark trước khi dùng shared memory.",
        },
      },
    ],
    difficulty: "hard",
    priority: "high",
    jdRequirement: "Optimize browser rendering performance for large datasets and high-frequency updates",
    candidateExperience: {
      kind: "recommended-approach",
      note: {
        en: "No production worker-based streaming pipeline in the profile. Present it as the design you'd propose after profiling, and be ready to discuss the SharedWorker mobile-support caveat.",
        vi: "Hồ sơ không có pipeline streaming dùng worker trên production. Trình bày như thiết kế bạn sẽ đề xuất sau khi profiling, và chuẩn bị nói về hạn chế hỗ trợ SharedWorker trên mobile.",
      },
    },
    tags: ["web-worker", "sharedworker", "transferables", "multi-tab", "performance"],
  },

  /* ------------------------------------------------------------------ */
  /* Q07 — Heartbeats, stale data, connection-status UX                  */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q07",
    number: 7,
    topicId: "realtime",
    question: {
      en: "How do you use heartbeats to detect dead connections and stale data, and how should a financial UI communicate connection status to users?",
      vi: "Bạn dùng heartbeat để phát hiện kết nối chết và dữ liệu cũ như thế nào, và UI tài chính nên thể hiện trạng thái kết nối cho người dùng ra sao?",
    },
    answer: `In a trading UI, a stale price shown as if it were live is worse than no price at all, because someone might trade on it. So I separate three questions: is the connection alive, is each stream fresh, and what does the user see.

For liveness, I don't trust the close event. A half-open TCP connection, for example after a laptop sleeps or a NAT drops the mapping, can look open for minutes. So I use application-level heartbeats. The server sends one every few seconds, or the client pings. If nothing arrives within two or three intervals, I abandon the socket and reconnect right away. Heartbeats that carry a server timestamp also give me latency and clock offset.

For freshness, the connection can be alive while one feed is dead, and an illiquid instrument can legitimately be quiet. So I track last-update time per stream against its expected cadence. Ideally the server sends per-channel heartbeats, so "quiet market" and "broken feed" look different.

For UX, I'd show a global status (live, delayed, reconnecting, offline) plus per-widget staleness: greyed-out prices with an "as of" time. Most importantly, order entry is blocked, or needs explicit confirmation, while prices are stale.

For accessibility, status changes go to a polite aria-live region. That means transitions only, never every tick, which builds on the WCAG and ARIA work I did at Persefoni.`,
    viExplanation: `Trong UI trading, hiển thị giá cũ như thể đang live còn tệ hơn không hiển thị gì, vì người dùng có thể đặt lệnh dựa trên giá đó. Hãy tách ba câu hỏi: kết nối còn sống không, từng stream còn "tươi" không, và người dùng nhìn thấy gì.

(1) Liveness: đừng tin vào sự kiện close. Kết nối TCP half-open (máy ngủ, NAT xoá mapping) có thể trông như vẫn mở trong nhiều phút. Vì vậy cần heartbeat ở tầng ứng dụng: server gửi định kỳ hoặc client ping; quá 2–3 chu kỳ không nhận được gì thì bỏ socket và reconnect ngay. Heartbeat có timestamp server còn giúp đo latency và clock offset.

(2) Freshness: kết nối sống nhưng một feed có thể đã chết, còn mã ít thanh khoản thì im lặng là bình thường. Theo dõi thời điểm cập nhật cuối của từng stream so với nhịp kỳ vọng; tốt nhất là có heartbeat theo từng channel để phân biệt "thị trường yên" với "feed hỏng".

(3) UX: badge trạng thái toàn cục (live, delayed, reconnecting, offline), mỗi widget có trạng thái stale riêng (làm mờ giá, hiển thị "as of" thời gian). Quan trọng nhất: chặn hoặc yêu cầu xác nhận khi đặt lệnh lúc giá đã cũ. Về accessibility, dùng vùng aria-live polite chỉ cho các lần chuyển trạng thái; phần này nối được với kinh nghiệm WCAG/ARIA thật ở Persefoni.`,
    technicalExplanation: `### Why the close event isn't enough
- TCP only notices a dead peer when it tries to send and retransmissions time out, which can take minutes. A connection where the peer vanished without a FIN (sleep, Wi-Fi switch, NAT or load-balancer idle timeout) is **half-open**: \`readyState\` stays \`OPEN\` and no \`close\` fires.
- Browsers answer protocol-level ping frames automatically, but JavaScript can't send or observe them. You need **application-level** heartbeats.

### Heartbeat design
- **Server-driven:** the server sends \`{type:"hb", ts}\` every N seconds on each connection, and ideally per channel. The client treats *any* message as proof of life and declares the connection dead after 2–3 missed intervals.
- **Client-driven:** the client sends \`ping\` and expects \`pong\`. This is useful when the server can't be changed, and also measures round-trip time.
- On timeout, **start a new connection immediately**. \`close()\` on a half-open socket can hang waiting for a close handshake that never comes, so don't wait for the close event.
- Heartbeats also keep intermediaries from closing idle connections. Many load balancers default to idle timeouts in the tens of seconds.

### Stale-data detection
- Track \`lastUpdateAt\` per stream or symbol and compare with the expected cadence. A liquid FX pair that's silent for 5 seconds is suspicious, while an illiquid bond may legitimately stay quiet for minutes.
- Per-channel server heartbeats separate "no trades" from "feed broken".
- Treat the gap between disconnect and fresh snapshot (Q2, Q4) as stale by definition.

### Browser quirks
- Timers in background tabs are throttled (to about once per second, and more aggressively after a tab has been hidden for a while), so heartbeat checks may run late. Re-check on \`visibilitychange\`, \`online\` and \`focus\`.
- \`navigator.onLine === false\` reliably means offline. \`true\` only means a network interface exists.

### UX for financial users
- **Global badge:** Live, Delayed, Reconnecting, Offline. Use text plus an icon, never colour alone (WCAG 1.4.1).
- **Per-widget staleness:** dim the values, show "as of 10:42:15", and pause flash animations.
- **Order safety:** disable submit or require explicit confirmation when the price feeding a ticket is stale. Show the reason next to the button.
- **Accessibility:** \`role="status"\` (polite live region) announces only transitions. Announcing ticks would flood screen-reader users.
- **Avoid flicker:** debounce brief blips (under about 1 s) so the badge doesn't flash on every minor hiccup.

### Observability
Report heartbeat timeouts, time-to-reconnect, time spent stale per session and resync counts to RUM. These are the numbers that tell you whether "real-time" is actually real-time for users.`,
    practicalExample: {
      description: {
        en: "A heartbeat watchdog that treats any message as proof of life and fails fast on half-open sockets, plus an accessible status badge and an order button that pauses while prices are stale.",
        vi: "Một watchdog heartbeat coi mọi message là dấu hiệu còn sống và phát hiện nhanh socket half-open, kèm badge trạng thái accessible và nút đặt lệnh tự tạm dừng khi giá đã cũ.",
      },
      code: {
        language: "tsx",
        code: `export type Health = "live" | "delayed" | "stale" | "offline";

/** Calls onDead without waiting for a close event that may never come (half-open TCP). */
export function startWatchdog(ws: WebSocket, onHealth: (h: Health) => void, onDead: () => void, everyMs = 5_000) {
  let lastSeen = Date.now();
  const touch = () => { lastSeen = Date.now(); };
  ws.addEventListener("message", touch); // ANY message proves liveness, not just pongs

  const check = () => {
    if (!navigator.onLine) return onHealth("offline");
    const silence = Date.now() - lastSeen;
    if (silence > everyMs * 3) { stop(); ws.close(4000, "heartbeat timeout"); onDead(); return; }
    onHealth(silence > everyMs * 1.5 ? "stale" : silence > everyMs ? "delayed" : "live");
    if (ws.readyState === WebSocket.OPEN) ws.send('{"op":"ping"}');
  };
  const id = setInterval(check, everyMs / 2);
  document.addEventListener("visibilitychange", check); // timers are throttled in hidden tabs
  function stop() {
    clearInterval(id);
    ws.removeEventListener("message", touch);
    document.removeEventListener("visibilitychange", check);
  }
  return stop;
}

const LABEL: Record<Health, string> = { live: "Live", delayed: "Delayed", stale: "Prices stale", offline: "Offline" };

export function ConnectionBadge({ health }: { health: Health }) {
  // role="status" = polite live region: announces transitions, not ticks
  return <span id="feed-status" role="status" data-health={health}>{LABEL[health]}</span>;
}

export function PlaceOrderButton({ health }: { health: Health }) {
  const paused = health === "stale" || health === "offline";
  return (
    <button type="submit" disabled={paused} aria-describedby="feed-status">
      {paused ? "Order entry paused: prices stale" : "Place order"}
    </button>
  );
}`,
      },
    },
    diagram: {
      kind: "flowchart",
      code: `flowchart LR
  LIVE["Live"] -->|"silence over 1 interval"| DEL["Delayed"]
  DEL -->|"message received"| LIVE
  DEL -->|"silence over 1.5 intervals"| STALE["Stale: order entry paused"]
  STALE -->|"silence over 3 intervals"| REC["Reconnecting"]
  REC -->|"socket open and fresh snapshot"| LIVE
  REC -->|"navigator offline"| OFF["Offline"]
  OFF -->|"online event"| REC`,
      caption: {
        en: "Connection health as explicit states: silence escalates from Delayed to Stale (which blocks trading) to Reconnecting, and only a fresh snapshot returns the UI to Live.",
        vi: "Sức khoẻ kết nối là các trạng thái rõ ràng: im lặng càng lâu thì chuyển từ Delayed sang Stale (chặn đặt lệnh) rồi Reconnecting, và chỉ snapshot mới đưa UI trở lại Live.",
      },
    },
    memoryShortcut: {
      en: "Alive, Fresh, Shown: heartbeat the pipe, timestamp the data, and never let stale look live.",
      vi: "Alive, Fresh, Shown: heartbeat cho đường truyền, timestamp cho dữ liệu, và không bao giờ để dữ liệu cũ trông như live.",
    },
    keyTakeaway: {
      en: "Detect dead connections with application heartbeats, detect stale data per stream, and make staleness visible and safe: grey out prices and pause order entry.",
      vi: "Phát hiện kết nối chết bằng heartbeat tầng ứng dụng, phát hiện dữ liệu cũ theo từng stream, và thể hiện trạng thái cũ một cách rõ ràng, an toàn: làm mờ giá và tạm dừng đặt lệnh.",
    },
    followUps: [
      {
        id: "isb-q07-f1",
        question: {
          en: "How do you avoid a flickering status badge on a flaky network?",
          vi: "Làm sao tránh badge trạng thái nhấp nháy liên tục khi mạng chập chờn?",
        },
        answer: {
          en: "I add hysteresis on both sides. Going from live to delayed needs a short grace period, so a one-second blip isn't shown at all. Going back to live needs the fresh snapshot plus a little stability, so the badge doesn't bounce between reconnecting and live on every flap. The safety logic is separate from the display logic: order entry checks the actual freshness timestamp synchronously at submit time, so debouncing the badge never makes trading unsafe. I'd also log the raw transitions to RUM, because the debounced UI hides exactly the flakiness we want to measure.",
          vi: "Mình thêm hysteresis cho cả hai chiều. Chuyển từ live sang delayed cần một khoảng ân hạn ngắn, nên chập chờn một giây sẽ không hiện ra. Quay lại live cần có snapshot mới cộng thêm một chút ổn định, để badge không nhảy qua lại giữa reconnecting và live mỗi lần mạng chập chờn. Logic an toàn tách riêng khỏi logic hiển thị: khi submit lệnh, hệ thống kiểm tra trực tiếp timestamp độ tươi của dữ liệu ngay lúc đó, nên việc debounce badge không bao giờ làm việc đặt lệnh kém an toàn. Mình cũng log các lần chuyển trạng thái gốc lên RUM, vì UI đã debounce sẽ che mất đúng độ chập chờn mà ta muốn đo.",
        },
      },
    ],
    difficulty: "medium",
    priority: "high",
    jdRequirement: "Accessible, low-latency dashboards that simplify financial workflows",
    candidateExperience: {
      company: "Persefoni",
      kind: "recommended-approach",
      note: {
        en: "The heartbeat and staleness design is applied knowledge. The accessibility part (ARIA, keyboard navigation, WCAG) connects to real Persefoni work, but don't claim you built a live-region status system there unless you did.",
        vi: "Thiết kế heartbeat và phát hiện dữ liệu cũ là kiến thức áp dụng. Phần accessibility (ARIA, keyboard navigation, WCAG) nối được với công việc thật ở Persefoni, nhưng đừng nhận đã làm hệ thống trạng thái bằng live region ở đó nếu không phải.",
      },
    },
    tags: ["heartbeat", "stale-data", "connection-status", "accessibility", "ux"],
  },
];
