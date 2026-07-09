"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, LayoutDashboard, LogOut, Package, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { logoutSupplierPortal } from "@/lib/marketplace-api";
import { clearSupplierPortalSession } from "@/lib/supplier-portal-session";
import { cn } from "@/lib/utils";

const NAV = [
  { href: APP_ROUTES.supplierPortalOverview, label: "Overview", icon: LayoutDashboard },
  { href: APP_ROUTES.supplierPortalProfile, label: "Profile", icon: User },
  { href: APP_ROUTES.supplierPortalCatalog, label: "Catalogue", icon: Package },
  { href: APP_ROUTES.supplierPortalOrders, label: "Orders", icon: ClipboardList },
] as const;

export function SupplierPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

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
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="mr-2 size-4" />
            Sign out
          </Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
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
