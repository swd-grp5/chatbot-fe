import { apiFetch } from "@/shared/lib/api-client";
import type { PageResponse } from "@/features/lecturer/api/document-api";

export type SubjectOption = Pick<SubjectResponse, "id" | "code" | "name">;

export type SubjectResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SubjectSortField = "code" | "name" | "createdAt" | "updatedAt";
export type SortDirection = "asc" | "desc";

export const DEFAULT_SUBJECT_PAGE_SIZE = 10;

export type FetchSubjectsParams = {
  active?: boolean;
  keyword?: string;
  sortBy?: SubjectSortField;
  sortDir?: SortDirection;
  page?: number;
  size?: number;
};

export type SubjectPayload = {
  code: string;
  name: string;
  description?: string;
  active: boolean;
};

export async function fetchSubjectById(id: string) {
  return apiFetch<SubjectResponse>(`/subjects/${id}`);
}

export async function fetchSubjects(params?: FetchSubjectsParams) {
  const search = new URLSearchParams({
    page: String(params?.page ?? 0),
    size: String(params?.size ?? DEFAULT_SUBJECT_PAGE_SIZE),
  });
  if (params?.active != null) search.set("active", String(params.active));
  if (params?.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.sortDir) search.set("sortDir", params.sortDir);
  return apiFetch<PageResponse<SubjectResponse>>(`/subjects?${search}`);
}

export async function createSubject(payload: SubjectPayload) {
  return apiFetch<SubjectResponse>("/subjects", {
    method: "POST",
    body: JSON.stringify({
      code: payload.code.trim(),
      name: payload.name.trim(),
      description: payload.description?.trim() ?? "",
      active: payload.active,
    }),
  });
}

export async function updateSubject(id: string, payload: SubjectPayload) {
  return apiFetch<SubjectResponse>(`/subjects/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      code: payload.code.trim(),
      name: payload.name.trim(),
      description: payload.description?.trim() ?? "",
      active: payload.active,
    }),
  });
}

export async function deleteSubject(id: string) {
  return apiFetch<void>(`/subjects/${id}`, { method: "DELETE" });
}

export async function toggleSubjectActive(id: string) {
  return apiFetch<SubjectResponse>(`/subjects/${id}/toggle-active`, { method: "PATCH" });
}
