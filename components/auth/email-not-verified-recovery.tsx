"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { authInputClassName } from "@/components/auth/auth-split-shell";
import {
  resendVerificationEmail,
  verifyEmailAddress,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { useResendCooldown } from "@/lib/resend-cooldown";
import { cn } from "@/lib/utils";

const primaryCtaClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--auth-accent)] text-[var(--auth-accent-ink)] text-[15px] font-semibold shadow-md transition hover:bg-[var(--auth-primary-hover)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50";

type EmailNotVerifiedRecoveryProps = {
  email: string;
  /** Password kept from the failed login — used if verify mints no session. */
  password?: string;
  onVerified: (signedIn: boolean) => void | Promise<void>;
  onBack: () => void;
  className?: string;
};

/**
 * Inline recovery when login returns INVITED / email-not-verified.
 * Mirrors the storefront sheet verify step so office login isn't a dead end.
 */
export function EmailNotVerifiedRecovery({
  email,
  onVerified,
  onBack,
  className,
}: EmailNotVerifiedRecoveryProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState(
    `Your email is not verified yet. Enter the 6-digit code we sent to ${email}, or resend a new one.`,
  );
  const [verifyLink, setVerifyLink] = useState<string | null>(null);
  const cooldown = useResendCooldown();

  const verifyHref = `${APP_ROUTES.verifyEmail}?email=${encodeURIComponent(email)}`;

  const onSubmitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setErrorMessage("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      const signedIn = await verifyEmailAddress(trimmed, {
        toast: false,
        email,
      });
      await onVerified(signedIn);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "That code did not work. Check your email, or resend a new one.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    if (cooldown.coolingDown || busy) {
      return;
    }
    setBusy(true);
    setErrorMessage("");
    setVerifyLink(null);
    try {
      const out = await resendVerificationEmail(email);
      const link = out.verificationUrl?.trim();
      if (link) {
        setNotice(`A new code is ready for ${email}.`);
        setVerifyLink(link);
      } else {
        setNotice(
          `If ${email} has a pending signup, we sent a fresh code. Check inbox and spam.`,
        );
      }
      setCode("");
      cooldown.start();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not resend the code.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("mt-6 space-y-4", className)}>
      <AuthAlert variant="info">{notice}</AuthAlert>
      {verifyLink ? (
        <p className="text-sm">
          <a
            href={verifyLink}
            className="font-medium text-[var(--auth-accent)] underline-offset-2 hover:underline"
          >
            Open verification link
          </a>
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={(e) => void onSubmitCode(e)}>
        <div>
          <label
            className="mb-1.5 block text-[13px] font-medium text-foreground"
            htmlFor="verify-recovery-code"
          >
            6-digit code
          </label>
          <input
            id="verify-recovery-code"
            className={cn(
              authInputClassName,
              "text-center text-2xl font-semibold tracking-[0.35em]",
            )}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            autoFocus
            required
          />
        </div>
        {errorMessage ? (
          <AuthAlert variant="error">{errorMessage}</AuthAlert>
        ) : null}
        <button type="submit" className={primaryCtaClass} disabled={busy}>
          {busy ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <div className="flex flex-col gap-2 text-center text-sm">
        {cooldown.coolingDown ? (
          <p className="text-muted-foreground">
            Resend in {cooldown.remaining}s
          </p>
        ) : (
          <button
            type="button"
            className="font-medium text-[var(--auth-accent)] underline-offset-2 hover:underline disabled:opacity-50"
            disabled={busy}
            onClick={() => void onResend()}
          >
            Resend code
          </button>
        )}
        <Link
          href={verifyHref}
          className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Open full verification page
        </Link>
        <button
          type="button"
          className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={onBack}
        >
          ← Back to sign in
        </button>
      </div>
    </div>
  );
}
