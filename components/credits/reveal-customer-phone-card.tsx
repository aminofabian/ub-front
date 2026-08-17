"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { dashboardInputClass } from "@/components/dashboard-page-ui";
import {
  sendCustomerRevealPhone,
  verifyCustomerRevealPhone,
  type CustomerRecord,
} from "@/lib/api";

export function RevealCustomerPhoneCard({
  customer,
  canReveal,
  onUpdated,
}: {
  customer: CustomerRecord;
  canReveal: boolean;
  onUpdated: (next: CustomerRecord) => void;
}) {
  const primary =
    customer.phones.find((p) => p.primary) ?? customer.phones[0] ?? null;
  const masked = primary?.maskedMsisdn;
  const alreadyVerified = Boolean(primary?.verifiedAt && primary?.phone);
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!masked || alreadyVerified) {
    return null;
  }

  const onSend = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await sendCustomerRevealPhone(customer.id, digits.trim());
      setSent(true);
      setNotice(`Code sent to ${result.maskedHint}. Ask the customer to read it aloud.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const next = await verifyCustomerRevealPhone(
        customer.id,
        digits.trim(),
        code.trim(),
      );
      onUpdated(next);
      setNotice("Number verified.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify the code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Reveal M-Pesa number</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Masked as {primary?.maskedHint ?? masked}
        {primary?.assignedMsisdn ? ` · assigned ${primary.assignedMsisdn}` : ""}. Fill the
        hidden digits, then send a code to the completed number.
      </p>
      {canReveal ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="min-w-[8rem] flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Hidden digits
            </span>
            <input
              className={dashboardInputClass()}
              inputMode="numeric"
              autoComplete="off"
              placeholder="12345"
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 8))}
            />
          </label>
          {sent ? (
            <label className="min-w-[8rem] flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                4-digit code
              </span>
              <input
                className={dashboardInputClass()}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="0000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </label>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={busy || digits.length < 3 || (sent && code.length < 4)}
            onClick={() => void (sent ? onVerify() : onSend())}
          >
            {busy ? "Working…" : sent ? "Verify" : "Send code"}
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          You need permission to reveal this number.
        </p>
      )}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      {notice ? <p className="mt-2 text-xs text-emerald-700">{notice}</p> : null}
    </section>
  );
}
