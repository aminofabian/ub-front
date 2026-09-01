"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, PackageOpen, Receipt } from "lucide-react";

import { DashboardLoading } from "@/components/dashboard-page-ui";
import {
  INK,
  MUTED,
  WhiteCard,
  boardMoney,
} from "@/components/credits/customer-board-theme";
import { Button } from "@/components/ui/button";
import { fetchCustomerTabPurchases, type TabPurchaseRowRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 40;

type Props = {
  customerId: string;
  variant?: "default" | "board";
  currency?: string;
};

export function CustomerPurchasesSection({
  customerId,
  variant = "default",
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

  const header = (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5",
        isBoard ? "border-b border-[#eef1f4]" : "border-b border-border/60 bg-muted/30",
      )}
    >
      <div>
        <h2
          className={cn(
            "text-sm font-semibold",
            isBoard && "text-[11px] font-semibold uppercase tracking-[-0.02em]",
          )}
          style={isBoard ? { color: MUTED } : undefined}
        >
          Purchase history
        </h2>
        <p
          className={cn("text-xs", !isBoard && "text-muted-foreground")}
          style={isBoard ? { color: MUTED } : undefined}
        >
          Sales linked at checkout — cash, M-Pesa, tab, and wallet
        </p>
      </div>
      {!loading && rows.length > 0 ? (
        <span
          className={cn(
            "px-2.5 py-0.5 text-xs font-medium tabular-nums",
            isBoard ? "bg-[#eef1f4]" : "rounded-full bg-muted text-muted-foreground",
          )}
          style={isBoard ? { color: INK } : undefined}
        >
          {rows.length}
          {hasMore ? "+" : ""} sale{rows.length === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );

  const body = loading ? (
    <DashboardLoading label="Loading purchases…" />
  ) : error ? (
    <p
      className={cn(
        "px-5 py-8 text-center text-sm",
        isBoard ? "" : "text-destructive",
      )}
      style={isBoard ? { color: INK } : undefined}
    >
      {error}
    </p>
  ) : rows.length === 0 ? (
    <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
      <PackageOpen
        className={cn("size-8", !isBoard && "text-muted-foreground/40")}
        style={isBoard ? { color: MUTED } : undefined}
        aria-hidden
      />
      <p
        className={cn("text-sm font-medium", !isBoard && "text-foreground")}
        style={isBoard ? { color: INK } : undefined}
      >
        No purchases yet
      </p>
      <p
        className={cn("max-w-sm text-xs", !isBoard && "text-muted-foreground")}
        style={isBoard ? { color: MUTED } : undefined}
      >
        Sales appear here when the till attaches this customer at checkout.
      </p>
    </div>
  ) : (
    <>
      <ul className={cn(isBoard ? "divide-y divide-[#eef1f4]" : "divide-y divide-border/50")}>
        {rows.map((row) => {
          const open = openSaleId === row.saleId;
          const tabAmount = Number(row.creditAmount);
          return (
            <li key={row.saleId}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors sm:px-5",
                  isBoard ? "hover:bg-[#f4f7fb]" : "hover:bg-muted/30",
                )}
                aria-expanded={open}
                onClick={() => setOpenSaleId(open ? null : row.saleId)}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center border",
                    isBoard
                      ? "border-[#d5deea] bg-[#f4f7fb]"
                      : "rounded-lg border-border/50 bg-muted/40",
                  )}
                >
                  <Receipt
                    className={cn("size-4", !isBoard && "text-muted-foreground")}
                    style={isBoard ? { color: MUTED } : undefined}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold"
                    style={isBoard ? { color: INK } : undefined}
                  >
                    {row.receiptNo != null ? `Receipt #${row.receiptNo}` : "Sale"}
                    <span
                      className={cn(
                        "ml-2 font-normal tabular-nums",
                        !isBoard && "text-muted-foreground",
                      )}
                      style={isBoard ? { color: MUTED } : undefined}
                    >
                      {fmtMoney(row.grandTotal)}
                    </span>
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs",
                      !isBoard && "text-muted-foreground",
                    )}
                    style={isBoard ? { color: MUTED } : undefined}
                  >
                    <span>{new Date(row.soldAt).toLocaleString()}</span>
                    {tabAmount > 0 ? (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 font-medium",
                          isBoard
                            ? "bg-[#fff4e5] text-[#8a5a00]"
                            : "rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-200",
                        )}
                      >
                        Tab {fmtMoney(tabAmount)}
                      </span>
                    ) : null}
                  </p>
                </div>
                {open ? (
                  <ChevronDown
                    className={cn("mt-1 size-4 shrink-0", !isBoard && "text-muted-foreground")}
                    style={isBoard ? { color: MUTED } : undefined}
                  />
                ) : (
                  <ChevronRight
                    className={cn("mt-1 size-4 shrink-0", !isBoard && "text-muted-foreground")}
                    style={isBoard ? { color: MUTED } : undefined}
                  />
                )}
              </button>
              {open ? (
                <div
                  className={cn(
                    "border-t px-4 py-3 sm:px-5 sm:pl-[4.25rem]",
                    isBoard
                      ? "border-[#eef1f4] bg-[#f8fafc]"
                      : "border-border/40 bg-muted/10",
                  )}
                >
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr
                        className={cn("text-xs", !isBoard && "text-muted-foreground")}
                        style={isBoard ? { color: MUTED } : undefined}
                      >
                        <th className="pb-2 font-medium">Item</th>
                        <th className="pb-2 font-medium">Qty</th>
                        <th className="pb-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.lines.map((line, index) => (
                        <tr
                          key={`${row.saleId}-${index}`}
                          className={cn(
                            index > 0 &&
                              (isBoard ? "border-t border-[#eef1f4]" : "border-t border-border/30"),
                          )}
                        >
                          <td className="py-2 pr-3" style={isBoard ? { color: INK } : undefined}>
                            {line.itemName}
                            {line.itemSku ? (
                              <span
                                className={cn(
                                  "mt-0.5 block font-mono text-[11px]",
                                  !isBoard && "text-muted-foreground",
                                )}
                                style={isBoard ? { color: MUTED } : undefined}
                              >
                                {line.itemSku}
                              </span>
                            ) : null}
                          </td>
                          <td
                            className={cn(
                              "py-2 pr-3 tabular-nums",
                              !isBoard && "text-muted-foreground",
                            )}
                            style={isBoard ? { color: MUTED } : undefined}
                          >
                            {line.quantity}
                          </td>
                          <td
                            className="py-2 text-right tabular-nums"
                            style={isBoard ? { color: INK } : undefined}
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
            "border-t px-4 py-3 sm:px-5",
            isBoard ? "border-[#eef1f4]" : "border-border/50",
          )}
        >
          <Button
            type="button"
            variant="outline"
            className={cn("w-full", isBoard ? "rounded-none border-[#d5deea]" : "rounded-xl")}
            style={isBoard ? { color: INK } : undefined}
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? "Loading…" : "Load more purchases"}
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
