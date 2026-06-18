import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  StickyNote,
  Tags,
  Heart,
  Settings as SettingsIcon,
  Shield,
  Search,
  Plus,
  LogOut,
} from "lucide-react";
import { useCurrentUser, useVault } from "@/lib/store";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/files", label: "Files", icon: FolderOpen },
  { to: "/notes", label: "Notes", icon: StickyNote },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/favorites", label: "Favorites", icon: Heart },
] as const;

export function AppShell({ children, search, onSearchChange }: { children: ReactNode; search?: string; onSearchChange?: (v: string) => void }) {
  const user = useCurrentUser();
  const theme = useVault((s) => s.theme);
  const logout = useVault((s) => s.logout);
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  useEffect(() => {
    if (user === null) router.navigate({ to: "/auth", replace: true });
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading vault…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-sidebar lg:block">
        <div className="flex h-full flex-col p-6">
          <Link to="/dashboard" className="mb-8 flex items-center gap-2.5 px-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-glow">
              <Shield className="size-5" strokeWidth={2.2} />
            </div>
            <span className="text-lg font-semibold tracking-tight">SecureVault</span>
          </Link>

          <nav className="space-y-1">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  }`}
                >
                  <Icon className={`size-4 shrink-0 ${active ? "text-brand" : ""}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-1">
            <Link
              to="/settings"
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith("/settings")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}
            >
              <SettingsIcon className="size-4 shrink-0" />
              Settings
            </Link>
            <button
              onClick={() => {
                logout();
                router.navigate({ to: "/auth", replace: true });
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
            >
              <LogOut className="size-4 shrink-0" />
              Sign out
            </button>
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-secondary/60 px-3 py-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{user.username}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="lg:pl-64">
        {onSearchChange !== undefined && (
          <div className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-6 py-3 md:px-10">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={search ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search files, notes, categories…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}
        <div className="mx-auto max-w-[1200px] px-6 pb-28 pt-8 md:px-10 lg:pb-12">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
          {NAV.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 ${active ? "text-brand" : "text-muted-foreground"}`}>
                <Icon className="size-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          <Link
            to="/files"
            className="-mt-8 flex size-12 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-glow ring-4 ring-background"
          >
            <Plus className="size-5" />
          </Link>
          {NAV.slice(2, 4).map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 ${active ? "text-brand" : "text-muted-foreground"}`}>
                <Icon className="size-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export { Button };
