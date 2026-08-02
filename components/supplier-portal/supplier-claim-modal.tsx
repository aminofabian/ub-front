"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { APP_ROUTES } from "@/lib/config";
import {
  completeSupplierPortalClaim,
  fetchSupplierPortalClaimConfig,
  sendSupplierPortalClaimCode,
  verifySupplierPortalClaimCode,
  verifySupplierPortalInviteCode,
  type SupplierPortalClaimPublicConfig,
} from "@/lib/marketplace-api";
import { cn } from "@/lib/utils";

type Step = "phone" | "code" | "invite" | "password";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill phone and optionally auto-send code */
  initialPhone?: string;
  autoSendCode?: boolean;
};

export function SupplierClaimModal({
  open,
  onOpenChange,
  initialPhone,
  autoSendCode = false,
}: Props) {
  const router = useRouter();
  const [config, setConfig] = useState<SupplierPortalClaimPublicConfig | null>(null);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(initialPhone?.trim() ?? "");
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
  const [devCodeHint, setDevCodeHint] = useState("");
  const [bootstrapped, setBootstrapped] = useState(false);

  const codeLength = config?.codeLength ?? 6;
  const passwordMin = config?.passwordMinLength ?? 8;
  const claimMethod = config?.claimMethod ?? "phone_code";
  const inviteOnly = claimMethod === "code_only" || config?.allowSelfClaim === false;
  const unavailable = Boolean(config && (!config.portalEnabled || !config.claimEnabled));

  // Reset when closed
  useEffect(() => {
    if (open) return;
    setStep("phone");
    setPhone(initialPhone?.trim() ?? "");
    setMaskedPhone("");
    setCode("");
    setSetupToken("");
    setSuggestedName("");
    setName("");
    setPassword("");
    setConfirmPassword("");
    setEmail("");
    setError("");
    setBusy(false);
    setDevCodeHint("");
    setBootstrapped(false);
  }, [open, initialPhone]);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  useEffect(() => {
    if (!open || !config || inviteOnly || bootstrapped || !autoSendCode) return;
    const from = (initialPhone ?? phone).trim();
    if (!from) {
      setBootstrapped(true);
      return;
    }
    setBootstrapped(true);
    setPhone(from);
    setBusy(true);
    void sendSupplierPortalClaimCode(from)
      .then((res) => {
        if (res.alreadyRegistered) {
          setError("This phone already has an account. Sign in instead.");
          return;
        }
        setPhone(res.phone);
        setMaskedPhone(res.maskedPhone);
        setDevCodeHint(res.devCode?.trim() || "");
        if (res.devCode?.trim()) setCode(res.devCode.trim());
        setStep("code");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not send code");
      })
      .finally(() => setBusy(false));
  }, [open, config, inviteOnly, bootstrapped, autoSendCode, initialPhone, phone]);

  const onSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDevCodeHint("");
    setBusy(true);
    try {
      const res = await sendSupplierPortalClaimCode(phone);
      if (res.alreadyRegistered) {
        setError("This phone already has an account. Sign in instead.");
        return;
      }
      setPhone(res.phone);
      setMaskedPhone(res.maskedPhone);
      setDevCodeHint(res.devCode?.trim() || "");
      if (res.devCode?.trim()) setCode(res.devCode.trim());
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
      onOpenChange(false);
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

  const inputClass =
    "w-full rounded-xl border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] " +
    "bg-white px-3 py-2.5 text-sm outline-none " +
    "focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:ring-2 " +
    "focus-visible:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)]";

  const title =
    step === "password"
      ? "Set your password"
      : step === "code"
        ? "Enter the code"
        : step === "invite"
          ? "Invitation code"
          : "Claim your supplier account";

  const description =
    step === "password"
      ? "You’ll use this password with your phone number — or add an email later."
      : step === "code"
        ? `Enter the ${codeLength}-digit code sent to ${maskedPhone || phone}.`
        : inviteOnly
          ? "Enter the invitation code you received, then set a password."
          : "We’ll text a code to your phone. Then set a password you can use with this number — or add an email later.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        showCloseButton
        className={cn(
          "max-h-[min(92dvh,720px)] gap-0 overflow-y-auto border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
          "bg-[color-mix(in_srgb,#faf8f4_98%,white)] p-0 shadow-[0_24px_80px_-28px_rgba(28,25,21,0.45)]",
        )}
      >
        <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <DialogHeader className="space-y-2 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Supplier passport
            </p>
            <DialogTitle className="font-[family-name:var(--font-heading)] text-[1.65rem] font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
              {title}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-3">
            {unavailable ? (
              <AuthAlert variant="error">
                Supplier Portal claim is temporarily unavailable.
              </AuthAlert>
            ) : null}

            {!unavailable && step === "invite" ? (
              <form className="space-y-3" onSubmit={onVerifyInvite}>
                <label className="text-sm font-medium" htmlFor="claim-invite-code">
                  Invitation code
                </label>
                <input
                  id="claim-invite-code"
                  type="text"
                  className={cn(inputClass, "tracking-[0.2em]")}
                  value={code}
                  onChange={(ev) =>
                    setCode(ev.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))
                  }
                  autoComplete="one-time-code"
                  required
                />
                <label className="text-sm font-medium" htmlFor="claim-invite-phone">
                  Phone number{" "}
                  <span className="font-normal text-muted-foreground">(if required)</span>
                </label>
                <input
                  id="claim-invite-phone"
                  type="tel"
                  inputMode="tel"
                  className={inputClass}
                  value={phone}
                  onChange={(ev) => setPhone(ev.target.value)}
                  placeholder="07… or 2547…"
                  autoComplete="tel"
                />
                <Button
                  type="submit"
                  className="h-11 w-full rounded-full bg-[var(--pos-primary,#0f766e)] text-white hover:brightness-110"
                  disabled={busy || code.length < 4}
                >
                  {busy ? "Checking…" : "Continue"}
                </Button>
                {config?.allowSelfClaim && claimMethod === "phone_code" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setStep("phone")}
                  >
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
                  className={inputClass}
                  value={phone}
                  onChange={(ev) => setPhone(ev.target.value)}
                  placeholder="07… or 2547…"
                  autoComplete="tel"
                  required
                  autoFocus
                />
                <Button
                  type="submit"
                  className="h-11 w-full rounded-full bg-[var(--pos-primary,#0f766e)] text-white hover:brightness-110"
                  disabled={busy || !phone.trim()}
                >
                  {busy ? "Sending…" : "Send code"}
                </Button>
                <button
                  type="button"
                  className="w-full py-1 text-center text-sm font-medium text-[var(--pos-ink,#1c1915)]"
                  onClick={() => setStep("invite")}
                >
                  I have an invitation code
                </button>
              </form>
            ) : null}

            {!unavailable && step === "code" ? (
              <form className="space-y-3" onSubmit={onVerifyCode}>
                {devCodeHint ? (
                  <AuthAlert variant="success">
                    SMS is not configured on this environment. Use code{" "}
                    <span className="font-mono font-semibold tracking-wider">{devCodeHint}</span>.
                  </AuthAlert>
                ) : null}
                <label className="text-sm font-medium" htmlFor="claim-code">
                  Verification code
                </label>
                <input
                  id="claim-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={codeLength}
                  className={cn(inputClass, "tracking-[0.3em]")}
                  value={code}
                  onChange={(ev) =>
                    setCode(ev.target.value.replace(/\D/g, "").slice(0, codeLength))
                  }
                  autoComplete="one-time-code"
                  required
                  autoFocus
                />
                <Button
                  type="submit"
                  className="h-11 w-full rounded-full bg-[var(--pos-primary,#0f766e)] text-white hover:brightness-110"
                  disabled={busy || code.length !== codeLength}
                >
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
                  className={inputClass}
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
                      className={inputClass}
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
                  className={inputClass}
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
                  className={inputClass}
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
                  className={inputClass}
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="Use instead of phone when signing in"
                  autoComplete="email"
                />
                <Button
                  type="submit"
                  className="h-11 w-full rounded-full bg-[var(--pos-primary,#0f766e)] text-white hover:brightness-110"
                  disabled={busy}
                >
                  {busy ? "Creating account…" : "Create account"}
                </Button>
              </form>
            ) : null}

            {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

            <p className="pt-1 text-center text-sm text-muted-foreground">
              Already claimed?{" "}
              <Link
                href={APP_ROUTES.supplierPortalLogin}
                className="font-medium text-[var(--pos-ink,#1c1915)] underline underline-offset-2"
                onClick={() => onOpenChange(false)}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
