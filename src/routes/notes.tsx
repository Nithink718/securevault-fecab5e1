import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Pencil,
  Pin,
  PinOff,
  Heart,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
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
import { useVault } from "@/lib/store";
import { timeAgo } from "@/lib/file-utils";
import { NoteDialog } from "@/components/note-dialog";
import { toast } from "sonner";
import type { Note } from "@/lib/types";

export const Route = createFileRoute("/notes")({
  head: () => ({ meta: [{ title: "Notes — SecureVault" }] }),
  component: NotesPage,
});

function NotesPage() {
  const { notes, categories, updateNote, deleteNote } = useVault(
    useShallow((s) => ({
      notes: s.notes.filter((n) => n.userId === s.currentUserId),
      categories: s.categories.filter((c) => c.userId === s.currentUserId && c.type === "note"),
      updateNote: s.updateNote,
      deleteNote: s.deleteNote,
    })),
  );

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [showHidden, setShowHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | undefined>(undefined);

  const list = useMemo(() => {
    let arr = notes.filter((n) => (showHidden ? true : !n.hidden));
    if (cat !== "all") arr = arr.filter((n) => n.category === cat);
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    }
    arr.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedDate - a.updatedDate);
    return arr;
  }, [notes, cat, query, showHidden]);

  return (
    <AppShell search={query} onSearchChange={setQuery}>
      <PageHeader
        title="Notes"
        subtitle={`${list.length} ${list.length === 1 ? "note" : "notes"}`}
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setOpen(true);
            }}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Plus className="size-4" /> New Note
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
        <Button variant="outline" size="sm" onClick={() => setShowHidden((s) => !s)}>
          {showHidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {showHidden ? "Hide hidden" : "Show hidden"}
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-16 text-center">
          <h3 className="text-sm font-semibold">No notes yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">Create a note to keep ideas, passwords, or anything secure.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((n) => (
            <article
              key={n.id}
              className="group flex flex-col rounded-2xl bg-surface p-5 ring-1 ring-black/5 shadow-soft transition-shadow hover:shadow-card dark:ring-white/5"
              style={{ borderLeft: `3px solid ${n.color}` }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {n.category}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditing(n);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateNote(n.id, { pinned: !n.pinned })}>
                      {n.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                      {n.pinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateNote(n.id, { favorite: !n.favorite })}>
                      <Heart className="size-4" /> {n.favorite ? "Unfavorite" : "Favorite"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateNote(n.id, { locked: !n.locked })}>
                      {n.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                      {n.locked ? "Unlock" : "Lock"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateNote(n.id, { hidden: !n.hidden })}>
                      {n.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      {n.hidden ? "Unhide" : "Hide"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (confirm("Delete this note?")) {
                          deleteNote(n.id);
                          toast.success("Note deleted");
                        }
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <button
                onClick={() => {
                  if (n.locked) {
                    const p = window.prompt("Note is locked. Enter password:");
                    if (!p) return;
                  }
                  setEditing(n);
                  setOpen(true);
                }}
                className="text-left"
              >
                <h3 className="text-base font-semibold">
                  {n.pinned && <Pin className="mr-1 inline size-3.5 text-brand" />}
                  {n.title}
                </h3>
                <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {n.locked ? "🔒 Locked — open to view content" : n.content || "Empty note"}
                </p>
              </button>
              <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span>{timeAgo(n.updatedDate)}</span>
                <div className="flex items-center gap-1.5">
                  {n.favorite && <Heart className="size-3 fill-rose-500 text-rose-500" />}
                  {n.locked && <Lock className="size-3" />}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <NoteDialog open={open} onOpenChange={setOpen} note={editing} />
    </AppShell>
  );
}
