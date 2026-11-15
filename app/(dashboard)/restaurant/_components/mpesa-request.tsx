"use client";

import { useEffect, useRef, useState } from "react";

import { dashboardHintClass, dashboardInputClass, dashboardLabelClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { fetchPosStkPushStatus, fetchPosStkRails, initiatePosStkPush } from "@/lib/api";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { formatMoney } from "@/lib/money";
import { buildStkPhoneNumber, isStkPhoneValid, parseStkPhoneParts } from "@/lib/stk-phone";

const kes = (n: number) => formatMoney(n, "KES");
const AREA = "+254";
/** How long to wait for the customer to answer the prompt on their phone. */
const WAIT_MS = 180_000;
const POLL_MS = 4000;

type Phase =
  | { step: "idle" }
  | { step: "sending" }
  | { step: "waiting"; checkoutId: string; asked: number }
  | { step: "received"; receipt: string; asked: number }
  | { step: "failed"; reason: string };

/** The M-Pesa prompt charges whole shillings. */
export function mpesaRequestAmount(amount: number): number {
  return Math.round(amount);
}

/**
 * Sends a payment request to the customer's phone and waits for M-Pesa to confirm it, using the
 * same calls as the till. It shows nothing when the shop has no M-Pesa request set up or this
 * person may not send one; typing the code by hand stays available either way.
 *
 * {@code onReceived} gets the M-Pesa code and the amount that was asked for, which the caller
 * must compare with what is owed now: the order can change while the phone is ringing.
 */
export function MpesaRequest({
  amount,
  phone,
  disabled,
  onReceived,
  onWaitingChange,
}: {
  amount: number;
  /** A phone number already on the order, to save typing. */
  phone?: string | null;
  disabled?: boolean;
  onReceived: (receipt: string, askedAmount: number) => void;
  onWaitingChange?: (waiting: boolean) => void;
}) {
  const [configId, setConfigId] = useState<string | null | undefined>(undefined);
  const [local, setLocal] = useState(() => (phone ? parseStkPhoneParts(phone).local : ""));
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const onReceivedRef = useRef(onReceived);
  const onWaitingRef = useRef(onWaitingChange);
  onReceivedRef.current = onReceived;
  onWaitingRef.current = onWaitingChange;

  useEffect(() => {
    let live = true;
    fetchPosStkRails()
      .then((rails) => {
        if (!live) return;
        const rail = rails.find((r) => r.isDefault) ?? rails[0];
        setConfigId(rail ? rail.configId : null);
      })
      .catch(() => {
        if (live) setConfigId(null);
      });
    return () => {
      live = false;
    };
  }, []);

  const waiting = phase.step === "sending" || phase.step === "waiting";
  useEffect(() => {
    onWaitingRef.current?.(waiting);
  }, [waiting]);

  const checkoutId = phase.step === "waiting" ? phase.checkoutId : null;
  const asked = phase.step === "waiting" ? phase.asked : 0;
  useEffect(() => {
    if (!checkoutId) return;
    let live = true;
    const poll = async () => {
      try {
        const status = await fetchPosStkPushStatus(checkoutId);
        if (!live) return;
        if (status.success) {
          const receipt = status.gatewayTransactionId?.trim();
          // Paid is only believed with an M-Pesa code; without one, keep waiting.
          if (!receipt) return;
          live = false;
          setPhase({ step: "received", receipt, asked });
          onReceivedRef.current(receipt, asked);
        } else if (status.failed) {
          live = false;
          setPhase({ step: "failed", reason: status.failureReason?.trim() || "The payment did not go through." });
        }
      } catch {
        // a dropped poll is not a failed payment: ask again on the next tick
      }
    };
    const interval = window.setInterval(() => void poll(), POLL_MS);
    void poll();
    const stop = window.setTimeout(() => {
      if (!live) return;
      live = false;
      setPhase({
        step: "failed",
        reason: "No answer from the phone. If they have paid, type the code from their M-Pesa message below.",
      });
    }, WAIT_MS);
    return () => {
      live = false;
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, [checkoutId, asked]);

  if (configId == null) return null;

  const toAsk = mpesaRequestAmount(amount);
  const phoneOk = isStkPhoneValid(AREA, local);

  async function send() {
    if (!phoneOk || toAsk <= 0 || waiting) return;
    setPhase({ step: "sending" });
    try {
      const result = await initiatePosStkPush(
        {
          phoneNumber: buildStkPhoneNumber(AREA, local),
          amount: toAsk,
          description: "Restaurant order",
          ...(configId ? { configId } : {}),
        },
        nextIdempotencyKey(),
      );
      if (!result.accepted || !result.checkoutRequestId) {
        setPhase({ step: "failed", reason: result.message || "M-Pesa did not accept the request." });
        return;
      }
      setPhase({ step: "waiting", checkoutId: result.checkoutRequestId, asked: toAsk });
    } catch (e) {
      setPhase({
        step: "failed",
        reason: e instanceof Error && e.message ? e.message : "The request could not be sent. Check your connection.",
      });
    }
  }

  if (phase.step === "received") {
    return (
      <p role="status" className="text-sm font-semibold">
        M-Pesa received · {kes(phase.asked)} · <span className="font-mono">{phase.receipt}</span>
      </p>
    );
  }

  return (
    <div className="grid gap-1">
      <label className="grid gap-1">
        <span className={dashboardLabelClass()}>Customer&apos;s M-Pesa number</span>
        <input
          className={dashboardInputClass(false, "font-mono")}
          inputMode="tel"
          autoComplete="off"
          placeholder="0712 345 678"
          value={local}
          disabled={waiting || disabled}
          onChange={(e) => setLocal(e.target.value.replace(/[^0-9 ]/g, "").slice(0, 14))}
        />
      </label>
      {waiting ? (
        <div className="flex items-center justify-between gap-2">
          <p role="status" className="text-sm">
            {phase.step === "sending" ? "Sending the request…" : `Waiting for them to enter their PIN · ${kes(asked)}`}
          </p>
          {phase.step === "waiting" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPhase({
                  step: "failed",
                  reason: "Stopped waiting. If they still pay, type the code from their M-Pesa message below.",
                })
              }
            >
              Stop waiting
            </Button>
          ) : null}
        </div>
      ) : (
        <Button variant="outline" className="h-11" disabled={!phoneOk || toAsk <= 0 || disabled} onClick={() => void send()}>
          {phase.step === "failed" ? "Ask again" : "Ask their phone"} for {kes(toAsk)}
        </Button>
      )}
      {phase.step === "failed" ? (
        <p role="alert" className="text-sm text-red-700">
          {phase.reason}
        </p>
      ) : (
        <span className={dashboardHintClass()}>
          They get a prompt to enter their M-Pesa PIN. The order is recorded when M-Pesa confirms.
        </span>
      )}
    </div>
  );
}
