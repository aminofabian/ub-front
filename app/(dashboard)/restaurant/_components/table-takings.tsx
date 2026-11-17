"use client";

import { dashboardHintClass } from "@/components/dashboard-page-ui";
import { formatMoney } from "@/lib/money";
import type { TableTakingsReport, TableTakingsRow } from "@/lib/restaurant-api";
import { cn } from "@/lib/utils";

const kes = (n: number) => formatMoney(n, "KES");
const TITLE = "font-serif text-[1.45rem] italic leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]";
const RULE = "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]";
const MUTED = "text-[color-mix(in_srgb,var(--op-ink,#121A16)_68%,transparent)]";
const HEAD = "pb-2 text-[11px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#121A16)_60%,transparent)]";

function detail(row: TableTakingsRow): string {
  if (row.orders === 0) return "nothing paid";
  const parts = [`${row.orders} ${row.orders === 1 ? "order" : "orders"}`];
  if (row.guests > 0) parts.push(`${row.guests} ${row.guests === 1 ? "guest" : "guests"}`);
  if (row.orders > 1) parts.push(`${kes(row.perOrder)} an order`);
  if (row.tips > 0) parts.push(`${kes(row.tips)} in tips`);
  return parts.join(" · ");
}

/**
 * What each table took, and what each waiter's tables took, for a period: one line a table with a
 * bar showing its share of the best table, so the busy ones are seen at a glance.
 */
export function TableTakings({ report }: { report: TableTakingsReport }) {
  const rows = [...report.tables, ...report.offTheFloor];
  const best = Math.max(1, ...rows.map((r) => r.taken));
  const oneDay = report.from === report.to;

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <section aria-label="Takings by table" className="min-w-0 lg:col-span-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className={TITLE}>By table</h2>
          <p className="text-sm">
            <span className="font-mono text-base font-semibold tabular-nums">{kes(report.taken)}</span>
            <span className={MUTED}>
              {" "}from {report.orders} {report.orders === 1 ? "order" : "orders"}
              {report.tips > 0 ? ` · ${kes(report.tips)} in tips` : ""}
            </span>
          </p>
        </div>
        {report.orders === 0 ? (
          <p className={cn("mt-3", dashboardHintClass())}>
            No bill has been paid at a table {oneDay ? "on this day" : "in this period"} yet.
          </p>
        ) : null}
        <ul className={cn("mt-3 divide-y border-t", RULE)}>
          {rows.map((row, index) => (
            <li key={row.tableId ?? `off-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-2.5">
              <span className="min-w-0">
                <span className={cn("block text-[15px] font-medium", row.orders === 0 && MUTED)}>
                  {row.name}
                  {row.area ? <span className={cn("font-normal", MUTED)}> · {row.area}</span> : null}
                  {row.waiter ? <span className={cn("font-normal", MUTED)}> · {row.waiter}</span> : null}
                </span>
                <span className={cn("block text-[13px]", MUTED)}>{detail(row)}</span>
              </span>
              <span className={cn("font-mono text-[15px] font-semibold tabular-nums", row.orders === 0 && "font-normal opacity-50")}>
                {kes(row.taken)}
              </span>
              <span aria-hidden className="col-span-2 block h-1 bg-[color-mix(in_srgb,var(--order-ink,#121A16)_7%,transparent)]">
                <span
                  className="block h-full bg-[var(--pos-primary,#1D4B3B)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                  style={{ width: `${Math.round((row.taken / best) * 100)}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
        <p className={cn("mt-3", dashboardHintClass())}>
          From bills that were paid. A bill on the house or left unpaid took nothing; a refund made afterwards is not
          taken off; sales rung at the counter are not here.
        </p>
      </section>

      <section aria-label="Takings by waiter" className="min-w-0 lg:col-span-4">
        <h2 className={TITLE}>By waiter</h2>
        {report.waiters.length === 0 ? (
          <p className={cn("mt-3", dashboardHintClass())}>No one has served a paid order {oneDay ? "today" : "in this period"}.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className={cn("border-b text-left", RULE)}>
                <th className={HEAD}>Waiter</th>
                <th className={cn(HEAD, "text-right")}>Orders</th>
                <th className={cn(HEAD, "text-right")}>Took</th>
                <th className={cn(HEAD, "text-right")}>Tips</th>
              </tr>
            </thead>
            <tbody>
              {report.waiters.map((w) => (
                <tr key={w.staffProfileId} className={cn("border-b last:border-0", RULE)}>
                  <td className="py-2 font-medium">{w.name}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{w.orders}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{kes(w.taken)}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{w.tips > 0 ? kes(w.tips) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className={cn("mt-3", dashboardHintClass())}>A waiter&rsquo;s figure is the orders they served, whoever took the money.</p>
      </section>
    </div>
  );
}
