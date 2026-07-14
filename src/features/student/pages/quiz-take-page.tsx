import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  fetchQuizAttempt,
  fetchQuizById,
  MULTIPLE_CHOICE_MODE,
  submitQuiz,
  type Quiz,
  type QuizAttempt,
} from "@/features/quiz/api/quiz-api";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateTimeDMY } from "@/shared/lib/format-time";
import { toast } from "@/shared/lib/toast";
import { useAuth } from "@/features/auth/lib/auth-context";
import { cn } from "@/shared/lib/utils";

type StudentQuizTakePageProps = {
  quizId: string;
  attemptId?: string;
};

type AnswersState = Record<string, string[]>;

export function StudentQuizTakePage({ quizId, attemptId }: StudentQuizTakePageProps) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const isResultView = Boolean(attempt);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (attemptId) {
        const [quizData, attemptData] = await Promise.all([
          fetchQuizById(quizId),
          fetchQuizAttempt(quizId, attemptId),
        ]);
        setQuiz(quizData);
        setAttempt(attemptData);
      } else {
        const quizData = await fetchQuizById(quizId, true);
        setQuiz(quizData);
        setAttempt(null);
        const initial: AnswersState = {};
        for (const q of quizData.questions) {
          initial[q.id] = [];
        }
        setAnswers(initial);
        if (quizData.timeLimitMinutes) {
          setSecondsLeft(quizData.timeLimitMinutes * 60);
        }
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Không tải được quiz");
    } finally {
      setLoading(false);
    }
  }, [quizId, attemptId]);

  useEffect(() => {
    if (!user || user.role !== "student") return;
    void load();
  }, [user, load]);

  const handleSubmit = useCallback(async () => {
    if (!quiz || submitting) return;
    const payload = {
      answers: quiz.questions.map((q) => ({
        questionId: q.id,
        selectedOptionIds: answers[q.id] ?? [],
      })),
    };
    const missing = payload.answers.some((a) => a.selectedOptionIds.length === 0);
    if (missing) {
      toast.error("Vui lòng trả lời tất cả câu hỏi");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitQuiz(quizId, payload);
      setAttempt(result);
      toast.success("Đã nộp bài");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Nộp bài thất bại");
    } finally {
      setSubmitting(false);
    }
  }, [quiz, submitting, answers, quizId]);

  useEffect(() => {
    if (isResultView || secondsLeft == null || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s == null || s <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isResultView, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && !isResultView && quiz && !submitting) {
      void handleSubmit();
    }
  }, [secondsLeft, isResultView, quiz, submitting, handleSubmit]);

  const timerLabel = useMemo(() => {
    if (secondsLeft == null) return null;
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  const toggleOption = (questionId: string, optionId: string, single: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (single) {
        return { ...prev, [questionId]: [optionId] };
      }
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  };

  if (loading || !quiz) {
    return (
      <AppShell>
        <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải…
        </div>
      </AppShell>
    );
  }

  if (attempt) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl space-y-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/quizzes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Danh sách quiz
            </Link>
          </Button>

          <Card className="p-6 text-center">
            <h1 className="text-xl font-semibold">{quiz.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Nộp lúc {formatDateTimeDMY(attempt.submittedAt)}
            </p>
            <div className="mt-4 text-3xl font-bold text-primary">
              {attempt.totalScore} / {attempt.maxScore}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {attempt.percentage?.toFixed(1)}%
            </p>
          </Card>

          <div className="space-y-3">
            {attempt.answers.map((ans, i) => (
              <Card
                key={ans.questionId}
                className={cn(
                  "p-4",
                  ans.isCorrect
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-destructive/20 bg-destructive/5",
                )}
              >
                <div className="flex items-start gap-2">
                  {ans.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      Câu {i + 1}: {ans.questionText}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ans.scoreEarned}/{ans.maxScore} điểm
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {!attemptId && (
            <div className="flex justify-center">
              <Button asChild>
                <Link to="/quizzes/$quizId" params={{ quizId }}>
                  Làm lại
                </Link>
              </Button>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/quizzes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Link>
          </Button>
          {timerLabel != null && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium",
                secondsLeft != null && secondsLeft < 60
                  ? "border-destructive/50 text-destructive"
                  : "border-border",
              )}
            >
              <Clock className="h-4 w-4" />
              {timerLabel}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-xl font-semibold">{quiz.title}</h1>
          {quiz.description && (
            <p className="mt-1 text-sm text-muted-foreground">{quiz.description}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {quiz.questionCount} câu · {quiz.totalPoints} điểm
            {quiz.timeLimitMinutes != null && ` · ${quiz.timeLimitMinutes} phút`}
          </p>
        </div>

        <div className="space-y-4">
          {quiz.questions.map((question, qIndex) => {
            const isSingle = question.multipleChoiceMode === MULTIPLE_CHOICE_MODE.SINGLE;
            const selected = answers[question.id] ?? [];
            return (
              <Card key={question.id} className="space-y-3 p-4">
                <div className="text-sm font-medium">
                  Câu {qIndex + 1}: {question.questionText}
                </div>
                <div className="space-y-2">
                  {question.options.map((option) => {
                    const checked = selected.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors",
                          checked ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/50",
                        )}
                      >
                        {isSingle ? (
                          <input
                            type="radio"
                            name={question.id}
                            checked={checked}
                            onChange={() => toggleOption(question.id, option.id, true)}
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOption(question.id, option.id, false)}
                          />
                        )}
                        <span>{option.optionText}</span>
                      </label>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end pb-6">
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Nộp bài
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
