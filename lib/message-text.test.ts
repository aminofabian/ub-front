import { describe, expect, test } from "bun:test";

import { parseMessageText } from "./message-text";

describe("parseMessageText", () => {
  test("leaves plain text alone", () => {
    expect(parseMessageText("Karibu. How can we help?")).toEqual([
      { type: "text", value: "Karibu. How can we help?" },
    ]);
  });

  test("links https URLs and keeps trailing punctuation as text", () => {
    expect(parseMessageText("See https://kiosk.ke/help.")).toEqual([
      { type: "text", value: "See " },
      { type: "url", value: "https://kiosk.ke/help", href: "https://kiosk.ke/help" },
      { type: "text", value: "." },
    ]);
  });

  test("adds https to www links", () => {
    expect(parseMessageText("www.kiosk.ke")).toEqual([
      { type: "url", value: "www.kiosk.ke", href: "https://www.kiosk.ke" },
    ]);
  });

  test("links emails", () => {
    expect(parseMessageText("Write to help@kiosk.ke")).toEqual([
      { type: "text", value: "Write to " },
      { type: "email", value: "help@kiosk.ke", href: "mailto:help@kiosk.ke" },
    ]);
  });

  test("links Kenyan mobile numbers in both forms", () => {
    expect(parseMessageText("Call 0712 345 678")).toEqual([
      { type: "text", value: "Call 0712 345 678" },
    ]);
    expect(parseMessageText("Call 0712345678")).toEqual([
      { type: "text", value: "Call " },
      { type: "phone", value: "0712345678", href: "tel:0712345678" },
    ]);
    expect(parseMessageText("+254712345678")).toEqual([
      { type: "phone", value: "+254712345678", href: "tel:+254712345678" },
    ]);
  });

  test("preserves newlines and multiple links", () => {
    expect(parseMessageText("A\nhttps://a.test\nB https://b.test")).toEqual([
      { type: "text", value: "A\n" },
      { type: "url", value: "https://a.test", href: "https://a.test" },
      { type: "text", value: "\nB " },
      { type: "url", value: "https://b.test", href: "https://b.test" },
    ]);
  });
});
