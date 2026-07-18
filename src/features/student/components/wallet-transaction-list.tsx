import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { ConfigProvider, DatePicker, Slider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/vi";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { TablePagination } from "@/shared/components/ui/table-pagination";
import {
  formatWalletAmount,
  WALLET_AMOUNT_FILTER_MAX,
  WALLET_TRANSACTION_STATUS_BADGE_CLASS,
  WALLET_TRANSACTION_STATUS_LABELS,
  WALLET_TRANSACTION_STATUS_OPTIONS,
  WALLET_TRANSACTION_TYPE,
  WALLET_TRANSACTION_TYPE_LABELS,
  WALLET_TRANSACTION_TYPE_OPTIONS,
  walletTransactionSign,
  type WalletTransactionResponse,
  type WalletTransactionSortField,
  type WalletTransactionStatus,
  type WalletTransactionType,
} from "@/features/student/api/wallet-api";
import type { SortDirection } from "@/shared/components/ui/table-head";
import { formatDateTimeDMY } from "@/shared/lib/format-time";
import { cn } from "@/shared/lib/utils";

dayjs.locale("vi");

type DateRangeFilter = { from: string; to: string };
type AmountRangeFilter = { min: number; max: number };

export type WalletSortOption = "createdAt-desc" | "createdAt-asc" | "amount-desc" | "amount-asc";

const SORT_OPTIONS: { value: WalletSortOption; label: string }[] = [
  { value: "createdAt-desc", label: "Mới nhất" },
  { value: "createdAt-asc", label: "Cũ nhất" },
  { value: "amount-desc", label: "Số tiền cao → thấp" },
  { value: "amount-asc", label: "Số tiền thấp → cao" },
];

function parseSortOption(option: WalletSortOption): {
  sortBy: WalletTransactionSortField;
  sortDir: SortDirection;
} {
  const [field, dir] = option.split("-") as [WalletTransactionSortField, SortDirection];
  return { sortBy: field, sortDir: dir };
}

export function toSortOption(
  sortBy: WalletTransactionSortField | null,
  sortDir: SortDirection | null,
): WalletSortOption {
  if (sortBy === "amount" && sortDir === "asc") return "amount-asc";
  if (sortBy === "amount" && sortDir === "desc") return "amount-desc";
  if (sortBy === "createdAt" && sortDir === "asc") return "createdAt-asc";
  return "createdAt-desc";
}

function toDayjsRange(value: DateRangeFilter): [Dayjs | null, Dayjs | null] {
  return [
    value.from ? dayjs(value.from, "YYYY-MM-DD") : null,
    value.to ? dayjs(value.to, "YYYY-MM-DD") : null,
  ];
}

function fromDayjsRange(range: [Dayjs | null, Dayjs | null]): DateRangeFilter {
  return {
    from: range[0]?.format("YYYY-MM-DD") ?? "",
    to: range[1]?.format("YYYY-MM-DD") ?? "",
  };
}

function transactionIcon(type: WalletTransactionType) {
  switch (type) {
    case WALLET_TRANSACTION_TYPE.TOP_UP:
      return { Icon: ArrowDownLeft, className: "bg-success/10 text-success" };
    case WALLET_TRANSACTION_TYPE.REFUND:
      return { Icon: RotateCcw, className: "bg-info/10 text-info" };
    default:
      return { Icon: ArrowUpRight, className: "bg-destructive/10 text-destructive" };
  }
}

function transactionTitle(tx: WalletTransactionResponse) {
  const description = tx.description?.trim();
  if (description) return description;
  return WALLET_TRANSACTION_TYPE_LABELS[tx.transactionType];
}

function WalletTransactionItem({ tx }: { tx: WalletTransactionResponse }) {
  const { Icon, className: iconClass } = transactionIcon(tx.transactionType);
  const isCredit = walletTransactionSign(tx.transactionType) === "+";

  return (
    <li className="flex items-center gap-3 border-b border-border px-1 py-3.5 last:border-0 sm:gap-4 sm:px-2">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          iconClass,
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{transactionTitle(tx)}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatDateTimeDMY(tx.createdAt)}
          {tx.referenceId ? ` · ${tx.referenceId}` : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="font-normal text-[10px]">
            {WALLET_TRANSACTION_TYPE_LABELS[tx.transactionType]}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "font-normal text-[10px]",
              WALLET_TRANSACTION_STATUS_BADGE_CLASS[tx.status],
            )}
          >
            {WALLET_TRANSACTION_STATUS_LABELS[tx.status]}
          </Badge>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-base font-semibold tabular-nums tracking-tight",
            isCredit ? "text-success" : "text-foreground",
          )}
        >
          {walletTransactionSign(tx.transactionType)}
          {formatWalletAmount(tx.amount)}
        </p>
      </div>
    </li>
  );
}

type WalletTransactionListProps = {
  transactions: WalletTransactionResponse[];
  loading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  queryInput: string;
  onQueryInputChange: (value: string) => void;
  onSearch: () => void;
  transactionTypeFilter: WalletTransactionType | "all";
  onTransactionTypeFilterChange: (value: WalletTransactionType | "all") => void;
  statusFilter: WalletTransactionStatus | "all";
  onStatusFilterChange: (value: WalletTransactionStatus | "all") => void;
  createdRange: DateRangeFilter;
  onCreatedRangeApply: (value: DateRangeFilter) => void;
  amountRange: AmountRangeFilter | null;
  onAmountRangeApply: (value: AmountRangeFilter | null) => void;
  sortOption: WalletSortOption;
  onSortOptionChange: (value: WalletSortOption) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

export function WalletTransactionList({
  transactions,
  loading = false,
  page,
  totalPages,
  onPageChange,
  onRefresh,
  queryInput,
  onQueryInputChange,
  onSearch,
  transactionTypeFilter,
  onTransactionTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  createdRange,
  onCreatedRangeApply,
  amountRange,
  onAmountRangeApply,
  sortOption,
  onSortOptionChange,
  hasActiveFilters,
  onClearFilters,
}: WalletTransactionListProps) {
  const [dateDraft, setDateDraft] = useState<[Dayjs | null, Dayjs | null]>(() =>
    toDayjsRange(createdRange),
  );
  const [amountDraft, setAmountDraft] = useState<[number, number]>(
    amountRange ? [amountRange.min, amountRange.max] : [0, WALLET_AMOUNT_FILTER_MAX],
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setDateDraft(toDayjsRange(createdRange));
  }, [createdRange]);

  useEffect(() => {
    setAmountDraft(
      amountRange ? [amountRange.min, amountRange.max] : [0, WALLET_AMOUNT_FILTER_MAX],
    );
  }, [amountRange]);

  const advancedFiltersActive =
    Boolean(createdRange.from || createdRange.to) || amountRange != null;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Lịch sử giao dịch</h2>
            <p className="text-xs text-muted-foreground">Theo dõi nạp tiền và thanh toán</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Tải lại
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <div className="relative min-w-0 flex-1 sm:min-w-[220px] sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={queryInput}
              onChange={(e) => onQueryInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch();
              }}
              placeholder="Tìm theo mã GD hoặc mô tả"
              className="h-9 pl-8 text-xs"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 shrink-0 px-3 text-xs"
            onClick={onSearch}
          >
            Tìm
          </Button>

          <Select
            value={transactionTypeFilter}
            onValueChange={(value) =>
              onTransactionTypeFilterChange(value as WalletTransactionType | "all")
            }
          >
            <SelectTrigger className="h-9 w-full text-xs sm:w-[140px]">
              <SelectValue placeholder="Loại GD" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {WALLET_TRANSACTION_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) =>
              onStatusFilterChange(value as WalletTransactionStatus | "all")
            }
          >
            <SelectTrigger className="h-9 w-full text-xs sm:w-[140px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả TT</SelectItem>
              {WALLET_TRANSACTION_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortOption}
            onValueChange={(value) => onSortOptionChange(value as WalletSortOption)}
          >
            <SelectTrigger className="h-9 w-full text-xs sm:w-[160px]">
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 gap-1.5 text-xs",
                  advancedFiltersActive && "border-primary/30 bg-primary/5",
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Lọc thêm
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 space-y-4 p-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Khoảng thời gian</p>
                <ConfigProvider locale={viVN}>
                  <DatePicker.RangePicker
                    className="w-full"
                    format="DD/MM/YYYY"
                    value={dateDraft}
                    onChange={(next) => setDateDraft(next ?? [null, null])}
                    placeholder={["Từ ngày", "Đến ngày"]}
                    getPopupContainer={(node) => node.parentElement ?? document.body}
                  />
                </ConfigProvider>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Khoảng số tiền</p>
                <ConfigProvider locale={viVN}>
                  <Slider
                    range
                    min={0}
                    max={WALLET_AMOUNT_FILTER_MAX}
                    step={10_000}
                    value={amountDraft}
                    tooltip={{ formatter: (next) => formatWalletAmount(next ?? 0) }}
                    onChange={(next) => setAmountDraft([next[0], next[1]])}
                  />
                </ConfigProvider>
                <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>{formatWalletAmount(amountDraft[0])}</span>
                  <span>{formatWalletAmount(amountDraft[1])}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const clearedDates: [Dayjs | null, Dayjs | null] = [null, null];
                    setDateDraft(clearedDates);
                    setAmountDraft([0, WALLET_AMOUNT_FILTER_MAX]);
                    onCreatedRangeApply(fromDayjsRange(clearedDates));
                    onAmountRangeApply(null);
                    setFiltersOpen(false);
                  }}
                >
                  Xóa
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    onCreatedRangeApply(fromDayjsRange(dateDraft));
                    const isFullRange =
                      amountDraft[0] === 0 && amountDraft[1] === WALLET_AMOUNT_FILTER_MAX;
                    onAmountRangeApply(
                      isFullRange ? null : { min: amountDraft[0], max: amountDraft[1] },
                    );
                    setFiltersOpen(false);
                  }}
                >
                  Áp dụng
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-1 text-xs text-muted-foreground"
              onClick={onClearFilters}
            >
              <X className="h-3.5 w-3.5" />
              Xóa lọc
            </Button>
          )}
        </div>
      </div>

      <div className="relative min-h-[320px] flex-1 px-3 py-2 sm:px-4">
        {loading && transactions.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-4 text-center">
            <p className="text-sm font-medium text-foreground">
              {hasActiveFilters ? "Không có giao dịch phù hợp bộ lọc" : "Chưa có giao dịch nào"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasActiveFilters
                ? "Thử đổi bộ lọc hoặc xóa lọc để xem thêm."
                : "Các giao dịch nạp tiền và thanh toán sẽ hiện tại đây."}
            </p>
          </div>
        ) : (
          <ul className={cn(loading && "pointer-events-none opacity-60")}>
            {transactions.map((tx) => (
              <WalletTransactionItem key={tx.id} tx={tx} />
            ))}
          </ul>
        )}

        {loading && transactions.length > 0 && (
          <div className="absolute inset-x-0 top-0 flex justify-center pt-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="border-t border-border px-4 py-3">
          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            disabled={loading}
          />
        </div>
      )}
    </div>
  );
}

export { parseSortOption, SORT_OPTIONS };
