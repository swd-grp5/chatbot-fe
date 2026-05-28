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
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type DocStatus, type Doc } from "@/lib/mock-data";
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

function LecturerDocumentsPage() {
  const documents = useAppStore((s) => s.documents);
  const addDocument = useAppStore((s) => s.addDocument);
  const deleteDocument = useAppStore((s) => s.deleteDocument);
  const updateDocument = useAppStore((s) => s.updateDocument);
  const init = useAppStore((s) => s.init);
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    init();
  }, [init]);

  const filtered = documents.filter(
    (d) => !query || d.name.toLowerCase().includes(query.toLowerCase()),
  );

  const readyCount = documents.filter((d) => d.status === "indexed").length;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const sizeMb = f.size / (1024 * 1024);
      const size = sizeMb < 1 ? `${Math.round(f.size / 1024)} KB` : `${sizeMb.toFixed(1)} MB`;

      const doc = addDocument({
        name: f.name,
        type: guessType(f.name),
        course: "",
        chapter: "",
        size,
        status: "processing",
        chunks: 0,
        uploadedAt: new Date().toISOString().slice(0, 10),
      });

      setTimeout(() => {
        updateDocument(doc.id, { status: "indexed", chunks: Math.floor(40 + Math.random() * 200) });
      }, 1500);
    }
    toast.success(`Đã thêm ${files.length} tài liệu`);
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Quản lý tài liệu</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Thêm hoặc xóa tài liệu — sinh viên sẽ thấy cập nhật ngay trên trang Tài liệu.
            </p>
          </div>
          <Button className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Thêm tài liệu
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Tổng tài liệu" value={documents.length} />
          <StatCard label="Sẵn sàng" value={`${readyCount}/${documents.length}`} />
          <StatCard
            label="Đang xử lý"
            value={documents.filter((d) => d.status === "processing").length}
          />
        </div>

        <Card
          className="cursor-pointer border-dashed bg-card p-6 transition-colors hover:bg-secondary/40"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">
                Kéo thả tài liệu vào đây, hoặc bấm để chọn file
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                PDF · DOCX · PPTX · XLSX · TXT
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm tài liệu..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="ml-auto text-xs text-muted-foreground">{filtered.length} kết quả</div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                <TableHead className="w-[45%]">Tài liệu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Kích thước</TableHead>
                <TableHead>Ngày thêm</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Chưa có tài liệu nào — bấm Thêm tài liệu để bắt đầu.
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
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}
