import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  fetchLecturerQuizAttempts,
  fetchQuizById,
  type LecturerQuizAttempt,
  type Quiz,
} from "@/features/quiz/api/quiz-api";
import { QuizStatusBadge } from "@/features/quiz/components/quiz-status-badge";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateTimeDMY } from "@/shared/lib/format-time";
import { cn } from "@/shared/lib/utils";

export function LecturerQuizResultsPage({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<LecturerQuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [quizData, attemptData] = await Promise.all([
        fetchQuizById(quizId),
        fetchLecturerQuizAttempts(quizId),
      ]);
      setQuiz(quizData);
      setAttempts(attemptData);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải được bảng điểm");
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    void load();
  }, [load]);

  const studentCount = new Set(attempts.map((attempt) => attempt.studentId)).size;
  const average =
    attempts.length > 0
      ? attempts.reduce((sum, attempt) => sum + (attempt.percentage ?? 0), 0) / attempts.length
      : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/lecturer/quizzes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Danh sách quiz
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold">
                Bảng điểm{quiz ? ` — ${quiz.title}` : ""}
              </h1>
              {quiz && <QuizStatusBadge status={quiz.status} />}
            </div>
            {quiz && (
              <p className="text-sm text-muted-foreground">
                {quiz.subjectCode} — {quiz.subjectName}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Làm mới
          </Button>
        </div>

        {loading ? (
          <Card className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải bảng điểm…
          </Card>
        ) : error ? (
          <Card className="space-y-3 p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" onClick={() => void load()}>
              Thử lại
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Sinh viên đã nộp</p>
                <p className="mt-1 text-2xl font-semibold">{studentCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Tổng lượt nộp</p>
                <p className="mt-1 text-2xl font-semibold">{attempts.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Điểm trung bình</p>
                <p className="mt-1 text-2xl font-semibold">{average.toFixed(1)}%</p>
              </Card>
            </div>

            <Card className="overflow-hidden">
              {attempts.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">
                  Chưa có sinh viên nộp bài.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-170 text-sm">
                    <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Sinh viên</th>
                        <th className="px-4 py-3 font-medium">Đề</th>
                        <th className="px-4 py-3 text-right font-medium">Điểm</th>
                        <th className="px-4 py-3 text-right font-medium">Tỷ lệ</th>
                        <th className="px-4 py-3 text-right font-medium">Nộp lúc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {attempts.map((attempt) => (
                        <tr key={attempt.id}>
                          <td className="px-4 py-3">
                            <p className="font-medium">{attempt.studentName}</p>
                            <p className="text-xs text-muted-foreground">{attempt.studentEmail}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {attempt.variantNumber != null ? `Đề ${attempt.variantNumber}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {attempt.totalScore ?? 0} / {attempt.maxScore ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {(attempt.percentage ?? 0).toFixed(1)}%
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                            {formatDateTimeDMY(attempt.submittedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
