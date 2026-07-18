import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bot, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AppShell } from "@/shared/components/layout/app-shell";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/shared/components/ui/modal";
import { DocumentsSubjectSelect } from "@/features/lecturer/components/documents-subject-select";
import { useLecturerMySubjects } from "@/features/lecturer/hooks/use-lecturer-my-subjects";
import { fetchDocuments } from "@/features/lecturer/api/document-api";
import {
  createBankQuestion,
  deleteBankQuestion,
  fetchBankQuestions,
  generateBankQuestions,
  toggleBankQuestionActive,
  type BankQuestion,
} from "@/features/quiz/api/question-bank-api";
import {
  fetchActiveQuestionTypes,
  MULTIPLE_CHOICE_MODE,
  MULTIPLE_CHOICE_MODE_LABELS,
  QUIZ_GENERATE_LIMITS,
  parseBoundedIntInput,
  type MultipleChoiceMode,
  type QuizOptionPayload,
} from "@/features/quiz/api/quiz-api";
import { cn } from "@/shared/lib/utils";
import { ApiError } from "@/shared/lib/api-client";
import { formatDateTimeDMY } from "@/shared/lib/format-time";
import { toast } from "@/shared/lib/toast";
import { useAuth } from "@/features/auth/lib/auth-context";

export function LecturerQuestionBankPage() {
  const { user } = useAuth();
  const { data: subjects = [], isLoading: subjectsLoading } = useLecturerMySubjects(
    user?.role === "lecturer",
  );

  const [subjectCode, setSubjectCode] = useState("");
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.code === subjectCode) ?? null,
    [subjects, subjectCode],
  );

  useEffect(() => {
    if (!subjectCode && subjects.length > 0) setSubjectCode(subjects[0].code);
  }, [subjects, subjectCode]);

  const load = useCallback(async () => {
    if (!selectedSubject) return;
    setLoading(true);
    try {
      const page = await fetchBankQuestions({
        subjectId: selectedSubject.id,
        active: true,
        size: 100,
        sortBy: "createdAt",
        sortDir: "desc",
      });
      setQuestions(page.content);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Không tải được kho Quiz");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (!user || user.role !== "lecturer" || !selectedSubject) return;
    void load();
  }, [user, selectedSubject, load]);

  const handleCreate = async (payload: {
    questionText: string;
    multipleChoiceMode: MultipleChoiceMode;
    defaultPoints?: number;
    options: QuizOptionPayload[];
  }) => {
    if (!selectedSubject) return;
    setCreating(true);
    try {
      const types = await fetchActiveQuestionTypes();
      const mcType = types.find((t) => t.code === "MULTIPLE_CHOICE");
      if (!mcType) {
        toast.error("Không tìm thấy loại câu hỏi trắc nghiệm");
        return;
      }
      await createBankQuestion({
        subjectId: selectedSubject.id,
        questionTypeId: mcType.id,
        questionText: payload.questionText,
        multipleChoiceMode: payload.multipleChoiceMode,
        defaultPoints: payload.defaultPoints,
        options: payload.options,
      });
      toast.success("Đã thêm câu hỏi vào ngân hàng");
      setCreateOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Tạo câu hỏi thất bại");
    } finally {
      setCreating(false);
    }
  };

  const handleGenerate = async (count: number, docIds: string[]) => {
    if (!selectedSubject) return;
    setGenerating(true);
    try {
      const created = await generateBankQuestions({
        subjectId: selectedSubject.id,
        questionCount: count,
        documentIds: docIds.length > 0 ? docIds : undefined,
      });
      toast.success(`AI đã thêm ${created.length} câu vào ngân hàng`);
      setGenerateOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Sinh câu hỏi thất bại");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Kho Quiz</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Lưu câu hỏi theo môn, dùng để lắp quiz hoặc sinh bằng AI.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/lecturer/quizzes">Quiz</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              Làm mới
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
              disabled={!selectedSubject}
            >
              <Plus className="mr-2 h-4 w-4" />
              Thêm câu hỏi
            </Button>
            <Button size="sm" onClick={() => setGenerateOpen(true)} disabled={!selectedSubject}>
              <Bot className="mr-2 h-4 w-4" />
              Sinh bằng AI
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="min-w-60 max-w-md space-y-1.5">
            <Label>Môn học</Label>
            <DocumentsSubjectSelect
              subjects={subjects}
              value={subjectCode}
              onValueChange={setSubjectCode}
              loading={subjectsLoading}
            />
          </div>
        </Card>

        {loading ? (
          <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải…
          </Card>
        ) : questions.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Chưa có câu hỏi. Thêm thủ công, sinh bằng AI, hoặc tạo quiz — câu hỏi sẽ lưu vào ngân
            hàng.
          </Card>
        ) : (
          <div className="space-y-2">
            {questions.map((q, i) => (
              <Card key={q.id} className="flex flex-wrap items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                    {q.aiGenerated && (
                      <Badge variant="outline" className="gap-1 text-violet-700">
                        <Bot className="h-3 w-3" />
                        AI
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {MULTIPLE_CHOICE_MODE_LABELS[q.multipleChoiceMode]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm">{q.questionText}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q.options.length} đáp án
                    {q.defaultPoints != null && ` · ${q.defaultPoints} điểm`}
                    {` · ${formatDateTimeDMY(q.createdAt)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionId === q.id}
                    onClick={() => {
                      setActionId(q.id);
                      void toggleBankQuestionActive(q.id)
                        .then(() => load())
                        .catch((e) =>
                          toast.error(e instanceof ApiError ? e.message : "Thao tác thất bại"),
                        )
                        .finally(() => setActionId(null));
                    }}
                  >
                    Tắt
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={actionId === q.id}
                    onClick={() => {
                      if (!confirm("Xóa câu hỏi khỏi ngân hàng?")) return;
                      setActionId(q.id);
                      void deleteBankQuestion(q.id)
                        .then(() => {
                          toast.success("Đã xóa");
                          return load();
                        })
                        .catch((e) =>
                          toast.error(e instanceof ApiError ? e.message : "Xóa thất bại"),
                        )
                        .finally(() => setActionId(null));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedSubject && (
        <>
          <CreateBankQuestionModal
            open={createOpen}
            onOpenChange={setCreateOpen}
            creating={creating}
            onSubmit={handleCreate}
          />
          <GenerateBankModal
            open={generateOpen}
            onOpenChange={setGenerateOpen}
            subjectId={selectedSubject.id}
            generating={generating}
            onSubmit={handleGenerate}
          />
        </>
      )}
    </AppShell>
  );
}

const DEFAULT_OPTIONS: QuizOptionPayload[] = [
  { optionText: "", isCorrect: true, sortOrder: 0 },
  { optionText: "", isCorrect: false, sortOrder: 1 },
  { optionText: "", isCorrect: false, sortOrder: 2 },
  { optionText: "", isCorrect: false, sortOrder: 3 },
];

function CreateBankQuestionModal({
  open,
  onOpenChange,
  creating,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  onSubmit: (payload: {
    questionText: string;
    multipleChoiceMode: MultipleChoiceMode;
    defaultPoints?: number;
    options: QuizOptionPayload[];
  }) => Promise<void>;
}) {
  const [questionText, setQuestionText] = useState("");
  const [multipleChoiceMode, setMultipleChoiceMode] = useState<MultipleChoiceMode>(
    MULTIPLE_CHOICE_MODE.SINGLE,
  );
  const [defaultPoints, setDefaultPoints] = useState("");
  const [options, setOptions] = useState<QuizOptionPayload[]>(DEFAULT_OPTIONS);

  useEffect(() => {
    if (!open) return;
    setQuestionText("");
    setMultipleChoiceMode(MULTIPLE_CHOICE_MODE.SINGLE);
    setDefaultPoints("");
    setOptions(DEFAULT_OPTIONS.map((o) => ({ ...o })));
  }, [open]);

  const isSingle = multipleChoiceMode === MULTIPLE_CHOICE_MODE.SINGLE;

  const updateOption = (index: number, patch: Partial<QuizOptionPayload>) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const setSingleCorrect = (index: number) => {
    setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === index })));
  };

  const handleSubmit = () => {
    const text = questionText.trim();
    if (!text) {
      toast.error("Nhập nội dung câu hỏi");
      return;
    }
    const filled = options.filter((o) => o.optionText.trim());
    if (filled.length < 2) {
      toast.error("Cần ít nhất 2 đáp án có nội dung");
      return;
    }
    const normalized = filled.map((o, i) => ({
      optionText: o.optionText.trim(),
      isCorrect: o.isCorrect,
      sortOrder: i,
    }));
    const correctCount = normalized.filter((o) => o.isCorrect).length;
    if (isSingle && correctCount !== 1) {
      toast.error("Câu một đáp án phải có đúng 1 đáp án đúng");
      return;
    }
    if (!isSingle && correctCount < 1) {
      toast.error("Câu nhiều đáp án phải có ít nhất 1 đáp án đúng");
      return;
    }
    const points = defaultPoints.trim() ? Number(defaultPoints) : undefined;
    void onSubmit({
      questionText: text,
      multipleChoiceMode,
      defaultPoints: points != null && Number.isFinite(points) ? points : undefined,
      options: normalized,
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-lg">
        <ModalHeader>
          <ModalTitle>Thêm câu hỏi thủ công</ModalTitle>
        </ModalHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2">
          <div className="space-y-1.5">
            <Label>Nội dung câu hỏi</Label>
            <Textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              placeholder="Nhập câu hỏi…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Loại trắc nghiệm</Label>
              <Select
                value={multipleChoiceMode}
                onValueChange={(v) => setMultipleChoiceMode(v as MultipleChoiceMode)}
              >
                <SelectTrigger>
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
            <div className="space-y-1.5">
              <Label>Điểm mặc định (tuỳ chọn)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={defaultPoints}
                onChange={(e) => setDefaultPoints(e.target.value)}
                placeholder="VD: 1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Đáp án</Label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                {isSingle ? (
                  <input
                    type="radio"
                    name="bank-create-correct"
                    checked={option.isCorrect}
                    onChange={() => setSingleCorrect(index)}
                    className="shrink-0"
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={option.isCorrect}
                    onChange={(e) => updateOption(index, { isCorrect: e.target.checked })}
                    className="shrink-0"
                  />
                )}
                <Input
                  value={option.optionText}
                  onChange={(e) => updateOption(index, { optionText: e.target.value })}
                  placeholder={`Đáp án ${index + 1}`}
                  className={cn(option.isCorrect && "border-emerald-500/50")}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setOptions((prev) =>
                        prev.filter((_, i) => i !== index).map((o, i) => ({ ...o, sortOrder: i })),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setOptions((prev) => [
                  ...prev,
                  { optionText: "", isCorrect: false, sortOrder: prev.length },
                ])
              }
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Thêm đáp án
            </Button>
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu câu hỏi
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function GenerateBankModal({
  open,
  onOpenChange,
  subjectId,
  generating,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  generating: boolean;
  onSubmit: (count: number, docIds: string[]) => Promise<void>;
}) {
  const [questionCount, setQuestionCount] = useState<number>(
    QUIZ_GENERATE_LIMITS.questionCount.default,
  );
  const [documents, setDocuments] = useState<{ id: string; title: string }[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuestionCount(QUIZ_GENERATE_LIMITS.questionCount.default);
    setSelectedDocIds([]);
    void fetchDocuments({ subjectId, status: "INDEXED", active: true, size: 100 })
      .then((page) => setDocuments(page.content.map((d) => ({ id: d.id, title: d.title }))))
      .catch(() => setDocuments([]));
  }, [open, subjectId]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-md">
        <ModalHeader>
          <ModalTitle>Sinh câu hỏi vào ngân hàng</ModalTitle>
        </ModalHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>
              Số câu ({QUIZ_GENERATE_LIMITS.questionCount.min}–
              {QUIZ_GENERATE_LIMITS.questionCount.max})
            </Label>
            <Input
              type="number"
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
          {documents.length > 0 && (
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
              {documents.map((doc) => (
                <label key={doc.id} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedDocIds.includes(doc.id)}
                    onChange={() =>
                      setSelectedDocIds((prev) =>
                        prev.includes(doc.id)
                          ? prev.filter((x) => x !== doc.id)
                          : [...prev, doc.id],
                      )
                    }
                  />
                  <span className="truncate">{doc.title}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Hủy
          </Button>
          <Button
            onClick={() => void onSubmit(questionCount, selectedDocIds)}
            disabled={generating}
          >
            {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sinh câu hỏi
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
