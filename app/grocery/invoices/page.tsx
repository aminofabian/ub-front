"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  X,
  Copy,
  CheckCircle2,
  XCircle,
  CalendarClock,
  User,
  StickyNote,
  ShoppingBasket,
  LayoutGrid,
  Table2,
  ArrowDownUp,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";

import { usePosTillLock } from "@/components/auth/pos-till-lock";
import { BranchRequiredBanner } from "@/components/branch-required-banner";
import {
  GroceryAppBottomNav,
  GROCERY_TAB_BAR_CLEARANCE,
} from "@/components/grocery/grocery-app-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/components/dashboard-provider";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { RealtimeConnectionIndicator } from "@/components/realtime-connection-indicator";
import {
  salesHair,
  salesInk,
  salesMute,
  salesPaper,
  salesSurface,
  SalesMetricTile,
  SalesPeriodChip,
  salesToolBtnClass,
} from "@/components/sales/sales-surface";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  GroceryInvoicesList,
  type InvoicesViewMode,
} from "@/components/grocery/grocery-invoices-list";
import { GroceryDraftsList } from "@/components/grocery/grocery-drafts-list";
import {
  listGroceryInvoices,
  cancelGroceryInvoice,
  getGroceryInvoice,
  GroceryApiError,
  toastCaughtGroceryError,
  type GroceryInvoiceSummaryResponse,
  type GroceryInvoiceStatus,
  type GroceryInvoiceResponse,
} from "@/lib/grocery-api";
import {
  listGroceryDrafts,
  cancelGroceryDraft,
  type GroceryDraftSummaryResponse,
} from "@/lib/grocery-draft-api";

type TabValue = GroceryInvoiceStatus | "all" | "drafts";
type SortKey =
  | "created_desc"
  | "created_asc"
  | "total_desc"
  | "total_asc"
  | "status";

const STATUS_TABS: Array<{ label: string; value: TabValue }> = [
  { label: "All", value: "all" },
  { label: "Drafts", value: "drafts" },
  { label: "Pending", value: "pending_payment" },
  { label: "Paid", value: "paid" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Expired", value: "expired" },
];

const SORT_OPTIONS: Array<{ label: string; value: SortKey }> = [
  { label: "Newest first", value: "created_desc" },
  { label: "Oldest first", value: "created_asc" },
  { label: "Highest total", value: "total_desc" },
  { label: "Lowest total", value: "total_asc" },
  { label: "By status", value: "status" },
];

// Stable ordering for the "By status" sort — pending first so staff can act on
// what matters most without scanning.
const STATUS_ORDER: Record<GroceryInvoiceStatus, number> = {
  pending_payment: 0,
  paid: 1,
  expired: 2,
  cancelled: 3,
};

const VIEW_STORAGE_KEY = "palmart.grocery.invoices.view";
const SORT_STORAGE_KEY = "palmart.grocery.invoices.sort";

// Soft tint per status — used to colorize stat tiles, tab counts, and the
// detail modal header so the page reads as a single, consistent system.
const STATUS_THEME: Record<
  GroceryInvoiceStatus,
  { dot: string; pill: string; chip: string; ring: string }
> = {
  pending_payment: {
    dot: "bg-amber-500",
    pill: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
    ring: "ring-amber-200/60 dark:ring-amber-900/40",
  },
  paid: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
    ring: "ring-emerald-200/60 dark:ring-emerald-900/40",
  },
  cancelled: {
    dot: "bg-zinc-400",
    pill: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300",
    chip: "bg-zinc-50 text-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-400",
    ring: "ring-zinc-200/70 dark:ring-zinc-800/60",
  },
  expired: {
    dot: "bg-red-500",
    pill: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    chip: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300",
    ring: "ring-red-200/60 dark:ring-red-900/40",
  },
};

function formatCurrency(currency: string, n: number): string {
  if (!Number.isFinite(n)) return `${currency} 0.00`;
  if (Math.abs(n) >= 1_000_000) {
    return `${currency} ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  }
  if (Math.abs(n) >= 10_000) {
    return `${currency} ${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  }
  return `${currency} ${n.toFixed(2)}`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function GroceryInvoicesPage() {
  const { branchId, business, branches } = useDashboard();
  const { lock: lockCounter, locked: counterLocked } = usePosTillLock();
  const online = useOnlineStatus();
  const currency = business?.currency?.trim() || "KES";
  const branchName = useMemo(
    () => branches.find((b) => b.id === branchId)?.name ?? "this branch",
    [branches, branchId],
  );

  const [invoices, setInvoices] = useState<GroceryInvoiceSummaryResponse[]>([]);
  const [drafts, setDrafts] = useState<GroceryDraftSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<InvoicesViewMode>("table");
  const [sort, setSort] = useState<SortKey>("created_desc");
  const [viewingInvoice, setViewingInvoice] =
    useState<GroceryInvoiceResponse | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Hydrate persisted view + sort once on mount. Done in an effect so SSR and
  // first paint stay deterministic (no hydration mismatch).
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (v === "grid" || v === "table") setViewMode(v);
      const s = window.localStorage.getItem(SORT_STORAGE_KEY);
      if (
        s === "created_desc" ||
        s === "created_asc" ||
        s === "total_desc" ||
        s === "total_asc" ||
        s === "status"
      ) {
        setSort(s);
      }
    } catch {
      // localStorage unavailable — keep defaults.
    }
  }, []);

  const updateViewMode = useCallback((next: InvoicesViewMode) => {
    setViewMode(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const updateSort = useCallback((next: SortKey) => {
    setSort(next);
    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const fetchInvoices = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!branchId) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        // Fetch all statuses once, then filter/count client-side. This makes
        // tab badges accurate without round-tripping for every tab switch.
        const result = await listGroceryInvoices(branchId);
        setInvoices(result.invoices ?? []);
      } catch (e) {
        const msg =
          e instanceof GroceryApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to load invoices";
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branchId],
  );

  const fetchDrafts = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!branchId) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await listGroceryDrafts({
          branchId,
          status: "building",
          hoursBack: 48,
        });
        setDrafts(result.drafts ?? []);
      } catch (e) {
        const msg =
          e instanceof GroceryApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to load drafts";
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branchId],
  );

  useEffect(() => {
    if (!branchId) return;
    if (activeTab === "drafts") {
      void fetchDrafts();
    } else {
      void fetchInvoices();
    }
  }, [branchId, activeTab, fetchInvoices, fetchDrafts]);

  // ── Derived: counts + totals + filtered list ────────────────────
  const counts = useMemo(() => {
    const c: Record<TabValue, number> = {
      all: invoices.length,
      drafts: drafts.length,
      pending_payment: 0,
      paid: 0,
      cancelled: 0,
      expired: 0,
    };
    for (const inv of invoices) c[inv.status]++;
    return c;
  }, [invoices, drafts]);

  const totals = useMemo(() => {
    let pending = 0;
    let paid = 0;
    for (const inv of invoices) {
      if (inv.status === "pending_payment") pending += inv.grandTotal;
      else if (inv.status === "paid") paid += inv.grandTotal;
    }
    return { pending, paid };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = invoices
      .filter((inv) => (activeTab === "all" ? true : inv.status === activeTab))
      .filter((inv) => {
        if (!q) return true;
        return (
          inv.barcodeCode.toLowerCase().includes(q) ||
          (inv.createdByName ?? "").toLowerCase().includes(q)
        );
      });

    const sorted = [...list];
    const byCreated = (a: GroceryInvoiceSummaryResponse) =>
      new Date(a.createdAt).getTime() || 0;
    switch (sort) {
      case "created_asc":
        sorted.sort((a, b) => byCreated(a) - byCreated(b));
        break;
      case "total_desc":
        sorted.sort((a, b) => b.grandTotal - a.grandTotal);
        break;
      case "total_asc":
        sorted.sort((a, b) => a.grandTotal - b.grandTotal);
        break;
      case "status":
        sorted.sort((a, b) => {
          const oa = STATUS_ORDER[a.status] ?? 99;
          const ob = STATUS_ORDER[b.status] ?? 99;
          if (oa !== ob) return oa - ob;
          return byCreated(b) - byCreated(a);
        });
        break;
      case "created_desc":
      default:
        sorted.sort((a, b) => byCreated(b) - byCreated(a));
        break;
    }
    return sorted;
  }, [invoices, activeTab, query, sort]);

  const filteredDrafts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drafts
      .filter((d) => {
        if (!q) return true;
        return (
          String(d.counterNumber).includes(q) ||
          (d.createdByName ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [drafts, query]);

  // ── Actions ──────────────────────────────────────────────────────
  const onViewInvoice = async (id: string) => {
    setViewLoading(true);
    setViewingInvoice({ id } as GroceryInvoiceResponse); // open the shell immediately
    try {
      const invoice = await getGroceryInvoice(id);
      setViewingInvoice(invoice);
    } catch (e) {
      toastCaughtGroceryError(e, "Failed to load invoice");
      setViewingInvoice(null);
    } finally {
      setViewLoading(false);
    }
  };

  const onCancelInvoice = (id: string) => {
    showThemedConfirmToast({
      id: `cancel-grocery-invoice-${id}`,
      title: "Void this invoice?",
      description:
        "This voids the invoice for every till — no tab, no resume.",
      confirmLabel: "Void invoice",
      onConfirm: async () => {
        setCancelling(true);
        try {
          await cancelGroceryInvoice(id, {
            reason: "Voided by staff from dashboard",
          });
          toast.success("Invoice voided", {
            description: "Cleared from cashiers — it will not return.",
          });
          if (viewingInvoice?.id === id) setViewingInvoice(null);
          void fetchInvoices({ silent: true });
        } catch (e) {
          toastCaughtGroceryError(e, "Failed to void invoice");
        } finally {
          setCancelling(false);
        }
      },
    });
  };

  const onCancelDraft = useCallback(
    (id: string) => {
      showThemedConfirmToast({
        id: `cancel-grocery-draft-${id}`,
        title: "Cancel this draft?",
        description: "This cannot be undone.",
        confirmLabel: "Cancel draft",
        onConfirm: async () => {
          try {
            await cancelGroceryDraft(id, "Cancelled by staff from dashboard");
            toast.success("Draft cancelled");
            void fetchDrafts({ silent: true });
          } catch (e) {
            toastCaughtGroceryError(e, "Failed to cancel draft");
          }
        },
      });
    },
    [fetchDrafts],
  );

  const onCopyBarcode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success("Barcode copied");
      window.setTimeout(() => setCopiedCode(false), 1600);
    } catch {
      toast.error("Could not copy barcode");
    }
  }, []);

  // Lock background scroll while modal is open.
  useEffect(() => {
    if (!viewingInvoice) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [viewingInvoice]);

  return (
    <div className="grocery-app-root relative flex h-[100dvh] min-h-0 w-full flex-col">
      <div
        className="grocery-app-stage relative mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col overflow-hidden bg-background"
        style={{ paddingBottom: GROCERY_TAB_BAR_CLEARANCE }}
      >
        <BranchRequiredBanner />
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-3 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-5 sm:px-5 sm:pt-4",
            salesPaper,
          )}
        >
      {/* ── Compact app header ───────────────────────────────────────── */}
      <section className={cn("relative shrink-0 border-b pb-3", salesHair)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={cn(
                "block text-[10px] font-bold uppercase tracking-[0.14em]",
                salesMute,
              )}
            >
              {branchName || "Grocery"}
            </span>
            <h1
              className={cn(
                "font-heading text-xl font-semibold tracking-tight sm:text-2xl",
                salesInk,
              )}
            >
              Invoices
            </h1>
            <p className={cn("mt-1 max-w-prose text-xs leading-relaxed sm:text-sm", salesMute)}>
              Pending pickups, paid sales, and expired barcodes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-black/[0.05]",
                online
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-800",
              )}
            >
              {online ? (
                <Wifi className="size-3" />
              ) : (
                <WifiOff className="size-3" />
              )}
              {online ? "Online" : "Offline"}
            </span>
            <RealtimeConnectionIndicator />
            <button
              type="button"
              onClick={() => void fetchInvoices({ silent: true })}
              disabled={loading || refreshing || !branchId}
              className={cn(
                salesToolBtnClass(),
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <RefreshCw
                className={cn("size-3.5", refreshing && "animate-spin")}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => lockCounter({ reason: "manual" })}
              disabled={counterLocked}
              className={cn(
                salesToolBtnClass(),
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <LockKeyhole className="size-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
            <Link
              href="/grocery"
              className={cn(
                salesToolBtnClass(true),
                "bg-[var(--pos-primary,#0f766e)] text-white ring-0 hover:brightness-105",
              )}
            >
              <Plus className="size-3.5" />
              New invoice
            </Link>
          </div>
        </div>

        {/* Stat tiles */}
        <div
          className={cn(
            "relative mt-5 grid grid-cols-2 sm:mt-6 sm:grid-cols-4",
            salesSurface,
            salesHair,
          )}
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "min-h-[5rem] animate-pulse px-3.5 py-3.5",
                  i > 0 && "border-t sm:border-t-0 sm:border-l",
                  salesHair,
                )}
              >
                <span className="block h-3 w-16 rounded bg-black/[0.06]" />
                <span className="mt-3 block h-7 w-12 rounded bg-black/[0.08]" />
              </div>
            ))
          ) : (
            <>
              <SalesMetricTile
                label="Total"
                value={String(counts.all)}
                hint={`${counts.all === 1 ? "invoice" : "invoices"} all time`}
              />
              <SalesMetricTile
                className={cn("border-t sm:border-t-0 sm:border-l", salesHair)}
                label="Pending"
                value={String(counts.pending_payment)}
                hint={formatCurrency(currency, totals.pending)}
              />
              <SalesMetricTile
                className={cn("border-t sm:border-t-0 sm:border-l", salesHair)}
                label="Paid"
                value={String(counts.paid)}
                hint={formatCurrency(currency, totals.paid)}
              />
              <SalesMetricTile
                className={cn("border-t sm:border-t-0 sm:border-l", salesHair)}
                label="Closed"
                value={String(counts.cancelled + counts.expired)}
                hint={`${counts.cancelled} cancelled · ${counts.expired} expired`}
              />
            </>
          )}
        </div>
      </section>

      {/* ── Filter bar: search + view toggle + sort + tabs ────────── */}
      <section className={cn(salesSurface, "overflow-hidden")}>
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-3.5",
            salesHair,
          )}
        >
          <div className="relative min-w-0 flex-1">
            <Search
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2",
                salesMute,
              )}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by barcode or cashier name…"
              className={cn(
                "h-9 border-0 bg-transparent pl-9 pr-9 shadow-none ring-1 ring-black/[0.05] focus-visible:ring-[var(--pos-primary,#0f766e)]/30",
                salesInk,
              )}
              aria-label="Search invoices"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className={cn(
                  "absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors hover:bg-black/[0.04]",
                  salesMute,
                )}
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <label className="relative inline-flex h-9 items-center">
            <span className="sr-only">Sort invoices</span>
            <ArrowDownUp
              className={cn(
                "pointer-events-none absolute left-2.5 size-3.5",
                salesMute,
              )}
            />
            <select
              value={sort}
              onChange={(e) => updateSort(e.target.value as SortKey)}
              className={cn(
                salesToolBtnClass(),
                "h-9 appearance-none cursor-pointer pl-8 pr-7",
                salesInk,
              )}
              aria-label="Sort order"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <svg
              aria-hidden
              viewBox="0 0 12 12"
              className={cn(
                "pointer-events-none absolute right-2 size-3",
                salesMute,
              )}
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </label>

          <ViewModeToggle value={viewMode} onChange={updateViewMode} />
        </div>

        <div
          role="tablist"
          aria-label="Invoice status"
          className="flex flex-wrap gap-1.5 overflow-x-auto px-3 py-2.5 sm:px-3.5"
        >
          {STATUS_TABS.map((tab) => {
            const count = counts[tab.value];
            const isActive = activeTab === tab.value;
            const theme =
              tab.value === "all" || tab.value === "drafts"
                ? null
                : STATUS_THEME[tab.value];
            return (
              <SalesPeriodChip
                key={tab.value}
                active={isActive}
                onClick={() => setActiveTab(tab.value)}
                className="gap-1.5"
              >
                {theme && !isActive ? (
                  <span
                    className={cn("size-1.5 rounded-full", theme.dot)}
                    aria-hidden
                  />
                ) : null}
                <span className="truncate">{tab.label}</span>
                <span
                  className={cn(
                    "tabular-nums text-[10.5px] font-bold opacity-80",
                    isActive && "opacity-90",
                  )}
                >
                  {count}
                </span>
              </SalesPeriodChip>
            );
          })}
        </div>
      </section>

      {/* ── Error banner ──────────────────────────────────────────── */}
      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchInvoices()}
            className="text-xs"
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── Invoices / Drafts list ─────────────────────────────────────────── */}
      <section className="flex-1">
        {activeTab === "drafts" ? (
          <GroceryDraftsList
            drafts={filteredDrafts}
            currency={currency}
            loading={loading}
            onCancel={(id) => void onCancelDraft(id)}
          />
        ) : (
          <GroceryInvoicesList
            invoices={filteredInvoices}
            onViewInvoice={onViewInvoice}
            onCancelInvoice={onCancelInvoice}
            loading={loading}
            currency={currency}
            query={query}
            activeTab={activeTab}
            totalCount={invoices.length}
            viewMode={viewMode}
          />
        )}
      </section>

      {/* ── Quick filter summary ──────────────────────────────────── */}
      {!loading &&
        !error &&
        (activeTab === "drafts" ? drafts.length > 0 : invoices.length > 0) && (
          <p className={cn("text-center text-xs", salesMute)}>
            Showing{" "}
            <span className={cn("font-semibold", salesInk)}>
              {activeTab === "drafts" ? filteredDrafts.length : filteredInvoices.length}
            </span>{" "}
            of{" "}
            {activeTab === "drafts"
              ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"}`
              : `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
            {activeTab !== "all" && activeTab !== "drafts" && ` · ${activeTab.replace(/_/g, " ")}`}
            {query && ` · matching “${query}”`}
            {activeTab !== "drafts" && (
              <>
                {" · "}
                {viewMode === "table" ? "table view" : "grid view"}
                {" · "}
                {SORT_OPTIONS.find((o) => o.value === sort)?.label.toLowerCase()}
              </>
            )}
          </p>
        )}

      {/* ── Invoice detail modal ──────────────────────────────────── */}
      {viewingInvoice && (
        <InvoiceDetailModal
          invoice={viewingInvoice}
          loading={viewLoading}
          cancelling={cancelling}
          currency={currency}
          copied={copiedCode}
          onCopy={onCopyBarcode}
          onClose={() => setViewingInvoice(null)}
          onCancel={onCancelInvoice}
        />
      )}
        </div>
        <GroceryAppBottomNav activeTab="invoices" />
      </div>
    </div>
  );
}

// ── View mode toggle ────────────────────────────────────────────────

function ViewModeToggle({
  value,
  onChange,
}: {
  value: InvoicesViewMode;
  onChange: (next: InvoicesViewMode) => void;
}) {
  const items: Array<{
    value: InvoicesViewMode;
    label: string;
    icon: typeof Table2;
  }> = [
    { value: "table", label: "Table", icon: Table2 },
    { value: "grid", label: "Grid", icon: LayoutGrid },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Layout"
      className={cn(
        "relative inline-flex h-9 items-center rounded-xl p-0.5 ring-1 ring-black/[0.05]",
        "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-lg bg-white shadow-sm ring-1 ring-black/[0.05] transition-transform duration-200 ease-out",
          value === "grid" && "translate-x-full",
        )}
      />
      {items.map((item) => {
        const Icon = item.icon;
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative z-[1] inline-flex h-8 min-w-[3.25rem] items-center justify-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition-colors",
              active
                ? cn(salesInk)
                : cn(salesMute, "hover:text-[var(--order-ink,#15231f)]"),
            )}
          >
            <Icon className="size-3.5" strokeWidth={2.25} />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Detail modal ─────────────────────────────────────────────────────

function InvoiceDetailModal({
  invoice,
  loading,
  cancelling,
  currency,
  copied,
  onCopy,
  onClose,
  onCancel,
}: {
  invoice: GroceryInvoiceResponse;
  loading: boolean;
  cancelling: boolean;
  currency: string;
  copied: boolean;
  onCopy: (code: string) => void;
  onClose: () => void;
  onCancel: (id: string) => void;
}) {
  // While the shell is opening, the invoice may not have a status yet.
  const status: GroceryInvoiceStatus | undefined = invoice.status;
  const theme = status ? STATUS_THEME[status] : null;
  const statusLabel = status
    ? status.replace(/_/g, " ")
    : "Loading";
  const itemCount =
    invoice.lines?.reduce((sum, l) => sum + l.quantity, 0) ?? 0;

  return (
    <div
      className="premium-portal fixed inset-0 z-50 flex items-end justify-center bg-[rgba(18,26,22,0.38)] p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Invoice detail"
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] shadow-[0_24px_64px_-24px_rgba(18,26,22,0.3)] animate-in slide-in-from-bottom-4 fade-in duration-200 sm:rounded-[2px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header strip */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--op-rule)] bg-[var(--op-surface)] px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                theme?.pill ??
                  "bg-muted text-muted-foreground",
              )}
            >
              {theme && (
                <span className={cn("size-1.5 rounded-full", theme.dot)} />
              )}
              {statusLabel}
            </span>
            <div className="min-w-0">
              <h3
                className="truncate text-[1.35rem] font-normal tracking-[-0.02em] text-[var(--op-ink)]"
                style={{
                  fontFamily:
                    'var(--font-cormorant), Georgia, "Times New Roman", serif',
                }}
              >
                Invoice detail
              </h3>
              {invoice.createdAt && (
                <p className="truncate text-[11px] text-muted-foreground">
                  Created {formatDateTime(invoice.createdAt)}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] text-[var(--op-muted)] transition-colors hover:border-[var(--op-accent)] hover:text-[var(--op-accent)]"
            aria-label="Close detail"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          {loading || !invoice.barcodeCode ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-7 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading invoice details…
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Barcode block */}
              <div
                className={cn(
                  "relative overflow-hidden rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] p-4 shadow-none",
                  theme && `ring-1 ${theme.ring}`,
                )}
              >
                <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Barcode
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-mono text-base font-bold tracking-[0.16em] text-foreground sm:text-lg">
                    {invoice.barcodeCode}
                  </p>
                  <button
                    type="button"
                    onClick={() => onCopy(invoice.barcodeCode)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-[11px] font-semibold text-foreground shadow-sm transition-colors hover:bg-muted",
                      copied &&
                        "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
                    )}
                  >
                    {copied ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoCell
                  icon={<User className="size-3.5" />}
                  label="Created by"
                  value={invoice.createdByName || "—"}
                />
                <InfoCell
                  icon={<CalendarClock className="size-3.5" />}
                  label="Expires"
                  value={formatDateTime(invoice.expiresAt)}
                />
                {invoice.paidAt && (
                  <InfoCell
                    icon={<CheckCircle2 className="size-3.5" />}
                    label="Paid"
                    value={formatDateTime(invoice.paidAt)}
                  />
                )}
                {invoice.paidByName && (
                  <InfoCell
                    icon={<User className="size-3.5" />}
                    label="Paid by"
                    value={invoice.paidByName}
                  />
                )}
                {invoice.cancelledAt && (
                  <InfoCell
                    icon={<XCircle className="size-3.5" />}
                    label="Cancelled"
                    value={formatDateTime(invoice.cancelledAt)}
                  />
                )}
                {invoice.cancelledReason && (
                  <InfoCell
                    icon={<StickyNote className="size-3.5" />}
                    label="Reason"
                    value={invoice.cancelledReason}
                    full
                  />
                )}
              </div>

              {/* Items list */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    <ShoppingBasket className="size-3.5" />
                    Items
                  </h4>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {itemCount} item{itemCount === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="overflow-hidden rounded-xl border border-border/60 bg-background/60">
                  {(invoice.lines ?? []).map((line) => (
                    <li
                      key={line.id}
                      className="flex items-center justify-between gap-3 border-b border-border/40 px-3.5 py-2.5 text-sm last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {line.itemName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {line.quantity} × {currency}{" "}
                          {line.unitPrice.toFixed(2)}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-foreground">
                        {currency} {line.lineTotal.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Totals */}
              <div className="space-y-1.5 rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 to-muted/10 p-3.5">
                {invoice.subtotal !== invoice.grandTotal && (
                  <div className="flex items-center justify-between text-[13px] text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">
                      {currency} {invoice.subtotal.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex items-end justify-between gap-3">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Grand total
                  </span>
                  <span className="text-2xl font-bold tabular-nums leading-none tracking-tight text-foreground">
                    {currency} {invoice.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    <StickyNote className="size-3.5" />
                    Notes
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                    {invoice.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close
                </Button>
                {status === "pending_payment" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onCancel(invoice.id)}
                    disabled={cancelling}
                    className="gap-1.5"
                  >
                    {cancelling ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <XCircle className="size-3.5" />
                    )}
                    Cancel invoice
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
  full = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-background/60 px-3 py-2.5",
        full && "col-span-2",
      )}
    >
      <p className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}
