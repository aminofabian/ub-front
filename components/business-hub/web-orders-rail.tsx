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

function fulfillmentTone(status: string | null | undefined): string {
  const s = (status ?? "awaiting_confirmation").trim().toLowerCase();
  if (s === "dispatched") return "text-emerald-800";
  if (s === "confirmed") return "text-[#8A6B2E]";
  if (s === "completed") return "text-[#8A8A8A]";
  return "text-[#C47A5A]";
}

/** Viewport height for ~3 compact rows. */
const VIEWPORT_CLASS = "max-h-[7.5rem]";

export function WebOrdersRail({
  orders,
  currency,
  live = false,
  justUpdated = false,
  className,
  onInspect,
}: {
  orders: WebOrderSummary[];
  currency?: string | null;
  live?: boolean;
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
        justUpdated && "hub-scan-sweep ring-1 ring-[#B08D48]/35",
        className,
      )}
      aria-label="Web pickup orders"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,#141414_6%,transparent)] px-3.5 py-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="truncate text-[12px] font-medium tracking-[-0.01em] text-[#141414]">
            Web orders
          </p>
          {!empty ? (
            <p className="truncate text-[10px] text-[#8A8A8A]">
              {orders.length} open · {fmtMoney(total, currency)}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {live ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald-800">
              <span
                className="size-1.5 bg-emerald-500 hub-live-beacon"
                aria-hidden
              />
              Live
            </span>
          ) : null}
          <Link
            href={APP_ROUTES.storefrontWebOrders}
            className="text-[10px] font-medium text-[#8A6B2E] transition-colors hover:text-[#141414]"
          >
            All
          </Link>
        </div>
      </header>

      {empty ? (
        <div className="px-3 py-2.5">
          <p className="text-[11px] text-[#8A8A8A]">
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
          <ol className="divide-y divide-[#EDE8DF]">
            {orders.map((order, i) => {
              const newest = i === 0 && justUpdated;
              const fulfillment = order.fulfillmentStatus ?? "awaiting_confirmation";
              return (
                <li
                  key={order.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-[#FCFAF6]",
                    newest && "bg-[#FCFAF6] hub-figure-pop",
                  )}
                >
                  <Link
                    href={`${APP_ROUTES.storefrontWebOrders}?orderId=${encodeURIComponent(order.id)}`}
                    className="shrink-0 font-mono text-[10px] tabular-nums text-[#8A8A8A] hover:text-[#141414]"
                    title={new Date(order.createdAt).toLocaleString()}
                  >
                    <time dateTime={order.createdAt}>
                      {formatClock(order.createdAt)}
                    </time>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onInspect?.(order)}
                      aria-label={`Open purchase history for ${order.customerName?.trim() || "customer"}`}
                      className={cn(
                        "block max-w-full truncate text-left text-[12px] font-medium text-[#141414]",
                        onInspect &&
                          "underline decoration-[#B08D48]/40 underline-offset-2 hover:decoration-[#B08D48]",
                      )}
                    >
                      {order.customerName?.trim() || "Customer"}
                    </button>
                  </div>
                  <Link
                    href={`${APP_ROUTES.storefrontWebOrders}?orderId=${encodeURIComponent(order.id)}`}
                    className={cn(
                      "shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]",
                      fulfillmentTone(fulfillment),
                    )}
                  >
                    {order.status?.toLowerCase() === "paid"
                      ? fulfillmentLabel(fulfillment)
                      : labelPayment(order.status)}
                  </Link>
                  <p className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-[#141414]">
                    {fmtMoney(order.grandTotal, order.currency || currency)}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

function labelPayment(status: string | null | undefined): string {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "paid") return "Paid";
  if (s === "pending" || s === "awaiting_payment") return "Unpaid";
  if (!s) return "Open";
  return s.replace(/_/g, " ");
}
