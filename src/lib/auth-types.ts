export type ApiUserRole = "ADMIN" | "STUDENT" | "LECTURER";

export type ApiUser = {
  id: string;
  fullName: string;
  email: string;
  role: ApiUserRole;
  isActive: boolean;
};

export type AuthApiResponse = {
  token: string | null;
  user: ApiUser;
  message?: string;
};

export type ApiAuthSession = {
  token: string;
  user: ApiUser;
};

export type AppRole = "admin" | "lecturer" | "student";

export function apiRoleToAppRole(role: ApiUserRole): AppRole {
  switch (role) {
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
