import { useEffect } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { FileText, Users, LogOut, ShieldCheck, GraduationCap, BookOpen, Loader2, Bot, CreditCard, MessageSquare } from "lucide-react";
import { Logo } from "@/shared/components/layout/logo";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/features/auth/lib/auth-context";
import { useRole, type AppRole } from "@/features/auth/hooks/use-role";
import { DEMO_EMAILS, loginDemoAccount } from "@/features/auth/api/auth-api";
import { setApiSession } from "@/features/auth/lib/auth-session";
import { routeForAppRole } from "@/features/auth/lib/auth-types";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";

const HOME_FOR_ROLE: Record<AppRole, string> = {
  admin: "/admin/users",
  lecturer: "/lecturer/documents",
  student: "/",
};

const ROLE_META: Record<AppRole, { label: string; icon: typeof ShieldCheck }> = {
  admin: { label: "Admin", icon: ShieldCheck },
  lecturer: { label: "Lecturer", icon: BookOpen },
  student: { label: "Student", icon: GraduationCap },
};

export function AppShell({
  children,
  fullBleed = false,
  mainClassName,
}: {
  children: React.ReactNode;
  fullBleed?: boolean;
  mainClassName?: string;
}) {
  const { location } = useRouterState();
  const { user, loading, signOut } = useAuth();
  const { role, loading: roleLoading, isAdmin, isLecturer } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (roleLoading || !role) return;
    const home = HOME_FOR_ROLE[role];

    // Đẩy về đúng khu vực của vai trò nếu đang lạc vào khu khác.
    if (isAdmin && !location.pathname.startsWith("/admin")) {
      navigate({ to: home, replace: true });
      return;
    }
    if (isLecturer && !location.pathname.startsWith("/lecturer")) {
      navigate({ to: home, replace: true });
      return;
    }
    if (!isAdmin && !isLecturer && (location.pathname.startsWith("/admin") || location.pathname.startsWith("/lecturer"))) {
      navigate({ to: "/", replace: true });
    }
  }, [roleLoading, role, isAdmin, isLecturer, location.pathname, navigate]);

  if (loading || !user || roleLoading || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const navItems = isAdmin
    ? [
        { to: "/admin/users", label: "Sinh viên", icon: Users },
        { to: "/admin/subjects", label: "Môn học", icon: BookOpen },
        { to: "/admin/subscriptions", label: "Gói tháng", icon: CreditCard },
        { to: "/admin/ai-config", label: "Cấu hình AI", icon: Bot },
      ]
    : isLecturer
      ? [{ to: "/lecturer/documents", label: "Tài liệu", icon: FileText }]
      : [
          { to: "/", label: "Chat", icon: MessageSquare },
          { to: "/documents", label: "Tài liệu", icon: FileText },
          { to: "/subscriptions", label: "Gói tháng", icon: CreditCard },
        ];

  const initial = (user.email ?? "?")[0].toUpperCase();
  const isDemo = DEMO_EMAILS.has(user.email);
  const otherDemoRoles: AppRole[] = (["admin", "lecturer", "student"] as AppRole[]).filter((r) => r !== role);

  const switchDemoRole = async (targetRole: AppRole) => {
    try {
      const data = await loginDemoAccount(targetRole);
      if (!data.token) return;
      setApiSession({ token: data.token, user: data.user });
      navigate({ to: routeForAppRole(targetRole) });
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={cn("flex flex-col bg-background", fullBleed ? "h-svh overflow-hidden" : "min-h-screen")}>
      <header className={cn("z-30 border-b border-border bg-card/95 backdrop-blur", fullBleed ? "shrink-0" : "sticky top-0")}>
        <div className="flex h-16 items-center gap-6 px-6">
          <Link to={HOME_FOR_ROLE[role]} className="flex items-center gap-2.5">
            <Logo height={40} className="h-10" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">EduBuddy</div>
              <div className="text-[11px] text-muted-foreground">Trợ lý học tập</div>
            </div>
          </Link>

          {navItems.length > 0 && (
            <nav className="ml-4 flex items-center gap-1">
              {navItems.map((item) => {
                const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-secondary">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {initial}
                  </span>
                  <span className="max-w-[160px] truncate font-medium">{user.email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Đã đăng nhập ({ROLE_META[role].label})
                  <div className="mt-0.5 truncate text-sm font-medium text-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isDemo &&
                  otherDemoRoles.map((r) => {
                    const Icon = ROLE_META[r].icon;
                    return (
                      <DropdownMenuItem key={r} onClick={() => void switchDemoRole(r)}>
                        <Icon className="mr-2 h-3.5 w-3.5" />
                        Chuyển sang "{ROLE_META[r].label}"
                      </DropdownMenuItem>
                    );
                  })}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => { signOut(); navigate({ to: "/auth" }); }}
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main
        className={cn(
          "min-h-0 flex-1",
          fullBleed ? "overflow-hidden" : (mainClassName ?? "px-6 py-6"),
        )}
      >
        {children}
      </main>
    </div>
  );
}
