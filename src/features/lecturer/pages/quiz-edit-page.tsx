import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  closeQuiz,
  fetchQuizById,
  MULTIPLE_CHOICE_MODE,
  MULTIPLE_CHOICE_MODE_LABELS,
  publishQuiz,
  QUIZ_STATUS,
  QUIZ_TIME_LIMIT,
  quizToUpdatePayload,
  parseBoundedIntInput,
  updateQuiz,
  type Quiz,
  type QuizQuestionPayload,
  type QuizUpdatePayload,
} from "@/features/quiz/api/quiz-api";
import { QuizStatusBadge } from "@/features/quiz/components/quiz-status-badge";
import { ApiError } from "@/shared/lib/api-client";
import { toast } from "@/shared/lib/toast";
import { useAuth } from "@/features/auth/lib/auth-context";
import { cn } from "@/shared/lib/utils";

type LecturerQuizEditPageProps = {
  quizId: string;
};

export function LecturerQuizEditPage({ quizId }: LecturerQuizEditPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [form, setForm] = useState<QuizUpdatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchQuizById(quizId);
      setQuiz(data);
      setForm(quizToUpdatePayload(data));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Không tải được quiz");
      navigate({ to: "/lecturer/quizzes" });
    } finally {
      setLoading(false);
    }
  }, [quizId, navigate]);

  useEffect(() => {
    if (!user || user.role !== "lecturer") return;
    void load();
  }, [user, load]);

  const updateQuestion = (index: number, patch: Partial<QuizQuestionPayload>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], ...patch };
      return { ...prev, questions };
    });
  };

  const updateOption = (
    qIndex: number,
    oIndex: number,
    patch: Partial<QuizQuestionPayload["options"][number]>,
  ) => {
    setForm((prev) => {
      if (!prev) return prev;
      const questions = [...prev.questions];
      const options = [...questions[qIndex].options];
      options[oIndex] = { ...options[oIndex], ...patch };
      questions[qIndex] = { ...questions[qIndex], options };
      return { ...prev, questions };
    });
  };

  const setSingleCorrect = (qIndex: number, oIndex: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const questions = [...prev.questions];
      questions[qIndex] = {
        ...questions[qIndex],
        options: questions[qIndex].options.map((o, i) => ({
          ...o,
          isCorrect: i === oIndex,
        })),
      };
      return { ...prev, questions };
    });
  };

  const addOption = (qIndex: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const questions = [...prev.questions];
      const options = questions[qIndex].options;
      questions[qIndex] = {
        ...questions[qIndex],
        options: [
          ...options,
          {
            optionText: "",
            isCorrect: false,
            sortOrder: options.length,
          },
        ],
      };
      return { ...prev, questions };
    });
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const questions = [...prev.questions];
      const options = questions[qIndex].options
        .filter((_, i) => i !== oIndex)
        .map((o, i) => ({ ...o, sortOrder: i }));
      questions[qIndex] = { ...questions[qIndex], options };
      return { ...prev, questions };
    });
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const updated = await updateQuiz(quizId, form);
      setQuiz(updated);
      setForm(quizToUpdatePayload(updated));
      toast.success("Đã lưu quiz");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Lưu quiz thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (form) await updateQuiz(quizId, form);
      const updated = await publishQuiz(quizId);
      setQuiz(updated);
      setForm(quizToUpdatePayload(updated));
      toast.success("Đã xuất bản quiz");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Xuất bản thất bại");
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = async () => {
    try {
      const updated = await closeQuiz(quizId);
      setQuiz(updated);
      toast.success("Đã đóng quiz");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Đóng quiz thất bại");
    }
  };

  const readOnly = quiz?.status === QUIZ_STATUS.CLOSED;

  if (loading || !form || !quiz) {
    return (
      <AppShell>
        <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải quiz…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/lecturer/quizzes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Danh sách
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold">{quiz.title}</h1>
              <QuizStatusBadge status={quiz.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {quiz.subjectCode} — {quiz.subjectName}
            </p>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void handleSave()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Lưu
              </Button>
              {quiz.status === QUIZ_STATUS.DRAFT && (
                <Button size="sm" onClick={() => void handlePublish()} disabled={publishing}>
                  {publishing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Xuất bản
                </Button>
              )}
              {quiz.status === QUIZ_STATUS.PUBLISHED && (
                <Button variant="secondary" size="sm" onClick={() => void handleClose()}>
                  Đóng quiz
                </Button>
              )}
            </div>
          )}
        </div>

        <Card className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label>Tiêu đề</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mô tả</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quiz-edit-time-limit">
              Thời gian làm bài ({QUIZ_TIME_LIMIT.min}–{QUIZ_TIME_LIMIT.max} phút)
            </Label>
            <Input
              id="quiz-edit-time-limit"
              type="number"
              inputMode="numeric"
              step={1}
              min={QUIZ_TIME_LIMIT.min}
              max={QUIZ_TIME_LIMIT.max}
              value={form.timeLimitMinutes ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  timeLimitMinutes: e.target.value
                    ? parseBoundedIntInput(
                        e.target.value,
                        QUIZ_TIME_LIMIT.min,
                        QUIZ_TIME_LIMIT.max,
                      )
                    : null,
                })
              }
              disabled={readOnly}
              className="max-w-40"
            />
          </div>
        </Card>

        <div className="space-y-4">
          {form.questions.map((question, qIndex) => {
            const source = quiz.questions[qIndex];
            const isSingle = question.multipleChoiceMode === MULTIPLE_CHOICE_MODE.SINGLE;
            return (
              <Card key={source?.id ?? qIndex} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-muted-foreground">Câu {qIndex + 1}</div>
                  <span className="text-xs text-muted-foreground">
                    {MULTIPLE_CHOICE_MODE_LABELS[question.multipleChoiceMode]} · {question.points} điểm
                  </span>
                </div>
                <Textarea
                  value={question.questionText}
                  onChange={(e) => updateQuestion(qIndex, { questionText: e.target.value })}
                  rows={2}
                  disabled={readOnly}
                />
                {source?.sourceExcerpt && (
                  <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                    Nguồn: {source.sourceDocumentTitle ?? "Tài liệu"} — {source.sourceExcerpt}
                  </p>
                )}
                <div className="space-y-2">
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      {isSingle ? (
                        <input
                          type="radio"
                          name={`q-${qIndex}`}
                          checked={option.isCorrect}
                          onChange={() => setSingleCorrect(qIndex, oIndex)}
                          disabled={readOnly}
                          className="shrink-0"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={option.isCorrect}
                          onChange={(e) =>
                            updateOption(qIndex, oIndex, { isCorrect: e.target.checked })
                          }
                          disabled={readOnly}
                          className="shrink-0"
                        />
                      )}
                      <Input
                        value={option.optionText}
                        onChange={(e) => updateOption(qIndex, oIndex, { optionText: e.target.value })}
                        placeholder={`Đáp án ${oIndex + 1}`}
                        disabled={readOnly}
                        className={cn(option.isCorrect && "border-emerald-500/50")}
                      />
                      {!readOnly && question.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(qIndex, oIndex)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {!readOnly && (
                    <Button type="button" variant="outline" size="sm" onClick={() => addOption(qIndex)}>
                      <Plus className="mr-2 h-3.5 w-3.5" />
                      Thêm đáp án
                    </Button>
                  )}
                </div>
                {!readOnly && (
                  <div className="max-w-xs">
                    <Label className="text-xs">Loại câu hỏi</Label>
                    <Select
                      value={question.multipleChoiceMode}
                      onValueChange={(v) =>
                        updateQuestion(qIndex, {
                          multipleChoiceMode: v as QuizQuestionPayload["multipleChoiceMode"],
                        })
                      }
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={MULTIPLE_CHOICE_MODE.SINGLE}>
                          {MULTIPLE_CHOICE_MODE_LABELS.SINGLE}
                        </SelectItem>
                        <SelectItem value={MULTIPLE_CHOICE_MODE.MULTIPLE}>
                          {MULTIPLE_CHOICE_MODE_LABELS.MULTIPLE}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
