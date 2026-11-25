"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

import { PlatformPaymentsLedger } from "@/components/super-admin/platform-payments-list";
import { useSaPlatformPayments } from "@/hooks/use-sa-platform-payments";
import { APP_ROUTES } from "@/lib/config";
import type { GatewayStkPushOpsRecord, SaPlatformOverview } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const RULE = "border-[var(--op-rule)]";
const SURFACE = "bg-[var(--op-surface)]";
const MUTED = "text-[var(--op-muted)]";
const INK = "text-[var(--op-ink)]";
const CRITICAL = "text-[#A55237]";
const GRID = "grid gap-px bg-[var(--op-rule)]";
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--op-accent)]";
const ROW = cn(
  "flex min-h-11 items-center gap-3 px-3 py-2 transition-colors",
  "hover:bg-[#f4f4f4]",
  FOCUS,
);

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
    hint: "Client and API errors",
  },
] as const;

type OverviewDeskProps = {
  data: SaPlatformOverview | null;
  loading: boolean;
};

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

function dayNumber(isoDay: string) {
  const d = new Date(`${isoDay}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDay.slice(8);
  return String(d.getUTCDate());
}

function tenantHref(id: string, name: string, slug: string, tier = "", active = true) {
  const q = new URLSearchParams({
    name,
    slug,
    tier,
    active: active ? "1" : "0",
  });
  return `${APP_ROUTES.superAdminBusinesses}/${encodeURIComponent(id)}?${q.toString()}`;
}

function figure(loading: boolean, value: string) {
  return loading ? "—" : value;
}

function Band({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn("overflow-hidden rounded-[2px] border", RULE)}>
      {children}
    </section>
  );
}

function ColumnHead({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn("flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-3 py-2", RULE)}>
      <h3 className={cn("text-[13px] font-semibold tracking-[-0.02em]", INK)}>{title}</h3>
      {action ?? (meta ? <span className={cn("text-[12px] tabular-nums", MUTED)}>{meta}</span> : null)}
    </div>
  );
}

function EmptyLine({ children }: { children: string }) {
  return <p className={cn("px-3 py-8 text-center text-[13px]", MUTED)}>{children}</p>;
}

function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={cn("flex items-center gap-3 border-b px-3 py-3 last:border-b-0", RULE)}>
          <div className="h-3 w-36 animate-pulse bg-[color-mix(in_srgb,var(--op-ink)_8%,transparent)]" />
          <div className="ml-auto h-3 w-12 animate-pulse bg-[color-mix(in_srgb,var(--op-ink)_8%,transparent)]" />
        </div>
      ))}
    </div>
  );
}

function TextLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center text-[12px] font-semibold text-[var(--op-accent)] underline-offset-4 hover:underline",
        FOCUS,
      )}
    >
      {children}
    </Link>
  );
}

type BoardId = "attention" | "payments" | "commerce" | "moving" | "shops";

const BOARD_COPY: Record<BoardId, { title: string; note: string }> = {
  attention: {
    title: "Needs you",
    note: "Signups that stalled, and threads waiting on the platform.",
  },
  payments: {
    title: "Till book",
    note: "Money paid to Kiosk — SMS credits, packages, domains, and float.",
  },
  commerce: {
    title: "Sold",
    note: "Till sales across the fleet, then the paid storefront.",
  },
  moving: {
    title: "Moving",
    note: "Who sold this week, and which SKUs left the shelf.",
  },
  shops: {
    title: "Shops",
    note: "Newest shops, the fleet counts, and the doors off this page.",
  },
};

function boardFromHash(hash: string): BoardId {
  if (hash === "stuck" || hash === "attention") return "attention";
  if (hash === "payments") return "payments";
  if (hash === "commerce") return "commerce";
  if (hash === "hot" || hash === "sellers" || hash === "moving") return "moving";
  if (hash === "recent" || hash === "jump" || hash === "shops") return "shops";
  return "attention";
}

function hashForBoard(id: BoardId) {
  if (id === "moving") return "hot";
  if (id === "shops") return "recent";
  return id;
}

function MenuButton({
  label,
  value,
  active,
  critical,
  onSelect,
}: {
  label: string;
  value: string;
  active: boolean;
  critical?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 w-auto shrink-0 items-center justify-between gap-3 rounded-[8px] px-2.5 text-left text-[13px] font-medium",
        "xl:w-full",
        FOCUS,
        active
          ? "bg-[#1a3328] text-white"
          : "text-[#5c5c5c] hover:bg-white hover:text-[#1a1a1a]",
      )}
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "shrink-0 text-[12px] tabular-nums",
          active ? "text-white/80" : critical ? CRITICAL : MUTED,
        )}
      >
        {value}
      </span>
    </button>
  );
}

function WorkMenu({
  items,
  active,
  onSelect,
}: {
  items: { id: BoardId; label: string; value: string; critical?: boolean }[];
  active: BoardId;
  onSelect: (id: BoardId) => void;
}) {
  return (
    <nav aria-label="Overview sections" className="min-w-0 max-w-full rounded-[12px] bg-[#f4f4f4] p-1.5 xl:sticky xl:top-0">
      <p className="hidden px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-[#6b6b6b] xl:block">Work</p>
      <div className="flex min-w-0 max-w-full gap-1 overflow-x-auto xl:flex-col xl:overflow-visible">
        {items.map((item) => (
          <MenuButton
            key={item.id}
            label={item.label}
            value={item.value}
            active={active === item.id}
            critical={item.critical}
            onSelect={() => onSelect(item.id)}
          />
        ))}
      </div>
    </nav>
  );
}

function GoMenu({
  facts,
}: {
  facts: { label: string; value: string; critical?: boolean }[];
}) {
  return (
    <aside className="rounded-[12px] bg-[#f4f4f4] p-1.5 xl:sticky xl:top-0" aria-label="Shortcuts">
      <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-[#6b6b6b]">Right now</p>
      <ul className="overflow-hidden rounded-[8px] bg-white">
        {facts.map((fact) => (
          <li
            key={fact.label}
            className="flex min-h-11 items-center justify-between gap-3 border-b border-[#ececec] px-2.5 last:border-b-0"
          >
            <span className="text-[12px] text-[#5c5c5c]">{fact.label}</span>
            <span className={cn("text-[13px] font-semibold tabular-nums", fact.critical ? CRITICAL : INK)}>
              {fact.value}
            </span>
          </li>
        ))}
      </ul>
      <p className="px-2.5 pb-1 pt-3 text-[11px] font-medium text-[#6b6b6b]">Go</p>
      <ul className="grid grid-cols-2 gap-1 xl:grid-cols-1">
        {DIRECTORY.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex min-h-11 items-center justify-between gap-2 rounded-[8px] px-2.5 text-[13px] font-medium text-[#1a1a1a]",
                "hover:bg-white",
                FOCUS,
              )}
            >
              <span className="min-w-0">
                <span className="block truncate">{item.label}</span>
                <span className="block truncate text-[11px] font-normal text-[#6b6b6b]">{item.hint}</span>
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 text-[#8a8a8a]" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function AttentionBand({ data, loading }: OverviewDeskProps) {
  const sample = data?.stuckSignups.sample ?? [];
  const stuck = data?.stuckSignups.total ?? 0;
  const waiting = data?.support.waitingOnAdmin ?? 0;

  return (
    <Band id="attention">
      <div className={cn(GRID, "lg:grid-cols-[minmax(0,1.45fr)_minmax(14.5rem,0.7fr)]")}>
        <div id="stuck" className={cn("scroll-mt-20", SURFACE)}>
          <ColumnHead
            title="Stuck signups"
            action={
              <span className="flex items-center gap-3">
                <span className={cn("text-[13px] font-semibold tabular-nums", stuck > 0 && !loading ? CRITICAL : INK)}>
                  {figure(loading, formatInt(stuck))}
                </span>
                <TextLink href={`${APP_ROUTES.superAdminCampaignNew}?segment=stuck_signup`}>
                  Start a campaign
                </TextLink>
              </span>
            }
          />
          {loading ? <SkeletonRows rows={5} /> : null}
          {!loading && sample.length === 0 ? (
            <EmptyLine>Nobody stuck — every signup has moved past onboarding.</EmptyLine>
          ) : null}
          {!loading && sample.length > 0 ? (
            <ul>
              {sample.map((row) => (
                <li key={`${row.businessId}-${row.email}`} className={cn("border-b last:border-b-0", RULE)}>
                  <Link
                    href={tenantHref(row.businessId, row.businessName, row.slug)}
                    className={ROW}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[13px] font-semibold", INK)}>
                        {row.businessName}
                      </span>
                      <span className={cn("block truncate text-[12px]", MUTED)}>
                        {row.name} · {row.email}
                      </span>
                    </span>
                    <span className={cn("shrink-0 text-[12px] capitalize", MUTED)}>
                      {row.onboardingStatus || "pending"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className={cn(GRID, "h-full sm:grid-cols-2 lg:grid-cols-1 lg:auto-rows-fr")}>
          <QueueFact
            label="Waiting on you"
            value={figure(loading, formatInt(waiting))}
            hint={
              loading
                ? "…"
                : `${formatInt(data?.support.openTenantThreads)} tenant · ${formatInt(data?.support.openVisitorThreads)} visitor open`
            }
            critical={!loading && waiting > 0}
            href={APP_ROUTES.superAdminSupport}
            action="Open inbox"
          />
          <QueueFact
            label="New shops · 7 days"
            value={figure(loading, formatInt(data?.tenants.createdLast7Days))}
            hint={
              loading
                ? "…"
                : `${formatInt(data?.tenants.kioskPayActive)} on Kiosk Pay · ${formatInt(data?.tenants.active)} active`
            }
            href={APP_ROUTES.superAdminBusinesses}
            action="All tenants"
          />
        </div>
      </div>
    </Band>
  );
}

function QueueFact({
  label,
  value,
  hint,
  critical,
  href,
  action,
}: {
  label: string;
  value: string;
  hint: string;
  critical?: boolean;
  href: string;
  action: string;
}) {
  return (
    <div className={cn("flex h-full min-h-full flex-col justify-between gap-3 px-3 py-3", SURFACE)}>
      <div>
        <p className={cn("text-[12px] font-medium", MUTED)}>{label}</p>
        <p
          className={cn(
            "mt-1 text-[1.35rem] font-semibold tabular-nums leading-none tracking-[-0.03em]",
            critical ? CRITICAL : INK,
          )}
        >
          {value}
        </p>
        <p className={cn("mt-2 text-[12px] leading-snug", MUTED)}>{hint}</p>
      </div>
      <TextLink href={href}>{action}</TextLink>
    </div>
  );
}

function CommerceBand({ data, loading }: OverviewDeskProps) {
  const days = data?.last14Days ?? [];
  const maxSales = Math.max(1, ...days.map((day) => day.sales));

  return (
    <Band id="commerce">
      <div className={cn(GRID, "lg:grid-cols-[minmax(0,1.5fr)_minmax(15rem,0.62fr)]")}>
        <div className={SURFACE}>
          <div className={cn(GRID, "grid-cols-3 border-b", RULE)}>
            <Period
              label="Today"
              units={figure(loading, formatUnits(data?.commerce.unitsSoldToday))}
              detail={figure(
                loading,
                `${formatInt(data?.commerce.salesToday)} sales · ${formatKes(data?.commerce.revenueToday)}`,
              )}
            />
            <Period
              label="30 days"
              units={figure(loading, formatUnits(data?.commerce.unitsSoldLast30Days))}
              detail={figure(
                loading,
                `${formatInt(data?.commerce.salesLast30Days)} sales · ${formatKes(data?.commerce.revenueLast30Days)}`,
              )}
            />
            <Period
              label="All-time"
              units={figure(loading, formatUnits(data?.commerce.unitsSoldAllTime))}
              detail={figure(
                loading,
                `${formatInt(data?.commerce.salesAllTime)} sales · ${formatKes(data?.commerce.revenueAllTime)}`,
              )}
            />
          </div>
          <DayChart days={days} maxSales={maxSales} loading={loading} />
        </div>
        <div className={SURFACE}>
          <ColumnHead title="Storefront" meta="Paid web / WhatsApp orders" />
          <dl>
            <StoreRow label="Units · 30 days" value={figure(loading, formatUnits(data?.storefront.unitsSoldLast30Days))} />
            <StoreRow label="Orders · 30 days" value={figure(loading, formatInt(data?.storefront.paidOrdersLast30Days))} />
            <StoreRow label="GMV · 30 days" value={figure(loading, formatKes(data?.storefront.paidGmvLast30Days))} />
            <StoreRow label="Orders all-time" value={figure(loading, formatInt(data?.storefront.paidOrdersAllTime))} />
          </dl>
        </div>
      </div>
    </Band>
  );
}

function Period({ label, units, detail }: { label: string; units: string; detail: string }) {
  return (
    <div className={cn("min-w-0 px-3 py-2.5", SURFACE)}>
      <p className={cn("text-[11px] font-medium", MUTED)}>{label}</p>
      <p className={cn("mt-0.5 text-[1.05rem] font-semibold tabular-nums tracking-[-0.03em]", INK)}>
        {units}
      </p>
      <p className={cn("mt-0.5 text-[11px] leading-snug", MUTED)}>{detail}</p>
    </div>
  );
}

function StoreRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-3 border-b px-3 last:border-b-0", RULE)}>
      <dt className={cn("text-[12px]", MUTED)}>{label}</dt>
      <dd className={cn("text-[13px] font-semibold tabular-nums", INK)}>{value}</dd>
    </div>
  );
}

function DayChart({
  days,
  maxSales,
  loading,
}: {
  days: SaPlatformOverview["last14Days"];
  maxSales: number;
  loading: boolean;
}) {
  return (
    <div className="px-3 py-3">
      <p className={cn("mb-2 text-[12px]", MUTED)}>Sales each day, last 14 days</p>
      {!loading && days.length === 0 ? (
        <p className={cn("py-6 text-[13px]", MUTED)}>No till sales in the last 14 days.</p>
      ) : null}
      {loading ? (
        <div className="flex h-24 items-end gap-1.5" aria-hidden>
          {Array.from({ length: 14 }, (_, index) => (
            <div
              key={index}
              className="flex-1 animate-pulse bg-[color-mix(in_srgb,var(--op-ink)_8%,transparent)]"
              style={{ height: `${28 + (index % 5) * 12}%` }}
            />
          ))}
        </div>
      ) : null}
      {!loading && days.length > 0 ? (
        <div className="flex h-24 items-end gap-1" role="img" aria-label="Daily sales for the last 14 days">
          {days.map((bucket) => {
            const height = Math.max(6, Math.round((bucket.sales / maxSales) * 100));
            return (
              <div key={bucket.day} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1">
                <div
                  className="w-full bg-[var(--op-accent)] motion-reduce:transition-none transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ height: `${height}%`, opacity: bucket.sales === maxSales ? 1 : 0.45 }}
                  title={`${bucket.day}: ${bucket.sales} sales · ${formatKes(bucket.revenue)}`}
                />
                <span className={cn("text-center text-[10px] tabular-nums", MUTED)}>{dayNumber(bucket.day)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function MovingBand({ data, loading }: OverviewDeskProps) {
  const sellers = data?.bestSellers ?? [];
  const hot = data?.hotTenants ?? [];

  return (
    <Band id="hot">
      <div className={cn(GRID, "lg:grid-cols-2")}>
        <div className={SURFACE}>
          <ColumnHead title="Hottest tills" meta="7 days" />
          {loading ? <SkeletonRows rows={5} /> : null}
          {!loading && hot.length === 0 ? <EmptyLine>No sales this week yet.</EmptyLine> : null}
          {!loading && hot.length > 0 ? (
            <ul>
              {hot.map((tenant) => (
                <li key={tenant.businessId} className={cn("border-b last:border-b-0", RULE)}>
                  <Link
                    href={tenantHref(tenant.businessId, tenant.businessName, tenant.slug)}
                    className={ROW}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[13px] font-semibold", INK)}>
                        {tenant.businessName}
                      </span>
                      <span className={cn("block truncate text-[12px]", MUTED)}>{tenant.slug}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={cn("block text-[13px] font-semibold tabular-nums", INK)}>
                        {formatKes(tenant.revenueLast7Days)}
                      </span>
                      <span className={cn("block text-[11px] tabular-nums", MUTED)}>
                        {formatInt(tenant.salesLast7Days)} sales
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div id="sellers" className={cn("scroll-mt-20", SURFACE)}>
          <ColumnHead title="Best sellers" meta="30 days" />
          {loading ? <SkeletonRows rows={5} /> : null}
          {!loading && sellers.length === 0 ? (
            <EmptyLine>No completed item sales in the last 30 days.</EmptyLine>
          ) : null}
          {!loading && sellers.length > 0 ? (
            <ol>
              {sellers.map((row, index) => (
                <li
                  key={`${row.itemId}-${row.businessId}`}
                  className={cn("flex min-h-11 items-center gap-3 border-b px-3 py-2 last:border-b-0", RULE)}
                >
                  <span className={cn("w-5 shrink-0 text-[12px] tabular-nums", MUTED)}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[13px] font-semibold", INK)}>{row.itemName}</span>
                    <span className={cn("block truncate text-[12px]", MUTED)}>{row.businessName}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={cn("block text-[13px] font-semibold tabular-nums", INK)}>
                      {formatUnits(row.unitsSold)}
                    </span>
                    <span className={cn("block text-[11px] tabular-nums", MUTED)}>{formatKes(row.revenue)}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </Band>
  );
}

function ShopsBand({ data, loading }: OverviewDeskProps) {
  const recent = data?.recentTenants ?? [];

  return (
    <Band id="recent">
      <div className={GRID}>
        <div id="jump" className={cn(GRID, "scroll-mt-20 grid-cols-2 sm:grid-cols-4")}>
          <InlineFact label="Total" value={figure(loading, formatInt(data?.tenants.total))} />
          <InlineFact label="Active" value={figure(loading, formatInt(data?.tenants.active))} />
          <InlineFact label="Inactive" value={figure(loading, formatInt(data?.tenants.inactive))} />
          <InlineFact label="Kiosk Pay" value={figure(loading, formatInt(data?.tenants.kioskPayActive))} />
        </div>
        <div className={SURFACE}>
          <ColumnHead
            title="Newest tenants"
            action={<TextLink href={APP_ROUTES.superAdminBusinesses}>View all</TextLink>}
          />
            {loading ? <SkeletonRows rows={5} /> : null}
            {!loading && recent.length === 0 ? <EmptyLine>No tenants yet.</EmptyLine> : null}
            {!loading && recent.length > 0 ? (
              <ul>
                {recent.map((shop) => (
                  <li key={shop.id} className={cn("border-b last:border-b-0", RULE)}>
                    <Link
                      href={tenantHref(shop.id, shop.name, shop.slug, shop.subscriptionTier, shop.active)}
                      className={ROW}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-[13px] font-semibold", INK)}>{shop.name}</span>
                        <span className={cn("block truncate text-[12px]", MUTED)}>{shop.slug}</span>
                      </span>
                      <span className={cn("shrink-0 text-[12px] font-medium", shop.active ? "text-[var(--op-accent)]" : MUTED)}>
                        {shop.active ? "Active" : "Inactive"}
                      </span>
                      <span className={cn("hidden shrink-0 text-[12px] tabular-nums sm:inline", MUTED)}>
                        {formatDate(shop.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
    </Band>
  );
}

function InlineFact({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("flex min-h-11 items-baseline justify-between gap-2 px-3 py-2.5", SURFACE)}>
      <span className={cn("text-[12px]", MUTED)}>{label}</span>
      <span className={cn("text-[13px] font-semibold tabular-nums", INK)}>{value}</span>
    </div>
  );
}

function paidToday(payments: GatewayStkPushOpsRecord[] | null) {
  const today = new Date().toDateString();
  let total = 0;
  let count = 0;
  for (const payment of payments ?? []) {
    const iso = payment.confirmedAt ?? payment.createdAt;
    if (!iso || new Date(iso).toDateString() !== today) continue;
    total += Number(payment.amount) || 0;
    count += 1;
  }
  return { total, count };
}

export function OverviewDesk({ data, loading }: OverviewDeskProps) {
  const platformPayments = useSaPlatformPayments();
  const today = useMemo(
    () => paidToday(platformPayments.payments),
    [platformPayments.payments],
  );
  const attention = (data?.stuckSignups.total ?? 0) + (data?.support.waitingOnAdmin ?? 0);
  const hottest = data?.hotTenants[0];
  const [board, setBoard] = useState<BoardId>("attention");

  useEffect(() => {
    const apply = () => setBoard(boardFromHash(window.location.hash.replace(/^#/, "")));
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const selectBoard = (id: BoardId) => {
    setBoard(id);
    history.replaceState(null, "", `#${hashForBoard(id)}`);
  };

  const copy = BOARD_COPY[board];
  const menu = [
    {
      id: "attention" as const,
      label: "Needs you",
      value: figure(loading, formatInt(attention)),
      critical: !loading && attention > 0,
    },
    {
      id: "payments" as const,
      label: "Till book",
      value: platformPayments.payments ? formatKes(today.total) : "—",
    },
    {
      id: "commerce" as const,
      label: "Sold",
      value: figure(loading, formatUnits(data?.commerce.unitsSoldToday)),
    },
    {
      id: "moving" as const,
      label: "Moving",
      value: figure(loading, hottest ? formatKes(hottest.revenueLast7Days) : "—"),
    },
    {
      id: "shops" as const,
      label: "Shops",
      value: figure(loading, formatInt(data?.tenants.active)),
    },
  ];

  return (
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[11.5rem_minmax(0,1fr)_15.5rem]">
      <WorkMenu items={menu} active={board} onSelect={selectBoard} />
      <div className="min-w-0">
        <header className="mb-3">
          <h2 className={cn("text-[1.35rem] font-semibold leading-none tracking-[-0.03em]", INK)}>
            {copy.title}
          </h2>
          <p className={cn("mt-1.5 max-w-xl text-[13px] leading-snug", MUTED)}>{copy.note}</p>
        </header>
        {board === "attention" ? <AttentionBand data={data} loading={loading} /> : null}
        {board === "payments" ? (
          <section id="payments">
            <PlatformPaymentsLedger
              payments={platformPayments.payments}
              seenAt={platformPayments.seenAt}
              todayTotal={today.total}
              todayCount={today.count}
              limit={8}
            />
          </section>
        ) : null}
        {board === "commerce" ? <CommerceBand data={data} loading={loading} /> : null}
        {board === "moving" ? <MovingBand data={data} loading={loading} /> : null}
        {board === "shops" ? <ShopsBand data={data} loading={loading} /> : null}
      </div>
      <GoMenu
        facts={[
          { label: "Needs you", value: figure(loading, formatInt(attention)), critical: !loading && attention > 0 },
          { label: "Till today", value: platformPayments.payments ? formatKes(today.total) : "—" },
          { label: "Units today", value: figure(loading, formatUnits(data?.commerce.unitsSoldToday)) },
          { label: "Active shops", value: figure(loading, formatInt(data?.tenants.active)) },
        ]}
      />
    </div>
  );
}
