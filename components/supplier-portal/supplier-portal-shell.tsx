"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Settings,
  Store,
  Truck,
  User,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
  icon: typeof LayoutDashboard;
  money?: boolean;
  team?: boolean;
};

const NAV: NavItem[] = [
  { href: APP_ROUTES.supplierPortalOverview, label: "Dashboard", icon: LayoutDashboard },
  { href: APP_ROUTES.supplierPortalShops, label: "Shops", icon: Store, money: true },
  { href: APP_ROUTES.supplierPortalOrders, label: "Orders", icon: ClipboardList },
  { href: APP_ROUTES.supplierPortalDeliveries, label: "Deliveries", icon: Truck },
  { href: APP_ROUTES.supplierPortalPayments, label: "Payments", icon: Wallet, money: true },
  { href: APP_ROUTES.supplierPortalInvoices, label: "Invoices", icon: FileText, money: true },
  { href: APP_ROUTES.supplierPortalStatements, label: "Statements", icon: FileText, money: true },
  { href: APP_ROUTES.supplierPortalReports, label: "Reports", icon: FileBarChart, money: true },
  { href: APP_ROUTES.supplierPortalCatalog, label: "Catalogue", icon: Package },
  { href: APP_ROUTES.supplierPortalPaymentDetails, label: "Payout", icon: CreditCard, money: true },
  { href: APP_ROUTES.supplierPortalMessages, label: "Messages", icon: MessageSquare },
  { href: APP_ROUTES.supplierPortalNotifications, label: "Alerts", icon: Bell },
  { href: APP_ROUTES.supplierPortalTeam, label: "Team", icon: Users, team: true },
  { href: APP_ROUTES.supplierPortalSettings, label: "Settings", icon: Settings },
  { href: APP_ROUTES.supplierPortalProfile, label: "Profile", icon: User },
];

export function SupplierPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [caps, setCaps] = useState<SupplierPortalCapabilities | null>(null);

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) return;
    void fetchSupplierPortalCapabilities()
      .then(setCaps)
      .catch(() => setCaps(null));
  }, []);

  const navItems = useMemo(() => {
    // Until capabilities load, hide money/team — avoids flashing money nav for staff.
    if (!caps) {
      return NAV.filter((item) => !item.money && !item.team);
    }
    return NAV.filter((item) => {
      if (item.money && !caps.canViewMoney) return false;
      if (item.team && !caps.canManageTeam) return false;
      return true;
    });
  }, [caps]);

  const onLogout = () => {
    logoutSupplierPortal();
    clearSupplierPortalSession();
    router.replace(APP_ROUTES.supplierPortalLogin);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-background to-muted/30 dark:from-slate-950 dark:via-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Palmart
            </p>
            <h1 className="text-lg font-semibold">Supplier portal</h1>
            {caps?.roleKey ? (
              <p className="text-xs text-muted-foreground">
                Role: {caps.roleKey === "staff" ? "Staff" : "Owner"}
              </p>
            ) : null}
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="mr-2 size-4" />
            Sign out
          </Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
