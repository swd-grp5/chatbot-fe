import { apiFetch } from "@/shared/lib/api-client";
import type { PageResponse } from "@/features/lecturer/api/document-api";
import type { SubjectOption } from "@/features/lecturer/api/subject-api";

export type LecturerSubject = SubjectOption;

export type LecturerResponse = {
  id: string;
  fullName: string;
  email: string;
  subjects: LecturerSubject[];
  active: boolean;
  emailVerified: boolean;
  provider: string;
  createdAt: string;
  updatedAt: string;
};

export type LecturerSortField = "fullName" | "email" | "active" | "createdAt" | "updatedAt";
export type SortDirection = "asc" | "desc";

export const DEFAULT_LECTURER_PAGE_SIZE = 10;

export type FetchLecturersParams = {
  active?: boolean;
  keyword?: string;
  subjectId?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: LecturerSortField;
  sortDir?: SortDirection;
  page?: number;
  size?: number;
};

export type LecturerPayload = {
  fullName: string;
  email: string;
  password?: string;
  active: boolean;
  emailVerified: boolean;
  subjectIds: string[];
};

export async function fetchLecturerById(id: string) {
  return apiFetch<LecturerResponse>(`/lecturers/${id}`);
}

export async function fetchLecturers(params?: FetchLecturersParams) {
  const search = new URLSearchParams({
    page: String(params?.page ?? 0),
    size: String(params?.size ?? DEFAULT_LECTURER_PAGE_SIZE),
  });
  if (params?.active != null) search.set("active", String(params.active));
  if (params?.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params?.subjectId) search.set("subjectId", params.subjectId);
  if (params?.createdFrom) search.set("createdFrom", params.createdFrom);
  if (params?.createdTo) search.set("createdTo", params.createdTo);
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.sortDir) search.set("sortDir", params.sortDir);
  return apiFetch<PageResponse<LecturerResponse>>(`/lecturers?${search}`);
}

export async function createLecturer(payload: LecturerPayload) {
  return apiFetch<LecturerResponse>("/lecturers", {
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

export async function updateLecturer(id: string, payload: LecturerPayload) {
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
  return apiFetch<LecturerResponse>(`/lecturers/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteLecturer(id: string) {
  return apiFetch<void>(`/lecturers/${id}`, { method: "DELETE" });
}

export async function toggleLecturerActive(id: string) {
  return apiFetch<LecturerResponse>(`/lecturers/${id}/toggle-active`, { method: "PATCH" });
}
