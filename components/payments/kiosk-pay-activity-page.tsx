"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import {
  KIOSK_PAY_WITHDRAW_PROVIDER_FEE_KES,
  KioskPayWithdrawFeeNotice,
} from "@/components/payments/kiosk-pay-withdraw-fee-notice";
import { Button } from "@/components/ui/button";
import {
  fetchKioskPayAccount,
  fetchKioskPayLedger,
  fetchKioskPayWithdrawals,
  requestKioskPayTopUp,
  requestKioskPayWithdraw,
  type KioskPayAccountRecord,
  type KioskPayLedgerEntryRecord,
  type KioskPayWithdrawalRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { getRealtimeClient } from "@/lib/realtime";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Tab = "ledger" | "withdrawals";
type WithdrawFilter = "all" | "paid" | "failed" | "open";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PAPER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]";
const ROSTER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]";

const SEGMENT =
  "inline-flex h-8 shrink-0 items-center gap-1 rounded-none px-2.5 text-[11px] font-semibold tracking-[-0.02em] tabular-nums transition-colors duration-150";
const SEGMENT_IDLE =
  "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground";
const SEGMENT_ACTIVE = "bg-[var(--pos-primary,#0f766e)] text-white";

function money(n: number | null | undefined, currency = "KES") {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${currency} ${v.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function moneyShort(n: number | null | undefined) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return v.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDay(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatDayShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  const today = todayIsoLocal();
  if (iso === today) return "Today";
  if (iso === shiftDay(today, -1)) return "Yesterday";
  return dt.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function isoLocalDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function entryLabel(type: string) {
  switch (type) {
    case "PAYMENT_CAPTURE":
      return "In";
    case "PROVIDER_FEE":
      return "Fee";
    case "PLATFORM_FEE":
      return "Fee";
    case "WITHDRAW_HOLD":
      return "Hold";
    case "WITHDRAW_SETTLE":
      return "Out";
    case "WITHDRAW_RELEASE":
      return "Release";
    case "TOPUP":
      return "Top up";
    case "AIRTIME_HOLD":
      return "Hold";
    case "AIRTIME_SETTLE":
      return "Airtime";
    case "AIRTIME_RELEASE":
      return "Release";
    case "AIRTIME_COMMISSION":
      return "Earned";
    case "ADJUSTMENT":
      return "Adj";
    default:
      return type.replaceAll("_", " ").slice(0, 8);
  }
}

function entryTitle(type: string) {
  switch (type) {
    case "PAYMENT_CAPTURE":
      return "Collection";
    case "PROVIDER_FEE":
      return "Provider fee";
    case "PLATFORM_FEE":
      return "Platform fee";
    case "WITHDRAW_HOLD":
      return "Withdraw hold";
    case "WITHDRAW_SETTLE":
      return "Withdraw paid";
    case "WITHDRAW_RELEASE":
      return "Withdraw released";
    case "TOPUP":
      return "Wallet top-up";
    case "AIRTIME_HOLD":
      return "Airtime hold";
    case "AIRTIME_SETTLE":
      return "Airtime sold";
    case "AIRTIME_RELEASE":
      return "Airtime released";
    case "AIRTIME_COMMISSION":
      return "Airtime commission";
    case "ADJUSTMENT":
      return "Adjustment";
    default:
      return type.replaceAll("_", " ");
  }
}

function withdrawBucket(status: string): Exclude<WithdrawFilter, "all"> {
  if (status === "SUCCESS") return "paid";
  if (status === "FAILED") return "failed";
  return "open";
}

function WithdrawStatusStamp({ status }: { status: string }) {
  const bucket = withdrawBucket(status);
  if (bucket === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]">
        <Check className="size-3 stroke-[2.5]" aria-hidden />
        Paid
      </span>
    );
  }
  if (bucket === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-none border border-[#9a2e16]/35 px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[#9a2e16]">
        <X className="size-3 stroke-[2.5]" aria-hidden />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
      <Loader2 className="size-3 animate-spin" aria-hidden />
      {status === "PROCESSING" ? "Sending" : "Queued"}
    </span>
  );
}

export function KioskPayActivityPage() {
  const { me, business } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.PaymentsGatewaysRead);
  const canWrite = hasPermission(me?.permissions, Permission.PaymentsGatewaysWrite);
  const currency = business?.currency?.trim() || "KES";

  const [day, setDay] = useState(todayIsoLocal);
  const [tab, setTab] = useState<Tab>("withdrawals");
  const [wdFilter, setWdFilter] = useState<WithdrawFilter>("all");
  const [account, setAccount] = useState<KioskPayAccountRecord | null>(null);
  const [ledger, setLedger] = useState<KioskPayLedgerEntryRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<KioskPayWithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpPhone, setTopUpPhone] = useState("");
  const [toppingUp, setToppingUp] = useState(false);

  const reload = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [acc, led, wds] = await Promise.all([
        fetchKioskPayAccount(),
        fetchKioskPayLedger(100).catch(() => []),
        fetchKioskPayWithdrawals(100).catch(() => []),
      ]);
      setAccount(acc);
      setLedger(led);
      setWithdrawals(wds);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load Kiosk Pay activity.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!canRead) return;
    void reload();
  }, [canRead, reload]);

  useEffect(() => {
    if (!canRead) return;
    let stopped = false;
    const client = getRealtimeClient();
    const unregister = client.registerListener("kiosk-pay-activity", {
      channels: ["pos", "notifications"],
      onKioskPayBalanceUpdated: () => {
        if (!stopped) void reload(true);
      },
    });
    return () => {
      stopped = true;
      unregister();
    };
  }, [canRead, reload]);

  const onRetryWithdraw = async (w: KioskPayWithdrawalRecord) => {
    if (!canWrite) return;
    setRetryingId(w.id);
    try {
      const row = await requestKioskPayWithdraw({
        amount: w.amount,
        phoneNumber: w.phoneNumber,
        idempotencyKey:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `wd-retry-${Date.now()}`,
      });
      if (row.status === "FAILED") {
        toast.error(row.failureReason || "Withdraw failed.");
      } else {
        toast.success(
          row.status === "SUCCESS"
            ? "Withdrawal completed."
            : "Withdrawal re-submitted — waiting for M-Pesa.",
        );
      }
      await reload(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed.");
    } finally {
      setRetryingId(null);
    }
  };

  const onTopUp = async () => {
    if (!canWrite) return;
    const amount = Number(topUpAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid top-up amount.");
      return;
    }
    const phone = topUpPhone.trim() || account?.payoutPhone?.trim() || "";
    if (!phone) {
      toast.error("Enter the M-Pesa number to charge.");
      return;
    }
    setToppingUp(true);
    try {
      const res = await requestKioskPayTopUp(
        { amount, phoneNumber: phone },
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tu-${Date.now()}`,
      );
      if (res.accepted) {
        toast.success(res.message || "Check your phone and enter your M-Pesa PIN.");
        setTopUpAmount("");
      } else {
        toast.error(res.message || "Could not send the STK prompt.");
      }
      await reload(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Top-up failed.");
    } finally {
      setToppingUp(false);
    }
  };

  const available = Number(account?.availableBalance) || 0;
  const pending = Number(account?.pendingBalance) || 0;
  const active = account?.status === "ACTIVE";
  const isToday = day === todayIsoLocal();

  const dayLedger = useMemo(
    () => ledger.filter((e) => isoLocalDay(e.createdAt) === day),
    [ledger, day],
  );

  const dayWithdrawals = useMemo(
    () => withdrawals.filter((w) => isoLocalDay(w.requestedAt) === day),
    [withdrawals, day],
  );

  const wdCounts = useMemo(() => {
    let paid = 0;
    let failed = 0;
    let open = 0;
    for (const w of dayWithdrawals) {
      const b = withdrawBucket(w.status);
      if (b === "paid") paid += 1;
      else if (b === "failed") failed += 1;
      else open += 1;
    }
    return { paid, failed, open, all: dayWithdrawals.length };
  }, [dayWithdrawals]);

  const filteredWithdrawals = useMemo(() => {
    if (wdFilter === "all") return dayWithdrawals;
    return dayWithdrawals.filter((w) => withdrawBucket(w.status) === wdFilter);
  }, [dayWithdrawals, wdFilter]);

  useEffect(() => {
    if (wdFilter !== "all" && wdCounts[wdFilter] === 0) {
      setWdFilter("all");
    }
  }, [wdFilter, wdCounts]);

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Kiosk Pay activity"
        description="You need payment gateway read access to view the Kiosk Pay ledger."
      />
    );
  }

  const dayNav = (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 rounded-none"
        onClick={() => setDay((d) => shiftDay(d, -1))}
        aria-label="Previous day"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <label className="relative">
        <span className="sr-only">Pick day</span>
        <input
          type="date"
          value={day}
          max={todayIsoLocal()}
          onChange={(e) => {
            const v = e.target.value;
            if (v) setDay(v);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <span
          className={cn(
            "inline-flex min-w-[7.5rem] items-center justify-center border bg-white px-2.5 py-1.5 text-sm font-semibold tabular-nums",
            HAIRLINE,
          )}
        >
          {formatDayShort(day)}
        </span>
      </label>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 rounded-none"
        disabled={isToday}
        onClick={() => setDay((d) => shiftDay(d, 1))}
        aria-label="Next day"
      >
        <ChevronRight className="size-4" />
      </Button>
      {!isToday ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-none px-2 text-xs shadow-none"
          onClick={() => setDay(todayIsoLocal())}
        >
          Today
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col gap-1.5 bg-transparent px-3 pt-1 sm:px-5 sm:pt-1.5">
      <header
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
          HAIRLINE,
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex size-7 shrink-0 items-center justify-center border bg-[var(--pos-primary,#0f766e)] text-white">
              <Wallet className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1
                className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Kiosk Pay
              </h1>
              <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
                {active ? "Active" : account?.status ?? "—"}
                {" · "}
                ~{currency} {KIOSK_PAY_WITHDRAW_PROVIDER_FEE_KES} per withdraw
              </p>
            </div>
          </div>

          <span
            aria-hidden
            className="hidden h-3.5 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
          />

          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className="text-[15px] font-semibold tabular-nums tracking-[-0.03em] text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {loading && !account ? "—" : money(available, currency)}
            </span>
            {pending > 0.001 ? (
              <span className="text-[11px] tabular-nums text-[#9a2e16]">
                {money(pending, currency)} pending
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {dayNav}
          {canWrite && active ? (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 rounded-none bg-[var(--pos-primary,#0f766e)] px-2.5 text-[12px] font-semibold text-white hover:bg-[#0d6b63]"
              onClick={() => setTopUpOpen((open) => !open)}
            >
              <Plus className="size-3.5" aria-hidden />
              Top up
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-none px-2 text-[12px] shadow-none"
            asChild
          >
            <Link href={`${APP_ROUTES.paymentsSettings}#kiosk-pay`}>
              <Settings2 className="size-3.5" aria-hidden />
              Settings
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-none shadow-none"
            onClick={() => void reload(true)}
            disabled={loading || refreshing}
            aria-label="Refresh"
          >
            {refreshing ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden />
            )}
          </Button>
        </div>
      </header>

      {topUpOpen && canWrite ? (
        <section className={cn("space-y-2 border bg-white px-3 py-3 sm:px-3.5", HAIRLINE)}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
              Top up from M-Pesa
            </p>
            <button
              type="button"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setTopUpOpen(false)}
            >
              Close
            </button>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            We send an STK prompt to the number below. Once you approve, the full amount
            lands in this wallet — ready to sell airtime or spend at the till.
          </p>
          <div className="flex flex-wrap gap-1">
            {[100, 500, 1000, 2000, 5000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTopUpAmount(String(preset))}
                className={cn(
                  SEGMENT,
                  Number(topUpAmount) === preset ? SEGMENT_ACTIVE : cn("border bg-white", HAIRLINE, SEGMENT_IDLE),
                )}
              >
                {preset.toLocaleString("en-KE")}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              type="number"
              min={1}
              step="1"
              inputMode="numeric"
              className={cn(
                "h-8 rounded-none border bg-white px-2.5 text-sm shadow-none tabular-nums outline-none focus-visible:border-[var(--pos-primary,#0f766e)]",
                HAIRLINE,
              )}
              placeholder="Amount"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
            />
            <input
              type="tel"
              className={cn(
                "h-8 rounded-none border bg-white px-2.5 text-sm shadow-none outline-none focus-visible:border-[var(--pos-primary,#0f766e)]",
                HAIRLINE,
              )}
              placeholder={account?.payoutPhone || "M-Pesa number (2547…)"}
              value={topUpPhone}
              onChange={(e) => setTopUpPhone(e.target.value)}
            />
            <Button
              type="button"
              className="h-8 rounded-none bg-[var(--pos-primary,#0f766e)] text-white hover:bg-[#0d6b63]"
              disabled={toppingUp}
              onClick={() => void onTopUp()}
            >
              {toppingUp ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Sending prompt…
                </>
              ) : (
                "Send STK prompt"
              )}
            </Button>
          </div>
        </section>
      ) : null}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden border",
          HAIRLINE,
          PAPER,
          "lg:h-[min(80dvh,52rem)]",
        )}
      >
        <div className={cn("flex shrink-0 flex-wrap items-center gap-1.5 border-b bg-white px-2.5 py-1.5 sm:px-3", HAIRLINE)}>
          <div className={cn("inline-flex flex-wrap border bg-white p-0.5", HAIRLINE)} role="tablist">
            {(
              [
                { id: "withdrawals" as const, label: "Withdrawals", n: wdCounts.all },
                { id: "ledger" as const, label: "Ledger", n: dayLedger.length },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(SEGMENT, tab === t.id ? SEGMENT_ACTIVE : SEGMENT_IDLE)}
              >
                {t.label}
                <span className={cn("font-mono text-[10px]", tab === t.id ? "text-white/85" : "opacity-70")}>
                  {t.n}
                </span>
              </button>
            ))}
          </div>

          {tab === "withdrawals" && wdCounts.all > 0 ? (
            <div className="flex flex-wrap gap-0.5">
              {(
                [
                  { id: "all" as const, label: "All", n: wdCounts.all },
                  { id: "paid" as const, label: "Paid", n: wdCounts.paid },
                  { id: "failed" as const, label: "Failed", n: wdCounts.failed },
                  { id: "open" as const, label: "Open", n: wdCounts.open },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setWdFilter(f.id)}
                  disabled={f.n === 0 && f.id !== "all"}
                  className={cn(
                    SEGMENT,
                    "disabled:opacity-40",
                    wdFilter === f.id
                      ? f.id === "failed"
                        ? "bg-[#9a2e16] text-white"
                        : SEGMENT_ACTIVE
                      : SEGMENT_IDLE,
                  )}
                >
                  {f.label}
                  <span className={cn("font-mono text-[10px]", wdFilter === f.id ? "text-white/85" : "opacity-70")}>
                    {f.n}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <p className="ml-auto text-[11px] tabular-nums text-muted-foreground">
            {formatDayShort(day)}
            {isToday ? " · live" : ""}
          </p>
        </div>

        <div className={cn("min-h-0 flex-1 overflow-y-auto", ROSTER)}>
          {loading && !account ? (
            <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading activity…
            </div>
          ) : tab === "ledger" ? (
            dayLedger.length === 0 ? (
              <EmptyState
                title="No ledger entries this day"
                body={
                  isToday
                    ? "Collections, fees, and withdrawals appear here as they settle."
                    : "Pick another day, or jump back to Today."
                }
              />
            ) : (
              <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white">
                {dayLedger.map((e) => {
                  const credit = e.direction === "CREDIT";
                  return (
                    <li
                      key={e.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2 sm:px-3.5"
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-none border",
                          HAIRLINE,
                          credit
                            ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "bg-white text-muted-foreground",
                        )}
                        title={entryTitle(e.entryType)}
                      >
                        {credit ? (
                          <ArrowDownLeft className="size-3.5" aria-hidden />
                        ) : (
                          <ArrowUpRight className="size-3.5" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-1 py-px text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
                            {entryLabel(e.entryType)}
                          </span>
                          <span className="truncate text-[12px] font-medium text-foreground">
                            {e.note || entryTitle(e.entryType)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[10px] tabular-nums text-muted-foreground">
                          {fmtWhen(e.createdAt)}
                          {e.reference ? ` · ${e.reference}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-[13px] font-semibold tabular-nums leading-none tracking-[-0.03em]",
                            credit
                              ? "text-[var(--pos-primary,#0f766e)]"
                              : "text-foreground",
                          )}
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {credit ? "+" : "−"}
                          {moneyShort(e.amount)}
                        </p>
                        <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                          → {moneyShort(e.balanceAfterAvailable)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : dayWithdrawals.length === 0 ? (
            <div className="space-y-2 p-3">
              <KioskPayWithdrawFeeNotice currency={currency} />
              <EmptyState
                title="No withdrawals this day"
                body={
                  isToday
                    ? "M-Pesa payouts from your Kiosk Pay balance list here."
                    : "Pick another day, or jump back to Today."
                }
              />
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <EmptyState
              title="Nothing in this filter"
              body="Try All, or clear Paid / Failed / Open."
            />
          ) : (
            <div className="space-y-0">
              <div className={cn("border-b bg-white px-3 py-2", HAIRLINE)}>
                <KioskPayWithdrawFeeNotice currency={currency} />
              </div>
              <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white">
                {filteredWithdrawals.map((w) => {
                  const bucket = withdrawBucket(w.status);
                  return (
                    <li
                      key={w.id}
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-3.5",
                        bucket === "failed" &&
                          "bg-[color-mix(in_srgb,#9a2e16_5%,white)]",
                        bucket === "paid" &&
                          "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,white)]",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <WithdrawStatusStamp status={w.status} />
                          <span
                            className="text-[13px] font-semibold tabular-nums tracking-[-0.03em] text-foreground"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {money(w.amount, w.currency || currency)}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            → {w.phoneNumber}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                          {fmtWhen(w.requestedAt)}
                          {w.completedAt && bucket === "paid"
                            ? ` · paid ${fmtWhen(w.completedAt)}`
                            : ""}
                        </p>
                        {w.failureReason && bucket === "failed" ? (
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#9a2e16]">
                            {w.failureReason}
                          </p>
                        ) : null}
                      </div>
                      {bucket === "failed" && canWrite ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0 gap-1 rounded-none border-[#9a2e16]/40 px-2 text-[11px] text-[#9a2e16] hover:bg-[color-mix(in_srgb,#9a2e16_6%,white)]"
                          disabled={retryingId === w.id}
                          onClick={() => void onRetryWithdraw(w)}
                        >
                          {retryingId === w.id ? (
                            <Loader2 className="size-3 animate-spin" aria-hidden />
                          ) : (
                            <RotateCcw className="size-3" aria-hidden />
                          )}
                          Retry
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-0 px-4 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
