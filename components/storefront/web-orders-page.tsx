"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  MessageCircle,
  Package,
  PhoneCall,
  Printer,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { WebOrderFulfillmentActions } from "@/components/storefront/web-order-fulfillment-actions";
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
import { cartOrderCode, normalizeWhatsApp } from "@/lib/whatsapp-order";
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

function shortId(id: string): string {
  const t = id.trim();
  if (t.length <= 8) return t.toUpperCase();
  return t.slice(-8).toUpperCase();
}

/** V1 channel marker lives in order notes (scope D5). */
function isWhatsAppOrder(notes: string | null | undefined): boolean {
  return (notes ?? "").toLowerCase().includes("channel: whatsapp");
}

/** One-tap merchant reply — the highest-value affordance in this feature (§12). */
function waReplyHref(
  phone: string,
  name: string | null | undefined,
  orderId: string,
  grandTotal: number | string,
  currency: string,
): string {
  const digits = normalizeWhatsApp(phone);
  if (!digits) return "https://wa.me/";
  const text = `Hi ${(name ?? "").trim() || "there"}, thanks for order ${cartOrderCode(orderId)}. Everything is available — total ${fmtMoney(grandTotal, currency || "KES")}. Pay by …`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** "Chat not confirmed" hint (§12): opened long ago but nothing moved, or expired. */
function whatsAppHint(
  detail: WebOrderDetail | null,
): { tone: "stale" | "expired"; text: string } | null {
  if (!detail) return null;
  const isWa =
    detail.channel === "WHATSAPP" ||
    (detail.notes ?? "").toLowerCase().includes("channel: whatsapp");
  if (!isWa) return null;
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
      text: "This order was never confirmed — its stock reservation was released. Confirm it to reserve again, or call the shopper.",
    };
  }
  const openedAt = detail.handoffOpenedAt
    ? new Date(detail.handoffOpenedAt).getTime()
    : null;
  if (openedAt && now - openedAt >= 60 * 60 * 1000) {
    return {
      tone: "stale",
      text: "The shopper opened WhatsApp but may not have sent it — worth a call.",
    };
  }
  return null;
}

function labelStatus(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "—";
  return s.replace(/_/g, " ");
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
  tone: "amber" | "emerald" | "muted" | "blue";
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
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function paymentTone(
  status: string,
): "amber" | "emerald" | "muted" | "blue" {
  const s = status.toLowerCase();
  if (s === "paid") return "emerald";
  if (s === "pending" || s === "awaiting_payment") return "amber";
  if (s === "cancelled" || s === "failed") return "muted";
  return "blue";
}

function fulfillmentTone(
  status: string,
): "amber" | "emerald" | "muted" | "blue" {
  const s = status.toLowerCase();
  if (s === "completed") return "emerald";
  if (s === "dispatched") return "blue";
  if (s === "confirmed") return "blue";
  if (s === "awaiting_confirmation") return "amber";
  return "muted";
}

function notificationType(frame: RealtimeFrame): string {
  const data = frame.data as Record<string, unknown>;
  return typeof data.notificationType === "string"
    ? data.notificationType
    : "";
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

  const deepLinkId = searchParams.get("orderId")?.trim() || null;

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
    }
  }, [deepLinkId]);

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
    setDetailLoading(true);
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
  }, [selectedId, canRead]);

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
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        icon={ShoppingBag}
        eyebrow="Storefront"
        title="Pickup orders (web)"
        description="Incoming online orders for packing and counter pickup."
        showActiveScope
        compact
      />

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "open", label: `Open (${openCount})` },
              { id: "all", label: `All (${scopedOrders.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                tab === t.id
                  ? "border-[#B08D48] bg-[#B08D48]/10 text-[#8A6B2E]"
                  : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
          {waCount > 0 ? (
            <button
              key="whatsapp"
              type="button"
              onClick={() => setChannelTab(channelTab === "whatsapp" ? "all" : "whatsapp")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                channelTab === "whatsapp"
                  ? "border-[#128C4A] bg-[#25D366]/15 text-[#128C4A]"
                  : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
              )}
              aria-pressed={channelTab === "whatsapp"}
            >
              <MessageCircle className="size-3" aria-hidden />
              WhatsApp ({waCount})
            </button>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={refreshing || loading}
          onClick={() => void loadOrders({ soft: true })}
        >
          {refreshing ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className={DASHBOARD_TABLE_SURFACE}>
          <div className={DASHBOARD_TABLE_HEAD}>
            <p className="text-sm font-semibold text-foreground">Orders</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Newest first · select a row for details
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading orders…
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="px-5 py-10">
              <p className="text-sm font-medium text-foreground">No orders yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                New storefront checkouts will show up here live.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {visibleOrders.map((order) => {
                const selected = order.id === selectedId;
                const fulfillment =
                  order.fulfillmentStatus ?? "awaiting_confirmation";
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(order.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors sm:px-5",
                        selected
                          ? "bg-[#B08D48]/8"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {order.customerName?.trim() || "Customer"}
                          </p>
                          <StatusPill tone={paymentTone(order.status)}>
                            {labelStatus(order.status)}
                          </StatusPill>
                          <StatusPill tone={fulfillmentTone(fulfillment)}>
                            {labelStatus(fulfillment)}
                          </StatusPill>
                          {order.channel === "WHATSAPP" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/15 px-2 py-0.5 text-[11px] font-semibold text-[#128C4A]">
                              <MessageCircle className="size-3" aria-hidden />
                              WhatsApp
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {order.customerPhone || "—"} ·{" "}
                          {order.catalogBranchName || "Branch"} · #
                          {order.orderCode ?? shortId(order.id)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatWhen(order.createdAt)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {fmtMoney(order.grandTotal, order.currency || currency)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className={DASHBOARD_TABLE_SURFACE}>
          <div className={DASHBOARD_TABLE_HEAD}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Order detail
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Lines, notes, and fulfillment
                </p>
              </div>
              {selectedId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={printing}
                  onClick={() => void printTicket()}
                >
                  {printing ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Printer className="size-3.5" aria-hidden />
                  )}
                  Print
                </Button>
              ) : null}
            </div>
          </div>

          {!selectedId ? (
            <div className="flex flex-col items-start gap-2 px-5 py-10">
              <Package className="size-5 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Select an order to review items and advance pickup.
              </p>
            </div>
          ) : detailLoading ? (
            <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading detail…
            </div>
          ) : !detail ? (
            <div className="px-5 py-10 text-sm text-muted-foreground">
              Could not load this order.
            </div>
          ) : (
            <div className="space-y-4 px-4 py-4 sm:px-5">
              <div>
                <p className="text-base font-semibold text-foreground">
                  {detail.customerName?.trim() || "Customer"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {detail.customerPhone || "—"}
                  {detail.customerEmail ? ` · ${detail.customerEmail}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {detail.catalogBranchName} · {formatWhen(detail.createdAt)} · #
                  {detail.notes?.toLowerCase().includes("channel: whatsapp")
                    ? cartOrderCode(detail.id)
                    : shortId(detail.id)}
                </p>
                {isWhatsAppOrder(detail.notes) ? (
                  <a
                    href={waReplyHref(detail.customerPhone, detail.customerName, detail.id, detail.grandTotal, detail.currency)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#25D366]/15 px-3 text-xs font-semibold text-[#128C4A] transition-colors hover:bg-[#25D366]/25"
                  >
                    <MessageCircle className="size-3.5" aria-hidden />
                    Reply on WhatsApp
                  </a>
                ) : null}
                {(() => {
                  const hint = whatsAppHint(detail);
                  if (!hint) return null;
                  return (
                    <p
                      className={cn(
                        "mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed",
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

              <div className="flex flex-wrap gap-2">
                <StatusPill tone={paymentTone(detail.status)}>
                  {labelStatus(detail.status)}
                </StatusPill>
                <StatusPill
                  tone={fulfillmentTone(
                    detail.fulfillmentStatus ?? "awaiting_confirmation",
                  )}
                >
                  {labelStatus(
                    detail.fulfillmentStatus ?? "awaiting_confirmation",
                  )}
                </StatusPill>
              </div>

              <WebOrderFulfillmentActions
                order={detail}
                onUpdated={onDetailUpdated}
              />

              <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
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

              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total
                </span>
                <p className="text-lg font-semibold tabular-nums text-foreground">
                  {fmtMoney(detail.grandTotal, detail.currency || currency)}
                </p>
              </div>

              {detail.notes?.trim() ? (
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-1 text-sm text-foreground">{detail.notes}</p>
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
