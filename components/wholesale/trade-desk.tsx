"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  answerSalesOrder,
  fetchSupplierStanding,
  cancelSalesOrder,
  decideSalesOrderAccount,
  dispatchSalesOrder,
  fetchConnectedShops,
  fetchSalesOrder,
  fetchSalesOrders,
  fetchSentTradeOrder,
  resolveTradeOrderDispute,
  sendSalesOrderToShop,
  type ConnectedShop,
  type SalesOrder,
  type TradeOrder,
} from "@/lib/api";
import { SalesInvoicesPanel } from "@/components/wholesale/sales-invoices-panel";
import { TradeAccountsPanel } from "@/components/wholesale/trade-accounts-panel";
import { TradeFiguresPanel } from "@/components/wholesale/trade-figures-panel";
import { OrderAppeal } from "@/components/wholesale/order-appeal";
import { CounterOrdersSetting } from "@/components/wholesale/counter-orders-setting";
import { useDashboard } from "@/components/dashboard-provider";
import { hasPermission, Permission } from "@/lib/permissions";
import { tradeOrderStatusLabel } from "@/lib/web-cart";

const FILTERS: { value: string; label: string }[] = [
  { value: "placed", label: "To answer" },
  { value: "accepted", label: "Accepted" },
  { value: "part_accepted", label: "Part accepted" },
  { value: "dispatched", label: "Dispatched" },
  { value: "", label: "All" },
];

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

/** The supplier's trade desk: orders buyers sent from the shop, to accept, dispatch or cancel. */
export function TradeDesk() {
  const [filter, setFilter] = useState("placed");
  const [appealsOn, setAppealsOn] = useState(false);
  useEffect(() => {
    fetchSupplierStanding(90)
      .then((standing) => setAppealsOn(standing.enabled))
      .catch(() => setAppealsOn(false));
  }, []);
  const [orders, setOrders] = useState<SalesOrder[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<SalesOrder | null>(null);
  const [supply, setSupply] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"orders" | "invoices" | "accounts" | "figures">("orders");
  const [shops, setShops] = useState<ConnectedShop[]>([]);
  const [shopId, setShopId] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [shared, setShared] = useState<TradeOrder | null>(null);
  const [accountLimit, setAccountLimit] = useState("");
  const [accountDays, setAccountDays] = useState("");
  const [accountDiscount, setAccountDiscount] = useState("");
  const [accountSaved, setAccountSaved] = useState(false);

  const saveAccount = async () => {
    if (!open) return;
    const num = (raw: string) => (raw.trim() === "" ? null : Number(raw));
    const creditLimit = num(accountLimit);
    const termsDays = num(accountDays);
    const discountPercent = num(accountDiscount);
    if (
      (creditLimit != null && !(creditLimit >= 0)) ||
      (termsDays != null && !(Number.isInteger(termsDays) && termsDays >= 0 && termsDays <= 365)) ||
      (discountPercent != null && !(discountPercent >= 0 && discountPercent <= 90))
    ) {
      toast.error("Check the limit, the days to pay (0 to 365) and the discount (0 to 90)");
      return;
    }
    setBusy(true);
    try {
      await decideSalesOrderAccount(open.id, { status: "approved", creditLimit, termsDays, discountPercent });
      setAccountSaved(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the account");
    } finally {
      setBusy(false);
    }
  };

  const openOrderId = open?.id ?? null;
  useEffect(() => {
    setShared(null);
    if (!openOrderId) return;
    let alive = true;
    // What the connected shop has said about this order, if it was sent to one.
    void fetchSentTradeOrder(openOrderId).then((t) => {
      if (alive) setShared(t);
    });
    return () => {
      alive = false;
    };
  }, [openOrderId, sentTo]);

  const resolveDispute = async () => {
    if (!open) return;
    setBusy(true);
    try {
      setShared(await resolveTradeOrderDispute(open.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not mark the shortage as settled");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let alive = true;
    // Optional: with no connected shops the "send to a shop" row simply does not show.
    fetchConnectedShops()
      .then((rows) => {
        if (alive) setShops(rows);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const sendToShop = async () => {
    if (!open || !shopId) return;
    setBusy(true);
    try {
      await sendSalesOrderToShop(open.id, shopId);
      setSentTo(shops.find((s) => s.businessId === shopId)?.name ?? "the shop");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the order to that shop");
    } finally {
      setBusy(false);
    }
  };
  const { me } = useDashboard();
  const canSeeAccounts = hasPermission(me?.permissions, Permission.CreditsCustomersRead);
  const canDecideAccounts = hasPermission(me?.permissions, Permission.CreditsCustomersWrite);

  const load = useCallback(() => {
    let alive = true;
    setFailed(false);
    fetchSalesOrders(filter || undefined)
      .then((rows) => {
        if (alive) setOrders(rows);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [filter]);

  useEffect(() => {
    setOrders(null);
    return load();
  }, [load]);

  const openOrder = async (id: string) => {
    try {
      const order = await fetchSalesOrder(id);
      setSentTo(null);
      setShopId("");
      setAccountSaved(false);
      setAccountLimit("");
      setAccountDays("");
      setAccountDiscount("");
      setOpen(order);
      // Start from "supply everything": the common answer is one tap.
      setSupply(Object.fromEntries((order.lines ?? []).map((l) => [l.id, qty(l.quantity)])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the order");
    }
  };

  const act = async (run: () => Promise<SalesOrder>, done: string) => {
    setBusy(true);
    try {
      setOpen(await run());
      toast.success(done);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not go through");
    } finally {
      setBusy(false);
    }
  };

  const sendAnswer = () => {
    if (!open?.lines) return;
    const lines = open.lines.map((l) => ({ lineId: l.id, acceptedQty: Number(supply[l.id] ?? "0") }));
    if (lines.some((l) => !Number.isFinite(l.acceptedQty) || l.acceptedQty < 0)) {
      toast.error("Enter a quantity for every line. Use 0 for what you cannot supply.");
      return;
    }
    void act(() => answerSalesOrder(open.id, lines), "Answer saved");
  };

  const inputClass = "h-11 w-24 border border-foreground/15 bg-background px-2 text-right text-[14px] tabular-nums sm:h-9";

  if (open) {
    const lines = open.lines ?? [];
    const placed = open.status === "placed";
    const holdsStock = open.status === "accepted" || open.status === "part_accepted";
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button type="button" className="text-[13px] font-medium underline underline-offset-4" onClick={() => setOpen(null)}>
          Back to trade orders
        </button>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">
          Order {open.code} · {tradeOrderStatusLabel(open.status)}
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {open.buyerBusinessName ? `${open.buyerBusinessName} · ` : ""}
          {open.buyerName} · {open.buyerPhone} · {when(open.createdAt)}
        </p>
        <p className="mt-1 text-[13px] text-foreground">
          {open.buyerVerified
            ? `Ordered on the marketplace by a signed-in member of staff of ${open.buyerBusinessName ?? "that shop"}. `
            : ""}
          {open.paymentTerms === "credit"
            ? open.buyerVerified
              ? "On account."
              : "On account: this number has an approved account with you. The number is not verified."
            : "Pays up front: no approved account."}
          {open.overCreditLimit ? " This order takes the buyer over their credit limit." : ""}
        </p>
        {open.buyerVerified && canDecideAccounts ? (
          <div className="mt-3 max-w-md border border-border p-3 text-[13px]">
            <p className="font-medium text-foreground">Account for this shop</p>
            {accountSaved ? (
              <p className="mt-1 text-muted-foreground">Saved. It applies to this shop&apos;s next orders.</p>
            ) : (
              <div className="mt-2 grid gap-2">
                <label>
                  Credit limit (optional)
                  <input className={`${inputClass} mt-1 w-full text-left`} inputMode="decimal" value={accountLimit} onChange={(e) => setAccountLimit(e.target.value)} />
                </label>
                <label>
                  Days to pay (optional)
                  <input className={`${inputClass} mt-1 w-full text-left`} inputMode="numeric" value={accountDays} onChange={(e) => setAccountDays(e.target.value)} />
                </label>
                <label>
                  Trade discount, percent (optional)
                  <input className={`${inputClass} mt-1 w-full text-left`} inputMode="decimal" value={accountDiscount} onChange={(e) => setAccountDiscount(e.target.value)} />
                </label>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void saveAccount()}>
                  Approve the account
                </Button>
              </div>
            )}
          </div>
        ) : null}
        {open.notes ? <p className="mt-2 text-[13px] text-foreground">Note: {open.notes}</p> : null}

        <table className="mt-5 w-full text-[14px]">
          <thead>
            <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
              <th className="py-2 font-medium">Product</th>
              <th className="py-2 text-right font-medium">Asked</th>
              <th className="py-2 text-right font-medium">{placed ? "You will supply" : "Accepted"}</th>
              <th className="py-2 text-right font-medium">Each</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-border">
                <td className="py-2 pr-2">{l.itemName}</td>
                <td className="py-2 text-right tabular-nums">{qty(l.quantity)}</td>
                <td className="py-2 text-right tabular-nums">
                  {placed ? (
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      aria-label={`Quantity of ${l.itemName} you will supply`}
                      value={supply[l.id] ?? ""}
                      onChange={(e) => setSupply((s) => ({ ...s, [l.id]: e.target.value }))}
                    />
                  ) : l.acceptedQty != null ? (
                    qty(l.acceptedQty)
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">{money(open.currency, l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-right text-[15px] font-semibold tabular-nums">
          {placed ? "Asked for" : "Accepted"}: {money(open.currency, open.total)}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {placed ? (
            <Button type="button" disabled={busy} onClick={sendAnswer}>
              Save answer
            </Button>
          ) : null}
          {holdsStock ? (
            <Button type="button" disabled={busy} onClick={() => void act(() => dispatchSalesOrder(open.id), "Marked as dispatched")}>
              Mark as dispatched
            </Button>
          ) : null}
          {placed || holdsStock ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => void act(() => cancelSalesOrder(open.id), "Order cancelled")}>
              Cancel order
            </Button>
          ) : null}
        </div>
        {appealsOn && open.status !== "placed" ? <OrderAppeal key={open.id} orderId={open.id} /> : null}
        {shared ? (
          <div className="mt-6 border-t border-border pt-4 text-[13px]">
            <p className="font-medium text-foreground">
              With the shop: {shared.orderState.replace(/_/g, " ")}
              {shared.hasPurchaseOrder ? " · they have made a purchase order" : ""}
              {shared.escrow ? ` · in escrow ${money(shared.currency, shared.escrow.amount)} (${shared.escrow.status.replace(/_/g, " ")})` : ""}
            </p>
            {(shared.lines ?? []).some((l) => l.receivedQty != null) ? (
              <ul className="mt-1 text-muted-foreground">
                {(shared.lines ?? []).map((l) => (
                  <li key={l.lineNo}>
                    {l.productName}: sent {qty(l.quantity)}, they counted {l.receivedQty != null ? qty(l.receivedQty) : "—"}
                  </li>
                ))}
              </ul>
            ) : null}
            {shared.orderState === "disputed" ? (
              <div className="mt-2">
                <p className="text-muted-foreground">
                  The shop reported a shortage. Take the difference off the invoice with a credit note, then mark it settled.
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-2" disabled={busy} onClick={() => void resolveDispute()}>
                  Mark the shortage as settled
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        {holdsStock && shops.length > 0 && !shared ? (
          <div className="mt-6 border-t border-border pt-4">
            <p className="text-[13px] font-medium text-foreground">Is this buyer one of your connected shops?</p>
            {sentTo ? (
              <p className="mt-1 text-[13px] text-muted-foreground">Sent to {sentTo}. They can confirm it in their Buying pages.</p>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  className="h-11 min-w-[14rem] border border-foreground/15 bg-background px-2 text-[14px] sm:h-9"
                  aria-label="Connected shop"
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                >
                  <option value="">Choose a shop</option>
                  {shops.map((s) => (
                    <option key={s.businessId} value={s.businessId}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" disabled={busy || !shopId} onClick={() => void sendToShop()}>
                  Send the order to this shop
                </Button>
              </div>
            )}
            <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
              The shop sees the products, quantities and prices you accepted. It does not see the buyer&apos;s name or
              phone number.
            </p>
          </div>
        ) : null}
        {placed ? (
          <p className="mt-3 text-[13px] leading-snug text-muted-foreground">
            Stock leaves your shelf when you save. Enter 0 for a line you cannot supply. Cancelling before dispatch puts
            the stock back. Dispatching raises the invoice for what you accepted.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Trade orders</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Orders buyers sent from your shop. Nothing is taken from stock until you accept.
      </p>
      {canSeeAccounts ? (
        <div className="mt-4 flex gap-4 border-b border-border text-[14px]">
          {(["orders", "invoices", "accounts", "figures"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              className={`-mb-px min-h-11 border-b-2 px-1 font-medium sm:min-h-9 ${
                view === v ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
              }`}
              onClick={() => setView(v)}
            >
              {v === "orders" ? "Orders" : v === "invoices" ? "Invoices and money owed" : v === "accounts" ? "Buyer accounts" : "Figures"}
            </button>
          ))}
        </div>
      ) : null}
      {view === "accounts" ? <TradeAccountsPanel canDecide={canDecideAccounts} /> : null}
      {view === "invoices" ? <SalesInvoicesPanel canRecord={canDecideAccounts} /> : null}
      {view === "figures" ? <TradeFiguresPanel /> : null}
      {view === "orders" ? <CounterOrdersSetting /> : null}
      <div className={view !== "orders" ? "hidden" : "mt-4 flex flex-wrap gap-1.5"}>
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            aria-pressed={filter === f.value}
            className={`h-11 border px-3 text-[13px] font-medium sm:h-9 ${
              filter === f.value ? "border-foreground bg-foreground text-background" : "border-foreground/15 text-foreground"
            }`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {view !== "orders" ? null : failed ? (
        <p className="mt-6 text-[14px] text-foreground">
          Could not load trade orders.{" "}
          <button type="button" className="font-medium underline underline-offset-4" onClick={() => load()}>
            Try again
          </button>
        </p>
      ) : orders == null ? (
        <p className="mt-6 text-[14px] text-muted-foreground">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-[14px] text-muted-foreground">No orders here.</p>
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
                    {o.buyerBusinessName || o.buyerName} · {o.code}
                  </span>
                  <span className="block text-[12px] text-muted-foreground">
                    {tradeOrderStatusLabel(o.status)} · {when(o.createdAt)}
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
