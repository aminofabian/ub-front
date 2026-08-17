"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  lookupPayerClaim,
  sendPayerClaimCode,
  verifyPayerClaim,
  type PayerClaimMatch,
} from "@/lib/public-payer-claim";

export function PayerClaimForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [lastThree, setLastThree] = useState("");
  const [missing, setMissing] = useState("");
  const [code, setCode] = useState("");
  const [matches, setMatches] = useState<PayerClaimMatch[] | null>(null);
  const [pickedSuffix, setPickedSuffix] = useState("");
  const [step, setStep] = useState<"lookup" | "digits" | "code" | "done">("lookup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tabPath, setTabPath] = useState("");
  const [verifiedName, setVerifiedName] = useState("");

  const suffix = pickedSuffix || lastThree.trim();
  const inputClass =
    "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

  const hint = useMemo(() => {
    if (!matches || matches.length === 0) return null;
    if (matches.length === 1) return matches[0].maskedHint;
    const picked = matches.find((m) => m.suffix === suffix);
    return picked?.maskedHint ?? null;
  }, [matches, suffix]);

  const onLookup = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await lookupPayerClaim(firstName, lastName, lastThree || undefined);
      setMatches(result.matches);
      if (result.matches.length === 1) {
        setPickedSuffix(result.matches[0].suffix);
        setStep("digits");
      } else {
        setStep("digits");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No matching payer found.");
    } finally {
      setBusy(false);
    }
  };

  const onSend = async () => {
    setError("");
    setBusy(true);
    try {
      await sendPayerClaimCode(firstName, lastName, missing, suffix || undefined);
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await verifyPayerClaim(
        firstName,
        lastName,
        missing,
        code,
        suffix || undefined,
      );
      setVerifiedName(result.name);
      setTabPath(result.tabPath);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Palmart
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Verify your M-Pesa number</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the name on the M-Pesa message and the digits hidden behind X. We will text a
        4-digit code to the completed number.
      </p>

      {step === "lookup" || step === "digits" ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === "lookup") void onLookup();
            else void onSend();
          }}
        >
          <label className="block text-sm">
            First name
            <input
              className={`${inputClass} mt-1`}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </label>
          <label className="block text-sm">
            Last name
            <input
              className={`${inputClass} mt-1`}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </label>
          <label className="block text-sm">
            Last 3 digits (optional)
            <input
              className={`${inputClass} mt-1`}
              inputMode="numeric"
              value={lastThree}
              onChange={(e) => setLastThree(e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="123"
            />
          </label>
          {matches && matches.length > 1 ? (
            <label className="block text-sm">
              Which number is yours?
              <select
                className={`${inputClass} mt-1`}
                value={pickedSuffix}
                onChange={(e) => setPickedSuffix(e.target.value)}
              >
                <option value="">Select ending…</option>
                {matches.map((m) => (
                  <option key={m.suffix} value={m.suffix}>
                    {m.maskedHint} (C-{m.customerNo})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {step === "digits" ? (
            <label className="block text-sm">
              Hidden digits{hint ? ` for ${hint}` : ""}
              <input
                className={`${inputClass} mt-1`}
                inputMode="numeric"
                value={missing}
                onChange={(e) => setMissing(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="12345"
                required
              />
            </label>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Working…" : step === "lookup" ? "Find my payments" : "Send verification code"}
          </Button>
        </form>
      ) : null}

      {step === "code" ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void onVerify();
          }}
        >
          <p className="text-sm text-muted-foreground">
            Enter the 4-digit code we sent to the completed number.
          </p>
          <input
            className={inputClass}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="0000"
            required
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy || code.length < 4}>
            {busy ? "Working…" : "Verify and open my tab"}
          </Button>
        </form>
      ) : null}

      {step === "done" ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm">
            Welcome, <span className="font-semibold">{verifiedName}</span>. Your number is
            verified.
          </p>
          <Button asChild className="w-full">
            <Link href={tabPath || APP_ROUTES.claimTab}>Open my tab</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
