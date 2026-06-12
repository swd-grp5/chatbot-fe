import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { TableHead } from "@/shared/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type { DocStatus } from "@/shared/lib/mock-data";
import type { SortDirection } from "@/features/lecturer/api/document-api";
import { cn } from "@/shared/lib/utils";

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

export type ActiveFilter = "all" | "true" | "false";

export const API_DOC_COLUMNS: { key: ApiDocColumnKey; label: string }[] = [
  { key: "documentType", label: "Loại" },
  { key: "description", label: "Mô tả" },
  { key: "status", label: "Trạng thái" },
  { key: "active", label: "Kích hoạt" },
  { key: "size", label: "Kích thước" },
  { key: "createdAt", label: "Ngày tạo" },
  { key: "updatedAt", label: "Cập nhật" },
];

export const activeStyles = {
  active: {
    label: "Đã bật",
    className: "bg-success/10 text-success border-success/20",
  },
  inactive: {
    label: "Đã khóa",
    className: "bg-secondary text-muted-foreground border-border",
  },
} as const;

export const ACTIVE_FILTER_OPTIONS: { value: ActiveFilter; label: string }[] = [
  { value: "true", label: activeStyles.active.label },
  { value: "false", label: activeStyles.inactive.label },
];

export function ToggleActiveBadge({
  active,
  onToggle,
  tooltipActive,
  tooltipInactive,
}: {
  active: boolean;
  onToggle: () => void;
  tooltipActive: string;
  tooltipInactive: string;
}) {
  const status = active ? activeStyles.active : activeStyles.inactive;
  const tooltip = active ? tooltipActive : tooltipInactive;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer"
          onClick={() => void onToggle()}
        >
          <Badge variant="outline" className={cn("gap-1.5 font-normal", status.className)}>
            {status.label}
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export type SubjectBadgeItem = { id: string; code: string; name?: string };

export function TruncatedSubjectBadges({
  subjects,
  limit = 2,
}: {
  subjects: SubjectBadgeItem[];
  limit?: number;
}) {
  if (subjects.length === 0) {
    return <span className="block w-full text-center text-sm text-muted-foreground">—</span>;
  }

  const visible = subjects.slice(0, limit);
  const remaining = subjects.length - limit;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex w-full flex-wrap items-center justify-center gap-1">
          {visible.map((subject) => (
            <Badge key={subject.id} variant="secondary" className="font-normal">
              {subject.code}
            </Badge>
          ))}
          {remaining > 0 && (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              +{remaining}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="w-max max-w-none px-2 py-1.5">
        <div className="flex flex-wrap items-center justify-center gap-1">
          {subjects.map((subject) => (
            <Badge key={subject.id} variant="secondary" className="font-normal">
              {subject.code}
            </Badge>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function loadColumnVisibility<T extends string>(
  storageKey: string,
  keys: readonly T[],
): Record<T, boolean> {
  const defaults = Object.fromEntries(keys.map((key) => [key, true])) as Record<T, boolean>;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<T, boolean>>;
    return Object.fromEntries(keys.map((key) => [key, parsed[key] !== false])) as Record<T, boolean>;
  } catch {
    return defaults;
  }
}

export const COLUMN_MIN_WIDTH = 48;

export function loadColumnWidths<T extends string>(
  storageKey: string,
  defaults: Record<T, number>,
): Record<T, number> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<T, number>>;
    return Object.fromEntries(
      (Object.keys(defaults) as T[]).map((key) => {
        const value = parsed[key];
        return [
          key,
          typeof value === "number" && value >= COLUMN_MIN_WIDTH ? value : defaults[key],
        ];
      }),
    ) as Record<T, number>;
  } catch {
    return defaults;
  }
}

export function useResizableColumns<T extends string>(
  storageKey: string,
  defaults: Record<T, number>,
) {
  const [widths, setWidths] = useState(() => loadColumnWidths(storageKey, defaults));

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(widths));
  }, [widths, storageKey]);

  const startResize = useCallback(
    (key: T, startX: number) => {
      const startWidth = widths[key];
      const onMouseMove = (e: MouseEvent) => {
        const next = Math.max(COLUMN_MIN_WIDTH, startWidth + (e.clientX - startX));
        setWidths((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }));
      };
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [widths],
  );

  const columnStyle = useCallback(
    (key: T): CSSProperties => ({
      width: widths[key],
      minWidth: widths[key],
      maxWidth: widths[key],
    }),
    [widths],
  );

  return { widths, startResize, columnStyle };
}

export type ColumnResizeProps = {
  resizeKey?: string;
  width?: number;
  onResizeStart?: (key: string, clientX: number) => void;
};

function columnWidthStyle(width?: number): CSSProperties | undefined {
  if (width == null) return undefined;
  return { width, minWidth: width, maxWidth: width };
}

function ColumnResizeHandle({
  resizeKey,
  onResizeStart,
}: {
  resizeKey: string;
  onResizeStart: (key: string, clientX: number) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Đổi độ rộng cột"
      className="absolute -right-0.5 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-primary/25 active:bg-primary/40"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onResizeStart(resizeKey, e.clientX);
      }}
    />
  );
}

export function ResizableTableHead({
  className,
  width,
  resizeKey,
  onResizeStart,
  children,
  ...props
}: React.ComponentProps<typeof TableHead> & ColumnResizeProps & { children?: ReactNode }) {
  const resizable = resizeKey != null && width != null && onResizeStart != null;

  return (
    <TableHead
      className={cn("relative overflow-hidden", className)}
      style={columnWidthStyle(width)}
      {...props}
    >
      {children}
      {resizable && (
        <ColumnResizeHandle resizeKey={resizeKey} onResizeStart={onResizeStart} />
      )}
    </TableHead>
  );
}

export const TABLE_HEAD_LABEL =
  "whitespace-nowrap text-sm font-medium text-muted-foreground";

export const FILTER_HEAD_BASE =
  "flex w-full min-w-0 items-center gap-0.5 rounded-md border border-border px-1.5 py-1 transition-colors";

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

export const FILTER_HEAD_ACTIVE = "border-primary/20 bg-primary/5";

export function SortArrowButton<T extends string>({
  field,
  activeField,
  direction,
  onSort,
}: {
  field: T;
  activeField: T | null;
  direction: SortDirection | null;
  onSort: (field: T) => void;
}) {
  const isActive = activeField === field && direction != null;
  const SortIcon = isActive ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 rounded p-0.5 transition-colors hover:bg-secondary hover:text-foreground",
        isActive ? "text-foreground" : "text-muted-foreground",
      )}
      onClick={() => onSort(field)}
      title="Sắp xếp"
    >
      <SortIcon className={cn("h-3.5 w-3.5", !isActive && "opacity-40")} />
    </button>
  );
}

export function SortableTableHead<T extends string>({
  label,
  field,
  activeField,
  direction,
  onSort,
  className,
  resizeKey,
  width,
  onResizeStart,
}: {
  label: string;
  field: T;
  activeField: T | null;
  direction: SortDirection | null;
  onSort: (field: T) => void;
  className?: string;
} & ColumnResizeProps) {
  const resizable = resizeKey != null && width != null && onResizeStart != null;

  return (
    <TableHead
      className={cn(TABLE_HEAD_LABEL, "relative overflow-hidden", className)}
      style={columnWidthStyle(width)}
    >
      <div className="flex min-w-0 items-center gap-0.5">
        <SortArrowButton
          field={field}
          activeField={activeField}
          direction={direction}
          onSort={onSort}
        />
        <span className="truncate">{label}</span>
      </div>
      {resizable && (
        <ColumnResizeHandle resizeKey={resizeKey} onResizeStart={onResizeStart} />
      )}
    </TableHead>
  );
}

export function FilterTableHead<T extends string = string>({
  label,
  filterValue,
  onFilterChange,
  filterOptions,
  field,
  activeField,
  direction,
  onSort,
  className,
  disabled,
  resizeKey,
  width,
  onResizeStart,
}: {
  label: string;
  filterValue: string;
  onFilterChange: (value: string) => void;
  filterOptions: { value: string; label: string }[];
  field?: T;
  activeField?: T | null;
  direction?: SortDirection | null;
  onSort?: (field: T) => void;
  className?: string;
  disabled?: boolean;
} & ColumnResizeProps) {
  const isFiltered = filterValue !== "all";
  const selectedLabel =
    filterValue === "all"
      ? label
      : (filterOptions.find((option) => option.value === filterValue)?.label ?? label);
  const resizable = resizeKey != null && width != null && onResizeStart != null;

  return (
    <TableHead
      className={cn(TABLE_HEAD_LABEL, "relative overflow-hidden", className)}
      style={columnWidthStyle(width)}
    >
      <div className={cn(FILTER_HEAD_BASE, "justify-center", isFiltered && FILTER_HEAD_ACTIVE)}>
        {field && onSort && (
          <SortArrowButton
            field={field}
            activeField={activeField ?? null}
            direction={direction ?? null}
            onSort={onSort}
          />
        )}
        <Select value={filterValue} onValueChange={onFilterChange} disabled={disabled}>
          <SelectTrigger
            title={selectedLabel}
            className={cn(
              "h-auto w-full min-w-0 flex-1 justify-center gap-1 overflow-hidden border-0 bg-transparent p-0 text-center text-sm shadow-none focus:ring-0 [&>span]:block [&>span]:truncate [&>svg]:hidden",
              isFiltered
                ? "font-medium text-foreground"
                : "font-medium text-muted-foreground",
            )}
          >
            <SelectValue placeholder={label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{label}</SelectItem>
            {filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {resizable && (
        <ColumnResizeHandle resizeKey={resizeKey} onResizeStart={onResizeStart} />
      )}
    </TableHead>
  );
}
