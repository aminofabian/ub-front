"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  fetchKioskPayAccount,
  fetchKioskPayLedger,
  fetchKioskPayWithdrawals,
  requestKioskPayWithdraw,
  updateKioskPayAccount,
  type KioskPayAccountRecord,
  type KioskPayLedgerEntryRecord,
  type KioskPayWithdrawalRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  canWrite: boolean;
};

function money(n: number | null | undefined, currency = "KES") {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${currency} ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function KioskPaySettingsSection({ canWrite }: Props) {
  const [account, setAccount] = useState<KioskPayAccountRecord | null>(null);
  const [ledger, setLedger] = useState<KioskPayLedgerEntryRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<KioskPayWithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payoutPhone, setPayoutPhone] = useState("");
  const [storefrontEnabled, setStorefrontEnabled] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [acc, led, wds] = await Promise.all([
        fetchKioskPayAccount(),
        fetchKioskPayLedger(15).catch(() => []),
        fetchKioskPayWithdrawals(10).catch(() => []),
      ]);
      setAccount(acc);
      setPayoutPhone(acc.payoutPhone ?? "");
      setStorefrontEnabled(acc.storefrontEnabled);
      setLedger(led);
      setWithdrawals(wds);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load Kiosk Pay.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveProfile = async (activate?: boolean) => {
    if (!canWrite) return;
    setSaving(true);
    try {
      const next = await updateKioskPayAccount({
        payoutPhone: payoutPhone.trim() || null,
        storefrontEnabled,
        ...(activate === undefined ? {} : { activate }),
      });
      setAccount(next);
      toast.success(
        activate === true
          ? "Kiosk Pay activated."
          : activate === false
            ? "Kiosk Pay turned off."
            : "Kiosk Pay settings saved.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save Kiosk Pay.");
    } finally {
      setSaving(false);
    }
  };

  const onWithdraw = async () => {
    if (!canWrite || !account) return;
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid withdraw amount.");
      return;
    }
    setSaving(true);
    try {
      const row = await requestKioskPayWithdraw({
        amount,
        phoneNumber: withdrawPhone.trim() || undefined,
        idempotencyKey:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `wd-${Date.now()}`,
      });
      toast.success(
        row.status === "SUCCESS"
          ? "Withdrawal completed."
          : "Withdrawal submitted — waiting for M-Pesa confirmation.",
      );
      setWithdrawAmount("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Withdraw failed.");
    } finally {
      setSaving(false);
    }
  };

  const active = account?.status === "ACTIVE";
  const platformOn = account?.platformEnabled === true;

  return (
    <section id="kiosk-pay" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Kiosk Pay
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Collect online via Kiosk&apos;s Paystack, or at the cashier via Kiosk Pay
            STK — funds land in your Kiosk Pay balance (provider fees only). Withdraw to
            M-Pesa anytime. You can still connect your own Paystack above.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || saving}
          onClick={() => void reload()}
        >
          Refresh
        </Button>
      </div>

      {loading && !account ? (
        <div className="flex items-center gap-2 border border-border/70 bg-card px-4 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading Kiosk Pay…
        </div>
      ) : (
        <div className="space-y-4 border border-border/70 bg-card p-4 shadow-sm">
          {!platformOn ? (
            <p className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              Kiosk Pay is not enabled on this platform yet. Ask your platform admin to
              turn it on and configure credentials.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-border/60 bg-muted/20 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Available
              </p>
              <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
                {money(account?.availableBalance)}
              </p>
            </div>
            <div className="border border-border/60 bg-muted/20 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Pending withdraw
              </p>
              <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
                {money(account?.pendingBalance)}
              </p>
            </div>
            <div className="border border-border/60 bg-muted/20 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Status
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                <Wallet className="size-4 text-muted-foreground" aria-hidden />
                <span
                  className={cn(
                    active ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground",
                  )}
                >
                  {active ? "Active" : "Off"}
                </span>
                <span className="text-xs text-muted-foreground">
                  · provider fees only
                </span>
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                M-Pesa payout phone
              </span>
              <input
                type="tel"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                placeholder="2547…"
                value={payoutPhone}
                disabled={!canWrite || saving}
                onChange={(e) => setPayoutPhone(e.target.value)}
              />
            </label>
            <div className="flex items-end justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
              <div>
                <p className="text-sm font-medium">Offer on storefront checkout</p>
                <p className="text-xs text-muted-foreground">
                  Show Kiosk Pay as a card/mobile money option.
                </p>
              </div>
              <Switch
                checked={storefrontEnabled}
                disabled={!canWrite || saving}
                onCheckedChange={setStorefrontEnabled}
              />
            </div>
          </div>

          {canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => void saveProfile()}
              >
                Save settings
              </Button>
              {!active ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || !platformOn}
                  onClick={() => void saveProfile(true)}
                >
                  Activate Kiosk Pay
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saving}
                  onClick={() => void saveProfile(false)}
                >
                  Turn off
                </Button>
              )}
            </div>
          ) : null}

          {active && canWrite ? (
            <div className="space-y-3 border border-border/60 bg-muted/15 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Withdraw to M-Pesa
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  placeholder="Amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <input
                  type="tel"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  placeholder={payoutPhone || "Phone (optional override)"}
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                />
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => void onWithdraw()}
                >
                  Withdraw
                </Button>
              </div>
            </div>
          ) : null}

          {withdrawals.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Recent withdrawals
              </p>
              <ul className="divide-y divide-border/60 border border-border/60">
                {withdrawals.map((w) => (
                  <li
                    key={w.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                  >
                    <span className="font-medium tabular-nums">
                      {money(w.amount, w.currency)} → {w.phoneNumber}
                    </span>
                    <span className="text-muted-foreground">
                      {w.status}
                      {w.failureReason ? ` · ${w.failureReason}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {ledger.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Recent ledger
              </p>
              <ul className="divide-y divide-border/60 border border-border/60">
                {ledger.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                  >
                    <span>
                      {e.entryType}{" "}
                      <span className="text-muted-foreground">
                        {e.note ? `· ${e.note}` : ""}
                      </span>
                    </span>
                    <span className="tabular-nums font-medium">
                      {e.direction === "CREDIT" ? "+" : "−"}
                      {money(e.amount, e.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
