"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  fetchSupplierPurchaseHistory,
  type SupplierPurchaseHistoryRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { SupLoadingBlock, SupSection } from "./supplier-layout-primitives";
import {
  paymentStatusBadgeClass,
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

function paymentStatusLabel(status: string): string {
  const s = status.toUpperCase();
  if (s === "PAID") return "Paid";
  if (s === "PARTIAL") return "Partial";
  return "Unpaid";
}

function sourceLabel(sourceType: string): string {
  if (sourceType === "DIRECT_SUPPLY") return "Direct supply";
  if (sourceType === "GOODS_RECEIPT") return "PO receipt";
  return "Invoice";
}

export function SupplierPurchaseHistorySection({
  supplierId,
}: {
  supplierId: string | null;
}) {
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
    void fetchSupplierPurchaseHistory(supplierId, { limit: 40 })
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
  }, [supplierId]);

  if (!supplierId) return null;

  const summary = data?.summary;
  const orders = data?.orders ?? [];
  const shownCount = orders.length;
  const totalCount = summary?.invoiceCount ?? 0;

  return (
    <SupSection
      title="Purchase history"
      hint="Posted invoices and what you still owe this vendor."
      action={
        totalCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground ring-1 ring-border/50">
            <History className="size-3 opacity-70" aria-hidden />
            {totalCount} invoice{totalCount === 1 ? "" : "s"}
          </span>
        ) : null
      }
      bodyClassName="space-y-4"
    >
      {loading ? (
        <SupLoadingBlock label="Loading purchase history…" className="py-10" />
      ) : error ? (
        <p className="py-6 text-center text-xs text-destructive">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryStat label="Total spent" value={formatMoney(n(summary?.totalSpent ?? 0))} emphasize />
            <SummaryStat
              label="Paid"
              value={formatMoney(n(summary?.totalPaid ?? 0))}
              valueClassName="text-emerald-700 dark:text-emerald-300"
            />
            <SummaryStat
              label="Open balance"
              value={formatMoney(n(summary?.openBalance ?? 0))}
              valueClassName={
                n(summary?.openBalance ?? 0) > 0.009
                  ? "text-amber-800 dark:text-amber-200"
                  : undefined
              }
            />
            <SummaryStat
              label="Last invoice"
              value={formatShortDate(summary?.lastInvoiceDate ?? null)}
              mono={false}
            />
          </div>

          {orders.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/50 bg-muted/15 py-8 text-center text-xs text-muted-foreground">
              No posted invoices with this supplier yet.
            </p>
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
                    return (
                      <tr key={row.supplierInvoiceId} className={supTableRow}>
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                          {formatShortDate(row.invoiceDate)}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px]">
                          {row.invoiceNumber}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {sourceLabel(row.sourceType)}
                          {row.lineCount > 0 ? (
                            <span className="ml-1 text-[10px] opacity-75">
                              · {row.lineCount}L
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {formatMoney(n(row.grandTotal))}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                          {formatMoney(n(row.amountPaid))}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-medium tabular-nums">
                          {formatMoney(bal)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
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

          {totalCount > shownCount ? (
            <p className="text-center text-[10px] text-muted-foreground">
              Showing latest {shownCount} of {totalCount} invoices.
            </p>
          ) : null}

          <div className="flex justify-end border-t border-border/40 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg text-xs"
              asChild
            >
              <Link href={APP_ROUTES.purchasingAddSupplies}>
                <Receipt className="size-3.5" aria-hidden />
                Manage supplies
              </Link>
            </Button>
          </div>
        </>
      )}
    </SupSection>
  );
}

function SummaryStat({
  label,
  value,
  emphasize,
  valueClassName,
  mono = true,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  valueClassName?: string;
  mono?: boolean;
}) {
  return (
    <div className={supStatTile}>
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
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
