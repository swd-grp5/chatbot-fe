import { useCallback, useEffect, useRef, useState } from "react";

import { Loader2, Search, Wallet } from "lucide-react";

import { AppShell } from "@/shared/components/layout/app-shell";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

import {
  AmountRangeFilterTableHead,
  DateRangeFilterTableHead,
  FilterTableHead,
  loadColumnVisibility,
  ResizableTableHead,
  SortableTableHead,
  TABLE_HEAD_LABEL,
  type SortDirection,
} from "@/shared/components/ui/table-head";

import {
  useWalletTableResize,
  WALLET_WIDTHS_STORAGE,
} from "@/features/student/components/wallet-table-ui";

import {

  fetchMyWallet,

  fetchMyWalletTransactions,

  formatWalletAmount,

  topUpWallet,

  toWalletCreatedFrom,

  toWalletCreatedTo,

  WALLET_AMOUNT_FILTER_MAX,

  WALLET_MIN_TOP_UP_AMOUNT,

  WALLET_TRANSACTION_OPTIONAL_COLUMNS,

  WALLET_TRANSACTION_PAGE_SIZE,

  WALLET_TRANSACTION_STATUS_BADGE_CLASS,

  WALLET_TRANSACTION_STATUS_LABELS,

  WALLET_TRANSACTION_STATUS_OPTIONS,

  WALLET_TRANSACTION_TYPE_LABELS,

  WALLET_TRANSACTION_TYPE_OPTIONS,

  walletTransactionSign,

  type FetchWalletTransactionsParams,

  type WalletResponse,

  type WalletTransactionColumnKey,

  type WalletTransactionResponse,

  type WalletTransactionSortField,

  type WalletTransactionStatus,

  type WalletTransactionType,

} from "@/features/student/api/wallet-api";

import { ApiError } from "@/shared/lib/api-client";

import { formatDateTimeDMY } from "@/shared/lib/format-time";

import { toast } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";



const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000] as const;

const WALLET_COLUMNS_STORAGE = "student-wallet-transaction-columns";



const TYPE_FILTER_OPTIONS = WALLET_TRANSACTION_TYPE_OPTIONS.map(({ value, label }) => ({

  value,

  label,

}));



const STATUS_FILTER_OPTIONS = WALLET_TRANSACTION_STATUS_OPTIONS.map(({ value, label }) => ({

  value,

  label,

}));



type DateRangeFilter = { from: string; to: string };

type AmountRangeFilter = { min: number; max: number };



export function StudentWalletPage() {

  const [wallet, setWallet] = useState<WalletResponse | null>(null);

  const [transactions, setTransactions] = useState<WalletTransactionResponse[]>([]);

  const [loading, setLoading] = useState(true);

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

  const { resize, cell, tableMinWidth } = useWalletTableResize(WALLET_WIDTHS_STORAGE);



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



  const loadData = useCallback(

    async (options?: { notify?: boolean; pageIndex?: number }) => {

      const seq = ++loadSeqRef.current;

      const pageIndex = options?.pageIndex ?? 0;

      setLoading(true);

      try {

        const [walletData] = await Promise.all([

          fetchMyWallet(),

          loadTransactions(pageIndex, seq),

        ]);

        if (seq !== loadSeqRef.current) return;

        setWallet(walletData);

        if (options?.notify) {

          toast.success("Đã cập nhật thông tin ví");

        }

      } catch (err) {

        if (seq !== loadSeqRef.current) return;

        const message = err instanceof ApiError ? err.message : "Không tải được thông tin ví";

        toast.error(message);

      } finally {

        if (seq === loadSeqRef.current) {

          setLoading(false);

        }

      }

    },

    [loadTransactions],

  );



  const reloadTransactions = useCallback(

    (pageIndex = 0, keywordOverride?: string) => {

      const seq = ++loadSeqRef.current;

      setLoading(true);

      void loadTransactions(pageIndex, seq, keywordOverride)

        .catch((err) => {

          if (seq !== loadSeqRef.current) return;

          const message =

            err instanceof ApiError ? err.message : "Không tải được lịch sử giao dịch";

          toast.error(message);

        })

        .finally(() => {

          if (seq === loadSeqRef.current) {

            setLoading(false);

          }

        });

    },

    [loadTransactions],

  );



  useEffect(() => {

    void loadData();

  }, [loadData]);



  useEffect(() => {

    localStorage.setItem(WALLET_COLUMNS_STORAGE, JSON.stringify(columnVisibility));

  }, [columnVisibility]);



  const handleSort = (field: WalletTransactionSortField) => {

    if (sortBy !== field) {

      setSortBy(field);

      setSortDir("asc");

    } else if (sortDir === "asc") {

      setSortDir("desc");

    } else {

      setSortBy(null);

      setSortDir(null);

    }

    reloadTransactions(0);

  };



  const handlePageChange = (pageIndex: number) => {

    reloadTransactions(pageIndex);

  };

  const handleSearch = () => {
    const keyword = queryInput.trim();
    setSearchKeyword(keyword);
    reloadTransactions(0, keyword);
  };

  const hasActiveFilters =

    transactionTypeFilter !== "all" ||

    statusFilter !== "all" ||

    Boolean(searchKeyword) ||

    Boolean(createdRange.from || createdRange.to) ||

    amountRange != null;

  const tableColSpan =
    2 +
    Number(isColumnVisible("transactionType")) +
    Number(isColumnVisible("referenceId")) +
    Number(isColumnVisible("description")) +
    Number(isColumnVisible("status")) +
    1;

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
              <DataTable
                title="Lịch sử giao dịch"
                loading={loading}
                onRefresh={() => void loadData({ notify: true, pageIndex: page })}
                toolbarExtra={
                  <>
                    <div className="relative w-80 sm:w-96">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSearch();
                        }}
                        placeholder="Tìm theo mã GD hoặc mô tả"
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 shrink-0 px-3 text-xs"
                      onClick={handleSearch}
                    >
                      Tìm
                    </Button>
                  </>
                }
                optionalColumns={WALLET_TRANSACTION_OPTIONAL_COLUMNS}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={(key, visible) => {
                  setColumnVisibility((prev) => ({ ...prev, [key]: visible }));
                }}
                tableClassName="table-fixed w-full [&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-3"
                tableStyle={{ minWidth: tableMinWidth }}
                colSpan={tableColSpan}
                isEmpty={transactions.length === 0}
                emptyMessage="Chưa có giao dịch nào."
                filteredEmptyMessage="Không có giao dịch phù hợp bộ lọc."
                hasActiveFilters={hasActiveFilters}
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                header={
                  <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                    <ResizableTableHead
                      className={cn(TABLE_HEAD_LABEL, "text-center")}
                      {...resize("stt")}
                    >
                      STT
                    </ResizableTableHead>
                    <DateRangeFilterTableHead
                      label="Thời gian"
                      className="text-center"
                      field="createdAt"
                      activeField={sortBy}
                      direction={sortDir}
                      onSort={handleSort}
                      value={createdRange}
                      onApply={(value) => {
                        setCreatedRange(value);
                        reloadTransactions(0);
                      }}
                      {...resize("createdAt")}
                    />
                    {isColumnVisible("transactionType") && (
                      <FilterTableHead
                        label="Loại"
                        className="text-center"
                        filterValue={transactionTypeFilter}
                        onFilterChange={(value) => {
                          setTransactionTypeFilter(value as WalletTransactionType | "all");
                          reloadTransactions(0);
                        }}
                        filterOptions={TYPE_FILTER_OPTIONS}
                        field="transactionType"
                        activeField={sortBy}
                        direction={sortDir}
                        onSort={handleSort}
                        {...resize("transactionType")}
                      />
                    )}
                    {isColumnVisible("referenceId") && (
                      <SortableTableHead
                        label="Mã GD"
                        field="referenceId"
                        activeField={sortBy}
                        direction={sortDir}
                        onSort={handleSort}
                        className="text-center"
                        {...resize("referenceId")}
                      />
                    )}
                    {isColumnVisible("description") && (
                      <SortableTableHead
                        label="Mô tả"
                        field="description"
                        activeField={sortBy}
                        direction={sortDir}
                        onSort={handleSort}
                        className="text-center"
                        {...resize("description")}
                      />
                    )}
                    {isColumnVisible("status") && (
                      <FilterTableHead
                        label="Trạng thái"
                        className="text-center"
                        filterValue={statusFilter}
                        onFilterChange={(value) => {
                          setStatusFilter(value as WalletTransactionStatus | "all");
                          reloadTransactions(0);
                        }}
                        filterOptions={STATUS_FILTER_OPTIONS}
                        field="status"
                        activeField={sortBy}
                        direction={sortDir}
                        onSort={handleSort}
                        {...resize("status")}
                      />
                    )}
                    <AmountRangeFilterTableHead
                      label="Số tiền"
                      field="amount"
                      activeField={sortBy}
                      direction={sortDir}
                      onSort={handleSort}
                      value={amountRange}
                      max={WALLET_AMOUNT_FILTER_MAX}
                      formatValue={formatWalletAmount}
                      className="text-right"
                      onApply={(value) => {
                        setAmountRange(value);
                        reloadTransactions(0);
                      }}
                      {...resize("amount")}
                    />
                  </TableRow>
                }
              >
                {transactions.map((tx, index) => (
                  <TableRow key={tx.id}>
                    <TableCell
                      className="text-center text-sm text-muted-foreground tabular-nums"
                      style={cell("stt")}
                    >
                      {page * WALLET_TRANSACTION_PAGE_SIZE + index + 1}
                    </TableCell>
                    <TableCell
                      className="whitespace-nowrap text-center text-sm"
                      style={cell("createdAt")}
                    >
                      {formatDateTimeDMY(tx.createdAt)}
                    </TableCell>
                    {isColumnVisible("transactionType") && (
                      <TableCell className="text-center text-sm" style={cell("transactionType")}>
                        {WALLET_TRANSACTION_TYPE_LABELS[tx.transactionType]}
                      </TableCell>
                    )}
                    {isColumnVisible("referenceId") && (
                      <TableCell
                        className="whitespace-nowrap text-center text-sm text-muted-foreground tabular-nums"
                        style={cell("referenceId")}
                      >
                        {tx.referenceId ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block cursor-default truncate">{tx.referenceId}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm">
                              {tx.referenceId}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )}
                    {isColumnVisible("description") && (
                      <TableCell
                        className="text-center text-sm text-muted-foreground"
                        style={cell("description")}
                      >
                        {tx.description?.trim() ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block cursor-default truncate">
                                {tx.description.trim()}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap">
                              {tx.description.trim()}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )}
                    {isColumnVisible("status") && (
                      <TableCell className="text-center" style={cell("status")}>
                        <Badge
                          variant="outline"
                          className={WALLET_TRANSACTION_STATUS_BADGE_CLASS[tx.status]}
                        >
                          {WALLET_TRANSACTION_STATUS_LABELS[tx.status]}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell
                      className="text-right text-sm font-medium tabular-nums"
                      style={cell("amount")}
                    >
                      {walletTransactionSign(tx.transactionType)}
                      {formatWalletAmount(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </Card>

          </>

        )}

      </div>

    </AppShell>

  );

}


