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
import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
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

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PAPER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]";
const ROSTER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]";

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
      <span className="inline-flex items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]">
        <Check className="size-3 stroke-[2.5]" aria-hidden />
        Sent
      </span>
    );
  }
  if (status === "FAILED") {
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
              <Signal className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1
                className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Airtime
              </h1>
              <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
                Till sales · wallet balance
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
              {loading && !availability
                ? "—"
                : money(availability?.walletBalance, currency)}
            </span>
            <span className="text-[11px] text-muted-foreground">wallet</span>
            <span className="text-[11px] text-muted-foreground">
              · {today.count} sold today · {money(today.sold, currency)}
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
              {money(availability?.commissionEarnedToday, currency)} earned
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-none px-2.5 text-[12px] shadow-none"
            asChild
          >
            <Link href={APP_ROUTES.onlineAirtime}>Online</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-none px-2.5 text-[12px] shadow-none"
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

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden border lg:grid lg:h-[min(80dvh,52rem)]",
          HAIRLINE,
          PAPER,
          canSell
            ? "lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]"
            : "",
        )}
      >
        {canSell ? (
          <section
            className={cn(
              "shrink-0 border-b bg-white p-3 sm:p-3.5 lg:border-b-0 lg:border-r lg:overflow-y-auto",
              HAIRLINE,
            )}
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Sell
            </p>
            <AirtimeSellPanel
              channel="DASHBOARD"
              currency={currency}
              onSold={() => void reload(true)}
            />
          </section>
        ) : null}

        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", ROSTER)}>
          <div
            className={cn(
              "flex shrink-0 items-center justify-between gap-2 border-b bg-white px-3 py-1.5 sm:px-3.5",
              HAIRLINE,
            )}
          >
            <h2
              className="text-[13px] font-semibold tracking-[-0.02em] text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Recent top-ups
            </h2>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {orders.length.toLocaleString("en-KE")} shown
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && orders.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading airtime…
              </div>
            ) : orders.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">
                  No airtime sold yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Every top-up sold at the till or on your storefront lands here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white">
                {orders.map((o) => (
                  <li
                    key={o.id}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-3.5",
                      o.status === "FAILED" &&
                        "bg-[color-mix(in_srgb,#9a2e16_4%,white)]",
                      o.status === "SUCCESS" &&
                        "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_3%,white)]",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <StatusStamp status={o.status} />
                        <span
                          className="text-[13px] font-semibold tabular-nums tracking-[-0.03em] text-foreground"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {money(o.amount, o.currency || currency)}
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          → {o.phoneNumber}
                          {o.network ? ` · ${o.network}` : ""}
                        </span>
                        <span className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-1 py-px text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
                          {o.channel}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] tabular-nums text-muted-foreground">
                        {fmtWhen(o.requestedAt)}
                        {o.receipt ? ` · ${o.receipt}` : ""}
                      </p>
                      {o.failureReason && o.status === "FAILED" ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#9a2e16]">
                          {o.failureReason}
                        </p>
                      ) : null}
                    </div>
                    {o.status === "SUCCESS" && o.commission > 0 ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
                        <Sparkles className="size-3" aria-hidden />+
                        {money(o.commission, o.currency || currency)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
