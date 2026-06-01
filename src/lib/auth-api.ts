import { apiFetch } from "@/lib/api-client";
import type { AuthApiResponse } from "@/lib/auth-types";

export async function loginWithGoogle(idToken: string, rememberMe = false) {
  return apiFetch<AuthApiResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken, rememberMe }),
  });
}
