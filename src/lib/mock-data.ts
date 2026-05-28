export type DocStatus = "indexed" | "processing" | "uploaded" | "failed";

export interface Doc {
  id: string;
  name: string;
  type: "pdf" | "docx" | "pptx" | "xlsx" | "txt";
  course: string;
  chapter: string;
  size: string;
  uploadedAt: string;
  status: DocStatus;
  chunks: number;
}

export const courses = [
  { code: "ARCH", name: "Software Architecture" },
  { code: "PROG", name: "Cross-Platform Programming" },
  { code: "DB", name: "Database Systems" },
];

export const chapters = [
  "Chapter 1 — Introduction to UML",
  "Chapter 2 — Use Cases",
  "Chapter 3 — Design Patterns",
  "Chapter 4 — Software Architectures",
  "Chapter 5 — Object Interaction Modeling",
];

export const documents: Doc[] = [
  { id: "d1", name: "UML_Basics.pdf", type: "pdf", course: "ARCH", chapter: "Chapter 1 — Introduction to UML", size: "4.2 MB", uploadedAt: "2026-05-12", status: "indexed", chunks: 184 },
  { id: "d2", name: "UseCases_Lecture_Slides.pptx", type: "pptx", course: "ARCH", chapter: "Chapter 2 — Use Cases", size: "8.7 MB", uploadedAt: "2026-05-14", status: "indexed", chunks: 96 },
  { id: "d3", name: "Design_Patterns_GoF.pdf", type: "pdf", course: "ARCH", chapter: "Chapter 3 — Design Patterns", size: "12.1 MB", uploadedAt: "2026-05-18", status: "indexed", chunks: 312 },
  { id: "d4", name: "Software_Architectures_Notes.docx", type: "docx", course: "ARCH", chapter: "Chapter 4 — Software Architectures", size: "1.8 MB", uploadedAt: "2026-05-20", status: "processing", chunks: 0 },
  { id: "d5", name: "Object_Interaction_Examples.pdf", type: "pdf", course: "ARCH", chapter: "Chapter 5 — Object Interaction Modeling", size: "3.4 MB", uploadedAt: "2026-05-22", status: "uploaded", chunks: 0 },
  { id: "d6", name: "Architecture_Quiz_Bank.xlsx", type: "xlsx", course: "ARCH", chapter: "Chapter 4 — Software Architectures", size: "612 KB", uploadedAt: "2026-05-23", status: "failed", chunks: 0 },
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
  { id: "s2", title: "Khi nào dùng Singleton pattern?", messageCount: 4, updatedAt: ago(2 * 3600000), group: "Hôm nay" },
  { id: "s3", title: "Phân biệt Use Case và User Story", messageCount: 12, updatedAt: ago(86400000), group: "Hôm qua" },
  { id: "s4", title: "Layered vs Microservices architecture", messageCount: 6, updatedAt: ago(3 * 86400000), group: "7 ngày qua" },
  { id: "s5", title: "Observer pattern trong Java", messageCount: 5, updatedAt: ago(5 * 86400000), group: "7 ngày qua" },
  { id: "s6", title: "Sequence diagram cho đăng nhập", messageCount: 9, updatedAt: ago(9 * 86400000), group: "Cũ hơn" },
];

export interface Citation {
  docId: string;
  docName: string;
  chapter: string;
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
        { docId: "d1", docName: "UML_Basics.pdf", chapter: "Chapter 1 — Introduction to UML", page: 12, snippet: "UML diagrams are categorized into structural and behavioral views, each capturing a distinct aspect of the system…" },
      ],
    },
  ],
  s2: [
    { id: "m1", role: "user", content: "Khi nào nên dùng Singleton pattern?" },
    {
      id: "m2",
      role: "assistant",
      content: `**Singleton** phù hợp khi:
- Cần **một instance duy nhất** trong toàn ứng dụng (logger, config, cache).
- Truy cập toàn cục có kiểm soát.

> Tránh dùng nếu state có thể thay đổi theo request — sẽ gây khó test.`,
      citations: [
        { docId: "d3", docName: "Design_Patterns_GoF.pdf", chapter: "Chapter 3 — Design Patterns", page: 87, snippet: "Ensure a class has only one instance and provide a global point of access to it…" },
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
        { docId: "d2", docName: "UseCases_Lecture_Slides.pptx", chapter: "Chapter 2 — Use Cases", page: 8, snippet: "A use case describes a sequence of interactions between an actor and the system to achieve a goal…" },
        { docId: "d2", docName: "UseCases_Lecture_Slides.pptx", chapter: "Chapter 2 — Use Cases", page: 24, snippet: "User stories are short, informal descriptions written from the perspective of the end user…" },
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
        { docId: "d3", docName: "Design_Patterns_GoF.pdf", chapter: "Chapter 4 — Software Architectures", page: 142, snippet: "A layered architecture organizes the system into horizontal layers where each layer provides services to the layer above it…" },
        { docId: "d4", docName: "Software_Architectures_Notes.docx", chapter: "Chapter 4 — Software Architectures", page: 23, snippet: "Microservices decompose an application into a suite of small, independently deployable services communicating over lightweight protocols…" },
      ],
    },
  ],
  s5: [
    { id: "m1", role: "user", content: "Ví dụ Observer pattern trong Java." },
    {
      id: "m2",
      role: "assistant",
      content: `Observer định nghĩa quan hệ **one-to-many** giữa subject và observers.

\`\`\`java
interface Observer { void update(String event); }
class Subject {
  List<Observer> obs = new ArrayList<>();
  void notify(String e) { obs.forEach(o -> o.update(e)); }
}
\`\`\``,
      citations: [
        { docId: "d3", docName: "Design_Patterns_GoF.pdf", chapter: "Chapter 3 — Design Patterns", page: 201, snippet: "Define a one-to-many dependency between objects so that when one object changes state, all its dependents are notified…" },
      ],
    },
  ],
  s6: [
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
        { docId: "d5", docName: "Object_Interaction_Examples.pdf", chapter: "Chapter 5 — Object Interaction Modeling", page: 45, snippet: "Sequence diagrams show object interactions arranged in time sequence, depicting messages exchanged between participants…" },
      ],
    },
  ],
};

export const followUpsBySession: Record<string, string[]> = {
  s1: ["Sự khác nhau giữa Class và Object diagram?", "Khi nào dùng State Machine?", "Activity diagram khác gì Flowchart?"],
  s2: ["Singleton có thread-safe không?", "Thay Singleton bằng Dependency Injection?", "Ví dụ Singleton trong .NET"],
  s3: ["Cách viết acceptance criteria cho User Story?", "Khi nào nên dùng Use Case?", "INVEST nghĩa là gì?"],
  s4: ["Khi nào nên chọn Microservices thay vì Monolithic?", "Cho ví dụ thực tế về Layered Architecture", "Microservices có nhược điểm gì?"],
  s5: ["So sánh Observer và Pub/Sub", "Observer trong RxJava", "Memory leak với Observer?"],
  s6: ["Sequence diagram khác Communication diagram?", "Mô hình hoá lỗi đăng nhập", "Vẽ luồng OAuth2"],
};

export const uploadActivity = [
  { day: "Mon", uploads: 3 }, { day: "Tue", uploads: 5 }, { day: "Wed", uploads: 2 },
  { day: "Thu", uploads: 7 }, { day: "Fri", uploads: 4 }, { day: "Sat", uploads: 1 }, { day: "Sun", uploads: 6 },
];

export const topReferenced = [
  { name: "Design_Patterns_GoF", refs: 48 },
  { name: "UML_Basics", refs: 36 },
  { name: "UseCases_Lecture", refs: 24 },
  { name: "Architecture_Notes", refs: 19 },
  { name: "Object_Interaction", refs: 11 },
];

export const chatUsage = [
  { day: "Mon", queries: 12 }, { day: "Tue", queries: 18 }, { day: "Wed", queries: 9 },
  { day: "Thu", queries: 22 }, { day: "Fri", queries: 15 }, { day: "Sat", queries: 5 }, { day: "Sun", queries: 20 },
];

// Backwards-compat exports (used by other routes)
export const sampleConversation = conversations.s4;
export const suggestedFollowUps = followUpsBySession.s4;
