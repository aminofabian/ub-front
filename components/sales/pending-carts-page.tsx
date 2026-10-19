"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Clock,
  Loader2,
  RefreshCw,
  Search,
  ShoppingCart,
  User,
  X,
  ArrowUpRight,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  dashboardFilterFieldLabelClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import {
  salesHair,
  salesHairDivide,
  salesInk,
  salesMute,
  salesPaper,
  salesSurface,
  SalesMetricTile,
  SalesStage,
  salesToolBtnClass,
} from "@/components/sales/sales-surface";
import { Button } from "@/components/ui/button";
import { FilterSheet, FilterSheetTrigger } from "@/components/ui/filter-sheet";
import { useDashboard } from "@/components/dashboard-provider";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { useFeatureFlag } from "@/components/providers/tenant-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  cancelPosDraft,
  fetchPosDraft,
  fetchPosDraftAudit,
  listPosDrafts,
  POS_DRAFT_FLAGS,
  PosDraftApiError,
  type PosDraftAuditEntry,
  type PosDraftResponse,
  type PosDraftStatus,
  type PosDraftSummaryResponse,
} from "@/lib/pos-draft-api";
import { usePosDraftEvents } from "@/hooks/use-pos-draft-events";

type StatusTab = PosDraftStatus | "all";

const STATUS_TABS: Array<{ label: string; value: StatusTab }> = [
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const HOURS_OPTIONS = [
  { label: "Last 24 hours", value: 24 },
  { label: "Last 48 hours", value: 48 },
  { label: "Last 7 days", value: 168 },
];

const STALE_MINUTES = 30;

function StatusBadge({ status }: { status: PosDraftStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        status === "pending" &&
          "bg-amber-500/15 text-amber-900 dark:text-amber-200",
        status === "completed" &&
          "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
        status === "cancelled" && "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isStale(updatedAt: string, nowMs: number): boolean {
  const t = new Date(updatedAt).getTime();
  if (Number.isNaN(t)) return false;
  return nowMs - t > STALE_MINUTES * 60_000;
}

function fmtKes(n: number, currency: string): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE_DRAFT: "Cart created",
  ADD_LINE: "Line added",
  UPDATE_LINE: "Line updated",
  REMOVE_LINE: "Line removed",
  CANCEL: "Cart cancelled",
  COMPLETE: "Payment completed",
};

type AuditLinePayload = {
  itemId?: string;
  itemName?: string;
  qty?: number | string;
  unitPrice?: number | string;
  saleId?: string;
};

function formatAuditAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

function parseAuditPayload(
  raw: string | null | undefined,
): AuditLinePayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as AuditLinePayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function resolveAuditItemName(
  payload: AuditLinePayload | null,
  itemNamesById: Map<string, string>,
): string | null {
  const fromPayload = payload?.itemName?.trim();
  if (fromPayload) return fromPayload;
  const itemId = payload?.itemId?.trim();
  if (!itemId) return null;
  return itemNamesById.get(itemId) ?? null;
}

function formatAuditLineDetail(
  raw: string | null | undefined,
  currency: string,
  itemNamesById: Map<string, string>,
): string | null {
  if (!raw?.trim()) return null;
  const payload = parseAuditPayload(raw);
  if (!payload) return raw;

  if (payload.saleId) {
    return `Sale ${payload.saleId}`;
  }

  const name = resolveAuditItemName(payload, itemNamesById);
  const qty = Number(payload.qty);
  const unitPrice = Number(payload.unitPrice);
  const hasQty = Number.isFinite(qty);
  const hasPrice = Number.isFinite(unitPrice);

  if (name && hasQty && hasPrice) {
    return `${name} · ${qty} × ${fmtKes(unitPrice, currency)}`;
  }
  if (name && hasQty) {
    return `${name} · qty ${qty}`;
  }
  if (name) return name;
  if (hasQty && hasPrice) {
    return `${qty} × ${fmtKes(unitPrice, currency)}`;
  }
  return raw;
}

function formatAuditChange(
  entry: PosDraftAuditEntry,
  currency: string,
  itemNamesById: Map<string, string>,
): string | null {
  const before = formatAuditLineDetail(entry.oldValue, currency, itemNamesById);
  const after = formatAuditLineDetail(entry.newValue, currency, itemNamesById);
  if (before && after) return `${before} → ${after}`;
  return after ?? before;
}

function buildItemNameMap(
  lines: PosDraftResponse["lines"] | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of lines ?? []) {
    const id = line.itemId?.trim();
    const name = line.itemName?.trim();
    if (id && name) map.set(id, name);
  }
  return map;
}

export function PendingCartsPage() {
  const { me, business, branches, branchId } = useDashboard();
  const online = useOnlineStatus();
  const posDraftsEnabled = useFeatureFlag(POS_DRAFT_FLAGS.enabled);
  const posDraftsUi = useFeatureFlag(POS_DRAFT_FLAGS.uiVisible);
  const featureOn = posDraftsEnabled || posDraftsUi;

  const canRead = hasPermission(me?.permissions, Permission.PosDraftsRead);
  const canCancelAny = hasPermission(
    me?.permissions,
    Permission.PosDraftsCancelAny,
  );
  const canCancelOwn = hasPermission(
    me?.permissions,
    Permission.PosDraftsCancelOwn,
  );
  const myId = me?.id?.trim() ?? "";

  const currency = business?.currency?.trim() || "KES";
  const branchName = branches.find((b) => b.id === branchId)?.name ?? "Branch";

  const [statusTab, setStatusTab] = useState<StatusTab>("pending");
  const [hoursBack, setHoursBack] = useState(48);
  const [cashierFilter, setCashierFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [staleOnly, setStaleOnly] = useState(false);
  const [drafts, setDrafts] = useState<PosDraftSummaryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PosDraftResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [auditEntries, setAuditEntries] = useState<PosDraftAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditItemNames, setAuditItemNames] = useState<Map<string, string>>(
    () => new Map(),
  );

  const loadDrafts = useCallback(async () => {
    const bid = branchId?.trim();
    if (!bid || !online || !featureOn) return;
    setLoading(true);
    try {
      const statuses: PosDraftStatus[] =
        statusTab === "all"
          ? ["pending", "completed", "cancelled"]
          : [statusTab];
      const batches = await Promise.all(
        statuses.map((status) =>
          listPosDrafts({ branchId: bid, status, hoursBack }),
        ),
      );
      const merged = batches.flatMap((b) => b.drafts ?? []);
      merged.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setDrafts(merged);
      setLastUpdated(new Date());
    } catch (e) {
      toast.error(
        e instanceof PosDraftApiError
          ? e.message
          : "Could not load pending sales",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId, online, featureOn, statusTab, hoursBack]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  // ── Realtime subscription: live refresh on draft events ──
  usePosDraftEvents({
    onCreated: () => {
      if (statusTab === "pending") void loadDrafts();
    },
    onUpdated: (frame) => {
      if (statusTab === "pending") void loadDrafts();
      // Refresh detail drawer if the updated draft is currently open
      const updatedDraftId = String(frame.data?.draftId ?? "");
      if (updatedDraftId && updatedDraftId === selectedId) {
        void fetchPosDraft(updatedDraftId)
          .then(setDetail)
          .catch(() => {});
        void fetchPosDraft(updatedDraftId, { includeDeleted: true })
          .then((full) => setAuditItemNames(buildItemNameMap(full.lines)))
          .catch(() => {});
        void fetchPosDraftAudit(updatedDraftId)
          .then(setAuditEntries)
          .catch(() => {});
      }
    },
    onCancelled: (frame) => {
      const ticket = frame.data?.ticketNumber;
      toast.info(
        ticket
          ? `Ticket #${ticket} voided — cleared from tills`
          : "A pending sale was voided",
      );
      void loadDrafts();
      // Close detail drawer if the cancelled draft is currently open
      const cancelledDraftId = String(frame.data?.draftId ?? "");
      if (cancelledDraftId && cancelledDraftId === selectedId) {
        closeDetail();
      }
    },
    onCompleted: (frame) => {
      const ticket = frame.data?.ticketNumber;
      toast.success(
        ticket ? `Ticket #${ticket} paid` : "A pending sale was completed",
      );
      void loadDrafts();
      // Close detail drawer if the completed draft is currently open
      const completedDraftId = String(frame.data?.draftId ?? "");
      if (completedDraftId && completedDraftId === selectedId) {
        closeDetail();
      }
    },
  });

  const cashierOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of drafts) {
      if (!map.has(d.createdBy)) {
        map.set(d.createdBy, d.createdByName?.trim() || "Staff");
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [drafts]);

  const nowMs = Date.now();

  const filteredDrafts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return drafts.filter((d) => {
      if (cashierFilter && d.createdBy !== cashierFilter) return false;
      if (staleOnly && d.status === "pending" && !isStale(d.updatedAt, nowMs)) {
        return false;
      }
      if (!q) return true;
      const ticket = String(d.ticketNumber);
      const name = (d.createdByName ?? "").toLowerCase();
      return ticket.includes(q) || name.includes(q);
    });
  }, [drafts, cashierFilter, staleOnly, searchQuery, nowMs]);

  const summary = useMemo(() => {
    const pending = drafts.filter((d) => d.status === "pending");
    const stale = pending.filter((d) => isStale(d.updatedAt, nowMs));
    const filteredTotal = filteredDrafts.reduce(
      (sum, d) => sum + Number(d.grandTotal),
      0,
    );
    const filteredItems = filteredDrafts.reduce(
      (sum, d) => sum + Number(d.lineCount),
      0,
    );
    return {
      pendingCount: pending.length,
      staleCount: stale.length,
      filteredCount: filteredDrafts.length,
      filteredTotal,
      filteredItems,
    };
  }, [drafts, filteredDrafts, nowMs]);

  const hasActiveFilters =
    cashierFilter !== "" ||
    searchQuery.trim() !== "" ||
    staleOnly ||
    statusTab !== "pending";

  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    setAuditEntries([]);
    setAuditItemNames(new Map());
    setAuditLoading(true);
    try {
      const [full, withDeleted] = await Promise.all([
        fetchPosDraft(id),
        fetchPosDraft(id, { includeDeleted: true }).catch(() => null),
      ]);
      setDetail(full);
      setAuditItemNames(buildItemNameMap(withDeleted?.lines ?? full.lines));
    } catch (e) {
      toast.error(
        e instanceof PosDraftApiError ? e.message : "Could not load details",
      );
      setSelectedId(null);
      return;
    } finally {
      setDetailLoading(false);
    }
    try {
      const audit = await fetchPosDraftAudit(id);
      setAuditEntries(audit);
    } catch {
      // Audit log is best-effort — drawer works without it
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setAuditEntries([]);
    setAuditItemNames(new Map());
  }, []);

  const handleCancel = useCallback(async () => {
    if (!detail || detail.status !== "pending") return;
    const isOwn = detail.createdBy === myId;
    if (!canCancelAny && !(canCancelOwn && isOwn)) {
      toast.error("You cannot void this sale.");
      return;
    }
    const draft = detail;
    showThemedConfirmToast({
      id: `void-admin-pending-${draft.id}`,
      title: `Void sale #${draft.ticketNumber}?`,
      description:
        "This voids the sale for every till — no tab, no resume. Audit keeps a cancelled record.",
      confirmLabel: "Void sale",
      confirmVariant: "destructive",
      onConfirm: async () => {
        setCancelling(true);
        try {
          await cancelPosDraft(draft.id, "Voided from admin list");
          toast.success(`Sale #${draft.ticketNumber} voided`, {
            description: "Wiped from every till — no tab, no resume.",
          });
          closeDetail();
          void loadDrafts();
        } catch (e) {
          toast.error(
            e instanceof PosDraftApiError ? e.message : "Could not void sale",
          );
        } finally {
          setCancelling(false);
        }
      },
    });
  }, [detail, canCancelAny, canCancelOwn, myId, closeDetail, loadDrafts]);

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Pending sales"
        description={
          <>
            You need <code className="text-xs">{Permission.PosDraftsRead}</code>{" "}
            to view pending POS sales.
          </>
        }
        backHref={APP_ROUTES.sales}
        backLabel="Sales"
      />
    );
  }

  if (!featureOn) {
    return (
      <div className={cn(DASHBOARD_MAX, salesPaper, "py-8")}>
        <section className={cn(salesSurface, "p-6")}>
          <h1 className={cn("text-xl font-semibold tracking-tight", salesInk)}>
            Pending sales
          </h1>
          <p className={cn("mt-2 text-sm", salesMute)}>
            POS draft persistence is not enabled for this business. Open{" "}
            <Link
              href={APP_ROUTES.business}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Business settings
            </Link>
            , edit settings, and turn on{" "}
            <span className={cn("font-medium", salesInk)}>Cashier POS drafts</span>
            .
          </p>
        </section>
      </div>
    );
  }

  const resetFilters = () => {
    setHoursBack(48);
    setCashierFilter("");
    setStaleOnly(false);
  };

  // Rendered inline on `sm+`; on phones it moves into the filter sheet (§4.5).
  const filterFields = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
      <label className="block space-y-1.5">
        <span className={dashboardFilterFieldLabelClass()}>Time range</span>
        <select
          value={hoursBack}
          onChange={(e) => setHoursBack(Number(e.target.value))}
          className={dashboardSelectClass()}
        >
          {HOURS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className={dashboardFilterFieldLabelClass()}>Cashier</span>
        <select
          value={cashierFilter}
          onChange={(e) => setCashierFilter(e.target.value)}
          className={dashboardSelectClass()}
        >
          <option value="">All cashiers</option>
          {cashierOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end sm:col-span-2 lg:col-span-1">
        <button
          type="button"
          onClick={() => setStaleOnly((value) => !value)}
          aria-pressed={staleOnly}
          className={cn(
            "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors lg:h-auto lg:py-2 sm:w-auto",
            staleOnly
              ? "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100"
              : cn(
                  salesHair,
                  "bg-white",
                  salesMute,
                  "hover:text-[var(--order-ink,#15231f)]",
                ),
          )}
        >
          <Clock className="size-4 shrink-0" aria-hidden />
          Stale only ({STALE_MINUTES}+ min)
        </button>
      </div>
    </div>
  );

  return (
    <div className={cn(DASHBOARD_MAX, salesPaper)}>
      <header className="flex flex-wrap items-center justify-between gap-1">
        <DashboardPageHero
          compact
          showActiveScope
          icon={ShoppingCart}
          eyebrow="Sales & POS"
          title="Pending sales"
          description={
            <>
              In-progress register carts at{" "}
              <span className={cn("font-medium", salesInk)}>{branchName}</span>
              {lastUpdated ? (
                <>
                  {" "}
                  · Updated{" "}
                  {lastUpdated.toLocaleTimeString("en-KE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              ) : null}
            </>
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <Link href={APP_ROUTES.cashier} className={salesToolBtnClass()}>
            Open cashier
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
          <button
            type="button"
            disabled={loading || !online}
            onClick={() => void loadDrafts()}
            className={salesToolBtnClass()}
          >
            <RefreshCw
              className={cn("size-3.5", loading && "animate-spin")}
              aria-hidden
            />
            Refresh
          </button>
        </div>
      </header>

      {!online ? (
        <DashboardFeedback
          kind="warning"
          text="Offline — the list may be stale until your connection returns."
        />
      ) : null}

      <div className={cn(salesSurface, "overflow-hidden")}>
        <div
          className={cn(
            "grid sm:grid-cols-2 lg:grid-cols-4",
            salesHair,
            "border-b",
          )}
        >
          <SalesMetricTile
            label="Pending now"
            value={summary.pendingCount.toLocaleString("en-KE")}
            hint={
              summary.staleCount > 0
                ? `${summary.staleCount} idle ${STALE_MINUTES}+ min`
                : "Active register carts"
            }
          />
          <SalesMetricTile
            label="In view"
            value={summary.filteredCount.toLocaleString("en-KE")}
            hint={
              hasActiveFilters
                ? "Matching current filters"
                : `${STATUS_TABS.find((t) => t.value === statusTab)?.label ?? "All"} tab`
            }
            className={cn("border-t sm:border-l sm:border-t-0", salesHair)}
          />
          <SalesMetricTile
            label="Line items"
            value={summary.filteredItems.toLocaleString("en-KE")}
            hint="Across filtered sales"
            className={cn("border-t lg:border-l lg:border-t-0", salesHair)}
          />
          <SalesMetricTile
            label="Cart value"
            value={fmtKes(summary.filteredTotal, currency)}
            hint={`Last ${hoursBack === 168 ? "7 days" : `${hoursBack} hours`}`}
            className={cn("border-t sm:border-l sm:border-t-0 lg:border-l", salesHair)}
          />
        </div>
      </div>

      <SalesStage
        title="Register carts"
        hint="Search, filter, and open a parked sale."
        bodyClassName="space-y-0 p-0 sm:p-0"
      >
        <div className={cn("border-b px-3.5 py-3 sm:px-4", salesHair)}>
          <div className="relative min-w-0">
            <Search
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2",
                salesMute,
              )}
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket # or cashier name…"
              className={cn(dashboardInputClass(), "pl-9")}
              aria-label="Search pending sales"
            />
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col gap-4 border-b px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4",
            salesHair,
          )}
        >
          <div
            className={cn(
              "inline-flex w-full rounded-full p-1 sm:w-auto",
              salesHair,
              "border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]",
            )}
            role="tablist"
            aria-label="Sale status"
          >
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={statusTab === tab.value}
                onClick={() => setStatusTab(tab.value)}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors sm:flex-none",
                  statusTab === tab.value
                    ? "bg-white text-[var(--order-ink,#15231f)] shadow-sm ring-1 ring-black/[0.04]"
                    : cn(salesMute, "hover:text-[var(--order-ink,#15231f)]"),
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className={cn("text-xs", salesMute)}>
            {filteredDrafts.length.toLocaleString("en-KE")} result
            {filteredDrafts.length === 1 ? "" : "s"}
            {hasActiveFilters && drafts.length !== filteredDrafts.length ? (
              <span> · {drafts.length.toLocaleString("en-KE")} loaded</span>
            ) : null}
          </p>
          <FilterSheetTrigger
            className="w-full justify-center sm:hidden"
            activeCount={hasActiveFilters ? 1 : 0}
            onClick={() => setFiltersSheetOpen(true)}
          />
        </div>

        <div className={cn("hidden border-b px-3.5 py-4 sm:block sm:px-4", salesHair)}>
          {filterFields}
        </div>

        <FilterSheet
          open={filtersSheetOpen}
          onOpenChange={setFiltersSheetOpen}
          onReset={resetFilters}
        >
          {filterFields}
        </FilterSheet>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead
              className={cn(
                "border-b bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] text-xs tracking-[-0.02em]",
                salesHair,
                salesMute,
              )}
            >
              <tr>
                <th className="px-5 py-3 font-semibold sm:px-6">Sale #</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Cashier</th>
                <th className="px-4 py-3 font-semibold text-right">Items</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-5 py-3 font-semibold sm:px-6">Updated</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", salesHairDivide)}>
              {loading && filteredDrafts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center sm:px-6">
                    <Loader2 className="mx-auto mb-3 size-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Loading sales…
                    </p>
                  </td>
                </tr>
              ) : filteredDrafts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 sm:px-6">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                      <span className="flex size-12 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
                        <ShoppingCart className="size-5" aria-hidden />
                      </span>
                      <p className="mt-4 font-semibold text-foreground">
                        {hasActiveFilters
                          ? "No sales match your filters"
                          : statusTab === "pending"
                            ? "No pending sales yet"
                            : `No ${statusTab} sales`}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {hasActiveFilters
                          ? "Try widening the time range or clearing search and filters."
                          : statusTab === "pending"
                            ? "When a cashier parks a sale at the register, it will show up here."
                            : "Nothing in this status for the selected time range."}
                      </p>
                      {statusTab === "pending" && !hasActiveFilters ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-4 gap-2"
                          asChild
                        >
                          <Link href={APP_ROUTES.cashier}>
                            Open cashier
                            <ArrowUpRight className="size-3.5" aria-hidden />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDrafts.map((d) => (
                  <tr
                    key={d.id}
                    className="cursor-pointer transition-colors hover:bg-muted/20"
                    onClick={() => void openDetail(d.id)}
                  >
                    <td className="px-5 py-3.5 sm:px-6">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        #{d.ticketNumber}
                      </span>
                      {d.status === "pending" && isStale(d.updatedAt, nowMs) ? (
                        <span className="ml-2 inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-amber-900 dark:text-amber-200">
                          Stale
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3.5 text-foreground">
                      {d.createdByName || "Staff"}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                      {d.lineCount}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-foreground">
                      {fmtKes(Number(d.grandTotal), currency)}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground sm:px-6">
                      {formatDateTime(d.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SalesStage>

      {selectedId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closeDetail}
            aria-hidden
          />
          <aside
            className={cn(
              "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-white shadow-xl",
              salesHair,
            )}
          >
            <div className={cn("flex items-center justify-between border-b px-4 py-3", salesHair)}>
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingCart className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 className={cn("text-lg font-semibold leading-tight", salesInk)}>
                    {detail ? `Sale #${detail.ticketNumber}` : "Sale details"}
                  </h2>
                  {detail ? (
                    <p className={cn("text-xs capitalize", salesMute)}>
                      {detail.status}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className={cn(
                  "rounded-xl p-2 transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]",
                  salesMute,
                  "hover:text-[var(--order-ink,#15231f)]",
                )}
                aria-label="Close details"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {detailLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : detail ? (
                <div className="space-y-5">
                  <div
                    className={cn(
                      "grid grid-cols-2 gap-3 rounded-2xl border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] p-4 text-sm",
                      salesHair,
                    )}
                  >
                    <div>
                      <p className={cn("text-xs font-medium", salesMute)}>Status</p>
                      <div className="mt-1">
                        <StatusBadge status={detail.status} />
                      </div>
                    </div>
                    <div>
                      <p className={cn("text-xs font-medium", salesMute)}>Total</p>
                      <p className="mt-1 font-semibold tabular-nums">
                        {fmtKes(Number(detail.grandTotal), currency)}
                      </p>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <User
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                      <span>{detail.createdByName || "Staff"}</span>
                    </div>
                    <div className={cn("col-span-2 flex items-center gap-2", salesMute)}>
                      <Clock className="size-4" aria-hidden />
                      Updated {formatDateTime(detail.updatedAt)}
                    </div>
                  </div>

                  <div>
                    <p className={cn("mb-2 text-xs font-semibold tracking-[-0.02em]", salesMute)}>
                      Lines
                    </p>
                    <ul
                      className={cn(
                        "divide-y overflow-hidden rounded-2xl border",
                        salesHair,
                        salesHairDivide,
                      )}
                    >
                      {detail.lines.map((line) => (
                        <li
                          key={line.id}
                          className="flex items-start justify-between gap-3 bg-white px-3 py-2.5 text-sm"
                        >
                          <div className="min-w-0">
                            <p className={cn("font-medium", salesInk)}>{line.itemName}</p>
                            <p className={cn("text-xs", salesMute)}>
                              {line.quantity} ×{" "}
                              {fmtKes(Number(line.unitPrice), currency)}
                            </p>
                          </div>
                          <p className="shrink-0 font-semibold tabular-nums">
                            {fmtKes(Number(line.lineTotal), currency)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* ── Activity timeline ── */}
                  <div>
                    <p className={cn("mb-2 text-xs font-semibold tracking-[-0.02em]", salesMute)}>
                      Activity
                    </p>
                    {auditLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : auditEntries.length === 0 ? (
                      <p className="py-2 text-center text-xs text-muted-foreground">
                        No activity recorded yet.
                      </p>
                    ) : (
                      <ol className={cn("relative ml-3 border-l pl-4", salesHair)}>
                        {auditEntries.map((entry) => {
                          const change = formatAuditChange(
                            entry,
                            currency,
                            auditItemNames,
                          );
                          return (
                            <li
                              key={entry.id}
                              className="relative mb-3 last:mb-0"
                            >
                              <span
                                className={cn(
                                  "absolute -left-[1.15rem] top-1.5 size-2 rounded-full border bg-white",
                                  salesHair,
                                )}
                              />
                              <p className={cn("text-xs font-medium", salesInk)}>
                                {formatAuditAction(entry.action)}
                              </p>
                              <p className={cn("mt-0.5 text-[11px]", salesMute)}>
                                {entry.userName || "Staff"} ·{" "}
                                {formatDateTime(entry.createdAt)}
                              </p>
                              {change ? (
                                <p
                                  className={cn(
                                    "mt-0.5 whitespace-normal break-words text-[11px] leading-snug",
                                    salesMute,
                                  )}
                                >
                                  {change}
                                </p>
                              ) : null}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>

                  {detail.status === "pending" ? (
                    <Link
                      href={`${APP_ROUTES.cashier}?resumeDraft=${encodeURIComponent(detail.id)}`}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Resume at register
                    </Link>
                  ) : null}

                  {detail.status === "completed" && detail.saleId ? (
                    <Link
                      href={APP_ROUTES.salesTransactions}
                      className={cn(
                        "inline-flex w-full items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]",
                        salesHair,
                        salesInk,
                      )}
                    >
                      View in transactions
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>

            {detail?.status === "pending" &&
            (canCancelAny || (canCancelOwn && detail.createdBy === myId)) ? (
              <div className={cn("border-t p-4", salesHair)}>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  disabled={cancelling}
                  onClick={() => void handleCancel()}
                >
                  {cancelling ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Void sale"
                  )}
                </Button>
              </div>
            ) : null}
          </aside>
        </>
      )}
    </div>
  );
}
