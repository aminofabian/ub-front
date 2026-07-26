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
  fetchSupplierPortalClaimConfig,
  sendSupplierPortalClaimCode,
  verifySupplierPortalClaimCode,
  verifySupplierPortalInviteCode,
  type SupplierPortalClaimPublicConfig,
} from "@/lib/marketplace-api";

type Step = "phone" | "code" | "invite" | "password";

function ClaimWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<SupplierPortalClaimPublicConfig | null>(null);
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

  const codeLength = config?.codeLength ?? 6;
  const passwordMin = config?.passwordMinLength ?? 8;
  const claimMethod = config?.claimMethod ?? "phone_code";
  const inviteOnly = claimMethod === "code_only" || config?.allowSelfClaim === false;

  useEffect(() => {
    let cancelled = false;
    void fetchSupplierPortalClaimConfig()
      .then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
        if (!cfg.portalEnabled || !cfg.claimEnabled) {
          setError("Supplier Portal claim is temporarily unavailable.");
          return;
        }
        if (cfg.claimMethod === "code_only" || !cfg.allowSelfClaim) {
          setStep("invite");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load claim settings");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!config || inviteOnly) return;
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
  }, [searchParams, config, inviteOnly]);

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

  const onVerifyInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await verifySupplierPortalInviteCode(code, phone || undefined);
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
    if (password.length < passwordMin) {
      setError(`Password must be at least ${passwordMin} characters`);
      return;
    }
    if (config?.passwordRequireNumber && !/\d/.test(password)) {
      setError("Password must include a number");
      return;
    }
    if (config?.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      setError("Password must include an uppercase letter");
      return;
    }
    if (config?.passwordRequireSpecial && !/[^A-Za-z0-9]/.test(password)) {
      setError("Password must include a special character");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const result = await completeSupplierPortalClaim({
        phone,
        setupToken,
        password,
        name: name.trim() || suggestedName,
        email: email.trim() || undefined,
      });
      if (result.accessToken) {
        router.replace(APP_ROUTES.supplierPortalOverview);
      } else {
        router.replace(`${APP_ROUTES.supplierPortalLogin}?claimed=1`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  };

  const unavailable = config && (!config.portalEnabled || !config.claimEnabled);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <AuthBranding tagline="Supplier passport" showApiHint />
      <AuthCard>
        <AuthPageHeader
          title="Claim your supplier account"
          description={
            inviteOnly
              ? "Enter the invitation code you received, then set a password."
              : "We’ll text a code to your phone. Then set a password you can use with this number — or add an email later."
          }
        />

        {unavailable ? (
          <AuthAlert variant="error">Supplier Portal claim is temporarily unavailable.</AuthAlert>
        ) : null}

        {!unavailable && step === "invite" ? (
          <form className="space-y-3" onSubmit={onVerifyInvite}>
            <label className="text-sm font-medium" htmlFor="claim-invite-code">
              Invitation code
            </label>
            <input
              id="claim-invite-code"
              type="text"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tracking-[0.2em] shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              value={code}
              onChange={(ev) => setCode(ev.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
              autoComplete="one-time-code"
              required
            />
            <label className="text-sm font-medium" htmlFor="claim-invite-phone">
              Phone number <span className="font-normal text-muted-foreground">(if required)</span>
            </label>
            <input
              id="claim-invite-phone"
              type="tel"
              inputMode="tel"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
              placeholder="07… or 2547…"
              autoComplete="tel"
            />
            <Button type="submit" className="w-full" disabled={busy || code.length < 4}>
              {busy ? "Checking…" : "Continue"}
            </Button>
            {config?.allowSelfClaim && claimMethod === "phone_code" ? (
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("phone")}>
                Use phone verification instead
              </Button>
            ) : null}
          </form>
        ) : null}

        {!unavailable && step === "phone" ? (
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
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("invite")}>
              I have an invitation code
            </Button>
          </form>
        ) : null}

        {!unavailable && step === "code" ? (
          <form className="space-y-3" onSubmit={onVerifyCode}>
            <p className="text-sm text-muted-foreground">
              Enter the {codeLength}-digit code sent to {maskedPhone || phone}.
            </p>
            <label className="text-sm font-medium" htmlFor="claim-code">
              Verification code
            </label>
            <input
              id="claim-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={codeLength}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tracking-[0.3em] shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              value={code}
              onChange={(ev) => setCode(ev.target.value.replace(/\D/g, "").slice(0, codeLength))}
              autoComplete="one-time-code"
              required
            />
            <Button type="submit" className="w-full" disabled={busy || code.length !== codeLength}>
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

        {!unavailable && step === "password" ? (
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
            {!phone ? (
              <>
                <label className="text-sm font-medium" htmlFor="claim-phone-final">
                  Phone number
                </label>
                <input
                  id="claim-phone-final"
                  type="tel"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={phone}
                  onChange={(ev) => setPhone(ev.target.value)}
                  required
                />
              </>
            ) : null}
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
              minLength={passwordMin}
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
              minLength={passwordMin}
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
