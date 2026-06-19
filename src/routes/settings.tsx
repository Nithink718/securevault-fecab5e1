import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Moon, Sun, Download, Upload, Trash2, ShieldCheck, Info } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser, useVault } from "@/lib/store";
import { formatSize } from "@/lib/file-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — SecureVault" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const currentUserId = useVault((s) => s.currentUserId);
  const theme = useVault((s) => s.theme);
  const setTheme = useVault((s) => s.setTheme);
  const allFiles = useVault((s) => s.files);
  const exportData = useVault((s) => s.exportData);
  const importData = useVault((s) => s.importData);
  const wipeUserData = useVault((s) => s.wipeUserData);
  const updateProfile = useVault((s) => s.updateProfile);
  const logout = useVault((s) => s.logout);
  const files = useMemo(
    () => allFiles.filter((f) => f.userId === currentUserId),
    [allFiles, currentUserId],
  );

  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalSize = files.reduce((s, f) => s + f.size, 0);

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

  return (
    <AppShell>
      <PageHeader title="Settings" subtitle="Manage your profile, appearance, and vault data." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Profile" description="Visible only on this device.">
          <div className="space-y-1.5">
            <Label htmlFor="u">Username</Label>
            <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e">Email</Label>
            <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button
            onClick={() => {
              updateProfile({ username: username.trim(), email: email.trim().toLowerCase() });
              toast.success("Profile updated");
            }}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            Save changes
          </Button>
        </Section>

        <Section title="Appearance" description="Switch between light and dark.">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
              <span className="text-sm font-medium">{theme === "dark" ? "Dark mode" : "Light mode"}</span>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
          </div>
        </Section>

        <Section title="Storage" description="Local device usage.">
          <div className="rounded-lg bg-secondary/50 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total used</p>
            <p className="mt-1 text-2xl font-semibold">{formatSize(totalSize)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{files.length} files in your vault</p>
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
            <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImport} />
            <p className="text-[11px] text-muted-foreground">
              Files themselves remain on the originating device. Export covers categories, notes, and file metadata.
            </p>
          </div>
        </Section>

        <Section title="Privacy" description="Your vault never leaves this device.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
              No cloud sync, analytics, or telemetry. Everything stays in your browser.
            </p>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Delete ALL files and notes for this account? This cannot be undone.")) {
                  wipeUserData();
                  toast.success("Vault contents wiped");
                }
              }}
            >
              <Trash2 className="size-4" /> Wipe vault contents
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                logout();
                router.navigate({ to: "/auth", replace: true });
              }}
            >
              Sign out
            </Button>
          </div>
        </Section>

        <Section title="About" description="">
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Info className="size-4" /> SecureVault v1.0
            </p>
            <p className="text-xs text-muted-foreground">
              A local-first personal document and notes manager. Built for privacy — your data lives on your
              device, encrypted by the browser&apos;s native storage.
            </p>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-black/5 shadow-soft dark:ring-white/5">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
