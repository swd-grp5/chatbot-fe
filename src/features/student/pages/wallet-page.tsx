import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  WalletTransactionList,
  parseSortOption,
  toSortOption,
  type WalletSortOption,
} from "@/features/student/components/wallet-transaction-list";
import type { SortDirection } from "@/shared/components/ui/table-head";
import {
  fetchMyWallet,
  fetchMyWalletTransactions,
  formatWalletAmount,
  topUpWallet,
  toWalletCreatedFrom,
  toWalletCreatedTo,
  WALLET_MIN_TOP_UP_AMOUNT,
  WALLET_TRANSACTION_PAGE_SIZE,
  type FetchWalletTransactionsParams,
  type WalletResponse,
  type WalletTransactionResponse,
  type WalletTransactionSortField,
  type WalletTransactionStatus,
  type WalletTransactionType,
} from "@/features/student/api/wallet-api";
import { ApiError } from "@/shared/lib/api-client";
import { toast } from "@/shared/lib/toast";

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000] as const;

type DateRangeFilter = { from: string; to: string };
type AmountRangeFilter = { min: number; max: number };

export function StudentWalletPage() {
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionResponse[]>([]);
  const [walletLoading, setWalletLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<WalletTransactionType | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<WalletTransactionStatus | "all">("all");
  const [queryInput, setQueryInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [createdRange, setCreatedRange] = useState<DateRangeFilter>({ from: "", to: "" });
  const [amountRange, setAmountRange] = useState<AmountRangeFilter | null>(null);
  const [sortBy, setSortBy] = useState<WalletTransactionSortField | null>("createdAt");
  const [sortDir, setSortDir] = useState<SortDirection | null>("desc");

  const loadSeqRef = useRef(0);

  const buildTxParams = useCallback(
    (pageIndex: number, keywordOverride?: string): FetchWalletTransactionsParams => {
      const keyword = keywordOverride ?? searchKeyword;
      return {
        page: pageIndex,
        size: WALLET_TRANSACTION_PAGE_SIZE,
        ...(transactionTypeFilter !== "all" && { transactionType: transactionTypeFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(keyword && { keyword }),
        ...(amountRange && {
          amountMin: amountRange.min,
          amountMax: amountRange.max,
        }),
        ...(createdRange.from && { createdFrom: toWalletCreatedFrom(createdRange.from) }),
        ...(createdRange.to && { createdTo: toWalletCreatedTo(createdRange.to) }),
        ...(sortBy && sortDir && { sortBy, sortDir }),
      };
    },
    [
      amountRange,
      createdRange.from,
      createdRange.to,
      searchKeyword,
      sortBy,
      sortDir,
      statusFilter,
      transactionTypeFilter,
    ],
  );

  const loadTransactions = useCallback(
    async (pageIndex: number, seq: number, keywordOverride?: string) => {
      const result = await fetchMyWalletTransactions(buildTxParams(pageIndex, keywordOverride));
      if (seq !== loadSeqRef.current) return;
      setTransactions(result.transactions);
      setTotalPages(result.totalPages);
      setPage(pageIndex);
    },
    [buildTxParams],
  );

  const reloadTransactions = useCallback(
    (pageIndex = 0, keywordOverride?: string) => {
      const seq = ++loadSeqRef.current;
      setTxLoading(true);
      void loadTransactions(pageIndex, seq, keywordOverride)
        .catch((err) => {
          if (seq !== loadSeqRef.current) return;
          const message =
            err instanceof ApiError ? err.message : "Không tải được lịch sử giao dịch";
          toast.error(message);
        })
        .finally(() => {
          if (seq === loadSeqRef.current) {
            setTxLoading(false);
          }
        });
    },
    [loadTransactions],
  );

  const loadWallet = useCallback(async (seq: number) => {
    try {
      const walletData = await fetchMyWallet();
      if (seq !== loadSeqRef.current) return;
      setWallet(walletData);
    } catch (err) {
      if (seq !== loadSeqRef.current) return;
      const message = err instanceof ApiError ? err.message : "Không tải được thông tin ví";
      toast.error(message);
    } finally {
      if (seq === loadSeqRef.current) {
        setWalletLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const seq = ++loadSeqRef.current;
    setWalletLoading(true);
    setTxLoading(true);
    void loadWallet(seq);
    void loadTransactions(0, seq).finally(() => {
      if (seq === loadSeqRef.current) {
        setTxLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const handleSearch = () => {
    const keyword = queryInput.trim();
    setSearchKeyword(keyword);
    reloadTransactions(0, keyword);
  };

  const handleSortOptionChange = (option: WalletSortOption) => {
    const next = parseSortOption(option);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    reloadTransactions(0);
  };

  const handleClearFilters = () => {
    setTransactionTypeFilter("all");
    setStatusFilter("all");
    setQueryInput("");
    setSearchKeyword("");
    setCreatedRange({ from: "", to: "" });
    setAmountRange(null);
    setSortBy("createdAt");
    setSortDir("desc");
    reloadTransactions(0, "");
  };

  const hasActiveFilters =
    transactionTypeFilter !== "all" ||
    statusFilter !== "all" ||
    Boolean(searchKeyword) ||
    Boolean(createdRange.from || createdRange.to) ||
    amountRange != null ||
    sortBy !== "createdAt" ||
    sortDir !== "desc";

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
      toast.info("Đang chuyển sang cổng thanh toán VNPAY...");
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

  const handleRefreshAll = () => {
    const seq = ++loadSeqRef.current;
    setWalletLoading(true);
    setTxLoading(true);
    void Promise.all([loadWallet(seq), loadTransactions(page, seq)])
      .then(() => toast.success("Đã cập nhật thông tin ví"))
      .finally(() => {
        if (seq === loadSeqRef.current) {
          setWalletLoading(false);
          setTxLoading(false);
        }
      });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Wallet className="h-6 w-6" />
            Ví của tôi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nạp tiền vào ví để thanh toán gói đăng ký và các dịch vụ khác.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
          <div className="space-y-4 lg:sticky lg:top-24">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
              {walletLoading && !wallet ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Số dư khả dụng
                  </div>
                  <div className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
                    {formatWalletAmount(wallet?.balance ?? 0)}
                  </div>
                  {(wallet?.reservedBalance ?? 0) > 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Đang giữ: {formatWalletAmount(wallet!.reservedBalance)}
                    </p>
                  )}
                </>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold">Nạp tiền</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Thanh toán qua VNPAY. Số tiền tối thiểu{" "}
                {formatWalletAmount(WALLET_MIN_TOP_UP_AMOUNT)}.
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
                  className="w-full"
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
          </div>

          <Card className="overflow-hidden p-0">
            <WalletTransactionList
              transactions={transactions}
              loading={txLoading}
              page={page}
              totalPages={totalPages}
              onPageChange={reloadTransactions}
              onRefresh={handleRefreshAll}
              queryInput={queryInput}
              onQueryInputChange={setQueryInput}
              onSearch={handleSearch}
              transactionTypeFilter={transactionTypeFilter}
              onTransactionTypeFilterChange={(value) => {
                setTransactionTypeFilter(value);
                reloadTransactions(0);
              }}
              statusFilter={statusFilter}
              onStatusFilterChange={(value) => {
                setStatusFilter(value);
                reloadTransactions(0);
              }}
              createdRange={createdRange}
              onCreatedRangeApply={(value) => {
                setCreatedRange(value);
                reloadTransactions(0);
              }}
              amountRange={amountRange}
              onAmountRangeApply={(value) => {
                setAmountRange(value);
                reloadTransactions(0);
              }}
              sortOption={toSortOption(sortBy, sortDir)}
              onSortOptionChange={handleSortOptionChange}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
            />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
