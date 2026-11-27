import type { BehavioralQuestion } from "@/domain/package/schema";

/**
 * Section 10 — Behavioral (STAR) questions isb-q56..isb-q61.
 *
 * Grounding rules:
 * - Stories use ONLY the candidate's recorded experience (Persefoni, Ninja Van — TechLab, NAB).
 * - No invented numbers, percentages, timelines, team sizes, incidents or outcomes.
 * - "[fill in: …]" and "[if true: …]" are placeholders the candidate completes only with real facts.
 * - #59 (technical disagreement) is a theoretical template: no such story exists in the profile.
 */
export const isbBehavioral: BehavioralQuestion[] = [
  /* ------------------------------------------------------------------ */
  /* 56 — Challenging technical problem (Persefoni prefetching/caching)  */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q56",
    number: 56,
    question: {
      en: "Tell me about the most challenging technical problem you have solved recently.",
      vi: "Hãy kể về vấn đề kỹ thuật thách thức nhất mà bạn đã giải quyết gần đây.",
    },
    competency: "Technical problem solving",
    star: {
      situation: {
        en: "At Persefoni, I worked on the frontend of an enterprise carbon accounting platform built with React, TypeScript and GraphQL, using TanStack Query for server state. Many screens were data-heavy, and the natural weakness of data-heavy views is waiting on queries every time a user moves between them. The hard part was not just speed: people make reporting decisions on those numbers, so the UI had to feel instant without ever showing stale or inconsistent data. [fill in: the specific views or workflow involved]",
        vi: "Ở Persefoni, tôi làm frontend cho một nền tảng carbon accounting dành cho doanh nghiệp, dùng React, TypeScript, GraphQL và TanStack Query để quản lý server state. Nhiều màn hình chứa rất nhiều dữ liệu, và điểm yếu tự nhiên của kiểu màn hình này là người dùng phải chờ query mỗi lần chuyển view. Cái khó không chỉ là tốc độ: người dùng ra quyết định báo cáo dựa trên các con số đó, nên UI phải cho cảm giác tức thì nhưng tuyệt đối không được hiển thị dữ liệu cũ hoặc thiếu nhất quán. [điền: view hoặc luồng nghiệp vụ cụ thể]",
      },
      task: {
        en: "My part was background prefetching and caching for those views [confirm: your exact scope, e.g. which parts you designed versus implemented with the team]. That meant deciding what to prefetch and when, how long cached data could be treated as fresh, and how to keep the cache correct after users changed data. It also had to fit our existing GraphQL layer and stay simple enough that other engineers could follow the same pattern without having to understand every detail of the cache.",
        vi: 'Phần việc của tôi là background prefetching và caching cho các view đó [xác nhận: phạm vi chính xác, ví dụ phần nào bạn thiết kế, phần nào triển khai cùng team]. Cụ thể là quyết định prefetch cái gì và khi nào, dữ liệu trong cache được coi là còn "fresh" trong bao lâu, và làm sao giữ cache đúng sau khi người dùng thay đổi dữ liệu. Giải pháp cũng phải khớp với lớp GraphQL hiện có và đủ đơn giản để các kỹ sư khác áp dụng lại cùng pattern mà không cần hiểu hết mọi chi tiết của cache.',
      },
      action: {
        en: "I approached it in three parts. First, consistent query keys, so the same data is always cached under the same key and can be prefetched or invalidated predictably. Second, prefetching on intent: using queryClient.prefetchQuery for the views a user is most likely to open next, instead of prefetching everything and wasting bandwidth and backend capacity. Third, freshness rules: tuning staleTime per type of data and invalidating related queries after mutations, so speed never came at the cost of correctness. [fill in: the concrete triggers you used, e.g. route-level, hover/focus, or after the initial load]",
        vi: "Tôi chia thành ba phần. Thứ nhất, chuẩn hóa query key để cùng một dữ liệu luôn được cache dưới cùng một key, nhờ đó prefetch hay invalidate đều dự đoán được. Thứ hai, prefetch theo ý định người dùng: dùng queryClient.prefetchQuery cho những view người dùng nhiều khả năng mở tiếp theo, thay vì prefetch tất cả gây lãng phí băng thông và tải cho backend. Thứ ba, quy tắc về độ tươi của dữ liệu: chỉnh staleTime theo từng loại dữ liệu và invalidate các query liên quan sau mỗi mutation, để tốc độ không bao giờ đánh đổi bằng tính đúng đắn. [điền: trigger thực tế bạn đã dùng, ví dụ theo route, hover/focus, hoặc sau lần tải đầu]",
      },
      result: {
        en: "The effect of prefetching is that data for those views is often already in the cache when users navigate, and the invalidation rules are what keep edited numbers consistent. [if true: the query-key and prefetch conventions were reused on new screens] [if true: add the measured impact, e.g. before/after load timings]. For ISB, the same thinking applies to snapshot plus live-update data: be explicit about what is fresh, what is cached, and who invalidates it.",
        vi: "Tác dụng của prefetch là dữ liệu của các view đó thường đã có sẵn trong cache khi người dùng chuyển màn hình, còn quy tắc invalidate là thứ giữ số liệu nhất quán sau khi chỉnh sửa. [nếu đúng: quy ước query key và prefetch được dùng lại cho màn hình mới] [nếu đúng: bổ sung tác động đã đo được, ví dụ thời gian tải trước/sau]. Với ISB, tư duy này áp dụng thẳng cho mô hình snapshot cộng live update: phải rõ ràng dữ liệu nào là fresh, dữ liệu nào đang cache, và ai chịu trách nhiệm invalidate.",
      },
    },
    source: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "Grounded in recorded Persefoni work: React, TypeScript, GraphQL, TanStack Query, background prefetching and caching. Specific views, triggers and any measured impact must be filled in by the candidate.",
        vi: "Dựa trên kinh nghiệm thực tế ở Persefoni: React, TypeScript, GraphQL, TanStack Query, background prefetching và caching. View cụ thể, trigger và tác động đo được (nếu có) do ứng viên tự điền.",
      },
    },
    memoryShortcut: {
      en: "Keys → Intent → Freshness: same key, prefetch what's next, never trade correctness for speed.",
      vi: "Key → Ý định → Độ tươi: key nhất quán, prefetch thứ sắp mở, không đánh đổi tính đúng để lấy tốc độ.",
    },
    followUp: {
      id: "isb-q56-f1",
      question: {
        en: "How did you decide on staleTime values, and what happens when a prefetch turns out to be wasted?",
        vi: "Bạn quyết định giá trị staleTime như thế nào, và chuyện gì xảy ra khi một lần prefetch hóa ra là thừa?",
      },
      answer: {
        en: "I'd tie staleTime to how often the data really changes and how costly it is to show it slightly old. Reference data that rarely changes can be fresh for a long time; data users are actively editing should be short-lived or invalidated explicitly after mutations. Wasted prefetches are the cost of the strategy, so I keep them cheap: only prefetch on strong intent signals, let gcTime clean up unused entries, and avoid prefetching heavy queries on weak signals. In a trading context I'd go further: live prices shouldn't be cached through TanStack Query polling at all — they come from the stream — while reference data like instruments fits the cache well.",
        vi: "Tôi gắn staleTime với tần suất dữ liệu thực sự thay đổi và mức độ rủi ro nếu hiển thị dữ liệu hơi cũ. Dữ liệu tham chiếu ít thay đổi có thể giữ fresh lâu; dữ liệu người dùng đang chỉnh sửa thì nên ngắn hoặc invalidate chủ động sau mutation. Prefetch thừa là chi phí của chiến lược, nên tôi giữ nó rẻ: chỉ prefetch khi tín hiệu ý định đủ mạnh, để gcTime dọn các entry không dùng, và không prefetch query nặng chỉ vì tín hiệu yếu. Trong bối cảnh trading tôi sẽ tách rõ hơn: giá live không nên đi qua cache/polling của TanStack Query mà đến từ stream, còn dữ liệu tham chiếu như danh sách instrument thì rất hợp với cache.",
      },
    },
    cautions: [
      {
        en: "Do not quote load-time or percentage improvements unless you actually measured them.",
        vi: "Không nêu con số cải thiện thời gian tải hay phần trăm nếu bạn chưa thực sự đo.",
      },
      {
        en: "Do not claim you designed Persefoni's entire data layer alone; describe your own part accurately.",
        vi: "Không nhận là một mình thiết kế toàn bộ data layer của Persefoni; mô tả đúng phần việc của bạn.",
      },
      {
        en: "Do not claim WebSocket or high-frequency streaming work at Persefoni — it is not in your recorded experience.",
        vi: "Không nhận đã làm WebSocket hay streaming tần suất cao ở Persefoni — điều đó không có trong kinh nghiệm đã ghi nhận.",
      },
    ],
    difficulty: "medium",
    priority: "critical",
  },

  /* ------------------------------------------------------------------ */
  /* 57 — Performance improvement (Persefoni, measure first)             */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q57",
    number: 57,
    question: {
      en: "Describe a time you improved the performance of a frontend application. How did you know it worked?",
      vi: "Hãy kể về một lần bạn cải thiện hiệu năng của một ứng dụng frontend. Làm sao bạn biết nó thực sự hiệu quả?",
    },
    competency: "Performance optimization",
    star: {
      situation: {
        en: "At Persefoni, users worked in data-heavy views of an enterprise React and GraphQL application. In that kind of product, perceived performance is often less about raw rendering and more about waiting: each navigation can trigger fresh network requests before anything useful appears on screen. For enterprise users doing reporting work all day, those small waits add up and make the product feel heavy. [fill in: which screen or flow was the main pain point]",
        vi: "Ở Persefoni, người dùng làm việc trên các view nhiều dữ liệu của một ứng dụng doanh nghiệp dùng React và GraphQL. Với loại sản phẩm này, cảm nhận về hiệu năng thường không nằm ở tốc độ render thuần mà ở việc phải chờ: mỗi lần điều hướng có thể kích hoạt request mới trước khi màn hình hiện ra thứ gì hữu ích. Với người dùng doanh nghiệp làm báo cáo cả ngày, những khoảng chờ nhỏ đó cộng dồn lại khiến sản phẩm có cảm giác nặng nề. [điền: màn hình hoặc luồng gây khó chịu nhất]",
      },
      task: {
        en: "I wanted to make the app feel faster without over-engineering it. That meant first finding where the time actually went — network, data shaping or rendering — and then choosing fixes that fit our existing TanStack Query and GraphQL setup and that the rest of the team could maintain.",
        vi: "Mục tiêu của tôi là làm ứng dụng nhanh hơn mà không over-engineer. Nghĩa là trước hết phải tìm ra thời gian thực sự bị tiêu tốn ở đâu — network, xử lý dữ liệu hay render — rồi mới chọn cách sửa phù hợp với hệ TanStack Query và GraphQL sẵn có, và đủ dễ để cả team bảo trì.",
      },
      action: {
        en: "First I measured instead of guessing, using [fill in: the tools you actually used, e.g. Chrome DevTools Network and Performance panels, React DevTools Profiler] to see whether users were waiting on requests or on rendering. Where the main cost was waiting on data, I applied background prefetching for likely next views and caching with TanStack Query, so returning to a view showed cached data immediately while it refreshed in the background. [if true: I wrapped this in shared hooks to keep the pattern consistent, and checked that prefetching did not add unnecessary load on the backend.]",
        vi: "Đầu tiên tôi đo chứ không đoán, dùng [điền: công cụ bạn thực sự dùng, ví dụ tab Network và Performance của Chrome DevTools, React DevTools Profiler] để xem người dùng đang chờ request hay chờ render. Ở những chỗ chi phí chính là chờ dữ liệu, tôi áp dụng background prefetching cho các view có khả năng được mở tiếp và caching bằng TanStack Query, để khi quay lại một view thì dữ liệu cache hiện ngay trong lúc được làm mới ở background. [nếu đúng: Tôi gói phần này trong các shared hook để pattern nhất quán, và kiểm tra để prefetch không gây thêm tải không cần thiết cho backend.]",
      },
      result: {
        en: "Frequently used views could show cached data immediately on navigation and on return visits. [if true: the team reused the same approach to add prefetching to new screens.] I'm careful not to quote a number I didn't measure: [if true: add the measured impact, e.g. before/after timings from DevTools or monitoring]. The lesson I'd bring to ISB is to measure first and fix the real bottleneck — on a streaming trading dashboard that is usually update frequency and rendering, not the network.",
        vi: "Các view dùng thường xuyên có thể hiển thị ngay dữ liệu trong cache khi điều hướng và khi quay lại. [nếu đúng: team dùng lại cách này để thêm prefetch cho màn hình mới.] Tôi cẩn thận không đưa ra con số mà mình chưa đo: [nếu đúng: bổ sung tác động đã đo, ví dụ thời gian trước/sau từ DevTools hoặc hệ thống monitoring]. Bài học tôi mang sang ISB là đo trước rồi sửa đúng bottleneck — với một dashboard trading dạng streaming, bottleneck thường là tần suất update và render, chứ không phải network.",
      },
    },
    source: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "Grounded in recorded Persefoni work (background prefetching and caching with TanStack Query). The measurement tools and any numbers must come from the candidate's real memory; the streaming-dashboard bridge is a recommended approach, not past experience.",
        vi: "Dựa trên kinh nghiệm thực tế ở Persefoni (background prefetching và caching với TanStack Query). Công cụ đo và mọi con số phải đến từ trí nhớ thật của ứng viên; phần liên hệ sang dashboard streaming là cách tiếp cận đề xuất, không phải kinh nghiệm đã có.",
      },
    },
    memoryShortcut: {
      en: "Measure → Locate → Fix the real bottleneck → Make it reusable.",
      vi: "Đo → Khoanh vùng → Sửa đúng bottleneck → Biến thành pattern dùng lại.",
    },
    followUp: {
      id: "isb-q57-f1",
      question: {
        en: "If you joined ISB and the trading dashboard felt janky under live data, what would you do in your first week?",
        vi: "Nếu bạn vào ISB và dashboard trading bị giật khi có dữ liệu live, bạn sẽ làm gì trong tuần đầu tiên?",
      },
      answer: {
        en: "Same discipline, different bottleneck. I'd record a Performance trace under realistic load and look for long tasks, layout thrashing and how often React commits; the React Profiler tells me which components re-render per tick. Typical fixes, in order: batch incoming messages and flush once per animation frame, subscribe components to narrow Zustand selectors so a price change only re-renders its row, virtualize large tables, and move parsing or aggregation into a Web Worker. I'd also take heap snapshots over a long session, because a dashboard that's fine at minute one can leak by hour four. This is my recommended approach — I'd validate it against the team's real traces before changing anything.",
        vi: "Vẫn kỷ luật đó, chỉ khác bottleneck. Tôi sẽ ghi một Performance trace với tải gần thực tế, tìm long task, layout thrashing và xem React commit bao nhiêu lần; React Profiler cho biết component nào re-render theo mỗi tick. Các cách sửa thường gặp, theo thứ tự: gom message và flush một lần mỗi animation frame, cho component subscribe Zustand bằng selector hẹp để giá thay đổi chỉ re-render đúng dòng đó, virtualization cho bảng lớn, và chuyển phần parse hoặc aggregate sang Web Worker. Tôi cũng sẽ chụp heap snapshot qua một phiên dài, vì dashboard ổn ở phút đầu có thể rò rỉ bộ nhớ sau vài giờ. Đây là cách tiếp cận tôi đề xuất — tôi sẽ kiểm chứng bằng trace thực tế của team trước khi thay đổi gì.",
      },
    },
    cautions: [
      {
        en: "Do not invent metrics (load time, Lighthouse score, percentages) — say you would add them only if measured.",
        vi: "Không bịa số liệu (thời gian tải, điểm Lighthouse, phần trăm) — chỉ nêu nếu bạn thực sự đã đo.",
      },
      {
        en: "Do not claim you optimized high-frequency streaming rendering in production; that part is a recommended approach.",
        vi: "Không nhận đã tối ưu render cho streaming tần suất cao trên production; phần đó là cách tiếp cận đề xuất.",
      },
      {
        en: "Do not claim you set up RUM or Core Web Vitals monitoring at Persefoni unless you actually did.",
        vi: "Không nhận đã thiết lập RUM hay monitoring Core Web Vitals ở Persefoni nếu bạn chưa thực sự làm.",
      },
    ],
    difficulty: "medium",
    priority: "critical",
  },

  /* ------------------------------------------------------------------ */
  /* 58 — End-to-end ownership (Ninja Van thermal printer + ZPL)         */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q58",
    number: 58,
    question: {
      en: "Tell me about a feature you owned end to end, from requirements to production.",
      vi: "Hãy kể về một tính năng bạn chịu trách nhiệm từ đầu đến cuối, từ yêu cầu đến khi lên production.",
    },
    competency: "Ownership and end-to-end delivery",
    star: {
      situation: {
        en: "At Ninja Van's TechLab, I worked on logistics applications where operational users needed to print shipping labels on thermal printers. Thermal label printers typically speak ZPL, a printer command language, rather than normal page printing, so this was not a typical web feature: it crossed the user interface, backend REST services in a microservices environment, and physical hardware. [fill in: the specific app and who used it, e.g. warehouse or hub staff]",
        vi: "Ở TechLab của Ninja Van, tôi làm các ứng dụng logistics, trong đó người dùng vận hành cần in nhãn vận chuyển bằng máy in nhiệt. Máy in nhãn nhiệt thường dùng ZPL, một ngôn ngữ lệnh của máy in, chứ không in trang thông thường, nên đây không phải tính năng web bình thường: nó đi xuyên qua giao diện người dùng, các REST service trong môi trường microservices, và cả phần cứng vật lý. [điền: ứng dụng cụ thể và ai sử dụng, ví dụ nhân viên kho hoặc hub]",
      },
      task: {
        en: "I was responsible for the label flow end to end: generating label content from shipment data, making sure the layout was correct before it reached a physical printer, integrating with the thermal printer, and supporting the feature once operators were using it. [confirm: which parts you owned yourself versus shared with teammates — state it honestly]",
        vi: "Tôi chịu trách nhiệm toàn bộ luồng in nhãn: tạo nội dung nhãn từ dữ liệu vận đơn, đảm bảo layout đúng trước khi đến máy in thật, tích hợp với máy in nhiệt, và hỗ trợ tính năng khi người vận hành đã sử dụng. [xác nhận: phần nào bạn tự làm, phần nào làm cùng đồng đội — nói trung thực]",
      },
      action: {
        en: "I broke it into three pieces. Data: pulling shipment details from REST APIs and mapping them into a ZPL template [if true: with validation for missing or overly long fields so a bad record didn't produce a broken label]. Preview: using Labelary to render ZPL into an image, so layout could be checked without wasting physical labels. Printing: integrating with the thermal printer [fill in: the actual print path you used] [if true: and handling failure cases such as an offline printer or a failed job with clear messages for operators instead of silent errors].",
        vi: "Tôi chia thành ba phần. Dữ liệu: lấy thông tin vận đơn từ REST API và map vào template ZPL [nếu đúng: có validate các field bị thiếu hoặc quá dài để một bản ghi lỗi không tạo ra nhãn hỏng]. Preview: dùng Labelary để render ZPL thành hình ảnh, nhờ đó kiểm tra layout mà không tốn nhãn thật. In ấn: tích hợp với máy in nhiệt [điền: cách in thực tế bạn đã dùng] [nếu đúng: và xử lý các trường hợp lỗi như máy in offline hay lệnh in thất bại bằng thông báo rõ ràng cho người vận hành thay vì lỗi im lặng].",
      },
      result: {
        en: "Operators could print shipping labels from the app [confirm: rollout scope]. [if true: the Labelary preview step made layout problems visible on screen before they appeared on physical labels.] [if true: add the measured impact, e.g. rollout scope or fewer reprints]. The habit I'd bring to ISB: when a feature touches the real world — printers there, trades and orders here — design the failure paths and the user feedback as carefully as the happy path.",
        vi: "Người vận hành có thể in nhãn vận chuyển ngay từ ứng dụng [xác nhận: phạm vi triển khai]. [nếu đúng: bước preview bằng Labelary giúp phát hiện lỗi layout trên màn hình trước khi chúng xuất hiện trên nhãn thật.] [nếu đúng: bổ sung tác động đã đo, ví dụ phạm vi triển khai hoặc số lần in lại giảm]. Thói quen tôi mang sang ISB: khi một tính năng chạm vào thế giới thật — ở đó là máy in, ở đây là giao dịch và lệnh đặt — hãy thiết kế các nhánh lỗi và phản hồi cho người dùng kỹ như happy path.",
      },
    },
    source: {
      company: "Ninja Van — TechLab",
      kind: "actual",
      note: {
        en: "Grounded in recorded Ninja Van TechLab work: thermal printer integration, shipping labels with Labelary and ZPL, REST API integration in a microservices environment. The exact print path, users and scope of ownership must be confirmed by the candidate.",
        vi: "Dựa trên kinh nghiệm thực tế ở Ninja Van TechLab: tích hợp máy in nhiệt, tạo nhãn vận chuyển bằng Labelary và ZPL, tích hợp REST API trong môi trường microservices. Cách in cụ thể, người dùng và phạm vi trách nhiệm do ứng viên xác nhận.",
      },
    },
    memoryShortcut: {
      en: "Data → Preview → Print → Fail loudly: label flow from API to paper.",
      vi: "Dữ liệu → Preview → In → Lỗi phải rõ ràng: luồng nhãn từ API ra giấy.",
    },
    followUp: {
      id: "isb-q58-f1",
      question: {
        en: "What was the hardest edge case, and how did you test without a physical printer for every developer?",
        vi: "Edge case khó nhất là gì, và bạn test thế nào khi không phải lập trình viên nào cũng có máy in thật?",
      },
      answer: {
        en: "[fill in: the real edge case you remember — for example long addresses overflowing the label, special characters, or barcode sizing]. On testing, the useful split is: the ZPL string is just text, so the generation logic can be unit-tested like any pure function; Labelary acts as a visual check because it renders that ZPL into an image anyone can review; and a real printer is only needed for the final check of physical output. [confirm which of these you actually used]. The general principle is to push as much as possible into deterministic, testable code and keep the hardware boundary thin — which is the same thing I'd do with a WebSocket feed at ISB, by testing against a mock server.",
        vi: "[điền: edge case thật mà bạn nhớ — ví dụ địa chỉ dài tràn nhãn, ký tự đặc biệt, hoặc kích thước barcode]. Về test, cách chia hợp lý là: chuỗi ZPL chỉ là text, nên logic sinh nhãn có thể unit test như một pure function; Labelary đóng vai trò kiểm tra trực quan vì nó render ZPL thành hình ai cũng xem được; còn máy in thật chỉ cần cho bước kiểm tra cuối cùng trên giấy. [xác nhận bạn thực sự đã dùng những cách nào]. Nguyên tắc chung là đẩy càng nhiều logic vào phần code deterministic, dễ test càng tốt và giữ ranh giới phần cứng thật mỏng — đúng như cách tôi sẽ làm với WebSocket feed ở ISB, test với một mock server.",
      },
    },
    cautions: [
      {
        en: "Do not name printer models, SDKs, print agents or print volumes unless you remember them accurately.",
        vi: "Không nêu tên model máy in, SDK, print agent hay số lượng nhãn in nếu bạn không nhớ chính xác.",
      },
      {
        en: "Do not claim you designed the microservices or owned backend services; you integrated with REST APIs.",
        vi: "Không nhận đã thiết kế hệ microservices hay sở hữu các backend service; bạn tích hợp với REST API.",
      },
      {
        en: "Do not invent outcomes such as reduced reprints or faster dispatch without real data.",
        vi: "Không bịa kết quả như giảm số lần in lại hay xuất hàng nhanh hơn khi không có dữ liệu thật.",
      },
    ],
    difficulty: "medium",
    priority: "high",
  },

  /* ------------------------------------------------------------------ */
  /* 59 — Technical disagreement (THEORETICAL template)                  */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q59",
    number: 59,
    question: {
      en: "Tell me about a time you disagreed with a teammate or your lead on a technical decision. How did you resolve it?",
      vi: "Hãy kể về một lần bạn bất đồng với đồng nghiệp hoặc lead về một quyết định kỹ thuật. Bạn đã giải quyết thế nào?",
    },
    competency: "Technical disagreement and influence",
    star: {
      situation: {
        en: 'TEMPLATE — replace with a real story. Say: "On [project/company], we had to choose between [option A] and [option B] for [problem]. [A teammate / my lead] preferred [A] because [their reason]; I believed [B] was better because [your reason]." Good frontend topics: choosing a state management library, adding a dependency, a caching strategy, the testing approach, or monorepo structure. Pick a case where the stakes were real but the conversation stayed respectful.',
        vi: 'MẪU — thay bằng câu chuyện thật. Hãy nói: "Ở [dự án/công ty], chúng tôi phải chọn giữa [phương án A] và [phương án B] cho [vấn đề]. [Đồng nghiệp / lead của tôi] muốn chọn [A] vì [lý do của họ]; tôi cho rằng [B] tốt hơn vì [lý do của bạn]." Chủ đề frontend phù hợp: chọn thư viện state management, thêm một dependency, chiến lược caching, cách tiếp cận testing, hoặc cấu trúc monorepo. Chọn tình huống có rủi ro thật nhưng cuộc trao đổi vẫn tôn trọng nhau.',
      },
      task: {
        en: 'TEMPLATE. Say: "My goal was not to win the argument but to get the team to the best decision for [users / the deadline / maintainability], and to commit fully once we decided." Make the stakes clear: deadline, performance, risk or long-term maintenance cost. Interviewers listen for two things here: whether you separate the technical question from personal preference, and whether you understood the other person\'s constraints.',
        vi: 'MẪU. Hãy nói: "Mục tiêu của tôi không phải là thắng cuộc tranh luận mà là giúp team đi đến quyết định tốt nhất cho [người dùng / deadline / khả năng bảo trì], và cam kết hết mình khi đã quyết." Nói rõ điều gì đang bị đe dọa: deadline, hiệu năng, rủi ro hay chi phí bảo trì lâu dài. Người phỏng vấn để ý hai điều: bạn có tách vấn đề kỹ thuật khỏi sở thích cá nhân không, và bạn có hiểu ràng buộc của người kia không.',
      },
      action: {
        en: 'TEMPLATE, four moves. Understand: "I first asked why they preferred [A]; it turned out they were worried about [concern]." Make it objective: "I proposed we compare on agreed criteria — [performance, complexity, team familiarity, migration cost]." Bring evidence: "I built a small spike / benchmark / short design note showing [finding]." Decide and commit: "We agreed on [outcome], with [a checkpoint or fallback] in case our assumption was wrong." Use only steps you really took.',
        vi: 'MẪU, bốn bước. Hiểu: "Trước tiên tôi hỏi vì sao họ muốn chọn [A]; hóa ra họ lo về [mối lo]." Khách quan hóa: "Tôi đề xuất so sánh theo tiêu chí cả hai đồng ý — [hiệu năng, độ phức tạp, mức quen thuộc của team, chi phí migration]." Đưa bằng chứng: "Tôi làm một spike nhỏ / benchmark / design note ngắn cho thấy [kết quả]." Quyết và cam kết: "Chúng tôi thống nhất [kết quả], kèm [điểm kiểm tra lại hoặc phương án dự phòng] nếu giả định sai." Chỉ dùng những bước bạn thực sự đã làm.',
      },
      result: {
        en: 'TEMPLATE. Say: "We went with [decision]. [The real outcome — qualitative is fine: it shipped on time, that area had fewer bugs, the design note became the team\'s reference.] What I learned is [lesson, e.g. disagree early and with data, then commit]." It is just as strong if the other option won: explain what you learned and how you supported it. Never end with blame or "I was right". [if true: add the measured impact]',
        vi: 'MẪU. Hãy nói: "Cuối cùng chúng tôi chọn [quyết định]. [Kết quả thật — định tính cũng được: giao đúng hạn, khu vực đó ít bug hơn, design note trở thành tài liệu tham khảo của team.] Bài học của tôi là [bài học, ví dụ bất đồng sớm và có dữ liệu, rồi cam kết]." Nếu phương án kia thắng thì câu chuyện vẫn mạnh: nói bạn học được gì và đã hỗ trợ quyết định đó ra sao. Đừng bao giờ kết thúc bằng việc đổ lỗi hay "tôi đã đúng". [nếu đúng: bổ sung tác động đã đo]',
      },
    },
    source: {
      kind: "theoretical",
      note: {
        en: "Template only — no specific technical disagreement is recorded in the candidate profile. Replace every bracketed placeholder with a real story (Persefoni, Ninja Van TechLab or NAB) before using it in an interview.",
        vi: "Chỉ là mẫu — hồ sơ ứng viên chưa ghi nhận câu chuyện bất đồng kỹ thuật cụ thể nào. Thay mọi placeholder trong ngoặc vuông bằng câu chuyện thật (Persefoni, Ninja Van TechLab hoặc NAB) trước khi dùng trong phỏng vấn.",
      },
    },
    memoryShortcut: {
      en: "UCEC: Understand → Criteria → Evidence → Commit.",
      vi: "UCEC: Hiểu người kia → Thống nhất tiêu chí → Đưa bằng chứng → Cam kết.",
    },
    followUp: {
      id: "isb-q59-f1",
      question: {
        en: "What if you were overruled and still believed the decision was wrong?",
        vi: "Nếu ý kiến của bạn bị bác bỏ mà bạn vẫn tin quyết định đó sai thì sao?",
      },
      answer: {
        en: "I disagree and commit. Once the decision is made, I support it fully — I don't slow-walk it or keep relitigating it in code review. What I do is make the risk visible: I write down the concern briefly, and we agree on a signal that would make us revisit it, for example a performance budget we'd watch or a point in the roadmap where we'd check again. If that signal shows up, we have an objective reason to reopen the topic instead of a personal one. And if it never shows up, I learned something about my own assumptions.",
        vi: "Tôi theo nguyên tắc disagree and commit. Khi đã quyết, tôi ủng hộ hoàn toàn — không làm chậm, không mang ra tranh cãi lại trong code review. Điều tôi làm là làm rõ rủi ro: ghi lại mối lo một cách ngắn gọn, và cùng team thống nhất một tín hiệu để xem xét lại, ví dụ một performance budget cần theo dõi hoặc một mốc trong roadmap để kiểm tra lại. Nếu tín hiệu đó xuất hiện, chúng tôi có lý do khách quan để mở lại vấn đề chứ không phải lý do cá nhân. Còn nếu nó không bao giờ xuất hiện, tôi học được điều gì đó về chính giả định của mình.",
      },
    },
    cautions: [
      {
        en: "Do not use this answer until you have replaced every placeholder with a real disagreement you were part of.",
        vi: "Không dùng câu trả lời này cho đến khi đã thay mọi placeholder bằng một lần bất đồng thật mà bạn tham gia.",
      },
      {
        en: "Do not invent colleagues, decisions or outcomes, and do not attach the story to a company where it did not happen.",
        vi: "Không bịa đồng nghiệp, quyết định hay kết quả, và không gán câu chuyện cho công ty nơi nó không xảy ra.",
      },
      {
        en: 'Do not pick a story that criticizes former colleagues or ends with "I was right".',
        vi: 'Không chọn câu chuyện chê bai đồng nghiệp cũ hoặc kết thúc bằng "tôi đã đúng".',
      },
    ],
    difficulty: "medium",
    priority: "high",
  },

  /* ------------------------------------------------------------------ */
  /* 60 — Stakeholder management (NAB AEM)                               */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q60",
    number: 60,
    question: {
      en: "Tell me about working with non-technical stakeholders in a regulated or process-heavy environment.",
      vi: "Hãy kể về kinh nghiệm làm việc với các bên liên quan không chuyên kỹ thuật trong một môi trường nhiều quy định hoặc quy trình chặt chẽ.",
    },
    competency: "Stakeholder management and communication",
    star: {
      situation: {
        en: "At NAB, in an enterprise banking environment, I worked with Adobe Experience Manager — AEM Sites, AEM Forms and AEM Assets/DAM. Content and assets moved through Author and Publish workflows, and changes reached customers only through controlled deployments. The people I supported were business stakeholders [fill in: the actual groups, e.g. content or marketing teams] who cared about what customers would see and when, not about the platform internals.",
        vi: "Ở NAB, trong môi trường ngân hàng doanh nghiệp, tôi làm việc với Adobe Experience Manager — AEM Sites, AEM Forms và AEM Assets/DAM. Nội dung và asset đi qua quy trình Author và Publish, và thay đổi chỉ đến được khách hàng thông qua các đợt deployment có kiểm soát. Những người tôi hỗ trợ là các bên nghiệp vụ [điền: nhóm cụ thể, ví dụ team nội dung hoặc marketing] — họ quan tâm khách hàng sẽ thấy gì và khi nào, chứ không quan tâm chi tiết bên trong nền tảng.",
      },
      task: {
        en: "My job was to support asset integration and deployments while keeping stakeholders informed and confident in the process. In a bank, a change that goes out wrong is not just a bug — it can become a reputational or compliance concern — so predictability mattered as much as speed. I needed stakeholders to trust that what they approved was exactly what would be published.",
        vi: "Công việc của tôi là hỗ trợ asset integration và deployment, đồng thời giữ cho các bên liên quan luôn nắm thông tin và tin tưởng vào quy trình. Trong ngân hàng, một thay đổi lên sai không chỉ là bug — nó có thể thành vấn đề uy tín hoặc tuân thủ — nên tính dự đoán được quan trọng ngang với tốc độ. Tôi cần các bên tin rằng thứ họ đã duyệt chính xác là thứ sẽ được publish.",
      },
      action: {
        en: "I focused on three things. Translate: explaining technical constraints in business language — for example the difference between authoring content and publishing it, or why an asset change had to go through a deployment. Make the process visible: being clear about what was ready, what was blocked and what we needed from them before a release [fill in: the real channel, e.g. checklists, release notes, meetings]. Protect quality: checking assets and content in the author environment before publishing, and staying available to support them during and after deployments.",
        vi: "Tôi tập trung vào ba việc. Diễn giải: giải thích các ràng buộc kỹ thuật bằng ngôn ngữ nghiệp vụ — ví dụ khác biệt giữa author nội dung và publish nội dung, hay vì sao thay đổi asset phải đi qua deployment. Minh bạch quy trình: nói rõ cái gì đã sẵn sàng, cái gì đang bị chặn và cần họ cung cấp gì trước mỗi đợt release [điền: kênh thực tế, ví dụ checklist, release note, họp]. Bảo vệ chất lượng: kiểm tra asset và nội dung trên môi trường author trước khi publish, và luôn sẵn sàng hỗ trợ trong và sau deployment.",
      },
      result: {
        en: "The aim was a release process stakeholders could predict, with issues raised before publishing rather than discovered afterwards. [if true: describe how that actually played out, e.g. feedback from the business teams] [if true: add the measured impact]. This maps directly to ISB: the JD mentions UX for non-technical users and a customer-facing web portal, and ISB Vietnam works through a dedicated-team model with overseas clients, so clear, structured communication across teams and time zones is part of the job.",
        vi: "Mục tiêu là một quy trình release mà các bên liên quan có thể dự đoán được, vấn đề được nêu ra trước khi publish thay vì bị phát hiện sau đó. [nếu đúng: mô tả kết quả thực tế, ví dụ phản hồi từ các team nghiệp vụ] [nếu đúng: bổ sung tác động đã đo]. Điều này liên hệ trực tiếp với ISB: JD nhắc đến UX cho người dùng không chuyên kỹ thuật và một web portal cho khách hàng, còn ISB Vietnam làm việc theo mô hình dedicated team với khách hàng nước ngoài, nên giao tiếp rõ ràng, có cấu trúc giữa các team và múi giờ là một phần của công việc.",
      },
    },
    source: {
      company: "NAB",
      kind: "actual",
      note: {
        en: "Grounded in recorded NAB work: AEM Assets/DAM, Sites, Forms, Author/Publish workflows, asset integration, deployment and stakeholder support. Stakeholder groups and communication channels must be filled in by the candidate. ISB's dedicated-team model is verified from the company site; the client identity is not.",
        vi: "Dựa trên kinh nghiệm thực tế ở NAB: AEM Assets/DAM, Sites, Forms, quy trình Author/Publish, asset integration, hỗ trợ deployment và stakeholder. Nhóm stakeholder và kênh giao tiếp do ứng viên tự điền. Mô hình dedicated team của ISB đã xác minh từ website công ty; danh tính khách hàng thì chưa.",
      },
    },
    memoryShortcut: {
      en: "Translate → Make visible → Protect quality: predictable beats fast in a bank.",
      vi: "Diễn giải → Minh bạch → Bảo vệ chất lượng: ở ngân hàng, dự đoán được quan trọng hơn nhanh.",
    },
    followUp: {
      id: "isb-q60-f1",
      question: {
        en: "How would you handle a stakeholder who wants a change pushed urgently, outside the normal release process?",
        vi: "Bạn sẽ xử lý thế nào khi một stakeholder muốn đẩy gấp một thay đổi, nằm ngoài quy trình release thông thường?",
      },
      answer: {
        en: "[if you have a real example from NAB, use it; otherwise present this as your approach.] First I'd understand the urgency — what happens to customers or the business if it waits until the next release. Then I'd lay out options with their risks: wait for the scheduled release, use the approved expedited path if one exists, or ship a smaller, safer change now. The decision on bypassing normal controls isn't mine or theirs alone, so I'd bring in whoever owns release approval. What I'd never do is quietly skip the process — in a regulated environment, the process is part of the product. The same applies to a trading platform: a rushed UI change to order entry is a real risk.",
        vi: "[nếu bạn có ví dụ thật ở NAB, hãy dùng; nếu không, trình bày đây là cách tiếp cận của bạn.] Trước tiên tôi tìm hiểu mức độ khẩn cấp — khách hàng hoặc doanh nghiệp bị ảnh hưởng gì nếu chờ đến đợt release tiếp theo. Sau đó tôi đưa ra các lựa chọn kèm rủi ro: chờ release theo lịch, dùng quy trình expedite đã được phê duyệt nếu có, hoặc đưa ra một thay đổi nhỏ hơn và an toàn hơn ngay bây giờ. Quyết định bỏ qua kiểm soát thông thường không thuộc riêng tôi hay riêng họ, nên tôi sẽ kéo người có thẩm quyền phê duyệt release vào. Điều tôi không bao giờ làm là lặng lẽ bỏ qua quy trình — trong môi trường có quy định, quy trình là một phần của sản phẩm. Với nền tảng trading cũng vậy: sửa vội UI đặt lệnh là rủi ro thật.",
      },
    },
    cautions: [
      {
        en: "Do not claim you owned AEM platform architecture or release management at NAB unless that was your role.",
        vi: "Không nhận đã sở hữu kiến trúc nền tảng AEM hay quản lý release ở NAB nếu đó không phải vai trò của bạn.",
      },
      {
        en: "Do not name internal NAB systems, regulators or compliance processes, or claim compliance responsibilities you did not have.",
        vi: "Không nêu tên hệ thống nội bộ, cơ quan quản lý hay quy trình tuân thủ của NAB, và không nhận trách nhiệm tuân thủ mà bạn không có.",
      },
      {
        en: "Do not describe NAB work as React or trading-platform experience; it was AEM content and asset work.",
        vi: "Không mô tả công việc ở NAB là kinh nghiệm React hay nền tảng trading; đó là công việc nội dung và asset trên AEM.",
      },
    ],
    difficulty: "medium",
    priority: "high",
  },

  /* ------------------------------------------------------------------ */
  /* 61 — Engineering quality (Persefoni WCAG + automated testing)       */
  /* ------------------------------------------------------------------ */
  {
    id: "isb-q61",
    number: 61,
    question: {
      en: "How do you ensure engineering quality in a frontend codebase? Give me a concrete example.",
      vi: "Bạn đảm bảo chất lượng kỹ thuật trong một codebase frontend như thế nào? Cho một ví dụ cụ thể.",
    },
    competency: "Engineering quality, accessibility and testing",
    star: {
      situation: {
        en: "At Persefoni, we built an enterprise React and TypeScript platform for carbon accounting, and accessibility was part of the quality bar. Data-heavy UIs — tables, forms, filters, dialogs — are exactly where accessibility tends to break: keyboard traps, missing focus indicators, and controls a screen reader cannot describe. And because the codebase kept evolving, an issue fixed once could easily come back in a later change. [fill in: the components or flows you worked on]",
        vi: "Ở Persefoni, chúng tôi xây dựng một nền tảng carbon accounting cho doanh nghiệp bằng React và TypeScript, và accessibility là một phần của tiêu chuẩn chất lượng. Các UI nhiều dữ liệu — bảng, form, bộ lọc, dialog — chính là nơi accessibility hay bị hỏng: kẹt focus khi dùng bàn phím, thiếu focus indicator, và các control mà screen reader không mô tả được. Và vì codebase liên tục thay đổi, một lỗi đã sửa rất dễ quay lại ở lần thay đổi sau. [điền: component hoặc luồng bạn đã làm]",
      },
      task: {
        en: "My part was delivering WCAG improvements — keyboard navigation and ARIA semantics — in the components I worked on, and making sure they stayed fixed. Accessibility regressions are easy to reintroduce, so the task was as much about protecting quality over time with automated tests as about fixing individual issues one at a time.",
        vi: "Phần việc của tôi là cải thiện WCAG — keyboard navigation và ngữ nghĩa ARIA — trong các component tôi phụ trách, và đảm bảo chúng không bị hỏng lại. Lỗi accessibility rất dễ tái xuất hiện, nên nhiệm vụ không chỉ là sửa từng lỗi mà còn là bảo vệ chất lượng lâu dài bằng automated test.",
      },
      action: {
        en: "I treated it as engineering, not a checklist. Semantics first: native elements wherever possible, and ARIA roles, labels and states only where native HTML wasn't enough. Keyboard: logical tab order, visible focus, focus management for dialogs and menus, and arrow-key patterns where they fit. Then automated tests [fill in: your actual tools, e.g. React Testing Library queries by role and label, keyboard interactions with user-event] so a regression fails in CI instead of reaching a customer. A side benefit: if a test can't find an element by its role, a screen reader probably can't either.",
        vi: "Tôi coi đây là việc kỹ thuật chứ không phải tick checklist. Ưu tiên ngữ nghĩa: dùng thẻ HTML gốc bất cứ khi nào có thể, chỉ thêm ARIA role, label và state khi HTML gốc không đủ. Bàn phím: thứ tự tab hợp lý, focus nhìn thấy được, quản lý focus cho dialog và menu, và dùng phím mũi tên ở những chỗ phù hợp. Sau đó là automated test [điền: công cụ thực tế, ví dụ React Testing Library query theo role và label, mô phỏng thao tác bàn phím bằng user-event] để regression bị bắt trong CI thay vì đến tay khách hàng. Lợi ích kèm theo: nếu test không tìm được phần tử theo role, nhiều khả năng screen reader cũng không tìm được.",
      },
      result: {
        en: "Those components became keyboard-operable and better described to assistive technology, and the tests helped protect that behavior as the codebase evolved. [if true: add the measured impact, e.g. audit findings closed]. For ISB this matters twice: the JD asks for accessible, reusable component libraries and proven automated UI test suites, and dense trading screens need keyboard-driven, accessible data grids for power users and clear UX for non-technical customers.",
        vi: "Các component đó dùng được hoàn toàn bằng bàn phím và được mô tả tốt hơn cho công nghệ hỗ trợ, còn test giúp giữ vững hành vi đó khi codebase thay đổi. [nếu đúng: bổ sung tác động đã đo, ví dụ số lỗi audit đã đóng]. Với ISB điều này quan trọng gấp đôi: JD yêu cầu component library có tính accessibility, tái sử dụng được và kinh nghiệm thực tế với automated UI test suite, còn màn hình trading dày đặc dữ liệu cần data grid điều khiển được bằng bàn phím cho power user và UX rõ ràng cho khách hàng không chuyên kỹ thuật.",
      },
    },
    source: {
      company: "Persefoni",
      kind: "actual",
      note: {
        en: "Grounded in recorded Persefoni work: WCAG accessibility, keyboard navigation, ARIA and automated testing in an enterprise React/TypeScript frontend. Specific components, test tools and any audit results must be filled in by the candidate.",
        vi: "Dựa trên kinh nghiệm thực tế ở Persefoni: WCAG accessibility, keyboard navigation, ARIA và automated testing trong frontend doanh nghiệp React/TypeScript. Component cụ thể, công cụ test và kết quả audit (nếu có) do ứng viên tự điền.",
      },
    },
    memoryShortcut: {
      en: "Semantics → Keyboard → Tests that lock it in: fix once, guard forever.",
      vi: "Ngữ nghĩa → Bàn phím → Test khóa chặt: sửa một lần, bảo vệ mãi mãi.",
    },
    followUp: {
      id: "isb-q61-f1",
      question: {
        en: "How would you make a virtualized, live-updating data grid accessible?",
        vi: "Bạn sẽ làm thế nào để một data grid có virtualization và cập nhật live vẫn đảm bảo accessibility?",
      },
      answer: {
        en: "This is my recommended approach rather than something I've shipped in a trading context. Use the ARIA grid pattern, and because virtualization removes rows from the DOM, set aria-rowcount on the grid and aria-rowindex on each rendered row so assistive technology knows the real size and position. Use a roving tabindex so the grid is one tab stop and arrow keys move between cells, and keep focus on the logical cell when rows are recycled. Never announce every tick — that would flood a screen reader; use a polite live region only for meaningful events like an order fill, and throttle it. Finally, never rely on red and green alone: add arrows or signs for up and down moves.",
        vi: "Đây là cách tiếp cận tôi đề xuất, chưa phải thứ tôi đã đưa lên production trong bối cảnh trading. Dùng ARIA grid pattern, và vì virtualization loại bỏ các dòng khỏi DOM, cần đặt aria-rowcount cho grid và aria-rowindex cho từng dòng đang render để công nghệ hỗ trợ biết kích thước và vị trí thật. Dùng roving tabindex để cả grid chỉ là một tab stop và phím mũi tên di chuyển giữa các ô, đồng thời giữ focus đúng ô logic khi dòng được tái sử dụng. Không bao giờ thông báo mỗi tick — sẽ làm ngập screen reader; chỉ dùng live region dạng polite cho sự kiện quan trọng như lệnh được khớp, và có throttle. Cuối cùng, đừng chỉ dựa vào màu xanh đỏ: thêm mũi tên hoặc dấu để thể hiện tăng giảm.",
      },
    },
    cautions: [
      {
        en: "Do not claim a formal WCAG conformance level, certification or audit result unless you can confirm it.",
        vi: "Không nhận đạt một mức tuân thủ WCAG chính thức, chứng nhận hay kết quả audit nếu bạn không xác nhận được.",
      },
      {
        en: "Do not claim you built the whole test infrastructure or quote coverage numbers you did not measure.",
        vi: "Không nhận đã dựng toàn bộ hạ tầng test hay nêu con số coverage mà bạn chưa đo.",
      },
      {
        en: "Do not claim production experience making virtualized, live-updating grids accessible; present it as a recommended approach.",
        vi: "Không nhận đã có kinh nghiệm production làm accessibility cho grid virtualization cập nhật live; hãy trình bày như cách tiếp cận đề xuất.",
      },
    ],
    difficulty: "medium",
    priority: "high",
  },
];
