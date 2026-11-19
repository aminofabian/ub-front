import { describe, expect, it } from "bun:test";

import {
  addOrderLine,
  buildComingSoonOrderText,
  buildComingSoonOrderUrl,
  orderItemCount,
  orderTotalAmount,
  parseShelfAmount,
  readStoredOrder,
  setOrderQuantity,
} from "@/lib/coming-soon-order";

const oil = { id: "oil", name: "Cooking oil", price: "KSh 450.00" };
const coffee = { id: "coffee", name: "Coffee", price: "KSh 180.00" };

describe("coming soon order list", () => {
  it("parses a shelf price and ignores a blank one", () => {
    expect(parseShelfAmount("KSh 1,200.50")).toBe(1200.5);
    expect(parseShelfAmount("")).toBeNull();
  });

  it("adds separate products and stacks a repeat", () => {
    const first = addOrderLine([], oil);
    const both = addOrderLine(first, coffee);
    const stacked = addOrderLine(both, oil);
    expect(orderItemCount(stacked)).toBe(3);
    expect(stacked.find((line) => line.id === "oil")?.quantity).toBe(2);
    expect(orderTotalAmount(stacked)).toBe(1080);
  });

  it("drops a line at zero and stops at 99", () => {
    const line = addOrderLine([], oil);
    expect(setOrderQuantity(line, "oil", 0)).toEqual([]);
    expect(setOrderQuantity(line, "oil", 140)[0]?.quantity).toBe(99);
  });

  it("withholds a total when a price cannot be read", () => {
    const lines = addOrderLine(addOrderLine([], oil), {
      id: "ask",
      name: "Loose tea",
      price: "Ask",
    });
    expect(orderTotalAmount(lines)).toBeNull();
  });

  it("writes one WhatsApp message for the whole list", () => {
    const lines = addOrderLine(addOrderLine([], oil), coffee);
    const text = buildComingSoonOrderText({
      shopName: "Prime Mart",
      lines,
      currency: "KES",
      paysWithMpesa: true,
    });
    expect(text).toContain("Hi Prime Mart, I'd like to order:");
    expect(text).toContain("1. 1 × Cooking oil");
    expect(text).toContain("2. 1 × Coffee");
    expect(text).toContain("I'll pay by M-Pesa.");
    const url = buildComingSoonOrderUrl({
      shopName: "Prime Mart",
      contactHref: "https://wa.me/254700000000",
      lines,
      currency: "KES",
      paysWithMpesa: true,
    });
    expect(url?.startsWith("https://wa.me/254700000000?text=")).toBe(true);
    expect(buildComingSoonOrderUrl({
      shopName: "Prime Mart",
      contactHref: "tel:254700000000",
      lines,
      currency: "KES",
      paysWithMpesa: false,
    })).toBeNull();
  });

  it("rejects a stored list that is not the order shape", () => {
    expect(readStoredOrder("not-json")).toEqual([]);
    expect(readStoredOrder(JSON.stringify([{ id: "x", name: "", quantity: 2 }]))).toEqual([]);
  });
});
