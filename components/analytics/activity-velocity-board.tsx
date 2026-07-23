"use client";

import { ArrowDownRight, ArrowUpRight, Gauge } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ItemVelocityRow } from "@/lib/api";

export type VelocitySortKey =
  | "itemName"
  | "todayQty"
  | "yesterdayQty"
  | "last3Qty"
  | "last7Qty"
  | "last30Qty";

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function formatQty(n: number | string | null | undefined): string {
  const v = toNum(n);
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatMoney(n: number | string | null | undefined): string {
  const v = toNum(n);
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const COLUMNS: { key: VelocitySortKey; label: string; hint: string }[] = [
  { key: "todayQty", label: "Today", hint: "Sold today" },
  { key: "yesterdayQty", label: "Yesterday", hint: "Sold yesterday" },
  { key: "last3Qty", label: "3 days", hint: "Including today" },
  { key: "last7Qty", label: "7 days", hint: "Including today" },
  { key: "last30Qty", label: "30 days", hint: "Including today" },
];

export function ActivityVelocityBoard({
  rows,
  sortKey,
  sortDir,
  onSort,
  onSelectItem,
  search,
}: {
  rows: ItemVelocityRow[];
  sortKey: VelocitySortKey;
  sortDir: "asc" | "desc";
  onSort: (key: VelocitySortKey) => void;
  onSelectItem: (itemId: string) => void;
  search: string;
}) {
  const filtered = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.itemName.toLowerCase().includes(q) ||
        (r.sku ?? "").toLowerCase().includes(q),
    );
  })();

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "itemName") {
      const cmp = a.itemName.localeCompare(b.itemName, undefined, {
        sensitivity: "base",
      });
      return sortDir === "asc" ? cmp : -cmp;
    }
    const av = toNum(a[sortKey]);
    const bv = toNum(b[sortKey]);
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const maxByCol: Record<string, number> = {};
  for (const col of COLUMNS) {
    maxByCol[col.key] = Math.max(
      1,
      ...sorted.map((r) => toNum(r[col.key as keyof ItemVelocityRow])),
    );
  }

  const movers = [...rows]
    .map((r) => ({
      row: r,
      delta: toNum(r.todayQty) - toNum(r.yesterdayQty),
    }))
    .filter((m) => m.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {movers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            <Gauge className="size-3" aria-hidden />
            Pulse vs yesterday
          </span>
          {movers.map(({ row, delta }) => {
            const up = delta > 0;
            return (
              <button
                key={row.itemId}
                type="button"
                onClick={() => onSelectItem(row.itemId)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  up
                    ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-700 hover:bg-emerald-500/10"
                    : "border-amber-500/25 bg-amber-500/[0.06] text-amber-800 hover:bg-amber-500/10",
                )}
              >
                {up ? (
                  <ArrowUpRight className="size-3 shrink-0" aria-hidden />
                ) : (
                  <ArrowDownRight className="size-3 shrink-0" aria-hidden />
                )}
                <span className="max-w-[9rem] truncate">{row.itemName}</span>
                <span className="font-mono tabular-nums">
                  {up ? "+" : ""}
                  {formatQty(delta)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted-foreground">
          {search.trim()
            ? "No products match your search."
            : "No sales in the last 30 days for this scope."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b-2 border-border/50 text-left">
                <th className="sticky left-0 z-10 bg-card pb-2.5 pt-1 pl-1">
                  <button
                    type="button"
                    onClick={() => onSort("itemName")}
                    className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 hover:text-foreground"
                  >
                    Product
                    {sortKey === "itemName"
                      ? sortDir === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </button>
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="pb-2.5 pt-1 text-right"
                    title={col.hint}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="w-full text-right text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 hover:text-foreground"
                    >
                      {col.label}
                      {sortKey === col.key
                        ? sortDir === "asc"
                          ? " ↑"
                          : " ↓"
                        : ""}
                    </button>
                  </th>
                ))}
                <th className="pb-2.5 pt-1 pr-1 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
                  Stock
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <tr
                    key={row.itemId}
                    className={cn(
                      "cursor-pointer border-l-2 border-transparent transition-all duration-150",
                      "hover:border-l-primary/30 hover:bg-primary/[0.03]",
                      isEven ? "bg-transparent" : "bg-muted/[0.12]",
                    )}
                    onClick={() => onSelectItem(row.itemId)}
                  >
                    <td className="sticky left-0 z-[1] bg-inherit py-2.5 pl-1">
                      <p className="max-w-[200px] truncate text-[11px] font-medium text-foreground/90">
                        {row.itemName}
                      </p>
                      {row.sku ? (
                        <p className="font-mono text-[10px] text-muted-foreground/55">
                          {row.sku}
                        </p>
                      ) : null}
                    </td>
                    {COLUMNS.map((col) => {
                      const qty = toNum(
                        row[col.key as keyof ItemVelocityRow] as
                          | number
                          | string,
                      );
                      const revKey = col.key.replace(
                        "Qty",
                        "Revenue",
                      ) as keyof ItemVelocityRow;
                      const rev = toNum(row[revKey] as number | string);
                      const pct = Math.min(
                        100,
                        (qty / maxByCol[col.key]) * 100,
                      );
                      return (
                        <td key={col.key} className="px-2 py-2.5 text-right">
                          <div className="ml-auto flex w-[4.5rem] flex-col items-end gap-0.5 sm:w-[5.5rem]">
                            <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                              {formatQty(qty)}
                            </span>
                            <span className="font-mono text-[9px] tabular-nums text-muted-foreground/55">
                              {formatMoney(rev)}
                            </span>
                            <span
                              className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-muted/60"
                              aria-hidden
                            >
                              <span
                                className="block h-full rounded-full bg-primary/55"
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-2.5 pr-1 text-right font-mono text-[11px] tabular-nums text-foreground/75">
                      {formatQty(row.currentStock)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
