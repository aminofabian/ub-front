"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import { fmtMoney } from "@/lib/business-hub/formatters";
import type { PathBSupplyListRowRecord } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  isSupplyRowUnpaid,
  summarizeSupplyRows,
} from "@/app/(dashboard)/supplies/_components/supplies-bill-filters";
import { supplyN } from "@/app/(dashboard)/supplies/_components/supplies-shared";

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

function paymentLabel(status: string, unpaid: boolean): string {
  const raw = status.trim().toUpperCase();
  if (raw === "PAID" || !unpaid) return "Paid";
  if (raw === "PARTIAL") return "Partial";
  return "Unpaid";
}

export function SupplyBillsRail({
  bills,
  currency,
  live = false,
  justUpdated = false,
  className,
}: {
  bills: PathBSupplyListRowRecord[];
  currency?: string | null;
  live?: boolean;
  justUpdated?: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const summary = summarizeSupplyRows(bills);
  const empty = bills.length === 0;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      className={cn(
        "hub-rise relative border border-[#E6E1D8] bg-white text-[#141414]",
        justUpdated && "hub-scan-sweep border-[#B08D48]/55",
        className,
      )}
      aria-label="Today's supply bills"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-[#141414]"
        aria-hidden
      />

      <header className="shrink-0 border-b border-[#E6E1D8] px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B08D48]">
              Supply tape
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[#8A8A8A]">
              {empty
                ? "Today’s supply bills"
                : `${summary.count} today · ${fmtMoney(summary.totalInvoiced, currency)}`}
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

      <div className="min-h-0">
        {empty ? (
          <div className="flex min-h-[7rem] flex-col justify-center px-3.5 py-5">
            <p
              className="text-sm font-medium text-[#141414]"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              No supplies yet today…
            </p>
            <p className="mt-1 max-w-[18rem] text-[11px] leading-snug text-[#8A8A8A]">
              New receives will land here in real time.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-[#EDE8DF]">
            {bills.map((bill, i) => {
              const newest = i === 0 && justUpdated;
              const unpaid = isSupplyRowUnpaid(bill);
              const label = paymentLabel(bill.paymentStatus, unpaid);
              const total = supplyN(bill.grandTotal);
              return (
                <li
                  key={bill.supplierInvoiceId}
                  className={cn(
                    "px-3.5 py-3.5 transition-colors sm:px-4",
                    newest && "bg-[#FCFAF6] hub-figure-pop",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span
                        className="font-mono text-[9px] tabular-nums text-[#C4BBA8]"
                        aria-hidden
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <time
                        dateTime={bill.createdAt}
                        className="font-mono text-[12px] font-medium tabular-nums text-[#141414]"
                        title={new Date(bill.createdAt).toLocaleString()}
                      >
                        {formatClock(bill.createdAt)}
                      </time>
                      <span className="text-[9px] uppercase tracking-[0.08em] text-[#AAAAAA]">
                        {formatRelative(bill.createdAt, now)}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]",
                        unpaid
                          ? "border-[#E8DFD0] bg-[#F9F6F0] text-[#8A6B2E]"
                          : "border-emerald-200 bg-emerald-500/10 text-emerald-800",
                      )}
                    >
                      {label}
                    </span>
                  </div>

                  <div className="mt-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className="truncate text-[13px] font-medium text-[#141414]"
                        style={{
                          fontFamily: "var(--font-heading), Georgia, serif",
                        }}
                      >
                        {bill.supplierName || "Supplier"}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-[#8A8A8A]">
                        {bill.invoiceNumber}
                        {bill.lineCount > 0
                          ? ` · ${bill.lineCount} line${bill.lineCount === 1 ? "" : "s"}`
                          : ""}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-[#141414]">
                      {fmtMoney(total, currency)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <footer className="shrink-0 border-t border-[#E6E1D8] px-3.5 py-2">
        <Link
          href={`${APP_ROUTES.purchasingAddSupplies}?filter=today`}
          className="text-[11px] font-medium text-[#8A6B2E] transition-colors hover:text-[#141414]"
        >
          Open supplies
        </Link>
      </footer>
    </section>
  );
}
