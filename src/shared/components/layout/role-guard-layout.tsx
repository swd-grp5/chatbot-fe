import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { AppRole } from "@/features/auth/lib/auth-types";
import { useRole } from "@/features/auth/hooks/use-role";

type RoleGuardLayoutProps = {
  role: AppRole;
};

export function RoleGuardLayout({ role }: RoleGuardLayoutProps) {
  const { loading, role: currentRole } = useRole();
  const navigate = useNavigate();
  const allowed = currentRole === role;

  useEffect(() => {
    if (!loading && !allowed) navigate({ to: "/" });
  }, [loading, allowed, navigate]);

  if (loading || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <Outlet />;
}
