import { describe, expect, test } from "bun:test";

import type { MenuItemRecord, ModifierGroupRecord } from "./restaurant-api";
import {
  addToCart,
  allDayCounts,
  buildOrderSalePayload,
  cartProblem,
  cartTotal,
  defaultSelection,
  elapsedLabel,
  groupsFor,
  priceSelection,
  ticketUrgency,
  TICKET_LATE_MINUTES,
  TICKET_SLOW_MINUTES,
  selectionProblem,
  tileState,
  toggleOption,
  type OrderCartLine,
  cashSuggestions,
} from "./restaurant-cart";

const patty: ModifierGroupRecord = {
  id: "g-patty",
  name: "Patty",
  minSelect: 1,
  maxSelect: 1,
  sortOrder: 0,
  options: [
    { id: "o-single", name: "Single", priceDelta: 0, preselected: true, available: true, sortOrder: 0 },
    { id: "o-double", name: "Double", priceDelta: 150, preselected: false, available: true, sortOrder: 1 },
  ],
};
const extras: ModifierGroupRecord = {
  id: "g-extras",
  name: "Extras",
  minSelect: 0,
  maxSelect: 2,
  sortOrder: 1,
  options: [
    { id: "o-cheese", name: "Cheese", priceDelta: 50, preselected: false, available: true, sortOrder: 0 },
    { id: "o-bacon", name: "Bacon", priceDelta: 80, preselected: false, available: true, sortOrder: 1 },
    { id: "o-egg", name: "Egg", priceDelta: 40, preselected: false, available: false, sortOrder: 2 },
  ],
};
const burger: MenuItemRecord = {
  id: "m-burger",
  categoryId: null,
  name: "Burger",
  kind: "DISH",
  itemId: null,
  price: 400,
  taxRateId: null,
  stationId: null,
  available: true,
  active: true,
  sellable: true,
  sortOrder: 0,
  modifierGroupIds: ["g-patty", "g-extras", "g-gone"],
};
const groups = [extras, patty];

const line = (over: Partial<OrderCartLine> = {}): OrderCartLine => ({
  key: "k1",
  menuItemId: "m-burger",
  kind: "DISH",
  itemId: null,
  name: "Burger",
  quantity: 1,
  unitPrice: 400,
  optionIds: ["o-single"],
  optionNames: ["Single"],
  note: "",
  ...over,
});

describe("modifier choices", () => {
  test("groups follow the dish's order and skip one that no longer exists", () => {
    expect(groupsFor(burger, groups).map((g) => g.id)).toEqual(["g-patty", "g-extras"]);
  });

  test("the usual option is ticked when the sheet opens", () => {
    expect(defaultSelection(groupsFor(burger, groups))).toEqual(["o-single"]);
  });

  test("a pick-one group swaps; a pick-several group stops at its limit", () => {
    let chosen = toggleOption(["o-single"], patty, patty.options[1]!);
    expect(chosen).toEqual(["o-double"]);
    chosen = toggleOption(chosen, extras, extras.options[0]!);
    chosen = toggleOption(chosen, extras, extras.options[1]!);
    expect(chosen).toEqual(["o-double", "o-cheese", "o-bacon"]);
    // Unticking works; an option that has run out cannot be ticked.
    expect(toggleOption(chosen, extras, extras.options[0]!)).toEqual(["o-double", "o-bacon"]);
    expect(toggleOption(["o-double"], extras, extras.options[2]!)).toEqual(["o-double"]);
  });

  test("a required group must be chosen", () => {
    const shown = groupsFor(burger, groups);
    expect(selectionProblem(shown, [])).toBe("Choose Patty");
    expect(selectionProblem(shown, ["o-single"])).toBeNull();
    expect(selectionProblem(shown, ["o-single", "o-double"])).toBe("Choose at most 1 of Patty");
  });

  test("the price is the dish plus each chosen option, in menu order", () => {
    const priced = priceSelection(burger, groupsFor(burger, groups), ["o-bacon", "o-double"]);
    expect(priced.unitPrice).toBe(630);
    expect(priced.optionIds).toEqual(["o-double", "o-bacon"]);
    expect(priced.optionNames).toEqual(["Double", "Bacon"]);
  });
});

describe("menu tiles", () => {
  test("a tile says why it cannot be rung", () => {
    expect(tileState(burger)).toEqual({ canRing: true, reason: null });
    expect(tileState({ ...burger, available: false }).reason).toBe("Run out");
    expect(tileState({ ...burger, active: false }).reason).toBe("Off the menu");
    expect(tileState({ ...burger, price: null }).reason).toBe("No price");
    expect(tileState({ ...burger, kind: "ITEM", sellable: false }).reason).toBe("Not for sale");
  });
});

describe("the order", () => {
  test("the same thing rung twice is one line; a different choice or a note is its own line", () => {
    let cart = addToCart([], line());
    cart = addToCart(cart, line({ key: "k2" }));
    expect(cart).toHaveLength(1);
    expect(cart[0]!.quantity).toBe(2);
    cart = addToCart(cart, line({ key: "k3", optionIds: ["o-double"], unitPrice: 550 }));
    cart = addToCart(cart, line({ key: "k4", note: "no onions" }));
    expect(cart).toHaveLength(3);
    expect(cartTotal(cart)).toBe(1750);
  });

  test("an empty or broken order cannot be paid", () => {
    expect(cartProblem([])).toBe("Add something from the menu first");
    expect(cartProblem([line({ quantity: 0 })])).toBe("Check the quantity of Burger");
    expect(cartProblem([line({ unitPrice: 0 })])).toBe("Burger has no price");
    expect(cartProblem([line()])).toBeNull();
  });

  test("a dish goes as a DISH line with its choices; a product goes as an ordinary line", () => {
    const payload = buildOrderSalePayload({
      branchId: "b1",
      cart: [
        line({ quantity: 2, optionIds: ["o-double", "o-cheese"], unitPrice: 600, note: " no onions " }),
        line({ key: "k2", kind: "ITEM", itemId: "i-soda", menuItemId: "m-soda", name: "Soda", unitPrice: 80, optionIds: [] }),
      ],
      method: "cash",
      cashReceived: 1500,
      soldAt: new Date("2026-11-15T09:00:00Z"),
    });
    expect(payload.lines[0]).toEqual({
      kind: "DISH",
      menuItemId: "m-burger",
      modifierOptionIds: ["o-double", "o-cheese"],
      quantity: 2,
      unitPrice: 600,
      note: "no onions",
    });
    expect(payload.lines[1]).toEqual({ itemId: "i-soda", menuItemId: "m-soda", quantity: 1, unitPrice: 80 });
    expect(payload.payments).toEqual([{ method: "cash", amount: 1280 }]);
    expect(payload.cashReceived).toBe(1500);
    expect(payload.clientSoldAt).toBe("2026-11-15T09:00:00.000Z");
  });

  test("an M-Pesa code is upper-cased and cash below the total is not sent as received", () => {
    const mpesa = buildOrderSalePayload({
      branchId: "b1", cart: [line()], method: "mpesa_manual", reference: " qk12abc ", soldAt: new Date(0),
    });
    expect(mpesa.payments[0]).toEqual({ method: "mpesa_manual", amount: 400, reference: "QK12ABC" });
    const short = buildOrderSalePayload({
      branchId: "b1", cart: [line()], method: "cash", cashReceived: 300, soldAt: new Date(0),
    });
    expect(short.cashReceived).toBeUndefined();
  });

  test("a counter order can carry the guest's name, trimmed and bounded", () => {
    const named = buildOrderSalePayload({
      branchId: "b1", cart: [line()], method: "cash", customerName: "  Kevin  ", soldAt: new Date(0),
    });
    expect(named.customerName).toBe("Kevin");
    const long = buildOrderSalePayload({
      branchId: "b1", cart: [line()], method: "cash", customerName: "x".repeat(200), soldAt: new Date(0),
    });
    expect(long.customerName).toHaveLength(120);
    const blank = buildOrderSalePayload({
      branchId: "b1", cart: [line()], method: "cash", customerName: "   ", soldAt: new Date(0),
    });
    expect(blank.customerName).toBeUndefined();
  });

  test("part cash and part M-Pesa is one sale with two tenders", () => {
    const split = buildOrderSalePayload({
      branchId: "b1",
      cart: [line()],
      method: "cash",
      payments: [
        { method: "cash", amount: 150 },
        { method: "mpesa_manual", amount: 250, reference: " qk9 " },
      ],
      soldAt: new Date(0),
    });
    expect(split.payments).toEqual([
      { method: "cash", amount: 150 },
      { method: "mpesa_manual", amount: 250, reference: "QK9" },
    ]);
  });
});

describe("waiting time", () => {
  test("reads in minutes, then hours", () => {
    const sent = "2026-11-15T09:00:00Z";
    const at = (m: number) => Date.parse(sent) + m * 60000;
    expect(elapsedLabel(sent, at(0))).toBe("now");
    expect(elapsedLabel(sent, at(4))).toBe("4 min");
    expect(elapsedLabel(sent, at(65))).toBe("1 h 05 min");
    expect(elapsedLabel(sent, at(-3))).toBe("now");
  });
});

describe("ticket urgency", () => {
  const sent = "2026-11-15T09:00:00Z";
  const at = (m: number) => Date.parse(sent) + m * 60000;

  test("a fresh ticket is ok", () => {
    expect(ticketUrgency(sent, at(0))).toBe("ok");
    expect(ticketUrgency(sent, at(TICKET_SLOW_MINUTES - 1))).toBe("ok");
  });

  test("turns slow at the slow threshold", () => {
    expect(ticketUrgency(sent, at(TICKET_SLOW_MINUTES))).toBe("slow");
    expect(ticketUrgency(sent, at(TICKET_LATE_MINUTES - 1))).toBe("slow");
  });

  test("turns late at the late threshold and stays late", () => {
    expect(ticketUrgency(sent, at(TICKET_LATE_MINUTES))).toBe("late");
    expect(ticketUrgency(sent, at(60 * 40))).toBe("late"); // a 40-hour stale ticket
  });

  test("a clock skew into the past is not urgent", () => {
    expect(ticketUrgency(sent, at(-5))).toBe("ok");
  });
});

describe("cashSuggestions", () => {
  test("offers the exact amount and the next round figures above it", () => {
    expect(cashSuggestions(350)).toEqual([350, 400, 500, 1000]);
    expect(cashSuggestions(1000)).toEqual([1000]);
    expect(cashSuggestions(45)).toEqual([45, 50, 100, 200]);
  });

  test("rounds a total with cents up to whole shillings", () => {
    expect(cashSuggestions(349.5)).toEqual([350, 400, 500, 1000]);
  });

  test("offers nothing for an empty or nonsense total", () => {
    expect(cashSuggestions(0)).toEqual([]);
    expect(cashSuggestions(-5)).toEqual([]);
    expect(cashSuggestions(Number.NaN)).toEqual([]);
  });
});

describe("all day counts", () => {
  test("adds what is still to make and leaves out what is ready, served or cancelled", () => {
    const counts = allDayCounts([
      {
        ticketType: "NEW",
        lines: [
          { name: "Burger", quantity: 2, stage: "NEW" },
          { name: "Chips", quantity: 1, stage: "PREPARING" },
        ],
      },
      {
        ticketType: "NEW",
        lines: [
          { name: "Burger", quantity: 1, stage: "NEW" },
          { name: "Chips", quantity: 1, stage: "READY" },
          { name: "Soda", quantity: 3, stage: "SERVED" },
        ],
      },
      { ticketType: "VOID", lines: [{ name: "Burger", quantity: 9, stage: "NEW" }] },
    ]);
    expect(counts).toEqual([
      ["Burger", 3],
      ["Chips", 1],
    ]);
  });

  test("orders by how much is left, then by name, and caps the strip", () => {
    const lines = Array.from({ length: 20 }, (_, i) => ({
      name: `Dish ${i}`,
      quantity: i,
      stage: "NEW",
    }));
    const counts = allDayCounts([{ ticketType: "NEW", lines }]);
    expect(counts).toHaveLength(14);
    expect(counts[0]).toEqual(["Dish 19", 19]);
    expect(counts[1]).toEqual(["Dish 18", 18]);
  });
});
