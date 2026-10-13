"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/business-hub/formatters";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchCashSurplus,
  postProfitPocket,
  type CashSurplusRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoDaySpan(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

function fmtDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

type ProfitPocketDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  from: string;
  to: string;
  branchId?: string | null;
  periodLabel: string;
  /** When set, the amount starts here instead of the jar suggestion. */
  initialAmount?: number | null;
  onPocketed?: () => void;
};

export function ProfitPocketDrawer({
  open,
  onOpenChange,
  from,
  to,
  branchId,
  periodLabel,
  initialAmount,
  onPocketed,
}: ProfitPocketDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [surplus, setSurplus] = useState<CashSurplusRecord | null>(null);
  const [nextSurplus, setNextSurplus] = useState<CashSurplusRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [leaveFloat, setLeaveFloat] = useState("");
  const [fundingMethod, setFundingMethod] = useState<
    "cash" | "mpesa_manual" | "bank"
  >("cash");
  const [confirmHigh, setConfirmHigh] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) {
      setConfirmHigh(false);
      setNote("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNextSurplus(null);
    void (async () => {
      try {
        const data = await fetchCashSurplus({
          from,
          to,
          branchId: branchId ?? undefined,
        });
        if (cancelled) return;
        setSurplus(data);
        const seeded =
          initialAmount != null && Number.isFinite(initialAmount) && initialAmount > 0
            ? initialAmount
            : toNum(data.suggestedPocket);
        setAmount(String(seeded));
        setLeaveFloat(String(toNum(data.defaultFloat)));

        // Preview the next period's profit so the owner can choose how much of
        // this one to pocket vs keep back for upcoming bills.
        const span = isoDaySpan(from, to);
        try {
          const next = await fetchCashSurplus({
            from: addDaysIso(to, 1),
            to: addDaysIso(to, span),
            branchId: branchId ?? undefined,
          });
          if (!cancelled) setNextSurplus(next);
        } catch {
          if (!cancelled) setNextSurplus(null);
        }
      } catch (e) {
        if (cancelled) return;
        setSurplus(null);
        setError(
          e instanceof Error ? e.message : "Could not load cash surplus.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, from, to, branchId, initialAmount]);

  const amountN = Number(amount);
  const suggested = toNum(surplus?.suggestedPocket);
  // Pocket against net profit (bills already taken out), never gross.
  const net = toNum(surplus?.netProfit ?? surplus?.grossProfit);
  const balance = Math.max(0, toNum(surplus?.profitBalance));
  const pocketingBalance =
    balance > 0 &&
    Number.isFinite(amountN) &&
    Math.abs(amountN - balance) < 0.02 &&
    amountN <= net + 0.009;
  const nextHasData =
    nextSurplus != null &&
    (toNum(nextSurplus.grossProfit) !== 0 ||
      toNum(nextSurplus.cashTakings) !== 0 ||
      toNum(nextSurplus.mpesaTakings) !== 0);
  const warnings = useMemo(() => {
    const list: { id: string; text: string }[] = [];
    if (net < 0) {
      list.push({
        id: "negative_gp",
        text: `Net profit is negative (${fmtMoney(net)}). Bills are not covered yet — taking money out now may leave the shop short.`,
      });
    }
    if (
      !pocketingBalance &&
      Number.isFinite(amountN) &&
      amountN > suggested + 0.009
    ) {
      list.push({
        id: "above_surplus",
        text: `Amount is above the suggested pocket (${fmtMoney(suggested)}).`,
      });
    }
    const liquid = toNum(surplus?.rawSurplus);
    if (Number.isFinite(amountN) && liquid > 0 && amountN > liquid + 0.009) {
      list.push({
        id: "above_liquid",
        text: `Amount is above the cash available (${fmtMoney(liquid)}).`,
      });
    }
    if ((surplus?.openShifts ?? 0) > 0) {
      list.push({
        id: "open_shifts",
        text: `${surplus?.openShifts} open shift(s) — this figure may still change.`,
      });
    }
    if (net > 0 && Number.isFinite(amountN) && amountN > net + 0.009) {
      list.push({
        id: "above_profit",
        text: `Amount is above net profit (${fmtMoney(net)}). Confirm only if this is a separate withdrawal, not a share of this profit.`,
      });
    } else if (net <= 0 && Number.isFinite(amountN) && amountN > 0) {
      list.push({
        id: "above_profit",
        text: "There is no net profit in this period. Confirm only if this is a separate withdrawal.",
      });
    }
    return list;
  }, [net, amountN, suggested, surplus?.openShifts, surplus?.rawSurplus, pocketingBalance]);

  const needsHardConfirm =
    !pocketingBalance &&
    ((Number.isFinite(amountN) && suggested > 0 && amountN > suggested * 1.5) ||
      warnings.some((w) => w.id === "above_profit"));

  const pocketShare =
    net > 0 && Number.isFinite(amountN) && amountN >= 0
      ? (amountN / net) * 100
      : null;
  const shareWidth =
    pocketShare == null ? 0 : Math.max(0, Math.min(100, pocketShare));
  const remainingProfit =
    net - (Number.isFinite(amountN) ? amountN : 0);

  const onConfirm = async () => {
    if (!surplus) return;
    if (!surplus.destinationConfigured) {
      setError("Set a Profit Pocket destination in Payments settings first.");
      return;
    }
    if (!Number.isFinite(amountN) || amountN <= 0) {
      setError("Enter a positive amount to pocket.");
      return;
    }
    if (needsHardConfirm && !confirmHigh) {
      setConfirmHigh(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await postProfitPocket({
        periodFrom: from,
        periodTo: to,
        branchId: branchId ?? undefined,
        amount: amountN,
        leaveFloat: Number(leaveFloat) || 0,
        fundingMethod,
        acknowledgedWarnings: warnings.map((w) => w.id),
        note: note.trim() || undefined,
      });
      const send = result.sendMoneyStatus;
      const sendNote =
        send === "pending"
          ? "Send Money submitted — waiting for KopoKopo."
          : send === "success"
            ? "Transfer confirmed."
            : send === "failed"
              ? result.sendMoneyMessage ?? "Send Money failed — books still updated."
              : send === "skipped"
                ? result.sendMoneyMessage ?? "Recorded on books only."
                : null;
      toast.success(`Pocketed ${fmtMoney(toNum(result.amount))}`, {
        description: [
          result.destinationSummary
            ? `Destination: ${result.destinationSummary}`
            : null,
          sendNote,
        ]
          .filter(Boolean)
          .join(" · "),
      });
      onPocketed?.();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not pocket cash.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Pocket profit"
      icon={<Wallet className="size-5" aria-hidden />}
      contextLabel={periodLabel}
      description="Move profit out of the business"
      width="default"
      appearance="default"
      presentation="center"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] font-medium text-[#d92d20]">
            {!loading && surplus && !surplus.destinationConfigured
              ? "Choose a destination to continue"
              : null}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]"
              disabled={busy || loading || !surplus?.destinationConfigured}
              onClick={() => void onConfirm()}
            >
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : null}
              {confirmHigh && needsHardConfirm
                ? `Pocket ${fmtMoney(amountN)} anyway`
                : "Confirm pocket"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading surplus…
          </div>
        ) : error && !surplus ? (
          <p className="text-sm text-rose-700">{error}</p>
        ) : surplus ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {(
                [
                  ["Gross profit", surplus.grossProfit],
                  ["Net profit", surplus.netProfit ?? surplus.grossProfit],
                  ["Not yet taken", surplus.profitBalance ?? 0],
                  [
                    "Cash available",
                    surplus.rawSurplus ?? surplus.suggestedPocket,
                  ],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#f1f5f4] px-3 py-2.5">
                  <p className="text-[11px] text-[#667085]">{label}</p>
                  <p className="mt-1 text-[15px] font-semibold tabular-nums text-[#101828]">
                    {fmtMoney(toNum(value))}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-[#e9f5f1] px-3 py-2.5">
              <p className="text-[11px] font-semibold text-[#0f766e]">
                Suggested
              </p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums text-[#0f766e]">
                {fmtMoney(toNum(surplus.suggestedPocket))}
              </p>
            </div>

            {!surplus.destinationConfigured ? (
              <p className="flex items-start gap-2 rounded-2xl bg-[#fdecec] px-4 py-3 text-[13px] leading-relaxed text-[#9a2e16]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {surplus.collidesWithCustomerPay &&
                  surplus.customerPayCollisionMessage ? (
                    <>
                      {surplus.customerPayCollisionMessage}{" "}
                      <Link
                        href={`${APP_ROUTES.paymentsSettings}#profit-pocket`}
                        className="font-semibold underline"
                      >
                        Change destination
                      </Link>
                    </>
                  ) : (
                    <>
                      Save your profits to your bank account for expenses, rent,
                      etc. Set an expense / owner destination first — this is not
                      your customer till.{" "}
                      <Link
                        href={`${APP_ROUTES.paymentsSettings}#profit-pocket`}
                        className="font-semibold underline"
                      >
                        Payments settings
                      </Link>
                    </>
                  )}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Destination:{" "}
                <span className="font-semibold text-foreground">
                  {surplus.destinationSummary}
                </span>{" "}
                ·{" "}
                <Link
                  href={`${APP_ROUTES.paymentsSettings}#profit-pocket`}
                  className="font-semibold underline"
                >
                  Change
                </Link>
              </p>
            )}

            <label className="flex flex-col gap-2">
              <span className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-[#101828]">
                  How much to take out
                </span>
                <span className="rounded-full bg-[#e6f4f0] px-2.5 py-0.5 text-[11px] font-semibold text-[#0f766e]">
                  Editable
                </span>
              </span>
              <input
                className="h-14 rounded-xl border border-transparent bg-[#f1f5f4] px-4 text-[28px] font-semibold leading-none tabular-nums text-[#101828] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/40"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setConfirmHigh(false);
                }}
                inputMode="decimal"
                disabled={busy}
              />
            </label>

            {balance > 0.009 && !pocketingBalance ? (
              <button
                type="button"
                className="text-left text-xs font-semibold underline"
                disabled={busy}
                onClick={() => {
                  setAmount(balance.toFixed(2));
                  setConfirmHigh(false);
                }}
              >
                Take out the rest, {fmtMoney(balance)}
              </button>
            ) : pocketingBalance ? (
              <p className="text-xs text-muted-foreground">
                This is the net profit still not taken
                {toNum(surplus?.alreadyPocketed) > 0
                  ? ` (${fmtMoney(surplus?.alreadyPocketed)} already taken)`
                  : ""}
                .
              </p>
            ) : net > 0 ? (
              <p className="text-xs text-muted-foreground">
                The profit for this period is already taken.
              </p>
            ) : null}

            {pocketShare != null ? (
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-semibold text-foreground">
                    {pocketShare.toFixed(1)}% of net profit
                  </span>
                  <span className="text-muted-foreground">
                    {remainingProfit >= 0
                      ? `${fmtMoney(remainingProfit)} stays in the business`
                      : `${fmtMoney(Math.abs(remainingProfit))} above profit`}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-[#e7e5e4]"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(shareWidth)}
                  aria-label="Share of profit being pocketed"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${shareWidth}%`,
                      background:
                        shareWidth >= 75
                          ? "#14532d"
                          : shareWidth >= 50
                            ? "#166534"
                            : shareWidth > 0
                              ? "#86efac"
                              : "transparent",
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Pocketing does not change sales or expenses.{" "}
                  <Link
                    href={APP_ROUTES.profitPocketing}
                    className="font-semibold text-foreground underline"
                  >
                    Pocketing calendar
                  </Link>
                </p>
              </div>
            ) : Number.isFinite(amountN) && amountN > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No profit in this period to measure a percentage against.
              </p>
            ) : null}

            {nextHasData && nextSurplus ? (
              <p className="text-[11px] text-muted-foreground">
                Next period ({fmtDay(addDaysIso(to, 1))} –{" "}
                {fmtDay(addDaysIso(to, isoDaySpan(from, to)))}): gross profit{" "}
                <span className="font-semibold text-foreground">
                  {fmtMoney(toNum(nextSurplus.grossProfit))}
                </span>
                . To cover those bills, take out less and leave the rest in the
                business.
              </p>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-[#101828]">
                Note (optional)
              </span>
              <input
                className="h-11 rounded-xl border border-transparent bg-[#f1f5f4] px-3.5 text-[15px] text-[#101828] outline-none placeholder:text-[#98a2b3] focus-visible:ring-2 focus-visible:ring-[#0f766e]/40"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Took money home, restock, rent…"
                maxLength={500}
                disabled={busy}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-[#101828]">
                  Leave float
                </span>
                <input
                  className="h-11 rounded-xl border border-transparent bg-[#f1f5f4] px-3.5 text-[15px] font-semibold tabular-nums text-[#101828] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/40"
                  value={leaveFloat}
                  onChange={(e) => setLeaveFloat(e.target.value)}
                  inputMode="decimal"
                  disabled={busy}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-[#101828]">
                  Fund from
                </span>
                <select
                  className="h-11 rounded-xl border border-transparent bg-[#f1f5f4] px-3.5 text-[15px] font-medium text-[#101828] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/40"
                  value={fundingMethod}
                  onChange={(e) =>
                    setFundingMethod(
                      e.target.value as "cash" | "mpesa_manual" | "bank",
                    )
                  }
                  disabled={busy}
                >
                  <option value="cash">Operating cash (till)</option>
                  <option value="mpesa_manual">M-Pesa clearing</option>
                  <option value="bank">Bank account (books)</option>
                </select>
              </label>
            </div>

            {warnings.map((w) => (
              <p
                key={w.id}
                className={cn(
                  "flex items-start gap-2 rounded-xl bg-[#fdf6ec] px-3.5 py-2.5 text-[13px] leading-relaxed",
                  "text-[#b45309]",
                )}
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {w.text}
              </p>
            ))}

            {error ? <p className="text-sm text-rose-700">{error}</p> : null}

            <p className="text-[11px] text-muted-foreground">
              Confirm posts an owner-drawings journal. M-Pesa / till / paybill
              destinations also attempt Send Money / Daraja B2B when a send rail
              is ready in Profit Pocket settings. Bank destinations stay books-only.
            </p>
          </>
        ) : null}
      </div>
    </FormDrawer>
  );
}
