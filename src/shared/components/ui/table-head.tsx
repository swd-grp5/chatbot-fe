import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ConfigProvider, DatePicker, Slider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/vi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { TableHead } from "@/shared/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";

export type SortDirection = "asc" | "desc";

dayjs.locale("vi");

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

export type ActiveFilter = "all" | "true" | "false";

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
  "flex min-w-0 items-center gap-1 rounded-md border border-border px-2.5 py-1.5 transition-colors";

export const FILTER_HEAD_ACTIVE = "border-primary/20 bg-primary/5";

function filterHeadCellClass(className?: string, width?: number) {
  return cn(
    TABLE_HEAD_LABEL,
    "relative overflow-hidden",
    width == null && "w-px whitespace-nowrap",
    className,
  );
}

function filterHeadBoxClass({
  className,
  isFiltered,
  width,
}: {
  className?: string;
  isFiltered?: boolean;
  width?: number;
}) {
  const centered = className?.includes("text-center");
  const alignEnd = className?.includes("text-right");
  return cn(
    FILTER_HEAD_BASE,
    width == null ? "w-fit max-w-full" : "w-full",
    centered && "mx-auto",
    alignEnd && "ml-auto",
    "justify-center",
    isFiltered && FILTER_HEAD_ACTIVE,
  );
}

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
  const isSorted = activeField === field && direction != null;

  if (!resizable) {
    return (
      <TableHead className={filterHeadCellClass(className, width)} style={columnWidthStyle(width)}>
        <div className={filterHeadBoxClass({ className, isFiltered: isSorted, width })}>
          <SortArrowButton
            field={field}
            activeField={activeField}
            direction={direction}
            onSort={onSort}
          />
          <span className="truncate text-sm font-medium">{label}</span>
        </div>
      </TableHead>
    );
  }

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
    <TableHead className={filterHeadCellClass(className, width)} style={columnWidthStyle(width)}>
      <div className={filterHeadBoxClass({ className, isFiltered, width })}>
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
              "h-auto w-auto min-w-0 shrink justify-center gap-1 overflow-hidden border-0 bg-transparent p-0 text-center text-sm shadow-none focus:ring-0 [&>span]:block [&>span]:truncate [&>svg]:hidden",
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

function isAntdOverlayTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(".ant-picker-dropdown") ||
      target.closest(".ant-slider-tooltip") ||
      target.closest(".ant-tooltip"),
  );
}

function FilterAntdScope({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          borderRadius: 6,
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

function toDayjsRange(value: { from: string; to: string }): [Dayjs | null, Dayjs | null] {
  return [value.from ? dayjs(value.from) : null, value.to ? dayjs(value.to) : null];
}

function fromDayjsRange(range: [Dayjs | null, Dayjs | null] | null): { from: string; to: string } {
  if (!range) return { from: "", to: "" };
  return {
    from: range[0]?.format("YYYY-MM-DD") ?? "",
    to: range[1]?.format("YYYY-MM-DD") ?? "",
  };
}

function FilterDropdownTableHead({
  label,
  isFiltered,
  className,
  width,
  resizeKey,
  onResizeStart,
  menuContentProps,
  children,
}: {
  label: string;
  isFiltered: boolean;
  className?: string;
  width?: number;
  menuContentProps?: ComponentProps<typeof DropdownMenuContent>;
  children: ReactNode;
} & ColumnResizeProps) {
  const resizable = resizeKey != null && width != null && onResizeStart != null;

  return (
    <TableHead className={filterHeadCellClass(className, width)} style={columnWidthStyle(width)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              filterHeadBoxClass({ className, isFiltered, width }),
              "cursor-pointer",
            )}
          >
            <span
              className={cn(
                "truncate text-sm font-medium",
                isFiltered ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-72 p-3"
          onInteractOutside={(event) => {
            if (isAntdOverlayTarget(event.target)) {
              event.preventDefault();
            }
          }}
          {...menuContentProps}
        >
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
      {resizable && (
        <ColumnResizeHandle resizeKey={resizeKey} onResizeStart={onResizeStart} />
      )}
    </TableHead>
  );
}

function FilterDropdownActions({
  onClear,
  onApply,
}: {
  onClear: () => void;
  onApply: () => void;
}) {
  return (
    <div className="mt-3 flex justify-end gap-2">
      <Button type="button" size="sm" variant="ghost" onClick={onClear}>
        Xóa
      </Button>
      <Button type="button" size="sm" onClick={onApply}>
        Áp dụng
      </Button>
    </div>
  );
}

function FilterDropdownSortRow<T extends string>({
  title,
  field,
  activeField,
  direction,
  onSort,
}: {
  title: string;
  field: T;
  activeField: T | null;
  direction: SortDirection | null;
  onSort: (field: T) => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-1">
      <SortArrowButton
        field={field}
        activeField={activeField}
        direction={direction}
        onSort={onSort}
      />
      <span className="text-sm font-medium">{title}</span>
    </div>
  );
}

export function DateRangeFilterTableHead<T extends string>({
  label,
  field,
  activeField,
  direction,
  onSort,
  value,
  onApply,
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
  value: { from: string; to: string };
  onApply: (value: { from: string; to: string }) => void;
  className?: string;
} & ColumnResizeProps) {
  const isFiltered = Boolean(value.from || value.to);
  const [draft, setDraft] = useState<[Dayjs | null, Dayjs | null]>(() => toDayjsRange(value));

  useEffect(() => {
    setDraft(toDayjsRange(value));
  }, [value]);

  return (
    <FilterDropdownTableHead
      label={label}
      isFiltered={isFiltered}
      className={className}
      width={width}
      resizeKey={resizeKey}
      onResizeStart={onResizeStart}
    >
      <FilterDropdownSortRow
        title="Lọc theo ngày"
        field={field}
        activeField={activeField}
        direction={direction}
        onSort={onSort}
      />
      <FilterAntdScope>
        <DatePicker.RangePicker
          className="w-full"
          format="DD/MM/YYYY"
          value={draft}
          onChange={(next) => setDraft(next ?? [null, null])}
          placeholder={["Từ ngày", "Đến ngày"]}
          getPopupContainer={(node) => node.parentElement ?? document.body}
        />
      </FilterAntdScope>
      <FilterDropdownActions
        onClear={() => {
          const cleared: [Dayjs | null, Dayjs | null] = [null, null];
          setDraft(cleared);
          onApply(fromDayjsRange(cleared));
        }}
        onApply={() => onApply(fromDayjsRange(draft))}
      />
    </FilterDropdownTableHead>
  );
}

export function AmountRangeFilterTableHead<T extends string>({
  label,
  field,
  activeField,
  direction,
  onSort,
  value,
  max,
  step = 10_000,
  formatValue,
  onApply,
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
  value: { min: number; max: number } | null;
  max: number;
  step?: number;
  formatValue: (value: number) => string;
  onApply: (value: { min: number; max: number } | null) => void;
  className?: string;
} & ColumnResizeProps) {
  const isFiltered = value != null;
  const [draft, setDraft] = useState<[number, number]>(
    value ? [value.min, value.max] : [0, max],
  );

  useEffect(() => {
    setDraft(value ? [value.min, value.max] : [0, max]);
  }, [value, max]);

  return (
    <FilterDropdownTableHead
      label={label}
      isFiltered={isFiltered}
      className={className}
      width={width}
      resizeKey={resizeKey}
      onResizeStart={onResizeStart}
      menuContentProps={{ align: "end" }}
    >
      <FilterDropdownSortRow
        title="Lọc theo số tiền"
        field={field}
        activeField={activeField}
        direction={direction}
        onSort={onSort}
      />
      <FilterAntdScope>
        <div className="space-y-3 px-1">
          <Slider
            range
            min={0}
            max={max}
            step={step}
            value={draft}
            tooltip={{ formatter: (next) => formatValue(next ?? 0) }}
            onChange={(next) => setDraft([next[0], next[1]])}
          />
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{formatValue(draft[0])}</span>
            <span>{formatValue(draft[1])}</span>
          </div>
        </div>
      </FilterAntdScope>
      <FilterDropdownActions
        onClear={() => {
          setDraft([0, max]);
          onApply(null);
        }}
        onApply={() => onApply({ min: draft[0], max: draft[1] })}
      />
    </FilterDropdownTableHead>
  );
}

export function KeywordFilterTableHead<T extends string>({
  label,
  field,
  activeField,
  direction,
  onSort,
  value,
  onApply,
  placeholder,
  className,
}: {
  label: string;
  field: T;
  activeField: T | null;
  direction: SortDirection | null;
  onSort: (field: T) => void;
  value: string;
  onApply: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const isFiltered = Boolean(value.trim());
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <FilterDropdownTableHead label={label} isFiltered={isFiltered} className={className}>
      <FilterDropdownSortRow
        title="Tìm kiếm"
        field={field}
        activeField={activeField}
        direction={direction}
        onSort={onSort}
      />
      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onApply(draft.trim());
        }}
      />
      <FilterDropdownActions
        onClear={() => {
          setDraft("");
          onApply("");
        }}
        onApply={() => onApply(draft.trim())}
      />
    </FilterDropdownTableHead>
  );
}
