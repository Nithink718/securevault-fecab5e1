import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Tag, Sparkles } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { estimateNotesSize, useVault } from "@/lib/store";
import { formatSize } from "@/lib/file-utils";
import type { Category } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories — SecureVault" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const currentUserId = useVault((s) => s.currentUserId);
  const allCategories = useVault((s) => s.categories);
  const allFiles = useVault((s) => s.files);
  const allNotes = useVault((s) => s.notes);
  const addCategory = useVault((s) => s.addCategory);
  const renameCategory = useVault((s) => s.renameCategory);
  const deleteCategory = useVault((s) => s.deleteCategory);

  const categories = useMemo(
    () => allCategories.filter((c) => c.userId === currentUserId),
    [allCategories, currentUserId],
  );
  const files = useMemo(
    () => allFiles.filter((f) => f.userId === currentUserId),
    [allFiles, currentUserId],
  );
  const notes = useMemo(
    () => allNotes.filter((n) => n.userId === currentUserId),
    [allNotes, currentUserId],
  );

  const [tab, setTab] = useState<"file" | "note">("file");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");

  const list = useMemo(() => categories.filter((c) => c.type === tab), [categories, tab]);

  function statsFor(c: Category): { count: number; size: number } {
    if (c.type === "file") {
      const items = files.filter((f) => f.category === c.name);
      return { count: items.length, size: items.reduce((s, f) => s + f.size, 0) };
    }
    const items = notes.filter((n) => n.category === c.name);
    return { count: items.length, size: estimateNotesSize(items) };
  }

  return (
    <AppShell>
      <PageHeader
        title="Categories"
        subtitle="Organize your files and notes into focused collections."
        actions={
          <Button
            onClick={() => {
              setNewName("");
              setAddOpen(true);
            }}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Plus className="size-4" /> New Category
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-flex size-5 items-center justify-center rounded bg-brand/10 text-brand">
            <Tag className="size-3" />
          </span>
          Built-in
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-flex size-5 items-center justify-center rounded bg-violet-500/10 text-violet-500">
            <Sparkles className="size-3" />
          </span>
          Custom
        </span>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "file" | "note")}>
        <TabsList>
          <TabsTrigger value="file">File categories</TabsTrigger>
          <TabsTrigger value="note">Note categories</TabsTrigger>
        </TabsList>

        {(["file", "note"] as const).map((t) => (
          <TabsContent key={t} value={t} className="mt-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => {
                const s = statsFor(c);
                const builtIn = !!c.builtIn;
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 rounded-xl bg-surface p-4 ring-1 ring-black/5 shadow-soft dark:ring-white/5"
                  >
                    <div
                      className={`flex size-10 items-center justify-center rounded-lg ${
                        builtIn
                          ? "bg-brand/10 text-brand"
                          : "bg-violet-500/10 text-violet-500"
                      }`}
                    >
                      {builtIn ? <Tag className="size-4" /> : <Sparkles className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.count} {c.type === "file" ? "files" : "notes"} • {formatSize(s.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditing(c);
                        setEditName(c.name);
                      }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Rename"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Delete category "${c.name}"? Items will keep this label but the category is removed.`,
                          )
                        ) {
                          deleteCategory(c.id);
                          toast.success("Category removed");
                        }
                      }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New {tab === "file" ? "file" : "note"} category</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newName.trim()) return;
                addCategory(newName.trim(), tab);
                toast.success("Category added");
                setAddOpen(false);
              }}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
          </DialogHeader>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editing && editName.trim()) {
                  renameCategory(editing.id, editName.trim());
                  toast.success("Renamed");
                }
                setEditing(null);
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
