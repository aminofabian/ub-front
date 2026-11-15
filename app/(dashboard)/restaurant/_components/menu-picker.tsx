"use client";

import { useMemo, useState } from "react";

import { formatMoney } from "@/lib/money";
import type { MenuItemRecord, MenuRecord } from "@/lib/restaurant-api";
import { tileState } from "@/lib/restaurant-cart";
import { cn } from "@/lib/utils";

const kes = (n: number) => formatMoney(n, "KES");

const INK_RULE = "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)] focus-visible:ring-offset-1";

/** A tappable paper tile. Shared by the choices sheet and the tender buttons, so they read as one family. */
export const MENU_TILE = cn(
  "min-h-[4.5rem] rounded-[2px] border bg-[var(--op-surface,#FCFAF5)] px-3 py-2 text-left",
  INK_RULE,
  "transition-[border-color,background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
  "hover:border-[var(--pos-primary,#1D4B3B)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
  FOCUS,
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
);
export const MENU_TILE_ON =
  "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)]";

const NO_HEADING = "__none__";
const ALL = "__all__";
/** A menu this long is quicker to search than to page through. */
const SEARCH_FROM = 10;

/**
 * The menu as a board of tiles under its headings. Used at the counter and on a table's order:
 * tapping a tile rings it, a tile that cannot be rung says why instead of a price, and a tile
 * already on the order carries how many of it there are.
 *
 * @param counts how many of each menu item are on the order being rung, by menu item id
 */
export function MenuPicker({
  menu,
  onRing,
  counts,
}: {
  menu: MenuRecord;
  onRing: (item: MenuItemRecord) => void;
  counts?: Record<string, number>;
}) {
  const [heading, setHeading] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const active = useMemo(() => menu.items.filter((i) => i.active), [menu]);

  const headings = useMemo(() => {
    const used = new Set(active.map((i) => i.categoryId ?? NO_HEADING));
    const out = menu.categories.filter((c) => c.active && used.has(c.id)).map((c) => ({ id: c.id, name: c.name }));
    if (used.has(NO_HEADING) && out.length > 0) out.push({ id: NO_HEADING, name: "Other" });
    return out.length > 1 ? [{ id: ALL, name: "Everything" }, ...out] : out;
  }, [menu, active]);

  // Once any dish has a picture the whole board shows them, so the tiles stay one height.
  const pictures = useMemo(() => active.some((i) => Boolean(i.imageUrl)), [active]);

  const activeHeading = heading != null && headings.some((h) => h.id === heading) ? heading : (headings[0]?.id ?? null);
  const term = query.trim().toLowerCase();

  const shown = useMemo(() => {
    // Searching looks across the whole menu: the dish is wanted, wherever it is filed.
    if (term) return active.filter((i) => i.name.toLowerCase().includes(term));
    if (headings.length === 0 || activeHeading == null || activeHeading === ALL) return active;
    return active.filter((i) => (i.categoryId ?? NO_HEADING) === activeHeading);
  }, [active, headings, activeHeading, term]);

  return (
    <div>
      {active.length >= SEARCH_FROM ? (
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          aria-label="Find on the menu"
          placeholder="Find on the menu"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            "mb-2 h-11 w-full rounded-[2px] border bg-[var(--op-surface,#FCFAF5)] px-3 text-sm",
            INK_RULE,
            "placeholder:text-[color-mix(in_srgb,var(--order-ink,#121A16)_55%,transparent)]",
            FOCUS,
          )}
        />
      ) : null}
      {headings.length > 1 && !term ? (
        <div
          className={cn("mb-3 flex gap-1 overflow-x-auto border-b", INK_RULE)}
          role="tablist"
          aria-label="Menu headings"
        >
          {headings.map((h) => {
            const on = activeHeading === h.id;
            return (
              <button
                key={h.id}
                type="button"
                role="tab"
                aria-selected={on}
                className={cn(
                  "-mb-px min-h-11 shrink-0 border-b-2 px-3 text-sm transition-colors duration-200",
                  on
                    ? "border-[var(--pos-primary,#1D4B3B)] font-semibold text-[var(--order-ink,#121A16)]"
                    : "border-transparent text-[color-mix(in_srgb,var(--order-ink,#121A16)_68%,transparent)] hover:text-[var(--order-ink,#121A16)]",
                  FOCUS,
                )}
                onClick={() => setHeading(h.id)}
              >
                {h.name}
              </button>
            );
          })}
        </div>
      ) : null}
      {shown.length === 0 ? (
        <p className="py-6 text-sm text-[color-mix(in_srgb,var(--order-ink,#121A16)_68%,transparent)]">
          {term ? `Nothing on the menu matches “${query.trim()}”.` : "Nothing under this heading yet."}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8.75rem,1fr))] gap-2">
          {shown.map((item) => {
            const state = tileState(item);
            const count = counts?.[item.id] ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!state.canRing}
                className={cn(
                  MENU_TILE,
                  "relative flex flex-col justify-between gap-2",
                  pictures && "overflow-hidden",
                  count > 0 && MENU_TILE_ON,
                )}
                onClick={() => onRing(item)}
              >
                {pictures ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "-mx-3 -mt-2 block h-20 overflow-hidden border-b",
                      INK_RULE,
                      "bg-[color-mix(in_srgb,var(--order-ink,#121A16)_5%,transparent)]",
                    )}
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a till tile; no layout shift to manage, and it must work offline from cache
                      <img src={item.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full place-items-center font-serif text-3xl italic text-[color-mix(in_srgb,var(--order-ink,#121A16)_28%,transparent)]">
                        {item.name.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                ) : null}
                <span className={cn("block text-[15px] font-semibold leading-snug", !pictures && "pr-7")}>{item.name}</span>
                <span
                  className={cn(
                    "block font-mono text-sm tabular-nums",
                    state.reason
                      ? "text-[var(--kiosk-highlight,#A55237)]"
                      : "text-[color-mix(in_srgb,var(--order-ink,#121A16)_72%,transparent)]",
                  )}
                >
                  {state.reason ?? kes(item.price ?? 0)}
                </span>
                {count > 0 ? (
                  <span
                    aria-label={`${count} on this order`}
                    className="absolute right-2 top-2 min-w-6 rounded-[2px] bg-[var(--pos-primary,#1D4B3B)] px-1.5 py-0.5 text-center font-mono text-xs font-semibold tabular-nums text-[var(--pos-on-primary,#F4F1EA)]"
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
