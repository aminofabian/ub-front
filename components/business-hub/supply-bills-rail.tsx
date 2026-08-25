"use client";

import Link from "next/link";

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

function paymentLabel(status: string, unpaid: boolean): string {
  const raw = status.trim().toUpperCase();
  if (raw === "PAID" || !unpaid) return "Paid";
  if (raw === "PARTIAL") return "Partial";
  return "Unpaid";
}

/** Viewport height for ~2 compact rows. */
const SUPPLY_VIEWPORT_CLASS = "max-h-[5.5rem]";

export function SupplyBillsRail({
  bills,
  currency,
  live = false,
  justUpdated = false,
  className,
  onPayBill,
}: {
  bills: PathBSupplyListRowRecord[];
  currency?: string | null;
  live?: boolean;
  justUpdated?: boolean;
  className?: string;
  /** Opens the supplier payment drawer for this bill. */
  onPayBill?: (bill: PathBSupplyListRowRecord) => void;
}) {
  const summary = summarizeSupplyRows(bills);
  const empty = bills.length === 0;

  return (
    <section
      className={cn(
        "hub-rise relative text-[#141414]",
        justUpdated && "hub-scan-sweep",
        className,
      )}
      aria-label="Today's supply bills"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 py-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="truncate text-[13px] font-semibold tracking-tight text-[#141414]">
            Supplier bills
          </p>
          {!empty ? (
            <p className="truncate text-[10px] text-[#8A8A8A]">
              {summary.count} · {fmtMoney(summary.totalInvoiced, currency)}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {live ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald-800">
              <span
                className="size-1.5 bg-emerald-500 hub-live-beacon"
                aria-hidden
              />
              Live
            </span>
          ) : null}
          <Link
            href={`${APP_ROUTES.purchasingAddSupplies}?filter=today`}
            className="text-[10px] font-medium text-[#8A6B2E] transition-colors hover:text-[#141414]"
          >
            All
          </Link>
        </div>
      </header>

      {empty ? (
        <div className="px-3 py-2.5">
          <p className="text-[11px] text-[#8A8A8A]">No supplies yet today.</p>
        </div>
      ) : (
        <div
          className={cn("min-h-0 overflow-y-auto overscroll-contain", SUPPLY_VIEWPORT_CLASS)}
        >
          <ol className="divide-y divide-[#EDE8DF]">
            {bills.map((bill, i) => {
              const newest = i === 0 && justUpdated;
              const unpaid = isSupplyRowUnpaid(bill);
              const label = paymentLabel(bill.paymentStatus, unpaid);
              const total = supplyN(bill.grandTotal);
              const payEnabled = Boolean(onPayBill);
              return (
                <li
                  key={bill.supplierInvoiceId}
                  className={cn(
                    "flex items-center gap-2 py-1.5 transition-colors",
                    newest && "bg-[#FCFAF6] hub-figure-pop",
                  )}
                >
                  <time
                    dateTime={bill.createdAt}
                    className="shrink-0 font-mono text-[10px] tabular-nums text-[#8A8A8A]"
                    title={new Date(bill.createdAt).toLocaleString()}
                  >
                    {formatClock(bill.createdAt)}
                  </time>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-[#141414]">
                      {bill.supplierName || "Supplier"}
                    </p>
                  </div>
                  {payEnabled ? (
                    <button
                      type="button"
                      onClick={() => onPayBill?.(bill)}
                      className={cn(
                        "shrink-0 rounded-sm px-1 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/45",
                        unpaid
                          ? "bg-[#F3EBD9] text-[#8A6B2E] hover:bg-[#E8D9B8] hover:text-[#141414]"
                          : "text-emerald-800 hover:bg-emerald-50",
                      )}
                      title={
                        unpaid
                          ? `Pay ${bill.supplierName || "supplier"}`
                          : `Payment details · ${bill.supplierName || "supplier"}`
                      }
                      aria-label={
                        unpaid
                          ? `Pay bill for ${bill.supplierName || "supplier"} (${label})`
                          : `View payment details for ${bill.supplierName || "supplier"}`
                      }
                    >
                      {unpaid ? (label === "Partial" ? "Pay · Partial" : "Pay") : label}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]",
                        unpaid ? "text-[#8A6B2E]" : "text-emerald-800",
                      )}
                    >
                      {label}
                    </span>
                  )}
                  <p className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-[#141414]">
                    {fmtMoney(total, currency)}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
