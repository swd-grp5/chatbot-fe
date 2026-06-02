import { useAuth } from "@/features/auth/lib/auth-context";
import type { AppRole } from "@/features/auth/lib/auth-types";

export type { AppRole };

export function useRole() {
  const { user, loading } = useAuth();

  const role = user?.role ?? null;

  return {
    role,
    loading,
    isAdmin: role === "admin",
    isLecturer: role === "lecturer",
    isStudent: role === "student",
  };
}
