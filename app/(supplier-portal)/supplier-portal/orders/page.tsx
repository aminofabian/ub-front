"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  Package,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { SupplierPortalTakeOrderWorkspace } from "@/components/supplier-portal/supplier-portal-take-order-workspace";
import {
  spBtnGhost,
  spBtnPrimary,
  spPage,
  spSerifTitle,
} from "@/components/supplier-portal/supplier-portal-ui";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalOrder,
  fetchSupplierPortalOrders,
  respondSupplierPortalOrder,
  shipSupplierPortalOrder,
  type SupplierPortalOrderDetail,
  type SupplierPortalOrderRow,
} from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { cn, formatMoney } from "@/lib/utils";

type LineDraft = {
  purchaseOrderLineId: string;
  supplierLineStatus: string;
  qtyAccepted: string;
  supplierNote: string;
};

type PageMode = "take" | "inbox";

const INK = "#1c1915";
const TEAL = "#0f766e";
const MANGO = "#b9691a";

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function SupplierPortalOrdersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepPoId = searchParams.get("po")?.trim() || null;
  const forceInbox = searchParams.get("inbox") === "1" || Boolean(deepPoId);
  const bootstrappedRef = useRef(false);

  const [mode, setMode] = useState<PageMode>(forceInbox ? "inbox" : "take");
  const [orders, setOrders] = useState<SupplierPortalOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(deepPoId);
  const [detail, setDetail] = useState<SupplierPortalOrderDetail | null>(null);
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trackingNote, setTrackingNote] = useState("");
  const [shopFilterId, setShopFilterId] = useState<string | null>(null);
  const [shopQuery, setShopQuery] = useState("");
  const [orderSearch, setOrderSearch] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchSupplierPortalOrders();
      setOrders(rows);
      return rows;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load orders");
      return [] as SupplierPortalOrderRow[];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
  }, [router]);

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) return;
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    void (async () => {
      const rows = await loadOrders();
      if (forceInbox || rows.length > 0) {
        setMode("inbox");
      }
      if (deepPoId) {
        setSelectedId(deepPoId);
      }
    })();
  }, [deepPoId, forceInbox, loadOrders]);

  useEffect(() => {
    if (mode === "inbox" && !bootstrappedRef.current) return;
    if (mode === "inbox") void loadOrders();
  }, [mode, loadOrders]);

  const shopOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const order of orders) {
      const existing = map.get(order.businessId);
      if (existing) {
        existing.count += 1;
        continue;
      }
      map.set(order.businessId, {
        id: order.businessId,
        name: order.businessName?.trim() || "Shop",
        count: 1,
      });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const filteredShops = useMemo(() => {
    const q = shopQuery.trim().toLowerCase();
    if (!q) return shopOptions;
    return shopOptions.filter((s) => s.name.toLowerCase().includes(q));
  }, [shopOptions, shopQuery]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((order) => {
      if (shopFilterId && order.businessId !== shopFilterId) return false;
      if (!q) return true;
      return (
        order.poNumber.toLowerCase().includes(q) ||
        order.businessName.toLowerCase().includes(q) ||
        order.status.toLowerCase().includes(q)
      );
    });
  }, [orders, shopFilterId, orderSearch]);

  const awaitingCount = useMemo(
    () => filteredOrders.filter((o) => !o.supplierResponseAt).length,
    [filteredOrders],
  );

  const openOrder = useCallback(async (purchaseOrderId: string) => {
    setSelectedId(purchaseOrderId);
    setDetailLoading(true);
    try {
      const row = await fetchSupplierPortalOrder(purchaseOrderId);
      setDetail(row);
      setLineDrafts(
        row.lines.map((line) => ({
          purchaseOrderLineId: line.lineId,
          supplierLineStatus: line.supplierLineStatus ?? "accepted",
          qtyAccepted: String(line.qtyAccepted ?? line.qtyOrdered),
          supplierNote: line.supplierNote ?? "",
        })),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load order");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "inbox" && deepPoId) {
      void openOrder(deepPoId);
    }
  }, [mode, deepPoId, openOrder]);

  const onRespond = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const updated = await respondSupplierPortalOrder(
        selectedId,
        lineDrafts.map((line) => ({
          purchaseOrderLineId: line.purchaseOrderLineId,
          supplierLineStatus: line.supplierLineStatus,
          qtyAccepted:
            line.supplierLineStatus === "rejected"
              ? 0
              : Number(line.qtyAccepted),
          supplierNote: line.supplierNote.trim() || undefined,
        })),
      );
      setDetail(updated);
      toast.success("Response submitted");
      await loadOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Response failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onShip = async (deliveryStatus: "in_transit" | "delivered") => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const updated = await shipSupplierPortalOrder(selectedId, {
        deliveryStatus,
        trackingNote: trackingNote.trim() || undefined,
      });
      setDetail(updated);
      toast.success(
        deliveryStatus === "delivered" ? "Marked as delivered" : "Marked in transit",
      );
      await loadOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SupplierPortalShell>
      <div className={cn(spPage, "space-y-3")}>
        {mode === "take" ? (
          <div className="-mx-4 -my-4 sm:mx-0 sm:my-0">
            <header className="mb-2 hidden sm:block">
              <h2 className={cn(spSerifTitle, "text-2xl sm:text-3xl")}>Take order</h2>
            </header>
            <SupplierPortalTakeOrderWorkspace
              onOpenInbox={() => setMode("inbox")}
              onOrderCreated={(id) => {
                setMode("inbox");
                void openOrder(id);
              }}
            />
          </div>
        ) : (
          <InboxBoard
            shopOptions={shopOptions}
            filteredShops={filteredShops}
            filteredOrders={filteredOrders}
            ordersTotal={orders.length}
            awaitingCount={awaitingCount}
            shopFilterId={shopFilterId}
            shopQuery={shopQuery}
            orderSearch={orderSearch}
            selectedId={selectedId}
            loading={loading}
            detail={detail}
            detailLoading={detailLoading}
            lineDrafts={lineDrafts}
            submitting={submitting}
            trackingNote={trackingNote}
            onShopQuery={setShopQuery}
            onOrderSearch={setOrderSearch}
            onShopFilter={setShopFilterId}
            onOpenOrder={(id) => void openOrder(id)}
            onTake={() => setMode("take")}
            setLineDrafts={setLineDrafts}
            setTrackingNote={setTrackingNote}
            onRespond={() => void onRespond()}
            onShip={(status) => void onShip(status)}
          />
        )}
      </div>
    </SupplierPortalShell>
  );
}

function InboxBoard({
  shopOptions,
  filteredShops,
  filteredOrders,
  ordersTotal,
  awaitingCount,
  shopFilterId,
  shopQuery,
  orderSearch,
  selectedId,
  loading,
  detail,
  detailLoading,
  lineDrafts,
  submitting,
  trackingNote,
  onShopQuery,
  onOrderSearch,
  onShopFilter,
  onOpenOrder,
  onTake,
  setLineDrafts,
  setTrackingNote,
  onRespond,
  onShip,
}: {
  shopOptions: { id: string; name: string; count: number }[];
  filteredShops: { id: string; name: string; count: number }[];
  filteredOrders: SupplierPortalOrderRow[];
  ordersTotal: number;
  awaitingCount: number;
  shopFilterId: string | null;
  shopQuery: string;
  orderSearch: string;
  selectedId: string | null;
  loading: boolean;
  detail: SupplierPortalOrderDetail | null;
  detailLoading: boolean;
  lineDrafts: LineDraft[];
  submitting: boolean;
  trackingNote: string;
  onShopQuery: (v: string) => void;
  onOrderSearch: (v: string) => void;
  onShopFilter: (id: string | null) => void;
  onOpenOrder: (id: string) => void;
  onTake: () => void;
  setLineDrafts: Dispatch<SetStateAction<LineDraft[]>>;
  setTrackingNote: (v: string) => void;
  onRespond: () => void;
  onShip: (status: "in_transit" | "delivered") => void;
}) {
  return (
    <div
      className="flex flex-col gap-3"
      style={
        {
          ["--pos-primary" as string]: TEAL,
          ["--inbox-ink" as string]: INK,
          ["--inbox-mango" as string]: MANGO,
        } as CSSProperties
      }
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className={cn(spSerifTitle, "text-[1.85rem] leading-none sm:text-[2.35rem]")}>
            Orders inbox
          </h2>
          <p className="mt-1.5 text-[13px] text-[color-mix(in_srgb,var(--inbox-ink)_55%,transparent)]">
            {awaitingCount > 0
              ? `${awaitingCount} waiting for your response`
              : "Respond, then mark delivery"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={spBtnGhost} onClick={onTake}>
            <ArrowLeft className="size-3.5" />
            Take order
          </button>
          <button type="button" className={spBtnPrimary} onClick={onTake}>
            <ShoppingBag className="size-3.5" />
            New order
          </button>
        </div>
      </header>

      {/* Fixed viewport height so columns scroll instead of growing the page */}
      <div
        className={cn(
          "flex min-h-0 flex-col overflow-hidden",
          "h-[calc(100dvh-9.5rem)] min-h-[26rem]",
          "sm:h-[calc(100dvh-10.5rem)]",
          "lg:grid lg:h-[min(74dvh,46rem)] lg:grid-cols-[11.5rem_minmax(0,17.5rem)_minmax(0,1fr)]",
          "xl:grid-cols-[12.5rem_minmax(0,19rem)_minmax(0,1fr)]",
          "border border-[color-mix(in_srgb,var(--inbox-ink)_14%,transparent)]",
          "bg-[linear-gradient(165deg,#faf7f1_0%,#f3eee6_48%,#ebe4d8_100%)]",
        )}
      >
        {/* Shops */}
        <aside className="flex max-h-[9.5rem] min-h-0 shrink-0 flex-col overflow-hidden border-b border-[color-mix(in_srgb,var(--inbox-ink)_12%,transparent)] lg:max-h-none lg:shrink lg:border-b-0 lg:border-r">
          <RailHead label="Shops" count={shopOptions.length} />
          <div className="relative border-b border-[color-mix(in_srgb,var(--inbox-ink)_10%,transparent)] bg-[color-mix(in_srgb,#fff_55%,transparent)]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--inbox-ink)_40%,transparent)]" />
            <input
              className="h-9 w-full bg-transparent pl-8 pr-2 text-[13px] text-[var(--inbox-ink)] outline-none placeholder:text-[color-mix(in_srgb,var(--inbox-ink)_35%,transparent)]"
              placeholder="Find shop"
              value={shopQuery}
              onChange={(e) => onShopQuery(e.target.value)}
            />
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
            <ShopChip
              label="All shops"
              count={ordersTotal}
              active={!shopFilterId}
              onClick={() => onShopFilter(null)}
            />
            {filteredShops.map((shop) => (
              <ShopChip
                key={shop.id}
                label={shop.name}
                count={shop.count}
                active={shopFilterId === shop.id}
                onClick={() => onShopFilter(shop.id)}
              />
            ))}
          </nav>
        </aside>

        {/* Orders list */}
        <aside className="flex max-h-[13.5rem] min-h-0 shrink-0 flex-col overflow-hidden border-b border-[color-mix(in_srgb,var(--inbox-ink)_12%,transparent)] lg:max-h-none lg:shrink lg:border-b-0 lg:border-r">
          <RailHead label="Orders" count={filteredOrders.length} accent={awaitingCount > 0} />
          <div className="relative border-b border-[color-mix(in_srgb,var(--inbox-ink)_10%,transparent)] bg-[color-mix(in_srgb,#fff_55%,transparent)]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--inbox-ink)_40%,transparent)]" />
            <input
              className="h-9 w-full bg-transparent pl-8 pr-2 text-[13px] text-[var(--inbox-ink)] outline-none placeholder:text-[color-mix(in_srgb,var(--inbox-ink)_35%,transparent)]"
              placeholder="Search PO or shop"
              value={orderSearch}
              onChange={(e) => onOrderSearch(e.target.value)}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
            {loading ? (
              <p className="px-2 py-10 text-center text-[12px] text-[color-mix(in_srgb,var(--inbox-ink)_45%,transparent)]">
                <Loader2 className="mr-1 inline size-3.5 animate-spin" />
                Loading…
              </p>
            ) : filteredOrders.length === 0 ? (
              <EmptyRail />
            ) : (
              filteredOrders.map((order, i) => {
                const awaiting = !order.supplierResponseAt;
                const selected = selectedId === order.purchaseOrderId;
                return (
                  <button
                    key={order.purchaseOrderId}
                    type="button"
                    onClick={() => onOpenOrder(order.purchaseOrderId)}
                    style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                    className={cn(
                      "group relative mb-1.5 w-full overflow-hidden text-left",
                      "border px-2.5 py-2.5 transition-[background,border-color,transform] duration-200",
                      "animate-[sp-card-in_0.4s_cubic-bezier(0.22,1,0.36,1)_both]",
                      selected
                        ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_12%,#fff)] shadow-[0_1px_0_0_color-mix(in_srgb,var(--pos-primary)_35%,transparent)]"
                        : "border-transparent bg-[color-mix(in_srgb,#fff_70%,transparent)] hover:border-[color-mix(in_srgb,var(--inbox-ink)_14%,transparent)] hover:bg-white",
                    )}
                  >
                    {awaiting ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -right-1 top-1 rotate-12 border border-[color-mix(in_srgb,var(--inbox-mango)_55%,transparent)] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--inbox-mango)] opacity-80"
                      >
                        Await
                      </span>
                    ) : null}
                    <div className="flex items-baseline justify-between gap-2 pr-8">
                      <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--inbox-ink)]">
                        {order.poNumber}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--inbox-ink)_40%,transparent)]">
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[13px] font-semibold leading-snug text-[var(--inbox-ink)]">
                      {order.businessName}
                    </p>
                    <p className="mt-1 font-mono text-[10px] tabular-nums text-[color-mix(in_srgb,var(--inbox-ink)_48%,transparent)]">
                      {order.lineCount} line{order.lineCount === 1 ? "" : "s"}
                      {awaiting ? (
                        <span className="text-[var(--inbox-mango)]"> · yours</span>
                      ) : order.deliveryStatus ? (
                        <span> · {order.deliveryStatus.replaceAll("_", " ")}</span>
                      ) : null}
                      {order.sentToSupplierAt ? (
                        <span className="ml-1 opacity-70">
                          · {fmtWhen(order.sentToSupplierAt)}
                        </span>
                      ) : null}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Detail — scroll lives here */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[color-mix(in_srgb,#fff_82%,#f7f3eb)]">
          <div className="relative shrink-0 overflow-hidden border-b border-[color-mix(in_srgb,var(--inbox-ink)_12%,transparent)] px-4 py-3">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)] blur-2xl"
            />
            {detail ? (
              <div className="relative min-w-0">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--pos-primary)]">
                  Packing slip
                </p>
                <h3 className="mt-0.5 truncate font-[family-name:var(--font-heading)] text-[1.35rem] font-semibold leading-tight tracking-tight text-[var(--inbox-ink)]">
                  {detail.poNumber}
                </h3>
                <p className="mt-0.5 truncate text-[13px] text-[color-mix(in_srgb,var(--inbox-ink)_58%,transparent)]">
                  {detail.businessName}
                  {detail.sentToSupplierAt
                    ? ` · received ${fmtWhen(detail.sentToSupplierAt)}`
                    : ""}
                </p>
              </div>
            ) : (
              <div className="relative">
                <h3 className="font-[family-name:var(--font-heading)] text-[1.2rem] font-semibold text-[var(--inbox-ink)]">
                  Select an order
                </h3>
                <p className="mt-0.5 text-[12px] text-[color-mix(in_srgb,var(--inbox-ink)_48%,transparent)]">
                  Pick a slip from the list to respond or ship.
                </p>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {!selectedId ? (
              <DetailEmpty />
            ) : detailLoading ? (
              <p className="flex items-center justify-center gap-2 py-20 text-[12px] text-[color-mix(in_srgb,var(--inbox-ink)_45%,transparent)]">
                <Loader2 className="size-4 animate-spin" />
                Loading order…
              </p>
            ) : detail ? (
              <OrderDetailBody
                detail={detail}
                lineDrafts={lineDrafts}
                setLineDrafts={setLineDrafts}
              />
            ) : null}
          </div>

          {detail && !detailLoading ? (
            <DetailActions
              detail={detail}
              submitting={submitting}
              trackingNote={trackingNote}
              setTrackingNote={setTrackingNote}
              onRespond={onRespond}
              onShip={onShip}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function RailHead({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center justify-between px-3",
        "text-[10px] font-bold uppercase tracking-[0.16em] text-white",
        accent
          ? "bg-[linear-gradient(100deg,var(--pos-primary)_0%,#0d6a63_55%,#b9691a_160%)]"
          : "bg-[var(--pos-primary)]",
      )}
    >
      <span>{label}</span>
      <span className="font-mono tabular-nums opacity-85">{count}</span>
    </div>
  );
}

function ShopChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-0.5 flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-[12.5px] font-medium transition-colors",
        active
          ? "bg-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)] text-[var(--inbox-ink)]"
          : "text-[color-mix(in_srgb,var(--inbox-ink)_58%,transparent)] hover:bg-[color-mix(in_srgb,#fff_70%,transparent)] hover:text-[var(--inbox-ink)]",
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 font-mono text-[10px] tabular-nums opacity-70">
        {count}
      </span>
    </button>
  );
}

function EmptyRail() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Package
        className="size-7 text-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)]"
        strokeWidth={1.4}
      />
      <p className="text-[12px] font-medium text-[var(--inbox-ink)]">No orders here</p>
      <p className="text-[11px] text-[color-mix(in_srgb,var(--inbox-ink)_48%,transparent)]">
        When a shop sends a PO, it lands on this rail.
      </p>
    </div>
  );
}

function DetailEmpty() {
  return (
    <div className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center border border-dashed border-[color-mix(in_srgb,var(--inbox-ink)_22%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_6%,transparent)]">
        <Package
          className="size-6 text-[var(--pos-primary)] opacity-80"
          strokeWidth={1.4}
        />
      </span>
      <p className="max-w-[16rem] text-[13px] leading-snug text-[color-mix(in_srgb,var(--inbox-ink)_55%,transparent)]">
        Choose a purchase order to accept lines or update delivery.
      </p>
    </div>
  );
}

function OrderDetailBody({
  detail,
  lineDrafts,
  setLineDrafts,
}: {
  detail: SupplierPortalOrderDetail;
  lineDrafts: LineDraft[];
  setLineDrafts: Dispatch<SetStateAction<LineDraft[]>>;
}) {
  const awaiting = !detail.supplierResponseAt;

  return (
    <div className="px-3 py-3 sm:px-4">
      {detail.notes ? (
        <p className="mb-3 border border-dashed border-[color-mix(in_srgb,var(--inbox-ink)_16%,transparent)] bg-[color-mix(in_srgb,var(--inbox-mango)_6%,transparent)] px-3 py-2 text-[12px] leading-relaxed text-[color-mix(in_srgb,var(--inbox-ink)_72%,transparent)]">
          {detail.notes}
        </p>
      ) : null}

      <ul className="divide-y divide-dashed divide-[color-mix(in_srgb,var(--inbox-ink)_14%,transparent)] border border-[color-mix(in_srgb,var(--inbox-ink)_12%,transparent)] bg-white">
        {lineDrafts.map((line, index) => {
          const item = detail.lines[index];
          const status = line.supplierLineStatus;
          return (
            <li
              key={line.purchaseOrderLineId}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 px-2.5 py-3 sm:gap-3 sm:px-3"
            >
              <span className="pt-0.5 font-mono text-[11px] font-bold tabular-nums text-[color-mix(in_srgb,var(--pos-primary)_85%,transparent)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-[14px] font-semibold leading-snug text-[var(--inbox-ink)]">
                    {item?.itemName}
                  </p>
                  {item?.unitEstimatedCost != null ? (
                    <p className="font-mono text-[12px] font-semibold tabular-nums text-[var(--inbox-mango)]">
                      {formatMoney(item.unitEstimatedCost, "KES")}
                    </p>
                  ) : null}
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-[color-mix(in_srgb,var(--inbox-ink)_48%,transparent)]">
                  Ordered {item?.qtyOrdered}
                  {item?.itemSku ? ` · ${item.itemSku}` : ""}
                </p>

                {awaiting ? (
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-[minmax(0,8.5rem)_minmax(0,5.5rem)_minmax(0,1fr)]">
                    <select
                      className="h-9 border border-[color-mix(in_srgb,var(--inbox-ink)_16%,transparent)] bg-[color-mix(in_srgb,#faf7f1_90%,transparent)] px-2 text-[13px] text-[var(--inbox-ink)] outline-none focus:border-[var(--pos-primary)]"
                      value={status}
                      onChange={(e) =>
                        setLineDrafts((rows) =>
                          rows.map((row, i) =>
                            i === index
                              ? { ...row, supplierLineStatus: e.target.value }
                              : row,
                          ),
                        )
                      }
                    >
                      <option value="accepted">Accept</option>
                      <option value="partially_accepted">Partial</option>
                      <option value="rejected">Reject</option>
                    </select>
                    {status !== "rejected" ? (
                      <Input
                        placeholder="Qty"
                        value={line.qtyAccepted}
                        className="h-9 rounded-none border-[color-mix(in_srgb,var(--inbox-ink)_16%,transparent)] bg-[color-mix(in_srgb,#faf7f1_90%,transparent)] font-mono text-[13px]"
                        onChange={(e) =>
                          setLineDrafts((rows) =>
                            rows.map((row, i) =>
                              i === index
                                ? { ...row, qtyAccepted: e.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    ) : (
                      <span className="flex h-9 items-center font-mono text-[11px] text-[color-mix(in_srgb,var(--inbox-ink)_40%,transparent)]">
                        —
                      </span>
                    )}
                    <Input
                      placeholder="Note"
                      value={line.supplierNote}
                      className="h-9 rounded-none border-[color-mix(in_srgb,var(--inbox-ink)_16%,transparent)] bg-[color-mix(in_srgb,#faf7f1_90%,transparent)] text-[13px] sm:col-span-1"
                      onChange={(e) =>
                        setLineDrafts((rows) =>
                          rows.map((row, i) =>
                            i === index
                              ? { ...row, supplierNote: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                  </div>
                ) : (
                  <p
                    className={cn(
                      "mt-1.5 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em]",
                      status === "rejected"
                        ? "text-[#b42318]"
                        : "text-[var(--pos-primary)]",
                    )}
                  >
                    <Check className="size-3" strokeWidth={2.5} />
                    {status?.replaceAll("_", " ")}
                    {line.qtyAccepted ? ` · qty ${line.qtyAccepted}` : ""}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DetailActions({
  detail,
  submitting,
  trackingNote,
  setTrackingNote,
  onRespond,
  onShip,
}: {
  detail: SupplierPortalOrderDetail;
  submitting: boolean;
  trackingNote: string;
  setTrackingNote: (v: string) => void;
  onRespond: () => void;
  onShip: (status: "in_transit" | "delivered") => void;
}) {
  return (
    <div className="shrink-0 space-y-2 border-t-2 border-[var(--inbox-ink)] bg-[color-mix(in_srgb,#f3eee6_88%,transparent)] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      {!detail.supplierResponseAt ? (
        <button
          type="button"
          className={cn(spBtnPrimary, "h-11 w-full text-[12px]")}
          disabled={submitting}
          onClick={onRespond}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Check className="size-4" />
              Submit response
            </>
          )}
        </button>
      ) : (
        <>
          <Input
            placeholder="Tracking note (optional)"
            value={trackingNote}
            onChange={(e) => setTrackingNote(e.target.value)}
            className="h-9 rounded-none border-[color-mix(in_srgb,var(--inbox-ink)_16%,transparent)] bg-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={cn(spBtnGhost, "h-10")}
              disabled={submitting}
              onClick={() => onShip("in_transit")}
            >
              <Truck className="size-3.5" />
              In transit
            </button>
            <button
              type="button"
              className={cn(spBtnPrimary, "h-10")}
              disabled={submitting}
              onClick={() => onShip("delivered")}
            >
              <Check className="size-3.5" />
              Delivered
            </button>
          </div>
          {detail.deliveryStatus ? (
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--inbox-ink)_48%,transparent)]">
              Status · {detail.deliveryStatus.replaceAll("_", " ")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function SupplierPortalOrdersPage() {
  return (
    <Suspense
      fallback={
        <SupplierPortalShell>
          <div
            className={cn(
              spPage,
              "py-16 text-center text-sm text-muted-foreground",
            )}
          >
            <Loader2 className="mr-2 inline size-4 animate-spin" />
            Loading orders…
          </div>
        </SupplierPortalShell>
      }
    >
      <SupplierPortalOrdersPageInner />
    </Suspense>
  );
}
