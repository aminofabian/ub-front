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
import { SupplierOverviewPanel } from "@/components/wholesale/supplier-overview-panel";
import { SupplierPortalLinks } from "@/components/wholesale/supplier-portal-links";
import { SupplierNav, supplierPlaceFromLocation, type SupplierPlace } from "@/components/wholesale/supplier-nav";
import {
  inSupplierStage,
  supplierAnswerAction,
  supplierOrderStatus,
  supplierOrderSteps,
  supplierTurnLabel,
  SUPPLIER_ORDER_STAGES,
  type SupplierOrderStage,
} from "@/lib/supplier-order-status";
import { timeAgo } from "@/lib/time-ago";
import { useDashboard } from "@/components/dashboard-provider";
import { hasPermission, Permission } from "@/lib/permissions";

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

/** What each place is called and what it is for, shown at the top of it. */
const PLACE_TITLE: Record<SupplierPlace, { title: string; purpose: string }> = {
  today: { title: "Today", purpose: "What is waiting for you, and what to do next." },
  orders: {
    title: "Orders",
    purpose: "Orders buyers placed in your shop. Answer each one, then dispatch what you accepted. Nothing is taken from stock until you accept.",
  },
  money: { title: "Buyers and money", purpose: "Who buys on account, the invoices you have raised and what is still owed." },
  shops: { title: "Shops you supply", purpose: "The shops that buy from you through their own purchasing: their orders, deliveries, messages and payments." },
  page: { title: "Your page", purpose: "" },
};

/** The supplier's trade desk: orders buyers sent from the shop, to accept, dispatch or cancel. */
export function TradeDesk() {
  const [stage, setStage] = useState<SupplierOrderStage | "all">("to_answer");
  const [confirmCancel, setConfirmCancel] = useState(false);
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
  const [view, setViewState] = useState<SupplierPlace>("today");
  const [moneyView, setMoneyView] = useState<"invoices" | "accounts" | "figures">("invoices");
  // Arriving from another supplier page with ?view= opens that place. The address follows the place after that,
  // so a reload or a shared link comes back to the same one.
  useEffect(() => {
    const fromAddress = supplierPlaceFromLocation();
    if (fromAddress && fromAddress !== "page") setViewState(fromAddress);
  }, []);
  const setView = (next: SupplierPlace) => {
    setViewState(next);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("view", next);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // The view still changes; only the address is left as it was.
    }
  };
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
  const canDecideAccounts = hasPermission(me?.permissions, Permission.CreditsCustomersWrite);

  const load = useCallback(() => {
    let alive = true;
    setFailed(false);
    fetchSalesOrders(undefined)
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
      setConfirmCancel(false);
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
    const answer = supplierAnswerAction(
      open.lines.map((l) => ({ asked: Number(l.quantity), supply: Number(supply[l.id] ?? "0") })),
    );
    void act(() => answerSalesOrder(open.id, lines), answer.done);
  };

  const inputClass = "h-11 w-24 border border-foreground/15 bg-background px-2 text-right text-[14px] tabular-nums sm:h-9";

  if (open) {
    const lines = open.lines ?? [];
    const placed = open.status === "placed";
    const holdsStock = open.status === "accepted" || open.status === "part_accepted";
    const status = supplierOrderStatus(open.status);
    const received = (shared?.lines ?? []).some((l) => l.receivedQty != null);
    const steps = supplierOrderSteps(open.status, received);
    const answer = supplierAnswerAction(
      lines.map((l) => ({ asked: Number(l.quantity), supply: Number(supply[l.id] ?? "0") })),
    );
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button type="button" className="text-[13px] font-medium underline underline-offset-4" onClick={() => setOpen(null)}>
          Back to orders
        </button>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">Order {open.code}</h1>
        <p className="mt-1 text-[14px] font-medium text-foreground">
          {status.label}
          {supplierTurnLabel(status.turn) ? `. ${supplierTurnLabel(status.turn)}.` : ""}
        </p>
        {steps.length > 0 ? (
          <ol aria-label="Where this order is" className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-y border-border py-2 text-[13px]">
            {steps.map((step) => (
              <li
                key={step.label}
                aria-current={step.state === "now" ? "step" : undefined}
                className={step.state === "later" ? "text-muted-foreground" : "text-foreground"}
              >
                <span className={step.state === "now" ? "font-semibold" : ""}>{step.label}</span>
                <span className="text-muted-foreground">
                  {step.state === "done" ? ", done" : step.state === "now" ? ", next" : ""}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        {status.next ? <p className="mt-3 max-w-prose text-[14px] leading-relaxed text-foreground">{status.next}</p> : null}
        <p className="mt-3 text-[13px] text-muted-foreground">
          {open.buyerBusinessName ? `${open.buyerBusinessName}, ` : ""}
          {open.buyerName}, {open.buyerPhone}. Placed {when(open.createdAt)}.
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

        {placed ? (
          <p className="mt-4 text-[13px] leading-snug text-muted-foreground">
            Enter 0 for a line you cannot supply.{" "}
            {answer.kind === "none"
              ? "Declining takes no stock and tells the buyer you cannot supply this order."
              : "Accepting takes this stock off your shelf now and tells the buyer what you will supply."}
          </p>
        ) : null}
        {holdsStock ? (
          <p className="mt-4 text-[13px] leading-snug text-muted-foreground">
            Marking it dispatched raises the invoice for what you accepted. After that the order cannot be cancelled here.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {placed ? (
            <Button type="button" disabled={busy} onClick={sendAnswer}>
              {answer.label}
            </Button>
          ) : null}
          {holdsStock ? (
            <Button type="button" disabled={busy} onClick={() => void act(() => dispatchSalesOrder(open.id), "Order dispatched")}>
              Mark as dispatched
            </Button>
          ) : null}
          {(placed || holdsStock) && !confirmCancel ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmCancel(true)}>
              Cancel order
            </Button>
          ) : null}
        </div>
        {(placed || holdsStock) && confirmCancel ? (
          <div className="mt-3 border-y border-border py-3 text-[13px]">
            <p className="text-foreground">
              {holdsStock
                ? "Cancelling puts the accepted stock back on your shelf and tells the buyer the order is off. It cannot be undone."
                : "Cancelling tells the buyer the order is off. No stock was taken. It cannot be undone."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setConfirmCancel(false);
                  void act(() => cancelSalesOrder(open.id), "Order cancelled");
                }}
              >
                Yes, cancel this order
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmCancel(false)}>
                Keep the order
              </Button>
            </div>
          </div>
        ) : null}
        {appealsOn && open.status !== "placed" ? <OrderAppeal key={open.id} orderId={open.id} /> : null}
        {shared ? (
          <div className="mt-6 border-t border-border pt-4 text-[13px]">
            <p className="font-medium text-foreground">
              {shared.orderState === "disputed" ? "The shop reported a shortage. Your turn." : `With the shop: ${shared.orderState.replace(/_/g, " ")}`}
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
      </div>
    );
  }

  const count = (key: SupplierOrderStage) => (orders ?? []).filter((o) => inSupplierStage(o.status, key)).length;
  const shown = (orders ?? []).filter((o) => inSupplierStage(o.status, stage));
  const chip = (active: boolean) =>
    `min-h-11 border px-3 text-[13px] font-medium sm:min-h-9 ${
      active ? "border-foreground bg-foreground text-background" : "border-foreground/15 text-foreground"
    }`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">{PLACE_TITLE[view].title}</h1>
      <p className="mt-1 max-w-prose text-[13px] text-muted-foreground">{PLACE_TITLE[view].purpose}</p>
      <div className="mt-4">
        <SupplierNav current={view} onSelect={setView} waiting={count("to_answer")} />
      </div>

      {view === "today" ? (
        <>
          <ul aria-label="Needs you" className="mt-4 divide-y divide-border border-y border-border">
            {(["to_answer", "to_dispatch"] as const).map((key) => {
              const n = count(key);
              const text =
                key === "to_answer"
                  ? n === 1 ? "1 order to answer" : `${n} orders to answer`
                  : n === 1 ? "1 accepted order to dispatch" : `${n} accepted orders to dispatch`;
              return (
                <li key={key}>
                  <button
                    type="button"
                    disabled={n === 0}
                    className="flex min-h-11 w-full items-center justify-between gap-4 py-3 text-left text-[14px] disabled:text-muted-foreground"
                    onClick={() => {
                      setStage(key);
                      setView("orders");
                    }}
                  >
                    <span className={n > 0 ? "font-medium" : ""}>
                      {orders == null ? "Loading…" : n === 0 ? (key === "to_answer" ? "No orders to answer" : "Nothing to dispatch") : text}
                    </span>
                    {n > 0 ? <span className="shrink-0 underline underline-offset-4">Open</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <SupplierOverviewPanel quietWhenOff />
        </>
      ) : null}

      {view === "money" ? (
        <>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {([
              ["invoices", "Invoices and money owed"],
              ["accounts", "Buyer accounts"],
              ["figures", "Figures"],
            ] as const).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={moneyView === key} className={chip(moneyView === key)} onClick={() => setMoneyView(key)}>
                {label}
              </button>
            ))}
          </div>
          {moneyView === "accounts" ? <TradeAccountsPanel canDecide={canDecideAccounts} /> : null}
          {moneyView === "invoices" ? <SalesInvoicesPanel canRecord={canDecideAccounts} /> : null}
          {moneyView === "figures" ? <TradeFiguresPanel /> : null}
        </>
      ) : null}

      {view === "shops" ? <SupplierPortalLinks /> : null}

      <div className={view !== "orders" ? "hidden" : "mt-4 flex flex-wrap gap-1.5"}>
        {SUPPLIER_ORDER_STAGES.map((f) => (
          <button key={f.stage} type="button" aria-pressed={stage === f.stage} className={chip(stage === f.stage)} onClick={() => setStage(f.stage)}>
            {f.label}
            {f.stage !== "all" && orders != null ? ` (${count(f.stage)})` : ""}
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
      ) : shown.length === 0 ? (
        <p className="mt-6 text-[14px] text-muted-foreground">
          {SUPPLIER_ORDER_STAGES.find((f) => f.stage === stage)?.empty}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {shown.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-foreground/[0.03]"
                onClick={() => void openOrder(o.id)}
              >
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium">
                    {o.buyerBusinessName || o.buyerName}, order {o.code}
                  </span>
                  <span className="block text-[12px] text-muted-foreground">
                    {/* The same words as on the order itself, whose turn it is, and how long a waiting order has waited. */}
                    {supplierOrderStatus(o.status).label}
                    {supplierTurnLabel(supplierOrderStatus(o.status).turn) ? `. ${supplierTurnLabel(supplierOrderStatus(o.status).turn)}` : ""}
                    {". "}
                    {o.status === "placed" ? `Placed ${timeAgo(o.createdAt) || when(o.createdAt)}` : `Placed ${when(o.createdAt)}`}
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
