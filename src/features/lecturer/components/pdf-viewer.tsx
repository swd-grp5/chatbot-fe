import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./pdf-viewer.css";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const PAGE_GAP = 32;
const DEFAULT_PAGE_HEIGHT = 842;
const DEFAULT_PAGE_WIDTH = 595;
const HEIGHT_BATCH = 40;

function getVisiblePage(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  numPages: number,
  pageHeights: number[],
  scale: number,
) {
  const maxScroll = scrollHeight - clientHeight;
  if (maxScroll > 0 && scrollTop >= maxScroll - 4) {
    return numPages;
  }

  const center = scrollTop + clientHeight / 2;
  let offset = 0;

  for (let i = 0; i < numPages; i++) {
    const size = (pageHeights[i] ?? DEFAULT_PAGE_HEIGHT) * scale + PAGE_GAP;
    if (center < offset + size) {
      return i + 1;
    }
    offset += size;
  }

  return numPages;
}

type PdfViewerProps = {
  file: Blob;
  scale: number;
  onZoomWheel?: (delta: number) => void;
  onVisiblePageChange?: (page: number) => void;
};

export function PdfViewer({
  file,
  scale,
  onZoomWheel,
  onVisiblePageChange,
}: PdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageHeights, setPageHeights] = useState<number[]>([]);
  const [pageWidth, setPageWidth] = useState(DEFAULT_PAGE_WIDTH);

  const estimatePageSize = useMemo(
    () => (index: number) =>
      (pageHeights[index] ?? DEFAULT_PAGE_HEIGHT) * scale + PAGE_GAP,
    [pageHeights, scale],
  );

  const virtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => scrollRef.current,
    estimateSize: estimatePageSize,
    overscan: 2,
    getItemKey: (index) => index,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const onVisiblePageChangeRef = useRef(onVisiblePageChange);
  onVisiblePageChangeRef.current = onVisiblePageChange;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || numPages === 0) return;

    const reportVisiblePage = () => {
      const page = getVisiblePage(
        el.scrollTop,
        el.clientHeight,
        el.scrollHeight,
        numPages,
        pageHeights,
        scale,
      );
      onVisiblePageChangeRef.current?.(page);
    };

    reportVisiblePage();
    el.addEventListener("scroll", reportVisiblePage, { passive: true });
    return () => el.removeEventListener("scroll", reportVisiblePage);
  }, [numPages, pageHeights, scale]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || numPages === 0) return;

    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;

    const ratio = el.scrollTop / maxScroll;
    requestAnimationFrame(() => {
      const newMax = el.scrollHeight - el.clientHeight;
      if (newMax > 0) {
        el.scrollTop = ratio * newMax;
      }
      onVisiblePageChangeRef.current?.(
        getVisiblePage(
          el.scrollTop,
          el.clientHeight,
          el.scrollHeight,
          numPages,
          pageHeights,
          scale,
        ),
      );
    });
  }, [scale, pageHeights, numPages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onZoomWheel) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      onZoomWheel(event.deltaY > 0 ? -1 : 1);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onZoomWheel]);

  const handleLoadSuccess = async (pdf: PDFDocumentProxy) => {
    const total = pdf.numPages;
    setNumPages(total);
    const heights = new Array<number>(total).fill(DEFAULT_PAGE_HEIGHT);

    try {
      const firstPage = await pdf.getPage(1);
      const firstViewport = firstPage.getViewport({ scale: 1 });
      heights[0] = firstViewport.height;
      setPageWidth(firstViewport.width);
      setPageHeights([...heights]);

      for (let start = 0; start < total; start += HEIGHT_BATCH) {
        const end = Math.min(start + HEIGHT_BATCH, total);
        await Promise.all(
          Array.from({ length: end - start }, (_, offset) => {
            const pageNumber = start + offset + 1;
            if (pageNumber === 1) return Promise.resolve();
            return pdf.getPage(pageNumber).then((page) => {
              heights[pageNumber - 1] = page.getViewport({ scale: 1 }).height;
            });
          }),
        );
        setPageHeights([...heights]);
      }
    } catch {
      /* keep defaults */
    }
  };

  const defaultPageHeight = pageHeights[0] ?? DEFAULT_PAGE_HEIGHT;

  return (
    <div ref={scrollRef} className="h-full min-h-0 overflow-y-auto overflow-x-hidden px-2 pt-4 pb-16">
      <Document
        file={file}
        loading={
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang render PDF...
          </div>
        }
        error={
          <p className="py-12 text-sm text-destructive">Không hiển thị được PDF.</p>
        }
        onLoadSuccess={handleLoadSuccess}
        onLoadError={(err) => {
          console.error("PDF viewer load failed:", err);
        }}
      >
        {numPages > 0 && (
          <div
            className="relative mx-auto w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualItems.map((virtualItem) => {
              const pageNumber = virtualItem.index + 1;
              const rowHeight = pageHeights[virtualItem.index] ?? defaultPageHeight;

              return (
                <div
                  key={virtualItem.key}
                  className="pdf-virtual-row absolute left-0 flex w-full items-start justify-center"
                  style={{
                    top: virtualItem.start,
                    height: virtualItem.size,
                  }}
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer
                    renderAnnotationLayer={false}
                    className="shadow-lg ring-1 ring-border/60"
                    loading={
                      <div
                        className="flex items-center justify-center bg-muted/20"
                        style={{
                          width: pageWidth * scale,
                          height: rowHeight * scale,
                        }}
                      >
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </Document>

    </div>
  );
}
