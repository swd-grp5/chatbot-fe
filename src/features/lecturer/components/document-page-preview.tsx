import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { fetchDocumentFile, fetchDocumentViewer } from "@/features/lecturer/api/document-api";
import { DocxPreviewViewer } from "@/features/lecturer/components/docx-preview-viewer";
import { documentTypeStyle } from "@/features/lecturer/components/documents-table-ui";
import { DOCX_MIME, isPdfBytes, isZipBytes, toDocxBlob } from "@/features/lecturer/lib/file-bytes";
import { getApiToken } from "@/features/auth/lib/auth-session";
import { cn } from "@/shared/lib/utils";
import type { Doc } from "@/shared/lib/mock-data";

const PdfPageThumbnail = lazy(() =>
  import("./pdf-page-thumbnail").then((m) => ({ default: m.PdfPageThumbnail })),
);

type PreviewCacheEntry = {
  kind: "pdf";
  blob: Blob;
} | {
  kind: "text";
  text: string;
} | {
  kind: "docx";
  blob: Blob;
} | {
  kind: "placeholder";
};

const previewCache = new Map<string, PreviewCacheEntry>();

type DocumentPagePreviewProps = {
  doc: Doc;
  className?: string;
};

export function DocumentPagePreview({ doc, className }: DocumentPagePreviewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<PreviewCacheEntry | null>(
    () => previewCache.get(doc.id) ?? null,
  );
  const canPreview = doc.status === "indexed";
  const docType = documentTypeStyle(doc.type);
  const placeholder = (
    <PlaceholderPreview label={docType.label} className={docType.className} />
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([item]) => {
        if (item?.isIntersecting) setVisible(true);
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !canPreview) return;

    const cached = previewCache.get(doc.id);
    if (cached) {
      setEntry(cached);
      return;
    }

    let cancelled = false;

    async function loadPreview() {
      const token = getApiToken();
      if (!token) return;

      setLoading(true);
      try {
        const viewer = await fetchDocumentViewer(doc.id, token);
        if (cancelled) return;

        const isText =
          viewer.mimeType === "text/plain" || viewer.documentType === "TXT";

        const blob = await fetchDocumentFile(doc.id, token);
        if (cancelled) return;

        if (isText) {
          const text = (await blob.text()).trim();
          const next: PreviewCacheEntry = {
            kind: "text",
            text: text.slice(0, 600) || "Tài liệu trống",
          };
          previewCache.set(doc.id, next);
          setEntry(next);
          return;
        }

        const buffer = await blob.arrayBuffer();
        if (cancelled) return;

        if (isPdfBytes(buffer)) {
          const next: PreviewCacheEntry = {
            kind: "pdf",
            blob: new Blob([buffer], { type: "application/pdf" }),
          };
          previewCache.set(doc.id, next);
          setEntry(next);
          return;
        }

        if (isZipBytes(buffer)) {
          const next: PreviewCacheEntry = {
            kind: "docx",
            blob: toDocxBlob(buffer, blob.type || DOCX_MIME),
          };
          previewCache.set(doc.id, next);
          setEntry(next);
          return;
        }

        const next: PreviewCacheEntry = { kind: "placeholder" };
        previewCache.set(doc.id, next);
        setEntry(next);
      } catch (err) {
        console.error("Document preview failed:", doc.id, err);
        if (!cancelled) {
          setEntry({ kind: "placeholder" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [visible, canPreview, doc.id]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex aspect-3/4 w-full items-center justify-center overflow-hidden bg-secondary/30",
        className,
      )}
    >
      {!canPreview && (
        <div className="flex flex-col items-center gap-2 px-4 text-center text-xs text-muted-foreground">
          <FileText className="h-8 w-8 opacity-40" />
          <span>Chưa sẵn sàng xem trước</span>
        </div>
      )}

      {canPreview && loading && !entry && (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      )}

      {canPreview && entry?.kind === "pdf" && (
        <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}>
          <PdfPageThumbnail blob={entry.blob} fallback={placeholder} />
        </Suspense>
      )}

      {canPreview && entry?.kind === "text" && (
        <pre className="h-full w-full overflow-hidden p-3 text-left font-sans text-[10px] leading-relaxed text-foreground/80">
          {entry.text}
        </pre>
      )}

      {canPreview && entry?.kind === "docx" && (
        <DocxPreviewViewer data={entry.blob} compact className="h-full w-full" />
      )}

      {canPreview && entry?.kind === "placeholder" && placeholder}

      {canPreview && !loading && !entry && !visible && (
        <PlaceholderPreview label={docType.label} className={docType.className} muted />
      )}
    </div>
  );
}

function PlaceholderPreview({
  label,
  className,
  muted,
}: {
  label: string;
  className: string;
  muted?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-4 text-center", muted && "opacity-60")}>
      <span
        className={cn(
          "rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase",
          className,
        )}
      >
        {label}
      </span>
      <span className="text-xs text-muted-foreground">Không có xem trước trang</span>
    </div>
  );
}
