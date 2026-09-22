"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, PiggyBank } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  fetchProfitPocketSettings,
  fetchProfitPockets,
  updateProfitPocketSettings,
  type ProfitPocketRecord,
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
  { id: "bank", label: "Bank account" },
  { id: "mpesa_phone", label: "M-Pesa phone" },
  { id: "till", label: "Till (expense)" },
  { id: "paybill", label: "Paybill (expense)" },
] as const;

const GUARD_MODES = [
  { id: "warn", label: "Warn", desc: "Show below-cost on the till; sale continues" },
  {
    id: "approve",
    label: "Approve",
    desc: "Soft-block until someone with sell-price permission confirms",
  },
  {
    id: "hard",
    label: "Hard block",
    desc: "Never sell below catalog cost",
  },
] as const;

function BankDestinationFields({
  canWrite,
  saving,
  destinationBankName,
  setDestinationBankName,
  destinationPaybill,
  setDestinationPaybill,
  destinationAccount,
  setDestinationAccount,
}: {
  canWrite: boolean;
  saving: boolean;
  destinationBankName: string;
  setDestinationBankName: (v: string) => void;
  destinationPaybill: string;
  setDestinationPaybill: (v: string) => void;
  destinationAccount: string;
  setDestinationAccount: (v: string) => void;
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

  const knownBank = bankId !== "" && bankId !== CUSTOM_BANK_ID && !!kenyaBankById(bankId);

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
          Bank
        </span>
        <select
          className="h-10 border border-input bg-background px-3 text-sm"
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
          <option value="">Select bank…</option>
          {KENYA_MPESA_BANKS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} · {b.businessNumber}
            </option>
          ))}
          <option value={CUSTOM_BANK_ID}>Other bank — enter paybill yourself</option>
        </select>
      </label>

      {bankId === CUSTOM_BANK_ID ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
            Bank name
          </span>
          <input
            className="h-10 border border-input bg-background px-3 text-sm"
            value={destinationBankName}
            disabled={!canWrite || saving}
            onChange={(e) => setDestinationBankName(e.target.value)}
            placeholder="e.g. Equity Bank"
          />
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
          M-Pesa business number (paybill)
        </span>
        <input
          className="h-10 border border-input bg-background px-3 font-mono text-sm"
          value={destinationPaybill}
          disabled={!canWrite || saving || knownBank}
          onChange={(e) =>
            setDestinationPaybill(e.target.value.replace(/[^\d]/g, ""))
          }
          placeholder="e.g. 247247"
          inputMode="numeric"
        />
        <span className="text-[11px] text-muted-foreground">
          {knownBank
            ? "Filled from the bank you selected — used when sending via Lipa Na M-Pesa."
            : "The bank’s Lipa Na M-Pesa paybill. Pick a bank above to autofill."}
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
          Account number
        </span>
        <input
          className="h-10 border border-input bg-background px-3 font-mono text-sm"
          value={destinationAccount}
          disabled={!canWrite || saving}
          onChange={(e) => setDestinationAccount(e.target.value)}
          placeholder="Your bank account number"
        />
      </label>
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
}) {
  return (
    <div className="space-y-6">
      <p className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-muted/15 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
        This is where you{" "}
        <span className="font-semibold text-foreground">pocket cash surplus</span>{" "}
        — not where customers pay. Customer tills stay under Accept payments.
      </p>

      <div className="flex items-start justify-between gap-4 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-muted/15 px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Enable Profit Pocket
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Lets Business Hub suggest pocketing cash surplus to this destination.
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
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
              Destination type
            </span>
            <select
              className="h-10 border border-input bg-background px-3 text-sm"
              value={destinationType}
              disabled={!canWrite || saving}
              onChange={(e) => setDestinationType(e.target.value)}
            >
              <option value="">Select…</option>
              {DEST_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
              Label (optional)
            </span>
            <input
              className="h-10 border border-input bg-background px-3 text-sm"
              value={destinationLabel}
              disabled={!canWrite || saving}
              onChange={(e) => setDestinationLabel(e.target.value)}
              placeholder="e.g. Owner Equity Bank"
            />
          </label>

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
            />
          ) : null}

          {destinationType === "mpesa_phone" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                M-Pesa phone
              </span>
              <input
                className="h-10 border border-input bg-background px-3 font-mono text-sm"
                value={destinationAccount}
                disabled={!canWrite || saving}
                onChange={(e) => setDestinationAccount(e.target.value)}
                placeholder="07XX XXX XXX"
                inputMode="tel"
              />
            </label>
          ) : null}

          {destinationType === "till" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                Expense till number
              </span>
              <input
                className="h-10 border border-input bg-background px-3 font-mono text-sm"
                value={destinationAccount}
                disabled={!canWrite || saving}
                onChange={(e) => setDestinationAccount(e.target.value)}
                inputMode="numeric"
              />
            </label>
          ) : null}

          {destinationType === "paybill" ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                  Paybill number
                </span>
                <input
                  className="h-10 border border-input bg-background px-3 font-mono text-sm"
                  value={destinationPaybill}
                  disabled={!canWrite || saving}
                  onChange={(e) => setDestinationPaybill(e.target.value)}
                  inputMode="numeric"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                  Account number
                </span>
                <input
                  className="h-10 border border-input bg-background px-3 font-mono text-sm"
                  value={destinationPaybillAccount}
                  disabled={!canWrite || saving}
                  onChange={(e) => setDestinationPaybillAccount(e.target.value)}
                />
              </label>
            </>
          ) : null}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
              Default leave float (KES)
            </span>
            <input
              className="h-10 border border-input bg-background px-3 font-mono text-sm"
              value={defaultFloat}
              disabled={!canWrite || saving}
              onChange={(e) => setDefaultFloat(e.target.value)}
              inputMode="decimal"
            />
            <span className="text-[11px] text-muted-foreground">
              Suggested pocket = cash + M-Pesa takings − this float.
            </span>
          </label>

          <div className="flex items-start justify-between gap-4 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-muted/15 px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Friday Pocket reminder
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                In-app nudge Friday 6pm when there is cash surplus to pocket.
              </p>
            </div>
            <Switch
              checked={fridayReminderEnabled}
              disabled={!canWrite || saving}
              onCheckedChange={setFridayReminderEnabled}
              aria-label="Friday Pocket reminder"
            />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
              Profit jar % of surplus
            </span>
            <input
              className="h-10 border border-input bg-background px-3 font-mono text-sm"
              value={profitJarPct}
              disabled={!canWrite || saving}
              onChange={(e) => setProfitJarPct(e.target.value)}
              inputMode="decimal"
              placeholder="100"
            />
            <span className="text-[11px] text-muted-foreground">
              Suggested pocket = (cash + M-Pesa − float) × this %. Use 100 for
              the full surplus.
            </span>
          </label>
        </>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
          Margin Guard (till below-cost)
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {GUARD_MODES.map((m) => {
            const active = marginGuardMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={!canWrite || saving}
                onClick={() => setMarginGuardMode(m.id)}
                className={cn(
                  "border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)]"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-muted/10 hover:bg-muted/20",
                )}
              >
                <p className="text-sm font-semibold text-foreground">{m.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {m.desc}
                </p>
              </button>
            );
          })}
        </div>
        {marginGuardMode === "warn" ? (
          <label className="mt-2 flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
              Daily margin budget (KES, optional)
            </span>
            <input
              className="h-10 border border-input bg-background px-3 font-mono text-sm"
              value={marginBudgetDaily}
              disabled={!canWrite || saving}
              onChange={(e) => setMarginBudgetDaily(e.target.value)}
              inputMode="decimal"
              placeholder="0 = off"
            />
            <span className="text-[11px] text-muted-foreground">
              Allow below-cost sales until today&apos;s loss hits this amount,
              then require manager approval.
            </span>
          </label>
        ) : null}
      </div>
    </div>
  );
}

export function ProfitPocketSettingsSection({
  canWrite,
  theatreMode = false,
}: ProfitPocketSettingsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const apply = useCallback((s: ProfitPocketSettingsRecord) => {
    setSettings(s);
    setEnabled(s.enabled);
    setDestinationType(s.destinationType ?? "");
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
      setHistory(await fetchProfitPockets({ limit: 12 }));
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

  const onSave = async () => {
    if (!canWrite) return;
    const floatN = Number(defaultFloat);
    if (!Number.isFinite(floatN) || floatN < 0) {
      toast.error("Default leave float must be a non-negative number.");
      return;
    }
    const jarN = Number(profitJarPct);
    if (!Number.isFinite(jarN) || jarN < 1 || jarN > 100) {
      toast.error("Profit jar % must be between 1 and 100.");
      return;
    }
    const budgetRaw = marginBudgetDaily.trim();
    const budgetN = budgetRaw === "" ? 0 : Number(budgetRaw);
    if (!Number.isFinite(budgetN) || budgetN < 0) {
      toast.error("Margin budget must be a non-negative number.");
      return;
    }
    setSaving(true);
    try {
      const next = await updateProfitPocketSettings({
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
      });
      apply(next);
      toast.success("Profit Pocket settings saved");
      void reloadHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const collisionBanner =
    settings?.collidesWithCustomerPay && settings.customerPayCollisionMessage ? (
      <p className="mb-4 flex items-start gap-2 border border-[#9a2e16]/35 bg-[#9a2e16]/5 px-3 py-2.5 text-xs leading-relaxed text-[#9a2e16]">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>{settings.customerPayCollisionMessage}</span>
      </p>
    ) : null;

  const historyBlock = (
    <div className="mt-6 space-y-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] pt-4">
      <p className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
        Recent pockets
      </p>
      {historyLoading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Loading history…
        </p>
      ) : history.length === 0 ? (
        <p className="text-xs text-muted-foreground">No pockets yet.</p>
      ) : (
        <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
          {history.map((row) => (
            <li
              key={row.profitPocketId}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3 py-2 text-xs"
            >
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {fmtMoney(Number(row.amount))}
              </span>
              <span className="text-muted-foreground">
                {row.periodFrom} → {row.periodTo}
                {row.destinationSummary ? ` · ${row.destinationSummary}` : ""}
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
    />
  );

  if (theatreMode) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : (
            <>
              {collisionBanner}
              {form}
              {historyBlock}
            </>
          )}
        </div>
        {canWrite && !loading ? (
          <div className="shrink-0 border-t border-border/60 px-1 pt-3">
            <Button
              type="button"
              className="w-full rounded-none bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63] sm:w-auto"
              disabled={saving}
              onClick={() => void onSave()}
            >
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : null}
              Save Profit Pocket
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className={cn(
        "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-4",
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <PiggyBank
          className="mt-0.5 size-5 text-[var(--pos-primary,#0f766e)]"
          aria-hidden
        />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Profit Pocket</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Expense / owner destination for pocketing cash surplus from the Hub.
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
        <>
          {collisionBanner}
          {form}
          {historyBlock}
          {canWrite ? (
            <Button
              type="button"
              className="mt-4 rounded-none bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]"
              disabled={saving}
              onClick={() => void onSave()}
            >
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : null}
              Save
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
