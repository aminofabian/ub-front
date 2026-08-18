import { describe, expect, it } from "vitest";

import {
  detectKenyanNetwork,
  formatKenyanPhoneDisplay,
  looksLikeKenyanMobilePath,
  toKenyanLocal07,
  toKenyanMsisdn254,
  extractFirstKenyanMobile,
} from "@/lib/kenyan-phone";

describe("kenyan-phone", () => {
  it("detects Kenyan mobile path segments", () => {
    expect(looksLikeKenyanMobilePath("0714282874")).toBe(true);
    expect(looksLikeKenyanMobilePath("254714282874")).toBe(true);
    expect(looksLikeKenyanMobilePath("714282874")).toBe(true);
    expect(looksLikeKenyanMobilePath("sugar-2kg")).toBe(false);
    expect(looksLikeKenyanMobilePath("SKU-001")).toBe(false);
  });

  it("groups a local number for display", () => {
    expect(formatKenyanPhoneDisplay("0714282874")).toBe("0714 282 874");
    expect(formatKenyanPhoneDisplay("254714282874")).toBe("0714 282 874");
    expect(formatKenyanPhoneDisplay("")).toBe("");
  });

  it("normalizes to local 07 form", () => {
    expect(toKenyanLocal07("254714282874")).toBe("0714282874");
    expect(toKenyanLocal07("0714282874")).toBe("0714282874");
    expect(toKenyanLocal07("714282874")).toBe("0714282874");
  });

  it("normalizes to 254 MSISDN", () => {
    expect(toKenyanMsisdn254("0710514157")).toBe("254710514157");
    expect(toKenyanMsisdn254("+254710514157")).toBe("254710514157");
  });

  it("extracts a mobile from remittance text", () => {
    expect(extractFirstKenyanMobile("send money: 0710514157")).toBe("254710514157");
    expect(extractFirstKenyanMobile("Paybill 123456 Acc 071")).toBeNull();
    expect(extractFirstKenyanMobile(null)).toBeNull();
  });

  it("detects the network from a Kenyan prefix", () => {
    expect(detectKenyanNetwork("0714282874")).toBe("SAFARICOM");
    expect(detectKenyanNetwork("0700123456")).toBe("SAFARICOM");
    expect(detectKenyanNetwork("0720123456")).toBe("SAFARICOM");
    expect(detectKenyanNetwork("0740123456")).toBe("SAFARICOM");
    expect(detectKenyanNetwork("0790123456")).toBe("SAFARICOM");
    expect(detectKenyanNetwork("0110123456")).toBe("SAFARICOM");
    expect(detectKenyanNetwork("0140123456")).toBe("SAFARICOM");
    expect(detectKenyanNetwork("0180123456")).toBe("SAFARICOM");
    expect(detectKenyanNetwork("0730123456")).toBe("AIRTEL");
    expect(detectKenyanNetwork("0750123456")).toBe("AIRTEL");
    expect(detectKenyanNetwork("0785123456")).toBe("AIRTEL");
    expect(detectKenyanNetwork("0100123456")).toBe("AIRTEL");
    expect(detectKenyanNetwork("0770123456")).toBe("TELKOM");
    expect(detectKenyanNetwork("0763123456")).toBe("EQUITEL");
    expect(detectKenyanNetwork("0766123456")).toBe("EQUITEL");
    expect(detectKenyanNetwork("0747123456")).toBe("JTL");
    expect(detectKenyanNetwork("0780123456")).toBeNull();
    expect(detectKenyanNetwork("0744123456")).toBeNull();
  });

  it("accepts 01xx numbers as Kenyan mobiles when the prefix is known", () => {
    expect(looksLikeKenyanMobilePath("0110123456")).toBe(true);
    expect(toKenyanLocal07("0110123456")).toBe("0110123456");
    expect(toKenyanMsisdn254("0110123456")).toBe("254110123456");
    expect(formatKenyanPhoneDisplay("0110123456")).toBe("0110 123 456");
    expect(looksLikeKenyanMobilePath("0120123456")).toBe(false);
  });
});
