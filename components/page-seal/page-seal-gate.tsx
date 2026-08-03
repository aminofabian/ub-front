"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Lock, ShieldCheck, Smartphone, Stamp } from "lucide-react";
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
      <div className={cn("flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground", className)}>
        <Loader2 className="size-5 animate-spin" />
        Checking seal…
      </div>
    );
  }

  if (locked) {
    return (
      <div className={className}>
        <SealUnlockPad
          scope={scope}
          subjectKey={subjectKey}
          displayName={status.displayName}
          phoneHint={status.phoneHint}
          onUnlocked={onUnlocked}
        />
        {canManage ? (
          <div className="mx-auto mt-4 max-w-md px-4">
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
        <div className="mb-1.5">
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
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  const submit = async (value: string) => {
    if (value.length !== 4 || busy) return;
    setBusy(true);
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
      window.setTimeout(() => setShake(false), 450);
      toast.error(err instanceof Error ? err.message : "Incorrect PIN");
    } finally {
      setBusy(false);
    }
  };

  const press = (digit: string) => {
    if (busy || pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) void submit(next);
  };
  const back = () => {
    if (busy) return;
    setPin((p) => p.slice(0, -1));
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-10">
      <div
        className={cn(
          "relative flex size-28 items-center justify-center",
          "rounded-full border-[3px] border-[color-mix(in_srgb,#7f1d1d_55%,#1c1915)]",
          "bg-[radial-gradient(circle_at_35%_30%,#b91c1c,#7f1d1d_55%,#450a0a)]",
          "text-[#fef2f2] shadow-[0_18px_40px_-18px_rgba(127,29,29,0.85)]",
          "animate-[sp-card-in_0.55s_cubic-bezier(0.22,1,0.36,1)_both]",
        )}
      >
        <Stamp className="size-10 opacity-90" strokeWidth={1.5} />
        <span className="absolute -bottom-1 rounded-sm bg-[#450a0a] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em]">
          Sealed
        </span>
      </div>

      <h1 className="mt-7 text-center font-[family-name:var(--font-heading)] text-[1.75rem] font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
        {displayName || "Protected page"}
      </h1>
      <p className="mt-2 max-w-sm text-center text-[13px] leading-relaxed text-muted-foreground">
        This{" "}
        {scope === "supplier"
          ? "passport"
          : scope === "shop-supplier"
            ? "supplier page"
            : "credit tab"}{" "}
        is sealed. Enter the 4-digit PIN to break the seal
        {phoneHint ? ` · phone on file ${phoneHint}` : ""}.
      </p>

      <div
        className={cn(
          "mt-6 flex gap-2 transition-transform",
          shake && "-translate-x-1",
        )}
        style={shake ? { animation: "none" } : undefined}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "flex size-3.5 items-center justify-center rounded-full border",
              "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)]",
              i < pin.length
                ? "bg-[var(--pos-ink,#1c1915)]"
                : "bg-transparent",
            )}
          />
        ))}
      </div>

      <div className="mt-7 grid w-full max-w-[240px] grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) => {
          if (key === "") return <span key="pad" />;
          const isBack = key === "⌫";
          return (
            <button
              key={key}
              type="button"
              disabled={busy}
              onClick={() => (isBack ? back() : press(key))}
              className={cn(
                "flex h-14 items-center justify-center border text-[1.15rem] font-semibold tabular-nums",
                "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
                "bg-white/80 text-[var(--pos-ink,#1c1915)]",
                "transition active:scale-95 disabled:opacity-50",
                "hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]",
              )}
            >
              {isBack ? "⌫" : key}
            </button>
          );
        })}
      </div>

      {busy ? (
        <p className="mt-4 flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Checking PIN…
        </p>
      ) : null}
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

  return (
    <div
      className={cn(
        "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
        "bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)]",
      )}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setStep(sealed ? "unseal" : "idle");
        }}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--pos-ink,#1c1915)]">
          {sealed ? (
            <ShieldCheck className="size-3 text-[var(--pos-primary,#0f766e)]" />
          ) : (
            <Lock className="size-3 text-muted-foreground" />
          )}
          {sealed ? "Page sealed" : "Protect this page"}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {open ? "Close" : sealed ? "Manage" : "Seal"}
        </span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-3.5 py-3.5">
          {!sealed && step === "idle" ? (
            <>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                We&apos;ll text a code by WhatsApp and SMS to verify this phone, then you set a
                4-digit PIN. Visitors will need that PIN to open balances and history
                {phoneHint ? ` · ${phoneHint}` : ""}.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendCode()}
                className={cn(
                  "inline-flex h-9 items-center gap-2 border px-3 text-[11px] font-bold uppercase tracking-[0.12em]",
                  "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white",
                  "disabled:opacity-50",
                )}
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Smartphone className="size-3.5" />}
                Send code
              </button>
            </>
          ) : null}

          {!sealed && step === "code" ? (
            <>
              <p className="text-[12px] text-muted-foreground">
                Enter the code we sent by WhatsApp and SMS, then choose your PIN.
                {devCode ? (
                  <span className="ml-1 font-mono text-[var(--pos-primary,#0f766e)]">
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
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-10 w-full border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-white px-3 font-mono text-sm"
              />
              <button
                type="button"
                disabled={code.length < 4}
                onClick={() => setStep("pin")}
                className="inline-flex h-9 items-center border border-[var(--pos-ink,#1c1915)] bg-[var(--pos-ink,#1c1915)] px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-40"
              >
                Continue
              </button>
            </>
          ) : null}

          {!sealed && step === "pin" ? (
            <>
              <p className="text-[12px] text-muted-foreground">
                Create a 4-digit seal PIN. You’ll use it every time you open this page.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="h-10 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-white px-3 font-mono text-sm tracking-[0.3em]"
                />
                <input
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Confirm"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="h-10 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-white px-3 font-mono text-sm tracking-[0.3em]"
                />
              </div>
              <button
                type="button"
                disabled={busy || pin.length !== 4 || confirmPin.length !== 4}
                onClick={() => void confirmSeal()}
                className="inline-flex h-9 items-center gap-2 border border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-40"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Stamp className="size-3.5" />}
                Seal page
              </button>
            </>
          ) : null}

          {sealed && step === "unseal" ? (
            <>
              <p className="text-[12px] text-muted-foreground">
                Enter your PIN to remove the seal and make this page public again.
              </p>
              <input
                inputMode="numeric"
                maxLength={4}
                placeholder="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="h-10 w-full max-w-[10rem] border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-white px-3 font-mono text-sm tracking-[0.3em]"
              />
              <button
                type="button"
                disabled={busy || pin.length !== 4}
                onClick={() => void confirmUnseal()}
                className="inline-flex h-9 items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_20%,transparent)] px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground disabled:opacity-40"
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
