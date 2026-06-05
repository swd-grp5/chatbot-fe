import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  Upload,
  FileText,
  MoreHorizontal,
  Trash2,
  FileSpreadsheet,
  Presentation,
  FileType,
  Pencil,
  Plus,
  RefreshCw,
  Layers,
} from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  type DocStatus,
  type Doc,
  courseLabel,
  normalizeCourseCode,
} from "@/shared/lib/mock-data";
import {
  type ApiDocumentStatus,
  type DocumentChunkResponse,
  apiStatusToDocStatus,
  deleteDocument as deleteDocumentApi,
  DOCUMENT_STATUS_OPTIONS,
  fetchDocumentChunks,
  fetchDocuments,
  isAllowedUploadFile,
  mapDocumentResponse,
  toggleDocumentActive,
  uploadDocument,
} from "@/features/lecturer/api/document-api";
import { useAuth } from "@/features/auth/lib/auth-context";
import { getApiToken } from "@/features/auth/lib/auth-session";
import { useAppStore } from "@/features/student/lib/store";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateDMY } from "@/shared/lib/format-time";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";

const statusStyles: Record<DocStatus, { label: string; className: string; dot: string }> = {
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

const typeIcons = {
  pdf: { icon: FileText, color: "text-red-600 bg-red-50" },
  docx: { icon: FileType, color: "text-blue-600 bg-blue-50" },
  pptx: { icon: Presentation, color: "text-orange-600 bg-orange-50" },
  xlsx: { icon: FileSpreadsheet, color: "text-green-600 bg-green-50" },
  txt: { icon: FileText, color: "text-gray-600 bg-gray-50" },
};

const guessType = (filename: string): Doc["type"] => {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf" || ext === "docx" || ext === "pptx" || ext === "xlsx" || ext === "txt")
    return ext;
  return "pdf";
};

type CourseFormMode = { type: "add" } | { type: "edit"; code: string };

const API_DEFAULT_COURSE = { code: "SWD", name: "SWD" };

export function LecturerDocumentsPage() {
  const { user } = useAuth();
  const isApiMode = user?.source === "api";

  const courses = useAppStore((s) => s.courses);
  const documents = useAppStore((s) => s.documents);
  const addCourse = useAppStore((s) => s.addCourse);
  const updateCourse = useAppStore((s) => s.updateCourse);
  const deleteCourse = useAppStore((s) => s.deleteCourse);
  const addDocument = useAppStore((s) => s.addDocument);
  const deleteDocument = useAppStore((s) => s.deleteDocument);
  const updateDocument = useAppStore((s) => s.updateDocument);
  const init = useAppStore((s) => s.init);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApiDocumentStatus | "all">("all");
  const [editDoc, setEditDoc] = useState<Doc | null>(null);
  const [editName, setEditName] = useState("");
  const [courseForm, setCourseForm] = useState<CourseFormMode | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCourse, setUploadCourse] = useState("");
  const [apiDocuments, setApiDocuments] = useState<Doc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<Doc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [chunksDoc, setChunksDoc] = useState<Doc | null>(null);
  const [chunks, setChunks] = useState<DocumentChunkResponse[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tableColSpan = isApiMode ? 6 : 5;

  const displayCourses = isApiMode ? [API_DEFAULT_COURSE] : courses;
  const allDocuments = isApiMode ? apiDocuments : documents;
  const labelOf = (code: string) => courseLabel(code, displayCourses);

  const loadApiDocuments = useCallback(async () => {
    const token = getApiToken();
    if (!token) return;
    setDocsLoading(true);
    try {
      const res = await fetchDocuments(token, {
        keyword: query,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setApiDocuments(res.content.map(mapDocumentResponse));
      setSelectedCourse("SWD");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Không tải được danh sách tài liệu");
    } finally {
      setDocsLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!isApiMode) return;
    const timer = setTimeout(() => loadApiDocuments(), 300);
    return () => clearTimeout(timer);
  }, [isApiMode, loadApiDocuments]);

  useEffect(() => {
    if (isApiMode) return;
    if (courses.length === 0) {
      setSelectedCourse("");
      return;
    }
    if (selectedCourse && !courses.some((c) => c.code === selectedCourse)) {
      setSelectedCourse("");
    }
  }, [isApiMode, courses, selectedCourse]);

  const openAddCourse = () => {
    setCourseForm({ type: "add" });
    setFormCode("");
    setFormName("");
  };

  const openEditCourse = (code: string) => {
    const c = courses.find((x) => x.code === code);
    if (!c) return;
    setCourseForm({ type: "edit", code });
    setFormCode(c.code);
    setFormName(c.name);
  };

  const saveCourseForm = () => {
    const code = normalizeCourseCode(formCode);
    const name = formName.trim();
    if (!code || !name) {
      toast.error("Mã môn và tên môn không được để trống");
      return;
    }

    if (courseForm?.type === "add") {
      if (!addCourse({ code, name })) {
        toast.error("Mã môn đã tồn tại");
        return;
      }
      setSelectedCourse(code);
      toast.success("Đã thêm môn học");
    } else if (courseForm?.type === "edit") {
      if (!updateCourse(courseForm.code, { code, name })) {
        toast.error("Không cập nhật được — kiểm tra mã môn trùng");
        return;
      }
      if (selectedCourse === courseForm.code && code !== courseForm.code) {
        setSelectedCourse(code);
      }
      toast.success("Đã cập nhật môn học");
    }
    setCourseForm(null);
  };

  const removeCourse = (code: string) => {
    const result = deleteCourse(code);
    if (!result.ok) {
      toast.error(`Không xóa được — môn còn ${result.docCount} tài liệu`);
      return;
    }
    toast.success("Đã xóa môn học");
  };

  const courseDocs = selectedCourse
    ? allDocuments.filter((d) => d.course === selectedCourse)
    : [];
  const filtered = isApiMode
    ? courseDocs
    : courseDocs.filter((d) => {
      if (query && !d.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (statusFilter !== "all" && d.status !== apiStatusToDocStatus[statusFilter]) return false;
      return true;
    });

  const handleRefresh = () => {
    if (!isApiMode) return;
    void loadApiDocuments();
  };

  const openChunks = async (doc: Doc) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Phiên đăng nhập hết hạn");
      return;
    }
    setChunksDoc(doc);
    setChunks([]);
    setChunksLoading(true);
    try {
      const data = await fetchDocumentChunks(doc.id, token);
      setChunks(data.sort((a, b) => a.chunkIndex - b.chunkIndex));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Không tải được nội dung index");
      setChunksDoc(null);
    } finally {
      setChunksLoading(false);
    }
  };

  const handleToggleActive = async (doc: Doc) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Phiên đăng nhập hết hạn");
      return;
    }
    setTogglingId(doc.id);
    try {
      const updated = await toggleDocumentActive(doc.id, token);
      const mapped = mapDocumentResponse(updated);
      setApiDocuments((prev) => prev.map((d) => (d.id === doc.id ? mapped : d)));
      toast.success(mapped.active ? "Tài liệu đang bật" : "Tài liệu đã tắt");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Không đổi được trạng thái");
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDeleteDoc = async () => {
    if (!deleteDoc) return;

    if (isApiMode) {
      const token = getApiToken();
      if (!token) {
        toast.error("Phiên đăng nhập hết hạn");
        return;
      }
      setDeleting(true);
      try {
        await deleteDocumentApi(deleteDoc.id, token);
        await loadApiDocuments();
        toast.success("Đã xóa tài liệu");
        setDeleteDoc(null);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Xóa thất bại");
      } finally {
        setDeleting(false);
      }
      return;
    }

    deleteDocument(deleteDoc.id);
    toast.success("Đã xóa tài liệu");
    setDeleteDoc(null);
  };

  const openUpload = () => {
    if (isApiMode) {
      fileInputRef.current?.click();
      return;
    }
    if (courses.length === 0) {
      toast.error("Thêm môn học trước khi tải tài liệu");
      return;
    }
    setUploadCourse(selectedCourse || courses[0].code);
    setUploadOpen(true);
  };

  const confirmUploadPick = () => {
    if (!uploadCourse) {
      toast.error("Chọn môn học để thêm tài liệu");
      return;
    }
    fileInputRef.current?.click();
  };

  const openEdit = (doc: Doc) => {
    setEditDoc(doc);
    setEditName(doc.name);
  };

  const saveEdit = () => {
    if (!editDoc) return;
    const name = editName.trim();
    if (!name) {
      toast.error("Tên tài liệu không được để trống");
      return;
    }
    updateDocument(editDoc.id, { name });
    toast.success("Đã cập nhật tài liệu");
    setEditDoc(null);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    if (isApiMode) {
      const token = getApiToken();
      if (!token) {
        toast.error("Phiên đăng nhập hết hạn");
        return;
      }

      const picked = Array.from(files);
      const invalid = picked.filter((f) => !isAllowedUploadFile(f));
      if (invalid.length) {
        toast.error("Chỉ hỗ trợ PDF, DOCX, TXT");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setUploading(true);
      try {
        for (const file of picked) {
          await uploadDocument(file, token);
        }
        await loadApiDocuments();
        toast.success(`Đã tải lên ${picked.length} tài liệu`);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Upload thất bại");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      return;
    }

    if (!uploadCourse) return;
    for (const f of Array.from(files)) {
      const sizeMb = f.size / (1024 * 1024);
      const size = sizeMb < 1 ? `${Math.round(f.size / 1024)} KB` : `${sizeMb.toFixed(1)} MB`;

      const doc = addDocument({
        name: f.name,
        type: guessType(f.name),
        course: uploadCourse,
        size,
        status: "processing",
        chunks: 0,
        uploadedAt: new Date().toISOString().slice(0, 10),
      });

      setTimeout(() => {
        updateDocument(doc.id, { status: "indexed", chunks: Math.floor(40 + Math.random() * 200) });
      }, 1500);
    }
    setSelectedCourse(uploadCourse);
    setUploadOpen(false);
    toast.success(`Đã thêm ${files.length} tài liệu vào ${labelOf(uploadCourse)}`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <AppShell>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Quản lý tài liệu</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Quản lý môn học và tài liệu theo từng môn.
            </p>
          </div>
          <Button className="gap-2" onClick={openUpload} disabled={uploading}>
            <Upload className="h-4 w-4" />
            {uploading ? "Đang tải lên..." : "Thêm tài liệu"}
          </Button>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Môn học</h2>
            {!isApiMode && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={openAddCourse}>
                <Plus className="h-3.5 w-3.5" />
                Thêm môn
              </Button>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                <TableHead className="w-28">Mã</TableHead>
                <TableHead>Tên môn</TableHead>
                <TableHead className="text-right">Tài liệu</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayCourses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Chưa có môn học — bấm Thêm môn để bắt đầu.
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
                      setQuery("");
                    }}
                  >
                    <TableCell className="font-mono text-sm font-medium">{c.code}</TableCell>
                    <TableCell className="text-sm">{c.name}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{count}</TableCell>
                    {!isApiMode && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditCourse(c.code)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => removeCourse(c.code)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Xoá
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                    {isApiMode && <TableCell />}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">
              {selectedCourse
                ? `Tài liệu — ${labelOf(selectedCourse)}`
                : "Tài liệu"}
            </h2>
            {selectedCourse && (
              <span className="text-xs text-muted-foreground">({courseDocs.length})</span>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {isApiMode && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={handleRefresh}
                  disabled={!selectedCourse || docsLoading}
                  title="Tải lại danh sách"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", docsLoading && "animate-spin")} />
                  Tải lại
                </Button>
              )}
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as ApiDocumentStatus | "all")}
                disabled={!selectedCourse}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {DOCUMENT_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm tài liệu..."
                  className="h-8 pl-8 text-xs"
                  disabled={!selectedCourse}
                />
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                <TableHead className="w-[40%]">Tài liệu</TableHead>
                <TableHead>Trạng thái</TableHead>
                {isApiMode && <TableHead className="w-20 text-center">Kích hoạt</TableHead>}
                <TableHead className="text-right">Kích thước</TableHead>
                <TableHead>Ngày thêm</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
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
              {selectedCourse && docsLoading && (
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
              {filtered.map((d) => {
                const t = typeIcons[d.type];
                const s = statusStyles[d.status];
                const Icon = t.icon;
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md",
                            t.color,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{d.name}</div>
                          <div className="text-[11px] uppercase text-muted-foreground">
                            {d.type}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("gap-1.5 font-normal", s.className)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                        {s.label}
                      </Badge>
                    </TableCell>
                    {isApiMode && (
                      <TableCell className="w-20 text-center">
                        <Switch
                          checked={d.active ?? true}
                          disabled={togglingId === d.id}
                          onCheckedChange={() => handleToggleActive(d)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {d.size}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateDMY(d.uploadedAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isApiMode && (
                            <DropdownMenuItem onClick={() => openChunks(d)}>
                              <Layers className="mr-2 h-3.5 w-3.5" />
                              Xem nội dung index
                              {d.chunks > 0 && (
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {d.chunks}
                                </span>
                              )}
                            </DropdownMenuItem>
                          )}
                          {!isApiMode && (
                            <DropdownMenuItem onClick={() => openEdit(d)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Sửa
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteDoc(d)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Xoá
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog
        open={!!chunksDoc}
        onOpenChange={(open) => !open && !chunksLoading && setChunksDoc(null)}
      >
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="truncate pr-6">Nội dung đã index</DialogTitle>
            <DialogDescription className="truncate">
              {chunksDoc?.name}
              {chunks.length > 0 && ` · ${chunks.length} đoạn`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {chunksLoading && (
              <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
            )}
            {!chunksLoading && chunks.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Chưa có nội dung index — tài liệu có thể đang xử lý.
              </p>
            )}
            {!chunksLoading &&
              chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="mb-4 rounded-lg border border-border bg-secondary/30 last:mb-0"
                >
                  <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                    <span className="text-xs font-medium">
                      Đoạn {chunk.chunkIndex + 1}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {chunk.tokenCount} tokens
                    </Badge>
                    {chunk.pageStart != null && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        Trang {chunk.pageStart}
                        {chunk.pageEnd != null && chunk.pageEnd !== chunk.pageStart
                          ? `–${chunk.pageEnd}`
                          : ""}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      ký tự {chunk.startCharIndex}–{chunk.endCharIndex}
                    </span>
                  </div>
                  <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words p-3 font-sans text-xs leading-relaxed text-foreground">
                    {chunk.content}
                  </pre>
                </div>
              ))}
          </div>
          <DialogFooter className="border-t border-border px-6 py-3">
            <Button variant="outline" onClick={() => setChunksDoc(null)} disabled={chunksLoading}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm tài liệu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Môn học *</Label>
              <Select value={uploadCourse || undefined} onValueChange={setUploadCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn môn học" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              PDF · DOCX · TXT
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Huỷ
            </Button>
            <Button className="gap-2" onClick={confirmUploadPick}>
              <Upload className="h-4 w-4" />
              Chọn file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!courseForm} onOpenChange={(open) => !open && setCourseForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{courseForm?.type === "add" ? "Thêm môn học" : "Sửa môn học"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="course-code">Mã môn</Label>
              <Input
                id="course-code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="VD: SDN302"
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-name">Tên môn</Label>
              <Input
                id="course-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="VD: Server-Side development with NodeJS, Express, and MongoDB"
              />
            </div>
            {courseForm?.type === "edit" && (
              <p className="text-xs text-muted-foreground">
                Đổi mã môn sẽ cập nhật tất cả tài liệu thuộc môn này.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseForm(null)}>
              Huỷ
            </Button>
            <Button onClick={saveCourseForm}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDoc} onOpenChange={(open) => !open && !deleting && setDeleteDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa tài liệu</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa{" "}
            <span className="font-medium text-foreground">{deleteDoc?.name}</span>? Hành động này
            không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDoc(null)} disabled={deleting}>
              Huỷ
            </Button>
            <Button variant="destructive" onClick={confirmDeleteDoc} disabled={deleting}>
              {deleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDoc} onOpenChange={(open) => !open && setEditDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sửa tài liệu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-name">Tên tài liệu</Label>
              <Input
                id="doc-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            {editDoc && (
              <p className="text-xs text-muted-foreground">
                Môn: {labelOf(editDoc.course)} ({editDoc.course})
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDoc(null)}>
              Huỷ
            </Button>
            <Button onClick={saveEdit}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
