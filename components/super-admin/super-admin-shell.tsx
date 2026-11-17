"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  Gauge,
  Headset,
  Inbox,
  LayoutDashboard,
  Mail,
  Menu,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Ticket,
  UsersRound,
  X,
} from "lucide-react";
import { Collapsible } from "radix-ui";

import { KioskLogoMark } from "@/components/brand/kiosk-logo-mark";
import { DashboardToaster } from "@/components/dashboard-sonner";
import { PlatformPaymentsDrawerBody } from "@/components/super-admin/platform-payments-list";
import { SuperAdminDrawer } from "@/components/super-admin/super-admin-drawer";
import { Button } from "@/components/ui/button";
import { useSaContactUnread } from "@/hooks/use-sa-contact-unread";
import { useSaPlatformPayments } from "@/hooks/use-sa-platform-payments";
import { useSaSupportUnread } from "@/hooks/use-sa-support-unread";
import { APP_ROUTES } from "@/lib/config";
import { getSuperAdminRealtimeClient } from "@/lib/realtime";
import {
  logoutSuperAdmin,
  fetchSuperAdminMe,
  saCanManageStaff,
  saCanSeeFullConsole,
  startSaSessionKeepAlive,
  type SuperAdminMe,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const NAV_IDLE =
  "text-[#5c5c5c] hover:bg-[#f4f4f4] hover:text-[#1a1a1a]";
const NAV_ACTIVE = "bg-[#1a3328] text-white";

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
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
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
        "flex items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-[13px] font-medium tracking-[-0.01em] transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-[#1a3328]/30",
        active ? NAV_ACTIVE : NAV_IDLE,
      )}
    >
      {Icon ? (
        <Icon
          className={cn("size-4 shrink-0", active ? "text-[#d7efe2]" : "text-[#7a7a7a]")}
          strokeWidth={1.75}
        />
      ) : (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            active ? "bg-[#d7efe2]" : "bg-[#c8c8c8]",
          )}
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge > 0 ? (
        <span
          className={cn(
            "inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
            active ? "bg-white/20 text-white" : "bg-[#1a3328] text-white",
          )}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

const SEARCH_PAGES: { href: string; label: string }[] = [
  { href: APP_ROUTES.superAdminDashboard, label: "Overview" },
  { href: APP_ROUTES.superAdminBusinesses, label: "Tenants" },
  { href: APP_ROUTES.superAdminPlatformSubscription, label: "Subscriptions" },
  { href: APP_ROUTES.superAdminAdoptions, label: "Adoptions" },
  { href: APP_ROUTES.superAdminCampaigns, label: "Campaigns" },
  { href: APP_ROUTES.superAdminMessages, label: "Messages" },
  { href: APP_ROUTES.superAdminSupport, label: "Support" },
  { href: APP_ROUTES.superAdminServing, label: "Serving" },
  { href: APP_ROUTES.superAdminSettings, label: "Profile" },
  { href: APP_ROUTES.superAdminPlatformPayments, label: "Payments" },
  { href: APP_ROUTES.superAdminPlatformLogs, label: "Logs" },
  { href: APP_ROUTES.superAdminPlatformDomains, label: "Domains" },
];

function ConsoleSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const matches = SEARCH_PAGES.filter((page) =>
    page.label.toLowerCase().includes(query.trim().toLowerCase()),
  ).slice(0, 6);

  return (
    <div className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]"
        strokeWidth={1.75}
        aria-hidden
      />
      <input
        value={query}
        placeholder="Type to search"
        aria-label="Search the console"
        className="h-9 w-full max-w-[420px] rounded-full border border-[#e6e6e6] bg-white pl-9 pr-3 text-[13px] tracking-[-0.01em] text-[#1a1a1a] outline-none placeholder:text-[#6b6b6b] focus:border-[#1a3328]"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && matches[0]) {
            router.push(matches[0].href);
            setQuery("");
            setOpen(false);
          }
        }}
      />
      {open && query.trim() && matches.length > 0 ? (
        <ul className="absolute left-0 top-[calc(100%+6px)] z-40 w-full max-w-[420px] overflow-hidden rounded-[12px] border border-[#eee] bg-white py-1 shadow-[0_12px_32px_-16px_rgba(20,20,20,0.35)]">
          {matches.map((page) => (
            <li key={page.href}>
              <button
                type="button"
                className="flex w-full px-3 py-1.5 text-left text-[13px] font-medium text-[#1a1a1a] hover:bg-[#f4f4f4]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  router.push(page.href);
                  setQuery("");
                  setOpen(false);
                }}
              >
                {page.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function NavGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pb-1 pt-3 text-[11px] font-medium text-[#6b6b6b]">{children}</p>
  );
}

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = React.useState<SuperAdminMe | null>(null);
  const [mobileNav, setMobileNav] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const [openPlatform, setOpenPlatform] = React.useState(() => isPlatformPath(pathname));

  // Live unread badge for the support inbox; the console keeps one shared
  // realtime socket open so the count updates everywhere, not just on the page.
  const saSupportUnread = useSaSupportUnread();
  const saMessagesUnread = useSaContactUnread();
  const platformPayments = useSaPlatformPayments({ notify: true });

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
    return startSaSessionKeepAlive();
  }, []);

  React.useEffect(() => {
    if (!accountOpen) return;
    const close = () => setAccountOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [accountOpen]);

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

  const fullConsole = saCanSeeFullConsole(me?.deskRole);
  const manageStaff = saCanManageStaff(me?.deskRole);
  const servingHome = APP_ROUTES.superAdminServing;

  React.useEffect(() => {
    if (!me) return;
    if (fullConsole) {
      return;
    }
    const onStaffPage = pathname === APP_ROUTES.superAdminServingStaff
      || pathname.startsWith(`${APP_ROUTES.superAdminServingStaff}/`);
    const allowed =
      !onStaffPage
      && (pathname === servingHome
        || pathname.startsWith(`${servingHome}/tickets`)
        || pathname === APP_ROUTES.superAdminSupport
        || pathname === APP_ROUTES.superAdminMessages
        || pathname === APP_ROUTES.superAdminSettings);
    if (!allowed) {
      router.replace(servingHome);
    }
  }, [me, fullConsole, pathname, router, servingHome]);

  const closeMobile = () => setMobileNav(false);

  const sidebarNav = (
    <div className="flex h-full flex-col">
      <div className="flex h-[72px] items-center px-4">
        <Link
          href={fullConsole ? APP_ROUTES.superAdminDashboard : servingHome}
          className="flex items-center gap-2 rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-[#1a3328]/30"
        >
          <KioskLogoMark size={22} plain />
          <span className="text-[15px] font-bold tracking-[-0.03em] text-[#1a1a1a]">
            Kiosk
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-3 pb-3" aria-label="Super admin">
        <NavItem href={APP_ROUTES.superAdminServing} label="Serving" icon={Ticket} match="prefix" />
        {manageStaff ? (
          <NavItem href={APP_ROUTES.superAdminServingStaff} label="Staff" icon={UsersRound} />
        ) : null}
        {!fullConsole ? (
          <>
            <NavItem
              href={APP_ROUTES.superAdminSupport}
              label="Support"
              icon={Headset}
              badge={saSupportUnread}
            />
            <NavItem
              href={APP_ROUTES.superAdminMessages}
              label="Messages"
              icon={Inbox}
              badge={saMessagesUnread}
            />
          </>
        ) : null}
        {fullConsole ? (
          <>
            <NavItem href={APP_ROUTES.superAdminDashboard} label="Overview" icon={LayoutDashboard} />
            <NavItem href={APP_ROUTES.superAdminBusinesses} label="Tenants" icon={Building2} match="prefix" />
            <NavItem href={APP_ROUTES.superAdminPlatformSubscription} label="Subscriptions" icon={CreditCard} />
            <NavItem href={APP_ROUTES.superAdminAdoptions} label="Adoptions" icon={Sparkles} />
            <NavItem href={APP_ROUTES.superAdminCampaigns} label="Campaigns" icon={Mail} match="prefix" />
            <NavItem
              href={APP_ROUTES.superAdminMessages}
              label="Messages"
              icon={Inbox}
              badge={saMessagesUnread}
            />
            <NavItem
              href={APP_ROUTES.superAdminSupport}
              label="Support"
              icon={Headset}
              badge={saSupportUnread}
            />
          </>
        ) : null}

        {fullConsole ? (
        <Collapsible.Root open={openPlatform} onOpenChange={setOpenPlatform} className="mt-2">
          <Collapsible.Trigger
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-[8px] px-2.5 py-[7px] text-left text-[13px] font-medium tracking-[-0.01em] transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-[#1a3328]/30",
              NAV_IDLE,
            )}
          >
            <span className="flex items-center gap-2.5">
              <Shield
                className={cn(
                  "size-4 shrink-0",
                  "text-[#7a7a7a]",
                )}
                strokeWidth={1.75}
                aria-hidden
              />
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
            <div className="pb-1 pl-1">
              <NavGroupLabel>Catalog</NavGroupLabel>
              <NavItem href={APP_ROUTES.superAdminPlatformGlobalCatalog} label="Global catalog" match="prefix" />
              <NavGroupLabel>Commerce</NavGroupLabel>
              <NavItem href={APP_ROUTES.superAdminPlatformPayments} label="Payments" />
              <NavItem href={APP_ROUTES.superAdminPlatformMarketplaceSuppliers} label="Marketplace" />
              <NavItem href={APP_ROUTES.superAdminPlatformSupplierPortal} label="Supplier portal" />
              <NavGroupLabel>Connect</NavGroupLabel>
              <NavItem href={APP_ROUTES.superAdminPlatformSignup} label="Signup" />
              <NavItem href={APP_ROUTES.superAdminPlatformIntegrations} label="Integrations" />
              <NavItem href={APP_ROUTES.superAdminPlatformEasyTax} label="EasyTax (eTIMS)" />
              <NavItem href={APP_ROUTES.superAdminPlatformWhatsApp} label="WhatsApp numbers" />
              <NavItem href={APP_ROUTES.superAdminPlatformMediaStorage} label="Media storage" />
              <NavItem href={APP_ROUTES.superAdminPlatformBranding} label="Branding" />
              <NavItem href={APP_ROUTES.superAdminPlatformSmsCredits} label="SMS credits & limits" />
              <NavItem href={APP_ROUTES.superAdminPlatformSokoMind} label="SokoMind" />
              <NavGroupLabel>Ops</NavGroupLabel>
              <NavItem href={APP_ROUTES.superAdminPlatformDomains} label="Domains" />
              <NavItem href={APP_ROUTES.superAdminPlatformDomainOffer} label="Domain offer" />
              <NavItem href={APP_ROUTES.superAdminPlatformDesktopLicenses} label="Desktop licenses" />
              <NavItem href={APP_ROUTES.superAdminPlatformLogs} label="Logs" />
              <NavItem href={APP_ROUTES.superAdminPlatformLoadTest} label="Load test" icon={Gauge} />
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
        ) : null}
      </nav>

      <div className="mt-auto space-y-0.5 px-3 pb-4">
        <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-[#6b6b6b]">Account</p>
        <NavItem href={APP_ROUTES.superAdminSettings} label="Profile" icon={Settings2} />
      </div>
    </div>
  );

  const email = me?.email?.trim() ?? "";
  const accountChip =
    email.length > 18 ? `${email.slice(0, 6)}…${email.slice(-4)}` : email || "Account";
  const initial = (me?.name?.trim() || email || "K").slice(0, 1).toUpperCase();

  return (
    <>
      <div className="sa-console min-h-[100dvh] bg-[#e6e6e6] p-2 sm:p-3 lg:p-4">
        <div className="flex min-h-[calc(100dvh-1rem)] overflow-hidden rounded-[22px] bg-white shadow-[0_1px_2px_rgba(20,20,20,0.04),0_18px_50px_-28px_rgba(20,20,20,0.35)] sm:min-h-[calc(100dvh-1.5rem)] lg:min-h-[calc(100dvh-2rem)]">
        <aside className="hidden w-[228px] shrink-0 flex-col border-r border-[#efefef] lg:flex">
          {sidebarNav}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[72px] shrink-0 items-center gap-3 px-4 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-[8px] lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu className="size-5" />
            </Button>

            <ConsoleSearch />

            <span
              className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-[#3c8f55] text-[12px] font-semibold text-white sm:inline-flex"
              aria-hidden
            >
              {initial}
            </span>

            <button
              type="button"
              className="relative inline-flex size-9 items-center justify-center rounded-full text-[#5c5c5c] outline-none hover:bg-[#f4f4f4] focus-visible:ring-2 focus-visible:ring-[#1a3328]/30"
              aria-label={
                platformPayments.unread > 0
                  ? `Till book — ${platformPayments.unread} new payment${platformPayments.unread === 1 ? "" : "s"}`
                  : "Till book"
              }
              title="Till book"
              onClick={() => setNotifOpen(true)}
            >
              <Bell className="size-4" strokeWidth={1.75} />
              {platformPayments.unread > 0 ? (
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#3c8f55]" />
              ) : null}
            </button>

            <div className="relative">
              <button
                type="button"
                className="inline-flex h-9 max-w-[180px] items-center gap-2 rounded-full border border-[#e4e4e4] bg-white px-2 pr-2.5 text-[12px] font-medium tracking-[-0.01em] text-[#1a1a1a] outline-none hover:bg-[#fafafa] focus-visible:ring-2 focus-visible:ring-[#1a3328]/30"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={(event) => {
                  event.stopPropagation();
                  setAccountOpen((open) => !open);
                }}
              >
                <span className="size-2 shrink-0 rounded-full bg-[#1a3328]" aria-hidden />
                <span className="truncate">{accountChip}</span>
                <ChevronDown className="size-3.5 shrink-0 text-[#6b6b6b]" aria-hidden />
              </button>
              {accountOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+6px)] z-40 w-52 rounded-[12px] border border-[#eee] bg-white p-1.5 shadow-[0_12px_32px_-16px_rgba(20,20,20,0.35)]"
                >
                  <p className="truncate px-2 py-1.5 text-[12px] font-semibold text-[#1a1a1a]">
                    {me?.name ?? "Signed in"}
                  </p>
                  <p className="truncate px-2 pb-1.5 text-[11px] text-[#6b6b6b]">{email || "—"}</p>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full rounded-[8px] px-2 py-1.5 text-left text-[13px] font-medium text-[#1a1a1a] hover:bg-[#f4f4f4]"
                    onClick={onSignOut}
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          <main className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-1 sm:px-6 lg:px-7">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
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
          <div className="absolute inset-y-0 left-0 flex w-[min(280px,88vw)] flex-col bg-white shadow-[0_18px_50px_-28px_rgba(20,20,20,0.45)]">
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
        onOpenChange={(open) => {
          setNotifOpen(open);
          if (!open) platformPayments.markSeen();
        }}
        title="Till book"
        description="Money paid to Kiosk — SMS credits, packages, domains, and float top-ups."
      >
        <PlatformPaymentsDrawerBody
          payments={platformPayments.payments}
          seenAt={platformPayments.seenAt}
        />
      </SuperAdminDrawer>

      <DashboardToaster centered />
    </>
  );
}
