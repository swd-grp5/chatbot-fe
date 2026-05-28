import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, getSession, signOut as mockSignOut } from "@/lib/mock-auth";
import type { MockUser } from "@/lib/mock-storage";
import { clearViewMode, resetViewModeForRole } from "@/lib/view-mode";
import { useAppStore } from "@/lib/store";

interface AuthCtx {
  user: Pick<MockUser, "id" | "email"> | null;
  loading: boolean;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Pick<MockUser, "id" | "email"> | null>(null);
  const [loading, setLoading] = useState(true);
  const initStore = useAppStore((s) => s.init);
  const loadUserData = useAppStore((s) => s.loadUserData);
  const clearStore = useAppStore((s) => s.clear);

  const sync = () => {
    const session = getSession();
    const current = getCurrentUser();
    if (session && current && !current.isBlocked) {
      setUser((prev) => {
        if (!prev || prev.id !== current.id) {
          resetViewModeForRole(current.role);
        }
        loadUserData(current.id);
        return { id: current.id, email: current.email };
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
