"use client";

import { useCallback, useState } from "react";
import { BarChart3, CreditCard, LineChart, Truck } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardNotice,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchPriceCompetitiveness,
  fetchSingleSourceRisk,
  fetchSpendBySupplierCategory,
  type PriceCompetitivenessRow,
  type SingleSourceRiskRow,
  type SpendBySupplierCategoryRow,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMaybePct(n: number | null | undefined): string {
  if (n === null || n === undefined) {
    return "—";
  }
  return `${formatMoney(n)}%`;
}

function formatUnit(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
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
  { id: "last3days", label: "Past 3 days" },
  { id: "last7days", label: "Last week" },
  { id: "last14days", label: "Last 2 weeks" },
  { id: "last30days", label: "Last month (30 days)" },
  { id: "last90days", label: "Last 3 months" },
  { id: "last180days", label: "Last 6 months" },
  { id: "last365days", label: "Last year" },
] as const;

type RangePresetId = (typeof RANGE_PRESETS)[number]["id"];

function isRangePresetId(v: string): v is RangePresetId {
  return RANGE_PRESETS.some((p) => p.id === v);
}

function rangeForPreset(id: RangePresetId): { from: string; to: string } {
  const today = startOfLocalDay(new Date());
  const to = toDateInputValue(today);
  if (id === "today") {
    return { from: to, to };
  }
  if (id === "yesterday") {
    const y = addLocalDays(today, -1);
    const ys = toDateInputValue(y);
    return { from: ys, to: ys };
  }
  const back =
    id === "last3days"
      ? 2
      : id === "last7days"
        ? 6
        : id === "last14days"
          ? 13
          : id === "last30days"
            ? 29
            : id === "last90days"
              ? 89
              : id === "last180days"
                ? 179
                : 364;
  const fromD = addLocalDays(today, -back);
  return { from: toDateInputValue(fromD), to };
}

export default function PurchasingIntelligencePage() {
  const { me } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.PurchasingIntelligenceRead);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [spend, setSpend] = useState<SpendBySupplierCategoryRow[]>([]);
  const [prices, setPrices] = useState<PriceCompetitivenessRow[]>([]);
  const [risk, setRisk] = useState<SingleSourceRiskRow[]>([]);

  const load = useCallback(async (range?: { from: string; to: string }) => {
    setMessage("");
    setLoading(true);
    try {
      const fromRaw = range?.from ?? from;
      const toRaw = range?.to ?? to;
      const fromArg = fromRaw.trim() || undefined;
      const toArg = toRaw.trim() || undefined;
      const [spendRows, priceRows, riskRows] = await Promise.all([
        fetchSpendBySupplierCategory(fromArg, toArg),
        fetchPriceCompetitiveness(fromArg, toArg),
        fetchSingleSourceRisk(),
      ]);
      setSpend(spendRows);
      setPrices(priceRows);
      setRisk(riskRows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Supplier intelligence"
        description={
          <>
            You do not have permission to view purchasing intelligence. Ask an administrator to grant{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.PurchasingIntelligenceRead}</code>.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <div className="space-y-8">
      <header className="space-y-4">
        <DashboardPageHero
          icon={LineChart}
          eyebrow="Purchasing"
          title="Supplier intelligence"
          description={
            <>
              Spend by supplier and category, unit price vs primary supplier last cost, and sellable items with a
              single active supplier link. Use a quick range or set From / To manually. Leave dates empty for the
              default rolling window (last 90 days). Click <strong>Refresh</strong> to load with your dates.
            </>
          }
        />
        <DashboardQuickLinks
          links={[
            { href: APP_ROUTES.purchasingApAging, label: "AP aging", desc: "Balances", icon: BarChart3 },
            { href: APP_ROUTES.purchasingRecordPayment, label: "Record payment", desc: "Cash & alloc", icon: CreditCard },
            { href: APP_ROUTES.suppliers, label: "Suppliers", desc: "Directory", icon: Truck },
          ]}
        />
      </header>

      <form
        className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          load().catch(() => {
            setMessage("Failed to load reports.");
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Quick range</span>
          <select
            className="min-w-[12rem] rounded border bg-background px-2 py-1.5 text-sm"
            value=""
            onChange={(event) => {
              const id = event.target.value;
              if (!isRangePresetId(id)) {
                return;
              }
              const r = rangeForPreset(id);
              setFrom(r.from);
              setTo(r.to);
              void load(r).catch(() => {
                setMessage("Failed to load reports.");
              });
            }}
          >
            <option value="">Choose preset…</option>
            {RANGE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">From</span>
          <input
            type="date"
            className="rounded border bg-background px-2 py-1.5"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">To</span>
          <input
            type="date"
            className="rounded border bg-background px-2 py-1.5"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </form>

      {message ? <DashboardNotice text={message} /> : null}

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Spend by supplier & category</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Supplier</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium text-right">Spend</th>
              </tr>
            </thead>
            <tbody>
              {spend.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                    No rows for this range.
                  </td>
                </tr>
              ) : (
                spend.map((row) => (
                  <tr key={`${row.supplierId}-${row.categoryId}`} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.supplierName}</td>
                    <td className="px-3 py-2">{row.categoryName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.spendTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Price vs primary last cost</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium text-right">Paid / unit</th>
                <th className="px-3 py-2 font-medium text-right">Primary last cost</th>
                <th className="px-3 py-2 font-medium text-right">Variance %</th>
                <th className="px-3 py-2 font-medium">From primary?</th>
              </tr>
            </thead>
            <tbody>
              {prices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No invoice lines in range with a catalog primary cost.
                  </td>
                </tr>
              ) : (
                prices.map((row) => (
                  <tr key={row.supplierInvoiceLineId} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.itemSku}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatUnit(row.paidUnitCost)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.primaryLastCostPrice == null ? "—" : formatUnit(row.primaryLastCostPrice)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMaybePct(row.variancePercentVsPrimary)}
                    </td>
                    <td className="px-3 py-2">{row.purchasedFromPrimarySupplier ? "Yes" : "No"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Single-source risk (sellable items)</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Supplier</th>
              </tr>
            </thead>
            <tbody>
              {risk.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                    No single-source sellable items.
                  </td>
                </tr>
              ) : (
                risk.map((row) => (
                  <tr key={row.itemId} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.sku}</td>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.soleSupplierName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
