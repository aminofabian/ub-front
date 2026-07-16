"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Receipt } from "lucide-react";

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
  supTableHead,
  supTableRow,
  supTableRowActive,
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
      bodyClassName={compact ? "space-y-0" : "space-y-0"}
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
            <table className="w-full border-collapse border-b border-border text-left text-xs">
              <tbody>
                <tr>
                  {summaryRows.map(({ label, value, valueClassName, mono = true }) => (
                    <td
                      key={label}
                      className="border border-border px-2 py-1.5 align-top"
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {label}
                      </div>
                      <div
                        className={cn(
                          "mt-0.5 font-semibold tabular-nums text-foreground",
                          mono && "font-mono",
                          valueClassName,
                        )}
                      >
                        {value}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}

          {orders.length === 0 ? (
            <p
              className={cn(
                "text-center text-xs text-muted-foreground",
                compact ? "py-2" : "border border-dashed border-border py-8",
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
            <div className="overflow-x-auto border border-border">
              <table className="w-full min-w-[32rem] border-collapse text-left text-xs">
                <thead className={supTableHead}>
                  <tr>
                    <th className="border border-border px-2 py-1 font-semibold">Date</th>
                    <th className="border border-border px-2 py-1 font-semibold">Invoice</th>
                    <th className="border border-border px-2 py-1 font-semibold">Type</th>
                    <th className="border border-border px-2 py-1 text-right font-semibold">Total</th>
                    <th className="border border-border px-2 py-1 text-right font-semibold">Paid</th>
                    <th className="border border-border px-2 py-1 text-right font-semibold">Balance</th>
                    <th className="border border-border px-2 py-1 font-semibold">Status</th>
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
                          active && supTableRowActive,
                        )}
                        onClick={
                          selectable
                            ? () => onSelectInvoice?.(row)
                            : undefined
                        }
                      >
                        <td className="whitespace-nowrap border border-border/70 px-2 py-1 text-muted-foreground">
                          {formatShortDate(row.invoiceDate)}
                        </td>
                        <td className="border border-border/70 px-2 py-1 font-mono">
                          {row.invoiceNumber}
                        </td>
                        <td className="border border-border/70 px-2 py-1 text-muted-foreground">
                          {sourceLabel(row.sourceType)}
                          {row.lineCount > 0 ? (
                            <span className="ml-1 opacity-75">
                              · {row.lineCount}L
                            </span>
                          ) : null}
                        </td>
                        <td className="border border-border/70 px-2 py-1 text-right font-mono tabular-nums">
                          {formatMoney(n(row.grandTotal))}
                        </td>
                        <td className="border border-border/70 px-2 py-1 text-right font-mono tabular-nums">
                          {formatMoney(n(row.amountPaid))}
                        </td>
                        <td className="border border-border/70 px-2 py-1 text-right font-mono font-medium tabular-nums">
                          {formatMoney(bal)}
                        </td>
                        <td className="border border-border/70 px-2 py-1">
                          <span
                            className={cn(
                              "inline-flex border px-1 py-px text-[10px] font-semibold uppercase",
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
    <table className="w-full border-collapse border border-border text-left text-[11px]">
      <tbody>
        {rows.map(({ label, value, valueClassName, mono = true }) => (
          <tr key={label}>
            <th
              scope="row"
              className="w-[40%] border border-border bg-[#eef2f7] px-1.5 py-0.5 font-medium text-muted-foreground dark:bg-muted/35"
            >
              {label}
            </th>
            <td
              className={cn(
                "border border-border bg-background px-1.5 py-0.5 tabular-nums text-foreground",
                mono && "font-mono",
                valueClassName,
              )}
            >
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
    <div
      className={cn(
        "border border-border",
        scrollable &&
          orders.length > 10 &&
          "max-h-[min(20rem,50vh)] overflow-y-auto overscroll-contain",
      )}
    >
      <table className="w-full border-collapse text-left text-[11px]">
        <thead className={cn("sticky top-0 z-10", supTableHead)}>
          <tr>
            <th className="border border-border px-1.5 py-1 font-semibold">Date</th>
            <th className="border border-border px-1.5 py-1 font-semibold">Invoice</th>
            <th className="border border-border px-1.5 py-1 text-right font-semibold">
              Total
            </th>
            <th className="border border-border px-1.5 py-1 text-right font-semibold">
              Due
            </th>
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
                  active && supTableRowActive,
                )}
                onClick={
                  selectable ? () => onSelectInvoice?.(row) : undefined
                }
              >
                <td className="whitespace-nowrap border border-border/70 px-1.5 py-0.5 text-muted-foreground">
                  {formatCompactDate(row.invoiceDate)}
                </td>
                <td className="max-w-0 border border-border/70 px-1.5 py-0.5">
                  <span className="block truncate font-mono font-medium">
                    {row.invoiceNumber}
                  </span>
                </td>
                <td className="border border-border/70 px-1.5 py-0.5 text-right font-mono tabular-nums">
                  {formatMoney(n(row.grandTotal))}
                </td>
                <td className="border border-border/70 px-1.5 py-0.5 text-right font-mono tabular-nums">
                  {bal > 0.009 ? formatMoney(bal) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

