import { apiFetch } from "@/shared/lib/api-client";
import type { PageResponse } from "@/features/lecturer/api/document-api";

export type RoleResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RoleSortField = "code" | "name" | "active" | "createdAt" | "updatedAt";
export type SortDirection = "asc" | "desc";

export const DEFAULT_ROLE_PAGE_SIZE = 10;

export type FetchRolesParams = {
  active?: boolean;
  keyword?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: RoleSortField;
  sortDir?: SortDirection;
  page?: number;
  size?: number;
};

export type RolePayload = {
  code: string;
  name: string;
  description?: string;
  active: boolean;
};

export async function fetchRoleById(id: string) {
  return apiFetch<RoleResponse>(`/roles/${id}`);
}

export async function fetchRoles(params?: FetchRolesParams) {
  const search = new URLSearchParams({
    page: String(params?.page ?? 0),
    size: String(params?.size ?? DEFAULT_ROLE_PAGE_SIZE),
  });
  if (params?.active != null) search.set("active", String(params.active));
  if (params?.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params?.createdFrom) search.set("createdFrom", params.createdFrom);
  if (params?.createdTo) search.set("createdTo", params.createdTo);
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.sortDir) search.set("sortDir", params.sortDir);
  return apiFetch<PageResponse<RoleResponse>>(`/roles?${search}`);
}

export async function fetchActiveRoles() {
  return apiFetch<RoleResponse[]>("/roles/active");
}

export async function createRole(payload: RolePayload) {
  return apiFetch<RoleResponse>("/roles", {
    method: "POST",
    body: JSON.stringify({
      code: payload.code.trim(),
      name: payload.name.trim(),
      description: payload.description?.trim() ?? "",
      active: payload.active,
    }),
  });
}

export async function updateRole(id: string, payload: RolePayload) {
  return apiFetch<RoleResponse>(`/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      code: payload.code.trim(),
      name: payload.name.trim(),
      description: payload.description?.trim() ?? "",
      active: payload.active,
    }),
  });
}

export async function deleteRole(id: string) {
  return apiFetch<void>(`/roles/${id}`, { method: "DELETE" });
}

export async function toggleRoleActive(id: string) {
  return apiFetch<RoleResponse>(`/roles/${id}/toggle-active`, { method: "PATCH" });
}
