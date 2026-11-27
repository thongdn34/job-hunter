import type { InterviewerQuestions } from "@/domain/package/schema";

/**
 * Section 11 — Questions for the interviewer (ISB Vietnam, Senior Front-End Developer).
 *
 * Several questions deliberately verify items that the JD does not state or that are only
 * assumptions in Sections 1–2: the end client / product, the Rust/Python backend split,
 * whether the FE engineer writes Python, on-site vs hybrid, English level, and whether the
 * LinkedIn posting (shown as "No longer accepting applications" on 2026-11-27) is still open.
 * No salary figures and no client names are stated here — they are things to ask, not facts.
 */
export const isbHr: InterviewerQuestions = {
  groups: [
    {
      category: "technical-architecture",
      title: { en: "Technical architecture", vi: "Kiến trúc kỹ thuật" },
      questions: [
        {
          id: "hr-arch-1",
          text: {
            en: "The JD describes a cloud-native trade capture and analytics platform with Rust and Python backends. Could you walk me through how market and trade data flows from those services to the browser — is it WebSocket, SSE, or a mix, and is there a gateway or BFF in between?",
            vi: "JD mô tả một nền tảng trade capture và analytics cloud-native với backend Rust và Python. Anh/chị có thể mô tả luồng dữ liệu market và trade đi từ các service đó tới browser không — dùng WebSocket, SSE hay kết hợp cả hai, và giữa đó có gateway hay BFF nào không?",
          },
          why: {
            en: "Verifies the inferred architecture (Rust ingestion + Python analytics → WS/SSE gateway → browser), which is only an assumption in the JD analysis. The answer tells you where backpressure, conflation and auth for streams are handled.",
            vi: "Xác minh kiến trúc đang được suy luận (Rust ingestion + Python analytics → WS/SSE gateway → browser) — hiện mới chỉ là assumption. Câu trả lời cho bạn biết backpressure, conflation và auth cho stream được xử lý ở đâu.",
          },
        },
        {
          id: "hr-arch-2",
          text: {
            en: "Roughly what update rates and data volumes does the UI need to handle — ticks per second per instrument, number of rows in the largest blotters — and are there agreed latency or frame-rate targets?",
            vi: "Về đại khái, UI cần xử lý tần suất update và khối lượng dữ liệu cỡ nào — bao nhiêu tick mỗi giây cho mỗi instrument, blotter lớn nhất có bao nhiêu dòng — và team đã có target cụ thể về latency hay frame rate chưa?",
          },
          why: {
            en: '"High-frequency data streams" can mean 10 updates/sec or 10,000. The answer decides whether you talk about simple throttling or about Web Workers, binary protocols and canvas rendering — and shows you think in measurable budgets.',
            vi: '"High-frequency data streams" có thể là 10 update/giây hoặc 10.000. Câu trả lời quyết định bạn nên nói về throttling đơn giản hay về Web Worker, binary protocol và canvas rendering — đồng thời cho thấy bạn tư duy theo budget đo được.',
          },
        },
        {
          id: "hr-arch-3",
          text: {
            en: "What does the current frontend stack look like — React with Next.js or a Vite SPA, and which of Zustand, Redux Toolkit or Jotai is actually in use? Is this a greenfield build or an existing codebase?",
            vi: "Stack frontend hiện tại như thế nào — React với Next.js hay SPA dùng Vite, và trong Zustand, Redux Toolkit, Jotai thì team đang thực sự dùng cái nào? Đây là dự án greenfield hay codebase đã có sẵn?",
          },
          why: {
            en: "The JD lists Next.js and three state libraries as options. Knowing the real choice (and greenfield vs legacy) lets you tailor answers and judge how much architecture you would actually own.",
            vi: "JD liệt kê Next.js và ba thư viện state như các lựa chọn. Biết lựa chọn thật (và greenfield hay legacy) giúp bạn điều chỉnh câu trả lời và đánh giá mình sẽ thực sự own bao nhiêu phần kiến trúc.",
          },
        },
        {
          id: "hr-arch-4",
          text: {
            en: "How are API contracts between the frontend and the Rust/Python services defined and versioned — OpenAPI, JSON Schema, protobuf — and is any data sent in a binary format over the stream?",
            vi: "Contract API giữa frontend và các service Rust/Python được định nghĩa và versioning thế nào — OpenAPI, JSON Schema hay protobuf — và có dữ liệu nào được gửi dạng binary qua stream không?",
          },
          why: {
            en: "Shows you care about schema evolution and type safety across language boundaries, and confirms the Rust/Python backend detail stated in the JD.",
            vi: "Cho thấy bạn quan tâm tới schema evolution và type safety giữa các ngôn ngữ khác nhau, đồng thời xác nhận chi tiết backend Rust/Python mà JD đề cập.",
          },
        },
        {
          id: "hr-arch-5",
          text: {
            en: "Which charting and grid libraries are you using today — Lightweight Charts, Highcharts, D3, visx, or custom canvas — and have you hit performance limits with them yet?",
            vi: "Hiện team đang dùng thư viện chart và grid nào — Lightweight Charts, Highcharts, D3, visx hay canvas tự viết — và đã chạm tới giới hạn performance của chúng chưa?",
          },
          why: {
            en: 'Charting is a preferred skill in the JD. Hearing where they are struggling gives you a concrete problem to discuss and reveals whether the role is more "build new" or "optimise existing".',
            vi: 'Charting là preferred skill trong JD. Nghe team đang gặp khó ở đâu giúp bạn có vấn đề cụ thể để thảo luận và biết vai trò thiên về "xây mới" hay "tối ưu cái đã có".',
          },
        },
      ],
    },
    {
      category: "project-responsibilities",
      title: { en: "Project and responsibilities", vi: "Dự án và trách nhiệm" },
      questions: [
        {
          id: "hr-proj-1",
          text: {
            en: "Can you tell me more about the product itself — is it a trading or execution platform for an external client, and what kind of users and asset classes does it serve? I understand some details may be confidential.",
            vi: "Anh/chị có thể chia sẻ thêm về chính sản phẩm không — đây có phải là nền tảng trading hoặc execution cho một khách hàng bên ngoài, phục vụ loại user và asset class nào? Em hiểu là một số thông tin có thể cần bảo mật.",
          },
          why: {
            en: "The client and domain are unverified — ISB Vietnam works mainly through a dedicated-team outsourcing model, and its public fintech case studies are older FX systems. Acknowledging confidentiality up front makes the question easy to answer.",
            vi: "Khách hàng và domain chưa được xác minh — ISB Vietnam chủ yếu làm theo mô hình dedicated team outsourcing, và các case study fintech công khai là hệ thống FX đời cũ. Chủ động nói trước về tính bảo mật giúp người phỏng vấn dễ trả lời hơn.",
          },
        },
        {
          id: "hr-proj-2",
          text: {
            en: "The JD mentions both internal power users and a customer web portal for non-technical users. How would my time be split between the trading analytics screens and the customer portal?",
            vi: "JD nhắc tới cả internal power user lẫn một customer web portal cho người dùng không chuyên kỹ thuật. Thời gian của em sẽ được chia thế nào giữa các màn hình trading analytics và customer portal?",
          },
          why: {
            en: "These are very different problems — dense, keyboard-driven, high-frequency UIs versus accessible, simple purchase flows. It tells you which experience (real-time vs WCAG/accessibility) to emphasise.",
            vi: "Đây là hai bài toán rất khác nhau — UI dày đặc, điều khiển bằng bàn phím, update tần suất cao so với luồng mua hàng đơn giản, accessible. Câu trả lời cho bạn biết nên nhấn mạnh kinh nghiệm nào (real-time hay WCAG/accessibility).",
          },
        },
        {
          id: "hr-proj-3",
          text: {
            en: "Python is in the job title. Is the frontend engineer expected to write or maintain Python code — for example a BFF or FastAPI endpoints — or is it mainly about integrating with Python services?",
            vi: "Python có trong tiêu đề công việc. Frontend engineer có cần viết hoặc maintain code Python không — ví dụ BFF hay endpoint FastAPI — hay chủ yếu là tích hợp với các service Python?",
          },
          why: {
            en: "Unverified: the JD body only mentions Python as a backend. The answer changes your preparation priorities and lets you position your Python/FastAPI skills honestly.",
            vi: "Chưa xác minh: phần nội dung JD chỉ nhắc Python như backend. Câu trả lời thay đổi thứ tự ưu tiên ôn tập và giúp bạn trình bày kỹ năng Python/FastAPI một cách trung thực.",
          },
        },
        {
          id: "hr-proj-4",
          text: {
            en: 'The JD says "lead the front-end development". What does leading mean here — owning architecture decisions, reviewing others\' code, mentoring, or being the main technical contact for the client?',
            vi: 'JD ghi "lead the front-end development". Ở đây "lead" nghĩa là gì — own các quyết định kiến trúc, review code của người khác, mentoring, hay là đầu mối kỹ thuật chính với khách hàng?',
          },
          why: {
            en: "Clarifies seniority expectations and decision rights, which differ a lot in an outsourcing setup where the client may own architecture.",
            vi: "Làm rõ kỳ vọng về seniority và quyền quyết định — điều này khác nhau nhiều trong mô hình outsourcing, nơi khách hàng có thể là bên quyết định kiến trúc.",
          },
        },
        {
          id: "hr-proj-5",
          text: {
            en: "What would success look like for this role after the first three and six months?",
            vi: "Sau ba tháng và sáu tháng đầu, thế nào được xem là thành công cho vị trí này?",
          },
          why: {
            en: "Turns vague expectations into concrete goals and signals an outcome-oriented mindset.",
            vi: "Biến kỳ vọng mơ hồ thành mục tiêu cụ thể và cho thấy bạn có tư duy hướng tới kết quả.",
          },
        },
      ],
    },
    {
      category: "engineering-culture",
      title: { en: "Engineering culture", vi: "Văn hóa kỹ thuật" },
      questions: [
        {
          id: "hr-cult-1",
          text: {
            en: "How do you test real-time features today — do you have unit, integration and Playwright or Cypress E2E suites running in CI, and how do you keep streaming tests from being flaky?",
            vi: "Hiện team test các tính năng real-time như thế nào — có bộ unit, integration và E2E bằng Playwright hoặc Cypress chạy trong CI không, và làm sao để test streaming không bị flaky?",
          },
          why: {
            en: "Automated UI testing is a verified requirement. The answer shows the maturity of the test suite and whether you would be building it or extending it.",
            vi: "Automated UI testing là yêu cầu đã được xác minh. Câu trả lời cho thấy mức độ trưởng thành của bộ test và bạn sẽ xây mới hay mở rộng nó.",
          },
        },
        {
          id: "hr-cult-2",
          text: {
            en: "How do you measure and guard frontend performance — profiling, performance budgets in CI, real-user monitoring, memory checks for long-running sessions?",
            vi: "Team đo lường và bảo vệ performance frontend như thế nào — profiling, performance budget trong CI, real-user monitoring, kiểm tra memory cho các session chạy lâu?",
          },
          why: {
            en: "The JD stresses rendering performance and memory leak detection. Asking about guardrails shows you treat performance as a continuous practice, not a one-off fix.",
            vi: "JD nhấn mạnh rendering performance và memory leak detection. Hỏi về các cơ chế bảo vệ cho thấy bạn xem performance là việc làm liên tục, không phải sửa một lần.",
          },
        },
        {
          id: "hr-cult-3",
          text: {
            en: "What does the code review and release process look like — how often do you ship, who approves releases, and how much of that is shaped by the client's process?",
            vi: "Quy trình code review và release như thế nào — bao lâu release một lần, ai approve release, và quy trình của khách hàng ảnh hưởng tới việc đó bao nhiêu?",
          },
          why: {
            en: "In a Japan-rooted outsourcing company the process may be more formal (an assumption). It helps you understand the pace and documentation expectations.",
            vi: "Ở một công ty outsourcing gốc Nhật, quy trình có thể formal hơn (đây là assumption). Câu hỏi giúp bạn hiểu nhịp độ làm việc và kỳ vọng về tài liệu.",
          },
        },
        {
          id: "hr-cult-4",
          text: {
            en: "The JD mentions a modular, accessible component library. Is there an existing design system, and what accessibility standard do you target — for example WCAG 2.1 or 2.2 AA?",
            vi: "JD nhắc tới một component library dạng module và có accessibility. Team đã có design system chưa, và đang hướng tới chuẩn accessibility nào — ví dụ WCAG 2.1 hay 2.2 mức AA?",
          },
          why: {
            en: "Connects directly to your real Persefoni WCAG, keyboard-navigation and ARIA work, and reveals whether accessibility is actually enforced.",
            vi: "Liên kết trực tiếp với kinh nghiệm thật của bạn ở Persefoni về WCAG, keyboard navigation và ARIA, đồng thời cho biết accessibility có thực sự được áp dụng hay không.",
          },
        },
      ],
    },
    {
      category: "team-structure",
      title: { en: "Team structure", vi: "Cơ cấu team" },
      questions: [
        {
          id: "hr-team-1",
          text: {
            en: "How is the team structured — how many frontend and backend engineers, QA, and designers, and are the Rust/Python engineers in Ho Chi Minh City or on the client side?",
            vi: "Team được tổ chức thế nào — bao nhiêu frontend, backend engineer, QA và designer, và các engineer Rust/Python ở TP.HCM hay ở phía khách hàng?",
          },
          why: {
            en: "Team size is not stated anywhere. Knowing where backend engineers sit tells you how hard API coordination and time-zone overlap will be.",
            vi: "Quy mô team chưa được nêu ở đâu cả. Biết backend engineer ngồi ở đâu giúp bạn hiểu việc phối hợp API và chênh lệch múi giờ sẽ khó tới mức nào.",
          },
        },
        {
          id: "hr-team-2",
          text: {
            en: "Is this a dedicated team for one client? How much direct contact would I have with the client's engineers and product people, and in which language?",
            vi: "Đây có phải là dedicated team cho một khách hàng không? Em sẽ làm việc trực tiếp với engineer và product của khách hàng ở mức nào, và bằng ngôn ngữ gì?",
          },
          why: {
            en: "ISB Vietnam's dedicated-team model is verified; whether this role follows it is an assumption. The language question also checks the English level implied by the Joboko title.",
            vi: "Mô hình dedicated team của ISB Vietnam đã được xác minh; việc vị trí này có theo mô hình đó hay không vẫn là assumption. Câu hỏi về ngôn ngữ cũng giúp kiểm tra mức tiếng Anh mà tiêu đề trên Joboko ngầm yêu cầu.",
          },
        },
        {
          id: "hr-team-3",
          text: {
            en: "Who would I report to, and who makes the final call on frontend technical decisions?",
            vi: "Em sẽ report cho ai, và ai là người quyết định cuối cùng về các vấn đề kỹ thuật frontend?",
          },
          why: {
            en: "Clarifies the decision-making chain — important for a role described as leading frontend development.",
            vi: "Làm rõ chuỗi ra quyết định — điều quan trọng với một vị trí được mô tả là lead phát triển frontend.",
          },
        },
        {
          id: "hr-team-4",
          text: {
            en: "How do product designers and engineers work together — do designs come from the client, from an in-house designer, or are engineers expected to shape the UX for dense trading screens?",
            vi: "Product designer và engineer phối hợp với nhau thế nào — design đến từ khách hàng, từ designer nội bộ, hay engineer cần tự định hình UX cho các màn hình trading dày đặc thông tin?",
          },
          why: {
            en: "The JD says you will work closely with product designers. This reveals how much UX ownership you would have.",
            vi: "JD nói bạn sẽ làm việc chặt chẽ với product designer. Câu hỏi này cho biết bạn sẽ own phần UX tới đâu.",
          },
        },
      ],
    },
    {
      category: "career-growth",
      title: { en: "Career growth", vi: "Phát triển sự nghiệp" },
      questions: [
        {
          id: "hr-grow-1",
          text: {
            en: "What growth paths exist for a senior frontend engineer here — technical leader, architect, or moving across projects?",
            vi: "Ở đây senior frontend engineer có những hướng phát triển nào — technical leader, architect, hay chuyển qua các dự án khác?",
          },
          why: {
            en: "The careers page lists a Technical Leader role covering React, Angular and Vue, so a leadership track probably exists — this confirms how it works in practice.",
            vi: "Trang tuyển dụng có vị trí Technical Leader bao gồm React, Angular và Vue, nên nhiều khả năng có lộ trình leadership — câu hỏi này xác nhận nó vận hành thực tế ra sao.",
          },
        },
        {
          id: "hr-grow-2",
          text: {
            en: "How long does a typical engagement with a client last, and what happens to the team if the project ends or scales down?",
            vi: "Một engagement với khách hàng thường kéo dài bao lâu, và điều gì xảy ra với team nếu dự án kết thúc hoặc thu hẹp?",
          },
          why: {
            en: "In outsourcing, project stability is a real career risk. It is a fair question and the answer reveals how the company handles bench time.",
            vi: "Trong outsourcing, độ ổn định của dự án là rủi ro thật cho sự nghiệp. Đây là câu hỏi hợp lý, và câu trả lời cho biết công ty xử lý thời gian chờ dự án (bench) thế nào.",
          },
        },
        {
          id: "hr-grow-3",
          text: {
            en: "The benefits mention training courses and a language certificate allowance. Is there a budget for technical learning too — conferences, courses, or time to prototype ideas such as WebAssembly for hot paths?",
            vi: "Phần phúc lợi có nhắc tới khóa đào tạo và phụ cấp chứng chỉ ngoại ngữ. Có ngân sách cho việc học kỹ thuật không — hội thảo, khóa học, hay thời gian để thử nghiệm ý tưởng như WebAssembly cho các hot path?",
          },
          why: {
            en: "Builds on verified benefits and shows you plan to keep growing in the deep technical areas this role needs.",
            vi: "Dựa trên phúc lợi đã được xác minh và cho thấy bạn có kế hoạch tiếp tục phát triển ở các mảng kỹ thuật chuyên sâu mà vị trí này cần.",
          },
        },
      ],
    },
    {
      category: "compensation",
      title: { en: "Compensation and benefits", vi: "Lương thưởng và phúc lợi" },
      questions: [
        {
          id: "hr-comp-1",
          text: {
            en: "The listing says salary is negotiable. Could you share the budgeted range for this position so we can make sure we're aligned early?",
            vi: "Tin tuyển dụng ghi lương thỏa thuận. Anh/chị có thể chia sẻ khoảng ngân sách cho vị trí này để hai bên sớm thống nhất kỳ vọng không?",
          },
          why: {
            en: 'No range is published ("negotiable" on Joboko). Asking early avoids wasting both sides\' time; ask the recruiter rather than the technical panel.',
            vi: 'Không có khoảng lương công khai (Joboko ghi "negotiable"). Hỏi sớm giúp hai bên không mất thời gian; nên hỏi recruiter thay vì hội đồng kỹ thuật.',
          },
        },
        {
          id: "hr-comp-2",
          text: {
            en: "How are the 13th-month salary and the performance bonus calculated, and how often are salary reviews held?",
            vi: "Lương tháng 13 và performance bonus được tính thế nào, và bao lâu thì review lương một lần?",
          },
          why: {
            en: "Both are verified benefits, but their structure is not — these details matter more than the headline number over a year.",
            vi: "Cả hai đều là phúc lợi đã được xác minh, nhưng cách tính thì chưa — những chi tiết này quan trọng hơn con số chính khi tính trên cả năm.",
          },
        },
        {
          id: "hr-comp-3",
          text: {
            en: "Is the offer in gross or net, and are there other components I should know about — probation terms, insurance coverage for family, or an allowance for an English or Japanese certificate?",
            vi: "Offer tính theo gross hay net, và còn thành phần nào khác em nên biết không — điều kiện thử việc, bảo hiểm cho gia đình, hay phụ cấp chứng chỉ tiếng Anh hoặc tiếng Nhật?",
          },
          why: {
            en: "Gross vs net and probation terms are common sources of misunderstanding in Vietnam offers. Premium healthcare and the language allowance are verified, but the details are not.",
            vi: "Gross hay net và điều kiện thử việc là chỗ hay gây hiểu lầm trong offer ở Việt Nam. Premium healthcare và phụ cấp ngoại ngữ đã được xác minh, nhưng chi tiết thì chưa.",
          },
        },
      ],
    },
    {
      category: "working-arrangements",
      title: { en: "Working arrangements", vi: "Hình thức làm việc" },
      questions: [
        {
          id: "hr-work-1",
          text: {
            en: "Is this role fully on-site at the E-town 2 office, or is there flexibility for hybrid work — for example a few days from home each week?",
            vi: "Vị trí này làm việc hoàn toàn on-site tại văn phòng E-town 2, hay có thể linh hoạt làm hybrid — ví dụ vài ngày mỗi tuần làm ở nhà?",
          },
          why: {
            en: "Critical: the JD does not state the arrangement and company-level listings show fixed Mon–Fri 08:00–17:00 office hours, so it is probably on-site. Your preference is hybrid — confirm this before investing in later rounds.",
            vi: "Quan trọng: JD không nói rõ hình thức làm việc, và thông tin cấp công ty cho thấy giờ hành chính cố định thứ Hai–thứ Sáu 08:00–17:00, nên nhiều khả năng là on-site. Bạn ưu tiên hybrid — hãy xác nhận điều này trước khi đầu tư vào các vòng sau.",
          },
        },
        {
          id: "hr-work-2",
          text: {
            en: "Are working hours fixed, and does the team need to overlap with the client's time zone or support market hours, releases or incidents outside office time?",
            vi: "Giờ làm việc có cố định không, và team có cần trùng giờ với múi giờ của khách hàng, hay hỗ trợ trong giờ giao dịch, release hoặc sự cố ngoài giờ hành chính không?",
          },
          why: {
            en: "Trading systems are often tied to market hours, and the client's location is unknown. This uncovers on-call or late-meeting expectations early.",
            vi: "Hệ thống trading thường gắn với giờ thị trường, và vị trí của khách hàng chưa được biết. Câu hỏi giúp phát hiện sớm kỳ vọng về on-call hoặc họp muộn.",
          },
        },
        {
          id: "hr-work-3",
          text: {
            en: "The JD mentions Linux-based desktop and build environments. Do engineers develop on Linux machines provided by the company, and are there security restrictions — such as ISO 27001 controls — on devices, network or remote access?",
            vi: "JD nhắc tới môi trường desktop và build trên Linux. Engineer có phát triển trên máy Linux do công ty cấp không, và có hạn chế bảo mật nào — ví dụ các control theo ISO 27001 — về thiết bị, mạng hay remote access không?",
          },
          why: {
            en: "Linux is a verified requirement and ISB Vietnam is ISO 27001 certified. Security controls often explain why remote work is limited, so this connects to the hybrid question.",
            vi: "Linux là yêu cầu đã được xác minh và ISB Vietnam có chứng nhận ISO 27001. Các control bảo mật thường là lý do hạn chế làm remote, nên câu này liên quan trực tiếp tới câu hỏi về hybrid.",
          },
        },
      ],
    },
    {
      category: "interview-process",
      title: { en: "Interview process", vi: "Quy trình phỏng vấn" },
      questions: [
        {
          id: "hr-proc-1",
          text: {
            en: "I noticed the LinkedIn posting is marked as no longer accepting applications, while another listing is still open. Is the position still active, and how many openings are there?",
            vi: "Em thấy tin trên LinkedIn đang ghi là không còn nhận hồ sơ, trong khi một tin khác vẫn mở. Vị trí này còn tuyển không, và đang tuyển bao nhiêu người?",
          },
          why: {
            en: 'On 2026-11-27 LinkedIn showed "No longer accepting applications" while the Joboko copy was open until 26/12/2026. Ask the recruiter first so you do not prepare for a closed role.',
            vi: 'Ngày 2026-11-27, LinkedIn hiển thị "No longer accepting applications" trong khi bản trên Joboko vẫn mở tới 26/12/2026. Hãy hỏi recruiter trước để không ôn tập cho một vị trí đã đóng.',
          },
        },
        {
          id: "hr-proc-2",
          text: {
            en: "What are the stages of the interview process — is there a live coding round, a take-home task, or a frontend system design discussion — and will the client be involved in any round?",
            vi: "Quy trình phỏng vấn gồm những vòng nào — có live coding, bài take-home, hay thảo luận frontend system design không — và khách hàng có tham gia vòng nào không?",
          },
          why: {
            en: "The interview process is unverified. In a dedicated-team model the client sometimes runs a final technical round, often in English.",
            vi: "Quy trình phỏng vấn chưa được xác minh. Trong mô hình dedicated team, khách hàng đôi khi tự tổ chức vòng kỹ thuật cuối, thường bằng tiếng Anh.",
          },
        },
        {
          id: "hr-proc-3",
          text: {
            en: "Will the interviews be in-person or online, and in English or Vietnamese?",
            vi: "Các vòng phỏng vấn sẽ diễn ra trực tiếp hay online, và bằng tiếng Anh hay tiếng Việt?",
          },
          why: {
            en: "Company listings mention online interviews only for emergencies, so expect in-person rounds. Knowing the language lets you practise answers in the right one.",
            vi: "Thông tin công ty cho biết chỉ phỏng vấn online trong trường hợp khẩn cấp, nên hãy chuẩn bị cho các vòng trực tiếp. Biết ngôn ngữ phỏng vấn giúp bạn luyện câu trả lời đúng ngôn ngữ.",
          },
        },
        {
          id: "hr-proc-4",
          text: {
            en: "What is the expected timeline from now to an offer, and is there anything about my background you'd like me to clarify before the next step?",
            vi: "Từ giờ tới lúc có offer thường mất bao lâu, và có điểm nào trong background của em mà anh/chị muốn em làm rõ thêm trước bước tiếp theo không?",
          },
          why: {
            en: "The second half invites the interviewer to raise doubts (for example no production trading or Rust experience) while you can still address them honestly.",
            vi: "Vế sau mời người phỏng vấn nêu ra băn khoăn (ví dụ chưa có kinh nghiệm production về trading hay Rust) khi bạn vẫn còn cơ hội giải thích một cách trung thực.",
          },
        },
      ],
    },
  ],
};
