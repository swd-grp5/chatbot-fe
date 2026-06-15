import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { verifyVnpayReturn, type PaymentReturnResponse } from "@/features/student/api/payment-api";
import { formatWalletAmount } from "@/features/student/api/wallet-api";
import { ApiError } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

function parseVnpaySearchParams(search: string): Record<string, string> {
  const params: Record<string, string> = {};
  new URLSearchParams(search).forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function WalletCheckoutPage() {
  const search = useRouterState({ select: (state) => state.location.search });
  const vnpParams = useMemo(() => parseVnpaySearchParams(search), [search]);

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PaymentReturnResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vnpParams.vnp_TxnRef) {
      setError("Không có thông tin giao dịch từ VNPAY.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void verifyVnpayReturn(vnpParams)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Không xác minh được giao dịch");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [vnpParams]);

  const success = result?.success === true;

  return (
    <AppShell>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kết quả thanh toán</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            VNPAY đã chuyển hướng bạn về EduBuddy sau khi thanh toán.
          </p>
        </div>

        <Card className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Đang xác minh giao dịch...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <XCircle className="h-12 w-12 text-destructive" />
              <div>
                <p className="font-medium">Không xác minh được giao dịch</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : result ? (
            <div className="flex flex-col items-center gap-4 text-center">
              {success ? (
                <CheckCircle2 className="h-12 w-12 text-success" />
              ) : (
                <XCircle className="h-12 w-12 text-destructive" />
              )}
              <div>
                <p className={cn("text-lg font-semibold", success ? "text-success" : "text-destructive")}>
                  {result.message ?? (success ? "Giao dịch thành công" : "Giao dịch không thành công")}
                </p>
                {result.amount != null && (
                  <p className="mt-2 text-2xl font-bold tabular-nums">
                    {formatWalletAmount(result.amount)}
                  </p>
                )}
                {result.txnRef && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Mã giao dịch: <span className="font-mono">{result.txnRef}</span>
                  </p>
                )}
                {!result.validSignature && (
                  <p className="mt-2 text-sm text-destructive">Chữ ký không hợp lệ</p>
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex justify-center">
            <Button asChild>
              <Link to="/wallet">Về ví của tôi</Link>
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
