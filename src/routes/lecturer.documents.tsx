import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type DocStatus,
  type Doc,
  courseLabel,
  normalizeCourseCode,
} from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/lecturer/documents")({ component: LecturerDocumentsPage });

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

function LecturerDocumentsPage() {
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
  const [editDoc, setEditDoc] = useState<Doc | null>(null);
  const [editName, setEditName] = useState("");
  const [courseForm, setCourseForm] = useState<CourseFormMode | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCourse, setUploadCourse] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const labelOf = (code: string) => courseLabel(code, courses);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (courses.length === 0) {
      setSelectedCourse("");
      return;
    }
    if (selectedCourse && !courses.some((c) => c.code === selectedCourse)) {
      setSelectedCourse("");
    }
  }, [courses, selectedCourse]);

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
    ? documents.filter((d) => d.course === selectedCourse)
    : [];
  const filtered = courseDocs.filter(
    (d) => !query || d.name.toLowerCase().includes(query.toLowerCase()),
  );

  const openUpload = () => {
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

  const handleFiles = (files: FileList | null) => {
    if (!files || !uploadCourse) return;
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
        accept=".pdf,.docx,.pptx,.xlsx,.txt"
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
          <Button className="gap-2" onClick={openUpload}>
            <Upload className="h-4 w-4" />
            Thêm tài liệu
          </Button>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Môn học</h2>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={openAddCourse}>
              <Plus className="h-3.5 w-3.5" />
              Thêm môn
            </Button>
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
              {courses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Chưa có môn học — bấm Thêm môn để bắt đầu.
                  </TableCell>
                </TableRow>
              )}
              {courses.map((c) => {
                const count = documents.filter((d) => d.course === c.code).length;
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
                <TableHead className="text-right">Kích thước</TableHead>
                <TableHead>Ngày thêm</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedCourse && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Chọn một môn ở bảng trên để xem tài liệu.
                  </TableCell>
                </TableRow>
              )}
              {selectedCourse && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Chưa có tài liệu — bấm Thêm tài liệu và chọn môn.
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
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {d.size}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.uploadedAt}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(d)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              deleteDocument(d.id);
                              toast.success("Đã xóa tài liệu");
                            }}
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
              PDF · DOCX · PPTX · XLSX · TXT
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
