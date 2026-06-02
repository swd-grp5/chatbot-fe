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

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const { token, headers: initHeaders, ...rest } = init ?? {};
  const headers = new Headers(initHeaders);
  if (!headers.has("Content-Type") && rest.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

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
