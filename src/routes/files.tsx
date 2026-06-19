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
  Share2,
  Search,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { FileTypeIcon } from "@/components/file-type-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useVault } from "@/lib/store";
import { formatSize, timeAgo } from "@/lib/file-utils";
import { getBlob } from "@/lib/idb";
import { UploadDialog } from "@/components/upload-dialog";
import { toast } from "sonner";
import type { FileMeta } from "@/lib/types";

export const Route = createFileRoute("/files")({
  head: () => ({ meta: [{ title: "Files — SecureVault" }] }),
  component: FilesPage,
});

type SortKey = "recent" | "name" | "size";

function FilesPage() {
  const currentUserId = useVault((s) => s.currentUserId);
  const allFiles = useVault((s) => s.files);
  const allCategories = useVault((s) => s.categories);
  const updateFile = useVault((s) => s.updateFile);
  const deleteFile = useVault((s) => s.deleteFile);
  const touchFile = useVault((s) => s.touchFile);
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
  const [sort, setSort] = useState<SortKey>("recent");
  const [showHidden, setShowHidden] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [renameFor, setRenameFor] = useState<FileMeta | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const list = useMemo(() => {
    let arr = files.filter((f) => (showHidden ? true : !f.hidden));
    if (cat !== "all") arr = arr.filter((f) => f.category === cat);
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((f) => f.fileName.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
    }
    arr.sort((a, b) => {
      if (sort === "name") return a.fileName.localeCompare(b.fileName);
      if (sort === "size") return b.size - a.size;
      return b.uploadDate - a.uploadDate;
    });
    return arr;
  }, [files, cat, query, sort, showHidden]);

  async function openFile(f: FileMeta) {
    if (f.locked) {
      const pwd = window.prompt("This file is locked. Enter vault password to open:");
      if (!pwd) return;
      // demo: any non-empty password unlocks for the session
    }
    const blob = await getBlob(f.id);
    if (!blob) return toast.error("File data missing on this device");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    touchFile(f.id);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

  async function shareFile(f: FileMeta) {
    const blob = await getBlob(f.id);
    if (!blob) return;
    const file = new File([blob], f.fileName, { type: f.mime });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: f.fileName }).catch(() => {});
    } else {
      downloadFile(f);
    }
  }

  return (
    <AppShell search={query} onSearchChange={setQuery}>
      <PageHeader
        title="File Vault"
        subtitle={`${list.length} ${list.length === 1 ? "file" : "files"} stored on this device`}
        actions={
          <Button onClick={() => setUploadOpen(true)} className="bg-foreground text-background hover:bg-foreground/90">
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
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Sort: Recent</SelectItem>
            <SelectItem value="name">Sort: Name</SelectItem>
            <SelectItem value="size">Sort: Size</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setShowHidden((s) => !s)}>
          {showHidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {showHidden ? "Hide hidden" : "Show hidden"}
        </Button>
      </div>

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
              className="group flex items-center gap-4 rounded-xl bg-surface p-3 shadow-soft ring-1 ring-black/5 transition-colors hover:bg-secondary/40 dark:ring-white/5"
            >
              <button onClick={() => openFile(f)} className="flex flex-1 items-center gap-4 text-left min-w-0">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openFile(f)}>
                      <Eye className="size-4" /> Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadFile(f)}>
                      <Download className="size-4" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => shareFile(f)}>
                      <Share2 className="size-4" /> Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setRenameFor(f);
                        setRenameVal(f.fileName);
                      }}
                    >
                      <Pencil className="size-4" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateFile(f.id, { favorite: !f.favorite })}>
                      <Heart className="size-4" /> {f.favorite ? "Unfavorite" : "Favorite"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateFile(f.id, { locked: !f.locked })}>
                      {f.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                      {f.locked ? "Unlock" : "Lock"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateFile(f.id, { hidden: !f.hidden })}>
                      {f.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      {f.hidden ? "Unhide" : "Hide"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async () => {
                        if (!confirm(`Delete "${f.fileName}"?`)) return;
                        await deleteFile(f.id);
                        toast.success("File deleted");
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

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
    </AppShell>
  );
}
