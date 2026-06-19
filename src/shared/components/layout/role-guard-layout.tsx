import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { apiRoleToAppRole, routeForAppRole, type AppRole } from "@/features/auth/lib/auth-types";
import { getApiSession } from "@/features/auth/lib/auth-session";
import { useAuth } from "@/features/auth/lib/auth-context";

type RoleGuardLayoutProps = {
  role: AppRole;
};

function resolveRole(userRole: AppRole | undefined): AppRole | null {
  if (userRole) return userRole;
  const session = getApiSession();
  return session ? apiRoleToAppRole(session.user.role) : null;
}

export function RoleGuardLayout({ role }: RoleGuardLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const resolvedRole = useMemo(() => resolveRole(user?.role), [user?.role]);
  const allowed = resolvedRole === role;
  const pendingSession = !user && !!getApiSession();
  const resolving = authLoading || pendingSession;

  useEffect(() => {
    if (resolving) return;
    if (allowed) return;
    if (!resolvedRole) {
      void navigate({ to: "/auth", replace: true });
      return;
    }
    void navigate({ to: routeForAppRole(resolvedRole), replace: true });
  }, [resolving, allowed, resolvedRole, navigate]);

  if (resolving || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <Outlet />;
}
