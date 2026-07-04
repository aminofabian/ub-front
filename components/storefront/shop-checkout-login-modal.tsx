"use client";

import { Eye, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loginWithPassword } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  firstName: string;
  lastName: string;
  phoneDisplay: string;
  onSignedIn?: () => void;
  onContinueAsGuest?: () => void;
};

export function ShopCheckoutLoginModal({
  open,
  onOpenChange,
  email,
  firstName,
  lastName,
  phoneDisplay,
  onSignedIn,
  onContinueAsGuest,
}: Props) {
  const displayName = `${firstName} ${lastName}`.trim();
  const forgotHref = `${APP_ROUTES.forgotPassword}?email=${encodeURIComponent(email.trim())}`;

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resetFormState = useCallback(() => {
    setPassword("");
    setErrorMessage("");
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetFormState();
    }
    onOpenChange(next);
  };

  const handleContinueAsGuest = () => {
    resetFormState();
    onOpenChange(false);
    onContinueAsGuest?.();
  };

  const finishSignedIn = () => {
    resetFormState();
    onOpenChange(false);
    onSignedIn?.();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");

    if (!password.trim()) {
      setErrorMessage("Enter your password.");
      return;
    }

    setBusy(true);
    try {
      await loginWithPassword(email.trim(), password);
      finishSignedIn();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not sign in.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="z-[90] max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg"
        overlayClassName="z-[89]"
      >
        <div className="border-b border-border/60 bg-linear-to-br from-primary/8 via-background to-background px-5 pb-4 pt-5 sm:px-6">
          <DialogHeader className="space-y-2 pr-6 text-left">
            <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              <LogIn className="size-3" aria-hidden />
              Welcome back
            </p>
            <DialogTitle className="text-xl tracking-tight">
              Sign in to continue
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              We found an account for this email. Sign in to track orders and
              reuse your saved checkout details.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 py-4 sm:px-6">
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
                className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-foreground/70">
                Password
                <span className="ml-0.5 text-destructive">*</span>
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 pr-10 text-sm shadow-xs focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15"
                  placeholder="Your account password"
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

            <p className="text-right text-xs">
              <Link
                href={forgotHref}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                Forgot password?
              </Link>
            </p>

            <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
              <Button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-xl font-semibold"
              >
                {busy ? "Signing in…" : "Sign in & continue"}
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
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
