import { useCallback, useEffect, useState } from "react";
import { Check, CreditCard, Loader2, Sparkles, Wallet } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { useAuth } from "@/features/auth/lib/auth-context";
import {
  fetchActivePlans,
  fetchCurrentSubscription,
  formatCreditQuota,
  formatPlanPrice,
  planDescriptionLines,
  subscribeToPlan,
  type CurrentUserSubscription,
  type SubscriptionPlan,
} from "@/features/student/api/subscription-api";
import { ApiError } from "@/shared/lib/api-client";
import { toast } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";

export function StudentSubscriptionsPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [current, setCurrent] = useState<CurrentUserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [planList, currentSub] = await Promise.all([
        fetchActivePlans(),
        fetchCurrentSubscription(),
      ]);
      setPlans(planList);
      setCurrent(currentSub);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Không tải được gói đăng ký";
      setLoadError(message);
      setPlans([]);
      setCurrent(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== "student") return;
    void load();
  }, [user, load]);

  const currentPlanId = current?.plan?.id ?? "";

  const subscribe = async (plan: SubscriptionPlan) => {
    if (!user || plan.id === currentPlanId || subscribingId) return;
    setSubscribingId(plan.id);
    try {
      await subscribeToPlan(plan.id);
      await load();
      toast.success(
        Number(plan.price) === 0
          ? `Đã chuyển sang gói ${plan.name}`
          : `Đã đăng ký gói ${plan.name}. Phí đã trừ từ ví.`,
      );
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Đăng ký gói thất bại");
    } finally {
      setSubscribingId(null);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <CreditCard className="h-6 w-6" />
            Gói đăng ký
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn gói phù hợp. Gói trả phí sẽ trừ tiền từ ví của bạn.
          </p>
        </div>

        {loading ? (
          <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải gói đăng ký…
          </Card>
        ) : loadError ? (
          <Card className="space-y-3 p-8 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Thử lại
            </Button>
          </Card>
        ) : (
          <>
            {current?.plan && (
              <Card className="border-primary/20 bg-primary/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Gói hiện tại
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-lg font-semibold">{current.plan.name}</span>
                      <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary/10 text-primary"
                      >
                        Đang dùng
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Còn{" "}
                      <strong className="text-foreground">
                        {current.remainingCredits.toLocaleString("vi-VN")}
                      </strong>{" "}
                      credit ·{" "}
                      {formatCreditQuota(current.plan.creditAmount, current.plan.resetPeriod)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <Link to="/wallet">
                        <Wallet className="h-3.5 w-3.5" />
                        Nạp ví
                      </Link>
                    </Button>
                    <Sparkles className="h-8 w-8 text-primary/60" />
                  </div>
                </div>
              </Card>
            )}

            {plans.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Hiện chưa có gói nào được mở bán. Vui lòng quay lại sau.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => {
                  const isCurrent = plan.id === currentPlanId;
                  const features = planDescriptionLines(plan.description);
                  const busy = subscribingId === plan.id;
                  return (
                    <Card
                      key={plan.id}
                      className={cn("flex flex-col p-6", isCurrent && "ring-2 ring-primary/40")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-lg font-semibold">{plan.name}</div>
                          <div className="mt-1 text-2xl font-bold tabular-nums">
                            {formatPlanPrice(Number(plan.price))}
                          </div>
                        </div>
                        {isCurrent && (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-primary/30 bg-primary/10 text-primary"
                          >
                            Gói hiện tại
                          </Badge>
                        )}
                      </div>

                      <div className="mt-4 text-xs text-muted-foreground">
                        {formatCreditQuota(plan.creditAmount, plan.resetPeriod)}
                      </div>

                      {features.length > 0 ? (
                        <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                          {features.map((f) => (
                            <li key={f} className="flex items-start gap-2">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-4 flex-1 text-sm text-muted-foreground">
                          {plan.durationValue} {plan.durationUnit === "DAY" ? "ngày" : "tháng"} / kỳ
                        </div>
                      )}

                      <Button
                        className="mt-5 w-full"
                        variant={isCurrent ? "secondary" : "default"}
                        disabled={isCurrent || !!subscribingId}
                        onClick={() => void subscribe(plan)}
                      >
                        {busy ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang xử lý…
                          </>
                        ) : isCurrent ? (
                          "Đang sử dụng"
                        ) : Number(plan.price) === 0 ? (
                          "Chuyển sang gói này"
                        ) : (
                          "Đăng ký ngay"
                        )}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
