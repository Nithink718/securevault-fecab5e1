/**
 * File System Access API helpers. Only Chromium-based browsers support this.
 * Callers must check isFsaSupported() first.
 */
import { getDirHandle, putDirHandle, deleteDirHandle } from "./idb";

export const SUBFOLDERS = [
  "Documents",
  "Images",
  "Videos",
  "Audio",
  "Notes",
  "Archives",
  "Others",
] as const;

export type Subfolder = (typeof SUBFOLDERS)[number];

export function isFsaSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickCustomFolder(): Promise<FileSystemDirectoryHandle> {
  if (!isFsaSupported()) throw new Error("Folder picker not supported in this browser");
  // @ts-expect-error - showDirectoryPicker is not in stock lib.dom types
  const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
    id: "securevault-root",
    mode: "readwrite",
  });
  await ensureSubfolders(handle);
  await putDirHandle(handle);
  return handle;
}

export async function ensureSubfolders(root: FileSystemDirectoryHandle) {
  for (const name of SUBFOLDERS) {
    await root.getDirectoryHandle(name, { create: true });
  }
}

export function categoryToSubfolder(category: string, kind: string): Subfolder {
  const c = category.toLowerCase();
  if (c.includes("image")) return "Images";
  if (c.includes("video")) return "Videos";
  if (c.includes("audio")) return "Audio";
  if (c.includes("archive")) return "Archives";
  if (c.includes("note")) return "Notes";
  if (c.includes("doc") || c.includes("pdf") || c.includes("word") || c.includes("excel"))
    return "Documents";
  // fall back by kind
  if (kind === "image") return "Images";
  if (kind === "video") return "Videos";
  if (kind === "audio") return "Audio";
  if (kind === "archive") return "Archives";
  if (["pdf", "word", "excel", "powerpoint", "text"].includes(kind)) return "Documents";
  return "Others";
}

export async function writeFileToVault(
  file: File,
  subfolder: Subfolder,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const handle = await getDirHandle();
    if (!handle) return { ok: false, error: "No custom folder is configured" };
    const h = handle as unknown as {
      queryPermission: (o: { mode: "readwrite" }) => Promise<PermissionState>;
      requestPermission: (o: { mode: "readwrite" }) => Promise<PermissionState>;
    };
    const perm = await h.queryPermission({ mode: "readwrite" });
    if (perm !== "granted") {
      const req = await h.requestPermission({ mode: "readwrite" });
      if (req !== "granted") return { ok: false, error: "Permission to write denied" };
    }
    const sub = await handle.getDirectoryHandle(subfolder, { create: true });
    const fileHandle = await sub.getFileHandle(uniqueName(file.name), { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function uniqueName(name: string): string {
  // Append short timestamp to avoid clobbering existing files in the picked folder
  const dot = name.lastIndexOf(".");
  const stamp = Date.now().toString(36);
  if (dot <= 0) return `${name}-${stamp}`;
  return `${name.slice(0, dot)}-${stamp}${name.slice(dot)}`;
}

export async function clearCustomFolder() {
  await deleteDirHandle();
}
