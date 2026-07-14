import { apiFetch } from "@/shared/lib/api-client";
import type { PageResponse } from "@/features/lecturer/api/document-api";
import type {
  MultipleChoiceMode,
  QuestionType,
  QuizOptionPayload,
} from "@/features/quiz/api/quiz-api";

export type BankQuestionOption = {
  id: string;
  optionText: string;
  isCorrect: boolean | null;
  sortOrder: number;
};

export type BankQuestion = {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  createdById: string;
  createdByName: string;
  questionType: QuestionType;
  multipleChoiceMode: MultipleChoiceMode;
  questionText: string;
  defaultPoints: number | null;
  sourceDocumentId: string | null;
  sourceDocumentTitle: string | null;
  sourceExcerpt: string | null;
  aiGenerated: boolean;
  active: boolean;
  options: BankQuestionOption[];
  createdAt: string;
  updatedAt: string;
};

export type BankQuestionGeneratePayload = {
  subjectId: string;
  questionCount?: number;
  defaultPoints?: number;
  documentIds?: string[];
};

export type BankQuestionCreatePayload = {
  subjectId: string;
  questionTypeId: string;
  multipleChoiceMode: MultipleChoiceMode;
  questionText: string;
  defaultPoints?: number;
  sourceDocumentId?: string | null;
  sourceExcerpt?: string | null;
  options: QuizOptionPayload[];
};

export type FetchBankQuestionsParams = {
  subjectId?: string;
  questionTypeId?: string;
  mode?: MultipleChoiceMode;
  active?: boolean;
  aiGenerated?: boolean;
  keyword?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export async function fetchBankQuestions(params?: FetchBankQuestionsParams) {
  const search = new URLSearchParams({
    page: String(params?.page ?? 0),
    size: String(params?.size ?? 20),
  });
  if (params?.subjectId) search.set("subjectId", params.subjectId);
  if (params?.questionTypeId) search.set("questionTypeId", params.questionTypeId);
  if (params?.mode) search.set("mode", params.mode);
  if (params?.active != null) search.set("active", String(params.active));
  if (params?.aiGenerated != null) search.set("aiGenerated", String(params.aiGenerated));
  if (params?.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.sortDir) search.set("sortDir", params.sortDir);
  return apiFetch<PageResponse<BankQuestion>>(`/question-bank?${search}`);
}

export async function fetchBankQuestionById(id: string) {
  return apiFetch<BankQuestion>(`/question-bank/${id}`);
}

export async function createBankQuestion(payload: BankQuestionCreatePayload) {
  return apiFetch<BankQuestion>("/question-bank", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function generateBankQuestions(payload: BankQuestionGeneratePayload) {
  return apiFetch<BankQuestion[]>("/question-bank/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteBankQuestion(id: string) {
  return apiFetch<void>(`/question-bank/${id}`, { method: "DELETE" });
}

export async function toggleBankQuestionActive(id: string) {
  return apiFetch<BankQuestion>(`/question-bank/${id}/toggle-active`, { method: "PATCH" });
}
