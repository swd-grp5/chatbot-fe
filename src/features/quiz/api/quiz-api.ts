import { apiFetch } from "@/shared/lib/api-client";
import type { PageResponse } from "@/features/lecturer/api/document-api";

export const QUIZ_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  CLOSED: "CLOSED",
} as const;

export type QuizStatus = (typeof QUIZ_STATUS)[keyof typeof QUIZ_STATUS];

export const MULTIPLE_CHOICE_MODE = {
  SINGLE: "SINGLE",
  MULTIPLE: "MULTIPLE",
} as const;

export type MultipleChoiceMode = (typeof MULTIPLE_CHOICE_MODE)[keyof typeof MULTIPLE_CHOICE_MODE];

export const POINTS_DISTRIBUTION = {
  EVEN: "EVEN",
  BY_DIFFICULTY: "BY_DIFFICULTY",
} as const;

export type PointsDistributionMode = (typeof POINTS_DISTRIBUTION)[keyof typeof POINTS_DISTRIBUTION];

export type QuestionType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QuizOption = {
  id: string;
  optionText: string;
  isCorrect: boolean | null;
  sortOrder: number;
};

export type QuizQuestion = {
  id: string;
  questionType: QuestionType;
  multipleChoiceMode: MultipleChoiceMode;
  questionText: string;
  points: number;
  sortOrder: number;
  sourceDocumentId: string | null;
  sourceDocumentTitle: string | null;
  sourceExcerpt: string | null;
  options: QuizOption[];
};

export type QuizSummary = {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  title: string;
  status: QuizStatus;
  timeLimitMinutes: number | null;
  totalPoints: number | null;
  questionCount: number | null;
  active: boolean;
  aiGenerated: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export type Quiz = QuizSummary & {
  createdById: string;
  createdByName: string;
  description: string | null;
  updatedAt: string;
  questions: QuizQuestion[];
};

export type QuizAnswerResult = {
  questionId: string;
  questionType: QuestionType;
  questionText: string;
  isCorrect: boolean;
  scoreEarned: number;
  maxScore: number;
};

export type QuizAttempt = {
  id: string;
  quizId: string;
  quizTitle: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
  answers: QuizAnswerResult[];
};

export type QuizOptionPayload = {
  optionText: string;
  isCorrect: boolean;
  sortOrder: number;
};

export type QuizQuestionPayload = {
  questionTypeId: string;
  multipleChoiceMode: MultipleChoiceMode;
  questionText: string;
  points: number;
  sortOrder: number;
  sourceDocumentId?: string | null;
  sourceExcerpt?: string | null;
  options: QuizOptionPayload[];
};

export type QuizUpdatePayload = {
  title: string;
  description?: string | null;
  timeLimitMinutes?: number | null;
  questions: QuizQuestionPayload[];
};

export type QuizGeneratePayload = {
  subjectId: string;
  title?: string;
  description?: string;
  questionCount?: number;
  totalPoints?: number;
  pointsDistribution?: PointsDistributionMode;
  timeLimitMinutes?: number;
  documentIds?: string[];
};

export type QuizSubmitPayload = {
  answers: { questionId: string; selectedOptionIds: string[] }[];
};

export type FetchQuizzesParams = {
  subjectId?: string;
  status?: QuizStatus;
  active?: boolean;
  keyword?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export const QUIZ_STATUS_LABELS: Record<QuizStatus, string> = {
  DRAFT: "Nháp",
  PUBLISHED: "Đã xuất bản",
  CLOSED: "Đã đóng",
};

/** Khớp validation `QuizGenerateRequest` trên BE */
export const QUIZ_GENERATE_LIMITS = {
  questionCount: { min: 1, max: 20, default: 5 },
  totalPoints: { min: 1, max: 10, default: 10 },
  timeLimitMinutes: { min: 1, max: 600, default: 30 },
} as const;

/** Khớp validation `QuizUpdateRequest.timeLimitMinutes` trên BE */
export const QUIZ_TIME_LIMIT = { min: 1, max: 600 } as const;

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function parseBoundedIntInput(raw: string, min: number, max: number): number {
  if (raw.trim() === "") return min;
  return clampInt(Number(raw), min, max);
}

export const MULTIPLE_CHOICE_MODE_LABELS: Record<MultipleChoiceMode, string> = {
  SINGLE: "Một đáp án",
  MULTIPLE: "Nhiều đáp án",
};

export async function fetchActiveQuestionTypes() {
  return apiFetch<QuestionType[]>("/question-types/active");
}

export async function fetchQuizzes(params?: FetchQuizzesParams) {
  const search = new URLSearchParams({
    page: String(params?.page ?? 0),
    size: String(params?.size ?? 20),
  });
  if (params?.subjectId) search.set("subjectId", params.subjectId);
  if (params?.status) search.set("status", params.status);
  if (params?.active != null) search.set("active", String(params.active));
  if (params?.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.sortDir) search.set("sortDir", params.sortDir);
  return apiFetch<PageResponse<QuizSummary>>(`/quizzes?${search}`);
}

export async function fetchQuizById(id: string, forAttempt = false) {
  const search = forAttempt ? "?forAttempt=true" : "";
  return apiFetch<Quiz>(`/quizzes/${id}${search}`);
}

export async function generateQuiz(payload: QuizGeneratePayload) {
  return apiFetch<Quiz>("/quizzes/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateQuiz(id: string, payload: QuizUpdatePayload) {
  return apiFetch<Quiz>(`/quizzes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function publishQuiz(id: string) {
  return apiFetch<Quiz>(`/quizzes/${id}/publish`, { method: "POST" });
}

export async function closeQuiz(id: string) {
  return apiFetch<Quiz>(`/quizzes/${id}/close`, { method: "POST" });
}

export async function toggleQuizActive(id: string) {
  return apiFetch<Quiz>(`/quizzes/${id}/toggle-active`, { method: "PATCH" });
}

export async function deleteQuiz(id: string) {
  return apiFetch<void>(`/quizzes/${id}`, { method: "DELETE" });
}

export async function submitQuiz(id: string, payload: QuizSubmitPayload) {
  return apiFetch<QuizAttempt>(`/quizzes/${id}/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMyQuizAttempts(quizId: string) {
  return apiFetch<QuizAttempt[]>(`/quizzes/${quizId}/attempts`);
}

export async function fetchQuizAttempt(quizId: string, attemptId: string) {
  return apiFetch<QuizAttempt>(`/quizzes/${quizId}/attempts/${attemptId}`);
}

export function quizToUpdatePayload(quiz: Quiz): QuizUpdatePayload {
  return {
    title: quiz.title,
    description: quiz.description,
    timeLimitMinutes: quiz.timeLimitMinutes,
    questions: quiz.questions.map((q) => ({
      questionTypeId: q.questionType.id,
      multipleChoiceMode: q.multipleChoiceMode,
      questionText: q.questionText,
      points: q.points,
      sortOrder: q.sortOrder,
      sourceDocumentId: q.sourceDocumentId,
      sourceExcerpt: q.sourceExcerpt,
      options: q.options.map((o) => ({
        optionText: o.optionText,
        isCorrect: Boolean(o.isCorrect),
        sortOrder: o.sortOrder,
      })),
    })),
  };
}
