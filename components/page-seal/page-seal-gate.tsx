"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import {
  Delete,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Stamp,
} from "lucide-react";
import { toast } from "sonner";

import {
  clearPageSealUnlock,
  sealCustomerTab,
  sealShopSupplierPage,
  sealSupplierPage,
  sendCustomerTabSealCode,
  sendShopSupplierPageSealCode,
  sendSupplierPageSealCode,
  unsealCustomerTab,
  unsealShopSupplierPage,
  unsealSupplierPage,
  unlockCustomerTabSeal,
  unlockShopSupplierPageSeal,
  unlockSupplierPageSeal,
  type PageSealStatus,
} from "@/lib/page-seal";
import { cn } from "@/lib/utils";

type Scope = "supplier" | "customer-tab" | "shop-supplier";

type Props = {
  scope: Scope;
  subjectKey: string;
  status: PageSealStatus | null;
  /** Owner / customer can run the seal ceremony */
  canManage?: boolean;
  onUnlocked: () => void;
  onSealedChange?: () => void;
  children: ReactNode;
  className?: string;
};

type ManageStep = "idle" | "code" | "pin" | "unseal";

function scopeNoun(scope: Scope): string {
  if (scope === "supplier") return "passport";
  if (scope === "shop-supplier") return "supplier page";
  return "credit tab";
}

export function PageSealGate({
  scope,
  subjectKey,
  status,
  canManage = false,
  onUnlocked,
  onSealedChange,
  children,
  className,
}: Props) {
  const locked = Boolean(status?.sealed && !status.unlockValid);

  if (!status) {
    return (
      <div
        className={cn(
          "flex min-h-[40vh] items-center justify-center gap-2 text-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_55%,transparent)]",
          className,
        )}
      >
        <Loader2 className="size-5 animate-spin" />
        Checking seal…
      </div>
    );
  }

  if (locked) {
    return (
      <div
        className={cn(
          "flex min-h-[min(100%,70dvh)] flex-1 flex-col",
          className,
        )}
      >
        <SealUnlockPad
          scope={scope}
          subjectKey={subjectKey}
          displayName={status.displayName}
          phoneHint={status.phoneHint}
          onUnlocked={onUnlocked}
        />
        {canManage ? (
          <div className="mx-auto mt-auto w-full max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
            <SealManager
              scope={scope}
              subjectKey={subjectKey}
              sealed
              phoneHint={status.phoneHint}
              onSealedChange={onSealedChange}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className}>
      {canManage ? (
        <div className="mb-1.5 px-0 md:px-0">
          <SealManager
            scope={scope}
            subjectKey={subjectKey}
            sealed={status.sealed}
            phoneHint={status.phoneHint}
            onSealedChange={onSealedChange}
          />
        </div>
      ) : null}
      {children}
    </div>
  );
}

function SealUnlockPad({
  scope,
  subjectKey,
  displayName,
  phoneHint,
  onUnlocked,
}: {
  scope: Scope;
  subjectKey: string;
  displayName: string | null;
  phoneHint: string | null;
  onUnlocked: () => void;
}) {
  const titleId = useId();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (value: string) => {
      if (value.length !== 4 || busy) return;
      setBusy(true);
      setError(null);
      try {
        if (scope === "supplier") {
          await unlockSupplierPageSeal(subjectKey, value);
        } else if (scope === "shop-supplier") {
          await unlockShopSupplierPageSeal(subjectKey, value);
        } else {
          await unlockCustomerTabSeal(subjectKey, value);
        }
        toast.success("Seal broken — welcome back");
        onUnlocked();
      } catch (err) {
        setShake(true);
        setPin("");
        setError(err instanceof Error ? err.message : "Incorrect PIN");
        window.setTimeout(() => setShake(false), 480);
      } finally {
        setBusy(false);
      }
    },
    [busy, onUnlocked, scope, subjectKey],
  );

  const press = useCallback(
    (digit: string) => {
      if (busy) return;
      setError(null);
      setPin((current) => {
        if (current.length >= 4) return current;
        const next = current + digit;
        if (next.length === 4) {
          queueMicrotask(() => {
            void submit(next);
          });
        }
        return next;
      });
    },
    [busy, submit],
  );

  const back = useCallback(() => {
    if (busy) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  }, [busy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busy) return;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        press(e.key);
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back, busy, press]);

  const noun = scopeNoun(scope);

  return (
    <section
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-8"
      aria-labelledby={titleId}
    >
      <div
        className={cn(
          "relative flex size-[5.5rem] items-center justify-center rounded-[2px]",
          "border border-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_14%,transparent)]",
          "bg-[color-mix(in_srgb,var(--tab-focus,var(--op-accent,#1D4B3B))_10%,var(--tab-card,#FCFAF5))]",
          "text-[var(--tab-focus,var(--op-accent,#1D4B3B))]",
          "shadow-[0_18px_36px_-22px_color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_45%,transparent)]",
        )}
        aria-hidden
      >
        <Stamp className="size-9 opacity-90" strokeWidth={1.4} />
        <span
          className={cn(
            "absolute -bottom-2 rounded-[2px] px-2 py-0.5",
            "bg-[var(--tab-fg,var(--op-ink,#121A16))] text-[var(--tab-bg,#F4F1EA)]",
            "font-mono text-[9px] font-bold uppercase tracking-[0.18em]",
          )}
        >
          Sealed
        </span>
      </div>

      <h1
        id={titleId}
        className="mt-8 text-balance text-center text-[2rem] font-normal leading-[1.05] tracking-[-0.02em] text-[var(--tab-fg,var(--op-ink,#121A16))]"
        style={{
          fontFamily:
            'var(--font-cormorant), Georgia, "Times New Roman", serif',
        }}
      >
        {displayName || "Protected page"}
      </h1>
      <p className="mt-2 max-w-[28ch] text-center text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_58%,transparent)]">
        Enter your 4-digit PIN to open this {noun}
        {phoneHint ? (
          <>
            {" "}
            · phone {phoneHint}
          </>
        ) : null}
        .
      </p>

      <div
        className={cn("mt-7 flex gap-3", shake && "seal-pin-shake")}
        role="status"
        aria-live="polite"
        aria-label={`${pin.length} of 4 digits entered`}
      >
        {[0, 1, 2, 3].map((i) => {
          const filled = i < pin.length;
          const active = i === pin.length && !busy;
          return (
            <span
              key={i}
              className={cn(
                "flex h-12 w-10 items-center justify-center rounded-[2px] border transition-[border-color,background-color,transform] duration-150",
                "ease-[cubic-bezier(0.22,1,0.36,1)]",
                filled
                  ? "border-[var(--tab-fg,var(--op-ink,#121A16))] bg-[var(--tab-card,#FCFAF5)]"
                  : active
                    ? "border-[var(--tab-focus,var(--op-accent,#1D4B3B))] bg-[var(--tab-card,#FCFAF5)]"
                    : "border-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_16%,transparent)] bg-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_4%,var(--tab-card,#FCFAF5))]",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full transition-transform duration-150",
                  filled
                    ? "scale-100 bg-[var(--tab-fg,var(--op-ink,#121A16))]"
                    : "scale-0 bg-transparent",
                )}
              />
            </span>
          );
        })}
      </div>

      {error ? (
        <p
          className="mt-3 max-w-[28ch] text-center text-[12px] font-medium text-[var(--tab-error-fg,#A55237)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div
        className="mt-8 grid w-full max-w-[17.5rem] grid-cols-3 gap-2"
        role="group"
        aria-label="PIN keypad"
      >
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map(
          (key) => {
            if (key === "") return <span key="pad" aria-hidden />;
            const isBack = key === "back";
            return (
              <button
                key={key}
                type="button"
                disabled={busy}
                aria-label={isBack ? "Delete last digit" : `Digit ${key}`}
                onClick={() => (isBack ? back() : press(key))}
                className={cn(
                  "flex h-[3.35rem] items-center justify-center rounded-[2px] border text-[1.2rem] font-semibold tabular-nums",
                  "border-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_12%,transparent)]",
                  "bg-[var(--tab-card,#FCFAF5)] text-[var(--tab-fg,var(--op-ink,#121A16))]",
                  "transition-[background-color,transform] duration-150",
                  "ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "hover:bg-[color-mix(in_srgb,var(--tab-focus,var(--op-accent,#1D4B3B))_8%,var(--tab-card,#FCFAF5))]",
                  "active:scale-[0.97] disabled:opacity-45",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tab-focus,var(--op-accent,#1D4B3B))] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tab-bg,#F4F1EA)]",
                )}
              >
                {isBack ? (
                  <Delete className="size-5 opacity-80" strokeWidth={1.75} />
                ) : (
                  key
                )}
              </button>
            );
          },
        )}
      </div>

      {busy ? (
        <p className="mt-5 flex items-center gap-2 text-[12px] text-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_55%,transparent)]">
          <Loader2 className="size-3.5 animate-spin" />
          Checking PIN…
        </p>
      ) : (
        <p className="mt-5 text-[11px] text-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_42%,transparent)]">
          You can also type on a keyboard
        </p>
      )}
    </section>
  );
}

function SealManager({
  scope,
  subjectKey,
  sealed,
  phoneHint,
  onSealedChange,
}: {
  scope: Scope;
  subjectKey: string;
  sealed: boolean;
  phoneHint: string | null;
  onSealedChange?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ManageStep>("idle");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep("idle");
    setCode("");
    setPin("");
    setConfirmPin("");
    setDevCode(null);
    setOpen(false);
  };

  const sendCode = async () => {
    setBusy(true);
    try {
      const res =
        scope === "supplier"
          ? await sendSupplierPageSealCode()
          : scope === "shop-supplier"
            ? await sendShopSupplierPageSealCode(subjectKey)
            : await sendCustomerTabSealCode(subjectKey);
      setDevCode(res.devCode);
      setStep("code");
      if (res.devCode) {
        toast.message(`Code stub — use ${res.devCode}`, {
          description: "Messaging provider is not live on this environment.",
        });
      } else {
        toast.success(
          `Code sent${res.phoneHint ? ` to ${res.phoneHint}` : ""}${
            res.channel ? ` via ${res.channel}` : ""
          }`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const confirmSeal = async () => {
    setBusy(true);
    try {
      if (scope === "supplier") {
        await sealSupplierPage({ code, pin, confirmPin });
      } else if (scope === "shop-supplier") {
        await sealShopSupplierPage(subjectKey, { code, pin, confirmPin });
      } else {
        await sealCustomerTab(subjectKey, { code, pin, confirmPin });
      }
      toast.success("Page sealed");
      reset();
      onSealedChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not seal page");
    } finally {
      setBusy(false);
    }
  };

  const confirmUnseal = async () => {
    setBusy(true);
    try {
      if (scope === "supplier") {
        await unsealSupplierPage(pin);
        clearPageSealUnlock("supplier", subjectKey);
      } else if (scope === "shop-supplier") {
        await unsealShopSupplierPage(subjectKey, pin);
        clearPageSealUnlock("shop-supplier", subjectKey);
      } else {
        await unsealCustomerTab(subjectKey, pin);
        clearPageSealUnlock("customer-tab", subjectKey);
      }
      toast.success("Seal removed — page is public again");
      reset();
      onSealedChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove seal");
    } finally {
      setBusy(false);
    }
  };

  const ink = "var(--tab-fg,var(--op-ink,#121A16))";
  const card = "var(--tab-card,#FCFAF5)";
  const accent = "var(--tab-focus,var(--op-accent,#1D4B3B))";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[2px] border",
        "border-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_12%,transparent)]",
        "bg-[var(--tab-card,#FCFAF5)]",
      )}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setStep(sealed ? "unseal" : "idle");
        }}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span
          className="flex items-center gap-1.5 text-[12px] font-medium"
          style={{ color: ink }}
        >
          {sealed ? (
            <ShieldCheck className="size-3.5" style={{ color: accent }} />
          ) : (
            <Lock
              className="size-3.5 opacity-55"
              style={{ color: ink }}
            />
          )}
          {sealed ? "Page sealed" : "Protect this page"}
        </span>
        <span className="text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_48%,transparent)]">
          {open ? "Close" : sealed ? "Manage" : "Seal"}
        </span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_10%,transparent)] px-3 py-3">
          {!sealed && step === "idle" ? (
            <>
              <p className="text-[12px] leading-relaxed text-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_58%,transparent)]">
                We&apos;ll text a code by WhatsApp and SMS to verify this phone,
                then you set a 4-digit PIN. Visitors will need that PIN to open
                balances and history
                {phoneHint ? ` · ${phoneHint}` : ""}.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendCode()}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-[2px] px-3 text-[13px] font-semibold text-white",
                  "disabled:opacity-50",
                )}
                style={{ backgroundColor: accent }}
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Smartphone className="size-3.5" />
                )}
                Send code
              </button>
            </>
          ) : null}

          {!sealed && step === "code" ? (
            <>
              <p className="text-[12px] text-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_58%,transparent)]">
                Enter the code we sent, then choose your PIN.
                {devCode ? (
                  <span className="ml-1 font-mono" style={{ color: accent }}>
                    stub {devCode}
                  </span>
                ) : null}
              </p>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="h-11 w-full rounded-[2px] border border-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_14%,transparent)] px-3 font-mono text-sm tabular-nums"
                style={{ backgroundColor: card, color: ink }}
              />
              <button
                type="button"
                disabled={code.length < 4}
                onClick={() => setStep("pin")}
                className="inline-flex h-10 items-center rounded-[2px] px-3 text-[13px] font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: ink }}
              >
                Continue
              </button>
            </>
          ) : null}

          {!sealed && step === "pin" ? (
            <>
              <p className="text-[12px] text-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_58%,transparent)]">
                Create a 4-digit seal PIN. You&apos;ll use it every time you
                open this page.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="PIN"
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="h-11 rounded-[2px] border border-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_14%,transparent)] px-3 font-mono text-sm tracking-[0.3em]"
                  style={{ backgroundColor: card, color: ink }}
                />
                <input
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Confirm"
                  value={confirmPin}
                  onChange={(e) =>
                    setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="h-11 rounded-[2px] border border-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_14%,transparent)] px-3 font-mono text-sm tracking-[0.3em]"
                  style={{ backgroundColor: card, color: ink }}
                />
              </div>
              <button
                type="button"
                disabled={busy || pin.length !== 4 || confirmPin.length !== 4}
                onClick={() => void confirmSeal()}
                className="inline-flex h-10 items-center gap-2 rounded-[2px] px-3 text-[13px] font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: accent }}
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Stamp className="size-3.5" />
                )}
                Seal page
              </button>
            </>
          ) : null}

          {sealed && step === "unseal" ? (
            <>
              <p className="text-[12px] text-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_58%,transparent)]">
                Enter your PIN to remove the seal and make this page public
                again.
              </p>
              <input
                inputMode="numeric"
                maxLength={4}
                placeholder="PIN"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className="h-11 w-full max-w-[10rem] rounded-[2px] border border-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_14%,transparent)] px-3 font-mono text-sm tracking-[0.3em]"
                style={{ backgroundColor: card, color: ink }}
              />
              <button
                type="button"
                disabled={busy || pin.length !== 4}
                onClick={() => void confirmUnseal()}
                className="inline-flex h-10 items-center gap-2 rounded-[2px] border border-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_16%,transparent)] px-3 text-[13px] font-semibold text-[color-mix(in_srgb,var(--tab-fg,var(--op-ink,#121A16))_70%,transparent)] disabled:opacity-40"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Remove seal
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
