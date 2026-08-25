"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  Gauge,
  Headset,
  Inbox,
  LayoutDashboard,
  Mail,
  Menu,
  Settings2,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { Collapsible } from "radix-ui";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { SuperAdminDrawer } from "@/components/super-admin/super-admin-drawer";
import { Button } from "@/components/ui/button";
import { useSaSupportUnread } from "@/hooks/use-sa-support-unread";
import { APP_ROUTES } from "@/lib/config";
import { getSuperAdminRealtimeClient } from "@/lib/realtime";
import { logoutSuperAdmin, fetchSuperAdminMe, type SuperAdminMe } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

function crumbsFor(pathname: string): Crumb[] {
  if (pathname === APP_ROUTES.superAdminDashboard) return [{ label: "Overview" }];
  if (pathname === APP_ROUTES.superAdminBusinesses) return [{ label: "Tenants" }];
  if (pathname.startsWith(`${APP_ROUTES.superAdminBusinesses}/`)) {
    return [
      { label: "Tenants", href: APP_ROUTES.superAdminBusinesses },
      { label: "Tenant" },
    ];
  }
  if (pathname === APP_ROUTES.superAdminAdoptions) return [{ label: "Adoptions" }];
  if (pathname === APP_ROUTES.superAdminCampaignNew) {
    return [
      { label: "Campaigns", href: APP_ROUTES.superAdminCampaigns },
      { label: "Compose" },
    ];
  }
  if (pathname === APP_ROUTES.superAdminCampaigns) return [{ label: "Campaigns" }];
  if (pathname.startsWith(`${APP_ROUTES.superAdminCampaigns}/`)) {
    return [
      { label: "Campaigns", href: APP_ROUTES.superAdminCampaigns },
      { label: "Campaign" },
    ];
  }
  if (pathname === APP_ROUTES.superAdminMessages) return [{ label: "Messages" }];
  if (pathname === APP_ROUTES.superAdminSupport) return [{ label: "Support" }];
  if (pathname === APP_ROUTES.superAdminSettings) return [{ label: "Profile" }];
  if (pathname === APP_ROUTES.superAdminPlatformPayments) {
    return [{ label: "Platform" }, { label: "Payments" }];
  }
  if (pathname === APP_ROUTES.superAdminPlatformIntegrations) {
    return [{ label: "Platform" }, { label: "Integrations" }];
  }
  if (pathname === APP_ROUTES.superAdminPlatformSokoMind) {
    return [{ label: "Platform" }, { label: "SokoMind" }];
  }
  if (pathname === APP_ROUTES.superAdminPlatformDomains) {
    return [{ label: "Platform" }, { label: "Domains" }];
  }
  if (pathname === APP_ROUTES.superAdminPlatformLogs) {
    return [{ label: "Platform" }, { label: "Logs" }];
  }
  if (pathname === APP_ROUTES.superAdminPlatformLoadTest) {
    return [{ label: "Platform" }, { label: "Load test" }];
  }
  if (pathname === APP_ROUTES.superAdminPlatformDesktopLicenses) {
    return [{ label: "Platform" }, { label: "Desktop licenses" }];
  }
  if (pathname === APP_ROUTES.superAdminPlatformSupplierPortal) {
    return [{ label: "Platform" }, { label: "Supplier portal" }];
  }
  if (pathname === APP_ROUTES.superAdminPlatformMarketplaceSuppliers) {
    return [{ label: "Platform" }, { label: "Marketplace" }];
  }
  if (
    pathname === APP_ROUTES.superAdminPlatformGlobalCatalog ||
    pathname.startsWith(`${APP_ROUTES.superAdminPlatformGlobalCatalog}/`)
  ) {
    return [{ label: "Platform" }, { label: "Global catalog" }];
  }
  return [{ label: "Console" }];
}

function isPlatformPath(pathname: string) {
  return pathname.includes("/platform/") || pathname === APP_ROUTES.superAdminPlatformPayments;
}

function NavItem({
  href,
  label,
  icon: Icon,
  match = "exact",
  badge = 0,
}: {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  match?: "exact" | "prefix";
  badge?: number;
}) {
  const pathname = usePathname();
  const active =
    match === "prefix"
      ? pathname === href || pathname.startsWith(`${href}/`)
      : pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "bg-primary/12 font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
    >
      {Icon ? (
        <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "opacity-70")} />
      ) : (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            active ? "bg-primary" : "bg-muted-foreground/35",
          )}
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge > 0 ? (
        <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function NavGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pb-1 pt-3 text-[11px] font-medium text-muted-foreground/90">{children}</p>
  );
}

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const crumbs = crumbsFor(pathname);
  const currentLabel = crumbs[crumbs.length - 1]?.label ?? "Console";

  const [me, setMe] = React.useState<SuperAdminMe | null>(null);
  const [mobileNav, setMobileNav] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [openPlatform, setOpenPlatform] = React.useState(() => isPlatformPath(pathname));

  // Live unread badge for the support inbox; the console keeps one shared
  // realtime socket open so the count updates everywhere, not just on the page.
  const saSupportUnread = useSaSupportUnread();

  React.useEffect(() => {
    const client = getSuperAdminRealtimeClient();
    const unregister = client.registerListener("sa-console", {
      channels: ["support"],
    });
    client.connect().catch(() => {
      // The inbox page has its own REST polling fallback.
    });
    return () => {
      unregister();
      client.disconnect();
    };
  }, []);

  React.useEffect(() => {
    if (isPlatformPath(pathname)) setOpenPlatform(true);
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
      <div className="flex h-14 items-center border-b border-border/60 px-3 lg:px-4">
        <KioskLogo
          href={APP_ROUTES.superAdminDashboard}
          size="sm"
          wordmark="Kiosk"
          tagline="Console"
          showTagline
        />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-3" aria-label="Super admin">
        <NavItem href={APP_ROUTES.superAdminDashboard} label="Overview" icon={LayoutDashboard} />
        <NavItem href={APP_ROUTES.superAdminBusinesses} label="Tenants" icon={Building2} match="prefix" />
        <NavItem href={APP_ROUTES.superAdminAdoptions} label="Adoptions" icon={Sparkles} />
        <NavItem href={APP_ROUTES.superAdminCampaigns} label="Campaigns" icon={Mail} match="prefix" />
        <NavItem href={APP_ROUTES.superAdminMessages} label="Messages" icon={Inbox} />
        <NavItem
          href={APP_ROUTES.superAdminSupport}
          label="Support"
          icon={Headset}
          badge={saSupportUnread}
        />

        <Collapsible.Root open={openPlatform} onOpenChange={setOpenPlatform} className="mt-2">
          <Collapsible.Trigger
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              isPlatformPath(pathname) && "text-foreground",
            )}
          >
            <span className="flex items-center gap-2.5">
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
          <Collapsible.Content className="overflow-hidden">
            <div className="ml-3 border-l border-border/50 pb-1 pl-2">
              <NavGroupLabel>Catalog</NavGroupLabel>
              <NavItem href={APP_ROUTES.superAdminPlatformGlobalCatalog} label="Global catalog" match="prefix" />
              <NavGroupLabel>Commerce</NavGroupLabel>
              <NavItem href={APP_ROUTES.superAdminPlatformPayments} label="Payments" />
              <NavItem href={APP_ROUTES.superAdminPlatformMarketplaceSuppliers} label="Marketplace" />
              <NavItem href={APP_ROUTES.superAdminPlatformSupplierPortal} label="Supplier portal" />
              <NavGroupLabel>Connect</NavGroupLabel>
              <NavItem href={APP_ROUTES.superAdminPlatformIntegrations} label="Integrations" />
              <NavItem href={APP_ROUTES.superAdminPlatformSokoMind} label="SokoMind" />
              <NavGroupLabel>Ops</NavGroupLabel>
              <NavItem href={APP_ROUTES.superAdminPlatformDomains} label="Domains" />
              <NavItem href={APP_ROUTES.superAdminPlatformDesktopLicenses} label="Desktop licenses" />
              <NavItem href={APP_ROUTES.superAdminPlatformLogs} label="Logs" />
              <NavItem href={APP_ROUTES.superAdminPlatformLoadTest} label="Load test" icon={Gauge} />
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      </nav>

      <div className="mt-auto space-y-1 border-t border-border/60 p-3">
        <NavItem href={APP_ROUTES.superAdminSettings} label="Profile" icon={Settings2} />
        <div className="rounded-xl px-2.5 py-2">
          <p className="truncate text-sm font-medium text-foreground">{me?.name ?? "Signed in"}</p>
          <p className="truncate text-xs text-muted-foreground">{me?.email ?? "—"}</p>
          <button
            type="button"
            className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex min-h-[100dvh] bg-background">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-border/70",
            "bg-sidebar lg:flex",
          )}
        >
          {sidebarNav}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-[260px]">
          <header
            className={cn(
              "sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4",
              "bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75",
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

            <p className="min-w-0 flex-1 truncate text-sm font-medium lg:hidden">{currentLabel}</p>

            <nav className="hidden min-w-0 flex-1 items-center gap-1.5 text-sm lg:flex" aria-label="Breadcrumb">
              {crumbs.map((c, i) => (
                <React.Fragment key={`${c.label}-${i}`}>
                  {i > 0 ? (
                    <span className="text-muted-foreground/45" aria-hidden>
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
                    <span
                      className={cn(
                        "truncate",
                        i === crumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {c.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>

            <Link
              href={APP_ROUTES.superAdminSupport}
              aria-label={
                saSupportUnread > 0
                  ? `Support — ${saSupportUnread} unread message${saSupportUnread === 1 ? "" : "s"}`
                  : "Support inbox"
              }
              title={
                saSupportUnread > 0
                  ? `${saSupportUnread} unread support message${saSupportUnread === 1 ? "" : "s"}`
                  : "Support inbox"
              }
              className={cn(
                "relative inline-flex size-9 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                saSupportUnread > 0
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Headset className="size-4" aria-hidden />
              {saSupportUnread > 0 ? (
                <>
                  <span className="absolute right-1 top-1 flex size-2" aria-hidden>
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                  </span>
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                    {saSupportUnread > 9 ? "9+" : saSupportUnread}
                  </span>
                </>
              ) : null}
            </Link>

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
          </header>

          <main className="relative flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>

      {mobileNav ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(280px,88vw)] flex-col border-r border-border/70 bg-sidebar shadow-xl">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-2 z-10"
              aria-label="Close menu"
              onClick={closeMobile}
            >
              <X className="size-4" />
            </Button>
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
        description="Platform alerts will appear here."
      >
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="mb-3 size-7 text-muted-foreground/45" aria-hidden />
          <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Webhook failures, billing anomalies, and maintenance windows will show here when they fire.
          </p>
        </div>
      </SuperAdminDrawer>

      <DashboardToaster centered />
    </>
  );
}
