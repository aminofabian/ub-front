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

/** Viewport height for ~2 compact rows. */
const CREDIT_VIEWPORT_CLASS = "max-h-[5.5rem]";

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
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,#141414_6%,transparent)] px-3.5 py-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 items-baseline gap-2">
            <p className="truncate text-[12px] font-medium tracking-[-0.01em] text-[#141414]">
              Credit tape
            </p>
            {!empty ? (
              <p className="truncate text-[10px] text-[#8A8A8A]">
                {tabs.length} open · {fmtMoney(totalOwed, currency)}
              </p>
            ) : null}
          </div>
          {collections != null ? (
            <p
              className="truncate text-[10px] font-medium tabular-nums text-emerald-800"
              title={`Credit payments collected ${paidPeriodLabel}`}
            >
              Paid {paidPeriodLabel} · {collections}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={APP_ROUTES.creditsOnTab}
            className="text-[10px] font-medium text-[#0f766e] transition-colors hover:text-[#141414]"
          >
            All
          </Link>
        </div>
      </header>

      {empty ? (
        <div className="px-3 py-2.5">
          <p className="text-[11px] text-[#8A8A8A]">
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
          <ol className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
            {tabs.map((tab, i) => {
              const newest = i === 0 && justUpdated;
              const owed = toNum(tab.balanceOwed);
              const name = tab.name?.trim() || "Customer";
              const payEnabled = Boolean(onPayTab);
              return (
                <li
                  key={tab.customerId}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 transition-colors",
                    newest && "bg-[#ffffff] hub-figure-pop",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onInspect?.(tab)}
                      aria-label={`Open credit history for ${name}`}
                      className={cn(
                        "block max-w-full truncate text-left text-[12px] font-medium text-[#141414]",
                        onInspect &&
                          "underline decoration-[#C47A5A]/45 underline-offset-2 hover:decoration-[#C47A5A]",
                      )}
                    >
                      {name}
                    </button>
                    {tab.primaryPhone?.trim() ? (
                      <>
                        <p
                          className={cn(
                            "truncate font-mono text-[10px] tabular-nums",
                            storedCustomerPhoneIssue(tab.primaryPhone)
                              ? "font-semibold text-red-700"
                              : "text-[#8A8A8A]",
                          )}
                        >
                          {tab.primaryPhone.trim()}
                        </p>
                        <CustomerPhoneFlag
                          phone={tab.primaryPhone}
                          compact
                          className="mt-0.5 text-[10px] text-red-700"
                        />
                      </>
                    ) : null}
                  </div>
                  {payEnabled ? (
                    <button
                      type="button"
                      onClick={() => onPayTab?.(tab)}
                      className={cn(
                        "shrink-0 rounded-none border border-[#0f766e] bg-white px-1.5 py-0.5 text-[9px] font-semibold tracking-[-0.02em] text-[#0f766e]",
                        "transition-colors hover:bg-white",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/45",
                      )}
                      title={`Record credit payment for ${name}`}
                      aria-label={`Pay credit tab for ${name}`}
                    >
                      Pay
                    </button>
                  ) : (
                    <span className="shrink-0 text-[9px] font-semibold tracking-[-0.02em] text-[#0f766e]">
                      Owed
                    </span>
                  )}
                  <p className="shrink-0 max-w-[6.5rem] truncate font-mono text-[11px] font-semibold tabular-nums text-right text-[#141414]">
                    {fmtMoney(owed, currency)}
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
