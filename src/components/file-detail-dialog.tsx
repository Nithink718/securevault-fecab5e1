import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getBlob } from "@/lib/idb";
import { formatSize } from "@/lib/file-utils";
import type { FileMeta } from "@/lib/types";
import { FileTypeIcon } from "@/components/file-type-icon";
import {
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  Heart,
  Lock,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  Unlock,
  X,
  FileQuestion,
} from "lucide-react";

type Props = {
  file: FileMeta | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpen: (f: FileMeta) => void;
  onDownload: (f: FileMeta) => void;
  onRename: (f: FileMeta) => void;
  onDelete: (f: FileMeta) => void;
  onToggleFavorite: (f: FileMeta) => void;
  onTogglePin: (f: FileMeta) => void;
  onToggleHide: (f: FileMeta) => void;
  onToggleLock: (f: FileMeta) => void;
};

export function FileDetailDialog({
  file,
  open,
  onOpenChange,
  onOpen,
  onDownload,
  onRename,
  onDelete,
  onToggleFavorite,
  onTogglePin,
  onToggleHide,
  onToggleLock,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    setUrl(null);
    if (open && file) {
      const previewable =
        file.kind === "image" ||
        file.kind === "video" ||
        file.kind === "audio" ||
        file.kind === "pdf";
      if (previewable) {
        getBlob(file.id).then((blob) => {
          if (!blob) return;
          const u = URL.createObjectURL(blob);
          revoke = u;
          setUrl(u);
        });
      }
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [open, file]);

  if (!file) return null;

  const fmt = (t?: number) =>
    t ? new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] gap-0 overflow-hidden border-white/10 bg-background/80 p-0 backdrop-blur-2xl sm:max-w-2xl sm:rounded-2xl"
      >
        <DialogTitle className="sr-only">{file.fileName}</DialogTitle>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/5 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <FileTypeIcon kind={file.kind} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" title={file.fileName}>
              {file.fileName}
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              {file.kind} • {formatSize(file.size)}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-64px)] overflow-y-auto">
          {/* Preview */}
          <div className="flex max-h-[40vh] min-h-[180px] items-center justify-center overflow-hidden bg-secondary/30 p-3">
            {file.locked ? (
              <EmptyPreview icon={<Lock className="size-6" />} label="Locked — unlock to preview" />
            ) : file.kind === "image" && url ? (
              <img src={url} alt={file.fileName} className="max-h-[36vh] max-w-full rounded-lg object-contain" />
            ) : file.kind === "video" && url ? (
              <video src={url} controls className="max-h-[36vh] max-w-full rounded-lg" />
            ) : file.kind === "audio" && url ? (
              <audio src={url} controls className="w-full max-w-md" />
            ) : file.kind === "pdf" && url ? (
              <iframe src={url} title={file.fileName} className="h-[36vh] w-full rounded-lg bg-white" />
            ) : file.kind === "image" || file.kind === "video" || file.kind === "audio" || file.kind === "pdf" ? (
              <div className="text-xs text-muted-foreground">Loading preview…</div>
            ) : (
              <EmptyPreview icon={<FileQuestion className="size-6" />} label="Preview not available" />
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 px-5 py-4 text-xs sm:grid-cols-3">
            <Info label="Category" value={file.category} />
            <Info label="File type" value={file.kind} />
            <Info label="Size" value={formatSize(file.size)} />
            <Info label="Uploaded" value={fmt(file.uploadDate)} />
            <Info label="Last opened" value={fmt(file.lastOpened)} />
            <Info label="Modified" value={fmt(file.modifiedDate)} />
            <Info label="Locked" value={file.locked ? "Yes" : "No"} />
            <Info label="Hidden" value={file.hidden ? "Yes" : "No"} />
            <Info label="Pinned" value={file.pinned ? "Yes" : "No"} />
          </div>

          {/* Actions */}
          <div className="border-t border-white/5 bg-white/[0.02] px-5 py-4">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => onOpen(file)}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                <ExternalLink className="size-4" /> Open
              </Button>
              <ActionBtn icon={<Download className="size-4" />} label="Download" onClick={() => onDownload(file)} />
              <ActionBtn
                icon={<Heart className={`size-4 ${file.favorite ? "fill-rose-500 text-rose-500" : ""}`} />}
                label={file.favorite ? "Unfavorite" : "Favorite"}
                onClick={() => onToggleFavorite(file)}
              />
              <ActionBtn
                icon={file.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                label={file.pinned ? "Unpin" : "Pin"}
                onClick={() => onTogglePin(file)}
              />
              <ActionBtn
                icon={file.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                label={file.locked ? "Unlock" : "Lock"}
                onClick={() => onToggleLock(file)}
              />
              <ActionBtn
                icon={file.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                label={file.hidden ? "Unhide" : "Hide"}
                onClick={() => onToggleHide(file)}
              />
              <ActionBtn icon={<Pencil className="size-4" />} label="Rename" onClick={() => onRename(file)} />
              <ActionBtn
                icon={<Trash2 className="size-4" />}
                label="Delete"
                onClick={() => onDelete(file)}
                danger
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-medium" title={value}>
        {value}
      </p>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10 ${
        danger ? "text-destructive hover:bg-destructive/10" : ""
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyPreview({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
      <div className="flex size-12 items-center justify-center rounded-full bg-secondary">{icon}</div>
      <p className="text-xs">{label}</p>
    </div>
  );
}
