import { BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import type { SubjectOption } from "@/features/lecturer/api/subject-api";
import { cn } from "@/shared/lib/utils";

type DocumentsSubjectGridProps = {
  subjects: SubjectOption[];
  loading?: boolean;
  onSelect: (code: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
};

function documentCountLabel(count?: number) {
  if (count == null) return "— tài liệu";
  if (count === 0) return "Chưa có tài liệu";
  return `${count} tài liệu`;
}

export function DocumentsSubjectGrid({
  subjects,
  loading = false,
  onSelect,
  emptyTitle = "Chưa có môn học được gán",
  emptyDescription = "Liên hệ quản trị viên để được phép upload tài liệu cho môn học.",
}: DocumentsSubjectGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{emptyDescription}</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {subjects.map((subject) => (
        <button
          key={subject.id}
          type="button"
          onClick={() => onSelect(subject.code)}
          className={cn(
            "group flex w-full flex-col rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all",
            "hover:border-primary/30 hover:bg-primary/5 hover:shadow-md",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <Badge variant="secondary" className="font-mono text-xs font-semibold">
              {subject.code}
            </Badge>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
          <h3 className="mt-3 line-clamp-2 text-base font-semibold tracking-tight">{subject.name}</h3>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            {documentCountLabel(subject.totalDocuments)}
          </p>
        </button>
      ))}
    </div>
  );
}
