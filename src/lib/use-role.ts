import { useEffect, useState } from "react";
import { findUserById } from "@/lib/mock-storage";
import { useAuth } from "@/lib/auth-context";

export type AppRole = "admin" | "lecturer" | "student";

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    const mockUser = findUserById(user.id);
    setRole(mockUser?.role ?? "student");
    setLoading(false);
  }, [user, authLoading]);

  return {
    role,
    loading: authLoading || loading,
    isAdmin: role === "admin",
    isLecturer: role === "lecturer",
    isStudent: role === "student",
  };
}
