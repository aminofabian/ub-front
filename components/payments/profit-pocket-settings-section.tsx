"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  PiggyBank,
  Smartphone,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  fetchPosStkPushStatus,
  fetchProfitPocketSettings,
  fetchProfitPockets,
  testProfitPocketDestination,
  updateProfitPocketSettings,
  type ProfitPocketRecord,
  type ProfitPocketSendRailOptionRecord,
  type ProfitPocketSettingsRecord,
} from "@/lib/api";
import { fmtMoney } from "@/lib/business-hub/formatters";
import {
  CUSTOM_BANK_ID,
  KENYA_MPESA_BANKS,
  kenyaBankByBusinessNumber,
  kenyaBankById,
} from "@/lib/kenya-mpesa-banks";
import { cn } from "@/lib/utils";

type ProfitPocketSettingsSectionProps = {
  canWrite: boolean;
  theatreMode?: boolean;
};

const DEST_TYPES = [
  { id: "bank", label: "Bank", hint: "Lipa Na M-Pesa" },
  { id: "till", label: "Till", hint: "Buy Goods" },
  { id: "paybill", label: "Paybill", hint: "Expense" },
] as const;

const GUARD_MODES = [
  { id: "warn", label: "Warn" },
  { id: "approve", label: "Approve" },
  { id: "hard", label: "Hard block" },
] as const;

type TestPhase =
  | "idle"
  | "sending"
  | "awaiting"
  | "received"
  | "failed"
  | "skipped";

type TestRun = {
  phase: TestPhase;
  checkoutId: string | null;
  message: string | null;
  receipt: string | null;
  rail: string | null;
};

const IDLE_TEST: TestRun = {
  phase: "idle",
  checkoutId: null,
  message: null,
  receipt: null,
  rail: null,
};

const fieldClass =
  "h-9 w-full border border-input bg-background px-2.5 font-mono text-sm";
const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground";

function BankDestinationFields({
  canWrite,
  saving,
  destinationBankName,
  setDestinationBankName,
  destinationPaybill,
  setDestinationPaybill,
  destinationAccount,
  setDestinationAccount,
  destinationLabel,
  setDestinationLabel,
}: {
  canWrite: boolean;
  saving: boolean;
  destinationBankName: string;
  setDestinationBankName: (v: string) => void;
  destinationPaybill: string;
  setDestinationPaybill: (v: string) => void;
  destinationAccount: string;
  setDestinationAccount: (v: string) => void;
  destinationLabel: string;
  setDestinationLabel: (v: string) => void;
}) {
  const matched = useMemo(
    () => kenyaBankByBusinessNumber(destinationPaybill),
    [destinationPaybill],
  );
  const [bankId, setBankId] = useState("");

  useEffect(() => {
    if (matched) {
      setBankId(matched.id);
      return;
    }
    if (destinationPaybill.trim() || destinationBankName.trim()) {
      setBankId(CUSTOM_BANK_ID);
    }
  }, [matched, destinationPaybill, destinationBankName]);

  const knownBank =
    bankId !== "" && bankId !== CUSTOM_BANK_ID && !!kenyaBankById(bankId);

  return (
    <div className="space-y-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Bank</span>
          <select
            className="h-9 border border-input bg-background px-2.5 text-sm"
            value={bankId}
            disabled={!canWrite || saving}
            onChange={(e) => {
              const id = e.target.value;
              setBankId(id);
              if (!id) {
                setDestinationBankName("");
                setDestinationPaybill("");
                return;
              }
              if (id === CUSTOM_BANK_ID) {
                if (matched) {
                  setDestinationBankName("");
                  setDestinationPaybill("");
                }
                return;
              }
              const bank = kenyaBankById(id);
              if (bank) {
                setDestinationBankName(bank.name);
                setDestinationPaybill(bank.businessNumber);
              }
            }}
          >
            <option value="">Select…</option>
            {KENYA_MPESA_BANKS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            <option value={CUSTOM_BANK_ID}>Other — enter paybill</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Account number</span>
          <input
            className={fieldClass}
            value={destinationAccount}
            disabled={!canWrite || saving}
            onChange={(e) => setDestinationAccount(e.target.value)}
            placeholder="5552830017"
            inputMode="numeric"
          />
        </label>
      </div>

      {bankId === CUSTOM_BANK_ID ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Bank name</span>
            <input
              className="h-9 border border-input bg-background px-2.5 text-sm"
              value={destinationBankName}
              disabled={!canWrite || saving}
              onChange={(e) => setDestinationBankName(e.target.value)}
              placeholder="e.g. Equity Bank"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>M-Pesa paybill</span>
            <input
              className={fieldClass}
              value={destinationPaybill}
              disabled={!canWrite || saving}
              onChange={(e) =>
                setDestinationPaybill(e.target.value.replace(/[^\d]/g, ""))
              }
              placeholder="247247"
              inputMode="numeric"
            />
          </label>
        </div>
      ) : knownBank && destinationPaybill ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--pos-primary,#0f766e)]">
            Paybill {destinationPaybill}
          </span>
          Used for Lipa Na M-Pesa when you pocket.
        </p>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Nickname (optional)</span>
        <input
          className="h-9 border border-input bg-background px-2.5 text-sm"
          value={destinationLabel}
          disabled={!canWrite || saving}
          onChange={(e) => setDestinationLabel(e.target.value)}
          placeholder="e.g. Owner NCBA"
        />
      </label>
    </div>
  );
}

function DestinationPreview({
  destinationType,
  destinationLabel,
  destinationBankName,
  destinationAccount,
  destinationPaybill,
  destinationPaybillAccount,
}: {
  destinationType: string;
  destinationLabel: string;
  destinationBankName: string;
  destinationAccount: string;
  destinationPaybill: string;
  destinationPaybillAccount: string;
}) {
  const line = useMemo(() => {
    if (destinationLabel.trim()) return destinationLabel.trim();
    if (destinationType === "bank") {
      const bank = destinationBankName.trim() || "Bank";
      const acct = destinationAccount.trim();
      return acct ? `${bank} · ${acct}` : bank;
    }
    if (destinationType === "till") {
      const till = destinationAccount.trim();
      return till ? `Till ${till}` : null;
    }
    if (destinationType === "paybill") {
      const pb = destinationPaybill.trim();
      const acct = destinationPaybillAccount.trim();
      if (!pb) return null;
      return acct ? `Paybill ${pb} · ${acct}` : `Paybill ${pb}`;
    }
    return null;
  }, [
    destinationType,
    destinationLabel,
    destinationBankName,
    destinationAccount,
    destinationPaybill,
    destinationPaybillAccount,
  ]);

  if (!line) return null;
  return (
    <p className="border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-xs leading-snug text-foreground">
      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--pos-primary,#0f766e)]">
        Money lands on
      </span>
      <span className="mt-0.5 block font-semibold tabular-nums">{line}</span>
    </p>
  );
}

function TestReceiptPanel({
  test,
  destinationSummary,
  onDismiss,
}: {
  test: TestRun;
  destinationSummary: string | null;
  onDismiss: () => void;
}) {
  if (test.phase === "idle") return null;

  const awaiting = test.phase === "sending" || test.phase === "awaiting";
  const ok = test.phase === "received";
  const bad = test.phase === "failed" || test.phase === "skipped";

  return (
    <div
      className={cn(
        "border px-3.5 py-3",
        awaiting &&
          "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]",
        ok &&
          "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)]",
        bad && "border-[#9a2e16]/40 bg-[#9a2e16]/5",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center",
            awaiting && "bg-white text-[var(--pos-primary,#0f766e)]",
            ok && "bg-[var(--pos-primary,#0f766e)] text-white",
            bad && "bg-white text-[#9a2e16]",
          )}
        >
          {awaiting ? (
            <span className="relative">
              <Smartphone className="size-4" aria-hidden />
              <Loader2
                className="absolute -right-1.5 -top-1.5 size-3.5 animate-spin"
                aria-hidden
              />
            </span>
          ) : ok ? (
            <CheckCircle2 className="size-4" aria-hidden />
          ) : (
            <XCircle className="size-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-semibold",
              bad ? "text-[#9a2e16]" : "text-foreground",
            )}
          >
            {test.phase === "sending"
              ? "Sending KES 1…"
              : test.phase === "awaiting"
                ? test.rail === "daraja"
                  ? "Waiting for your M-Pesa PIN"
                  : "Waiting for Send Money confirmation"
                : test.phase === "received"
                  ? "KES 1 received"
                  : test.phase === "skipped"
                    ? "Test skipped"
                    : "Test failed"}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {test.phase === "awaiting" && test.rail === "daraja"
              ? "Enter the PIN on your phone. We’ll confirm when Safaricom callbacks."
              : test.phase === "received"
                ? destinationSummary
                  ? `Callback confirmed — cash landed on ${destinationSummary}.`
                  : "Callback confirmed — destination works."
                : (test.message ??
                  (test.phase === "skipped"
                    ? "Enable a ready send rail first."
                    : "Try again or check the destination."))}
          </p>
          {(test.receipt || test.checkoutId) &&
          (ok || test.phase === "awaiting") ? (
            <dl className="mt-2 grid gap-1 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-2 font-mono text-[10px] text-muted-foreground">
              {test.receipt ? (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-sans font-semibold uppercase tracking-[0.05em]">
                    Receipt
                  </dt>
                  <dd className="tabular-nums text-foreground">{test.receipt}</dd>
                </div>
              ) : null}
              {test.checkoutId ? (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-sans font-semibold uppercase tracking-[0.05em]">
                    Checkout
                  </dt>
                  <dd className="break-all tabular-nums text-foreground">
                    {test.checkoutId}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
        {!awaiting ? (
          <button
            type="button"
            className="shrink-0 text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:underline"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ProfitPocketConfigureForm({
  canWrite,
  saving,
  enabled,
  setEnabled,
  destinationType,
  setDestinationType,
  destinationLabel,
  setDestinationLabel,
  destinationAccount,
  setDestinationAccount,
  destinationBankName,
  setDestinationBankName,
  destinationPaybill,
  setDestinationPaybill,
  destinationPaybillAccount,
  setDestinationPaybillAccount,
  defaultFloat,
  setDefaultFloat,
  marginGuardMode,
  setMarginGuardMode,
  fridayReminderEnabled,
  setFridayReminderEnabled,
  profitJarPct,
  setProfitJarPct,
  marginBudgetDaily,
  setMarginBudgetDaily,
  sendRail,
  setSendRail,
  availableSendRails,
  stkPhone,
  setStkPhone,
  advancedOpen,
  setAdvancedOpen,
}: {
  canWrite: boolean;
  saving: boolean;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  destinationType: string;
  setDestinationType: (v: string) => void;
  destinationLabel: string;
  setDestinationLabel: (v: string) => void;
  destinationAccount: string;
  setDestinationAccount: (v: string) => void;
  destinationBankName: string;
  setDestinationBankName: (v: string) => void;
  destinationPaybill: string;
  setDestinationPaybill: (v: string) => void;
  destinationPaybillAccount: string;
  setDestinationPaybillAccount: (v: string) => void;
  defaultFloat: string;
  setDefaultFloat: (v: string) => void;
  marginGuardMode: string;
  setMarginGuardMode: (v: string) => void;
  fridayReminderEnabled: boolean;
  setFridayReminderEnabled: (v: boolean) => void;
  profitJarPct: string;
  setProfitJarPct: (v: string) => void;
  marginBudgetDaily: string;
  setMarginBudgetDaily: (v: string) => void;
  sendRail: string;
  setSendRail: (v: string) => void;
  availableSendRails: ProfitPocketSendRailOptionRecord[];
  stkPhone: string;
  setStkPhone: (v: string) => void;
  advancedOpen: boolean;
  setAdvancedOpen: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-muted/10 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Enable</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Pocket surplus from Business Hub — not customer tills.
          </p>
        </div>
        <Switch
          checked={enabled}
          disabled={!canWrite || saving}
          onCheckedChange={setEnabled}
          aria-label="Enable Profit Pocket"
        />
      </div>

      {enabled ? (
        <>
          <div className="space-y-2">
            <p className={labelClass}>Where it lands</p>
            <div
              className="grid grid-cols-3 gap-1"
              role="radiogroup"
              aria-label="Destination type"
            >
              {DEST_TYPES.map((t) => {
                const active = destinationType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!canWrite || saving}
                    onClick={() => setDestinationType(t.id)}
                    className={cn(
                      "border px-2 py-2 text-center transition-colors",
                      active
                        ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)]"
                        : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white hover:bg-muted/20",
                    )}
                  >
                    <span className="block text-sm font-semibold text-foreground">
                      {t.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {t.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            {destinationType === "bank" ? (
              <BankDestinationFields
                canWrite={canWrite}
                saving={saving}
                destinationBankName={destinationBankName}
                setDestinationBankName={setDestinationBankName}
                destinationPaybill={destinationPaybill}
                setDestinationPaybill={setDestinationPaybill}
                destinationAccount={destinationAccount}
                setDestinationAccount={setDestinationAccount}
                destinationLabel={destinationLabel}
                setDestinationLabel={setDestinationLabel}
              />
            ) : null}

            {destinationType === "till" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Till number</span>
                  <input
                    className={fieldClass}
                    value={destinationAccount}
                    disabled={!canWrite || saving}
                    onChange={(e) => setDestinationAccount(e.target.value)}
                    inputMode="numeric"
                    placeholder="567890"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Nickname (optional)</span>
                  <input
                    className="h-9 border border-input bg-background px-2.5 text-sm"
                    value={destinationLabel}
                    disabled={!canWrite || saving}
                    onChange={(e) => setDestinationLabel(e.target.value)}
                    placeholder="e.g. Expense till"
                  />
                </label>
              </div>
            ) : null}

            {destinationType === "paybill" ? (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className={labelClass}>Paybill</span>
                    <input
                      className={fieldClass}
                      value={destinationPaybill}
                      disabled={!canWrite || saving}
                      onChange={(e) => setDestinationPaybill(e.target.value)}
                      inputMode="numeric"
                      placeholder="247247"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={labelClass}>Account</span>
                    <input
                      className={fieldClass}
                      value={destinationPaybillAccount}
                      disabled={!canWrite || saving}
                      onChange={(e) =>
                        setDestinationPaybillAccount(e.target.value)
                      }
                      placeholder="Account / ref"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Nickname (optional)</span>
                  <input
                    className="h-9 border border-input bg-background px-2.5 text-sm"
                    value={destinationLabel}
                    disabled={!canWrite || saving}
                    onChange={(e) => setDestinationLabel(e.target.value)}
                    placeholder="e.g. Owner paybill"
                  />
                </label>
              </div>
            ) : null}

            <DestinationPreview
              destinationType={destinationType}
              destinationLabel={destinationLabel}
              destinationBankName={destinationBankName}
              destinationAccount={destinationAccount}
              destinationPaybill={destinationPaybill}
              destinationPaybillAccount={destinationPaybillAccount}
            />
          </div>

          <div className="space-y-2">
            <p className={labelClass}>Send via</p>
            {availableSendRails.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {availableSendRails.map((rail) => {
                    const active = sendRail === rail.id;
                    return (
                      <button
                        key={rail.id}
                        type="button"
                        disabled={!canWrite || saving || !rail.ready}
                        onClick={() => setSendRail(rail.id)}
                        title={rail.detail ?? undefined}
                        className={cn(
                          "border px-3 py-1.5 text-left text-sm font-semibold transition-colors",
                          active
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)] text-foreground"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-muted-foreground hover:bg-muted/20",
                          !rail.ready && "opacity-50",
                        )}
                      >
                        {rail.label}
                        {!rail.ready ? " · not ready" : null}
                      </button>
                    );
                  })}
                </div>
                {sendRail === "daraja" ? (
                  <label className="flex flex-col gap-1">
                    <span className={labelClass}>Phone for STK prompt</span>
                    <div className="flex items-center gap-2">
                      <Smartphone
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <input
                        className={cn(fieldClass, "flex-1")}
                        value={stkPhone}
                        disabled={!canWrite || saving}
                        onChange={(e) => setStkPhone(e.target.value)}
                        placeholder="07XX XXX XXX"
                        inputMode="tel"
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      PIN on this phone · cash lands on the destination above.
                    </span>
                  </label>
                ) : null}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                No send rails yet. Ask your platform admin to enable Daraja
                Express, or connect a payout gateway under Accept payments.
              </p>
            )}
          </div>

          <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted/20"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              aria-expanded={advancedOpen}
            >
              Pocket rules &amp; Margin Guard
              <ChevronDown
                className={cn(
                  "size-3.5 text-muted-foreground transition-transform",
                  advancedOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {advancedOpen ? (
              <div className="space-y-3 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className={labelClass}>Leave float (KES)</span>
                    <input
                      className={fieldClass}
                      value={defaultFloat}
                      disabled={!canWrite || saving}
                      onChange={(e) => setDefaultFloat(e.target.value)}
                      inputMode="decimal"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={labelClass}>Profit jar %</span>
                    <input
                      className={fieldClass}
                      value={profitJarPct}
                      disabled={!canWrite || saving}
                      onChange={(e) => setProfitJarPct(e.target.value)}
                      inputMode="decimal"
                      placeholder="100"
                    />
                  </label>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Suggested pocket = min(gross profit, cash + M-Pesa − float) ×
                  jar %.
                </p>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      Friday reminder
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Nudge at 6pm when there is surplus.
                    </p>
                  </div>
                  <Switch
                    checked={fridayReminderEnabled}
                    disabled={!canWrite || saving}
                    onCheckedChange={setFridayReminderEnabled}
                    aria-label="Friday Pocket reminder"
                  />
                </div>

                <div className="space-y-1.5">
                  <p className={labelClass}>Margin Guard</p>
                  <div className="grid grid-cols-3 gap-1">
                    {GUARD_MODES.map((m) => {
                      const active = marginGuardMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={!canWrite || saving}
                          onClick={() => setMarginGuardMode(m.id)}
                          className={cn(
                            "border px-2 py-1.5 text-center text-xs font-semibold transition-colors",
                            active
                              ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)]"
                              : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white hover:bg-muted/20",
                          )}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                  {marginGuardMode === "warn" ? (
                    <label className="mt-1 flex flex-col gap-1">
                      <span className={labelClass}>
                        Daily margin budget (KES)
                      </span>
                      <input
                        className={fieldClass}
                        value={marginBudgetDaily}
                        disabled={!canWrite || saving}
                        onChange={(e) => setMarginBudgetDaily(e.target.value)}
                        inputMode="decimal"
                        placeholder="0 = off"
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          <p className={labelClass}>Margin Guard</p>
          <div className="grid grid-cols-3 gap-1">
            {GUARD_MODES.map((m) => {
              const active = marginGuardMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={!canWrite || saving}
                  onClick={() => setMarginGuardMode(m.id)}
                  className={cn(
                    "border px-2 py-1.5 text-center text-xs font-semibold transition-colors",
                    active
                      ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)]"
                      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white hover:bg-muted/20",
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfitPocketSettingsSection({
  canWrite,
  theatreMode = false,
}: ProfitPocketSettingsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<ProfitPocketSettingsRecord | null>(
    null,
  );
  const [history, setHistory] = useState<ProfitPocketRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [destinationType, setDestinationType] = useState("");
  const [destinationLabel, setDestinationLabel] = useState("");
  const [destinationAccount, setDestinationAccount] = useState("");
  const [destinationBankName, setDestinationBankName] = useState("");
  const [destinationPaybill, setDestinationPaybill] = useState("");
  const [destinationPaybillAccount, setDestinationPaybillAccount] =
    useState("");
  const [defaultFloat, setDefaultFloat] = useState("5000");
  const [marginGuardMode, setMarginGuardMode] = useState("warn");
  const [fridayReminderEnabled, setFridayReminderEnabled] = useState(true);
  const [profitJarPct, setProfitJarPct] = useState("100");
  const [marginBudgetDaily, setMarginBudgetDaily] = useState("");
  const [sendRail, setSendRail] = useState("");
  const [availableSendRails, setAvailableSendRails] = useState<
    ProfitPocketSendRailOptionRecord[]
  >([]);
  const [stkPhone, setStkPhone] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [testRun, setTestRun] = useState<TestRun>(IDLE_TEST);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const apply = useCallback((s: ProfitPocketSettingsRecord) => {
    setSettings(s);
    setEnabled(s.enabled);
    setDestinationType(
      s.destinationType === "mpesa_phone" ? "" : (s.destinationType ?? ""),
    );
    setDestinationLabel(s.destinationLabel ?? "");
    setDestinationAccount(s.destinationAccount ?? "");
    setDestinationBankName(s.destinationBankName ?? "");
    setDestinationPaybill(s.destinationPaybill ?? "");
    setDestinationPaybillAccount(s.destinationPaybillAccount ?? "");
    setDefaultFloat(String(Number(s.defaultFloat) || 5000));
    setMarginGuardMode(s.marginGuardMode || "warn");
    setFridayReminderEnabled(s.fridayReminderEnabled !== false);
    setProfitJarPct(
      s.profitJarPct == null || s.profitJarPct === ""
        ? "100"
        : String(Number(s.profitJarPct) || 100),
    );
    setMarginBudgetDaily(
      s.marginBudgetDaily == null || s.marginBudgetDaily === ""
        ? ""
        : String(Number(s.marginBudgetDaily) || ""),
    );
    setSendRail(s.sendRail ?? "");
    setAvailableSendRails(s.availableSendRails ?? []);
    setStkPhone(s.stkPhone ?? "");
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      apply(await fetchProfitPocketSettings());
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not load Profit Pocket settings.",
      );
    } finally {
      setLoading(false);
    }
  }, [apply]);

  const reloadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await fetchProfitPockets({ limit: 8 }));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    void reloadHistory();
  }, [reload, reloadHistory]);

  const startPolling = useCallback(
    (checkoutRequestId: string) => {
      stopPolling();
      const started = Date.now();
      pollRef.current = setInterval(() => {
        void (async () => {
          try {
            const status = await fetchPosStkPushStatus(checkoutRequestId);
            if (status.success) {
              stopPolling();
              setTestRun({
                phase: "received",
                checkoutId: checkoutRequestId,
                message: "Safaricom confirmed the STK payment.",
                receipt: status.gatewayTransactionId ?? null,
                rail: "daraja",
              });
              toast.success("KES 1 received", {
                description: "Destination works — callback confirmed.",
              });
              return;
            }
            if (status.failed) {
              stopPolling();
              setTestRun({
                phase: "failed",
                checkoutId: checkoutRequestId,
                message:
                  status.failureReason ||
                  "Payment did not go through. Check your phone and try again.",
                receipt: null,
                rail: "daraja",
              });
              return;
            }
            if (Date.now() - started > 120_000) {
              stopPolling();
              setTestRun({
                phase: "failed",
                checkoutId: checkoutRequestId,
                message:
                  "Still waiting on M-Pesa. Check your phone for the prompt, or try again.",
                receipt: null,
                rail: "daraja",
              });
            }
          } catch {
            // keep polling through transient errors
          }
        })();
      }, 2_500);
    },
    [stopPolling],
  );

  const buildPayload = () => {
    const floatN = Number(defaultFloat);
    if (!Number.isFinite(floatN) || floatN < 0) {
      throw new Error("Default leave float must be a non-negative number.");
    }
    const jarN = Number(profitJarPct);
    if (!Number.isFinite(jarN) || jarN < 1 || jarN > 100) {
      throw new Error("Profit jar % must be between 1 and 100.");
    }
    const budgetRaw = marginBudgetDaily.trim();
    const budgetN = budgetRaw === "" ? 0 : Number(budgetRaw);
    if (!Number.isFinite(budgetN) || budgetN < 0) {
      throw new Error("Margin budget must be a non-negative number.");
    }
    if (destinationType === "mpesa_phone") {
      throw new Error(
        "M-Pesa phone destinations are no longer supported. Choose bank, till, or paybill.",
      );
    }
    return {
      enabled,
      destinationType: destinationType || null,
      destinationLabel: destinationLabel.trim() || null,
      destinationAccount: destinationAccount.trim() || null,
      destinationBankName: destinationBankName.trim() || null,
      destinationPaybill: destinationPaybill.trim() || null,
      destinationPaybillAccount: destinationPaybillAccount.trim() || null,
      defaultFloat: floatN,
      marginGuardMode:
        marginGuardMode === "approve" || marginGuardMode === "hard"
          ? marginGuardMode
          : "warn",
      fridayReminderEnabled,
      profitJarPct: jarN,
      marginBudgetDaily: budgetN,
      sendRail: sendRail || null,
      stkPhone: stkPhone.trim() || null,
    } as const;
  };

  const onSave = async () => {
    if (!canWrite) return;
    setSaving(true);
    try {
      const next = await updateProfitPocketSettings(buildPayload());
      apply(next);
      toast.success("Profit Pocket settings saved");
      void reloadHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    if (!canWrite) return;
    stopPolling();
    setTesting(true);
    setTestRun({
      phase: "sending",
      checkoutId: null,
      message: null,
      receipt: null,
      rail: sendRail || null,
    });
    try {
      const next = await updateProfitPocketSettings(buildPayload());
      apply(next);
      if (!next.enabled || !next.configured) {
        setTestRun({
          phase: "failed",
          checkoutId: null,
          message: "Save a complete destination before testing.",
          receipt: null,
          rail: sendRail || null,
        });
        toast.error("Save a complete destination before testing.");
        return;
      }
      const result = await testProfitPocketDestination();
      const rail = next.sendRail ?? sendRail;
      if (result.status === "pending") {
        const checkoutId = result.sendMoneyId;
        setTestRun({
          phase: "awaiting",
          checkoutId,
          message: result.message,
          receipt: null,
          rail,
        });
        if (rail === "daraja" && checkoutId) {
          startPolling(checkoutId);
        } else {
          toast.success("Test sent (KES 1)", {
            description:
              result.message ?? "Check the destination for KES 1.",
          });
        }
      } else if (result.status === "skipped") {
        setTestRun({
          phase: "skipped",
          checkoutId: null,
          message: result.message ?? "Enable a ready send rail first.",
          receipt: null,
          rail,
        });
      } else {
        setTestRun({
          phase: "failed",
          checkoutId: result.sendMoneyId,
          message: result.message ?? "Test send failed.",
          receipt: null,
          rail,
        });
        toast.error(result.message ?? "Test send failed.");
      }
      void reloadHistory();
    } catch (e) {
      setTestRun({
        phase: "failed",
        checkoutId: null,
        message:
          e instanceof Error ? e.message : "Could not test destination.",
        receipt: null,
        rail: sendRail || null,
      });
      toast.error(e instanceof Error ? e.message : "Could not test destination.");
    } finally {
      setTesting(false);
    }
  };

  const collisionBanner =
    settings?.collidesWithCustomerPay && settings.customerPayCollisionMessage ? (
      <p className="mb-3 flex items-start gap-2 border border-[#9a2e16]/35 bg-[#9a2e16]/5 px-3 py-2 text-xs leading-relaxed text-[#9a2e16]">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>{settings.customerPayCollisionMessage}</span>
      </p>
    ) : null;

  const historyBlock = (
    <div className="mt-4 space-y-1.5 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] pt-3">
      <p className={labelClass}>Recent pockets</p>
      {historyLoading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : history.length === 0 ? (
        <p className="text-xs text-muted-foreground">No pockets yet.</p>
      ) : (
        <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
          {history.map((row) => (
            <li
              key={row.profitPocketId}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-2.5 py-1.5 text-xs"
            >
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {fmtMoney(Number(row.amount))}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {row.periodFrom} → {row.periodTo}
                {row.sendMoneyStatus ? ` · ${row.sendMoneyStatus}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const form = (
    <ProfitPocketConfigureForm
      canWrite={canWrite}
      saving={saving}
      enabled={enabled}
      setEnabled={setEnabled}
      destinationType={destinationType}
      setDestinationType={setDestinationType}
      destinationLabel={destinationLabel}
      setDestinationLabel={setDestinationLabel}
      destinationAccount={destinationAccount}
      setDestinationAccount={setDestinationAccount}
      destinationBankName={destinationBankName}
      setDestinationBankName={setDestinationBankName}
      destinationPaybill={destinationPaybill}
      setDestinationPaybill={setDestinationPaybill}
      destinationPaybillAccount={destinationPaybillAccount}
      setDestinationPaybillAccount={setDestinationPaybillAccount}
      defaultFloat={defaultFloat}
      setDefaultFloat={setDefaultFloat}
      marginGuardMode={marginGuardMode}
      setMarginGuardMode={setMarginGuardMode}
      fridayReminderEnabled={fridayReminderEnabled}
      setFridayReminderEnabled={setFridayReminderEnabled}
      profitJarPct={profitJarPct}
      setProfitJarPct={setProfitJarPct}
      marginBudgetDaily={marginBudgetDaily}
      setMarginBudgetDaily={setMarginBudgetDaily}
      sendRail={sendRail}
      setSendRail={setSendRail}
      availableSendRails={availableSendRails}
      stkPhone={stkPhone}
      setStkPhone={setStkPhone}
      advancedOpen={advancedOpen}
      setAdvancedOpen={setAdvancedOpen}
    />
  );

  const testPanel = (
    <TestReceiptPanel
      test={testRun}
      destinationSummary={settings?.destinationSummary ?? null}
      onDismiss={() => {
        stopPolling();
        setTestRun(IDLE_TEST);
      }}
    />
  );

  const actions = canWrite && !loading ? (
    <div className="flex shrink-0 flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        className="rounded-none"
        disabled={saving || testing || !enabled}
        onClick={() => void onTest()}
      >
        {testing ||
        testRun.phase === "sending" ||
        testRun.phase === "awaiting" ? (
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
        ) : null}
        Test KES 1
      </Button>
      <Button
        type="button"
        className="rounded-none bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]"
        disabled={saving || testing}
        onClick={() => void onSave()}
      >
        {saving ? (
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
        ) : null}
        Save
      </Button>
    </div>
  ) : null;

  if (theatreMode) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-1">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : (
            <>
              {collisionBanner}
              {form}
              {testPanel}
              {historyBlock}
            </>
          )}
        </div>
        {actions ? (
          <div className="shrink-0 border-t border-border/60 px-1 pt-3">
            {actions}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-4">
      <div className="mb-3 flex items-start gap-3">
        <PiggyBank
          className="mt-0.5 size-5 text-[var(--pos-primary,#0f766e)]"
          aria-hidden
        />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Profit Pocket</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Expense / owner destination for pocketing cash surplus.
            {settings?.destinationSummary
              ? ` · ${settings.destinationSummary}`
              : ""}
          </p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : (
        <div className="space-y-3">
          {collisionBanner}
          {form}
          {testPanel}
          {historyBlock}
          {actions}
        </div>
      )}
    </section>
  );
}
