"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { PushNotificationsEnable } from "@/components/push-notifications-enable";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { logoutRemote } from "@/lib/api";
import { posBrandThemeStyle } from "@/lib/brand-theme";
import { APP_ROUTES } from "@/lib/config";
import { useOnlineStatus } from "@/hooks/use-online-status";

type CashierShellProps = {
  children: React.ReactNode;
};

export function CashierShell({ children }: CashierShellProps) {
  const router = useRouter();
  const online = useOnlineStatus();
  const {
    me,
    business,
    loading,
    branches,
    branchId,
    itemTypes,
    itemTypeId,
  } = useDashboard();

  const currentBranch = branches.find((b) => b.id === branchId);
  const currentItemType = itemTypes.find((t) => t.id === itemTypeId);
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";

  // Grocery clerks cannot use the cashier — bounce them back to their
  // workspace so they can generate invoices instead.
  useEffect(() => {
    if (roleKey === "grocery_clerk") {
      router.replace(APP_ROUTES.grocery);
    }
  }, [roleKey, router]);

  // Butcher cashiers use /butcher, not the generic cashier.
  useEffect(() => {
    if (roleKey === "butcher_cashier") {
      router.replace(APP_ROUTES.butcher);
    }
  }, [roleKey, router]);

  const brandTheme = useMemo(
    () => posBrandThemeStyle(business?.branding ?? null),
    [business?.branding],
  );

  const scopeLabel = useMemo(() => {
    const parts: string[] = [];
    if (currentBranch?.name?.trim()) parts.push(currentBranch.name.trim());
    if (itemTypeId?.trim()) {
      parts.push(currentItemType?.label?.trim() || "Department");
    } else {
      parts.push("All departments");
    }
    return parts.join(" · ");
  }, [currentBranch, currentItemType, itemTypeId]);

  return (
    <div className="flex min-h-full flex-col" style={brandTheme}>
      <header className="sticky top-0 z-10 border-b border-[color-mix(in_srgb,var(--pos-primary)_22%,transparent)] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold">
                {loading ? "Loading…" : business?.name?.trim() || "Cashier"}
              </span>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                  online
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-amber-100 text-amber-900"
                }`}
              >
                {online ? "Online" : "Offline"}
              </span>
            </div>
            {branchId ? (
              <span className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                {scopeLabel}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
              <Link href={APP_ROUTES.salesQuick}>Admin quick sale</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs"
            >
              <Link href={APP_ROUTES.business}>Full app</Link>
            </Button>
            <PushNotificationsEnable
              label="Push alerts"
              className="hidden sm:block"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 text-xs"
              onClick={() =>
                logoutRemote()
                  .catch(() => undefined)
                  .finally(() => {
                    router.replace(APP_ROUTES.login);
                  })
              }
            >
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-4 sm:px-4 md:max-w-3xl">
        {children}
      </main>
    </div>
  );
}
