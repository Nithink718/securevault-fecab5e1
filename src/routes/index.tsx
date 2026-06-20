import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, ArrowRight, Sparkles } from "lucide-react";
import { useVault } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SecureVault — Personal Document & Notes Manager" },
      {
        name: "description",
        content: "Securely organize files and personal notes on your device.",
      },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const router = useRouter();
  const profile = useVault((s) => s.profile);
  const createProfile = useVault((s) => s.createProfile);
  const [name, setName] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 1) {
      toast.error("Please enter your name");
      return;
    }
    createProfile(name);
    toast.success("Your vault is ready");
    router.navigate({ to: "/dashboard" });
  }

  function enterVault() {
    router.navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-brand to-accent p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Shield className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">SecureVault</span>
        </div>
        <div className="max-w-md space-y-6">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-balance">
            Your personal vault for files and notes.
          </h2>
          <p className="text-white/80 text-pretty">
            Everything stays on your device. Organize documents, lock sensitive notes, and find
            anything in seconds.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4 text-sm">
            {[
              ["Local-first", "Stored on device"],
              ["Lockable", "Sensitive items"],
              ["Searchable", "Across vault"],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg bg-white/10 p-3 backdrop-blur">
                <p className="font-semibold">{t}</p>
                <p className="text-white/70 text-[11px] mt-1">{d}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-white/60">© SecureVault — Personal Document &amp; Notes Manager</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
              <Shield className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">SecureVault</span>
          </div>

          {profile ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                <Sparkles className="size-3" /> Your vault is ready
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Welcome back, {profile.username.split(" ")[0]}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your files, notes, and settings are right where you left them.
              </p>

              <div className="mt-8 space-y-3">
                <Button
                  onClick={enterVault}
                  className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                  size="lg"
                >
                  Enter Vault <ArrowRight className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => router.navigate({ to: "/settings" })}
                >
                  Manage profile
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleCreate}
              className="animate-in fade-in slide-in-from-bottom-2 duration-500"
            >
              <h1 className="text-3xl font-semibold tracking-tight">Create your vault</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Tell us your name. Everything is stored only on this device.
              </p>

              <div className="mt-8 space-y-1.5">
                <Label htmlFor="name">Enter your name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Chen"
                  autoFocus
                  required
                  maxLength={60}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="mt-6 w-full bg-brand text-brand-foreground hover:bg-brand/90"
              >
                Create My Vault
              </Button>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            No account, no cloud — just your private offline vault.
          </p>
        </div>
      </div>
    </div>
  );
}
