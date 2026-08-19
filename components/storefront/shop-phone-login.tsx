"use client";

import { useState, type ReactNode } from "react";
import { Phone } from "lucide-react";

import styles from "@/components/storefront/shop-account.module.css";
import {
  completeShopperPhoneSession,
  sendShopperPhoneCode,
  verifyShopperPhoneCode,
} from "@/lib/api";
import {
  formatKenyanPhoneDisplay,
  toKenyanLocal07,
} from "@/lib/kenyan-phone";
import { setPageSealUnlock } from "@/lib/page-seal";
import { cn } from "@/lib/utils";

type Step = "phone" | "code" | "pin";

type Props = {
  variant?: "passbook" | "plain";
  initialPhone?: string;
  suggestedName?: string;
  onSignedIn?: (tabPhone: string) => void;
  footer?: ReactNode;
};

export function ShopperPhoneLogin({
  variant = "plain",
  initialPhone = "",
  suggestedName,
  onSignedIn,
  footer,
}: Props) {
  const [phone, setPhone] = useState(
    () => toKenyanLocal07(initialPhone) || initialPhone.replace(/\D/g, ""),
  );
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [token, setToken] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [helloName, setHelloName] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const local = toKenyanLocal07(phone);
  const passbook = variant === "passbook";

  const onSend = async () => {
    setError("");
    if (!local) {
      setError("Enter a Kenyan mobile like 0714 282 874.");
      return;
    }
    setBusy(true);
    try {
      const sent = await sendShopperPhoneCode(local);
      setHint(sent.maskedHint || formatKenyanPhoneDisplay(local));
      setStep("code");
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    setError("");
    if (!local) {
      setError("Enter a Kenyan mobile like 0714 282 874.");
      return;
    }
    if (!/^\d{4}$/.test(code.trim())) {
      setError("Enter the 4-digit code we sent.");
      return;
    }
    setBusy(true);
    try {
      const verified = await verifyShopperPhoneCode(local, code.trim());
      setToken(verified.phoneVerificationToken);
      setHasPin(Boolean(verified.hasPin));
      setHelloName(verified.customerName?.trim() || null);
      setPin("");
      setConfirmPin("");
      setStep("pin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify that code.");
    } finally {
      setBusy(false);
    }
  };

  const onPin = async () => {
    setError("");
    if (!local || !token) {
      setError("Verify the code we sent first.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("Enter a 4-digit PIN.");
      return;
    }
    if (!hasPin && pin !== confirmPin) {
      setError("The two PINs do not match.");
      return;
    }
    setBusy(true);
    try {
      const session = await completeShopperPhoneSession({
        phone: local,
        phoneVerificationToken: token,
        pin,
        confirmPin: hasPin ? undefined : confirmPin,
        name: helloName || suggestedName?.trim() || undefined,
      });
      if (session.unlockToken && session.tabPhone) {
        setPageSealUnlock("customer-tab", session.tabPhone, session.unlockToken);
      }
      onSignedIn?.(session.tabPhone);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  const fieldClass = passbook
    ? styles.field
    : "block text-[13px] font-medium text-foreground";
  const boxClass = passbook
    ? styles.fieldBox
    : "mt-1.5 flex min-h-12 items-center gap-2 border border-border bg-background px-3";
  const ctaClass = passbook
    ? styles.ctaAccent
    : "inline-flex min-h-12 w-full items-center justify-center bg-primary px-4 text-[15px] font-semibold text-primary-foreground disabled:opacity-50";
  const quietClass = passbook
    ? styles.quiet
    : "text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline";

  return (
    <div className={cn(!passbook && "space-y-4")}>
      {step === "phone" ? (
        <form
          className={passbook ? styles.formRow : "space-y-3"}
          onSubmit={(e) => {
            e.preventDefault();
            void onSend();
          }}
        >
          <label className={fieldClass}>
            Kenyan mobile
            <span className={boxClass}>
              <Phone className="size-4 shrink-0 opacity-60" aria-hidden />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0714 282 874"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={passbook ? undefined : "min-w-0 flex-1 bg-transparent py-3 text-[16px] outline-none"}
              />
            </span>
          </label>
          <button type="submit" disabled={busy} className={ctaClass}>
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : null}

      {step === "code" ? (
        <form
          className={passbook ? undefined : "space-y-3"}
          onSubmit={(e) => {
            e.preventDefault();
            void onVerify();
          }}
        >
          <p className={passbook ? styles.linkCopy : "text-[14px] text-muted-foreground"}>
            Code sent to {hint || formatKenyanPhoneDisplay(local || phone)}.
          </p>
          <label className={fieldClass}>
            4-digit code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className={
                passbook
                  ? styles.codeSolo
                  : "mt-1.5 min-h-12 w-full border border-border bg-background px-3 text-[1.35rem] font-semibold tracking-[0.35em] outline-none"
              }
            />
          </label>
          <button type="submit" disabled={busy} className={ctaClass}>
            {busy ? "Checking…" : "Continue"}
          </button>
          <button
            type="button"
            className={quietClass}
            onClick={() => {
              setStep("phone");
              setError("");
            }}
          >
            Use a different number
          </button>
        </form>
      ) : null}

      {step === "pin" ? (
        <form
          className={passbook ? undefined : "space-y-3"}
          onSubmit={(e) => {
            e.preventDefault();
            void onPin();
          }}
        >
          <p className={passbook ? styles.linkCopy : "text-[14px] text-muted-foreground"}>
            {hasPin
              ? helloName
                ? `Welcome back, ${helloName.split(/\s+/)[0]}. Enter your PIN.`
                : "Enter the 4-digit PIN for this number."
              : "Choose a 4-digit PIN. Same PIN opens your tab at this shop."}
          </p>
          <label className={fieldClass}>
            {hasPin ? "PIN" : "New PIN"}
            <input
              inputMode="numeric"
              autoComplete={hasPin ? "current-password" : "new-password"}
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className={
                passbook
                  ? styles.codeSolo
                  : "mt-1.5 min-h-12 w-full border border-border bg-background px-3 text-[1.35rem] font-semibold tracking-[0.35em] outline-none"
              }
            />
          </label>
          {!hasPin ? (
            <label className={fieldClass}>
              Confirm PIN
              <input
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className={
                  passbook
                    ? styles.codeSolo
                    : "mt-1.5 min-h-12 w-full border border-border bg-background px-3 text-[1.35rem] font-semibold tracking-[0.35em] outline-none"
                }
              />
            </label>
          ) : null}
          <button type="submit" disabled={busy} className={ctaClass}>
            {busy ? "Signing in…" : hasPin ? "Enter shop" : "Save PIN and enter"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className={passbook ? styles.err : "text-[13px] text-destructive"} role="alert">
          {error}
        </p>
      ) : null}
      {footer}
    </div>
  );
}
