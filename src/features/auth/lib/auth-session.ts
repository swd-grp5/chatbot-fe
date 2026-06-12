import {
  normalizeApiUser,
  type ApiAuthSession,
  type ApiUserResponse,
} from "@/features/auth/lib/auth-types";

const API_AUTH_KEY = "sdn-api-auth";

type ApiAuthSessionInput = {
  token: string;
  user: ApiUserResponse;
};

function normalizeSession(session: ApiAuthSessionInput): ApiAuthSession {
  return {
    token: session.token,
    user: normalizeApiUser(session.user),
  };
}

export function getApiSession(): ApiAuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(API_AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as ApiAuthSessionInput;
    if (!session.token || !session.user?.id) return null;
    return normalizeSession(session);
  } catch {
    return null;
  }
}

export function setApiSession(session: ApiAuthSessionInput | null) {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem(API_AUTH_KEY, JSON.stringify(normalizeSession(session)));
  } else {
    localStorage.removeItem(API_AUTH_KEY);
  }
  window.dispatchEvent(new CustomEvent("sdn-auth-changed"));
}

export function getApiToken(): string | null {
  return getApiSession()?.token ?? null;
}
