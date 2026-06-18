import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useVault } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SecureVault — Personal Document & Notes Manager" },
      { name: "description", content: "Securely organize files and personal notes on your device." },
    ],
  }),
  component: Index,
});

function Index() {
  const router = useRouter();
  const currentUserId = useVault((s) => s.currentUserId);
  useEffect(() => {
    router.navigate({ to: currentUserId ? "/dashboard" : "/auth", replace: true });
  }, [router, currentUserId]);
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}
