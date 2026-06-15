import { apiFetch } from "@/shared/lib/api-client";

/** Khớp `swdchatbox.system.wallet.enums.WalletTransactionType` */
export const WALLET_TRANSACTION_TYPE = {
  TOP_UP: "TOP_UP",
  SUBSCRIPTION_PAYMENT: "SUBSCRIPTION_PAYMENT",
  REFUND: "REFUND",
  ADJUSTMENT: "ADJUSTMENT",
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

export type WalletTransactionColumnKey = "transactionType" | "description" | "status";

export const WALLET_TRANSACTION_OPTIONAL_COLUMNS: {
  key: WalletTransactionColumnKey;
  label: string;
}[] = [
  { key: "transactionType", label: "Loại" },
  { key: "description", label: "Mô tả" },
  { key: "status", label: "Trạng thái" },
];

export const WALLET_TRANSACTION_TYPE_OPTIONS: { value: WalletTransactionType; label: string }[] = [
  { value: WALLET_TRANSACTION_TYPE.TOP_UP, label: "Nạp tiền" },
  { value: WALLET_TRANSACTION_TYPE.SUBSCRIPTION_PAYMENT, label: "Thanh toán gói" },
  { value: WALLET_TRANSACTION_TYPE.REFUND, label: "Hoàn tiền" },
  { value: WALLET_TRANSACTION_TYPE.ADJUSTMENT, label: "Điều chỉnh" },
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

export async function fetchMyWallet() {
  return apiFetch<WalletResponse>("/wallet/me");
}

export async function fetchMyWalletTransactions() {
  return apiFetch<WalletTransactionResponse[]>("/wallet/me/transactions");
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
