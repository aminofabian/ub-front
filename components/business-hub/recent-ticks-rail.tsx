"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import { fmtMoney } from "@/lib/business-hub/formatters";
import {
  drawoutStatusLabel,
  type HubDrawout,
} from "@/lib/business-hub/drawouts-for-hub";
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

function paymentTone(label: string): "cash" | "mpesa" | "split" | "other" {
  const lower = label.toLowerCase();
  if (lower.startsWith("split")) return "split";
  if (lower.includes("m-pesa") || lower.includes("mpesa")) return "mpesa";
  if (lower === "cash") return "cash";
  return "other";
}

function statusTone(
  status: string,
): "pending" | "approved" | "rejected" | "other" {
  if (status === "PENDING_APPROVAL") return "pending";
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED" || status === "VOIDED" || status === "EXPIRED") {
    return "rejected";
  }
  return "other";
}

export function RecentTicksRail({
  ticks,
  drawouts = [],
  currency,
  live = false,
  justUpdated = false,
  title = "Till tape",
  subtitle,
  showCashier = true,
  accent = "brass",
  laneIndex,
  fillViewport = true,
  className,
}: {
  ticks: RecentTick[];
  drawouts?: HubDrawout[];
  currency?: string | null;
  live?: boolean;
  justUpdated?: boolean;
  title?: string;
  subtitle?: string;
  /** When false, hide per-sale “By cashier” (solo/dual lane already names the till). */
  showCashier?: boolean;
  accent?: "brass" | "ink";
  laneIndex?: number;
  /** Stick to full viewport height on wide layouts (side lanes). */
  fillViewport?: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const empty = ticks.length === 0 && drawouts.length === 0;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <aside
      className={cn(
        "hub-rise relative flex h-full min-h-[16rem] flex-col border border-[#E6E1D8] bg-white text-[#141414]",
        fillViewport && "xl:min-h-[100dvh] xl:h-[100dvh]",
        justUpdated && "hub-scan-sweep border-[#B08D48]/55",
        className,
      )}
      aria-label={title}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-0.5",
          accent === "ink" ? "bg-[#141414]" : "bg-[#B08D48]",
        )}
        aria-hidden
      />

      <header className="shrink-0 border-b border-[#E6E1D8] px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {laneIndex != null ? (
                <span className="font-mono text-[10px] tabular-nums text-[#C4BBA8]">
                  {String(laneIndex + 1).padStart(2, "0")}
                </span>
              ) : null}
              <p
                className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B08D48]"
                title={title}
              >
                {title}
              </p>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[#8A8A8A]">
              {subtitle ??
                (drawouts.length > 0
                  ? `${ticks.length || 3} sales · ${drawouts.length} drawout${drawouts.length === 1 ? "" : "s"}`
                  : `Last ${ticks.length || 3} sales`)}
            </p>
          </div>
          {live ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 border border-emerald-200 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald-800">
              <span
                className="size-1.5 bg-emerald-500 hub-live-beacon"
                aria-hidden
              />
              Live
            </span>
          ) : (
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#AAAAAA]">
              Feed
            </span>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <div className="flex h-full min-h-[8rem] flex-col justify-center px-2.5 py-6">
            <p
              className="text-sm font-medium text-[#141414]"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              Quiet till…
            </p>
            <p className="mt-1 max-w-[16rem] text-[11px] leading-snug text-[#8A8A8A]">
              No recent sales or drawouts on this lane yet.
            </p>
          </div>
        ) : (
          <div>
            {ticks.length > 0 ? (
              <ol className="divide-y divide-[#EDE8DF]">
                {ticks.map((tick, i) => {
                  const newest = i === 0 && justUpdated;
                  const payTone = paymentTone(tick.paymentLabel);
                  return (
                    <li
                      key={tick.saleId}
                      className={cn(
                        "px-3.5 py-3 transition-colors",
                        newest && "bg-[#FCFAF6] hub-figure-pop",
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex min-w-0 items-baseline gap-1.5">
                          <span
                            className="font-mono text-[9px] tabular-nums text-[#C4BBA8]"
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
                          <span className="text-[9px] uppercase tracking-[0.08em] text-[#AAAAAA]">
                            {formatRelative(tick.soldAt, now)}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 border px-1 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]",
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

                      {showCashier ? (
                        <p
                          className="mt-1 truncate text-[10px] text-[#8A8A8A]"
                          title={tick.cashierName}
                        >
                          <span className="uppercase tracking-[0.08em]">By</span>{" "}
                          <span className="font-medium text-[#3A3A3A]">
                            {tick.cashierName}
                          </span>
                        </p>
                      ) : null}

                      <ul className="mt-1.5 space-y-1">
                        {tick.items.map((item, itemIndex) => (
                          <li
                            key={`${tick.saleId}-${item.name}-${itemIndex}`}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-medium leading-snug text-[#141414]">
                                {item.name}
                                {item.quantity > 1 ? (
                                  <span className="ml-1 font-mono text-[10px] text-[#8A8A8A]">
                                    ×{item.quantity}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            <p className="shrink-0 text-right font-mono text-[11px] font-medium tabular-nums text-[#3A3A3A]">
                              {fmtMoney(item.lineTotal, currency)}
                            </p>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-dashed border-[#E6E1D8] pt-1.5">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A8A8A]">
                          Total · {tick.items.length}
                        </span>
                        <p
                          className="text-[13px] font-semibold tabular-nums tracking-tight text-[#141414]"
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
            ) : null}

            {drawouts.length > 0 ? (
              <section
                className={cn(
                  "border-t border-[#E6E1D8]",
                  ticks.length > 0 && "mt-0",
                )}
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#EDE8DF] bg-[#FCFAF6] px-3.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B08D48]">
                    Drawouts
                  </p>
                  <p className="text-[10px] tabular-nums text-[#8A8A8A]">
                    {drawouts.length}
                  </p>
                </div>
                <ol className="divide-y divide-[#EDE8DF]">
                  {drawouts.map((row, i) => {
                    const tone = statusTone(row.status);
                    return (
                      <li key={row.id} className="px-3.5 py-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="flex min-w-0 items-baseline gap-1.5">
                            <span
                              className="font-mono text-[9px] tabular-nums text-[#C4BBA8]"
                              aria-hidden
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <time
                              dateTime={row.createdAt}
                              className="font-mono text-[11px] font-medium tabular-nums text-[#141414]"
                              title={new Date(row.createdAt).toLocaleString()}
                            >
                              {formatClock(row.createdAt)}
                            </time>
                            <span className="text-[9px] uppercase tracking-[0.08em] text-[#AAAAAA]">
                              {formatRelative(row.createdAt, now)}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 border px-1 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]",
                              tone === "pending" &&
                                "border-amber-200 bg-amber-500/10 text-amber-800",
                              tone === "approved" &&
                                "border-emerald-200 bg-emerald-500/10 text-emerald-800",
                              tone === "rejected" &&
                                "border-rose-200 bg-rose-500/10 text-rose-700",
                              tone === "other" &&
                                "border-[#E6E1D8] bg-[#F7F5F1] text-[#5A5A5A]",
                            )}
                          >
                            {drawoutStatusLabel(row.status)}
                          </span>
                        </div>

                        {showCashier ? (
                          <p
                            className="mt-1 truncate text-[10px] text-[#8A8A8A]"
                            title={row.cashierName}
                          >
                            <span className="uppercase tracking-[0.08em]">
                              By
                            </span>{" "}
                            <span className="font-medium text-[#3A3A3A]">
                              {row.cashierName}
                            </span>
                          </p>
                        ) : null}

                        <div className="mt-1.5 space-y-0.5">
                          <p className="truncate text-[12px] font-medium text-[#141414]">
                            {row.categoryLabel}
                            <span className="mx-1 text-[#D0C6B4]" aria-hidden>
                              ·
                            </span>
                            <span className="font-normal text-[#5A5A5A]">
                              {row.description}
                            </span>
                          </p>
                          <p className="truncate text-[10px] text-[#8A8A8A]">
                            To {row.recipientName}
                          </p>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-dashed border-[#E6E1D8] pt-1.5">
                          <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A8A8A]">
                            Drawn out
                          </span>
                          <p
                            className="text-[13px] font-semibold tabular-nums tracking-tight text-[#C47A5A]"
                            style={{
                              fontFamily: "var(--font-heading), Georgia, serif",
                            }}
                          >
                            −{fmtMoney(row.amount, currency)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}
          </div>
        )}
      </div>

      <Link
        href={APP_ROUTES.shifts}
        className={cn(
          "mt-auto shrink-0 border-t border-[#E6E1D8] bg-[#FCFAF6] px-2.5 py-1.5",
          "text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A8A8A]",
          "transition-colors hover:bg-[#F7F5F1] hover:text-[#B08D48]",
        )}
      >
        Shifts & drawouts →
      </Link>
    </aside>
  );
}
