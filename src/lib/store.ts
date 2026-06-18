import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Category, FileMeta, Note, User } from "./types";
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

function uid() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

// Simple non-cryptographic hash for demo auth (local-only MVP)
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return `h${h}`;
}

interface VaultState {
  users: User[];
  currentUserId: string | null;
  files: FileMeta[];
  notes: Note[];
  categories: Category[];
  theme: "light" | "dark";

  // auth
  signup: (u: { username: string; email: string; password: string }) => { ok: true } | { ok: false; error: string };
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  resetPassword: (email: string, newPassword: string) => { ok: true } | { ok: false; error: string };
  updateProfile: (patch: Partial<Pick<User, "username" | "email">>) => void;

  // categories
  addCategory: (name: string, type: "file" | "note") => void;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;

  // files
  addFile: (f: Omit<FileMeta, "id" | "userId" | "uploadDate" | "favorite" | "hidden" | "locked"> & Partial<Pick<FileMeta, "favorite" | "hidden" | "locked">>) => string;
  updateFile: (id: string, patch: Partial<FileMeta>) => void;
  deleteFile: (id: string) => Promise<void>;
  touchFile: (id: string) => void;

  // notes
  addNote: (n: Partial<Note>) => string;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  touchNote: (id: string) => void;

  // settings
  setTheme: (t: "light" | "dark") => void;
  exportData: () => string;
  importData: (json: string) => { ok: true } | { ok: false; error: string };
  wipeUserData: () => void;
}

export const useVault = create<VaultState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,
      files: [],
      notes: [],
      categories: [],
      theme: "light",

      signup: ({ username, email, password }) => {
        const e = email.trim().toLowerCase();
        if (get().users.find((u) => u.email.toLowerCase() === e))
          return { ok: false, error: "Email already registered" };
        const user: User = {
          id: uid(),
          username: username.trim(),
          email: e,
          passwordHash: hash(password),
          createdAt: Date.now(),
        };
        const baseCats: Category[] = [
          ...DEFAULT_FILE_CATS.map((n) => ({ id: uid(), userId: user.id, name: n, type: "file" as const, builtIn: true })),
          ...DEFAULT_NOTE_CATS.map((n) => ({ id: uid(), userId: user.id, name: n, type: "note" as const, builtIn: true })),
        ];
        set((s) => ({
          users: [...s.users, user],
          currentUserId: user.id,
          categories: [...s.categories, ...baseCats],
        }));
        return { ok: true };
      },

      login: (email, password) => {
        const e = email.trim().toLowerCase();
        const u = get().users.find((u) => u.email.toLowerCase() === e);
        if (!u || u.passwordHash !== hash(password)) return { ok: false, error: "Invalid email or password" };
        set({ currentUserId: u.id });
        return { ok: true };
      },

      logout: () => set({ currentUserId: null }),

      resetPassword: (email, newPassword) => {
        const e = email.trim().toLowerCase();
        const u = get().users.find((u) => u.email.toLowerCase() === e);
        if (!u) return { ok: false, error: "No account found for this email" };
        set((s) => ({
          users: s.users.map((x) => (x.id === u.id ? { ...x, passwordHash: hash(newPassword) } : x)),
        }));
        return { ok: true };
      },

      updateProfile: (patch) => {
        const id = get().currentUserId;
        if (!id) return;
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));
      },

      addCategory: (name, type) => {
        const id = get().currentUserId;
        if (!id || !name.trim()) return;
        set((s) => ({
          categories: [...s.categories, { id: uid(), userId: id, name: name.trim(), type }],
        }));
      },
      renameCategory: (id, name) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)) })),
      deleteCategory: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

      addFile: (f) => {
        const userId = get().currentUserId!;
        const id = uid();
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
          uploadDate: Date.now(),
        };
        set((s) => ({ files: [...s.files, meta] }));
        return id;
      },
      updateFile: (id, patch) =>
        set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
      deleteFile: async (id) => {
        await deleteBlob(id).catch(() => {});
        set((s) => ({ files: s.files.filter((f) => f.id !== id) }));
      },
      touchFile: (id) =>
        set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, lastOpened: Date.now() } : f)) })),

      addNote: (n) => {
        const userId = get().currentUserId!;
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
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedDate: Date.now() } : n)),
        })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      touchNote: (id) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, lastOpened: Date.now() } : n)) })),

      setTheme: (t) => {
        set({ theme: t });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", t === "dark");
        }
      },

      exportData: () => {
        const { users, files, notes, categories } = get();
        const userId = get().currentUserId;
        return JSON.stringify(
          {
            user: users.find((u) => u.id === userId),
            files: files.filter((f) => f.userId === userId),
            notes: notes.filter((n) => n.userId === userId),
            categories: categories.filter((c) => c.userId === userId),
            exportedAt: Date.now(),
          },
          null,
          2,
        );
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json);
          const userId = get().currentUserId;
          if (!userId) return { ok: false, error: "Not logged in" };
          const mapId = new Map<string, string>();
          const newCats: Category[] = (data.categories || []).map((c: Category) => {
            const n = { ...c, id: uid(), userId };
            mapId.set(c.id, n.id);
            return n;
          });
          const newNotes: Note[] = (data.notes || []).map((n: Note) => ({ ...n, id: uid(), userId }));
          // files import metadata only (blobs cannot move between devices via JSON)
          const newFiles: FileMeta[] = (data.files || []).map((f: FileMeta) => ({ ...f, id: uid(), userId }));
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

      wipeUserData: () => {
        const id = get().currentUserId;
        if (!id) return;
        const fileIds = get().files.filter((f) => f.userId === id).map((f) => f.id);
        fileIds.forEach((fid) => deleteBlob(fid).catch(() => {}));
        set((s) => ({
          files: s.files.filter((f) => f.userId !== id),
          notes: s.notes.filter((n) => n.userId !== id),
          categories: s.categories.filter((c) => c.userId !== id),
        }));
      },
    }),
    {
      name: "securevault-store",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => {}, removeItem: () => {} }
          : localStorage,
      ),
      partialize: (s) => ({
        users: s.users,
        currentUserId: s.currentUserId,
        files: s.files,
        notes: s.notes,
        categories: s.categories,
        theme: s.theme,
      }),
    },
  ),
);

export function useCurrentUser() {
  return useVault((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
}
