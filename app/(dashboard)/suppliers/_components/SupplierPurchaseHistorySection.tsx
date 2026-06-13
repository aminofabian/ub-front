"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, History, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  fetchSupplierPurchaseHistory,
  type SupplierPurchaseHistoryOrderRecord,
  type SupplierPurchaseHistoryRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { SupLoadingBlock, SupSection } from "./supplier-layout-primitives";
import {
  paymentStatusBadgeClass,
  supRowActive,
  supRowHover,
  supStatTile,
  supTableHead,
  supTableRow,
} from "./supplier-ui-tokens";

function n(v: number | string): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function formatMoney(v: number): string {
  return n(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

function formatCompactDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameYear = d.getFullYear() === now.getFullYear();
    return d.toLocaleDateString(
      undefined,
      sameYear
        ? { month: "short", day: "numeric" }
        : { month: "short", day: "numeric", year: "2-digit" },
    );
  } catch {
    return iso;
  }
}

function paymentStatusLabel(status: string): string {
  const s = status.toUpperCase();
  if (s === "PAID") return "Paid";
  if (s === "PARTIAL") return "Partial";
  return "Unpaid";
}

function sourceLabel(sourceType: string, compact = false): string {
  if (sourceType === "DIRECT_SUPPLY") return compact ? "Direct" : "Direct supply";
  if (sourceType === "GOODS_RECEIPT") return compact ? "Receipt" : "PO receipt";
  return "Invoice";
}

type SummaryRow = {
  label: string;
  value: string;
  valueClassName?: string;
  emphasize?: boolean;
  mono?: boolean;
};

export function SupplierPurchaseHistorySection({
  supplierId,
  variant = "default",
  selectedInvoiceId = null,
  onSelectInvoice,
  historyLimit,
}: {
  supplierId: string | null;
  variant?: "default" | "sidebar";
  selectedInvoiceId?: string | null;
  onSelectInvoice?: (order: SupplierPurchaseHistoryOrderRecord) => void;
  historyLimit?: number;
}) {
  const compact = variant === "sidebar";
  const selectable = Boolean(onSelectInvoice);
  const [data, setData] = useState<SupplierPurchaseHistoryRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supplierId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchSupplierPurchaseHistory(supplierId, { limit: historyLimit ?? (compact ? 100 : 40) })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null);
          setError(
            e instanceof Error ? e.message : "Could not load purchase history.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId, historyLimit, compact]);

  if (!supplierId) return null;

  const summary = data?.summary;
  const orders = data?.orders ?? [];
  const totalCount = summary?.invoiceCount ?? 0;
  const displayedCount = orders.length;

  const summaryRows: SummaryRow[] = [
    {
      label: compact ? "Spent" : "Total spent",
      value: formatMoney(n(summary?.totalSpent ?? 0)),
      emphasize: true,
    },
    {
      label: "Paid",
      value: formatMoney(n(summary?.totalPaid ?? 0)),
      valueClassName: "text-primary",
    },
    {
      label: compact ? "Balance" : "Open balance",
      value: formatMoney(n(summary?.openBalance ?? 0)),
      valueClassName:
        n(summary?.openBalance ?? 0) > 0.009
          ? "text-primary"
          : undefined,
    },
    {
      label: compact ? "Last bill" : "Last invoice",
      value: compact
        ? formatCompactDate(summary?.lastInvoiceDate ?? null)
        : formatShortDate(summary?.lastInvoiceDate ?? null),
      mono: false,
    },
  ];

  return (
    <SupSection
      compact={compact}
      title={compact ? "Purchases" : "Purchase history"}
      hint="Posted invoices and what you still owe this vendor."
      action={
        totalCount > 0 ? (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-muted/50 px-1.5 py-px text-xs font-semibold tabular-nums text-muted-foreground ring-1 ring-border/50">
            <History className="size-2.5 opacity-70" aria-hidden />
            {totalCount}
          </span>
        ) : null
      }
      bodyClassName={compact ? "space-y-1" : "space-y-4"}
    >
      {loading ? (
        <SupLoadingBlock
          label="Loading purchase history…"
          className={compact ? "py-4" : "py-10"}
        />
      ) : error ? (
        <p className="py-4 text-center text-xs text-destructive">{error}</p>
      ) : (
        <>
          {compact ? (
            <SidebarSummaryGrid rows={summaryRows} />
          ) : (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {summaryRows.map((row) => (
                <SummaryStat key={row.label} {...row} />
              ))}
            </div>
          )}

          {orders.length === 0 ? (
            <p
              className={cn(
                "text-center text-xs text-muted-foreground",
                compact
                  ? "py-2"
                  : "rounded-lg border border-dashed border-border/50 bg-muted/15 py-8",
              )}
            >
              No posted invoices yet.
            </p>
          ) : compact ? (
            <SidebarInvoiceList
              orders={orders}
              selectable={selectable}
              selectedInvoiceId={selectedInvoiceId}
              onSelectInvoice={onSelectInvoice}
              scrollable={false}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/50 bg-background/50">
              <table className="w-full min-w-[32rem] border-collapse text-left text-xs">
                <thead className={supTableHead}>
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Date</th>
                    <th className="px-3 py-2.5 font-semibold">Invoice</th>
                    <th className="px-3 py-2.5 font-semibold">Type</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Paid</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Balance</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((row) => {
                    const bal = n(row.balanceOpen);
                    const active = selectedInvoiceId === row.supplierInvoiceId;
                    return (
                      <tr
                        key={row.supplierInvoiceId}
                        className={cn(
                          supTableRow,
                          selectable && "cursor-pointer",
                          active && "bg-primary/[0.06] ring-1 ring-inset ring-primary/20",
                        )}
                        onClick={
                          selectable
                            ? () => onSelectInvoice?.(row)
                            : undefined
                        }
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                          {formatShortDate(row.invoiceDate)}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-sm">
                          {row.invoiceNumber}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {sourceLabel(row.sourceType)}
                          {row.lineCount > 0 ? (
                            <span className="ml-1 text-xs opacity-75">
                              · {row.lineCount}L
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {formatMoney(n(row.grandTotal))}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-primary">
                          {formatMoney(n(row.amountPaid))}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-medium tabular-nums">
                          {formatMoney(bal)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
                              paymentStatusBadgeClass(row.paymentStatus),
                            )}
                          >
                            {paymentStatusLabel(row.paymentStatus)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalCount > displayedCount ? (
            <p className="text-center text-xs leading-tight text-muted-foreground">
              Latest {displayedCount} of {totalCount}
            </p>
          ) : null}

          {!compact ? (
          <div className="flex justify-end border-t border-border/40 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 rounded-md text-sm"
              asChild
            >
              <Link href={APP_ROUTES.purchasingAddSupplies}>
                <Receipt className="size-3" aria-hidden />
                Supplies
              </Link>
            </Button>
          </div>
          ) : null}
        </>
      )}
    </SupSection>
  );
}

function SidebarSummaryGrid({ rows }: { rows: SummaryRow[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border/50 bg-border/40 text-xs">
      {rows.map(({ label, value, valueClassName, emphasize, mono = true }) => (
        <div
          key={label}
          className="flex min-w-0 flex-col gap-px bg-background/95 px-1.5 py-1"
        >
          <dt className="truncate font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </dt>
          <dd
            className={cn(
              "truncate font-semibold tabular-nums text-foreground",
              emphasize ? "text-xs" : "text-sm",
              mono && "font-mono",
              valueClassName,
            )}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SidebarInvoiceList({
  orders,
  selectable,
  selectedInvoiceId,
  onSelectInvoice,
  scrollable = true,
}: {
  orders: SupplierPurchaseHistoryOrderRecord[];
  selectable: boolean;
  selectedInvoiceId?: string | null;
  onSelectInvoice?: (order: SupplierPurchaseHistoryOrderRecord) => void;
  /** When false, list grows with content (parent column scrolls). */
  scrollable?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border/50 bg-background/50">
      <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/25 px-2 py-0.5">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Invoices
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {orders.length}
        </span>
      </div>
      <ul
        className={cn(
          "divide-y divide-border/30",
          scrollable &&
            orders.length > 8 &&
            "max-h-[min(18rem,45vh)] overflow-y-auto overscroll-contain",
        )}
      >
        {orders.map((row) => {
          const bal = n(row.balanceOpen);
          const unpaid = bal > 0.009;
          const active = selectedInvoiceId === row.supplierInvoiceId;
          const status = row.paymentStatus;

          const rowInner = (
            <>
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-border/45 bg-muted/30",
                  active && "border-primary/25 bg-primary/10 text-primary",
                )}
              >
                <Receipt className="size-2.5 opacity-80" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-1.5">
                  <p
                    className={cn(
                      "truncate font-mono text-xs font-semibold leading-tight",
                      active ? "text-primary" : "text-foreground",
                    )}
                  >
                    {row.invoiceNumber}
                  </p>
                  <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">
                    {formatMoney(n(row.grandTotal))}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-1">
                  <p className="truncate text-xs text-muted-foreground">
                    {formatCompactDate(row.invoiceDate)} ·{" "}
                    {sourceLabel(row.sourceType, true)}
                  </p>
                  {unpaid ? (
                    <span className="shrink-0 font-mono text-xs font-medium tabular-nums text-primary">
                      {formatMoney(bal)}
                      <span className="font-sans font-normal opacity-80"> due</span>
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "shrink-0 rounded px-1 py-px text-[8px] font-bold uppercase tracking-wide",
                        paymentStatusBadgeClass(status),
                      )}
                    >
                      {paymentStatusLabel(status)}
                    </span>
                  )}
                </div>
              </div>
              {selectable ? (
                <ChevronRight
                  className={cn(
                    "mt-0.5 size-3 shrink-0 text-muted-foreground/50 transition-transform",
                    active && "text-primary/70",
                  )}
                  aria-hidden
                />
              ) : null}
            </>
          );

          return (
            <li key={row.supplierInvoiceId}>
              {selectable ? (
                <button
                  type="button"
                  className={cn(
                    "group flex w-full items-start gap-1 px-2 py-1 text-left transition-[background-color,box-shadow] duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/35",
                    active ? supRowActive : supRowHover,
                  )}
                  onClick={() => onSelectInvoice?.(row)}
                >
                  {rowInner}
                </button>
              ) : (
                <div className="flex items-start gap-1.5 px-2 py-1.5">
                  {rowInner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  emphasize,
  valueClassName,
  mono = true,
}: SummaryRow) {
  return (
    <div className={supStatTile}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "mt-1 block font-semibold tabular-nums text-foreground",
          emphasize ? "text-base" : "text-sm",
          mono && "font-mono",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}
