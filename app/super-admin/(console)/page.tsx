"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import {
  ArrowUpRight,
  Headphones,
  Mail,
  RefreshCw,
  Store,
  TriangleAlert,
} from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  type SaPlatformOverview,
  fetchSaPlatformOverview,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

function tenantHref(id: string, name: string, slug: string, tier: string, active: boolean) {
  const q = new URLSearchParams({
    name,
    slug,
    tier,
    active: active ? "1" : "0",
  });
  return `${APP_ROUTES.superAdminBusinesses}/${encodeURIComponent(id)}?${q.toString()}`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatKes(amount: number | null | undefined) {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return "KES —";
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  }).format(n);
}

function formatUnits(n: number | null | undefined) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}k`;
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(v);
}

function formatInt(n: number | null | undefined) {
  return new Intl.NumberFormat("en-KE").format(Number(n ?? 0));
}

function dayLabel(isoDay: string) {
  const d = new Date(`${isoDay}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDay.slice(5);
  return d.toLocaleDateString(undefined, { weekday: "narrow" });
}

const DIRECTORY = [
  { href: APP_ROUTES.superAdminBusinesses, label: "Tenants", hint: "Provision & impersonate" },
  { href: APP_ROUTES.superAdminCampaigns, label: "Campaigns", hint: "Nudge stuck signups" },
  { href: APP_ROUTES.superAdminSupport, label: "Support", hint: "Tenant & visitor inbox" },
  { href: APP_ROUTES.superAdminAdoptions, label: "Adoptions", hint: "Kiosk Pay & domains" },
  { href: APP_ROUTES.superAdminPlatformGlobalCatalog, label: "Catalog", hint: "Shared packs" },
  { href: APP_ROUTES.superAdminPlatformLogs, label: "Logs", hint: "Client & API errors" },
] as const;

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<SaPlatformOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setData(await fetchSaPlatformOverview());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load platform overview.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const maxDaySales = useMemo(() => {
    if (!data?.last14Days?.length) return 1;
    return Math.max(1, ...data.last14Days.map((d) => d.sales));
  }, [data]);

  const maxSellerUnits = useMemo(() => {
    if (!data?.bestSellers?.length) return 1;
    return Math.max(1, ...data.bestSellers.map((b) => Number(b.unitsSold) || 0));
  }, [data]);

  const attentionCount =
    (data?.stuckSignups.total ?? 0) + (data?.support.waitingOnAdmin ?? 0);

  return (
    <div className="space-y-8">
      <SuperAdminPageHeader
        title="Overview"
        description="What needs you now, what the fleet sold, and who is stuck before first sale."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="gap-1.5"
              disabled={loading || refreshing}
              onClick={() => void load(true)}
            >
              <RefreshCw className={cn("size-3.5 opacity-70", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" type="button" className="gap-1.5" asChild>
              <Link href={APP_ROUTES.superAdminBusinesses}>
                All tenants
                <ArrowUpRight className="size-3.5 opacity-70" />
              </Link>
            </Button>
          </div>
        }
      />

      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

      {/* Needs attention — actionable first */}
      <section
        className={cn(
          "overflow-hidden rounded-2xl border shadow-sm",
          attentionCount > 0
            ? "border-amber-500/35 bg-gradient-to-br from-amber-500/[0.07] via-card to-card"
            : "border-border/70 bg-card",
        )}
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/50 px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-sm font-medium text-foreground">Needs attention</h2>
            <p className="text-xs text-muted-foreground">
              Stuck onboarding and threads waiting on a platform reply
            </p>
          </div>
          {!loading && attentionCount > 0 ? (
            <Badge variant="warning" className="tabular-nums">
              {formatInt(attentionCount)} open
            </Badge>
          ) : null}
        </div>
        <div className="grid gap-0 sm:grid-cols-3">
          <AttentionStat
            icon={TriangleAlert}
            label="Stuck signups"
            value={loading ? "—" : formatInt(data?.stuckSignups.total)}
            hint="Invited, never logged in, or onboarding incomplete"
            href={APP_ROUTES.superAdminCampaigns}
            cta="Email them"
            emphasize={!loading && (data?.stuckSignups.total ?? 0) > 0}
          />
          <AttentionStat
            icon={Headphones}
            label="Waiting on you"
            value={loading ? "—" : formatInt(data?.support.waitingOnAdmin)}
            hint={`${formatInt(data?.support.openTenantThreads)} tenant · ${formatInt(data?.support.openVisitorThreads)} visitor open`}
            href={APP_ROUTES.superAdminSupport}
            cta="Open inbox"
            emphasize={!loading && (data?.support.waitingOnAdmin ?? 0) > 0}
          />
          <AttentionStat
            icon={Store}
            label="New shops (7d)"
            value={loading ? "—" : formatInt(data?.tenants.createdLast7Days)}
            hint={`${formatInt(data?.tenants.kioskPayActive)} on Kiosk Pay · ${formatInt(data?.tenants.active)} active`}
            href={APP_ROUTES.superAdminAdoptions}
            cta="Adoptions"
          />
        </div>
      </section>

      {/* Commerce pulse */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight">Commerce pulse</h2>
            <p className="text-xs text-muted-foreground">
              Completed POS sales across every tenant · storefront paid orders separate
            </p>
          </div>
        </div>

        <div className="grid overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm lg:grid-cols-12">
          <div className="border-b border-border/60 px-5 py-5 lg:col-span-4 lg:border-b-0 lg:border-r">
            <p className="text-xs text-muted-foreground">Units sold today</p>
            <p className="mt-1 font-heading text-3xl font-semibold tabular-nums tracking-tight">
              {loading ? "—" : formatUnits(data?.commerce.unitsSoldToday)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {loading
                ? "…"
                : `${formatInt(data?.commerce.salesToday)} sales · ${formatKes(data?.commerce.revenueToday)}`}
            </p>
          </div>
          <div className="border-b border-border/60 px-5 py-5 sm:border-r lg:col-span-4 lg:border-b-0">
            <p className="text-xs text-muted-foreground">Units sold · 30 days</p>
            <p className="mt-1 font-heading text-3xl font-semibold tabular-nums tracking-tight">
              {loading ? "—" : formatUnits(data?.commerce.unitsSoldLast30Days)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {loading
                ? "…"
                : `${formatInt(data?.commerce.salesLast30Days)} sales · ${formatKes(data?.commerce.revenueLast30Days)}`}
            </p>
          </div>
          <div className="px-5 py-5 lg:col-span-4">
            <p className="text-xs text-muted-foreground">All-time through the tills</p>
            <p className="mt-1 font-heading text-3xl font-semibold tabular-nums tracking-tight">
              {loading ? "—" : formatUnits(data?.commerce.unitsSoldAllTime)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {loading
                ? "…"
                : `${formatInt(data?.commerce.salesAllTime)} sales · ${formatKes(data?.commerce.revenueAllTime)}`}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium">Last 14 days</h3>
              <p className="text-xs text-muted-foreground">Sales count per day</p>
            </div>
            {loading ? (
              <div className="flex h-28 items-end gap-1.5" aria-hidden>
                {Array.from({ length: 14 }, (_, i) => (
                  <div key={i} className="flex-1 animate-pulse rounded-t bg-muted" style={{ height: `${30 + (i % 5) * 12}%` }} />
                ))}
              </div>
            ) : (
              <div className="flex h-28 items-end gap-1.5" role="img" aria-label="Daily sales for the last 14 days">
                {(data?.last14Days ?? []).map((bucket) => {
                  const h = Math.max(4, Math.round((bucket.sales / maxDaySales) * 100));
                  return (
                    <div key={bucket.day} className="group flex h-full flex-1 flex-col justify-end gap-1">
                      <div
                        className="w-full rounded-t bg-foreground/80 transition-[height] duration-300 group-hover:bg-foreground"
                        style={{ height: `${h}%` }}
                        title={`${bucket.day}: ${bucket.sales} sales · ${formatKes(bucket.revenue)}`}
                      />
                      <span className="text-center text-[10px] text-muted-foreground">{dayLabel(bucket.day)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">Storefront</h3>
                <p className="text-xs text-muted-foreground">Paid web / WhatsApp orders</p>
              </div>
              <Mail className="size-4 text-muted-foreground/70" aria-hidden />
            </div>
            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-xs text-muted-foreground">Units · 30d</dt>
                <dd className="font-heading text-lg font-semibold tabular-nums">
                  {loading ? "—" : formatUnits(data?.storefront.unitsSoldLast30Days)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-xs text-muted-foreground">GMV · 30d</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {loading ? "—" : formatKes(data?.storefront.paidGmvLast30Days)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-t border-border/50 pt-3">
                <dt className="text-xs text-muted-foreground">Orders all-time</dt>
                <dd className="text-sm tabular-nums text-muted-foreground">
                  {loading ? "—" : formatInt(data?.storefront.paidOrdersAllTime)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        {/* Best sellers */}
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm xl:col-span-5">
          <div className="border-b border-border/60 px-4 py-3.5 sm:px-5">
            <h2 className="text-sm font-medium text-foreground">Best sellers · 30 days</h2>
            <p className="text-xs text-muted-foreground">Top SKUs by units moved across the network</p>
          </div>
          {loading ? (
            <SellerSkeleton />
          ) : !data?.bestSellers.length ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              No completed item sales in the last 30 days.
            </p>
          ) : (
            <ol className="divide-y divide-border/50">
              {data.bestSellers.map((row, index) => {
                const width = Math.max(6, Math.round((Number(row.unitsSold) / maxSellerUnits) * 100));
                return (
                  <li key={`${row.itemId}-${row.businessId}`} className="relative px-4 py-3 sm:px-5">
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 bg-muted/45"
                      style={{ width: `${width}%` }}
                      aria-hidden
                    />
                    <div className="relative flex items-baseline gap-3">
                      <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{row.itemName}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.businessName}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums">{formatUnits(row.unitsSold)}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {formatKes(row.revenue)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Hot tenants */}
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm xl:col-span-4">
          <div className="border-b border-border/60 px-4 py-3.5 sm:px-5">
            <h2 className="text-sm font-medium text-foreground">Hottest tills · 7 days</h2>
            <p className="text-xs text-muted-foreground">Revenue leaders — good health signal</p>
          </div>
          {loading ? (
            <ListSkeleton rows={6} />
          ) : !data?.hotTenants.length ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">No sales this week yet.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {data.hotTenants.map((t) => (
                <li key={t.businessId}>
                  <Link
                    href={tenantHref(t.businessId, t.businessName, t.slug, "", true)}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/35 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.businessName}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{t.slug}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatKes(t.revenueLast7Days)}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {formatInt(t.salesLast7Days)} sales
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Fleet + directory */}
        <section className="flex flex-col gap-6 xl:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <div className="border-b border-border/60 px-4 py-3.5 sm:px-5">
              <h2 className="text-sm font-medium">Fleet</h2>
              <p className="text-xs text-muted-foreground">Tenant directory snapshot</p>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-border/50">
              <FleetCell label="Total" value={loading ? "—" : formatInt(data?.tenants.total)} />
              <FleetCell label="Active" value={loading ? "—" : formatInt(data?.tenants.active)} />
              <FleetCell label="Inactive" value={loading ? "—" : formatInt(data?.tenants.inactive)} />
              <FleetCell
                label="Kiosk Pay"
                value={loading ? "—" : formatInt(data?.tenants.kioskPayActive)}
              />
            </dl>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <div className="border-b border-border/60 px-4 py-3 sm:px-5">
              <h2 className="text-sm font-medium">Jump</h2>
            </div>
            <ul className="divide-y divide-border/50">
              {DIRECTORY.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-muted/35 sm:px-5"
                  >
                    <span>
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{item.hint}</span>
                    </span>
                    <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/70" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* Stuck sample + recent */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-sm font-medium">Stuck in the funnel</h2>
              <p className="text-xs text-muted-foreground">Sample of shops that never finished setup</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${APP_ROUTES.superAdminCampaignNew}?segment=stuck_signup`}>Campaign</Link>
            </Button>
          </div>
          {loading ? (
            <ListSkeleton rows={5} />
          ) : !data?.stuckSignups.sample.length ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              Nobody stuck — every signup has moved past onboarding.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {data.stuckSignups.sample.map((row) => (
                <li key={`${row.businessId}-${row.email}`}>
                  <Link
                    href={tenantHref(row.businessId, row.businessName, row.slug, "", true)}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/35 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.businessName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.name} · {row.email}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {row.onboardingStatus || "pending"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-sm font-medium">Newest tenants</h2>
              <p className="text-xs text-muted-foreground">Most recently created shops</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={APP_ROUTES.superAdminBusinesses}>View all</Link>
            </Button>
          </div>
          {loading ? (
            <ListSkeleton rows={5} />
          ) : !data?.recentTenants.length ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">No tenants yet.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {data.recentTenants.map((b) => (
                <li key={b.id}>
                  <Link
                    href={tenantHref(b.id, b.name, b.slug, b.subscriptionTier, b.active)}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/35 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.name}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{b.slug}</p>
                    </div>
                    <Badge variant={b.active ? "success" : "secondary"} className="shrink-0">
                      {b.active ? "Active" : "Inactive"}
                    </Badge>
                    <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">
                      {formatDate(b.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function AttentionStat({
  icon: Icon,
  label,
  value,
  hint,
  href,
  cta,
  emphasize,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  href: string;
  cta: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col border-b border-border/50 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-5",
        emphasize && "bg-amber-500/[0.04]",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 font-heading text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{hint}</p>
      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
      >
        {cta}
        <ArrowUpRight className="size-3 opacity-70" />
      </Link>
    </div>
  );
}

function FleetCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-3.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-heading text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-border/50" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <div className="h-3.5 w-36 animate-pulse rounded bg-muted" />
          <div className="ml-auto h-5 w-14 animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}

function SellerSkeleton() {
  return (
    <div className="divide-y divide-border/50" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <div className="h-3 w-4 animate-pulse rounded bg-muted" />
          <div className="h-3.5 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-10 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
