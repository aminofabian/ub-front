"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Package,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { getOnboardingQuestionnaireState } from "@/lib/onboarding-questionnaire";
import { cn } from "@/lib/utils";
import {
  addDays,
  parseISODate,
  presetRange,
  previousPeriod,
  toISODate,
} from "@/lib/analytics-date-range";
import {
  fetchDashboardOwnerSummary,
  fetchFinancePL,
  fetchFinancePulse,
  fetchInventoryValuation,
  fetchItemsPage,
  fetchSalesRegister,
  type FinancePulseResponse,
  type InventoryValuationResponseRecord,
  type OwnerDashboardResponse,
  type ProfitAndLossResponse,
  type SalesRegisterResponse,
} from "@/lib/api";

type Period = "today" | "week";

const OVERVIEW_CARD =
  "flex min-h-[132px] flex-col rounded-xl border border-[#EEEEEE] bg-white p-5";
const OVERVIEW_SURFACE = "rounded-xl border border-[#EEEEEE] bg-white";
const OVERVIEW_MUTED = "text-[#888888]";
const OVERVIEW_ACCENT = "#B08D48";
const OVERVIEW_ACCENT_LIGHT = "#F9F6F0";

const KES = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function fmtKes(n: number | string | null | undefined): string {
  if (n == null) return "—";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(1)}M`;
  return KES.format(v);
}

function fmtPct(n: number | string | null | undefined): string {
  if (n == null) return "—";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtCount(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-KE");
}

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function padChartValues(values: number[], size = 12): number[] {
  if (values.length >= size) return values.slice(-size);
  return [...Array(size - values.length).fill(0), ...values];
}

function fmtTrendPct(current: number, previous: number): string | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) {
    if (current === 0) return null;
    return "+100%";
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

function formatPeriodSubtitle(
  period: Period,
  from: string,
  to: string,
): string {
  const end = parseISODate(to);
  const endLabel = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (period === "today") return `Today, ${endLabel}`;
  const start = parseISODate(from);
  const startLabel = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const endShort = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `This week, ${startLabel} – ${endShort}`;
}

function PeriodToggle({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#EEEEEE] bg-white p-1">
      {(
        [
          { id: "week" as const, label: "This week" },
          { id: "today" as const, label: "Today" },
        ] as const
      ).map(({ id, label }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border border-[#E8DFD0] bg-[#F9F6F0] text-[#B08D48]"
                : "border border-transparent text-[#666666] hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  footer,
  footerTone = "muted",
  href,
}: {
  label: string;
  value: string;
  footer?: string;
  footerTone?: "muted" | "positive" | "warning";
  href?: string;
}) {
  const card = (
    <div className={OVERVIEW_CARD}>
      <p className={cn("text-sm", OVERVIEW_MUTED)}>{label}</p>
      <p className="mt-3 text-[1.75rem] font-bold leading-none tracking-tight text-black">
        {value}
      </p>
      {footer ? (
        <p
          className={cn(
            "mt-auto pt-4 text-sm font-medium",
            footerTone === "positive" && "text-emerald-600",
            footerTone === "warning" && "text-[#C47A5A]",
            footerTone === "muted" && "text-[#666666]",
          )}
        >
          {footer}
        </p>
      ) : (
        <span className="mt-auto block h-5" aria-hidden />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-90">
        {card}
      </Link>
    );
  }
  return card;
}

function QuickChip({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-[#EEEEEE] bg-white px-4 py-2.5 text-sm font-medium text-black shadow-sm",
        "transition-opacity hover:opacity-90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/30",
      )}
    >
      <Icon className="size-4 text-[#888888]" aria-hidden />
      {label}
      <ArrowRight className="size-3 text-[#888888]" aria-hidden />
    </Link>
  );
}

function RevenueBarChart({
  values,
  barCount = 12,
  ariaLabel,
}: {
  values: number[];
  barCount?: number;
  ariaLabel: string;
}) {
  const bars = padChartValues(values, barCount);
  const max = Math.max(...bars, 1);

  return (
    <div className={cn(OVERVIEW_SURFACE, "px-6 py-8")}>
      <div
        className="flex h-36 items-end justify-between gap-2 sm:gap-3"
        role="img"
        aria-label={ariaLabel}
      >
        {bars.map((value, index) => {
          const heightPct = Math.max(12, Math.round((value / max) * 100));
          const isHighlight = index === bars.length - 1;
          return (
            <div
              key={index}
              className="flex flex-1 items-end justify-center"
              style={{ height: "100%" }}
            >
              <div
                className="w-full max-w-[28px] rounded-lg"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: isHighlight
                    ? OVERVIEW_ACCENT
                    : OVERVIEW_ACCENT_LIGHT,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-20 animate-in fade-in duration-500">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-md bg-[#EEEEEE] animate-pulse" />
          <div className="h-4 w-48 max-w-full rounded-md bg-[#EEEEEE] animate-pulse" />
        </div>
        <div className="h-10 w-52 shrink-0 rounded-lg bg-[#EEEEEE] animate-pulse" />
      </header>
      <div className="space-y-4">
        <div className="h-4 w-28 rounded bg-[#EEEEEE] animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={OVERVIEW_CARD}>
              <div className="h-3 w-24 rounded bg-[#EEEEEE] animate-pulse" />
              <div className="mt-4 h-8 w-32 rounded bg-[#EEEEEE] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-52 rounded-xl bg-[#EEEEEE] animate-pulse" />
    </div>
  );
}

function PostSetupChecklist() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show if setup questionnaire was recently completed (within last 48 hours)
    const state = getOnboardingQuestionnaireState();
    if (state.status !== "completed") {
      return;
    }
    const updated = state.updatedAt ? new Date(state.updatedAt).getTime() : 0;
    const hoursSince = (Date.now() - updated) / (1000 * 60 * 60);
    if (hoursSince <= 48) {
      setShow(true);
    }
  }, []);

  if (!show) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={cn("text-sm font-medium", OVERVIEW_MUTED)}>
          Getting started
        </h2>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="text-xs font-medium text-[#888888] hover:text-foreground transition-colors"
        >
          Dismiss
        </button>
      </div>
      <div className={cn(OVERVIEW_SURFACE, "divide-y divide-[#EEEEEE]")}>
        {[
          {
            href: APP_ROUTES.sales,
            label: "Record your first sale",
            desc: "Use the cashier or quick sale to process a transaction.",
            icon: ShoppingCart,
          },
          {
            href: APP_ROUTES.users,
            label: "Invite your staff",
            desc: "Add cashiers and managers so your team can help run the shop.",
            icon: Users,
          },
          {
            href: APP_ROUTES.analytics,
            label: "Check your reports",
            desc: "See sales trends, profit margins, and top products.",
            icon: BarChart3,
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#F9F6F0]/60"
          >
            <item.icon className="size-4 shrink-0 text-[#B08D48]" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-black">{item.label}</p>
              <p className="text-xs text-[#888888]">{item.desc}</p>
            </div>
            <ArrowRight
              className="ml-auto size-4 shrink-0 text-[#CCCCCC]"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function OverviewPage() {
  const { me, business, branchId } = useDashboard();

  const [period, setPeriod] = useState<Period>("today");
  const [pulse, setPulse] = useState<FinancePulseResponse | null>(null);
  const [prevPulse, setPrevPulse] = useState<FinancePulseResponse | null>(null);
  const [weekPl, setWeekPl] = useState<ProfitAndLossResponse | null>(null);
  const [prevWeekPl, setPrevWeekPl] = useState<ProfitAndLossResponse | null>(
    null,
  );
  const [weekRegister, setWeekRegister] =
    useState<SalesRegisterResponse | null>(null);
  const [prevWeekRegister, setPrevWeekRegister] =
    useState<SalesRegisterResponse | null>(null);
  const [valuation, setValuation] =
    useState<InventoryValuationResponseRecord | null>(null);
  const [ownerSummary, setOwnerSummary] =
    useState<OwnerDashboardResponse | null>(null);
  const [catalogueCount, setCatalogueCount] = useState<number | null>(null);
  const [chartRevenue, setChartRevenue] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const todayRange = presetRange("today")!;
      const weekRange = presetRange("last7")!;
      const activeRange = period === "today" ? todayRange : weekRange;
      const prevRange = previousPeriod(activeRange.from, activeRange.to);
      const chartFrom =
        period === "today"
          ? toISODate(addDays(new Date(), -11))
          : weekRange.from;
      const chartTo = period === "today" ? toISODate(new Date()) : weekRange.to;
      const branch = branchId || undefined;

      const [
        owner,
        v,
        itemsPage,
        chartReg,
        pulseRes,
        prevPulseRes,
        plRes,
        prevPlRes,
        weekReg,
        prevWeekReg,
      ] = await Promise.all([
        fetchDashboardOwnerSummary().catch(() => null),
        fetchInventoryValuation(branch).catch(() => null),
        fetchItemsPage(undefined, { page: 0, size: 1 }).catch(() => null),
        fetchSalesRegister(chartFrom, chartTo, branch).catch(() => null),
        fetchFinancePulse(activeRange.to, branch).catch(() => null),
        fetchFinancePulse(prevRange.to, branch).catch(() => null),
        period === "week"
          ? fetchFinancePL(activeRange.from, activeRange.to, branch).catch(
              () => null,
            )
          : Promise.resolve(null),
        period === "week"
          ? fetchFinancePL(prevRange.from, prevRange.to, branch).catch(
              () => null,
            )
          : Promise.resolve(null),
        period === "week"
          ? fetchSalesRegister(activeRange.from, activeRange.to, branch).catch(
              () => null,
            )
          : Promise.resolve(null),
        period === "week"
          ? fetchSalesRegister(prevRange.from, prevRange.to, branch).catch(
              () => null,
            )
          : Promise.resolve(null),
      ]);

      setPulse(owner?.pulseToday ?? pulseRes ?? null);
      setPrevPulse(prevPulseRes);
      setWeekPl(plRes);
      setPrevWeekPl(prevPlRes);
      setWeekRegister(weekReg);
      setPrevWeekRegister(prevWeekReg);
      setValuation(v ?? null);
      setOwnerSummary(owner ?? null);
      setCatalogueCount(itemsPage?.totalElements ?? null);
      setChartRevenue((chartReg?.days ?? []).map((d) => toNum(d.revenue)));
    } catch {
      /* gracefully degrade */
    } finally {
      setLoading(false);
    }
  }, [branchId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeRange = useMemo(
    () => (period === "today" ? presetRange("today")! : presetRange("last7")!),
    [period],
  );

  const periodSubtitle = useMemo(
    () => formatPeriodSubtitle(period, activeRange.from, activeRange.to),
    [period, activeRange],
  );

  const inventoryStats = useMemo(() => {
    const stockValue = valuation?.totalExtensionValue ?? null;
    return { stockValue };
  }, [valuation]);

  const isToday = period === "today";

  const revenue = isToday ? toNum(pulse?.revenue) : toNum(weekPl?.revenue);
  const prevRevenue = isToday
    ? toNum(prevPulse?.revenue)
    : toNum(prevWeekPl?.revenue);
  const grossProfit = isToday
    ? toNum(pulse?.grossProfit)
    : toNum(weekPl?.grossProfit);
  const orders = isToday
    ? (pulse?.salesCount ?? null)
    : weekRegister
      ? toNum(weekRegister.totalQty)
      : null;
  const prevOrders = isToday
    ? (prevPulse?.salesCount ?? null)
    : prevWeekRegister
      ? toNum(prevWeekRegister.totalQty)
      : null;

  const marginFooter = useMemo(() => {
    if (isToday && pulse?.grossMarginPct != null) {
      return `${fmtPct(pulse.grossMarginPct)} margin`;
    }
    if (!isToday && weekPl && revenue > 0) {
      return `${fmtPct((grossProfit / revenue) * 100)} margin`;
    }
    return undefined;
  }, [isToday, pulse?.grossMarginPct, weekPl, revenue, grossProfit]);

  const revenueTrend = fmtTrendPct(revenue, prevRevenue);
  const ordersTrend = fmtTrendPct(orders ?? 0, prevOrders ?? 0);
  const revenueFooter = revenueTrend ?? marginFooter;
  const revenueFooterTone = revenueTrend?.startsWith("-")
    ? "muted"
    : "positive";

  const pulseSectionTitle = isToday ? "Today's pulse" : "This week's pulse";
  const revenueLabel = isToday ? "Revenue today" : "Revenue this week";
  const ordersLabel = isToday ? "Orders" : "Units sold";
  const chartBarCount = isToday ? 12 : 7;
  const chartAriaLabel = isToday
    ? "Revenue over the last twelve days"
    : "Revenue over the last seven days";

  if (loading) return <OverviewSkeleton />;

  const title = business?.name ?? me?.name ?? "Dashboard";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-20">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={cn("text-sm font-medium", OVERVIEW_MUTED)}>Overview</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-black">
            {title}
          </h1>
          <p className={cn("mt-1 text-sm", OVERVIEW_MUTED)}>{periodSubtitle}</p>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </header>

      <section className="space-y-4">
        <h2 className={cn("text-sm font-medium", OVERVIEW_MUTED)}>
          {pulseSectionTitle}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={revenueLabel}
            value={fmtKes(revenue)}
            footer={revenueFooter}
            footerTone={revenueFooterTone}
            href={APP_ROUTES.sales}
          />
          <StatCard
            label={ordersLabel}
            value={fmtCount(orders)}
            footer={ordersTrend ?? undefined}
            footerTone={
              ordersTrend?.startsWith("-")
                ? "muted"
                : ordersTrend
                  ? "positive"
                  : "muted"
            }
            href={APP_ROUTES.sales}
          />
          <StatCard
            label="Gross profit"
            value={fmtKes(grossProfit)}
            footer={marginFooter}
            footerTone="positive"
            href="/analytics"
          />
          <StatCard
            label="Open shifts"
            value={fmtCount(pulse?.openShifts)}
            href="/shifts"
          />
        </div>
      </section>

      <RevenueBarChart
        values={chartRevenue}
        barCount={chartBarCount}
        ariaLabel={chartAriaLabel}
      />

      <section className="space-y-4">
        <h2 className={cn("text-sm font-medium", OVERVIEW_MUTED)}>Inventory</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Catalogue items"
            value={fmtCount(catalogueCount)}
            href="/products"
          />
          <StatCard
            label="Stock value"
            value={fmtKes(inventoryStats.stockValue)}
            href="/inventory"
          />
          <StatCard
            label="Branches"
            value={fmtCount(valuation?.byBranch?.length ?? null)}
            href="/branches"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={cn("text-sm font-medium", OVERVIEW_MUTED)}>
          Quick access
        </h2>
        <div className="flex flex-wrap gap-3">
          <QuickChip
            href={APP_ROUTES.sales}
            label="Sales"
            icon={ShoppingCart}
          />
          <QuickChip href="/products" label="Catalogue" icon={Package} />
          <QuickChip href="/inventory" label="Inventory" icon={Boxes} />
          <QuickChip href="/analytics" label="Analytics" icon={BarChart3} />
          <QuickChip href="/storefront" label="Storefront" icon={Store} />
          <QuickChip href="/customers" label="Customers" icon={Users} />
        </div>
      </section>

      <PostSetupChecklist />

      {ownerSummary?.topSkusLast30Days &&
      ownerSummary.topSkusLast30Days.length > 0 ? (
        <section className="space-y-4">
          <h2 className={cn("text-sm font-medium", OVERVIEW_MUTED)}>
            Top products — last 30 days
          </h2>
          <div className={cn(OVERVIEW_SURFACE, "overflow-hidden")}>
            <div className="divide-y divide-[#EEEEEE]">
              {ownerSummary.topSkusLast30Days.slice(0, 5).map((sku, i) => (
                <Link
                  key={sku.itemId}
                  href={`/products?search=${encodeURIComponent(sku.itemName)}`}
                  className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[#F9F6F0]/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#EEEEEE] bg-[#F9F6F0] text-[11px] font-semibold text-[#666666]">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-black">
                      {sku.itemName}
                    </span>
                  </div>
                  <span className="ml-4 shrink-0 text-sm font-semibold tabular-nums text-black">
                    {fmtKes(sku.revenueLast30Days)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
