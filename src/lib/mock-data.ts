export type DocStatus = "indexed" | "processing" | "uploaded" | "failed";

export interface Doc {
  id: string;
  name: string;
  type: "pdf" | "docx" | "pptx" | "xlsx" | "txt";
  course: string;
  size: string;
  uploadedAt: string;
  status: DocStatus;
  chunks: number;
}

export interface Course {
  code: string;
  name: string;
}

export const seedCourses: Course[] = [
  { code: "SDN302", name: "Server-Side development with NodeJS, Express, and MongoDB" },
  { code: "SWD392", name: "Software Architecture and Design" },
  { code: "SWP391", name: "Software Development Project" },
  { code: "LAB211", name: "OOP with Java Lab" },
];

export const normalizeCourseCode = (raw: string) =>
  raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 16);

export const courseLabel = (code: string, list: Course[]) =>
  list.find((c) => c.code === code)?.name ?? code;

export const documents: Doc[] = [
  { id: "d1", name: "UML_Basics.pdf", type: "pdf", course: "SWD392", size: "4.2 MB", uploadedAt: "2026-05-12", status: "indexed", chunks: 184 },
  { id: "d2", name: "UseCases_Lecture_Slides.pptx", type: "pptx", course: "SWD392", size: "8.7 MB", uploadedAt: "2026-05-14", status: "indexed", chunks: 96 },
  { id: "d3", name: "Design_Patterns_GoF.pdf", type: "pdf", course: "SWD392", size: "12.1 MB", uploadedAt: "2026-05-18", status: "indexed", chunks: 312 },
  { id: "d4", name: "Software_Architectures_Notes.docx", type: "docx", course: "SWD392", size: "1.8 MB", uploadedAt: "2026-05-20", status: "processing", chunks: 0 },
  { id: "d5", name: "Object_Interaction_Examples.pdf", type: "pdf", course: "SWD392", size: "3.4 MB", uploadedAt: "2026-05-22", status: "uploaded", chunks: 0 },
  { id: "d6", name: "Architecture_Quiz_Bank.xlsx", type: "xlsx", course: "SWD392", size: "612 KB", uploadedAt: "2026-05-23", status: "failed", chunks: 0 },
  { id: "d7", name: "Express_REST_API_Guide.pdf", type: "pdf", course: "SDN302", size: "2.4 MB", uploadedAt: "2026-05-10", status: "indexed", chunks: 156 },
  { id: "d8", name: "MongoDB_Schema_Design.pdf", type: "pdf", course: "SDN302", size: "5.3 MB", uploadedAt: "2026-05-11", status: "indexed", chunks: 210 },
  { id: "d9", name: "NodeJS_Async_Patterns.pdf", type: "pdf", course: "SDN302", size: "1.9 MB", uploadedAt: "2026-05-15", status: "indexed", chunks: 128 },
  { id: "d10", name: "SWP391_Project_Brief.pdf", type: "pdf", course: "SWP391", size: "890 KB", uploadedAt: "2026-05-08", status: "indexed", chunks: 72 },
  { id: "d11", name: "SWP391_Sprint_Template.docx", type: "docx", course: "SWP391", size: "420 KB", uploadedAt: "2026-05-16", status: "indexed", chunks: 48 },
  { id: "d12", name: "Java_OOP_Lab_Workbook.pdf", type: "pdf", course: "LAB211", size: "2.1 MB", uploadedAt: "2026-05-09", status: "indexed", chunks: 142 },
  { id: "d13", name: "Inheritance_Polymorphism_Exercises.pdf", type: "pdf", course: "LAB211", size: "1.2 MB", uploadedAt: "2026-05-19", status: "processing", chunks: 0 },
];

export const sessionGroupOrder = ["Hôm nay", "Hôm qua", "7 ngày qua", "Cũ hơn"] as const;
export type SessionGroup = (typeof sessionGroupOrder)[number];

export interface Session {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string; // ISO timestamp
  group: SessionGroup;
}

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

export const sessions: Session[] = [
  { id: "s1", title: "Tóm tắt các loại UML diagram", messageCount: 8, updatedAt: ago(12 * 60 * 1000), group: "Hôm nay" },
  { id: "s2", title: "Middleware trong Express là gì?", messageCount: 4, updatedAt: ago(2 * 3600000), group: "Hôm nay" },
  { id: "s3", title: "Phân biệt Use Case và User Story", messageCount: 12, updatedAt: ago(86400000), group: "Hôm qua" },
  { id: "s4", title: "Layered vs Microservices architecture", messageCount: 6, updatedAt: ago(3 * 86400000), group: "7 ngày qua" },
  { id: "s5", title: "Kế thừa và đa hình trong Java", messageCount: 5, updatedAt: ago(5 * 86400000), group: "7 ngày qua" },
  { id: "s6", title: "Checklist nộp SWP391", messageCount: 6, updatedAt: ago(6 * 86400000), group: "7 ngày qua" },
  { id: "s7", title: "Thiết kế schema MongoDB", messageCount: 4, updatedAt: ago(9 * 86400000), group: "Cũ hơn" },
  { id: "s8", title: "Sequence diagram cho đăng nhập", messageCount: 9, updatedAt: ago(11 * 86400000), group: "Cũ hơn" },
];

export interface Citation {
  docId: string;
  docName: string;
  course: string;
  page: number;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export const conversations: Record<string, ChatMessage[]> = {
  s1: [
    { id: "m1", role: "user", content: "Tóm tắt các loại UML diagram thường dùng." },
    {
      id: "m2",
      role: "assistant",
      content: `UML chia thành **2 nhóm chính**:

### 1. Structural Diagrams
- **Class Diagram** — mô tả lớp và quan hệ.
- **Object / Component / Deployment Diagram**.

### 2. Behavioral Diagrams
- **Use Case** — yêu cầu chức năng.
- **Sequence / Activity / State Machine**.`,
      citations: [
        { docId: "d1", docName: "UML_Basics.pdf", course: "SWD392", page: 12, snippet: "UML diagrams are categorized into structural and behavioral views, each capturing a distinct aspect of the system…" },
      ],
    },
  ],
  s2: [
    { id: "m1", role: "user", content: "Middleware trong Express là gì?" },
    {
      id: "m2",
      role: "assistant",
      content: `**Middleware** là hàm nằm giữa request và response trong Express:

- Có thể đọc/ghi \`req\`, \`res\`, gọi \`next()\` để chuyển tiếp.
- Dùng cho **logging**, **auth**, **parse body**, xử lý lỗi.

\`\`\`js
app.use((req, res, next) => { console.log(req.method); next(); });
\`\`\`

> Thứ tự khai báo middleware quyết định pipeline xử lý request.`,
      citations: [
        { docId: "d7", docName: "Express_REST_API_Guide.pdf", course: "SDN302", page: 34, snippet: "Middleware functions have access to the request and response objects and the next function in the application's request-response cycle…" },
      ],
    },
  ],
  s3: [
    { id: "m1", role: "user", content: "Phân biệt Use Case và User Story." },
    {
      id: "m2",
      role: "assistant",
      content: `| Tiêu chí | Use Case | User Story |
|---|---|---|
| Mức độ chi tiết | Cao, có flow | Ngắn, 1-2 câu |
| Phạm vi | Hệ thống | Tính năng nhỏ |
| Dùng cho | Phân tích | Agile backlog |`,
      citations: [
        { docId: "d2", docName: "UseCases_Lecture_Slides.pptx", course: "SWD392", page: 8, snippet: "A use case describes a sequence of interactions between an actor and the system to achieve a goal…" },
        { docId: "d2", docName: "UseCases_Lecture_Slides.pptx", course: "SWD392", page: 24, snippet: "User stories are short, informal descriptions written from the perspective of the end user…" },
      ],
    },
  ],
  s4: [
    { id: "m1", role: "user", content: "Tóm tắt sự khác biệt chính giữa Layered Architecture và Microservices Architecture." },
    {
      id: "m2",
      role: "assistant",
      content: `Dưới đây là so sánh ngắn gọn dựa trên tài liệu môn học:

### 1. Layered Architecture
- Tổ chức hệ thống thành các **tầng ngang** (Presentation, Business, Data).
- Mỗi tầng chỉ giao tiếp với tầng kề dưới.
- Phù hợp cho ứng dụng **monolithic** vừa và nhỏ.

### 2. Microservices Architecture
- Hệ thống được chia thành **các dịch vụ độc lập**, mỗi dịch vụ sở hữu dữ liệu riêng.
- Giao tiếp qua **API** (REST, gRPC, message bus).
- Cho phép **scale độc lập** và triển khai riêng biệt.

### Ví dụ
\`\`\`text
Layered:        UI → Service → Repository → DB
Microservices:  [Auth] [Orders] [Payments] ↔ API Gateway
\`\`\`

> Lựa chọn kiến trúc phụ thuộc vào quy mô, đội ngũ và yêu cầu vận hành.`,
      citations: [
        { docId: "d3", docName: "Design_Patterns_GoF.pdf", course: "SWD392", page: 142, snippet: "A layered architecture organizes the system into horizontal layers where each layer provides services to the layer above it…" },
        { docId: "d4", docName: "Software_Architectures_Notes.docx", course: "SWD392", page: 23, snippet: "Microservices decompose an application into a suite of small, independently deployable services communicating over lightweight protocols…" },
      ],
    },
  ],
  s5: [
    { id: "m1", role: "user", content: "Phân biệt kế thừa và đa hình trong Java." },
    {
      id: "m2",
      role: "assistant",
      content: `**Kế thừa (inheritance)**: lớp con nhận thuộc tính/hành vi từ lớp cha (\`extends\`).

**Đa hình (polymorphism)**: cùng một tham chiếu có thể trỏ tới nhiều kiểu con, gọi method được override.

\`\`\`java
Animal a = new Dog();
a.speak(); // "Woof" — runtime polymorphism
\`\`\``,
      citations: [
        { docId: "d12", docName: "Java_OOP_Lab_Workbook.pdf", course: "LAB211", page: 18, snippet: "Polymorphism allows objects of different classes to be treated as objects of a common superclass through method overriding…" },
      ],
    },
  ],
  s6: [
    { id: "m1", role: "user", content: "Checklist trước khi nộp SWP391?" },
    {
      id: "m2",
      role: "assistant",
      content: `Theo **SWP391 Project Brief**, trước khi nộp cần:

1. **SRS + thiết kế** đã được mentor duyệt
2. **Repo Git** có README, hướng dẫn chạy
3. **Demo** ghi video hoặc slide 10–15 phút
4. **Báo cáo** đủ sprint log và phân công nhóm

> Nộp đúng deadline trên LMS và đính kèm link repository.`,
      citations: [
        { docId: "d10", docName: "SWP391_Project_Brief.pdf", course: "SWP391", page: 3, snippet: "Final submission must include source repository, deployment guide, and sprint retrospective…" },
      ],
    },
  ],
  s7: [
    { id: "m1", role: "user", content: "Thiết kế schema MongoDB cho user và order?" },
    {
      id: "m2",
      role: "assistant",
      content: `Gợi ý từ tài liệu **MongoDB Schema Design**:

- Collection \`users\`: email unique, hashed password, profile embedded hoặc ref.
- Collection \`orders\`: \`userId\` ref, \`items[]\` embed, \`status\`, \`createdAt\`.

> Embed khi đọc cùng lúc; reference khi dữ liệu lớn hoặc dùng chung nhiều nơi.`,
      citations: [
        { docId: "d8", docName: "MongoDB_Schema_Design.pdf", course: "SDN302", page: 22, snippet: "Embedding related data in a single document reduces the need for joins but increases document size…" },
      ],
    },
  ],
  s8: [
    { id: "m1", role: "user", content: "Vẽ sequence diagram cho luồng đăng nhập." },
    {
      id: "m2",
      role: "assistant",
      content: `Luồng đăng nhập điển hình:

1. **User** → \`LoginUI\`: nhập username/password
2. **LoginUI** → \`AuthService\`: \`login(u, p)\`
3. **AuthService** → \`UserRepo\`: \`findByUsername(u)\`
4. **AuthService** trả về **token JWT**`,
      citations: [
        { docId: "d5", docName: "Object_Interaction_Examples.pdf", course: "SWD392", page: 45, snippet: "Sequence diagrams show object interactions arranged in time sequence, depicting messages exchanged between participants…" },
      ],
    },
  ],
};

export const followUpsBySession: Record<string, string[]> = {
  s1: ["Sự khác nhau giữa Class và Object diagram?", "Khi nào dùng State Machine?", "Activity diagram khác gì Flowchart?"],
  s2: ["Cách viết custom error middleware?", "express.json() làm gì?", "Phân biệt app.use và app.get"],
  s3: ["Cách viết acceptance criteria cho User Story?", "Khi nào nên dùng Use Case?", "INVEST nghĩa là gì?"],
  s4: ["Khi nào nên chọn Microservices thay vì Monolithic?", "Cho ví dụ thực tế về Layered Architecture", "Microservices có nhược điểm gì?"],
  s5: ["abstract class khác interface?", "Ví dụ overload vs override", "Composition thay inheritance?"],
  s6: ["Template sprint trong SWP391?", "Cách viết user story cho capstone?", "Tiêu chí chấm demo"],
  s7: ["Index nào nên tạo cho orders?", "Mongoose validation example", "Khi nào dùng aggregate"],
  s8: ["Sequence diagram khác Communication diagram?", "Mô hình hoá lỗi đăng nhập", "Vẽ luồng OAuth2"],
};

export const uploadActivity = [
  { day: "Mon", uploads: 3 }, { day: "Tue", uploads: 5 }, { day: "Wed", uploads: 2 },
  { day: "Thu", uploads: 7 }, { day: "Fri", uploads: 4 }, { day: "Sat", uploads: 1 }, { day: "Sun", uploads: 6 },
];

export const topReferenced = [
  { name: "Design_Patterns_GoF (SWD392)", refs: 48 },
  { name: "Express_REST_API (SDN302)", refs: 32 },
  { name: "UML_Basics (SWD392)", refs: 36 },
  { name: "MongoDB_Schema (SDN302)", refs: 28 },
  { name: "SWP391_Project_Brief", refs: 22 },
  { name: "Java_OOP_Lab (LAB211)", refs: 19 },
];

export const chatUsage = [
  { day: "Mon", queries: 12 }, { day: "Tue", queries: 18 }, { day: "Wed", queries: 9 },
  { day: "Thu", queries: 22 }, { day: "Fri", queries: 15 }, { day: "Sat", queries: 5 }, { day: "Sun", queries: 20 },
];

// Backwards-compat exports (used by other routes)
export const sampleConversation = conversations.s4;
export const suggestedFollowUps = followUpsBySession.s4;
