import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { type CredentialResponse } from "@react-oauth/google";
import { Eye, EyeOff, Loader2, ShieldCheck, GraduationCap, BookOpen } from "lucide-react";
import { Logo } from "@/shared/components/layout/logo";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { toast } from "sonner";
import { findUserById, type MockUser } from "@/shared/lib/mock-storage";
import { useAuth } from "@/features/auth/lib/auth-context";
import { DEMO_ACCOUNTS, loginWithEmail, loginWithGoogle, registerWithEmail, resendVerificationEmail } from "@/features/auth/api/auth-api";
import { ApiError } from "@/shared/lib/api-client";
import { setApiSession } from "@/features/auth/lib/auth-session";
import { apiRoleToAppRole, routeForAppRole } from "@/features/auth/lib/auth-types";
import { isGoogleAuthConfigured } from "@/features/auth/components/google-auth-provider";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";

const DEMO_ICONS = {
  admin: ShieldCheck,
  lecturer: BookOpen,
  student: GraduationCap,
} as const;

const routeForMockRole = (role: MockUser["role"]) => routeForAppRole(role);

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength = 6,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        className="pr-10"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [signInForm, setSignInForm] = useState({ email: "", password: "" });
  const [signUpForm, setSignUpForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [signUpFieldErrors, setSignUpFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
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

  const signUpWith = async () => {
    setSignUpFieldErrors({});
    const registeredEmail = signUpForm.email;
    const data = await registerWithEmail(signUpForm);
    toast.success(data.message ?? "Đăng ký thành công");
    setSignUpForm({ fullName: "", email: "", password: "", confirmPassword: "" });
    setSignInForm((prev) => ({ ...prev, email: registeredEmail }));
    setTab("signin");
  };

  const onResendVerification = async () => {
    const email = signInForm.email.trim();
    if (!email) {
      toast.error("Vui lòng nhập email");
      return;
    }

    setResending(true);
    try {
      await resendVerificationEmail(email);
      toast.success("Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.");
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Gửi lại email thất bại";
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  const onSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signInWith(signInForm.email, signInForm.password);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Có lỗi xảy ra";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSignUpFieldErrors({});
    try {
      await signUpWith();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.fieldErrors) {
        setSignUpFieldErrors(err.fieldErrors);
      }
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Đăng ký thất bại";
      toast.error(message);
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

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as "signin" | "signup");
            setSignUpFieldErrors({});
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Đăng nhập</TabsTrigger>
            <TabsTrigger value="signup">Đăng ký</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <form onSubmit={onSignInSubmit} className="space-y-3">
              <Input
                id="signin-email"
                type="email"
                value={signInForm.email}
                onChange={(e) => setSignInForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                required
                autoComplete="email"
              />
              <PasswordInput
                id="signin-password"
                value={signInForm.password}
                onChange={(password) => setSignInForm((f) => ({ ...f, password }))}
                placeholder="Mật khẩu"
                autoComplete="current-password"
              />
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Đăng nhập
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Chưa kích hoạt tài khoản?{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                  disabled={resending || busy}
                  onClick={onResendVerification}
                >
                  Gửi lại email xác thực
                </button>
              </p>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <form onSubmit={onSignUpSubmit} className="space-y-3">
              <div className="space-y-1">
                <Input
                  id="signup-fullName"
                  type="text"
                  value={signUpForm.fullName}
                  onChange={(e) => setSignUpForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Họ và tên"
                  required
                  autoComplete="name"
                />
                {signUpFieldErrors.fullName && (
                  <p className="text-xs text-destructive">{signUpFieldErrors.fullName}</p>
                )}
              </div>
              <div className="space-y-1">
                <Input
                  id="signup-email"
                  type="email"
                  value={signUpForm.email}
                  onChange={(e) => setSignUpForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Email"
                  required
                  autoComplete="email"
                />
                {signUpFieldErrors.email && (
                  <p className="text-xs text-destructive">{signUpFieldErrors.email}</p>
                )}
              </div>
              <div className="space-y-1">
                <PasswordInput
                  id="signup-password"
                  value={signUpForm.password}
                  onChange={(password) => setSignUpForm((f) => ({ ...f, password }))}
                  placeholder="Mật khẩu"
                  autoComplete="new-password"
                />
                {signUpFieldErrors.password && (
                  <p className="text-xs text-destructive">{signUpFieldErrors.password}</p>
                )}
              </div>
              <div className="space-y-1">
                <PasswordInput
                  id="signup-confirmPassword"
                  value={signUpForm.confirmPassword}
                  onChange={(confirmPassword) => setSignUpForm((f) => ({ ...f, confirmPassword }))}
                  placeholder="Xác nhận mật khẩu"
                  autoComplete="new-password"
                />
                {signUpFieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{signUpFieldErrors.confirmPassword}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tạo tài khoản
              </Button>
            </form>
          </TabsContent>
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
              <GoogleSignInButton
                onSuccess={onGoogleSuccess}
                onError={() => toast.error("Đăng nhập Google bị hủy hoặc lỗi")}
                useOneTap={!loading && !user}
              />
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
