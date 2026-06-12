import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Columns2,
  Search,
  Upload,
  Trash2,
  Pencil,
  RefreshCw,
  Eye,
} from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/shared/components/ui/modal";
import { type Doc, courseLabel } from "@/shared/lib/mock-data";
import {
  ACTIVE_FILTER_OPTIONS,
  API_DOC_COLUMNS,
  activeStyles,
  documentTypeStyle,
  FilterTableHead,
  FILTER_COL_WIDTH,
  loadColumnVisibility,
  SortableTableHead,
  statusStyles,
  TABLE_HEAD_LABEL,
  type ActiveFilter,
} from "@/features/lecturer/components/documents-table-ui";
import {
  type ApiDocumentStatus,
  type ApiDocumentType,
  type DocumentSortField,
  type SortDirection,
  DEFAULT_DOCUMENT_PAGE_SIZE,
  deleteDocument as deleteDocumentApi,
  DOCUMENT_STATUS_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  fetchDocuments,
  mapDocumentResponse,
} from "@/features/lecturer/api/document-api";
import { fetchSubjects, type SubjectOption } from "@/features/lecturer/api/subject-api";
import { TablePagination } from "@/shared/components/ui/table-pagination";
import { DocumentsCardGrid } from "@/features/lecturer/components/documents-card-grid";
import {
  DocumentsViewToggle,
  type DocumentsViewMode,
} from "@/features/lecturer/components/documents-view-toggle";
import type { DocumentModalMode, DocumentViewMode } from "@/features/lecturer/components/document-modal";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateDMY, formatDateTimeDMY } from "@/shared/lib/format-time";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";
const DocumentModal = lazy(() =>
  import("@/features/lecturer/components/document-modal").then((m) => ({
    default: m.DocumentModal,
  })),
);

const API_COLUMNS_STORAGE = "lecturer-documents-api-columns";
const VIEW_MODE_STORAGE = "lecturer-documents-view-mode";

export function LecturerDocumentsPage() {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApiDocumentStatus | "all">("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<ApiDocumentType | "all">("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [docModal, setDocModal] = useState<{
    mode: DocumentModalMode;
    doc: Doc | null;
    viewTab?: DocumentViewMode;
  } | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [apiDocuments, setApiDocuments] = useState<Doc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<Doc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<DocumentSortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [apiColumns, setApiColumns] = useState(() =>
    loadColumnVisibility(
      API_COLUMNS_STORAGE,
      API_DOC_COLUMNS.map((column) => column.key),
    ),
  );
  const [viewMode, setViewMode] = useState<DocumentsViewMode>(() => {
    try {
      return localStorage.getItem(VIEW_MODE_STORAGE) === "cards" ? "cards" : "table";
    } catch {
      return "table";
    }
  });

  const columnVisibility = apiColumns;
  const columnOptions = API_DOC_COLUMNS;

  const tableColSpan = useMemo(() => {
    const visibleOptional = Object.values(columnVisibility).filter(Boolean).length;
    return 3 + visibleOptional;
  }, [columnVisibility]);

  const displayCourses = subjects;
  const allDocuments = apiDocuments;
  const labelOf = (code: string) => courseLabel(code, displayCourses);
  const selectedSubjectId =
    subjects.find((subject) => subject.code === selectedCourse)?.id ?? "";

  const loadSubjects = useCallback(async () => {
    setSubjectsLoading(true);
    try {
      const res = await fetchSubjects({
        active: true,
        sortBy: "code",
        sortDir: "asc",
        size: 100,
      });
      const rows = res.content.map((subject) => ({
        id: subject.id,
        code: subject.code,
        name: subject.name,
      }));
      setSubjects(rows);
      setSelectedCourse((current) => {
        if (current && rows.some((row) => row.code === current)) return current;
        return rows[0]?.code ?? "";
      });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Không tải được danh sách môn học");
      setSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  }, []);

  const loadApiDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await fetchDocuments({
        keyword: searchKeyword,
        status: statusFilter === "all" ? undefined : statusFilter,
        documentType: documentTypeFilter === "all" ? undefined : documentTypeFilter,
        active:
          activeFilter === "all" ? undefined : activeFilter === "true",
        ...(sortBy && sortDir ? { sortBy, sortDir } : {}),
        page,
        size: DEFAULT_DOCUMENT_PAGE_SIZE,
      });
      if (res.totalPages > 0 && page >= res.totalPages) {
        setPage(res.totalPages - 1);
        return;
      }
      setApiDocuments(res.content.map(mapDocumentResponse));
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Không tải được danh sách tài liệu");
    } finally {
      setDocsLoading(false);
    }
  }, [searchKeyword, statusFilter, documentTypeFilter, activeFilter, sortBy, sortDir, page]);

  const handleSearch = () => {
    setPage(0);
    setSearchKeyword(queryInput.trim());
  };

  const handleSort = (field: DocumentSortField) => {
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

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    localStorage.setItem(API_COLUMNS_STORAGE, JSON.stringify(apiColumns));
  }, [apiColumns]);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE, viewMode);
  }, [viewMode]);

  useEffect(() => {
    const timer = setTimeout(() => loadApiDocuments(), 300);
    return () => clearTimeout(timer);
  }, [loadApiDocuments]);

  const courseDocs = selectedCourse
    ? allDocuments.filter((d) => d.course === selectedCourse)
    : [];
  const filtered = courseDocs;
  const displayTotalElements = totalElements;
  const displayTotalPages = totalPages;
  const tableRows = filtered;

  const handleRefresh = () => {
    void loadApiDocuments();
  };

  const openDocumentViewer = (doc: Doc, viewTab: DocumentViewMode = "file") => {
    setDocModal({ mode: "view", doc, viewTab });
  };

  const confirmDeleteDoc = async () => {
    if (!deleteDoc) return;

    setDeleting(true);
    try {
      await deleteDocumentApi(deleteDoc.id);
      await loadApiDocuments();
      toast.success("Đã xóa tài liệu");
      setDeleteDoc(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Xóa thất bại");
    } finally {
      setDeleting(false);
    }
  };

  const openUpload = () => {
    setDocModal({ mode: "create", doc: null });
  };

  const openEdit = (doc: Doc) => {
    setDocModal({ mode: "edit", doc });
  };

  return (
    <AppShell mainClassName="px-32 py-10">
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Quản lý tài liệu</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Quản lý môn học và tài liệu theo từng môn.
            </p>
          </div>
          <Button className="gap-2" onClick={openUpload} disabled={subjects.length === 0}>
            <Upload className="h-4 w-4" />
            Thêm tài liệu
          </Button>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Môn học</h2>
          </div>
          <Table className="[&_th]:px-4 [&_th]:py-2.5 [&_td]:px-4 [&_td]:py-3">
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                <TableHead className="w-28">Mã</TableHead>
                <TableHead>Tên môn</TableHead>
                <TableHead className="text-right">Tài liệu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjectsLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    Đang tải môn học...
                  </TableCell>
                </TableRow>
              )}
              {!subjectsLoading && displayCourses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    Chưa có môn học.
                  </TableCell>
                </TableRow>
              )}
              {displayCourses.map((c) => {
                const count = allDocuments.filter((d) => d.course === c.code).length;
                const active = selectedCourse === c.code;
                return (
                  <TableRow
                    key={c.code}
                    className={cn(
                      "cursor-pointer",
                      active && "bg-primary/5",
                    )}
                    onClick={() => {
                      setSelectedCourse(c.code);
                      setQueryInput("");
                      setSearchKeyword("");
                      setPage(0);
                    }}
                  >
                    <TableCell className="font-mono text-sm font-medium">{c.code}</TableCell>
                    <TableCell className="text-sm">{c.name}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{count}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-semibold">
                {selectedCourse
                  ? `Tài liệu — ${labelOf(selectedCourse)}`
                  : "Tài liệu"}
              </h2>
              {selectedCourse && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  ({displayTotalElements})
                </span>
              )}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="relative w-80 sm:w-96">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  placeholder="Tìm theo tên và nội dung tài liệu"
                  className="h-8 pl-8 text-xs"
                  disabled={!selectedCourse}
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 shrink-0 px-3 text-xs"
                onClick={handleSearch}
                disabled={!selectedCourse}
              >
                Tìm
              </Button>
              <TooltipProvider delayDuration={200}>
                {viewMode === "table" && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          disabled={!selectedCourse}
                        >
                          <Columns2 className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">Hiển thị cột</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {columnOptions.map(({ key, label }) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={Boolean(columnVisibility[key as keyof typeof columnVisibility])}
                        onCheckedChange={(checked) => {
                          setApiColumns((prev) => ({
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
                )}
                <DocumentsViewToggle
                  value={viewMode}
                  onChange={setViewMode}
                  disabled={!selectedCourse}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={handleRefresh}
                      disabled={!selectedCourse || docsLoading}
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", docsLoading && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Tải lại danh sách</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {viewMode === "cards" ? (
            <DocumentsCardGrid
              rows={tableRows}
              page={page}
              loading={docsLoading}
              selectedCourse={selectedCourse}
              onView={(doc) => openDocumentViewer(doc, "file")}
              onEdit={openEdit}
              onDelete={setDeleteDoc}
              emptyMessage="Chưa có tài liệu — bấm Thêm tài liệu để upload."
            />
          ) : (
          <TooltipProvider delayDuration={0}>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead className={cn(TABLE_HEAD_LABEL, "w-12 text-center")}>STT</TableHead>
                  <SortableTableHead
                    label="Tài liệu"
                    field="title"
                    activeField={sortBy}
                    direction={sortDir}
                    onSort={handleSort}
                    className="w-[30%]"
                  />
                  {apiColumns.documentType && (
                    <FilterTableHead
                      label="Loại"
                      filterValue={documentTypeFilter}
                      onFilterChange={(v) => {
                        setPage(0);
                        setDocumentTypeFilter(v as ApiDocumentType | "all");
                      }}
                      filterOptions={DOCUMENT_TYPE_OPTIONS}
                      field="documentType"
                      activeField={sortBy}
                      direction={sortDir}
                      onSort={handleSort}
                      className={FILTER_COL_WIDTH.documentType}
                      disabled={!selectedCourse}
                    />
                  )}
                  {apiColumns.description && (
                    <TableHead className={cn(TABLE_HEAD_LABEL, "w-36 max-w-36")}>Mô tả</TableHead>
                  )}
                  {columnVisibility.status && (
                    <FilterTableHead
                      label="Trạng thái"
                      filterValue={statusFilter}
                      onFilterChange={(v) => {
                        setPage(0);
                        setStatusFilter(v as ApiDocumentStatus | "all");
                      }}
                      filterOptions={DOCUMENT_STATUS_OPTIONS}
                      field="status"
                      activeField={sortBy}
                      direction={sortDir}
                      onSort={handleSort}
                      className={FILTER_COL_WIDTH.status}
                      disabled={!selectedCourse}
                    />
                  )}
                  {apiColumns.active && (
                    <FilterTableHead
                      label="Kích hoạt"
                      filterValue={activeFilter}
                      onFilterChange={(v) => {
                        setPage(0);
                        setActiveFilter(v as ActiveFilter);
                      }}
                      filterOptions={ACTIVE_FILTER_OPTIONS}
                      className={FILTER_COL_WIDTH.active}
                      disabled={!selectedCourse}
                    />
                  )}
                  {columnVisibility.size && (
                    <TableHead className={cn(TABLE_HEAD_LABEL, "w-28 text-right")}>Kích thước</TableHead>
                  )}
                  {apiColumns.createdAt && (
                    <SortableTableHead
                      label="Ngày tạo"
                      field="createdAt"
                      activeField={sortBy}
                      direction={sortDir}
                      onSort={handleSort}
                      className="w-36"
                    />
                  )}
                  {apiColumns.updatedAt && (
                    <SortableTableHead
                      label="Cập nhật"
                      field="updatedAt"
                      activeField={sortBy}
                      direction={sortDir}
                      onSort={handleSort}
                      className="w-36"
                    />
                  )}
                  <TableHead className={cn(TABLE_HEAD_LABEL, "w-20 text-center")}>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody
                className={cn(
                  docsLoading && tableRows.length > 0 && "pointer-events-none opacity-50",
                )}
              >
                {!selectedCourse && (
                  <TableRow>
                    <TableCell
                      colSpan={tableColSpan}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Chọn một môn ở bảng trên để xem tài liệu.
                    </TableCell>
                  </TableRow>
                )}
                {selectedCourse && docsLoading && tableRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={tableColSpan} className="py-10 text-center text-sm text-muted-foreground">
                      Đang tải tài liệu...
                    </TableCell>
                  </TableRow>
                )}
                {selectedCourse && !docsLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={tableColSpan}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có tài liệu — bấm Thêm tài liệu để upload.
                    </TableCell>
                  </TableRow>
                )}
                {!(docsLoading && tableRows.length === 0) && tableRows.map((d, index) => {
                  const s = statusStyles[d.status];
                  const docType = documentTypeStyle(d.type);
                  const a = d.active === false ? activeStyles.inactive : activeStyles.active;
                  const isInactive = d.active === false;
                  const rowNumber = page * DEFAULT_DOCUMENT_PAGE_SIZE + index + 1;
                  return (
                    <TableRow
                      key={d.id}
                      className={cn(isInactive && "opacity-50")}
                    >
                      <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
                        {rowNumber}
                      </TableCell>
                      <TableCell>
                        <div className="truncate text-sm font-medium">{d.name}</div>
                      </TableCell>
                      {apiColumns.documentType && (
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-[11px] font-semibold uppercase",
                              docType.className,
                            )}
                          >
                            {docType.label}
                          </Badge>
                        </TableCell>
                      )}
                      {apiColumns.description && (
                        <TableCell className="w-36 max-w-36 text-sm text-muted-foreground">
                          {d.description?.trim() ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block cursor-default truncate">
                                  {d.description.trim()}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap">
                                {d.description.trim()}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.status && (
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("gap-1.5 font-normal", s.className)}>
                            {s.label}
                          </Badge>
                        </TableCell>
                      )}
                      {apiColumns.active && (
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("gap-1.5 font-normal", a.className)}>
                            {a.label}
                          </Badge>
                        </TableCell>
                      )}
                      {columnVisibility.size && (
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {d.size}
                        </TableCell>
                      )}
                      {apiColumns.createdAt && (
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {d.createdAt
                            ? formatDateTimeDMY(d.createdAt)
                            : formatDateDMY(d.uploadedAt)}
                        </TableCell>
                      )}
                      {apiColumns.updatedAt && (
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {d.updatedAt ? formatDateTimeDMY(d.updatedAt) : "—"}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openDocumentViewer(d, "file")}
                            title="Xem tài liệu"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(d)}
                            title="Sửa"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteDoc(d)}
                            title="Xoá"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TooltipProvider>
          )}
          {selectedCourse && displayTotalPages > 1 && (
            <TablePagination
              page={page}
              totalPages={displayTotalPages}
              onPageChange={setPage}
              disabled={docsLoading}
            />
          )}
        </Card>
      </div>

      <Suspense fallback={null}>
        <DocumentModal
          mode={docModal?.mode ?? null}
          document={docModal?.doc ?? null}
          initialViewMode={docModal?.viewTab ?? "file"}
          open={!!docModal}
          onOpenChange={(open) => !open && setDocModal(null)}
          onDocumentsChange={loadApiDocuments}
          courseLabel={labelOf}
          subjects={subjects}
          defaultSubjectId={selectedSubjectId}
        />
      </Suspense>

      <Modal open={!!deleteDoc} onOpenChange={(open) => !open && !deleting && setDeleteDoc(null)}>
        <ModalContent className="sm:max-w-md">
          <ModalHeader>
            <ModalTitle>Xóa tài liệu</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa{" "}
            <span className="font-medium text-foreground">{deleteDoc?.name}</span>? Hành động này
            không thể hoàn tác.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteDoc(null)} disabled={deleting}>
              Huỷ
            </Button>
            <Button variant="destructive" onClick={confirmDeleteDoc} disabled={deleting}>
              {deleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </AppShell>
  );
}
