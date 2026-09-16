"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Loader2,
  RefreshCw,
  Settings2,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  fetchAirtimeOrders,
  fetchAirtimeStorefrontSummary,
  type AirtimeOrderRecord,
  type AirtimeStorefrontSummaryRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { formatKenyanPhoneDisplay } from "@/lib/kenyan-phone";
import { hasPermission, Permission } from "@/lib/permissions";
import { getRealtimeClient } from "@/lib/realtime";
import { cn } from "@/lib/utils";

type Filter = "all" | "sent" | "waiting" | "failed";

const NAIROBI = "Africa/Nairobi";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PAPER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]";
const ROSTER =
  "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]";

const SEGMENT =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-none px-2.5 text-[11px] font-semibold tracking-[-0.02em] tabular-nums transition-colors duration-150";
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

function nairobiDayKey(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: NAIROBI });
}

function nairobiDayLabel(key: string): string {
  if (!key) return "—";
  const today = nairobiDayKey(new Date().toISOString());
  if (key === today) return "Today";
  const d = new Date(`${key}T12:00:00+03:00`);
  return d.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: NAIROBI,
  });
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: NAIROBI,
  });
}

function isWaiting(status: string) {
  return (
    status === "AWAITING_PAYMENT" ||
    status === "REQUESTED" ||
    status === "SUBMITTED" ||
    status === "PENDING"
  );
}

function matchesFilter(status: string, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "sent") return status === "SUCCESS";
  if (filter === "failed") return status === "FAILED";
  return isWaiting(status);
}

const NETWORK_MARK: Record<string, { label: string; className: string }> = {
  SAFARICOM: { label: "Saf", className: "bg-[#00A651]" },
  AIRTEL: { label: "Air", className: "bg-[#ED1C24]" },
  TELKOM: { label: "Tel", className: "bg-[#0054A6]" },
  EQUITEL: { label: "Eq", className: "bg-[#FDB913]" },
  JTL: { label: "Faiba", className: "bg-[#FF6600]" },
};

function NetworkMark({ network }: { network: string | null }) {
  const key = (network ?? "").trim().toUpperCase();
  const mark = NETWORK_MARK[key];
  if (!mark) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="size-1.5 rounded-none bg-muted-foreground/40" aria-hidden />
        Line
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground">
      <span className={cn("size-1.5 rounded-none", mark.className)} aria-hidden />
      {mark.label}
    </span>
  );
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

type DayGroup = {
  key: string;
  sold: number;
  earned: number;
  count: number;
  rows: AirtimeOrderRecord[];
};

/**
 * Storefront airtime statement: every shop top-up, the face value, and the
 * commission kept. Reads like the M-Pesa history a Kenyan shop already lives in.
 */
export function OnlineAirtimePage() {
  const { me, business } = useDashboard();
  const canRead =
    hasPermission(me?.permissions, Permission.AirtimeRead) ||
    hasPermission(me?.permissions, Permission.AirtimeSell);
  const currencyFallback = business?.currency?.trim() || "KES";

  const [summary, setSummary] = useState<AirtimeStorefrontSummaryRecord | null>(null);
  const [orders, setOrders] = useState<AirtimeOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const reload = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [nextSummary, rows] = await Promise.all([
        fetchAirtimeStorefrontSummary().catch(() => null),
        fetchAirtimeOrders(200, "STOREFRONT").catch(() => []),
      ]);
      if (nextSummary) setSummary(nextSummary);
      setOrders(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load online airtime.");
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
    const unregister = client.registerListener("online-airtime", {
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

  const currency = summary?.currency || currencyFallback;
  const waitingCount =
    (summary?.awaitingPaymentCount ?? 0) + (summary?.inFlightCount ?? 0);

  const visible = useMemo(
    () => orders.filter((o) => matchesFilter(o.status, filter)),
    [orders, filter],
  );

  const days = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();
    for (const o of visible) {
      const key = nairobiDayKey(o.completedAt || o.requestedAt);
      let group = map.get(key);
      if (!group) {
        group = { key, sold: 0, earned: 0, count: 0, rows: [] };
        map.set(key, group);
      }
      group.rows.push(o);
      group.count += 1;
      if (o.status === "SUCCESS") {
        group.sold += o.amount;
        group.earned += o.commission;
      }
    }
    return [...map.values()];
  }, [visible]);

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Online airtime"
        description="You need airtime access to see shop top-ups and commission."
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
              <Smartphone className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1
                className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Online airtime
              </h1>
              <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
                Shop top-ups · commission kept
                {summary?.commissionPercent
                  ? ` · you keep ${summary.commissionPercent}%`
                  : ""}
              </p>
            </div>
          </div>

          <span
            aria-hidden
            className="hidden h-3.5 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
          />

          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className="text-[15px] font-semibold tabular-nums tracking-[-0.03em] text-[var(--pos-primary,#0f766e)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {loading && !summary ? "—" : money(summary?.todayCommission, currency)}
            </span>
            <span className="text-[11px] text-muted-foreground">earned today</span>
            {summary && summary.successCount > 0 ? (
              <span className="text-[11px] text-muted-foreground">
                · all time{" "}
                <span className="font-semibold text-[var(--pos-primary,#0f766e)]">
                  {money(summary.commissionEarned, currency)}
                </span>
              </span>
            ) : null}
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
            <Link href={APP_ROUTES.airtime}>Till</Link>
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
          "flex min-h-0 flex-1 flex-col overflow-hidden border",
          HAIRLINE,
          PAPER,
          "lg:h-[min(80dvh,52rem)]",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center gap-1.5 border-b bg-white px-2.5 py-1.5 sm:px-3",
            HAIRLINE,
          )}
        >
          <div
            role="group"
            aria-label="Filter online airtime"
            className={cn("inline-flex flex-wrap border bg-white p-0.5", HAIRLINE)}
          >
            {(
              [
                [
                  "all",
                  "All",
                  (summary?.successCount ?? 0) +
                    waitingCount +
                    (summary?.failedCount ?? 0),
                ],
                ["sent", "Sent", summary?.successCount ?? 0],
                ["waiting", "Waiting", waitingCount],
                ["failed", "Failed", summary?.failedCount ?? 0],
              ] as const
            ).map(([id, label, count]) => {
              const active = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(id)}
                  className={cn(
                    SEGMENT,
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
                    active
                      ? id === "failed"
                        ? "bg-[#9a2e16] text-white"
                        : SEGMENT_ACTIVE
                      : SEGMENT_IDLE,
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      "font-mono text-[10px]",
                      active ? "text-white/85" : "opacity-70",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="ml-auto text-[11px] tabular-nums text-muted-foreground">
            {summary?.todaySuccessCount ?? 0} sent today ·{" "}
            {money(summary?.todaySuccessAmount, currency)} sold
          </p>
        </div>

        <div className={cn("min-h-0 flex-1 overflow-y-auto", ROSTER)}>
          {loading && orders.length === 0 ? (
            <div className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 px-3 py-3 sm:px-3.5"
                >
                  <div className="space-y-1.5">
                    <div className="h-3 w-40 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]" />
                    <div className="h-2.5 w-24 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]" />
                  </div>
                  <div className="h-4 w-20 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]" />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <span className="mx-auto inline-flex size-10 items-center justify-center border bg-[var(--pos-primary,#0f766e)] text-white">
                <Smartphone className="size-4" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-medium text-foreground">
                No shop airtime yet
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                When a shopper buys airtime on your shop or in the app, the top-up
                and the commission you kept land here.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 h-8 rounded-none shadow-none"
                asChild
              >
                <Link href={`${APP_ROUTES.paymentsSettings}#airtime`}>
                  Turn on shop airtime
                </Link>
              </Button>
            </div>
          ) : visible.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">
                Nothing in this filter
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                The latest {orders.length} shop top-ups don&apos;t match.
              </p>
            </div>
          ) : (
            <section className="bg-white">
              <div
                className={cn(
                  "hidden grid-cols-[4.5rem_minmax(0,1fr)_7.5rem_8.5rem] gap-3 border-b bg-transparent px-3.5 py-2 text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground sm:grid",
                  HAIRLINE,
                )}
              >
                <span>When</span>
                <span>Sent to</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Commission</span>
              </div>
              {days.map((day) => (
                <div key={day.key || "unknown"}>
                  <div
                    className={cn(
                      "flex items-baseline justify-between gap-3 border-b px-3 py-1.5 sm:px-3.5",
                      HAIRLINE,
                      ROSTER,
                    )}
                  >
                    <p className="text-[11px] font-semibold text-foreground">
                      {nairobiDayLabel(day.key)}
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        {day.count} {day.count === 1 ? "top-up" : "top-ups"}
                      </span>
                    </p>
                    {day.earned > 0 ? (
                      <p className="text-[11px] tabular-nums text-muted-foreground">
                        {money(day.sold, currency)}
                        <span className="ml-2 font-semibold text-[var(--pos-primary,#0f766e)]">
                          +{money(day.earned, currency)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
                    {day.rows.map((o) => {
                      const phone =
                        formatKenyanPhoneDisplay(o.phoneNumber) || o.phoneNumber;
                      const payer =
                        o.payerPhone &&
                        o.payerPhone.replace(/\D/g, "") !==
                          o.phoneNumber.replace(/\D/g, "")
                          ? formatKenyanPhoneDisplay(o.payerPhone) || o.payerPhone
                          : null;
                      const earned =
                        o.status === "SUCCESS" && o.commission > 0
                          ? `+${money(o.commission, o.currency || currency)}`
                          : o.status === "FAILED"
                            ? "—"
                            : "…";
                      return (
                        <li
                          key={o.id}
                          className={cn(
                            "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_7.5rem_8.5rem] sm:gap-3 sm:px-3.5",
                            o.status === "FAILED" &&
                              "bg-[color-mix(in_srgb,#9a2e16_4%,white)]",
                            o.status === "SUCCESS" &&
                              "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_3%,white)]",
                          )}
                        >
                          <span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:block">
                            {fmtTime(o.completedAt || o.requestedAt)}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <StatusStamp status={o.status} />
                              <NetworkMark network={o.network} />
                              <span className="truncate font-medium tabular-nums text-foreground">
                                {phone}
                              </span>
                            </div>
                            {payer || o.receipt ? (
                              <p className="mt-0.5 truncate text-[10px] tabular-nums text-muted-foreground">
                                <span className="sm:hidden">
                                  {fmtTime(o.completedAt || o.requestedAt)} ·{" "}
                                </span>
                                {payer ? `Paid by ${payer}` : null}
                                {payer && o.receipt ? " · " : null}
                                {o.receipt}
                              </p>
                            ) : (
                              <p className="mt-0.5 truncate text-[10px] tabular-nums text-muted-foreground sm:hidden">
                                {fmtTime(o.completedAt || o.requestedAt)}
                              </p>
                            )}
                            {o.failureReason && o.status === "FAILED" ? (
                              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#9a2e16]">
                                {o.failureReason}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end sm:contents">
                            <span
                              className="text-[13px] font-semibold tabular-nums tracking-[-0.03em] text-foreground sm:text-right"
                              style={{ fontFamily: "var(--font-heading)" }}
                            >
                              {money(o.amount, o.currency || currency)}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center justify-end gap-1 text-[11px] font-semibold tabular-nums sm:min-w-0 sm:text-xs",
                                o.status === "SUCCESS" && o.commission > 0
                                  ? "text-[var(--pos-primary,#0f766e)]"
                                  : "text-muted-foreground",
                              )}
                            >
                              {o.status === "SUCCESS" && o.commission > 0 ? (
                                <Sparkles className="size-3" aria-hidden />
                              ) : null}
                              {earned}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </div>

        {orders.length > 0 &&
        summary &&
        orders.length <
          summary.successCount + waitingCount + summary.failedCount ? (
          <p
            className={cn(
              "shrink-0 border-t bg-white px-3 py-1.5 text-[11px] text-muted-foreground",
              HAIRLINE,
            )}
          >
            Showing the latest {orders.length} shop top-ups.
          </p>
        ) : null}
      </div>
    </div>
  );
}
