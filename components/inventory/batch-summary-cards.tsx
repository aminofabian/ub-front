"use client";

import {
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  PackageOpen,
  PackageX,
  TrendingUp,
  Warehouse,
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
} from "lucide-react";

import type { BatchSummaryCards } from "@/lib/api";

function formatNum(n: number | string): string {
  const val = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(val)) return "0";
  return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatMoney(n: number | string): string {
  const val = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(val)) return "0.00";
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Card({
  label,
  value,
  icon: Icon,
  trend,
  variant = "default",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const variantStyles = {
    default: "bg-card border-border/60",
    success: "bg-emerald-50/50 border-emerald-200/60",
    warning: "bg-amber-50/50 border-amber-200/60",
    danger: "bg-rose-50/50 border-rose-200/60",
    info: "bg-sky-50/50 border-sky-200/60",
  };
  const iconStyles = {
    default: "bg-muted text-muted-foreground",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
    info: "bg-sky-100 text-sky-700",
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
          {trend ? <p className="text-[11px] text-muted-foreground">{trend}</p> : null}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconStyles[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function BatchSummaryCards({ summary }: { summary: BatchSummaryCards }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      <Card
        label="Batches Today"
        value={formatNum(summary.totalBatchesToday)}
        icon={CalendarCheck}
        variant="info"
      />
      <Card
        label="Batches This Week"
        value={formatNum(summary.totalBatchesThisWeek)}
        icon={CalendarDays}
        variant="default"
      />
      <Card
        label="Batches This Month"
        value={formatNum(summary.totalBatchesThisMonth)}
        icon={CalendarRange}
        variant="default"
      />
      <Card
        label="Active Batches"
        value={formatNum(summary.activeBatches)}
        icon={Warehouse}
        variant="success"
      />
      <Card
        label="Completed"
        value={formatNum(summary.completedBatches)}
        icon={CheckCircle2}
        variant="default"
      />
      <Card
        label="Zero Quantity"
        value={formatNum(summary.zeroQuantityBatches)}
        icon={PackageX}
        variant={summary.zeroQuantityBatches > 0 ? "danger" : "default"}
      />
      <Card
        label="Low Quantity"
        value={formatNum(summary.lowQuantityBatches)}
        icon={AlertTriangle}
        variant={summary.lowQuantityBatches > 0 ? "warning" : "default"}
      />
      <Card
        label="Expired"
        value={formatNum(summary.expiredBatches)}
        icon={Clock}
        variant={summary.expiredBatches > 0 ? "danger" : "default"}
      />
      <Card
        label="Total Units"
        value={formatNum(summary.totalUnitsProduced)}
        icon={Boxes}
        variant="default"
      />
      <Card
        label="Stock Value"
        value={formatMoney(summary.estimatedStockValue)}
        icon={CircleDollarSign}
        variant="success"
      />
      <Card
        label="Production Cost"
        value={formatMoney(summary.totalProductionCost)}
        icon={TrendingUp}
        variant="default"
      />
      <Card
        label="Avg Qty / Batch"
        value={formatNum(summary.averageQuantityPerBatch)}
        icon={PackageOpen}
        variant="default"
      />
    </div>
  );
}
