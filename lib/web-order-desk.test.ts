import { describe, expect, it } from "bun:test";

import {
  isDoorstepOrder,
  isWhatsAppWebOrder,
  nextFulfillmentStep,
  orderMatchesCode,
  orderStatusLine,
  whatsAppChatHref,
} from "@/lib/web-order-desk";

const ORDER_ID = "00000000-0000-0000-0000-43a175dd";

describe("orderMatchesCode", () => {
  it("matches the short code from a deep link", () => {
    expect(orderMatchesCode({ id: ORDER_ID, orderCode: "43A175DD" }, "43a175dd")).toBe(
      true,
    );
    expect(orderMatchesCode({ id: ORDER_ID }, "nope")).toBe(false);
  });
});

describe("orderStatusLine", () => {
  it("calls an unpaid order unpaid, including a blank fulfillment status", () => {
    expect(
      orderStatusLine({ status: "pending_payment", fulfillmentStatus: "" }),
    ).toEqual({ label: "Unpaid", tone: "amber" });
    expect(orderStatusLine({ status: "payment_failed" }).tone).toBe("rose");
  });
});

describe("nextFulfillmentStep", () => {
  it("keeps confirm and delivery closed until the order is paid", () => {
    expect(
      nextFulfillmentStep({
        status: "pending_payment",
        fulfillmentStatus: "awaiting_confirmation",
        code: "43A175DD",
        doorstep: true,
      }),
    ).toBeNull();
  });

  it("names delivery and pickup from how the order leaves the shop", () => {
    expect(
      nextFulfillmentStep({
        status: "paid",
        fulfillmentStatus: "confirmed",
        code: "43A175DD",
        doorstep: true,
      })?.label,
    ).toBe("Out for delivery");
    expect(
      nextFulfillmentStep({
        status: "paid",
        fulfillmentStatus: "dispatched",
        code: "43A175DD",
        doorstep: false,
      }),
    ).toEqual({
      status: "completed",
      label: "Complete pickup",
      command: "COMPLETE 43A175DD",
    });
  });
});

describe("channel helpers", () => {
  it("treats the channel column and the legacy note as WhatsApp", () => {
    expect(isWhatsAppWebOrder({ channel: "WHATSAPP" })).toBe(true);
    expect(isWhatsAppWebOrder({ notes: "Channel: WhatsApp | Payment: Arrange" })).toBe(
      true,
    );
    expect(isWhatsAppWebOrder({ channel: "WEB", notes: "leave at the gate" })).toBe(
      false,
    );
  });

  it("treats a doorstep shipment as delivery", () => {
    expect(isDoorstepOrder({ shipment: { mode: "doorstep" } })).toBe(true);
    expect(isDoorstepOrder({ shipment: { mode: "agent" } })).toBe(false);
    expect(isDoorstepOrder({})).toBe(false);
  });
});

describe("whatsAppChatHref", () => {
  it("opens a finished message instead of a pay-by blank", () => {
    const href = whatsAppChatHref("0714282874", "Harry Thuku", "43A175DD");
    expect(href.startsWith("https://wa.me/254714282874?text=")).toBe(true);
    expect(decodeURIComponent(href)).toContain("order #43A175DD");
    expect(href.toLowerCase()).not.toContain("pay%20by");
  });
});
