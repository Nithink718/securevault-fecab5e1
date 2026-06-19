import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Heart, FileText, StickyNote } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { FileTypeIcon } from "@/components/file-type-icon";
import { useVault } from "@/lib/store";
import { formatSize, timeAgo } from "@/lib/file-utils";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Favorites — SecureVault" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const currentUserId = useVault((s) => s.currentUserId);
  const allFiles = useVault((s) => s.files);
  const allNotes = useVault((s) => s.notes);
  const files = useMemo(
    () => allFiles.filter((f) => f.userId === currentUserId && f.favorite && !f.hidden),
    [allFiles, currentUserId],
  );
  const notes = useMemo(
    () => allNotes.filter((n) => n.userId === currentUserId && n.favorite && !n.hidden),
    [allNotes, currentUserId],
  );

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
              <Link
                to="/files"
                key={f.id}
                className="flex items-center gap-4 rounded-xl bg-surface p-3 ring-1 ring-black/5 shadow-soft hover:bg-secondary/40 dark:ring-white/5"
              >
                <FileTypeIcon kind={f.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.fileName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatSize(f.size)} • {timeAgo(f.uploadDate)}
                  </p>
                </div>
                <Heart className="size-4 fill-rose-500 text-rose-500" />
              </Link>
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
              <Link
                to="/notes"
                key={n.id}
                className="flex flex-col rounded-2xl bg-surface p-5 ring-1 ring-black/5 shadow-soft hover:shadow-card dark:ring-white/5"
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
                  {n.locked ? "🔒 Locked" : n.content}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
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
