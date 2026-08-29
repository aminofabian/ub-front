"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Loader2, MessageSquareText, Plus, Smartphone } from "lucide-react";
import { toast } from "sonner";

import {
  BillingBalanceStrip,
  BillingField,
  BillingFormPanel,
  BillingInlineAlert,
  BillingPresetGrid,
  BillingProgressBar,
  BillingSection,
  BillingTotalLine,
  billingChipClass,
  billingHealth,
  billingPhoneInputClass,
} from "@/components/billing/billing-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchMe,
  fetchSmsCreditBalance,
  fetchSmsCreditLedger,
  fetchSmsCreditPurchaseStatus,
  purchaseSmsCredits,
  type SmsCreditBalanceRecord,
  type SmsCreditLedgerRow,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { getRealtimeClient } from "@/lib/realtime";
import { cn } from "@/lib/utils";

const PRESETS = [10, 50, 100, 200];

/** Balance that refreshes on mount, after a purchase, on tab refocus, and via WS. */
export function useSmsCreditBalance() {
  const subscriptionId = useId();
  const [balance, setBalance] = useState<SmsCreditBalanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const bal = await fetchSmsCreditBalance();
      setBalance(bal);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    const client = getRealtimeClient();
    const unregister = client.registerListener(subscriptionId, {
      channels: ["notifications"],
      onSmsCreditsUpdated: (frame) => {
        setBalance((prev) => {
          if (!prev) return prev;
          const available =
            typeof frame.data.available === "number"
              ? frame.data.available
              : undefined;
          const includedRemaining =
            typeof frame.data.includedRemaining === "number"
              ? frame.data.includedRemaining
              : undefined;
          const purchasedBalance =
            typeof frame.data.purchasedBalance === "number"
              ? frame.data.purchasedBalance
              : undefined;
          return {
            ...prev,
            available: available ?? prev.available,
            includedRemaining: includedRemaining ?? prev.includedRemaining,
            purchasedBalance: purchasedBalance ?? prev.purchasedBalance,
          };
        });
      },
    });

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      unregister();
    };
  }, [refresh, subscriptionId]);

  return { balance, loading, refresh };
}

function ledgerKindLabel(kind: string): string {
  switch (kind) {
    case "INCLUDED_SPEND":
      return "Included spend";
    case "PURCHASED_SPEND":
      return "Purchased spend";
    case "PURCHASE":
      return "Top-up";
    case "GRANT":
      return "Grant";
    case "REFUND":
      return "Refund";
    case "CYCLE_RESET":
      return "Cycle reset";
    default:
      return kind.replaceAll("_", " ").toLowerCase();
  }
}

export function SmsCreditsBuyDialog({
  open,
  onOpenChange,
  balance,
  canBuy,
  canViewLedger,
  defaultPhone,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: SmsCreditBalanceRecord | null;
  canBuy: boolean;
  canViewLedger?: boolean;
  defaultPhone?: string | null;
  onPaid?: () => void;
}) {
  const [credits, setCredits] = useState<number>(50);
  const [customCredits, setCustomCredits] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [ledger, setLedger] = useState<SmsCreditLedgerRow[] | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const minCredits = balance?.minPurchaseCredits ?? 10;
  const maxCredits = balance?.maxPurchaseCredits ?? 500;

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setPhone(defaultPhone ?? "");
      setCustomCredits("");
      const defaultPreset =
        PRESETS.find((p) => p >= minCredits && p <= maxCredits) ?? minCredits;
      setCredits(defaultPreset);
    }
  }, [open, defaultPhone, minCredits, maxCredits]);

  useEffect(() => {
    if (!open || !canViewLedger) {
      setLedger(null);
      return;
    }
    setLedgerLoading(true);
    void fetchSmsCreditLedger(20)
      .then(setLedger)
      .catch(() => setLedger([]))
      .finally(() => setLedgerLoading(false));
  }, [open, canViewLedger]);

  const pollUntilSettled = useCallback(
    (purchaseId: string) => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = setInterval(async () => {
        try {
          const status = await fetchSmsCreditPurchaseStatus(purchaseId);
          if (status.status === "PAID") {
            if (pollTimer.current) clearInterval(pollTimer.current);
            toast.success("SMS credits added to your balance.");
            setSaving(false);
            onOpenChange(false);
            onPaid?.();
          } else if (status.status === "FAILED" || status.status === "EXPIRED") {
            if (pollTimer.current) clearInterval(pollTimer.current);
            toast.error(
              status.status === "EXPIRED"
                ? "Payment request expired — try again."
                : "Payment was not completed. You can retry.",
            );
            setSaving(false);
          }
        } catch {
          /* keep polling */
        }
      }, 2500);
    },
    [onOpenChange, onPaid],
  );

  const effectiveCredits = customCredits.trim() ? Number(customCredits) : credits;
  const unitPrice = balance?.unitPriceKes ?? 1;

  const onPay = async () => {
    if (!canBuy) return;
    if (!Number.isFinite(effectiveCredits) || effectiveCredits <= 0) {
      toast.error("Enter how many credits to buy.");
      return;
    }
    const rounded = Math.round(effectiveCredits);
    if (rounded < minCredits || rounded > maxCredits) {
      toast.error(`Credits must be between ${minCredits} and ${maxCredits}.`);
      return;
    }
    if (!phone.trim()) {
      toast.error("Enter the M-Pesa phone number.");
      return;
    }
    setSaving(true);
    try {
      const purchase = await purchaseSmsCredits({
        credits: rounded,
        phone: phone.trim(),
      });
      if (purchase.status === "PENDING") {
        toast.info("Check your phone to complete M-Pesa payment.");
        pollUntilSettled(purchase.id);
      } else if (purchase.status === "FAILED") {
        toast.error(purchase.message || "Payment request was declined.");
        setSaving(false);
      } else {
        toast.success("SMS credits added to your balance.");
        setSaving(false);
        onOpenChange(false);
        onPaid?.();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment request failed.");
      setSaving(false);
    }
  };

  const used =
    balance != null
      ? Math.max(0, balance.includedAllowance - balance.includedRemaining)
      : 0;
  const includeProgress =
    balance != null && balance.includedAllowance > 0
      ? Math.min(100, Math.round((used / balance.includedAllowance) * 100))
      : 0;

  const validPresets = PRESETS.filter((p) => p >= minCredits && p <= maxCredits);
  const available = balance?.available ?? 0;
  const purchased = balance?.purchasedBalance ?? 0;
  const allowance = balance?.includedAllowance ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="border-b border-border/60 bg-muted/20 px-6 pb-5 pt-6">
          <DialogHeader className="space-y-4 text-left">
            <div>
              <DialogTitle className="font-heading text-lg tracking-tight">
                SMS credits
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-snug">
                Included credits reset each month. Purchased credits roll over.
              </DialogDescription>
            </div>
            <BillingBalanceStrip
              available={available}
              includedUsed={used}
              includedAllowance={allowance}
              purchased={purchased}
            />
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-5">
          {balance && allowance > 0 ? (
            <BillingProgressBar value={includeProgress} />
          ) : null}

          {canBuy ? (
            <>
              <BillingSection title="Top up">
                <BillingFormPanel>
                  {validPresets.length > 0 ? (
                    <BillingField label="Quick amount">
                      <BillingPresetGrid
                        options={validPresets}
                        selected={customCredits.trim() ? -1 : credits}
                        onSelect={(p) => {
                          setCredits(p);
                          setCustomCredits("");
                        }}
                      />
                    </BillingField>
                  ) : null}

                  <BillingField
                    label={`Custom amount (${minCredits}–${maxCredits})`}
                  >
                    <input
                      type="number"
                      min={minCredits}
                      max={maxCredits}
                      step={1}
                      className={billingPhoneInputClass(saving)}
                      placeholder={`e.g. ${minCredits}`}
                      value={customCredits}
                      disabled={saving}
                      onChange={(e) => setCustomCredits(e.target.value)}
                    />
                  </BillingField>

                  <BillingTotalLine
                    credits={
                      Number.isFinite(effectiveCredits) && effectiveCredits > 0
                        ? Math.round(effectiveCredits)
                        : 0
                    }
                    unitPrice={unitPrice}
                  />
                </BillingFormPanel>
              </BillingSection>

              <BillingSection title="Payment">
                <BillingField label="M-Pesa phone">
                  <div className="relative">
                    <Smartphone
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
                      aria-hidden
                    />
                    <input
                      type="tel"
                      className={cn(billingPhoneInputClass(saving), "pl-9")}
                      placeholder="2547…"
                      value={phone}
                      disabled={saving}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </BillingField>
              </BillingSection>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
              You can view the balance, but only owners or admins can buy top-up
              credits. Ask someone with billing access to add credits.
            </p>
          )}

          {canViewLedger ? (
            <BillingSection title="Recent movements">
              {ledgerLoading ? (
                <div className="flex justify-center py-4 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                </div>
              ) : ledger && ledger.length > 0 ? (
                <ul className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-border/60 bg-muted/10 p-1">
                  {ledger.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs"
                    >
                      <span className="truncate text-muted-foreground">
                        {ledgerKindLabel(row.kind)}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums font-medium",
                          row.delta < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {row.delta > 0 ? "+" : ""}
                        {row.delta}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No movements yet.</p>
              )}
            </BillingSection>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/10 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            className="active:scale-[0.98]"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {canBuy ? (
            <Button
              type="button"
              disabled={saving}
              className="active:scale-[0.98]"
              onClick={() => void onPay()}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Waiting for M-Pesa…
                </>
              ) : (
                "Pay with M-Pesa"
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type HeaderProps = {
  /** User has the `sms.credits.purchase` permission — shows the Buy action. */
  canBuy: boolean;
  canViewLedger?: boolean;
  /** Logged-in user phone, prefilled as the M-Pesa number. */
  defaultPhone?: string | null;
  /** Compact styling for tablet header chrome. */
  variant?: "desktop" | "tablet";
  className?: string;
};

/** Header chip — visible when metering is on; buy gated by permission. */
export function SmsCreditsHeader({
  canBuy,
  canViewLedger = false,
  defaultPhone,
  variant = "desktop",
  className,
}: HeaderProps) {
  const { balance, loading, refresh } = useSmsCreditBalance();
  const [open, setOpen] = useState(false);

  if (loading && !balance) {
    return null;
  }
  if (!balance || balance.meteringEnabled === false) {
    return null;
  }

  const available = balance.available ?? 0;
  const health = billingHealth(available, balance.lowBalance);
  const depleted = health === "critical";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="SMS credits — tap for details and top-up"
        className={cn(billingChipClass(health, variant), className)}
      >
        <MessageSquareText
          className={cn(
            "size-3.5 shrink-0",
            variant === "desktop" ? "text-muted-foreground" : "opacity-70",
          )}
          aria-hidden
        />
        <span className="min-w-0 truncate tabular-nums">{available}</span>
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-wide",
            variant === "desktop" ? "text-muted-foreground" : "opacity-55",
          )}
        >
          SMS
        </span>
        {depleted && canBuy ? (
          <span className="ml-0.5 inline-flex h-6 shrink-0 items-center gap-0.5 rounded-md bg-red-600 px-2 text-[10px] font-bold text-white shadow-sm">
            <Plus className="size-3" aria-hidden /> Buy
          </span>
        ) : (
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              health === "ok"
                ? "bg-emerald-500"
                : health === "low"
                  ? "bg-amber-500"
                  : "bg-red-500",
            )}
            aria-hidden
          />
        )}
      </button>
      <SmsCreditsBuyDialog
        open={open}
        onOpenChange={setOpen}
        balance={balance}
        canBuy={canBuy}
        canViewLedger={canViewLedger}
        defaultPhone={defaultPhone}
        onPaid={() => void refresh()}
      />
    </>
  );
}

/**
 * Inline depleted banner for screens that send SMS — shows the "Buy credits"
 * CTA so staff never have to hunt for the header chip.
 */
export function SmsCreditsDepletedBanner({
  defaultPhone: defaultPhoneProp,
  canBuy: canBuyProp,
  canViewLedger: canViewLedgerProp,
  className,
}: {
  defaultPhone?: string | null;
  canBuy?: boolean;
  canViewLedger?: boolean;
  className?: string;
}) {
  const { balance, loading, refresh } = useSmsCreditBalance();
  const [open, setOpen] = useState(false);
  const [defaultPhone, setDefaultPhone] = useState(defaultPhoneProp ?? null);
  const [canBuy, setCanBuy] = useState(canBuyProp ?? false);
  const [canViewLedger, setCanViewLedger] = useState(canViewLedgerProp ?? false);

  useEffect(() => {
    if (defaultPhoneProp != null) setDefaultPhone(defaultPhoneProp);
  }, [defaultPhoneProp]);

  useEffect(() => {
    if (canBuyProp !== undefined) setCanBuy(canBuyProp);
  }, [canBuyProp]);

  useEffect(() => {
    if (canViewLedgerProp !== undefined) setCanViewLedger(canViewLedgerProp);
  }, [canViewLedgerProp]);

  useEffect(() => {
    if (
      canBuyProp !== undefined &&
      canViewLedgerProp !== undefined &&
      defaultPhoneProp != null
    ) {
      return;
    }
    void fetchMe()
      .then((me) => {
        if (defaultPhoneProp == null) setDefaultPhone(me.phone ?? null);
        if (canBuyProp === undefined) {
          setCanBuy(hasPermission(me.permissions, Permission.SmsCreditsPurchase));
        }
        if (canViewLedgerProp === undefined) {
          setCanViewLedger(hasPermission(me.permissions, Permission.SmsCreditsLedgerRead));
        }
      })
      .catch(() => {
        /* keep defaults */
      });
  }, [canBuyProp, canViewLedgerProp, defaultPhoneProp]);

  if (
    loading ||
    !balance ||
    balance.meteringEnabled === false ||
    (balance.available ?? 0) > 0
  ) {
    return null;
  }

  return (
    <>
      <BillingInlineAlert
        variant="critical"
        icon={AlertTriangle}
        className={className}
        title="SMS credits depleted"
        description="Buy more to continue sending messages to customers and staff."
        action={
          canBuy ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-8 active:scale-[0.98]"
              onClick={() => setOpen(true)}
            >
              Buy credits
            </Button>
          ) : (
            <span className="text-xs font-medium opacity-80">Ask an owner to top up.</span>
          )
        }
      />
      <SmsCreditsBuyDialog
        open={open}
        onOpenChange={setOpen}
        balance={balance}
        canBuy={canBuy}
        canViewLedger={canViewLedger}
        defaultPhone={defaultPhone}
        onPaid={() => void refresh()}
      />
    </>
  );
}
