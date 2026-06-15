import { useCallback, useMemo } from "react";
import { useResizableColumns } from "@/shared/components/ui/table-head";

export const WALLET_WIDTHS_STORAGE = "student-wallet-transaction-column-widths";

export const WALLET_COLUMN_WIDTHS = {
  stt: 48,
  createdAt: 144,
  transactionType: 96,
  referenceId: 128,
  description: 144,
  status: 144,
  amount: 112,
} as const;

export type WalletColumnWidthKey = keyof typeof WALLET_COLUMN_WIDTHS;

export function useWalletTableResize(storageKey: string) {
  const { widths, startResize, columnStyle } = useResizableColumns(
    storageKey,
    WALLET_COLUMN_WIDTHS,
  );

  const resize = useCallback(
    (key: WalletColumnWidthKey) => ({
      resizeKey: key,
      width: widths[key],
      onResizeStart: startResize as (key: string, clientX: number) => void,
    }),
    [widths, startResize],
  );

  const tableMinWidth = useMemo(
    () => Object.values(widths).reduce((sum, width) => sum + width, 0),
    [widths],
  );

  return { resize, cell: columnStyle, tableMinWidth };
}
