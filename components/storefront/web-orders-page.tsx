"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Package,
  PhoneCall,
  Printer,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import {
  salesHair,
  salesHairDivide,
  salesInk,
  salesMute,
  salesPaper,
  SalesPeriodChip,
  SalesStage,
  salesToolBtnClass,
} from "@/components/sales/sales-surface";
import { WebOrderFulfillmentActions } from "@/components/storefront/web-order-fulfillment-actions";
import { WebOrderShipmentCard } from "@/components/storefront/web-order-shipment-card";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useFeatureFlags } from "@/components/providers/tenant-provider";
import {
  fetchWebOrderDetail,
  fetchWebOrders,
  type WebOrderDetail,
  type WebOrderSummary,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import {
  DESKTOP_THERMAL_WIDTH_MM,
  printWebOrderReceipt,
} from "@/lib/desktop-print";
import { hasPermission, Permission } from "@/lib/permissions";
import { getRealtimeClient, type RealtimeFrame } from "@/lib/realtime";
import { normalizeWhatsApp } from "@/lib/whatsapp-order";
import {
  isDoorstepOrder,
  isWhatsAppWebOrder,
  orderCodeOf,
  orderMatchesCode,
  orderStatusLine,
  whatsAppChatHref,
  type OrderTone,
} from "@/lib/web-order-desk";
import { cn } from "@/lib/utils";

const OPEN_FULFILLMENT = new Set([
  "awaiting_confirmation",
  "confirmed",
  "dispatched",
]);

const STOREFRONT_ORDER_TYPES = new Set([
  "storefront.order.placed",
  "storefront.order.paid",
]);

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function fmtMoney(n: number | string, currency: string): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currency || "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toNum(n));
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Chat not confirmed" hint (§12): opened long ago but nothing moved, or expired. */
function whatsAppHint(
  detail: WebOrderDetail | null,
): { tone: "stale" | "expired"; text: string } | null {
  if (!detail) return null;
  if (!isWhatsAppWebOrder(detail)) return null;
  const fulfillment = (detail.fulfillmentStatus ?? "").trim().toLowerCase();
  const unconfirmed = !fulfillment || fulfillment === "awaiting_confirmation";
  if (!unconfirmed) return null;
  const now = Date.now();
  const expired =
    detail.handoffState === "expired" ||
    (detail.expiresAt ? new Date(detail.expiresAt).getTime() <= now : false);
  if (expired) {
    return {
      tone: "expired",
      text: "This order was never confirmed, so its stock reservation was released. Collect payment, then confirm it to reserve again.",
    };
  }
  const openedAt = detail.handoffOpenedAt
    ? new Date(detail.handoffOpenedAt).getTime()
    : null;
  if (openedAt && now - openedAt >= 60 * 60 * 1000) {
    return {
      tone: "stale",
      text: "The shopper opened WhatsApp but may not have sent it. Worth a call.",
    };
  }
  return null;
}

function isOpenOrder(order: WebOrderSummary): boolean {
  const fulfillment = (order.fulfillmentStatus ?? "awaiting_confirmation")
    .trim()
    .toLowerCase();
  if (fulfillment === "completed") return false;
  if (OPEN_FULFILLMENT.has(fulfillment)) return true;
  return (order.status ?? "").toLowerCase() !== "cancelled";
}

function StatusPill({
  tone,
  children,
}: {
  tone: OrderTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
        tone === "amber" && "bg-amber-500/15 text-amber-900 dark:text-amber-200",
        tone === "emerald" &&
          "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
        tone === "blue" && "bg-sky-500/15 text-sky-900 dark:text-sky-200",
        tone === "rose" && "bg-rose-500/15 text-rose-900 dark:text-rose-200",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function notificationType(frame: RealtimeFrame): string {
  const data = frame.data as Record<string, unknown>;
  return typeof data.notificationType === "string"
    ? data.notificationType
    : "";
}

/** Open orders only a merchant can move on — used to flag the row. */
function needsMerchantAction(order: WebOrderSummary): boolean {
  if ((order.status ?? "").toLowerCase() === "cancelled") return false;
  if (order.status !== "paid") return true;
  const f = (order.fulfillmentStatus ?? "awaiting_confirmation").toLowerCase();
  return f === "awaiting_confirmation" || f === "confirmed";
}

/** Compact lifecycle: Placed → Paid → Confirmed → Ready/Dispatched → Complete. */
function OrderLifecycle({
  status,
  fulfillmentStatus,
  isDelivery,
}: {
  status: string;
  fulfillmentStatus?: string | null;
  isDelivery: boolean;
}) {
  if ((status ?? "").toLowerCase() === "cancelled") {
    return <StatusPill tone="muted">Cancelled</StatusPill>;
  }
  const paid = status === "paid";
  const f = (fulfillmentStatus ?? "").toLowerCase();
  const confirmed =
    paid && (f === "confirmed" || f === "dispatched" || f === "completed");
  const dispatched = paid && (f === "dispatched" || f === "completed");
  const completed = paid && f === "completed";
  const reached = [true, paid, confirmed, dispatched, completed];
  const current = reached.lastIndexOf(true);
  const stages = isDelivery
    ? ["Placed", "Paid", "Confirmed", "Dispatched", "Delivered"]
    : ["Placed", "Paid", "Confirmed", "Ready", "Complete"];
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {stages.map((stage, i) => {
        const done = reached[i] && i !== current;
        const active = i === current;
        return (
          <li key={stage} className="flex items-center gap-1.5">
            {i > 0 ? (
              <span
                aria-hidden
                className="h-px w-3 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
              />
            ) : null}
            {done ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                <Check className="size-3" aria-hidden />
                {stage}
              </span>
            ) : active ? (
              <StatusPill tone={i === reached.length - 1 ? "emerald" : "blue"}>
                {stage}
              </StatusPill>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {stage}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function WebOrdersPage() {
  const { me, business, branchId, loading: sessionLoading } = useDashboard();
  const featureFlags = useFeatureFlags();
  // Match nav gate: shop is on unless explicitly disabled.
  const shopEnabled = featureFlags.shop !== false;
  const searchParams = useSearchParams();
  const subscriptionId = useId();

  const canRead = hasPermission(
    me?.permissions,
    Permission.StorefrontOrdersRead,
  );
  const canInbox = hasPermission(me?.permissions, Permission.CrmInboxRead);
  const currency = business?.currency?.trim() || "KES";

  const [orders, setOrders] = useState<WebOrderSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WebOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"open" | "all">("open");
  const [channelTab, setChannelTab] = useState<"all" | "whatsapp">("all");
  const [codeMiss, setCodeMiss] = useState<string | null>(null);
  const [detailTick, setDetailTick] = useState(0);
  const dismissedCode = useRef<string | null>(null);
  const quietDetailRefresh = useRef(false);

  const deepLinkId = searchParams.get("orderId")?.trim() || null;
  // Support deep links by short code (`?q=43A175DD`) as well as by id — the
  // support chat and AI guide order cards link with `?q=<orderCode>`.
  const deepLinkCode = searchParams.get("q")?.trim() || null;

  const loadOrders = useCallback(async (opts?: { soft?: boolean }) => {
    if (!canRead) return;
    if (opts?.soft) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const rows = await fetchWebOrders(0, 100);
      setOrders(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load web orders.");
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canRead]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (deepLinkId) {
      setSelectedId(deepLinkId);
      setTab("all");
      setChannelTab("all");
      setCodeMiss(null);
      return;
    }
    if (!deepLinkCode || loading) return;
    if (dismissedCode.current === deepLinkCode) return;
    const match = orders.find((order) => orderMatchesCode(order, deepLinkCode));
    if (!match) {
      setCodeMiss(orders.length > 0 ? deepLinkCode : null);
      return;
    }
    setCodeMiss(null);
    setSelectedId(match.id);
    setTab("all");
    setChannelTab("all");
  }, [deepLinkId, deepLinkCode, orders, loading]);

  useEffect(() => {
    if (!canRead) return;

    const client = getRealtimeClient();
    const unregister = client.registerListener(subscriptionId, {
      channels: ["notifications"],
      onNotification: (frame) => {
        if (frame.type !== "notification.created") return;
        if (frame.delivery === "poll") return;
        if (!STOREFRONT_ORDER_TYPES.has(notificationType(frame))) return;
        void loadOrders({ soft: true });
        quietDetailRefresh.current = true;
        setDetailTick((tick) => tick + 1);
      },
    });
    client.connect().catch(() => {});
    return unregister;
  }, [canRead, loadOrders, subscriptionId]);

  useEffect(() => {
    if (!selectedId || !canRead) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    const silent = quietDetailRefresh.current;
    quietDetailRefresh.current = false;
    if (!silent) setDetailLoading(true);
    void fetchWebOrderDetail(selectedId)
      .then((next) => {
        if (!cancelled) setDetail(next);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, canRead, detailTick]);

  const scopedOrders = useMemo(() => {
    const scope = branchId?.trim();
    if (!scope) return orders;
    return orders.filter((o) => o.catalogBranchId === scope);
  }, [orders, branchId]);

  const visibleOrders = useMemo(() => {
    let rows = tab === "open" ? scopedOrders.filter(isOpenOrder) : scopedOrders;
    if (channelTab === "whatsapp") {
      rows = rows.filter((o) => o.channel === "WHATSAPP");
    }
    return [...rows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [scopedOrders, tab, channelTab]);

  const openCount = useMemo(
    () => scopedOrders.filter(isOpenOrder).length,
    [scopedOrders],
  );

  const waCount = useMemo(
    () => scopedOrders.filter((o) => o.channel === "WHATSAPP").length,
    [scopedOrders],
  );

  const onDetailUpdated = useCallback((next: WebOrderDetail) => {
    setDetail(next);
    setOrders((prev) =>
      prev.map((row) =>
        row.id === next.id
          ? {
              ...row,
              status: next.status,
              fulfillmentStatus: next.fulfillmentStatus,
              grandTotal: next.grandTotal,
            }
          : row,
      ),
    );
  }, []);

  const printTicket = useCallback(async () => {
    if (!selectedId) return;
    setPrinting(true);
    try {
      await printWebOrderReceipt(selectedId, DESKTOP_THERMAL_WIDTH_MM, {
        branchId: detail?.catalogBranchId ?? branchId ?? null,
      });
    } finally {
      setPrinting(false);
    }
  }, [selectedId, detail?.catalogBranchId, branchId]);

  if (sessionLoading) return null;

  if (!shopEnabled) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardAccessDenied
          title="Online storefront is off"
          description="Turn on the shop feature to accept and manage web orders."
          backHref={APP_ROUTES.businessSettings}
          backLabel="Business settings"
        />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardAccessDenied
          title="Web orders"
          description="You don’t have permission to view storefront pickup orders."
          backHref={APP_ROUTES.business}
          backLabel="Back to business"
        />
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX, salesPaper, "flex flex-col gap-2")}>
      <DashboardPageHero
        icon={ShoppingBag}
        eyebrow="Storefront"
        title="Online orders"
        description="Storefront and WhatsApp orders for packing, pickup, or delivery."
        showActiveScope
        compact
      />

      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {codeMiss ? (
        <DashboardFeedback
          kind="error"
          text={`No order #${codeMiss} in this list.`}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Order list filter"
          className="flex flex-wrap items-center gap-1.5"
        >
          {(
            [
              { id: "open", label: `Open (${openCount})` },
              { id: "all", label: `All (${scopedOrders.length})` },
            ] as const
          ).map((t) => (
            <SalesPeriodChip
              key={t.id}
              active={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </SalesPeriodChip>
          ))}
          {waCount > 0 ? (
            <button
              key="whatsapp"
              type="button"
              onClick={() =>
                setChannelTab(channelTab === "whatsapp" ? "all" : "whatsapp")
              }
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold tracking-[-0.01em] transition-colors",
                channelTab === "whatsapp"
                  ? "bg-[#128C4A] text-white"
                  : cn(
                      "border bg-white",
                      salesHair,
                      "text-[#128C4A] hover:bg-[#25D366]/10",
                    ),
              )}
              aria-pressed={channelTab === "whatsapp"}
            >
              <MessageCircle className="size-3" aria-hidden />
              WhatsApp ({waCount})
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className={cn(salesToolBtnClass(), "gap-1.5")}
          disabled={refreshing || loading}
          onClick={() => void loadOrders({ soft: true })}
        >
          {refreshing ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SalesStage
          title="Orders"
          hint="Newest first · select a row for details"
          className={cn(selectedId && "max-lg:hidden")}
          bodyClassName="p-0"
        >
          {loading ? (
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-10 text-sm sm:px-5",
                salesMute,
              )}
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading orders…
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="px-4 py-10 sm:px-5">
              <p className={cn("text-sm font-medium", salesInk)}>No orders yet</p>
              <p className={cn("mt-1 text-xs", salesMute)}>
                New storefront checkouts will show up here live.
              </p>
            </div>
          ) : (
            <ul className={cn("divide-y", salesHairDivide)}>
              {visibleOrders.map((order) => {
                const selected = order.id === selectedId;
                const badge = orderStatusLine(order);
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(order.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors sm:px-5",
                        selected
                          ? "bg-[#0f766e]/8"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {needsMerchantAction(order) ? (
                            <span
                              role="img"
                              aria-label="Needs your action"
                              title="Needs your action"
                              className="size-1.5 shrink-0 rounded-full bg-[#0f766e]"
                            />
                          ) : null}
                          <p
                            className={cn(
                              "truncate text-sm font-semibold",
                              salesInk,
                            )}
                          >
                            {order.customerName?.trim() || "Customer"}
                          </p>
                          <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
                          {order.channel === "WHATSAPP" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/15 px-2 py-0.5 text-[11px] font-semibold text-[#128C4A]">
                              <MessageCircle className="size-3" aria-hidden />
                              WhatsApp
                            </span>
                          ) : null}
                        </div>
                        <p className={cn("mt-1 truncate text-xs", salesMute)}>
                          {order.customerPhone || "—"} ·{" "}
                          {order.catalogBranchName || "Branch"} · #
                          {orderCodeOf(order)}
                        </p>
                        <p className={cn("mt-0.5 text-[11px]", salesMute)}>
                          {formatWhen(order.createdAt)}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          salesInk,
                        )}
                      >
                        {fmtMoney(order.grandTotal, order.currency || currency)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SalesStage>

        <SalesStage
          title={detail ? orderStatusLine(detail).label : "Order"}
          hint={detail ? `#${orderCodeOf(detail)}` : "Select an order"}
          className={cn(
            !selectedId && "max-lg:hidden",
            "lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5.5rem)] lg:self-start lg:overflow-y-auto",
          )}
          action={
            selectedId ? (
              <button
                type="button"
                className={cn(salesToolBtnClass(), "gap-1.5")}
                disabled={printing}
                onClick={() => void printTicket()}
              >
                {printing ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Printer className="size-3.5" aria-hidden />
                )}
                Print
              </button>
            ) : null
          }
          bodyClassName="space-y-4"
        >
          {selectedId ? (
            <button
              type="button"
              className="mb-1 text-xs font-semibold text-[var(--pos-primary,#0f766e)] lg:hidden"
              onClick={() => {
                if (deepLinkCode) dismissedCode.current = deepLinkCode;
                setSelectedId(null);
              }}
            >
              Back to orders
            </button>
          ) : null}

          {!selectedId ? (
            <div className="flex flex-col items-start gap-2 py-6">
              <Package className={cn("size-5", salesMute)} aria-hidden />
              <p className={cn("text-sm", salesMute)}>
                Select an order to review and act on it.
              </p>
            </div>
          ) : detailLoading ? (
            <div
              className={cn(
                "flex items-center gap-2 py-10 text-sm",
                salesMute,
              )}
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading detail…
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-start gap-3 py-6">
              <p className={cn("text-sm", salesMute)}>
                Could not load this order.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => setDetailTick((tick) => tick + 1)}
              >
                Try again
              </Button>
            </div>
          ) : (
            <>
              <div>
                <p className={cn("text-base font-semibold", salesInk)}>
                  {detail.customerName?.trim() || "Customer"}
                </p>
                <p className={cn("mt-1 text-xs", salesMute)}>
                  {detail.customerPhone || "—"}
                  {detail.customerEmail ? ` · ${detail.customerEmail}` : ""}
                </p>
                <p className={cn("mt-1 text-xs", salesMute)}>
                  {detail.catalogBranchName} · {formatWhen(detail.createdAt)} · #
                  {orderCodeOf(detail)}
                </p>
                {(() => {
                  const digits = normalizeWhatsApp(detail.customerPhone);
                  if (!digits) return null;
                  return (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={whatsAppChatHref(
                          detail.customerPhone,
                          detail.customerName,
                          orderCodeOf(detail),
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#25D366]/15 px-3 text-xs font-semibold text-[#128C4A] transition-colors hover:bg-[#25D366]/25"
                      >
                        <MessageCircle className="size-3.5" aria-hidden />
                        Message on WhatsApp
                      </a>
                      {canInbox ? (
                        <Link
                          href={`${APP_ROUTES.inbox}?phone=${encodeURIComponent(digits)}`}
                          className={cn(
                            "inline-flex h-9 items-center gap-1.5 rounded-xl border bg-white px-3 text-xs font-semibold transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]",
                            salesHair,
                            salesInk,
                          )}
                        >
                          <MessagesSquare className="size-3.5" aria-hidden />
                          Inbox
                        </Link>
                      ) : null}
                    </div>
                  );
                })()}
                {(() => {
                  const hint = whatsAppHint(detail);
                  if (!hint) return null;
                  return (
                    <p
                      className={cn(
                        "mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed",
                        hint.tone === "expired"
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-sky-200 bg-sky-50 text-sky-900",
                      )}
                    >
                      <PhoneCall className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      {hint.text}
                    </p>
                  );
                })()}
              </div>

              <WebOrderFulfillmentActions
                order={detail}
                onUpdated={onDetailUpdated}
              />

              <OrderLifecycle
                status={detail.status}
                fulfillmentStatus={detail.fulfillmentStatus}
                isDelivery={isDoorstepOrder(detail)}
              />

              <WebOrderShipmentCard order={detail} onUpdated={onDetailUpdated} />

              <ul
                className={cn(
                  "divide-y overflow-hidden rounded-xl ring-1 ring-black/[0.05]",
                  salesHairDivide,
                )}
              >
                {detail.lines.map((line) => (
                  <li
                    key={`${line.itemId}-${line.lineIndex}`}
                    className="flex items-start justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {line.itemName}
                        {line.variantName ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {line.variantName}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        ×{toNum(line.quantity)} ·{" "}
                        {fmtMoney(line.unitPrice, detail.currency || currency)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {fmtMoney(line.lineTotal, detail.currency || currency)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className={cn("flex items-center justify-between border-t pt-3", salesHair)}>
                <span className={cn("text-xs font-semibold tracking-[-0.02em]", salesMute)}>
                  Total
                </span>
                <p className={cn("text-lg font-semibold tabular-nums", salesInk)}>
                  {fmtMoney(detail.grandTotal, detail.currency || currency)}
                </p>
              </div>

              {detail.notes?.trim() ? (
                <div
                  className={cn(
                    "rounded-xl bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] px-3 py-2 ring-1 ring-black/[0.05]",
                  )}
                >
                  <p className={cn("text-[11px] font-semibold tracking-[-0.02em]", salesMute)}>
                    Notes
                  </p>
                  <p className={cn("mt-1 text-sm", salesInk)}>{detail.notes}</p>
                </div>
              ) : null}
            </>
          )}
        </SalesStage>
      </div>
    </div>
  );
}
