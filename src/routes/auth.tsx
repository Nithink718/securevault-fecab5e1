import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { useVault } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SecureVault" },
      { name: "description", content: "Access your private vault of files and notes." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

const signupSchema = z.object({
  username: z.string().trim().min(2, "Username too short").max(40),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(120),
  confirm: z.string(),
});

function AuthPage() {
  const router = useRouter();
  const currentUserId = useVault((s) => s.currentUserId);
  const signup = useVault((s) => s.signup);
  const login = useVault((s) => s.login);
  const resetPassword = useVault((s) => s.resetPassword);

  const [mode, setMode] = useState<Mode>("login");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });

  useEffect(() => {
    if (currentUserId) router.navigate({ to: "/dashboard", replace: true });
  }, [currentUserId, router]);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "login") {
      const r = login(form.email, form.password);
      if (!r.ok) return toast.error(r.error);
      toast.success("Welcome back");
      router.navigate({ to: "/dashboard" });
    } else if (mode === "signup") {
      const parsed = signupSchema.safeParse(form);
      if (!parsed.success) return toast.error(parsed.error.issues[0].message);
      if (form.password !== form.confirm) return toast.error("Passwords do not match");
      const r = signup({ username: form.username, email: form.email, password: form.password });
      if (!r.ok) return toast.error(r.error);
      toast.success("Account created");
      router.navigate({ to: "/dashboard" });
    } else {
      if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
      if (form.password !== form.confirm) return toast.error("Passwords do not match");
      const r = resetPassword(form.email, form.password);
      if (!r.ok) return toast.error(r.error);
      toast.success("Password updated — please sign in");
      setMode("login");
    }
  }

  const title = mode === "login" ? "Welcome back" : mode === "signup" ? "Create your vault" : "Reset password";
  const sub =
    mode === "login"
      ? "Sign in to access your secure files and notes."
      : mode === "signup"
        ? "Your files stay on your device — encrypted and private."
        : "Set a new password for your account.";

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
            Everything stays on your device. Organize documents, lock sensitive notes, and find anything in
            seconds — without ever uploading to the cloud.
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
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{sub}</p>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => update("username", e.target.value)}
                  placeholder="Alex Chen"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            {mode !== "forgot" || true ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{mode === "forgot" ? "New password" : "Password"}</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs font-medium text-brand hover:underline underline-offset-4"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            ) : null}
            {(mode === "signup" || mode === "forgot") && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type={show ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => update("confirm", e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
              {mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Update password"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" && (
              <>
                Don&apos;t have an account?{" "}
                <button onClick={() => setMode("signup")} className="font-semibold text-brand hover:underline">
                  Sign up
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                Already have an account?{" "}
                <button onClick={() => setMode("login")} className="font-semibold text-brand hover:underline">
                  Sign in
                </button>
              </>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} className="font-semibold text-brand hover:underline">
                Back to sign in
              </button>
            )}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing you agree to keep your vault stored locally on this device.
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
