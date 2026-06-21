import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Moon,
  Sun,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  Info,
  UserRound,
  KeyRound,
  Lock,
  FileText,
  StickyNote,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { estimateNotesSize, useCurrentUser, useVault } from "@/lib/store";
import { formatSize } from "@/lib/file-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — SecureVault" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const theme = useVault((s) => s.theme);
  const setTheme = useVault((s) => s.setTheme);
  const allFiles = useVault((s) => s.files);
  const allNotes = useVault((s) => s.notes);
  const exportData = useVault((s) => s.exportData);
  const importData = useVault((s) => s.importData);
  const resetVault = useVault((s) => s.resetVault);
  const updateUsername = useVault((s) => s.updateUsername);

  const hasLockPassword = useVault((s) => s.hasLockPassword);
  const setLockPassword = useVault((s) => s.setLockPassword);
  const changeLockPassword = useVault((s) => s.changeLockPassword);
  const removeLockPassword = useVault((s) => s.removeLockPassword);
  const lockAll = useVault((s) => s.lockAll);

  const filesSize = useMemo(() => allFiles.reduce((s, f) => s + f.size, 0), [allFiles]);
  const notesSize = useMemo(() => estimateNotesSize(allNotes), [allNotes]);
  const totalSize = filesSize + notesSize;
  const pctFiles = totalSize > 0 ? Math.round((filesSize / totalSize) * 100) : 0;
  const pctNotes = 100 - pctFiles;

  const [username, setUsername] = useState(user?.username ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lock password fields
  const has = hasLockPassword();
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  function handleExport() {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `securevault-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Vault metadata exported");
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const r = importData(text);
    if (!r.ok) return toast.error(r.error);
    toast.success("Vault data imported");
    e.target.value = "";
  }

  async function handleReset() {
    await resetVault();
    toast.success("Vault reset");
    router.navigate({ to: "/", replace: true });
  }

  async function handleSavePassword() {
    if (!newPwd || newPwd.length < 4) return toast.error("Password must be at least 4 characters");
    if (newPwd !== confirmPwd) return toast.error("Passwords don't match");
    if (has) {
      const ok = await changeLockPassword(oldPwd, newPwd);
      if (!ok) return toast.error("Current password is incorrect");
      toast.success("Password updated");
    } else {
      await setLockPassword(newPwd);
      toast.success("Lock password created");
    }
    setOldPwd("");
    setNewPwd("");
    setConfirmPwd("");
  }

  async function handleRemovePassword() {
    if (!oldPwd) return toast.error("Enter your current password");
    const ok = await removeLockPassword(oldPwd);
    if (!ok) return toast.error("Incorrect password");
    setOldPwd("");
    toast.success("Lock password removed. Items have been unlocked.");
  }

  return (
    <AppShell>
      <PageHeader title="Settings" subtitle="Manage your profile, appearance, and vault data." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Profile" description="Visible only on this device.">
          <div className="space-y-1.5">
            <Label htmlFor="u">Your name</Label>
            <Input
              id="u"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={60}
            />
          </div>
          <Button
            onClick={() => {
              if (!username.trim()) return toast.error("Name cannot be empty");
              updateUsername(username);
              toast.success("Name updated");
            }}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <UserRound className="size-4" /> Save name
          </Button>
        </Section>

        <Section title="Appearance" description="Switch between light and dark.">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
              <span className="text-sm font-medium">
                {theme === "dark" ? "Dark mode" : "Light mode"}
              </span>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
            />
          </div>
        </Section>

        <Section title="Storage" description="Local device usage.">
          <div className="rounded-lg bg-secondary/50 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total used</p>
            <p className="mt-1 text-2xl font-semibold">{formatSize(totalSize)}</p>
            <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full bg-brand" style={{ width: `${pctFiles}%` }} />
              <div className="h-full bg-violet-500" style={{ width: `${pctNotes}%` }} />
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-brand" />
                  <FileText className="size-3" /> Files ({allFiles.length})
                </span>
                <span className="font-medium">{formatSize(filesSize)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-violet-500" />
                  <StickyNote className="size-3" /> Notes ({allNotes.length})
                </span>
                <span className="font-medium">{formatSize(notesSize)}</span>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Lock password"
          description="Used to lock and unlock individual files and notes."
        >
          <div className="space-y-3">
            {has && (
              <div className="space-y-1.5">
                <Label htmlFor="oldpwd">Current password</Label>
                <Input
                  id="oldpwd"
                  type="password"
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="newpwd">{has ? "New password" : "Create password"}</Label>
              <Input
                id="newpwd"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpwd">Confirm password</Label>
              <Input
                id="cpwd"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSavePassword}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                <KeyRound className="size-4" /> {has ? "Update password" : "Create password"}
              </Button>
              {has && (
                <>
                  <Button variant="outline" onClick={() => lockAll()}>
                    <Lock className="size-4" /> Lock all now
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={handleRemovePassword}
                  >
                    Remove password
                  </Button>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              The same password protects both files and notes. It never leaves this device.
            </p>
          </div>
        </Section>

        <Section title="Backup" description="Export or import your vault metadata.">
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="size-4" /> Export data
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" /> Import data
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={handleImport}
            />
            <p className="text-[11px] text-muted-foreground">
              Files themselves remain on the originating device. Export covers categories, notes,
              and file metadata.
            </p>
          </div>
        </Section>

        <Section title="Reset" description="Erase everything on this device.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
              Your vault never leaves this device. No analytics or telemetry.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" /> Reset Vault
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset your vault?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes your profile, files, notes, and categories from this
                    device. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, reset vault
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Section>

        <Section title="About" description="">
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Info className="size-4" /> SecureVault v1.0
            </p>
            <p className="text-xs text-muted-foreground">
              A local-first personal document and notes manager. Built for privacy — your data
              lives on your device, in your browser&apos;s native storage. No accounts, no cloud,
              no tracking.
            </p>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-black/5 shadow-soft dark:ring-white/5">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
