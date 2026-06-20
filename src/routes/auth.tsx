import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Shield, ArrowRight } from "lucide-react";
import { useVault } from "@/lib/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Welcome — SecureVault" },
      { name: "description", content: "Your private vault of files and notes." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const ensureGuest = useVault((s) => s.ensureGuest);

  function enter() {
    ensureGuest();
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
            Everything stays on your device. Organize documents, lock sensitive notes, and find anything in seconds.
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
        <div className="w-full max-w-sm text-center">
          <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
              <Shield className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">SecureVault</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to your vault</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Everything is stored locally on this device. No account required.
          </p>

          <Button
            onClick={enter}
            className="mt-8 w-full bg-brand text-brand-foreground hover:bg-brand/90"
            size="lg"
          >
            Enter vault
            <ArrowRight className="size-4" />
          </Button>

          <p className="mt-8 text-xs text-muted-foreground">
            Your data stays on this device until you choose to export it.
          </p>
        </div>
      </div>
    </div>
  );
}
