"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalCapabilities,
  fetchSupplierPortalHubShops,
  fetchSupplierPortalOrders,
  fetchSupplierPortalPayments,
  type SupplierPortalHubShops,
} from "@/lib/marketplace-api";
import { formatMoneyCompact, resolveCurrencyCode } from "@/lib/money";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { cn } from "@/lib/utils";

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

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatStamp(d: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export default function SupplierPortalOverviewPage() {
  const router = useRouter();
  const [hub, setHub] = useState<SupplierPortalHubShops | null>(null);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [staleOrders, setStaleOrders] = useState(0);
  const [todayCollections, setTodayCollections] = useState(0);
  const [shopsPaidToday, setShopsPaidToday] = useState(0);
  const [partialShopCount, setPartialShopCount] = useState(0);
  const [canViewMoney, setCanViewMoney] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [now] = useState(() => new Date());

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void (async () => {
      try {
        const caps = await fetchSupplierPortalCapabilities();
        setCanViewMoney(caps.canViewMoney);
        const orders = await fetchSupplierPortalOrders();
        const pending = orders.filter((o) => !o.supplierResponseAt);
        setPendingOrders(pending.length);
        const dayMs = 24 * 60 * 60 * 1000;
        setStaleOrders(
          pending.filter((o) => {
            const sent = o.sentToSupplierAt ? new Date(o.sentToSupplierAt).getTime() : NaN;
            return Number.isFinite(sent) && Date.now() - sent > dayMs;
          }).length,
        );
        if (caps.canViewMoney) {
          const [shops, payments] = await Promise.all([
            fetchSupplierPortalHubShops(),
            fetchSupplierPortalPayments(),
          ]);
          setHub(shops);
          const todayPays = payments.filter((p) => isToday(p.paidAt));
          setTodayCollections(todayPays.reduce((sum, p) => sum + toNum(p.amount), 0));
          setShopsPaidToday(new Set(todayPays.map((p) => p.localSupplierId).filter(Boolean)).size);
          setPartialShopCount(shops.shops.filter((s) => toNum(s.pending) > 0).length);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load dashboard");
      } finally {
        setLoaded(true);
      }
    })();
  }, [router]);

  const currency = hub?.currency ?? "KES";
  const emptyShops = loaded && canViewMoney && (!hub || hub.shopCount === 0);

  const shopsHint = useMemo(() => {
    if (!hub) return "Connected storefronts";
    return `${hub.shopCount} connected`;
  }, [hub]);

  return (
    <SupplierPortalShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="sp-serif text-4xl font-semibold tracking-tight text-[var(--sp-ink)] sm:text-[2.6rem]">
              Dashboard
            </h2>
            <p className="mt-1.5 text-sm text-[var(--sp-muted)]">
              {canViewMoney
                ? "Balances and activity across shops you supply."
                : "Orders and catalogue activity for your supplier account."}
            </p>
          </div>
          <p className="pt-2 text-xs text-[var(--sp-muted)] tabular-nums">{formatStamp(now)}</p>
        </header>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {canViewMoney ? (
          <section className="space-y-4">
            <div className="sp-section-rule">Money</div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                className="sp-rise sp-card-accent-forest"
                label="Outstanding"
                value={hub ? money(hub.totals.owed, currency) : "—"}
                hint={hub ? `Across ${hub.shopCount} shop${hub.shopCount === 1 ? "" : "s"}` : "Loading…"}
                valueClass="text-[var(--sp-forest)]"
                style={{ animationDelay: "40ms" }}
              />
              <MetricCard
                className="sp-rise sp-card-accent-sage"
                label="Today's collections"
                value={hub ? money(todayCollections, currency) : "—"}
                hint={
                  shopsPaidToday > 0
                    ? `${shopsPaidToday} shop${shopsPaidToday === 1 ? "" : "s"} paid so far`
                    : "No payments yet today"
                }
                valueClass="text-[var(--sp-forest)]"
                style={{ animationDelay: "90ms" }}
              />
              <MetricCard
                className="sp-rise sp-card-accent-forest sm:col-span-2 lg:col-span-1"
                label="Paid (all time)"
                value={hub ? money(hub.totals.paid, currency) : "—"}
                hint={shopsHint}
                valueClass="text-[var(--sp-forest)]"
                style={{ animationDelay: "140ms" }}
              />
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="sp-section-rule">Needs attention</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              className="sp-rise sp-card-accent-ochre"
              label="Pending orders"
              value={String(pendingOrders)}
              hint={
                staleOrders > 0
                  ? `${staleOrders} awaiting confirmation > 24h`
                  : pendingOrders > 0
                    ? "Respond to keep shops moving"
                    : "You're caught up"
              }
              valueClass="text-[var(--sp-ochre)]"
              href={APP_ROUTES.supplierPortalOrders}
              style={{ animationDelay: "180ms" }}
            />
            {canViewMoney ? (
              <MetricCard
                className="sp-rise sp-card-accent-ochre"
                label="Partial balances"
                value={hub ? money(hub.totals.pending, currency) : "—"}
                hint={
                  partialShopCount > 0
                    ? `${partialShopCount} shop${partialShopCount === 1 ? "" : "s"} with part payment`
                    : "No partial balances"
                }
                valueClass="text-[var(--sp-ochre)]"
                href={APP_ROUTES.supplierPortalInvoices}
                style={{ animationDelay: "220ms" }}
              />
            ) : (
              <MetricCard
                className="sp-rise sp-card-accent-ochre"
                label="Catalogue"
                value="Manage"
                hint="Products you supply"
                valueClass="text-[var(--sp-ochre)]"
                href={APP_ROUTES.supplierPortalCatalog}
                style={{ animationDelay: "220ms" }}
              />
            )}
            <MetricCard
              className="sp-rise sp-card-accent-sage"
              label={canViewMoney ? "Total shops" : "Orders hub"}
              value={canViewMoney ? (hub ? String(hub.shopCount) : "—") : String(pendingOrders)}
              hint={canViewMoney ? shopsHint : "Open the orders inbox"}
              valueClass="text-[var(--sp-ink)]"
              href={canViewMoney ? APP_ROUTES.supplierPortalShops : APP_ROUTES.supplierPortalOrders}
              style={{ animationDelay: "260ms" }}
            />
          </div>
        </section>

        {hub && hub.shops.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="sp-section-rule flex-1">Shops</div>
              <Link
                href={APP_ROUTES.supplierPortalShops}
                className="shrink-0 text-sm font-medium text-[var(--sp-forest)] underline-offset-2 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {hub.shops.slice(0, 4).map((shop, i) => (
                <Link
                  key={shop.localSupplierId}
                  href={`${APP_ROUTES.supplierPortalShops}/${shop.localSupplierId}`}
                  className="sp-card sp-rise sp-card-accent-forest block px-5 py-4 transition hover:shadow-md"
                  style={{ animationDelay: `${300 + i * 40}ms` }}
                >
                  <p className="font-medium text-[var(--sp-ink)]">{shop.shopName}</p>
                  <p className="mt-1.5 text-sm text-[var(--sp-muted)]">
                    Outstanding {money(shop.owed, currency)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {emptyShops ? (
          <div className="flex flex-col gap-4 rounded-xl border border-dashed border-[var(--sp-forest)]/25 bg-[var(--sp-cream-deep)]/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[var(--sp-ink)]">No shops linked yet</p>
              <p className="mt-1 text-sm text-[var(--sp-muted)]">
                Your live account starts at zero until shops, orders, and payments come in.
              </p>
            </div>
            <Link
              href={APP_ROUTES.supplierPortalProfile}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--sp-forest)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--sp-forest-deep)]"
            >
              Link your first shop
            </Link>
          </div>
        ) : null}
      </div>
    </SupplierPortalShell>
  );
}

function MetricCard({
  label,
  value,
  hint,
  href,
  className,
  valueClass,
  style,
}: {
  label: string;
  value: string;
  hint: string;
  href?: string;
  className?: string;
  valueClass?: string;
  style?: React.CSSProperties;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-[var(--sp-muted)] uppercase">
          {label}
        </p>
        {href ? (
          <span className="rounded-md border border-[var(--sp-border)] px-2 py-0.5 text-[0.7rem] font-medium text-[var(--sp-muted)]">
            View →
          </span>
        ) : null}
      </div>
      <p className={cn("mt-3 text-[1.65rem] font-semibold tracking-tight tabular-nums sm:text-3xl", valueClass)}>
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--sp-muted)]">{hint}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn("sp-card block px-5 py-4 transition hover:shadow-md", className)} style={style}>
        {body}
      </Link>
    );
  }

  return (
    <div className={cn("sp-card px-5 py-4", className)} style={style}>
      {body}
    </div>
  );
}
