"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthBranding } from "@/components/auth/auth-branding";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  completeSupplierPortalClaim,
  sendSupplierPortalClaimCode,
  verifySupplierPortalClaimCode,
} from "@/lib/marketplace-api";

type Step = "phone" | "code" | "password";

function ClaimWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [code, setCode] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [suggestedName, setSuggestedName] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get("phone")?.trim() ?? "";
    if (!fromQuery) return;
    setPhone(fromQuery);
    let cancelled = false;
    setBusy(true);
    void sendSupplierPortalClaimCode(fromQuery)
      .then((res) => {
        if (cancelled) return;
        if (res.alreadyRegistered) {
          setError("This phone already has an account. Sign in instead.");
          return;
        }
        setPhone(res.phone);
        setMaskedPhone(res.maskedPhone);
        setStep("code");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not send code");
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const onSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await sendSupplierPortalClaimCode(phone);
      if (res.alreadyRegistered) {
        setError("This phone already has an account. Sign in instead.");
        return;
      }
      setPhone(res.phone);
      setMaskedPhone(res.maskedPhone);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await verifySupplierPortalClaimCode(phone, code);
      setSetupToken(res.setupToken);
      setSuggestedName(res.suggestedName);
      setName(res.suggestedName);
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify code");
    } finally {
      setBusy(false);
    }
  };

  const onComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await completeSupplierPortalClaim({
        phone,
        setupToken,
        password,
        name: name.trim() || suggestedName,
        email: email.trim() || undefined,
      });
      router.replace(APP_ROUTES.supplierPortalOverview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <AuthBranding tagline="Supplier passport" showApiHint />
      <AuthCard>
        <AuthPageHeader
          title="Claim your supplier account"
          description="We’ll text a code to your phone. Then set a password you can use with this number — or add an email later."
        />

        {step === "phone" ? (
          <form className="space-y-3" onSubmit={onSendCode}>
            <label className="text-sm font-medium" htmlFor="claim-phone">
              Phone number
            </label>
            <input
              id="claim-phone"
              type="tel"
              inputMode="tel"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
              placeholder="07… or 2547…"
              autoComplete="tel"
              required
            />
            <Button type="submit" className="w-full" disabled={busy || !phone.trim()}>
              {busy ? "Sending…" : "Send code"}
            </Button>
          </form>
        ) : null}

        {step === "code" ? (
          <form className="space-y-3" onSubmit={onVerifyCode}>
            <p className="text-sm text-muted-foreground">
              Enter the 4-digit code sent to {maskedPhone || phone}.
            </p>
            <label className="text-sm font-medium" htmlFor="claim-code">
              Verification code
            </label>
            <input
              id="claim-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tracking-[0.3em] shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              value={code}
              onChange={(ev) => setCode(ev.target.value.replace(/\D/g, "").slice(0, 4))}
              autoComplete="one-time-code"
              required
            />
            <Button type="submit" className="w-full" disabled={busy || code.length !== 4}>
              {busy ? "Checking…" : "Verify code"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={busy}
              onClick={() => {
                setStep("phone");
                setCode("");
              }}
            >
              Use a different number
            </Button>
          </form>
        ) : null}

        {step === "password" ? (
          <form className="space-y-3" onSubmit={onComplete}>
            <label className="text-sm font-medium" htmlFor="claim-name">
              Display name
            </label>
            <input
              id="claim-name"
              type="text"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              required
            />
            <label className="text-sm font-medium" htmlFor="claim-password">
              Password
            </label>
            <input
              id="claim-password"
              type="password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <label className="text-sm font-medium" htmlFor="claim-confirm">
              Confirm password
            </label>
            <input
              id="claim-confirm"
              type="password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              value={confirmPassword}
              onChange={(ev) => setConfirmPassword(ev.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <label className="text-sm font-medium" htmlFor="claim-email">
              Email <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="claim-email"
              type="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="Use instead of phone when signing in"
              autoComplete="email"
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating account…" : "Create account"}
            </Button>
          </form>
        ) : null}

        {error ? (
          <div className="mt-4">
            <AuthAlert variant="error">{error}</AuthAlert>
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already claimed?{" "}
          <Link href={APP_ROUTES.supplierPortalLogin} className="underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}

export default function SupplierPortalClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ClaimWizard />
    </Suspense>
  );
}
