"use client";

import { useEffect, useId, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KioskPayWithdrawFeeNotice } from "@/components/payments/kiosk-pay-withdraw-fee-notice";
import {
  fetchKioskPayAccount,
  requestKioskPayWithdraw,
  type KioskPayAccountRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { getRealtimeClient } from "@/lib/realtime";
import { cn } from "@/lib/utils";

function money(n: number | null | undefined, currency = "KES") {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${currency} ${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseBalanceField(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

type Props = {
  canWithdraw: boolean;
  currencyFallback?: string;
  /** Compact styling for tablet header chrome. */
  variant?: "desktop" | "tablet";
  className?: string;
};

export function KioskPayHeaderBalance({
  canWithdraw,
  currencyFallback = "KES",
  variant = "desktop",
  className,
}: Props) {
  const subscriptionId = useId();
  const [account, setAccount] = useState<KioskPayAccountRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const acc = await fetchKioskPayAccount();
        if (!cancelled) {
          setAccount(acc);
          setWithdrawPhone(acc.payoutPhone ?? "");
        }
      } catch {
        if (!cancelled) setAccount(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let stopped = false;
    const client = getRealtimeClient();
    const unregister = client.registerListener(subscriptionId, {
      channels: ["pos", "notifications"],
      onKioskPayBalanceUpdated: (frame) => {
        if (stopped) return;
        const available = parseBalanceField(frame.data.availableBalance);
        const pending = parseBalanceField(frame.data.pendingBalance);
        const status =
          typeof frame.data.status === "string" ? frame.data.status : undefined;
        setAccount((prev) => {
          if (!prev) {
            return {
              id: null,
              businessId:
                typeof frame.data.businessId === "string"
                  ? frame.data.businessId
                  : "",
              status: status ?? "ACTIVE",
              payoutPhone: null,
              availableBalance: available ?? 0,
              pendingBalance: pending ?? 0,
              lifetimeIn: 0,
              lifetimeOut: 0,
              feePercent: 0,
              platformFeePercent: 0,
              storefrontEnabled: true,
              platformEnabled: true,
              minWithdrawAmount: 0,
              dailyWithdrawLimit: 0,
              updatedAt: null,
            };
          }
          return {
            ...prev,
            availableBalance: available ?? prev.availableBalance,
            pendingBalance: pending ?? prev.pendingBalance,
            status: status ?? prev.status,
          };
        });
      },
    });
    return () => {
      stopped = true;
      unregister();
    };
  }, [subscriptionId]);

  const visible =
    account != null &&
    (account.platformEnabled ||
      account.status === "ACTIVE" ||
      Number(account.availableBalance) > 0 ||
      Number(account.pendingBalance) > 0);

  if (loading && !account) {
    return null;
  }
  if (!visible) {
    return null;
  }

  const currency = currencyFallback;
  const available = Number(account.availableBalance) || 0;
  const pending = Number(account.pendingBalance) || 0;
  const active = account.status === "ACTIVE";

  const onWithdraw = async () => {
    if (!canWithdraw) return;
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid withdraw amount.");
      return;
    }
    if (amount > available + 0.001) {
      toast.error("Amount exceeds available balance.");
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
      if (row.status === "FAILED") {
        toast.error(row.failureReason || "Withdraw failed.");
      } else {
        toast.success(
          row.status === "SUCCESS"
            ? "Withdrawal completed."
            : "Withdrawal submitted — waiting for M-Pesa.",
        );
        setWithdrawAmount("");
        setWithdrawOpen(false);
        // Optimistic pending move; WS will confirm.
        setAccount((prev) =>
          prev
            ? {
                ...prev,
                availableBalance: Math.max(0, Number(prev.availableBalance) - amount),
                pendingBalance: Number(prev.pendingBalance) + amount,
              }
            : prev,
        );
      }
      const refreshed = await fetchKioskPayAccount().catch(() => null);
      if (refreshed) setAccount(refreshed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Withdraw failed.");
    } finally {
      setSaving(false);
    }
  };

  const chip = (
    <div
      className={cn(
        variant === "desktop"
          ? "inline-flex h-8 max-w-[18rem] items-center gap-1.5 rounded-md border bg-background pl-2.5 pr-1 text-xs font-semibold shadow-sm"
          : "tablet-header-tool inline-flex h-full items-center gap-1.5 border-l border-[var(--tablet-header-ink)]/12 pl-2.5 pr-1 text-[11px] font-semibold text-[var(--tablet-header-ink)]",
        className,
      )}
    >
      <Wallet
        className={cn(
          "size-3.5 shrink-0",
          variant === "desktop" ? "text-muted-foreground" : "opacity-70",
        )}
        aria-hidden
      />
      <span className="min-w-0 truncate tabular-nums" title="Kiosk Pay available">
        {money(available, currency)}
      </span>
      {pending > 0.001 ? (
        <span
          className={cn(
            "truncate text-[10px] font-medium",
            variant === "desktop"
              ? "text-muted-foreground"
              : "text-[var(--tablet-header-ink)]/55",
          )}
          title="Pending withdraw"
        >
          · {money(pending, currency)} out
        </span>
      ) : null}
      {canWithdraw && active ? (
        <Button
          type="button"
          size="sm"
          variant={variant === "desktop" ? "secondary" : "ghost"}
          className={cn(
            "h-6 shrink-0 px-2 text-[11px] font-semibold",
            variant === "tablet" &&
              "text-[var(--tablet-header-ink)] hover:bg-[var(--tablet-header-ink)]/10",
          )}
          onClick={() => {
            setWithdrawPhone(account.payoutPhone ?? "");
            setWithdrawOpen(true);
          }}
        >
          Withdraw
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      {chip}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Kiosk Pay</DialogTitle>
            <DialogDescription>
              Send funds to M-Pesa. Available: {money(available, currency)}.{" "}
              <a
                href={APP_ROUTES.paymentsKioskPay}
                className="font-medium text-foreground underline underline-offset-2"
              >
                View ledger
              </a>
            </DialogDescription>
          </DialogHeader>
          <KioskPayWithdrawFeeNotice currency={currency} />
          <div className="grid gap-3 py-1">
            <label className="space-y-1.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                Amount
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                placeholder="0.00"
                value={withdrawAmount}
                disabled={saving}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                autoFocus
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                M-Pesa phone
              </span>
              <input
                type="tel"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                placeholder={account.payoutPhone || "2547…"}
                value={withdrawPhone}
                disabled={saving}
                onChange={(e) => setWithdrawPhone(e.target.value)}
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setWithdrawOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void onWithdraw()}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                "Withdraw"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
