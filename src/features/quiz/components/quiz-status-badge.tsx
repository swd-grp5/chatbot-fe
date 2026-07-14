import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import { QUIZ_STATUS, QUIZ_STATUS_LABELS, type QuizStatus } from "@/features/quiz/api/quiz-api";

const STATUS_STYLES: Record<QuizStatus, string> = {
  [QUIZ_STATUS.DRAFT]: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  [QUIZ_STATUS.PUBLISHED]: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  [QUIZ_STATUS.CLOSED]: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

export function QuizStatusBadge({ status, className }: { status: QuizStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status], className)}>
      {QUIZ_STATUS_LABELS[status]}
    </Badge>
  );
}
