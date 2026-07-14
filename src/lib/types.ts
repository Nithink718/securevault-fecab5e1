export type FileKind =
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "text"
  | "other";

export interface Profile {
  id: string;
  username: string;
  createdAt: number;
  pinHash?: string;
  securityQuestions?: { question: string; answerHash: string }[];
}

export type StorageType = "default" | "custom";

export interface StorageConfig {
  type: StorageType;
  /** Human-readable label — e.g. "SecureVault (on this device)" or the folder name */
  pathLabel: string;
  /** Whether a File System Access API directory handle is stored in IDB under key "dirHandle" */
  hasDirHandle: boolean;
  setupDate: number;
}

export interface FileMeta {
  id: string;
  userId: string;
  fileName: string;
  category: string;
  size: number;
  mime: string;
  kind: FileKind;
  favorite: boolean;
  hidden: boolean;
  locked: boolean;
  pinned: boolean;
  uploadDate: number;
  modifiedDate?: number;
  lastOpened?: number;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  color: string;
  pinned: boolean;
  favorite: boolean;
  locked: boolean;
  hidden: boolean;
  createdDate: number;
  updatedDate: number;
  lastOpened?: number;
  /** Filename of the mirrored .txt copy in the user's custom Notes folder, if any. */
  storageFileName?: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: "file" | "note";
  builtIn?: boolean;
}
