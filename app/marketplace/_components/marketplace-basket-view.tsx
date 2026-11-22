"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { slugDerivedShopUrl } from "@/lib/config";
import {
  BASKET_CHANGED_EVENT,
  fetchBuyerShops,
  fetchMyStandingOrders,
  readBasket,
  sendBuyerCode,
  setBasketLine,
  signInBuyer,
  signOutBuyer,
  startStandingOrder,
  stopMyStandingOrder,
  submitBasket,
  writeBasket,
  type BasketLine,
  type BasketResult,
  type BuyerShop,
  type BuyerStandingOrder,
} from "@/lib/marketplace-basket";

const inputClass = "h-11 w-full border border-black/15 bg-white px-2.5 text-sm sm:h-10";
const buttonClass =
  "inline-flex h-11 items-center justify-center border border-black bg-black px-4 text-sm font-medium text-white disabled:opacity-50 sm:h-10";
const quietButtonClass =
  "inline-flex h-11 items-center justify-center border border-black/20 px-4 text-sm font-medium disabled:opacity-50 sm:h-10";

/** The marketplace basket: what is in it, who is ordering and for which shop, and what happened. */
export function MarketplaceBasketView() {
  const [lines, setLines] = useState<BasketLine[]>([]);
  const [shops, setShops] = useState<BuyerShop[] | null>(null);
  const [checked, setChecked] = useState(false);
  const [shopId, setShopId] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BasketResult[] | null>(null);
  // What was just sent, per supplier, so it can be repeated as a standing order.
  const [sent, setSent] = useState<Record<string, { productId: string; quantity: number }[]>>({});
  const [repeatDays, setRepeatDays] = useState("7");
  const [repeating, setRepeating] = useState<Record<string, boolean>>({});
  const [standing, setStanding] = useState<BuyerStandingOrder[]>([]);

  useEffect(() => {
    if (!shopId) {
      setStanding([]);
      return;
    }
    let alive = true;
    void fetchMyStandingOrders(shopId).then((rows) => {
      if (alive) setStanding(rows);
    });
    return () => {
      alive = false;
    };
  }, [shopId, repeating]);

  const repeat = (supplierId: string) =>
    run(async () => {
      const days = Math.floor(Number(repeatDays));
      if (!(days >= 1 && days <= 90)) throw new Error("Repeat every 1 to 90 days");
      await startStandingOrder(shopId, name, supplierId, days, sent[supplierId] ?? []);
      setRepeating((r) => ({ ...r, [supplierId]: true }));
    });

  const stopStanding = (id: string) =>
    run(async () => {
      await stopMyStandingOrder(shopId, id);
      setStanding((rows) => rows.filter((o) => o.id !== id));
    });

  useEffect(() => {
    const sync = () => setLines(readBasket());
    sync();
    window.addEventListener(BASKET_CHANGED_EVENT, sync);
    fetchBuyerShops()
      .then((found) => setShops(found))
      .catch(() => setShops(null))
      .finally(() => setChecked(true));
    return () => window.removeEventListener(BASKET_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (shops && shops.length === 1) setShopId(shops[0].businessId);
  }, [shops]);

  const bySupplier = useMemo(() => {
    const groups = new Map<string, { name: string; lines: BasketLine[] }>();
    for (const line of lines) {
      const group = groups.get(line.supplierId) ?? { name: line.supplierName, lines: [] };
      group.lines.push(line);
      groups.set(line.supplierId, group);
    }
    return [...groups.entries()];
  }, [lines]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      if (!(await sendBuyerCode(phone))) throw new Error("We could not text that number. Check it and try again.");
      setCodeSent(true);
    });

  const signIn = () =>
    run(async () => {
      setShops(await signInBuyer(phone, code));
      setCode("");
      setCodeSent(false);
    });

  const send = () =>
    run(async () => {
      if (!shopId) throw new Error("Choose the shop you are ordering for");
      if (!name.trim()) throw new Error("Enter your name");
      const outcome = await submitBasket(shopId, name, notes, lines);
      const bySupplierSent: Record<string, { productId: string; quantity: number }[]> = {};
      for (const line of lines) {
        (bySupplierSent[line.supplierId] ??= []).push({ productId: line.productId, quantity: line.quantity });
      }
      setSent(bySupplierSent);
      setRepeating({});
      setResults(outcome);
      // What was placed leaves the basket; what was not stays so it can be tried again.
      const placed = new Set(outcome.filter((r) => r.placed).map((r) => r.supplierId));
      writeBasket(lines.filter((l) => !placed.has(l.supplierId)));
    });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6">
      <h1 className="text-xl font-semibold tracking-tight">Your basket</h1>
      <p className="mt-1 text-sm opacity-70">
        Each supplier gets its own order and confirms what it can supply. You pay nothing now.
      </p>

      {results ? (
        <section className="mt-5 border border-black/10 p-3 text-sm">
          <p className="font-medium">What happened</p>
          <ul className="mt-2 space-y-2">
            {results.map((r) => (
              <li key={r.supplierId}>
                <span className="font-medium">{r.supplierName ?? "Supplier"}:</span>{" "}
                {r.placed ? (
                  <>
                    order {r.orderCode} sent
                    {r.total != null ? `, ${r.currency ?? ""} ${r.total.toLocaleString()}` : ""}.{" "}
                    {r.shopSlug && r.orderId ? (
                      <a
                        className="font-medium underline underline-offset-4"
                        href={`${slugDerivedShopUrl(r.shopSlug)}/shop/trade-order/${encodeURIComponent(r.orderId)}`}
                      >
                        Follow this order
                      </a>
                    ) : null}
                    {r.message ? <span className="block opacity-70">{r.message}</span> : null}
                    {repeating[r.supplierId] ? (
                      <span className="block opacity-70">This order will be placed again every {repeatDays} days.</span>
                    ) : (
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        Repeat every
                        <input
                          className="h-9 w-14 border border-black/15 bg-white px-2 text-right tabular-nums"
                          inputMode="numeric"
                          aria-label="Days between orders"
                          value={repeatDays}
                          onChange={(e) => setRepeatDays(e.target.value)}
                        />
                        days
                        <button type="button" className={quietButtonClass} disabled={busy} onClick={() => void repeat(r.supplierId)}>
                          Set up
                        </button>
                      </span>
                    )}
                  </>
                ) : (
                  <span>not sent. {r.message}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {standing.length > 0 ? (
        <section className="mt-5 border border-black/10 p-3 text-sm">
          <p className="font-medium">Your standing orders</p>
          <ul className="mt-2 space-y-2">
            {standing.map((o) => (
              <li key={o.id} className="flex flex-wrap items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block">
                    {o.supplierName ?? "Supplier"} · every {o.everyDays} days · next {o.nextRunOn}
                  </span>
                  <span className="block text-xs opacity-70">
                    {o.lines.map((l) => `${l.quantity} × ${l.itemName}`).join(", ")}
                    {o.lastResult ? ` · ${o.lastResult}` : ""}
                  </span>
                </span>
                <button type="button" className={quietButtonClass} disabled={busy} onClick={() => void stopStanding(o.id)}>
                  Stop
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lines.length === 0 ? (
        <p className="mt-6 text-sm">
          {results ? "Nothing left in your basket." : "Your basket is empty."}{" "}
          <Link href="/marketplace" className="font-medium underline underline-offset-4">
            Find suppliers
          </Link>
        </p>
      ) : (
        <>
          {bySupplier.map(([supplierId, group]) => (
            <section key={supplierId} className="mt-5">
              <h2 className="text-sm font-semibold">{group.name}</h2>
              <ul className="mt-1 divide-y divide-black/10 border-y border-black/10">
                {group.lines.map((line) => (
                  <li key={line.productId} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate">{line.name}</span>
                      <span className="block text-xs opacity-70">
                        {line.unitPrice != null
                          ? `${line.currency ?? ""} ${line.unitPrice.toLocaleString()} each on the price list`
                          : "Price on request"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <input
                        className="h-11 w-20 border border-black/15 bg-white px-2 text-right tabular-nums sm:h-9"
                        inputMode="numeric"
                        aria-label={`Quantity of ${line.name}`}
                        value={line.quantity}
                        onChange={(e) =>
                          setLines(setBasketLine({ ...line, quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))
                        }
                      />
                      <button
                        type="button"
                        className="min-h-11 text-xs font-medium underline underline-offset-4 sm:min-h-9"
                        onClick={() => setLines(setBasketLine({ ...line, quantity: 0 }))}
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="mt-2 text-xs opacity-70">
            The shop&apos;s own price, stock and minimum order apply when the order is placed.
          </p>

          <section className="mt-6 border-t border-black/10 pt-4">
            {!checked ? (
              <p className="text-sm opacity-70">Checking your sign-in…</p>
            ) : shops == null ? (
              <div className="grid max-w-sm gap-2">
                <p className="text-sm font-medium">Sign in with your phone number</p>
                <p className="text-xs opacity-70">
                  Use the number on your staff account at your shop. We text you a code.
                </p>
                <input className={inputClass} inputMode="tel" autoComplete="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                {codeSent ? (
                  <>
                    <input className={inputClass} inputMode="numeric" autoComplete="one-time-code" placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
                    <button type="button" className={buttonClass} disabled={busy} onClick={() => void signIn()}>
                      {busy ? "Checking…" : "Sign in"}
                    </button>
                  </>
                ) : (
                  <button type="button" className={buttonClass} disabled={busy} onClick={() => void sendCode()}>
                    {busy ? "Sending…" : "Text me a code"}
                  </button>
                )}
              </div>
            ) : shops.length === 0 ? (
              <div className="text-sm">
                <p className="font-medium">This number is not on a staff account at any shop.</p>
                <p className="mt-1 opacity-70">
                  Ask your shop&apos;s owner to add your phone number to your staff account, then sign in again. You can
                  still order from each supplier&apos;s own shop.
                </p>
                <button type="button" className={`${quietButtonClass} mt-3`} onClick={() => void signOutBuyer().then(() => setShops(null))}>
                  Use another number
                </button>
              </div>
            ) : (
              <div className="grid max-w-sm gap-2">
                <label className="text-sm">
                  Ordering for
                  <select className={`${inputClass} mt-1`} value={shopId} onChange={(e) => setShopId(e.target.value)}>
                    {shops.length > 1 ? <option value="">Choose a shop</option> : null}
                    {shops.map((s) => (
                      <option key={s.businessId} value={s.businessId}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <input className={inputClass} autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                <input className={inputClass} placeholder="Note for the suppliers (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <button type="button" className={buttonClass} disabled={busy} onClick={() => void send()}>
                  {busy ? "Sending…" : `Send to ${bySupplier.length} supplier${bySupplier.length === 1 ? "" : "s"}`}
                </button>
                <button type="button" className="min-h-11 text-left text-xs font-medium underline underline-offset-4 sm:min-h-9" onClick={() => void signOutBuyer().then(() => setShops(null))}>
                  Sign out
                </button>
              </div>
            )}
            {error ? (
              <p role="alert" className="mt-3 text-sm font-medium">
                {error}
              </p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
