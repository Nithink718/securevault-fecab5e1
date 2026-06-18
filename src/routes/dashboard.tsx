import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Upload, Pencil, FileText, StickyNote, HardDrive, Heart, Lock, Clock } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { FileTypeIcon } from "@/components/file-type-icon";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useVault } from "@/lib/store";
import { formatSize, timeAgo } from "@/lib/file-utils";
import { UploadDialog } from "@/components/upload-dialog";
import { NoteDialog } from "@/components/note-dialog";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — SecureVault" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const user = useCurrentUser();
  const { files, notes } = useVault(
    useShallow((s) => ({
      files: s.files.filter((f) => f.userId === s.currentUserId && !f.hidden),
      notes: s.notes.filter((n) => n.userId === s.currentUserId && !n.hidden),
    })),
  );
  const [uploadOpen, setUploadOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  const totalSize = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);
  const favoriteFiles = files.filter((f) => f.favorite).length;
  const favoriteNotes = notes.filter((n) => n.favorite).length;
  const recent = [...files].sort((a, b) => (b.lastOpened ?? b.uploadDate) - (a.lastOpened ?? a.uploadDate)).slice(0, 6);
  const recentNotes = [...notes].sort((a, b) => b.updatedDate - a.updatedDate).slice(0, 4);

  // Treat 1 GB as "vault capacity" for the progress bar — local storage is virtually unlimited.
  const capacity = 1024 * 1024 * 1024;
  const pct = Math.min(100, Math.round((totalSize / capacity) * 100));

  return (
    <AppShell>
      <PageHeader
        title={`Welcome back, ${user?.username.split(" ")[0] ?? ""}`}
        subtitle="Your vault is encrypted and stored locally on this device."
        actions={
          <>
            <Button onClick={() => setUploadOpen(true)} className="bg-foreground text-background hover:bg-foreground/90">
              <Upload className="size-4" /> Upload File
            </Button>
            <Button variant="outline" onClick={() => setNoteOpen(true)}>
              <Pencil className="size-4" /> New Note
            </Button>
          </>
        }
      />

      <section className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<FileText className="size-4" />} label="Total Files" value={files.length.toLocaleString()} />
        <StatCard icon={<StickyNote className="size-4" />} label="Total Notes" value={notes.length.toLocaleString()} />
        <StatCard
          icon={<HardDrive className="size-4" />}
          label="Storage Used"
          value={formatSize(totalSize)}
          extra={
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
          }
        />
        <StatCard
          icon={<Heart className="size-4" />}
          label="Favorites"
          value={(favoriteFiles + favoriteNotes).toLocaleString()}
        />
      </section>

      <section className="mb-12">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent Files</h2>
          <Link to="/files" className="text-sm font-medium text-brand hover:underline underline-offset-4">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="No files yet"
            description="Upload your first document to get started."
            action={
              <Button onClick={() => setUploadOpen(true)} size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                <Upload className="size-4" /> Upload File
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((f) => (
              <Link
                key={f.id}
                to="/files"
                className="group flex items-center gap-4 rounded-xl border border-transparent bg-surface p-3 shadow-soft ring-1 ring-black/5 transition-colors hover:bg-secondary/40 dark:ring-white/5"
              >
                <FileTypeIcon kind={f.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.fileName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatSize(f.size)} • {timeAgo(f.lastOpened ?? f.uploadDate)}
                  </p>
                </div>
                {f.locked && <Lock className="size-3.5 text-muted-foreground" />}
                {f.favorite && <Heart className="size-3.5 fill-rose-500 text-rose-500" />}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Secure Notes</h2>
          <Link to="/notes" className="text-sm font-medium text-brand hover:underline underline-offset-4">
            View all
          </Link>
        </div>
        {recentNotes.length === 0 ? (
          <EmptyState
            icon={<StickyNote className="size-5" />}
            title="No notes yet"
            description="Capture an idea, password, or anything sensitive."
            action={
              <Button onClick={() => setNoteOpen(true)} size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                <Pencil className="size-4" /> New Note
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {recentNotes.map((n) => (
              <Link
                key={n.id}
                to="/notes"
                className="flex flex-col rounded-2xl bg-surface p-6 ring-1 ring-black/5 shadow-card transition-shadow hover:shadow-md dark:ring-white/5"
                style={{ borderLeft: `3px solid ${n.color}` }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {n.category}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Clock className="size-3" /> {timeAgo(n.updatedDate)}
                  </span>
                </div>
                <h3 className="text-base font-semibold">{n.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {n.locked ? "🔒 Locked — open to view content" : n.content || "Empty note"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <NoteDialog open={noteOpen} onOpenChange={setNoteOpen} />
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface p-5 ring-1 ring-black/5 shadow-soft dark:ring-white/5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {extra}
    </div>
  );
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-10 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
