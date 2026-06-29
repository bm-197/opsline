"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { SearchTrigger, SearchTriggerIcon } from "@/components/search-trigger";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

type IconProps = { className?: string };

const icons: Record<string, (p: IconProps) => React.ReactElement> = {
  dashboard: (p) => (
    <Icon {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Icon>
  ),
  runs: (p) => (
    <Icon {...p}>
      <path d="M4 6h10M4 12h16M4 18h7" />
      <circle cx="18" cy="6" r="1.6" />
    </Icon>
  ),
  approvals: (p) => (
    <Icon {...p}>
      <path d="M20 7 10 17l-5-5" />
    </Icon>
  ),
  workflows: (p) => (
    <Icon {...p}>
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M8 6h4a4 4 0 0 1 4 4M8 18h4a4 4 0 0 0 4-4" />
    </Icon>
  ),
  audit: (p) => (
    <Icon {...p}>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 9h7M8 13h7M8 17h4" />
    </Icon>
  ),
  settings: (p) => (
    <Icon {...p}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  ),
};

function Icon({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function UserMenu({
  userName,
  org,
  showLabels,
  onSignOut,
  onNavigate,
}: {
  userName: string;
  org: string;
  showLabels: boolean;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const item =
    "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-muted transition-colors hover:bg-line/60 hover:text-ink";

  return (
    <div className="relative">
      {open && (
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
      )}
      {open && (
        <div className="absolute bottom-full left-0 z-40 mb-2 w-56 rounded-2xl border border-line bg-card p-1.5 shadow-xl">
          <div className="px-2.5 py-1.5">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate font-geist text-xs text-faint">{org}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link
            href="/settings"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className={item}
          >
            <Icon className="size-4">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </Icon>
            Settings
          </Link>
          <button type="button" onClick={onSignOut} className={item}>
            <Icon className="size-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </Icon>
            Sign out
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={showLabels ? undefined : userName}
        className="flex h-[3.25rem] w-full items-center gap-2 rounded-xl px-2 text-left transition-colors hover:bg-line/50"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-line/70 font-geist text-xs font-medium text-ink">
          {initials(userName)}
        </span>
        {showLabels && (
          <>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{userName}</span>
              <span className="truncate font-geist text-xs text-faint">
                {org}
              </span>
            </span>
            <Icon className="ml-auto size-4 shrink-0 text-faint">
              <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
            </Icon>
          </>
        )}
      </button>
    </div>
  );
}

type Org = { id: string; name: string; logo: string | null };

// Workspace switcher. Lists every org the user belongs to, marks the active
// one, and sets a new active org via Better Auth before landing on /dashboard
// (data is org-scoped, so the current page may not exist in the new workspace).
function OrgSwitcher({
  orgs,
  activeOrgId,
  orgName,
  orgLogo,
  showLabels,
  onNavigate,
}: {
  orgs: Org[];
  activeOrgId: string;
  orgName: string;
  orgLogo: string | null;
  showLabels: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const switchTo = (id: string) => {
    setOpen(false);
    if (id === activeOrgId) return;
    start(async () => {
      await authClient.organization.setActive({ organizationId: id });
      onNavigate?.();
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <div className={cn("relative min-w-0", showLabels && "flex-1")}>
      {open && (
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
      )}
      {open && (
        <div className="absolute top-full left-0 z-40 mt-2 w-60 rounded-2xl border border-line bg-card p-1.5 shadow-xl">
          <p className="px-2.5 pt-1 pb-1.5 font-geist text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
            Workspaces
          </p>
          {orgs.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => switchTo(o.id)}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-line/60"
            >
              <Logo src={o.logo} className="size-6 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{o.name}</span>
              {o.id === activeOrgId && (
                <Icon className="size-4 shrink-0 text-ink">
                  <path d="M20 6 9 17l-5-5" />
                </Icon>
              )}
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          <Link
            href="/onboarding"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-muted transition-colors hover:bg-line/60 hover:text-ink"
          >
            <Icon className="size-4">
              <path d="M12 5v14M5 12h14" />
            </Icon>
            Create workspace
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={showLabels ? undefined : orgName}
        aria-label="Switch workspace"
        disabled={pending}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-line/50",
          !showLabels && "justify-center px-0",
          pending && "opacity-60",
        )}
      >
        <Logo src={orgLogo} />
        {showLabels && (
          <>
            <span className="min-w-0 flex-1 truncate text-left font-semibold tracking-tight">
              {orgName}
            </span>
            <Icon className="size-4 shrink-0 text-faint">
              <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
            </Icon>
          </>
        )}
      </button>
    </div>
  );
}

// The Compose-equivalent: the one prominent action in the rail. Admin-only,
// mirroring the /workflows/new route's own permission check, so non-admins
// never see a button that would bounce them.
function CreateButton({
  showLabels,
  onNavigate,
}: {
  showLabels: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/workflows/new"
      onClick={onNavigate}
      title={showLabels ? undefined : "Create workflow"}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-2xl bg-linear-to-b from-zinc-800 to-black font-medium text-white shadow-lg shadow-zinc-900/20 transition outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]",
        showLabels
          ? "h-11 self-start pr-4 pl-3 text-sm"
          : "size-11 justify-center self-center",
      )}
    >
      <Icon className="size-5 shrink-0">
        <path d="M12 5v14M5 12h14" />
      </Icon>
      {showLabels && <span>Create</span>}
    </Link>
  );
}

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/runs", label: "Runs", icon: "runs" },
  { href: "/approvals", label: "Approvals", icon: "approvals" },
  { href: "/workflows", label: "Workflows", icon: "workflows" },
  { href: "/audit", label: "Audit", icon: "audit" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

export function Shell({
  org,
  orgLogo,
  orgs,
  activeOrgId,
  userName,
  canCreate,
  initialCollapsed,
  children,
}: {
  org: string;
  orgLogo: string | null;
  orgs: Org[];
  activeOrgId: string;
  userName: string;
  canCreate: boolean;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, start] = useTransition();

  // Persist in a cookie so the server renders the right width on first paint.
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      document.cookie = `opsline-sidebar=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  };

  const signOut = () =>
    start(async () => {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    });

  // The collapsing rail: Create + nav + user menu. Icons keep their left
  // padding (pl-6) in both states, so collapsing only drops labels and narrows
  // the rail from the right while the content panel expands toward the icons.
  const railBody = (showLabels: boolean, onNavigate?: () => void) => (
    <div
      className={cn(
        "flex h-full flex-col py-3",
        showLabels ? "pr-4 pl-6" : "px-6",
      )}
    >
      {canCreate && (
        <div className="flex">
          <CreateButton showLabels={showLabels} onNavigate={onNavigate} />
        </div>
      )}

      <nav className={cn("flex flex-col gap-1", canCreate && "mt-6")}>
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          const Glyph = icons[link.icon]!;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              title={showLabels ? undefined : link.label}
              className={cn(
                "flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-line/70 font-medium text-ink"
                  : "text-muted hover:bg-line/50 hover:text-ink",
              )}
            >
              <Glyph className="size-5 shrink-0" />
              {showLabels && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line pt-3">
        <UserMenu
          userName={userName}
          org={org}
          showLabels={showLabels}
          onSignOut={signOut}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );

  const hamburger = (
    <button
      type="button"
      onClick={toggleCollapsed}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="shrink-0 rounded-lg p-1.5 text-faint transition-colors hover:bg-line/50 hover:text-ink"
    >
      <Icon className="size-5">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </Icon>
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Persistent desktop top bar: hamburger, org switcher, and search do not
          collapse. Only the nav rail below changes width. The org segment is the
          expanded rail width, so search aligns with the panel's left border. */}
      <header className="sticky top-0 z-30 hidden h-16 items-center bg-canvas pr-4 md:flex">
        <div className="flex h-full w-64 shrink-0 items-center gap-1.5 pl-6">
          {hamburger}
          <OrgSwitcher
            orgs={orgs}
            activeOrgId={activeOrgId}
            orgName={org}
            orgLogo={orgLogo}
            showLabels
          />
        </div>
        <SearchTrigger className="w-full max-w-xl" />
      </header>

      {/* Mobile top strip */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-line bg-card/80 px-4 py-2.5 backdrop-blur-md md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-1.5 text-muted hover:bg-line/60 hover:text-ink"
        >
          <Icon className="size-5">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </Icon>
        </button>
        <Logo src={orgLogo} className="size-6" />
        <span className="truncate font-semibold tracking-tight">{org}</span>
        <div className="ml-auto">
          <SearchTriggerIcon />
        </div>
      </div>

      {/* Body: collapsing rail + content panel that expands toward it. */}
      <div className="flex flex-1">
        <aside
          className={cn(
            "sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 self-start bg-transparent md:flex md:flex-col",
            "motion-safe:transition-[width] motion-safe:duration-200",
            collapsed ? "w-24" : "w-64",
          )}
        >
          {railBody(!collapsed)}
        </aside>

        <main className="glass-card min-w-0 flex-1 md:mt-3 md:rounded-tl-3xl">
          <div className="mx-auto max-w-5xl px-6 pt-18 pb-10 md:px-10 md:pt-10">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-ink/20"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-card shadow-xl">
            <div className="px-4 pt-3">
              <OrgSwitcher
                orgs={orgs}
                activeOrgId={activeOrgId}
                orgName={org}
                orgLogo={orgLogo}
                showLabels
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
            <div className="min-h-0 flex-1">
              {railBody(true, () => setMobileOpen(false))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
