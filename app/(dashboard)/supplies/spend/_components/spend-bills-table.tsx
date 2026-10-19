"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Receipt } from "lucide-react";

import type { PathBSupplyListRowRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { supChipActive, supChipIdle } from "../../../suppliers/_components/supplier-ui-tokens";
import {
  formatSupplyMoney,
  supplyN,
  supplyPaymentStatusBadge,
} from "../../_components/supplies-shared";
import { supplyRowDate } from "../_lib/spend-periods";

type BillFilter = "all" | "unpaid" | "paid";

function isUnpaid(row: PathBSupplyListRowRecord): boolean {
  return supplyN(row.balanceOpen) > 0.009;
}

function sourceLabel(source: string | null | undefined): string {
  return source === "path_b" ? "Walk-in" : "Order";
}

export function SpendBillsTable({
  rows,
  currency,
}: {
  rows: PathBSupplyListRowRecord[];
  currency: string;
}) {
  const [filter, setFilter] = useState<BillFilter>("all");
  const [expanded, setExpanded] = useState(false);

  const counts = useMemo(
    () => ({
      all: rows.length,
      unpaid: rows.filter(isUnpaid).length,
      paid: rows.filter((row) => !isUnpaid(row)).length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    if (filter === "unpaid") return rows.filter(isUnpaid);
    if (filter === "paid") return rows.filter((row) => !isUnpaid(row));
    return rows;
  }, [filter, rows]);

  const visible = expanded ? filtered : filtered.slice(0, 10);

  const filters: { id: BillFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unpaid", label: "Unpaid" },
    { id: "paid", label: "Paid" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Filter bills by payment status"
        >
          {filters.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFilter(item.id);
                  setExpanded(false);
                }}
                className={cn(active ? supChipActive : supChipIdle, "h-7")}
              >
                {item.label}
                <span
                  className={cn(
                    "ml-1 tabular-nums",
                    active ? "text-white/70" : "text-[var(--op-faint)]",
                  )}
                >
                  {counts[item.id]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10.5px] text-[var(--op-faint)]">
          Posted supply bills · newest first
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--op-rule)] px-4 py-10 text-center">
          <Receipt className="size-4 text-[var(--op-faint)]" aria-hidden />
          <p className="text-[12px] text-[var(--op-muted)]">
            {filter === "unpaid"
              ? "Every bill in this period is paid."
              : filter === "paid"
                ? "No fully paid bills in this period."
                : "No bills in this period."}
          </p>
          {filter !== "all" ? (
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="text-[11px] font-semibold text-[var(--op-accent)] underline underline-offset-2"
            >
              Show all bills
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="hidden border-y border-[var(--op-rule)] bg-[var(--op-surface)] text-[10.5px] font-semibold text-[var(--op-faint)] sm:grid sm:grid-cols-[4.75rem_minmax(0,1.5fr)_9rem_5.5rem_7rem_6.5rem_7rem] sm:items-center sm:gap-2 sm:px-2 sm:py-1.5">
            <span>Date</span>
            <span>Supplier</span>
            <span>Invoice</span>
            <span>Status</span>
            <span className="text-right">Billed</span>
            <span className="text-right">Paid</span>
            <span className="text-right">Open</span>
          </div>

          <ul className="divide-y divide-[var(--op-rule-soft)]">
            {visible.map((row) => {
              const open = supplyN(row.balanceOpen);
              const badge = supplyPaymentStatusBadge(row.paymentStatus);
              const date = supplyRowDate(row);
              return (
                <li
                  key={row.supplierInvoiceId}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-2 py-2.5 text-[12px] transition-colors hover:bg-[color-mix(in_srgb,var(--op-accent)_3%,var(--op-surface))] sm:grid-cols-[4.75rem_minmax(0,1.5fr)_9rem_5.5rem_7rem_6.5rem_7rem] sm:items-center sm:gap-2"
                >
                  <span className="hidden text-[10.5px] tabular-nums text-[var(--op-muted)] sm:block">
                    {date.toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate font-semibold tracking-[-0.01em] text-[var(--op-ink)]">
                      {row.supplierName}
                    </p>
                    <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-[var(--op-faint)] sm:hidden">
                      <span className="tabular-nums">
                        {date.toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span aria-hidden>·</span>
                      <span className="truncate">{row.invoiceNumber}</span>
                      <span aria-hidden>·</span>
                      <span>{sourceLabel(row.source)}</span>
                    </p>
                    <p className="mt-0.5 hidden text-[10px] text-[var(--op-faint)] sm:block">
                      {sourceLabel(row.source)}
                    </p>
                  </div>

                  <span className="hidden truncate text-[11px] tabular-nums text-[var(--op-muted)] sm:block">
                    {row.invoiceNumber}
                  </span>

                  <span className="hidden sm:block">
                    <span
                      className={cn(
                        "inline-flex items-center px-1.5 py-0.5 text-[9.5px] font-semibold",
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                  </span>

                  <span className="hidden text-right font-semibold tabular-nums text-[var(--op-ink)] sm:block">
                    {formatSupplyMoney(supplyN(row.grandTotal), currency)}
                  </span>
                  <span className="hidden text-right tabular-nums text-[var(--op-muted)] sm:block">
                    {formatSupplyMoney(supplyN(row.amountPaid), currency)}
                  </span>

                  <div className="min-w-0 text-right">
                    <p className="font-semibold tabular-nums text-[var(--op-ink)] sm:hidden">
                      {formatSupplyMoney(supplyN(row.grandTotal), currency)}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 font-semibold tabular-nums sm:mt-0",
                        open > 0.009
                          ? "text-[var(--op-highlight)]"
                          : "text-[var(--op-muted)]",
                      )}
                    >
                      {open > 0.009
                        ? formatSupplyMoney(open, currency)
                        : "—"}
                    </p>
                    <span className="mt-1 inline-flex sm:hidden">
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 text-[9.5px] font-semibold",
                          badge.className,
                        )}
                      >
                        {badge.label}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {filtered.length > 10 ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-2 inline-flex h-8 items-center gap-1 border border-[var(--op-rule)] bg-[var(--op-surface)] px-2.5 text-[11px] font-semibold text-[var(--op-muted)] transition-colors hover:text-[var(--op-ink)]"
            >
              {expanded ? (
                <>
                  <ChevronUp className="size-3" aria-hidden />
                  Show first 10
                </>
              ) : (
                <>
                  <ChevronDown className="size-3" aria-hidden />
                  Show all {filtered.length} bills
                </>
              )}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
