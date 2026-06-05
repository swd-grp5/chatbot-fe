import { useCallback, useEffect, useState } from "react";
import {
  Search,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileType,
  Eye,
  Lock,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { type Doc, courseLabel } from "@/shared/lib/mock-data";
import {
  type DocumentChunkResponse,
  fetchDocumentChunks,
  fetchDocuments,
  mapDocumentResponse,
} from "@/features/lecturer/api/document-api";
import { useAuth } from "@/features/auth/lib/auth-context";
import { getApiToken } from "@/features/auth/lib/auth-session";
import { useAppStore } from "@/features/student/lib/store";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateDMY } from "@/shared/lib/format-time";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";

const typeIcons = {
  pdf: { icon: FileText, color: "text-red-600 bg-red-50" },
  docx: { icon: FileType, color: "text-blue-600 bg-blue-50" },
  pptx: { icon: Presentation, color: "text-orange-600 bg-orange-50" },
  xlsx: { icon: FileSpreadsheet, color: "text-green-600 bg-green-50" },
  txt: { icon: FileText, color: "text-gray-600 bg-gray-50" },
};

const API_DEFAULT_COURSE = { code: "SWD", name: "SWD" };

const mockPreview = (doc: Doc, subject: string) =>
  [
    `Đây là bản xem trước demo của **${doc.name}**.`,
    `Môn: **${subject}**`,
    "",
    "Trong môi trường thật, nội dung tài liệu sẽ được hiển thị tại đây (PDF, slide, v.v.). Sinh viên chỉ được xem — không tải xuống, chỉnh sửa hay xóa.",
  ].join("\n");

export function StudentDocumentsPage() {
  const { user } = useAuth();
  const isApiMode = user?.source === "api";

  const documents = useAppStore((s) => s.documents);
  const courses = useAppStore((s) => s.courses);
  const init = useAppStore((s) => s.init);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [query, setQuery] = useState("");
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);
  const [apiDocuments, setApiDocuments] = useState<Doc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [chunks, setChunks] = useState<DocumentChunkResponse[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);

  const displayCourses = isApiMode ? [API_DEFAULT_COURSE] : courses;
  const allDocuments = isApiMode ? apiDocuments : documents;

  const loadApiDocuments = useCallback(async () => {
    const token = getApiToken();
    if (!token) return;
    setDocsLoading(true);
    try {
      const res = await fetchDocuments(token, { keyword: query, active: true });
      setApiDocuments(res.content.map(mapDocumentResponse));
      setSelectedCourse("SWD");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Không tải được danh sách tài liệu");
    } finally {
      setDocsLoading(false);
    }
  }, [query]);

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

  const courseDocs = selectedCourse
    ? allDocuments.filter((d) => d.course === selectedCourse)
    : [];
  const filtered = isApiMode
    ? courseDocs
    : courseDocs.filter(
        (d) => !query || d.name.toLowerCase().includes(query.toLowerCase()),
      );

  const openViewer = async (doc: Doc) => {
    if (doc.status !== "indexed") {
      toast.info("Tài liệu chưa sẵn sàng để xem");
      return;
    }

    setViewDoc(doc);

    if (!isApiMode) return;

    const token = getApiToken();
    if (!token) return;

    setChunks([]);
    setChunksLoading(true);
    try {
      const data = await fetchDocumentChunks(doc.id, token);
      setChunks(data.sort((a, b) => a.chunkIndex - b.chunkIndex));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Không tải được nội dung");
      setViewDoc(null);
    } finally {
      setChunksLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tài liệu học tập</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn môn để xem tài liệu. Chế độ chỉ đọc — không thể thêm, sửa hay xóa.
          </p>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Môn học</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                <TableHead className="w-28">Mã</TableHead>
                <TableHead>Tên môn</TableHead>
                <TableHead className="text-right">Tài liệu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayCourses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    Chưa có môn học nào.
                  </TableCell>
                </TableRow>
              )}
              {displayCourses.map((c) => {
                const count = allDocuments.filter((d) => d.course === c.code).length;
                const ready = allDocuments.filter(
                  (d) => d.course === c.code && d.status === "indexed",
                ).length;
                const active = selectedCourse === c.code;
                return (
                  <TableRow
                    key={c.code}
                    className={cn("cursor-pointer", active && "bg-primary/5")}
                    onClick={() => {
                      setSelectedCourse(c.code);
                      setQuery("");
                    }}
                  >
                    <TableCell className="font-mono text-sm font-medium">{c.code}</TableCell>
                    <TableCell className="text-sm">{c.name}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {ready}/{count} sẵn sàng
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
                ? `Tài liệu — ${courseLabel(selectedCourse, displayCourses)}`
                : "Tài liệu"}
            </h2>
            <div className="ml-auto flex items-center gap-2">
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
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                Chỉ xem
              </span>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                <TableHead className="w-[55%]">Tài liệu</TableHead>
                <TableHead className="text-right">Kích thước</TableHead>
                <TableHead>Ngày thêm</TableHead>
                <TableHead className="w-24 text-right">Xem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedCourse && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Chọn một môn ở bảng trên để xem tài liệu.
                  </TableCell>
                </TableRow>
              )}
              {selectedCourse && docsLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Đang tải tài liệu...
                  </TableCell>
                </TableRow>
              )}
              {selectedCourse && !docsLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Chưa có tài liệu trong môn này.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((d) => {
                const t = typeIcons[d.type];
                const Icon = t.icon;
                const canView = d.status === "indexed";
                return (
                  <TableRow
                    key={d.id}
                    className={cn(canView && "cursor-pointer hover:bg-secondary/30")}
                    onClick={() => canView && void openViewer(d)}
                  >
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
                            {!canView && (
                              <span className="ml-2 normal-case text-info">· Chưa sẵn sàng</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {d.size}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateDMY(d.uploadedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canView ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-success/20 bg-success/10 font-normal text-success"
                        >
                          <Eye className="h-3 w-3" />
                          Xem
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                          Chờ xử lý
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog
        open={!!viewDoc}
        onOpenChange={(open) => {
          if (!open && !chunksLoading) {
            setViewDoc(null);
            setChunks([]);
          }
        }}
      >
        {isApiMode ? (
          <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
            <DialogHeader className="border-b border-border px-6 py-4">
              <DialogTitle className="truncate pr-6">Nội dung đã index</DialogTitle>
              <DialogDescription className="truncate">
                {viewDoc?.name}
                {chunks.length > 0 && ` · ${chunks.length} chunks`}
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
                        Chunk {chunk.chunkIndex + 1}
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
              <Button
                variant="outline"
                onClick={() => setViewDoc(null)}
                disabled={chunksLoading}
              >
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : (
          <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 p-0 sm:max-w-3xl">
            {viewDoc && (
              <>
                <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-12 text-left">
                  <DialogTitle className="truncate pr-2">{viewDoc.name}</DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{viewDoc.course}</span>
                    <span className="text-muted-foreground">
                      {courseLabel(viewDoc.course, displayCourses)}
                    </span>
                    <span className="text-muted-foreground">· {viewDoc.size}</span>
                    <Badge variant="outline" className="h-5 text-[10px] font-normal">
                      Chỉ xem
                    </Badge>
                  </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 select-text">
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {mockPreview(viewDoc, courseLabel(viewDoc.course, displayCourses))}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        )}
      </Dialog>
    </AppShell>
  );
}
