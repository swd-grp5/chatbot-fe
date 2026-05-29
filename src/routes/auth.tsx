import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck, GraduationCap, BookOpen } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { signIn, signUp } from "@/lib/mock-auth";
import { findUserById, type MockUser } from "@/lib/mock-storage";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({ component: AuthPage });

const DEMO_ACCOUNTS = [
  { label: "Admin demo", email: "admin@demo.edu", password: "admin123", icon: ShieldCheck },
  { label: "Lecturer demo", email: "lecturer@demo.edu", password: "lecturer123", icon: BookOpen },
  { label: "Student demo", email: "student@demo.edu", password: "student123", icon: GraduationCap },
];

const routeForRole = (role: MockUser["role"]) =>
  role === "admin" ? "/admin/users" : role === "lecturer" ? "/lecturer/documents" : "/";

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupRole, setSignupRole] = useState<"student" | "lecturer">("student");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const mockUser = findUserById(user.id);
      navigate({ to: routeForRole(mockUser?.role ?? "student") });
    }
  }, [user, loading, navigate]);

  const signInWith = async (em: string, pw: string) => {
    setBusy(true);
    try {
      const u = signIn(em, pw);
      toast.success("Đăng nhập thành công");
      navigate({ to: routeForRole(u.role) });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signup") {
        const u = signUp(email, password, signupRole);
        toast.success("Đăng ký thành công!");
        navigate({ to: routeForRole(u.role) });
      } else {
        await signInWith(email, password);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <Logo height={40} className="h-10" />
          <div>
            <div className="text-base font-semibold tracking-tight">EduBuddy</div>
            <div className="text-xs text-muted-foreground">Quản lý & tra cứu tài liệu</div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Đăng nhập</TabsTrigger>
            <TabsTrigger value="signup">Đăng ký</TabsTrigger>
          </TabsList>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoComplete="email"
            />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              required
              minLength={6}
              autoComplete={tab === "signup" ? "new-password" : "current-password"}
            />

            <TabsContent value="signin" className="m-0">
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Đăng nhập
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="m-0 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={signupRole === "student" ? "default" : "outline"}
                  className="h-auto flex-col gap-1 py-2.5"
                  onClick={() => setSignupRole("student")}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-xs font-semibold">Sinh viên</span>
                </Button>
                <Button
                  type="button"
                  variant={signupRole === "lecturer" ? "default" : "outline"}
                  className="h-auto flex-col gap-1 py-2.5"
                  onClick={() => setSignupRole("lecturer")}
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="text-xs font-semibold">Giảng viên</span>
                </Button>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tạo tài khoản
              </Button>
            </TabsContent>
          </form>
        </Tabs>

        <div className="mt-6 border-t border-border pt-4">
          <div className="mb-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
            Tài khoản demo
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <Button
                  key={acc.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto flex-col gap-1 py-2"
                  disabled={busy}
                  onClick={() => signInWith(acc.email, acc.password)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-semibold">{acc.label}</span>
                  <span className="text-[10px] font-normal text-muted-foreground">{acc.email}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
