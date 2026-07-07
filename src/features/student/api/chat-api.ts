import { apiFetch } from "@/shared/lib/api-client";

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
  totalMessages: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  message: string;
}

export interface ChatAnswerResponse {
  message: MessageResponse;
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
}

export interface CitationResponse {
  id: string;
  citationIndex: number;
  documentId: string;
  documentTitle: string;
  chunkId: string;
  quotedText: string;
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

export async function updateConversation(id: string, title: string) {
  return apiFetch<ConversationResponse>(`/chat/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
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
  return apiFetch<Page<MessageResponse>>(`/chat/conversations/${conversationId}/messages?page=${page}&size=${size}`);
}
