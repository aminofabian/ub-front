"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { PharmacyClaims } from "@/components/pharmacy/pharmacy-claims";
import { PharmacyCompliance } from "@/components/pharmacy/pharmacy-compliance";
import { PharmacyControlledRegister } from "@/components/pharmacy/pharmacy-controlled-register";
import { PharmacyDispensingLog } from "@/components/pharmacy/pharmacy-dispensing-log";
import { PharmacyFollowUps } from "@/components/pharmacy/pharmacy-follow-ups";
import { PharmacyMedicines } from "@/components/pharmacy/pharmacy-medicines";
import { PharmacyOrdering } from "@/components/pharmacy/pharmacy-ordering";
import { PharmacyOverview } from "@/components/pharmacy/pharmacy-overview";
import { PharmacyPatients } from "@/components/pharmacy/pharmacy-patients";
import { PharmacyRecall } from "@/components/pharmacy/pharmacy-recall";
import { PharmacySettings } from "@/components/pharmacy/pharmacy-settings";
import { PharmacyStock } from "@/components/pharmacy/pharmacy-stock";
import { RX_INK, RX_MUTED, RX_RULE, errorText } from "@/components/pharmacy/pharmacy-ui";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  fetchPharmacyDashboard,
  type BatchSafetyView,
  type DispensingClass,
  type PharmacyDashboard,
} from "@/lib/pharmacy-api";
import { cn } from "@/lib/utils";

export type PharmacyTab =
  | "overview"
  | "medicines"
  | "stock"
  | "recall"
  | "dispensing"
  | "patients"
  | "followups"
  | "register"
  | "compliance"
  | "ordering"
  | "claims"
  | "settings";

/** Every section. The label is what the second row shows; the first row shows the group. */
const TABS: Array<{ key: PharmacyTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "medicines", label: "Medicines" },
  { key: "stock", label: "Stock safety" },
  { key: "recall", label: "Recall" },
  { key: "ordering", label: "Ordering" },
  { key: "dispensing", label: "Dispensing log" },
  { key: "patients", label: "Patients" },
  { key: "followups", label: "Follow-ups" },
  { key: "register", label: "Controlled register" },
  { key: "compliance", label: "Compliance" },
  { key: "claims", label: "Scheme claims" },
  { key: "settings", label: "Settings" },
];

/** Sections that are forms and short lists read better at a narrower measure than a full-width table. */
const NARROW = new Set<PharmacyTab>(["patients", "followups", "compliance", "settings"]);

/**
 * One line of navigation (DESIGN.md, operator shell): six groups on the first row, and the
 * sections of the open group on a quieter second row.
 */
const GROUPS: Array<{ key: string; label: string; tabs: PharmacyTab[] }> = [
  { key: "overview", label: "Overview", tabs: ["overview"] },
  { key: "medicines", label: "Medicines", tabs: ["medicines"] },
  { key: "stock", label: "Stock", tabs: ["stock", "recall", "ordering"] },
  { key: "dispensing", label: "Dispensing", tabs: ["dispensing", "patients", "followups", "register"] },
  { key: "records", label: "Records", tabs: ["compliance", "claims"] },
  { key: "settings", label: "Settings", tabs: ["settings"] },
];

export function PharmacyWorkspace() {
  const { loading, me, branchId } = useDashboard();
  const permissions = me?.permissions;
  const canView = hasPermission(permissions, Permission.CatalogItemsRead);
  const canManage = hasPermission(permissions, Permission.PharmacyManage);
  const canWriteStock = hasPermission(permissions, Permission.InventoryWrite);
  const canReadStock = hasPermission(permissions, Permission.InventoryRead);
  const canReadRecords = hasPermission(permissions, Permission.PharmacyRecordsRead);
  const canDispense = hasPermission(permissions, Permission.PharmacyDispense);
  const canOrder = hasPermission(permissions, Permission.PurchasingPathAWrite);
  const canManageClaims = hasPermission(permissions, Permission.PharmacyClaimsManage);

  // The open section lives in the address (?tab=), so the side menu can link to each one, the
  // browser's Back button moves between them, and a section can be bookmarked.
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedParam = searchParams.get("tab");
  const requestedTab: PharmacyTab = TABS.some((t) => t.key === requestedParam)
    ? (requestedParam as PharmacyTab)
    : "overview";
  const setTab = useCallback(
    (next: PharmacyTab) => {
      router.push(next === "overview" ? APP_ROUTES.pharmacy : `${APP_ROUTES.pharmacy}?tab=${next}`, {
        scroll: false,
      });
    },
    [router],
  );
  const [dashboard, setDashboard] = useState<PharmacyDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [medicineClass, setMedicineClass] = useState<DispensingClass | null>(null);
  const [stockView, setStockView] = useState<BatchSafetyView>("quarantined");
  const [focusKey, setFocusKey] = useState(0);

  const loadDashboard = useCallback(() => {
    fetchPharmacyDashboard(branchId || null)
      .then((d) => {
        setDashboard(d);
        setError(null);
      })
      .catch((err) => setError(errorText(err, "Could not load the pharmacy overview.")));
  }, [branchId]);

  useEffect(() => {
    if (loading || !canView) return;
    loadDashboard();
  }, [loading, canView, loadDashboard]);

  const openMedicines = (cls: DispensingClass | null) => {
    setMedicineClass(cls);
    setFocusKey((k) => k + 1);
    setTab("medicines");
  };

  const openStock = (view: BatchSafetyView) => {
    setStockView(view);
    setFocusKey((k) => k + 1);
    setTab("stock");
  };

  if (loading) {
    return <DashboardLoading label="Loading session…" />;
  }
  if (!canView) {
    return (
      <DashboardAccessDenied
        title="Pharmacy"
        description="You do not have access to this area."
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  const allTabs = TABS.filter((t) => {
    if (t.key === "stock") return canReadStock;
    if (t.key === "recall") return canWriteStock;
    if (t.key === "dispensing") return canReadRecords;
    if (t.key === "patients" || t.key === "followups" || t.key === "register") return canReadRecords;
    if (t.key === "compliance") return canDispense || canManage;
    if (t.key === "ordering") return canReadStock;
    if (t.key === "claims") return canReadRecords;
    return true;
  });
  const visibleKeys = new Set(allTabs.map((t) => t.key));
  // A link to a section this person may not open lands on the front page instead of a blank one.
  const tab: PharmacyTab = visibleKeys.has(requestedTab) ? requestedTab : "overview";
  const visibleGroups = GROUPS.filter((g) => g.tabs.some((t) => visibleKeys.has(t)));
  const activeGroup = visibleGroups.find((g) => g.tabs.includes(tab)) ?? visibleGroups[0];
  const subTabs = activeGroup ? allTabs.filter((t) => activeGroup.tabs.includes(t.key)) : [];
  const unclassified = dashboard?.medicines.unclassified ?? 0;
  const stockAlerts =
    (dashboard?.stock.quarantined ?? 0) +
    (dashboard?.stock.expired ?? 0) +
    (dashboard?.stock.medicineMissingDetails ?? 0);

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-3 px-3 pb-28 pt-3 sm:px-4 xl:pb-6")}>
      <header className="min-w-0">
        <h1 className={cn("font-serif text-[1.6rem] font-semibold leading-none tracking-[-0.01em]", RX_INK)}>
          Pharmacy
        </h1>
        <p className={cn("mt-1.5 max-w-[60ch] text-[13.5px]", RX_MUTED)}>
          Which products are medicines, what the till asks for before selling them, and the stock that
          needs attention.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Pharmacy sections"
        className={cn("flex h-11 items-stretch gap-1 overflow-x-auto border-b", RX_RULE)}
      >
        {visibleGroups.map((g) => {
          const active = g.key === activeGroup?.key;
          const count = g.key === "medicines" ? unclassified : g.key === "stock" ? stockAlerts : 0;
          return (
            <button
              key={g.key}
              type="button"
              role="tab"
              id={`rx-tab-${g.key}`}
              aria-selected={active}
              aria-controls="rx-panel"
              onClick={() => {
                const first = g.tabs.find((t) => visibleKeys.has(t));
                if (first) setTab(first);
                if (g.key === "overview") loadDashboard();
              }}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[14px] transition-colors",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]",
                active
                  ? "border-[var(--op-accent,#1d4b3b)] font-semibold text-[var(--op-accent,#1d4b3b)]"
                  : cn("border-transparent hover:text-[var(--op-ink,#121a16)]", RX_MUTED),
              )}
            >
              {g.label}
              {count > 0 ? (
                <span className="font-mono text-[12px] font-normal tabular-nums text-[#8A4129]">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {activeGroup && subTabs.length > 1 ? (
        <div
          role="tablist"
          aria-label={`${activeGroup.label} sections`}
          className="-mt-1 flex items-center gap-x-5 gap-y-1 overflow-x-auto"
        >
          {subTabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="rx-panel"
                onClick={() => setTab(t.key)}
                className={cn(
                  "inline-flex h-11 items-center whitespace-nowrap text-[13.5px] transition-colors sm:h-9",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]",
                  active
                    ? cn("font-semibold", RX_INK)
                    : cn("hover:text-[var(--op-ink,#121a16)]", RX_MUTED),
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <div
        role="tabpanel"
        id="rx-panel"
        aria-labelledby={activeGroup ? `rx-tab-${activeGroup.key}` : undefined}
        className={cn("flex flex-col gap-3", NARROW.has(tab) ? "max-w-[1080px]" : "")}
      >
        {tab === "overview" ? (
          <PharmacyOverview
            dashboard={dashboard}
            canReadStock={canReadStock}
            onOpenMedicines={openMedicines}
            onOpenStock={openStock}
            onOpenDispensing={() => setTab("dispensing")}
            onOpenSettings={() => setTab("settings")}
          />
        ) : null}
        {tab === "medicines" ? (
          <PharmacyMedicines
            key={`medicines-${focusKey}`}
            canManage={canManage}
            initialClass={medicineClass}
            onChanged={loadDashboard}
          />
        ) : null}
        {tab === "stock" && canReadStock ? (
          <PharmacyStock
            key={`stock-${focusKey}`}
            canWrite={canWriteStock}
            initialView={stockView}
            shortDatedDays={dashboard?.stock.shortDatedDays ?? 90}
            onChanged={loadDashboard}
          />
        ) : null}
        {tab === "recall" && canWriteStock ? <PharmacyRecall onChanged={loadDashboard} /> : null}
        {tab === "dispensing" && canReadRecords ? <PharmacyDispensingLog canDispense={canDispense} /> : null}
        {tab === "patients" && canReadRecords ? (
          <PharmacyPatients canWrite={canDispense || canManage} canManage={canManage} />
        ) : null}
        {tab === "followups" && canReadRecords ? <PharmacyFollowUps /> : null}
        {tab === "register" && canReadRecords ? <PharmacyControlledRegister /> : null}
        {tab === "compliance" && (canDispense || canManage) ? (
          <PharmacyCompliance canManage={canManage} canReadRecords={canReadRecords} />
        ) : null}
        {tab === "ordering" && canReadStock ? (
          <PharmacyOrdering canOrder={canOrder} canSplit={canWriteStock} canPickSupplier={canOrder || canDispense || canManage} />
        ) : null}
        {tab === "claims" && canReadRecords ? <PharmacyClaims canManage={canManageClaims} /> : null}
        {tab === "settings" ? <PharmacySettings canManage={canManage} onChanged={loadDashboard} /> : null}
      </div>
    </div>
  );
}
