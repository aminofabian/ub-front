"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, PackageOpen, Receipt } from "lucide-react";

import { DashboardLoading } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { fetchCustomerTabPurchases, type TabPurchaseRowRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 40;

function fmtMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-KE", { style: "currency", currency: "KES" });
}

export function CustomerPurchasesSection({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<TabPurchaseRowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const page = await fetchCustomerTabPurchases(customerId, {
        offset: 0,
        limit: PAGE_SIZE,
      });
      setRows(page.rows);
      setHasMore(page.hasMore);
    } catch (e) {
      setRows([]);
      setHasMore(false);
      setError(
        e instanceof Error ? e.message : "Could not load purchase history.",
      );
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await fetchCustomerTabPurchases(customerId, {
        offset: rows.length,
        limit: PAGE_SIZE,
      });
      setRows((prev) => [...prev, ...page.rows]);
      setHasMore(page.hasMore);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load more purchases.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold">Purchase history</h2>
          <p className="text-xs text-muted-foreground">
            Sales linked at checkout — cash, M-Pesa, tab, and wallet
          </p>
        </div>
        {!loading && rows.length > 0 ? (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {rows.length}
            {hasMore ? "+" : ""} sale{rows.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {loading ? (
        <DashboardLoading label="Loading purchases…" />
      ) : error ? (
        <p className="px-5 py-8 text-center text-sm text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <PackageOpen className="size-8 text-muted-foreground/40" aria-hidden />
          <p className="text-sm font-medium text-foreground">No purchases yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Sales appear here when the till attaches this customer at checkout.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border/50">
            {rows.map((row) => {
              const open = openSaleId === row.saleId;
              const tabAmount = Number(row.creditAmount);
              return (
                <li key={row.saleId}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30 sm:px-5"
                    aria-expanded={open}
                    onClick={() =>
                      setOpenSaleId(open ? null : row.saleId)
                    }
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40">
                      <Receipt className="size-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {row.receiptNo != null ? `Receipt #${row.receiptNo}` : "Sale"}
                        <span className="ml-2 font-normal tabular-nums text-muted-foreground">
                          {fmtMoney(row.grandTotal)}
                        </span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{new Date(row.soldAt).toLocaleString()}</span>
                        {tabAmount > 0 ? (
                          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-200">
                            Tab {fmtMoney(tabAmount)}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {open ? (
                      <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {open ? (
                    <div className="border-t border-border/40 bg-muted/10 px-4 py-3 sm:px-5 sm:pl-[4.25rem]">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-xs text-muted-foreground">
                            <th className="pb-2 font-medium">Item</th>
                            <th className="pb-2 font-medium">Qty</th>
                            <th className="pb-2 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.lines.map((line, index) => (
                            <tr
                              key={`${row.saleId}-${index}`}
                              className={cn(index > 0 && "border-t border-border/30")}
                            >
                              <td className="py-2 pr-3">
                                {line.itemName}
                                {line.itemSku ? (
                                  <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                                    {line.itemSku}
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                                {line.quantity}
                              </td>
                              <td className="py-2 text-right tabular-nums">
                                {fmtMoney(line.lineTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {hasMore ? (
            <div className="border-t border-border/50 px-4 py-3 sm:px-5">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? "Loading…" : "Load more purchases"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
