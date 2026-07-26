"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import { fmtMoney } from "@/lib/business-hub/formatters";
import {
  cashiersFromTicks,
  filterTicksByCashiers,
  type RecentTick,
} from "@/lib/business-hub/ticks-from-transactions";
import { cn } from "@/lib/utils";

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatRelative(iso: string, now: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const seconds = Math.max(0, Math.floor((now - d.getTime()) / 1000));
  if (seconds < 45) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

function paymentTone(label: string): "cash" | "mpesa" | "split" | "other" {
  const lower = label.toLowerCase();
  if (lower.startsWith("split")) return "split";
  if (lower.includes("m-pesa") || lower.includes("mpesa")) return "mpesa";
  if (lower === "cash") return "cash";
  return "other";
}

function shortCashierName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return parts[0]!;
}

export function RecentTicksRail({
  ticks,
  currency,
  live = false,
  justUpdated = false,
  className,
}: {
  ticks: RecentTick[];
  currency?: string | null;
  live?: boolean;
  justUpdated?: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  /** Empty = all cashiers. Otherwise show sales from selected names. */
  const [selectedCashiers, setSelectedCashiers] = useState<string[]>([]);

  const cashiers = useMemo(() => cashiersFromTicks(ticks), [ticks]);
  const visibleTicks = useMemo(
    () => filterTicksByCashiers(ticks, selectedCashiers),
    [ticks, selectedCashiers],
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setSelectedCashiers((prev) =>
      prev.filter((name) => cashiers.includes(name)),
    );
  }, [cashiers]);

  const showCashierTabs = cashiers.length > 1;
  const viewingAll = selectedCashiers.length === 0;

  function selectAll() {
    setSelectedCashiers([]);
  }

  function toggleCashier(name: string) {
    setSelectedCashiers((prev) => {
      if (prev.length === 0) return [name];
      if (prev.includes(name)) {
        const next = prev.filter((n) => n !== name);
        return next;
      }
      return [...prev, name];
    });
  }

  return (
    <aside
      className={cn(
        "relative flex h-full min-h-[22rem] flex-col border border-[#E6E1D8] bg-white text-[#141414]",
        "xl:min-h-[100dvh] xl:h-[100dvh]",
        justUpdated && "hub-scan-sweep border-[#B08D48]/55",
        className,
      )}
      aria-label="Last three transactions"
    >
      <header className="shrink-0 border-b border-[#E6E1D8] px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B08D48]">
              Till tape
            </p>
            <p className="mt-0.5 text-[11px] text-[#8A8A8A]">
              {viewingAll
                ? `Last ${visibleTicks.length || 3} · all cashiers`
                : selectedCashiers.length === 1
                  ? `Last ${visibleTicks.length || 3} · ${selectedCashiers[0]}`
                  : `Last ${visibleTicks.length || 3} · ${selectedCashiers.length} cashiers`}
            </p>
          </div>
          {live ? (
            <span className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
              <span
                className="size-1.5 bg-emerald-500 hub-live-beacon"
                aria-hidden
              />
              Live
            </span>
          ) : (
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#AAAAAA]">
              Feed
            </span>
          )}
        </div>

        {showCashierTabs ? (
          <div
            className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Filter by cashier"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewingAll}
              onClick={selectAll}
              className={cn(
                "shrink-0 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors",
                viewingAll
                  ? "border-[#141414] bg-[#141414] text-[#F5E6C8]"
                  : "border-[#E6E1D8] bg-[#FCFAF6] text-[#666666] hover:border-[#B08D48] hover:text-[#8A6B2E]",
              )}
            >
              All
            </button>
            {cashiers.map((name) => {
              const active = selectedCashiers.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={
                    active
                      ? `Hide ${name}`
                      : viewingAll
                        ? `Show only ${name}`
                        : `Also show ${name}`
                  }
                  onClick={() => toggleCashier(name)}
                  className={cn(
                    "max-w-[7.5rem] shrink-0 truncate border px-2 py-1 text-[10px] font-semibold tracking-[0.04em] transition-colors",
                    active
                      ? "border-[#B08D48] bg-[#F9F6F0] text-[#8A6B2E]"
                      : "border-[#E6E1D8] bg-white text-[#666666] hover:border-[#B08D48] hover:text-[#8A6B2E]",
                  )}
                >
                  {shortCashierName(name)}
                </button>
              );
            })}
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibleTicks.length === 0 ? (
          <div className="flex h-full min-h-[12rem] flex-col justify-center px-3.5 py-8">
            <p
              className="text-sm font-medium text-[#141414]"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              {ticks.length === 0
                ? "Waiting for a ring…"
                : "No sales for this till"}
            </p>
            <p className="mt-1 max-w-[16rem] text-[11px] leading-snug text-[#8A8A8A]">
              {ticks.length === 0
                ? "New sales land here the moment the till confirms."
                : "Try All, or pick another cashier."}
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-[#EDE8DF]">
            {visibleTicks.map((tick, i) => {
              const newest = i === 0 && justUpdated && viewingAll;
              const payTone = paymentTone(tick.paymentLabel);
              return (
                <li
                  key={tick.saleId}
                  className={cn(
                    "px-3.5 py-3.5 transition-colors",
                    newest && "bg-[#FCFAF6] hub-figure-pop",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span
                        className="font-mono text-[10px] tabular-nums text-[#C4BBA8]"
                        aria-hidden
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <time
                        dateTime={tick.soldAt}
                        className="font-mono text-[11px] font-medium tabular-nums text-[#141414]"
                        title={new Date(tick.soldAt).toLocaleString()}
                      >
                        {formatClock(tick.soldAt)}
                      </time>
                      <span className="text-[10px] uppercase tracking-[0.08em] text-[#AAAAAA]">
                        {formatRelative(tick.soldAt, now)}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
                        payTone === "cash" &&
                          "border-[#E6E1D8] bg-[#F7F5F1] text-[#5A5A5A]",
                        payTone === "mpesa" &&
                          "border-emerald-200 bg-emerald-500/10 text-emerald-800",
                        payTone === "split" &&
                          "border-[#E8DFD0] bg-[#F9F6F0] text-[#8A6B2E]",
                        payTone === "other" &&
                          "border-[#E6E1D8] bg-white text-[#666666]",
                      )}
                      title={tick.paymentLabel}
                    >
                      {tick.paymentLabel}
                    </span>
                  </div>

                  <p
                    className="mt-1.5 truncate text-[11px] text-[#8A8A8A]"
                    title={tick.cashierName}
                  >
                    <span className="uppercase tracking-[0.08em]">By</span>{" "}
                    <span className="font-medium text-[#3A3A3A]">
                      {tick.cashierName}
                    </span>
                  </p>

                  <ul className="mt-2 space-y-1.5">
                    {tick.items.map((item, itemIndex) => (
                      <li
                        key={`${tick.saleId}-${item.name}-${itemIndex}`}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium leading-snug text-[#141414]">
                            {item.name}
                          </p>
                          {item.quantity > 1 ? (
                            <p className="mt-0.5 font-mono text-[10px] tabular-nums text-[#8A8A8A]">
                              ×{item.quantity}
                            </p>
                          ) : null}
                        </div>
                        <p className="shrink-0 pt-0.5 text-right font-mono text-[12px] font-medium tabular-nums text-[#3A3A3A]">
                          {fmtMoney(item.lineTotal, currency)}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-dashed border-[#E6E1D8] pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A8A8A]">
                      Total · {tick.items.length}{" "}
                      {tick.items.length === 1 ? "item" : "items"}
                    </span>
                    <p
                      className="text-sm font-semibold tabular-nums tracking-tight text-[#141414]"
                      style={{
                        fontFamily: "var(--font-heading), Georgia, serif",
                      }}
                    >
                      {fmtMoney(tick.amount, currency)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <Link
        href={APP_ROUTES.salesTransactions}
        className={cn(
          "mt-auto shrink-0 border-t border-[#E6E1D8] bg-[#FCFAF6] px-3.5 py-2.5",
          "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A8A8A]",
          "transition-colors hover:bg-[#F7F5F1] hover:text-[#B08D48]",
        )}
      >
        Full ledger →
      </Link>
    </aside>
  );
}
