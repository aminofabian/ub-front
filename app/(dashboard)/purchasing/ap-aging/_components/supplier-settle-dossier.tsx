"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, CreditCard, Package, Receipt } from "lucide-react";

import {
  fetchPathBSupplyInvoiceDetail,
  type PathBSupplyInvoiceDetailRecord,
  type PathBSupplyListRowRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const OWED = "text-[#d92d20]";
const CARD =
  "rounded-2xl bg-white ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(16,24,40,0.05)]";
const HAIR =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

function money(n: number | string): string {
  const val = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(val)) return "0.00";
  return val.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function n(v: number | string | null | undefined): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function qtyLabel(v: number | string | null | undefined): string {
  const x = n(v);
  return x.toLocaleString("en-KE", {
    maximumFractionDigits: Number.isInteger(x) ? 0 : 2,
  });
}

function shortDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  });
}

type AggregatedLine = {
  key: string;
  description: string;
  qty: number;
  total: number;
  billIds: string[];
};

export function SupplierSettleDossier({
  supplierName,
  bills,
  currency,
  onPayBill,
  onPayAll,
}: {
  supplierName: string;
  bills: PathBSupplyListRowRecord[];
  currency: string;
  onPayBill: (bill: PathBSupplyListRowRecord) => void;
  onPayAll: () => void;
}) {
  const [focusId, setFocusId] = useState<string | "all">("all");
  const [details, setDetails] = useState<
    Record<string, PathBSupplyInvoiceDetailRecord | null>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const billIds = useMemo(
    () => bills.map((b) => b.supplierInvoiceId).join("|"),
    [bills],
  );

  useEffect(() => {
    let cancelled = false;
    const ids = bills.map((b) => b.supplierInvoiceId);
    if (ids.length === 0) {
      setDetails({});
      return;
    }
    setLoading(true);
    setError("");
    setFocusId("all");
    void (async () => {
      const next: Record<string, PathBSupplyInvoiceDetailRecord | null> = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            next[id] = await fetchPathBSupplyInvoiceDetail(id);
          } catch {
            next[id] = null;
          }
        }),
      );
      if (cancelled) return;
      setDetails(next);
      setLoading(false);
      const failed = ids.filter((id) => next[id] == null).length;
      if (failed === ids.length) {
        setError("Could not load what was delivered for these bills.");
      } else if (failed > 0) {
        setError("Some delivery slips could not be loaded.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // billIds is a stable fingerprint of the bill set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billIds]);

  const openTotal = useMemo(
    () => bills.reduce((s, b) => s + n(b.balanceOpen), 0),
    [bills],
  );
  const grandTotal = useMemo(
    () => bills.reduce((s, b) => s + n(b.grandTotal), 0),
    [bills],
  );
  const paidTotal = useMemo(
    () => bills.reduce((s, b) => s + n(b.amountPaid), 0),
    [bills],
  );
  const paidShare =
    grandTotal > 0.009
      ? Math.min(100, Math.round((paidTotal / grandTotal) * 100))
      : 0;

  const activeDetails = useMemo(() => {
    if (focusId === "all") {
      return bills
        .map((b) => details[b.supplierInvoiceId])
        .filter((d): d is PathBSupplyInvoiceDetailRecord => d != null);
    }
    const one = details[focusId];
    return one ? [one] : [];
  }, [bills, details, focusId]);

  const aggregated = useMemo(() => {
    const map = new Map<string, AggregatedLine>();
    for (const detail of activeDetails) {
      for (const line of detail.lines) {
        const desc = line.description?.trim() || "Line item";
        const key = `${line.itemId ?? "x"}::${desc.toLowerCase()}`;
        const prev = map.get(key);
        const qty = n(line.usableQty) || n(line.qty);
        const total = n(line.lineTotal);
        if (prev) {
          prev.qty += qty;
          prev.total += total;
          if (!prev.billIds.includes(detail.supplierInvoiceId)) {
            prev.billIds.push(detail.supplierInvoiceId);
          }
        } else {
          map.set(key, {
            key,
            description: desc,
            qty,
            total,
            billIds: [detail.supplierInvoiceId],
          });
        }
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [activeDetails]);

  const expenses = useMemo(() => {
    const rows: { id: string; label: string; amount: number; bill: string }[] =
      [];
    for (const detail of activeDetails) {
      for (const exp of detail.expenses ?? []) {
        rows.push({
          id: exp.id,
          label: exp.description?.trim() || exp.category || "Extra cost",
          amount: n(exp.amount),
          bill: detail.invoiceNumber,
        });
      }
    }
    return rows;
  }, [activeDetails]);

  const focusBill =
    focusId === "all"
      ? null
      : (bills.find((b) => b.supplierInvoiceId === focusId) ?? null);

  return (
    <section className={cn(CARD, "flex min-h-0 flex-col overflow-hidden")}>
      <div className={cn("shrink-0 border-b px-4 py-4 sm:px-5", HAIR)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
              Settling with
            </p>
            <h2
              className="mt-1 truncate text-[1.35rem] font-semibold leading-none tracking-[-0.03em] text-[#101828] sm:text-[1.55rem]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {supplierName}
            </h2>
            <p className="mt-1.5 text-[13px] text-[#667085]">
              {bills.length} open bill{bills.length === 1 ? "" : "s"} · see what
              was delivered before you pay
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
              Still owing
            </p>
            <p
              className={cn(
                "mt-1 text-[1.5rem] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[1.75rem]",
                OWED,
              )}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {currency} {money(openTotal)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="font-medium text-[#667085]">
              Paid {currency} {money(paidTotal)} of {money(grandTotal)}
            </span>
            <span className="tabular-nums text-[#98a2b3]">{paidShare}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eef1f0]">
            <div
              className="h-full rounded-full bg-[#0f766e] transition-[width] duration-500 ease-out"
              style={{ width: `${paidShare}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPayAll}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0f766e] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0d6b63]"
          >
            <CreditCard className="size-4" aria-hidden />
            Pay {bills.length > 1 ? "these bills" : "this bill"}
            <ArrowRight className="size-4" aria-hidden />
          </button>
          {focusBill ? (
            <button
              type="button"
              onClick={() => onPayBill(focusBill)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#e6f4f0] px-3.5 text-[13px] font-semibold text-[#0f766e] transition-colors hover:bg-[#d9ede7]"
            >
              Pay {focusBill.invoiceNumber} only
            </button>
          ) : null}
        </div>
      </div>

      <div className={cn("shrink-0 border-b px-4 py-3 sm:px-5", HAIR)}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
          Delivery slips
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setFocusId("all")}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors",
              focusId === "all"
                ? "bg-[#0f766e] text-white"
                : "bg-[#f1f5f4] text-[#344054] hover:bg-[#e6eae9]",
            )}
          >
            <Package className="size-3.5" aria-hidden />
            Everything
          </button>
          {bills.map((bill) => {
            const active = focusId === bill.supplierInvoiceId;
            return (
              <button
                key={bill.supplierInvoiceId}
                type="button"
                onClick={() => setFocusId(bill.supplierInvoiceId)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors",
                  active
                    ? "bg-[#0f766e] text-white"
                    : "bg-[#f1f5f4] text-[#344054] hover:bg-[#e6eae9]",
                )}
              >
                <Receipt className="size-3.5 opacity-80" aria-hidden />
                <span className="max-w-[9rem] truncate">
                  {bill.invoiceNumber}
                </span>
                <span
                  className={cn(
                    "tabular-nums",
                    active ? "text-white/80" : "text-[#98a2b3]",
                  )}
                >
                  {money(bill.balanceOpen)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4 sm:p-5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-[#eef1f0]"
              />
            ))}
          </div>
        ) : error && aggregated.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-[#667085] sm:px-5">
            {error}
          </p>
        ) : aggregated.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-14 text-center sm:px-5">
            <Package className="mb-3 size-8 text-[#98a2b3]" aria-hidden />
            <p className="text-[15px] font-semibold text-[#101828]">
              No line items on these slips
            </p>
            <p className="mt-1 max-w-sm text-[12px] text-[#667085]">
              The bills exist, but there are no product lines to show. You can
              still pay the open balance.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex items-end justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#101828]">
                  What you&apos;re paying for
                </h3>
                <p className="mt-0.5 text-[12px] text-[#667085]">
                  {aggregated.length} item
                  {aggregated.length === 1 ? "" : "s"}
                  {focusId === "all" && bills.length > 1
                    ? " across these deliveries"
                    : focusBill
                      ? ` on ${focusBill.invoiceNumber}`
                      : null}
                </p>
              </div>
              {error ? (
                <p className="text-[11px] text-[#b45309]">{error}</p>
              ) : null}
            </div>

            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] overflow-hidden rounded-2xl ring-1 ring-black/[0.05]">
              {aggregated.map((line, index) => (
                <li
                  key={line.key}
                  className="flex items-start justify-between gap-3 bg-white px-3.5 py-3 sm:px-4"
                >
                  <div className="flex min-w-0 gap-3">
                    <span
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#e6f4f0] text-[11px] font-bold tabular-nums text-[#0f766e]"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium leading-snug text-[#101828]">
                        {line.description}
                      </p>
                      <p className="mt-0.5 text-[12px] tabular-nums text-[#667085]">
                        Qty {qtyLabel(line.qty)}
                        {focusId === "all" && line.billIds.length > 1
                          ? ` · on ${line.billIds.length} bills`
                          : null}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-[14px] font-semibold tabular-nums text-[#101828]">
                    {money(line.total)}
                  </p>
                </li>
              ))}
            </ul>

            {expenses.length > 0 ? (
              <div className="mt-4">
                <h4 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3]">
                  Extra costs on the slip
                </h4>
                <ul className="mt-2 space-y-1.5">
                  {expenses.map((exp) => (
                    <li
                      key={exp.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f8f7] px-3 py-2 text-[13px]"
                    >
                      <span className="min-w-0 truncate text-[#344054]">
                        {exp.label}
                        <span className="text-[#98a2b3]"> · {exp.bill}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-[#101828]">
                        {money(exp.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {focusBill ? (
              <div className="mt-4 rounded-2xl bg-[#f6f8f7] px-3.5 py-3 text-[12px] text-[#667085]">
                <span className="font-semibold text-[#344054]">
                  {focusBill.invoiceNumber}
                </span>
                {focusBill.createdAt
                  ? ` · received ${shortDate(focusBill.createdAt)}`
                  : null}
                {" · "}
                open {currency} {money(focusBill.balanceOpen)} of{" "}
                {money(focusBill.grandTotal)}
              </div>
            ) : bills.length > 1 ? (
              <ul className="mt-4 space-y-2">
                {bills.map((bill) => (
                  <li
                    key={bill.supplierInvoiceId}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f8f7] px-3 py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => setFocusId(bill.supplierInvoiceId)}
                      className="min-w-0 text-left"
                    >
                      <p className="truncate text-[13px] font-semibold text-[#101828]">
                        {bill.invoiceNumber}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#667085]">
                        {bill.lineCount} line
                        {bill.lineCount === 1 ? "" : "s"}
                        {bill.createdAt
                          ? ` · ${shortDate(bill.createdAt)}`
                          : null}
                      </p>
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          "text-[13px] font-semibold tabular-nums",
                          OWED,
                        )}
                      >
                        {money(bill.balanceOpen)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onPayBill(bill)}
                        className="inline-flex h-9 items-center rounded-xl bg-white px-2.5 text-[12px] font-semibold text-[#0f766e] ring-1 ring-black/[0.05] transition-colors hover:bg-[#e6f4f0]"
                      >
                        Pay
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

export function ApAgingOverviewPane({
  pulseStack,
  ageList,
}: {
  pulseStack: ReactNode;
  ageList: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      {pulseStack}
      {ageList}
      <p className="px-1 text-[12px] leading-relaxed text-[#667085]">
        Tip: tap a supplier on the left to open their delivery slips and see
        exactly which items you&apos;re settling.
      </p>
    </div>
  );
}
