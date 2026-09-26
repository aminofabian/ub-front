"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Loader2,
  PiggyBank,
  Signal,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AirtimeSellPanel } from "@/components/airtime/airtime-sell-panel";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  fetchAirtimeAvailability,
  fetchAirtimeOrder,
  fetchAirtimeOrders,
  fetchAirtimeQuote,
  fetchAirtimeSettings,
  sellAirtime,
  updateAirtimeSettings,
  type AirtimeAvailabilityRecord,
  type AirtimeOrderRecord,
  type AirtimeSettingsRecord,
} from "@/lib/api";
import {
  HUB_MUTED,
  HUB_SURFACE,
} from "@/lib/business-hub/constants";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const TEST_AMOUNT = 10;

type Props = {
  ownerPhone?: string | null;
  permissions?: string[] | null;
  /** Narrow side-rail layout. */
  rail?: boolean;
};

type Phase = "loading" | "blocked" | "ready" | "try" | "live";

function money(n: number | null | undefined, currency = "KES") {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${currency} ${v.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `air-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isTerminal(status: string) {
  return status === "SUCCESS" || status === "FAILED";
}

function normalizePhone(raw: string) {
  return raw.replace(/\s+/g, "").trim();
}

function maskPhone(raw: string | null | undefined) {
  const p = normalizePhone(raw ?? "");
  if (p.length < 6) return p || null;
  return `${p.slice(0, 4)}···${p.slice(-3)}`;
}

/**
 * Business hub card: one clear next step to sell airtime —
 * activate wallet → turn on (KES 10 gift) → test your phone → sell.
 */
export function AirtimeFloatHubCard({
  ownerPhone,
  permissions,
  rail = false,
}: Props) {
  const canRead =
    hasPermission(permissions ?? undefined, Permission.AirtimeRead) ||
    hasPermission(permissions ?? undefined, Permission.AirtimeManage) ||
    hasPermission(permissions ?? undefined, Permission.AirtimeSell);
  const canWrite = hasPermission(
    permissions ?? undefined,
    Permission.AirtimeManage,
  );
  const canSell =
    canWrite ||
    hasPermission(permissions ?? undefined, Permission.AirtimeSell);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AirtimeSettingsRecord | null>(null);
  const [availability, setAvailability] =
    useState<AirtimeAvailabilityRecord | null>(null);
  const [hasSold, setHasSold] = useState(false);
  /** Merchant chose to skip the self-test for this session. */
  const [skippedTest, setSkippedTest] = useState(false);

  const [testOpen, setTestOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testQuoteCommission, setTestQuoteCommission] = useState<number | null>(
    null,
  );

  const refresh = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [s, a, orders] = await Promise.all([
        fetchAirtimeSettings().catch(() => null),
        fetchAirtimeAvailability(false).catch(() => null),
        fetchAirtimeOrders(5).catch(() => [] as AirtimeOrderRecord[]),
      ]);
      setSettings(s);
      setAvailability(a);
      setHasSold(orders.some((o) => o.status === "SUCCESS"));
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (testOpen) {
      setTestPhone(ownerPhone?.trim() || "");
      setTestError(null);
      setTestQuoteCommission(null);
    }
  }, [testOpen, ownerPhone]);

  useEffect(() => {
    if (!testOpen) return;
    const phone = normalizePhone(testPhone);
    if (phone.length < 9) {
      setTestQuoteCommission(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void fetchAirtimeQuote(phone, TEST_AMOUNT)
        .then((q) => {
          if (!cancelled) {
            setTestQuoteCommission(
              typeof q.commission === "number" ? q.commission : null,
            );
          }
        })
        .catch(() => {
          if (!cancelled) setTestQuoteCommission(null);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [testOpen, testPhone]);

  if (!canRead) return null;

  const currency = settings?.currency || availability?.currency || "KES";
  const commissionPct =
    settings?.commissionPercent ?? availability?.commissionPercent ?? 3;
  const seedAmount = settings?.starterSeedAmount ?? TEST_AMOUNT;
  const platformReady =
    settings?.platformEnabled === true &&
    settings?.platformCredentialsConfigured === true;
  const walletReady = settings?.walletActive === true;
  const enabled = settings?.enabled === true;
  const seedGranted = settings?.starterSeedGranted === true;
  const walletBalance =
    settings?.walletBalance ?? availability?.walletBalance ?? 0;
  const earnedToday = availability?.commissionEarnedToday ?? 0;
  const needsTest = enabled && seedGranted && !hasSold && !skippedTest;

  const phase: Phase = loading
    ? "loading"
    : !platformReady || !walletReady
      ? "blocked"
      : !enabled
        ? "ready"
        : needsTest
          ? "try"
          : "live";

  const phoneDiffers =
    Boolean(ownerPhone?.trim()) &&
    Boolean(normalizePhone(testPhone)) &&
    normalizePhone(testPhone) !== normalizePhone(ownerPhone ?? "");

  const onEnable = async () => {
    if (!canWrite) return;
    setSaving(true);
    try {
      const updated = await updateAirtimeSettings({
        enabled: true,
        posEnabled: true,
      });
      setSettings(updated);
      toast.success(`KES ${seedAmount} loaded — try it on your phone.`, {
        description: `You keep ~${commissionPct}% on every airtime sale.`,
      });
      setTestOpen(true);
      const a = await fetchAirtimeAvailability(false).catch(() => null);
      setAvailability(a);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not turn on airtime.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onDisable = async () => {
    if (!canWrite) return;
    setSaving(true);
    try {
      const updated = await updateAirtimeSettings({ enabled: false });
      setSettings(updated);
      toast.success("Airtime selling paused.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not pause airtime.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onTestSell = async () => {
    const phone = normalizePhone(testPhone);
    if (phone.length < 9) {
      setTestError("Enter the phone that should receive the airtime.");
      return;
    }
    setTestBusy(true);
    setTestError(null);
    try {
      let order = await sellAirtime(
        {
          phoneNumber: phone,
          amount: TEST_AMOUNT,
          channel: "DASHBOARD",
          tender: "CASH",
        },
        newIdempotencyKey(),
      );
      const deadline = Date.now() + 45_000;
      while (!isTerminal(order.status) && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1500));
        order = await fetchAirtimeOrder(order.id);
      }
      if (order.status === "SUCCESS") {
        toast.success("It works — airtime landed on your phone.", {
          description: `You earned ${money(order.commission, currency)}. Ready to sell to customers.`,
        });
        setHasSold(true);
        setTestOpen(false);
        await refresh();
      } else if (order.status === "FAILED") {
        setTestError(order.failureReason || "Delivery failed — try again.");
      } else {
        setTestError(
          "Still waiting on the network. Check Airtime activity in a minute.",
        );
      }
    } catch (e) {
      setTestError(
        e instanceof Error ? e.message : "Could not send the test.",
      );
    } finally {
      setTestBusy(false);
    }
  };

  const primaryBtn =
    "inline-flex w-full items-center justify-center gap-1.5 border border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] px-2.5 py-2 text-[12px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-[#0d6b63] active:scale-[0.98] disabled:opacity-60";

  return (
    <>
      <section
        data-hub-card=""
        aria-label="Sell airtime"
        className={cn(
          HUB_SURFACE,
          "text-left",
          rail && "border-0 shadow-none",
          (phase === "ready" || phase === "try" || phase === "blocked") &&
            "border-l-[3px] border-l-[var(--pos-primary,#0f766e)]",
        )}
      >
        <div className={cn("flex flex-col gap-2.5", rail ? "p-3" : "p-3.5")}>
          <div className="flex min-w-0 gap-3">
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center border text-[var(--pos-primary,#0f766e)]",
                "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_9%,white)]",
              )}
              aria-hidden
            >
              {phase === "live" ? (
                <Check className="size-3.5" />
              ) : (
                <Signal className="size-3.5" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-primary,#0f766e)]">
                  Sell airtime
                </p>
                {phase === "try" ? (
                  <span className="inline-flex items-center border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--pos-primary,#0f766e)]">
                    Step 2 of 2
                  </span>
                ) : null}
                {phase === "ready" ? (
                  <span className="inline-flex items-center border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--pos-primary,#0f766e)]">
                    Free KES {seedAmount}
                  </span>
                ) : null}
                {phase === "live" ? (
                  <span className="inline-flex items-center border border-[color-mix(in_srgb,#141414_10%,transparent)] bg-[#F7F7F5] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[color-mix(in_srgb,#141414_62%,transparent)]">
                    Live
                  </span>
                ) : null}
              </div>

              {phase === "loading" ? (
                <p className={cn("mt-1 flex items-center gap-2 text-[13px]", HUB_MUTED)}>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Checking…
                </p>
              ) : null}

              {phase === "blocked" ? (
                <>
                  <p className="mt-1 text-[13px] font-semibold tracking-[-0.02em] text-[#141414]">
                    {!walletReady
                      ? "First, turn on your airtime wallet"
                      : "Airtime isn’t available yet"}
                  </p>
                  <p className={cn("mt-0.5 text-[12px] leading-snug", HUB_MUTED)}>
                    {!walletReady
                      ? `Then sell top-ups at the till and keep ~${commissionPct}%.`
                      : settings?.blockedReason ||
                        "Ask your platform admin to switch airtime on."}
                  </p>
                </>
              ) : null}

              {phase === "ready" ? (
                <>
                  <p className="mt-1 text-[13px] font-semibold tracking-[-0.02em] text-[#141414]">
                    Customers buy airtime — you keep ~{commissionPct}%
                  </p>
                  <p className={cn("mt-0.5 text-[12px] leading-snug", HUB_MUTED)}>
                    Tap once. We load KES {seedAmount} so you can try it on your
                    phone. Not your customer till.
                  </p>
                </>
              ) : null}

              {phase === "try" ? (
                <>
                  <p className="mt-1 text-[13px] font-semibold tracking-[-0.02em] text-[#141414]">
                    Prove it works — send yourself KES {TEST_AMOUNT}
                  </p>
                  <p className={cn("mt-0.5 text-[12px] leading-snug", HUB_MUTED)}>
                    Wallet has {money(walletBalance, currency)}. You’ll keep ~
                    {commissionPct}% (
                    {money((TEST_AMOUNT * commissionPct) / 100, currency)}).
                    {maskPhone(ownerPhone)
                      ? ` Prefills ${maskPhone(ownerPhone)}.`
                      : ""}
                  </p>
                </>
              ) : null}

              {phase === "live" ? (
                <>
                  <p className="mt-1 text-[13px] font-semibold tracking-[-0.02em] text-[#141414]">
                    {money(walletBalance, currency)} ready to sell
                  </p>
                  <p className={cn("mt-0.5 text-[12px] leading-snug", HUB_MUTED)}>
                    Keep {commissionPct}%
                    {earnedToday > 0
                      ? ` · earned today ${money(earnedToday, currency)}`
                      : " on every top-up"}
                  </p>
                </>
              ) : null}
            </div>
          </div>

          {/* One primary action for the current phase */}
          {phase === "blocked" && !walletReady ? (
            <Link href={APP_ROUTES.paymentsKioskPay} className={primaryBtn}>
              Open Kiosk Pay wallet
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          ) : null}

          {phase === "ready" && canWrite ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void onEnable()}
              className={primaryBtn}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Wallet className="size-3.5" aria-hidden />
              )}
              Turn on — get KES {seedAmount} free
            </button>
          ) : null}

          {phase === "try" && canWrite ? (
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setTestOpen(true)}
                className={primaryBtn}
              >
                Send KES {TEST_AMOUNT} to my phone
                <ArrowRight className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                className="text-[11px] font-medium text-[color-mix(in_srgb,#141414_55%,transparent)] underline-offset-2 hover:underline"
                onClick={() => setSkippedTest(true)}
              >
                Skip for now — I’ll sell later
              </button>
            </div>
          ) : null}

          {phase === "live" && canSell ? (
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setSellOpen(true)}
                className={primaryBtn}
              >
                Sell airtime now
                <ArrowRight className="size-3.5" aria-hidden />
              </button>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-0.5">
                <Link
                  href={APP_ROUTES.paymentsKioskPay}
                  className="text-[11px] font-medium text-[color-mix(in_srgb,#141414_55%,transparent)] underline-offset-2 hover:underline"
                >
                  Top up wallet
                </Link>
                <Link
                  href={`${APP_ROUTES.paymentsSettings}#profit-pocket`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
                >
                  <PiggyBank className="size-3" aria-hidden />
                  Pocket profits
                </Link>
              </div>
              {canWrite ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void onDisable()}
                  className="self-start text-[10px] font-medium text-[color-mix(in_srgb,#141414_40%,transparent)] underline-offset-2 hover:underline"
                >
                  Pause selling
                </button>
              ) : null}
            </div>
          ) : null}

          {phase === "live" && !canSell && canWrite ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void onDisable()}
              className="text-[11px] font-medium text-[color-mix(in_srgb,#141414_55%,transparent)] underline-offset-2 hover:underline"
            >
              Pause selling
            </button>
          ) : null}
        </div>
      </section>

      <FormDrawer
        open={testOpen}
        onOpenChange={setTestOpen}
        title="Send yourself KES 10"
        description="Same flow customers will use. If this lands, you’re ready to sell."
        appearance="sharp"
        headerDensity="compact"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              disabled={testBusy}
              onClick={() => {
                setTestOpen(false);
                setSkippedTest(true);
              }}
            >
              Skip
            </Button>
            <Button
              type="button"
              className="rounded-none bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]"
              disabled={testBusy || !canWrite}
              onClick={() => void onTestSell()}
            >
              {testBusy ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : null}
              {testBusy ? "Sending…" : `Send KES ${TEST_AMOUNT}`}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 px-1 pb-2">
          <ol className="space-y-2 text-[12px] leading-snug text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">1.</span>
              Confirm the number that should get the airtime.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">2.</span>
              We debit KES {TEST_AMOUNT} from your wallet and credit ~
              {commissionPct}% back as your cut.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">3.</span>
              Check your phone — then sell the same way at the till.
            </li>
          </ol>

          <label className="block space-y-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">
              Your phone
            </span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="h-10 w-full rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 text-base tabular-nums tracking-wide"
              placeholder="07XX XXX XXX"
              value={testPhone}
              disabled={testBusy}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </label>

          {phoneDiffers ? (
            <p className="text-[12px] text-amber-800">
              Different from your profile number — double-check before sending.
            </p>
          ) : ownerPhone?.trim() ? (
            <p className="text-[12px] text-muted-foreground">
              Prefilled from your profile. Change it if you want another line.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-px overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-xs">
            <div className="bg-white px-2.5 py-2">
              <p className="text-[10px] font-medium text-muted-foreground">
                You send
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                {money(TEST_AMOUNT, currency)}
              </p>
            </div>
            <div className="bg-white px-2.5 py-2">
              <p className="text-[10px] font-medium text-muted-foreground">
                You keep (~{commissionPct}%)
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
                {money(
                  testQuoteCommission ?? (TEST_AMOUNT * commissionPct) / 100,
                  currency,
                )}
              </p>
            </div>
          </div>

          {testError ? (
            <p className="border border-[#9a2e16]/35 bg-white px-3 py-2 text-sm text-[#9a2e16]">
              {testError}
            </p>
          ) : null}
        </div>
      </FormDrawer>

      <FormDrawer
        open={sellOpen}
        onOpenChange={setSellOpen}
        title="Sell airtime"
        description={`Customer pays you. Wallet pays the network. You keep ~${commissionPct}%.`}
        appearance="sharp"
        headerDensity="compact"
        width="wide"
      >
        <div className="px-1 pb-2">
          <AirtimeSellPanel
            channel="DASHBOARD"
            currency={currency}
            onSold={() => {
              setHasSold(true);
              void refresh();
            }}
          />
        </div>
      </FormDrawer>
    </>
  );
}
