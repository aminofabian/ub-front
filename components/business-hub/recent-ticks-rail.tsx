"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import { fmtMoney } from "@/lib/business-hub/formatters";
import {
  drawoutStatusLabel,
  totalDrawoutAmount,
  type HubDrawout,
} from "@/lib/business-hub/drawouts-for-hub";
import { HUB_RAIL } from "@/lib/business-hub/constants";
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
  justUpdated = false,
  title = "Till tape",
  subtitle,
  showCashier = true,
  accent = "teal",
  laneIndex,
  fillViewport = true,
  className,
}: {
  ticks: RecentTick[];
  drawouts?: HubDrawout[];
  currency?: string | null;
  justUpdated?: boolean;
  title?: string;
  subtitle?: string;
  /** When false, hide per-sale “By cashier” (solo/dual lane already names the till). */
  showCashier?: boolean;
  accent?: "teal" | "ink";
  laneIndex?: number;
  /** Stick to full viewport height on wide layouts (side lanes). */
  fillViewport?: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [drawoutsOpen, setDrawoutsOpen] = useState(false);
  const empty = ticks.length === 0 && drawouts.length === 0;
  const drawoutTotal = totalDrawoutAmount(drawouts);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <aside
      className={cn(
        HUB_RAIL,
        "flex h-full min-h-[16rem] flex-col",
        fillViewport && "xl:min-h-[100dvh] xl:h-[100dvh]",
        justUpdated && "hub-scan-sweep ring-1 ring-[#0f766e]/35",
        className,
      )}
      aria-label={title}
    >
      <header className="shrink-0 border-b border-[color-mix(in_srgb,#141414_6%,transparent)] px-3.5 py-2.5">
        <div className="min-w-0">
            <div className="flex items-center gap-2">
              {laneIndex != null ? (
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums",
                    accent === "ink" ? "text-[#8A8A8A]" : "text-[#0f766e]",
                  )}
                >
                  {String(laneIndex + 1).padStart(2, "0")}
                </span>
              ) : null}
              <p
                className="truncate text-[12px] font-medium tracking-[-0.01em] text-[#141414]"
                title={title}
              >
                {title}
              </p>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[#8A8A8A]">
              {subtitle ??
                (drawouts.length > 0
                  ? `${ticks.length || 3} sales · open-shift drawouts`
                  : `Last ${ticks.length || 3} sales`)}
            </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <div className="flex h-full min-h-[8rem] flex-col justify-center px-2.5 py-6">
            <p
              className="text-sm font-medium text-[#141414]"
              style={{ fontFamily: "var(--font-heading)" }}
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
              <ol className="divide-y divide-[color-mix(in_srgb,#141414_6%,transparent)]">
                {ticks.map((tick, i) => {
                  const newest = i === 0 && justUpdated;
                  const payTone = paymentTone(tick.paymentLabel);
                  return (
                    <li
                      key={tick.saleId}
                      className={cn(
                        "px-3.5 py-4 transition-colors sm:px-4 sm:py-5",
                        newest && "bg-[#ffffff] hub-figure-pop",
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <span
                            className="font-mono text-[9px] tabular-nums text-[#8A8A8A]"
                            aria-hidden
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <time
                            dateTime={tick.soldAt}
                            className="font-mono text-[12px] font-medium tabular-nums text-[#141414]"
                            title={new Date(tick.soldAt).toLocaleString()}
                          >
                            {formatClock(tick.soldAt)}
                          </time>
                          <span className="text-[9px] tracking-[-0.02em] text-[#AAAAAA]">
                            {formatRelative(tick.soldAt, now)}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 px-1.5 py-0.5 text-[9px] font-semibold tracking-[-0.02em]",
                            payTone === "cash" && "bg-[#F3F1EC] text-[#5A5A5A]",
                            payTone === "mpesa" &&
                              "bg-emerald-500/10 text-emerald-800",
                            payTone === "split" &&
                              "bg-[#ffffff] text-[#0f766e]",
                            payTone === "other" &&
                              "bg-[#ffffff] text-[#666666]",
                          )}
                          title={tick.paymentLabel}
                        >
                          {tick.paymentLabel}
                        </span>
                      </div>

                      {showCashier ? (
                        <p
                          className="mt-2 truncate text-[10px] text-[#8A8A8A]"
                          title={tick.cashierName}
                        >
                          <span className="tracking-[-0.02em]">By</span>{" "}
                          <span className="font-medium text-[#3A3A3A]">
                            {tick.cashierName}
                          </span>
                        </p>
                      ) : null}

                      <ul
                        className={cn(
                          "space-y-2",
                          showCashier ? "mt-3" : "mt-3",
                        )}
                      >
                        {tick.items.map((item, itemIndex) => (
                          <li
                            key={`${tick.saleId}-${item.name}-${itemIndex}`}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-medium leading-snug text-[#141414]">
                                {item.name}
                                {item.quantity > 1 ? (
                                  <span className="ml-1.5 font-mono text-[10px] text-[#8A8A8A]">
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

                      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-dashed border-[color-mix(in_srgb,#141414_8%,transparent)] pt-3">
                        <span className="text-[9px] font-semibold tracking-[-0.02em] text-[#8A8A8A]">
                          Total · {tick.items.length}
                        </span>
                        <p
                          className="text-[14px] font-semibold tabular-nums tracking-tight text-[#141414]"
                          style={{
                            fontFamily: "var(--font-heading)",
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
                  "border-t border-[color-mix(in_srgb,#141414_8%,transparent)]",
                  ticks.length > 0 && "mt-0",
                )}
              >
                <button
                  type="button"
                  aria-expanded={drawoutsOpen}
                  onClick={() => setDrawoutsOpen((open) => !open)}
                  className="flex w-full items-center gap-2 bg-[#ffffff] px-3.5 py-2.5 text-left transition-colors hover:bg-[#ffffff]"
                >
                  <ChevronDown
                    className={cn(
                      "size-3.5 shrink-0 text-[#0f766e] transition-transform",
                      !drawoutsOpen && "-rotate-90",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold tracking-[-0.02em] text-[#0f766e]">
                      Open-shift drawouts
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#8A8A8A]">
                      {drawouts.length}{" "}
                      {drawouts.length === 1 ? "entry" : "entries"}
                      <span className="mx-1 text-[#D0C6B4]" aria-hidden>
                        ·
                      </span>
                      {drawoutsOpen ? "Hide details" : "Show details"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-semibold tracking-[-0.02em] text-[#8A8A8A]">
                      Total
                    </p>
                    <p
                      className="text-[13px] font-semibold tabular-nums tracking-tight text-[#C47A5A]"
                      style={{
                        fontFamily: "var(--font-heading)",
                      }}
                    >
                      −{fmtMoney(drawoutTotal, currency)}
                    </p>
                  </div>
                </button>

                {drawoutsOpen ? (
                  <ol className="divide-y divide-[color-mix(in_srgb,#141414_6%,transparent)] border-t border-[color-mix(in_srgb,#141414_6%,transparent)]">
                    {drawouts.map((row, i) => {
                      const tone = statusTone(row.status);
                      return (
                        <li key={row.id} className="px-3.5 py-3">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex min-w-0 items-baseline gap-1.5">
                              <span
                                className="font-mono text-[9px] tabular-nums text-[#8A8A8A]"
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
                              <span className="text-[9px] tracking-[-0.02em] text-[#AAAAAA]">
                                {formatRelative(row.createdAt, now)}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span
                                className={cn(
                                  "px-1 py-0.5 text-[9px] font-semibold tracking-[-0.02em]",
                                  tone === "pending" &&
                                    "bg-amber-500/10 text-amber-800",
                                  tone === "approved" &&
                                    "bg-emerald-500/10 text-emerald-800",
                                  tone === "rejected" &&
                                    "bg-rose-500/10 text-rose-700",
                                  tone === "other" &&
                                    "bg-[#F3F1EC] text-[#5A5A5A]",
                                )}
                              >
                                {drawoutStatusLabel(row.status)}
                              </span>
                              <span
                                className="text-[12px] font-semibold tabular-nums text-[#C47A5A]"
                                style={{
                                  fontFamily: "var(--font-heading)",
                                }}
                              >
                                −{fmtMoney(row.amount, currency)}
                              </span>
                            </div>
                          </div>

                          {showCashier ? (
                            <p
                              className="mt-1 truncate text-[10px] text-[#8A8A8A]"
                              title={row.cashierName}
                            >
                              <span className="tracking-[-0.02em]">By</span>{" "}
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
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
              </section>
            ) : null}
          </div>
        )}
      </div>

      <Link
        href={APP_ROUTES.shifts}
        className={cn(
          "mt-auto shrink-0 border-t border-[color-mix(in_srgb,#141414_8%,transparent)] bg-[#ffffff] px-2.5 py-1.5",
          "text-[9px] font-semibold tracking-[-0.02em] text-[#8A8A8A]",
          "transition-colors hover:bg-[#ffffff] hover:text-[#0f766e]",
        )}
      >
        Shifts & drawouts →
      </Link>
    </aside>
  );
}
