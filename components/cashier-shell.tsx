"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Lock, MapPin, Settings2 } from "lucide-react";

import { CashierAdminCapabilitiesModal } from "@/components/cashier/cashier-admin-capabilities-modal";
import { PushNotificationsEnable } from "@/components/push-notifications-enable";
import { RealtimeConnectionIndicator } from "@/components/realtime-connection-indicator";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useFeatureFlags } from "@/components/providers/tenant-provider";
import { ALL_DEPARTMENTS_LABEL } from "@/hooks/use-session-scope";
import { logoutRemote } from "@/lib/api";
import { posBrandThemeStyle } from "@/lib/brand-theme";
import { isBranchLockedRole } from "@/lib/branch-access";
import { APP_ROUTES } from "@/lib/config";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { hasPermission, Permission } from "@/lib/permissions";
import { POS_CASHIER_CAPABILITY_FLAGS } from "@/lib/pos-cashier-capabilities";
import { cn } from "@/lib/utils";

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
    refreshSession,
  } = useDashboard();
  const featureFlags = useFeatureFlags();
  const [capsOpen, setCapsOpen] = useState(false);

  const currentBranch = branches.find((b) => b.id === branchId);
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const branchLockedRole = isBranchLockedRole(roleKey);
  const canManageCashierCapabilities =
    hasPermission(me?.permissions, Permission.BusinessManageSettings) ||
    roleKey === "owner" ||
    roleKey === "admin";
  const brandTheme = useMemo(
    () => posBrandThemeStyle(business?.branding ?? null),
    [business?.branding],
  );
  const scopeSelectClass = cn(
    "h-7 max-w-[10.5rem] border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
    "bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] px-2 text-[11px] font-medium text-foreground",
    "shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)]",
    "disabled:opacity-50 dark:bg-card/80",
  );

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

  // Lock document scroll for the life of the till — nested panes scroll instead.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  return (
    <div
      className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden pos-market-paper"
      style={brandTheme}
    >
      <header
        className={cn(
          "shrink-0 z-10 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
          "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_82%,transparent)] backdrop-blur-md",
          "supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_72%,transparent)]",
          "dark:border-border/50 dark:bg-background/90",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-3 py-1.5 sm:px-4">
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="pos-market-section-label truncate text-[1.05rem] leading-none sm:text-lg">
                {loading ? "Loading…" : business?.name?.trim() || "Cashier"}
              </span>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                  online
                    ? "border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)] text-[var(--pos-primary)]"
                    : "border-amber-700/25 bg-amber-100/80 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    online ? "bg-[var(--pos-primary)]" : "bg-amber-600",
                  )}
                  aria-hidden
                />
                {online ? "Online" : "Offline"}
              </span>
              <RealtimeConnectionIndicator />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {branchLockedRole ? (
                currentBranch ? (
                  <span
                    className="inline-flex h-7 max-w-[10.5rem] items-center gap-1 truncate border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-transparent px-2 text-[11px] font-medium text-muted-foreground"
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
          <div className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-1">
            {canManageCashierCapabilities ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setCapsOpen(true)}
              >
                <Settings2 className="size-3.5" aria-hidden />
                Till settings
              </Button>
            ) : null}
            <div className="mx-0.5 hidden h-4 w-px bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] sm:block dark:bg-border/60" aria-hidden />
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Link href={APP_ROUTES.salesQuick}>Admin sale</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Link href={APP_ROUTES.business}>Full app</Link>
            </Button>
            <PushNotificationsEnable
              label="Push alerts"
              className="hidden sm:block"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-transparent text-xs shadow-none"
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
      <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden px-3 py-1.5 sm:px-4 sm:py-2">
        {children}
      </main>

      {canManageCashierCapabilities ? (
        <CashierAdminCapabilitiesModal
          open={capsOpen}
          onOpenChange={setCapsOpen}
          brandTheme={brandTheme}
          priceEditEnabled={
            featureFlags[POS_CASHIER_CAPABILITY_FLAGS.priceEdit] === true
          }
          createProductEnabled={
            featureFlags[POS_CASHIER_CAPABILITY_FLAGS.createProduct] === true
          }
          onSaved={() => refreshSession()}
        />
      ) : null}
    </div>
  );
}
