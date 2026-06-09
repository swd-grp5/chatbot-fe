import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Download, ExternalLink, FileText, Loader2, Trash2, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/shared/components/ui/modal";
import {
  fetchDocumentChunks,
  fetchDocumentFile,
  fetchDocumentViewer,
  isAllowedUploadFile,
  updateDocumentApi,
  uploadDocuments,
  type DocumentChunkResponse,
  type DocumentViewerResponse,
} from "@/features/lecturer/api/document-api";
import { getApiToken } from "@/features/auth/lib/auth-session";
import { ApiError } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import type { Doc } from "@/shared/lib/mock-data";

type PdfDocumentViewerProps = {
  file: Blob;
  scale: number;
  onZoomWheel: (direction: number) => void;
  onVisiblePageChange: (page: number) => void;
};

export type DocumentViewMode = "file" | "index";
export type DocumentModalMode = "view" | "create" | "edit";

type UploadFileDraft = {
  key: string;
  file: File;
  title: string;
  description: string;
};

const uploadDraftKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;
const fileTitleFromName = (file: File) => file.name.replace(/\.[^.]+$/, "");

export type DocumentModalProps = {
  mode: DocumentModalMode | null;
  document?: Doc | null;
  initialViewMode?: DocumentViewMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentsChange?: () => void | Promise<void>;
  courseLabel?: (code: string) => string;
};

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 0.15;
const ZOOM_WHEEL_STEP = 0.05;

function clampZoom(scale: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +scale.toFixed(2)));
}

function scaleToPercent(scale: number) {
  return String(Math.round(scale * 100));
}

class PdfViewerErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function DocumentIndexPanel({
  chunks,
  loading,
  error,
}: {
  chunks: DocumentChunkResponse[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Đang tải nội dung index...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Chưa có nội dung index — tài liệu có thể đang xử lý.
      </p>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      {chunks.map((chunk) => (
        <div
          key={chunk.id}
          className="mb-4 rounded-lg border border-border bg-secondary/30 last:mb-0"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <span className="text-xs font-medium">Đoạn {chunk.chunkIndex + 1}</span>
            <Badge variant="outline" className="text-[10px] font-normal">
              {chunk.tokenCount} tokens
            </Badge>
            {chunk.pageStart != null && (
              <Badge variant="outline" className="text-[10px] font-normal">
                Trang {chunk.pageStart}
                {chunk.pageEnd != null && chunk.pageEnd !== chunk.pageStart
                  ? `–${chunk.pageEnd}`
                  : ""}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">
              ký tự {chunk.startCharIndex}–{chunk.endCharIndex}
            </span>
          </div>
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap wrap-break-word p-3 font-sans text-xs leading-relaxed text-foreground">
            {chunk.content}
          </pre>
        </div>
      ))}
    </div>
  );
}

function DocumentModalCloseButton({ disabled }: { disabled?: boolean }) {
  return (
    <ModalClose asChild>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
        disabled={disabled}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>
    </ModalClose>
  );
}

function DocumentModalShellHeader({
  title,
  description,
  actions,
  closeDisabled,
}: {
  title: string;
  description?: string | null;
  actions?: ReactNode;
  closeDisabled?: boolean;
}) {
  return (
    <ModalHeader className="shrink-0 space-y-0 border-b border-border px-5 py-4 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ModalTitle className="truncate text-base">{title}</ModalTitle>
          {description ? (
            <ModalDescription className="truncate">{description}</ModalDescription>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          <DocumentModalCloseButton disabled={closeDisabled} />
        </div>
      </div>
    </ModalHeader>
  );
}

function DocumentModalShellFooter({ children }: { children: ReactNode }) {
  return (
    <ModalFooter className="shrink-0 border-t border-border px-5 py-3 sm:space-x-2">
      {children}
    </ModalFooter>
  );
}

export function DocumentModal({
  mode,
  document = null,
  initialViewMode = "file",
  open,
  onOpenChange,
  onDocumentsChange,
  courseLabel,
}: DocumentModalProps) {
  const documentId = mode === "view" ? (document?.id ?? null) : null;
  const documentName = document?.name;

  const [viewMode, setViewMode] = useState<DocumentViewMode>(initialViewMode);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [uploadDrafts, setUploadDrafts] = useState<UploadFileDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [meta, setMeta] = useState<DocumentViewerResponse | null>(null);
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [chunks, setChunks] = useState<DocumentChunkResponse[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunksError, setChunksError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [zoomInput, setZoomInput] = useState("100");
  const [visiblePage, setVisiblePage] = useState(1);
  const [PdfViewer, setPdfViewer] = useState<ComponentType<PdfDocumentViewerProps> | null>(
    null,
  );
  const isEditingZoom = useRef(false);
  const chunksLoadedFor = useRef<string | null>(null);

  const zoomIn = useCallback(
    () => setScale((s) => clampZoom(s + ZOOM_STEP)),
    [],
  );
  const zoomOut = useCallback(
    () => setScale((s) => clampZoom(s - ZOOM_STEP)),
    [],
  );
  const setScaleImmediate = useCallback((next: number) => {
    const clamped = clampZoom(next);
    setScale(clamped);
    setZoomInput(scaleToPercent(clamped));
  }, []);

  const resetZoom = useCallback(() => setScaleImmediate(1), [setScaleImmediate]);

  const handleZoomWheel = useCallback(
    (direction: number) => {
      setScale((s) => clampZoom(s + direction * ZOOM_WHEEL_STEP));
    },
    [],
  );

  const applyZoomInput = useCallback(() => {
    isEditingZoom.current = false;
    const parsed = Number.parseInt(zoomInput, 10);
    if (Number.isNaN(parsed)) {
      setZoomInput(scaleToPercent(scale));
      return;
    }
    setScaleImmediate(parsed / 100);
  }, [zoomInput, scale, setScaleImmediate]);

  useEffect(() => {
    if (!isEditingZoom.current) {
      setZoomInput(scaleToPercent(scale));
    }
  }, [scale]);

  const resetFormState = useCallback(() => {
    setTitle("");
    setDescription("");
    setActive(true);
    setUploadDrafts([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!open) {
      setViewMode("file");
      setChunks([]);
      setChunksLoading(false);
      setChunksError(null);
      chunksLoadedFor.current = null;
      resetFormState();
      return;
    }

    if (mode === "view") {
      setViewMode(initialViewMode);
    } else if (mode === "create") {
      resetFormState();
    } else if (mode === "edit" && document) {
      setTitle(document.title ?? document.name);
      setDescription(document.description ?? "");
      setActive(document.active ?? true);
    }
  }, [open, mode, initialViewMode, documentId, document, resetFormState]);

  useEffect(() => {
    if (!open || mode !== "view" || viewMode !== "index" || !documentId) return;
    if (chunksLoadedFor.current === documentId) return;

    const id = documentId;
    let cancelled = false;

    async function loadChunks() {
      const token = getApiToken();
      if (!token) {
        setChunksError("Phiên đăng nhập hết hạn");
        return;
      }

      setChunksLoading(true);
      setChunksError(null);
      setChunks([]);

      try {
        const data = await fetchDocumentChunks(id, token);
        if (cancelled) return;
        setChunks(data.sort((a, b) => a.chunkIndex - b.chunkIndex));
        chunksLoadedFor.current = id;
      } catch (e) {
        if (cancelled) return;
        setChunksError(e instanceof ApiError ? e.message : "Không tải được nội dung index");
      } finally {
        if (!cancelled) setChunksLoading(false);
      }
    }

    void loadChunks();

    return () => {
      cancelled = true;
    };
  }, [open, mode, viewMode, documentId]);

  useEffect(() => {
    if (!open || mode !== "view" || !documentId) return;

    const id = documentId;
    let cancelled = false;

    async function load() {
      const token = getApiToken();
      if (!token) {
        setError("Phiên đăng nhập hết hạn");
        return;
      }

      setLoading(true);
      setError(null);
      setMeta(null);
      setFileData(null);
      setPdfBlob(null);
      setTextContent(null);
      setScale(1);
      setZoomInput("100");
      setVisiblePage(1);
      setPdfViewer(null);
      setChunks([]);
      setChunksLoading(false);
      setChunksError(null);
      chunksLoadedFor.current = null;

      try {
        const viewer = await fetchDocumentViewer(id, token);
        if (cancelled) return;
        setMeta(viewer);

        const blob = await fetchDocumentFile(id, token);
        if (cancelled) return;

        if (viewer.mimeType === "text/plain" || viewer.documentType === "TXT") {
          setTextContent(await blob.text());
          return;
        }

        setPdfBlob(blob);
        setFileData(await blob.arrayBuffer());
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Không tải được tài liệu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, mode, documentId]);

  const isPdf = meta?.mimeType === "application/pdf" || meta?.documentType === "PDF";

  useEffect(() => {
    if (!open || mode !== "view") {
      setMeta(null);
      setFileData(null);
      setPdfBlob(null);
      setTextContent(null);
      setError(null);
      setLoading(false);
      setScale(1);
      setZoomInput("100");
      setVisiblePage(1);
      setPdfViewer(null);
      return;
    }

    if (!pdfBlob || !isPdf) {
      setPdfViewer(null);
      return;
    }

    let cancelled = false;

    import("./pdf-viewer").then((mod) => {
      if (!cancelled) setPdfViewer(() => mod.PdfViewer);
    });

    return () => {
      cancelled = true;
    };
  }, [open, mode, pdfBlob, isPdf, documentId]);

  useEffect(() => {
    if (!open || mode !== "view" || !isPdf || !pdfBlob) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        zoomIn();
      } else if (event.key === "-") {
        event.preventDefault();
        zoomOut();
      } else if (event.key === "0") {
        event.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, mode, isPdf, pdfBlob, zoomIn, zoomOut, resetZoom]);

  const handleOpenChange = (next: boolean) => {
    if (!next && submitting) return;
    if (!next) {
      setFileData(null);
      setPdfBlob(null);
      setPdfViewer(null);
      setChunks([]);
      setChunksLoading(false);
      setChunksError(null);
      chunksLoadedFor.current = null;
      resetFormState();
    }
    onOpenChange(next);
  };

  const updateUploadDraft = (
    key: string,
    patch: Partial<Pick<UploadFileDraft, "title" | "description">>,
  ) => {
    setUploadDrafts((prev) =>
      prev.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)),
    );
  };

  const removeUploadDraft = (key: string) => {
    setUploadDrafts((prev) => prev.filter((draft) => draft.key !== key));
  };

  const handleFilePick = (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files);
    const valid = picked.filter((file) => isAllowedUploadFile(file));
    const invalidCount = picked.length - valid.length;
    if (invalidCount > 0) {
      toast.error("Chỉ hỗ trợ PDF, DOCX, TXT");
    }
    if (!valid.length) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploadDrafts(
      valid.map((file) => ({
        key: uploadDraftKey(file),
        file,
        title: fileTitleFromName(file),
        description: "",
      })),
    );
  };

  const handleCreate = async () => {
    if (!uploadDrafts.length) {
      toast.error("Chọn file để tải lên");
      return;
    }

    for (const draft of uploadDrafts) {
      if (!draft.title.trim()) {
        toast.error(`Tiêu đề không được để trống (${draft.file.name})`);
        return;
      }
      if (draft.file.size === 0) {
        toast.error(`File rỗng: ${draft.file.name}`);
        return;
      }
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Phiên đăng nhập hết hạn");
      return;
    }

    const items = uploadDrafts.map((draft) => ({
      file: draft.file,
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
    }));

    setSubmitting(true);
    try {
      await uploadDocuments(items, token);
      await onDocumentsChange?.();
      toast.success(
        items.length === 1 ? "Đã tải lên tài liệu" : `Đã tải lên ${items.length} tài liệu`,
      );
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!document) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Tiêu đề không được để trống");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Phiên đăng nhập hết hạn");
      return;
    }

    setSubmitting(true);
    try {
      await updateDocumentApi(document.id, token, {
        title: trimmedTitle,
        description: description.trim(),
        active,
      });
      await onDocumentsChange?.();
      toast.success("Đã cập nhật tài liệu");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Cập nhật thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const showFileActions = viewMode === "file" && meta && (pdfBlob || fileData || textContent);
  const showFileContent = viewMode === "file";
  const showIndexContent = viewMode === "index";

  const downloadFile = () => {
    if (!meta) return;
    const anchor = document.createElement("a");
    if (fileData) {
      anchor.href = URL.createObjectURL(new Blob([fileData], { type: meta.mimeType }));
    } else if (textContent) {
      anchor.href = URL.createObjectURL(new Blob([textContent], { type: "text/plain" }));
    } else {
      return;
    }
    anchor.download = meta.fileName;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  const openInBrowserViewer = () => {
    if (!meta) return;

    let blob: Blob | null = null;
    if (pdfBlob) {
      blob = pdfBlob;
    } else if (textContent) {
      blob = new Blob([textContent], { type: meta.mimeType });
    } else if (fileData) {
      blob = new Blob([fileData], { type: meta.mimeType });
    }
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      URL.revokeObjectURL(url);
    }
  };

  const isFormMode = mode === "create" || mode === "edit";

  const modalTitle =
    mode === "view"
      ? (meta?.title ?? documentName ?? "Xem tài liệu")
      : mode === "create"
        ? "Thêm tài liệu"
        : "Sửa tài liệu";

  const modalDescription =
    mode === "view"
      ? viewMode === "index" && chunks.length > 0
        ? `${meta?.fileName ?? documentName} · ${chunks.length} đoạn`
        : (meta?.fileName ?? documentName ?? null)
      : mode === "edit" && document && courseLabel
        ? `Môn: ${courseLabel(document.course)} (${document.course})`
        : mode === "create"
          ? "PDF · DOCX · TXT"
          : null;

  const viewHeaderActions = (
    <>
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as DocumentViewMode)}>
        <TabsList className="h-8">
          <TabsTrigger value="file" className="h-7 px-3 text-xs">
            Tệp gốc
          </TabsTrigger>
          <TabsTrigger value="index" className="h-7 px-3 text-xs">
            Nội dung index
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {showFileActions && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={openInBrowserViewer}
            title="Mở bằng viewer mặc định của trình duyệt"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={downloadFile}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </>
  );

  const formBody = isFormMode && (
    <div className="min-w-0 space-y-4 overflow-hidden">
      {mode === "create" ? (
        <div className="min-w-0 space-y-3 overflow-hidden">
          <div className="space-y-1.5">
            <Label>File *</Label>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
            >
              <Upload className="h-4 w-4" />
              Chọn file
            </Button>
          </div>
          {uploadDrafts.length > 0 && (
            <div className="max-h-[min(50vh,24rem)] space-y-3 overflow-y-auto pr-1">
              {uploadDrafts.map((draft, index) => (
                <div
                  key={draft.key}
                  className="space-y-2.5 rounded-lg border border-border bg-secondary/20 p-3"
                >
                  <div className="flex items-start gap-2">
                    <p
                      className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground"
                      title={draft.file.name}
                    >
                      {draft.file.name}
                    </p>
                    {uploadDrafts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeUploadDraft(draft.key)}
                        disabled={submitting}
                        title="Bỏ file"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`doc-upload-title-${draft.key}`}>
                      Tiêu đề *
                      {uploadDrafts.length > 1 ? ` (${index + 1})` : ""}
                    </Label>
                    <Input
                      id={`doc-upload-title-${draft.key}`}
                      value={draft.title}
                      onChange={(e) =>
                        updateUploadDraft(draft.key, { title: e.target.value })
                      }
                      placeholder="Tiêu đề tài liệu"
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`doc-upload-description-${draft.key}`}>Mô tả</Label>
                    <Textarea
                      id={`doc-upload-description-${draft.key}`}
                      value={draft.description}
                      onChange={(e) =>
                        updateUploadDraft(draft.key, { description: e.target.value })
                      }
                      placeholder="Mô tả ngắn gọn về tài liệu"
                      rows={2}
                      disabled={submitting}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="doc-modal-title">Tiêu đề *</Label>
            <Input
              id="doc-modal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-modal-description">Mô tả</Label>
            <Textarea
              id="doc-modal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={submitting}
            />
          </div>
        </>
      )}
      {mode === "edit" && (
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div className="space-y-0.5">
            <Label htmlFor="doc-modal-active" className="text-sm font-medium">
              Kích hoạt
            </Label>
            <p className="text-xs text-muted-foreground">
              Tài liệu tắt sẽ không dùng cho chatbot
            </p>
          </div>
          <Switch
            id="doc-modal-active"
            checked={active}
            onCheckedChange={setActive}
            disabled={submitting}
          />
        </div>
      )}
    </div>
  );

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      {isFormMode && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => handleFilePick(e.target.files)}
        />
      )}
      <ModalContent
        showCloseButton={false}
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          mode === "view"
            ? "h-[92vh] max-w-5xl"
            : mode === "create"
              ? "min-w-0 sm:max-w-lg"
              : "min-w-0 sm:max-w-md",
        )}
      >
        <DocumentModalShellHeader
          title={modalTitle}
          description={modalDescription}
          actions={mode === "view" ? viewHeaderActions : undefined}
          closeDisabled={submitting}
        />

        <div
          className={cn(
            mode === "view"
              ? "relative min-h-0 flex-1 bg-muted/40"
              : "min-w-0 flex-1 overflow-y-auto px-5 py-4",
          )}
        >
          {isFormMode ? formBody : null}

          {mode === "view" && (
            <>
          {showIndexContent && (
            <DocumentIndexPanel chunks={chunks} loading={chunksLoading} error={chunksError} />
          )}

          {showFileContent && loading && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Đang tải tài liệu...</p>
            </div>
          )}

          {showFileContent && !loading && error && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {showFileContent && open && !loading && !error && pdfBlob && isPdf && (
            <div className="h-full min-h-0">
              {PdfViewer ? (
                <PdfViewerErrorBoundary
                  key={documentId ?? "pdf"}
                  fallback={
                    <p className="py-12 text-center text-sm text-destructive">
                      Không hiển thị được PDF. Thử tải file xuống.
                    </p>
                  }
                >
                  <PdfViewer
                    file={pdfBlob}
                    scale={scale}
                    onZoomWheel={handleZoomWheel}
                    onVisiblePageChange={setVisiblePage}
                  />
                </PdfViewerErrorBoundary>
              ) : (
                <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang khởi tạo PDF viewer...
                </div>
              )}
            </div>
          )}

          {showFileContent && !loading && !error && fileData && !isPdf && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 px-6 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Định dạng {meta?.documentType} chưa hỗ trợ xem trực tiếp.
              </p>
              <Button className="gap-1.5" onClick={downloadFile}>
                <Download className="h-4 w-4" />
                Tải file để xem
              </Button>
            </div>
          )}

          {showFileContent && !loading && !error && textContent != null && (
            <pre className="whitespace-pre-wrap wrap-break-word p-6 font-sans text-sm leading-relaxed">
              {textContent}
            </pre>
          )}

          {showFileContent && isPdf && pdfBlob && !loading && !error && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-4">
              <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-border/60 bg-background/90 px-2 py-1.5 shadow-md backdrop-blur-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={scale <= MIN_ZOOM}
                  onClick={zoomOut}
                  title="Thu nhỏ (Ctrl + -)"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    aria-label="Tỷ lệ zoom"
                    className="h-8 w-16 border-border/60 bg-background px-2 pr-5 text-center text-xs tabular-nums shadow-none"
                    value={zoomInput}
                    onFocus={() => {
                      isEditingZoom.current = true;
                    }}
                    onChange={(event) => {
                      setZoomInput(event.target.value.replace(/\D/g, ""));
                    }}
                    onBlur={applyZoomInput}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        applyZoomInput();
                        event.currentTarget.blur();
                      }
                      if (event.key === "Escape") {
                        isEditingZoom.current = false;
                        setZoomInput(scaleToPercent(scale));
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={scale >= MAX_ZOOM}
                  onClick={zoomIn}
                  title="Phóng to (Ctrl + +)"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {meta && meta.totalPages > 0 && (
                <div className="rounded-lg border border-border/60 bg-background/90 px-3 py-2 text-xs tabular-nums text-muted-foreground shadow-md backdrop-blur-sm">
                  Trang {visiblePage}/{meta.totalPages}
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>

        {isFormMode && (
          <DocumentModalShellFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Huỷ
            </Button>
            {mode === "create" ? (
              <Button className="gap-2" onClick={handleCreate} disabled={submitting}>
                <Upload className="h-4 w-4" />
                {submitting ? "Đang tải lên..." : "Tải lên"}
              </Button>
            ) : (
              <Button onClick={handleSaveEdit} disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu"}
              </Button>
            )}
          </DocumentModalShellFooter>
        )}
      </ModalContent>
    </Modal>
  );
}
