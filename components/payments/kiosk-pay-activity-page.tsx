"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Loader2,
  RefreshCw,
  RotateCcw,
  Settings2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DASHBOARD_TABLE_SURFACE,
  DashboardAccessDenied,
} from "@/components/dashboard-page-ui";
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

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
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
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
        <Check className="size-3 stroke-[2.5]" aria-hidden />
        Paid
      </span>
    );
  }
  if (bucket === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-600/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-rose-800 dark:bg-rose-400/15 dark:text-rose-300">
        <X className="size-3 stroke-[2.5]" aria-hidden />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
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

  const [tab, setTab] = useState<Tab>("withdrawals");
  const [wdFilter, setWdFilter] = useState<WithdrawFilter>("all");
  const [account, setAccount] = useState<KioskPayAccountRecord | null>(null);
  const [ledger, setLedger] = useState<KioskPayLedgerEntryRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<KioskPayWithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

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

  const available = Number(account?.availableBalance) || 0;
  const pending = Number(account?.pendingBalance) || 0;
  const active = account?.status === "ACTIVE";

  const wdCounts = useMemo(() => {
    let paid = 0;
    let failed = 0;
    let open = 0;
    for (const w of withdrawals) {
      const b = withdrawBucket(w.status);
      if (b === "paid") paid += 1;
      else if (b === "failed") failed += 1;
      else open += 1;
    }
    return { paid, failed, open, all: withdrawals.length };
  }, [withdrawals]);

  const filteredWithdrawals = useMemo(() => {
    if (wdFilter === "all") return withdrawals;
    return withdrawals.filter((w) => withdrawBucket(w.status) === wdFilter);
  }, [withdrawals, wdFilter]);

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Kiosk Pay activity"
        description="You need payment gateway read access to view the Kiosk Pay ledger."
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Kiosk Pay
            </h1>
            <span className="font-heading text-base font-semibold tabular-nums tracking-tight text-foreground sm:text-lg">
              {loading && !account ? "—" : money(available, currency)}
            </span>
            {pending > 0.001 ? (
              <span className="text-[11px] tabular-nums text-amber-800 dark:text-amber-300">
                {money(pending, currency)} pending
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {active ? "Active" : account?.status ?? "—"}
            <span className="text-muted-foreground/70">
              {" "}
              · ~{currency} {KIOSK_PAY_WITHDRAW_PROVIDER_FEE_KES} Safaricom/KopoKopo per
              withdraw · not a Kiosk fee
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
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
            className="size-8"
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

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="inline-flex rounded-lg border border-border/70 bg-muted/30 p-0.5">
          {(
            [
              { id: "withdrawals" as const, label: "Withdrawals", n: wdCounts.all },
              { id: "ledger" as const, label: "Ledger", n: ledger.length },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className="ml-1 tabular-nums opacity-60">{t.n}</span>
            </button>
          ))}
        </div>

        {tab === "withdrawals" && wdCounts.all > 0 ? (
          <div className="flex flex-wrap gap-1">
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
                  "rounded-md px-2 py-1 text-[11px] font-semibold tabular-nums transition-colors disabled:opacity-40",
                  wdFilter === f.id
                    ? f.id === "paid"
                      ? "bg-emerald-600/15 text-emerald-900 dark:text-emerald-200"
                      : f.id === "failed"
                        ? "bg-rose-600/15 text-rose-900 dark:text-rose-200"
                        : f.id === "open"
                          ? "bg-amber-500/15 text-amber-950 dark:text-amber-100"
                          : "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {f.label}
                <span className="ml-1 opacity-70">{f.n}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {loading && !account ? (
        <div
          className={cn(
            DASHBOARD_TABLE_SURFACE,
            "flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground",
          )}
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading activity…
        </div>
      ) : tab === "ledger" ? (
        ledger.length === 0 ? (
          <EmptyState
            title="No ledger entries yet"
            body="Collections, fees, and withdrawals appear here as they settle."
          />
        ) : (
          <section className={DASHBOARD_TABLE_SURFACE}>
            <ul className="divide-y divide-border/50">
              {ledger.map((e) => {
                const credit = e.direction === "CREDIT";
                return (
                  <li
                    key={e.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2"
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-md",
                        credit
                          ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
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
                        <span className="rounded bg-muted/70 px-1 py-px text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {entryLabel(e.entryType)}
                        </span>
                        <span className="truncate text-xs font-medium text-foreground">
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
                          "text-sm font-semibold tabular-nums leading-none",
                          credit
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-foreground",
                        )}
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
          </section>
        )
      ) : withdrawals.length === 0 ? (
        <div className="space-y-2">
          <KioskPayWithdrawFeeNotice currency={currency} />
          <EmptyState
            title="No withdrawals yet"
            body="M-Pesa payouts from your Kiosk Pay balance list here."
          />
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <EmptyState
          title="Nothing in this filter"
          body="Try All, or clear Paid / Failed / Open."
        />
      ) : (
        <div className="space-y-2">
          <KioskPayWithdrawFeeNotice currency={currency} />
          <section className={DASHBOARD_TABLE_SURFACE}>
          <ul className="divide-y divide-border/50">
            {filteredWithdrawals.map((w) => {
              const bucket = withdrawBucket(w.status);
              return (
                <li
                  key={w.id}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-3.5",
                    bucket === "failed" &&
                      "bg-rose-500/[0.06] dark:bg-rose-400/[0.07]",
                    bucket === "paid" && "bg-emerald-500/[0.04] dark:bg-emerald-400/[0.05]",
                    bucket === "open" && "bg-amber-500/[0.05] dark:bg-amber-400/[0.06]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <WithdrawStatusStamp status={w.status} />
                      <span className="font-heading text-sm font-semibold tabular-nums tracking-tight text-foreground">
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
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-rose-800 dark:text-rose-300">
                        {w.failureReason}
                      </p>
                    ) : null}
                  </div>
                  {bucket === "failed" && canWrite ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 gap-1 border-rose-300/60 px-2 text-[11px] text-rose-900 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-950/40"
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
        </section>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div
      className={cn(
        DASHBOARD_TABLE_SURFACE,
        "border-dashed px-4 py-8 text-center",
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
