"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, PackageOpen, Receipt } from "lucide-react";

import { DashboardLoading } from "@/components/dashboard-page-ui";
import { WhiteCard, boardMoney } from "@/components/credits/customer-board-theme";
import { Button } from "@/components/ui/button";
import { fetchCustomerTabPurchases, type TabPurchaseRowRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 40;

type Props = {
  customerId: string;
  variant?: "default" | "board";
  compact?: boolean;
  currency?: string;
};

export function CustomerPurchasesSection({
  customerId,
  variant = "default",
  compact = false,
  currency = "KES",
}: Props) {
  const [rows, setRows] = useState<TabPurchaseRowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);

  const fmtMoney = useCallback(
    (value: number | string | null | undefined) => boardMoney(value, currency),
    [currency],
  );

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

  const isBoard = variant === "board";
  const dense = isBoard && compact;

  const header = (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b border-border/60",
        dense ? "px-2 py-1.5" : "flex-wrap px-4 py-3 sm:px-5",
        !isBoard && "bg-muted/30",
      )}
    >
      <div className="min-w-0">
        <h2
          className={cn(
            "font-semibold text-foreground",
            dense
              ? "text-[10px] uppercase tracking-wide text-muted-foreground"
              : isBoard
                ? "text-[11px] uppercase tracking-wide text-muted-foreground"
                : "text-sm",
          )}
        >
          {dense ? "History" : "Purchase history"}
        </h2>
        {!dense ? (
          <p className="text-xs text-muted-foreground">
            Sales linked at checkout — cash, M-Pesa, tab, and wallet
          </p>
        ) : null}
      </div>
      {!loading && rows.length > 0 ? (
        <span
          className={cn(
            "shrink-0 rounded-md bg-muted font-medium tabular-nums text-muted-foreground",
            dense ? "px-1.5 py-0.5 text-[10px]" : "rounded-full px-2.5 py-0.5 text-xs",
          )}
        >
          {rows.length}
          {hasMore ? "+" : ""}
        </span>
      ) : null}
    </div>
  );

  const body = loading ? (
    <DashboardLoading label="Loading purchases…" />
  ) : error ? (
    <p className="px-5 py-8 text-center text-sm text-destructive">{error}</p>
  ) : rows.length === 0 ? (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 text-center",
        dense ? "px-3 py-6" : "gap-2 px-5 py-10",
      )}
    >
      <PackageOpen
        className={cn(
          "text-muted-foreground/40",
          dense ? "size-5" : "size-8",
        )}
        aria-hidden
      />
      <p className={cn("font-medium text-foreground", dense ? "text-xs" : "text-sm")}>
        No purchases yet
      </p>
      {!dense ? (
        <p className="max-w-sm text-xs text-muted-foreground">
          Sales appear here when the till attaches this customer at checkout.
        </p>
      ) : null}
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
                className={cn(
                  "flex w-full items-center gap-2 text-left transition-colors hover:bg-muted/30",
                  dense ? "px-2 py-1.5" : "items-start gap-3 px-4 py-3.5 sm:px-5",
                )}
                aria-expanded={open}
                onClick={() => setOpenSaleId(open ? null : row.saleId)}
              >
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded border border-border/50 bg-muted/40",
                    dense ? "size-5" : "mt-0.5 size-8 rounded-lg",
                  )}
                >
                  <Receipt
                    className={cn(
                      "text-muted-foreground",
                      dense ? "size-2.5" : "size-4",
                    )}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "font-semibold text-foreground",
                      dense ? "text-[11px] leading-tight" : "text-sm",
                    )}
                  >
                    {row.receiptNo != null ? `#${row.receiptNo}` : "Sale"}
                    <span
                      className={cn(
                        "ml-1.5 font-normal tabular-nums text-muted-foreground",
                        dense && "ml-1",
                      )}
                    >
                      {fmtMoney(row.grandTotal)}
                    </span>
                  </p>
                  <p
                    className={cn(
                      "flex flex-wrap items-center text-muted-foreground",
                      dense
                        ? "gap-x-1.5 text-[10px] leading-tight"
                        : "mt-0.5 gap-x-2 gap-y-1 text-xs",
                    )}
                  >
                    <span>
                      {dense
                        ? new Date(row.soldAt).toLocaleDateString("en-KE", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : new Date(row.soldAt).toLocaleString()}
                    </span>
                    {tabAmount > 0 ? (
                      <span
                        className={cn(
                          "rounded font-medium text-amber-800 dark:text-amber-200",
                          dense
                            ? "bg-amber-50 px-1 py-px text-[9px] dark:bg-amber-950/40"
                            : "rounded-full bg-amber-50 px-1.5 py-0.5 ring-1 ring-amber-200/70 dark:bg-amber-950/40",
                        )}
                      >
                        Tab {fmtMoney(tabAmount)}
                      </span>
                    ) : null}
                  </p>
                </div>
                {open ? (
                  <ChevronDown
                    className={cn(
                      "shrink-0 text-muted-foreground",
                      dense ? "size-3" : "mt-1 size-4",
                    )}
                  />
                ) : (
                  <ChevronRight
                    className={cn(
                      "shrink-0 text-muted-foreground",
                      dense ? "size-3" : "mt-1 size-4",
                    )}
                  />
                )}
              </button>
              {open ? (
                <div
                  className={cn(
                    "border-t border-border/40 bg-muted/10",
                    dense ? "px-2 py-1.5 pl-9" : "px-4 py-3 sm:px-5 sm:pl-[4.25rem]",
                  )}
                >
                  <table className={cn("w-full text-left", dense ? "text-[11px]" : "text-sm")}>
                    <thead>
                      <tr className="text-muted-foreground">
                        <th
                          className={cn(
                            "font-medium",
                            dense ? "pb-1 text-[9px]" : "pb-2 text-xs",
                          )}
                        >
                          Item
                        </th>
                        <th
                          className={cn(
                            "font-medium",
                            dense ? "pb-1 text-[9px]" : "pb-2 text-xs",
                          )}
                        >
                          Qty
                        </th>
                        <th
                          className={cn(
                            "text-right font-medium",
                            dense ? "pb-1 text-[9px]" : "pb-2 text-xs",
                          )}
                        >
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.lines.map((line, index) => (
                        <tr
                          key={`${row.saleId}-${index}`}
                          className={cn(index > 0 && "border-t border-border/30")}
                        >
                          <td className={cn("pr-2 text-foreground", dense ? "py-1" : "py-2 pr-3")}>
                            {line.itemName}
                            {line.itemSku && !dense ? (
                              <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                                {line.itemSku}
                              </span>
                            ) : null}
                          </td>
                          <td
                            className={cn(
                              "tabular-nums text-muted-foreground",
                              dense ? "py-1 pr-2" : "py-2 pr-3",
                            )}
                          >
                            {line.quantity}
                          </td>
                          <td
                            className={cn(
                              "text-right tabular-nums text-foreground",
                              dense ? "py-1" : "py-2",
                            )}
                          >
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
        <div
          className={cn(
            "border-t border-border/50",
            dense ? "px-2 py-1.5" : "px-4 py-3 sm:px-5",
          )}
        >
          <Button
            type="button"
            variant="outline"
            size={dense ? "sm" : "default"}
            className={cn("w-full", dense && "h-7 text-xs")}
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </>
  );

  if (isBoard) {
    return (
      <WhiteCard className="overflow-hidden">
        {header}
        {body}
      </WhiteCard>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
      {header}
      {body}
    </section>
  );
}
