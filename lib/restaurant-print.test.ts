import { describe, expect, it } from "bun:test";

import { buildKitchenTicketEscPos, jobPrinterTarget } from "@/lib/restaurant-print";
import type { KitchenPrintJobRecord, KitchenTicketRecord } from "@/lib/restaurant-api";

const ticket: KitchenTicketRecord = {
  id: "t1",
  orderId: "o1",
  orderNumber: 42,
  stationId: "s1",
  ticketType: "NEW",
  status: "OPEN",
  roundNo: 1,
  sentAt: "2026-11-16T08:00:00Z",
  lines: [
    { id: "l1", orderLineId: "ol1", name: "Burger", quantity: 2, modifiers: [], note: "no onions", stage: "NEW", readyAt: null },
  ],
  readyAt: null,
};

function job(over: Partial<KitchenPrintJobRecord>): KitchenPrintJobRecord {
  return {
    id: "j1",
    ticketId: "t1",
    orderNumber: 42,
    stationId: "s1",
    stationName: "Grill",
    printerName: null,
    printerHost: null,
    printerPort: null,
    reprint: false,
    ticket,
    ...over,
  };
}

const text = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : b === 0x0a ? "\n" : ""))
    .join("");

describe("kitchen ticket ESC/POS", () => {
  it("prints the order number, line and note, and no price", () => {
    const out = text(buildKitchenTicketEscPos(ticket, "Grill"));
    expect(out).toContain("Order 42");
    expect(out).toContain("2 x Burger");
    expect(out).toContain("no onions");
    expect(out).not.toContain("400");
  });

  it("marks a reprint and a void unmistakably", () => {
    expect(text(buildKitchenTicketEscPos(ticket, "Grill", true))).toContain("REPRINT");
    const voided = { ...ticket, ticketType: "VOID" as const };
    expect(text(buildKitchenTicketEscPos(voided, "Grill"))).toContain("CANCELLED");
  });
});

describe("jobPrinterTarget", () => {
  it("sends to the station's network printer when it named one", () => {
    expect(jobPrinterTarget(job({ printerHost: "192.168.1.50", printerPort: 9100 }))).toEqual({
      host: "192.168.1.50",
      port: 9100,
    });
  });

  it("defaults a network printer's port to 9100", () => {
    expect(jobPrinterTarget(job({ printerHost: "192.168.1.50", printerPort: null }))).toEqual({
      host: "192.168.1.50",
      port: 9100,
    });
  });

  it("sends to the station's named printer when it named one", () => {
    expect(jobPrinterTarget(job({ printerName: "Grill-80" }))).toEqual({ name: "Grill-80" });
  });

  it("prefers the station's network printer over its name if both somehow present", () => {
    expect(jobPrinterTarget(job({ printerName: "Grill-80", printerHost: "10.0.0.2", printerPort: 9100 }))).toEqual({
      host: "10.0.0.2",
      port: 9100,
    });
  });
});
