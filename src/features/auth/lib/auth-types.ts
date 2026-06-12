export type ApiUserRole = "ADMIN" | "STUDENT" | "LECTURER";

export type ApiRoleResponse = {
  id: string;
  code: ApiUserRole;
  name: string;
  description?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/** Role from API: legacy string or nested object. */
export type ApiUserRoleInput = ApiUserRole | ApiRoleResponse;

export function parseApiUserRole(role: ApiUserRoleInput): ApiUserRole {
  if (typeof role === "string") return role;
  return role.code;
}

export type ApiUser = {
  id: string;
  fullName: string;
  email: string;
  role: ApiUserRole;
  isActive: boolean;
};

export type ApiUserResponse = Omit<ApiUser, "role"> & {
  role: ApiUserRoleInput;
};

export function normalizeApiUser(user: ApiUserResponse): ApiUser {
  return {
    ...user,
    role: parseApiUserRole(user.role),
  };
}

export type AuthApiResponse = {
  token: string | null;
  user: ApiUserResponse;
  message?: string;
};

export type ApiAuthSession = {
  token: string;
  user: ApiUser;
};

export type AppRole = "admin" | "lecturer" | "student";

export function apiRoleToAppRole(role: ApiUserRoleInput): AppRole {
  switch (parseApiUserRole(role)) {
    case "ADMIN":
      return "admin";
    case "LECTURER":
      return "lecturer";
    default:
      return "student";
  }
}

export function routeForAppRole(role: AppRole): string {
  if (role === "admin") return "/admin/users";
  if (role === "lecturer") return "/lecturer/documents";
  return "/";
}
