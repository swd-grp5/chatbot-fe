import { apiFetch } from "@/shared/lib/api-client";
import type { PageResponse } from "@/features/lecturer/api/document-api";
import type { SubjectOption } from "@/features/lecturer/api/subject-api";

export type StudentSubject = SubjectOption;

export type StudentResponse = {
  id: string;
  fullName: string;
  email: string;
  subjects: StudentSubject[];
  active: boolean;
  emailVerified: boolean;
  provider: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentSortField = "fullName" | "email" | "createdAt" | "updatedAt";
export type SortDirection = "asc" | "desc";

export const DEFAULT_STUDENT_PAGE_SIZE = 10;

export type FetchStudentsParams = {
  active?: boolean;
  keyword?: string;
  subjectId?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: StudentSortField;
  sortDir?: SortDirection;
  page?: number;
  size?: number;
};

export type StudentPayload = {
  fullName: string;
  email: string;
  password?: string;
  active: boolean;
  emailVerified: boolean;
  subjectIds: string[];
};

export async function fetchStudentById(id: string) {
  return apiFetch<StudentResponse>(`/students/${id}`);
}

export async function fetchStudents(params?: FetchStudentsParams) {
  const search = new URLSearchParams({
    page: String(params?.page ?? 0),
    size: String(params?.size ?? DEFAULT_STUDENT_PAGE_SIZE),
  });
  if (params?.active != null) search.set("active", String(params.active));
  if (params?.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params?.subjectId) search.set("subjectId", params.subjectId);
  if (params?.createdFrom) search.set("createdFrom", params.createdFrom);
  if (params?.createdTo) search.set("createdTo", params.createdTo);
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.sortDir) search.set("sortDir", params.sortDir);
  return apiFetch<PageResponse<StudentResponse>>(`/students?${search}`);
}

export async function createStudent(payload: StudentPayload) {
  return apiFetch<StudentResponse>("/students", {
    method: "POST",
    body: JSON.stringify({
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      password: payload.password,
      active: payload.active,
      emailVerified: payload.emailVerified,
      subjectIds: payload.subjectIds,
    }),
  });
}

export async function updateStudent(id: string, payload: StudentPayload) {
  const body: Record<string, unknown> = {
    fullName: payload.fullName.trim(),
    email: payload.email.trim(),
    active: payload.active,
    emailVerified: payload.emailVerified,
    subjectIds: payload.subjectIds,
  };
  if (payload.password?.trim()) {
    body.password = payload.password.trim();
  }
  return apiFetch<StudentResponse>(`/students/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteStudent(id: string) {
  return apiFetch<void>(`/students/${id}`, { method: "DELETE" });
}

export async function toggleStudentActive(id: string) {
  return apiFetch<StudentResponse>(`/students/${id}/toggle-active`, { method: "PATCH" });
}
