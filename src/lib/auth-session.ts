import type { ApiAuthSession } from "@/lib/auth-types";

const API_AUTH_KEY = "sdn-api-auth";

export function getApiSession(): ApiAuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(API_AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as ApiAuthSession;
    if (!session.token || !session.user?.id) return null;
    return session;
  } catch {
    return null;
  }
}

export function setApiSession(session: ApiAuthSession | null) {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem(API_AUTH_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(API_AUTH_KEY);
  }
  window.dispatchEvent(new CustomEvent("sdn-auth-changed"));
}

export function getApiToken(): string | null {
  return getApiSession()?.token ?? null;
}
