import { useCallback, useEffect, useMemo, useState } from "react";
import { Columns2, Loader2, RefreshCw, Wallet } from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { TablePagination } from "@/shared/components/ui/table-pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { loadColumnVisibility } from "@/features/lecturer/components/documents-table-ui";
import {
  fetchMyWallet,
  fetchMyWalletTransactions,
  formatWalletAmount,
  topUpWallet,
  WALLET_MIN_TOP_UP_AMOUNT,
  WALLET_TRANSACTION_OPTIONAL_COLUMNS,
  WALLET_TRANSACTION_PAGE_SIZE,
  WALLET_TRANSACTION_STATUS_BADGE_CLASS,
  WALLET_TRANSACTION_STATUS_LABELS,
  WALLET_TRANSACTION_TYPE_LABELS,
  walletTransactionSign,
  type WalletResponse,
  type WalletTransactionColumnKey,
  type WalletTransactionResponse,
} from "@/features/student/api/wallet-api";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateTimeDMY } from "@/shared/lib/format-time";
import { toast } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000] as const;
const WALLET_COLUMNS_STORAGE = "student-wallet-transaction-columns";

export function StudentWalletPage() {
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [page, setPage] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState(() =>
    loadColumnVisibility(
      WALLET_COLUMNS_STORAGE,
      WALLET_TRANSACTION_OPTIONAL_COLUMNS.map((column) => column.key),
    ),
  );

  const isColumnVisible = useCallback(
    (key: WalletTransactionColumnKey) => Boolean(columnVisibility[key]),
    [columnVisibility],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [walletData, txData] = await Promise.all([
        fetchMyWallet(),
        fetchMyWalletTransactions(),
      ]);
      setWallet(walletData);
      setTransactions(
        [...txData].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
      setPage(0);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Không tải được thông tin ví";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    localStorage.setItem(WALLET_COLUMNS_STORAGE, JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const totalPages = Math.ceil(transactions.length / WALLET_TRANSACTION_PAGE_SIZE);
  const pagedTransactions = useMemo(() => {
    const start = page * WALLET_TRANSACTION_PAGE_SIZE;
    return transactions.slice(start, start + WALLET_TRANSACTION_PAGE_SIZE);
  }, [transactions, page]);

  const parsedAmount = Number(amountInput.replace(/\D/g, ""));
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount >= WALLET_MIN_TOP_UP_AMOUNT;

  const handleTopUp = async () => {
    if (!isValidAmount) {
      toast.error(`Số tiền tối thiểu là ${formatWalletAmount(WALLET_MIN_TOP_UP_AMOUNT)}`);
      return;
    }

    setSubmitting(true);
    try {
      const { paymentUrl } = await topUpWallet(parsedAmount);
      window.location.href = paymentUrl;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Không tạo được giao dịch nạp tiền";
      toast.error(message);
      setSubmitting(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    setAmountInput(digits ? Number(digits).toLocaleString("vi-VN") : "");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Wallet className="h-6 w-6" />
            Ví của tôi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nạp tiền vào ví để thanh toán gói đăng ký và các dịch vụ khác.
          </p>
        </div>

        {loading && !wallet ? (
          <Card className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </Card>
        ) : (
          <>
            <Card className="border-primary/20 bg-primary/5 p-6">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Số dư khả dụng
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums">
                {formatWalletAmount(wallet?.balance ?? 0)}
              </div>
              {(wallet?.reservedBalance ?? 0) > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Đang giữ: {formatWalletAmount(wallet!.reservedBalance)}
                </p>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold">Nạp tiền</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Thanh toán qua VNPAY. Số tiền tối thiểu {formatWalletAmount(WALLET_MIN_TOP_UP_AMOUNT)}.
              </p>

              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="top-up-amount">Số tiền nạp (VND)</Label>
                  <Input
                    id="top-up-amount"
                    inputMode="numeric"
                    placeholder="VD: 100.000"
                    value={amountInput}
                    onChange={(e) => handleAmountChange(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmountInput(amount.toLocaleString("vi-VN"))}
                    >
                      {formatWalletAmount(amount)}
                    </Button>
                  ))}
                </div>

                <Button
                  className="w-full sm:w-auto"
                  disabled={!isValidAmount || submitting}
                  onClick={() => void handleTopUp()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang chuyển sang VNPAY...
                    </>
                  ) : (
                    "Nạp tiền qua VNPAY"
                  )}
                </Button>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold">Lịch sử giao dịch</h2>
                <div className="ml-auto flex items-center gap-2">
                  <TooltipProvider delayDuration={200}>
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                              <Columns2 className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top">Hiển thị cột</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {WALLET_TRANSACTION_OPTIONAL_COLUMNS.map(({ key, label }) => (
                          <DropdownMenuCheckboxItem
                            key={key}
                            checked={isColumnVisible(key)}
                            onCheckedChange={(checked) => {
                              setColumnVisibility((prev) => ({
                                ...prev,
                                [key]: checked === true,
                              }));
                            }}
                          >
                            {label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => void loadData()}
                          disabled={loading}
                        >
                          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Tải lại danh sách</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Chưa có giao dịch nào.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                      <TableHead className="w-12 text-center">STT</TableHead>
                      <TableHead>Thời gian</TableHead>
                      {isColumnVisible("transactionType") && <TableHead>Loại</TableHead>}
                      {isColumnVisible("description") && <TableHead>Mô tả</TableHead>}
                      <TableHead className="text-right">Số tiền</TableHead>
                      {isColumnVisible("status") && <TableHead>Trạng thái</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedTransactions.map((tx, index) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                          {page * WALLET_TRANSACTION_PAGE_SIZE + index + 1}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTimeDMY(tx.createdAt)}
                        </TableCell>
                        {isColumnVisible("transactionType") && (
                          <TableCell className="text-sm">
                            {WALLET_TRANSACTION_TYPE_LABELS[tx.transactionType]}
                          </TableCell>
                        )}
                        {isColumnVisible("description") && (
                          <TableCell className="max-w-50 truncate text-sm text-muted-foreground">
                            {tx.description || tx.referenceId}
                          </TableCell>
                        )}
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {walletTransactionSign(tx.transactionType)}
                          {formatWalletAmount(tx.amount)}
                        </TableCell>
                        {isColumnVisible("status") && (
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={WALLET_TRANSACTION_STATUS_BADGE_CLASS[tx.status]}
                            >
                              {WALLET_TRANSACTION_STATUS_LABELS[tx.status]}
                            </Badge>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <TablePagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                disabled={loading}
              />
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
