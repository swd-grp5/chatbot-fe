import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadColumnVisibility,
  useResizableColumns,
} from "@/features/lecturer/components/documents-table-ui";

export const ADMIN_COLUMN_WIDTHS = {
  stt: 48,
  code: 112,
  name: 128,
  fullName: 160,
  email: 220,
  description: 320,
  subjects: 144,
  active: 128,
  emailVerified: 128,
  provider: 112,
  createdAt: 144,
  updatedAt: 144,
  actions: 128,
} as const;

/** Mã + tên + mô tả — dùng cho môn học, vai trò */
export function entityTableWidths() {
  const { stt, code, name, description, active, createdAt, updatedAt, actions } =
    ADMIN_COLUMN_WIDTHS;
  return { stt, code, name, description, active, createdAt, updatedAt, actions } as const;
}

/** Họ tên + email + môn — dùng cho sinh viên, giảng viên */
export function userTableWidths() {
  const {
    stt,
    fullName,
    email,
    subjects,
    active,
    emailVerified,
    provider,
    createdAt,
    updatedAt,
    actions,
  } = ADMIN_COLUMN_WIDTHS;
  return {
    stt,
    fullName,
    email,
    subjects,
    active,
    emailVerified,
    provider,
    createdAt,
    updatedAt,
    actions,
  } as const;
}

type OptionalColumnDef<T extends string> = { key: T; label: string };

export function useAdminTable<
  const TOptional extends string,
  const TWidth extends string,
>({
  storageKey,
  optionalColumns,
  widthDefaults,
  fixedColumnCount,
}: {
  storageKey: string;
  optionalColumns: readonly OptionalColumnDef<TOptional>[];
  widthDefaults: Record<TWidth, number>;
  fixedColumnCount: number;
}) {
  const visibilityStorageKey = `${storageKey}-columns`;
  const widthStorageKey = `${storageKey}-column-widths`;
  const optionalKeys = useMemo(
    () => optionalColumns.map((column) => column.key),
    [optionalColumns],
  );

  const [columnVisibility, setColumnVisibility] = useState(() =>
    loadColumnVisibility(visibilityStorageKey, optionalKeys),
  );

  const { widths, startResize, columnStyle } = useResizableColumns(
    widthStorageKey,
    widthDefaults,
  );

  useEffect(() => {
    localStorage.setItem(visibilityStorageKey, JSON.stringify(columnVisibility));
  }, [columnVisibility, visibilityStorageKey]);

  const resize = useCallback(
    (key: TWidth) => ({
      resizeKey: key,
      width: widths[key],
      onResizeStart: startResize as (key: string, clientX: number) => void,
    }),
    [widths, startResize],
  );

  const cell = columnStyle;

  const isVisible = useCallback(
    (key: TOptional) => Boolean(columnVisibility[key]),
    [columnVisibility],
  );

  const tableColSpan = useMemo(() => {
    const optionalVisible = optionalKeys.filter((key) => columnVisibility[key]).length;
    return fixedColumnCount + optionalVisible;
  }, [columnVisibility, fixedColumnCount, optionalKeys]);

  return {
    optionalColumns,
    columnVisibility,
    setColumnVisibility,
    isVisible,
    resize,
    cell,
    tableColSpan,
  };
}
