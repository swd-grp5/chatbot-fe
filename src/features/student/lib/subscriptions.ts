import { migrateStorageKey, storageKey } from "@/shared/lib/storage-keys";

export const SUBSCRIPTION_PLANS_KEY = storageKey("subscriptions");
export const USER_SUBSCRIPTIONS_KEY = storageKey("user-subscriptions");

export function migrateSubscriptionStorage() {
  migrateStorageKey(SUBSCRIPTION_PLANS_KEY, "sdn-subscriptions");
  migrateStorageKey(USER_SUBSCRIPTIONS_KEY, "sdn-user-subscriptions");
}

export type SubscriptionPlan = {
  id: string;
  name: string;
  pricePerMonth: number;
  questionsPerMonth: number;
  features: string[];
  active: boolean;
};

export type UserSubscription = {
  planId: string;
  subscribedAt: string;
};

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "p-free",
    name: "Free",
    pricePerMonth: 0,
    questionsPerMonth: 30,
    features: ["30 câu hỏi/tháng", "Xem trích dẫn", "Hỗ trợ cộng đồng"],
    active: true,
  },
  {
    id: "p-pro",
    name: "Pro",
    pricePerMonth: 99000,
    questionsPerMonth: 1000,
    features: ["1.000 câu hỏi/tháng", "Ưu tiên xử lý", "Lịch sử không giới hạn"],
    active: true,
  },
  {
    id: "p-edu",
    name: "Education",
    pricePerMonth: 299000,
    questionsPerMonth: 5000,
    features: ["5.000 câu hỏi/tháng", "Tài liệu nâng cao", "Hỗ trợ 1-1"],
    active: true,
  },
];

export const FREE_PLAN_ID = "p-free";

export const formatPlanPrice = (n: number) =>
  n === 0 ? "Miễn phí" : `${n.toLocaleString("vi-VN")}₫ / tháng`;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function loadPlans(): SubscriptionPlan[] {
  migrateSubscriptionStorage();
  return readJson<SubscriptionPlan[]>(SUBSCRIPTION_PLANS_KEY) ?? DEFAULT_PLANS;
}

export function savePlans(plans: SubscriptionPlan[]): void {
  localStorage.setItem(SUBSCRIPTION_PLANS_KEY, JSON.stringify(plans));
}

function loadAllUserSubscriptions(): Record<string, UserSubscription> {
  migrateSubscriptionStorage();
  return readJson<Record<string, UserSubscription>>(USER_SUBSCRIPTIONS_KEY) ?? {};
}

export function loadUserSubscription(userId: string): UserSubscription {
  const saved = loadAllUserSubscriptions()[userId];
  if (saved) return saved;
  return { planId: FREE_PLAN_ID, subscribedAt: new Date().toISOString() };
}

export function saveUserSubscription(userId: string, planId: string): UserSubscription {
  const next: UserSubscription = { planId, subscribedAt: new Date().toISOString() };
  const all = loadAllUserSubscriptions();
  all[userId] = next;
  localStorage.setItem(USER_SUBSCRIPTIONS_KEY, JSON.stringify(all));
  return next;
}

export function getUserPlan(userId: string): SubscriptionPlan {
  const { planId } = loadUserSubscription(userId);
  const plans = loadPlans();
  return plans.find((p) => p.id === planId) ?? DEFAULT_PLANS[0];
}

export function getActivePlans(): SubscriptionPlan[] {
  return loadPlans().filter((p) => p.active);
}
