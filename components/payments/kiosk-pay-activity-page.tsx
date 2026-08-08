"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
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

function money(n: number | null | undefined, currency = "KES") {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${currency} ${v.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function entryLabel(type: string) {
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

function statusTone(status: string) {
  switch (status) {
    case "SUCCESS":
      return "text-emerald-700 dark:text-emerald-400";
    case "FAILED":
      return "text-red-700 dark:text-red-400";
    case "PROCESSING":
    case "REQUESTED":
      return "text-amber-800 dark:text-amber-300";
    default:
      return "text-muted-foreground";
  }
}

export function KioskPayActivityPage() {
  const { me, business } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.PaymentsGatewaysRead);
  const canWrite = hasPermission(me?.permissions, Permission.PaymentsGatewaysWrite);
  const currency = business?.currency?.trim() || "KES";

  const [tab, setTab] = useState<Tab>("ledger");
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

  const tabs = useMemo(
    () =>
      [
        { id: "ledger" as const, label: "Ledger", count: ledger.length },
        {
          id: "withdrawals" as const,
          label: "Withdrawals",
          count: withdrawals.length,
        },
      ] as const,
    [ledger.length, withdrawals.length],
  );

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Kiosk Pay activity"
        description="You need payment gateway read access to view the Kiosk Pay ledger."
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Kiosk Pay
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Wallet ledger and withdrawal history
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            asChild
          >
            <Link href={`${APP_ROUTES.paymentsSettings}#kiosk-pay`}>Settings</Link>
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
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
          </Button>
        </div>
      </header>

      <section className="grid gap-2 sm:grid-cols-3">
        <div className="border border-border/70 bg-card px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Available
          </p>
          <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
            {loading && !account ? "—" : money(available, currency)}
          </p>
        </div>
        <div className="border border-border/70 bg-card px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Pending withdraw
          </p>
          <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
            {loading && !account ? "—" : money(pending, currency)}
          </p>
        </div>
        <div className="border border-border/70 bg-card px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Status
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm font-medium">
            <Wallet className="size-4 text-muted-foreground" aria-hidden />
            {account?.status === "ACTIVE" ? "Active" : account?.status ?? "—"}
            <span className="text-xs font-normal text-muted-foreground">
              · provider fees only
            </span>
          </p>
        </div>
      </section>

      <div className="flex gap-1 border-b border-border/60">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span className="ml-1.5 tabular-nums text-xs text-muted-foreground">
              {t.count}
            </span>
            {tab === t.id ? (
              <span
                className="absolute inset-x-2 bottom-0 h-0.5 bg-foreground"
                aria-hidden
              />
            ) : null}
          </button>
        ))}
      </div>

      {loading && !account ? (
        <div className="flex items-center gap-2 border border-border/70 bg-card px-4 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading activity…
        </div>
      ) : tab === "ledger" ? (
        ledger.length === 0 ? (
          <EmptyState
            title="No ledger entries yet"
            body="Collections, fees, and withdrawals will show here as they settle."
          />
        ) : (
          <ul className="divide-y divide-border/60 border border-border/70 bg-card">
            {ledger.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium text-foreground">
                    {entryLabel(e.entryType)}
                    {e.note ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {e.note}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {fmtWhen(e.createdAt)}
                    {e.reference ? ` · ${e.reference}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-semibold tabular-nums",
                      e.direction === "CREDIT"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-foreground",
                    )}
                  >
                    {e.direction === "CREDIT" ? "+" : "−"}
                    {money(e.amount, e.currency || currency)}
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    Bal {money(e.balanceAfterAvailable, e.currency || currency)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : withdrawals.length === 0 ? (
        <EmptyState
          title="No withdrawals yet"
          body="M-Pesa payouts from your Kiosk Pay balance will list here."
        />
      ) : (
        <ul className="divide-y divide-border/60 border border-border/70 bg-card">
          {withdrawals.map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="font-medium tabular-nums text-foreground">
                  {money(w.amount, w.currency || currency)} → {w.phoneNumber}
                </p>
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {fmtWhen(w.requestedAt)}
                  {w.completedAt ? ` · done ${fmtWhen(w.completedAt)}` : ""}
                </p>
                {w.failureReason ? (
                  <p className="text-[11px] text-red-700 dark:text-red-400">
                    {w.failureReason}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    statusTone(w.status),
                  )}
                >
                  {w.status}
                </span>
                {w.status === "FAILED" && canWrite ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={retryingId === w.id}
                    onClick={() => void onRetryWithdraw(w)}
                  >
                    {retryingId === w.id ? "Retrying…" : "Retry"}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-border/70 bg-muted/15 px-4 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
