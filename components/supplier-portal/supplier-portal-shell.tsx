"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import {
  mktChip,
  mktChipActive,
  mktPosHeader,
  spEyebrow,
  spShellBg,
} from "@/components/supplier-portal/supplier-portal-ui";
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
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: APP_ROUTES.supplierPortalOverview, label: "Dashboard" },
      { href: APP_ROUTES.supplierPortalShops, label: "Shops" },
    ],
  },
  {
    label: "Sell",
    items: [
      { href: APP_ROUTES.supplierPortalOrders, label: "Orders" },
      { href: APP_ROUTES.supplierPortalDeliveries, label: "Deliveries" },
      { href: APP_ROUTES.supplierPortalCatalog, label: "Catalogue" },
    ],
  },
  {
    label: "Get paid",
    items: [
      { href: APP_ROUTES.supplierPortalPayments, label: "Payments", money: true },
      { href: APP_ROUTES.supplierPortalInvoices, label: "Invoices", money: true },
      { href: APP_ROUTES.supplierPortalPaymentDetails, label: "Payout", money: true },
      { href: APP_ROUTES.supplierPortalStatements, label: "Statements", money: true },
      { href: APP_ROUTES.supplierPortalReports, label: "Reports", money: true },
    ],
  },
  {
    label: "Track",
    items: [
      { href: APP_ROUTES.supplierPortalMessages, label: "Messages" },
      { href: APP_ROUTES.supplierPortalNotifications, label: "Alerts" },
      { href: APP_ROUTES.supplierPortalTeam, label: "Team", team: true },
      { href: APP_ROUTES.supplierPortalSettings, label: "Settings" },
      { href: APP_ROUTES.supplierPortalProfile, label: "Profile" },
    ],
  },
];

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
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
  const groups = useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!caps) return !item.money && !item.team;
        if (item.money && !caps.canViewMoney) return false;
        if (item.team && !caps.canManageTeam) return false;
        return true;
      }),
    })).filter((group) => group.items.length > 0);
  }, [caps]);

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
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        mktChip,
                        "w-full justify-start px-2.5 py-1.5 text-[11px]",
                        active && mktChipActive,
                      )}
                    >
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

function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        logoutSupplierPortal();
        clearSupplierPortalSession();
        router.replace(APP_ROUTES.supplierPortalLogin);
      }}
      className={cn(mktChip, "w-full justify-start gap-2 px-2.5 py-1.5 text-[11px]")}
    >
      <LogOut className="size-3 opacity-70" />
      Sign out
    </button>
  );
}

export function SupplierPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [caps, setCaps] = useState<SupplierPortalCapabilities | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) return;
    void fetchSupplierPortalCapabilities()
      .then(setCaps)
      .catch(() => setCaps(null));
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className={cn(spShellBg, "lg:flex")}>
      <aside className="hidden w-[15.75rem] shrink-0 border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,#faf8f4_92%,transparent)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <SidebarNav caps={caps} pathname={pathname} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_40%,transparent)]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[16rem] flex-col border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[#faf8f4] shadow-xl">
            <button
              type="button"
              aria-label="Close"
              className="absolute top-3 right-3 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-card p-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-4" />
            </button>
            <SidebarNav caps={caps} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,#faf8f4_88%,transparent)] px-3 py-2.5 backdrop-blur-md lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            className="border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-card p-2 text-[var(--pos-ink,#1c1915)]"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-heading)] truncate text-lg leading-none font-semibold">
              Kiosk
            </p>
            <p className={spEyebrow}>Supplier portal</p>
          </div>
        </header>
        <main className="flex-1 px-3 py-5 sm:px-5 lg:px-7 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
