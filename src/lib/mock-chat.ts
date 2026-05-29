import type { Citation, Doc } from "./mock-data";

type TopicMatch = {
  keywords: string[];
  answer: (doc: Doc, question: string) => { content: string; snippet: string; page: number };
};

const topics: TopicMatch[] = [
  {
    keywords: ["uml", "diagram", "class diagram", "sequence", "use case diagram"],
    answer: (doc) => ({
      page: 12,
      snippet: "UML diagrams are categorized into structural and behavioral views, each capturing a distinct aspect of the system…",
      content: `Dựa trên **${doc.name}**, UML gồm hai nhóm chính:

### Structural Diagrams
- **Class Diagram** — mô tả lớp và quan hệ
- **Component / Deployment Diagram**

### Behavioral Diagrams
- **Use Case**, **Sequence**, **Activity**, **State Machine**

> Mỗi loại diagram phục vụ một góc nhìn khác nhau của hệ thống.`,
    }),
  },
  {
    keywords: ["singleton", "design pattern", "pattern", "gof", "observer", "factory"],
    answer: (doc) => ({
      page: 87,
      snippet: "Ensure a class has only one instance and provide a global point of access to it…",
      content: `Theo **${doc.name}**, Design Patterns giúp tái sử dụng giải pháp đã được kiểm chứng.

**Singleton** phù hợp khi cần **một instance duy nhất** (logger, config, connection pool).

**Observer** mô tả quan hệ **one-to-many** — khi subject đổi trạng thái, tất cả observer được thông báo.

> Chọn pattern dựa trên vấn đề cụ thể, tránh lạm dụng.`,
    }),
  },
  {
    keywords: ["use case", "user story", "actor", "yêu cầu"],
    answer: (doc) => ({
      page: 8,
      snippet: "A use case describes a sequence of interactions between an actor and the system to achieve a goal…",
      content: `Từ **${doc.name}**:

| Tiêu chí | Use Case | User Story |
|---|---|---|
| Chi tiết | Cao, có flow | Ngắn, 1–2 câu |
| Phạm vi | Toàn hệ thống | Một tính năng |
| Dùng cho | Phân tích | Agile backlog |

Use Case mô tả tương tác **actor ↔ hệ thống** để đạt mục tiêu.`,
    }),
  },
  {
    keywords: ["architecture", "layered", "microservice", "monolith", "kiến trúc", "tầng"],
    answer: (doc) => ({
      page: 142,
      snippet: "A layered architecture organizes the system into horizontal layers where each layer provides services to the layer above it…",
      content: `Dựa trên **${doc.name}**:

### Layered Architecture
- Chia hệ thống thành các **tầng ngang** (Presentation → Business → Data)
- Phù hợp ứng dụng **monolithic** vừa và nhỏ

### Microservices
- Nhiều **dịch vụ độc lập**, scale và deploy riêng
- Giao tiếp qua API / message bus

> Lựa chọn phụ thuộc quy mô, đội ngũ và yêu cầu vận hành.`,
    }),
  },
  {
    keywords: ["express", "middleware", "rest", "api", "nodejs", "node.js", "async"],
    answer: (doc) => ({
      page: 34,
      snippet: "Middleware functions have access to the request and response objects and the next function in the application's request-response cycle…",
      content: `Theo **${doc.name}** (SDN302):

**Express** xử lý HTTP qua pipeline middleware — mỗi hàm nhận \`(req, res, next)\`.

- \`app.use(express.json())\` parse body JSON
- Middleware auth kiểm tra token trước route protected
- Luôn gọi \`next()\` hoặc kết thúc bằng \`res.send()\``,
    }),
  },
  {
    keywords: ["mongodb", "mongoose", "schema", "collection", "embed", "reference"],
    answer: (doc) => ({
      page: 22,
      snippet: "Embedding related data in a single document reduces the need for joins but increases document size…",
      content: `Từ **${doc.name}** (SDN302):

- **Embed** dữ liệu liên quan trong cùng document khi đọc chung
- **Reference** bằng \`ObjectId\` khi entity lớn hoặc dùng lại nhiều nơi
- Tạo **index** cho field tra cứu thường xuyên (email, userId)`,
    }),
  },
  {
    keywords: ["java", "oop", "inheritance", "polymorphism", "extends", "implements", "lab211"],
    answer: (doc) => ({
      page: 18,
      snippet: "Polymorphism allows objects of different classes to be treated as objects of a common superclass through method overriding…",
      content: `Theo **${doc.name}** (LAB211):

- **Kế thừa**: \`extends\` — tái sử dụng code từ lớp cha
- **Đa hình**: override method — runtime chọn implementation đúng
- **Đóng gói**: \`private\` field + \`public\` accessor`,
    }),
  },
  {
    keywords: ["swp391", "project", "capstone", "sprint", "nộp", "demo", "báo cáo"],
    answer: (doc) => ({
      page: 3,
      snippet: "Final submission must include source repository, deployment guide, and sprint retrospective…",
      content: `Theo **${doc.name}** (SWP391):

1. Repository có README và hướng dẫn chạy
2. Báo cáo đủ sprint log, phân công, retrospective
3. Video/slide demo 10–15 phút
4. Nộp đúng deadline trên LMS`,
    }),
  },
  {
    keywords: ["sequence", "interaction", "message", "luồng", "đăng nhập", "login"],
    answer: (doc) => ({
      page: 45,
      snippet: "Sequence diagrams show object interactions arranged in time sequence, depicting messages exchanged between participants…",
      content: `Theo **${doc.name}**, Sequence Diagram mô tả **trao đổi message theo thời gian**.

Luồng đăng nhập điển hình:
1. **User** → \`LoginUI\`: nhập thông tin
2. **LoginUI** → \`AuthService\`: \`login(u, p)\`
3. **AuthService** → \`UserRepo\`: tra cứu user
4. Trả về **token** cho client

> Dùng lifeline và activation bar để thể hiện thời gian gọi hàm.`,
    }),
  },
];

function scoreDoc(doc: Doc, question: string): number {
  const q = question.toLowerCase();
  let score = 0;
  const haystack = `${doc.name} ${doc.course}`.toLowerCase();
  haystack.split(/\W+/).filter((w) => w.length > 3).forEach((word) => {
    if (q.includes(word)) score += 2;
  });
  if (doc.status === "indexed") score += 1;
  return score;
}

function pickDocument(docs: Doc[], question: string): Doc | null {
  const indexed = docs.filter((d) => d.status === "indexed");
  const pool = indexed.length ? indexed : docs;
  if (!pool.length) return null;

  const ranked = pool
    .map((d) => ({ doc: d, score: scoreDoc(d, question) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].doc : pool[0];
}

function pickTopic(question: string): TopicMatch | null {
  const q = question.toLowerCase();
  return topics.find((t) => t.keywords.some((k) => q.includes(k))) ?? null;
}

export function generateMockReply(
  question: string,
  documents: Doc[],
): { content: string; citations: Citation[] } {
  const doc = pickDocument(documents, question);

  if (!doc) {
    return {
      content: "Hiện chưa có tài liệu nào trong hệ thống. Vui lòng liên hệ admin để upload tài liệu môn học.",
      citations: [],
    };
  }

  const topic = pickTopic(question);
  const { content, snippet, page } = topic
    ? topic.answer(doc, question)
    : {
        page: Math.floor(10 + Math.random() * 80),
        snippet: `Nội dung liên quan đến "${question.slice(0, 60)}" được trích từ tài liệu môn học…`,
        content: `Dựa trên tài liệu **${doc.name}** (môn ${doc.course}):

Câu hỏi của bạn liên quan đến nội dung đã được index trong hệ thống. Dưới đây là tóm tắt ngắn:

> ${question.trim()}

Hệ thống đã tìm thấy **${doc.chunks || "một số"} chunks** liên quan trong tài liệu này. Bạn có thể hỏi cụ thể hơn (ví dụ: UML, Design Pattern, Use Case, Architecture…) để nhận câu trả lời chi tiết hơn.`,
      };

  const citations: Citation[] = [{
    docId: doc.id,
    docName: doc.name,
    course: doc.course,
    page,
    snippet,
  }];

  // Thêm tài liệu thứ 2 nếu có match tốt
  const second = documents
    .filter((d) => d.id !== doc.id && d.status === "indexed")
    .map((d) => ({ doc: d, score: scoreDoc(d, question) }))
    .filter((x) => x.score > 1)
    .sort((a, b) => b.score - a.score)[0];

  if (second) {
    citations.push({
      docId: second.doc.id,
      docName: second.doc.name,
      course: second.doc.course,
      page: Math.floor(5 + Math.random() * 40),
      snippet: `Additional context from ${second.doc.name} supporting the answer…`,
    });
  }

  return { content, citations };
}

export function newMessageId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const MOCK_REPLY_DELAY_MS = 900;
