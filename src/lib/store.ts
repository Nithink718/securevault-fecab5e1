import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Category, FileMeta, Note, Profile } from "./types";
import { deleteBlob } from "./idb";

const DEFAULT_FILE_CATS = [
  "Documents",
  "Images",
  "Videos",
  "Audio",
  "PDF",
  "Word",
  "Excel",
  "Archives",
];
const DEFAULT_NOTE_CATS = [
  "Personal",
  "Bank",
  "Passwords",
  "Education",
  "Ideas",
  "Work",
  "Shopping",
  "Medical",
  "Travel",
];

const PROFILE_ID = "local";

function uid() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface VaultState {
  profile: Profile | null;
  currentUserId: string | null;
  files: FileMeta[];
  notes: Note[];
  categories: Category[];
  theme: "light" | "dark";
  lockPasswordHash: string | null;
  /** Session-only ids that have been unlocked. NOT persisted. */
  unlockedIds: Record<string, true>;

  createProfile: (username: string) => void;
  updateUsername: (username: string) => void;
  resetVault: () => Promise<void>;

  addCategory: (name: string, type: "file" | "note") => void;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;

  addFile: (
    f: Omit<
      FileMeta,
      "id" | "userId" | "uploadDate" | "favorite" | "hidden" | "locked" | "pinned"
    > &
      Partial<Pick<FileMeta, "favorite" | "hidden" | "locked" | "pinned">>,
  ) => string;
  updateFile: (id: string, patch: Partial<FileMeta>) => void;
  deleteFile: (id: string) => Promise<void>;
  touchFile: (id: string) => void;

  addNote: (n: Partial<Note>) => string;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  touchNote: (id: string) => void;

  // lock
  hasLockPassword: () => boolean;
  setLockPassword: (pwd: string) => Promise<void>;
  changeLockPassword: (oldPwd: string, newPwd: string) => Promise<boolean>;
  removeLockPassword: (pwd: string) => Promise<boolean>;
  verifyPassword: (pwd: string) => Promise<boolean>;
  markUnlocked: (id: string) => void;
  isUnlocked: (id: string) => boolean;
  lockAll: () => void;

  // settings
  setTheme: (t: "light" | "dark") => void;
  exportData: () => string;
  importData: (json: string) => { ok: true } | { ok: false; error: string };
}

function seedCategories(userId: string): Category[] {
  return [
    ...DEFAULT_FILE_CATS.map((n) => ({
      id: uid(),
      userId,
      name: n,
      type: "file" as const,
      builtIn: true,
    })),
    ...DEFAULT_NOTE_CATS.map((n) => ({
      id: uid(),
      userId,
      name: n,
      type: "note" as const,
      builtIn: true,
    })),
  ];
}

export const useVault = create<VaultState>()(
  persist(
    (set, get) => ({
      profile: null,
      currentUserId: null,
      files: [],
      notes: [],
      categories: [],
      theme: "light",
      lockPasswordHash: null,
      unlockedIds: {},

      createProfile: (username) => {
        const name = username.trim();
        if (!name) return;
        const profile: Profile = { id: PROFILE_ID, username: name, createdAt: Date.now() };
        const cats = get().categories.length === 0 ? seedCategories(PROFILE_ID) : get().categories;
        set({ profile, currentUserId: PROFILE_ID, categories: cats });
      },

      updateUsername: (username) => {
        const name = username.trim();
        if (!name) return;
        const p = get().profile;
        if (!p) return;
        set({ profile: { ...p, username: name } });
      },

      resetVault: async () => {
        const ids = get().files.map((f) => f.id);
        await Promise.all(ids.map((id) => deleteBlob(id).catch(() => {})));
        set({
          profile: null,
          currentUserId: null,
          files: [],
          notes: [],
          categories: [],
          lockPasswordHash: null,
          unlockedIds: {},
        });
      },

      addCategory: (name, type) => {
        const id = get().currentUserId;
        if (!id || !name.trim()) return;
        set((s) => ({
          categories: [
            ...s.categories,
            { id: uid(), userId: id, name: name.trim(), type, builtIn: false },
          ],
        }));
      },
      renameCategory: (id, name) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)) })),
      deleteCategory: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

      addFile: (f) => {
        const userId = get().currentUserId ?? PROFILE_ID;
        const id = uid();
        const now = Date.now();
        const meta: FileMeta = {
          id,
          userId,
          fileName: f.fileName,
          category: f.category,
          size: f.size,
          mime: f.mime,
          kind: f.kind,
          favorite: f.favorite ?? false,
          hidden: f.hidden ?? false,
          locked: f.locked ?? false,
          pinned: f.pinned ?? false,
          uploadDate: now,
          modifiedDate: now,
        };
        set((s) => ({ files: [...s.files, meta] }));
        return id;
      },
      updateFile: (id, patch) =>
        set((s) => ({
          files: s.files.map((f) =>
            f.id === id ? { ...f, ...patch, modifiedDate: Date.now() } : f,
          ),
        })),
      deleteFile: async (id) => {
        await deleteBlob(id).catch(() => {});
        set((s) => ({ files: s.files.filter((f) => f.id !== id) }));
      },
      touchFile: (id) =>
        set((s) => ({
          files: s.files.map((f) => (f.id === id ? { ...f, lastOpened: Date.now() } : f)),
        })),

      addNote: (n) => {
        const userId = get().currentUserId ?? PROFILE_ID;
        const id = uid();
        const note: Note = {
          id,
          userId,
          title: n.title || "Untitled",
          content: n.content || "",
          category: n.category || "Personal",
          color: n.color || "#2563EB",
          pinned: n.pinned ?? false,
          favorite: n.favorite ?? false,
          locked: n.locked ?? false,
          hidden: n.hidden ?? false,
          createdDate: Date.now(),
          updatedDate: Date.now(),
        };
        set((s) => ({ notes: [...s.notes, note] }));
        return id;
      },
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedDate: Date.now() } : n,
          ),
        })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      touchNote: (id) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, lastOpened: Date.now() } : n)),
        })),

      hasLockPassword: () => !!get().lockPasswordHash,
      setLockPassword: async (pwd) => {
        const hash = await sha256(pwd);
        set({ lockPasswordHash: hash });
      },
      changeLockPassword: async (oldPwd, newPwd) => {
        const ok = await get().verifyPassword(oldPwd);
        if (!ok) return false;
        const hash = await sha256(newPwd);
        set({ lockPasswordHash: hash, unlockedIds: {} });
        return true;
      },
      removeLockPassword: async (pwd) => {
        const ok = await get().verifyPassword(pwd);
        if (!ok) return false;
        // unlock everything since password is gone
        set((s) => ({
          lockPasswordHash: null,
          unlockedIds: {},
          files: s.files.map((f) => ({ ...f, locked: false })),
          notes: s.notes.map((n) => ({ ...n, locked: false })),
        }));
        return true;
      },
      verifyPassword: async (pwd) => {
        const h = get().lockPasswordHash;
        if (!h) return false;
        return (await sha256(pwd)) === h;
      },
      markUnlocked: (id) =>
        set((s) => ({ unlockedIds: { ...s.unlockedIds, [id]: true } })),
      isUnlocked: (id) => !!get().unlockedIds[id],
      lockAll: () => set({ unlockedIds: {} }),

      setTheme: (t) => {
        set({ theme: t });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", t === "dark");
        }
      },

      exportData: () => {
        const { profile, files, notes, categories } = get();
        return JSON.stringify(
          { profile, files, notes, categories, exportedAt: Date.now() },
          null,
          2,
        );
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json);
          const userId = get().currentUserId ?? PROFILE_ID;
          const newCats: Category[] = (data.categories || []).map((c: Category) => ({
            ...c,
            id: uid(),
            userId,
          }));
          const newNotes: Note[] = (data.notes || []).map((n: Note) => ({
            ...n,
            id: uid(),
            userId,
          }));
          const newFiles: FileMeta[] = (data.files || []).map((f: FileMeta) => ({
            ...f,
            id: uid(),
            userId,
            pinned: f.pinned ?? false,
          }));
          set((s) => ({
            categories: [...s.categories, ...newCats],
            notes: [...s.notes, ...newNotes],
            files: [...s.files, ...newFiles],
          }));
          return { ok: true };
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      },
    }),
    {
      name: "securevault-store-v2",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => {}, removeItem: () => {} }
          : localStorage,
      ),
      partialize: (s) => ({
        profile: s.profile,
        currentUserId: s.currentUserId,
        files: s.files,
        notes: s.notes,
        categories: s.categories,
        theme: s.theme,
        lockPasswordHash: s.lockPasswordHash,
      }),
    },
  ),
);

export function useCurrentUser() {
  return useVault((s) => s.profile);
}

export function estimateNotesSize(notes: Note[]): number {
  let total = 0;
  for (const n of notes) {
    total += (n.title?.length ?? 0) + (n.content?.length ?? 0) + (n.category?.length ?? 0) + 100;
  }
  return total;
}
