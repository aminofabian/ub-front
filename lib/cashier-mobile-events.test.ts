import { beforeEach, describe, expect, it } from "bun:test";

import {
  dispatchCashierCartSummary,
  dispatchCashierTools,
  getCashierCartSummary,
  getCashierTools,
  subscribeCashierTools,
  type CashierMobileTool,
} from "./cashier-mobile-events";

const TOOLS: CashierMobileTool[] = [
  {
    id: "add-product",
    label: "Add product",
    hint: "Create an item that is not in the catalog yet",
    section: "stock",
  },
  {
    id: "drawout",
    label: "Drawout",
    hint: "Take cash out of the till",
    section: "shift",
  },
];

describe("cashier mobile published state", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        dispatchEvent: () => true,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
    // Reset the module store between cases.
    dispatchCashierTools([]);
  });

  it("lets a late subscriber read tools published before it listened", () => {
    // The POS surface publishes from a child effect, which runs before the
    // shell's till-menu provider attaches its listener.
    dispatchCashierTools(TOOLS);

    let notified: CashierMobileTool[] | null = null;
    const unsubscribe = subscribeCashierTools(() => {
      notified = getCashierTools();
    });

    // Pulling works even though the publish already happened…
    expect(getCashierTools().map((t) => t.id)).toEqual([
      "add-product",
      "drawout",
    ]);

    // …and later publishes still notify.
    dispatchCashierTools([...TOOLS, { ...TOOLS[0], id: "suppliers" }]);
    expect(notified?.length).toBe(3);
    unsubscribe();
  });

  it("keeps a stable reference when an equal list is republished", () => {
    dispatchCashierTools(TOOLS);
    const first = getCashierTools();
    dispatchCashierTools(
      TOOLS.map((t) => ({ ...t })),
    );
    // Same contents must not produce a new snapshot: useSyncExternalStore loops
    // forever on an unstable one.
    expect(getCashierTools()).toBe(first);
  });

  it("publishes the cart summary for the nav badge", () => {
    dispatchCashierCartSummary({
      label: "Sale 1",
      itemCount: 4,
      total: 4750,
      currency: "KES",
    });
    expect(getCashierCartSummary()?.itemCount).toBe(4);
  });
});
