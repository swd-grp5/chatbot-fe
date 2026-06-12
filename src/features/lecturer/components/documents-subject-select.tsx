import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useMeasuredMaxWidth } from "@/shared/lib/measure-text-width";
import type { SubjectOption } from "@/features/lecturer/api/subject-api";

function resolveDocumentCount(
  subject: SubjectOption,
  documentCountsByCode?: Record<string, number>,
) {
  if (subject.totalDocuments != null) return subject.totalDocuments;
  return documentCountsByCode?.[subject.code];
}

function formatSubjectSelectLabel(
  subject: Pick<SubjectOption, "code" | "name">,
  documentCount?: number,
) {
  const suffix = documentCount != null ? ` (${documentCount})` : "";
  return `${subject.code} — ${subject.name}${suffix}`;
}

type DocumentsSubjectSelectProps = {
  subjects: SubjectOption[];
  value: string;
  onValueChange: (code: string) => void;
  loading?: boolean;
  disabled?: boolean;
  loadingPlaceholder?: string;
  emptyPlaceholder?: string;
  defaultPlaceholder?: string;
  documentCountsByCode?: Record<string, number>;
};

export function DocumentsSubjectSelect({
  subjects,
  value,
  onValueChange,
  loading = false,
  disabled = false,
  loadingPlaceholder = "Đang tải môn học...",
  emptyPlaceholder = "Chưa có môn được gán",
  defaultPlaceholder = "Chọn môn học",
  documentCountsByCode,
}: DocumentsSubjectSelectProps) {
  const widthLabels = useMemo(() => {
    const optionLabels = subjects.map((subject) =>
      formatSubjectSelectLabel(subject, resolveDocumentCount(subject, documentCountsByCode)),
    );
    return [
      ...optionLabels,
      loading ? loadingPlaceholder : null,
      subjects.length === 0 ? emptyPlaceholder : null,
      defaultPlaceholder,
    ].filter((label): label is string => Boolean(label));
  }, [
    subjects,
    documentCountsByCode,
    loading,
    loadingPlaceholder,
    emptyPlaceholder,
    defaultPlaceholder,
  ]);

  // Extra padding: trigger px/chevron + SelectItem check indicator (pr-8).
  const triggerWidth = useMeasuredMaxWidth(widthLabels, "text-xs font-normal", 56);

  const placeholder = loading
    ? loadingPlaceholder
    : subjects.length === 0
      ? emptyPlaceholder
      : defaultPlaceholder;

  return (
    <Select
      value={value || undefined}
      onValueChange={onValueChange}
      disabled={disabled || loading || subjects.length === 0}
    >
      <SelectTrigger
        className="h-8 w-auto max-w-full shrink-0 text-xs"
        style={triggerWidth ? { width: triggerWidth } : undefined}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className="min-w-(--radix-select-trigger-width)"
        style={triggerWidth ? { minWidth: triggerWidth } : undefined}
      >
        {subjects.map((subject) => (
          <SelectItem key={subject.id} value={subject.code} className="text-xs">
            {formatSubjectSelectLabel(
              subject,
              resolveDocumentCount(subject, documentCountsByCode),
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
