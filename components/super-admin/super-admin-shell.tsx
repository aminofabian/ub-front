"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  Menu,
  PanelRight,
  Settings2,
  Shield,
  Sparkles,
} from "lucide-react";
import { Collapsible } from "radix-ui";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { SuperAdminDrawer } from "@/components/super-admin/super-admin-drawer";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { logoutSuperAdmin, fetchSuperAdminMe, type SuperAdminMe } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

function crumbLabel(pathname: string): { items: { label: string; href?: string }[] } {
  if (pathname === APP_ROUTES.superAdminDashboard) {
    return { items: [{ label: "Overview" }] };
  }
  if (pathname === APP_ROUTES.superAdminBusinesses) {
    return {
      items: [
        { label: "Overview", href: APP_ROUTES.superAdminDashboard },
        { label: "Tenants", href: APP_ROUTES.superAdminBusinesses },
        { label: "All tenants" },
      ],
    };
  }
  if (pathname.startsWith(`${APP_ROUTES.superAdminBusinesses}/`)) {
    return {
      items: [
        { label: "Overview", href: APP_ROUTES.superAdminDashboard },
        { label: "Tenants", href: APP_ROUTES.superAdminBusinesses },
        { label: "Tenant detail" },
      ],
    };
  }
  if (pathname === APP_ROUTES.superAdminSettings) {
    return {
      items: [
        { label: "Overview", href: APP_ROUTES.superAdminDashboard },
        { label: "Account" },
        { label: "Profile & security" },
      ],
    };
  }
  if (pathname === APP_ROUTES.superAdminPlatformPayments) {
    return {
      items: [
        { label: "Overview", href: APP_ROUTES.superAdminDashboard },
        { label: "Platform" },
        { label: "Payment gateways" },
      ],
    };
  }
  if (pathname === APP_ROUTES.superAdminPlatformIntegrations) {
    return {
      items: [
        { label: "Overview", href: APP_ROUTES.superAdminDashboard },
        { label: "Platform" },
        { label: "Integrations" },
      ],
    };
  }
  if (
    pathname === APP_ROUTES.superAdminPlatformGlobalCatalog ||
    pathname.startsWith(`${APP_ROUTES.superAdminPlatformGlobalCatalog}/`)
  ) {
    return {
      items: [
        { label: "Overview", href: APP_ROUTES.superAdminDashboard },
        { label: "Platform" },
        { label: "Global catalog" },
      ],
    };
  }
  return { items: [{ label: "Super admin" }] };
}

type NavLeafProps = {
  href: string;
  label: string;
  /** Match prefix (e.g. tenant list + detail) */
  match?: "exact" | "prefix";
};

function NavLeaf({ href, label, match = "exact" }: NavLeafProps) {
  const pathname = usePathname();
  const active =
    match === "prefix"
      ? pathname === href || pathname.startsWith(`${href}/`)
      : pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-[background-color,color,transform]",
        active
          ? "bg-primary/12 font-medium text-foreground shadow-sm ring-1 ring-primary/15"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
          active ? "bg-primary" : "bg-muted-foreground/35 group-hover:bg-muted-foreground/60",
        )}
        aria-hidden
      />
      {label}
    </Link>
  );
}

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { items: crumbs } = crumbLabel(pathname);

  const [me, setMe] = React.useState<SuperAdminMe | null>(null);
  const [mobileNav, setMobileNav] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [quickOpen, setQuickOpen] = React.useState(false);

  const [openTenants, setOpenTenants] = React.useState(() =>
    pathname.startsWith(APP_ROUTES.superAdminBusinesses),
  );
  const [openPlatform, setOpenPlatform] = React.useState(
    () => pathname.includes("/payments") || pathname.includes("/platform/"),
  );
  const [openAccount, setOpenAccount] = React.useState(() => pathname.includes("/settings"));

  React.useEffect(() => {
    if (pathname.startsWith(APP_ROUTES.superAdminBusinesses)) setOpenTenants(true);
    if (pathname.includes("/payments")) setOpenPlatform(true);
    if (pathname.includes("/settings")) setOpenAccount(true);
  }, [pathname]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await fetchSuperAdminMe();
        if (!cancelled) setMe(profile);
      } catch {
        if (!cancelled) setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSignOut = () => {
    logoutSuperAdmin();
    router.replace(APP_ROUTES.superAdminLogin);
  };

  const closeMobile = () => setMobileNav(false);

  const sidebarNav = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border/60 px-3 lg:h-[4.25rem] lg:px-4">
        <KioskLogo
          href={APP_ROUTES.superAdminDashboard}
          size="sm"
          wordmark="Kiosk"
          tagline="Super admin"
          showTagline
        />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3" aria-label="Super admin">
        <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
          Navigate
        </div>
        <NavLeaf href={APP_ROUTES.superAdminDashboard} label="Overview" />

        <Collapsible.Root open={openTenants} onOpenChange={setOpenTenants} className="space-y-0.5">
          <Collapsible.Trigger
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            )}
          >
            <span className="flex items-center gap-2">
              <Building2 className="size-4 shrink-0 opacity-70" aria-hidden />
              Tenants
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 opacity-60 transition-transform duration-200",
                openTenants && "rotate-180",
              )}
              aria-hidden
            />
          </Collapsible.Trigger>
          <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
            <div className="ml-1.5 space-y-0.5 border-l border-border/50 py-1 pl-3">
              <NavLeaf href={APP_ROUTES.superAdminBusinesses} label="All tenants" match="prefix" />
            </div>
          </Collapsible.Content>
        </Collapsible.Root>

        <Collapsible.Root open={openPlatform} onOpenChange={setOpenPlatform} className="space-y-0.5">
          <Collapsible.Trigger
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            )}
          >
            <span className="flex items-center gap-2">
              <Shield className="size-4 shrink-0 opacity-70" aria-hidden />
              Platform
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 opacity-60 transition-transform duration-200",
                openPlatform && "rotate-180",
              )}
              aria-hidden
            />
          </Collapsible.Trigger>
          <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
            <div className="ml-1.5 space-y-0.5 border-l border-border/50 py-1 pl-3">
              <NavLeaf href={APP_ROUTES.superAdminPlatformGlobalCatalog} label="Global catalog" match="prefix" />
              <NavLeaf href={APP_ROUTES.superAdminPlatformPayments} label="Payment gateways" />
              <NavLeaf href={APP_ROUTES.superAdminPlatformIntegrations} label="Integrations" />
            </div>
          </Collapsible.Content>
        </Collapsible.Root>

        <Collapsible.Root open={openAccount} onOpenChange={setOpenAccount} className="space-y-0.5">
          <Collapsible.Trigger
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            )}
          >
            <span className="flex items-center gap-2">
              <Settings2 className="size-4 shrink-0 opacity-70" aria-hidden />
              Account
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 opacity-60 transition-transform duration-200",
                openAccount && "rotate-180",
              )}
              aria-hidden
            />
          </Collapsible.Trigger>
          <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
            <div className="ml-1.5 space-y-0.5 border-l border-border/50 py-1 pl-3">
              <NavLeaf href={APP_ROUTES.superAdminSettings} label="Profile & security" />
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      </nav>

      <div className="mt-auto border-t border-border/60 p-3">
        <div className="rounded-xl border border-border/50 bg-muted/25 px-3 py-2.5">
          <p className="truncate text-xs font-medium text-foreground">{me?.name ?? "Signed in"}</p>
          <p className="truncate text-[11px] text-muted-foreground">{me?.email ?? "—"}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 h-8 w-full border-border/70 text-xs"
            type="button"
            onClick={onSignOut}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex min-h-[100dvh]">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-border/70",
            "bg-sidebar/95 shadow-[1px_0_0_0_rgba(0,0,0,0.03)] backdrop-blur-md",
            "dark:bg-sidebar/90 dark:shadow-[1px_0_0_0_rgba(255,255,255,0.04)]",
            "lg:flex",
          )}
        >
          {sidebarNav}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-[272px]">
          <header
            className={cn(
              "sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4",
              "bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70",
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu className="size-5" />
            </Button>

            <nav className="hidden min-w-0 flex-1 items-center gap-1.5 text-sm lg:flex" aria-label="Breadcrumb">
              <LayoutDashboard className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {crumbs.map((c, i) => (
                <React.Fragment key={`${c.label}-${i}`}>
                  {i > 0 ? (
                    <span className="text-muted-foreground/50" aria-hidden>
                      /
                    </span>
                  ) : null}
                  {c.href ? (
                    <Link
                      href={c.href}
                      className="truncate text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span className={cn("truncate", i === crumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {c.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>

            <div className="flex flex-1 items-center justify-end gap-1 lg:flex-none">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Notifications"
                onClick={() => setNotifOpen(true)}
              >
                <Bell className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Quick settings"
                onClick={() => setQuickOpen(true)}
              >
                <PanelRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="hidden sm:inline-flex"
                onClick={onSignOut}
              >
                Sign out
              </Button>
            </div>
          </header>

          <main className="relative flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1400px] space-y-8">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile navigation */}
      {mobileNav ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <div
            className={cn(
              "absolute inset-y-0 left-0 flex w-[min(300px,88vw)] flex-col border-r border-border/70",
              "bg-sidebar shadow-xl animate-in slide-in-from-left duration-200",
            )}
          >
            <div className="flex items-center justify-end border-b border-border/60 p-2">
              <Button type="button" variant="ghost" size="sm" onClick={closeMobile}>
                Close
              </Button>
            </div>
            <div onClick={closeMobile} className="min-h-0 flex-1 overflow-y-auto">
              {sidebarNav}
            </div>
          </div>
        </div>
      ) : null}

      <SuperAdminDrawer
        open={notifOpen}
        onOpenChange={setNotifOpen}
        title="Notifications"
        description="System alerts and platform events will appear here."
      >
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 py-14 text-center">
          <Sparkles className="mb-3 size-8 text-muted-foreground/50" aria-hidden />
          <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            No active alerts. Webhook failures, billing anomalies, and maintenance windows will surface here when wired
            to the platform bus.
          </p>
        </div>
      </SuperAdminDrawer>

      <SuperAdminDrawer
        open={quickOpen}
        onOpenChange={setQuickOpen}
        title="Console shortcuts"
        description="Jump to common tasks without leaving your current page."
      >
        <ul className="space-y-2 text-sm">
          <li>
            <Link
              className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/60"
              href={APP_ROUTES.superAdminBusinesses}
              onClick={() => setQuickOpen(false)}
            >
              <Building2 className="size-4 text-muted-foreground" />
              Manage tenants
            </Link>
          </li>
          <li>
            <Link
              className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/60"
              href={APP_ROUTES.superAdminPlatformPayments}
              onClick={() => setQuickOpen(false)}
            >
              <CreditCard className="size-4 text-muted-foreground" />
              Platform payments
            </Link>
          </li>
          <li>
            <Link
              className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/60"
              href={APP_ROUTES.superAdminSettings}
              onClick={() => setQuickOpen(false)}
            >
              <Settings2 className="size-4 text-muted-foreground" />
              Profile & security
            </Link>
          </li>
        </ul>
        <p className="mt-6 text-xs text-muted-foreground">
          Tip: use the sidebar groups to keep navigation organized as the console grows.
        </p>
      </SuperAdminDrawer>

      <DashboardToaster centered />
    </>
  );
}
