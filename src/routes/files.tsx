import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Upload,
  MoreHorizontal,
  Heart,
  Lock,
  Unlock,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  Download,
  Search,
  Pin,
  PinOff,
  FolderInput,
  Copy as CopyIcon,
  FileText,
  ExternalLink,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { FileTypeIcon } from "@/components/file-type-icon";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVault } from "@/lib/store";
import { formatSize, timeAgo } from "@/lib/file-utils";
import { getBlob } from "@/lib/idb";
import { UploadDialog } from "@/components/upload-dialog";
import { FilePreviewDialog } from "@/components/file-preview-dialog";
import { FileDetailDialog } from "@/components/file-detail-dialog";
import { LockDialog } from "@/components/lock-dialog";
import { toast } from "sonner";
import type { FileMeta } from "@/lib/types";

export const Route = createFileRoute("/files")({
  head: () => ({ meta: [{ title: "Files — SecureVault" }] }),
  component: FilesPage,
});

type SortKey =
  | "recent-old"
  | "old-recent"
  | "az"
  | "za"
  | "size-desc"
  | "size-asc";

const SORT_LABELS: Record<SortKey, string> = {
  "recent-old": "Recent → Old",
  "old-recent": "Old → Recent",
  az: "A → Z",
  za: "Z → A",
  "size-desc": "Size: Big → Small",
  "size-asc": "Size: Small → Big",
};

function FilesPage() {
  const currentUserId = useVault((s) => s.currentUserId);
  const allFiles = useVault((s) => s.files);
  const allCategories = useVault((s) => s.categories);
  const updateFile = useVault((s) => s.updateFile);
  const deleteFile = useVault((s) => s.deleteFile);
  const touchFile = useVault((s) => s.touchFile);
  const markUnlocked = useVault((s) => s.markUnlocked);
  const isUnlocked = useVault((s) => s.isUnlocked);
  const unlockedIds = useVault((s) => s.unlockedIds);

  const files = useMemo(
    () => allFiles.filter((f) => f.userId === currentUserId),
    [allFiles, currentUserId],
  );
  const categories = useMemo(
    () => allCategories.filter((c) => c.userId === currentUserId && c.type === "file"),
    [allCategories, currentUserId],
  );

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent-old");
  const [showHidden, setShowHidden] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [renameFor, setRenameFor] = useState<FileMeta | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [moveFor, setMoveFor] = useState<FileMeta | null>(null);
  const [moveTo, setMoveTo] = useState<string>("");
  const [previewFile, setPreviewFile] = useState<FileMeta | null>(null);
  const [detailFile, setDetailFile] = useState<FileMeta | null>(null);
  const [lockState, setLockState] = useState<
    | null
    | { mode: "lock" | "unlock"; file: FileMeta; after: (f: FileMeta) => void }
  >(null);

  const list = useMemo(() => {
    let arr = files.filter((f) => (showHidden ? true : !f.hidden));
    if (cat !== "all") arr = arr.filter((f) => f.category === cat);
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (f) =>
          f.fileName.toLowerCase().includes(q) || f.category.toLowerCase().includes(q),
      );
    }
    arr.sort((a, b) => {
      switch (sort) {
        case "az":
          return a.fileName.localeCompare(b.fileName);
        case "za":
          return b.fileName.localeCompare(a.fileName);
        case "size-desc":
          return b.size - a.size;
        case "size-asc":
          return a.size - b.size;
        case "old-recent":
          return a.uploadDate - b.uploadDate;
        case "recent-old":
        default:
          return b.uploadDate - a.uploadDate;
      }
    });
    // Pinned always on top, keeping their internal sort order.
    arr.sort((a, b) => Number(b.pinned) - Number(a.pinned));
    return arr;
  }, [files, cat, query, sort, showHidden]);

  const categoryStats = useMemo(() => {
    if (cat === "all") return null;
    const inCat = files.filter((f) => f.category === cat && !f.hidden);
    return {
      count: inCat.length,
      size: inCat.reduce((s, f) => s + f.size, 0),
    };
  }, [cat, files]);

  async function openFile(f: FileMeta) {
    if (f.locked && !isUnlocked(f.id)) {
      setLockState({
        mode: "unlock",
        file: f,
        after: (file) => {
          markUnlocked(file.id);
          actuallyOpen(file);
        },
      });
      return;
    }
    actuallyOpen(f);
  }
  function actuallyOpen(f: FileMeta) {
    touchFile(f.id);
    setPreviewFile(f);
  }

  async function downloadFile(f: FileMeta) {
    const blob = await getBlob(f.id);
    if (!blob) return toast.error("File data missing");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyFile(f: FileMeta) {
    const blob = await getBlob(f.id);
    if (!blob) return toast.error("File data missing");
    const { putBlob } = await import("@/lib/idb");
    const addFile = useVault.getState().addFile;
    const id = addFile({
      fileName: `Copy of ${f.fileName}`,
      size: f.size,
      mime: f.mime,
      kind: f.kind,
      category: f.category,
      favorite: false,
      hidden: false,
      locked: false,
      pinned: false,
    });
    await putBlob(id, blob);
    toast.success("File copied");
  }

  function toggleLock(f: FileMeta) {
    if (f.locked) {
      setLockState({
        mode: "unlock",
        file: f,
        after: (file) => {
          updateFile(file.id, { locked: false });
          toast.success("Unlocked");
        },
      });
    } else {
      setLockState({
        mode: "lock",
        file: f,
        after: (file) => {
          updateFile(file.id, { locked: true });
          toast.success("Locked");
        },
      });
    }
  }

  return (
    <AppShell search={query} onSearchChange={setQuery}>
      <PageHeader
        title="File Vault"
        subtitle={`${list.length} ${list.length === 1 ? "file" : "files"} stored on this device`}
        actions={
          <Button
            onClick={() => setUploadOpen(true)}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Upload className="size-4" /> Upload
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SORT_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHidden((s) => !s)}
            aria-label={showHidden ? "Hide hidden files" : "Show hidden files"}
            title={showHidden ? "Hide hidden files" : "Show hidden files"}
            className="flex size-9 items-center justify-center rounded-full bg-surface text-muted-foreground ring-1 ring-border transition-colors hover:bg-secondary hover:text-foreground"
          >
            {showHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </button>
        </div>
      </div>

      {categoryStats && (
        <div className="mb-5 flex items-center justify-between rounded-xl bg-brand/5 px-4 py-3 ring-1 ring-brand/15">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand">{cat}</p>
            <p className="mt-0.5 text-sm">
              <span className="font-semibold">{categoryStats.count}</span> files •{" "}
              <span className="font-semibold">{formatSize(categoryStats.size)}</span> used
            </p>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-16 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Search className="size-5" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No files found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {query ? "Try a different search." : "Upload your first file to begin."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((f) => (
            <div
              key={f.id}
              className="group relative flex items-center gap-4 rounded-xl bg-surface p-3 shadow-soft ring-1 ring-black/5 transition-colors hover:bg-secondary/40 dark:ring-white/5"
            >
              {f.pinned && (
                <span className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-glow">
                  <Pin className="size-3" />
                </span>
              )}
              <button
                onClick={() => setDetailFile(f)}
                className="flex flex-1 items-center gap-4 text-left min-w-0"
              >
                <FileTypeIcon kind={f.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.fileName}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {f.category} • {formatSize(f.size)} • {timeAgo(f.uploadDate)}
                  </p>
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                {f.favorite && <Heart className="size-3.5 fill-rose-500 text-rose-500" />}
                {f.locked && <Lock className="size-3.5 text-muted-foreground" />}
                <FileInfoMenu
                  file={f}
                  onOpen={() => openFile(f)}
                  onRename={() => {
                    setRenameFor(f);
                    setRenameVal(f.fileName);
                  }}
                  onMove={() => {
                    setMoveFor(f);
                    setMoveTo(f.category);
                  }}
                  onCopy={() => copyFile(f)}
                  onDownload={() => downloadFile(f)}
                  onTogglePin={() => updateFile(f.id, { pinned: !f.pinned })}
                  onToggleFav={() => updateFile(f.id, { favorite: !f.favorite })}
                  onToggleHide={() => updateFile(f.id, { hidden: !f.hidden })}
                  onToggleLock={() => toggleLock(f)}
                  onDelete={async () => {
                    if (!confirm(`Delete "${f.fileName}"?`)) return;
                    await deleteFile(f.id);
                    toast.success("File deleted");
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <FilePreviewDialog
        file={previewFile}
        open={!!previewFile}
        onOpenChange={(v) => !v && setPreviewFile(null)}
      />

      <LockDialog
        open={!!lockState}
        onOpenChange={(v) => !v && setLockState(null)}
        mode={lockState?.mode ?? "unlock"}
        itemName={lockState?.file.fileName}
        onSuccess={() => lockState && lockState.after(lockState.file)}
      />

      <Dialog open={!!renameFor} onOpenChange={(v) => !v && setRenameFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
          </DialogHeader>
          <Input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renameFor && renameVal.trim()) {
                  updateFile(renameFor.id, { fileName: renameVal.trim() });
                  toast.success("Renamed");
                }
                setRenameFor(null);
              }}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!moveFor} onOpenChange={(v) => !v && setMoveFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to category</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={moveTo} onValueChange={setMoveTo}>
              <SelectTrigger>
                <SelectValue />
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
            <Button variant="outline" onClick={() => setMoveFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (moveFor && moveTo) {
                  updateFile(moveFor.id, { category: moveTo });
                  toast.success("Moved");
                }
                setMoveFor(null);
              }}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* tiny hint so unlockedIds is recognised by linter as a dep */}
      <span className="sr-only">{Object.keys(unlockedIds).length}</span>
    </AppShell>
  );
}

function FileInfoMenu({
  file,
  onOpen,
  onRename,
  onMove,
  onCopy,
  onDownload,
  onTogglePin,
  onToggleFav,
  onToggleHide,
  onToggleLock,
  onDelete,
}: {
  file: FileMeta;
  onOpen: () => void;
  onRename: () => void;
  onMove: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onTogglePin: () => void;
  onToggleFav: () => void;
  onToggleHide: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="File options"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b border-border bg-secondary/30 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" title={file.fileName}>
                {file.fileName}
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                {file.kind} • {file.category}
              </p>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-[11px]">
            <Info label="Size" value={formatSize(file.size)} />
            <Info label="Created" value={new Date(file.uploadDate).toLocaleDateString()} />
            <Info
              label="Modified"
              value={
                file.modifiedDate
                  ? new Date(file.modifiedDate).toLocaleDateString()
                  : "—"
              }
            />
            <Info label="Pinned" value={file.pinned ? "Yes" : "No"} />
            <Info label="Locked" value={file.locked ? "Yes" : "No"} />
            <Info label="Hidden" value={file.hidden ? "Yes" : "No"} />
          </dl>
        </div>
        <div className="grid grid-cols-1 p-1">
          <Action icon={<ExternalLink className="size-4" />} label="Open" onClick={onOpen} />
          <Action icon={<Pencil className="size-4" />} label="Rename" onClick={onRename} />
          <Action icon={<FolderInput className="size-4" />} label="Move" onClick={onMove} />
          <Action icon={<CopyIcon className="size-4" />} label="Copy" onClick={onCopy} />
          <Action icon={<Download className="size-4" />} label="Download" onClick={onDownload} />
          <Action
            icon={file.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            label={file.pinned ? "Unpin" : "Pin"}
            onClick={onTogglePin}
          />
          <Action
            icon={<Heart className={`size-4 ${file.favorite ? "fill-rose-500 text-rose-500" : ""}`} />}
            label={file.favorite ? "Unfavorite" : "Favorite"}
            onClick={onToggleFav}
          />
          <Action
            icon={file.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            label={file.hidden ? "Unhide" : "Hide"}
            onClick={onToggleHide}
          />
          <Action
            icon={file.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
            label={file.locked ? "Unlock" : "Lock"}
            onClick={onToggleLock}
          />
          <div className="my-1 h-px bg-border" />
          <Action
            icon={<Trash2 className="size-4" />}
            label="Delete"
            onClick={onDelete}
            danger
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </>
  );
}

function Action({
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
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary ${
        danger ? "text-destructive hover:bg-destructive/10" : ""
      }`}
    >
      <span className={danger ? "text-destructive" : "text-muted-foreground"}>{icon}</span>
      {label}
    </button>
  );
}
