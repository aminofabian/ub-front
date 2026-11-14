import { describe, expect, test } from "bun:test";

import {
  awaySentence,
  chairBarPercent,
  minutesSince,
  nairobiToday,
  previewCommission,
  teamByPresence,
  waitLabel,
} from "./service-business-api";

describe("previewCommission", () => {
  test("percent of the price in whole shillings, half up", () => {
    expect(previewCommission(300, "PERCENT", 40)).toBe(120);
    expect(previewCommission(333, "PERCENT", 40)).toBe(133);
    expect(previewCommission(5, "PERCENT", 10)).toBe(1);
    expect(previewCommission(4, "PERCENT", 10)).toBe(0);
  });

  test("fixed amount is capped at the price", () => {
    expect(previewCommission(1500, "FIXED", 200)).toBe(200);
    expect(previewCommission(100, "FIXED", 500)).toBe(100);
  });

  test("no plan, no price or a bad rate earns nothing", () => {
    expect(previewCommission(300, null, 40)).toBe(0);
    expect(previewCommission(300, "PERCENT", null)).toBe(0);
    expect(previewCommission(0, "PERCENT", 40)).toBe(0);
    expect(previewCommission(300, "PERCENT", -5)).toBe(0);
  });
});

describe("minutesSince", () => {
  test("whole minutes, never negative, zero for a missing or bad time", () => {
    const now = new Date("2026-11-13T12:10:30Z");
    expect(minutesSince("2026-11-13T12:00:00Z", now)).toBe(10);
    expect(minutesSince("2026-11-13T12:15:00Z", now)).toBe(0);
    expect(minutesSince(null, now)).toBe(0);
    expect(minutesSince("not a date", now)).toBe(0);
  });
});

describe("nairobiToday", () => {
  test("uses the Nairobi calendar day, not UTC", () => {
    // 22:30 UTC on 13 Nov is 01:30 on 14 Nov in Nairobi (UTC+3).
    expect(nairobiToday(new Date("2026-11-13T22:30:00Z"))).toBe("2026-11-14");
    expect(nairobiToday(new Date("2026-11-13T20:59:00Z"))).toBe("2026-11-13");
  });
});

describe("sharing a service", () => {
  const { equalSharePercent, isValidPin } = require("./service-business-api") as typeof import("./service-business-api");

  test("an equal split rounds down so the person who led never gets less", () => {
    expect(equalSharePercent(0)).toBe(0);
    expect(equalSharePercent(1)).toBe(50);
    expect(equalSharePercent(2)).toBe(33.33);
    expect(equalSharePercent(3)).toBe(25);
  });

  test("a PIN is 4 to 6 digits", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("1234567")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
  });
});

describe("the team on one service", () => {
  const { lineTeam, toggleTeamMember } = require("./service-business-api") as typeof import("./service-business-api");
  const line = (performer: string | null, helpers: string[] = []) =>
    ({
      id: "l",
      serviceId: "s",
      name: "Haircut",
      unitPrice: 300,
      lineTotal: 300,
      performerStaffProfileId: performer,
      performerAmount: performer ? 120 : null,
      helpers: helpers.map((id) => ({ staffProfileId: id, sharePercent: 33.33, amount: null })),
    }) as Parameters<typeof lineTeam>[0];

  test("lead first, then helpers, with amounts", () => {
    expect(lineTeam(line(null))).toEqual([]);
    expect(lineTeam(line("mike", ["lenah"]))).toEqual([
      { staffProfileId: "mike", amount: 120 },
      { staffProfileId: "lenah", amount: null },
    ]);
  });

  test("a tap adds someone, a second tap takes them off, and amounts of the others stay", () => {
    const one = toggleTeamMember([], "mike");
    expect(one).toEqual([{ staffProfileId: "mike", amount: null }]);
    const two = toggleTeamMember([{ staffProfileId: "mike", amount: 120 }], "lenah");
    expect(two.map((m) => m.staffProfileId)).toEqual(["mike", "lenah"]);
    expect(two[0]!.amount).toBe(120);
    // Taking the lead off makes the next person the lead.
    expect(toggleTeamMember(two, "mike")).toEqual([{ staffProfileId: "lenah", amount: null }]);
  });

  test("the last person cannot be taken off", () => {
    expect(toggleTeamMember([{ staffProfileId: "mike", amount: null }], "mike")).toEqual([{ staffProfileId: "mike", amount: null }]);
  });
});


describe("waitLabel", () => {
  test("minutes under an hour, then hours and minutes", () => {
    expect(waitLabel(0)).toBe("0 min");
    expect(waitLabel(59)).toBe("59 min");
    expect(waitLabel(60)).toBe("1 h");
    expect(waitLabel(365)).toBe("6 h 5 min");
    expect(waitLabel(-4)).toBe("0 min");
    expect(waitLabel(12.9)).toBe("12 min");
  });
});

describe("chairBarPercent", () => {
  test("ranks a chair against the best one", () => {
    expect(chairBarPercent(1200, 1200)).toBe(100);
    expect(chairBarPercent(600, 1200)).toBe(50);
  });

  test("a chair that earned a little still shows, one that earned nothing does not", () => {
    expect(chairBarPercent(10, 5000)).toBe(4);
    expect(chairBarPercent(0, 5000)).toBe(0);
    expect(chairBarPercent(0, 0)).toBe(0);
    expect(chairBarPercent(300, 0)).toBe(0);
  });
});

describe("teamByPresence", () => {
  const team = [
    { staffProfileId: "a", displayName: "Lenah Wanjiru" },
    { staffProfileId: "b", displayName: "mike" },
    { staffProfileId: "c", displayName: "Peter" },
    { staffProfileId: "d", displayName: "Fabian Amino" },
  ];

  test("only people who are here can be offered to a customer", () => {
    const split = teamByPresence(team, { a: "ON_BREAK", b: "OFF", c: "AVAILABLE" });
    expect(split.here.map((p) => p.staffProfileId)).toEqual(["c", "d"]);
    expect(split.onBreak.map((p) => p.staffProfileId)).toEqual(["a"]);
    expect(split.off.map((p) => p.staffProfileId)).toEqual(["b"]);
  });

  test("with no statuses known, everyone counts as here", () => {
    expect(teamByPresence(team, undefined).here).toHaveLength(4);
    expect(teamByPresence(team, null).onBreak).toEqual([]);
  });

  test("says who was left out and why, by first name", () => {
    const split = teamByPresence(team, { a: "ON_BREAK", b: "OFF", c: "OFF" });
    expect(awaySentence(split.onBreak, split.off)).toBe("Lenah is on a break. mike and Peter are off today.");
    expect(awaySentence([], [])).toBe("");
    expect(awaySentence(team.slice(0, 3), [])).toBe("Lenah, mike and Peter are on a break.");
  });
});

describe("helpers on a service", () => {
  const { helperRolePay, helpersSummary } = require("./service-business-api") as typeof import("./service-business-api");

  test("a role pays a set amount, or a percentage of what the lead earns, rounded down", () => {
    expect(helperRolePay({ payKind: "AMOUNT", payValue: 50 }, 300)).toBe(50);
    expect(helperRolePay({ payKind: "AMOUNT", payValue: 50 }, 0)).toBe(50);
    expect(helperRolePay({ payKind: "PERCENT", payValue: 25 }, 250)).toBe(62);
    expect(helperRolePay({ payKind: "PERCENT", payValue: 20 }, 120)).toBe(24);
    expect(helperRolePay({ payKind: "PERCENT", payValue: 20 }, 0)).toBe(0);
  });

  test("the ticket says who helped and what each gets", () => {
    const names = new Map([
      ["lenah", "Lenah Wanjiru"],
      ["peter", "Peter"],
    ]);
    const ticket = {
      lines: [
        { helpers: [{ staffProfileId: "lenah", sharePercent: 16.67, amount: 50 }] },
        { helpers: [{ staffProfileId: "peter", sharePercent: 25, amount: null }, { staffProfileId: "gone", sharePercent: 33.33 }] },
        {},
      ],
    } as unknown as Parameters<typeof helpersSummary>[0];
    expect(helpersSummary(ticket, names)).toBe("Lenah Ksh 50, Peter 25%, Staff 33.33%");
    expect(helpersSummary({ lines: [] }, names)).toBe("");
  });
});

describe("sending a team member their sign-in", () => {
  const { signInSentSentence, looksLikeKenyanMobile } = require("./service-business-api") as typeof import("./service-business-api");
  const sent = { displayName: "Brian Otieno", email: "brian@example.test", emailSent: true, smsSent: true, phoneMasked: "*********003" };

  test("says where it went, and what to do when a message did not go", () => {
    expect(signInSentSentence(sent)).toBe("Texted to *********003 and emailed to brian@example.test.");
    expect(signInSentSentence({ ...sent, smsSent: false })).toBe(
      "Emailed to brian@example.test. The text to *********003 did not go, so tell Brian the PIN too.",
    );
    expect(signInSentSentence({ ...sent, smsSent: false, phoneMasked: null })).toBe(
      "Emailed to brian@example.test. No mobile number, so no text was sent.",
    );
    expect(signInSentSentence({ ...sent, emailSent: false, smsSent: false })).toBe(
      "Neither message went out. Tell Brian the PIN yourself.",
    );
  });

  test("a mobile number is accepted the ways people type it", () => {
    for (const ok of ["0712345678", "0712 345 678", "0110-123-456", "+254712345678", "254 712 345 678"]) {
      expect(looksLikeKenyanMobile(ok)).toBe(true);
    }
    for (const bad of ["", "12", "071234567", "0812345678", "brian"]) {
      expect(looksLikeKenyanMobile(bad)).toBe(false);
    }
  });
});
