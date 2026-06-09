import { Eye, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DocumentPagePreview } from "@/features/lecturer/components/document-page-preview";
import {
  activeStyles,
  documentTypeStyle,
  statusStyles,
} from "@/features/lecturer/components/documents-table-ui";
import { DEFAULT_DOCUMENT_PAGE_SIZE } from "@/features/lecturer/api/document-api";
import { formatDateDMY, formatDateTimeDMY } from "@/shared/lib/format-time";
import { cn } from "@/shared/lib/utils";
import type { Doc } from "@/shared/lib/mock-data";
import type { ReactNode } from "react";

type DocumentsCardGridProps = {
  rows: Doc[];
  page: number;
  loading: boolean;
  selectedCourse: string;
  readOnly?: boolean;
  onView: (doc: Doc) => void;
  onEdit?: (doc: Doc) => void;
  onDelete?: (doc: Doc) => void;
  emptyMessage?: string;
  noCourseMessage?: string;
};

export function DocumentsCardGrid({
  rows,
  page,
  loading,
  selectedCourse,
  readOnly = false,
  onView,
  onEdit,
  onDelete,
  emptyMessage = "Chưa có tài liệu.",
  noCourseMessage = "Chọn một môn ở bảng trên để xem tài liệu.",
}: DocumentsCardGridProps) {
  if (!selectedCourse) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        {noCourseMessage}
      </div>
    );
  }

  if (loading && rows.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        Đang tải tài liệu...
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
        loading && rows.length > 0 && "pointer-events-none opacity-50",
      )}
    >
      {rows.map((doc, index) => {
        const rowNumber = page * DEFAULT_DOCUMENT_PAGE_SIZE + index + 1;
        const s = statusStyles[doc.status];
        const docType = documentTypeStyle(doc.type);
        const a = doc.active === false ? activeStyles.inactive : activeStyles.active;
        const canView = doc.status === "indexed";
        const isInactive = doc.active === false;

        return (
          <article
            key={doc.id}
            className={cn(
              "flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
              isInactive && "opacity-50",
            )}
          >
            <button
              type="button"
              className={cn(
                "block w-full text-left",
                canView && "cursor-pointer",
                !canView && "cursor-default",
              )}
              onClick={() => canView && onView(doc)}
              disabled={!canView}
            >
              <DocumentPagePreview doc={doc} />
            </button>

            <div className="flex flex-1 flex-col gap-2 p-3">
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  #{rowNumber}
                </span>
                <h3 className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug">
                  {doc.name}
                </h3>
              </div>

              {doc.description?.trim() && (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {doc.description.trim()}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-[10px] font-semibold uppercase",
                    docType.className,
                  )}
                >
                  {docType.label}
                </Badge>
                <Badge variant="outline" className={cn("text-[10px] font-normal", s.className)}>
                  {s.label}
                </Badge>
                {!readOnly && (
                  <Badge variant="outline" className={cn("text-[10px] font-normal", a.className)}>
                    {a.label}
                  </Badge>
                )}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <div className="min-w-0 text-[11px] text-muted-foreground">
                  <span>{doc.size}</span>
                  <span className="mx-1">·</span>
                  <span>
                    {doc.createdAt
                      ? formatDateTimeDMY(doc.createdAt)
                      : formatDateDMY(doc.uploadedAt)}
                  </span>
                </div>

                <CardActions
                  readOnly={readOnly}
                  canView={canView}
                  onView={() => onView(doc)}
                  onEdit={onEdit ? () => onEdit(doc) : undefined}
                  onDelete={onDelete ? () => onDelete(doc) : undefined}
                />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CardActions({
  readOnly,
  canView,
  onView,
  onEdit,
  onDelete,
}: {
  readOnly: boolean;
  canView: boolean;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const actions: ReactNode[] = [
    <Button
      key="view"
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={onView}
      title="Xem tài liệu"
      disabled={!canView}
    >
      <Eye className="h-4 w-4" />
    </Button>,
  ];

  if (!readOnly) {
    actions.push(
      <Button
        key="edit"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onEdit}
        title="Sửa"
      >
        <Pencil className="h-4 w-4" />
      </Button>,
      <Button
        key="delete"
        variant="ghost"
        size="icon"
        className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        title="Xoá"
      >
        <Trash2 className="h-4 w-4" />
      </Button>,
    );
  }

  return <div className="flex shrink-0 items-center gap-0.5">{actions}</div>;
}
