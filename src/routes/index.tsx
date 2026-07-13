import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FolderPlus,
  FolderOpen,
  Check,
  KeyRound,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useVault } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { isFsaSupported, isInCrossOriginIframe, pickCustomFolder } from "@/lib/fs-storage";

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

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your primary school?",
  "What is your favorite book?",
  "What was the model of your first car?",
];

type Step = "welcome" | "profile" | "storage";

function Welcome() {
  const router = useRouter();
  const profile = useVault((s) => s.profile);
  const storageConfig = useVault((s) => s.storageConfig);
  const [step, setStep] = useState<Step>("welcome");

  // If a profile already exists, jump ahead to storage if that's missing, else show welcome-back
  useEffect(() => {
    if (profile && !storageConfig) setStep("storage");
  }, [profile, storageConfig]);

  function enterVault() {
    router.navigate({ to: "/dashboard" });
  }

  if (profile && storageConfig && step === "welcome") {
    return <WelcomeBack onEnter={enterVault} />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <Sidebar step={step} />
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <MobileLogo />
          {step === "welcome" && <WelcomeStep onNext={() => setStep("profile")} />}
          {step === "profile" && (
            <ProfileStep
              onBack={() => setStep("welcome")}
              onDone={() => setStep("storage")}
            />
          )}
          {step === "storage" && <StorageStep onDone={enterVault} />}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            No account, no cloud — just your private offline vault.
          </p>
        </div>
      </div>
    </div>
  );
}

function MobileLogo() {
  return (
    <div className="mb-6 flex items-center gap-2.5 lg:hidden">
      <div className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
        <Shield className="size-5" />
      </div>
      <span className="text-lg font-semibold tracking-tight">SecureVault</span>
    </div>
  );
}

function Sidebar({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "welcome", label: "Welcome" },
    { id: "profile", label: "Create Profile" },
    { id: "storage", label: "Storage Setup" },
  ];
  const activeIndex = steps.findIndex((s) => s.id === step);
  return (
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
          Everything stays on your device. Set up your profile, pick where files live, and start
          organizing in minutes.
        </p>
        <ol className="mt-6 space-y-3">
          {steps.map((s, i) => {
            const done = i < activeIndex;
            const active = i === activeIndex;
            return (
              <li key={s.id} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    done
                      ? "bg-white text-brand"
                      : active
                        ? "bg-white/25 text-white ring-2 ring-white"
                        : "bg-white/10 text-white/70"
                  }`}
                >
                  {done ? <Check className="size-3" /> : i + 1}
                </span>
                <span className={active ? "font-semibold" : "text-white/80"}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="text-xs text-white/60">© SecureVault — Personal Document &amp; Notes Manager</p>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
        <Sparkles className="size-3" /> First-time setup
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Welcome to SecureVault</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Let's set up your private vault. It only takes a minute and stays on this device.
      </p>
      <ul className="mt-6 space-y-2.5 text-sm">
        {[
          "Create a profile with a 4-digit PIN",
          "Add three security questions",
          "Choose where SecureVault stores your files",
        ].map((t) => (
          <li key={t} className="flex items-start gap-2.5 text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-brand" /> {t}
          </li>
        ))}
      </ul>
      <Button
        onClick={onNext}
        size="lg"
        className="mt-8 w-full bg-brand text-brand-foreground hover:bg-brand/90"
      >
        Get Started <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function ProfileStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const createProfile = useVault((s) => s.createProfile);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [q, setQ] = useState<{ question: string; answer: string }[]>([
    { question: SECURITY_QUESTIONS[0], answer: "" },
    { question: SECURITY_QUESTIONS[1], answer: "" },
    { question: SECURITY_QUESTIONS[2], answer: "" },
  ]);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 1) return toast.error("Please enter your name");
    if (!/^\d{4}$/.test(pin)) return toast.error("PIN must be exactly 4 digits");
    if (pin !== confirmPin) return toast.error("PINs do not match");
    for (const item of q) {
      if (!item.question.trim()) return toast.error("Pick a security question");
      if (item.answer.trim().length < 1) return toast.error("Answer all security questions");
    }
    setBusy(true);
    await createProfile({ username: name, pin, questions: q });
    setBusy(false);
    toast.success("Profile created");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h1 className="text-3xl font-semibold tracking-tight">Create your profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your name, a 4-digit PIN, and three security questions for recovery.
      </p>

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Chen"
            autoFocus
            maxLength={60}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pin">4-digit PIN</Label>
            <Input
              id="pin"
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cpin">Confirm PIN</Label>
            <Input
              id="cpin"
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-brand" /> Security questions
          </Label>
          {q.map((item, idx) => (
            <div key={idx} className="space-y-1.5 rounded-lg border border-border p-3">
              <select
                value={item.question}
                onChange={(e) =>
                  setQ((prev) => prev.map((x, i) => (i === idx ? { ...x, question: e.target.value } : x)))
                }
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand"
              >
                {SECURITY_QUESTIONS.map((sq) => (
                  <option key={sq} value={sq}>
                    {sq}
                  </option>
                ))}
              </select>
              <Textarea
                value={item.answer}
                onChange={(e) =>
                  setQ((prev) => prev.map((x, i) => (i === idx ? { ...x, answer: e.target.value } : x)))
                }
                placeholder="Your answer"
                rows={1}
                maxLength={100}
                className="min-h-9 resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={busy}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={busy}
          className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          Continue
        </Button>
      </div>
    </form>
  );
}

function StorageStep({ onDone }: { onDone: () => void }) {
  const setStorageConfig = useVault((s) => s.setStorageConfig);
  const [busy, setBusy] = useState<"default" | "custom" | null>(null);
  const fsa = isFsaSupported();
  const embedded = isInCrossOriginIframe();

  async function chooseDefault() {
    setBusy("default");
    setStorageConfig("default", "SecureVault (on this device)", false);
    setBusy(null);
    toast.success("SecureVault folder is ready");
    onDone();
  }

  async function chooseCustom() {
    if (!fsa) {
      toast.error("Your browser doesn't support folder picking. Use the recommended option.");
      return;
    }
    if (embedded) {
      toast.error("Open SecureVault in its own browser tab to pick a folder.");
      return;
    }
    try {
      setBusy("custom");
      const handle = await pickCustomFolder();
      setStorageConfig("custom", handle.name, true);
      toast.success(`Using "${handle.name}" as SecureVault storage`);
      onDone();
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") return; // silent on cancel
      toast.error(err.message || "Couldn't select that folder");
    } finally {
      setBusy(null);
    }
  }

  function openInNewTab() {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  }

  const customDisabled = !fsa || embedded;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h1 className="text-3xl font-semibold tracking-tight">Choose storage location</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        SecureVault stores your files locally on your device. Choose where SecureVault should manage
        your files.
      </p>

      <div className="mt-6 space-y-3">
        <StorageCard
          icon={<FolderPlus className="size-5" />}
          title="Create SecureVault Folder"
          description="Create a dedicated SecureVault folder inside your device storage to securely organize all managed files."
          recommended
          loading={busy === "default"}
          onClick={chooseDefault}
        />

        <StorageCard
          icon={<FolderOpen className="size-5" />}
          title="Choose Custom Folder"
          description={
            !fsa
              ? "Not supported in this browser — use the recommended option above."
              : embedded
                ? "Folder picking is blocked inside embedded previews. Open SecureVault in its own tab to enable this."
                : "Select an existing folder anywhere on your device."
          }
          loading={busy === "custom"}
          disabled={customDisabled}
          onClick={chooseCustom}
        />

        {embedded && fsa && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={openInNewTab}
          >
            Open SecureVault in a new tab <ArrowRight className="size-4" />
          </Button>
        )}
      </div>

      <div className="mt-6 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
        Your storage location can be changed later from{" "}
        <span className="font-medium text-foreground">Settings → Storage</span>. SecureVault will
        create category subfolders like Documents, Images, Videos, and Notes.
      </div>
    </div>
  );
}

function StorageCard({
  icon,
  title,
  description,
  recommended,
  loading,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  recommended?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`group relative flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all ${
        disabled
          ? "cursor-not-allowed border-border/60 opacity-50"
          : "border-border hover:border-brand hover:bg-brand/5"
      } ${recommended ? "border-brand/40 bg-brand/[0.03]" : ""}`}
    >
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${
          recommended ? "bg-brand text-brand-foreground" : "bg-secondary text-foreground"
        }`}
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {recommended && (
            <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
              Recommended
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground text-pretty">{description}</p>
      </div>
      <ArrowRight className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function WelcomeBack({ onEnter }: { onEnter: () => void }) {
  const router = useRouter();
  const profile = useVault((s) => s.profile)!;
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <Sidebar step="storage" />
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <MobileLogo />
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
                onClick={onEnter}
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
        </div>
      </div>
    </div>
  );
}
