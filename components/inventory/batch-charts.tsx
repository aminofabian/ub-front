"use client";

import { useMemo } from "react";
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
import { TrendingUp, PieChart as PieIcon, Package, Clock } from "lucide-react";

import type {
  BatchTrendPoint,
  StatusDistributionPoint,
  TopProductPoint,
  ExpiringBatchPoint,
} from "@/lib/api";

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Active",
    depleted: "Depleted",
    closed: "Closed",
    soldout: "Sold out",
    clearing: "Clearing",
  };
  return map[status] || status;
}

function ChartCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function BatchCharts({
  dailyTrend,
  statusDistribution,
  topProducts,
  expiringBatches,
}: {
  dailyTrend: BatchTrendPoint[];
  statusDistribution: StatusDistributionPoint[];
  topProducts: TopProductPoint[];
  expiringBatches: ExpiringBatchPoint[];
}) {
  const trendData = useMemo(() => {
    return [...dailyTrend].reverse().map((t) => ({
      date: formatDateLabel(t.date),
      fullDate: t.date,
      batches: t.batchesCreated,
      quantity: Number(t.quantityProduced),
      cost: Number(t.productionCost),
    }));
  }, [dailyTrend]);

  const statusData = useMemo(() => {
    return statusDistribution.map((s) => ({
      name: statusLabel(s.status),
      value: s.count,
      rawStatus: s.status,
    }));
  }, [statusDistribution]);

  const topProductData = useMemo(() => {
    return [...topProducts].slice(0, 8).map((p) => ({
      name: p.itemName.length > 20 ? p.itemName.slice(0, 20) + "…" : p.itemName,
      fullName: p.itemName,
      batches: p.batchCount,
      quantity: Number(p.totalQuantity),
    }));
  }, [topProducts]);

  const expiringData = useMemo(() => {
    return expiringBatches.slice(0, 10).map((e) => ({
      name: e.itemName.length > 18 ? e.itemName.slice(0, 18) + "…" : e.itemName,
      days: e.daysUntilExpiry,
      quantity: Number(e.quantityRemaining),
      status: e.daysUntilExpiry < 0 ? "expired" : e.daysUntilExpiry <= 3 ? "critical" : "warning",
    }));
  }, [expiringBatches]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Daily Trend */}
      <ChartCard title="Daily Batch Creation Trend" icon={TrendingUp}>
        <div className="h-64">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="batches" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No trend data available
            </div>
          )}
        </div>
      </ChartCard>

      {/* Status Distribution */}
      <ChartCard title="Batch Status Distribution" icon={PieIcon}>
        <div className="h-64">
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                  }
                  labelLine={false}
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend verticalAlign="bottom" height={24} iconSize={8} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No status data available
            </div>
          )}
        </div>
      </ChartCard>

      {/* Top Products */}
      <ChartCard title="Top Products by Batch Count" icon={Package}>
        <div className="h-64">
          {topProductData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="batches" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No product data available
            </div>
          )}
        </div>
      </ChartCard>

      {/* Expiring Batches */}
      <ChartCard title="Expiring Batches Timeline" icon={Clock}>
        <div className="h-64 overflow-y-auto">
          {expiringData.length > 0 ? (
            <div className="space-y-2">
              {expiringData.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        e.status === "expired"
                          ? "bg-rose-500"
                          : e.status === "critical"
                            ? "bg-amber-500"
                            : "bg-sky-500"
                      }`}
                    />
                    <span className="font-medium">{e.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Qty: {e.quantity.toLocaleString()}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-medium ${
                        e.status === "expired"
                          ? "bg-rose-100 text-rose-700"
                          : e.status === "critical"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {e.days < 0 ? `${Math.abs(e.days)}d overdue` : `${e.days}d left`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No expiring batches
            </div>
          )}
        </div>
      </ChartCard>
    </div>
  );
}
