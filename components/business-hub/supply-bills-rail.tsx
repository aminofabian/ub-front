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

/** Viewport height for ~3 rows. */
const SUPPLY_VIEWPORT_CLASS = "max-h-[13.5rem]";

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
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold tracking-[-0.01em] text-[var(--hub-ink,#14211C)]">
            Supply tape
          </p>
          {!empty ? (
            <p className="truncate text-[11px] tabular-nums text-[var(--hub-muted,#5E6B65)]">
              {summary.count} · {fmtMoney(summary.totalInvoiced, currency)}
            </p>
          ) : null}
        </div>
        <Link
          href={`${APP_ROUTES.purchasingAddSupplies}?filter=today`}
          className="flex min-h-8 shrink-0 items-center rounded-[2px] bg-[#F0EDE4] px-2.5 text-[11px] font-semibold text-[var(--hub-ink,#14211C)] transition-colors hover:bg-[#E7E3D8]"
        >
          All
        </Link>
      </header>

      {empty ? (
        <div className="px-3 pb-3 pt-0.5">
          <p className="text-[12px] text-[var(--hub-muted,#5E6B65)]">
            No supplies yet today.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain",
            SUPPLY_VIEWPORT_CLASS,
          )}
        >
          <ol className="flex flex-col">
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
                    "flex items-center gap-2.5 border-t border-[#EFEBE0] px-3 py-2 transition-colors",
                    newest && "bg-[#FCFBF8] hub-figure-pop",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onInspect?.(bill)}
                      aria-label={`Open supply history for ${supplierLabel}`}
                      className={cn(
                        "block max-w-full truncate text-left text-[12px] font-medium text-[var(--hub-ink,#14211C)]",
                        onInspect &&
                          "underline decoration-[var(--hub-accent,#0F4A38)]/30 underline-offset-2 hover:decoration-[var(--hub-accent,#0F4A38)]",
                      )}
                    >
                      <SupplierDisplayName
                        name={bill.supplierName}
                        className="truncate"
                      />
                    </button>
                    <time
                      dateTime={bill.createdAt}
                      className="mt-0.5 block text-[11px] tabular-nums text-[var(--hub-muted,#5E6B65)]"
                      title={new Date(bill.createdAt).toLocaleString()}
                    >
                      {formatClock(bill.createdAt)}
                    </time>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <p className="text-[12px] font-semibold tabular-nums text-[var(--hub-ink,#14211C)]">
                      {fmtMoney(total, currency)}
                    </p>
                    {payEnabled && unpaid ? (
                      <button
                        type="button"
                        onClick={() => onPayBill?.(bill)}
                        className="rounded-lg border border-[var(--hub-accent,#0F4A38)] bg-white px-3 py-[3px] text-[11px] font-semibold text-[var(--hub-accent,#0F4A38)] transition-colors hover:bg-[#E3EEE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent,#0F4A38)]/45"
                        title={`Pay ${supplierLabel}`}
                        aria-label={`Pay bill for ${supplierLabel} (${label})`}
                      >
                        {label === "Partial" ? "Pay · Partial" : "Pay"}
                      </button>
                    ) : (
                      <span className="rounded-full bg-[#E3F3EA] px-2.5 py-[3px] text-[11px] font-semibold text-[#0B6B43]">
                        {label}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
