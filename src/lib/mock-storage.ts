import {
  documents as seedDocuments,
  sessions as seedSessions,
  conversations as seedConversations,
  type ChatMessage,
  type Doc,
  type Session,
} from "./mock-data";
import { normalizeSession } from "./format-time";

const DOCS_KEY = "sdn-documents";
const USERS_KEY = "sdn-users";
const DEMO_CHAT_KEY = "sdn-chat-demo";

const DEMO_EMAILS = new Set([
  "admin@demo.edu",
  "student@demo.edu",
  "lecturer@demo.edu",
]);

const chatKey = (userId: string) => {
  const user = findUserById(userId);
  if (user && DEMO_EMAILS.has(user.email)) return DEMO_CHAT_KEY;
  return `sdn-chat-${userId}`;
};

const isDemoStudent = (userId: string) => {
  const user = findUserById(userId);
  return !!user && DEMO_EMAILS.has(user.email);
};

export type ChatData = {
  sessions: Session[];
  conversations: Record<string, ChatMessage[]>;
  sessionDocs: Record<string, string[]>;
  activeSessionId: string;
};

const emptyChat = (): ChatData => ({
  sessions: [],
  conversations: {},
  sessionDocs: {},
  activeSessionId: "",
});

const seedChat = (): ChatData => ({
  sessions: seedSessions.map((s, i) => normalizeSession(s, i)),
  conversations: seedConversations,
  sessionDocs: {},
  activeSessionId: seedSessions[0]?.id ?? "",
});

export type MockUser = {
  id: string;
  email: string;
  password: string;
  role: "admin" | "lecturer" | "student";
  isBlocked: boolean;
};

const seedUsers: MockUser[] = [
  { id: "u-admin", email: "admin@demo.edu", password: "admin123", role: "admin", isBlocked: false },
  { id: "u-lecturer", email: "lecturer@demo.edu", password: "lecturer123", role: "lecturer", isBlocked: false },
  { id: "u-student", email: "student@demo.edu", password: "student123", role: "student", isBlocked: false },
];

function ensureDemoUsers(users: MockUser[]): MockUser[] {
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
  let changed = false;

  for (const demo of seedUsers) {
    const key = demo.email.toLowerCase();
    const existing = byEmail.get(key);
    if (!existing) {
      byEmail.set(key, demo);
      changed = true;
      continue;
    }
    if (
      existing.password !== demo.password ||
      existing.role !== demo.role ||
      existing.isBlocked
    ) {
      byEmail.set(key, {
        ...existing,
        id: demo.id,
        password: demo.password,
        role: demo.role,
        isBlocked: false,
      });
      changed = true;
    }
  }

  const merged = Array.from(byEmail.values());
  if (changed) saveUsers(merged);
  return merged;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function initMockStorage() {
  if (typeof window === "undefined") return;
  if (!readJson<Doc[]>(DOCS_KEY)) writeJson(DOCS_KEY, seedDocuments);
  if (!readJson<MockUser[]>(USERS_KEY)) writeJson(USERS_KEY, seedUsers);
}

export function loadDocuments(): Doc[] {
  initMockStorage();
  return readJson<Doc[]>(DOCS_KEY) ?? seedDocuments;
}

export function saveDocuments(docs: Doc[]) {
  writeJson(DOCS_KEY, docs);
  window.dispatchEvent(new CustomEvent("sdn-documents-changed"));
}

export function loadUsers(): MockUser[] {
  initMockStorage();
  const raw = readJson<MockUser[]>(USERS_KEY) ?? seedUsers;
  return ensureDemoUsers(raw);
}

export function saveUsers(users: MockUser[]) {
  writeJson(USERS_KEY, users);
}

export function findUserById(id: string): MockUser | undefined {
  return loadUsers().find((u) => u.id === id);
}

export function findUserByEmail(email: string): MockUser | undefined {
  return loadUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function addUser(user: Omit<MockUser, "id"> & { id?: string }): MockUser {
  const users = loadUsers();
  const newUser: MockUser = { ...user, id: user.id ?? `u-${Date.now()}` };
  saveUsers([...users, newUser]);
  return newUser;
}

export function updateUser(id: string, patch: Partial<Pick<MockUser, "isBlocked">>) {
  const users = loadUsers().map((u) => (u.id === id ? { ...u, ...patch } : u));
  saveUsers(users);
}

export function newDocId() {
  return `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newSessionId() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadChatData(userId: string): ChatData {
  initMockStorage();
  const key = chatKey(userId);
  let saved = readJson<ChatData>(key);

  // Migrate dữ liệu cũ sang key dùng chung cho demo
  if (!saved && key === DEMO_CHAT_KEY) {
    saved = readJson<ChatData>("sdn-chat-u-student") ?? readJson<ChatData>("sdn-chat-u-admin");
    if (saved) writeJson(key, saved);
  }

  if (saved) {
    const data: ChatData = {
      ...saved,
      sessions: saved.sessions.map((s, i) => normalizeSession(s, i)),
      conversations: saved.conversations ?? {},
      sessionDocs: saved.sessionDocs ?? {},
    };
    if (data.sessions.length === 0 && isDemoStudent(userId)) {
      const seeded = seedChat();
      writeJson(key, seeded);
      return seeded;
    }
    return data;
  }

  if (isDemoStudent(userId)) {
    const seeded = seedChat();
    writeJson(key, seeded);
    return seeded;
  }
  return emptyChat();
}

export function saveChatData(userId: string, data: ChatData) {
  writeJson(chatKey(userId), data);
}