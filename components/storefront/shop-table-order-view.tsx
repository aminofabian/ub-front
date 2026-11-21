"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatMoney } from "@/lib/money";
import {
  askForPublicTableBill,
  fetchPublicTableMenu,
  fetchPublicTableStatus,
  placePublicTableOrder,
  PublicTableOrderError,
  removePublicTableLine,
  type PublicDish,
  type PublicOrderConfirmation,
  type PublicOrderStatus,
  type PublicStatusLine,
  type PublicTableMenu,
} from "@/lib/public-table-order";

/** The kitchen's stage codes in the diner's words. */
const STAGE_WORDS: Record<string, string> = {
  DRAFT: "Waiting for a waiter to confirm",
  NEW: "In the kitchen",
  PREPARING: "Being made",
  READY: "Ready",
  SERVED: "Served",
  VOIDED: "Cancelled",
};

type Line = {
  key: string;
  dish: PublicDish;
  optionIds: string[];
  optionNames: string[];
  unitPrice: number;
  quantity: number;
  note: string;
};

function newRequestId(): string {
  // Letters, digits and hyphens only, as the server requires; made once per order.
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * What a customer sees after scanning the code on their table. They choose from the menu and
 * send the order; a member of staff confirms it before the kitchen starts. It asks for no name,
 * phone number or payment.
 */
export function ShopTableOrderView({ slug, token }: { slug: string; token: string }) {
  const [menu, setMenu] = useState<PublicTableMenu | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [choosing, setChoosing] = useState<PublicDish | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PublicOrderConfirmation | null>(null);
  const [status, setStatus] = useState<PublicOrderStatus | null>(null);
  const [statusProblem, setStatusProblem] = useState<string | null>(null);
  const [askingBill, setAskingBill] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  // One id per order: tapping Send twice, or retrying after a dropped connection, orders once.
  const requestId = useRef(newRequestId());
  const seq = useRef(0);

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await fetchPublicTableStatus(slug, token));
      setStatusProblem(null);
    } catch {
      setStatusProblem("Could not check your order. Check the connection.");
    }
  }, [slug, token]);

  // The table's order is shared by every phone at it, so the status is read from the server every
  // few seconds rather than remembered on this device. A reload shows the same order.
  useEffect(() => {
    void refreshStatus();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshStatus();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [refreshStatus]);

  useEffect(() => {
    let live = true;
    fetchPublicTableMenu(slug, token)
      .then((m) => {
        if (live) setMenu(m);
      })
      .catch(() => {
        if (live) setLoadFailed(true);
      });
    return () => {
      live = false;
    };
  }, [slug, token]);

  const currency = menu?.currency ?? "KES";
  const money = (n: number) => formatMoney(n, currency);
  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  const byHeading = useMemo(() => {
    const groups = new Map<string, PublicDish[]>();
    for (const dish of menu?.dishes ?? []) {
      const key = dish.heading ?? "";
      groups.set(key, [...(groups.get(key) ?? []), dish]);
    }
    return Array.from(groups.entries());
  }, [menu]);

  function begin(dish: PublicDish) {
    setError(null);
    setChoosing(dish);
    setSelected([]);
    setNote("");
  }

  function toggle(dish: PublicDish, groupId: string, optionId: string) {
    const group = dish.groups.find((g) => g.id === groupId);
    if (!group) return;
    const inGroup = new Set(group.options.map((o) => o.id));
    setSelected((prev) => {
      if (prev.includes(optionId)) return prev.filter((id) => id !== optionId);
      if (group.maxSelect === 1) return [...prev.filter((id) => !inGroup.has(id)), optionId];
      if (prev.filter((id) => inGroup.has(id)).length >= group.maxSelect) return prev;
      return [...prev, optionId];
    });
  }

  function missing(dish: PublicDish): string | null {
    for (const group of dish.groups) {
      const count = group.options.filter((o) => selected.includes(o.id)).length;
      if (count < group.minSelect) return `Choose ${group.name}`;
    }
    return null;
  }

  function add(dish: PublicDish) {
    const optionIds: string[] = [];
    const optionNames: string[] = [];
    let price = dish.price;
    for (const group of dish.groups) {
      for (const option of group.options) {
        if (selected.includes(option.id)) {
          optionIds.push(option.id);
          optionNames.push(option.name);
          price += option.priceDelta;
        }
      }
    }
    seq.current += 1;
    setLines((prev) => [
      ...prev,
      { key: `l${seq.current}`, dish, optionIds, optionNames, unitPrice: price, quantity: 1, note: note.trim() },
    ]);
    setChoosing(null);
  }

  async function send() {
    if (lines.length === 0 || sending) return;
    setSending(true);
    setError(null);
    try {
      const confirmation = await placePublicTableOrder(slug, token, {
        requestId: requestId.current,
        lines: lines.map((l) => ({
          menuItemId: l.dish.id,
          modifierOptionIds: l.optionIds,
          quantity: l.quantity,
          ...(l.note ? { note: l.note } : {}),
        })),
      });
      setPlaced(confirmation);
      setLines([]);
      requestId.current = newRequestId();
      void refreshStatus();
    } catch (e) {
      if (e instanceof PublicTableOrderError && e.status === 404) {
        setError("This table's code no longer works. Please ask a member of staff.");
      } else if (e instanceof PublicTableOrderError && e.status === 429) {
        setError("Too many tries. Wait a moment, then send again.");
      } else {
        setError(e instanceof PublicTableOrderError ? e.message : "Your order was not sent. Check your connection and try again.");
      }
    } finally {
      setSending(false);
    }
  }

  /** "Please bring the bill" — the same flag the floor shows as a table that needs someone. */
  async function askBill() {
    if (askingBill) return;
    setAskingBill(true);
    setStatusProblem(null);
    try {
      setStatus(await askForPublicTableBill(slug, token));
    } catch (e) {
      setStatusProblem(
        e instanceof PublicTableOrderError && e.status === 409
          ? e.message
          : "Could not ask for the bill. Try again, or wave a member of staff over.",
      );
    } finally {
      setAskingBill(false);
    }
  }

  /** Take off a line this phone added, while staff have not sent it to the kitchen. */
  async function removeLine(line: PublicStatusLine) {
    if (removingId) return;
    setRemovingId(line.id);
    setStatusProblem(null);
    try {
      setStatus(await removePublicTableLine(slug, token, line.id));
    } catch (e) {
      setStatusProblem(
        e instanceof PublicTableOrderError && e.status === 409
          ? e.message
          : "Could not remove that line. Try again, or tell a member of staff.",
      );
    } finally {
      setRemovingId(null);
    }
  }

  if (loadFailed) {
    return (
      <main className="mx-auto w-full max-w-xl p-4">
        <p role="alert">The menu could not be loaded. Check your connection and scan the code again.</p>
      </main>
    );
  }
  if (menu === undefined) {
    return (
      <main className="mx-auto w-full max-w-xl p-4">
        <p>Loading the menu…</p>
      </main>
    );
  }
  if (menu === null) {
    return (
      <main className="mx-auto w-full max-w-xl p-4">
        <h1 className="text-xl font-semibold">This code does not work</h1>
        <p className="mt-2">Please ask a member of staff to take your order.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl p-4 pb-48">
      <h1 className="text-xl font-semibold">{menu.shopName}</h1>
      <p className="text-sm opacity-80">{menu.tableName}</p>

      {placed ? (
        <section role="status" className="mt-4 rounded border p-4">
          <h2 className="text-lg font-semibold">Your order has been sent</h2>
          <p className="mt-1">
            Order <span className="font-mono text-2xl font-semibold tabular-nums">{placed.orderNumber}</span> ·{" "}
            {placed.tableName}
          </p>
          <p className="mt-1 text-sm">
            A member of staff will confirm it before the kitchen starts. You pay when you have finished. So far:{" "}
            <span className="font-mono tabular-nums">{money(placed.total)}</span>.
          </p>
          <button type="button" className="mt-3 min-h-11 rounded border px-4 text-sm font-semibold" onClick={() => setPlaced(null)}>
            Order something else
          </button>
        </section>
      ) : null}

      {status && status.orderNumber != null ? (
        <section aria-label="Your order" className="mt-4 rounded border p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">
              Your order · <span className="font-mono tabular-nums">{status.orderNumber}</span>
            </h2>
            <span className="font-mono tabular-nums">{money(status.total)}</span>
          </div>
          <ul className="mt-2 divide-y text-sm">
            {status.lines.map((line, i) => (
              <li key={`${line.name}-${i}`} className={line.stage === "VOIDED" ? "py-1.5 opacity-60 line-through" : "py-1.5"}>
                <div className="flex justify-between gap-2">
                  <span className="min-w-0">
                    <span className="font-mono tabular-nums">{line.quantity} ×</span> {line.name}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums">{money(line.amount)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs opacity-70">
                  <span>{STAGE_WORDS[line.stage] ?? line.stage}</span>
                  {line.removable ? (
                    <button
                      type="button"
                      className="min-h-8 rounded px-1 text-xs underline underline-offset-2 opacity-100 disabled:opacity-50"
                      disabled={removingId === line.id}
                      onClick={() => void removeLine(line)}
                    >
                      {removingId === line.id ? "Removing…" : "Remove"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t pt-2">
            <span className="text-sm">To pay</span>
            <span className="font-mono text-lg font-semibold tabular-nums">{money(status.due)}</span>
          </div>
          {status.billRequested ? (
            <p role="status" className="mt-2 text-sm font-semibold">
              Bill requested — a member of staff is coming.
            </p>
          ) : (
            <button
              type="button"
              className="mt-3 min-h-11 w-full rounded border px-4 text-sm font-semibold disabled:opacity-50"
              disabled={askingBill}
              onClick={() => void askBill()}
            >
              {askingBill ? "Asking…" : "Ask for the bill"}
            </button>
          )}
        </section>
      ) : null}
      {statusProblem ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {statusProblem}
        </p>
      ) : null}

      {menu.dishes.length === 0 ? (
        <p className="mt-4">Nothing can be ordered from the table right now. Please ask a member of staff.</p>
      ) : (
        byHeading.map(([heading, dishes]) => (
          <section key={heading || "menu"} className="mt-5">
            {heading ? <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">{heading}</h2> : null}
            <ul className="mt-1 divide-y">
              {dishes.map((dish) => (
                <li key={dish.id}>
                  <button type="button" className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left" onClick={() => begin(dish)}>
                    {dish.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- the restaurant's own upload at a fixed size
                      <img src={dish.imageUrl} alt="" loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-[2px] object-cover" />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{dish.name}</span>
                      {dish.description ? <span className="block text-sm leading-snug opacity-70">{dish.description}</span> : null}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums">{money(dish.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {choosing ? (
        <div role="dialog" aria-modal="true" aria-label={choosing.name} className="fixed inset-0 z-[2100] flex items-end bg-black/40">
          <div className="max-h-[85dvh] w-full overflow-y-auto rounded-t-lg bg-white p-4 text-black">
            <h2 className="text-lg font-semibold">{choosing.name}</h2>
            {choosing.groups.map((group) => (
              <fieldset key={group.id} className="mt-3">
                <legend className="text-sm font-semibold">
                  {group.name}
                  <span className="font-normal opacity-70">
                    {group.minSelect > 0 ? " · choose one" : group.maxSelect > 1 ? ` · up to ${group.maxSelect}` : " · optional"}
                  </span>
                </legend>
                <div className="mt-1 grid gap-2">
                  {group.options.map((option) => {
                    const on = selected.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role={group.maxSelect === 1 ? "radio" : "checkbox"}
                        aria-checked={on}
                        className={`flex min-h-12 items-center justify-between rounded border px-3 text-left ${on ? "border-black bg-black/5 font-semibold" : ""}`}
                        onClick={() => toggle(choosing, group.id, option.id)}
                      >
                        <span>{option.name}</span>
                        <span className="font-mono text-sm tabular-nums">{option.priceDelta > 0 ? `+ ${money(option.priceDelta)}` : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <label className="mt-3 grid gap-1 text-sm">
              <span className="font-semibold">Anything else? (optional)</span>
              <input className="min-h-11 rounded border px-3" value={note} maxLength={120} placeholder="No onions…" onChange={(e) => setNote(e.target.value)} />
            </label>
            {missing(choosing) ? <p className="mt-2 text-sm text-red-700">{missing(choosing)}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="min-h-12 rounded border font-semibold" onClick={() => setChoosing(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="min-h-12 rounded bg-black font-semibold text-white disabled:opacity-50"
                disabled={missing(choosing) != null}
                onClick={() => add(choosing)}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lines.length > 0 ? (
        <section aria-label="Your order" className="fixed inset-x-0 bottom-0 z-[2000] border-t bg-white p-3 text-black shadow-[0_-4px_16px_rgba(0,0,0,0.12)]">
          <div className="mx-auto max-w-xl">
            <ul className="max-h-40 divide-y overflow-y-auto text-sm">
              {lines.map((l) => (
                <li key={l.key} className="flex items-center gap-2 py-1.5">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{l.dish.name}</span>
                    {l.optionNames.length > 0 ? <span className="opacity-70"> · {l.optionNames.join(", ")}</span> : null}
                    {l.note ? <span className="italic opacity-70"> · {l.note}</span> : null}
                  </span>
                  <button
                    type="button"
                    className="h-9 w-9 rounded border"
                    aria-label={`One fewer ${l.dish.name}`}
                    onClick={() =>
                      setLines((prev) =>
                        prev.map((x) => (x.key === l.key ? { ...x, quantity: x.quantity - 1 } : x)).filter((x) => x.quantity > 0),
                      )
                    }
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-mono tabular-nums">{l.quantity}</span>
                  <button
                    type="button"
                    className="h-9 w-9 rounded border"
                    aria-label={`One more ${l.dish.name}`}
                    disabled={l.quantity >= 20}
                    onClick={() => setLines((prev) => prev.map((x) => (x.key === l.key ? { ...x, quantity: x.quantity + 1 } : x)))}
                  >
                    +
                  </button>
                </li>
              ))}
            </ul>
            {error ? (
              <p role="alert" className="mt-1 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              className="mt-2 min-h-12 w-full rounded bg-black text-base font-semibold text-white disabled:opacity-50"
              disabled={sending}
              onClick={() => void send()}
            >
              {sending ? "Sending…" : `Send order · ${money(total)}`}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
