"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  ClipboardList,
  Loader2,
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { SupplierActivityTabs } from "@/components/supplier-portal/supplier-activity-tabs";
import {
  spBtnGhost,
  spBtnPrimary,
  spPage,
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

const INK = "#1c1915";
const TEAL = "#0f766e";
const MANGO = "#b9691a";

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
  const [inTransit, setInTransit] = useState(0);
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
        setInTransit(
          orders.filter((o) => o.deliveryStatus === "in_transit").length,
        );
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
          setShopsPaidToday(
            new Set(todayPays.map((p) => p.localSupplierId).filter(Boolean)).size,
          );
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
  const owed = toNum(hub?.totals.owed);

  const subtitle = useMemo(() => {
    if (!loaded) return "Loading your route…";
    if (hasAttention) {
      if (pendingOrders > 0 && partialPending > 0) {
        return `${pendingOrders} orders and open balances need you.`;
      }
      if (pendingOrders > 0) return `${pendingOrders} purchase orders awaiting your response.`;
      return "Partial balances waiting to clear.";
    }
    return canViewMoney
      ? "Balances and activity across shops you supply."
      : "Orders and catalogue activity for your account.";
  }, [loaded, hasAttention, pendingOrders, partialPending, canViewMoney]);

  return (
    <SupplierPortalShell>
      <div
        className={cn(spPage, "space-y-4")}
        style={
          {
            ["--pos-primary" as string]: TEAL,
            ["--dash-ink" as string]: INK,
            ["--dash-mango" as string]: MANGO,
          } as CSSProperties
        }
      >
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tabular-nums text-[color-mix(in_srgb,var(--dash-ink)_48%,transparent)]">
              {now ? formatStamp(now) : "\u00a0"}
            </p>
            <h1
              className={cn(
                spSerifTitle,
                "mt-1 text-[1.85rem] leading-none sm:text-[2.35rem]",
              )}
            >
              {now ? greetingFor(now) : "Welcome"}
            </h1>
            <p className="mt-1.5 max-w-xl text-[13px] text-[color-mix(in_srgb,var(--dash-ink)_55%,transparent)]">
              {subtitle}
            </p>
          </div>
          {pendingOrders > 0 ? (
            <Link
              href={`${APP_ROUTES.supplierPortalOrders}?inbox=1`}
              className={cn(spBtnPrimary, "h-9")}
            >
              <Package className="size-3.5" />
              Respond · {pendingOrders}
            </Link>
          ) : (
            <Link href={APP_ROUTES.supplierPortalOrders} className={cn(spBtnGhost, "h-9")}>
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

        {/* Network pulse — same strip language as shops/invoices */}
        <div className="flex flex-wrap items-stretch gap-px overflow-hidden border border-[color-mix(in_srgb,var(--dash-ink)_14%,transparent)] bg-[color-mix(in_srgb,var(--dash-ink)_14%,transparent)]">
          <PulseStat
            label="Awaiting you"
            value={!loaded ? "…" : String(pendingOrders)}
            hot={pendingOrders > 0}
          />
          <PulseStat
            label="In transit"
            value={!loaded ? "…" : String(inTransit)}
          />
          <PulseStat
            label="Shops"
            value={!loaded ? "…" : hub ? String(hub.shopCount) : "—"}
          />
          {canViewMoney ? (
            <>
              <PulseStat
                label="Outstanding"
                value={!loaded ? "…" : hub ? money(hub.totals.owed, currency) : "—"}
                hot={owed > 0}
              />
              <PulseStat
                label="Today in"
                value={!loaded ? "…" : money(todayCollections, currency)}
              />
            </>
          ) : (
            <PulseStat label="Stale >24h" value={!loaded ? "…" : String(staleOrders)} hot={staleOrders > 0} />
          )}
        </div>

        {/* Balanced two-column board */}
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {/* Left — attention + money */}
          <section
            className={cn(
              "overflow-hidden border border-[color-mix(in_srgb,var(--dash-ink)_14%,transparent)]",
              "bg-[linear-gradient(165deg,#faf7f1_0%,#f3eee6_48%,#ebe4d8_100%)]",
            )}
          >
            <div
              className={cn(
                "flex h-9 items-center justify-between px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white",
                hasAttention
                  ? "bg-[linear-gradient(100deg,var(--pos-primary)_0%,#0d6a63_55%,#b9691a_160%)]"
                  : "bg-[var(--pos-primary)]",
              )}
            >
              <span>Needs attention</span>
              <span className="font-mono tabular-nums opacity-85">
                {pendingOrders + (partialPending > 0 ? 1 : 0)}
              </span>
            </div>

            {!loaded ? (
              <div className="flex items-center justify-center gap-2 px-4 py-12 text-[13px] text-[color-mix(in_srgb,var(--dash-ink)_48%,transparent)]">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </div>
            ) : hasAttention ? (
              <ul className="divide-y divide-[color-mix(in_srgb,var(--dash-ink)_10%,transparent)]">
                {pendingOrders > 0 ? (
                  <AttentionItem
                    href={`${APP_ROUTES.supplierPortalOrders}?inbox=1`}
                    label="Pending orders"
                    value={String(pendingOrders)}
                    hint={
                      staleOrders > 0
                        ? `${staleOrders} waiting over 24h`
                        : "Respond to keep shops moving"
                    }
                    stamp="Await"
                  />
                ) : null}
                {partialPending > 0 ? (
                  <AttentionItem
                    href={APP_ROUTES.supplierPortalInvoices}
                    label="Partial balances"
                    value={money(partialPending, currency)}
                    hint={`${partialShopCount} shop${partialShopCount === 1 ? "" : "s"} part-paid`}
                    stamp="Open"
                  />
                ) : null}
              </ul>
            ) : (
              <div className="flex items-center gap-3 px-4 py-8 text-[13px] text-[color-mix(in_srgb,var(--dash-ink)_58%,transparent)]">
                <span className="flex size-8 items-center justify-center border border-[color-mix(in_srgb,var(--pos-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)] text-[var(--pos-primary)]">
                  <Check className="size-4" strokeWidth={2.5} aria-hidden />
                </span>
                You&apos;re caught up — nothing waiting.
              </div>
            )}

            {canViewMoney ? (
              <div className="border-t border-[color-mix(in_srgb,var(--dash-ink)_12%,transparent)] bg-[var(--pos-primary)] px-4 py-4 text-white">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                      Outstanding
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-heading)] text-[2rem] font-semibold leading-none tabular-nums tracking-tight">
                      {hub ? money(hub.totals.owed, currency) : "—"}
                    </p>
                    <p className="mt-1.5 text-[12px] text-white/70">
                      {hub
                        ? `Across ${hub.shopCount} shop${hub.shopCount === 1 ? "" : "s"}`
                        : "Loading…"}
                    </p>
                  </div>
                  <Link
                    href={APP_ROUTES.supplierPortalPayments}
                    className="inline-flex h-8 items-center gap-1.5 border border-white/30 px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/10"
                  >
                    <Wallet className="size-3.5" />
                    Payments
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
                  <div>
                    <p className="text-[10px] text-white/55">Today collected</p>
                    <p className="mt-0.5 font-mono text-[14px] font-semibold tabular-nums">
                      {money(todayCollections, currency)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/45">
                      {shopsPaidToday > 0
                        ? `${shopsPaidToday} shop${shopsPaidToday === 1 ? "" : "s"} paid`
                        : "No payments yet today"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/55">Paid all-time</p>
                    <p className="mt-0.5 font-mono text-[14px] font-semibold tabular-nums">
                      {hub ? money(hub.totals.paid, currency) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* Right — routes + shops */}
          <section
            className={cn(
              "overflow-hidden border border-[color-mix(in_srgb,var(--dash-ink)_14%,transparent)]",
              "bg-[color-mix(in_srgb,#fff_82%,#f7f3eb)]",
            )}
          >
            <div className="flex h-9 items-center justify-between bg-[var(--pos-primary)] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
              <span>Quick routes</span>
              <span className="font-mono opacity-85">4</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[color-mix(in_srgb,var(--dash-ink)_10%,transparent)]">
              <RouteTile
                href={`${APP_ROUTES.supplierPortalOrders}?inbox=1`}
                icon={<Package className="size-4" strokeWidth={1.6} />}
                label="Orders"
                hint={pendingOrders > 0 ? `${pendingOrders} pending` : "Inbox"}
                hot={pendingOrders > 0}
              />
              <RouteTile
                href={APP_ROUTES.supplierPortalCatalog}
                icon={<ShoppingBag className="size-4" strokeWidth={1.6} />}
                label="Catalogue"
                hint="Price list"
              />
              <RouteTile
                href={APP_ROUTES.supplierPortalShops}
                icon={<Building2 className="size-4" strokeWidth={1.6} />}
                label="Shops"
                hint={hub ? `${hub.shopCount} linked` : "Route board"}
              />
              <RouteTile
                href={
                  canViewMoney
                    ? APP_ROUTES.supplierPortalInvoices
                    : APP_ROUTES.supplierPortalDeliveries
                }
                icon={<ClipboardList className="size-4" strokeWidth={1.6} />}
                label={canViewMoney ? "Invoices" : "Deliveries"}
                hint={
                  canViewMoney
                    ? partialPending > 0
                      ? "Open balances"
                      : "Ledger"
                    : "Ship status"
                }
              />
            </div>

            {hub && hub.shops.length > 0 ? (
              <div className="border-t border-[color-mix(in_srgb,var(--dash-ink)_12%,transparent)]">
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--dash-ink)_48%,transparent)]">
                    Connected shops
                  </p>
                  <Link
                    href={APP_ROUTES.supplierPortalShops}
                    className="text-[11px] font-semibold text-[var(--pos-primary)]"
                  >
                    See all
                  </Link>
                </div>
                <ul className="divide-y divide-[color-mix(in_srgb,var(--dash-ink)_8%,transparent)]">
                  {hub.shops.slice(0, 4).map((shop, i) => (
                    <li key={shop.localSupplierId}>
                      <Link
                        href={`${APP_ROUTES.supplierPortalShops}/${shop.localSupplierId}`}
                        className="flex min-h-12 items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white"
                      >
                        <span className="font-mono text-[10px] font-bold tabular-nums text-[var(--pos-primary)]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-[var(--dash-ink)]">
                            {shop.shopName}
                          </p>
                          {canViewMoney ? (
                            <p
                              className={cn(
                                "font-mono text-[11px] tabular-nums",
                                toNum(shop.owed) > 0
                                  ? "text-[var(--dash-mango)]"
                                  : "text-[color-mix(in_srgb,var(--dash-ink)_45%,transparent)]",
                              )}
                            >
                              Owed {money(shop.owed, currency)}
                            </p>
                          ) : null}
                        </div>
                        <ArrowRight className="size-3.5 shrink-0 text-[color-mix(in_srgb,var(--dash-ink)_30%,transparent)]" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        <SupplierActivityTabs />

        {emptyShops ? (
          <div className="flex flex-col gap-4 border border-[color-mix(in_srgb,var(--dash-ink)_14%,transparent)] bg-[color-mix(in_srgb,#fff_82%,#f7f3eb)] px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[var(--dash-ink)]">No shops linked yet</p>
              <p className="mt-1 text-[13px] text-[color-mix(in_srgb,var(--dash-ink)_55%,transparent)]">
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
        "flex min-w-[6.5rem] flex-1 flex-col gap-0.5 px-3 py-2.5",
        hot
          ? "bg-[color-mix(in_srgb,var(--dash-mango)_12%,#fff)]"
          : "bg-[color-mix(in_srgb,#fff_78%,#f7f3eb)]",
      )}
    >
      <span
        className={cn(
          "font-mono text-[1.1rem] font-bold tabular-nums leading-none",
          hot ? "text-[var(--dash-mango)]" : "text-[var(--pos-primary)]",
        )}
      >
        {value}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--dash-ink)_48%,transparent)]">
        {label}
      </span>
    </div>
  );
}

function AttentionItem({
  href,
  label,
  value,
  hint,
  stamp,
}: {
  href: string;
  label: string;
  value: string;
  hint: string;
  stamp: string;
}) {
  return (
    <li className="relative bg-[color-mix(in_srgb,#fff_72%,transparent)] transition-colors hover:bg-white">
      <Link href={href} className="flex items-start gap-3 px-3 py-3.5 sm:px-4">
        <div className="min-w-0 flex-1 pr-12">
          <p className="text-[14px] font-semibold text-[var(--dash-ink)]">{label}</p>
          <p className="mt-0.5 text-[12px] text-[color-mix(in_srgb,var(--dash-ink)_52%,transparent)]">
            {hint}
          </p>
        </div>
        <p className="shrink-0 font-mono text-[1.15rem] font-bold tabular-nums text-[var(--dash-mango)]">
          {value}
        </p>
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 rotate-6 border border-[color-mix(in_srgb,var(--dash-mango)_50%,transparent)] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--dash-mango)]"
        >
          {stamp}
        </span>
      </Link>
    </li>
  );
}

function RouteTile({
  href,
  icon,
  label,
  hint,
  hot,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  hint: string;
  hot?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[5.25rem] flex-col justify-between gap-2 bg-[color-mix(in_srgb,#fff_88%,#f7f3eb)] px-3 py-3 transition-colors hover:bg-white",
        hot && "bg-[color-mix(in_srgb,var(--dash-mango)_8%,#fff)]",
      )}
    >
      <span
        className={cn(
          "text-[var(--pos-primary)]",
          hot && "text-[var(--dash-mango)]",
        )}
      >
        {icon}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-[var(--dash-ink)]">{label}</p>
        <p className="mt-0.5 text-[11px] text-[color-mix(in_srgb,var(--dash-ink)_48%,transparent)]">
          {hint}
        </p>
      </div>
    </Link>
  );
}
