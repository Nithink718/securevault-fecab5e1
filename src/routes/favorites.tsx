import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Heart, FileText, StickyNote } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { FileTypeIcon } from "@/components/file-type-icon";
import { useVault } from "@/lib/store";
import { formatSize, timeAgo } from "@/lib/file-utils";
import { FilePreviewDialog } from "@/components/file-preview-dialog";
import { NoteDialog } from "@/components/note-dialog";
import { LockDialog } from "@/components/lock-dialog";
import type { FileMeta, Note } from "@/lib/types";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Favorites — SecureVault" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const currentUserId = useVault((s) => s.currentUserId);
  const allFiles = useVault((s) => s.files);
  const allNotes = useVault((s) => s.notes);
  const isUnlocked = useVault((s) => s.isUnlocked);
  const markUnlocked = useVault((s) => s.markUnlocked);
  const touchFile = useVault((s) => s.touchFile);

  const files = useMemo(
    () => allFiles.filter((f) => f.userId === currentUserId && f.favorite && !f.hidden),
    [allFiles, currentUserId],
  );
  const notes = useMemo(
    () => allNotes.filter((n) => n.userId === currentUserId && n.favorite && !n.hidden),
    [allNotes, currentUserId],
  );

  const [previewFile, setPreviewFile] = useState<FileMeta | null>(null);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [noteOpen, setNoteOpen] = useState(false);
  const [lockTarget, setLockTarget] = useState<
    | null
    | { kind: "file"; item: FileMeta }
    | { kind: "note"; item: Note }
  >(null);

  function openFile(f: FileMeta) {
    if (f.locked && !isUnlocked(f.id)) {
      setLockTarget({ kind: "file", item: f });
      return;
    }
    touchFile(f.id);
    setPreviewFile(f);
  }

  function openNote(n: Note) {
    if (n.locked && !isUnlocked(n.id)) {
      setLockTarget({ kind: "note", item: n });
      return;
    }
    setEditingNote(n);
    setNoteOpen(true);
  }

  function handleUnlocked() {
    if (!lockTarget) return;
    markUnlocked(lockTarget.item.id);
    if (lockTarget.kind === "file") {
      const f = lockTarget.item;
      touchFile(f.id);
      setPreviewFile(f);
    } else {
      setEditingNote(lockTarget.item);
      setNoteOpen(true);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Favorites" subtitle="Quick access to the things you care about most." />

      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <FileText className="size-4" /> Favorite Files
        </h2>
        {files.length === 0 ? (
          <EmptyHint label="No favorite files yet." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {files.map((f) => (
              <button
                key={f.id}
                onClick={() => openFile(f)}
                className="flex items-center gap-4 rounded-xl bg-surface p-3 text-left ring-1 ring-black/5 shadow-soft hover:bg-secondary/40 dark:ring-white/5"
              >
                <FileTypeIcon kind={f.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.fileName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatSize(f.size)} • {timeAgo(f.uploadDate)}
                  </p>
                </div>
                <Heart className="size-4 fill-rose-500 text-rose-500" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <StickyNote className="size-4" /> Favorite Notes
        </h2>
        {notes.length === 0 ? (
          <EmptyHint label="No favorite notes yet." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {notes.map((n) => (
              <button
                key={n.id}
                onClick={() => openNote(n)}
                className="flex flex-col rounded-2xl bg-surface p-5 text-left ring-1 ring-black/5 shadow-soft hover:shadow-card dark:ring-white/5"
                style={{ borderLeft: `3px solid ${n.color}` }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {n.category}
                  </span>
                  <Heart className="size-4 fill-rose-500 text-rose-500" />
                </div>
                <h3 className="text-base font-semibold">{n.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {n.locked && !isUnlocked(n.id) ? "🔒 Locked" : n.content}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <FilePreviewDialog
        file={previewFile}
        open={!!previewFile}
        onOpenChange={(v) => !v && setPreviewFile(null)}
      />
      <NoteDialog open={noteOpen} onOpenChange={setNoteOpen} note={editingNote} />
      <LockDialog
        open={!!lockTarget}
        onOpenChange={(v) => !v && setLockTarget(null)}
        mode="unlock"
        itemName={
          lockTarget?.kind === "file" ? lockTarget.item.fileName : lockTarget?.item.title
        }
        onSuccess={handleUnlocked}
      />
    </AppShell>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}
