import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Download, FileText, Loader2, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  fetchDocumentFile,
  fetchDocumentViewer,
  type DocumentViewerResponse,
} from "@/features/lecturer/api/document-api";
import { getApiToken } from "@/features/auth/lib/auth-session";
import { ApiError } from "@/shared/lib/api-client";

type PdfDocumentViewerProps = {
  file: Blob;
  scale: number;
  onZoomWheel: (direction: number) => void;
  onVisiblePageChange: (page: number) => void;
};

type DocumentViewerModalProps = {
  documentId: string | null;
  documentName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function DocumentViewerModal({
  documentId,
  documentName,
  open,
  onOpenChange,
}: DocumentViewerModalProps) {
  const [meta, setMeta] = useState<DocumentViewerResponse | null>(null);
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [zoomInput, setZoomInput] = useState("100");
  const [visiblePage, setVisiblePage] = useState(1);
  const [PdfViewer, setPdfViewer] = useState<ComponentType<PdfDocumentViewerProps> | null>(
    null,
  );
  const isEditingZoom = useRef(false);

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

  useEffect(() => {
    if (!open || !documentId) return;

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
  }, [open, documentId]);

  const isPdf = meta?.mimeType === "application/pdf" || meta?.documentType === "PDF";

  useEffect(() => {
    if (!open) {
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
  }, [open, pdfBlob, isPdf, documentId]);

  useEffect(() => {
    if (!open || !isPdf || !pdfBlob) return;

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
  }, [open, isPdf, pdfBlob, zoomIn, zoomOut, resetZoom]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFileData(null);
      setPdfBlob(null);
      setPdfViewer(null);
    }
    onOpenChange(next);
  };

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName="bg-black/30"
        showCloseButton={false}
        className="flex h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base">
                {meta?.title ?? documentName ?? "Xem tài liệu"}
              </DialogTitle>
              <DialogDescription className="truncate">
                {meta?.fileName ?? documentName}
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {meta && (fileData || textContent) && (
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={downloadFile}>
                  <Download className="h-3.5 w-3.5" />
                  Tải xuống
                </Button>
              )}
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="relative min-h-0 flex-1 bg-muted/40">
          {loading && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Đang tải tài liệu...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {open && !loading && !error && pdfBlob && isPdf && (
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

          {!loading && !error && fileData && !isPdf && (
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

          {!loading && !error && textContent != null && (
            <pre className="whitespace-pre-wrap wrap-break-word p-6 font-sans text-sm leading-relaxed">
              {textContent}
            </pre>
          )}

          {isPdf && pdfBlob && !loading && !error && (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
