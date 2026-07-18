import { apiFetch } from "@/shared/lib/api-client";
import type { Citation, ChatMessage } from "@/shared/lib/mock-data";

export interface CreateConversationRequest {
  title: string;
  subjectId?: string;
  documentIds?: string[];
}

export interface ConversationResponse {
  id: string;
  title: string;
  subjectId?: string;
  subjectName?: string;
  /** Tài liệu gắn với hội thoại; dùng lại mọi tin nhắn */
  documentIds?: string[];
  totalMessages: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateConversationRequest {
  title?: string;
  documentIds?: string[];
}

export interface SendMessageRequest {
  message: string;
}

export interface ChatAnswerResponse {
  /** Tin nhắn user vừa gửi (`role = USER`) */
  userMessage: MessageResponse;
  /** Câu trả lời bot (`role = ASSISTANT`) */
  assistantMessage: MessageResponse;
  citations: CitationResponse[];
}

export interface MessageResponse {
  id: string;
  role: string;
  content: string;
  llmModel?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  createdAt: string;
  /** Có trên message ASSISTANT khi tải lịch sử hoặc gửi tin mới */
  citations?: CitationResponse[] | null;
}

/** BE enum: USER | ASSISTANT → UI: user | assistant */
export function mapMessageRole(role: string | null | undefined): "user" | "assistant" {
  return role?.trim().toUpperCase() === "USER" ? "user" : "assistant";
}

/** BE `CitationResponse` → UI `Citation`. */
export function mapCitations(citations?: CitationResponse[] | null): Citation[] {
  return (citations ?? []).map((c) => ({
    docId: c.documentId,
    docName: c.documentTitle,
    snippet: c.quotedText,
    highlightText: c.highlightText ?? null,
    citationIndex: c.citationIndex,
    page: c.pageStart ?? 1,
    course: "",
  }));
}

/** BE `MessageResponse` → UI `ChatMessage`. */
export function mapApiMessage(message: MessageResponse): ChatMessage {
  return {
    id: message.id,
    role: mapMessageRole(message.role),
    content: message.content,
    citations: mapCitations(message.citations),
  };
}

export interface CitationResponse {
  id: string;
  citationIndex: number;
  documentId: string;
  documentTitle: string;
  chunkId: string;
  /** Đoạn trích sidebar */
  quotedText: string;
  /** Câu/đoạn trong quotedText để FE tô đậm */
  highlightText?: string | null;
  pageStart?: number;
  pageEnd?: number;
  score: number;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export async function createConversation(req: CreateConversationRequest) {
  return apiFetch<ConversationResponse>("/chat/conversations", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getConversations(page = 0, size = 50) {
  return apiFetch<Page<ConversationResponse>>(`/chat/conversations?page=${page}&size=${size}`);
}

export async function getConversation(id: string) {
  return apiFetch<ConversationResponse>(`/chat/conversations/${id}`);
}

export async function updateConversation(id: string, payload: UpdateConversationRequest) {
  return apiFetch<ConversationResponse>(`/chat/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteConversation(id: string) {
  return apiFetch<void>(`/chat/conversations/${id}`, {
    method: "DELETE",
  });
}

export async function sendMessageApi(conversationId: string, req: SendMessageRequest) {
  return apiFetch<ChatAnswerResponse>(`/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getMessages(conversationId: string, page = 0, size = 50) {
  return apiFetch<Page<MessageResponse>>(
    `/chat/conversations/${conversationId}/messages?page=${page}&size=${size}`,
  );
}
