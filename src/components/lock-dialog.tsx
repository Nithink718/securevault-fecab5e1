import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVault } from "@/lib/store";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "lock" | "unlock";
  itemName?: string;
  onSuccess: () => void;
};

/** Shared password dialog for locking/unlocking files & notes. */
export function LockDialog({ open, onOpenChange, mode, itemName, onSuccess }: Props) {
  const verifyPassword = useVault((s) => s.verifyPassword);
  const hasLockPassword = useVault((s) => s.hasLockPassword);
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setPwd("");
  }, [open]);

  const hasPwd = hasLockPassword();

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pwd) return;
    setBusy(true);
    const ok = await verifyPassword(pwd);
    setBusy(false);
    if (!ok) {
      toast.error("Incorrect password");
      return;
    }
    onSuccess();
    onOpenChange(false);
  }

  if (open && !hasPwd) {
    return <NoPasswordDialog open={open} onOpenChange={onOpenChange} />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Lock className="size-5" />
          </div>
          <DialogTitle className="text-center">
            {mode === "lock" ? "Confirm to lock" : "Enter vault password"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === "lock"
              ? `Enter your vault password to lock${itemName ? ` "${itemName}"` : " this item"}.`
              : itemName
                ? `"${itemName}" is locked. Enter your vault password to open it.`
                : "Enter your vault password to continue."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="vault-pwd">Password</Label>
            <Input
              id="vault-pwd"
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || !pwd}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {mode === "lock" ? "Lock" : "Unlock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NoPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <ShieldAlert className="size-5" />
          </div>
          <DialogTitle className="text-center">No lock password set</DialogTitle>
          <DialogDescription className="text-center">
            No lock password has been set yet. Please create one in Settings before locking items.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Link to="/settings" onClick={() => onOpenChange(false)}>
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
              Go to Settings
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
