import type { CompanyResearch } from "@/domain/package/schema";

/**
 * Section 2 — Company Research (ISB Vietnam / IVC).
 * Every "verified" fact cites a page that was actually read on 2026-11-27.
 * Third-party directory figures that conflict with the company site are marked "unverified".
 */

const ACCESSED = "2026-11-27";
const SITE = "https://isb-vietnam.com.vn/";
const COMPANY = "https://isb-vietnam.com.vn/company/";
const CAREERS = "https://isb-vietnam.com.vn/careers/";
const OUTSOURCING = "https://isb-vietnam.com.vn/services/outsourcing/";
const CASES = "https://isb-vietnam.com.vn/casestudies/";
const TOPDEV = "https://topdev.vn/companies/isb-vietnam-84189";
const LINKEDIN_GUEST = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4492566584";
const JOBOKO = "https://vn.joboko.com/viec-lam-senior-frontend-dev-english-xvi6755251";

export const isbCompany: CompanyResearch = {
  overview: {
    text: {
      en: "ISB Vietnam Co., Ltd (IVC) is a 100% foreign-invested offshore software development company in Ho Chi Minh City, established on 30 Dec 2003 by Japan's ISB Group. Its group company, ISB Corporation, was founded in Japan in June 1970 as an information-services firm. The General Director is Yasuto Onogawa.",
      vi: "ISB Vietnam Co., Ltd (IVC) là công ty phát triển phần mềm offshore 100% vốn nước ngoài tại TP. Hồ Chí Minh, thành lập ngày 30/12/2003 bởi ISB Group (Nhật Bản). Công ty trong tập đoàn là ISB Corporation, thành lập tại Nhật vào tháng 6/1970, hoạt động trong lĩnh vực dịch vụ thông tin. Tổng giám đốc là ông Yasuto Onogawa.",
    },
    status: "verified",
    sourceUrl: COMPANY,
  },
  businessModel: {
    text: {
      en: "Offshore software outsourcing, mainly through a dedicated-team model (on-site or remote teams billed on monthly developer rates and timesheets). Japan is the primary market, with a stated goal of moving toward global/Asia markets. A Japanese/English/Vietnamese communication-support team (JLPT N2) sits between clients and engineers.",
      vi: "Outsourcing phần mềm offshore, chủ yếu theo mô hình dedicated team (team onsite hoặc remote, tính phí theo đơn giá developer hàng tháng và timesheet). Thị trường chính là Nhật Bản, với mục tiêu mở rộng ra thị trường toàn cầu/châu Á. Có team hỗ trợ giao tiếp tiếng Nhật/Anh/Việt (JLPT N2) làm cầu nối giữa khách hàng và kỹ sư.",
    },
    status: "verified",
    sourceUrl: OUTSOURCING,
  },
  productsAndServices: [
    {
      text: {
        en: "Outsourcing / offshore software development (dedicated teams)",
        vi: "Outsourcing / phát triển phần mềm offshore (dedicated team)",
      },
      status: "verified",
      sourceUrl: OUTSOURCING,
    },
    {
      text: {
        en: "Own product: TELEBOOTH (listed on the company site; details not reviewed)",
        vi: "Sản phẩm riêng: TELEBOOTH (có trên website công ty; chưa xem chi tiết)",
      },
      status: "verified",
      sourceUrl: COMPANY,
    },
    {
      text: {
        en: "Expertise areas: Fintech, Business systems, Medical, Web, Mobile, Middleware & Embedded, Protocol & Communication, Cloud Infrastructure",
        vi: "Lĩnh vực chuyên môn: Fintech, hệ thống doanh nghiệp, y tế, Web, Mobile, Middleware & Embedded, Protocol & Communication, Cloud Infrastructure",
      },
      status: "verified",
      sourceUrl: COMPANY,
    },
    {
      text: {
        en: "Published fintech case studies include a Foreign Exchange System (monitoring dealer investment in FX margin trading; Java/JSP/Ajax/Oracle), an FX client mobile app with multi-rate charts, and bank account system maintenance (COBOL). None of the published case studies mention React.",
        vi: "Các case study fintech đã công bố gồm Foreign Exchange System (giám sát đầu tư của dealer trong giao dịch ký quỹ ngoại hối; Java/JSP/Ajax/Oracle), một app mobile FX có chart nhiều tỷ giá, và bảo trì hệ thống tài khoản ngân hàng (COBOL). Không case study nào nhắc đến React.",
      },
      status: "verified",
      sourceUrl: CASES,
    },
  ],
  industry: {
    text: {
      en: 'IT services / software outsourcing and offshoring (LinkedIn industry: "Outsourcing and Offshoring Consulting")',
      vi: 'Dịch vụ IT / outsourcing và offshoring phần mềm (ngành trên LinkedIn: "Outsourcing and Offshoring Consulting")',
    },
    status: "verified",
    sourceUrl: LINKEDIN_GUEST,
  },
  engineeringCulture: [
    {
      text: {
        en: 'Stated core values: "Passions, Teamwork, and Innovations"; the company says it values confidence, integrity, sincerity and a hard-working attitude.',
        vi: 'Giá trị cốt lõi được công bố: "Passions, Teamwork, and Innovations"; công ty đề cao sự tự tin, chính trực, chân thành và tinh thần làm việc chăm chỉ.',
      },
      status: "verified",
      sourceUrl: CAREERS,
    },
    {
      text: {
        en: "Process-oriented delivery in the Japanese style: dedicated QA, QC, internal-system and network sections; clear acceptance-test standards; unified development and test environments; ISO 27001 / ISMS certification.",
        vi: "Delivery theo quy trình kiểu Nhật: có bộ phận QA, QC, internal system và network riêng; tiêu chuẩn acceptance test rõ ràng; thống nhất môi trường dev và test; chứng nhận ISO 27001 / ISMS.",
      },
      status: "verified",
      sourceUrl: OUTSOURCING,
    },
    {
      text: {
        en: "Investment in training: sponsored technical, soft-skill and language courses, plus allowances for language certificates (TOEIC, IELTS, Japanese).",
        vi: "Đầu tư vào đào tạo: tài trợ khoá học kỹ thuật, kỹ năng mềm và ngoại ngữ, kèm phụ cấp chứng chỉ ngoại ngữ (TOEIC, IELTS, tiếng Nhật).",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Office hours are listed as Monday–Friday, 08:00–17:00; online interviews/onboarding are mentioned only for emergencies. Remote/hybrid policy for this role is unknown.",
        vi: "Giờ làm việc ghi là Thứ 2–Thứ 6, 08:00–17:00; phỏng vấn/onboarding online chỉ được nhắc cho trường hợp khẩn cấp. Chính sách remote/hybrid cho vị trí này chưa rõ.",
      },
      status: "verified",
      sourceUrl: TOPDEV,
      note: "Company-level listing, not specific to this role.",
    },
    {
      text: {
        en: "Day-to-day engineering practices for this team (code review, CI/CD, sprint cadence, on-call) are not published anywhere we checked.",
        vi: "Các practice kỹ thuật hằng ngày của team này (code review, CI/CD, nhịp sprint, on-call) chưa được công bố ở bất kỳ nguồn nào đã kiểm tra.",
      },
      status: "unverified",
    },
  ],
  companySize: {
    text: {
      en: "About 130 employees including 100+ professional engineers (company site). Third-party directories disagree: TopDev 100–499, Joboko 101–500, and other directories range from 51–200 to 501–1000.",
      vi: "Khoảng 130 nhân viên, trong đó hơn 100 kỹ sư (theo website công ty). Các trang bên thứ ba không thống nhất: TopDev 100–499, Joboko 101–500, các directory khác từ 51–200 đến 501–1000.",
    },
    status: "verified",
    sourceUrl: COMPANY,
    note: "The 130 figure is the company's own claim; directory ranges are unverified.",
  },
  potentialProjects: [
    {
      text: {
        en: "A cloud-native trade capture and analytics platform with real-time financial data visualization, trading-analytics and execution-workflow screens, and an external customer web portal where customers purchase products.",
        vi: "Một nền tảng trade capture và analytics cloud-native, hiển thị dữ liệu tài chính real-time, gồm màn hình trading analytics và execution workflow, cùng customer web portal nơi khách hàng mua sản phẩm.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "Backend built by Rust/Python engineers; the front-end team consumes REST, WebSocket and SSE from those services.",
        vi: "Backend do các engineer Rust/Python xây dựng; team front-end tiêu thụ REST, WebSocket và SSE từ các service đó.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
    },
    {
      text: {
        en: "IVC appears to be staffing a larger team for the same platform: search results show a related ITviec listing for a Middle/Senior Full-stack Developer (TypeScript/React + Python/Rust) for trading analytics and execution workflows.",
        vi: "IVC có vẻ đang tuyển thêm người cho cùng nền tảng: kết quả tìm kiếm cho thấy một tin ITviec cho vị trí Middle/Senior Full-stack Developer (TypeScript/React + Python/Rust) về trading analytics và execution workflow.",
      },
      status: "unverified",
      note: "Seen only in a search-result snippet (itviec.com job 3425); the page returned 403 and was not read.",
    },
    {
      text: {
        en: "The platform most likely belongs to an overseas client (possibly Japanese, given IVC's market focus) served through a dedicated team; the client's name, country and domain (broker, asset manager, energy/commodities trading…) are unknown.",
        vi: "Nền tảng nhiều khả năng thuộc về một khách hàng nước ngoài (có thể là Nhật, theo thị trường chính của IVC) được phục vụ qua mô hình dedicated team; tên, quốc gia và lĩnh vực của khách hàng (broker, quỹ đầu tư, giao dịch năng lượng/hàng hoá…) chưa rõ.",
      },
      status: "assumption",
    },
  ],
  applicationRisks: [
    {
      text: {
        en: 'The LinkedIn posting showed "No longer accepting applications" on 2026-11-27. The Joboko copy was still open (deadline 26/12/2026). Apply there or via the company careers page, and message the recruiter directly.',
        vi: 'Tin trên LinkedIn đã hiển thị "No longer accepting applications" vào ngày 2026-11-27. Bản trên Joboko vẫn mở (hạn 26/12/2026). Nên nộp qua đó hoặc trang careers của công ty, và nhắn trực tiếp cho recruiter.',
      },
      status: "verified",
      sourceUrl: JOBOKO,
    },
    {
      text: {
        en: "Working arrangement is not stated and company pages list fixed office hours — the role may be fully on-site, which conflicts with the candidate's hybrid preference.",
        vi: "Hình thức làm việc không được nêu và trang công ty ghi giờ hành chính cố định — vị trí có thể là onsite hoàn toàn, khác với mong muốn hybrid của ứng viên.",
      },
      status: "assumption",
    },
    {
      text: {
        en: "Outsourcing context: the real product owner is probably a client, so tech decisions, roadmap and even team continuity may depend on that client contract.",
        vi: "Bối cảnh outsourcing: chủ sản phẩm thật có lẽ là khách hàng, nên quyết định kỹ thuật, roadmap và cả sự ổn định của team có thể phụ thuộc vào hợp đồng với khách hàng đó.",
      },
      status: "assumption",
    },
    {
      text: {
        en: "Domain gap: the JD prefers trading-workflow and market-data experience; the candidate has no trading/finance production experience and must present that knowledge as theoretical.",
        vi: "Khoảng trống domain: JD ưu tiên kinh nghiệm trading workflow và market data; ứng viên chưa có kinh nghiệm production về trading/tài chính nên phải trình bày phần này như kiến thức lý thuyết.",
      },
      status: "verified",
      sourceUrl: LINKEDIN_GUEST,
      note: "Requirement verified from the JD; the gap comes from the candidate profile.",
    },
    {
      text: {
        en: "The title mentions Python and the backend is Rust/Python. The candidate knows Python but has no Rust; expect questions on API/streaming contracts with these services, not on writing Rust.",
        vi: "Tiêu đề có Python và backend là Rust/Python. Ứng viên biết Python nhưng chưa dùng Rust; nên chuẩn bị câu hỏi về contract API/streaming với các service này, không phải viết Rust.",
      },
      status: "assumption",
    },
    {
      text: {
        en: 'Salary is "negotiable" with no published range; the company\'s 2003 Japanese-outsourcing heritage may mean a more process-heavy culture than product companies.',
        vi: 'Lương "thoả thuận", không công bố khoảng; nền tảng outsourcing Nhật từ 2003 có thể đồng nghĩa với văn hoá nặng quy trình hơn so với công ty product.',
      },
      status: "assumption",
      sourceUrl: JOBOKO,
    },
  ],
  recruiterQuestions: [
    {
      en: "The LinkedIn post shows it is no longer accepting applications — is the Senior Front-End role still open, and which channel should I apply through?",
      vi: "Tin LinkedIn đang hiển thị không còn nhận hồ sơ — vị trí Senior Front-End còn mở không, và em nên nộp qua kênh nào ạ?",
    },
    {
      en: "Is this role on-site, hybrid or remote? If hybrid, how many office days per week?",
      vi: "Vị trí này làm onsite, hybrid hay remote? Nếu hybrid thì mỗi tuần lên văn phòng mấy ngày?",
    },
    {
      en: "Is the trade capture platform an IVC product or a client's product? Which country and type of business is the client?",
      vi: "Nền tảng trade capture là sản phẩm của IVC hay của khách hàng? Khách hàng ở nước nào và thuộc loại hình kinh doanh gì?",
    },
    {
      en: 'How big is the front-end team, and does "lead the front-end development" include mentoring or managing other developers?',
      vi: 'Team front-end có bao nhiêu người, và "lead the front-end development" có bao gồm việc mentor hay quản lý developer khác không?',
    },
    {
      en: "The title mentions Python — will the front-end engineer write Python, or only integrate with the Python/Rust services?",
      vi: "Tiêu đề có nhắc Python — front-end engineer có phải viết Python không, hay chỉ tích hợp với các service Python/Rust?",
    },
    {
      en: "What is the current front-end stack — Next.js or a SPA, which state library, which charting and grid libraries?",
      vi: "Stack front-end hiện tại là gì — Next.js hay SPA, dùng state library nào, thư viện chart và grid nào?",
    },
    {
      en: "Is the project greenfield or an existing product? What are the biggest performance problems today?",
      vi: "Dự án làm mới từ đầu hay sản phẩm đã có? Vấn đề performance lớn nhất hiện tại là gì?",
    },
    {
      en: "Who do we communicate with day to day — the client directly in English, or through a BrSE/communicator? Is Japanese useful?",
      vi: "Hằng ngày team giao tiếp với ai — trực tiếp với khách hàng bằng tiếng Anh, hay qua BrSE/communicator? Tiếng Nhật có lợi thế không?",
    },
    {
      en: "What does the interview process look like (rounds, live coding, system design, client interview)?",
      vi: "Quy trình phỏng vấn gồm những vòng nào (live coding, system design, phỏng vấn với khách hàng)?",
    },
    {
      en: "What is the salary range and the structure of the 13th-month and performance bonus?",
      vi: "Khoảng lương là bao nhiêu, và lương tháng 13 cùng thưởng hiệu suất được tính như thế nào?",
    },
  ],
  sources: [
    {
      title: "LinkedIn job 4492566584 — Senior Front-End Developer (guest endpoint)",
      url: LINKEDIN_GUEST,
      accessedAt: ACCESSED,
    },
    { title: "Joboko — Senior Frontend Dev English (ISB Vietnam)", url: JOBOKO, accessedAt: ACCESSED },
    { title: "ISB Vietnam — Home", url: SITE, accessedAt: ACCESSED },
    { title: "ISB Vietnam — Company profile", url: COMPANY, accessedAt: ACCESSED },
    { title: "ISB Vietnam — Careers", url: CAREERS, accessedAt: ACCESSED },
    { title: "ISB Vietnam — Outsourcing service", url: OUTSOURCING, accessedAt: ACCESSED },
    { title: "ISB Vietnam — Case studies", url: CASES, accessedAt: ACCESSED },
    { title: "TopDev — ISB Vietnam company page", url: TOPDEV, accessedAt: ACCESSED },
  ],
};
