import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { useVault } from "@/lib/store";
import type { Category } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories — SecureVault" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { categories, files, notes, addCategory, renameCategory, deleteCategory } = useVault(
    useShallow((s) => ({
      categories: s.categories.filter((c) => c.userId === s.currentUserId),
      files: s.files.filter((f) => f.userId === s.currentUserId),
      notes: s.notes.filter((n) => n.userId === s.currentUserId),
      addCategory: s.addCategory,
      renameCategory: s.renameCategory,
      deleteCategory: s.deleteCategory,
    })),
  );

  const [tab, setTab] = useState<"file" | "note">("file");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");

  const list = useMemo(() => categories.filter((c) => c.type === tab), [categories, tab]);

  function countFor(c: Category) {
    return c.type === "file"
      ? files.filter((f) => f.category === c.name).length
      : notes.filter((n) => n.category === c.name).length;
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as "file" | "note")}>
        <TabsList>
          <TabsTrigger value="file">File categories</TabsTrigger>
          <TabsTrigger value="note">Note categories</TabsTrigger>
        </TabsList>

        {(["file", "note"] as const).map((t) => (
          <TabsContent key={t} value={t} className="mt-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-4 rounded-xl bg-surface p-4 ring-1 ring-black/5 shadow-soft dark:ring-white/5"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Tag className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {countFor(c)} {c.type === "file" ? "files" : "notes"}
                      {c.builtIn && " • built-in"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditing(c);
                      setEditName(c.name);
                    }}
                    className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete category "${c.name}"? Items will keep this label but the category is removed.`)) {
                        deleteCategory(c.id);
                        toast.success("Category removed");
                      }
                    }}
                    className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
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
            <Input id="cat-name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
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
