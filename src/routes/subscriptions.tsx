import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import {
  formatPlanPrice,
  getActivePlans,
  getUserPlan,
  loadUserSubscription,
  saveUserSubscription,
  type SubscriptionPlan,
} from "@/lib/subscriptions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subscriptions")({ component: StudentSubscriptionsPage });

function StudentSubscriptionsPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string>("");

  useEffect(() => {
    setPlans(getActivePlans());
    if (user) setCurrentPlanId(loadUserSubscription(user.id).planId);
  }, [user]);

  const currentPlan = user ? getUserPlan(user.id) : null;

  const subscribe = (plan: SubscriptionPlan) => {
    if (!user) return;
    if (plan.id === currentPlanId) return;

    saveUserSubscription(user.id, plan.id);
    setCurrentPlanId(plan.id);

    if (plan.pricePerMonth === 0) {
      toast.success(`Đã chuyển sang gói ${plan.name}`);
    } else {
      toast.success(`Đã đăng ký gói ${plan.name}. Thanh toán demo — không thu phí thật.`);
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
            Chọn gói phù hợp để tăng giới hạn câu hỏi mỗi tháng.
          </p>
        </div>

        {currentPlan && (
          <Card className="border-primary/20 bg-primary/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Gói hiện tại
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-lg font-semibold">{currentPlan.name}</span>
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                    Đang dùng
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentPlan.questionsPerMonth.toLocaleString("vi-VN")} câu hỏi / tháng ·{" "}
                  {formatPlanPrice(currentPlan.pricePerMonth)}
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-primary/60" />
            </div>
          </Card>
        )}

        {plans.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Hiện chưa có gói nào được mở bán. Vui lòng quay lại sau.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "flex flex-col p-6",
                    isCurrent && "ring-2 ring-primary/40",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-semibold">{plan.name}</div>
                      <div className="mt-1 text-2xl font-bold tabular-nums">
                        {formatPlanPrice(plan.pricePerMonth)}
                      </div>
                    </div>
                    {isCurrent && (
                      <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                        Gói hiện tại
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-muted-foreground">
                    {plan.questionsPerMonth.toLocaleString("vi-VN")} câu hỏi / tháng
                  </div>

                  <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 text-success" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-5 w-full"
                    variant={isCurrent ? "secondary" : "default"}
                    disabled={isCurrent}
                    onClick={() => subscribe(plan)}
                  >
                    {isCurrent
                      ? "Đang sử dụng"
                      : plan.pricePerMonth === 0
                        ? "Chuyển sang gói này"
                        : "Đăng ký ngay"}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
