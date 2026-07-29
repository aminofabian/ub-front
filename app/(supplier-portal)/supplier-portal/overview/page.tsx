"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import {
  mktChip,
  mktPosAccentBar,
  mktPosHeader,
  spBtnPrimary,
  spEyebrow,
  spMetric,
  spPage,
  spPanel,
  spRise,
  spSerifTitle,
} from "@/components/supplier-portal/supplier-portal-ui";
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

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void (async () => {
      try {
        const caps = await fetchSupplierPortalCapabilities();
        setCanViewMoney(caps.canViewMoney);
        const [orders, shops] = await Promise.all([
          fetchSupplierPortalOrders(),
          fetchSupplierPortalHubShops().catch(() => null),
        ]);
        if (shops) {
          setHub(shops);
          setPartialShopCount(shops.shops.filter((s) => toNum(s.pending) > 0).length);
        }
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
          const payments = await fetchSupplierPortalPayments();
          const todayPays = payments.filter((p) => isToday(p.paidAt));
          setTodayCollections(todayPays.reduce((sum, p) => sum + toNum(p.amount), 0));
          setShopsPaidToday(new Set(todayPays.map((p) => p.localSupplierId).filter(Boolean)).size);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load dashboard");
      } finally {
        setLoaded(true);
      }
    })();
  }, [router]);

  const currency = hub?.currency ?? "KES";
  const emptyShops = loaded && (!hub || hub.shopCount === 0);
  const partialPending = canViewMoney ? toNum(hub?.totals.pending) : 0;
  const hasAttention = pendingOrders > 0 || partialPending > 0;

  const shopsHint = useMemo(() => {
    if (!hub) return "Connected storefronts";
    return `${hub.shopCount} connected`;
  }, [hub]);

  return (
    <SupplierPortalShell>
      <div className={cn(spPage, "space-y-5 sm:space-y-5")}>
        {/* Mobile home — one clear composition */}
        <section className={cn(spRise, "space-y-5 lg:hidden")}>
          <div>
            <p className="text-[13px] text-muted-foreground">
              {now ? formatStamp(now) : "\u00a0"}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-heading)] text-[2.15rem] leading-[1.05] font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
              {now ? greetingFor(now) : "Welcome"}
            </h1>
            <p className="mt-1.5 text-[15px] leading-snug text-muted-foreground">
              {canViewMoney
                ? "What you are owed across your shops."
                : "Orders waiting for you today."}
            </p>
          </div>

          {canViewMoney ? (
            <Link
              href={APP_ROUTES.supplierPortalPayments}
              className={cn(
                "block overflow-hidden",
                "bg-[linear-gradient(160deg,var(--pos-primary,#0f766e)_0%,#0d6a63_48%,#0a524c_100%)]",
                "px-5 py-5 text-white",
                "active:brightness-95 transition-[filter]",
              )}
            >
              <p className="text-[11px] font-medium tracking-[0.04em] text-white/70">
                Outstanding
              </p>
              <p className="mt-2 font-[family-name:var(--font-heading)] text-[2.35rem] leading-none font-semibold tabular-nums tracking-tight">
                {hub ? money(hub.totals.owed, currency) : "—"}
              </p>
              <p className="mt-2 text-[13px] text-white/70">
                {hub
                  ? `${hub.shopCount} shop${hub.shopCount === 1 ? "" : "s"} · tap for payments`
                  : "Loading…"}
              </p>
              <div className="mt-5 flex gap-6 border-t border-white/15 pt-4">
                <div>
                  <p className="text-[11px] text-white/55">Today</p>
                  <p className="mt-0.5 text-[15px] font-semibold tabular-nums">
                    {hub ? money(todayCollections, currency) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-white/55">Paid all-time</p>
                  <p className="mt-0.5 text-[15px] font-semibold tabular-nums">
                    {hub ? money(hub.totals.paid, currency) : "—"}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <Link
              href={APP_ROUTES.supplierPortalOrders}
              className={cn(
                "flex items-center justify-between gap-3",
                "bg-[linear-gradient(160deg,var(--pos-primary,#0f766e)_0%,#0d6a63_48%,#0a524c_100%)]",
                "px-5 py-5 text-white active:brightness-95",
              )}
            >
              <div>
                <p className="text-[11px] font-medium text-white/70">Pending orders</p>
                <p className="mt-1.5 font-[family-name:var(--font-heading)] text-[2.35rem] leading-none font-semibold tabular-nums">
                  {pendingOrders}
                </p>
              </div>
              <ChevronRight className="size-5 text-white/60" />
            </Link>
          )}

          {hasAttention ? (
            <div className="space-y-1">
              <p className="px-0.5 text-[13px] font-medium text-[var(--pos-ink,#1c1915)]">
                Needs you
              </p>
              <div className="divide-y divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] border-y border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]">
                {pendingOrders > 0 ? (
                  <AttentionRow
                    label="Pending orders"
                    value={String(pendingOrders)}
                    hint={
                      staleOrders > 0
                        ? `${staleOrders} waiting over 24h`
                        : "Respond to keep shops moving"
                    }
                    href={APP_ROUTES.supplierPortalOrders}
                    accent
                  />
                ) : null}
                {partialPending > 0 ? (
                  <AttentionRow
                    label="Partial balances"
                    value={money(partialPending, currency)}
                    hint={`${partialShopCount} shop${partialShopCount === 1 ? "" : "s"} part-paid`}
                    href={APP_ROUTES.supplierPortalInvoices}
                    accent
                  />
                ) : null}
              </div>
            </div>
          ) : loaded ? (
            <div className="flex items-center gap-2.5 py-1 text-[14px] text-muted-foreground">
              <span className="flex size-6 items-center justify-center bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,transparent)] text-[var(--pos-primary,#0f766e)]">
                <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
              </span>
              You&apos;re caught up — nothing waiting.
            </div>
          ) : null}

          {hub && hub.shops.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 px-0.5">
                <p className="text-[13px] font-medium text-[var(--pos-ink,#1c1915)]">Shops</p>
                <Link
                  href={APP_ROUTES.supplierPortalShops}
                  className="text-[13px] text-[var(--pos-primary,#0f766e)]"
                >
                  See all
                </Link>
              </div>
              <div className="divide-y divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] border-y border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]">
                {hub.shops.slice(0, 4).map((shop) => (
                  <Link
                    key={shop.localSupplierId}
                    href={`${APP_ROUTES.supplierPortalShops}/${shop.localSupplierId}`}
                    className="flex min-h-14 items-center gap-3 py-3 active:opacity-70"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-[var(--pos-ink,#1c1915)]">
                        {shop.shopName}
                      </p>
                      {canViewMoney ? (
                        <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">
                          Outstanding {money(shop.owed, currency)}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* Desktop header */}
        <header className="hidden flex-wrap items-end justify-between gap-3 lg:flex">
          <div>
            <p className={spEyebrow}>portal · overview → activity</p>
            <h2 className={cn(spSerifTitle, "mt-1")}>Dashboard</h2>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              {canViewMoney
                ? "Balances and activity across shops you supply."
                : "Orders and catalogue activity for your supplier account."}
            </p>
          </div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground tabular-nums uppercase">
            {now ? formatStamp(now) : "\u00a0"}
          </p>
        </header>

        {error ? (
          <p className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}

        {canViewMoney ? (
          <section className={cn(spPanel, "hidden lg:block")}>
            <div className={mktPosHeader}>
              <span>1 · Money</span>
              <span>{hub?.shopCount ?? 0}</span>
            </div>
            <div className="grid gap-px bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                label="Outstanding"
                value={hub ? money(hub.totals.owed, currency) : "—"}
                hint={hub ? `Across ${hub.shopCount} shop${hub.shopCount === 1 ? "" : "s"}` : "Loading…"}
              />
              <MetricCard
                label="Today's collections"
                value={hub ? money(todayCollections, currency) : "—"}
                hint={
                  shopsPaidToday > 0
                    ? `${shopsPaidToday} shop${shopsPaidToday === 1 ? "" : "s"} paid so far`
                    : "No payments yet today"
                }
              />
              <MetricCard
                label="Paid (all time)"
                value={hub ? money(hub.totals.paid, currency) : "—"}
                hint={shopsHint}
                className="sm:col-span-2 lg:col-span-1"
              />
            </div>
          </section>
        ) : null}

        <section className={cn(spPanel, "hidden lg:block")}>
          <div className={mktPosHeader}>
            <span>2 · Needs attention</span>
            <span>{pendingOrders}</span>
          </div>
          <div className="grid gap-px bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Pending orders"
              value={String(pendingOrders)}
              hint={
                staleOrders > 0
                  ? `${staleOrders} awaiting confirmation > 24h`
                  : pendingOrders > 0
                    ? "Respond to keep shops moving"
                    : "You're caught up"
              }
              href={APP_ROUTES.supplierPortalOrders}
            />
            {canViewMoney ? (
              <MetricCard
                label="Partial balances"
                value={hub ? money(hub.totals.pending, currency) : "—"}
                hint={
                  partialShopCount > 0
                    ? `${partialShopCount} shop${partialShopCount === 1 ? "" : "s"} with part payment`
                    : "No partial balances"
                }
                href={APP_ROUTES.supplierPortalInvoices}
              />
            ) : (
              <MetricCard
                label="Catalogue"
                value="Manage"
                hint="Products you supply"
                href={APP_ROUTES.supplierPortalCatalog}
              />
            )}
            <MetricCard
              label="Total shops"
              value={hub ? String(hub.shopCount) : "—"}
              hint={shopsHint}
              href={APP_ROUTES.supplierPortalShops}
            />
          </div>
        </section>

        {hub && hub.shops.length > 0 ? (
          <section className={cn(spPanel, "hidden lg:block")}>
            <div className={mktPosHeader}>
              <span>3 · Shops</span>
              <Link href={APP_ROUTES.supplierPortalShops} className="hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid gap-px bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] sm:grid-cols-2">
              {hub.shops.slice(0, 4).map((shop) => (
                <Link
                  key={shop.localSupplierId}
                  href={`${APP_ROUTES.supplierPortalShops}/${shop.localSupplierId}`}
                  className={cn(spMetric, "block bg-[color-mix(in_srgb,var(--card)_96%,#f7f3eb)]")}
                >
                  <span className={mktPosAccentBar} />
                  <p className="pl-2 font-medium text-[var(--pos-ink,#1c1915)]">{shop.shopName}</p>
                  <p className="mt-1.5 pl-2 text-sm text-muted-foreground">
                    Outstanding {money(shop.owed, currency)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {emptyShops ? (
          <div
            className={cn(
              spPanel,
              "flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <div>
              <p className="font-semibold text-[var(--pos-ink,#1c1915)]">No shops linked yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your live account starts at zero until shops, orders, and payments come in.
              </p>
            </div>
            <Link href={APP_ROUTES.supplierPortalProfile} className={spBtnPrimary}>
              Link your first shop
            </Link>
          </div>
        ) : null}
      </div>
    </SupplierPortalShell>
  );
}

function AttentionRow({
  label,
  value,
  hint,
  href,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 py-3.5 active:opacity-70"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[15px] font-medium text-[var(--pos-ink,#1c1915)]">{label}</p>
          <p
            className={cn(
              "text-[15px] font-semibold tabular-nums",
              accent
                ? "text-[var(--pos-primary,#0f766e)]"
                : "text-[var(--pos-ink,#1c1915)]",
            )}
          >
            {value}
          </p>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{hint}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
    </Link>
  );
}

function MetricCard({
  label,
  value,
  hint,
  href,
  className,
}: {
  label: string;
  value: string;
  hint: string;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <span className={mktPosAccentBar} />
      <div className="flex items-start justify-between gap-2 pl-2">
        <p className={spEyebrow}>{label}</p>
        {href ? <span className={cn(mktChip, "px-1.5 py-0.5")}>View →</span> : null}
      </div>
      <p className="mt-3 pl-2 text-[1.55rem] font-semibold tracking-tight text-[var(--pos-primary,#0f766e)] tabular-nums sm:text-[1.75rem]">
        {value}
      </p>
      <p className="mt-1.5 pl-2 text-sm text-muted-foreground">{hint}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(spMetric, "block bg-[color-mix(in_srgb,var(--card)_96%,#f7f3eb)]", className)}
      >
        {body}
      </Link>
    );
  }

  return (
    <div className={cn(spMetric, "bg-[color-mix(in_srgb,var(--card)_96%,#f7f3eb)]", className)}>
      {body}
    </div>
  );
}
