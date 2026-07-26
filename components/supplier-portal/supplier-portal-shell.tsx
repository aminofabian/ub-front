"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";

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
      <div className="px-5 pt-7 pb-5">
        <p className="sp-serif text-[1.85rem] leading-none font-semibold tracking-tight text-white">
          Palmart
        </p>
        <p className="mt-1.5 text-[0.65rem] font-semibold tracking-[0.18em] text-[var(--sp-sidebar-muted)] uppercase">
          Supplier portal
        </p>
        {caps?.roleKey ? (
          <span className="mt-4 inline-flex rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[0.7rem] text-[var(--sp-sidebar-muted)]">
            Role · {roleLabel}
          </span>
        ) : null}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[0.62rem] font-semibold tracking-[0.16em] text-[var(--sp-sidebar-label)] uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2.5 rounded-full px-3 py-2 text-[0.92rem] transition",
                        active
                          ? "bg-[var(--sp-ochre)] font-medium text-white shadow-sm"
                          : "text-[var(--sp-sidebar-muted)] hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          active ? "bg-white" : "bg-current opacity-50",
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
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
      className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-[0.9rem] text-[var(--sp-sidebar-muted)] transition hover:bg-white/5 hover:text-white"
    >
      <LogOut className="size-3.5 opacity-70" />
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
    <div className="supplier-portal min-h-screen lg:flex">
      <aside className="hidden w-[15.5rem] shrink-0 bg-[var(--sp-forest)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <SidebarNav caps={caps} pathname={pathname} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[16rem] flex-col bg-[var(--sp-forest)] shadow-xl">
            <button
              type="button"
              aria-label="Close"
              className="absolute top-4 right-3 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-5" />
            </button>
            <SidebarNav caps={caps} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--sp-border)] bg-[var(--sp-cream)]/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-lg border border-[var(--sp-border)] bg-white p-2 text-[var(--sp-ink)]"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0">
            <p className="sp-serif truncate text-lg font-semibold leading-none">Palmart</p>
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[var(--sp-muted)] uppercase">
              Supplier portal
            </p>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
