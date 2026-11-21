"use client";

import { useEffect, useMemo, useState } from "react";

import { Field, RX_INK, RX_INPUT, RX_MUTED, RX_RULE, errorText } from "@/components/pharmacy/pharmacy-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { payClinicVisit, type ClinicVisit } from "@/lib/clinic-api";
import { amountDue, billNeedsDispenser, feeHeld, formatKsh } from "@/lib/clinic-visit";
import { approveDispensing, fetchDispensingApprovers, type DispensingApprover } from "@/lib/pharmacy-api";
import { cn } from "@/lib/utils";

type Method = "cash" | "mpesa_manual";

/**
 * Payment for a whole visit as one sale. The pharmacy rules are the till's rules: if the bill
 * carries a prescription-only medicine and the person taking the money may not dispense, a
 * pharmacist approves with their PIN, exactly as at the till (ADR 0033, ADR 0034 decision 7).
 */
export function ClinicPayDialog({
  visit,
  mayDispense,
  onClose,
  onPaid,
}: {
  visit: ClinicVisit;
  mayDispense: boolean;
  onClose: () => void;
  onPaid: (visit: ClinicVisit) => void;
}) {
  const due = amountDue(visit.total, visit.depositAmount, visit.depositState);
  const held = feeHeld(visit.depositAmount, visit.depositState);
  const [method, setMethod] = useState<Method>("cash");
  const [cash, setCash] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One key for this attempt: a retry after a dropped connection must not ring the visit twice.
  const [key] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `pay-${Date.now()}-${Math.random()}`,
  );

  const gated = useMemo(
    () => visit.products.filter((p) => p.dispensingClass === "PRESCRIPTION_ONLY" || p.dispensingClass === "CONTROLLED"),
    [visit.products],
  );
  // A pharmacist who prepared exactly what is on the bill has already approved it.
  const needsApproval = billNeedsDispenser(visit) && !mayDispense && !visit.dispenserCleared;
  const [approvers, setApprovers] = useState<DispensingApprover[] | null>(null);
  const [approverId, setApproverId] = useState("");
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!needsApproval) return;
    fetchDispensingApprovers()
      .then((list) => {
        setApprovers(list);
        if (list.length === 1) setApproverId(list[0].userId);
      })
      .catch(() => setApprovers([]));
  }, [needsApproval]);

  const received = Number(cash);
  const change = method === "cash" && Number.isFinite(received) && received > due ? received - due : 0;

  const submit = async () => {
    setError(null);
    if (method === "cash" && due > 0 && cash.trim() && (!Number.isFinite(received) || received < due)) {
      setError(`Cash received is less than ${formatKsh(due)}.`);
      return;
    }
    if (needsApproval && (!approverId || pin.trim().length < 4)) {
      setError("Choose the pharmacist and enter their PIN.");
      return;
    }
    setBusy(true);
    try {
      let approvalId: string | null = null;
      if (needsApproval) {
        const approval = await approveDispensing({
          approverUserId: approverId,
          pin: pin.trim(),
          lines: gated.map((p) => ({ itemId: p.itemId, quantity: p.quantity })),
        });
        approvalId = approval.approvalId;
      }
      const result = await payClinicVisit(
        visit.id,
        {
          payments: due > 0 ? [{ method, amount: due, reference: method === "cash" ? null : reference.trim() || null }] : [],
          cashReceived: method === "cash" && cash.trim() ? received : null,
          approvalId,
        },
        key,
      );
      onPaid(result.visit);
    } catch (err) {
      setPin("");
      setError(errorText(err, "Payment was not taken. Check the connection and try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Take payment</DialogTitle>
          <DialogDescription>
            Visit {visit.number} · {visit.patient.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <dl className={cn("space-y-1 border-b pb-3 text-sm tabular-nums", RX_RULE)}>
            <div className="flex justify-between gap-3">
              <dt className={RX_MUTED}>Bill</dt>
              <dd className={RX_INK}>{formatKsh(visit.total)}</dd>
            </div>
            {held > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className={RX_MUTED}>Fee already paid</dt>
                <dd className={RX_INK}>− {formatKsh(held)}</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-3 pt-1">
              <dt className={cn("font-semibold", RX_INK)}>To pay now</dt>
              <dd className={cn("text-[22px] font-bold", RX_INK)}>{formatKsh(due)}</dd>
            </div>
          </dl>

          {due > 0 ? (
            <>
              <fieldset className="space-y-2">
                <legend className={cn("text-sm font-medium", RX_INK)}>Paid by</legend>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["cash", "Cash"],
                      ["mpesa_manual", "M-Pesa"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={method === value}
                      onClick={() => setMethod(value)}
                      className={cn(
                        "min-h-11 rounded-[2px] border px-4 text-sm font-medium",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]",
                        method === value
                          ? "border-[var(--op-accent,#1d4b3b)] bg-[var(--op-accent,#1d4b3b)] text-[#fcfaf5]"
                          : cn(RX_RULE, RX_INK),
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {method === "cash" ? (
                <Field label="Cash received" hint={change > 0 ? `Change: ${formatKsh(change)}` : "Leave empty for the exact amount."}>
                  <input className={RX_INPUT} value={cash} onChange={(e) => setCash(e.target.value)} inputMode="decimal" />
                </Field>
              ) : (
                <Field label="M-Pesa code" hint="From the customer's confirmation message.">
                  <input
                    className={RX_INPUT}
                    value={reference}
                    onChange={(e) => setReference(e.target.value.toUpperCase())}
                    maxLength={32}
                    autoComplete="off"
                  />
                </Field>
              )}
            </>
          ) : (
            <p className={cn("text-sm", RX_MUTED)}>The fee already paid covers the bill. Closing the visit takes no more money.</p>
          )}

          {needsApproval ? (
            <fieldset className={cn("space-y-3 rounded-[2px] border p-3", RX_RULE)}>
              <legend className={cn("px-1 text-sm font-medium", RX_INK)}>Pharmacist approval</legend>
              <p className={cn("text-[13px]", RX_MUTED)}>
                This bill has {gated.length === 1 ? "a prescription-only medicine" : "prescription-only medicines"}:{" "}
                {gated.map((p) => p.name).join(", ")}. A pharmacist approves with their own PIN.
              </p>
              {approvers && approvers.length === 0 ? (
                <p role="alert" className="text-sm text-destructive">
                  Nobody at this business can approve. A pharmacist must sign in and take this payment.
                </p>
              ) : (
                <>
                  <Field label="Pharmacist">
                    <select className={RX_INPUT} value={approverId} onChange={(e) => setApproverId(e.target.value)}>
                      <option value="">Choose</option>
                      {(approvers ?? []).map((a) => (
                        <option key={a.userId} value={a.userId} disabled={!a.hasPin}>
                          {a.name}
                          {a.hasPin ? "" : " (no PIN set)"}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Their PIN">
                    <input
                      className={RX_INPUT}
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      maxLength={12}
                    />
                  </Field>
                </>
              )}
            </fieldset>
          ) : null}

          {billNeedsDispenser(visit) && !mayDispense && visit.dispenserCleared ? (
            <p className={cn("text-[13px]", RX_MUTED)}>
              The prescription-only medicines on this bill were prepared by a pharmacist, so no PIN is asked for.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Not yet
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            {busy ? "Taking payment…" : due > 0 ? `Take ${formatKsh(due)}` : "Close the visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
