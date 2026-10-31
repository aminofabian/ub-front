import { describe, expect, it } from "vitest";

import {
  cartsAfterCompletedSale,
  createEmptyCartSession,
  type CartSession,
} from "@/lib/cart-session";

function withLines(cart: CartSession, n: number): CartSession {
  return {
    ...cart,
    lines: Array.from({ length: n }, (_, i) => ({
      key: `${cart.id}-line-${i}`,
      itemId: `item-${i}`,
      label: `Item ${i}`,
      quantity: "1",
      unitPrice: "10",
      item: { id: `item-${i}`, name: `Item ${i}`, sku: "" },
    })),
  };
}

describe("cartsAfterCompletedSale", () => {
  it("removes the sold tab and focuses an empty spare, not the first held cart", () => {
    const a = withLines(createEmptyCartSession(), 2);
    const b = withLines(createEmptyCartSession(), 1);
    const c = withLines(createEmptyCartSession(), 3);
    const spare = createEmptyCartSession();

    const { carts, activeCartId } = cartsAfterCompletedSale(
      [a, b, c, spare],
      c.id,
    );

    expect(carts.map((x) => x.id)).toEqual([a.id, b.id, spare.id]);
    expect(activeCartId).toBe(spare.id);
    expect(carts.find((x) => x.id === a.id)?.lines).toHaveLength(2);
    expect(carts.find((x) => x.id === b.id)?.lines).toHaveLength(1);
  });

  it("appends a blank tab when every remaining cart still has lines", () => {
    const a = withLines(createEmptyCartSession(), 1);
    const b = withLines(createEmptyCartSession(), 1);
    const c = withLines(createEmptyCartSession(), 1);

    const { carts, activeCartId } = cartsAfterCompletedSale([a, b, c], b.id);

    expect(carts).toHaveLength(3);
    expect(carts.map((x) => x.id).slice(0, 2)).toEqual([a.id, c.id]);
    const empty = carts.find((x) => x.lines.length === 0);
    expect(empty).toBeTruthy();
    expect(activeCartId).toBe(empty!.id);
    expect(carts.find((x) => x.id === a.id)?.lines).toHaveLength(1);
  });

  it("leaves a single empty cart when the only open tab was sold", () => {
    const only = withLines(createEmptyCartSession(), 2);
    const { carts, activeCartId } = cartsAfterCompletedSale([only], only.id);
    expect(carts).toHaveLength(1);
    expect(carts[0]!.lines).toHaveLength(0);
    expect(activeCartId).toBe(carts[0]!.id);
  });
});
