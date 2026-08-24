"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Loader2,
  Package,
  Search,
  Truck,
} from "lucide-react";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import {
  spBtnGhost,
  spBtnPrimary,
  spPage,
  spSerifTitle,
} from "@/components/supplier-portal/supplier-portal-ui";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalHubShops,
  fetchSupplierPortalOrders,
  type SupplierPortalHubShops,
  type SupplierPortalOrderRow,
} from "@/lib/marketplace-api";
import { formatMoneyCompact, resolveCurrencyCode } from "@/lib/money";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { cn } from "@/lib/utils";

const INK = "#1c1915";
const TEAL = "#0f766e";
const MANGO = "#b9691a";

type ShopPulse = {
  awaiting: number;
  inTransit: number;
  openTotal: number;
  latestAwaiting: SupplierPortalOrderRow | null;
  latestAny: SupplierPortalOrderRow | null;
};

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function money(amount: unknown, currency: string): string {
  return formatMoneyCompact(toNum(amount), resolveCurrencyCode(currency));
}

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

function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function buildPulseMap(orders: SupplierPortalOrderRow[]): Map<string, ShopPulse> {
  const map = new Map<string, ShopPulse>();

  const touch = (businessId: string): ShopPulse => {
    let row = map.get(businessId);
    if (!row) {
      row = {
        awaiting: 0,
        inTransit: 0,
        openTotal: 0,
        latestAwaiting: null,
        latestAny: null,
      };
      map.set(businessId, row);
    }
    return row;
  };

  const newer = (
    a: SupplierPortalOrderRow | null,
    b: SupplierPortalOrderRow,
  ): SupplierPortalOrderRow => {
    if (!a) return b;
    const at = a.sentToSupplierAt ?? "";
    const bt = b.sentToSupplierAt ?? "";
    return bt >= at ? b : a;
  };

  for (const order of orders) {
    const pulse = touch(order.businessId);
    pulse.latestAny = newer(pulse.latestAny, order);

    const awaiting = !order.supplierResponseAt;
    const inTransit = order.deliveryStatus === "in_transit";
    const delivered = order.deliveryStatus === "delivered";

    if (awaiting || inTransit || (!delivered && Boolean(order.supplierResponseAt))) {
      pulse.openTotal += 1;
    }
    if (awaiting) {
      pulse.awaiting += 1;
      pulse.latestAwaiting = newer(pulse.latestAwaiting, order);
    }
    if (inTransit) {
      pulse.inTransit += 1;
    }
  }

  return map;
}

export default function SupplierPortalShopsPage() {
  const router = useRouter();
  const [hub, setHub] = useState<SupplierPortalHubShops | null>(null);
  const [orders, setOrders] = useState<SupplierPortalOrderRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "awaiting" | "owed">("all");

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    setLoading(true);
    void Promise.all([
      fetchSupplierPortalHubShops(),
      fetchSupplierPortalOrders().catch(() => [] as SupplierPortalOrderRow[]),
    ])
      .then(([shops, inbox]) => {
        setHub(shops);
        setOrders(inbox);
        setError("");
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load shops"),
      )
      .finally(() => setLoading(false));
  }, [router]);

  const currency = hub?.currency ?? "KES";
  const pulseByShop = useMemo(() => buildPulseMap(orders), [orders]);

  const networkAwaiting = useMemo(
    () => [...pulseByShop.values()].reduce((n, p) => n + p.awaiting, 0),
    [pulseByShop],
  );
  const networkTransit = useMemo(
    () => [...pulseByShop.values()].reduce((n, p) => n + p.inTransit, 0),
    [pulseByShop],
  );

  const shops = useMemo(() => {
    const list = hub?.shops ?? [];
    const q = query.trim().toLowerCase();
    return list
      .filter((shop) => {
        if (filter === "awaiting") {
          if ((pulseByShop.get(shop.businessId)?.awaiting ?? 0) === 0) return false;
        }
        if (filter === "owed" && toNum(shop.owed) <= 0) return false;
        if (!q) return true;
        return (
          shop.shopName.toLowerCase().includes(q) ||
          (shop.slugHost ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const pa = pulseByShop.get(a.businessId)?.awaiting ?? 0;
        const pb = pulseByShop.get(b.businessId)?.awaiting ?? 0;
        if (pb !== pa) return pb - pa;
        const oa = toNum(a.owed);
        const ob = toNum(b.owed);
        if (ob !== oa) return ob - oa;
        return a.shopName.localeCompare(b.shopName);
      });
  }, [hub, query, filter, pulseByShop]);

  return (
    <SupplierPortalShell>
      <div
        className={cn(spPage, "space-y-4")}
        style={
          {
            ["--pos-primary" as string]: TEAL,
            ["--shop-ink" as string]: INK,
            ["--shop-mango" as string]: MANGO,
          } as CSSProperties
        }
      >
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className={cn(spSerifTitle, "text-[1.85rem] leading-none sm:text-[2.35rem]")}>
              Shops
            </h2>
            <p className="mt-1.5 max-w-xl text-[13px] text-[color-mix(in_srgb,var(--shop-ink)_55%,transparent)]">
              Your connected route — balances, pending POs, and deliveries in one board.
            </p>
          </div>
          {networkAwaiting > 0 ? (
            <Link
              href={`${APP_ROUTES.supplierPortalOrders}?inbox=1`}
              className={cn(spBtnPrimary, "h-9")}
            >
              <Package className="size-3.5" />
              {networkAwaiting} awaiting you
            </Link>
          ) : (
            <Link
              href={APP_ROUTES.supplierPortalOrders}
              className={cn(spBtnGhost, "h-9")}
            >
              Orders inbox
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </header>

        {error ? (
          <p className="border border-[#b42318]/25 bg-[#fef3f2] px-3 py-2 text-sm text-[#b42318]">
            {error}
          </p>
        ) : null}

        {/* Network pulse */}
        <div className="flex flex-wrap items-stretch gap-px overflow-hidden border border-[color-mix(in_srgb,var(--shop-ink)_14%,transparent)] bg-[color-mix(in_srgb,var(--shop-ink)_14%,transparent)]">
          <PulseStat
            label="Shops"
            value={loading ? "…" : String(hub?.shopCount ?? 0)}
          />
          <PulseStat
            label="Awaiting you"
            value={loading ? "…" : String(networkAwaiting)}
            hot={networkAwaiting > 0}
          />
          <PulseStat
            label="In transit"
            value={loading ? "…" : String(networkTransit)}
          />
          <PulseStat
            label="Outstanding"
            value={loading ? "…" : money(hub?.totals.owed ?? 0, currency)}
            hot={toNum(hub?.totals.owed) > 0}
          />
        </div>

        {/* Route board */}
        <section
          className={cn(
            "overflow-hidden border border-[color-mix(in_srgb,var(--shop-ink)_14%,transparent)]",
            "bg-[linear-gradient(165deg,#faf7f1_0%,#f3eee6_48%,#ebe4d8_100%)]",
          )}
        >
          <div
            className={cn(
              "flex h-9 items-center justify-between px-3",
              networkAwaiting > 0
                ? "bg-[linear-gradient(100deg,var(--pos-primary)_0%,#0d6a63_55%,#b9691a_160%)]"
                : "bg-[var(--pos-primary)]",
              "text-[10px] font-bold uppercase tracking-[0.16em] text-white",
            )}
          >
            <span>Route board</span>
            <span className="font-mono tabular-nums opacity-85">{shops.length}</span>
          </div>

          <div className="flex flex-col gap-2.5 border-b border-[color-mix(in_srgb,var(--shop-ink)_10%,transparent)] bg-[color-mix(in_srgb,#fff_55%,transparent)] px-3 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--shop-ink)_40%,transparent)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a shop…"
                className="h-9 w-full border border-[color-mix(in_srgb,var(--shop-ink)_14%,transparent)] bg-[color-mix(in_srgb,#fff_88%,transparent)] pl-8 pr-2 text-[13px] text-[var(--shop-ink)] outline-none placeholder:text-[color-mix(in_srgb,var(--shop-ink)_35%,transparent)] focus:border-[var(--pos-primary)]"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                label="All"
                active={filter === "all"}
                onClick={() => setFilter("all")}
              />
              <FilterChip
                label={`Awaiting${networkAwaiting ? ` · ${networkAwaiting}` : ""}`}
                active={filter === "awaiting"}
                onClick={() => setFilter("awaiting")}
                hot={networkAwaiting > 0}
              />
              <FilterChip
                label="Outstanding"
                active={filter === "owed"}
                onClick={() => setFilter("owed")}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-16 text-[13px] text-[color-mix(in_srgb,var(--shop-ink)_48%,transparent)]">
              <Loader2 className="size-4 animate-spin" />
              Mapping your route…
            </div>
          ) : shops.length === 0 ? (
            <EmptyRoute hasAny={(hub?.shops.length ?? 0) > 0} />
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--shop-ink)_10%,transparent)]">
              {shops.map((shop, index) => {
                const pulse = pulseByShop.get(shop.businessId) ?? {
                  awaiting: 0,
                  inTransit: 0,
                  openTotal: 0,
                  latestAwaiting: null,
                  latestAny: null,
                };
                const owed = toNum(shop.owed);
                return (
                  <li
                    key={shop.localSupplierId}
                    className="group relative bg-[color-mix(in_srgb,#fff_72%,transparent)] transition-colors hover:bg-white"
                    style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
                  >
                    {pulse.awaiting > 0 ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute right-3 top-3 rotate-6 border border-[color-mix(in_srgb,var(--shop-mango)_55%,transparent)] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--shop-mango)] opacity-90 sm:right-4"
                      >
                        Await {pulse.awaiting}
                      </span>
                    ) : null}

                    <div className="grid gap-3 px-3 py-3.5 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:px-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_auto]">
                      {/* Identity */}
                      <div className="min-w-0 pr-10 sm:pr-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-[10px] font-bold tabular-nums text-[var(--pos-primary)]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <h3 className="truncate font-[family-name:var(--font-heading)] text-[1.15rem] font-semibold leading-tight tracking-tight text-[var(--shop-ink)]">
                            {shop.shopName}
                          </h3>
                        </div>
                        <p className="mt-1 font-mono text-[10px] text-[color-mix(in_srgb,var(--shop-ink)_45%,transparent)]">
                          Last supply {fmtDay(shop.lastSupplyAt)}
                          {shop.slugHost ? ` · ${shop.slugHost}` : ""}
                        </p>

                        {/* Order pulse strip */}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {pulse.awaiting > 0 ? (
                            <span className="border border-[color-mix(in_srgb,var(--shop-mango)_40%,transparent)] bg-[color-mix(in_srgb,var(--shop-mango)_10%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--shop-mango)]">
                              {pulse.awaiting} pending PO
                              {pulse.awaiting === 1 ? "" : "s"}
                            </span>
                          ) : (
                            <span className="border border-[color-mix(in_srgb,var(--shop-ink)_12%,transparent)] bg-[color-mix(in_srgb,#fff_50%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--shop-ink)_48%,transparent)]">
                              No pending POs
                            </span>
                          )}
                          {pulse.inTransit > 0 ? (
                            <span className="inline-flex items-center gap-1 border border-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--pos-primary)]">
                              <Truck className="size-3" />
                              {pulse.inTransit} in transit
                            </span>
                          ) : null}
                          {owed > 0 ? (
                            <span className="border border-[color-mix(in_srgb,var(--shop-ink)_14%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--shop-ink)]">
                              Outstanding
                            </span>
                          ) : (
                            <span className="border border-[color-mix(in_srgb,var(--pos-primary)_25%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-primary)]">
                              Good standing
                            </span>
                          )}
                        </div>

                        {pulse.latestAwaiting ? (
                          <p className="mt-2 font-mono text-[11px] text-[color-mix(in_srgb,var(--shop-ink)_58%,transparent)]">
                            Latest ·{" "}
                            <span className="font-semibold text-[var(--shop-ink)]">
                              {pulse.latestAwaiting.poNumber}
                            </span>
                            {pulse.latestAwaiting.lineCount
                              ? ` · ${pulse.latestAwaiting.lineCount} lines`
                              : ""}
                            {pulse.latestAwaiting.sentToSupplierAt
                              ? ` · ${fmtWhen(pulse.latestAwaiting.sentToSupplierAt)}`
                              : ""}
                          </p>
                        ) : pulse.latestAny ? (
                          <p className="mt-2 font-mono text-[11px] text-[color-mix(in_srgb,var(--shop-ink)_45%,transparent)]">
                            Last PO · {pulse.latestAny.poNumber}
                            {pulse.latestAny.deliveryStatus
                              ? ` · ${pulse.latestAny.deliveryStatus.replaceAll("_", " ")}`
                              : pulse.latestAny.supplierResponseAt
                                ? " · responded"
                                : ""}
                          </p>
                        ) : null}
                      </div>

                      {/* Money */}
                      <dl className="grid grid-cols-3 gap-2 border border-dashed border-[color-mix(in_srgb,var(--shop-ink)_12%,transparent)] bg-[color-mix(in_srgb,#fff_55%,transparent)] px-2.5 py-2 sm:self-start">
                        <div>
                          <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--shop-ink)_45%,transparent)]">
                            Owed
                          </dt>
                          <dd
                            className={cn(
                              "mt-0.5 font-mono text-[13px] font-bold tabular-nums",
                              owed > 0 ? "text-[var(--shop-mango)]" : "text-[var(--shop-ink)]",
                            )}
                          >
                            {money(shop.owed, currency)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--shop-ink)_45%,transparent)]">
                            Paid
                          </dt>
                          <dd className="mt-0.5 font-mono text-[13px] font-bold tabular-nums text-[var(--shop-ink)]">
                            {money(shop.paid, currency)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--shop-ink)_45%,transparent)]">
                            Pending
                          </dt>
                          <dd className="mt-0.5 font-mono text-[13px] font-bold tabular-nums text-[var(--pos-primary)]">
                            {money(shop.pending, currency)}
                          </dd>
                        </div>
                      </dl>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2 lg:col-span-1 lg:flex-col lg:items-stretch">
                        {pulse.latestAwaiting ? (
                          <Link
                            href={`${APP_ROUTES.supplierPortalOrders}?po=${encodeURIComponent(pulse.latestAwaiting.purchaseOrderId)}&business=${encodeURIComponent(shop.businessId)}`}
                            className={cn(spBtnPrimary, "h-8 flex-1 text-[10px] lg:flex-none")}
                          >
                            <Package className="size-3" />
                            Open PO
                          </Link>
                        ) : pulse.openTotal > 0 ? (
                          <Link
                            href={`${APP_ROUTES.supplierPortalOrders}?inbox=1&business=${encodeURIComponent(shop.businessId)}`}
                            className={cn(spBtnGhost, "h-8 flex-1 text-[10px] lg:flex-none")}
                          >
                            <Truck className="size-3" />
                            View orders
                          </Link>
                        ) : (
                          <Link
                            href={`${APP_ROUTES.supplierPortalOrders}?inbox=1&business=${encodeURIComponent(shop.businessId)}`}
                            className={cn(spBtnGhost, "h-8 flex-1 text-[10px] lg:flex-none")}
                          >
                            Inbox
                          </Link>
                        )}
                        <Link
                          href={`${APP_ROUTES.supplierPortalShops}/${shop.localSupplierId}`}
                          className={cn(spBtnGhost, "h-8 flex-1 text-[10px] lg:flex-none")}
                        >
                          <Building2 className="size-3" />
                          Ledger
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </SupplierPortalShell>
  );
}

function PulseStat({
  label,
  value,
  hot,
}: {
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[7rem] flex-1 flex-col gap-0.5 px-3 py-2.5",
        hot
          ? "bg-[color-mix(in_srgb,var(--shop-mango)_12%,#fff)]"
          : "bg-[color-mix(in_srgb,#fff_78%,#f7f3eb)]",
      )}
    >
      <span
        className={cn(
          "font-mono text-[1.1rem] font-bold tabular-nums leading-none",
          hot ? "text-[var(--shop-mango)]" : "text-[var(--pos-primary)]",
        )}
      >
        {value}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--shop-ink)_48%,transparent)]">
        {label}
      </span>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  hot,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  hot?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-2.5 py-1 text-[11px] font-semibold transition-colors",
        active
          ? hot
            ? "border-[var(--shop-mango)] bg-[color-mix(in_srgb,var(--shop-mango)_14%,transparent)] text-[var(--shop-ink)]"
            : "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--shop-ink)]"
          : "border-[color-mix(in_srgb,var(--shop-ink)_14%,transparent)] bg-[color-mix(in_srgb,#fff_70%,transparent)] text-[color-mix(in_srgb,var(--shop-ink)_58%,transparent)] hover:text-[var(--shop-ink)]",
      )}
    >
      {label}
    </button>
  );
}

function EmptyRoute({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center border border-dashed border-[color-mix(in_srgb,var(--shop-ink)_22%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_6%,transparent)]">
        <Building2 className="size-6 text-[var(--pos-primary)] opacity-80" strokeWidth={1.4} />
      </span>
      <p className="max-w-[20rem] text-[13px] leading-snug text-[color-mix(in_srgb,var(--shop-ink)_55%,transparent)]">
        {hasAny ? (
          "No shops match this filter."
        ) : (
          <>
            No linked shops yet. Sign out and back in to refresh links, or open{" "}
            <Link
              href={APP_ROUTES.supplierPortalProfile}
              className="font-medium text-[var(--pos-primary)] underline underline-offset-2"
            >
              Profile
            </Link>{" "}
            to link a shop by phone / name match.
          </>
        )}
      </p>
    </div>
  );
}
