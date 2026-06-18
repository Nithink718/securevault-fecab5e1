import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  FileType,
  Presentation,
  File as FileIcon,
} from "lucide-react";
import type { FileKind } from "@/lib/types";

const map: Record<FileKind, { Icon: typeof FileText; cls: string }> = {
  pdf: { Icon: FileText, cls: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" },
  word: { Icon: FileType, cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
  excel: { Icon: FileSpreadsheet, cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  powerpoint: { Icon: Presentation, cls: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400" },
  image: { Icon: FileImage, cls: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" },
  video: { Icon: FileVideo, cls: "bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400" },
  audio: { Icon: FileAudio, cls: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  archive: { Icon: FileArchive, cls: "bg-stone-100 text-stone-700 dark:bg-stone-500/10 dark:text-stone-300" },
  text: { Icon: FileText, cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300" },
  other: { Icon: FileIcon, cls: "bg-neutral-100 text-neutral-600 dark:bg-neutral-500/10 dark:text-neutral-300" },
};

export function FileTypeIcon({ kind, className = "size-12 rounded-lg" }: { kind: FileKind; className?: string }) {
  const { Icon, cls } = map[kind] ?? map.other;
  return (
    <div className={`flex items-center justify-center ${cls} ${className}`}>
      <Icon className="size-6" strokeWidth={1.6} />
    </div>
  );
}
