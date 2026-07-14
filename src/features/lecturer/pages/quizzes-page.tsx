import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bot,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/shared/components/ui/modal";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { DocumentsSubjectSelect } from "@/features/lecturer/components/documents-subject-select";
import { useLecturerMySubjects } from "@/features/lecturer/hooks/use-lecturer-my-subjects";
import { fetchDocuments } from "@/features/lecturer/api/document-api";
import {
  closeQuiz,
  deleteQuiz,
  fetchQuizzes,
  generateQuiz,
  POINTS_DISTRIBUTION,
  publishQuiz,
  QUIZ_GENERATE_LIMITS,
  QUIZ_STATUS,
  parseBoundedIntInput,
  toggleQuizActive,
  type QuizGeneratePayload,
  type QuizSummary,
} from "@/features/quiz/api/quiz-api";
import { QuizStatusBadge } from "@/features/quiz/components/quiz-status-badge";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateTimeDMY } from "@/shared/lib/format-time";
import { toast } from "@/shared/lib/toast";
import { useAuth } from "@/features/auth/lib/auth-context";

export function LecturerQuizzesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: subjects = [], isLoading: subjectsLoading } = useLecturerMySubjects(
    user?.role === "lecturer",
  );

  const [subjectCode, setSubjectCode] = useState("");
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.code === subjectCode) ?? null,
    [subjects, subjectCode],
  );

  useEffect(() => {
    if (!subjectCode && subjects.length > 0) {
      setSubjectCode(subjects[0].code);
    }
  }, [subjects, subjectCode]);

  const loadQuizzes = useCallback(async () => {
    if (!selectedSubject) return;
    setLoading(true);
    setLoadError(null);
    try {
      const page = await fetchQuizzes({
        subjectId: selectedSubject.id,
        size: 50,
        sortBy: "createdAt",
        sortDir: "desc",
      });
      setQuizzes(page.content);
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
    if (!user || user.role !== "lecturer" || !selectedSubject) return;
    void loadQuizzes();
  }, [user, selectedSubject, loadQuizzes]);

  const runAction = async (id: string, fn: () => Promise<unknown>, success: string) => {
    setActionId(id);
    try {
      await fn();
      toast.success(success);
      await loadQuizzes();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Thao tác thất bại");
    } finally {
      setActionId(null);
    }
  };

  const handleGenerate = async (payload: QuizGeneratePayload) => {
    setGenerating(true);
    try {
      const quiz = await generateQuiz(payload);
      toast.success("AI đã tạo quiz nháp. Hãy kiểm tra và chỉnh sửa đáp án đúng.");
      setGenerateOpen(false);
      await loadQuizzes();
      navigate({ to: "/lecturer/quizzes/$quizId", params: { quizId: quiz.id } });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Tạo quiz bằng AI thất bại");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Quiz</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tạo quiz bằng AI từ tài liệu, chỉnh sửa và xuất bản cho sinh viên.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadQuizzes()}
              disabled={loading || !selectedSubject}
            >
              <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              Làm mới
            </Button>
            <Button
              size="sm"
              onClick={() => setGenerateOpen(true)}
              disabled={!selectedSubject}
            >
              <Bot className="mr-2 h-4 w-4" />
              Tạo bằng AI
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-60 flex-1 space-y-1.5">
              <Label>Môn học</Label>
              <DocumentsSubjectSelect
                subjects={subjects}
                value={subjectCode}
                onValueChange={setSubjectCode}
                loading={subjectsLoading}
              />
            </div>
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
        ) : !selectedSubject ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Chọn môn học để xem quiz.
          </Card>
        ) : quizzes.length === 0 ? (
          <Card className="space-y-3 p-10 text-center">
            <p className="text-sm text-muted-foreground">Chưa có quiz cho môn này.</p>
            <Button size="sm" onClick={() => setGenerateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo quiz đầu tiên
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/lecturer/quizzes/$quizId"
                      params={{ quizId: quiz.id }}
                      className="font-medium hover:underline"
                    >
                      {quiz.title}
                    </Link>
                    <QuizStatusBadge status={quiz.status} />
                    {quiz.aiGenerated && (
                      <Badge variant="outline" className="gap-1 border-violet-500/30 bg-violet-500/10 text-violet-700">
                        <Bot className="h-3 w-3" />
                        AI
                      </Badge>
                    )}
                    {!quiz.active && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Tắt
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{quiz.questionCount ?? 0} câu</span>
                    <span>{quiz.totalPoints ?? 0} điểm</span>
                    {quiz.timeLimitMinutes != null && <span>{quiz.timeLimitMinutes} phút</span>}
                    <span>Tạo {formatDateTimeDMY(quiz.createdAt)}</span>
                    {quiz.publishedAt && <span>Xuất bản {formatDateTimeDMY(quiz.publishedAt)}</span>}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" disabled={actionId === quiz.id}>
                      {actionId === quiz.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/lecturer/quizzes/$quizId" params={{ quizId: quiz.id }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Chỉnh sửa
                      </Link>
                    </DropdownMenuItem>
                    {quiz.status === QUIZ_STATUS.DRAFT && (
                      <DropdownMenuItem
                        onClick={() =>
                          void runAction(quiz.id, () => publishQuiz(quiz.id), "Đã xuất bản quiz")
                        }
                      >
                        Xuất bản
                      </DropdownMenuItem>
                    )}
                    {quiz.status === QUIZ_STATUS.PUBLISHED && (
                      <DropdownMenuItem
                        onClick={() =>
                          void runAction(quiz.id, () => closeQuiz(quiz.id), "Đã đóng quiz")
                        }
                      >
                        Đóng quiz
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() =>
                        void runAction(
                          quiz.id,
                          () => toggleQuizActive(quiz.id),
                          quiz.active ? "Đã tắt quiz" : "Đã bật quiz",
                        )
                      }
                    >
                      {quiz.active ? "Tắt quiz" : "Bật quiz"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() =>
                        void runAction(quiz.id, () => deleteQuiz(quiz.id), "Đã xóa quiz")
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedSubject && (
        <GenerateQuizModal
          open={generateOpen}
          onOpenChange={setGenerateOpen}
          subjectId={selectedSubject.id}
          subjectLabel={`${selectedSubject.code} — ${selectedSubject.name}`}
          generating={generating}
          onSubmit={handleGenerate}
        />
      )}
    </AppShell>
  );
}

function GenerateQuizModal({
  open,
  onOpenChange,
  subjectId,
  subjectLabel,
  generating,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  subjectLabel: string;
  generating: boolean;
  onSubmit: (payload: QuizGeneratePayload) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questionCount, setQuestionCount] = useState<number>(
    QUIZ_GENERATE_LIMITS.questionCount.default,
  );
  const [totalPoints, setTotalPoints] = useState<number>(QUIZ_GENERATE_LIMITS.totalPoints.default);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(
    QUIZ_GENERATE_LIMITS.timeLimitMinutes.default,
  );
  const [pointsDistribution, setPointsDistribution] = useState<
    (typeof POINTS_DISTRIBUTION)[keyof typeof POINTS_DISTRIBUTION]
  >(POINTS_DISTRIBUTION.EVEN);
  const [documents, setDocuments] = useState<{ id: string; title: string }[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setQuestionCount(QUIZ_GENERATE_LIMITS.questionCount.default);
    setTotalPoints(QUIZ_GENERATE_LIMITS.totalPoints.default);
    setTimeLimitMinutes(QUIZ_GENERATE_LIMITS.timeLimitMinutes.default);
    setPointsDistribution(POINTS_DISTRIBUTION.EVEN);
    setSelectedDocIds([]);
    setDocsLoading(true);
    void fetchDocuments({ subjectId, status: "INDEXED", active: true, size: 100 })
      .then((page) => {
        setDocuments(page.content.map((d) => ({ id: d.id, title: d.title })));
      })
      .catch(() => setDocuments([]))
      .finally(() => setDocsLoading(false));
  }, [open, subjectId]);

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = () => {
    void onSubmit({
      subjectId,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      questionCount,
      totalPoints,
      timeLimitMinutes,
      pointsDistribution,
      documentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <ModalHeader>
          <ModalTitle>Tạo quiz bằng AI</ModalTitle>
        </ModalHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Môn: {subjectLabel}</p>
          <div className="space-y-1.5">
            <Label htmlFor="quiz-title">Tiêu đề (tùy chọn)</Label>
            <Input
              id="quiz-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="AI sẽ tự đặt nếu để trống"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quiz-desc">Mô tả</Label>
            <Textarea
              id="quiz-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quiz-question-count">
                Số câu ({QUIZ_GENERATE_LIMITS.questionCount.min}–{QUIZ_GENERATE_LIMITS.questionCount.max})
              </Label>
              <Input
                id="quiz-question-count"
                type="number"
                inputMode="numeric"
                step={1}
                min={QUIZ_GENERATE_LIMITS.questionCount.min}
                max={QUIZ_GENERATE_LIMITS.questionCount.max}
                value={questionCount}
                onChange={(e) =>
                  setQuestionCount(
                    parseBoundedIntInput(
                      e.target.value,
                      QUIZ_GENERATE_LIMITS.questionCount.min,
                      QUIZ_GENERATE_LIMITS.questionCount.max,
                    ),
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quiz-total-points">
                Tổng điểm ({QUIZ_GENERATE_LIMITS.totalPoints.min}–{QUIZ_GENERATE_LIMITS.totalPoints.max})
              </Label>
              <Input
                id="quiz-total-points"
                type="number"
                inputMode="numeric"
                step={1}
                min={QUIZ_GENERATE_LIMITS.totalPoints.min}
                max={QUIZ_GENERATE_LIMITS.totalPoints.max}
                value={totalPoints}
                onChange={(e) =>
                  setTotalPoints(
                    parseBoundedIntInput(
                      e.target.value,
                      QUIZ_GENERATE_LIMITS.totalPoints.min,
                      QUIZ_GENERATE_LIMITS.totalPoints.max,
                    ),
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quiz-time-limit">
                Thời gian ({QUIZ_GENERATE_LIMITS.timeLimitMinutes.min}–{QUIZ_GENERATE_LIMITS.timeLimitMinutes.max}{" "}
                phút)
              </Label>
              <Input
                id="quiz-time-limit"
                type="number"
                inputMode="numeric"
                step={1}
                min={QUIZ_GENERATE_LIMITS.timeLimitMinutes.min}
                max={QUIZ_GENERATE_LIMITS.timeLimitMinutes.max}
                value={timeLimitMinutes}
                onChange={(e) =>
                  setTimeLimitMinutes(
                    parseBoundedIntInput(
                      e.target.value,
                      QUIZ_GENERATE_LIMITS.timeLimitMinutes.min,
                      QUIZ_GENERATE_LIMITS.timeLimitMinutes.max,
                    ),
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Chia điểm</Label>
              <Select
                value={pointsDistribution}
                onValueChange={(v) =>
                  setPointsDistribution(v as (typeof POINTS_DISTRIBUTION)[keyof typeof POINTS_DISTRIBUTION])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={POINTS_DISTRIBUTION.EVEN}>Đều</SelectItem>
                  <SelectItem value={POINTS_DISTRIBUTION.BY_DIFFICULTY}>Theo độ khó</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tài liệu nguồn (tùy chọn)</Label>
            {docsLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải tài liệu…</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có tài liệu đã index.</p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {documents.map((doc) => (
                  <label key={doc.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                    />
                    <span className="truncate">{doc.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
            Tạo quiz
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
