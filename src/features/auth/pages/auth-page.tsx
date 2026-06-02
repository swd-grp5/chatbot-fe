import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Loader2, ShieldCheck, GraduationCap, BookOpen } from "lucide-react";
import { Logo } from "@/shared/components/layout/logo";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { toast } from "sonner";
import { signUp } from "@/features/auth/lib/mock-auth";
import { findUserById, type MockUser } from "@/shared/lib/mock-storage";
import { useAuth } from "@/features/auth/lib/auth-context";
import { DEMO_ACCOUNTS, loginWithEmail, loginWithGoogle } from "@/features/auth/api/auth-api";
import { ApiError } from "@/shared/lib/api-client";
import { setApiSession } from "@/features/auth/lib/auth-session";
import { apiRoleToAppRole, routeForAppRole } from "@/features/auth/lib/auth-types";
import { isGoogleAuthConfigured } from "@/features/auth/components/google-auth-provider";

const DEMO_ICONS = {
  admin: ShieldCheck,
  lecturer: BookOpen,
  student: GraduationCap,
} as const;

const routeForMockRole = (role: MockUser["role"]) => routeForAppRole(role);

export function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupRole, setSignupRole] = useState<"student" | "lecturer">("student");
  const [busy, setBusy] = useState(false);
  const googleEnabled = isGoogleAuthConfigured();

  useEffect(() => {
    if (!loading && user) {
      if (user.source === "api") {
        navigate({ to: routeForAppRole(user.role) });
        return;
      }
      const mockUser = findUserById(user.id);
      navigate({ to: routeForMockRole(mockUser?.role ?? "student") });
    }
  }, [user, loading, navigate]);

  const signInWith = async (em: string, pw: string) => {
    setBusy(true);
    try {
      const data = await loginWithEmail(em, pw);
      if (!data.token) {
        toast.error(data.message ?? "Đăng nhập thất bại");
        return;
      }
      setApiSession({ token: data.token, user: data.user });
      toast.success("Đăng nhập thành công");
      navigate({ to: routeForAppRole(apiRoleToAppRole(data.user.role)) });
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Đăng nhập thất bại";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onGoogleSuccess = async (response: CredentialResponse) => {
    const idToken = response.credential;
    if (!idToken) {
      toast.error("Không nhận được token từ Google");
      return;
    }

    setBusy(true);
    try {
      const data = await loginWithGoogle(idToken);
      if (!data.token) {
        toast.error(data.message ?? "Đăng nhập thất bại");
        return;
      }
      setApiSession({ token: data.token, user: data.user });
      toast.success("Đăng nhập Google thành công");
      navigate({ to: routeForAppRole(apiRoleToAppRole(data.user.role)) });
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Đăng nhập Google thất bại";
      toast.error(message);
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
        navigate({ to: routeForMockRole(u.role) });
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

            <TabsContent value="signin" className="m-0 space-y-3">
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

        {tab === "signin" && (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">hoặc</span>
              </div>
            </div>
            {googleEnabled ? (
              <div className="flex justify-center [&>div]:w-full">
                <GoogleLogin
                  onSuccess={onGoogleSuccess}
                  onError={() => toast.error("Đăng nhập Google bị hủy hoặc lỗi")}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width="100%"
                />
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Thiếu <code className="text-[11px]">VITE_GOOGLE_CLIENT_ID</code> trong file{" "}
                <code className="text-[11px]">.env</code>
              </p>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-border pt-4">
          <div className="mb-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
            Tài khoản demo
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = DEMO_ICONS[acc.role];
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
