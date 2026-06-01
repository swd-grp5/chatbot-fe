import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, getSession, signOut as mockSignOut } from "@/lib/mock-auth";
import type { MockUser } from "@/lib/mock-storage";
import { getApiSession, setApiSession } from "@/lib/auth-session";
import { apiRoleToAppRole, type AppRole } from "@/lib/auth-types";
import { clearViewMode, resetViewModeForRole } from "@/lib/view-mode";
import { useAppStore } from "@/lib/store";

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
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signOut: () => {},
});

function mockRole(user: MockUser): AppRole {
  return user.role;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initStore = useAppStore((s) => s.init);
  const loadUserData = useAppStore((s) => s.loadUserData);
  const clearStore = useAppStore((s) => s.clear);

  const sync = () => {
    const apiSession = getApiSession();
    if (apiSession) {
      const role = apiRoleToAppRole(apiSession.user.role);
      setUser({
        id: apiSession.user.id,
        email: apiSession.user.email,
        fullName: apiSession.user.fullName,
        role,
        source: "api",
      });
      resetViewModeForRole(role);
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
  };

  useEffect(() => {
    initStore();
    sync();
    window.addEventListener("sdn-auth-changed", sync);
    return () => window.removeEventListener("sdn-auth-changed", sync);
  }, [initStore, loadUserData, clearStore]);

  const signOut = () => {
    setApiSession(null);
    mockSignOut();
    clearViewMode();
    clearStore();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
