import { redirect } from "@tanstack/react-router";
import { getApiSession } from "@/features/auth/lib/auth-session";
import { apiRoleToAppRole, routeForAppRole } from "@/features/auth/lib/auth-types";

export function redirectNonStudentFromStudentRoute() {
  const session = getApiSession();
  if (!session) return;
  const role = apiRoleToAppRole(session.user.role);
  if (role !== "student") {
    throw redirect({ to: routeForAppRole(role) });
  }
}
