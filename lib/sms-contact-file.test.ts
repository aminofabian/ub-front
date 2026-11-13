import { describe, expect, it } from "bun:test";

import { contactsToCsv, parseContactLines } from "@/lib/sms-contact-file";
import type { SmsContactRow } from "@/lib/sms-hub-api";

describe("parseContactLines", () => {
  it("reads bare numbers, one per line", () => {
    expect(parseContactLines("0712345678\n+254 733 222 000\r\n")).toEqual([
      { phone: "0712345678" },
      { phone: "+254 733 222 000" },
    ]);
  });

  it("takes the name from either side of the number", () => {
    expect(parseContactLines("0712345678, Wanjiku Kamau\nBen Otieno;0733222000")).toEqual([
      { name: "Wanjiku Kamau", phone: "0712345678" },
      { name: "Ben Otieno", phone: "0733222000" },
    ]);
  });

  it("skips the header row and blank lines, and strips the byte-order mark", () => {
    expect(parseContactLines('\uFEFFName,Phone\n\n"Kamau, J"\t0712345678')).toEqual([
      { name: "Kamau J", phone: "0712345678" },
    ]);
  });

  it("prefers the mobile number over a date column", () => {
    expect(parseContactLines("2026-01-05,Ada Wanjiku,0722 111 000")).toEqual([
      { name: "Ada Wanjiku", phone: "0722 111 000" },
    ]);
  });

  it("passes on a line with digits but no usable number so the server reports it", () => {
    expect(parseContactLines("2.54712E+11")).toEqual([{ phone: "2.54712E+11" }]);
  });
});

describe("contactsToCsv", () => {
  const row = (over: Partial<SmsContactRow>): SmsContactRow => ({
    customerId: "c1",
    name: "Ada Wanjiku",
    phone: "0722111000",
    maskedNumber: null,
    origin: null,
    reach: "CAN_TEXT",
    consentSource: null,
    consentUpdatedAt: null,
    lastPurchaseAt: "2026-11-01T09:00:00Z",
    purchaseCount: 3,
    ...over,
  });

  it("writes international numbers and a readable status", () => {
    const lines = contactsToCsv([row({})]).split("\r\n");
    expect(lines[0]).toBe('"Name","Phone","SMS","Last bought","Purchases"');
    expect(lines[1]).toBe('"Ada Wanjiku","254722111000","Agreed to offers","2026-11-01",3');
  });

  it("stops a name from running as a spreadsheet formula", () => {
    const csv = contactsToCsv([row({ name: '=HYPERLINK("http://x")', phone: null })]);
    expect(csv.split("\r\n")[1].startsWith('"\'=HYPERLINK(""http://x"")"')).toBe(true);
  });
});
