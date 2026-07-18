import { redirect } from "@tanstack/react-router";
import { getApiSession } from "@/features/auth/lib/auth-session";
import { apiRoleToAppRole, routeForAppRole } from "@/features/auth/lib/auth-types";

export function redirectNonLecturerFromLecturerRoute() {
  const session = getApiSession();
  if (!session) {
    throw redirect({ to: "/auth" });
  }
  const role = apiRoleToAppRole(session.user.role);
  if (role !== "lecturer") {
    throw redirect({ to: routeForAppRole(role) });
  }
}
