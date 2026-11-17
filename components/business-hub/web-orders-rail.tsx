"use client";

import Link from "next/link";

import { APP_ROUTES } from "@/lib/config";
import { fmtMoney } from "@/lib/business-hub/formatters";
import type { WebOrderSummary } from "@/lib/api";
import { HUB_RAIL } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function fulfillmentLabel(status: string | null | undefined): string {
  const s = (status ?? "awaiting_confirmation").trim().toLowerCase();
  if (s === "awaiting_confirmation") return "Confirm";
  if (s === "confirmed") return "Packing";
  if (s === "dispatched") return "Ready";
  if (s === "completed") return "Done";
  return s.replace(/_/g, " ") || "Open";
}

/** Pill colours for the order's state, matching the hub badge palette. */
function fulfillmentPill(status: string | null | undefined): string {
  const s = (status ?? "awaiting_confirmation").trim().toLowerCase();
  if (s === "dispatched") return "bg-[#E3F3EA] text-[#0B6B43]";
  if (s === "confirmed") return "bg-[#E3EEE8] text-[var(--hub-accent,#0F4A38)]";
  if (s === "completed") return "bg-[#F0EDE4] text-[var(--hub-muted,#5E6B65)]";
  return "bg-[#FBEBD2] text-[#8A4B00]";
}

/** Viewport height for ~4 rows. */
const VIEWPORT_CLASS = "max-h-[18rem]";

export function WebOrdersRail({
  orders,
  currency,
  justUpdated = false,
  className,
  onInspect,
}: {
  orders: WebOrderSummary[];
  currency?: string | null;
  justUpdated?: boolean;
  className?: string;
  onInspect?: (order: WebOrderSummary) => void;
}) {
  const empty = orders.length === 0;
  const total = orders.reduce((sum, o) => sum + toNum(o.grandTotal), 0);

  return (
    <section
      className={cn(
        HUB_RAIL,
        justUpdated && "hub-scan-sweep ring-1 ring-[#0f766e]/35",
        className,
      )}
      aria-label="Web pickup orders"
    >
      <header className="flex shrink-0 items-start justify-between gap-2.5 px-[18px] pb-3 pt-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--hub-ink,#14211C)]">
            Web orders
          </p>
          {!empty ? (
            <p className="mt-0.5 truncate text-[13px] tabular-nums text-[var(--hub-muted,#5E6B65)]">
              {orders.length} open · {fmtMoney(total, currency)}
            </p>
          ) : null}
        </div>
        <Link
          href={APP_ROUTES.storefrontWebOrders}
          className="flex min-h-9 shrink-0 items-center rounded-[10px] bg-[#F0EDE4] px-3 text-[13px] font-semibold text-[var(--hub-ink,#14211C)] transition-colors hover:bg-[#E7E3D8]"
        >
          All
        </Link>
      </header>

      {empty ? (
        <div className="px-[18px] pb-4 pt-1">
          <p className="text-[13px] text-[var(--hub-muted,#5E6B65)]">
            No open web orders right now.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain",
            VIEWPORT_CLASS,
          )}
        >
          <ol className="flex flex-col">
            {orders.map((order, i) => {
              const newest = i === 0 && justUpdated;
              const fulfillment =
                order.fulfillmentStatus ?? "awaiting_confirmation";
              const isPaid = order.status?.toLowerCase() === "paid";
              const statusLabel = isPaid
                ? fulfillmentLabel(fulfillment)
                : "Pending payment";
              const statusPill = isPaid
                ? fulfillmentPill(fulfillment)
                : "bg-[#FBEBD2] text-[#8A4B00]";
              return (
                <li
                  key={order.id}
                  className={cn(
                    "flex items-center gap-3 border-t border-[#EFEBE0] px-[18px] py-3 transition-colors",
                    newest && "bg-[#FCFBF8] hub-figure-pop",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onInspect?.(order)}
                      aria-label={`Open purchase history for ${order.customerName?.trim() || "customer"}`}
                      className={cn(
                        "block max-w-full truncate text-left text-[14px] font-medium text-[var(--hub-ink,#14211C)]",
                        onInspect &&
                          "underline decoration-[var(--hub-accent,#0F4A38)]/30 underline-offset-2 hover:decoration-[var(--hub-accent,#0F4A38)]",
                      )}
                    >
                      {order.customerName?.trim() || "Customer"}
                    </button>
                    <Link
                      href={`${APP_ROUTES.storefrontWebOrders}?orderId=${encodeURIComponent(order.id)}`}
                      className="mt-0.5 block text-[12px] tabular-nums text-[var(--hub-muted,#5E6B65)] hover:text-[var(--hub-ink,#14211C)]"
                      title={new Date(order.createdAt).toLocaleString()}
                    >
                      <time dateTime={order.createdAt}>
                        {formatClock(order.createdAt)}
                      </time>
                    </Link>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <p className="text-[14px] font-semibold tabular-nums text-[var(--hub-ink,#14211C)]">
                      {fmtMoney(order.grandTotal, order.currency || currency)}
                    </p>
                    <Link
                      href={`${APP_ROUTES.storefrontWebOrders}?orderId=${encodeURIComponent(order.id)}`}
                      className={cn(
                        "rounded-full px-2.5 py-[3px] text-[12px] font-semibold",
                        statusPill,
                      )}
                    >
                      {statusLabel}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
