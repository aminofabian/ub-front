"use client";

import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { APP_BASE_URL } from "@/lib/config";
import { submitPublicPaymentClaim } from "@/lib/api";

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseMoney(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return roundMoney2(n);
}

export default function PublicPaymentClaimSubmitPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";

  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const submitUrl = useMemo(() => {
    const base = APP_BASE_URL?.trim() || "";
    if (!base) return "";
    return `${base}/public/credits/payment-claims/${encodeURIComponent(token)}`;
  }, [token]);

  const onSubmit = useCallback(async () => {
    if (!token.trim()) return;
    const amt = parseMoney(amount);
    if (amt == null) {
      setMessage({ kind: "error", text: "Enter a positive amount." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await submitPublicPaymentClaim(token, { amount: amt, reference });
      setMessage({ kind: "ok", text: "Submitted. Your business will review and confirm shortly." });
      setAmount("");
      setReference("");
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Submit failed." });
    } finally {
      setBusy(false);
    }
  }, [amount, reference, token]);

  if (!token.trim()) {
    return (
      <section className="max-w-xl space-y-2 p-6">
        <h1 className="text-xl font-semibold">Payment claim</h1>
        <p className="text-sm text-muted-foreground">Missing token.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Payment claim</h1>
        <p className="text-sm text-muted-foreground">
          Enter the amount you paid and an optional reference. This link is sensitive—only the holder can submit.
        </p>
      </div>

      {message ? (
        <p className={message.kind === "ok" ? "text-sm text-green-700" : "text-sm text-destructive"}>
          {message.text}
        </p>
      ) : null}

      <div className="rounded-md border p-4">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Amount (KES)</span>
            <input
              className="rounded border bg-background px-2 py-2 tabular-nums"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1200"
              disabled={busy}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Reference (optional)</span>
            <input
              className="rounded border bg-background px-2 py-2"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. M-Pesa code"
              disabled={busy}
            />
          </label>
          <Button type="button" disabled={busy} onClick={() => void onSubmit()}>
            {busy ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        If you need to bookmark this page, use: <span className="font-mono">{submitUrl || "(unknown)"}</span>
      </p>
    </section>
  );
}

