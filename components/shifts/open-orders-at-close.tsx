"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { isFoodBusiness } from "@/lib/business-store-type";
import { APP_ROUTES } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { fetchFloor, type OrderCardRecord } from "@/lib/restaurant-api";
import { IS_DESKTOP } from "@/lib/runtime";

const kes = (n: number) => formatMoney(n, "KES");
const SHOWN = 6;

type Row = { id: string; label: string; total: number };

function label(order: OrderCardRecord, tableName: string | null): string {
  const where =
    tableName ??
    (order.channel === "TAKEAWAY" ? "Takeaway" : order.channel === "DELIVERY" ? "Delivery" : "No table");
  const who = order.customerName ? ` · ${order.customerName}` : "";
  return `${where}${who} · order ${order.orderNumber}`;
}

/**
 * Shown while closing a shift at a food business: the orders at this branch that have not been
 * paid. Closing does not cancel them (ADR 0020), so this is a warning, not a blocker — the
 * money for them is simply not in this shift's till yet.
 */
export function OpenOrdersAtClose({ branchId }: { branchId: string | null | undefined }) {
  const dashboard = useOptionalDashboard();
  const food = isFoodBusiness(dashboard?.business) && !IS_DESKTOP;
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!food || !branchId) return;
    let live = true;
    fetchFloor(branchId)
      .then((floor) => {
        if (!live) return;
        const found: Row[] = [];
        for (const t of floor.tables) {
          for (const o of t.orders) {
            if (!o.booked && !o.settled) found.push({ id: o.orderId, label: label(o, t.table.name), total: o.unsettled });
          }
        }
        for (const o of floor.otherOrders) {
          // A delivery already paid for is on the floor only until it is delivered: nothing is owed.
          if (!o.booked && !o.settled) found.push({ id: o.orderId, label: label(o, null), total: o.unsettled });
        }
        setRows(found);
      })
      .catch(() => {
        // Not allowed to see the floor, or no connection: the close itself must not be held up.
        if (live) setRows(null);
      });
    return () => {
      live = false;
    };
  }, [food, branchId]);

  if (!food || !rows || rows.length === 0) return null;
  const owed = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <div
      role="note"
      className="mb-2 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] p-3 text-[13px] leading-relaxed"
    >
      <p className="font-semibold">
        {rows.length === 1 ? "1 order is" : `${rows.length} orders are`} still open · {kes(owed)} not paid yet
      </p>
      <ul className="mt-1 grid gap-0.5">
        {rows.slice(0, SHOWN).map((r) => (
          <li key={r.id} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">{r.label}</span>
            <span className="font-mono tabular-nums">{kes(r.total)}</span>
          </li>
        ))}
        {rows.length > SHOWN ? <li>and {rows.length - SHOWN} more</li> : null}
      </ul>
      <p className="mt-1 text-[var(--op-muted)]">
        They stay open after you close and are paid on the next shift.{" "}
        <Link className="underline" href={APP_ROUTES.restaurantFloor}>
          Open the floor
        </Link>
      </p>
    </div>
  );
}
