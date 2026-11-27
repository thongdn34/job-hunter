import type { IntroSection } from "@/domain/package/schema";

/**
 * Section 5 — Self-introduction for ISB Vietnam, Senior Front-End Developer.
 * Only actual experience (Persefoni, Ninja Van — TechLab, NAB). No metrics, no trading production claims.
 * Company order is not chronological on purpose: employment periods are unknown.
 */
export const isbIntro: IntroSection = {
  variants: [
    {
      durationSeconds: 30,
      script: {
        en: "Hi, I'm [Your Name], a senior software engineer with more than seven years of experience, mainly in React and TypeScript front-end architecture. At Persefoni, I built data-heavy enterprise features with React, GraphQL and TanStack Query, including background prefetching and caching. At Ninja Van, I built real-time features with Socket.IO. Data-heavy UIs plus real-time updates is exactly the mix this role needs, so I'm genuinely excited to talk about your trading analytics platform today.",
        vi: "Chào anh/chị, em là [Tên của bạn], senior software engineer với hơn bảy năm kinh nghiệm, chủ yếu về kiến trúc front-end với React và TypeScript. Ở Persefoni, em xây dựng các tính năng enterprise nhiều dữ liệu với React, GraphQL và TanStack Query, bao gồm background prefetching và caching. Ở Ninja Van, em làm các tính năng real-time bằng Socket.IO. UI nhiều dữ liệu cộng với cập nhật real-time chính là sự kết hợp mà vị trí này cần, nên em rất hào hứng được trao đổi về nền tảng trading analytics của bên mình.",
      },
      memoryShortcut: {
        en: "W-P-N-W: Who I am → Persefoni (data) → Ninja Van (real-time) → Why this role.",
        vi: "W-P-N-W: Tôi là ai → Persefoni (dữ liệu) → Ninja Van (real-time) → Vì sao chọn vị trí này.",
      },
      keyPoints: [
        {
          en: "7+ years, React and TypeScript front-end architecture as the core strength.",
          vi: "Hơn 7 năm, thế mạnh cốt lõi là kiến trúc front-end React và TypeScript.",
        },
        {
          en: "Persefoni: data-heavy enterprise UIs, TanStack Query prefetching and caching.",
          vi: "Persefoni: UI enterprise nhiều dữ liệu, prefetching và caching với TanStack Query.",
        },
        {
          en: "Ninja Van: real-time features with Socket.IO.",
          vi: "Ninja Van: tính năng real-time với Socket.IO.",
        },
        {
          en: "Bridge: data-heavy + real-time = what a trading analytics UI needs.",
          vi: "Cầu nối: nhiều dữ liệu + real-time = đúng thứ mà UI trading analytics cần.",
        },
      ],
    },
    {
      durationSeconds: 60,
      script: {
        en: "Hi, I'm [Your Name]. I'm a senior software engineer with more than seven years of experience, and my core strength is React and TypeScript front-end architecture. At Persefoni, a carbon accounting platform, I built enterprise features with React, GraphQL and TanStack Query. A big part of that was background prefetching and caching, so data-heavy screens stayed fast. I also worked in a Vite and Turborepo monorepo, and I did a lot of WCAG accessibility work, like keyboard navigation and ARIA. At Ninja Van's TechLab, I built real-time features with Socket.IO, integrated thermal printers, and generated shipping labels with ZPL. At NAB, I worked on Adobe Experience Manager in a banking environment, supporting deployments and stakeholders. What draws me to this role is the combination of real-time streaming, large datasets and complex financial UIs. Trading is a new domain for me, and I've been studying it seriously.",
        vi: "Chào anh/chị, em là [Tên của bạn]. Em là senior software engineer với hơn bảy năm kinh nghiệm, thế mạnh chính là kiến trúc front-end với React và TypeScript. Ở Persefoni, một nền tảng kế toán carbon, em xây dựng các tính năng enterprise với React, GraphQL và TanStack Query. Một phần lớn công việc là background prefetching và caching để các màn hình nhiều dữ liệu luôn nhanh. Em cũng làm việc trong monorepo Vite và Turborepo, và làm nhiều về accessibility theo WCAG như keyboard navigation và ARIA. Ở TechLab của Ninja Van, em làm tính năng real-time với Socket.IO, tích hợp máy in nhiệt và tạo nhãn vận chuyển bằng ZPL. Ở NAB, em làm với Adobe Experience Manager trong môi trường ngân hàng, hỗ trợ deployment và làm việc với stakeholder. Điều thu hút em ở vị trí này là sự kết hợp giữa real-time streaming, dữ liệu lớn và UI tài chính phức tạp. Trading là domain mới với em, và em đang nghiêm túc tìm hiểu nó.",
      },
      memoryShortcut: {
        en: "Core → P-N-N → Why: React/TS core, then Persefoni (data + a11y), Ninja Van (real-time + hardware), NAB (banking + stakeholders), then why ISB.",
        vi: "Core → P-N-N → Why: thế mạnh React/TS, rồi Persefoni (dữ liệu + a11y), Ninja Van (real-time + phần cứng), NAB (ngân hàng + stakeholder), cuối cùng là vì sao chọn ISB.",
      },
      keyPoints: [
        {
          en: "Open with the core strength: React and TypeScript front-end architecture, 7+ years.",
          vi: "Mở đầu bằng thế mạnh cốt lõi: kiến trúc front-end React và TypeScript, hơn 7 năm.",
        },
        {
          en: "Persefoni: TanStack Query prefetching and caching, monorepo, WCAG accessibility.",
          vi: "Persefoni: prefetching và caching với TanStack Query, monorepo, accessibility theo WCAG.",
        },
        {
          en: "Ninja Van: Socket.IO real-time, thermal printers, ZPL labels.",
          vi: "Ninja Van: real-time với Socket.IO, máy in nhiệt, nhãn ZPL.",
        },
        {
          en: "NAB: regulated banking environment, AEM, deployments and stakeholders.",
          vi: "NAB: môi trường ngân hàng có quy định chặt, AEM, deployment và stakeholder.",
        },
        {
          en: "Be honest: trading is a new domain you are actively studying.",
          vi: "Thành thật: trading là domain mới mà bạn đang chủ động học.",
        },
      ],
    },
    {
      durationSeconds: 90,
      script: {
        en: "Hi, I'm [Your Name]. I'm a senior software engineer with more than seven years of experience, and I'm strongest in React and TypeScript front-end architecture. I'd sum up my background in three parts. First, data-heavy enterprise UIs. At Persefoni, a carbon accounting platform, I built features with React, GraphQL and TanStack Query. I spent a lot of time on background prefetching and caching, so users rarely waited on data. We ran a Vite and Turborepo monorepo, and I cared a lot about quality: WCAG accessibility with keyboard navigation and ARIA, plus automated tests. Second, real-time and integration work. At Ninja Van's TechLab, I built real-time features with Socket.IO, integrated REST APIs across microservices, worked with Go services, and owned a thermal printer flow that generated shipping labels with Labelary and ZPL. Third, working in a regulated environment. At NAB, I worked on Adobe Experience Manager, Assets, Sites and Forms, supporting deployments and working closely with business stakeholders. This role brings those threads together: real-time streams, large datasets, accessible component libraries and close work with backend engineers. To be transparent, I haven't worked on a trading system before, so I've been studying order books, market data feeds and streaming performance. I'd love to hear how your team handles high-frequency updates today, and where the biggest front-end challenges are right now.",
        vi: "Chào anh/chị, em là [Tên của bạn]. Em là senior software engineer với hơn bảy năm kinh nghiệm, mạnh nhất về kiến trúc front-end với React và TypeScript. Em xin tóm tắt kinh nghiệm thành ba phần. Thứ nhất, UI enterprise nhiều dữ liệu. Ở Persefoni, một nền tảng kế toán carbon, em xây dựng tính năng với React, GraphQL và TanStack Query. Em dành nhiều thời gian cho background prefetching và caching để người dùng hầu như không phải chờ dữ liệu. Team dùng monorepo Vite và Turborepo, và em rất chú trọng chất lượng: accessibility theo WCAG với keyboard navigation và ARIA, cùng với automated test. Thứ hai, real-time và tích hợp hệ thống. Ở TechLab của Ninja Van, em làm tính năng real-time với Socket.IO, tích hợp REST API trên microservices, làm việc với các service Go, và chịu trách nhiệm luồng in nhiệt tạo nhãn vận chuyển bằng Labelary và ZPL. Thứ ba, làm việc trong môi trường có quy định chặt. Ở NAB, em làm với Adobe Experience Manager, gồm Assets, Sites và Forms, hỗ trợ deployment và làm việc chặt với stakeholder phía business. Vị trí này kết nối tất cả những điều đó: real-time stream, dữ liệu lớn, component library có accessibility và phối hợp chặt với backend engineer. Nói thật là em chưa từng làm hệ thống trading, nên em đang tìm hiểu về order book, market data feed và hiệu năng streaming. Em rất muốn nghe team mình đang xử lý các cập nhật high-frequency như thế nào, và thách thức front-end lớn nhất hiện nay là gì.",
      },
      memoryShortcut: {
        en: "3 Ds + bridge + question: Data-heavy UIs (Persefoni) → Data in real time (Ninja Van) → Discipline in a regulated bank (NAB) → why this role → honest gap → ask about their high-frequency updates.",
        vi: "3 chữ D + cầu nối + câu hỏi: Data-heavy UI (Persefoni) → Data real-time (Ninja Van) → Discipline trong ngân hàng (NAB) → vì sao chọn vị trí này → thừa nhận gap → hỏi về cách team xử lý cập nhật high-frequency.",
      },
      keyPoints: [
        {
          en: 'Signpost the structure: "three parts" makes a long intro easy to follow.',
          vi: 'Báo trước cấu trúc: "ba phần" giúp phần giới thiệu dài dễ theo dõi.',
        },
        {
          en: "Persefoni: TanStack Query prefetching/caching, monorepo, WCAG accessibility, automated tests.",
          vi: "Persefoni: prefetching/caching với TanStack Query, monorepo, accessibility theo WCAG, automated test.",
        },
        {
          en: "Ninja Van: Socket.IO real-time, REST + microservices, Go, end-to-end thermal printer and ZPL label flow.",
          vi: "Ninja Van: real-time với Socket.IO, REST + microservices, Go, luồng máy in nhiệt và nhãn ZPL từ đầu đến cuối.",
        },
        {
          en: "NAB: AEM in a regulated bank, deployments, stakeholder collaboration.",
          vi: "NAB: AEM trong ngân hàng có quy định chặt, deployment, phối hợp với stakeholder.",
        },
        {
          en: "Close with an honest gap (no trading systems yet) and a question that opens the conversation.",
          vi: "Kết thúc bằng việc thừa nhận gap (chưa làm hệ thống trading) và một câu hỏi để mở cuộc trò chuyện.",
        },
      ],
    },
  ],
  deliveryTips: [
    {
      en: 'Default to the 60-second version. Use 30 seconds for a recruiter screen and 90 seconds only when the interviewer says "take your time" or "walk me through your background".',
      vi: 'Mặc định dùng bản 60 giây. Dùng bản 30 giây cho vòng recruiter screen và bản 90 giây chỉ khi interviewer nói "cứ thoải mái" hoặc "kể chi tiết về background của bạn".',
    },
    {
      en: "Memorize the structure, not the exact words. Saying it slightly differently each time sounds more natural than reciting.",
      vi: "Học thuộc cấu trúc, không học thuộc từng chữ. Mỗi lần nói hơi khác một chút sẽ tự nhiên hơn là đọc thuộc lòng.",
    },
    {
      en: "Pause briefly after each company name. It gives the interviewer a natural point to ask a follow-up.",
      vi: "Dừng một chút sau mỗi tên công ty. Đó là điểm dừng tự nhiên để interviewer hỏi thêm.",
    },
    {
      en: "Never add numbers or trading experience that are not yours. If asked about trading, say it is a new domain and show what you have studied.",
      vi: "Không thêm số liệu hay kinh nghiệm trading không phải của bạn. Nếu được hỏi về trading, nói rõ đây là domain mới và cho thấy những gì bạn đã tìm hiểu.",
    },
    {
      en: 'Be ready for the obvious follow-up after mentioning Socket.IO: "How would you handle thousands of updates per second?" Have the batching / conflation / requestAnimationFrame answer ready (see isb-q03).',
      vi: 'Chuẩn bị cho câu hỏi tiếp theo gần như chắc chắn sau khi nhắc Socket.IO: "Bạn xử lý hàng nghìn cập nhật mỗi giây thế nào?" Hãy có sẵn câu trả lời về batching / conflation / requestAnimationFrame (xem isb-q03).',
    },
    {
      en: "Interviews at a Japan-owned outsourcing company may be more formal. Speak clearly and a little slower than usual, and avoid slang. Replace [Your Name] with your name.",
      vi: "Phỏng vấn ở công ty outsourcing có vốn Nhật có thể trang trọng hơn. Nói rõ ràng, chậm hơn bình thường một chút và tránh dùng tiếng lóng. Thay [Your Name] bằng tên của bạn.",
    },
    {
      en: "Smile and slow down on the last sentence. The closing line is what the interviewer remembers.",
      vi: "Mỉm cười và nói chậm lại ở câu cuối. Câu kết là điều interviewer nhớ nhất.",
    },
  ],
};
