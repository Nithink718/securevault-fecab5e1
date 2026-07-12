import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "securevault";
const BLOBS = "blobs";
const HANDLES = "handles";

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB only available in browser"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 2, {
      upgrade(d, oldVersion) {
        if (!d.objectStoreNames.contains(BLOBS)) d.createObjectStore(BLOBS);
        if (oldVersion < 2 && !d.objectStoreNames.contains(HANDLES)) {
          d.createObjectStore(HANDLES);
        }
      },
    });
  }
  return dbPromise;
}

export async function putBlob(id: string, blob: Blob) {
  const d = await db();
  await d.put(BLOBS, blob, id);
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  const d = await db();
  return d.get(BLOBS, id);
}

export async function deleteBlob(id: string) {
  const d = await db();
  await d.delete(BLOBS, id);
}

// Directory handle storage (File System Access API)
export async function putDirHandle(handle: unknown) {
  const d = await db();
  await d.put(HANDLES, handle, "dirHandle");
}

export async function getDirHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  const d = await db();
  return d.get(HANDLES, "dirHandle") as Promise<FileSystemDirectoryHandle | undefined>;
}

export async function deleteDirHandle() {
  const d = await db();
  await d.delete(HANDLES, "dirHandle");
}
