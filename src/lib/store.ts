import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Category, FileMeta, Folder, Note, Profile, StorageConfig, StorageType } from "./types";
import { deleteBlob, deleteDirHandle } from "./idb";

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
  folders: Folder[];
  notes: Note[];
  categories: Category[];
  theme: "light" | "dark";
  lockPasswordHash: string | null;
  storageConfig: StorageConfig | null;
  /** Session-only ids that have been unlocked. NOT persisted. */
  unlockedIds: Record<string, true>;

  createProfile: (data: {
    username: string;
    pin: string;
    questions: { question: string; answer: string }[];
  }) => Promise<void>;
  updateUsername: (username: string) => void;
  resetVault: () => Promise<void>;

  setStorageConfig: (
    type: StorageType,
    pathLabel: string,
    hasDirHandle: boolean,
  ) => void;
  clearStorageConfig: () => Promise<void>;

  addCategory: (name: string, type: "file" | "note") => void;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;

  addFile: (
    f: Omit<
      FileMeta,
      "id" | "userId" | "uploadDate" | "favorite" | "hidden" | "locked" | "pinned"
    > &
      Partial<Pick<FileMeta, "favorite" | "hidden" | "locked" | "pinned" | "folderId">>,
  ) => string;
  updateFile: (id: string, patch: Partial<FileMeta>) => void;
  deleteFile: (id: string) => Promise<void>;
  touchFile: (id: string) => void;

  // folders
  addFolder: (name: string, parentId: string | null) => { ok: true; id: string } | { ok: false; error: string };
  updateFolder: (id: string, patch: Partial<Folder>) => void;
  moveFolder: (id: string, newParentId: string | null) => { ok: true } | { ok: false; error: string };
  deleteFolder: (id: string) => Promise<void>;

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
      folders: [],
      notes: [],
      categories: [],
      theme: "light",
      lockPasswordHash: null,
      storageConfig: null,
      unlockedIds: {},

      createProfile: async ({ username, pin, questions }) => {
        const name = username.trim();
        if (!name) return;
        const pinHash = pin ? await sha256(pin) : undefined;
        const securityQuestions = await Promise.all(
          questions.map(async (q) => ({
            question: q.question.trim(),
            answerHash: await sha256(q.answer.trim().toLowerCase()),
          })),
        );
        const profile: Profile = {
          id: PROFILE_ID,
          username: name,
          createdAt: Date.now(),
          pinHash,
          securityQuestions,
        };
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
        await deleteDirHandle().catch(() => {});
        set({
          profile: null,
          currentUserId: null,
          files: [],
          folders: [],
          notes: [],
          categories: [],
          lockPasswordHash: null,
          storageConfig: null,
          unlockedIds: {},
        });
      },

      setStorageConfig: (type, pathLabel, hasDirHandle) => {
        set({
          storageConfig: {
            type,
            pathLabel,
            hasDirHandle,
            setupDate: Date.now(),
          },
        });
      },

      clearStorageConfig: async () => {
        await deleteDirHandle().catch(() => {});
        set({ storageConfig: null });
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
          folderId: f.folderId ?? null,
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

      addFolder: (name, parentId) => {
        const userId = get().currentUserId ?? PROFILE_ID;
        const trimmed = name.trim();
        if (!trimmed) return { ok: false, error: "Folder name is required" };
        const dup = get().folders.some(
          (fo) =>
            fo.userId === userId &&
            (fo.parentId ?? null) === (parentId ?? null) &&
            fo.name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (dup) return { ok: false, error: "A folder with that name already exists here" };
        const now = Date.now();
        const folder: Folder = {
          id: uid(),
          userId,
          name: trimmed,
          parentId: parentId ?? null,
          favorite: false,
          hidden: false,
          locked: false,
          pinned: false,
          createdDate: now,
          modifiedDate: now,
        };
        set((s) => ({ folders: [...s.folders, folder] }));
        return { ok: true, id: folder.id };
      },
      updateFolder: (id, patch) =>
        set((s) => ({
          folders: s.folders.map((fo) =>
            fo.id === id ? { ...fo, ...patch, modifiedDate: Date.now() } : fo,
          ),
        })),
      moveFolder: (id, newParentId) => {
        const state = get();
        const folder = state.folders.find((fo) => fo.id === id);
        if (!folder) return { ok: false, error: "Folder not found" };
        if (id === newParentId) return { ok: false, error: "Can't move a folder into itself" };
        // prevent moving into own descendant
        let cur: string | null = newParentId;
        while (cur) {
          if (cur === id) return { ok: false, error: "Can't move a folder into its own subfolder" };
          const parent: Folder | undefined = state.folders.find((fo) => fo.id === cur);
          cur = parent?.parentId ?? null;
        }
        const dup = state.folders.some(
          (fo) =>
            fo.userId === folder.userId &&
            fo.id !== id &&
            (fo.parentId ?? null) === (newParentId ?? null) &&
            fo.name.toLowerCase() === folder.name.toLowerCase(),
        );
        if (dup) return { ok: false, error: "A folder with that name already exists there" };
        set((s) => ({
          folders: s.folders.map((fo) =>
            fo.id === id ? { ...fo, parentId: newParentId, modifiedDate: Date.now() } : fo,
          ),
        }));
        return { ok: true };
      },
      deleteFolder: async (id) => {
        // gather this folder + all descendants
        const all = get().folders;
        const descendants = new Set<string>([id]);
        let added = true;
        while (added) {
          added = false;
          for (const fo of all) {
            if (fo.parentId && descendants.has(fo.parentId) && !descendants.has(fo.id)) {
              descendants.add(fo.id);
              added = true;
            }
          }
        }
        const doomedFiles = get().files.filter((f) => f.folderId && descendants.has(f.folderId));
        await Promise.all(doomedFiles.map((f) => deleteBlob(f.id).catch(() => {})));
        set((s) => ({
          folders: s.folders.filter((fo) => !descendants.has(fo.id)),
          files: s.files.filter((f) => !(f.folderId && descendants.has(f.folderId))),
        }));
      },

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
        storageConfig: s.storageConfig,
      }),
    },
  ),
);

export function useCurrentUser() {
  return useVault((s) => s.profile);
}

