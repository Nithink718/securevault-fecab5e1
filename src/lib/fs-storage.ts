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

export function isFilePickerSupported(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

/**
 * Pick files via the File System Access API so we get back handles that can be
 * used to delete the originals (needed for a real "move" operation).
 */
export async function pickFilesWithHandles(): Promise<
  Array<{ file: File; handle: FileSystemFileHandle }>
> {
  if (!isFilePickerSupported()) throw new Error("File picker not supported");
  if (isInCrossOriginIframe()) {
    const err = new Error("File picker is blocked inside this preview frame.");
    err.name = "IframeBlockedError";
    throw err;
  }
  // @ts-expect-error - showOpenFilePicker is not in stock lib.dom types
  const handles: FileSystemFileHandle[] = await window.showOpenFilePicker({
    multiple: true,
    excludeAcceptAllOption: false,
  });
  const out: Array<{ file: File; handle: FileSystemFileHandle }> = [];
  for (const h of handles) {
    const file = await h.getFile();
    out.push({ file, handle: h });
  }
  return out;
}

/** Try to delete an original file via its handle. Returns true on success. */
export async function removeOriginal(handle: FileSystemFileHandle): Promise<boolean> {
  try {
    const h = handle as unknown as {
      queryPermission?: (o: { mode: "readwrite" }) => Promise<PermissionState>;
      requestPermission?: (o: { mode: "readwrite" }) => Promise<PermissionState>;
      remove?: () => Promise<void>;
    };
    if (h.queryPermission) {
      let perm = await h.queryPermission({ mode: "readwrite" });
      if (perm !== "granted" && h.requestPermission) {
        perm = await h.requestPermission({ mode: "readwrite" });
      }
      if (perm !== "granted") return false;
    }
    if (typeof h.remove !== "function") return false;
    await h.remove();
    return true;
  } catch {
    return false;
  }
}

export function isInCrossOriginIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function pickCustomFolder(): Promise<FileSystemDirectoryHandle> {
  if (!isFsaSupported()) {
    throw new Error("Your browser doesn't support choosing a folder. Try Chrome, Edge, or Opera on desktop.");
  }
  if (isInCrossOriginIframe()) {
    const err = new Error(
      "Folder picking is blocked inside this preview frame. Open SecureVault in its own browser tab and try again.",
    );
    err.name = "IframeBlockedError";
    throw err;
  }
  try {
    // @ts-expect-error - showDirectoryPicker is not in stock lib.dom types
    const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
      id: "securevault-root",
      mode: "readwrite",
      startIn: "documents",
    });
    // Ensure we actually have read/write permission before persisting
    const h = handle as unknown as {
      queryPermission: (o: { mode: "readwrite" }) => Promise<PermissionState>;
      requestPermission: (o: { mode: "readwrite" }) => Promise<PermissionState>;
    };
    let perm = await h.queryPermission({ mode: "readwrite" });
    if (perm !== "granted") perm = await h.requestPermission({ mode: "readwrite" });
    if (perm !== "granted") throw new Error("Permission to write to that folder was denied.");
    await ensureSubfolders(handle);
    await putDirHandle(handle);
    return handle;
  } catch (e) {
    const err = e as DOMException & { name: string; message: string };
    if (err.name === "AbortError") throw err; // user cancelled
    if (err.name === "SecurityError") {
      const wrap = new Error(
        "Your browser blocked the folder picker (usually because the app is inside an embedded frame). Open SecureVault in its own tab and try again.",
      );
      wrap.name = "IframeBlockedError";
      throw wrap;
    }
    throw err;
  }
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
