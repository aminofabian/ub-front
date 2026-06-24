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
  DASHBOARD_FILTER_WELL,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  dashboardFilterFieldLabelClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useFeatureFlag } from "@/components/providers/tenant-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  cancelPosDraft,
  fetchPosDraft,
  listPosDrafts,
  POS_DRAFT_FLAGS,
  PosDraftApiError,
  type PosDraftResponse,
  type PosDraftStatus,
  type PosDraftSummaryResponse,
} from "@/lib/pos-draft-api";

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

const SUMMARY_CARD =
  "flex min-h-[88px] flex-col rounded-xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-black/[0.02]";

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={SUMMARY_CARD}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

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
  const branchName =
    branches.find((b) => b.id === branchId)?.name ?? "Branch";

  const [statusTab, setStatusTab] = useState<StatusTab>("pending");
  const [hoursBack, setHoursBack] = useState(48);
  const [cashierFilter, setCashierFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [staleOnly, setStaleOnly] = useState(false);
  const [drafts, setDrafts] = useState<PosDraftSummaryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PosDraftResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
    try {
      const full = await fetchPosDraft(id);
      setDetail(full);
    } catch (e) {
      toast.error(
        e instanceof PosDraftApiError ? e.message : "Could not load details",
      );
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
  }, []);

  const handleCancel = useCallback(async () => {
    if (!detail || detail.status !== "pending") return;
    const isOwn = detail.createdBy === myId;
    if (!canCancelAny && !(canCancelOwn && isOwn)) {
      toast.error("You cannot cancel this sale.");
      return;
    }
    setCancelling(true);
    try {
      await cancelPosDraft(detail.id, "Cancelled from admin list");
      toast.success(`Sale #${detail.ticketNumber} cancelled`);
      closeDetail();
      void loadDrafts();
    } catch (e) {
      toast.error(
        e instanceof PosDraftApiError ? e.message : "Could not cancel sale",
      );
    } finally {
      setCancelling(false);
    }
  }, [
    detail,
    canCancelAny,
    canCancelOwn,
    myId,
    closeDetail,
    loadDrafts,
  ]);

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
      <div className={cn(DASHBOARD_MAX, "py-8")}>
        <section className={cn(DASHBOARD_TABLE_SURFACE, "p-6")}>
          <h1 className="text-xl font-semibold tracking-tight">Pending sales</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            POS draft persistence is not enabled for this business. Open{" "}
            <Link
              href={APP_ROUTES.business}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Business settings
            </Link>
            , edit settings, and turn on{" "}
            <span className="font-medium text-foreground">Cashier POS drafts</span>
            .
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX, "space-y-6 pb-8")}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <DashboardPageHero
          compact
          icon={ShoppingCart}
          eyebrow="Sales & POS"
          title="Pending sales"
          description={
            <>
              In-progress register carts at{" "}
              <span className="font-medium text-foreground">{branchName}</span>
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
          <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
            <Link href={APP_ROUTES.cashier}>
              Open cashier
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || !online}
            onClick={() => void loadDrafts()}
            className="gap-2"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      {!online ? (
        <DashboardFeedback
          kind="warning"
          text="Offline — the list may be stale until your connection returns."
        />
      ) : null}

      <section aria-label="Draft summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Pending now"
          value={summary.pendingCount.toLocaleString("en-KE")}
          hint={
            summary.staleCount > 0
              ? `${summary.staleCount} idle ${STALE_MINUTES}+ min`
              : "Active register carts"
          }
        />
        <SummaryCard
          label="In view"
          value={summary.filteredCount.toLocaleString("en-KE")}
          hint={
            hasActiveFilters
              ? "Matching current filters"
              : `${STATUS_TABS.find((t) => t.value === statusTab)?.label ?? "All"} tab`
          }
        />
        <SummaryCard
          label="Line items"
          value={summary.filteredItems.toLocaleString("en-KE")}
          hint="Across filtered sales"
        />
        <SummaryCard
          label="Cart value"
          value={fmtKes(summary.filteredTotal, currency)}
          hint={`Last ${hoursBack === 168 ? "7 days" : `${hoursBack} hours`}`}
        />
      </section>

      <div className="relative min-w-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
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

      <section className={DASHBOARD_TABLE_SURFACE}>
        <div
          className={cn(
            DASHBOARD_TABLE_HEAD,
            "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <div
            className="inline-flex w-full rounded-lg border border-border/60 bg-muted/35 p-1 sm:w-auto"
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
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
                  statusTab === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredDrafts.length.toLocaleString("en-KE")} result
            {filteredDrafts.length === 1 ? "" : "s"}
            {hasActiveFilters && drafts.length !== filteredDrafts.length ? (
              <span>
                {" "}
                · {drafts.length.toLocaleString("en-KE")} loaded
              </span>
            ) : null}
          </p>
        </div>

        <div className={cn(DASHBOARD_FILTER_WELL, "mx-5 mb-0 mt-0 sm:mx-6")}>
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
                  "inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors sm:w-auto",
                  staleOnly
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Clock className="size-4 shrink-0" aria-hidden />
                Stale only ({STALE_MINUTES}+ min)
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-y border-border/50 bg-muted/25 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold sm:px-6">Sale #</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Cashier</th>
                <th className="px-4 py-3 font-semibold text-right">Items</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-5 py-3 font-semibold sm:px-6">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading && filteredDrafts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center sm:px-6">
                    <Loader2 className="mx-auto mb-3 size-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading sales…</p>
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
                        <span className="ml-2 inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
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
      </section>

      {selectedId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closeDetail}
            aria-hidden
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShoppingCart className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-semibold leading-tight">
                    {detail ? `Sale #${detail.ticketNumber}` : "Sale details"}
                  </h2>
                  {detail ? (
                    <p className="text-xs text-muted-foreground capitalize">
                      {detail.status}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Status</p>
                      <div className="mt-1">
                        <StatusBadge status={detail.status} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total</p>
                      <p className="mt-1 font-semibold tabular-nums">
                        {fmtKes(Number(detail.grandTotal), currency)}
                      </p>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <User className="size-4 text-muted-foreground" aria-hidden />
                      <span>{detail.createdByName || "Staff"}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                      <Clock className="size-4" aria-hidden />
                      Updated {formatDateTime(detail.updatedAt)}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Lines
                    </p>
                    <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
                      {detail.lines.map((line) => (
                        <li
                          key={line.id}
                          className="flex items-start justify-between gap-3 bg-card px-3 py-2.5 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{line.itemName}</p>
                            <p className="text-xs text-muted-foreground">
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

                  {detail.status === "pending" ? (
                    <Link
                      href={`${APP_ROUTES.cashier}?resumeDraft=${encodeURIComponent(detail.id)}`}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Resume at register
                    </Link>
                  ) : null}

                  {detail.status === "completed" && detail.saleId ? (
                    <Link
                      href={APP_ROUTES.salesTransactions}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted/50"
                    >
                      View in transactions
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>

            {detail?.status === "pending" &&
              (canCancelAny || (canCancelOwn && detail.createdBy === myId)) ? (
                <div className="border-t border-border/60 p-4">
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
                      "Cancel sale"
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
