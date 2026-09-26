"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  BookOpen,
  Building2,
  LayoutGrid,
  Lock,
  LockKeyhole,
  LogOut,
  MapPin,
  MonitorSmartphone,
  PackagePlus,
  Printer,
  Receipt,
  Settings2,
  ShoppingBag,
  Sparkles,
  Table2,
} from "lucide-react";

import { usePosTillLock } from "@/components/auth/pos-till-lock";
import { RegisterTillControl } from "@/components/auth/register-till-control";
import {
  CashierBottomNav,
  CashierMobileChromeProvider,
  MoreRow,
  MoreSection,
  useCashierMobileChrome,
} from "@/components/cashier/cashier-app-chrome";
import { CashierAdminCapabilitiesModal } from "@/components/cashier/cashier-admin-capabilities-modal";
import { CashierReceiptShopModal } from "@/components/cashier/cashier-receipt-shop-modal";
import { BranchRequiredBanner } from "@/components/branch-required-banner";
import { PosReadinessBanner } from "@/components/pos-readiness-banner";
import { PushNotificationsEnable } from "@/components/push-notifications-enable";
import { RealtimeConnectionIndicator } from "@/components/realtime-connection-indicator";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useFeatureFlags } from "@/components/providers/tenant-provider";
import { ALL_DEPARTMENTS_LABEL } from "@/hooks/use-session-scope";
import { logoutRemoteAndRedirectToLogin } from "@/lib/api";
import { posAccentThemeStyle, posBrandThemeStyle } from "@/lib/brand-theme";
import { isBranchLockedRole } from "@/lib/branch-access";
import {
  CASHIER_TEMPLATES,
  type CashierTemplateId,
} from "@/lib/cashier-templates";
import { APP_ROUTES } from "@/lib/config";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { OPEN_REGISTER_TILL_EVENT } from "@/lib/pos-guidance";
import { hasPermission, Permission } from "@/lib/permissions";
import { POS_CASHIER_CAPABILITY_FLAGS } from "@/lib/pos-cashier-capabilities";
import { usePosTillAccent } from "@/lib/pos-till-accent";
import {
  getOrCreateTillDeviceId,
  tillDeviceDisplayName,
} from "@/lib/till-device";
import { useCashierTemplate } from "@/hooks/use-cashier-template";
import { cn } from "@/lib/utils";

type CashierShellProps = {
  children: React.ReactNode;
};

export function CashierShell({ children }: CashierShellProps) {
  const router = useRouter();
  const pathname = usePathname();
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
    refreshBranches,
  } = useDashboard();
  const { lock: lockTill, locked: tillLocked } = usePosTillLock();
  const {
    isLedger: tillWantsLedger,
    preferred,
    effective,
    setTemplate,
    canPersistToTill,
    tillUpdateError,
    localPick,
    registeredTemplate,
    followTill,
  } = useCashierTemplate(branchId);
  const templateName = (id: CashierTemplateId | null) =>
    CASHIER_TEMPLATES.find((t) => t.id === id)?.name ?? "";
  const featureFlags = useFeatureFlags();
  const [capsOpen, setCapsOpen] = useState(false);
  const [receiptShopOpen, setReceiptShopOpen] = useState(false);
  const lastFlagRefreshAt = useRef(0);
  const [tillLabel, setTillLabel] = useState("");
  const cashierName = me?.name?.trim() || me?.email?.trim() || "";
  const onSupplierReceiveTill =
    pathname === APP_ROUTES.supplierDirectory ||
    pathname.startsWith(`${APP_ROUTES.supplierDirectory}/`);
  const isLedger = tillWantsLedger && !onSupplierReceiveTill;

  useEffect(() => {
    getOrCreateTillDeviceId();
    setTillLabel(tillDeviceDisplayName());
  }, []);

  const currentBranch = branches.find((b) => b.id === branchId);
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const branchLockedRole = isBranchLockedRole(roleKey);
  const canManageCashierCapabilities =
    hasPermission(me?.permissions, Permission.BusinessManageSettings) ||
    roleKey === "owner" ||
    roleKey === "admin";
  const showAdminBusinessLink =
    roleKey === "owner" ||
    roleKey === "admin" ||
    hasPermission(me?.permissions, Permission.BusinessManageSettings);
  const brandTheme = useMemo(
    () => posBrandThemeStyle(business?.branding ?? null),
    [business?.branding],
  );
  // A locally chosen till accent layers over the shop theme (device-local,
  // reversible from More → Till look).
  const { accent: tillAccent } = usePosTillAccent();
  const shellTheme = useMemo(
    () =>
      tillAccent
        ? ({ ...brandTheme, ...posAccentThemeStyle(tillAccent.hex) } as CSSProperties)
        : brandTheme,
    [brandTheme, tillAccent],
  );
  const scopeSelectClass = cn(
    "h-7 max-w-[10.5rem] rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
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

  // Butcher cashiers use /butcher, not the generic cashier — except supplier
  // receive tills, which reuse this shell.
  useEffect(() => {
    if (roleKey === "butcher_cashier" && !onSupplierReceiveTill) {
      router.replace(APP_ROUTES.butcher);
    }
  }, [roleKey, router, onSupplierReceiveTill]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (capsOpen) return;
      const now = Date.now();
      if (now - lastFlagRefreshAt.current < 15_000) return;
      lastFlagRefreshAt.current = now;
      void refreshSession();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refreshSession, capsOpen]);

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

  useEffect(() => {
    const onOpen = () => setCapsOpen(true);
    window.addEventListener("ub:open-till-settings", onOpen);
    return () => window.removeEventListener("ub:open-till-settings", onOpen);
  }, []);

  useEffect(() => {
    const onOpen = () => setReceiptShopOpen(true);
    window.addEventListener("ub:open-receipt-shop", onOpen);
    return () => window.removeEventListener("ub:open-receipt-shop", onOpen);
  }, []);

  /**
   * Template picker — the shelf (tiles) or the ledger (spreadsheet + keypad).
   * Saved against the registered till and this browser, so an owner can set a
   * counter till from their phone and it lands the next time it opens wide.
   */
  const templateMore = (
    <MoreSection label="Template">
      <div className="grid grid-cols-2 gap-1.5 px-2">
        {CASHIER_TEMPLATES.map((t) => {
          const saved = preferred === t.id;
          const live = effective === t.id;
          const Icon = t.id === "ledger" ? Table2 : LayoutGrid;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={saved}
              title={`${t.name} — ${t.blurb}`}
              onClick={() => void setTemplate(t.id as CashierTemplateId)}
              className={cn(
                "flex min-h-[4.75rem] flex-col items-start gap-1 border p-2 text-left transition-colors",
                saved
                  ? "border-[var(--pos-ink,#1c1915)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]"
                  : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)]",
                "dark:border-border/40",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center",
                  saved
                    ? "bg-[var(--pos-primary)] text-[var(--pos-primary-ink)]"
                    : "bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] text-muted-foreground",
                )}
                aria-hidden
              >
                <Icon className="size-4" />
              </span>
              <span className="w-full text-[11px] font-semibold leading-tight tracking-tight text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)]">
                {t.name}
              </span>
              <span className="w-full text-[9px] leading-snug text-muted-foreground">
                {t.blurb}
              </span>
              {live ? (
                <span className="mt-auto text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--pos-primary)]">
                  On this screen
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {registeredTemplate && localPick && registeredTemplate !== localPick ? (
        <div className="mx-2 mb-2 flex items-center justify-between gap-2 border border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_6%,transparent)] px-2 py-1.5">
          <span className="min-w-0 text-[9px] font-semibold uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
            This till is set to {templateName(registeredTemplate)}
          </span>
          <button
            type="button"
            onClick={followTill}
            className="shrink-0 text-[11px] font-semibold underline underline-offset-2 text-[var(--pos-primary)]"
          >
            Follow it
          </button>
        </div>
      ) : null}
      <p className="px-2 pb-2 pt-1.5 text-[9px] font-semibold uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
        {tillUpdateError
          ? `Saved on this device · till not updated — ${tillUpdateError}`
          : canPersistToTill
            ? "Saved to this till and this device"
            : "Saved on this device — an admin sets it for the whole till"}
      </p>
    </MoreSection>
  );

  const shellMore = (
    <>
      <section className="border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] first:border-t-0 dark:border-border/40">
        <h2 className="px-3 pb-1 pt-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:px-2.5">
          This register
        </h2>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 px-3 pb-2 text-[12px] sm:px-2.5">
          <dt className="text-muted-foreground">Branch</dt>
          <dd className="truncate text-right font-medium text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)]">
            {currentBranch?.name?.trim() ||
              (branchesLoading ? "Loading…" : "No branch picked")}
          </dd>
          <dt className="text-muted-foreground">Register</dt>
          <dd className="truncate text-right font-medium tabular-nums text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)]">
            {tillLabel || "Not registered"}
          </dd>
          <dt className="text-muted-foreground">Signed in</dt>
          <dd className="truncate text-right font-medium text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)]">
            {cashierName || "—"}
          </dd>
          <dt className="text-muted-foreground">Role</dt>
          <dd className="truncate text-right font-medium capitalize text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)]">
            {me?.role?.name?.trim() || roleKey || "—"}
          </dd>
        </dl>
      </section>
      <MoreSection label="This till">
        {canManageCashierCapabilities ? (
          <MoreRow
            icon={Settings2}
            onClick={() => {
              setCapsOpen(true);
            }}
          >
            Till settings
          </MoreRow>
        ) : null}
        <MoreRow
          icon={MonitorSmartphone}
          disabled={tillLocked || !branchId}
          onClick={() => {
            window.dispatchEvent(new Event(OPEN_REGISTER_TILL_EVENT));
          }}
        >
          Register till
        </MoreRow>
        {roleKey !== "cashier" ? (
          <MoreRow
            icon={Receipt}
            onClick={() => setReceiptShopOpen(true)}
          >
            Receipt details
          </MoreRow>
        ) : null}
      </MoreSection>
      {showAdminBusinessLink ? (
        <MoreSection label="Admin">
          <MoreRow icon={Building2} href={APP_ROUTES.business}>
            Business hub
          </MoreRow>
          <MoreRow icon={BookOpen} href={APP_ROUTES.paymentsDayLedger}>
            Ledger
          </MoreRow>
          <MoreRow icon={ShoppingBag} href={APP_ROUTES.sales}>
            Sales
          </MoreRow>
        </MoreSection>
      ) : roleKey !== "cashier" ? (
        <MoreSection label="Pages">
          <MoreRow icon={BookOpen} href={APP_ROUTES.paymentsDayLedger}>
            Ledger
          </MoreRow>
          <MoreRow icon={ShoppingBag} href={APP_ROUTES.sales}>
            Sales
          </MoreRow>
          <MoreRow icon={Building2} href={APP_ROUTES.business}>
            Business
          </MoreRow>
        </MoreSection>
      ) : null}
      <MoreSection label="Session">
        <MoreRow
          icon={LockKeyhole}
          disabled={tillLocked}
          onClick={() => lockTill({ reason: "manual" })}
        >
          Lock till
        </MoreRow>
        <MoreRow
          icon={LogOut}
          tone="leave"
          onClick={() => {
            void logoutRemoteAndRedirectToLogin().catch(() => undefined);
          }}
        >
          Log out
        </MoreRow>
      </MoreSection>
      <MoreSection label="Guides">
        <MoreRow icon={BookOpen} href={APP_ROUTES.helpOpenCashier}>
          Open a shift
        </MoreRow>
        <MoreRow icon={PackagePlus} href={APP_ROUTES.helpAddProducts}>
          Add products
        </MoreRow>
        <MoreRow icon={Printer} href={APP_ROUTES.helpInstallPrinter}>
          Install a receipt printer
        </MoreRow>
        <MoreRow icon={Sparkles} href={APP_ROUTES.helpKioskGuide}>
          Getting the most from Kiosk
        </MoreRow>
      </MoreSection>
    </>
  );

  return (
    <CashierMobileChromeProvider
      appearanceMore={templateMore}
      shellMore={<ShellMoreCloseOnNavigate>{shellMore}</ShellMoreCloseOnNavigate>}
    >
      <div
        className="relative flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden pos-market-paper"
        style={shellTheme}
      >
        <header
          className={cn(
            "shrink-0 z-10 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
            "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_92%,transparent)]",
            "dark:border-border/50 dark:bg-background/90",
            isLedger && "hidden",
          )}
        >
          {/* Phone: one toolbar row. Branch/dept sit here so they do not wrap
              into a second beige band under the shop name. */}
          <div className="flex h-11 items-center gap-1.5 px-2 lg:hidden">
            <span className="pos-market-section-label min-w-0 max-w-[28%] truncate text-[0.92rem] leading-none">
              {loading ? "Loading…" : business?.name?.trim() || "Cashier"}
            </span>
            <span
              className={cn(
                "size-1.5 shrink-0",
                online ? "bg-[var(--pos-primary)]" : "bg-amber-600",
              )}
              title={online ? "Online" : "Offline"}
              aria-label={online ? "Online" : "Offline"}
            />
            <div className="flex min-w-0 flex-1 items-center gap-1">
              {branchLockedRole ? (
                currentBranch ? (
                  <span
                    className="inline-flex h-8 min-w-0 flex-1 items-center gap-1 truncate border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-transparent px-1.5 text-[10px] font-medium text-muted-foreground"
                    title="Branch switching is disabled for your role"
                  >
                    <MapPin className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{currentBranch.name}</span>
                  </span>
                ) : branchesLoading ? (
                  <span className="text-[10px] text-muted-foreground">
                    Loading…
                  </span>
                ) : null
              ) : (
                <select
                  className={cn(scopeSelectClass, "h-8 max-w-none min-w-0 flex-1")}
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={branchesLoading || branches.length === 0}
                  aria-label="Select branch"
                  data-shell-branch-select=""
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
                className={cn(scopeSelectClass, "h-8 max-w-none min-w-0 flex-1")}
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
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-8 shrink-0 rounded-none border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-transparent shadow-none"
              disabled={tillLocked}
              onClick={() => lockTill({ reason: "manual" })}
              aria-label="Lock till"
            >
              <LockKeyhole className="size-3.5" aria-hidden />
            </Button>
          </div>

          <div className="mx-auto hidden w-full max-w-[1600px] items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4 lg:flex xl:flex-nowrap">
            <div className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-none lg:shrink-0">
              <span className="pos-market-section-label truncate text-[1.05rem] leading-none sm:text-lg">
                {loading ? "Loading…" : business?.name?.trim() || "Cashier"}
              </span>
              <div className="flex min-w-0 items-center gap-2">
                {(cashierName && !loading) || tillLabel ? (
                  <p
                    className="max-w-52 truncate text-[11px] font-medium text-muted-foreground"
                    title={[cashierName, tillLabel].filter(Boolean).join(" · ")}
                  >
                    {[cashierName && !loading ? cashierName : null, tillLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                    online
                      ? "border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)] text-[var(--pos-primary)]"
                      : "border-amber-700/25 bg-amber-100/80 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-none",
                      online ? "bg-[var(--pos-primary)]" : "bg-amber-600",
                    )}
                    aria-hidden
                  />
                  {online ? "Online" : "Offline"}
                </span>
                <RealtimeConnectionIndicator />
              </div>
            </div>

            <div className="flex w-auto flex-wrap items-center gap-2 border-l border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] pl-4">
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
                  data-shell-branch-select=""
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

            <div className="ml-auto hidden shrink-0 items-center gap-3 lg:flex">
              <div className="flex items-center gap-1">
                {canManageCashierCapabilities ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setCapsOpen(true)}
                  >
                    <Settings2 className="size-3.5" aria-hidden />
                    Till settings
                  </Button>
                ) : null}
                <RegisterTillControl
                  branchId={branchId}
                  disabled={tillLocked}
                  onRegistered={(label) => setTillLabel(label)}
                />
              </div>

              {roleKey !== "cashier" ? (
                <>
                  <div
                    className="h-5 w-px shrink-0 bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] dark:bg-border/60"
                    aria-hidden
                  />
                  <nav
                    className="flex items-center gap-0.5 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,white)] p-0.5 dark:border-border/60 dark:bg-background/40"
                    aria-label="Pages"
                  >
                    {(
                      [
                        {
                          href: APP_ROUTES.paymentsDayLedger,
                          label: "Ledger",
                        },
                        { href: APP_ROUTES.sales, label: "Sales" },
                        { href: APP_ROUTES.business, label: "Business" },
                      ] as const
                    ).map((item) => {
                      const active =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                      return (
                        <Button
                          key={item.href}
                          asChild
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 rounded-none px-3 text-xs shadow-none",
                            active
                              ? "bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] font-semibold text-foreground"
                              : "text-muted-foreground hover:bg-transparent hover:text-foreground",
                          )}
                        >
                          <Link href={item.href} aria-current={active ? "page" : undefined}>
                            {item.label}
                          </Link>
                        </Button>
                      );
                    })}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-none px-3 text-xs text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground"
                      onClick={() => setReceiptShopOpen(true)}
                    >
                      Receipt details
                    </Button>
                  </nav>
                </>
              ) : null}

              <div
                className="h-5 w-px shrink-0 bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] dark:bg-border/60"
                aria-hidden
              />
              <div className="flex items-center gap-2">
                <PushNotificationsEnable
                  label="Push alerts"
                  className="hidden sm:block"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-transparent text-xs shadow-none"
                  disabled={tillLocked}
                  onClick={() => lockTill({ reason: "manual" })}
                >
                  <LockKeyhole className="size-3.5" aria-hidden />
                  Lock till
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-transparent text-xs shadow-none"
                  onClick={() => {
                    void logoutRemoteAndRedirectToLogin().catch(() => undefined);
                  }}
                >
                  Log out
                </Button>
              </div>
            </div>
          </div>
        </header>
        <BranchRequiredBanner />
        <PosReadinessBanner />
        <main
          className={cn(
            "mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden",
            isLedger
              ? "max-w-none p-0"
              : "max-w-[1600px] px-1.5 py-0 sm:px-4 sm:py-2 lg:pb-2",
          )}
        >
          {children}
        </main>

        {!isLedger ? (
          <CashierBottomNav
            adminHref={showAdminBusinessLink ? APP_ROUTES.business : null}
            adminLabel="Business"
          />
        ) : null}

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
            weighedToggleEnabled={
              featureFlags[POS_CASHIER_CAPABILITY_FLAGS.weighedToggle] !== false
            }
            addPhotoEnabled={
              featureFlags[POS_CASHIER_CAPABILITY_FLAGS.addPhoto] === true
            }
            orderPadEnabled={
              featureFlags[POS_CASHIER_CAPABILITY_FLAGS.orderPad] !== false
            }
            orderConfirmEnabled={
              featureFlags[POS_CASHIER_CAPABILITY_FLAGS.orderConfirm] !== false
            }
            drawoutEnabled={
              featureFlags[POS_CASHIER_CAPABILITY_FLAGS.drawout] === true
            }
            drawoutAccess={business?.cashierDrawout}
            catalogHybridEnabled={
              featureFlags[POS_CASHIER_CAPABILITY_FLAGS.catalogHybrid] === true
            }
            branchId={branchId}
            onSaved={() => refreshSession()}
          />
        ) : null}

        {roleKey !== "cashier" ? (
          <CashierReceiptShopModal
            open={receiptShopOpen}
            onOpenChange={setReceiptShopOpen}
            brandTheme={brandTheme}
            shopName={business?.name?.trim() || ""}
            branchId={branchId}
            branchName={currentBranch?.name}
            branchAddress={currentBranch?.address}
            branchReceipt={currentBranch?.receipt}
            lastReceiptNo={business?.lastReceiptNo}
            nextReceiptNo={business?.nextReceiptNo}
            onSaved={async () => {
              await Promise.all([refreshSession(), refreshBranches()]);
            }}
          />
        ) : null}
      </div>
    </CashierMobileChromeProvider>
  );
}

/** Closes the More sheet when a shell row is activated. */
function ShellMoreCloseOnNavigate({ children }: { children: React.ReactNode }) {
  const chrome = useCashierMobileChrome();
  return (
    <div
      onClick={(e) => {
        const t = e.target as HTMLElement | null;
        if (t?.closest("a,button")) chrome?.closeMore();
      }}
    >
      {children}
    </div>
  );
}
