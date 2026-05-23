"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Loader2, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  fetchSupplierPurchaseHistory,
  type SupplierPurchaseHistoryRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

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

function paymentStatusBadge(status: string): { label: string; className: string } {
  const s = status.toUpperCase();
  if (s === "PAID") {
    return {
      label: "Paid",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
    };
  }
  if (s === "PARTIAL") {
    return {
      label: "Partial",
      className:
        "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    };
  }
  return {
    label: "Unpaid",
    className: "border-border/60 bg-muted/50 text-muted-foreground",
  };
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

  if (!supplierId) {
    return null;
  }

  const summary = data?.summary;
  const orders = data?.orders ?? [];
  const shownCount = orders.length;
  const totalCount = summary?.invoiceCount ?? 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/10 p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <History className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Purchase history
          </span>
        </div>
        {totalCount > 0 ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {totalCount} invoice{totalCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading history…
        </div>
      ) : error ? (
        <p className="py-4 text-center text-xs text-destructive">{error}</p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <SummaryStat
              label="Total spent"
              value={formatMoney(n(summary?.totalSpent))}
              emphasize
            />
            <SummaryStat
              label="Paid"
              value={formatMoney(n(summary?.totalPaid))}
              valueClassName="text-emerald-700 dark:text-emerald-300"
            />
            <SummaryStat
              label="Open balance"
              value={formatMoney(n(summary?.openBalance))}
              valueClassName={
                n(summary?.openBalance) > 0.009
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
            <p className="py-4 text-center text-xs text-muted-foreground">
              No posted invoices with this supplier yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/50 bg-background/80">
              <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
                <thead className="border-b border-border/50 bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 font-semibold uppercase tracking-wide text-muted-foreground">
                      Date
                    </th>
                    <th className="px-3 py-2 font-semibold uppercase tracking-wide text-muted-foreground">
                      Invoice
                    </th>
                    <th className="px-3 py-2 font-semibold uppercase tracking-wide text-muted-foreground">
                      Type
                    </th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-muted-foreground">
                      Total
                    </th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-muted-foreground">
                      Paid
                    </th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-muted-foreground">
                      Balance
                    </th>
                    <th className="px-3 py-2 font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {orders.map((row) => {
                    const st = paymentStatusBadge(row.paymentStatus);
                    const bal = n(row.balanceOpen);
                    return (
                      <tr
                        key={row.supplierInvoiceId}
                        className="transition-colors hover:bg-muted/25"
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                          {formatShortDate(row.invoiceDate)}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-foreground">
                          {row.invoiceNumber}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {sourceLabel(row.sourceType)}
                          {row.lineCount > 0 ? (
                            <span className="ml-1 tabular-nums text-[10px] text-muted-foreground/80">
                              · {row.lineCount} line{row.lineCount === 1 ? "" : "s"}
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
                              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              st.className,
                            )}
                          >
                            {st.label}
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
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Showing latest {shownCount} of {totalCount} invoices.
            </p>
          ) : null}

          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-xl text-xs"
              asChild
            >
              <Link href={APP_ROUTES.purchasingAddSupplies}>
                <Receipt className="size-3.5" aria-hidden />
                All supplies
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
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
    <div className="rounded-xl bg-background px-3 py-2.5 ring-1 ring-border/60">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "mt-0.5 block text-sm font-semibold tabular-nums text-foreground",
          emphasize && "text-base",
          mono && "font-mono",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}
