import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Configure pdf.js worker (Vite-friendly URL import).
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

export function PdfViewer({ url, fileName }: { url: string; fileName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState<number | "fit">("fit");
  const [width, setWidth] = useState<number>(800);
  const [fs, setFs] = useState(false);

  useEffect(() => {
    function measure() {
      if (containerRef.current) setWidth(containerRef.current.clientWidth - 8);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    function onFs() {
      setFs(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  const numericScale = scale === "fit" ? undefined : scale;
  const renderWidth = scale === "fit" ? width : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2">
        <p className="truncate text-xs font-medium" title={fileName}>
          {fileName}
        </p>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[64px] text-center text-xs tabular-nums">
            {page} / {numPages || "…"}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setPage((p) => Math.min(numPages || p, p + 1))}
            disabled={page >= numPages}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
          <div className="mx-2 h-5 w-px bg-border" />
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              setScale((s) => (s === "fit" ? 0.9 : Math.max(0.4, (s as number) - 0.2)))
            }
            aria-label="Zoom out"
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="min-w-[44px] text-center text-xs tabular-nums">
            {scale === "fit" ? "Fit" : `${Math.round((scale as number) * 100)}%`}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              setScale((s) => (s === "fit" ? 1.2 : Math.min(3, (s as number) + 0.2)))
            }
            aria-label="Zoom in"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setScale("fit")} aria-label="Fit to width">
            <Maximize className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={toggleFullscreen} aria-label="Full screen">
            {fs ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-secondary/40 p-3">
        <div className="mx-auto flex justify-center">
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setPage(1);
            }}
            loading={<div className="p-6 text-xs text-muted-foreground">Loading PDF…</div>}
            error={<div className="p-6 text-xs text-destructive">Failed to render PDF.</div>}
          >
            <Page
              pageNumber={page}
              scale={numericScale}
              width={renderWidth}
              renderAnnotationLayer
              renderTextLayer
              className="shadow-card"
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
