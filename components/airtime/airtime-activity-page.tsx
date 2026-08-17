"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Loader2,
  RefreshCw,
  Settings2,
  Signal,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AirtimeSellPanel } from "@/components/airtime/airtime-sell-panel";
import {
  DASHBOARD_TABLE_SURFACE,
  DashboardAccessDenied,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  fetchAirtimeAvailability,
  fetchAirtimeOrders,
  type AirtimeAvailabilityRecord,
  type AirtimeOrderRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { getRealtimeClient } from "@/lib/realtime";
import { cn } from "@/lib/utils";

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
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusStamp({ status }: { status: string }) {
  if (status === "SUCCESS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
        <Check className="size-3 stroke-[2.5]" aria-hidden />
        Sent
      </span>
    );
  }
  if (status === "FAILED") {
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
      {status === "AWAITING_PAYMENT" ? "Unpaid" : "Sending"}
    </span>
  );
}

/** Owner-side airtime desk: sell, watch the wallet, and audit every top-up. */
export function AirtimeActivityPage() {
  const { me, business } = useDashboard();
  const canRead =
    hasPermission(me?.permissions, Permission.AirtimeRead) ||
    hasPermission(me?.permissions, Permission.AirtimeSell);
  const canSell = hasPermission(me?.permissions, Permission.AirtimeSell);
  const currencyFallback = business?.currency?.trim() || "KES";

  const [availability, setAvailability] = useState<AirtimeAvailabilityRecord | null>(null);
  const [orders, setOrders] = useState<AirtimeOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [avail, rows] = await Promise.all([
        fetchAirtimeAvailability().catch(() => null),
        fetchAirtimeOrders(100).catch(() => []),
      ]);
      if (avail) setAvailability(avail);
      setOrders(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load airtime activity.");
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
    const unregister = client.registerListener("airtime-activity", {
      channels: ["pos", "notifications"],
      onAirtimeOrderUpdated: () => {
        if (!stopped) void reload(true);
      },
      onKioskPayBalanceUpdated: () => {
        if (!stopped) void reload(true);
      },
    });
    return () => {
      stopped = true;
      unregister();
    };
  }, [canRead, reload]);

  const currency = availability?.currency || currencyFallback;

  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    let sold = 0;
    let count = 0;
    for (const o of orders) {
      if (o.status !== "SUCCESS") continue;
      if (new Date(o.requestedAt).getTime() < start.getTime()) continue;
      sold += o.amount;
      count += 1;
    }
    return { sold, count };
  }, [orders]);

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Airtime"
        description="You need airtime access to view or sell airtime."
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground sm:text-xl">
              <Signal className="size-4 text-muted-foreground" aria-hidden />
              Airtime
            </h1>
            <span className="font-heading text-base font-semibold tabular-nums tracking-tight text-foreground sm:text-lg">
              {loading && !availability ? "—" : money(availability?.walletBalance, currency)}
            </span>
            <span className="text-[11px] text-muted-foreground">wallet</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {today.count} sold today · {money(today.sold, currency)} face value ·{" "}
            <span className="text-emerald-700 dark:text-emerald-400">
              {money(availability?.commissionEarnedToday, currency)} earned
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
            <Link href={`${APP_ROUTES.paymentsSettings}#airtime`}>
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

      {canSell ? (
        <section className={cn(DASHBOARD_TABLE_SURFACE, "px-3 py-3 sm:px-3.5")}>
          <AirtimeSellPanel
            channel="DASHBOARD"
            currency={currency}
            onSold={() => void reload(true)}
          />
        </section>
      ) : null}

      {loading && orders.length === 0 ? (
        <div
          className={cn(
            DASHBOARD_TABLE_SURFACE,
            "flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground",
          )}
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading airtime…
        </div>
      ) : orders.length === 0 ? (
        <div className={cn(DASHBOARD_TABLE_SURFACE, "border-dashed px-4 py-8 text-center")}>
          <p className="text-sm font-medium text-foreground">No airtime sold yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Every top-up sold at the till or on your storefront lands here.
          </p>
        </div>
      ) : (
        <section className={DASHBOARD_TABLE_SURFACE}>
          <ul className="divide-y divide-border/50">
            {orders.map((o) => (
              <li
                key={o.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-3.5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <StatusStamp status={o.status} />
                    <span className="font-heading text-sm font-semibold tabular-nums tracking-tight text-foreground">
                      {money(o.amount, o.currency || currency)}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      → {o.phoneNumber}
                      {o.network ? ` · ${o.network}` : ""}
                    </span>
                    <span className="rounded bg-muted/70 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {o.channel}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] tabular-nums text-muted-foreground">
                    {fmtWhen(o.requestedAt)}
                    {o.receipt ? ` · ${o.receipt}` : ""}
                  </p>
                  {o.failureReason && o.status === "FAILED" ? (
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-rose-800 dark:text-rose-300">
                      {o.failureReason}
                    </p>
                  ) : null}
                </div>
                {o.status === "SUCCESS" && o.commission > 0 ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    <Sparkles className="size-3" aria-hidden />+
                    {money(o.commission, o.currency || currency)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
