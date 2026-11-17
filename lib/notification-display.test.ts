import { describe, expect, test } from "bun:test";


import { getNotificationPresentation } from "./notification-display";

const orderId = "d03cd100-dcad-45ad-8735-40ec7f5523d9";

describe("notification presentation", () => {
  test("formats a web order instead of showing its raw UUID body", () => {
    const { title, body } = getNotificationPresentation({
      notificationType: "storefront.order.placed",
      body: `Elias Mwako · 5,00 KES · Order ${orderId}`,
      payload: {
        customerName: "Elias Mwako",
        total: "5.00",
        currency: "KES",
        orderId,
      },
    });

    expect(title).toBe("New web order");
    expect(body).toContain("Elias Mwako");
    expect(body).toContain("#D03CD100");
    expect(body).not.toContain(orderId);
  });

  test("shortens a raw UUID even when the payload is absent", () => {
    const { body } = getNotificationPresentation({
      notificationType: "storefront.order.placed",
      body: `Elias Mwako · 5,00 KES · Order ${orderId}`,
    });

    expect(body).toContain("#D03CD100");
    expect(body).not.toContain(orderId);
  });

  test("turns the welcome email into a notification-sized body", () => {
    const { body } = getNotificationPresentation({
      notificationType: "account.welcome",
      body: "Hi Elias Mwako, welcome to Kiosk. " + "A very long email body. ".repeat(40),
      payload: {
        businessName: "MM Investments",
        supportPhone: "0714 282 874",
      },
    });

    expect(body).toBe(
      "MM Investments is ready. Setup, M-Pesa, storefront, and custom help are free — call 0714 282 874.",
    );
  });

  test("clamps a long authored body", () => {
    const { body } = getNotificationPresentation({
      notificationType: "onboarding.sizes_right",
      body: "Sizes done right. " + "Keep one family with variants. ".repeat(20),
      payload: { step: "M2" },
    });

    expect(body.length).toBeLessThanOrEqual(181);
    expect(body.endsWith("…")).toBe(true);
  });

  test("tells who voided a sale and opens Activity", () => {
    const view = getNotificationPresentation({
      notificationType: "sale.voided",
      payload: {
        voidedByName: "Faith",
        receiptLabel: "#1563",
        amount: "1450.00",
        currency: "KES",
        reasonSuffix: ". Reason: customer left",
        actionUrl: "/business/logs",
      },
    });

    expect(view.title).toBe("Sale voided");
    expect(view.body).toContain("Faith voided sale #1563");
    expect(view.body).toContain("1,450");
    expect(view.body).toContain("Reason: customer left");
    expect(view.actionUrl).toBe("/business/logs");
  });
});
