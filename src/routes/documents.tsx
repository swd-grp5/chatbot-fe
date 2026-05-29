import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileType,
  Eye,
  Lock,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Doc, courseLabel } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/documents")({ component: StudentDocumentsPage });

const typeIcons = {
  pdf: { icon: FileText, color: "text-red-600 bg-red-50" },
  docx: { icon: FileType, color: "text-blue-600 bg-blue-50" },
  pptx: { icon: Presentation, color: "text-orange-600 bg-orange-50" },
  xlsx: { icon: FileSpreadsheet, color: "text-green-600 bg-green-50" },
  txt: { icon: FileText, color: "text-gray-600 bg-gray-50" },
};

const mockPreview = (doc: Doc, subject: string) =>
  [
    `Đây là bản xem trước demo của **${doc.name}**.`,
    `Môn: **${subject}**`,
    "",
    "Trong môi trường thật, nội dung tài liệu sẽ được hiển thị tại đây (PDF, slide, v.v.). Sinh viên chỉ được xem — không tải xuống, chỉnh sửa hay xóa.",
    "",
    "Bạn có thể dùng trang Chat để đặt câu hỏi dựa trên tài liệu các môn SDN302, SWD392, SWP391, LAB211.",
  ].join("\n");

function StudentDocumentsPage() {
  const documents = useAppStore((s) => s.documents);
  const courses = useAppStore((s) => s.courses);
  const init = useAppStore((s) => s.init);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [query, setQuery] = useState("");
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);

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

  const courseDocs = selectedCourse
    ? documents.filter((d) => d.course === selectedCourse)
    : [];
  const filtered = courseDocs.filter(
    (d) => !query || d.name.toLowerCase().includes(query.toLowerCase()),
  );

  const openViewer = (doc: Doc) => {
    if (doc.status !== "indexed") {
      toast.info("Tài liệu chưa sẵn sàng để xem");
      return;
    }
    setViewDoc(doc);
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
              {courses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    Chưa có môn học nào.
                  </TableCell>
                </TableRow>
              )}
              {courses.map((c) => {
                const count = documents.filter((d) => d.course === c.code).length;
                const ready = documents.filter(
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
                ? `Tài liệu — ${courseLabel(selectedCourse, courses)}`
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
              {selectedCourse && filtered.length === 0 && (
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
                    onClick={() => canView && openViewer(d)}
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
                    <TableCell className="text-sm text-muted-foreground">{d.uploadedAt}</TableCell>
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

      <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 p-0 sm:max-w-3xl">
          {viewDoc && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-12 text-left">
                <DialogTitle className="truncate pr-2">{viewDoc.name}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{viewDoc.course}</span>
                  <span className="text-muted-foreground">
                    {courseLabel(viewDoc.course, courses)}
                  </span>
                  <span className="text-muted-foreground">· {viewDoc.size}</span>
                  <Badge variant="outline" className="h-5 text-[10px] font-normal">
                    Chỉ xem
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 select-text">
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {mockPreview(viewDoc, courseLabel(viewDoc.course, courses))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
