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
  FolderPlus,
  Folder as FolderIcon,
  ChevronRight,
  Home,
  ArrowLeft,
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
  DialogDescription,
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
import { LockDialog } from "@/components/lock-dialog";
import { toast } from "sonner";
import type { FileMeta, Folder } from "@/lib/types";

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
  const allFolders = useVault((s) => s.folders);
  const allCategories = useVault((s) => s.categories);
  const updateFile = useVault((s) => s.updateFile);
  const deleteFile = useVault((s) => s.deleteFile);
  const touchFile = useVault((s) => s.touchFile);
  const addFolder = useVault((s) => s.addFolder);
  const updateFolder = useVault((s) => s.updateFolder);
  const deleteFolder = useVault((s) => s.deleteFolder);
  const moveFolder = useVault((s) => s.moveFolder);
  const markUnlocked = useVault((s) => s.markUnlocked);
  const isUnlocked = useVault((s) => s.isUnlocked);
  const unlockedIds = useVault((s) => s.unlockedIds);

  const files = useMemo(
    () => allFiles.filter((f) => f.userId === currentUserId),
    [allFiles, currentUserId],
  );
  const folders = useMemo(
    () => allFolders.filter((f) => f.userId === currentUserId),
    [allFolders, currentUserId],
  );
  const categories = useMemo(
    () => allCategories.filter((c) => c.userId === currentUserId && c.type === "file"),
    [allCategories, currentUserId],
  );

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent-old");
  const [showHidden, setShowHidden] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFor, setRenameFor] = useState<FileMeta | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [renameFolderFor, setRenameFolderFor] = useState<Folder | null>(null);
  const [renameFolderVal, setRenameFolderVal] = useState("");
  const [moveFor, setMoveFor] = useState<FileMeta | null>(null);
  const [moveToFolderId, setMoveToFolderId] = useState<string | "root">("root");
  const [moveFolderFor, setMoveFolderFor] = useState<Folder | null>(null);
  const [moveFolderToId, setMoveFolderToId] = useState<string | "root">("root");
  const [previewFile, setPreviewFile] = useState<FileMeta | null>(null);
  const [lockState, setLockState] = useState<
    | null
    | { mode: "lock" | "unlock"; item: { kind: "file"; file: FileMeta } | { kind: "folder"; folder: Folder } | { kind: "open-folder"; folder: Folder }; after: () => void }
  >(null);

  // Breadcrumb chain from root -> current
  const crumbs = useMemo(() => {
    const chain: Folder[] = [];
    let cur = currentFolderId;
    const byId = new Map(folders.map((f) => [f.id, f]));
    while (cur) {
      const f = byId.get(cur);
      if (!f) break;
      chain.unshift(f);
      cur = f.parentId;
    }
    return chain;
  }, [currentFolderId, folders]);

  const currentFolder = crumbs[crumbs.length - 1] ?? null;

  // subfolders + files in this folder (respecting search & filters)
  const visibleFolders = useMemo(() => {
    let arr = folders.filter((f) => (f.parentId ?? null) === currentFolderId);
    if (!showHidden) arr = arr.filter((f) => !f.hidden);
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((f) => f.name.toLowerCase().includes(q));
    }
    arr.sort((a, b) => {
      switch (sort) {
        case "az":
          return a.name.localeCompare(b.name);
        case "za":
          return b.name.localeCompare(a.name);
        case "old-recent":
          return a.createdDate - b.createdDate;
        case "size-desc":
        case "size-asc":
        case "recent-old":
        default:
          return b.createdDate - a.createdDate;
      }
    });
    arr.sort((a, b) => Number(b.pinned) - Number(a.pinned));
    return arr;
  }, [folders, currentFolderId, showHidden, query, sort]);

  const list = useMemo(() => {
    let arr = files.filter((f) => (f.folderId ?? null) === currentFolderId);
    arr = arr.filter((f) => (showHidden ? true : !f.hidden));
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
    arr.sort((a, b) => Number(b.pinned) - Number(a.pinned));
    return arr;
  }, [files, currentFolderId, cat, query, sort, showHidden]);

  // Folder statistics (recursive over all descendants)
  const folderStats = useMemo(() => {
    if (!currentFolder) return null;
    const descendants = new Set<string>([currentFolder.id]);
    let added = true;
    while (added) {
      added = false;
      for (const fo of folders) {
        if (fo.parentId && descendants.has(fo.parentId) && !descendants.has(fo.id)) {
          descendants.add(fo.id);
          added = true;
        }
      }
    }
    const inFiles = files.filter((f) => f.folderId && descendants.has(f.folderId));
    const subCount = descendants.size - 1;
    return {
      fileCount: inFiles.length,
      subCount,
      size: inFiles.reduce((s, f) => s + f.size, 0),
    };
  }, [currentFolder, folders, files]);

  const categoryStats = useMemo(() => {
    if (cat === "all") return null;
    const inCat = files.filter((f) => f.category === cat && !f.hidden);
    return {
      count: inCat.length,
      size: inCat.reduce((s, f) => s + f.size, 0),
    };
  }, [cat, files]);

  // All descendant folder ids of a given folder (used to exclude from move targets)
  function descendantIds(folderId: string): Set<string> {
    const set = new Set<string>([folderId]);
    let added = true;
    while (added) {
      added = false;
      for (const fo of folders) {
        if (fo.parentId && set.has(fo.parentId) && !set.has(fo.id)) {
          set.add(fo.id);
          added = true;
        }
      }
    }
    return set;
  }

  function folderPath(f: Folder): string {
    const parts: string[] = [f.name];
    let cur = f.parentId;
    const byId = new Map(folders.map((x) => [x.id, x]));
    while (cur) {
      const p = byId.get(cur);
      if (!p) break;
      parts.unshift(p.name);
      cur = p.parentId;
    }
    return "/ " + parts.join(" / ");
  }

  async function openFile(f: FileMeta) {
    if (f.locked && !isUnlocked(f.id)) {
      setLockState({
        mode: "unlock",
        item: { kind: "file", file: f },
        after: () => {
          markUnlocked(f.id);
          actuallyOpen(f);
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

  function openFolder(fo: Folder) {
    if (fo.locked && !isUnlocked(fo.id)) {
      setLockState({
        mode: "unlock",
        item: { kind: "open-folder", folder: fo },
        after: () => {
          markUnlocked(fo.id);
          setCurrentFolderId(fo.id);
        },
      });
      return;
    }
    setCurrentFolderId(fo.id);
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
      folderId: f.folderId ?? null,
    });
    await putBlob(id, blob);
    toast.success("File copied");
  }

  function toggleLock(f: FileMeta) {
    if (f.locked) {
      setLockState({
        mode: "unlock",
        item: { kind: "file", file: f },
        after: () => {
          updateFile(f.id, { locked: false });
          toast.success("Unlocked");
        },
      });
    } else {
      setLockState({
        mode: "lock",
        item: { kind: "file", file: f },
        after: () => {
          updateFile(f.id, { locked: true });
          toast.success("Locked");
        },
      });
    }
  }

  function toggleFolderLock(fo: Folder) {
    if (fo.locked) {
      setLockState({
        mode: "unlock",
        item: { kind: "folder", folder: fo },
        after: () => {
          updateFolder(fo.id, { locked: false });
          toast.success("Folder unlocked");
        },
      });
    } else {
      setLockState({
        mode: "lock",
        item: { kind: "folder", folder: fo },
        after: () => {
          updateFolder(fo.id, { locked: true });
          toast.success("Folder locked");
        },
      });
    }
  }

  function createFolder() {
    const r = addFolder(newFolderName, currentFolderId);
    if (!r.ok) return toast.error(r.error);
    toast.success("Folder created");
    setNewFolderName("");
    setNewFolderOpen(false);
  }

  const folderMoveOptions = useMemo(() => {
    const exclude = moveFolderFor ? descendantIds(moveFolderFor.id) : new Set<string>();
    return folders.filter((f) => !exclude.has(f.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders, moveFolderFor]);

  const totalCount = visibleFolders.length + list.length;

  return (
    <AppShell search={query} onSearchChange={setQuery}>
      <PageHeader
        title={currentFolder ? currentFolder.name : "File Vault"}
        subtitle={
          currentFolder
            ? `${list.length} ${list.length === 1 ? "file" : "files"} · ${visibleFolders.length} ${visibleFolders.length === 1 ? "folder" : "folders"} here`
            : `${totalCount} ${totalCount === 1 ? "item" : "items"} stored on this device`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setNewFolderOpen(true)}
            >
              <FolderPlus className="size-4" /> New Folder
            </Button>
            <Button
              onClick={() => setUploadOpen(true)}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              <Upload className="size-4" /> Upload
            </Button>
          </div>
        }
      />

      {/* Breadcrumbs */}
      <div className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {currentFolder && (
          <button
            type="button"
            onClick={() => setCurrentFolderId(currentFolder.parentId)}
            className="mr-1 flex size-7 items-center justify-center rounded-full ring-1 ring-border hover:bg-secondary hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setCurrentFolderId(null)}
          className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-secondary ${
            !currentFolder ? "font-semibold text-foreground" : ""
          }`}
        >
          <Home className="size-3.5" /> Files
        </button>
        {crumbs.map((c, i) => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 opacity-60" />
            <button
              type="button"
              onClick={() => setCurrentFolderId(c.id)}
              className={`rounded-md px-2 py-1 transition-colors hover:bg-secondary ${
                i === crumbs.length - 1 ? "font-semibold text-foreground" : ""
              }`}
            >
              {c.name}
            </button>
          </span>
        ))}
      </div>

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
            aria-label={showHidden ? "Hide hidden items" : "Show hidden items"}
            title={showHidden ? "Hide hidden items" : "Show hidden items"}
            className="flex size-9 items-center justify-center rounded-full bg-surface text-muted-foreground ring-1 ring-border transition-colors hover:bg-secondary hover:text-foreground"
          >
            {showHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </button>
        </div>
      </div>

      {/* Folder stats card */}
      {folderStats && (
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl bg-brand/5 px-4 py-3 ring-1 ring-brand/15">
          <div className="flex size-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
            <FolderIcon className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-brand">
              {currentFolder!.name}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{folderStats.fileCount}</span> files ·{" "}
              <span className="font-semibold text-foreground">{folderStats.subCount}</span> subfolders ·{" "}
              <span className="font-semibold text-foreground">{formatSize(folderStats.size)}</span>
            </p>
          </div>
        </div>
      )}

      {categoryStats && (
        <div className="mb-5 flex items-center justify-between rounded-xl bg-brand/5 px-4 py-3 ring-1 ring-brand/15">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand">{cat}</p>
            <p className="mt-0.5 text-sm">
              <span className="font-semibold">{categoryStats.count}</span> files ·{" "}
              <span className="font-semibold">{formatSize(categoryStats.size)}</span> used
            </p>
          </div>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-16 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Search className="size-5" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">Nothing here yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {query
              ? "Try a different search."
              : "Create a folder or upload your first file to begin."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {visibleFolders.length > 0 && (
            <section>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Folders
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {visibleFolders.map((fo) => {
                  const childCount = folders.filter((x) => x.parentId === fo.id).length;
                  const fileCount = files.filter((f) => f.folderId === fo.id).length;
                  return (
                    <div
                      key={fo.id}
                      className="group relative flex items-center gap-4 rounded-xl bg-surface p-3 shadow-soft ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:bg-secondary/40 hover:ring-brand/30 dark:ring-white/5"
                    >
                      {fo.pinned && (
                        <span className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-glow">
                          <Pin className="size-3" />
                        </span>
                      )}
                      <button
                        onClick={() => openFolder(fo)}
                        className="flex flex-1 items-center gap-4 text-left min-w-0"
                      >
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 dark:bg-amber-400/10 dark:text-amber-300">
                          <FolderIcon className="size-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{fo.name}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {fileCount} {fileCount === 1 ? "file" : "files"}
                            {childCount > 0
                              ? ` · ${childCount} ${childCount === 1 ? "folder" : "folders"}`
                              : ""}{" "}
                            · {timeAgo(fo.modifiedDate)}
                          </p>
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        {fo.favorite && <Heart className="size-3.5 fill-rose-500 text-rose-500" />}
                        {fo.locked && <Lock className="size-3.5 text-muted-foreground" />}
                        <FolderInfoMenu
                          folder={fo}
                          onOpen={() => openFolder(fo)}
                          onRename={() => {
                            setRenameFolderFor(fo);
                            setRenameFolderVal(fo.name);
                          }}
                          onMove={() => {
                            setMoveFolderFor(fo);
                            setMoveFolderToId(fo.parentId ?? "root");
                          }}
                          onTogglePin={() => updateFolder(fo.id, { pinned: !fo.pinned })}
                          onToggleFav={() => updateFolder(fo.id, { favorite: !fo.favorite })}
                          onToggleHide={() => updateFolder(fo.id, { hidden: !fo.hidden })}
                          onToggleLock={() => toggleFolderLock(fo)}
                          onDelete={async () => {
                            if (
                              !confirm(
                                `Delete folder "${fo.name}" and everything inside it? This cannot be undone.`,
                              )
                            )
                              return;
                            await deleteFolder(fo.id);
                            toast.success("Folder deleted");
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {list.length > 0 && (
            <section>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Files
              </h2>
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
                      onClick={() => openFile(f)}
                      className="flex flex-1 items-center gap-4 text-left min-w-0"
                    >
                      <FileTypeIcon kind={f.kind} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{f.fileName}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {f.category} · {formatSize(f.size)} · {timeAgo(f.uploadDate)}
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
                          setMoveToFolderId(f.folderId ?? "root");
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
            </section>
          )}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        folderId={currentFolderId}
        folderLabel={currentFolder?.name}
      />
      <FilePreviewDialog
        file={previewFile}
        open={!!previewFile}
        onOpenChange={(v) => !v && setPreviewFile(null)}
      />

      <LockDialog
        open={!!lockState}
        onOpenChange={(v) => !v && setLockState(null)}
        mode={lockState?.mode ?? "unlock"}
        itemName={
          lockState?.item.kind === "file"
            ? lockState.item.file.fileName
            : lockState?.item.kind === "folder" || lockState?.item.kind === "open-folder"
            ? lockState.item.folder.name
            : undefined
        }
        onSuccess={() => lockState && lockState.after()}
      />

      {/* New folder */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              {currentFolder
                ? `New folder will be created inside "${currentFolder.name}".`
                : "New folder will be created at the top of your vault."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Folder Name</Label>
            <Input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createFolder();
              }}
              placeholder="e.g. College"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createFolder}
              disabled={!newFolderName.trim()}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename file */}
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

      {/* Rename folder */}
      <Dialog open={!!renameFolderFor} onOpenChange={(v) => !v && setRenameFolderFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          <Input
            value={renameFolderVal}
            onChange={(e) => setRenameFolderVal(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolderFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!renameFolderFor) return;
                const name = renameFolderVal.trim();
                if (!name) return;
                const dup = folders.some(
                  (fo) =>
                    fo.id !== renameFolderFor.id &&
                    (fo.parentId ?? null) === (renameFolderFor.parentId ?? null) &&
                    fo.name.toLowerCase() === name.toLowerCase(),
                );
                if (dup) {
                  toast.error("A folder with that name already exists here");
                  return;
                }
                updateFolder(renameFolderFor.id, { name });
                toast.success("Renamed");
                setRenameFolderFor(null);
              }}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move file to folder */}
      <Dialog open={!!moveFor} onOpenChange={(v) => !v && setMoveFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Destination folder</Label>
            <Select value={moveToFolderId} onValueChange={(v) => setMoveToFolderId(v as string)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">/ (Top of vault)</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {folderPath(f)}
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
                if (moveFor) {
                  updateFile(moveFor.id, {
                    folderId: moveToFolderId === "root" ? null : moveToFolderId,
                  });
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

      {/* Move folder */}
      <Dialog open={!!moveFolderFor} onOpenChange={(v) => !v && setMoveFolderFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move folder</DialogTitle>
            <DialogDescription>Choose where to place this folder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Destination</Label>
            <Select
              value={moveFolderToId}
              onValueChange={(v) => setMoveFolderToId(v as string)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">/ (Top of vault)</SelectItem>
                {folderMoveOptions.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {folderPath(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveFolderFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!moveFolderFor) return;
                const r = moveFolder(
                  moveFolderFor.id,
                  moveFolderToId === "root" ? null : moveFolderToId,
                );
                if (!r.ok) {
                  toast.error(r.error);
                  return;
                }
                toast.success("Folder moved");
                setMoveFolderFor(null);
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

function FolderInfoMenu({
  folder,
  onOpen,
  onRename,
  onMove,
  onTogglePin,
  onToggleFav,
  onToggleHide,
  onToggleLock,
  onDelete,
}: {
  folder: Folder;
  onOpen: () => void;
  onRename: () => void;
  onMove: () => void;
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
          aria-label="Folder options"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b border-border bg-secondary/30 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
              <FolderIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" title={folder.name}>
                {folder.name}
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                Folder
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 p-1">
          <Action icon={<ExternalLink className="size-4" />} label="Open" onClick={onOpen} />
          <Action icon={<Pencil className="size-4" />} label="Rename" onClick={onRename} />
          <Action icon={<FolderInput className="size-4" />} label="Move" onClick={onMove} />
          <Action
            icon={folder.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            label={folder.pinned ? "Unpin" : "Pin"}
            onClick={onTogglePin}
          />
          <Action
            icon={
              <Heart
                className={`size-4 ${folder.favorite ? "fill-rose-500 text-rose-500" : ""}`}
              />
            }
            label={folder.favorite ? "Unfavorite" : "Favorite"}
            onClick={onToggleFav}
          />
          <Action
            icon={folder.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            label={folder.hidden ? "Unhide" : "Hide"}
            onClick={onToggleHide}
          />
          <Action
            icon={folder.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
            label={folder.locked ? "Unlock" : "Lock"}
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
                {file.kind} · {file.category}
              </p>
            </div>
          </div>
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
