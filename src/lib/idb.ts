import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "securevault";
const STORE = "blobs";

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB only available in browser"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

export async function putBlob(id: string, blob: Blob) {
  const d = await db();
  await d.put(STORE, blob, id);
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  const d = await db();
  return d.get(STORE, id);
}

export async function deleteBlob(id: string) {
  const d = await db();
  await d.delete(STORE, id);
}
