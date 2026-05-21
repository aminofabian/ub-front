"use client";

import { Eye, EyeOff, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { useOptionalTenant } from "@/components/providers/tenant-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  loginWithPassword,
  registerAccount,
  type RegisterResponse,
} from "@/lib/api";
import { setSessionTenantId } from "@/lib/auth";
import {
  AUTH_TENANT_RESOLVE_ERROR,
  resolveTenantForAuthContext,
} from "@/lib/auth-tenant-prefill";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

export const CHECKOUT_SIGNUP_DISMISSED_KEY = "ub.checkoutSignup.dismissed.v1";

export function isCheckoutSignupDismissed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.sessionStorage.getItem(CHECKOUT_SIGNUP_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissCheckoutSignupPrompt(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(CHECKOUT_SIGNUP_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  firstName: string;
  lastName: string;
  phoneDisplay: string;
  /** Called after account is created and (when possible) the user is signed in. */
  onSignedIn?: () => void;
  /** Guest checkout — dismiss prompt for this browser session. */
  onContinueAsGuest?: () => void;
};

function isDuplicateEmailError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("already exists") || m.includes("duplicate");
}

export function ShopCheckoutSignupModal({
  open,
  onOpenChange,
  email,
  firstName,
  lastName,
  phoneDisplay,
  onSignedIn,
  onContinueAsGuest,
}: Props) {
  const tenant = useOptionalTenant();
  const passwordMinLength = tenant?.authConfig?.passwordPolicy?.minLength ?? 8;
  const displayName = `${firstName} ${lastName}`.trim();
  const loginHref = `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.shopCheckout)}&email=${encodeURIComponent(email.trim())}`;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [duplicateEmail, setDuplicateEmail] = useState(false);

  const resetFormState = useCallback(() => {
    setPassword("");
    setConfirmPassword("");
    setErrorMessage("");
    setVerifyMessage(null);
    setVerificationLink(null);
    setDuplicateEmail(false);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetFormState();
    }
    onOpenChange(next);
  };

  const handleContinueAsGuest = () => {
    dismissCheckoutSignupPrompt();
    resetFormState();
    onOpenChange(false);
    onContinueAsGuest?.();
  };

  const finishSignedIn = () => {
    resetFormState();
    onOpenChange(false);
    onSignedIn?.();
  };

  const handleRegisterSuccess = async (result: RegisterResponse) => {
    const status = result.status.toLowerCase();
    if (status === "active") {
      await loginWithPassword(email.trim(), password);
      finishSignedIn();
      return;
    }
    const link = result.verificationUrl?.trim();
    if (link) {
      setVerifyMessage(
        `We sent a verification link to ${result.email}. Open it to activate your account, then sign in to track this order.`,
      );
      setVerificationLink(link);
    } else {
      setVerifyMessage(
        `Check your inbox to verify ${result.email}. You can finish checkout as a guest; sign in later from Account to see order history.`,
      );
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setDuplicateEmail(false);
    setVerifyMessage(null);
    setVerificationLink(null);

    if (password.length < passwordMinLength) {
      setErrorMessage(`Password must be at least ${passwordMinLength} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const tenantId = await resolveTenantForAuthContext(null, null);
      if (!tenantId?.trim()) {
        setErrorMessage(AUTH_TENANT_RESOLVE_ERROR);
        return;
      }
      setSessionTenantId(tenantId);
      const result = await registerAccount(displayName, email.trim(), password);
      await handleRegisterSuccess(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create account.";
      if (isDuplicateEmailError(message)) {
        setDuplicateEmail(true);
        setErrorMessage("An account with this email already exists.");
      } else {
        setErrorMessage(message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="border-b border-border/60 bg-linear-to-br from-primary/8 via-background to-background px-5 pb-4 pt-5 sm:px-6">
          <DialogHeader className="space-y-2 pr-6 text-left">
            <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="size-3" aria-hidden />
              One step
            </p>
            <DialogTitle className="text-xl tracking-tight">
              Save your details for next time
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Create a free shopper account with the contact info you already
              entered. Track orders, reorder faster, and skip retyping your
              address.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 py-4 sm:px-6">
          {verifyMessage ? (
            <div className="space-y-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
              <p>{verifyMessage}</p>
              {verificationLink ? (
                <a
                  href={verificationLink}
                  className="block truncate font-medium text-emerald-800 underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open verification link
                </a>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-xl"
                onClick={handleContinueAsGuest}
              >
                Continue checkout as guest
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(ev) => void onSubmit(ev)}>
              <dl className="grid gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium text-foreground">{displayName}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="truncate font-medium text-foreground">
                    {email.trim()}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium text-foreground">{phoneDisplay}</dd>
                </div>
              </dl>

              {errorMessage ? (
                <p
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm",
                    duplicateEmail
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : "border-destructive/30 bg-destructive/5 text-destructive",
                  )}
                  role="alert"
                >
                  {errorMessage}
                  {duplicateEmail ? (
                    <span className="mt-2 block">
                      <Link
                        href={loginHref}
                        className="font-semibold text-primary underline underline-offset-2"
                      >
                        Sign in with this email
                      </Link>
                    </span>
                  ) : null}
                </p>
              ) : null}

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-foreground/70">
                  Choose a password
                  <span className="ml-0.5 text-destructive">*</span>
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    minLength={passwordMinLength}
                    required
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 pr-10 text-sm shadow-xs focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15"
                    placeholder={`At least ${passwordMinLength} characters`}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-foreground/70">
                  Confirm password
                  <span className="ml-0.5 text-destructive">*</span>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  minLength={passwordMinLength}
                  required
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-xs focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
              </label>

              <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full rounded-xl font-semibold"
                >
                  {busy ? "Creating account…" : "Create account & continue"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  className="h-10 w-full rounded-xl text-muted-foreground"
                  onClick={handleContinueAsGuest}
                >
                  Continue as guest
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href={loginHref}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
