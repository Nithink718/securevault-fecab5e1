import { lazy, Suspense, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { getBlob } from "@/lib/idb";
import type { FileMeta } from "@/lib/types";
import {
  Download,
  ExternalLink,
  Heart,
  Loader2,
  Lock,
  Pin,
  EyeOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileTypeIcon } from "@/components/file-type-icon";
import { formatSize } from "@/lib/file-utils";
import { useVault } from "@/lib/store";
import { cn } from "@/lib/utils";

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
  const updateFile = useVault((s) => s.updateFile);

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

  function openExternal() {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!file) return null;

  const typeLabel = file.kind.toUpperCase();
  const uploaded = new Date(file.uploadDate).toLocaleString();
  const lastOpened = file.lastOpened
    ? new Date(file.lastOpened).toLocaleString()
    : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2",
            "max-h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-0 overflow-hidden",
            "rounded-2xl border border-white/10 bg-background/95 shadow-2xl backdrop-blur-xl",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {file.fileName}
          </DialogPrimitive.Title>

          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
            <FileTypeIcon kind={file.kind} />
            <h2
              className="min-w-0 flex-1 truncate text-base font-semibold sm:text-lg"
              title={file.fileName}
            >
              {file.fileName}
            </h2>
            <DialogPrimitive.Close
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Preview area */}
          <div className="min-h-0 overflow-hidden p-4">
            <div className="h-full min-h-[280px] overflow-hidden rounded-xl border border-border/60 bg-secondary/30">
              <PreviewBody
                file={file}
                url={url}
                loading={loading}
                onDownload={download}
              />
            </div>
          </div>

          {/* Info grid */}
          <div className="mx-4 mb-3 rounded-xl border border-border/60 bg-secondary/20 p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <InfoItem label="Category" value={file.category} />
              <InfoItem label="Type" value={typeLabel} />
              <InfoItem label="Size" value={formatSize(file.size)} />
              <InfoItem label="Uploaded" value={uploaded} />
              <InfoItem label="Last opened" value={lastOpened} />
              <InfoItem
                label="Status"
                value={
                  [
                    file.locked && "Locked",
                    file.pinned && "Pinned",
                    file.hidden && "Hidden",
                  ]
                    .filter(Boolean)
                    .join(" • ") || "Normal"
                }
              />
            </dl>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-surface/40 px-4 py-3">
            <Button
              onClick={openExternal}
              disabled={!url}
              className="flex-1 min-w-[120px] bg-brand text-brand-foreground hover:bg-brand/90 sm:flex-none"
            >
              <ExternalLink className="size-4" /> Open
            </Button>
            <Button
              variant="outline"
              onClick={download}
              disabled={!url}
              className="flex-1 min-w-[120px] sm:flex-none"
            >
              <Download className="size-4" /> Download
            </Button>
            <Button
              variant="outline"
              onClick={() => updateFile(file.id, { favorite: !file.favorite })}
              className="flex-1 min-w-[120px] sm:flex-none"
            >
              <Heart
                className={cn(
                  "size-4",
                  file.favorite && "fill-rose-500 text-rose-500",
                )}
              />
              {file.favorite ? "Favorited" : "Favorite"}
            </Button>

            <div className="ml-auto flex items-center gap-1">
              <IconToggle
                active={file.pinned}
                onClick={() => updateFile(file.id, { pinned: !file.pinned })}
                label={file.pinned ? "Unpin" : "Pin"}
              >
                <Pin className="size-4" />
              </IconToggle>
              <IconToggle
                active={file.locked}
                onClick={() => updateFile(file.id, { locked: !file.locked })}
                label={file.locked ? "Unlock" : "Lock"}
              >
                <Lock className="size-4" />
              </IconToggle>
              <IconToggle
                active={file.hidden}
                onClick={() => updateFile(file.id, { hidden: !file.hidden })}
                label={file.hidden ? "Unhide" : "Hide"}
              >
                <EyeOff className="size-4" />
              </IconToggle>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function PreviewBody({
  file,
  url,
  loading,
  onDownload,
}: {
  file: FileMeta;
  url: string | null;
  loading: boolean;
  onDownload: () => void;
}) {
  if (loading || !url) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading preview…
      </div>
    );
  }

  if (file.kind === "pdf") {
    return (
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading PDF viewer…
          </div>
        }
      >
        <PdfViewer url={url} fileName={file.fileName} />
      </Suspense>
    );
  }

  if (file.kind === "image") {
    return (
      <div className="flex h-full items-center justify-center bg-black/20 p-2">
        <img
          src={url}
          alt={file.fileName}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  if (file.kind === "video") {
    return (
      <div className="flex h-full items-center justify-center bg-black p-2">
        <video src={url} controls className="max-h-full max-w-full" />
      </div>
    );
  }

  if (file.kind === "audio") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <audio src={url} controls className="w-full max-w-md" />
      </div>
    );
  }

  if (file.kind === "text") {
    return (
      <iframe
        src={url}
        title={file.fileName}
        className="h-full w-full bg-white"
      />
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <FileTypeIcon kind={file.kind} />
      <div>
        <p className="text-sm font-semibold">{file.fileName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          In-app preview is not available for this file type.
        </p>
      </div>
      <Button
        onClick={onDownload}
        className="bg-brand text-brand-foreground hover:bg-brand/90"
      >
        <Download className="size-4" /> Download to open
      </Button>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium" title={value}>
        {value}
      </dd>
    </div>
  );
}

function IconToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-full ring-1 transition-colors",
        active
          ? "bg-brand/15 text-brand ring-brand/30"
          : "bg-surface text-muted-foreground ring-border hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
