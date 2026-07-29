"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  ClipboardList,
  Ellipsis,
  House,
  LogOut,
  MessageSquare,
  Package,
  Settings,
  Store,
  Truck,
  UserRound,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import {
  mktChip,
  mktChipActive,
  mktPosHeader,
  spAppHeader,
  spEyebrow,
  spShellBg,
  spTabBar,
  spTabItem,
  spTabItemActive,
} from "@/components/supplier-portal/supplier-portal-ui";
import { SupplierPortalSokoMindGuide } from "@/components/supplier-portal/supplier-portal-sokomind-guide";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalCapabilities,
  logoutSupplierPortal,
  type SupplierPortalCapabilities,
} from "@/lib/marketplace-api";
import { clearSupplierPortalSession, getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  money?: boolean;
  team?: boolean;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: APP_ROUTES.supplierPortalOverview, label: "Dashboard", icon: House },
      { href: APP_ROUTES.supplierPortalShops, label: "Shops", icon: Store },
    ],
  },
  {
    label: "Sell",
    items: [
      { href: APP_ROUTES.supplierPortalOrders, label: "Orders", icon: ClipboardList },
      { href: APP_ROUTES.supplierPortalDeliveries, label: "Deliveries", icon: Truck },
      { href: APP_ROUTES.supplierPortalCatalog, label: "Catalogue", icon: Package },
    ],
  },
  {
    label: "Get paid",
    items: [
      { href: APP_ROUTES.supplierPortalPayments, label: "Payments", money: true, icon: Wallet },
      { href: APP_ROUTES.supplierPortalInvoices, label: "Invoices", money: true, icon: ClipboardList },
      { href: APP_ROUTES.supplierPortalPaymentDetails, label: "Payout", money: true, icon: Wallet },
      { href: APP_ROUTES.supplierPortalStatements, label: "Statements", money: true, icon: ClipboardList },
      { href: APP_ROUTES.supplierPortalReports, label: "Reports", money: true, icon: ClipboardList },
    ],
  },
  {
    label: "Track",
    items: [
      { href: APP_ROUTES.supplierPortalMessages, label: "Messages", icon: MessageSquare },
      { href: APP_ROUTES.supplierPortalNotifications, label: "Alerts", icon: Bell },
      { href: APP_ROUTES.supplierPortalTeam, label: "Team", team: true, icon: Users },
      { href: APP_ROUTES.supplierPortalSettings, label: "Settings", icon: Settings },
      { href: APP_ROUTES.supplierPortalProfile, label: "Profile", icon: UserRound },
    ],
  },
];

const MOBILE_TABS = [
  {
    href: APP_ROUTES.supplierPortalOverview,
    label: "Home",
    icon: House,
    match: (pathname: string) => pathname === APP_ROUTES.supplierPortalOverview,
  },
  {
    href: APP_ROUTES.supplierPortalOrders,
    label: "Orders",
    icon: ClipboardList,
    match: (pathname: string) =>
      pathname.startsWith(APP_ROUTES.supplierPortalOrders) ||
      pathname.startsWith(APP_ROUTES.supplierPortalDeliveries),
  },
  {
    href: APP_ROUTES.supplierPortalCatalog,
    label: "Catalogue",
    icon: Package,
    match: (pathname: string) => pathname.startsWith(APP_ROUTES.supplierPortalCatalog),
  },
  {
    href: APP_ROUTES.supplierPortalNotifications,
    label: "Alerts",
    icon: Bell,
    match: (pathname: string) =>
      pathname.startsWith(APP_ROUTES.supplierPortalNotifications) ||
      pathname.startsWith(APP_ROUTES.supplierPortalMessages),
  },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function filterNavGroups(caps: SupplierPortalCapabilities | null): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!caps) return !item.money && !item.team;
      if (item.money && !caps.canViewMoney) return false;
      if (item.team && !caps.canManageTeam) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);
}

function titleForPath(pathname: string): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isActivePath(pathname, item.href)) return item.label;
    }
  }
  return "Supplier";
}

function SidebarNav({
  caps,
  pathname,
  onNavigate,
}: {
  caps: SupplierPortalCapabilities | null;
  pathname: string;
  onNavigate?: () => void;
}) {
  const groups = useMemo(() => filterNavGroups(caps), [caps]);
  const roleLabel = caps?.roleKey === "staff" ? "Staff" : "Owner";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-4 py-5">
        <div className="flex items-center gap-2.5">
          <KioskLogo size="sm" href={APP_ROUTES.supplierPortalOverview} />
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-heading)] text-lg leading-none font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
              Kiosk
            </p>
            <p className={cn(spEyebrow, "mt-1")}>Supplier portal</p>
          </div>
        </div>
        {caps?.roleKey ? (
          <span
            className={cn(
              mktChip,
              "mt-4 border-[var(--pos-primary,#0f766e)]/30 text-[var(--pos-primary,#0f766e)]",
            )}
          >
            Role · {roleLabel}
          </span>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group, index) => (
          <div key={group.label}>
            <div className={cn(mktPosHeader, "mb-2")}>
              <span>
                {index + 1} · {group.label}
              </span>
            </div>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        mktChip,
                        "w-full justify-start gap-2 px-2.5 py-1.5 text-[11px]",
                        active && mktChipActive,
                      )}
                    >
                      <Icon className="size-3.5 opacity-70" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] p-3">
        <LogoutButton />
      </div>
    </div>
  );
}

function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        logoutSupplierPortal();
        clearSupplierPortalSession();
        router.replace(APP_ROUTES.supplierPortalLogin);
      }}
      className={cn(
        mktChip,
        "w-full justify-start gap-2 px-2.5 py-1.5 text-[11px]",
        className,
      )}
    >
      <LogOut className="size-3 opacity-70" />
      Sign out
    </button>
  );
}

function MoreSheet({
  open,
  onClose,
  caps,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  caps: SupplierPortalCapabilities | null;
  pathname: string;
}) {
  const groups = useMemo(() => filterNavGroups(caps), [caps]);
  const roleLabel = caps?.roleKey === "staff" ? "Staff" : "Owner";

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_45%,transparent)] backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col",
          "border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
          "bg-[#faf8f4] shadow-[0_-12px_40px_rgba(28,25,21,0.18)]",
          "animate-in slide-in-from-bottom duration-300",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="More destinations"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="mx-auto h-1 w-10 rounded-full bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)]" />
        </div>
        <div className="flex items-start justify-between gap-3 px-4 pb-3">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-heading)] text-2xl leading-none font-semibold text-[var(--pos-ink,#1c1915)]">
              Kiosk
            </p>
            <p className={cn(spEyebrow, "mt-1.5")}>
              Supplier · {roleLabel}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-card p-2 text-muted-foreground active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 pb-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className={cn(spEyebrow, "mb-2 px-1")}>{group.label}</p>
              <ul className="overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--card)_96%,#f7f3eb)]">
                {group.items.map((item, index) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.href}
                      className={cn(
                        index > 0 &&
                          "border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]",
                      )}
                    >
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex min-h-12 items-center gap-3 px-3 py-2.5 active:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)]",
                          active && "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center border",
                            active
                              ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                              : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] text-[var(--pos-ink,#1c1915)]",
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span
                          className={cn(
                            "flex-1 text-sm font-medium",
                            active
                              ? "text-[var(--pos-primary,#0f766e)]"
                              : "text-[var(--pos-ink,#1c1915)]",
                          )}
                        >
                          {item.label}
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground/70" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <LogoutButton className="min-h-11 justify-center text-[12px]" />
        </nav>
      </div>
    </div>
  );
}

function MobileTabBar({
  pathname,
  moreActive,
  onMore,
}: {
  pathname: string;
  moreActive: boolean;
  onMore: () => void;
}) {
  const primaryActive = MOBILE_TABS.some((tab) => tab.match(pathname));

  return (
    <nav className={cn(spTabBar, "lg:hidden")} aria-label="Primary">
      <div className="flex items-stretch px-1 pt-1">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = !moreActive && tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(spTabItem, active && spTabItemActive)}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "relative flex size-8 items-center justify-center transition-transform",
                  active && "scale-105",
                )}
              >
                {active ? (
                  <span className="absolute inset-x-1.5 -top-1 h-0.5 bg-[var(--pos-primary,#0f766e)]" />
                ) : null}
                <Icon className="size-[1.15rem]" strokeWidth={active ? 2.4 : 1.9} aria-hidden />
              </span>
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className={cn(
            spTabItem,
            (moreActive || !primaryActive) && spTabItemActive,
          )}
          aria-expanded={moreActive}
          aria-label="More"
        >
          <span className="relative flex size-8 items-center justify-center">
            {(moreActive || !primaryActive) ? (
              <span className="absolute inset-x-1.5 -top-1 h-0.5 bg-[var(--pos-primary,#0f766e)]" />
            ) : null}
            <Ellipsis
              className="size-[1.15rem]"
              strokeWidth={moreActive || !primaryActive ? 2.4 : 1.9}
              aria-hidden
            />
          </span>
          More
        </button>
      </div>
    </nav>
  );
}

export function SupplierPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [caps, setCaps] = useState<SupplierPortalCapabilities | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const pageTitle = titleForPath(pathname);

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) return;
    void fetchSupplierPortalCapabilities()
      .then(setCaps)
      .catch(() => setCaps(null));
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <div className={cn(spShellBg, "flex flex-col lg:flex-row")}>
      <aside className="hidden w-[15.75rem] shrink-0 border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,#faf8f4_92%,transparent)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <SidebarNav caps={caps} pathname={pathname} />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col lg:min-h-screen">
        <header className={cn(spAppHeader, "lg:hidden")}>
          <div className="flex items-center gap-3 px-3.5 pb-2.5">
            <KioskLogo size="sm" href={APP_ROUTES.supplierPortalOverview} />
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-heading)] truncate text-[1.35rem] leading-none font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
                Kiosk
              </p>
              <p className={cn(spEyebrow, "mt-1 truncate")}>{pageTitle}</p>
            </div>
            <Link
              href={APP_ROUTES.supplierPortalProfile}
              aria-label="Profile"
              className="flex size-10 items-center justify-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_90%,#f7f3eb)] text-[var(--pos-ink,#1c1915)] active:scale-95"
            >
              <UserRound className="size-4" />
            </Link>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-7">
          {children}
        </main>

        <MobileTabBar
          pathname={pathname}
          moreActive={moreOpen}
          onMore={() => setMoreOpen(true)}
        />
      </div>

      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        caps={caps}
        pathname={pathname}
      />

      <SupplierPortalSokoMindGuide />
    </div>
  );
}
