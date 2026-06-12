import {
  addUser,
  findUserByEmail,
  findUserById,
  initMockStorage,
  type MockUser,
} from "@/shared/lib/mock-storage";
import { resetViewModeForRole } from "@/features/student/lib/view-mode";
import { migrateStorageKey, storageKey } from "@/shared/lib/storage-keys";

const AUTH_KEY = storageKey("auth");
const AUTH_CHANGED_EVENT = storageKey("auth-changed");

export type AuthSession = {
  userId: string;
  email: string;
};

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  initMockStorage();
  migrateStorageKey(AUTH_KEY, "sdn-auth");
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!findUserById(session.userId)) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (session) localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  else localStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

export function signIn(email: string, password: string): MockUser {
  const user = findUserByEmail(email);
  if (!user || user.password !== password) {
    throw new Error("Email hoặc mật khẩu không đúng.");
  }
  if (user.isBlocked) {
    throw new Error("Tài khoản đã bị khóa. Vui lòng liên hệ admin.");
  }
  setSession({ userId: user.id, email: user.email });
  resetViewModeForRole(user.role);
  return user;
}

export function signUp(email: string, password: string, role: "student" | "lecturer" = "student"): MockUser {
  if (findUserByEmail(email)) {
    throw new Error("Email đã được sử dụng.");
  }
  const user = addUser({ email, password, role, isBlocked: false });
  setSession({ userId: user.id, email: user.email });
  resetViewModeForRole(user.role);
  return user;
}

export function signOut() {
  setSession(null);
}

const DEMO_CREDENTIALS = {
  admin: { email: "admin@demo.edu", password: "admin123" },
  lecturer: { email: "lecturer@demo.edu", password: "lecturer123" },
  student: { email: "student@demo.edu", password: "student123" },
} as const;

/** Demo: chuyển sang tài khoản admin/lecturer/student thật (đổi cả email đăng nhập). */
export function switchDemoAccount(role: keyof typeof DEMO_CREDENTIALS): MockUser {
  const { email, password } = DEMO_CREDENTIALS[role];
  return signIn(email, password);
}

export function getCurrentUser(): MockUser | null {
  const session = getSession();
  if (!session) return null;
  return findUserById(session.userId) ?? null;
}
