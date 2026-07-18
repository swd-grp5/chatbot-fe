import { apiFetch } from "@/shared/lib/api-client";

/** Khớp `swdchatbox.modules.subscription.enums.ResetPeriod` */
export const RESET_PERIOD = {
  HOURLY: "HOURLY",
  DAILY: "DAILY",
  MONTHLY: "MONTHLY",
} as const;

export type ResetPeriod = (typeof RESET_PERIOD)[keyof typeof RESET_PERIOD];

/** Khớp `swdchatbox.modules.subscription.enums.DurationUnit` */
export const DURATION_UNIT = {
  DAY: "DAY",
  MONTH: "MONTH",
} as const;

export type DurationUnit = (typeof DURATION_UNIT)[keyof typeof DURATION_UNIT];

/** Khớp entity `SubscriptionPlan` (credit-based) */
export type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  creditAmount: number;
  resetPeriod: ResetPeriod;
  durationValue: number;
  durationUnit: DurationUnit;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Khớp `CurrentUserSubscriptionResponse` */
export type CurrentUserSubscription = {
  plan: SubscriptionPlan;
  remainingCredits: number;
  nextResetAt: string | null;
};

export type UserSubscriptionResponse = {
  id: string;
  planId: string;
  planName: string;
  dailyQuestionLimit: number | null;
  active: boolean;
  subscribedAt: string;
  expiresAt: string;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionPlanPayload = {
  name: string;
  price: number;
  creditAmount: number;
  resetPeriod: ResetPeriod;
  durationValue: number;
  durationUnit: DurationUnit;
  description?: string | null;
  active: boolean;
};

export type FetchAdminPlansParams = {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

type SpringPage<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

export const DEFAULT_ADMIN_PLAN_PAGE_SIZE = 50;

export function formatPlanPrice(price: number) {
  const n = Number(price) || 0;
  return n === 0 ? "Miễn phí" : `${n.toLocaleString("vi-VN")}₫ / tháng`;
}

export function formatCreditQuota(creditAmount: number, resetPeriod: ResetPeriod) {
  const amount = (Number(creditAmount) || 0).toLocaleString("vi-VN");
  const period = resetPeriod === "HOURLY" ? "giờ" : resetPeriod === "DAILY" ? "ngày" : "tháng";
  return `${amount} credit / ${period}`;
}

export function planDescriptionLines(description: string | null | undefined): string[] {
  if (!description?.trim()) return [];
  return description
    .split(/\r?\n|[•·|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function fetchActivePlans() {
  return apiFetch<SubscriptionPlan[]>("/subscriptions/plans");
}

export async function fetchCurrentSubscription() {
  return apiFetch<CurrentUserSubscription>("/subscriptions/current");
}

export async function subscribeToPlan(planId: string) {
  return apiFetch<UserSubscriptionResponse>(`/subscriptions/subscribe/${planId}`, {
    method: "POST",
  });
}

export async function unsubscribeFromPlan() {
  return apiFetch<void>("/subscriptions/unsubscribe", { method: "POST" });
}

export async function fetchMySubscriptionHistory() {
  return apiFetch<UserSubscriptionResponse[]>("/subscriptions/my-history");
}

export async function fetchAdminPlans(params?: FetchAdminPlansParams) {
  const search = new URLSearchParams({
    page: String(params?.page ?? 0),
    size: String(params?.size ?? DEFAULT_ADMIN_PLAN_PAGE_SIZE),
    sortBy: params?.sortBy ?? "price",
    sortDir: params?.sortDir ?? "asc",
  });
  return apiFetch<SpringPage<SubscriptionPlan>>(`/subscriptions/admin/plans?${search}`);
}

export async function createSubscriptionPlan(payload: SubscriptionPlanPayload) {
  return apiFetch<SubscriptionPlan>("/subscriptions/admin/plans", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name.trim(),
      price: payload.price,
      creditAmount: payload.creditAmount,
      resetPeriod: payload.resetPeriod,
      durationValue: payload.durationValue,
      durationUnit: payload.durationUnit,
      description: payload.description?.trim() || null,
      active: payload.active,
    }),
  });
}

export async function updateSubscriptionPlan(id: string, payload: SubscriptionPlanPayload) {
  return apiFetch<SubscriptionPlan>(`/subscriptions/admin/plans/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: payload.name.trim(),
      price: payload.price,
      creditAmount: payload.creditAmount,
      resetPeriod: payload.resetPeriod,
      durationValue: payload.durationValue,
      durationUnit: payload.durationUnit,
      description: payload.description?.trim() || null,
      active: payload.active,
    }),
  });
}

export async function deleteSubscriptionPlan(id: string) {
  return apiFetch<void>(`/subscriptions/admin/plans/${id}`, { method: "DELETE" });
}
