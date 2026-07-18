import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Clock, Flag, Loader2, Send, XCircle } from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  fetchQuizAttempt,
  MULTIPLE_CHOICE_MODE,
  startQuiz,
  submitQuiz,
  type QuizAttempt,
  type QuizQuestion,
  type QuizStart,
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

function safeFormatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return formatDateTimeDMY(value);
  } catch {
    return value;
  }
}

/** Tránh câu trùng do BE EntityGraph nhân bản List questions+options. */
function dedupeQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  const seen = new Set<string>();
  const result: QuizQuestion[] = [];
  for (const q of questions) {
    if (!q?.id || seen.has(q.id)) continue;
    seen.add(q.id);
    result.push(q);
  }
  return result;
}

export function StudentQuizTakePage({ quizId, attemptId }: StudentQuizTakePageProps) {
  const { user } = useAuth();
  const [session, setSession] = useState<QuizStart | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(() => new Set());
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const isResultView = Boolean(attempt);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (attemptId) {
        const attemptData = await fetchQuizAttempt(quizId, attemptId);
        setAttempt(attemptData);
        setSession(null);
      } else {
        const startData = await startQuiz(quizId);
        const questions = dedupeQuestions(startData.questions ?? []);
        setSession({
          ...startData,
          questions,
          questionCount: questions.length,
          totalPoints: questions.reduce((sum, q) => sum + (q.points ?? 0), 0),
        });
        setAttempt(null);
        const initial: AnswersState = {};
        for (const q of questions) {
          initial[q.id] = [];
        }
        setAnswers(initial);
        setFlaggedIds(new Set());
        setActiveQuestionId(questions[0]?.id ?? null);
        if (startData.timeLimitMinutes) {
          setSecondsLeft(startData.timeLimitMinutes * 60);
        } else {
          setSecondsLeft(null);
        }
      }
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Không tải được quiz";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [quizId, attemptId]);

  useEffect(() => {
    if (!user || user.role !== "student") return;
    void load();
  }, [user, load]);

  const handleSubmit = useCallback(async () => {
    if (!session || submitting) return;
    const questions = session.questions ?? [];
    const payload = {
      variantId: session.variantId ?? undefined,
      answers: questions.map((q) => ({
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
      setAttempt({
        ...result,
        answers: result.answers ?? [],
      });
      setSession(null);
      setSecondsLeft(null);
      toast.success("Đã nộp bài");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Nộp bài thất bại");
    } finally {
      setSubmitting(false);
    }
  }, [session, submitting, answers, quizId]);

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
    if (secondsLeft === 0 && !isResultView && session && !submitting) {
      void handleSubmit();
    }
  }, [secondsLeft, isResultView, session, submitting, handleSubmit]);

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

  const toggleFlag = (questionId: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const scrollToQuestion = (questionId: string) => {
    setActiveQuestionId(questionId);
    const el = document.getElementById(`quiz-q-${questionId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const title = attempt?.quizTitle ?? session?.title ?? "Quiz";
  const attemptAnswers = attempt?.answers ?? [];

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải…
        </div>
      </AppShell>
    );
  }

  if (loadError && !attempt && !session) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg space-y-4 p-10 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/quizzes">Quay lại</Link>
            </Button>
            <Button size="sm" onClick={() => void load()}>
              Thử lại
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (attempt) {
    const showResults = attempt.resultsVisible !== false;
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
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Nộp lúc {safeFormatDateTime(attempt.submittedAt)}
              {attempt.variantNumber != null && ` · Đề ${attempt.variantNumber}`}
            </p>
            {showResults ? (
              <>
                <div className="mt-4 text-3xl font-bold text-primary">
                  {attempt.totalScore ?? 0} / {attempt.maxScore ?? 0}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {(attempt.percentage ?? 0).toFixed(1)}%
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Đã nộp bài thành công. Giảng viên không hiển thị điểm cho bài này.
              </p>
            )}
          </Card>

          {showResults && attemptAnswers.length > 0 && (
            <div className="space-y-3">
              {attemptAnswers.map((ans, i) => (
                <Card
                  key={ans.questionId ?? i}
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
                        Câu {i + 1}: {ans.questionText ?? "—"}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ans.scoreEarned ?? 0}/{ans.maxScore ?? 0} điểm
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!attemptId && (
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setAttempt(null);
                  void load();
                }}
              >
                Làm lại
              </Button>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg space-y-4 p-10 text-center">
          <p className="text-sm text-muted-foreground">Không có dữ liệu làm bài.</p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/quizzes">Quay lại</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const questions: QuizQuestion[] = session.questions ?? [];
  const answeredCount = questions.filter((q) => (answers[q.id] ?? []).length > 0).length;
  const flaggedCount = questions.filter((q) => flaggedIds.has(q.id)).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl pb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0 space-y-4">
            <div>
              <h1 className="text-xl font-semibold">{session.title}</h1>
              {session.description && (
                <p className="mt-1 text-sm text-muted-foreground">{session.description}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {session.questionCount ?? questions.length} câu · {session.totalPoints ?? 0} điểm
                {session.timeLimitMinutes != null && ` · ${session.timeLimitMinutes} phút`}
                {session.variantNumber != null && ` · Đề ${session.variantNumber}`}
              </p>
            </div>

            {questions.map((question, qIndex) => {
              const isSingle = question.multipleChoiceMode === MULTIPLE_CHOICE_MODE.SINGLE;
              const selected = answers[question.id] ?? [];
              const options = question.options ?? [];
              const flagged = flaggedIds.has(question.id);
              const answered = selected.length > 0;
              return (
                <Card
                  key={question.id}
                  id={`quiz-q-${question.id}`}
                  className={cn(
                    "scroll-mt-24 space-y-3 p-4",
                    flagged && "border-amber-500/40",
                    activeQuestionId === question.id && "ring-1 ring-primary/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-sm font-medium">
                      <span className="text-muted-foreground">Câu {qIndex + 1}:</span>{" "}
                      {question.questionText}
                      {(question.points ?? 0) > 0 && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          ({question.points} điểm)
                        </span>
                      )}
                      {answered && (
                        <span className="ml-2 text-[11px] font-normal text-emerald-600">
                          Đã trả lời
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "shrink-0 gap-1.5",
                        flagged ? "text-amber-600 hover:text-amber-700" : "text-muted-foreground",
                      )}
                      onClick={() => toggleFlag(question.id)}
                      title={flagged ? "Bỏ đánh dấu" : "Đánh dấu xem lại"}
                    >
                      <Flag className={cn("h-3.5 w-3.5", flagged && "fill-current")} />
                      {flagged ? "Đã flag" : "Flag"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {options.map((option) => {
                      const checked = selected.includes(option.id);
                      return (
                        <label
                          key={option.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors",
                            checked
                              ? "border-primary/50 bg-primary/5"
                              : "border-border hover:bg-muted/50",
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

            <div className="flex justify-end pb-2">
              <Button
                onClick={() => void handleSubmit()}
                disabled={submitting || questions.length === 0}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Nộp bài
              </Button>
            </div>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card className="space-y-3 p-3">
              <div>
                <div className="text-sm font-semibold">Bảng câu hỏi</div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {answeredCount}/{questions.length} đã làm
                  {flaggedCount > 0 && ` · ${flaggedCount} flag`}
                </p>
              </div>

              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-5">
                {questions.map((question, qIndex) => {
                  const answered = (answers[question.id] ?? []).length > 0;
                  const flagged = flaggedIds.has(question.id);
                  const active = activeQuestionId === question.id;
                  return (
                    <button
                      key={question.id}
                      type="button"
                      title={
                        flagged
                          ? `Câu ${qIndex + 1} · đã flag`
                          : answered
                            ? `Câu ${qIndex + 1} · đã làm`
                            : `Câu ${qIndex + 1} · chưa làm`
                      }
                      onClick={() => scrollToQuestion(question.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        toggleFlag(question.id);
                      }}
                      className={cn(
                        "relative flex h-8 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                        answered
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/60",
                        flagged && "ring-1 ring-amber-500/70",
                        active && "outline-2 outline-offset-1 outline-primary",
                      )}
                    >
                      {qIndex + 1}
                      {flagged && (
                        <Flag className="absolute -top-1 -right-1 h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <Button
                className="w-full"
                size="sm"
                onClick={() => void handleSubmit()}
                disabled={submitting || questions.length === 0}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Nộp bài
              </Button>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
