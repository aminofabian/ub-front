"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Headphones,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Store,
  TriangleAlert,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
} from "@/components/dashboard-page-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  type SaPlatformOverview,
  fetchSaPlatformOverview,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  OVERVIEW_NAV,
  OverviewTheatre,
  type OverviewSectionId,
} from "./_components/overview-theatre";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PRIMARY_BTN =
  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white shadow-none hover:bg-[#0d6b63]";

function sectionFromHash(hash: string): OverviewSectionId | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (OVERVIEW_NAV.some((item) => item.id === id)) {
    return id as OverviewSectionId;
  }
  return null;
}

function tenantHref(
  id: string,
  name: string,
  slug: string,
  tier: string,
  active: boolean,
) {
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
  {
    href: APP_ROUTES.superAdminBusinesses,
    label: "Tenants",
    hint: "Provision & impersonate",
  },
  {
    href: APP_ROUTES.superAdminCampaigns,
    label: "Campaigns",
    hint: "Nudge stuck signups",
  },
  {
    href: APP_ROUTES.superAdminSupport,
    label: "Support",
    hint: "Tenant & visitor inbox",
  },
  {
    href: APP_ROUTES.superAdminAdoptions,
    label: "Adoptions",
    hint: "Kiosk Pay & domains",
  },
  {
    href: APP_ROUTES.superAdminPlatformGlobalCatalog,
    label: "Catalog",
    hint: "Shared packs",
  },
  {
    href: APP_ROUTES.superAdminPlatformLogs,
    label: "Logs",
    hint: "Client & API errors",
  },
] as const;

function Metric({
  label,
  value,
  hint,
  critical,
}: {
  label: string;
  value: string;
  hint?: string;
  critical?: boolean;
}) {
  return (
    <div className={cn("border bg-white px-3 py-2.5", HAIRLINE)}>
      <p className={dashboardHintClass()}>{label}</p>
      <p
        className={cn(
          "mt-1 text-[1.25rem] font-semibold tabular-nums tracking-[-0.03em]",
          critical ? "text-amber-800" : "text-foreground",
        )}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
      {hint ? (
        <p className={cn(dashboardHintClass(), "mt-1")}>{hint}</p>
      ) : null}
    </div>
  );
}

function PanelLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--pos-primary,#0f766e)] underline-offset-4 hover:underline"
    >
      {children}
      <ArrowUpRight className="size-3 opacity-70" aria-hidden />
    </Link>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="h-3.5 w-36 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]" />
          <div className="ml-auto h-5 w-14 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]" />
        </div>
      ))}
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<SaPlatformOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<OverviewSectionId | null>(
    null,
  );

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setData(await fetchSaPlatformOverview());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load platform overview.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const apply = () => {
      const next = sectionFromHash(window.location.hash);
      if (next) setActiveSection(next);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const maxDaySales = useMemo(() => {
    if (!data?.last14Days?.length) return 1;
    return Math.max(1, ...data.last14Days.map((d) => d.sales));
  }, [data]);

  const maxSellerUnits = useMemo(() => {
    if (!data?.bestSellers?.length) return 1;
    return Math.max(
      1,
      ...data.bestSellers.map((b) => Number(b.unitsSold) || 0),
    );
  }, [data]);

  const attentionCount =
    (data?.stuckSignups.total ?? 0) + (data?.support.waitingOnAdmin ?? 0);

  const sectionSummary = (sectionId: OverviewSectionId): ReactNode => {
    if (loading && !data) return "Loading…";
    switch (sectionId) {
      case "attention":
        return (
          <>
            <span
              className={cn(
                "font-semibold tabular-nums",
                attentionCount > 0 && "text-amber-800",
              )}
            >
              {formatInt(attentionCount)}
            </span>{" "}
            open
            {" · "}
            <span className="font-semibold tabular-nums">
              {formatInt(data?.stuckSignups.total)}
            </span>{" "}
            stuck
            {" · "}
            <span className="font-semibold tabular-nums">
              {formatInt(data?.support.waitingOnAdmin)}
            </span>{" "}
            waiting
          </>
        );
      case "commerce":
        return (
          <>
            <span className="font-semibold tabular-nums">
              {formatUnits(data?.commerce.unitsSoldToday)}
            </span>{" "}
            units today
            {" · "}
            <span className="font-semibold tabular-nums">
              {formatKes(data?.commerce.revenueToday)}
            </span>
          </>
        );
      case "sellers":
        return (
          <>
            <span className="font-semibold tabular-nums">
              {formatInt(data?.bestSellers.length)}
            </span>{" "}
            SKUs
            {" · "}
            top{" "}
            <span className="font-semibold">
              {data?.bestSellers[0]?.itemName ?? "—"}
            </span>
          </>
        );
      case "hot":
        return (
          <>
            <span className="font-semibold tabular-nums">
              {formatInt(data?.hotTenants.length)}
            </span>{" "}
            leaders
            {" · "}
            {data?.hotTenants[0]
              ? formatKes(data.hotTenants[0].revenueLast7Days)
              : "—"}{" "}
            top
          </>
        );
      case "stuck":
        return (
          <>
            <span className="font-semibold tabular-nums">
              {formatInt(data?.stuckSignups.total)}
            </span>{" "}
            stuck
            {" · "}
            showing{" "}
            <span className="font-semibold tabular-nums">
              {formatInt(data?.stuckSignups.sample.length)}
            </span>
          </>
        );
      case "recent":
        return (
          <>
            <span className="font-semibold tabular-nums">
              {formatInt(data?.tenants.createdLast7Days)}
            </span>{" "}
            new · 7d
            {" · "}
            <span className="font-semibold tabular-nums">
              {formatInt(data?.tenants.active)}
            </span>{" "}
            active
          </>
        );
      case "jump":
        return (
          <>
            <span className="font-semibold tabular-nums">
              {DIRECTORY.length}
            </span>{" "}
            shortcuts
            {" · "}
            <span className="font-semibold tabular-nums">
              {formatInt(data?.tenants.total)}
            </span>{" "}
            tenants
          </>
        );
      default:
        return null;
    }
  };

  const drawerBody = (() => {
    if (!activeSection) return null;

    if (activeSection === "attention") {
      return (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric
              label="Stuck signups"
              value={loading ? "—" : formatInt(data?.stuckSignups.total)}
              hint="Invited, never logged in, or onboarding incomplete"
              critical={!loading && (data?.stuckSignups.total ?? 0) > 0}
            />
            <Metric
              label="Waiting on you"
              value={loading ? "—" : formatInt(data?.support.waitingOnAdmin)}
              hint={`${formatInt(data?.support.openTenantThreads)} tenant · ${formatInt(data?.support.openVisitorThreads)} visitor open`}
              critical={!loading && (data?.support.waitingOnAdmin ?? 0) > 0}
            />
            <Metric
              label="New shops · 7d"
              value={loading ? "—" : formatInt(data?.tenants.createdLast7Days)}
              hint={`${formatInt(data?.tenants.kioskPayActive)} on Kiosk Pay · ${formatInt(data?.tenants.active)} active`}
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-3">
            <PanelLink href={APP_ROUTES.superAdminCampaigns}>
              Email stuck signups
            </PanelLink>
            <PanelLink href={APP_ROUTES.superAdminSupport}>Open inbox</PanelLink>
            <PanelLink href={APP_ROUTES.superAdminAdoptions}>
              Adoptions
            </PanelLink>
          </div>
        </div>
      );
    }

    if (activeSection === "commerce") {
      return (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric
              label="Units sold today"
              value={loading ? "—" : formatUnits(data?.commerce.unitsSoldToday)}
              hint={
                loading
                  ? "…"
                  : `${formatInt(data?.commerce.salesToday)} sales · ${formatKes(data?.commerce.revenueToday)}`
              }
            />
            <Metric
              label="Units · 30 days"
              value={
                loading ? "—" : formatUnits(data?.commerce.unitsSoldLast30Days)
              }
              hint={
                loading
                  ? "…"
                  : `${formatInt(data?.commerce.salesLast30Days)} sales · ${formatKes(data?.commerce.revenueLast30Days)}`
              }
            />
            <Metric
              label="All-time tills"
              value={
                loading ? "—" : formatUnits(data?.commerce.unitsSoldAllTime)
              }
              hint={
                loading
                  ? "…"
                  : `${formatInt(data?.commerce.salesAllTime)} sales · ${formatKes(data?.commerce.revenueAllTime)}`
              }
            />
          </div>

          <div className={cn("border bg-white px-3 py-3", HAIRLINE)}>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold tracking-[-0.015em]">
                Last 14 days
              </p>
              <p className={dashboardHintClass()}>Sales count per day</p>
            </div>
            {loading ? (
              <div className="flex h-28 items-end gap-1.5" aria-hidden>
                {Array.from({ length: 14 }, (_, i) => (
                  <div
                    key={i}
                    className="flex-1 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]"
                    style={{ height: `${30 + (i % 5) * 12}%` }}
                  />
                ))}
              </div>
            ) : (
              <div
                className="flex h-28 items-end gap-1.5"
                role="img"
                aria-label="Daily sales for the last 14 days"
              >
                {(data?.last14Days ?? []).map((bucket) => {
                  const h = Math.max(
                    4,
                    Math.round((bucket.sales / maxDaySales) * 100),
                  );
                  return (
                    <div
                      key={bucket.day}
                      className="group flex h-full flex-1 flex-col justify-end gap-1"
                    >
                      <div
                        className="w-full bg-[var(--pos-primary,#0f766e)]/80 transition-[height] duration-300 group-hover:bg-[var(--pos-primary,#0f766e)]"
                        style={{ height: `${h}%` }}
                        title={`${bucket.day}: ${bucket.sales} sales · ${formatKes(bucket.revenue)}`}
                      />
                      <span className="text-center text-[10px] text-muted-foreground">
                        {dayLabel(bucket.day)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={cn("border bg-white px-3 py-3", HAIRLINE)}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold tracking-[-0.015em]">
                  Storefront
                </p>
                <p className={dashboardHintClass()}>
                  Paid web / WhatsApp orders
                </p>
              </div>
            </div>
            <dl className="mt-3 space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <dt className={dashboardHintClass()}>Units · 30d</dt>
                <dd
                  className="text-[15px] font-semibold tabular-nums"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {loading
                    ? "—"
                    : formatUnits(data?.storefront.unitsSoldLast30Days)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className={dashboardHintClass()}>GMV · 30d</dt>
                <dd className="text-[13px] font-medium tabular-nums">
                  {loading
                    ? "—"
                    : formatKes(data?.storefront.paidGmvLast30Days)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-2.5">
                <dt className={dashboardHintClass()}>Orders all-time</dt>
                <dd className="text-[13px] tabular-nums text-muted-foreground">
                  {loading
                    ? "—"
                    : formatInt(data?.storefront.paidOrdersAllTime)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      );
    }

    if (activeSection === "sellers") {
      if (loading) return <ListSkeleton rows={6} />;
      if (!data?.bestSellers.length) {
        return (
          <p className={cn(dashboardHintClass(), "py-8 text-center")}>
            No completed item sales in the last 30 days.
          </p>
        );
      }
      return (
        <ol className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
          {data.bestSellers.map((row, index) => {
            const width = Math.max(
              6,
              Math.round((Number(row.unitsSold) / maxSellerUnits) * 100),
            );
            return (
              <li
                key={`${row.itemId}-${row.businessId}`}
                className="relative py-2.5"
              >
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)]"
                  style={{ width: `${width}%` }}
                  aria-hidden
                />
                <div className="relative flex items-baseline gap-3">
                  <span className="w-5 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold tracking-[-0.015em]">
                      {row.itemName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {row.businessName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold tabular-nums">
                      {formatUnits(row.unitsSold)}
                    </p>
                    <p className="text-[11px] tabular-nums text-muted-foreground">
                      {formatKes(row.revenue)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      );
    }

    if (activeSection === "hot") {
      if (loading) return <ListSkeleton rows={6} />;
      if (!data?.hotTenants.length) {
        return (
          <p className={cn(dashboardHintClass(), "py-8 text-center")}>
            No sales this week yet.
          </p>
        );
      }
      return (
        <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
          {data.hotTenants.map((t) => (
            <li key={t.businessId}>
              <Link
                href={tenantHref(
                  t.businessId,
                  t.businessName,
                  t.slug,
                  "",
                  true,
                )}
                className="flex items-center gap-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold tracking-[-0.015em]">
                    {t.businessName}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {t.slug}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-semibold tabular-nums">
                    {formatKes(t.revenueLast7Days)}
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {formatInt(t.salesLast7Days)} sales
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      );
    }

    if (activeSection === "stuck") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className={dashboardHintClass()}>
              Sample of shops that never finished setup
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-none"
              asChild
            >
              <Link
                href={`${APP_ROUTES.superAdminCampaignNew}?segment=stuck_signup`}
              >
                Campaign
              </Link>
            </Button>
          </div>
          {loading ? (
            <ListSkeleton rows={5} />
          ) : !data?.stuckSignups.sample.length ? (
            <p className={cn(dashboardHintClass(), "py-8 text-center")}>
              Nobody stuck — every signup has moved past onboarding.
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {data.stuckSignups.sample.map((row) => (
                <li key={`${row.businessId}-${row.email}`}>
                  <Link
                    href={tenantHref(
                      row.businessId,
                      row.businessName,
                      row.slug,
                      "",
                      true,
                    )}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold tracking-[-0.015em]">
                        {row.businessName}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {row.name} · {row.email}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 rounded-none capitalize"
                    >
                      {row.onboardingStatus || "pending"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (activeSection === "recent") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className={dashboardHintClass()}>Most recently created shops</p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-none"
              asChild
            >
              <Link href={APP_ROUTES.superAdminBusinesses}>View all</Link>
            </Button>
          </div>
          {loading ? (
            <ListSkeleton rows={5} />
          ) : !data?.recentTenants.length ? (
            <p className={cn(dashboardHintClass(), "py-8 text-center")}>
              No tenants yet.
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {data.recentTenants.map((b) => (
                <li key={b.id}>
                  <Link
                    href={tenantHref(
                      b.id,
                      b.name,
                      b.slug,
                      b.subscriptionTier,
                      b.active,
                    )}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold tracking-[-0.015em]">
                        {b.name}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {b.slug}
                      </p>
                    </div>
                    <Badge
                      variant={b.active ? "success" : "secondary"}
                      className="shrink-0 rounded-none"
                    >
                      {b.active ? "Active" : "Inactive"}
                    </Badge>
                    <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground sm:inline">
                      {formatDate(b.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (activeSection === "jump") {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-[13px] font-semibold tracking-[-0.015em]">
              Fleet
            </p>
            <p className={cn(dashboardHintClass(), "mt-0.5")}>
              Tenant directory snapshot
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <Metric
                label="Total"
                value={loading ? "—" : formatInt(data?.tenants.total)}
              />
              <Metric
                label="Active"
                value={loading ? "—" : formatInt(data?.tenants.active)}
              />
              <Metric
                label="Inactive"
                value={loading ? "—" : formatInt(data?.tenants.inactive)}
              />
              <Metric
                label="Kiosk Pay"
                value={loading ? "—" : formatInt(data?.tenants.kioskPayActive)}
              />
            </dl>
          </div>

          <div>
            <p className="text-[13px] font-semibold tracking-[-0.015em]">
              Shortcuts
            </p>
            <ul className="mt-2 divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
              {DIRECTORY.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-2 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]"
                  >
                    <span>
                      <span className="block text-[13px] font-semibold tracking-[-0.015em]">
                        {item.label}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {item.hint}
                      </span>
                    </span>
                    <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/70" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    return null;
  })();

  const drawerFooter =
    activeSection === "attention" ? (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className={PRIMARY_BTN} asChild>
          <Link href={APP_ROUTES.superAdminSupport}>
            <Headphones className="size-3.5" aria-hidden />
            Inbox
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-none"
          asChild
        >
          <Link href={APP_ROUTES.superAdminCampaigns}>
            <TriangleAlert className="size-3.5" aria-hidden />
            Campaigns
          </Link>
        </Button>
      </div>
    ) : activeSection === "stuck" ? (
      <Button size="sm" className={PRIMARY_BTN} asChild>
        <Link
          href={`${APP_ROUTES.superAdminCampaignNew}?segment=stuck_signup`}
        >
          Start stuck-signup campaign
        </Link>
      </Button>
    ) : activeSection === "recent" || activeSection === "hot" ? (
      <Button size="sm" className={PRIMARY_BTN} asChild>
        <Link href={APP_ROUTES.superAdminBusinesses}>
          <Store className="size-3.5" aria-hidden />
          All tenants
        </Link>
      </Button>
    ) : undefined;

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={LayoutDashboard}
        eyebrow="Platform"
        title="Overview"
        description="What needs you now, what the fleet sold, and who is stuck before first sale."
      >
        <button
          type="button"
          disabled={loading || refreshing}
          onClick={() => void load(true)}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border bg-white text-[#666666]",
            HAIRLINE,
            "transition-colors hover:border-[#0f766e] hover:text-[#0f766e]",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label="Refresh overview"
        >
          {refreshing ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
        </button>
        <Button size="sm" className={PRIMARY_BTN} asChild>
          <Link href={APP_ROUTES.superAdminBusinesses}>
            All tenants
            <ArrowUpRight className="size-3.5 opacity-80" aria-hidden />
          </Link>
        </Button>
      </DashboardPageHero>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <OverviewTheatre
        activeSectionId={activeSection}
        onActiveSectionChange={setActiveSection}
        attentionCount={attentionCount}
        unitsToday={formatUnits(data?.commerce.unitsSoldToday)}
        salesToday={formatInt(data?.commerce.salesToday)}
        activeTenants={formatInt(data?.tenants.active)}
        loading={loading}
        sectionSummary={sectionSummary}
        drawerBody={drawerBody}
        drawerFooter={drawerFooter}
      />
    </div>
  );
}
