import { lazy, Suspense, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getBlob } from "@/lib/idb";
import type { FileMeta } from "@/lib/types";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    if (!url || !file) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = file.fileName;
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[90vh] max-w-5xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">{file?.fileName ?? "Preview"}</DialogTitle>
        {!file ? null : loading || !url ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : file.kind === "pdf" ? (
          <PdfViewer url={url} fileName={file.fileName} />
        ) : file.kind === "image" ? (
          <div className="flex h-full items-center justify-center bg-secondary/40 p-4">
            <img src={url} alt={file.fileName} className="max-h-full max-w-full object-contain" />
          </div>
        ) : file.kind === "video" ? (
          <div className="flex h-full items-center justify-center bg-black p-4">
            <video src={url} controls className="max-h-full max-w-full" />
          </div>
        ) : file.kind === "audio" ? (
          <div className="flex h-full items-center justify-center p-8">
            <audio src={url} controls className="w-full max-w-md" />
          </div>
        ) : file.kind === "text" ? (
          <iframe src={url} title={file.fileName} className="h-full w-full bg-white" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <FileText className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">{file.fileName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                In-app preview is not available for this file type.
              </p>
            </div>
            <Button onClick={download} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Download className="size-4" /> Download to open
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
