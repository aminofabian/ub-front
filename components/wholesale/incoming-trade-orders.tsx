"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  decideIncomingTradeOrder,
  fetchIncomingTradeOrder,
  fetchIncomingTradeOrders,
  fetchItems,
  fetchTradeOrderMatches,
  makePurchaseOrderFromTradeOrder,
  recordTradeOrderReceived,
  type TradeOrder,
  type TradeOrderMatch,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

const ORDER_LABEL: Record<string, string> = {
  placed: "Waiting for your answer",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};
const DELIVERY_LABEL: Record<string, string> = { none: "Not dispatched", part: "Part dispatched", all: "Dispatched" };
const EVENT_LABEL: Record<string, string> = {
  sent: "Sent by the supplier",
  confirmed: "Confirmed by you",
  declined: "Declined by you",
  dispatched: "Dispatched by the supplier",
  cancelled: "Cancelled by the supplier",
  purchase_order: "You made a purchase order",
  invoiced: "Invoiced by the supplier",
  payment: "Payment recorded by the supplier",
  received: "You said what arrived",
  shortage: "You reported a shortage",
  credit_note: "Credit note from the supplier",
  resolved: "Shortage settled by the supplier",
};
const MONEY_LABEL: Record<string, string> = {
  unbilled: "Not invoiced",
  invoiced: "Invoiced",
  part_paid: "Part paid",
  settled: "Settled",
};

type Picked = { itemId: string; name: string };

/** Finds one of this shop's products for a line that did not match by barcode. */
function ProductPicker({ onPick }: { onPick: (picked: Picked) => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Picked[] | null>(null);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (term.trim().length < 2) return;
    setSearching(true);
    try {
      const rows = await fetchItems(term, { size: 8 });
      setResults(rows.map((r) => ({ itemId: r.id, name: r.name })));
    } catch {
      toast.error("Could not search your products");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mt-1">
      <div className="flex gap-2">
        <input
          className="h-11 min-w-0 flex-1 border border-foreground/15 bg-background px-2 text-[14px] sm:h-9"
          placeholder="Search your products"
          aria-label="Search your products"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={searching} onClick={() => void search()}>
          {searching ? "Searching…" : "Search"}
        </Button>
      </div>
      {results ? (
        results.length === 0 ? (
          <p className="mt-1 text-[12px] text-muted-foreground">Nothing found. Add the product first, then come back.</p>
        ) : (
          <ul className="mt-1 divide-y divide-border border border-border">
            {results.map((r) => (
              <li key={r.itemId}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center px-2 text-left text-[13px] hover:bg-foreground/[0.04] sm:min-h-9"
                  onClick={() => onPick(r)}
                >
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

function money(currency: string, value: number): string {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function qty(value: number): string {
  return String(Number(value.toFixed(4)));
}

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Orders a connected supplier has sent this shop. Confirming says the order is yours; it does not
 * write a purchase order or touch stock. Nothing arrives here from a supplier you have not connected.
 */
export function IncomingTradeOrders() {
  const { me } = useDashboard();
  const canAnswer = hasPermission(me?.permissions, Permission.PurchasingPathAWrite);
  const [orders, setOrders] = useState<TradeOrder[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<TradeOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<TradeOrderMatch[] | null>(null);
  const [picked, setPicked] = useState<Record<number, Picked>>({});
  const [madePo, setMadePo] = useState<string | null>(null);
  const [arrived, setArrived] = useState<Record<number, string>>({});

  const sayWhatArrived = async () => {
    if (!open?.lines) return;
    const lines = open.lines.map((l) => ({ lineNo: l.lineNo, receivedQty: Number(arrived[l.lineNo] ?? qty(l.quantity)) }));
    if (lines.some((l) => !Number.isFinite(l.receivedQty) || l.receivedQty < 0)) {
      toast.error("Enter what arrived for every line. Use 0 for nothing.");
      return;
    }
    setBusy(true);
    try {
      setOpen(await recordTradeOrderReceived(open.id, lines));
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save what arrived");
    } finally {
      setBusy(false);
    }
  };

  const openId = open?.id ?? null;
  const needsPurchaseOrder = open != null && open.orderState === "confirmed" && !open.hasPurchaseOrder && !madePo;
  useEffect(() => {
    if (!openId || !needsPurchaseOrder) {
      setMatches(null);
      return;
    }
    let alive = true;
    fetchTradeOrderMatches(openId)
      .then((rows) => {
        if (alive) setMatches(rows);
      })
      .catch(() => {
        if (alive) setMatches(null);
      });
    return () => {
      alive = false;
    };
  }, [openId, needsPurchaseOrder]);

  const makePurchaseOrder = async () => {
    if (!open || !matches) return;
    setBusy(true);
    try {
      const made = await makePurchaseOrderFromTradeOrder(
        open.id,
        Object.entries(picked).map(([lineNo, p]) => ({ lineNo: Number(lineNo), itemId: p.itemId })),
      );
      setMadePo(made.poNumber);
      setOpen(await fetchIncomingTradeOrder(open.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not make the purchase order");
    } finally {
      setBusy(false);
    }
  };

  const load = useCallback(() => {
    let alive = true;
    setFailed(false);
    fetchIncomingTradeOrders()
      .then((rows) => {
        if (alive) setOrders(rows);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const openOrder = async (id: string) => {
    try {
      setPicked({});
      setArrived({});
      setMadePo(null);
      setOpen(await fetchIncomingTradeOrder(id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the order");
    }
  };

  const decide = async (decision: "confirm" | "decline") => {
    if (!open) return;
    setBusy(true);
    try {
      setOpen(await decideIncomingTradeOrder(open.id, decision));
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not go through");
    } finally {
      setBusy(false);
    }
  };

  if (open) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button type="button" className="text-[13px] font-medium underline underline-offset-4" onClick={() => setOpen(null)}>
          Back to orders from suppliers
        </button>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">
          {open.supplierName} · order {open.orderCode}
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {ORDER_LABEL[open.orderState] ?? open.orderState} · {DELIVERY_LABEL[open.deliveryState] ?? open.deliveryState} ·{" "}
          {MONEY_LABEL[open.moneyState] ?? open.moneyState} · {when(open.createdAt)}
        </p>
        {open.escrow ? (
          <p className="mt-1 text-[13px] text-foreground">
            In escrow: {money(open.currency, open.escrow.amount)} ({open.escrow.status.replace(/_/g, " ")})
          </p>
        ) : null}

        <table className="mt-5 w-full text-[14px]">
          <thead>
            <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
              <th className="py-2 font-medium">Product</th>
              <th className="py-2 text-right font-medium">Quantity</th>
              <th className="py-2 text-right font-medium">Each</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {(open.lines ?? []).map((l, index) => (
              <tr key={index} className="border-b border-border">
                <td className="py-2 pr-2">
                  {l.productName}
                  {l.packSize != null ? (
                    <span className="block text-[12px] text-muted-foreground">
                      {l.packUnit ?? "Pack"} of {qty(l.packSize)}
                    </span>
                  ) : null}
                </td>
                <td className="py-2 text-right tabular-nums">{qty(l.quantity)}</td>
                <td className="py-2 text-right tabular-nums">{money(open.currency, l.unitPrice)}</td>
                <td className="py-2 text-right tabular-nums">{money(open.currency, l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-right text-[15px] font-semibold tabular-nums">{money(open.currency, open.total)}</p>

        {open.orderState === "placed" && canAnswer ? (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void decide("confirm")}>
                Confirm this order
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void decide("decline")}>
                Decline
              </Button>
            </div>
            <p className="mt-3 text-[13px] leading-snug text-muted-foreground">
              Confirming tells the supplier the order is yours. It does not add stock. After you confirm you can make
              your own purchase order from it here.
            </p>
          </>
        ) : null}

        {open.deliveryState !== "none" && open.orderState !== "cancelled" && canAnswer &&
        (open.lines ?? []).every((l) => l.receivedQty == null) ? (
          <div className="mt-6 border-t border-border pt-4">
            <p className="text-[14px] font-medium text-foreground">What arrived?</p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
              Enter what you counted. Anything short is reported to the supplier. This does not add stock here; receive
              the delivery the way you receive any delivery.
            </p>
            <ul className="mt-3 space-y-2">
              {(open.lines ?? []).map((l) => (
                <li key={l.lineNo} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="min-w-0">
                    {l.productName} <span className="text-muted-foreground">(sent {qty(l.quantity)})</span>
                  </span>
                  <input
                    className="h-11 w-24 border border-foreground/15 bg-background px-2 text-right text-[14px] tabular-nums sm:h-9"
                    inputMode="decimal"
                    aria-label={`Quantity of ${l.productName} that arrived`}
                    value={arrived[l.lineNo] ?? qty(l.quantity)}
                    onChange={(e) => setArrived((a) => ({ ...a, [l.lineNo]: e.target.value }))}
                  />
                </li>
              ))}
            </ul>
            <Button type="button" className="mt-3" disabled={busy} onClick={() => void sayWhatArrived()}>
              Save what arrived
            </Button>
          </div>
        ) : null}

        {madePo || open.hasPurchaseOrder ? (
          <p className="mt-5 text-[14px] text-foreground">
            {madePo ? `Purchase order ${madePo} is in your Buying pages as a draft.` : "You have made a purchase order for this."}
          </p>
        ) : null}

        {needsPurchaseOrder && canAnswer && matches ? (
          <div className="mt-6 border-t border-border pt-4">
            <p className="text-[14px] font-medium text-foreground">Make your purchase order</p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
              Each line needs one of your own products. Lines with a barcode you already stock are matched for you.
            </p>
            <ul className="mt-3 space-y-3">
              {matches.map((m) => {
                const mine = picked[m.lineNo] ?? (m.itemId ? { itemId: m.itemId, name: m.itemName ?? "" } : null);
                return (
                  <li key={m.lineNo} className="text-[13px]">
                    <span className="font-medium">{m.productName}</span>
                    {mine ? (
                      <span className="text-muted-foreground">
                        {" "}
                        → {mine.name}{" "}
                        <button
                          type="button"
                          className="font-medium text-foreground underline underline-offset-4"
                          onClick={() => setPicked((p) => ({ ...p, [m.lineNo]: { itemId: "", name: "" } }))}
                        >
                          Change
                        </button>
                      </span>
                    ) : null}
                    {!mine || mine.itemId === "" ? (
                      <ProductPicker onPick={(p) => setPicked((prev) => ({ ...prev, [m.lineNo]: p }))} />
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <Button
              type="button"
              className="mt-4"
              disabled={
                busy ||
                matches.some((m) => {
                  const p = picked[m.lineNo];
                  return p ? p.itemId === "" : !m.itemId;
                })
              }
              onClick={() => void makePurchaseOrder()}
            >
              Make the purchase order
            </Button>
          </div>
        ) : null}

        {open.events && open.events.length > 0 ? (
          <ol className="mt-6 space-y-1 text-[13px] text-muted-foreground">
            {open.events.map((e) => (
              <li key={e.eventNo}>
                {e.eventNo}. {EVENT_LABEL[e.kind] ?? e.kind} · {when(e.createdAt)}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Orders from suppliers</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Orders a supplier you are connected to has sent you to confirm.
      </p>
      {failed ? (
        <p className="mt-6 text-[14px] text-foreground">
          Could not load the orders.{" "}
          <button type="button" className="font-medium underline underline-offset-4" onClick={() => load()}>
            Try again
          </button>
        </p>
      ) : orders == null ? (
        <p className="mt-6 text-[14px] text-muted-foreground">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-[14px] text-muted-foreground">No supplier has sent you an order.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {orders.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-foreground/[0.03]"
                onClick={() => void openOrder(o.id)}
              >
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium">
                    {o.supplierName} · {o.orderCode}
                  </span>
                  <span className="block text-[12px] text-muted-foreground">
                    {ORDER_LABEL[o.orderState] ?? o.orderState} · {when(o.createdAt)}
                  </span>
                </span>
                <span className="shrink-0 text-[14px] tabular-nums">{money(o.currency, o.total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
