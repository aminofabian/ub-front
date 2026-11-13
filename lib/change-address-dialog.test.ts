import { describe, expect, it } from "bun:test";

import {
  describeChannels,
  tidyAddressName,
} from "@/app/(dashboard)/business/domains/_components/change-address-dialog";

describe("tidyAddressName", () => {
  it("lower-cases and trims what was typed", () => {
    expect(tidyAddressName("  KingKong ", "kiosk.ke")).toBe("kingkong");
  });

  it("accepts a pasted full address, with or without the scheme", () => {
    expect(tidyAddressName("https://king-kong.kiosk.ke/products", "kiosk.ke")).toBe(
      "king-kong",
    );
    expect(tidyAddressName("kingkong.kiosk.ke", "kiosk.ke")).toBe("kingkong");
  });

  it("drops spaces inside the name", () => {
    expect(tidyAddressName("king kong", "kiosk.ke")).toBe("kingkong");
  });

  it("leaves another domain alone for the server to refuse", () => {
    expect(tidyAddressName("shop.co.ke", "kiosk.ke")).toBe("shop.co.ke");
  });

  it("works when no suffix is known yet", () => {
    expect(tidyAddressName("Shop", null)).toBe("shop");
  });
});

describe("describeChannels", () => {
  it("names one channel", () => {
    expect(describeChannels(["email"])).toBe("email");
  });

  it("joins two with and", () => {
    expect(describeChannels(["email", "whatsapp"])).toBe("email and WhatsApp");
  });

  it("joins three with a comma and and", () => {
    expect(describeChannels(["email", "sms", "whatsapp"])).toBe(
      "email, SMS and WhatsApp",
    );
  });

  it("is empty for none", () => {
    expect(describeChannels([])).toBe("");
  });
});
