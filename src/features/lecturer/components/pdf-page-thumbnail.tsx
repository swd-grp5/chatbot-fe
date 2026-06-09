import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorkerDev from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = import.meta.env.DEV
  ? pdfWorkerDev
  : `${import.meta.env.BASE_URL}pdf.worker.min.js`;

type PdfPageThumbnailProps = {
  blob: Blob;
  fallback: ReactNode;
};

export function PdfPageThumbnail({ blob, fallback }: PdfPageThumbnailProps) {
  return (
    <Document
      file={blob}
      loading={<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      error={fallback}
      className="flex h-full w-full items-center justify-center"
    >
      <Page
        pageNumber={1}
        width={280}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        className="max-h-full [&_canvas]:!h-auto [&_canvas]:max-h-full [&_canvas]:w-full [&_canvas]:object-contain"
      />
    </Document>
  );
}
