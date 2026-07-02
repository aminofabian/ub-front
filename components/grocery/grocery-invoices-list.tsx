"use client";

import Link from "next/link";
import {
  Eye,
  XCircle,
  Clock,
  SearchX,
  Inbox,
  ArrowRight,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  GroceryInvoiceSummaryResponse,
  GroceryInvoiceStatus,
} from "@/lib/grocery-api";

export type InvoicesViewMode = "table" | "grid";

type GroceryInvoicesListProps = {
  invoices: GroceryInvoiceSummaryResponse[];
  onViewInvoice: (id: string) => void;
  onCancelInvoice: (id: string) => void;
  loading: boolean;
  currency?: string;
  /** Active text filter — used to tailor the empty state copy. */
  query?: string;
  /** Active status tab — used to tailor the empty state copy. */
  activeTab?: GroceryInvoiceStatus | "all";
  /** Unfiltered total invoice count. */
  totalCount?: number;
  /** Layout — "table" is the default dense view, "grid" shows cards. */
  viewMode?: InvoicesViewMode;
};

const STATUS_CONFIG: Record<
  GroceryInvoiceStatus,
  {
    label: string;
    bg: string;
    text: string;
    dot: string;
    border: string;
    /** Solid color used as the vertical accent strip on table rows. */
    accent: string;
  }
> = {
  pending_payment: {
    label: "Pending",
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-800 dark:text-amber-200",
    dot: "bg-amber-500",
    border:
      "border-amber-200/70 hover:border-amber-300 dark:border-amber-900/40 dark:hover:border-amber-800/60",
    accent: "bg-amber-500",
  },
  paid: {
    label: "Paid",
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-800 dark:text-emerald-200",
    dot: "bg-emerald-500",
    border:
      "border-emerald-200/70 hover:border-emerald-300 dark:border-emerald-900/40 dark:hover:border-emerald-800/60",
    accent: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    dot: "bg-zinc-400",
    border: "border-border/50 hover:border-border dark:border-border/40",
    accent: "bg-zinc-400",
  },
  expired: {
    label: "Expired",
    bg: "bg-red-100 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
    border:
      "border-red-200/60 hover:border-red-300 dark:border-red-900/40 dark:hover:border-red-800/60",
    accent: "bg-red-500",
  },
};

function timeAgo(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

function shortenBarcode(code: string): string {
  if (code.length <= 18) return code;
  return `${code.slice(0, 8)}…${code.slice(-6)}`;
}

// ── Skeletons ────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3 rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="h-5 w-16 rounded-full bg-muted" />
        <span className="h-4 w-12 rounded bg-muted/70" />
      </div>
      <span className="h-3 w-32 rounded bg-muted/70" />
      <span className="h-7 w-28 rounded bg-muted" />
      <span className="h-3 w-24 rounded bg-muted/70" />
      <div className="mt-2 flex gap-2">
        <span className="h-8 flex-1 rounded-lg bg-muted/70" />
        <span className="h-8 w-16 rounded-lg bg-muted/50" />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="hidden border-b border-border/50 bg-muted/30 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:grid sm:grid-cols-[1.6fr_1.5fr_1.1fr_0.9fr_1.1fr_84px] sm:gap-3">
        <span>Status</span>
        <span>Barcode</span>
        <span className="text-right">Total</span>
        <span className="hidden md:inline">Items</span>
        <span className="hidden lg:inline">Created</span>
        <span className="text-right">·</span>
      </div>
      <ul className="divide-y divide-border/40">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="flex animate-pulse items-center gap-3 px-4 py-3.5"
          >
            <span className="h-5 w-20 rounded-full bg-muted/70" />
            <span className="h-3 w-32 flex-1 rounded bg-muted/60" />
            <span className="h-4 w-20 rounded bg-muted" />
            <span className="hidden h-3 w-12 rounded bg-muted/60 md:block" />
            <span className="hidden h-3 w-16 rounded bg-muted/60 lg:block" />
            <span className="h-7 w-7 rounded-md bg-muted/60" />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────

function EmptyState({
  query,
  activeTab = "all",
  totalCount = 0,
}: {
  query?: string;
  activeTab?: GroceryInvoiceStatus | "all";
  totalCount?: number;
}) {
  const hasFilter =
    Boolean(query?.trim()) || (activeTab !== "all" && totalCount > 0);

  if (hasFilter) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchX className="size-5" />
        </span>
        <p className="mt-4 text-sm font-semibold text-foreground">
          No matching invoices
        </p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          {query
            ? `Nothing matches “${query}”. Try a different barcode or cashier name.`
            : `No ${activeTab.replace(/_/g, " ")} invoices yet — try a different filter.`}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-20 text-center">
      <span className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm ring-1 ring-primary/10">
        <Inbox className="size-7" strokeWidth={2} />
      </span>
      <p className="mt-5 text-base font-semibold tracking-tight text-foreground">
        No invoices yet
      </p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Invoices created in the grocery workspace will show up here so you can
        track pending pickups, completed sales, and expired drafts.
      </p>
      <Button asChild size="sm" className="mt-5 gap-1.5">
        <Link href="/grocery">
          Create your first invoice
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}

// ── Table view ───────────────────────────────────────────────────────

function InvoicesTable({
  invoices,
  onViewInvoice,
  onCancelInvoice,
  currency,
}: {
  invoices: GroceryInvoiceSummaryResponse[];
  onViewInvoice: (id: string) => void;
  onCancelInvoice: (id: string) => void;
  currency: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
      {/* Header (desktop only — mobile uses the inline labels per row). */}
      <div className="hidden border-b border-border/60 bg-muted/35 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:grid sm:grid-cols-[1.6fr_1.5fr_1.1fr_0.9fr_1.1fr_84px] sm:gap-3">
        <span className="pl-3">Status</span>
        <span>Barcode</span>
        <span className="text-right">Total</span>
        <span className="hidden md:inline">Items</span>
        <span className="hidden lg:inline">Created</span>
        <span className="text-right pr-1">Actions</span>
      </div>

      <ul className="divide-y divide-border/40">
        {invoices.map((inv) => {
          const cfg =
            STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.pending_payment;
          const isPending = inv.status === "pending_payment";

          return (
            <li
              key={inv.id}
              className={cn(
                "group relative grid cursor-pointer items-center gap-x-3 gap-y-2 px-3 py-3 transition-colors grid-cols-[1fr_auto] sm:grid-cols-[1.6fr_1.5fr_1.1fr_0.9fr_1.1fr_84px] sm:gap-3 sm:px-4",
                "hover:bg-muted/30 focus-within:bg-muted/30",
              )}
              tabIndex={0}
              role="button"
              aria-label={`Invoice ${inv.barcodeCode} — ${cfg.label}`}
              onClick={() => onViewInvoice(inv.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onViewInvoice(inv.id);
                }
              }}
            >
              {/* Status accent strip on the left edge */}
              <span
                aria-hidden
                className={cn(
                  "absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full opacity-0 transition-opacity",
                  cfg.accent,
                  "group-hover:opacity-100 group-focus-within:opacity-100",
                )}
              />

              {/* ── Status / Barcode (mobile stacks these into one column) ── */}
              <div className="flex min-w-0 flex-col gap-1.5 sm:pl-3">
                <span
                  className={cn(
                    "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                    cfg.bg,
                    cfg.text,
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", cfg.dot)} />
                  {cfg.label}
                </span>
                {/* Mobile-only meta row underneath the status */}
                <p
                  className="truncate font-mono text-[11px] tracking-[0.1em] text-muted-foreground sm:hidden"
                  title={inv.barcodeCode}
                >
                  {shortenBarcode(inv.barcodeCode)}
                </p>
              </div>

              {/* ── Barcode column (desktop) ── */}
              <div className="hidden min-w-0 sm:block">
                <p
                  className="truncate font-mono text-[12px] font-semibold tracking-[0.12em] text-foreground"
                  title={inv.barcodeCode}
                >
                  {inv.barcodeCode}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {inv.createdByName || "—"}
                </p>
              </div>

              {/* ── Total ── */}
              <div className="flex flex-col items-end sm:text-right">
                <span className="text-[15px] font-bold tabular-nums leading-tight tracking-tight text-foreground sm:text-[15.5px]">
                  <span className="mr-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {currency}
                  </span>
                  {inv.grandTotal.toFixed(2)}
                </span>
                {/* Mobile-only secondary meta (items + ago) */}
                <span className="text-[10.5px] text-muted-foreground sm:hidden">
                  {inv.lineCount} item{inv.lineCount === 1 ? "" : "s"} ·{" "}
                  {timeAgo(inv.createdAt)}
                </span>
              </div>

              {/* ── Items count (md+) ── */}
              <div className="hidden text-sm text-muted-foreground md:block">
                <span className="tabular-nums">{inv.lineCount}</span>
                <span className="ml-1 text-[11px]">
                  item{inv.lineCount === 1 ? "" : "s"}
                </span>
              </div>

              {/* ── Created (lg+) ── */}
              <div className="hidden text-sm lg:block">
                <span className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground">
                  <Clock className="size-3" />
                  {timeAgo(inv.createdAt)}
                </span>
              </div>

              {/* ── Actions ── */}
              <div className="col-span-2 mt-1 flex items-center justify-end gap-1 border-t border-border/30 pt-2 sm:col-span-1 sm:mt-0 sm:border-0 sm:pt-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewInvoice(inv.id);
                  }}
                  aria-label="View invoice"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Eye className="size-3.5" />
                </Button>
                {isPending && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelInvoice(inv.id);
                    }}
                    aria-label="Cancel invoice"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <XCircle className="size-3.5" />
                  </Button>
                )}
                {!isPending && (
                  <span
                    aria-hidden
                    className="hidden size-7 items-center justify-center text-muted-foreground/50 sm:flex"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Grid view ────────────────────────────────────────────────────────

function InvoicesGrid({
  invoices,
  onViewInvoice,
  onCancelInvoice,
  currency,
}: {
  invoices: GroceryInvoiceSummaryResponse[];
  onViewInvoice: (id: string) => void;
  onCancelInvoice: (id: string) => void;
  currency: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {invoices.map((inv) => {
        const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.pending_payment;
        const isPending = inv.status === "pending_payment";

        return (
          <button
            key={inv.id}
            type="button"
            onClick={() => onViewInvoice(inv.id)}
            className={cn(
              "group relative flex flex-col rounded-xl border bg-card p-4 text-left shadow-sm ring-1 ring-black/[0.02] transition-all dark:ring-white/[0.03]",
              "hover:-translate-y-0.5 hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              cfg.border,
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  cfg.bg,
                  cfg.text,
                )}
              >
                <span className={cn("size-1.5 rounded-full", cfg.dot)} />
                {cfg.label}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3" />
                {timeAgo(inv.createdAt)}
              </span>
            </div>

            <p
              className="mb-1 truncate font-mono text-[11px] tracking-[0.12em] text-muted-foreground"
              title={inv.barcodeCode}
            >
              {shortenBarcode(inv.barcodeCode)}
            </p>

            <p className="text-[1.7rem] font-bold tabular-nums leading-tight tracking-tight text-foreground">
              <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {currency}
              </span>
              {inv.grandTotal.toFixed(2)}
            </p>

            <p className="mt-1.5 line-clamp-1 text-[11.5px] text-muted-foreground">
              {inv.lineCount} item{inv.lineCount === 1 ? "" : "s"}
              {inv.createdByName ? ` · ${inv.createdByName}` : ""}
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 text-xs font-medium text-foreground transition-colors",
                  "group-hover:border-border group-hover:bg-muted",
                )}
              >
                <Eye className="size-3.5" />
                View
              </span>
              {isPending && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelInvoice(inv.id);
                  }}
                  className="text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <XCircle className="size-3.5" />
                  Cancel
                </Button>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Main list ────────────────────────────────────────────────────────

export function GroceryInvoicesList({
  invoices,
  onViewInvoice,
  onCancelInvoice,
  loading,
  currency = "KES",
  query,
  activeTab = "all",
  totalCount,
  viewMode = "table",
}: GroceryInvoicesListProps) {
  if (loading) {
    return viewMode === "grid" ? (
      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy="true"
        aria-label="Loading invoices"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    ) : (
      <TableSkeleton />
    );
  }

  if (invoices.length === 0) {
    return (
      <EmptyState
        query={query}
        activeTab={activeTab}
        totalCount={totalCount ?? 0}
      />
    );
  }

  return viewMode === "grid" ? (
    <InvoicesGrid
      invoices={invoices}
      onViewInvoice={onViewInvoice}
      onCancelInvoice={onCancelInvoice}
      currency={currency}
    />
  ) : (
    <InvoicesTable
      invoices={invoices}
      onViewInvoice={onViewInvoice}
      onCancelInvoice={onCancelInvoice}
      currency={currency}
    />
  );
}
