import { apiFetch } from "@/shared/lib/api-client";

/** Khớp `swdchatbox.system.payment.enums.PaymentStatus` */
export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/** Khớp `PaymentReturnResponse` từ backend */
export type PaymentReturnResponse = {
  success: boolean;
  validSignature: boolean;
  txnRef: string | null;
  amount: number | null;
  status: PaymentStatus | null;
  responseCode: string | null;
  message: string | null;
};

export async function verifyVnpayReturn(search: string) {
  const qs = search.startsWith("?") ? search.slice(1) : search;
  return apiFetch<PaymentReturnResponse>(`/payments/vnpay/return?${qs}`, {
    skipAuth: true,
  });
}
