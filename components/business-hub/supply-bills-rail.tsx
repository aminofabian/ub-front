"use client";

import Link from "next/link";

import { APP_ROUTES } from "@/lib/config";
import { fmtMoney } from "@/lib/business-hub/formatters";
import type { PathBSupplyListRowRecord } from "@/lib/api";
import { displaySupplierName } from "@/lib/supplier-display";
import { SupplierDisplayName } from "@/components/suppliers/supplier-display-name";
import { HUB_RAIL } from "@/lib/business-hub/constants";
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
  justUpdated = false,
  className,
  onPayBill,
  onInspect,
}: {
  bills: PathBSupplyListRowRecord[];
  currency?: string | null;
  justUpdated?: boolean;
  className?: string;
  /** Opens the supplier payment drawer for this bill. */
  onPayBill?: (bill: PathBSupplyListRowRecord) => void;
  /** Opens supply history for this supplier. */
  onInspect?: (bill: PathBSupplyListRowRecord) => void;
}) {
  const summary = summarizeSupplyRows(bills);
  const empty = bills.length === 0;

  return (
    <section
      className={cn(
        HUB_RAIL,
        justUpdated && "hub-scan-sweep ring-1 ring-[#0f766e]/35",
        className,
      )}
      aria-label="Today's supply bills"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,#141414_6%,transparent)] px-3.5 py-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="truncate text-[12px] font-medium tracking-[-0.01em] text-[#141414]">
            Supply tape
          </p>
          {!empty ? (
            <p className="truncate text-[10px] text-[#8A8A8A]">
              {summary.count} · {fmtMoney(summary.totalInvoiced, currency)}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`${APP_ROUTES.purchasingAddSupplies}?filter=today`}
            className="text-[10px] font-medium text-[#0f766e] transition-colors hover:text-[#141414]"
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
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain",
            SUPPLY_VIEWPORT_CLASS,
          )}
        >
          <ol className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
            {bills.map((bill, i) => {
              const newest = i === 0 && justUpdated;
              const unpaid = isSupplyRowUnpaid(bill);
              const label = paymentLabel(bill.paymentStatus, unpaid);
              const total = supplyN(bill.grandTotal);
              const payEnabled = Boolean(onPayBill);
              const supplierLabel = displaySupplierName({
                name: bill.supplierName,
                fallback: "Supplier",
              });
              return (
                <li
                  key={bill.supplierInvoiceId}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 transition-colors",
                    newest && "bg-[#ffffff] hub-figure-pop",
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
                    <button
                      type="button"
                      onClick={() => onInspect?.(bill)}
                      aria-label={`Open supply history for ${supplierLabel}`}
                      className={cn(
                        "block max-w-full truncate text-left text-[12px] font-medium text-[#141414]",
                        onInspect &&
                          "underline decoration-[#0f766e]/40 underline-offset-2 hover:decoration-[#0f766e]",
                      )}
                    >
                      <SupplierDisplayName
                        name={bill.supplierName}
                        className="truncate"
                      />
                    </button>
                  </div>
                  {payEnabled ? (
                    <button
                      type="button"
                      onClick={() => onPayBill?.(bill)}
                      className={cn(
                        "shrink-0 rounded-none px-1.5 py-0.5 text-[9px] font-semibold tracking-[-0.02em] transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/45",
                        unpaid
                          ? "border border-[#0f766e] bg-white text-[#0f766e] hover:bg-white"
                          : "text-emerald-800 hover:bg-emerald-50",
                      )}
                      title={
                        unpaid
                          ? `Pay ${supplierLabel}`
                          : `Payment details · ${supplierLabel}`
                      }
                      aria-label={
                        unpaid
                          ? `Pay bill for ${supplierLabel} (${label})`
                          : `View payment details for ${supplierLabel}`
                      }
                    >
                      {unpaid
                        ? label === "Partial"
                          ? "Pay · Partial"
                          : "Pay"
                        : label}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "shrink-0 text-[9px] font-semibold tracking-[-0.02em]",
                        unpaid ? "text-[#0f766e]" : "text-emerald-800",
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
