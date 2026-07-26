"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import { fmtMoney } from "@/lib/business-hub/formatters";
import type { RecentTick } from "@/lib/business-hub/ticks-from-transactions";
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

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <aside
      className={cn(
        "relative flex h-full min-h-[22rem] flex-col border border-[#E6E1D8] bg-[#FCFAF6] text-[#141414]",
        "xl:min-h-[100dvh] xl:h-[100dvh]",
        justUpdated && "hub-scan-sweep border-[#B08D48]/55",
        className,
      )}
      aria-label="Last three transactions"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 opacity-50"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0 6px, rgba(176,141,72,0.35) 6px 7px)",
        }}
        aria-hidden
      />

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E6E1D8] px-3.5 pb-2.5 pt-3.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B08D48]">
            Till tape
          </p>
          <p className="mt-0.5 text-[10px] text-[#8A8A8A]">Last 3 sales</p>
        </div>
        {live ? (
          <span className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
            <span className="size-1.5 bg-emerald-500 hub-live-beacon" aria-hidden />
            Live
          </span>
        ) : (
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#888888]">
            Feed
          </span>
        )}
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-[#EDE8DF]">
        {ticks.length === 0 ? (
          <li className="flex h-full min-h-[12rem] flex-col justify-center px-3.5 py-6">
            <p
              className="text-sm font-medium text-[#141414]"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              Waiting for a ring…
            </p>
            <p className="mt-1 text-[11px] leading-snug text-[#7A7A7A]">
              New sales land here the moment the till confirms.
            </p>
          </li>
        ) : (
          ticks.map((tick, i) => {
            const newest = i === 0 && justUpdated;
            return (
              <li
                key={tick.saleId}
                className={cn(
                  "relative px-3.5 py-3 transition-colors",
                  newest && "bg-[#B08D48]/10 hub-figure-pop",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <time
                    dateTime={tick.soldAt}
                    className="font-mono text-[10px] tabular-nums text-[#B08D48]"
                    title={new Date(tick.soldAt).toLocaleString()}
                  >
                    {formatClock(tick.soldAt)}
                    <span className="ml-1.5 text-[#9A9A9A]">
                      {formatRelative(tick.soldAt, now)}
                    </span>
                  </time>
                  <span
                    className="font-mono text-[9px] tabular-nums text-[#C4BBA8]"
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <ul className="mt-2 space-y-1">
                  {tick.items.map((item, itemIndex) => (
                    <li
                      key={`${tick.saleId}-${item.name}-${itemIndex}`}
                      className="flex items-start justify-between gap-2 text-sm leading-snug text-[#141414]"
                    >
                      <span className="min-w-0 flex-1 break-words font-medium">
                        {item.name}
                      </span>
                      {item.quantity > 1 ? (
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#8A8A8A]">
                          ×{item.quantity}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>

                <p className="mt-2 text-sm font-semibold tabular-nums tracking-tight text-[#141414]">
                  {fmtMoney(tick.amount, currency)}
                </p>
              </li>
            );
          })
        )}
      </ul>

      <Link
        href={APP_ROUTES.salesTransactions}
        className={cn(
          "mt-auto shrink-0 border-t border-[#E6E1D8] bg-white px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
          "text-[#8A8A8A] transition-colors hover:bg-[#F7F5F1] hover:text-[#B08D48]",
        )}
      >
        Full ledger →
      </Link>
    </aside>
  );
}
