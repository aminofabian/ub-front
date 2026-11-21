"use client";

import Link from "next/link";

import { APP_ROUTES } from "@/lib/config";
import { fmtMoney } from "@/lib/business-hub/formatters";
import type { OutstandingTabRowRecord } from "@/lib/api";
import { HUB_RAIL } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";
import { CustomerPhoneFlag } from "@/components/credits/customer-phone-flag";
import { storedCustomerPhoneIssue } from "@/lib/customer-phone";

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

/** Viewport height for ~3 rows. */
const CREDIT_VIEWPORT_CLASS = "max-h-[13.5rem]";

export function CreditTabsRail({
  tabs,
  currency,
  justUpdated = false,
  className,
  onPayTab,
  onInspect,
  paidTotal = null,
  paidCount = null,
  paidPeriodLabel = "today",
}: {
  tabs: OutstandingTabRowRecord[];
  currency?: string | null;
  justUpdated?: boolean;
  className?: string;
  /** Opens the mark-paid dialog for this customer tab. */
  onPayTab?: (tab: OutstandingTabRowRecord) => void;
  /** Opens credit history for this customer. */
  onInspect?: (tab: OutstandingTabRowRecord) => void;
  /** Credit collections in the hub period filter. */
  paidTotal?: number | string | null;
  paidCount?: number | null;
  /** e.g. "today" / "this week" — matches PeriodToggle. */
  paidPeriodLabel?: string;
}) {
  const empty = tabs.length === 0;
  const totalOwed = tabs.reduce((sum, tab) => sum + toNum(tab.balanceOwed), 0);
  const paid = paidTotal == null ? null : toNum(paidTotal);
  const collections =
    paid == null
      ? null
      : paidCount != null && paidCount > 0
        ? `${paidCount} · ${fmtMoney(paid, currency)}`
        : fmtMoney(paid, currency);

  return (
    <section
      className={cn(
        HUB_RAIL,
        justUpdated && "hub-scan-sweep ring-1 ring-[#0f766e]/35",
        className,
      )}
      aria-label="Open credit tabs"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-[var(--hub-ink,#14211C)]">
            Credit tape
          </p>
          {!empty ? (
            <p className="truncate text-[12px] tabular-nums text-[var(--hub-muted,#5E6B65)]">
              {tabs.length} open · {fmtMoney(totalOwed, currency)}
            </p>
          ) : null}
          {collections != null ? (
            <p
              className="truncate text-[12px] font-medium tabular-nums text-[#0B6B43]"
              title={`Credit payments collected ${paidPeriodLabel}`}
            >
              Paid {paidPeriodLabel} · {collections}
            </p>
          ) : null}
        </div>
        <Link
          href={APP_ROUTES.creditsOnTab}
          className="flex min-h-8 shrink-0 items-center rounded-[2px] bg-[#F0EDE4] px-2.5 text-[12px] font-semibold text-[var(--hub-ink,#14211C)] transition-colors hover:bg-[#E7E3D8]"
        >
          All
        </Link>
      </header>

      {empty ? (
        <div className="px-3 pb-3 pt-0.5">
          <p className="text-[13px] text-[var(--hub-muted,#5E6B65)]">
            {paid != null && paid > 0.009
              ? `No open tabs · ${fmtMoney(paid, currency)} collected ${paidPeriodLabel}.`
              : "No open credit tabs."}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain",
            CREDIT_VIEWPORT_CLASS,
          )}
        >
          <ol className="flex flex-col">
            {tabs.map((tab, i) => {
              const newest = i === 0 && justUpdated;
              const owed = toNum(tab.balanceOwed);
              const name = tab.name?.trim() || "Customer";
              const payEnabled = Boolean(onPayTab);
              return (
                <li
                  key={tab.customerId}
                  className={cn(
                    "flex items-center gap-2.5 border-t border-[#EFEBE0] px-3 py-2 transition-colors",
                    newest && "bg-[#FCFBF8] hub-figure-pop",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onInspect?.(tab)}
                      aria-label={`Open credit history for ${name}`}
                      className={cn(
                        "block max-w-full truncate text-left text-[14px] font-medium text-[var(--hub-ink,#14211C)]",
                        onInspect &&
                          "underline decoration-[var(--hub-accent,#0F4A38)]/30 underline-offset-2 hover:decoration-[var(--hub-accent,#0F4A38)]",
                      )}
                    >
                      {name}
                    </button>
                    {tab.primaryPhone?.trim() ? (
                      <>
                        <p
                          className={cn(
                            "mt-0.5 truncate text-[12px] tabular-nums",
                            storedCustomerPhoneIssue(tab.primaryPhone)
                              ? "font-semibold text-red-700"
                              : "text-[var(--hub-muted,#5E6B65)]",
                          )}
                        >
                          {tab.primaryPhone.trim()}
                        </p>
                        <CustomerPhoneFlag
                          phone={tab.primaryPhone}
                          compact
                          className="mt-0.5 text-[11px] text-red-700"
                        />
                      </>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <p className="max-w-[7rem] truncate text-right text-[14px] font-semibold tabular-nums text-[var(--hub-ink,#14211C)]">
                      {fmtMoney(owed, currency)}
                    </p>
                    {payEnabled ? (
                      <button
                        type="button"
                        onClick={() => onPayTab?.(tab)}
                        className="rounded-lg border border-[var(--hub-accent,#0F4A38)] bg-white px-3 py-[3px] text-[12px] font-semibold text-[var(--hub-accent,#0F4A38)] transition-colors hover:bg-[#E3EEE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent,#0F4A38)]/45"
                        title={`Record credit payment for ${name}`}
                        aria-label={`Pay credit tab for ${name}`}
                      >
                        Pay
                      </button>
                    ) : (
                      <span className="rounded-full bg-[#FBEBD2] px-2.5 py-[3px] text-[12px] font-semibold text-[#8A4B00]">
                        Owed
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
