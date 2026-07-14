import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Bot,
  Eye,
  Layers,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ConfigProvider, Popconfirm } from "antd";
import { ExclamationCircleFilled } from "@ant-design/icons";
import viVN from "antd/locale/vi_VN";
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
import { fetchBankQuestions } from "@/features/quiz/api/question-bank-api";
import {
  assembleQuiz,
  closeQuiz,
  deleteQuiz,
  fetchQuizzes,
  generateQuiz,
  POINTS_DISTRIBUTION,
  POINTS_MODE,
  publishQuiz,
  QUIZ_ASSEMBLE_LIMITS,
  QUIZ_GENERATE_LIMITS,
  QUIZ_STATUS,
  parseBoundedIntInput,
  toggleQuizActive,
  type QuizAssemblePayload,
  type QuizGeneratePayload,
  type QuizSummary,
} from "@/features/quiz/api/quiz-api";
import { QuizStatusBadge } from "@/features/quiz/components/quiz-status-badge";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateTimeDMY } from "@/shared/lib/format-time";
import { toast } from "@/shared/lib/toast";
import { useAuth } from "@/features/auth/lib/auth-context";
import { BRAND_PRIMARY, getBrandPrimaryColor } from "@/shared/lib/brand-theme";

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
  const [assembleOpen, setAssembleOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [brandPrimary, setBrandPrimary] = useState(BRAND_PRIMARY);

  useEffect(() => {
    setBrandPrimary(getBrandPrimaryColor());
  }, []);

  const antdTheme = useMemo(
    () => ({
      token: {
        colorPrimary: brandPrimary,
        borderRadius: 8,
      },
    }),
    [brandPrimary],
  );

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

  const handleAssemble = async (payload: QuizAssemblePayload) => {
    setAssembling(true);
    try {
      const quiz = await assembleQuiz(payload);
      toast.success("Đã tạo quiz từ ngân hàng câu hỏi");
      setAssembleOpen(false);
      await loadQuizzes();
      navigate({ to: "/lecturer/quizzes/$quizId", params: { quizId: quiz.id } });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Lắp quiz thất bại");
    } finally {
      setAssembling(false);
    }
  };

  return (
    <ConfigProvider locale={viVN} theme={antdTheme}>
      <AppShell>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Quiz</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Tạo quiz bằng AI, lắp từ ngân hàng câu hỏi, chỉnh sửa và xuất bản.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/lecturer/question-bank">Ngân hàng câu hỏi</Link>
              </Button>
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
                variant="outline"
                size="sm"
                onClick={() => setAssembleOpen(true)}
                disabled={!selectedSubject}
              >
                <Layers className="mr-2 h-4 w-4" />
                Lắp từ ngân hàng
              </Button>
              <Button size="sm" onClick={() => setGenerateOpen(true)} disabled={!selectedSubject}>
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
                      <button
                        type="button"
                        className="text-left font-medium hover:underline"
                        onClick={() =>
                          navigate({ to: "/lecturer/quizzes/$quizId", params: { quizId: quiz.id } })
                        }
                      >
                        {quiz.title}
                      </button>
                      <QuizStatusBadge status={quiz.status} />
                      {quiz.aiGenerated && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-violet-500/30 bg-violet-500/10 text-violet-700"
                        >
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
                      {(quiz.variantCount ?? 0) > 1 && <span>{quiz.variantCount} đề</span>}
                      {quiz.showScore === false && <span>Ẩn điểm</span>}
                      {quiz.allowRetake === true && <span>Cho làm lại</span>}
                      {quiz.timeLimitMinutes != null && <span>{quiz.timeLimitMinutes} phút</span>}
                      <span>Tạo {formatDateTimeDMY(quiz.createdAt)}</span>
                      {quiz.publishedAt && (
                        <span>Xuất bản {formatDateTimeDMY(quiz.publishedAt)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate({
                          to: "/lecturer/quiz-results/$quizId",
                          params: { quizId: quiz.id },
                        })
                      }
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Xem điểm
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate({ to: "/lecturer/quizzes/$quizId", params: { quizId: quiz.id } })
                      }
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Chi tiết
                    </Button>
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
                        <DropdownMenuItem
                          onSelect={() =>
                            navigate({
                              to: "/lecturer/quizzes/$quizId",
                              params: { quizId: quiz.id },
                            })
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            navigate({
                              to: "/lecturer/quiz-results/$quizId",
                              params: { quizId: quiz.id },
                            })
                          }
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Xem điểm
                        </DropdownMenuItem>
                        {quiz.status === QUIZ_STATUS.DRAFT && (
                          <DropdownMenuItem
                            onClick={() =>
                              void runAction(
                                quiz.id,
                                () => publishQuiz(quiz.id),
                                "Đã xuất bản quiz",
                              )
                            }
                          >
                            Xuất bản
                          </DropdownMenuItem>
                        )}
                        {quiz.status === QUIZ_STATUS.PUBLISHED && (
                          <Popconfirm
                            title="Đóng quiz?"
                            description={`${quiz.title} sẽ chuyển sang Đã đóng. Không thể mở lại sau khi đóng.`}
                            okText="Đóng quiz"
                            cancelText="Hủy"
                            okButtonProps={{
                              style: {
                                backgroundColor: brandPrimary,
                                borderColor: brandPrimary,
                              },
                            }}
                            icon={<ExclamationCircleFilled style={{ color: brandPrimary }} />}
                            onConfirm={() =>
                              void runAction(quiz.id, () => closeQuiz(quiz.id), "Đã đóng quiz")
                            }
                          >
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              Đóng quiz
                            </DropdownMenuItem>
                          </Popconfirm>
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
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {selectedSubject && (
          <>
            <GenerateQuizModal
              open={generateOpen}
              onOpenChange={setGenerateOpen}
              subjectId={selectedSubject.id}
              subjectLabel={`${selectedSubject.code} — ${selectedSubject.name}`}
              generating={generating}
              onSubmit={handleGenerate}
            />
            <AssembleQuizModal
              open={assembleOpen}
              onOpenChange={setAssembleOpen}
              subjectId={selectedSubject.id}
              subjectLabel={`${selectedSubject.code} — ${selectedSubject.name}`}
              assembling={assembling}
              onSubmit={handleAssemble}
            />
          </>
        )}
      </AppShell>
    </ConfigProvider>
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
  const [allowRetake, setAllowRetake] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setQuestionCount(QUIZ_GENERATE_LIMITS.questionCount.default);
    setTotalPoints(QUIZ_GENERATE_LIMITS.totalPoints.default);
    setTimeLimitMinutes(QUIZ_GENERATE_LIMITS.timeLimitMinutes.default);
    setPointsDistribution(POINTS_DISTRIBUTION.EVEN);
    setAllowRetake(false);
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
    setSelectedDocIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
      allowRetake,
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
                Số câu ({QUIZ_GENERATE_LIMITS.questionCount.min}–
                {QUIZ_GENERATE_LIMITS.questionCount.max})
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
                Tổng điểm ({QUIZ_GENERATE_LIMITS.totalPoints.min}–
                {QUIZ_GENERATE_LIMITS.totalPoints.max})
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
                Thời gian ({QUIZ_GENERATE_LIMITS.timeLimitMinutes.min}–
                {QUIZ_GENERATE_LIMITS.timeLimitMinutes.max} phút)
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
                  setPointsDistribution(
                    v as (typeof POINTS_DISTRIBUTION)[keyof typeof POINTS_DISTRIBUTION],
                  )
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowRetake}
              onChange={(e) => setAllowRetake(e.target.checked)}
            />
            Cho phép sinh viên làm lại
          </label>
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
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bot className="mr-2 h-4 w-4" />
            )}
            Tạo quiz
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function AssembleQuizModal({
  open,
  onOpenChange,
  subjectId,
  subjectLabel,
  assembling,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  subjectLabel: string;
  assembling: boolean;
  onSubmit: (payload: QuizAssemblePayload) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(
    QUIZ_ASSEMBLE_LIMITS.timeLimitMinutes.default,
  );
  const [variantCount, setVariantCount] = useState<number>(
    QUIZ_ASSEMBLE_LIMITS.variantCount.default,
  );
  const [questionsPerVariant, setQuestionsPerVariant] = useState<number>(
    QUIZ_ASSEMBLE_LIMITS.questionsPerVariant.default,
  );
  const [totalPoints, setTotalPoints] = useState<number>(QUIZ_ASSEMBLE_LIMITS.totalPoints.default);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showScore, setShowScore] = useState(true);
  const [allowRetake, setAllowRetake] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<{ id: string; text: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setSelectedIds([]);
    setLoadingBank(true);
    void fetchBankQuestions({ subjectId, active: true, size: 200 })
      .then((page) =>
        setBankQuestions(page.content.map((q) => ({ id: q.id, text: q.questionText }))),
      )
      .catch(() => setBankQuestions([]))
      .finally(() => setLoadingBank(false));
  }, [open, subjectId]);

  const toggleId = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề quiz");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Chọn ít nhất một câu hỏi");
      return;
    }
    void onSubmit({
      subjectId,
      title: title.trim(),
      description: description.trim() || undefined,
      timeLimitMinutes,
      bankQuestionIds: selectedIds,
      questionsPerVariant:
        questionsPerVariant < selectedIds.length ? questionsPerVariant : undefined,
      variantCount,
      shuffleQuestions,
      shuffleOptions,
      showScore,
      allowRetake,
      pointsMode: POINTS_MODE.EVEN,
      totalPoints,
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <ModalHeader>
          <ModalTitle>Lắp quiz từ ngân hàng</ModalTitle>
        </ModalHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Môn: {subjectLabel}</p>
          <div className="space-y-1.5">
            <Label>Tiêu đề</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Mô tả</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Số đề (1–50)</Label>
              <Input
                type="number"
                min={QUIZ_ASSEMBLE_LIMITS.variantCount.min}
                max={QUIZ_ASSEMBLE_LIMITS.variantCount.max}
                value={variantCount}
                onChange={(e) =>
                  setVariantCount(
                    parseBoundedIntInput(
                      e.target.value,
                      QUIZ_ASSEMBLE_LIMITS.variantCount.min,
                      QUIZ_ASSEMBLE_LIMITS.variantCount.max,
                    ),
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Câu/đề</Label>
              <Input
                type="number"
                min={QUIZ_ASSEMBLE_LIMITS.questionsPerVariant.min}
                value={questionsPerVariant}
                onChange={(e) =>
                  setQuestionsPerVariant(
                    parseBoundedIntInput(
                      e.target.value,
                      QUIZ_ASSEMBLE_LIMITS.questionsPerVariant.min,
                      200,
                    ),
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Thời gian (phút)</Label>
              <Input
                type="number"
                min={QUIZ_ASSEMBLE_LIMITS.timeLimitMinutes.min}
                max={QUIZ_ASSEMBLE_LIMITS.timeLimitMinutes.max}
                value={timeLimitMinutes}
                onChange={(e) =>
                  setTimeLimitMinutes(
                    parseBoundedIntInput(
                      e.target.value,
                      QUIZ_ASSEMBLE_LIMITS.timeLimitMinutes.min,
                      QUIZ_ASSEMBLE_LIMITS.timeLimitMinutes.max,
                    ),
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tổng điểm</Label>
              <Input
                type="number"
                min={QUIZ_ASSEMBLE_LIMITS.totalPoints.min}
                value={totalPoints}
                onChange={(e) => setTotalPoints(Number(e.target.value) || 10)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
              />
              Xáo câu hỏi
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
              />
              Xáo đáp án
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showScore}
                onChange={(e) => setShowScore(e.target.checked)}
              />
              Hiện điểm sau nộp
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowRetake}
                onChange={(e) => setAllowRetake(e.target.checked)}
              />
              Cho phép làm lại
            </label>
          </div>
          <div className="space-y-2">
            <Label>Chọn câu hỏi ({selectedIds.length} đã chọn)</Label>
            {loadingBank ? (
              <p className="text-sm text-muted-foreground">Đang tải ngân hàng…</p>
            ) : bankQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có câu hỏi.{" "}
                <Link to="/lecturer/question-bank" className="text-primary underline">
                  Sinh câu hỏi trước
                </Link>
              </p>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {bankQuestions.map((q) => (
                  <label key={q.id} className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedIds.includes(q.id)}
                      onChange={() => toggleId(q.id)}
                    />
                    <span className="line-clamp-2">{q.text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assembling}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={assembling}>
            {assembling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tạo quiz
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
