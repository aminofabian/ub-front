"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
import { SupplyMessagesPanel } from "@/components/wholesale/supply-messages-panel";
import { SupplyRestockPanel } from "@/components/wholesale/supply-restock-panel";
import {
  SupplierHeading,
  SupplierNav,
  type SupplierPlace,
} from "@/components/wholesale/supplier-nav";
import {
  inSupplierStage,
  supplierAnswerAction,
  supplierOrderStatus,
  supplierOrderSteps,
  supplierTurnLabel,
  SUPPLIER_ORDER_STAGES,
  type SupplierOrderStage,
} from "@/lib/supplier-order-status";
import { SupplierRoute } from "@/components/wholesale/supplier-route";
import { APP_ROUTES } from "@/lib/config";
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
  shops: { title: "Shops you supply", purpose: "The shops that buy from you through their own purchasing: what to restock in each, and what you and they have said." },
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
  const [moneyView, setMoneyView] = useState<"invoices" | "accounts" | "figures">("invoices");
  const [shopsView, setShopsView] = useState<"restock" | "messages" | "more">("restock");
  // The place is the address: the side menu, the line of places on a phone, a reload and a shared link all
  // land on the same one.
  const router = useRouter();
  const searchParams = useSearchParams();
  const asked = searchParams.get("view");
  const view: SupplierPlace = asked === "orders" || asked === "money" || asked === "shops" ? asked : "today";
  const setView = (next: SupplierPlace) => {
    router.push(next === "today" ? APP_ROUTES.storefrontTradeOrders : `${APP_ROUTES.storefrontTradeOrders}?view=${next}`, {
      scroll: false,
    });
  };
  // Choosing a place from the menu while an order is open leaves the order for that place.
  useEffect(() => {
    setOpen(null);
  }, [view]);
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
    const sideHeading = "text-[13px] font-semibold text-foreground";
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <button type="button" className="min-h-11 text-[13px] font-medium underline underline-offset-4 sm:min-h-0" onClick={() => setOpen(null)}>
          Back to orders
        </button>

        {/* The order in one line: what it is, where it stands, what it is worth. */}
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <div className="min-w-0">
            <h1 className="font-serif text-[1.7rem] leading-tight tracking-tight text-foreground">
              Order <span className="font-mono text-[1.05rem] tracking-normal">{open.code}</span>
            </h1>
            <p className="mt-1 text-[14px] font-medium text-foreground">
              {status.label}
              {supplierTurnLabel(status.turn) ? `. ${supplierTurnLabel(status.turn)}.` : ""}
            </p>
          </div>
          <p className="text-right">
            <span className="block text-[12px] text-muted-foreground">{placed ? "Asked for" : "Accepted"}</span>
            <span className="block font-serif text-[1.7rem] leading-tight tabular-nums text-foreground">
              {money(open.currency, open.total)}
            </span>
          </p>
        </div>

        {steps.length > 0 ? (
          <ol aria-label="Where this order is" className="mt-4 grid grid-cols-4 gap-2">
            {steps.map((step) => (
              <li
                key={step.label}
                aria-current={step.state === "now" ? "step" : undefined}
                className={`border-t-2 pt-2 text-[13px] ${
                  step.state === "done"
                    ? "border-[color:var(--kiosk-gold,#1D4B3B)] text-foreground"
                    : step.state === "now"
                      ? "border-foreground text-foreground"
                      : "border-border text-muted-foreground"
                }`}
              >
                <span className={step.state === "now" ? "block font-semibold" : "block"}>{step.label}</span>
                <span className="block text-[12px] text-muted-foreground">
                  {step.state === "done" ? "Done" : step.state === "now" ? "Next" : ""}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        {status.next ? <p className="mt-4 max-w-[70ch] text-[14px] leading-relaxed text-foreground">{status.next}</p> : null}

        <div className="mt-6 grid gap-8 border-t border-border pt-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-10">
          <section aria-label="What was ordered" className="min-w-0">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 text-right font-medium">Asked</th>
                  <th className="pb-2 text-right font-medium">{placed ? "You will supply" : "Accepted"}</th>
                  <th className="pb-2 text-right font-medium">Each</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b border-border">
                    <td className="py-2.5 pr-2">{l.itemName}</td>
                    <td className="py-2.5 text-right tabular-nums">{qty(l.quantity)}</td>
                    <td className="py-2.5 text-right tabular-nums">
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
                    <td className="py-2.5 text-right tabular-nums">{money(open.currency, l.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {placed ? (
              <p className="mt-4 max-w-[70ch] text-[13px] leading-snug text-muted-foreground">
                Enter 0 for a line you cannot supply.{" "}
                {answer.kind === "none"
                  ? "Declining takes no stock and tells the buyer you cannot supply this order."
                  : "Accepting takes this stock off your shelf now and tells the buyer what you will supply."}
              </p>
            ) : null}
            {holdsStock ? (
              <p className="mt-4 max-w-[70ch] text-[13px] leading-snug text-muted-foreground">
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
          </section>

          {/* Who is buying and on what terms: read beside the lines, not above them. */}
          <aside aria-label="About this order" className="min-w-0 space-y-5 text-[13px] lg:border-l lg:border-border lg:pl-10">
            <section>
              <h2 className={sideHeading}>Buyer</h2>
              <p className="mt-1 text-foreground">
                {open.buyerBusinessName ? `${open.buyerBusinessName}, ` : ""}
                {open.buyerName}
              </p>
              <p className="tabular-nums text-muted-foreground">{open.buyerPhone}</p>
              <p className="mt-1 text-muted-foreground">Placed {when(open.createdAt)}</p>
              {open.buyerVerified ? (
                <p className="mt-1 text-muted-foreground">
                  Ordered on the marketplace by a signed-in member of staff of {open.buyerBusinessName ?? "that shop"}.
                </p>
              ) : null}
            </section>

            <section>
              <h2 className={sideHeading}>Payment</h2>
              <p className="mt-1 text-foreground">
                {open.paymentTerms === "credit"
                  ? open.buyerVerified
                    ? "On account."
                    : "On account: this number has an approved account with you. The number is not verified."
                  : "Pays up front: no approved account."}
                {open.overCreditLimit ? " This order takes the buyer over their credit limit." : ""}
              </p>
            </section>

            {open.buyerVerified && canDecideAccounts ? (
              <section>
                <h2 className={sideHeading}>Account for this shop</h2>
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
              </section>
            ) : null}

            {open.notes ? (
              <section>
                <h2 className={sideHeading}>Note from the buyer</h2>
                <p className="mt-1 text-foreground">{open.notes}</p>
              </section>
            ) : null}

            {shared ? (
              <section>
                <h2 className={sideHeading}>
                  {shared.orderState === "disputed" ? "The shop reported a shortage. Your turn." : `With the shop: ${shared.orderState.replace(/_/g, " ")}`}
                </h2>
                {shared.hasPurchaseOrder || shared.escrow ? (
                  <p className="mt-1 text-muted-foreground">
                    {shared.hasPurchaseOrder ? "They have made a purchase order. " : ""}
                    {shared.escrow ? `In escrow ${money(shared.currency, shared.escrow.amount)} (${shared.escrow.status.replace(/_/g, " ")}).` : ""}
                  </p>
                ) : null}
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
                      Take the difference off the invoice with a credit note, then mark it settled.
                    </p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" disabled={busy} onClick={() => void resolveDispute()}>
                      Mark the shortage as settled
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {holdsStock && shops.length > 0 && !shared ? (
              <section>
                <h2 className={sideHeading}>Is this buyer one of your connected shops?</h2>
                {sentTo ? (
                  <p className="mt-1 text-muted-foreground">Sent to {sentTo}. They can confirm it in their Buying pages.</p>
                ) : (
                  <div className="mt-2 grid gap-2">
                    <select
                      className="h-11 w-full border border-foreground/15 bg-background px-2 text-[14px] sm:h-9"
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
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    );
  }

  const count = (key: SupplierOrderStage) => (orders ?? []).filter((o) => inSupplierStage(o.status, key)).length;
  const shown = (orders ?? []).filter((o) => inSupplierStage(o.status, stage));
  // Orders that cannot move until the supplier does, the longest-waiting first.
  const waitingOnYou = (orders ?? [])
    .filter((o) => supplierOrderStatus(o.status).turn === "you")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const oldestToAnswer = waitingOnYou.find((o) => inSupplierStage(o.status, "to_answer"));
  const strip: { stage: SupplierOrderStage; label: string; detail: string }[] = [
    {
      stage: "to_answer",
      label: "to answer",
      detail: oldestToAnswer ? `The oldest was placed ${timeAgo(oldestToAnswer.createdAt) || when(oldestToAnswer.createdAt)}` : "No buyer is waiting for an answer",
    },
    {
      stage: "to_dispatch",
      label: "accepted, to dispatch",
      detail: count("to_dispatch") > 0 ? "Stock is held for these until they leave" : "Nothing to pack",
    },
    {
      stage: "dispatched",
      label: "dispatched",
      detail: count("dispatched") > 0 ? "The buyer says what arrived" : "Nothing is on its way",
    },
  ];
  const chip = (active: boolean) =>
    `min-h-11 rounded-[2px] border px-3 text-[13px] font-medium sm:min-h-9 ${
      active
        ? "border-[color:var(--kiosk-gold,#1D4B3B)] bg-[color-mix(in_srgb,var(--kiosk-gold,#1D4B3B)_8%,transparent)] text-foreground"
        : "border-foreground/15 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
    }`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <SupplierHeading title={PLACE_TITLE[view].title} purpose={PLACE_TITLE[view].purpose} />
      <div className="mt-4">
        <SupplierNav current={view} onSelect={setView} waiting={count("to_answer")} />
      </div>

      {view === "today" ? (
        <>
          {/* The day in three figures. Each opens the orders it counts. */}
          <ul aria-label="Where your orders stand" className="mt-5 grid divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {strip.map((cell) => {
              const n = count(cell.stage);
              return (
                <li key={cell.stage}>
                  <button
                    type="button"
                    disabled={orders == null || n === 0}
                    className="flex h-full w-full flex-col items-start gap-1 px-4 py-4 text-left enabled:hover:bg-foreground/[0.03]"
                    onClick={() => {
                      setStage(cell.stage);
                      setView("orders");
                    }}
                  >
                    <span className={`font-serif text-[2.6rem] leading-none tabular-nums ${n > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                      {orders == null ? "–" : n}
                    </span>
                    <span className={`text-[14px] ${n > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {n === 1 ? "order " : "orders "}
                      {cell.label}
                    </span>
                    <span className="text-[12px] text-muted-foreground">{orders == null ? "Loading…" : cell.detail}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {orders != null ? <SupplierRoute orders={orders} /> : null}

          <div className={orders != null && orders.length === 0 ? "hidden" : "mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"}>
            <section aria-label="Waiting on you" className="min-w-0">
              <h2 className="text-[15px] font-semibold text-foreground">Waiting on you</h2>
              {failed ? (
                <p className="mt-3 text-[14px] text-foreground">
                  Could not load trade orders.{" "}
                  <button type="button" className="font-medium underline underline-offset-4" onClick={() => load()}>
                    Try again
                  </button>
                </p>
              ) : orders == null ? (
                <p className="mt-3 text-[14px] text-muted-foreground">Loading…</p>
              ) : waitingOnYou.length === 0 ? (
                <p className="mt-3 max-w-[60ch] text-[14px] text-foreground">
                  <span className="font-semibold">Board clear.</span>{" "}
                  <span className="text-muted-foreground">
                    Every order is answered and on its way. A new one appears here the moment it is placed.
                  </span>
                </p>
              ) : (
                <>
                  <ul className="mt-3 divide-y divide-border border-y border-border">
                    {waitingOnYou.slice(0, 6).map((o) => (
                      <OrderRow key={o.id} order={o} compact onOpen={(id) => void openOrder(id)} />
                    ))}
                  </ul>
                  {waitingOnYou.length > 6 ? (
                    <button
                      type="button"
                      className="mt-3 min-h-11 text-[13px] font-medium underline underline-offset-4 sm:min-h-0"
                      onClick={() => {
                        setStage("all");
                        setView("orders");
                      }}
                    >
                      See all {waitingOnYou.length} in Orders
                    </button>
                  ) : null}
                </>
              )}
            </section>
            <div className="min-w-0 lg:border-l lg:border-border lg:pl-10">
              <SupplierOverviewPanel quietWhenOff />
            </div>
          </div>
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

      {view === "shops" ? (
        <>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {([
              ["restock", "What to restock"],
              ["messages", "Messages"],
              ["more", "Orders, deliveries and payments"],
            ] as const).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={shopsView === key} className={chip(shopsView === key)} onClick={() => setShopsView(key)}>
                {label}
              </button>
            ))}
          </div>
          {shopsView === "restock" ? <SupplyRestockPanel /> : null}
          {shopsView === "messages" ? <SupplyMessagesPanel /> : null}
          {shopsView === "more" ? <SupplierPortalLinks /> : null}
        </>
      ) : null}

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
        <div className="mt-5">
          {/* Column names for the rows below. On a phone each row names its own parts. */}
          <div aria-hidden className={`hidden gap-x-4 border-b border-border py-2 pl-[14px] pr-1 text-[12px] text-muted-foreground md:grid ${ORDER_COLUMNS}`}>
            <span>Buyer</span>
            <span>Order</span>
            <span>Where it stands</span>
            <span>Placed</span>
            <span className="text-right">Total</span>
          </div>
          <ul className="divide-y divide-border border-b border-border max-md:border-t">
            {shown.map((o) => (
              <OrderRow key={o.id} order={o} onOpen={(id) => void openOrder(id)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The columns of an order row on a wide screen: buyer, order number, where it stands, placed, total. */
const ORDER_COLUMNS = "md:grid-cols-[minmax(0,1.5fr)_6.5rem_minmax(0,1.3fr)_10rem_8.5rem]";

/**
 * One order as one row. A row that is waiting on the supplier carries a forest rule down its left edge and
 * says "Your turn" in words, so the eye finds the work without colour being the only sign.
 * `compact` keeps the two-line form at every width, for the short list on Today.
 */
function OrderRow({
  order,
  onOpen,
  compact = false,
}: {
  order: SalesOrder;
  onOpen: (id: string) => void;
  compact?: boolean;
}) {
  const status = supplierOrderStatus(order.status);
  const turn = supplierTurnLabel(status.turn);
  const buyer = order.buyerBusinessName || order.buyerName;
  // The same words as on the order itself; a waiting order says how long it has waited.
  const placedText =
    order.status === "placed" ? timeAgo(order.createdAt) || when(order.createdAt) : when(order.createdAt);
  const edge = status.turn === "you" ? "border-l-[color:var(--kiosk-gold,#1D4B3B)]" : "border-l-transparent";
  return (
    <li>
      <button
        type="button"
        className={`block w-full border-l-2 py-3 pl-3 pr-1 text-left hover:bg-foreground/[0.03] ${edge}`}
        onClick={() => onOpen(order.id)}
      >
        <span className={`flex items-start justify-between gap-4 ${compact ? "" : "md:hidden"}`}>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium text-foreground">{buyer}</span>
            <span className="block text-[12px] text-muted-foreground">
              {status.label}
              {turn ? `. ${turn}` : ""}. Placed {placedText}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-[14px] tabular-nums text-foreground">{money(order.currency, order.total)}</span>
            <span className="block font-mono text-[11px] text-muted-foreground">{order.code}</span>
          </span>
        </span>
        {compact ? null : (
          <span className={`hidden items-baseline gap-x-4 md:grid ${ORDER_COLUMNS}`}>
            <span className="truncate text-[14px] font-medium text-foreground">{buyer}</span>
            <span className="truncate font-mono text-[12px] text-muted-foreground">{order.code}</span>
            <span className="truncate text-[13px] text-foreground">
              {status.label}
              {turn ? <span className="text-muted-foreground">{`. ${turn}`}</span> : null}
            </span>
            <span className="truncate text-[13px] text-muted-foreground">{placedText}</span>
            <span className="text-right text-[14px] tabular-nums text-foreground">{money(order.currency, order.total)}</span>
          </span>
        )}
      </button>
    </li>
  );
}
