"use client";

import { useRef, type FormEvent, type RefObject } from "react";
import { KeyRound, MonitorSmartphone } from "lucide-react";

import { TillPinBoxes } from "@/components/auth/till-pin-boxes";
import { TillUnlockButton } from "@/components/auth/till-unlock-button";
import { TILL_SETUP_PIN_LENGTH } from "@/lib/pos-till-setup";
import { cn } from "@/lib/utils";

export type PosTillSetupPanelProps = {
  displayName: string;
  needsPassword: boolean;
  showTillRegister: boolean;
  tillLabelPlaceholder: string;
  pin: string;
  confirmPin: string;
  password: string;
  tillLabel: string;
  error: string;
  busy: boolean;
  onPinChange: (next: string) => void;
  onConfirmPinChange: (next: string) => void;
  onPasswordChange: (next: string) => void;
  onTillLabelChange: (next: string) => void;
  onSubmit: () => void;
  passwordInputRef: RefObject<HTMLInputElement | null>;
};

export function PosTillSetupPanel({
  displayName,
  needsPassword,
  showTillRegister,
  tillLabelPlaceholder,
  pin,
  confirmPin,
  password,
  tillLabel,
  error,
  busy,
  onPinChange,
  onConfirmPinChange,
  onPasswordChange,
  onTillLabelChange,
  onSubmit,
  passwordInputRef,
}: PosTillSetupPanelProps) {
  const confirmWrapRef = useRef<HTMLDivElement>(null);
  const pinReady = pin.length === TILL_SETUP_PIN_LENGTH;
  const confirmReady = confirmPin.length === TILL_SETUP_PIN_LENGTH;
  const passwordReady = !needsPassword || password.length >= 1;
  const ready = pinReady && confirmReady && passwordReady;

  const fieldClass = cn(
    "mt-1 flex h-11 w-full rounded-md border border-input bg-background px-3",
    "text-sm text-foreground outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:opacity-60",
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <>
      <div className="mb-3 flex items-center gap-2 text-foreground">
        <KeyRound className="size-5 shrink-0" aria-hidden />
        <h2
          id="pos-till-lock-title"
          className="text-lg font-semibold tracking-tight"
        >
          {needsPassword ? "Set a PIN to keep selling" : "Set a PIN to sell"}
        </h2>
      </div>
      {displayName ? (
        <p className="text-sm font-medium text-foreground">{displayName}</p>
      ) : null}
      <p className="mt-1 text-sm text-muted-foreground">
        Four digits unlock this till after a break, without typing your
        password.
        {showTillRegister
          ? " Register this computer so sales, shifts, and receipts stay on this counter."
          : null}
      </p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        {needsPassword ? (
          <label className="block text-xs font-medium text-muted-foreground">
            Password
            <input
              ref={passwordInputRef}
              data-till-unlock-password="1"
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={busy}
              onChange={(event) => onPasswordChange(event.target.value)}
              className={fieldClass}
            />
            <span className="mt-1 block text-[11px] font-normal leading-snug">
              Confirm it is you, then we save the PIN on this account.
            </span>
          </label>
        ) : null}

        <div>
          <p className="text-xs font-medium text-muted-foreground">
            New 4-digit PIN
          </p>
          <div className="mt-1.5">
            <TillPinBoxes
              id="till-setup-pin"
              aria-label="New 4-digit PIN"
              value={pin}
              disabled={busy}
              autoFocus={!needsPassword}
              autoComplete="new-password"
              onChange={(next) => {
                onPinChange(next);
                if (next.length === TILL_SETUP_PIN_LENGTH) {
                  const confirmInput =
                    confirmWrapRef.current?.querySelector("input");
                  confirmInput?.focus({ preventScroll: true });
                }
              }}
            />
          </div>
        </div>

        <div ref={confirmWrapRef}>
          <p className="text-xs font-medium text-muted-foreground">
            Type it again
          </p>
          <div className="mt-1.5">
            <TillPinBoxes
              id="till-setup-pin-confirm"
              aria-label="Confirm 4-digit PIN"
              value={confirmPin}
              disabled={busy}
              autoComplete="new-password"
              onChange={onConfirmPinChange}
            />
          </div>
        </div>

        {showTillRegister ? (
          <label className="block text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MonitorSmartphone className="size-3.5" aria-hidden />
              Name this till
            </span>
            <input
              data-till-overlay-field="1"
              type="text"
              autoComplete="off"
              maxLength={80}
              placeholder={tillLabelPlaceholder}
              value={tillLabel}
              disabled={busy}
              onChange={(event) =>
                onTillLabelChange(event.target.value.slice(0, 80))
              }
              className={fieldClass}
            />
            <span className="mt-1.5 block text-[11px] font-normal leading-snug">
              If this shop already has a till, your PIN will not unlock this
              computer until it is registered. A name like &quot;{tillLabelPlaceholder}&quot;
              is enough.
            </span>
          </label>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <TillUnlockButton
          ready={ready}
          busy={busy}
          idleLabel={
            showTillRegister ? "Save PIN and register till" : "Save PIN and start selling"
          }
          busyLabel={showTillRegister ? "Saving" : "Saving PIN"}
        />
      </form>
    </>
  );
}
