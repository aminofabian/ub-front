import type { PostSalePayload } from "@/lib/api";
import type { MenuItemRecord, ModifierGroupRecord, ModifierOptionRecord } from "@/lib/restaurant-api";

/**
 * The counter's order before it is paid: lines rung from the menu, what was chosen on each,
 * and the sale they become. The server prices every dish again and refuses a sale whose price
 * differs, so the sums here must follow the same rule: base price plus each chosen option.
 */

export type OrderCartLine = {
  key: string;
  menuItemId: string;
  kind: "DISH" | "ITEM";
  /** The product behind an `ITEM` line. */
  itemId: string | null;
  name: string;
  quantity: number;
  /** Price of one, with the chosen options. */
  unitPrice: number;
  optionIds: string[];
  /** The chosen options by name, for the cart and the kitchen ticket. */
  optionNames: string[];
  note: string;
};

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** The modifier groups of a menu item, in the order they are shown. */
export function groupsFor(item: MenuItemRecord, groups: readonly ModifierGroupRecord[]): ModifierGroupRecord[] {
  const byId = new Map(groups.map((g) => [g.id, g] as const));
  const out: ModifierGroupRecord[] = [];
  for (const id of item.modifierGroupIds) {
    const group = byId.get(id);
    if (group) out.push(group);
  }
  return out;
}

/** What is ticked when the modifier sheet opens: each group's usual options that are in stock, up to its limit. */
export function defaultSelection(groups: readonly ModifierGroupRecord[]): string[] {
  const out: string[] = [];
  for (const group of groups) {
    const usual = group.options.filter((o) => o.preselected && o.available).slice(0, group.maxSelect);
    for (const option of usual) out.push(option.id);
  }
  return out;
}

/**
 * Ticks or unticks an option. In a pick-one group a new choice replaces the old one; in a
 * pick-several group a tick beyond the limit is ignored.
 */
export function toggleOption(
  selected: readonly string[],
  group: ModifierGroupRecord,
  option: ModifierOptionRecord,
): string[] {
  if (!option.available) return [...selected];
  const inGroup = new Set(group.options.map((o) => o.id));
  const chosenHere = selected.filter((id) => inGroup.has(id));
  if (selected.includes(option.id)) {
    return selected.filter((id) => id !== option.id);
  }
  if (group.maxSelect === 1) {
    return [...selected.filter((id) => !inGroup.has(id)), option.id];
  }
  if (chosenHere.length >= group.maxSelect) return [...selected];
  return [...selected, option.id];
}

/** Why the choices cannot be added yet, or null when they fit. Mirrors the server's checks. */
export function selectionProblem(groups: readonly ModifierGroupRecord[], selected: readonly string[]): string | null {
  for (const group of groups) {
    const count = group.options.filter((o) => selected.includes(o.id)).length;
    if (count < group.minSelect) {
      return group.minSelect === 1 ? `Choose ${group.name}` : `Choose at least ${group.minSelect} of ${group.name}`;
    }
    if (count > group.maxSelect) return `Choose at most ${group.maxSelect} of ${group.name}`;
  }
  return null;
}

/** Price of one dish with the chosen options, and their names in menu order. */
export function priceSelection(
  item: MenuItemRecord,
  groups: readonly ModifierGroupRecord[],
  selected: readonly string[],
): { unitPrice: number; optionIds: string[]; optionNames: string[] } {
  let price = item.price ?? 0;
  const optionIds: string[] = [];
  const optionNames: string[] = [];
  for (const group of groups) {
    for (const option of group.options) {
      if (selected.includes(option.id)) {
        price += option.priceDelta;
        optionIds.push(option.id);
        optionNames.push(option.name);
      }
    }
  }
  return { unitPrice: round2(price), optionIds, optionNames };
}

/** Whether a menu item can be rung right now, and if not, the word to show on its tile. */
export function tileState(item: MenuItemRecord): { canRing: boolean; reason: string | null } {
  if (!item.active) return { canRing: false, reason: "Off the menu" };
  if (!item.available) return { canRing: false, reason: "Run out" };
  if (item.servedNow === false) return { canRing: false, reason: "Not served now" };
  if (item.kind === "ITEM" && !item.sellable) return { canRing: false, reason: "Not for sale" };
  if (item.price == null || item.price <= 0) return { canRing: false, reason: "No price" };
  return { canRing: true, reason: null };
}

/** Two rings of the same thing with the same choices and no note are one line with a quantity. */
export function addToCart(cart: readonly OrderCartLine[], line: OrderCartLine): OrderCartLine[] {
  const same = cart.find(
    (l) =>
      l.menuItemId === line.menuItemId &&
      l.note === "" &&
      line.note === "" &&
      l.unitPrice === line.unitPrice &&
      l.optionIds.length === line.optionIds.length &&
      l.optionIds.every((id, i) => id === line.optionIds[i]),
  );
  if (!same) return [...cart, line];
  return cart.map((l) => (l === same ? { ...l, quantity: l.quantity + line.quantity } : l));
}

export function cartTotal(cart: readonly OrderCartLine[]): number {
  return round2(cart.reduce((sum, l) => sum + round2(l.quantity * l.unitPrice), 0));
}

export function cartProblem(cart: readonly OrderCartLine[]): string | null {
  if (cart.length === 0) return "Add something from the menu first";
  for (const line of cart) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) return `Check the quantity of ${line.name}`;
    if (line.unitPrice <= 0) return `${line.name} has no price`;
  }
  return null;
}

export function buildOrderSalePayload(input: {
  branchId: string;
  cart: readonly OrderCartLine[];
  method: "cash" | "mpesa_manual";
  reference?: string;
  /** Cash the customer handed over, for change. Ignored unless it covers the total. */
  cashReceived?: number | null;
  soldAt: Date;
}): PostSalePayload {
  const total = cartTotal(input.cart);
  const payload: PostSalePayload = {
    branchId: input.branchId,
    lines: input.cart.map((l) =>
      l.kind === "DISH"
        ? {
            kind: "DISH" as const,
            menuItemId: l.menuItemId,
            modifierOptionIds: l.optionIds,
            quantity: l.quantity,
            unitPrice: round2(l.unitPrice),
            ...(l.note.trim() ? { note: l.note.trim() } : {}),
          }
        : {
            itemId: l.itemId ?? undefined,
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            unitPrice: round2(l.unitPrice),
            ...(l.note.trim() ? { note: l.note.trim() } : {}),
          },
    ),
    payments: [
      {
        method: input.method,
        amount: total,
        ...(input.method === "mpesa_manual" && input.reference?.trim()
          ? { reference: input.reference.trim().toUpperCase() }
          : {}),
      },
    ],
    clientSoldAt: input.soldAt.toISOString(),
  };
  if (input.method === "cash" && input.cashReceived != null && input.cashReceived >= total) {
    payload.cashReceived = round2(input.cashReceived);
  }
  return payload;
}

/** "4 min", "1 h 05 min" — how long a ticket has been waiting. */
export function elapsedLabel(fromIso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(fromIso)) / 60000));
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

/**
 * The notes a customer is likely to hand over for a total: the exact amount, then the next
 * round figures above it. Up to four, smallest first; none for an empty order.
 */
export function cashSuggestions(total: number): number[] {
  if (!Number.isFinite(total) || total <= 0) return [];
  const out = new Set<number>([Math.ceil(total)]);
  for (const step of [50, 100, 200, 500, 1000]) {
    const next = Math.ceil(total / step) * step;
    if (next > total) out.add(next);
  }
  return [...out].sort((a, b) => a - b).slice(0, 4);
}
