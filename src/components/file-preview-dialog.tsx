import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBlob } from "@/lib/idb";
import type { FileMeta } from "@/lib/types";
import {
  Download,
  Maximize2,
  Heart,
  Lock,
  Pin,
  EyeOff,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileTypeIcon } from "@/components/file-type-icon";
import { formatSize } from "@/lib/file-utils";
import { useVault } from "@/lib/store";
import { toast } from "sonner";

const PdfViewer = lazy(() =>
  import("./pdf-viewer").then((m) => ({ default: m.PdfViewer })),
);

export function FilePreviewDialog({
  file,
  open,
  onOpenChange,
}: {
  file: FileMeta | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const updateFile = useVault((s) => s.updateFile);
  const latestFile = useVault((s) => (file ? s.files.find((f) => f.id === file.id) : null));
  const displayFile = latestFile ?? file;

  useEffect(() => {
    let revoke: string | null = null;
    setUrl(null);
    if (open && file) {
      setLoading(true);
      getBlob(file.id).then((blob) => {
        setLoading(false);
        if (!blob) return;
        const u = URL.createObjectURL(blob);
        revoke = u;
        setUrl(u);
      });
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [open, file]);

  function download() {
    if (!url || !displayFile) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = displayFile.fileName;
    a.click();
  }

  function openFullscreen() {
    const el = previewRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => toast.error("Fullscreen not available"));
    } else {
      document.exitFullscreen?.();
    }
  }

  function toggleFavorite() {
    if (!displayFile) return;
    updateFile(displayFile.id, { favorite: !displayFile.favorite });
    toast.success(displayFile.favorite ? "Removed from favorites" : "Added to favorites");
  }

  const fmtDate = (n?: number) =>
    n ? new Date(n).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[92vh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden border-border/60 bg-background/95 p-0 shadow-2xl backdrop-blur-xl sm:rounded-2xl"
      >
        <DialogTitle className="sr-only">{displayFile?.fileName ?? "Preview"}</DialogTitle>
        <DialogDescription className="sr-only">
          Preview the selected file, review its details, and use file actions without leaving the page.
        </DialogDescription>

        {displayFile && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
              <FileTypeIcon kind={displayFile.kind} className="size-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold sm:text-base" title={displayFile.fileName}>
                  {displayFile.fileName}
                </p>
                <p className="mt-0.5 truncate text-xs uppercase tracking-wider text-muted-foreground">
                  {displayFile.kind} • {displayFile.category}
                </p>
              </div>
              {/* Close handled by DialogContent's built-in X (top-right) */}
              <div className="w-8 shrink-0" />
            </div>

            {/* Preview */}
            <div ref={previewRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-secondary/30">
              {loading || !url ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : displayFile.kind === "pdf" ? (
                <Suspense
                  fallback={
                    <div className="text-sm text-muted-foreground">Loading PDF viewer…</div>
                  }
                >
                  <PdfViewer url={url} fileName={displayFile.fileName} />
                </Suspense>
              ) : displayFile.kind === "image" ? (
                <img
                  src={url}
                  alt={displayFile.fileName}
                  className="max-h-full max-w-full object-contain p-4"
                />
              ) : displayFile.kind === "video" ? (
                <video src={url} controls className="max-h-full max-w-full bg-black" />
              ) : displayFile.kind === "audio" ? (
                <audio src={url} controls className="w-full max-w-md" />
              ) : displayFile.kind === "text" ? (
                <iframe src={url} title={displayFile.fileName} className="h-full w-full bg-white" />
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                    <FileText className="size-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{displayFile.fileName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      In-app preview is not available for this file type.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Information */}
            <div className="border-t border-border/60 px-4 py-3 sm:px-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Information
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                <InfoCell label="Category" value={displayFile.category} />
                <InfoCell label="Type" value={displayFile.kind.toUpperCase()} />
                <InfoCell label="Size" value={formatSize(displayFile.size)} />
                <InfoCell label="Uploaded" value={fmtDate(displayFile.uploadDate)} />
                <InfoCell
                  label="Last Opened"
                  value={fmtDate(displayFile.lastOpened)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-border/60 bg-secondary/20 px-3 py-3 sm:px-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <Button
                  onClick={openFullscreen}
                  disabled={!url}
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  <Maximize2 className="size-4" /> Open
                </Button>
                <Button onClick={download} disabled={!url} variant="outline">
                  <Download className="size-4" /> Download
                </Button>
                <Button
                  onClick={toggleFavorite}
                  variant="outline"
                  className={displayFile.favorite ? "border-rose-300 text-rose-600" : ""}
                >
                  <Heart
                    className={`size-4 ${displayFile.favorite ? "fill-rose-500 text-rose-500" : ""}`}
                  />
                  {displayFile.favorite ? "Favorited" : "Favorite"}
                </Button>
                <Button variant="outline" disabled title="Coming soon">
                  <Lock className="size-4" /> Lock
                </Button>
                <Button variant="outline" disabled title="Coming soon">
                  <Pin className="size-4" /> Pin
                </Button>
                <Button variant="outline" disabled title="Coming soon">
                  <EyeOff className="size-4" /> Hide
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface/60 px-3 py-2 ring-1 ring-border/50">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-medium" title={value}>
        {value}
      </p>
    </div>
  );
}
