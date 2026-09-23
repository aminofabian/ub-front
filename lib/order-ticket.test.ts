import { describe, expect, it } from "bun:test";

import type { SupplierItemLinkRecord } from "@/lib/api";
import {
  buildSupplyInvoiceReorderTicket,
  encodeTenantCartTicket,
  matchOrderTicketToLinks,
  parseOrderTicketFromInput,
  tenantOrderTicketPath,
} from "@/lib/order-ticket";

function link(
  partial: Pick<SupplierItemLinkRecord, "itemId" | "itemName" | "sku"> &
    Partial<SupplierItemLinkRecord>,
): SupplierItemLinkRecord {
  return {
    id: partial.id ?? `link-${partial.itemId}`,
    itemId: partial.itemId,
    itemName: partial.itemName,
    sku: partial.sku,
    barcode: partial.barcode ?? null,
    primary: true,
    active: true,
    supplierSku: partial.supplierSku ?? null,
    ...partial,
  };
}

describe("order ticket", () => {
  it("builds a tenant order URL with ticket + supplier", () => {
    const path = tenantOrderTicketPath({
      ticket: "CARROTS*16*110,AVOCADO*3",
      supplierId: "sup-1",
      marketplaceSupplierId: "mkt-9",
      round: "0",
    });
    const url = new URL(path, "https://example.test");
    expect(url.pathname).toBe("/order");
    expect(url.searchParams.get("ticket")).toBe("CARROTS*16*110,AVOCADO*3");
    expect(url.searchParams.get("sid")).toBe("sup-1");
    expect(url.searchParams.get("msid")).toBe("mkt-9");
    expect(url.searchParams.get("r")).toBe("0");
  });

  it("still accepts legacy roundTo10", () => {
    const path = tenantOrderTicketPath({
      ticket: "X*1",
      roundTo10: true,
    });
    const url = new URL(path, "https://example.test");
    expect(url.searchParams.get("r")).toBe("10");
  });

  it("parses marketplace and tenant share URLs", () => {
    expect(
      parseOrderTicketFromInput(
        "https://kiosk.ke/marketplace/s/grocery--abc?o=apple-pink*4,carrots-pair*16*110",
      ),
    ).toEqual([
      { slug: "apple-pink", qty: 4 },
      { slug: "carrots-pair", qty: 16, lineTotal: 110 },
    ]);

    expect(
      parseOrderTicketFromInput("/order?ticket=GINGER*1&sid=sup-1"),
    ).toEqual([{ slug: "GINGER", qty: 1 }]);
  });

  it("matches ticket keys onto supplier item links", () => {
    const links = [
      link({ itemId: "i1", itemName: "Carrots Pair", sku: "CARROTS" }),
      link({
        itemId: "i2",
        itemName: "Avocado Medium",
        sku: "AVO-M",
        barcode: "123",
      }),
    ];
    const result = matchOrderTicketToLinks(
      [
        { slug: "CARROTS", qty: 16 },
        { slug: "123", qty: 2 },
        { slug: "missing", qty: 1 },
      ],
      links,
    );
    expect(result.cart).toEqual({ i1: 16, i2: 2 });
    expect(result.packs).toEqual({});
    expect(result.prices).toEqual({});
    expect(result.matched).toBe(2);
    expect(result.missed).toEqual(["missing"]);
  });

  it("derives unit prices from ticket line totals", () => {
    const links = [
      link({ itemId: "i1", itemName: "Carrots Pair", sku: "CARROTS" }),
    ];
    const result = matchOrderTicketToLinks(
      [{ slug: "CARROTS", qty: 10, lineTotal: 250 }],
      links,
    );
    expect(result.prices).toEqual({ i1: 25 });
  });

  it("builds a reorder ticket from a supply invoice", () => {
    const plan = buildSupplyInvoiceReorderTicket({
      lines: [
        {
          itemId: "i1",
          description: "Garlic",
          qty: 15,
          usableQty: 15,
          unitCost: 10,
          lineTotal: 150,
        },
        {
          itemId: null,
          description: "Unlinked",
          qty: 2,
          usableQty: 2,
          lineTotal: 20,
        },
      ],
    });
    expect(plan.reusable).toBe(1);
    expect(plan.skipped).toBe(1);
    expect(plan.ticket).toBe("i1*15*150");
    expect(plan.estimatedTotal).toBe(150);
  });

  it("encodes tenant carts with SKU keys", () => {
    expect(
      encodeTenantCartTicket([
        {
          link: link({ itemId: "i1", itemName: "Carrots", sku: "CARROTS" }),
          qty: 16,
        },
      ]),
    ).toBe("CARROTS*16");
  });
});
