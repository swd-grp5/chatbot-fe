import { useCallback, useEffect, useState } from "react";
import {
  Columns2,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { SubjectModal, type SubjectModalMode } from "@/features/admin/components/subject-modal";
import {
  entityTableWidths,
  useAdminTable,
} from "@/features/admin/hooks/use-admin-table";
import {
  ACTIVE_FILTER_OPTIONS,
  FilterTableHead,
  ResizableTableHead,
  ToggleActiveBadge,
  SortableTableHead,
  TABLE_HEAD_LABEL,
  type ActiveFilter,
} from "@/features/lecturer/components/documents-table-ui";
import {
  DEFAULT_SUBJECT_PAGE_SIZE,
  deleteSubject,
  fetchSubjects,
  toggleSubjectActive,
  type SubjectResponse,
  type SubjectSortField,
  type SortDirection,
} from "@/features/lecturer/api/subject-api";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/shared/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { TablePagination } from "@/shared/components/ui/table-pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateTimeDMY } from "@/shared/lib/format-time";
import { cn } from "@/shared/lib/utils";
import { toast } from "@/shared/lib/toast";

const SUBJECT_COLUMNS = [
  { key: "description", label: "Mô tả" },
  { key: "createdAt", label: "Ngày tạo" },
  { key: "updatedAt", label: "Cập nhật" },
] as const;

type SubjectColumnKey = (typeof SUBJECT_COLUMNS)[number]["key"];

export function AdminSubjectsPage() {
  const [queryInput, setQueryInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [sortBy, setSortBy] = useState<SubjectSortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [rows, setRows] = useState<SubjectResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [subjectModal, setSubjectModal] = useState<{
    mode: SubjectModalMode;
    subjectId: string | null;
  } | null>(null);
  const [deleteSubjectRow, setDeleteSubjectRow] = useState<SubjectResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const table = useAdminTable({
    storageKey: "admin-subjects",
    optionalColumns: SUBJECT_COLUMNS,
    fixedColumnCount: 5,
    widthDefaults: entityTableWidths(),
  });

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSubjects({
        keyword: searchKeyword,
        active:
          activeFilter === "all" ? undefined : activeFilter === "true",
        ...(sortBy && sortDir ? { sortBy, sortDir } : {}),
        page,
        size: DEFAULT_SUBJECT_PAGE_SIZE,
      });
      if (res.totalPages > 0 && page >= res.totalPages) {
        setPage(res.totalPages - 1);
        return;
      }
      setRows(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Không tải được danh sách môn học");
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, activeFilter, sortBy, sortDir, page]);

  useEffect(() => {
    const timer = setTimeout(() => void loadSubjects(), 300);
    return () => clearTimeout(timer);
  }, [loadSubjects]);

  const handleSearch = () => {
    setPage(0);
    setSearchKeyword(queryInput.trim());
  };

  const handleSort = (field: SubjectSortField) => {
    setPage(0);
    if (sortBy !== field) {
      setSortBy(field);
      setSortDir("asc");
      return;
    }
    if (sortDir === "asc") {
      setSortDir("desc");
      return;
    }
    setSortBy(null);
    setSortDir(null);
  };

  const handleToggleActive = async (row: SubjectResponse) => {
    try {
      await toggleSubjectActive(row.id);
      await loadSubjects();
      toast.success(row.active ? "Đã tắt môn học" : "Đã bật môn học");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Cập nhật thất bại");
    }
  };

  const confirmDelete = async () => {
    if (!deleteSubjectRow) return;
    setDeleting(true);
    try {
      await deleteSubject(deleteSubjectRow.id);
      await loadSubjects();
      toast.success("Đã xóa môn học");
      setDeleteSubjectRow(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Xóa thất bại");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell mainClassName="px-32 py-10">
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Quản lý môn học</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tạo và quản lý môn học cho giảng viên upload tài liệu.
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => setSubjectModal({ mode: "create", subjectId: null })}
          >
            <Plus className="h-4 w-4" />
            Thêm môn học
          </Button>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">
              Danh sách môn học
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({totalElements})
              </span>
            </h2>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="relative w-80 sm:w-96">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  placeholder="Tìm theo mã, tên, mô tả"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 shrink-0 px-3 text-xs"
                onClick={handleSearch}
              >
                Tìm
              </Button>
              <TooltipProvider delayDuration={200}>
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
                    {table.optionalColumns.map(({ key, label }) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={Boolean(table.columnVisibility[key as SubjectColumnKey])}
                        onCheckedChange={(checked) => {
                          table.setColumnVisibility((prev) => ({
                            ...prev,
                            [key]: checked === true,
                          }));
                        }}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => void loadSubjects()}
                      disabled={loading}
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Tải lại danh sách</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <TooltipProvider delayDuration={0}>
            <Table className="table-fixed [&_th]:px-4 [&_th]:py-2.5 [&_td]:px-4 [&_td]:py-3">
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <ResizableTableHead
                    className={cn(TABLE_HEAD_LABEL, "text-center")}
                    {...table.resize("stt")}
                  >
                    STT
                  </ResizableTableHead>
                  <SortableTableHead
                    label="Mã"
                    field="code"
                    activeField={sortBy}
                    direction={sortDir}
                    onSort={handleSort}
                    {...table.resize("code")}
                  />
                  <SortableTableHead
                    label="Tên môn"
                    field="name"
                    activeField={sortBy}
                    direction={sortDir}
                    onSort={handleSort}
                    {...table.resize("name")}
                  />
                  {table.isVisible("description") && (
                    <ResizableTableHead className={TABLE_HEAD_LABEL} {...table.resize("description")}>
                      Mô tả
                    </ResizableTableHead>
                  )}
                  <FilterTableHead
                    label="Kích hoạt"
                    filterValue={activeFilter}
                    onFilterChange={(value) => {
                      setPage(0);
                      setActiveFilter(value as ActiveFilter);
                    }}
                    filterOptions={ACTIVE_FILTER_OPTIONS}
                    className="text-center"
                    {...table.resize("active")}
                  />
                  {table.isVisible("createdAt") && (
                    <SortableTableHead
                      label="Ngày tạo"
                      field="createdAt"
                      activeField={sortBy}
                      direction={sortDir}
                      onSort={handleSort}
                      {...table.resize("createdAt")}
                    />
                  )}
                  {table.isVisible("updatedAt") && (
                    <SortableTableHead
                      label="Cập nhật"
                      field="updatedAt"
                      activeField={sortBy}
                      direction={sortDir}
                      onSort={handleSort}
                      {...table.resize("updatedAt")}
                    />
                  )}
                  <ResizableTableHead
                    className={cn(TABLE_HEAD_LABEL, "text-center")}
                    {...table.resize("actions")}
                  >
                    Thao tác
                  </ResizableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={cn(loading && rows.length > 0 && "pointer-events-none opacity-50")}>
                {loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={table.tableColSpan} className="py-10 text-center text-sm text-muted-foreground">
                      Đang tải môn học...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={table.tableColSpan} className="py-10 text-center text-sm text-muted-foreground">
                      Chưa có môn học — bấm Thêm môn học để tạo.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row, index) => {
                  const rowNumber = page * DEFAULT_SUBJECT_PAGE_SIZE + index + 1;
                  return (
                    <TableRow key={row.id} className={cn(!row.active && "opacity-60")}>
                      <TableCell
                        className="text-center text-sm tabular-nums text-muted-foreground"
                        style={table.cell("stt")}
                      >
                        {rowNumber}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium" style={table.cell("code")}>
                        {row.code}
                      </TableCell>
                      <TableCell className="text-sm font-medium" style={table.cell("name")}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block cursor-default truncate">{row.name}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-sm">
                            {row.name}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      {table.isVisible("description") && (
                        <TableCell className="text-sm text-muted-foreground" style={table.cell("description")}>
                          {row.description?.trim() ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block cursor-default truncate">
                                  {row.description.trim()}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap">
                                {row.description.trim()}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-center" style={table.cell("active")}>
                        <ToggleActiveBadge
                          active={row.active}
                          onToggle={() => void handleToggleActive(row)}
                          tooltipActive="Tắt môn"
                          tooltipInactive="Bật môn"
                        />
                      </TableCell>
                      {table.isVisible("createdAt") && (
                        <TableCell
                          className="whitespace-nowrap text-sm text-muted-foreground"
                          style={table.cell("createdAt")}
                        >
                          {formatDateTimeDMY(row.createdAt)}
                        </TableCell>
                      )}
                      {table.isVisible("updatedAt") && (
                        <TableCell
                          className="whitespace-nowrap text-sm text-muted-foreground"
                          style={table.cell("updatedAt")}
                        >
                          {formatDateTimeDMY(row.updatedAt)}
                        </TableCell>
                      )}
                      <TableCell style={table.cell("actions")}>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Xem chi tiết"
                            onClick={() => setSubjectModal({ mode: "view", subjectId: row.id })}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Sửa"
                            onClick={() => setSubjectModal({ mode: "edit", subjectId: row.id })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            title="Xóa"
                            onClick={() => setDeleteSubjectRow(row)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TooltipProvider>

          {totalPages > 1 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              disabled={loading}
            />
          )}
        </Card>
      </div>

      <SubjectModal
        mode={subjectModal?.mode ?? null}
        subjectId={subjectModal?.subjectId ?? null}
        open={!!subjectModal}
        onOpenChange={(open) => !open && setSubjectModal(null)}
        onSaved={loadSubjects}
        onEditRequest={(id) => setSubjectModal({ mode: "edit", subjectId: id })}
      />

      <Modal
        open={!!deleteSubjectRow}
        onOpenChange={(open) => !open && !deleting && setDeleteSubjectRow(null)}
      >
        <ModalContent className="sm:max-w-md">
          <ModalHeader>
            <ModalTitle>Xóa môn học</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa môn{" "}
            <span className="font-medium text-foreground">
              {deleteSubjectRow?.code} — {deleteSubjectRow?.name}
            </span>
            ? Hành động này không thể hoàn tác.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteSubjectRow(null)} disabled={deleting}>
              Huỷ
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AppShell>
  );
}
