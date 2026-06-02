import { apiFetch } from "@/shared/lib/api-client";
import type { AppRole, AuthApiResponse } from "@/features/auth/lib/auth-types";

export const DEMO_ACCOUNTS = [
  { label: "Admin demo", email: "admin@gmail.com", password: "123456", role: "admin" as const },
  { label: "Lecturer demo", email: "lecturer@gmail.com", password: "123456", role: "lecturer" as const },
  { label: "Student demo", email: "student@gmail.com", password: "123456", role: "student" as const },
];

export const DEMO_ACCOUNT_BY_ROLE: Record<AppRole, { email: string; password: string }> = {
  admin: { email: "admin@gmail.com", password: "123456" },
  lecturer: { email: "lecturer@gmail.com", password: "123456" },
  student: { email: "student@gmail.com", password: "123456" },
};

export const DEMO_EMAILS = new Set(DEMO_ACCOUNTS.map((a) => a.email));

export async function loginWithEmail(email: string, password: string, rememberMe = true) {
  return apiFetch<AuthApiResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, rememberMe }),
  });
}

export async function loginWithGoogle(idToken: string, rememberMe = false) {
  return apiFetch<AuthApiResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken, rememberMe }),
  });
}

export async function loginDemoAccount(role: AppRole) {
  const { email, password } = DEMO_ACCOUNT_BY_ROLE[role];
  return loginWithEmail(email, password);
}
