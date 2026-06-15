import { useCallback, useMemo } from "react";
import type { DocStatus } from "@/shared/lib/mock-data";
import { useResizableColumns } from "@/shared/components/ui/table-head";

export const documentTypeStyles: Record<string, { label: string; className: string }> = {
  pdf: {
    label: "PDF",
    className: "border-destructive/35 bg-destructive/10 text-destructive",
  },
  docx: {
    label: "DOCX",
    className: "border-info/35 bg-info/10 text-info",
  },
  pptx: {
    label: "PPTX",
    className: "border-warning/40 bg-warning/10 text-warning",
  },
  txt: {
    label: "TXT",
    className: "border-border bg-secondary text-muted-foreground",
  },
  xlsx: {
    label: "XLSX",
    className: "border-success/35 bg-success/10 text-success",
  },
  other: {
    label: "OTHER",
    className: "border-primary/25 bg-primary/5 text-primary",
  },
};

export const documentTypeStyle = (type: string) =>
  documentTypeStyles[type.toLowerCase()] ?? documentTypeStyles.other;

export const statusStyles: Record<DocStatus, { label: string; className: string; dot: string }> = {
  indexed: {
    label: "Sẵn sàng",
    className: "bg-success/10 text-success border-success/20",
    dot: "bg-success",
  },
  processing: {
    label: "Đang xử lý",
    className: "bg-info/10 text-info border-info/20",
    dot: "bg-info animate-pulse",
  },
  uploaded: {
    label: "Mới upload",
    className: "bg-secondary text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
  failed: {
    label: "Lỗi",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
  },
};

export const API_DEFAULT_COURSE = { code: "SWD", name: "SWD" };

export type ApiDocColumnKey =
  | "documentType"
  | "description"
  | "status"
  | "active"
  | "size"
  | "createdAt"
  | "updatedAt";

export const API_DOC_COLUMNS: { key: ApiDocColumnKey; label: string }[] = [
  { key: "documentType", label: "Loại" },
  { key: "description", label: "Mô tả" },
  { key: "status", label: "Trạng thái" },
  { key: "active", label: "Kích hoạt" },
  { key: "size", label: "Kích thước" },
  { key: "createdAt", label: "Ngày tạo" },
  { key: "updatedAt", label: "Cập nhật" },
];

export const FILTER_COL_WIDTH = {
  documentType: "w-24 min-w-24 max-w-24 text-center",
  status: "w-36 min-w-36 max-w-36 text-center",
  active: "w-32 min-w-32 max-w-32 text-center",
} as const;

export const DOCUMENT_COLUMN_WIDTHS = {
  stt: 48,
  title: 192,
  documentType: 96,
  description: 144,
  status: 144,
  active: 128,
  size: 112,
  createdAt: 144,
  updatedAt: 144,
  actions: 80,
} as const;

export type DocumentColumnWidthKey = keyof typeof DOCUMENT_COLUMN_WIDTHS;

export function useDocumentTableResize(storageKey: string) {
  const { widths, startResize, columnStyle } = useResizableColumns(
    storageKey,
    DOCUMENT_COLUMN_WIDTHS,
  );

  const resize = useCallback(
    (key: DocumentColumnWidthKey) => ({
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
