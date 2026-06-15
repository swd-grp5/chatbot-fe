import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { verifyVnpayReturn, type PaymentReturnResponse } from "@/features/student/api/payment-api";
import { formatWalletAmount } from "@/features/student/api/wallet-api";
import { ApiError } from "@/shared/lib/api-client";
import { toast } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";

function hasTxnRef(search: string) {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).has("vnp_TxnRef");
}

export function WalletCheckoutPage() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PaymentReturnResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    const search = window.location.search;

    if (!hasTxnRef(search)) {
      const message = "Không có thông tin giao dịch từ VNPAY.";
      setError(message);
      setLoading(false);
      toast.error(message);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    void verifyVnpayReturn(search)
      .then((data) => {
        setResult(data);
        if (data.success) {
          toast.success(data.message ?? "Thanh toán thành công");
        } else {
          toast.error(data.message ?? "Thanh toán không thành công");
        }
      })
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : "Không xác minh được giao dịch";
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const success = result?.success === true;
  const showResult = !loading && (error != null || result != null);

  return (
    <AppShell>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kết quả thanh toán</h1>
        </div>

        <Card className="relative overflow-hidden p-8">
          {loading && (
            <div className="flex min-h-55 flex-col items-center justify-center gap-4 py-6">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Đang xác minh giao dịch</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vui lòng đợi trong giây lát...
                </p>
              </div>
            </div>
          )}

          {showResult && error && (
            <div className="flex min-h-55 flex-col items-center justify-center gap-4 text-center">
              <XCircle className="h-12 w-12 text-destructive" />
              <div>
                <p className="font-medium">Không xác minh được giao dịch</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {showResult && result && (
            <div className="flex min-h-55 flex-col items-center justify-center gap-4 text-center">
              {success ? (
                <CheckCircle2 className="h-12 w-12 text-success" />
              ) : (
                <XCircle className="h-12 w-12 text-destructive" />
              )}
              <div>
                <p
                  className={cn(
                    "text-lg font-semibold",
                    success ? "text-success" : "text-destructive",
                  )}
                >
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
          )}

          {!loading && (
            <div className="mt-8 flex justify-center">
              <Button asChild>
                <Link to="/wallet">Về ví của tôi</Link>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
