import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, getSession, signOut as mockSignOut } from "@/features/auth/lib/mock-auth";
import type { MockUser } from "@/shared/lib/mock-storage";
import { getApiSession, setApiSession } from "@/features/auth/lib/auth-session";
import {
  apiRoleToAppRole,
  normalizeApiUser,
  type ApiAuthSession,
  type ApiUserResponse,
  type AppRole,
} from "@/features/auth/lib/auth-types";
import { clearViewMode, resetViewModeForRole } from "@/features/student/lib/view-mode";
import { useAppStore } from "@/features/student/lib/store";
import { storageKey } from "@/shared/lib/storage-keys";
import { resetMySubjectsQueries } from "@/shared/lib/query-client";

export type AuthUser = {
  id: string;
  email: string;
  role: AppRole;
  fullName?: string;
  source: "api" | "mock";
};

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => void;
  /** Đăng nhập / đổi demo account: cập nhật token + user React đồng bộ, tránh race API. */
  applyApiSession: (session: { token: string; user: ApiUserResponse }) => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signOut: () => {},
  applyApiSession: () => {},
});

function mockRole(user: MockUser): AppRole {
  return user.role;
}

function toAuthUser(session: ApiAuthSession): AuthUser {
  const role = apiRoleToAppRole(session.user.role);
  return {
    id: session.user.id,
    email: session.user.email,
    fullName: session.user.fullName,
    role,
    source: "api",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initStore = useAppStore((s) => s.init);
  const loadUserData = useAppStore((s) => s.loadUserData);
  const clearStore = useAppStore((s) => s.clear);

  const sync = useCallback(() => {
    const apiSession = getApiSession();
    if (apiSession) {
      const next = toAuthUser(apiSession);
      setUser((prev) => {
        if (!prev || prev.id !== next.id || prev.role !== next.role) {
          resetViewModeForRole(next.role);
        }
        return next;
      });
      setLoading(false);
      return;
    }

    const session = getSession();
    const current = getCurrentUser();
    if (session && current && !current.isBlocked) {
      const role = mockRole(current);
      setUser((prev) => {
        if (!prev || prev.id !== current.id) {
          resetViewModeForRole(role);
        }
        loadUserData(current.id);
        return {
          id: current.id,
          email: current.email,
          role,
          source: "mock",
        };
      });
    } else {
      setUser(null);
      clearStore();
    }
    setLoading(false);
  }, [loadUserData, clearStore]);

  useEffect(() => {
    initStore();
    sync();
    const authChangedEvent = storageKey("auth-changed");
    window.addEventListener(authChangedEvent, sync);
    return () => window.removeEventListener(authChangedEvent, sync);
  }, [initStore, sync]);

  const applyApiSession = useCallback(
    (session: { token: string; user: ApiUserResponse }) => {
      clearStore();
      const normalized = {
        token: session.token,
        user: normalizeApiUser(session.user),
      };
      // Cập nhật React user trước, rồi mới reset query — tránh refetch student bằng token mới
      const next = toAuthUser(normalized);
      resetViewModeForRole(next.role);
      setUser(next);
      setLoading(false);
      setApiSession(normalized, { resetQueries: false });
      queueMicrotask(() => {
        resetMySubjectsQueries();
      });
    },
    [clearStore],
  );

  const signOut = () => {
    setApiSession(null);
    mockSignOut();
    clearViewMode();
    clearStore();
    resetMySubjectsQueries();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, signOut, applyApiSession }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
