import type { CSSProperties, ReactNode } from "react";
import { Columns2, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/shared/components/ui/table";
import { TablePagination } from "@/shared/components/ui/table-pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";

type OptionalColumn = { key: string; label: string };

export type DataTableProps = {
  title?: string;
  loading?: boolean;
  onRefresh?: () => void;
  refreshTooltip?: string;
  optionalColumns?: readonly OptionalColumn[];
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (key: string, visible: boolean) => void;
  toolbarExtra?: ReactNode;
  tableClassName?: string;
  tableStyle?: CSSProperties;
  header: ReactNode;
  children: ReactNode;
  colSpan: number;
  isEmpty?: boolean;
  emptyMessage?: string;
  filteredEmptyMessage?: string;
  hasActiveFilters?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  paginationDisabled?: boolean;
};

export function DataTable({
  title,
  loading = false,
  onRefresh,
  refreshTooltip = "Tải lại danh sách",
  optionalColumns,
  columnVisibility,
  onColumnVisibilityChange,
  toolbarExtra,
  tableClassName,
  tableStyle,
  header,
  children,
  colSpan,
  isEmpty = false,
  emptyMessage = "Chưa có dữ liệu.",
  filteredEmptyMessage = "Không có dữ liệu phù hợp bộ lọc.",
  hasActiveFilters = false,
  page,
  totalPages,
  onPageChange,
  paginationDisabled,
}: DataTableProps) {
  const showToolbar = Boolean(title || onRefresh || optionalColumns?.length || toolbarExtra);
  const showPagination =
    page != null && totalPages != null && onPageChange != null && totalPages > 1;

  return (
    <>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-4">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <TooltipProvider delayDuration={200}>
              {toolbarExtra}
              {optionalColumns &&
                optionalColumns.length > 0 &&
                columnVisibility &&
                onColumnVisibilityChange && (
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                            <Columns2 className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="top">Hiển thị cột</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {optionalColumns.map(({ key, label }) => (
                        <DropdownMenuCheckboxItem
                          key={key}
                          checked={columnVisibility[key] !== false}
                          onCheckedChange={(checked) =>
                            onColumnVisibilityChange(key, checked === true)
                          }
                        >
                          {label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              {onRefresh && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={onRefresh}
                      disabled={loading}
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{refreshTooltip}</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
      )}

      <TooltipProvider delayDuration={0}>
        <Table className={tableClassName} style={tableStyle}>
          <TableHeader>{header}</TableHeader>
          <TableBody className={cn(loading && !isEmpty && "pointer-events-none opacity-50")}>
            {isEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {hasActiveFilters ? filteredEmptyMessage : emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              children
            )}
          </TableBody>
        </Table>
      </TooltipProvider>

      {showPagination && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={paginationDisabled ?? loading}
        />
      )}
    </>
  );
}
