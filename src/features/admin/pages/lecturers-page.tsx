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
import { LecturerModal, type LecturerModalMode } from "@/features/admin/components/lecturer-modal";
import {
  useAdminTable,
  userTableWidths,
} from "@/features/admin/hooks/use-admin-table";
import {
  ACTIVE_FILTER_OPTIONS,
  FilterTableHead,
  ResizableTableHead,
  ToggleActiveBadge,
  TruncatedSubjectBadges,
  SortableTableHead,
  TABLE_HEAD_LABEL,
  type ActiveFilter,
} from "@/features/lecturer/components/documents-table-ui";
import {
  DEFAULT_LECTURER_PAGE_SIZE,
  deleteLecturer,
  fetchLecturers,
  toggleLecturerActive,
  type LecturerResponse,
  type LecturerSortField,
  type SortDirection,
} from "@/features/admin/api/lecturer-api";
import { fetchSubjects, type SubjectOption } from "@/features/lecturer/api/subject-api";
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

const LECTURER_COLUMNS = [
  { key: "subjects", label: "Môn học" },
  { key: "emailVerified", label: "Xác thực email" },
  { key: "provider", label: "Nhà cung cấp" },
  { key: "createdAt", label: "Ngày tạo" },
  { key: "updatedAt", label: "Cập nhật" },
] as const;

type LecturerColumnKey = (typeof LECTURER_COLUMNS)[number]["key"];

export function AdminLecturersPage() {
  const [queryInput, setQueryInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [sortBy, setSortBy] = useState<LecturerSortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [rows, setRows] = useState<LecturerResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [lecturerModal, setLecturerModal] = useState<{
    mode: LecturerModalMode;
    lecturerId: string | null;
  } | null>(null);
  const [deleteLecturerRow, setDeleteLecturerRow] = useState<LecturerResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const table = useAdminTable({
    storageKey: "admin-lecturers",
    optionalColumns: LECTURER_COLUMNS,
    fixedColumnCount: 5,
    widthDefaults: userTableWidths(),
  });

  useEffect(() => {
    void fetchSubjects({ active: true, size: 200, page: 0 })
      .then((res) => setSubjects(res.content.map(({ id, code, name }) => ({ id, code, name }))))
      .catch(() => setSubjects([]));
  }, []);

  const loadLecturers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLecturers({
        keyword: searchKeyword,
        active: activeFilter === "all" ? undefined : activeFilter === "true",
        subjectId: subjectFilter === "all" ? undefined : subjectFilter,
        ...(sortBy && sortDir ? { sortBy, sortDir } : {}),
        page,
        size: DEFAULT_LECTURER_PAGE_SIZE,
      });
      if (res.totalPages > 0 && page >= res.totalPages) {
        setPage(res.totalPages - 1);
        return;
      }
      setRows(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Không tải được danh sách giảng viên");
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, activeFilter, subjectFilter, sortBy, sortDir, page]);

  useEffect(() => {
    const timer = setTimeout(() => void loadLecturers(), 300);
    return () => clearTimeout(timer);
  }, [loadLecturers]);

  const handleSearch = () => {
    setPage(0);
    setSearchKeyword(queryInput.trim());
  };

  const handleSort = (field: LecturerSortField) => {
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

  const handleToggleActive = async (row: LecturerResponse) => {
    try {
      await toggleLecturerActive(row.id);
      await loadLecturers();
      toast.success(row.active ? "Đã tắt giảng viên" : "Đã bật giảng viên");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Cập nhật thất bại");
    }
  };

  const confirmDelete = async () => {
    if (!deleteLecturerRow) return;
    setDeleting(true);
    try {
      await deleteLecturer(deleteLecturerRow.id);
      await loadLecturers();
      toast.success("Đã xóa giảng viên");
      setDeleteLecturerRow(null);
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
            <h1 className="text-2xl font-semibold tracking-tight">Quản lý giảng viên</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tạo và quản lý tài khoản giảng viên, gán môn được phép upload.
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => setLecturerModal({ mode: "create", lecturerId: null })}
          >
            <Plus className="h-4 w-4" />
            Thêm giảng viên
          </Button>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">
              Danh sách giảng viên
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
                  placeholder="Tìm theo họ tên, email"
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
                        checked={Boolean(table.columnVisibility[key as LecturerColumnKey])}
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
                      onClick={() => void loadLecturers()}
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
                    label="Họ tên"
                    field="fullName"
                    activeField={sortBy}
                    direction={sortDir}
                    onSort={handleSort}
                    {...table.resize("fullName")}
                  />
                  <SortableTableHead
                    label="Email"
                    field="email"
                    activeField={sortBy}
                    direction={sortDir}
                    onSort={handleSort}
                    {...table.resize("email")}
                  />
                  {table.isVisible("subjects") && (
                    <FilterTableHead
                      label="Môn học"
                      filterValue={subjectFilter}
                      onFilterChange={(value) => {
                        setPage(0);
                        setSubjectFilter(value);
                      }}
                      filterOptions={subjects.map((subject) => ({
                        value: subject.id,
                        label: subject.code,
                      }))}
                      {...table.resize("subjects")}
                    />
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
                  {table.isVisible("emailVerified") && (
                    <ResizableTableHead
                      className={cn(TABLE_HEAD_LABEL, "text-center")}
                      {...table.resize("emailVerified")}
                    >
                      Xác thực email
                    </ResizableTableHead>
                  )}
                  {table.isVisible("provider") && (
                    <ResizableTableHead className={TABLE_HEAD_LABEL} {...table.resize("provider")}>
                      Nhà cung cấp
                    </ResizableTableHead>
                  )}
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
                      Đang tải giảng viên...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={table.tableColSpan} className="py-10 text-center text-sm text-muted-foreground">
                      Chưa có giảng viên — bấm Thêm giảng viên để tạo.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row, index) => {
                  const rowNumber = page * DEFAULT_LECTURER_PAGE_SIZE + index + 1;
                  return (
                    <TableRow key={row.id} className={cn(!row.active && "opacity-60")}>
                      <TableCell
                        className="text-center text-sm tabular-nums text-muted-foreground"
                        style={table.cell("stt")}
                      >
                        {rowNumber}
                      </TableCell>
                      <TableCell className="text-sm font-medium" style={table.cell("fullName")}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block cursor-default truncate">{row.fullName}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-sm">
                            {row.fullName}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" style={table.cell("email")}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block cursor-default truncate">{row.email}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-sm">
                            {row.email}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      {table.isVisible("subjects") && (
                        <TableCell className="text-center" style={table.cell("subjects")}>
                          <TruncatedSubjectBadges subjects={row.subjects} />
                        </TableCell>
                      )}
                      <TableCell className="text-center" style={table.cell("active")}>
                        <ToggleActiveBadge
                          active={row.active}
                          onToggle={() => void handleToggleActive(row)}
                          tooltipActive="Tắt giảng viên"
                          tooltipInactive="Bật giảng viên"
                        />
                      </TableCell>
                      {table.isVisible("emailVerified") && (
                        <TableCell
                          className="text-center text-sm text-muted-foreground"
                          style={table.cell("emailVerified")}
                        >
                          {row.emailVerified ? "Đã xác thực" : "Chưa"}
                        </TableCell>
                      )}
                      {table.isVisible("provider") && (
                        <TableCell className="text-sm text-muted-foreground" style={table.cell("provider")}>
                          {row.provider}
                        </TableCell>
                      )}
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
                            onClick={() => setLecturerModal({ mode: "view", lecturerId: row.id })}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Sửa"
                            onClick={() => setLecturerModal({ mode: "edit", lecturerId: row.id })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            title="Xóa"
                            onClick={() => setDeleteLecturerRow(row)}
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

      <LecturerModal
        mode={lecturerModal?.mode ?? null}
        lecturerId={lecturerModal?.lecturerId ?? null}
        open={!!lecturerModal}
        onOpenChange={(open) => !open && setLecturerModal(null)}
        onSaved={loadLecturers}
        onEditRequest={(id) => setLecturerModal({ mode: "edit", lecturerId: id })}
      />

      <Modal
        open={!!deleteLecturerRow}
        onOpenChange={(open) => !open && !deleting && setDeleteLecturerRow(null)}
      >
        <ModalContent className="sm:max-w-md">
          <ModalHeader>
            <ModalTitle>Xóa giảng viên</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa giảng viên{" "}
            <span className="font-medium text-foreground">
              {deleteLecturerRow?.fullName} ({deleteLecturerRow?.email})
            </span>
            ? Hành động này không thể hoàn tác.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteLecturerRow(null)} disabled={deleting}>
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
