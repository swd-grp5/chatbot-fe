import { create } from "zustand";
import type { ChatMessage, Course, Doc, Session as UISession } from "@/shared/lib/mock-data";
import {
  loadChatData,
  loadCourses,
  loadDocuments,
  newDocId,
  newSessionId,
  saveChatData,
  saveCourses,
  saveDocuments,
} from "@/shared/lib/mock-storage";
import { generateMockReply, MOCK_REPLY_DELAY_MS, newMessageId } from "@/features/student/lib/mock-chat";
import { toSessionTimestamp, groupFor } from "@/shared/lib/format-time";
import { getApiSession } from "@/features/auth/lib/auth-session";
import { storageKey } from "@/shared/lib/storage-keys";

type Store = {
  userId: string | null;
  courses: Course[];
  documents: Doc[];
  sessions: UISession[];
  conversations: Record<string, ChatMessage[]>;
  sessionDocs: Record<string, string[]>;
  activeSessionId: string;
  initialized: boolean;
  /** IDs của tài liệu student chọn cho hội thoại hiện tại */
  selectedDocIds: string[];

  init: () => void;
  setActiveSession: (id: string) => void;
  setSelectedDocIds: (ids: string[]) => void;
  loadUserData: (userId: string) => void;
  clear: () => void;

  addCourse: (course: Course) => boolean;
  updateCourse: (oldCode: string, patch: Partial<Course>) => boolean;
  deleteCourse: (code: string) => { ok: true } | { ok: false; docCount: number };
  addDocument: (doc: Omit<Doc, "id">) => Doc;
  deleteDocument: (docId: string) => void;
  updateDocument: (docId: string, patch: Partial<Doc>) => void;
  createSession: (title?: string) => string;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;
  syncConversations: () => Promise<void>;
  sendMessage: (content: string, documentIds?: string[]) => Promise<void>;
};

const today = () => new Date().toISOString().slice(0, 10);

const sessionTitleFrom = (text: string) => {
  const t = text.trim();
  return t.length > 48 ? `${t.slice(0, 48)}…` : t;
};

const persistChat = (userId: string | null, data: Pick<Store, "sessions" | "conversations" | "sessionDocs" | "activeSessionId">) => {
  if (!userId) return;
  saveChatData(userId, {
    sessions: data.sessions,
    conversations: data.conversations,
    sessionDocs: data.sessionDocs,
    activeSessionId: data.activeSessionId,
  });
};

/** Giữ lại một hội thoại trống, xoá các bản trùng do bấm "+" nhiều lần. */
const dedupeEmptySessions = (
  sessions: UISession[],
  conversations: Record<string, ChatMessage[]>,
  sessionDocs: Record<string, string[]>,
  activeSessionId: string,
) => {
  const emptyIds = sessions
    .filter((s) => (conversations[s.id]?.length ?? 0) === 0)
    .map((s) => s.id);
  if (emptyIds.length <= 1) {
    return { sessions, conversations, sessionDocs, activeSessionId };
  }

  const keepEmptyId = emptyIds.includes(activeSessionId) ? activeSessionId : emptyIds[0];
  const remove = new Set(emptyIds.filter((id) => id !== keepEmptyId));

  return {
    sessions: sessions.filter((s) => !remove.has(s.id)),
    conversations: Object.fromEntries(
      Object.entries(conversations).filter(([id]) => !remove.has(id)),
    ),
    sessionDocs: Object.fromEntries(Object.entries(sessionDocs).filter(([id]) => !remove.has(id))),
    activeSessionId: remove.has(activeSessionId) ? keepEmptyId : activeSessionId,
  };
};

export const useAppStore = create<Store>((set, get) => ({
  userId: null,
  courses: [],
  documents: [],
  sessions: [],
  conversations: {},
  sessionDocs: {},
  activeSessionId: "",
  initialized: false,
  selectedDocIds: [],

  init: () => {
    if (get().initialized) return;
    const skipMockDocs = !!getApiSession();
    set({
      courses: loadCourses(),
      documents: skipMockDocs ? [] : loadDocuments(),
      initialized: true,
    });

    if (typeof window === "undefined") return;

    const reloadDocs = () => set({ documents: loadDocuments() });
    const reloadCourses = () => set({ courses: loadCourses() });
    const documentsChangedEvent = storageKey("documents-changed");
    const coursesChangedEvent = storageKey("courses-changed");
    window.addEventListener(documentsChangedEvent, reloadDocs);
    window.addEventListener(coursesChangedEvent, reloadCourses);
    window.addEventListener("storage", (e) => {
      if (e.key === storageKey("documents")) reloadDocs();
      if (e.key === storageKey("courses")) reloadCourses();
    });
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id, selectedDocIds: [] });
    const { userId, sessions, conversations, sessionDocs } = get();
    persistChat(userId, { sessions, conversations, sessionDocs, activeSessionId: id });
  },

  setSelectedDocIds: (ids) => set({ selectedDocIds: ids }),

  clear: () =>
    set({
      userId: null,
      sessions: [],
      conversations: {},
      sessionDocs: {},
      activeSessionId: "",
    }),

  loadUserData: (userId) => {
    const chat = loadChatData(userId);
    const cleaned = dedupeEmptySessions(
      chat.sessions,
      chat.conversations,
      chat.sessionDocs,
      chat.activeSessionId || chat.sessions[0]?.id || "",
    );
    set({
      userId,
      courses: loadCourses(),
      documents: loadDocuments(),
      sessions: cleaned.sessions,
      conversations: cleaned.conversations,
      sessionDocs: cleaned.sessionDocs,
      activeSessionId: cleaned.activeSessionId || cleaned.sessions[0]?.id || "",
    });
    if (
      cleaned.sessions.length !== chat.sessions.length ||
      cleaned.activeSessionId !== chat.activeSessionId
    ) {
      persistChat(userId, cleaned);
    }
  },

  addCourse: (course) => {
    const code = course.code.trim().toUpperCase();
    const name = course.name.trim();
    if (!code || !name) return false;
    if (get().courses.some((c) => c.code === code)) return false;
    const courses = [...get().courses, { code, name }];
    saveCourses(courses);
    set({ courses });
    return true;
  },

  updateCourse: (oldCode, patch) => {
    const list = get().courses;
    const current = list.find((c) => c.code === oldCode);
    if (!current) return false;

    const nextCode = (patch.code ?? current.code).trim().toUpperCase();
    const nextName = (patch.name ?? current.name).trim();
    if (!nextCode || !nextName) return false;
    if (nextCode !== oldCode && list.some((c) => c.code === nextCode)) return false;

    const courses = list.map((c) =>
      c.code === oldCode ? { code: nextCode, name: nextName } : c,
    );
    saveCourses(courses);

    let documents = get().documents;
    if (nextCode !== oldCode) {
      documents = documents.map((d) =>
        d.course === oldCode ? { ...d, course: nextCode } : d,
      );
      saveDocuments(documents);
    }

    set({ courses, documents });
    return true;
  },

  deleteCourse: (code) => {
    const docCount = get().documents.filter((d) => d.course === code).length;
    if (docCount > 0) return { ok: false, docCount };

    const courses = get().courses.filter((c) => c.code !== code);
    saveCourses(courses);
    set({ courses });
    return { ok: true };
  },

  addDocument: (doc) => {
    const newDoc: Doc = { ...doc, id: newDocId(), uploadedAt: doc.uploadedAt || today() };
    const documents = [newDoc, ...get().documents];
    saveDocuments(documents);
    set({ documents });
    return newDoc;
  },

  deleteDocument: (docId) => {
    const documents = get().documents.filter((d) => d.id !== docId);
    saveDocuments(documents);
    const sessionDocs: Record<string, string[]> = {};
    Object.entries(get().sessionDocs).forEach(([k, v]) => {
      sessionDocs[k] = v.filter((x) => x !== docId);
    });
    const { userId, sessions, conversations, activeSessionId } = get();
    set({ documents, sessionDocs });
    persistChat(userId, { sessions, conversations, sessionDocs, activeSessionId });
  },

  updateDocument: (docId, patch) => {
    const documents = get().documents.map((d) => (d.id === docId ? { ...d, ...patch } : d));
    saveDocuments(documents);
    set({ documents });
  },

  createSession: (title) => {
    const userId = get().userId;
    const empty = get().sessions.find((s) => (get().conversations[s.id]?.length ?? 0) === 0);
    if (empty) {
      set({ activeSessionId: empty.id });
      persistChat(userId, {
        sessions: get().sessions,
        conversations: get().conversations,
        sessionDocs: get().sessionDocs,
        activeSessionId: empty.id,
      });
      return empty.id;
    }

    const id = newSessionId();
    const newSession: UISession = {
      id,
      title: title?.trim() || "Hội thoại mới",
      messageCount: 0,
      updatedAt: toSessionTimestamp(),
      group: groupFor(new Date()),
    };
    const sessions = [newSession, ...get().sessions];
    const conversations = { ...get().conversations, [id]: [] };
    const sessionDocs = { ...get().sessionDocs, [id]: [] };
    set({ sessions, conversations, sessionDocs, activeSessionId: id });
    persistChat(userId, { sessions, conversations, sessionDocs, activeSessionId: id });
    return id;
  },

  deleteSession: (sessionId) => {
    const userId = get().userId;
    const sessions = get().sessions.filter((s) => s.id !== sessionId);
    const conversations = { ...get().conversations };
    delete conversations[sessionId];
    const sessionDocs = { ...get().sessionDocs };
    delete sessionDocs[sessionId];
    const activeSessionId =
      get().activeSessionId === sessionId ? (sessions[0]?.id ?? "") : get().activeSessionId;

    set({ sessions, conversations, sessionDocs, activeSessionId });
    persistChat(userId, { sessions, conversations, sessionDocs, activeSessionId });

    // Gọi API backend để soft-delete conversation (không chờ kết quả)
    if (getApiSession()) {
      import("@/features/student/api/chat-api").then(({ deleteConversation }) => {
        deleteConversation(sessionId).catch((e) =>
          console.warn("Failed to delete conversation on backend", e),
        );
      });
    }
  },

  renameSession: async (sessionId, newTitle) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    // Cập nhật local state ngay lập tức (optimistic update)
    const sessions = get().sessions.map((s) =>
      s.id === sessionId ? { ...s, title: trimmed } : s,
    );
    set({ sessions });
    persistChat(get().userId, {
      sessions,
      conversations: get().conversations,
      sessionDocs: get().sessionDocs,
      activeSessionId: get().activeSessionId,
    });

    // Gọi API backend nếu đang ở API mode
    if (getApiSession()) {
      try {
        const { updateConversation } = await import("@/features/student/api/chat-api");
        await updateConversation(sessionId, trimmed);
      } catch (e) {
        console.warn("Failed to rename conversation on backend", e);
      }
    }
  },

  syncConversations: async () => {
    if (!getApiSession()) return;
    try {
      const { getConversations } = await import("@/features/student/api/chat-api");
      const result = await getConversations(0, 100);
      const backendSessions: UISession[] = result.content.map((conv) => ({
        id: conv.id,
        title: conv.title,
        messageCount: conv.totalMessages,
        updatedAt: conv.updatedAt,
        group: groupFor(new Date(conv.updatedAt)),
      }));

      // Merge: ưu tiên backend, giữ conversations local
      const localConversations = get().conversations;
      const mergedConversations: Record<string, import("@/shared/lib/mock-data").ChatMessage[]> = {};
      backendSessions.forEach((s) => {
        mergedConversations[s.id] = localConversations[s.id] ?? [];
      });

      const activeSessionId =
        backendSessions.find((s) => s.id === get().activeSessionId)?.id ??
        backendSessions[0]?.id ??
        "";

      set({ sessions: backendSessions, conversations: mergedConversations, activeSessionId });
      persistChat(get().userId, {
        sessions: backendSessions,
        conversations: mergedConversations,
        sessionDocs: get().sessionDocs,
        activeSessionId,
      });
    } catch (e) {
      console.warn("Failed to sync conversations from backend", e);
    }
  },

  sendMessage: async (content, documentIds) => {
    const text = content.trim();
    if (!text) return;

    let sessionId = get().activeSessionId;
    if (!sessionId || !get().sessions.find((s) => s.id === sessionId)) {
      sessionId = get().createSession("Hội thoại mới");
    }

    const userMsg: ChatMessage = { id: newMessageId(), role: "user", content: text };
    const existing = get().conversations[sessionId] ?? [];
    const isFirst = existing.length === 0;

    // ----- API MODE INTEGRATION -----
    const useApi = !!getApiSession();
    let backendConversationId = sessionId;

    // Import một lần duy nhất tất cả các hàm cần dùng
    const chatApi = useApi
      ? await import("@/features/student/api/chat-api")
      : null;

    if (useApi && chatApi) {
      if (isFirst) {
        // Tạo conversation trên backend cho tin nhắn đầu tiên
        try {
          const newConv = await chatApi.createConversation({
            title: sessionTitleFrom(text),
          });
          backendConversationId = newConv.id;

          // Thay thế local session ID bằng backend ID nếu khác nhau
          if (backendConversationId !== sessionId) {
            const sessions = get().sessions.map((s) =>
              s.id === sessionId ? { ...s, id: backendConversationId } : s,
            );
            const conversations = { ...get().conversations };
            conversations[backendConversationId] = conversations[sessionId] || [];
            delete conversations[sessionId];

            const sessionDocs = { ...get().sessionDocs };
            sessionDocs[backendConversationId] = sessionDocs[sessionId] || [];
            delete sessionDocs[sessionId];

            sessionId = backendConversationId;
            set({ sessions, conversations, sessionDocs, activeSessionId: sessionId });
          }
        } catch (e) {
          console.error("Failed to create conversation", e);
          return;
        }
      }
    }
    // --------------------------------

    const conversationsAfterUser = { ...get().conversations, [sessionId]: [...(get().conversations[sessionId] ?? []), userMsg] };

    const now = new Date();
    const sessionsAfterUser = get().sessions.map((s) =>
      s.id === sessionId
        ? {
          ...s,
          title: isFirst && !useApi ? sessionTitleFrom(text) : s.title, // API title is handled during creation
          messageCount: (conversationsAfterUser[sessionId]?.length ?? 0),
          updatedAt: toSessionTimestamp(now),
          group: groupFor(now),
        }
        : s,
    );

    set({ conversations: conversationsAfterUser, sessions: sessionsAfterUser });
    persistChat(get().userId, {
      sessions: sessionsAfterUser,
      conversations: conversationsAfterUser,
      sessionDocs: get().sessionDocs,
      activeSessionId: sessionId,
    });

    let assistantMsg: ChatMessage;

    if (useApi && chatApi) {
      try {
        const response = await chatApi.sendMessageApi(sessionId, { message: text, documentIds });
        assistantMsg = {
          id: response.message.id || newMessageId(),
          role: "assistant",
          content: response.message.content,
          citations: response.citations?.map((c) => ({
            docId: c.documentId,
            docName: c.documentTitle,
            snippet: c.quotedText,
            page: c.pageStart ?? 1,
            course: "",
          })),
        };
      } catch (e) {
        console.error("Failed to send message", e);
        assistantMsg = { id: newMessageId(), role: "assistant", content: "Lỗi kết nối đến máy chủ AI. Vui lòng thử lại." };
      }
    } else {
      await new Promise((r) => setTimeout(r, MOCK_REPLY_DELAY_MS));
      const { content: reply, citations } = generateMockReply(text, get().documents);
      assistantMsg = {
        id: newMessageId(),
        role: "assistant",
        content: reply,
        citations,
      };
    }

    const updatedConversations = {
      ...get().conversations,
      [sessionId]: [...(get().conversations[sessionId] ?? []), assistantMsg],
    };
    const updatedSessions = get().sessions.map((s) =>
      s.id === sessionId
        ? { ...s, messageCount: updatedConversations[sessionId].length, updatedAt: toSessionTimestamp() }
        : s,
    );

    set({ conversations: updatedConversations, sessions: updatedSessions });
    persistChat(get().userId, {
      sessions: updatedSessions,
      conversations: updatedConversations,
      sessionDocs: get().sessionDocs,
      activeSessionId: sessionId,
    });
  },
}));

export type { Doc, ChatMessage };
