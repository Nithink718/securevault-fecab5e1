import { useEffect, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVault } from "@/lib/store";
import { putBlob } from "@/lib/idb";
import { defaultCategoryForKind, detectKind, formatSize } from "@/lib/file-utils";
import { toast } from "sonner";

export function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<string>("");
  const [dragging, setDragging] = useState(false);

  const currentUserId = useVault((s) => s.currentUserId);
  const allCategories = useVault((s) => s.categories);
  const addFile = useVault((s) => s.addFile);
  const categories = useMemo(
    () => allCategories.filter((c) => c.userId === currentUserId && c.type === "file"),
    [allCategories, currentUserId],
  );

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setCategory("");
    }
  }, [open]);

  async function handleUpload() {
    if (files.length === 0) return;
    let uploaded = 0;
    for (const file of files) {
      const kind = detectKind(file.type, file.name);
      const cat = category || defaultCategoryForKind(kind);
      const id = addFile({
        fileName: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
        kind,
        category: cat,
      });
      try {
        await putBlob(id, file);
        uploaded++;
      } catch (e) {
        toast.error(`Failed to store ${file.name}`);
      }
    }
    toast.success(`Uploaded ${uploaded} file${uploaded === 1 ? "" : "s"}`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload to vault</DialogTitle>
          <DialogDescription>Files are saved to your device only — never uploaded to the cloud.</DialogDescription>
        </DialogHeader>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            setFiles(Array.from(e.dataTransfer.files));
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            dragging ? "border-brand bg-brand/5" : "border-border hover:bg-secondary/40"
          }`}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Upload className="size-5" />
          </div>
          <p className="mt-3 text-sm font-medium">Drop files here, or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">PDF, Word, Excel, Images, Video, Audio, ZIP, TXT</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </div>

        {files.length > 0 && (
          <div className="max-h-40 space-y-2 overflow-auto rounded-lg border border-border p-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{f.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatSize(f.size)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Auto (based on file type)" />
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            Upload {files.length > 0 ? `${files.length} file${files.length === 1 ? "" : "s"}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
