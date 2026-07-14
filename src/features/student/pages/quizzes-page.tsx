import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, ClipboardList, Clock, FileText, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { DocumentsSubjectSelect } from "@/features/lecturer/components/documents-subject-select";
import { useStudentMySubjects } from "@/features/student/hooks/use-my-subjects";
import {
  fetchMyQuizAttempts,
  fetchQuizzes,
  type QuizAttempt,
  type QuizSummary,
} from "@/features/quiz/api/quiz-api";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateTimeDMY } from "@/shared/lib/format-time";
import { toast } from "@/shared/lib/toast";
import { useAuth } from "@/features/auth/lib/auth-context";

export function StudentQuizzesPage() {
  const { user } = useAuth();
  const { data: subjects = [], isLoading: subjectsLoading } = useStudentMySubjects(
    user?.role === "student",
  );

  const [subjectCode, setSubjectCode] = useState("");
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [attemptsByQuiz, setAttemptsByQuiz] = useState<Record<string, QuizAttempt[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.code === subjectCode) ?? null,
    [subjects, subjectCode],
  );

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const page = await fetchQuizzes({
        subjectId: selectedSubject?.id,
        size: 50,
        sortBy: "publishedAt",
        sortDir: "desc",
      });
      setQuizzes(page.content);

      const attemptMap: Record<string, QuizAttempt[]> = {};
      await Promise.all(
        page.content.map(async (quiz) => {
          try {
            attemptMap[quiz.id] = await fetchMyQuizAttempts(quiz.id);
          } catch {
            attemptMap[quiz.id] = [];
          }
        }),
      );
      setAttemptsByQuiz(attemptMap);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Không tải được danh sách quiz";
      setLoadError(message);
      setQuizzes([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (!user || user.role !== "student") return;
    void loadQuizzes();
  }, [user, loadQuizzes]);

  const filteredQuizzes = useMemo(() => {
    if (!selectedSubject) return quizzes;
    return quizzes.filter((q) => q.subjectId === selectedSubject.id);
  }, [quizzes, selectedSubject]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <ClipboardList className="h-6 w-6" />
              Quiz
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Làm bài trắc nghiệm theo môn học. Cần gói đăng ký đang hoạt động.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadQuizzes()} disabled={loading}>
            <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Làm mới
          </Button>
        </div>

        <Card className="p-4">
          <div className="min-w-60 max-w-md space-y-1.5">
            <Label>Lọc theo môn</Label>
            <DocumentsSubjectSelect
              subjects={subjects}
              value={subjectCode}
              onValueChange={setSubjectCode}
              loading={subjectsLoading}
              defaultPlaceholder="Tất cả môn"
              emptyPlaceholder="Chưa đăng ký môn nào"
            />
          </div>
        </Card>

        {loading ? (
          <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải quiz…
          </Card>
        ) : loadError ? (
          <Card className="space-y-3 p-8 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => void loadQuizzes()}>
              Thử lại
            </Button>
          </Card>
        ) : filteredQuizzes.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Chưa có quiz nào đang mở.
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredQuizzes.map((quiz) => {
              const attempts = attemptsByQuiz[quiz.id] ?? [];
              const canRetake = quiz.allowRetake === true;
              const hasSubmitted = attempts.length > 0;
              const canStart = !hasSubmitted || canRetake;
              const best = attempts.reduce<QuizAttempt | null>((acc, cur) => {
                if (cur.resultsVisible === false) return acc;
                if (!acc || (cur.percentage ?? 0) > (acc.percentage ?? 0)) return cur;
                return acc;
              }, null);
              const hasHiddenAttempts = attempts.some((a) => a.resultsVisible === false);
              return (
                <Card key={quiz.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {quiz.subjectCode}
                      </Badge>
                      <h3 className="text-base font-semibold">{quiz.title}</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        {quiz.questionCount ?? 0} câu hỏi
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
                        Thang điểm {quiz.totalPoints ?? 0}
                      </span>
                      {quiz.timeLimitMinutes != null && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {quiz.timeLimitMinutes} phút
                        </span>
                      )}
                    </div>

                    {attempts.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Đã làm {attempts.length} lần
                        </span>
                        {best != null && (
                          <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-medium text-emerald-700">
                            Điểm cao nhất: {best.totalScore ?? 0}/{best.maxScore ?? 0}
                          </span>
                        )}
                        {hasHiddenAttempts && best == null && (
                          <span className="text-muted-foreground">Điểm được giấu</span>
                        )}
                        {!canRetake && (
                          <span className="text-muted-foreground">Không thể làm lại</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {attempts.length > 0 && (
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          to="/quizzes/$quizId"
                          params={{ quizId: quiz.id }}
                          search={{ attempt: attempts[0].id }}
                        >
                          Xem kết quả
                        </Link>
                      </Button>
                    )}
                    {canStart ? (
                      <Button size="sm" asChild>
                        <Link to="/quizzes/$quizId" params={{ quizId: quiz.id }}>
                          {hasSubmitted ? "Làm lại" : "Làm bài"}
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" disabled>
                        Đã nộp
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
