import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { renderDocxPreview } from "@/features/lecturer/lib/docx-viewer";
import { cn } from "@/shared/lib/utils";
import "./docx-preview-viewer.css";

type DocxPreviewViewerProps = {
  data: Blob | ArrayBuffer;
  compact?: boolean;
  className?: string;
  scale?: number;
  onZoomWheel?: (direction: number) => void;
  onPageChange?: (page: number, totalPages: number) => void;
};

function applyDocxScale(body: HTMLElement | null, scale: number) {
  const wrapper = body?.querySelector(".docx-wrapper") as HTMLElement | null;
  if (!wrapper) return;
  wrapper.style.zoom = String(scale);
}

function trackDocxPages(
  host: HTMLElement,
  body: HTMLElement,
  onPageChange: (page: number, totalPages: number) => void,
) {
  const sections = body.querySelectorAll(".docx-wrapper > section");
  const total = Math.max(sections.length, 1);

  const reportPage = () => {
    if (sections.length === 0) {
      onPageChange(1, total);
      return;
    }

    const hostRect = host.getBoundingClientRect();
    const anchorY = hostRect.top + hostRect.height * 0.35;
    let closest = 0;
    let minDist = Infinity;

    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const sectionMid = (rect.top + rect.bottom) / 2;
      const dist = Math.abs(sectionMid - anchorY);
      if (dist < minDist) {
        minDist = dist;
        closest = index;
      }
    });

    onPageChange(closest + 1, total);
  };

  reportPage();
  host.addEventListener("scroll", reportPage, { passive: true });
  return () => host.removeEventListener("scroll", reportPage);
}

export function DocxPreviewViewer({
  data,
  compact,
  className,
  scale = 1,
  onZoomWheel,
  onPageChange,
}: DocxPreviewViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const renderGen = useRef(0);
  const onPageChangeRef = useRef(onPageChange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    const body = bodyRef.current;
    const style = styleRef.current;
    if (!body || !style) return;

    const generation = ++renderGen.current;
    setLoading(true);
    setError(null);

    void renderDocxPreview(data, body, style, compact)
      .then(() => {
        if (generation !== renderGen.current) return;
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (generation !== renderGen.current) return;
        console.error("DOCX preview failed:", err);
        setError("Không hiển thị được tài liệu Word");
        setLoading(false);
      });

    return () => {
      renderGen.current += 1;
    };
  }, [data, compact]);

  useEffect(() => {
    if (compact || loading) return;
    applyDocxScale(bodyRef.current, scale);
    onPageChangeRef.current?.(visiblePageFromBody(bodyRef.current), countDocxPages(bodyRef.current));
  }, [compact, loading, scale]);

  useEffect(() => {
    if (compact || loading || !onPageChangeRef.current) return;

    const host = hostRef.current;
    const body = bodyRef.current;
    if (!host || !body) return;

    return trackDocxPages(host, body, (page, totalPages) => {
      onPageChangeRef.current?.(page, totalPages);
    });
  }, [compact, loading, data]);

  useEffect(() => {
    if (compact || !onZoomWheel) return;

    const host = hostRef.current;
    if (!host) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      onZoomWheel(event.deltaY > 0 ? -1 : 1);
    };

    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, [compact, onZoomWheel]);

  return (
    <div
      ref={hostRef}
      className={cn(
        "docx-preview-host relative",
        compact ? "docx-preview-host--compact" : "docx-preview-host--full",
        className,
      )}
    >
      <div ref={styleRef} className="docx-preview-styles" />
      <div ref={bodyRef} className="docx-preview-body min-h-0" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
          {error}
        </div>
      )}
    </div>
  );
}

function countDocxPages(body: HTMLElement | null) {
  return Math.max(body?.querySelectorAll(".docx-wrapper > section").length ?? 0, 1);
}

function visiblePageFromBody(body: HTMLElement | null) {
  const host = body?.closest(".docx-preview-host") as HTMLElement | null;
  if (!host || !body) return 1;

  const sections = body.querySelectorAll(".docx-wrapper > section");
  if (sections.length === 0) return 1;

  const hostRect = host.getBoundingClientRect();
  const anchorY = hostRect.top + hostRect.height * 0.35;
  let closest = 0;
  let minDist = Infinity;

  sections.forEach((section, index) => {
    const rect = section.getBoundingClientRect();
    const sectionMid = (rect.top + rect.bottom) / 2;
    const dist = Math.abs(sectionMid - anchorY);
    if (dist < minDist) {
      minDist = dist;
      closest = index;
    }
  });

  return closest + 1;
}
