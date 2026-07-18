import { getApiToken } from "@/features/auth/lib/auth-session";

let apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
if (!apiBase.startsWith("http")) apiBase = `https://${apiBase}`;
const API_BASE = apiBase.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiErrorBody = { message?: string; fieldErrors?: Record<string, string> };

type ApiRequestInit = RequestInit & {
  /** Skip attaching Bearer token (login, register, …). */
  skipAuth?: boolean;
};

function resolveAuthToken(skipAuth?: boolean): string | null {
  if (skipAuth) return null;
  const token = getApiToken();
  if (!token) {
    throw new ApiError("Phiên đăng nhập hết hạn", 401);
  }
  return token;
}

function applyAuthHeader(headers: Headers, skipAuth?: boolean) {
  const token = resolveAuthToken(skipAuth);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
}

export async function apiFetch<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const { skipAuth, headers: initHeaders, ...rest } = init ?? {};
  const headers = new Headers(initHeaders);
  if (!headers.has("Content-Type") && rest.body) {
    headers.set("Content-Type", "application/json");
  }
  applyAuthHeader(headers, skipAuth);

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });

  if (!res.ok) {
    let message = res.statusText;
    let fieldErrors: Record<string, string> | undefined;
    try {
      const body = (await res.json()) as ApiErrorBody;
      if (body.message) message = body.message;
      fieldErrors = body.fieldErrors;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status, fieldErrors);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function apiFetchBlob(path: string, init?: ApiRequestInit): Promise<Blob> {
  const { skipAuth, headers: initHeaders, ...rest } = init ?? {};
  const headers = new Headers(initHeaders);
  applyAuthHeader(headers, skipAuth);

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as ApiErrorBody;
      if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }

  return res.blob();
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  init?: { skipAuth?: boolean; method?: "POST" | "PUT" },
): Promise<T> {
  const { skipAuth, method = "POST" } = init ?? {};
  const headers = new Headers();
  applyAuthHeader(headers, skipAuth);

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: formData });

  if (!res.ok) {
    let message = res.statusText;
    let fieldErrors: Record<string, string> | undefined;
    try {
      const body = (await res.json()) as ApiErrorBody;
      if (body.message) message = body.message;
      fieldErrors = body.fieldErrors;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status, fieldErrors);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
