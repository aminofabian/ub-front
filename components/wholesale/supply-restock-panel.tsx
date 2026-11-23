"use client";

import { useEffect, useState } from "react";

import { fetchSupplyRestockBoard, type SupplyRestockBoard } from "@/lib/api";

type Period = "day" | "week" | "month";
const WINDOWS: { value: Period; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

/** What a row's urgency is called. Said in words; the order of the list carries the rest. */
const URGENCY: Record<string, string> = {
  out: "Out of stock",
  low: "Running low",
  plan: "Plan a restock",
  ok: "Enough for now",
};
const ORDER = ["out", "low", "plan", "ok"];

function n(value: number | string | null | undefined): string {
  if (value == null || value === "") return "";
  const num = Number(value);
  return Number.isFinite(num) ? String(Number(num.toFixed(2))) : String(value);
}

/**
 * What to restock in the shops this supplier supplies: its products in each shop, with what the shop has left and
 * how much to send, the most urgent first. A shop shows its stock only if it chose to share it.
 */
export function SupplyRestockPanel() {
  const [period, setPeriod] = useState<Period>("week");
  const [board, setBoard] = useState<SupplyRestockBoard | null>(null);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    setBoard(null);
    setFailed(false);
    fetchSupplyRestockBoard(period)
      .then((next) => {
        if (alive) setBoard(next);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [period]);

  const chip = (active: boolean) =>
    `min-h-11 border px-3 text-[13px] font-medium sm:min-h-9 ${
      active ? "border-foreground bg-foreground text-background" : "border-foreground/15 text-foreground"
    }`;

  const rows = [...(board?.rows ?? [])].sort(
    (a, b) => ORDER.indexOf(a.urgency) - ORDER.indexOf(b.urgency) || a.shopName.localeCompare(b.shopName),
  );
  const needing = rows.filter((row) => row.urgency !== "ok");
  const shown = showAll ? rows : needing;

  return (
    <section aria-label="What to restock" className="mt-4">
      <div className="flex flex-wrap gap-1.5">
        {WINDOWS.map((w) => (
          <button key={w.value} type="button" aria-pressed={period === w.value} className={chip(period === w.value)} onClick={() => setPeriod(w.value)}>
            {w.label}
          </button>
        ))}
      </div>

      {failed ? (
        <p className="mt-6 text-[14px] text-foreground">Could not load what to restock. Choose the period again to retry.</p>
      ) : !board ? (
        <p className="mt-6 text-[14px] text-muted-foreground">Loading…</p>
      ) : board.shopCount === 0 ? (
        <p className="mt-6 max-w-prose text-[14px] text-muted-foreground">
          No shop buys from you through its own purchasing yet. When one adds you as a supplier and orders, its
          products appear here.
        </p>
      ) : (
        <>
          <p className="mt-4 text-[14px] text-foreground">
            {board.summary.needsRestockCount === 0
              ? "Nothing needs restocking in the shops you supply."
              : board.summary.needsRestockCount === 1
                ? "1 product needs restocking"
                : `${board.summary.needsRestockCount} products need restocking`}
            {board.summary.outOfStockCount > 0 ? `, ${board.summary.outOfStockCount} of them out of stock.` : board.summary.needsRestockCount > 0 ? "." : ""}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Across {board.shopCount} {board.shopCount === 1 ? "shop" : "shops"}.{" "}
            {board.stockShopCount < board.shopCount
              ? `${board.stockShopCount} of them share what they have left; for the others only what you supplied is known.`
              : ""}
          </p>

          {shown.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-[14px]">
                <thead>
                  <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                    <th className="py-2 font-medium">Product</th>
                    <th className="py-2 font-medium">Shop</th>
                    <th className="py-2 text-right font-medium">Left</th>
                    <th className="py-2 text-right font-medium">Send</th>
                    <th className="py-2 pl-3 font-medium">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row) => (
                    <tr key={row.key} className="border-b border-border align-top">
                      <td className="py-2 pr-2">{row.productName}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{row.shopName}</td>
                      <td className="py-2 text-right tabular-nums">{row.stockVisible ? n(row.onHand) : "Not shared"}</td>
                      <td className="py-2 text-right font-medium tabular-nums">{n(row.suggestedRestock)}</td>
                      <td className="py-2 pl-3 text-muted-foreground">
                        {URGENCY[row.urgency] ?? row.urgency}
                        {row.daysOfCover != null && row.urgency !== "out" ? `, about ${n(row.daysOfCover)} days left` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {rows.length > needing.length ? (
            <button type="button" className="mt-3 min-h-11 text-[13px] font-medium underline underline-offset-4 sm:min-h-0" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show only what needs restocking" : `Show all ${rows.length} products`}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
