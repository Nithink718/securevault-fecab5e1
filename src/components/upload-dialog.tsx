import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Copy, MoveRight, HardDrive, FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVault } from "@/lib/store";
import { putBlob } from "@/lib/idb";
import { defaultCategoryForKind, detectKind, formatSize } from "@/lib/file-utils";
import {
  categoryToSubfolder,
  writeFileToVault,
  isFilePickerSupported,
  isInCrossOriginIframe,
  pickFilesWithHandles,
  removeOriginal,
} from "@/lib/fs-storage";
import { toast } from "sonner";

type PickedFile = { file: File; handle?: FileSystemFileHandle };

type Mode = "copy" | "move";

export function UploadDialog({
  open,
  onOpenChange,
  folderId = null,
  folderLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  folderId?: string | null;
  folderLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [category, setCategory] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<"pick" | "mode">("pick");
  const [busy, setBusy] = useState(false);
  const canDeleteOriginals = isFilePickerSupported() && !isInCrossOriginIframe();

  const currentUserId = useVault((s) => s.currentUserId);
  const allCategories = useVault((s) => s.categories);
  const addFile = useVault((s) => s.addFile);
  const storageConfig = useVault((s) => s.storageConfig);
  const categories = useMemo(
    () => allCategories.filter((c) => c.userId === currentUserId && c.type === "file"),
    [allCategories, currentUserId],
  );

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setCategory("");
      setPhase("pick");
      setBusy(false);
    }
  }, [open]);

  async function performUpload(mode: Mode) {
    if (files.length === 0) return;
    setBusy(true);
    let uploaded = 0;
    let fsErrors = 0;
    let removed = 0;
    let removeFailed = 0;
    let noHandleCount = 0;
    for (const picked of files) {
      const file = picked.file;
      const kind = detectKind(file.type, file.name);
      const cat = category || defaultCategoryForKind(kind);
      const id = addFile({
        fileName: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
        kind,
        category: cat,
        folderId,
      });
      let storedOk = false;
      try {
        await putBlob(id, file);
        storedOk = true;
        // Also mirror to a custom folder if configured
        if (storageConfig?.type === "custom" && storageConfig.hasDirHandle) {
          const sub = categoryToSubfolder(cat, kind);
          const r = await writeFileToVault(file, sub);
          if (!r.ok) fsErrors++;
        }
        uploaded++;
      } catch {
        toast.error(`Failed to store ${file.name}`);
      }
      // On "move": delete the original from the user's disk if we have a handle
      if (mode === "move" && storedOk) {
        if (picked.handle) {
          const ok = await removeOriginal(picked.handle);
          if (ok) removed++;
          else removeFailed++;
        } else {
          noHandleCount++;
        }
      }
    }
    setBusy(false);
    const verb = mode === "copy" ? "Copied" : "Moved";
    toast.success(`${verb} ${uploaded} file${uploaded === 1 ? "" : "s"} to SecureVault`);
    if (fsErrors > 0) {
      toast.warning(
        `${fsErrors} file${fsErrors === 1 ? "" : "s"} couldn't be written to your custom folder. They are safe in SecureVault storage.`,
      );
    }
    if (mode === "move") {
      if (removed > 0) {
        toast.success(`Removed ${removed} original file${removed === 1 ? "" : "s"} from disk`);
      }
      if (removeFailed > 0) {
        toast.warning(
          `Couldn't delete ${removeFailed} original file${removeFailed === 1 ? "" : "s"}. Remove them manually if needed.`,
        );
      }
      if (noHandleCount > 0) {
        toast.info(
          `${noHandleCount} file${noHandleCount === 1 ? " was" : "s were"} added via drag-drop or basic browser upload, so the original${noHandleCount === 1 ? "" : "s"} can't be deleted automatically. Use "Choose files" for true move.`,
        );
      }
    }
    onOpenChange(false);
  }

  async function openNativePicker() {
    if (!canDeleteOriginals) {
      inputRef.current?.click();
      return;
    }
    try {
      const picked = await pickFilesWithHandles();
      if (picked.length > 0) setFiles(picked);
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") return;
      // Fallback to regular input
      inputRef.current?.click();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {phase === "pick" ? (
          <>
            <DialogHeader>
              <DialogTitle>Upload to vault</DialogTitle>
              <DialogDescription>
                Files are saved to your device only
                {folderLabel ? ` — into "${folderLabel}"` : storageConfig ? ` — ${storageConfig.pathLabel}` : ""}.
              </DialogDescription>
            </DialogHeader>

            <div
              onClick={openNativePicker}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                setFiles(Array.from(e.dataTransfer.files).map((f) => ({ file: f })));
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                dragging ? "border-brand bg-brand/5" : "border-border hover:bg-secondary/40"
              }`}
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Upload className="size-5" />
              </div>
              <p className="mt-3 text-sm font-medium">Drop files here, or click to browse</p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, Word, Excel, Images, Video, Audio, ZIP, TXT
              </p>
              {!canDeleteOriginals && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Tip: for true "Move" (auto-delete originals), open SecureVault in its own Chrome/Edge tab.
                </p>
              )}
              <input
                ref={inputRef}
                type="file"
                multiple
                hidden
                onChange={(e) =>
                  setFiles(Array.from(e.target.files ?? []).map((f) => ({ file: f })))
                }
              />
            </div>

            {files.length > 0 && (
              <div className="max-h-40 space-y-2 overflow-auto rounded-lg border border-border p-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{f.file.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatSize(f.file.size)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto (based on file type)" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => setPhase("mode")}
                disabled={files.length === 0}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                Continue {files.length > 0 ? `(${files.length})` : ""}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>How should we add these files?</DialogTitle>
              <DialogDescription>
                {storageConfig?.type === "custom" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <FolderOpen className="size-3.5" /> Destination: {storageConfig.pathLabel}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <HardDrive className="size-3.5" /> Destination: SecureVault (on this device)
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <ModeCard
                icon={<Copy className="size-4" />}
                title="Copy to SecureVault"
                description="Keep the originals where they are. A copy is placed in SecureVault."
                recommended
                disabled={busy}
                onClick={() => performUpload("copy")}
              />
              <ModeCard
                icon={<MoveRight className="size-4" />}
                title="Move to SecureVault"
                description="Add the files to SecureVault. Browsers can't delete originals automatically — you'll be reminded to remove them."
                disabled={busy}
                onClick={() => performUpload("move")}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPhase("pick")} disabled={busy}>
                Back
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({
  icon,
  title,
  description,
  recommended,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  recommended?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all disabled:opacity-60 ${
        recommended ? "border-brand/40 bg-brand/[0.03]" : "border-border"
      } hover:border-brand hover:bg-brand/5`}
    >
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
          recommended ? "bg-brand text-brand-foreground" : "bg-secondary text-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {recommended && (
            <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
              Recommended
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{description}</p>
      </div>
    </button>
  );
}
