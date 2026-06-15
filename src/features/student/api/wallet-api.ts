import { apiFetch } from "@/shared/lib/api-client";
import type { PageResponse } from "@/features/lecturer/api/document-api";

/** Khớp `swdchatbox.system.wallet.enums.WalletTransactionType` */
export const WALLET_TRANSACTION_TYPE = {
  TOP_UP: "TOP_UP",
  SUBSCRIPTION_PAYMENT: "SUBSCRIPTION_PAYMENT",
  REFUND: "REFUND",
} as const;

export type WalletTransactionType =
  (typeof WALLET_TRANSACTION_TYPE)[keyof typeof WALLET_TRANSACTION_TYPE];

/** Khớp `swdchatbox.system.wallet.enums.WalletTransactionStatus` */
export const WALLET_TRANSACTION_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

export type WalletTransactionStatus =
  (typeof WALLET_TRANSACTION_STATUS)[keyof typeof WALLET_TRANSACTION_STATUS];

/** Khớp `@DecimalMin("1000")` trong `WalletTopUpRequest` */
export const WALLET_MIN_TOP_UP_AMOUNT = 1000;

export const WALLET_TRANSACTION_PAGE_SIZE = 10;

export type WalletTransactionColumnKey =
  | "transactionType"
  | "referenceId"
  | "description"
  | "status";

export const WALLET_TRANSACTION_OPTIONAL_COLUMNS: {
  key: WalletTransactionColumnKey;
  label: string;
}[] = [
    { key: "transactionType", label: "Loại" },
    { key: "referenceId", label: "Mã GD" },
    { key: "description", label: "Mô tả" },
    { key: "status", label: "Trạng thái" },
  ];

export const WALLET_TRANSACTION_TYPE_OPTIONS: { value: WalletTransactionType; label: string }[] = [
  { value: WALLET_TRANSACTION_TYPE.TOP_UP, label: "Nạp tiền" },
  { value: WALLET_TRANSACTION_TYPE.SUBSCRIPTION_PAYMENT, label: "Thanh toán gói" },
  { value: WALLET_TRANSACTION_TYPE.REFUND, label: "Hoàn tiền" },
];

export const WALLET_TRANSACTION_STATUS_OPTIONS: { value: WalletTransactionStatus; label: string }[] = [
  { value: WALLET_TRANSACTION_STATUS.PENDING, label: "Đang xử lý" },
  { value: WALLET_TRANSACTION_STATUS.SUCCESS, label: "Thành công" },
  { value: WALLET_TRANSACTION_STATUS.FAILED, label: "Thất bại" },
];

export const WALLET_TRANSACTION_TYPE_LABELS = Object.fromEntries(
  WALLET_TRANSACTION_TYPE_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<WalletTransactionType, string>;

export const WALLET_TRANSACTION_STATUS_LABELS = Object.fromEntries(
  WALLET_TRANSACTION_STATUS_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<WalletTransactionStatus, string>;

const WALLET_CREDIT_TYPES = new Set<WalletTransactionType>([
  WALLET_TRANSACTION_TYPE.TOP_UP,
  WALLET_TRANSACTION_TYPE.REFUND,
]);

export function walletTransactionSign(type: WalletTransactionType): "+" | "-" {
  return WALLET_CREDIT_TYPES.has(type) ? "+" : "-";
}

export const WALLET_TRANSACTION_STATUS_BADGE_CLASS: Record<WalletTransactionStatus, string> = {
  [WALLET_TRANSACTION_STATUS.SUCCESS]: "border-success/30 bg-success/10 text-success",
  [WALLET_TRANSACTION_STATUS.PENDING]:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  [WALLET_TRANSACTION_STATUS.FAILED]: "border-destructive/30 bg-destructive/10 text-destructive",
};

export type WalletResponse = {
  id: string;
  balance: number;
  reservedBalance: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WalletTransactionResponse = {
  id: string;
  walletId: string;
  transactionType: WalletTransactionType;
  status: WalletTransactionStatus;
  amount: number;
  referenceId: string;
  description: string;
  createdAt: string;
};

export type PaymentInitResponse = {
  txnRef: string;
  amount: number;
  paymentUrl: string;
};

export type WalletTopUpRequest = {
  amount: number;
  bankCode?: string;
};

export type WalletTransactionsResult = {
  transactions: WalletTransactionResponse[];
  totalPages: number;
  totalElements: number;
};

export type WalletTransactionSortField =
  | "id"
  | "walletId"
  | "transactionType"
  | "status"
  | "amount"
  | "referenceId"
  | "description"
  | "createdAt";

export type WalletTransactionSortDirection = "asc" | "desc";

export type FetchWalletTransactionsParams = {
  page?: number;
  size?: number;
  transactionType?: WalletTransactionType;
  status?: WalletTransactionStatus;
  keyword?: string;
  amountMin?: number;
  amountMax?: number;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: WalletTransactionSortField;
  sortDir?: WalletTransactionSortDirection;
};

export const WALLET_AMOUNT_FILTER_MAX = 500_000;

export function toWalletCreatedFrom(date: string) {
  return date ? `${date}T00:00:00` : undefined;
}

export function toWalletCreatedTo(date: string) {
  return date ? `${date}T23:59:59` : undefined;
}

function isWalletTransactionPage(
  data: unknown,
): data is PageResponse<WalletTransactionResponse> {
  return (
    typeof data === "object" &&
    data != null &&
    "content" in data &&
    Array.isArray((data as PageResponse<WalletTransactionResponse>).content)
  );
}

export function normalizeWalletTransactions(
  data: WalletTransactionResponse[] | PageResponse<WalletTransactionResponse> | null | undefined,
): WalletTransactionsResult {
  if (isWalletTransactionPage(data)) {
    return {
      transactions: data.content,
      totalPages: Math.max(data.totalPages, 1),
      totalElements: data.totalElements,
    };
  }

  const transactions = sortWalletTransactions(Array.isArray(data) ? data : []);
  return {
    transactions,
    totalPages: Math.max(Math.ceil(transactions.length / WALLET_TRANSACTION_PAGE_SIZE), 1),
    totalElements: transactions.length,
  };
}

export async function fetchMyWallet() {
  return apiFetch<WalletResponse>("/wallet/me");
}

export async function fetchMyWalletTransactions(
  params: FetchWalletTransactionsParams = {},
): Promise<WalletTransactionsResult> {
  const search = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? WALLET_TRANSACTION_PAGE_SIZE),
  });

  if (params.transactionType) search.set("transactionType", params.transactionType);
  if (params.status) search.set("status", params.status);
  if (params.keyword) search.set("keyword", params.keyword);
  if (params.amountMin != null) search.set("amountMin", String(params.amountMin));
  if (params.amountMax != null) search.set("amountMax", String(params.amountMax));
  if (params.createdFrom) search.set("createdFrom", params.createdFrom);
  if (params.createdTo) search.set("createdTo", params.createdTo);
  if (params.sortBy) search.set("sortBy", params.sortBy);
  if (params.sortDir) search.set("sortDir", params.sortDir);

  const data = await apiFetch<
    WalletTransactionResponse[] | PageResponse<WalletTransactionResponse>
  >(`/wallet/me/transactions?${search}`);
  return normalizeWalletTransactions(data);
}

export function sortWalletTransactions(
  data: WalletTransactionResponse[] | null | undefined,
): WalletTransactionResponse[] {
  const rows = Array.isArray(data) ? data : [];
  return [...rows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function topUpWallet(amount: number, bankCode?: string) {
  const body: WalletTopUpRequest = { amount };
  if (bankCode) body.bankCode = bankCode;

  return apiFetch<PaymentInitResponse>("/wallet/top-up", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function formatWalletAmount(amount: number) {
  return `${amount.toLocaleString("vi-VN")}₫`;
}
