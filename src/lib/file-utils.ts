import type { FileKind } from "./types";

export function detectKind(mime: string, name: string): FileKind {
  const n = name.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".doc") || n.endsWith(".docx")) return "word";
  if (n.endsWith(".xls") || n.endsWith(".xlsx") || n.endsWith(".csv")) return "excel";
  if (n.endsWith(".ppt") || n.endsWith(".pptx")) return "powerpoint";
  if (n.endsWith(".zip") || n.endsWith(".rar") || n.endsWith(".7z") || n.endsWith(".tar") || n.endsWith(".gz"))
    return "archive";
  if (n.endsWith(".txt") || n.endsWith(".md") || mime.startsWith("text/")) return "text";
  return "other";
}

export function defaultCategoryForKind(kind: FileKind): string {
  switch (kind) {
    case "pdf":
      return "PDF";
    case "word":
      return "Word";
    case "excel":
      return "Excel";
    case "powerpoint":
      return "Documents";
    case "image":
      return "Images";
    case "video":
      return "Videos";
    case "audio":
      return "Audio";
    case "archive":
      return "Archives";
    default:
      return "Documents";
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
