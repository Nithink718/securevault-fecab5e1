import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useVault } from "@/lib/store";
import type { Note } from "@/lib/types";

const COLORS = ["#2563EB", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899", "#64748B"];

export function NoteDialog({
  open,
  onOpenChange,
  note,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  note?: Note;
}) {
  const currentUserId = useVault((s) => s.currentUserId);
  const allCategories = useVault((s) => s.categories);
  const addNote = useVault((s) => s.addNote);
  const updateNote = useVault((s) => s.updateNote);
  const categories = useMemo(
    () => allCategories.filter((c) => c.userId === currentUserId && c.type === "note"),
    [allCategories, currentUserId],
  );

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Personal");
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (open) {
      setTitle(note?.title ?? "");
      setContent(note?.content ?? "");
      setCategory(note?.category ?? categories[0]?.name ?? "Personal");
      setColor(note?.color ?? COLORS[0]);
    }
  }, [open, note, categories]);

  function save() {
    if (!title.trim() && !content.trim()) return;
    if (note) updateNote(note.id, { title, content, category, color });
    else addNote({ title, content, category, color });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{note ? "Edit note" : "New note"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-content">Content</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing…"
              rows={8}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
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
            <div className="space-y-1.5">
              <Label>Color tag</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`size-6 rounded-full ring-offset-2 transition-all ${color === c ? "ring-2 ring-foreground" : ""}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} className="bg-brand text-brand-foreground hover:bg-brand/90">
            {note ? "Save changes" : "Create note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
