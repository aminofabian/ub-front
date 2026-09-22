"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
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

type ProfitPocketDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  from: string;
  to: string;
  branchId?: string | null;
  periodLabel: string;
  onPocketed?: () => void;
};

export function ProfitPocketDrawer({
  open,
  onOpenChange,
  from,
  to,
  branchId,
  periodLabel,
  onPocketed,
}: ProfitPocketDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [surplus, setSurplus] = useState<CashSurplusRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [leaveFloat, setLeaveFloat] = useState("");
  const [fundingMethod, setFundingMethod] = useState<
    "cash" | "mpesa_manual" | "bank"
  >("cash");
  const [confirmHigh, setConfirmHigh] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmHigh(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchCashSurplus({
      from,
      to,
      branchId: branchId ?? undefined,
    })
      .then((data) => {
        if (cancelled) return;
        setSurplus(data);
        setAmount(String(toNum(data.suggestedPocket)));
        setLeaveFloat(String(toNum(data.defaultFloat)));
      })
      .catch((e) => {
        if (cancelled) return;
        setSurplus(null);
        setError(
          e instanceof Error ? e.message : "Could not load cash surplus.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, from, to, branchId]);

  const amountN = Number(amount);
  const suggested = toNum(surplus?.suggestedPocket);
  const gp = toNum(surplus?.grossProfit);
  const warnings = useMemo(() => {
    const list: { id: string; text: string }[] = [];
    if (gp < 0) {
      list.push({
        id: "negative_gp",
        text: `Gross profit is negative (${fmtMoney(gp)}). Pocketing may leave less float for suppliers — edit the amount if needed.`,
      });
    }
    if (Number.isFinite(amountN) && amountN > suggested + 0.009) {
      list.push({
        id: "above_surplus",
        text: `Amount is above suggested profit pocket (${fmtMoney(suggested)}).`,
      });
    }
    const liquid = toNum(surplus?.rawSurplus);
    if (Number.isFinite(amountN) && liquid > 0 && amountN > liquid + 0.009) {
      list.push({
        id: "above_liquid",
        text: `Amount is above available cash surplus (${fmtMoney(liquid)}).`,
      });
    }
    if ((surplus?.openShifts ?? 0) > 0) {
      list.push({
        id: "open_shifts",
        text: `${surplus?.openShifts} open shift(s) — surplus may still change.`,
      });
    }
    return list;
  }, [gp, amountN, suggested, surplus?.openShifts, surplus?.rawSurplus]);

  const needsHardConfirm =
    Number.isFinite(amountN) && suggested > 0 && amountN > suggested * 1.5;

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
      description={`${periodLabel} · We suggest min(gross profit, cash surplus) × jar % — editable before you confirm.`}
      width="default"
      appearance="sharp"
      headerDensity="compact"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-none bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]"
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
      }
    >
      <div className="space-y-4 px-1 pb-2">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading surplus…
          </div>
        ) : error && !surplus ? (
          <p className="text-sm text-rose-700">{error}</p>
        ) : surplus ? (
          <>
            <div className="grid grid-cols-2 gap-px overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-xs sm:grid-cols-4">
              {(
                [
                  ["Gross profit", surplus.grossProfit],
                  ["Cash surplus", surplus.rawSurplus ?? surplus.suggestedPocket],
                  [
                    Number(surplus.profitJarPct) > 0 &&
                    Number(surplus.profitJarPct) < 100
                      ? `Jar ${Number(surplus.profitJarPct)}%`
                      : "Suggested",
                    surplus.suggestedPocket,
                  ],
                  ["Leave float", surplus.defaultFloat],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="bg-white px-2.5 py-2">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                    {fmtMoney(toNum(value))}
                  </p>
                </div>
              ))}
            </div>

            {!surplus.destinationConfigured ? (
              <p className="flex items-start gap-2 border border-[#9a2e16]/35 bg-white px-3 py-2.5 text-sm text-[#9a2e16]">
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
                      Set an expense / owner destination first — this is not your
                      customer till.{" "}
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

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Amount to pocket (editable)
              </span>
              <input
                className="h-10 border border-input bg-background px-3 font-mono text-sm"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setConfirmHigh(false);
                }}
                inputMode="decimal"
                disabled={busy}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Leave float (KES)
              </span>
              <input
                className="h-10 border border-input bg-background px-3 font-mono text-sm"
                value={leaveFloat}
                onChange={(e) => setLeaveFloat(e.target.value)}
                inputMode="decimal"
                disabled={busy}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Fund from
              </span>
              <select
                className="h-10 border border-input bg-background px-3 text-sm"
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

            {warnings.map((w) => (
              <p
                key={w.id}
                className={cn(
                  "flex items-start gap-2 border px-3 py-2.5 text-xs leading-relaxed",
                  "border-[#9a2e16]/35 bg-white text-[#9a2e16]",
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
