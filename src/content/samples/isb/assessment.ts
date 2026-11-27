import type { FinalAssessment } from "@/domain/package/schema";

/**
 * Section 16 — Final Assessment (ISB Vietnam, Senior Front-End Developer).
 * Consistent with Section 3 (match.ts): computed internal estimate ≈ 56/100 ("moderate" band)
 * from 19 weighted requirements — 3 strong, 8 relevant, 2 partial, 3 unverified, 3 gap (see match.ts).
 * Verification statuses follow the research done on 2026-11-27 (Sections 1 and 2).
 */
export const isbAssessment: FinalAssessment = {
  overallMatch: {
    en: 'Moderate match: the internal estimate is about 56/100, computed from 19 weighted requirements in Section 3. It is not an official employer or ATS evaluation. The candidate\'s core frontend stack fits well: production React + TypeScript, TanStack Query caching and prefetching, WCAG accessibility, a Vite + Turborepo monorepo, and real-time Socket.IO. What this role adds on top is high-frequency market-data streaming, browser-rendering and memory depth, virtualized live tables, financial charting, trading concepts and Rust. These are learnable gaps rather than disqualifiers, but they are the topics the interview will probe hardest. The score is held down mostly by missing evidence, not by contradicting evidence. Three requirements are "unverified" (memory leaks, virtualization, Linux), so a real story for any of them would raise the score.',
    vi: 'Mức độ phù hợp trung bình: ước tính nội bộ khoảng 56/100, tính từ 19 yêu cầu có trọng số ở Section 3. Đây không phải đánh giá chính thức của nhà tuyển dụng hay ATS. Stack frontend cốt lõi của ứng viên khớp tốt: React + TypeScript ở production, caching và prefetching với TanStack Query, accessibility theo WCAG, monorepo Vite + Turborepo, và real-time bằng Socket.IO. Phần vị trí này đòi hỏi thêm là streaming market data tần suất cao, hiểu sâu về rendering và bộ nhớ của trình duyệt, bảng virtualized cập nhật live, chart tài chính, kiến thức trading và Rust. Đây là những gap học được chứ không phải điểm loại, nhưng cũng chính là những chủ đề sẽ bị hỏi kỹ nhất. Điểm thấp chủ yếu do thiếu bằng chứng, không phải do bằng chứng trái ngược. Có ba yêu cầu đang "unverified" (memory leak, virtualization, Linux), nên nếu có câu chuyện thật cho bất kỳ mục nào thì điểm sẽ tăng.',
  },
  sellingPoints: [
    {
      en: "Production React + TypeScript on an enterprise SaaS platform (Persefoni), with GraphQL and TanStack Query. Background prefetching and caching for data-heavy views maps directly onto keeping a dashboard fast and its data fresh.",
      vi: "React + TypeScript ở production trên nền tảng SaaS enterprise (Persefoni), kèm GraphQL và TanStack Query. Background prefetching và caching cho màn hình nhiều dữ liệu liên quan trực tiếp đến việc giữ dashboard nhanh và dữ liệu luôn mới.",
    },
    {
      en: "Hands-on real-time experience: Socket.IO communication in logistics apps at Ninja Van — TechLab. This is a credible base for the WebSocket/SSE requirement, as long as it is described as logistics events rather than market data.",
      vi: "Có kinh nghiệm real-time thực tế: giao tiếp Socket.IO trong ứng dụng logistics tại Ninja Van — TechLab. Đây là nền tảng đáng tin cho yêu cầu WebSocket/SSE, miễn là mô tả đúng là sự kiện logistics chứ không phải market data.",
    },
    {
      en: "Accessibility depth (WCAG, keyboard navigation, ARIA at Persefoni). It matches two verified responsibilities: accessible, reusable component libraries and UX that simplifies financial workflows for non-technical customer-portal users.",
      vi: "Hiểu sâu accessibility (WCAG, keyboard navigation, ARIA tại Persefoni). Điểm này khớp với hai trách nhiệm đã xác minh: thư viện component accessible, tái sử dụng được và UX đơn giản hoá workflow tài chính cho người dùng không chuyên của customer portal.",
    },
    {
      en: "Frontend platform experience: a Vite + Turborepo monorepo at Persefoni and REST integration across microservices at Ninja Van. This relates to the modular component libraries and the preferred microservices/micro-frontend skill.",
      vi: "Kinh nghiệm frontend platform: monorepo Vite + Turborepo ở Persefoni và tích hợp REST giữa các microservice ở Ninja Van. Điểm này liên quan đến thư viện component dạng module và kỹ năng ưu tiên microservices/micro-frontend.",
    },
    {
      en: "Full-stack breadth for working with Rust/Python backend engineers. Hands-on Go services and REST contracts at Ninja Van, with Node.js, Python and FastAPI on the skills list, make it easy to agree API contracts and debug across the boundary.",
      vi: "Hiểu biết full-stack giúp làm việc với kỹ sư backend Rust/Python. Kinh nghiệm thực tế với service Go và REST contract ở Ninja Van, cùng Node.js, Python, FastAPI trong danh sách kỹ năng, giúp dễ thống nhất API contract và debug qua ranh giới frontend–backend.",
    },
    {
      en: "End-to-end ownership and enterprise maturity. The thermal printer integration and Labelary/ZPL label generation at Ninja Van show ownership of an unusual integration. Deployment and stakeholder support in NAB's regulated banking environment shows comfort with process-heavy delivery.",
      vi: "Khả năng sở hữu end-to-end và sự trưởng thành trong môi trường enterprise. Tích hợp máy in nhiệt và tạo nhãn vận chuyển với Labelary/ZPL ở Ninja Van cho thấy khả năng tự đảm nhận một tích hợp khác thường. Việc hỗ trợ deployment và làm việc với stakeholder trong môi trường ngân hàng có quy định chặt ở NAB cho thấy ứng viên quen với quy trình bài bản.",
    },
  ],
  knowledgeGaps: [
    {
      gap: {
        en: "High-frequency streaming patterns: batching, conflation, requestAnimationFrame flushing, backpressure and Web Worker offloading (Q3, Q5, Q6, Q18, isb-sd2).",
        vi: "Pattern streaming tần suất cao: batching, conflation, flush bằng requestAnimationFrame, backpressure và chuyển việc sang Web Worker (Q3, Q5, Q6, Q18, isb-sd2).",
      },
      priority: "critical",
    },
    {
      gap: {
        en: "Browser rendering pipeline and React rendering optimization, explained with concrete profiling steps (Q8–Q12, Q16).",
        vi: "Pipeline rendering của trình duyệt và tối ưu React rendering, giải thích kèm các bước profiling cụ thể (Q8–Q12, Q16).",
      },
      priority: "critical",
    },
    {
      gap: {
        en: "Trading fundamentals: order book, spread, OHLC candles, order types and lifecycle, P&L and price formatting (Q31–Q35, isb-q52, isb-q53).",
        vi: "Kiến thức nền về trading: order book, spread, nến OHLC, loại lệnh và vòng đời lệnh, P&L và định dạng giá (Q31–Q35, isb-q52, isb-q53).",
      },
      priority: "high",
    },
    {
      gap: {
        en: "Virtualized tables with live updates: variable row heights, scroll stability and per-row subscriptions (Q13, isb-sd3).",
        vi: "Bảng virtualized cập nhật live: row cao thấp khác nhau, giữ ổn định scroll và subscription theo từng row (Q13, isb-sd3).",
      },
      priority: "high",
    },
    {
      gap: {
        en: "Memory leak detection with heap snapshots, plus bounded buffers for time-series data (Q15, Q36).",
        vi: "Phát hiện memory leak bằng heap snapshot, cùng với buffer có giới hạn cho dữ liệu time-series (Q15, Q36).",
      },
      priority: "high",
    },
    {
      gap: {
        en: "Financial charting with Canvas/SVG libraries such as Lightweight Charts, D3, Highcharts or visx (Q14, Q34).",
        vi: "Chart tài chính với thư viện Canvas/SVG như Lightweight Charts, D3, Highcharts, visx (Q14, Q34).",
      },
      priority: "high",
    },
    {
      gap: {
        en: "SSE specifics and raw WebSocket lifecycle beyond Socket.IO's abstractions: reconnection, resubscribe, sequence gaps and heartbeats (Q1, Q2, Q4, Q7).",
        vi: "Chi tiết SSE và vòng đời WebSocket thuần, vượt ra ngoài lớp trừu tượng của Socket.IO: reconnect, resubscribe, khoảng trống sequence và heartbeat (Q1, Q2, Q4, Q7).",
      },
      priority: "medium",
    },
    {
      gap: {
        en: "Zustand under high-frequency load: narrow selectors and transient updates (Q26).",
        vi: "Zustand dưới tải update tần suất cao: selector hẹp và transient update (Q26).",
      },
      priority: "medium",
    },
    {
      gap: {
        en: "Rust awareness and contract-first integration with Rust/Python backends: OpenAPI or protobuf, and schema evolution (Q44, Q48, Q49).",
        vi: "Hiểu biết về Rust và tích hợp theo contract-first với backend Rust/Python: OpenAPI hoặc protobuf, và schema evolution (Q44, Q48, Q49).",
      },
      priority: "medium",
    },
    {
      gap: {
        en: "Testing streaming UIs (mock WebSocket server, fake timers, Playwright WebSocket routing) and Linux/CI debugging (Q45–Q47, Q50).",
        vi: "Test UI streaming (mock WebSocket server, fake timer, Playwright WebSocket routing) và debug trên Linux/CI (Q45–Q47, Q50).",
      },
      priority: "low",
    },
  ],
  interviewPriorities: [
    {
      en: "1. Real-time data path end-to-end: transport choice (Q1), reconnection (Q2), batching/conflation (Q3), ordering and resync (Q4), backpressure (Q5) and workers (Q6). Expect this to be the core of the technical round.",
      vi: "1. Luồng dữ liệu real-time end-to-end: chọn transport (Q1), reconnect (Q2), batching/conflation (Q3), thứ tự và resync (Q4), backpressure (Q5) và worker (Q6). Đây nhiều khả năng là phần trọng tâm của vòng kỹ thuật.",
    },
    {
      en: "2. Rendering performance under load: render vs commit (Q8), finding re-renders (Q9), memoization trade-offs (Q10), the browser pipeline (Q12), virtualization (Q13), memory leaks (Q15) and the frame budget (Q18).",
      vi: "2. Hiệu năng rendering khi tải cao: render vs commit (Q8), tìm re-render thừa (Q9), trade-off của memoization (Q10), pipeline của trình duyệt (Q12), virtualization (Q13), memory leak (Q15) và frame budget (Q18).",
    },
    {
      en: "3. One rehearsed system design answer: the real-time trading dashboard (Q37, isb-sd1) with the streaming data layer (isb-sd2). Practise the 5-minute version out loud.",
      vi: "3. Một câu trả lời system design đã luyện kỹ: dashboard trading real-time (Q37, isb-sd1) cùng streaming data layer (isb-sd2). Luyện nói bản 5 phút thành tiếng.",
    },
    {
      en: "4. Enough trading vocabulary to be credible: order book, OHLC, order types, P&L formatting and floating-point precision (Q21, Q31–Q35). Present it as learned knowledge, never as experience.",
      vi: "4. Đủ thuật ngữ trading để tạo sự tin cậy: order book, OHLC, loại lệnh, định dạng P&L và độ chính xác số thực (Q21, Q31–Q35). Trình bày như kiến thức đã học, không bao giờ nói là kinh nghiệm.",
    },
    {
      en: "5. Live coding warm-up: throttle/debounce (isb-q51), order book aggregation (isb-q52) and OHLC candles (isb-q53) in TypeScript.",
      vi: "5. Khởi động live coding: throttle/debounce (isb-q51), gộp order book (isb-q52) và nến OHLC (isb-q53) bằng TypeScript.",
    },
    {
      en: "6. Behavioral stories grounded in real work: TanStack Query prefetching/caching (Q56, Q57), thermal printer + ZPL ownership (Q58), NAB stakeholder support (Q60) and WCAG + testing (Q61). Q59 needs a real disagreement story before the interview.",
      vi: "6. Câu chuyện behavioral dựa trên công việc thật: prefetching/caching với TanStack Query (Q56, Q57), sở hữu tích hợp máy in nhiệt + ZPL (Q58), hỗ trợ stakeholder ở NAB (Q60) và WCAG + testing (Q61). Q59 cần một câu chuyện bất đồng có thật trước buổi phỏng vấn.",
    },
    {
      en: "7. Questions for the interviewer (Section 11): confirm that the role is still open, the working arrangement (on-site vs hybrid), how much Python the role involves, the client communication model and the interview process.",
      vi: "7. Câu hỏi cho người phỏng vấn (Section 11): xác nhận vị trí còn tuyển, hình thức làm việc (onsite hay hybrid), mức độ cần viết Python, mô hình giao tiếp với khách hàng và quy trình phỏng vấn.",
    },
  ],
  recommendation: {
    decision: "apply-after-prep",
    rationale: {
      en: 'The JD text was verified on 2026-11-27, so the technical preparation targets real requirements, not guesses. The core stack matches, and the gaps (streaming, rendering depth, trading vocabulary, charting) respond well to a focused 3–7-day plan plus the Section 12 project. Applying cold would waste the strongest opportunity, because the interview is likely to go straight to those gaps. Two things keep this from being "apply now": the gaps themselves, and timing. LinkedIn already shows the posting as "No longer accepting applications", while the Joboko copy stays open until 26/12/2026. So do a short prep (at least the 1–3-day plan), then apply through the open channel well before that deadline. "Clarify-first" was considered and rejected: the JD itself is verified, and the open questions (working arrangement, which may be on-site and conflict with the hybrid preference; Python scope; posting status) can go into the same recruiter message as the application rather than blocking it. If the recruiter confirms a fully on-site role and hybrid is a must-have for the candidate, reconsider before investing in later rounds.',
      vi: 'Nội dung JD đã được xác minh ngày 27/11/2026, nên việc chuẩn bị kỹ thuật nhắm vào yêu cầu thật chứ không phải phỏng đoán. Stack cốt lõi khớp, và các gap (streaming, rendering chuyên sâu, thuật ngữ trading, charting) có thể cải thiện rõ với kế hoạch tập trung 3–7 ngày cùng project ở Section 12. Nộp ngay khi chưa chuẩn bị sẽ phí cơ hội, vì buổi phỏng vấn nhiều khả năng sẽ đi thẳng vào các gap đó. Có hai lý do để không chọn "apply now": bản thân các gap, và thời điểm. LinkedIn đã ghi tin là "No longer accepting applications", còn bản trên Joboko vẫn mở đến 26/12/2026. Vì vậy hãy chuẩn bị ngắn (ít nhất kế hoạch 1–3 ngày) rồi nộp qua kênh còn mở, trước hạn chót một khoảng an toàn. Phương án "clarify-first" đã được cân nhắc nhưng không chọn: bản thân JD đã được xác minh, còn các câu hỏi mở có thể đưa vào cùng tin nhắn gửi recruiter khi nộp hồ sơ thay vì chặn việc nộp. Các câu hỏi đó gồm hình thức làm việc (có thể onsite, khác mong muốn hybrid), phạm vi Python và tình trạng tin tuyển dụng. Nếu recruiter xác nhận làm onsite hoàn toàn và hybrid là điều kiện bắt buộc với ứng viên, hãy cân nhắc lại trước khi đầu tư vào các vòng sau.',
    },
  },
  verificationNotes: [
    {
      en: "VERIFIED — JD text: read on 2026-11-27 via LinkedIn's public guest endpoint (https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4492566584), because the /jobs/view/ URL shows a sign-in wall. A near-identical copy on Joboko (https://vn.joboko.com/viec-lam-senior-frontend-dev-english-xvi6755251) adds the E-town 2 office, 4–10 years of experience and the 26/12/2026 deadline. Details are in Section 1 (BOOKMARK_ISB_JD).",
      vi: "ĐÃ XÁC MINH — Nội dung JD: đọc ngày 27/11/2026 qua endpoint công khai cho khách của LinkedIn (https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4492566584), vì URL /jobs/view/ yêu cầu đăng nhập. Bản gần như giống hệt trên Joboko (https://vn.joboko.com/viec-lam-senior-frontend-dev-english-xvi6755251) bổ sung văn phòng E-town 2, 4–10 năm kinh nghiệm và hạn nộp 26/12/2026. Chi tiết ở Section 1 (BOOKMARK_ISB_JD).",
    },
    {
      en: "VERIFIED — Interview focus checked against the JD: React + TypeScript, high-performance architecture, real-time financial dashboards, WebSocket + SSE, high-frequency streaming, browser rendering, memory leak detection, virtualized tables, charting, Zustand (one of Zustand/RTK/Jotai), Rust/Python backends, trading concepts (preferred) and automated testing. The JD also names Next.js, Linux environments, accessible component libraries, micro-frontends/microservices and a customer web portal.",
      vi: "ĐÃ XÁC MINH — Focus phỏng vấn đã được đối chiếu với JD: React + TypeScript, kiến trúc hiệu năng cao, dashboard tài chính real-time, WebSocket + SSE, streaming tần suất cao, rendering của trình duyệt, phát hiện memory leak, virtualized table, charting, Zustand (một trong Zustand/RTK/Jotai), backend Rust/Python, kiến thức trading (ưu tiên) và automated testing. JD còn nêu Next.js, môi trường Linux, thư viện component accessible, micro-frontend/microservices và customer web portal.",
    },
    {
      en: 'NOT IN THE JD — TanStack Query is not mentioned. React rendering optimization is implied by "browser rendering" and "state management" but not stated. Both are kept as preparation topics and labelled accordingly.',
      vi: 'KHÔNG CÓ TRONG JD — TanStack Query không được nhắc tới. Tối ưu React rendering được suy ra từ "browser rendering" và "state management" nhưng không ghi trực tiếp. Cả hai vẫn được giữ làm chủ đề chuẩn bị và được gắn nhãn tương ứng.',
    },
    {
      en: 'STATUS RISK — On 2026-11-27 LinkedIn showed "No longer accepting applications" (posted about 6 days earlier). The Joboko copy was still open. Confirm with the recruiter that the role is open.',
      vi: 'RỦI RO VỀ TÌNH TRẠNG — Ngày 27/11/2026 LinkedIn hiển thị "No longer accepting applications" (đăng khoảng 6 ngày trước). Bản trên Joboko vẫn mở. Cần xác nhận với recruiter rằng vị trí còn tuyển.',
    },
    {
      en: "VERIFIED — Company facts (IVC, founded 2003 by Japan's ISB Group, about 130 employees, offshore dedicated-team model, Japan as the main market, ISO 27001) come from https://isb-vietnam.com.vn/company/ and https://isb-vietnam.com.vn/services/outsourcing/. Office hours (Mon–Fri 08:00–17:00) come from TopDev (https://topdev.vn/companies/isb-vietnam-84189). Details are in Section 2 (BOOKMARK_ISB_COMPANY).",
      vi: "ĐÃ XÁC MINH — Thông tin công ty (IVC, thành lập năm 2003 bởi ISB Group Nhật Bản, khoảng 130 nhân sự, mô hình dedicated team offshore, thị trường chính là Nhật, ISO 27001) lấy từ https://isb-vietnam.com.vn/company/ và https://isb-vietnam.com.vn/services/outsourcing/. Giờ làm việc (Thứ 2–Thứ 6, 08:00–17:00) lấy từ TopDev (https://topdev.vn/companies/isb-vietnam-84189). Chi tiết ở Section 2 (BOOKMARK_ISB_COMPANY).",
    },
    {
      en: "UNVERIFIED — Working arrangement (on-site, hybrid or remote), salary range, team size, end client, interview process, required English level and whether the front-end engineer writes Python. None of these are stated anywhere that was read.",
      vi: "CHƯA XÁC MINH — Hình thức làm việc (onsite, hybrid hay remote), khoảng lương, quy mô team, khách hàng cuối, quy trình phỏng vấn, mức tiếng Anh yêu cầu, và việc kỹ sư frontend có viết Python hay không. Không nguồn nào đã đọc nêu các thông tin này.",
    },
    {
      en: 'NOT READ — A related ITviec listing ("Middle/Senior Fullstack Dev (TypeScript/Python)") returned 403. A press feature was seen only in a search summary. Third-party company-size ranges disagree with each other. None of these are used as facts.',
      vi: 'CHƯA ĐỌC ĐƯỢC — Một tin ITviec liên quan ("Middle/Senior Fullstack Dev (TypeScript/Python)") trả về lỗi 403. Một bài báo chỉ thấy qua phần tóm tắt kết quả tìm kiếm. Các con số quy mô công ty từ bên thứ ba không thống nhất với nhau. Không thông tin nào trong số này được dùng như sự thật.',
    },
  ],
  unsupportedClaims: [
    {
      en: 'The inferred platform architecture (Rust ingestion and Python analytics → WebSocket/SSE gateway → Web Worker batching → Zustand live store → virtualized blotters and canvas charts) is an ASSUMPTION based on the JD wording, not a described system. Frame it as "how I would expect it to look".',
      vi: 'Kiến trúc nền tảng được suy ra (Rust ingestion và Python analytics → gateway WebSocket/SSE → batching bằng Web Worker → live store Zustand → blotter virtualized và chart canvas) là GIẢ ĐỊNH dựa trên câu chữ trong JD, không phải hệ thống đã được mô tả. Hãy nói theo kiểu "tôi đoán hệ thống sẽ trông như thế này".',
    },
    {
      en: "That the platform belongs to an overseas (possibly Japanese) client served through IVC's dedicated-team model is an ASSUMPTION. Do not name or guess the client.",
      vi: "Việc nền tảng thuộc về một khách hàng nước ngoài (có thể là Nhật) phục vụ qua mô hình dedicated team của IVC là GIẢ ĐỊNH. Không nêu tên hay đoán khách hàng.",
    },
    {
      en: "Hybrid work is NOT confirmed. Company pages suggest fixed office hours, so the role may be fully on-site. Do not say or imply that hybrid is available.",
      vi: "Hybrid CHƯA được xác nhận. Trang công ty cho thấy giờ hành chính cố định nên vị trí có thể là onsite hoàn toàn. Không được nói hay ngụ ý là có hybrid.",
    },
    {
      en: "No salary figure, team size or interview process is verified. Do not quote any number.",
      vi: "Không có con số lương, quy mô team hay quy trình phỏng vấn nào đã được xác minh. Không đưa ra bất kỳ con số nào.",
    },
    {
      en: "Do not assume the team uses TanStack Query or a specific charting library. Neither is stated (the charting libraries are only listed as preferred skills).",
      vi: "Không mặc định team dùng TanStack Query hay một thư viện chart cụ thể. JD không nêu điều đó (các thư viện chart chỉ được liệt kê là kỹ năng ưu tiên).",
    },
    {
      en: 'The candidate has NO production experience with trading systems, market data, financial charting, Rust, WebGL, SSE, virtualized tables or heap-snapshot leak hunting. All answers on these topics are theoretical knowledge or recommended approaches and must be phrased that way ("I would…", "the approach I\'d take is…").',
      vi: 'Ứng viên KHÔNG có kinh nghiệm production với hệ thống trading, market data, chart tài chính, Rust, WebGL, SSE, virtualized table hay truy tìm leak bằng heap snapshot. Mọi câu trả lời về các chủ đề này là kiến thức lý thuyết hoặc recommended approach và phải diễn đạt đúng như vậy ("tôi sẽ…", "cách tôi tiếp cận là…").',
    },
    {
      en: "Socket.IO at Ninja Van carried logistics events, not high-frequency market data. Do not claim message rates, latency numbers or scale figures.",
      vi: "Socket.IO ở Ninja Van truyền sự kiện logistics, không phải market data tần suất cao. Không đưa ra số liệu về tốc độ message, độ trễ hay quy mô.",
    },
    {
      en: "NAB work was on Adobe Experience Manager (Sites, Assets/DAM, Forms) in a banking environment, not trading or core-banking engineering. Do not present it as fintech trading experience.",
      vi: "Công việc ở NAB là Adobe Experience Manager (Sites, Assets/DAM, Forms) trong môi trường ngân hàng, không phải trading hay core banking. Không trình bày đây là kinh nghiệm fintech trading.",
    },
    {
      en: "No performance metrics exist for the Persefoni prefetching/caching work or any other project. Describe the approach and the qualitative outcome only, unless the candidate adds real numbers to the profile.",
      vi: "Không có số liệu hiệu năng nào cho việc prefetching/caching ở Persefoni hay bất kỳ dự án nào khác. Chỉ mô tả cách tiếp cận và kết quả định tính, trừ khi ứng viên bổ sung số liệu thật vào hồ sơ.",
    },
    {
      en: "Next.js, Zustand, Redux, Python/FastAPI, micro-frontends, Playwright and Cypress are listed skills that are not tied to a specific employer. Do not attribute them to Persefoni, Ninja Van or NAB.",
      vi: "Next.js, Zustand, Redux, Python/FastAPI, micro-frontend, Playwright và Cypress là kỹ năng được liệt kê nhưng không gắn với công ty cụ thể. Không gán chúng cho Persefoni, Ninja Van hay NAB.",
    },
    {
      en: "The technical-disagreement STAR answer (Q59) is a theoretical template. The candidate must replace it with a real story before using it.",
      vi: "Câu trả lời STAR về bất đồng kỹ thuật (Q59) chỉ là template lý thuyết. Ứng viên phải thay bằng câu chuyện thật trước khi dùng.",
    },
  ],
};
