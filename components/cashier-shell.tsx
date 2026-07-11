"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Lock, MapPin } from "lucide-react";

import { PushNotificationsEnable } from "@/components/push-notifications-enable";
import { RealtimeConnectionIndicator } from "@/components/realtime-connection-indicator";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { ALL_DEPARTMENTS_LABEL } from "@/hooks/use-session-scope";
import { logoutRemote } from "@/lib/api";
import { posBrandThemeStyle } from "@/lib/brand-theme";
import { isBranchLockedRole } from "@/lib/branch-access";
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
    setBranchId,
    branchesLoading,
    itemTypes,
    itemTypeId,
    setItemTypeId,
    itemTypesLoading,
  } = useDashboard();

  const currentBranch = branches.find((b) => b.id === branchId);
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const branchLockedRole = isBranchLockedRole(roleKey);
  const scopeSelectClass =
    "h-7 max-w-[10.5rem] rounded-md border bg-background px-2 text-[11px] font-medium text-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50";

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
              <RealtimeConnectionIndicator />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {branchLockedRole ? (
                currentBranch ? (
                  <span
                    className="inline-flex h-7 max-w-[10.5rem] items-center gap-1 truncate rounded-md border bg-muted/30 px-2 text-[11px] font-medium text-muted-foreground"
                    title="Branch switching is disabled for your role"
                  >
                    <Lock className="size-3 shrink-0" aria-hidden />
                    <MapPin className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{currentBranch.name}</span>
                  </span>
                ) : branchesLoading ? (
                  <span className="text-[11px] text-muted-foreground">
                    Loading branch…
                  </span>
                ) : null
              ) : (
                <select
                  className={scopeSelectClass}
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={branchesLoading || branches.length === 0}
                  aria-label="Select branch"
                >
                  {branches.length === 0 ? (
                    <option value="">
                      {branchesLoading ? "Loading…" : "No branches"}
                    </option>
                  ) : (
                    <>
                      {!branchId ? (
                        <option value="">Select branch…</option>
                      ) : null}
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              )}

              <select
                className={scopeSelectClass}
                value={itemTypeId}
                onChange={(e) => setItemTypeId(e.target.value)}
                disabled={itemTypesLoading || itemTypes.length === 0}
                aria-label="Select department"
              >
                {itemTypes.length === 0 ? (
                  <option value="">
                    {itemTypesLoading ? "Loading…" : "No departments"}
                  </option>
                ) : (
                  <>
                    <option value="">{ALL_DEPARTMENTS_LABEL}</option>
                    {itemTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                        {t.isDefault ? " ★" : ""}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
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
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-3 sm:px-4 sm:py-4">
        {children}
      </main>
    </div>
  );
}
