import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import {
  documentPreviewImageSrc,
  fetchDocumentPreview,
} from "@/features/lecturer/api/document-api";
import { documentTypeStyle } from "@/features/lecturer/components/documents-table-ui";
import { cn } from "@/shared/lib/utils";
import type { Doc } from "@/shared/lib/mock-data";

type PreviewCacheEntry =
  | { kind: "image"; src: string }
  | { kind: "text"; text: string }
  | { kind: "placeholder" };

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
      setLoading(true);
      try {
        const preview = await fetchDocumentPreview(doc.id);
        if (cancelled) return;

        let next: PreviewCacheEntry;

        if (preview.previewContentType === "IMAGE" || preview.contentBase64) {
          const imageSrc = documentPreviewImageSrc(preview);
          if (imageSrc) {
            next = { kind: "image", src: imageSrc };
          } else if (preview.textPreview?.trim()) {
            next = { kind: "text", text: preview.textPreview.trim() };
          } else {
            next = { kind: "placeholder" };
          }
        } else if (preview.textPreview?.trim()) {
          next = { kind: "text", text: preview.textPreview.trim() };
        } else {
          next = { kind: "placeholder" };
        }

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

      {canPreview && entry?.kind === "image" && (
        <img
          src={entry.src}
          alt=""
          className="h-full w-full object-contain object-top"
          draggable={false}
        />
      )}

      {canPreview && entry?.kind === "text" && (
        <pre className="h-full w-full overflow-hidden p-3 text-left font-sans text-[10px] leading-relaxed text-foreground/80">
          {entry.text}
        </pre>
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
