"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  CreditCard,
  LineChart,
  Package,
  RefreshCw,
  ShieldAlert,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  X,
} from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSessionBranch } from "@/hooks/use-session-scope";
import { APP_ROUTES } from "@/lib/config";
import {
  PROCUREMENT_VARS,
  ProcurementHubNav,
} from "@/components/procurement/procurement-hub-nav";
import {
  fetchPurchasingIntelligenceDashboard,
  type PurchasingIntelligenceDashboardResponse,
  type PurchasingInsight,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type DrawerId = "suppliers" | "variance" | "categories" | "risk";

function formatMoney(n: number | string): string {
  const val = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(val)) return "0.00";
  return val.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMoneyShort(n: number | string): string {
  const val = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(val)) return "0";
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + "M";
  if (val >= 1_000) return (val / 1_000).toFixed(1) + "k";
  return val.toLocaleString("en-KE", { maximumFractionDigits: 0 });
}

function formatPct(n: number | string): string {
  const val = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(val)) return "0.00%";
  return (
    val.toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

function formatUnit(n: number): string {
  return n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addLocalDays(d: Date, delta: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const RANGE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7days", label: "7d" },
  { id: "last30days", label: "30d" },
  { id: "last90days", label: "90d" },
  { id: "last365days", label: "1y" },
] as const;

type RangePresetId = (typeof RANGE_PRESETS)[number]["id"];

function isRangePresetId(v: string): v is RangePresetId {
  return RANGE_PRESETS.some((p) => p.id === v);
}

function rangeForPreset(id: RangePresetId): { from: string; to: string } {
  const today = startOfLocalDay(new Date());
  const to = toDateInputValue(today);
  if (id === "today") return { from: to, to };
  if (id === "yesterday") {
    const y = addLocalDays(today, -1);
    const ys = toDateInputValue(y);
    return { from: ys, to: ys };
  }
  const back =
    id === "last7days" ? 6 : id === "last30days" ? 29 : id === "last90days" ? 89 : 364;
  return { from: toDateInputValue(addLocalDays(today, -back)), to };
}

const CHART_COLORS = [
  "#0f766e",
  "#1d4ed8",
  "#b45309",
  "#be123c",
  "#6d28d9",
  "#0e7490",
  "#c2410c",
  "#4d7c0f",
];
const CHART_AXIS = "#71717a";
const CHART_GRID = "rgba(113, 113, 122, 0.18)";

const fieldClass = cn(
  "h-8 w-full rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
  "bg-white px-2.5 text-sm tabular-nums",
  "outline-none focus-visible:border-[var(--pos-primary,#0f766e)]",
);

const chip = cn(
  "inline-flex h-8 items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 text-[12px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
  "transition-colors hover:text-[var(--order-ink,#15231f)]",
);

const tableHead =
  "border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]";

function InsightStack({ insights }: { insights: PurchasingInsight[] }) {
  if (insights.length === 0) {
    return (
      <div className="rounded-none border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 py-4 text-center text-xs text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
        No briefing notes for this range — spend looks quiet.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {insights.map((insight, i) => {
        const danger = insight.kind === "danger";
        const warning = insight.kind === "warning";
        const success = insight.kind === "success";
        return (
          <li
            key={`${insight.kind}-${i}`}
            className={cn(
              "flex gap-2.5 rounded-none border bg-white px-3 py-2.5 text-[13px] leading-snug",
              danger && "border-rose-500/40 text-rose-800 dark:text-rose-200",
              warning && "border-amber-700/40 text-amber-800 dark:text-amber-200",
              success &&
                "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]",
              !danger &&
                !warning &&
                !success &&
                "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[var(--order-ink,#15231f)]",
            )}
          >
            {danger ? (
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-600" aria-hidden />
            ) : warning ? (
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
            ) : success ? (
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-sky-600" aria-hidden />
            )}
            <span className="min-w-0 font-medium text-foreground">{insight.message}</span>
          </li>
        );
      })}
    </ul>
  );
}

function MetricRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] py-2 last:border-b-0">
      <span className="text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
        {label}
      </span>
      <span
        className={cn(
          "font-heading text-[15px] font-semibold tabular-nums tracking-[-0.02em]",
          tone === "good" && "text-[var(--pos-primary,#0f766e)]",
          tone === "warn" && "text-amber-800 dark:text-amber-400",
          tone === "bad" && "text-rose-700 dark:text-rose-400",
          tone === "default" && "text-[var(--order-ink,#15231f)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function PanelShell({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
        "bg-white",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-none border border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]">
            <Icon className="size-3.5" aria-hidden />
          </span>
          <h2 className="truncate text-sm font-semibold tracking-tight text-[var(--order-ink,#15231f)]">
            {title}
          </h2>
        </div>
        {action}
      </header>
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function DossierButton({
  title,
  count,
  hint,
  icon: Icon,
  tone = "default",
  onClick,
}: {
  title: string;
  count: number;
  hint: string;
  icon: React.ElementType;
  tone?: "default" | "warn" | "bad";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-w-0 flex-1 flex-col gap-1 rounded-none border bg-white px-3 py-2.5 text-left transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pos-primary,#0f766e)]",
        tone === "bad" && "border-rose-500/40 hover:border-rose-500/60",
        tone === "warn" && "border-amber-700/40 hover:border-amber-700/60",
        tone === "default" &&
          "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] hover:border-[var(--pos-primary,#0f766e)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border",
            tone === "bad" && "border-rose-500/40 text-rose-700",
            tone === "warn" && "border-amber-700/40 text-amber-800",
            tone === "default" &&
              "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] group-hover:border-[var(--pos-primary,#0f766e)] group-hover:text-[var(--pos-primary,#0f766e)]",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
        <ArrowUpRight className="size-3.5 text-muted-foreground opacity-60 transition group-hover:opacity-100 group-hover:text-[var(--pos-primary,#0f766e)]" />
      </div>
      <p className="mt-1 text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
        {title}
      </p>
      <p className="font-heading text-xl font-semibold tabular-nums tracking-[-0.03em] text-foreground">
        {count}
      </p>
      <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
    </button>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-none border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-sm text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
      {label}
    </div>
  );
}

export default function PurchasingIntelligencePage() {
  const { me } = useDashboard();
  const { branchId: headerBranchId, branchName: headerBranchName } =
    useSessionBranch();
  const allowed = hasPermission(
    me?.permissions,
    Permission.PurchasingIntelligenceRead,
  );

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activePreset, setActivePreset] = useState<RangePresetId | "">("last90days");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] =
    useState<PurchasingIntelligenceDashboardResponse | null>(null);
  const [drawer, setDrawer] = useState<DrawerId | null>(null);

  const load = useCallback(
    async (range?: { from: string; to: string }) => {
      setMessage("");
      setLoading(true);
      try {
        const fromRaw = range?.from ?? from;
        const toRaw = range?.to ?? to;
        const dashboard = await fetchPurchasingIntelligenceDashboard(
          fromRaw.trim() || undefined,
          toRaw.trim() || undefined,
          headerBranchId?.trim() || undefined,
        );
        setData(dashboard);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Failed to load reports.",
        );
      } finally {
        setLoading(false);
      }
    },
    [from, to, headerBranchId],
  );

  useEffect(() => {
    if (!allowed) return;
    const r = rangeForPreset("last90days");
    setFrom(r.from);
    setTo(r.to);
    void load(r);
    // Initial load only when permission flips on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, headerBranchId]);

  const spendTrendData = useMemo(() => {
    if (!data) return [];
    return data.spendTrend.map((t) => ({
      date: new Date(t.date).toLocaleDateString("en-KE", {
        month: "short",
        day: "numeric",
      }),
      spend: Number(t.spend),
    }));
  }, [data]);

  const supplierPieData = useMemo(() => {
    if (!data) return [];
    return data.topSuppliers.slice(0, 8).map((s) => ({
      name:
        s.supplierName.length > 16
          ? s.supplierName.slice(0, 16) + "…"
          : s.supplierName,
      value: Number(s.spend),
    }));
  }, [data]);

  const rangeLabel =
    from && to ? `${from} → ${to}` : from || to ? `${from || "…"} → ${to || "…"}` : "Last 90 days";

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Supplier intelligence"
        description={
          <>
            You do not have permission to view purchasing intelligence. Ask an
            administrator to grant{" "}
            <code className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-1 py-0.5 text-xs">
              {Permission.PurchasingIntelligenceRead}
            </code>
            .
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  const avgVar = data ? Number(data.summary.avgVariancePercent) : 0;
  const riskCount = data?.summary.singleSourceRiskCount ?? 0;
  const aboveCount = data?.summary.abovePrimaryCount ?? 0;

  return (
    <div
      className="relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col bg-white px-3 pt-1 sm:px-5 sm:pt-1.5"
      style={PROCUREMENT_VARS}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-1">
        <div className="shrink-0 rounded-none border border-[color-mix(in_srgb,var(--order-ink)_12%,transparent)] bg-white">
          <ProcurementHubNav />
        </div>

        <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2.5 py-1 sm:px-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-none border border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]">
                <LineChart className="size-3.5" aria-hidden />
              </span>
              <h1 className="truncate font-heading text-[15px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
                Compare
              </h1>
            </div>
            <span
              aria-hidden
              className="hidden h-3.5 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
            />
            <p className="min-w-0 truncate text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              Spend, price pressure, supply risk
              {headerBranchName ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-medium text-[var(--order-ink,#15231f)]">
                    {headerBranchName}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <nav className="flex shrink-0 flex-wrap gap-1" aria-label="Related purchasing links">
            {[
              { href: APP_ROUTES.purchasingApAging, label: "AP aging", icon: BarChart3 },
              {
                href: `${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`,
                label: "Pay open",
                icon: CreditCard,
              },
              { href: APP_ROUTES.suppliers, label: "Suppliers", icon: Truck },
            ].map((link) => (
              <Link key={link.href} href={link.href} className={chip}>
                <link.icon className="size-3 opacity-70" aria-hidden />
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="shrink-0 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 py-1.5">
        <form
          className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between"
          onSubmit={(e) => {
            e.preventDefault();
            setActivePreset("");
            void load().catch(() => setMessage("Failed to load reports."));
          }}
        >
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
              <CalendarRange className="size-3.5" aria-hidden />
              Window · {rangeLabel}
            </div>
            <div className="flex flex-wrap gap-1">
              {RANGE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    const r = rangeForPreset(p.id);
                    setActivePreset(p.id);
                    setFrom(r.from);
                    setTo(r.to);
                    void load(r).catch(() =>
                      setMessage("Failed to load reports."),
                    );
                  }}
                  className={cn(
                    "h-8 rounded-none border px-2.5 text-[12px] font-semibold tracking-[-0.02em] transition-colors",
                    activePreset === p.id
                      ? "border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]"
                      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:text-[var(--order-ink,#15231f)]",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
                From
              </span>
              <input
                type="date"
                className={cn(fieldClass, "min-w-[9.5rem]")}
                value={from}
                disabled={loading}
                onChange={(e) => {
                  setActivePreset("");
                  setFrom(e.target.value);
                }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
                To
              </span>
              <input
                type="date"
                className={cn(fieldClass, "min-w-[9.5rem]")}
                value={to}
                disabled={loading}
                onChange={(e) => {
                  setActivePreset("");
                  setTo(e.target.value);
                }}
              />
            </label>
            <Button
              type="submit"
              disabled={loading}
              className="h-8 gap-1.5 rounded-none bg-[var(--pos-primary,#0f766e)] px-3 font-semibold text-white hover:bg-[#0d6b63]"
            >
              <RefreshCw
                className={cn("size-3.5", loading && "animate-spin")}
                aria-hidden
              />
              {loading ? "Loading…" : "Apply"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-none"
              disabled={loading || (!from && !to)}
              onClick={() => {
                setFrom("");
                setTo("");
                setActivePreset("");
                void load({ from: "", to: "" });
              }}
            >
              <X className="size-3.5" aria-hidden />
              Clear
            </Button>
          </div>
        </form>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pb-4">

      {message ? <DashboardFeedback kind="error" text={message} /> : null}

      {!data && loading ? (
        <div className="mt-1 grid gap-1 lg:grid-cols-[280px_1fr]">
          <div className="h-72 animate-pulse rounded-none bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]" />
          <div className="h-72 animate-pulse rounded-none bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]" />
        </div>
      ) : null}

      {data ? (
        <div className="mt-1 grid items-start gap-1 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)]">
          {/* Left briefing rail */}
          <aside className="space-y-1 lg:sticky lg:top-0">
            <PanelShell title="Briefing" icon={AlertTriangle}>
              <InsightStack insights={data.insights} />
            </PanelShell>

            <PanelShell title="Pulse" icon={Banknote}>
              <MetricRow
                label="Total spend"
                value={formatMoneyShort(data.summary.totalSpend)}
              />
              <MetricRow
                label="Exact"
                value={formatMoney(data.summary.totalSpend)}
              />
              <MetricRow
                label="Suppliers"
                value={String(data.summary.supplierCount)}
              />
              <MetricRow
                label="Invoice lines"
                value={String(data.summary.invoiceLineCount)}
              />
              <MetricRow
                label="Items"
                value={String(data.summary.itemCount)}
              />
              <MetricRow
                label="Avg variance"
                value={formatPct(data.summary.avgVariancePercent)}
                tone={avgVar > 0 ? "warn" : "good"}
              />
              <MetricRow
                label="Above primary"
                value={String(data.summary.abovePrimaryCount)}
                tone={aboveCount > 0 ? "warn" : "good"}
              />
              <MetricRow
                label="Below primary"
                value={String(data.summary.belowPrimaryCount)}
                tone="good"
              />
              <MetricRow
                label="Single-source"
                value={String(data.summary.singleSourceRiskCount)}
                tone={riskCount > 0 ? "bad" : "good"}
              />
            </PanelShell>
          </aside>

          {/* Main column */}
          <div className="min-w-0 space-y-1">
            <div className="grid gap-1 xl:grid-cols-2">
              <PanelShell title="Spend trend" icon={BarChart3}>
                <div className="h-56">
                  {spendTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={spendTrendData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_GRID}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: CHART_AXIS }}
                          tickLine={false}
                          axisLine={{ stroke: CHART_GRID }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: CHART_AXIS }}
                          tickLine={false}
                          axisLine={{ stroke: CHART_GRID }}
                          tickFormatter={(v) => formatMoneyShort(v)}
                          width={42}
                        />
                        <Tooltip
                          formatter={(value) => formatMoney(Number(value))}
                          contentStyle={{
                            borderRadius: 0,
                            border: "1px solid color-mix(in srgb, var(--order-ink, #15231f) 12%, transparent)",
                            fontSize: 12,
                            backgroundColor: "#fff",
                          }}
                        />
                        <Bar
                          dataKey="spend"
                          fill="var(--pos-primary, #0f766e)"
                          radius={[0, 0, 0, 0]}
                          name="Spend"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart label="No spend in this window" />
                  )}
                </div>
              </PanelShell>

              <PanelShell title="Spend by supplier" icon={Users}>
                <div className="h-56">
                  {supplierPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={supplierPieData}
                          cx="50%"
                          cy="46%"
                          innerRadius={48}
                          outerRadius={74}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {supplierPieData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatMoney(Number(value))}
                          contentStyle={{
                            borderRadius: 0,
                            border: "1px solid color-mix(in srgb, var(--order-ink, #15231f) 12%, transparent)",
                            fontSize: 12,
                            backgroundColor: "#fff",
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={28}
                          iconSize={7}
                          iconType="square"
                          wrapperStyle={{ fontSize: 10 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart label="No supplier split yet" />
                  )}
                </div>
              </PanelShell>
            </div>

            <PanelShell
              title="Top suppliers"
              icon={Truck}
              action={
                data.topSuppliers.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setDrawer("suppliers")}
                    className="text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] hover:underline"
                  >
                    Open dossier
                  </button>
                ) : null
              }
            >
              {data.topSuppliers.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No supplier spend in this range.
                </p>
              ) : (
                <ul className="divide-y divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]">
                  {data.topSuppliers.slice(0, 5).map((row) => {
                    const pct =
                      Number(data.summary.totalSpend) > 0
                        ? (Number(row.spend) / Number(data.summary.totalSpend)) *
                          100
                        : 0;
                    return (
                      <li
                        key={row.supplierId}
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {row.supplierName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {row.lineCount} line{row.lineCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="w-24 shrink-0">
                          <div className="mb-1 h-1.5 overflow-hidden rounded-none bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
                            <div
                              className="h-full rounded-none bg-[var(--pos-primary,#0f766e)]"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <p className="text-right text-[10px] tabular-nums text-muted-foreground">
                            {pct.toFixed(1)}%
                          </p>
                        </div>
                        <p className="w-[5.5rem] shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                          {formatMoneyShort(row.spend)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </PanelShell>

            {/* Dossier launchers */}
            <div className="grid gap-1 sm:grid-cols-3">
              <DossierButton
                title="Price variance"
                count={data.priceAlerts.length}
                hint={
                  data.priceAlerts.length
                    ? "Paid vs primary cost"
                    : "No alerts in range"
                }
                icon={TrendingUp}
                tone={aboveCount > 0 ? "warn" : "default"}
                onClick={() => setDrawer("variance")}
              />
              <DossierButton
                title="Categories"
                count={data.topCategories.length}
                hint="Where money landed"
                icon={Package}
                onClick={() => setDrawer("categories")}
              />
              <DossierButton
                title="Single-source"
                count={data.singleSourceRisks.length}
                hint={
                  riskCount > 0
                    ? "Items with one supplier"
                    : "No concentration risk"
                }
                icon={ShieldAlert}
                tone={riskCount > 0 ? "bad" : "default"}
                onClick={() => setDrawer("risk")}
              />
            </div>
          </div>
        </div>
      ) : null}
        </div>

      {/* Drawers */}
      <FormDrawer
        open={drawer === "suppliers"}
        onOpenChange={(open) => !open && setDrawer(null)}
        title="Supplier dossier"
        description="Full spend ranking for the selected window."
        contextLabel="Intelligence"
        icon={<Truck className="size-5" aria-hidden />}
        width="wide"
        headerDensity="compact"
      >
        {data && data.topSuppliers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className="px-1 py-2">Supplier</th>
                  <th className="px-1 py-2 text-right">Lines</th>
                  <th className="px-1 py-2 text-right">Spend</th>
                  <th className="px-1 py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.topSuppliers.map((row) => {
                  const pct =
                    Number(data.summary.totalSpend) > 0
                      ? (Number(row.spend) / Number(data.summary.totalSpend)) *
                        100
                      : 0;
                  return (
                    <tr key={row.supplierId}>
                      <td className="px-1 py-2.5 font-medium">{row.supplierName}</td>
                      <td className="px-1 py-2.5 text-right tabular-nums">
                        {row.lineCount}
                      </td>
                      <td className="px-1 py-2.5 text-right tabular-nums">
                        {formatMoney(row.spend)}
                      </td>
                      <td className="px-1 py-2.5 text-right tabular-nums text-muted-foreground">
                        {pct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No suppliers to list.</p>
        )}
      </FormDrawer>

      <FormDrawer
        open={drawer === "variance"}
        onOpenChange={(open) => !open && setDrawer(null)}
        title="Price variance"
        description="Lines paid above or below the primary supplier cost."
        contextLabel="Intelligence"
        icon={<TrendingUp className="size-5" aria-hidden />}
        width="wide"
        headerDensity="compact"
      >
        {data && data.priceAlerts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className="px-1 py-2">SKU</th>
                  <th className="px-1 py-2 text-right">Paid</th>
                  <th className="px-1 py-2 text-right">Primary</th>
                  <th className="px-1 py-2 text-right">Variance</th>
                  <th className="px-1 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.priceAlerts.map((row, i) => {
                  const above = Number(row.variancePercent) > 0;
                  return (
                    <tr key={`${row.itemId}-${row.invoiceId}-${i}`}>
                      <td className="px-1 py-2.5 font-medium">{row.itemSku}</td>
                      <td className="px-1 py-2.5 text-right tabular-nums">
                        {formatUnit(Number(row.paidUnitCost))}
                      </td>
                      <td className="px-1 py-2.5 text-right tabular-nums text-muted-foreground">
                        {row.primaryLastCost
                          ? formatUnit(Number(row.primaryLastCost))
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          "px-1 py-2.5 text-right tabular-nums font-medium",
                          above ? "text-rose-600" : "text-emerald-600",
                        )}
                      >
                        {formatPct(row.variancePercent)}
                      </td>
                      <td className="px-1 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-none border px-2 py-0.5 text-[11px] font-semibold tracking-[-0.02em]",
                            above
                              ? "border-rose-500/40 bg-white text-rose-800 dark:text-rose-200"
                              : "border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]",
                          )}
                        >
                          {above ? (
                            <TrendingUp className="size-3" aria-hidden />
                          ) : (
                            <TrendingDown className="size-3" aria-hidden />
                          )}
                          {above ? "Above" : "Below"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No price variance alerts in this window.
          </p>
        )}
      </FormDrawer>

      <FormDrawer
        open={drawer === "categories"}
        onOpenChange={(open) => !open && setDrawer(null)}
        title="Spend by category"
        description="Category mix for the selected window."
        contextLabel="Intelligence"
        icon={<ShoppingCart className="size-5" aria-hidden />}
        width="default"
        headerDensity="compact"
      >
        {data && data.topCategories.length > 0 ? (
          <ul className="divide-y divide-border/40">
            {data.topCategories.map((row) => (
              <li
                key={row.categoryId}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.categoryName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.lineCount} line{row.lineCount === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatMoney(row.spend)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No category spend yet.</p>
        )}
      </FormDrawer>

      <FormDrawer
        open={drawer === "risk"}
        onOpenChange={(open) => !open && setDrawer(null)}
        title="Single-source risk"
        description="SKUs that depend on one supplier only."
        contextLabel="Intelligence"
        icon={<ShieldAlert className="size-5" aria-hidden />}
        width="wide"
        headerDensity="compact"
      >
        {data && data.singleSourceRisks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className="px-1 py-2">SKU</th>
                  <th className="px-1 py-2">Name</th>
                  <th className="px-1 py-2">Sole supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.singleSourceRisks.map((row) => (
                  <tr key={row.itemId}>
                    <td className="px-1 py-2.5 font-medium">{row.sku}</td>
                    <td className="px-1 py-2.5">{row.name}</td>
                    <td className="px-1 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-none border border-rose-500/40 bg-white px-2 py-0.5 text-[11px] font-semibold tracking-[-0.02em] text-rose-800 dark:text-rose-200">
                        <AlertTriangle className="size-3" aria-hidden />
                        {row.soleSupplierName}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No single-source concentration in this catalog snapshot.
          </p>
        )}
      </FormDrawer>
      </div>
    </div>
  );
}
