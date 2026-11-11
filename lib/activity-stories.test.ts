import { describe, expect, test } from "bun:test";

import type { AuditEventRecord } from "@/lib/api";
import {
  daypartFor,
  diaryCsv,
  findStreaks,
  isNeedsLookEvent,
  isRoutineEvent,
  parseDiaryQuery,
  pulseSentence,
  storyFor,
  storyText,
  streakSentence,
} from "@/lib/activity-stories";

function event(partial: Partial<AuditEventRecord>): AuditEventRecord {
  return {
    id: "evt-1",
    businessId: "biz-A",
    branchId: "br-1",
    category: "SALES",
    eventType: "sale.voided",
    severity: "INFO",
    actorId: "user-1",
    actorType: "USER",
    actorName: "Faith",
    targetType: "sale",
    targetId: "11111111-2222-3333-4444-555555555555",
    targetLabel: "Sale #1563",
    targetName: null,
    sessionId: null,
    correlationId: null,
    ipAddress: null,
    userAgent: null,
    source: "pos_terminal",
    terminalId: null,
    shiftId: "shift-1",
    oldState: null,
    newState: null,
    diff: null,
    reason: null,
    metadata: null,
    createdAt: "2026-11-11T11:08:00+03:00",
    ...partial,
  };
}

describe("storyFor", () => {
  test("void reads as a sentence with receipt, money and reason", () => {
    const s = storyFor(
      event({
        reason: "customer left",
        metadata: JSON.stringify({ receiptNo: 1563, grandTotal: "1450.00" }),
        oldState: JSON.stringify({ status: "completed", grandTotal: "1450.00" }),
      }),
    );
    expect(storyText(s)).toBe("Faith voided sale #1563 · KES 1,450 · reason: customer left");
    expect(s.tone).toBe("firm");
    expect(s.needsLook).toBe(true);
    expect(s.routine).toBe(false);
    expect(s.link?.href).toBe("/sales?q=1563");
    expect(s.parts[0]).toEqual({ text: "Faith", kind: "actor" });
  });

  test("void without reason says so quietly and falls back to the sale label", () => {
    const s = storyFor(event({ oldState: JSON.stringify({ grandTotal: "90" }) }));
    expect(storyText(s)).toBe("Faith voided sale #1563 · KES 90 · no reason given");
  });

  test("password change names self vs someone else and the source", () => {
    const self = storyFor(
      event({
        category: "SECURITY",
        eventType: "password.changed",
        actorId: "user-2",
        actorName: "Otieno",
        targetType: "user",
        targetId: "user-2",
        targetLabel: "otieno@example.com",
        targetName: "Otieno",
        source: "dashboard",
      }),
    );
    expect(storyText(self)).toBe("Otieno changed their password from the dashboard");
    expect(self.link?.href).toBe("/users?profile=user-2");

    const admin = storyFor(
      event({
        category: "SECURITY",
        eventType: "password.changed",
        actorId: "user-1",
        actorName: "Mary",
        targetType: "user",
        targetId: "user-2",
        targetLabel: "otieno@example.com",
        targetName: "Otieno",
        source: null,
      }),
    );
    expect(storyText(admin)).toBe("Mary changed Otieno's password");
  });

  test("cleared sale carries line count and value", () => {
    const s = storyFor(
      event({
        eventType: "pos_sale.cleared",
        actorName: null,
        terminalId: "2",
        targetType: "pos_draft",
        targetLabel: "Ticket 42",
        reason: "Cleared from till",
        metadata: JSON.stringify({ lineCount: 7, value: "3200.00", clearAll: false }),
      }),
    );
    expect(storyText(s)).toBe(
      "Till 2 cleared a sale with 7 lines before payment · KES 3,200 · Ticket 42",
    );
    expect(s.needsLook).toBe(true);
  });

  test("clear-all uses its own phrasing", () => {
    const s = storyFor(
      event({
        eventType: "pos_sales.cleared_all",
        actorName: "Kamau",
        targetLabel: "Ticket 7",
        metadata: JSON.stringify({ lineCount: 1, value: "80.00", clearAll: true }),
      }),
    );
    expect(storyText(s)).toBe(
      "Kamau cleared all open sales, dropping 1 line before payment · KES 80 · Ticket 7",
    );
  });

  test("soft lock is alarm and names the account", () => {
    const s = storyFor(
      event({
        category: "SECURITY",
        eventType: "account.locked.soft",
        severity: "WARN",
        actorName: "faith@example.com",
        targetType: "user",
        targetLabel: "faith@example.com",
        targetName: "Faith",
        reason: "Too many failed login attempts",
      }),
    );
    expect(storyText(s)).toBe(
      "Faith's account was locked for a while after repeated failed sign-ins · Too many failed login attempts",
    );
    expect(s.tone).toBe("alarm");
  });

  test("impersonation always reads as platform support", () => {
    const s = storyFor(
      event({
        category: "SECURITY",
        eventType: "impersonation.started",
        severity: "WARN",
        actorType: "SYSTEM",
        actorName: "super_admin",
        targetType: "user",
        targetName: "Mary",
        targetLabel: "mary@example.com",
      }),
    );
    expect(storyText(s)).toBe("Platform support started a support session as Mary");
  });

  test("price change shows before → after", () => {
    const s = storyFor(
      event({
        category: "PRODUCTS",
        eventType: "buying_price.changed",
        targetType: "item",
        targetLabel: "Soft Drink 500ml",
        oldState: JSON.stringify({ price: "45" }),
        newState: JSON.stringify({ price: "52" }),
      }),
    );
    expect(storyText(s)).toBe(
      "Faith changed the buying price of Soft Drink 500ml · KES 45 → KES 52",
    );
    expect(s.link?.href).toBe("/products/catalog?q=Soft%20Drink%20500ml");
  });

  test("shift close with a short drawer needs a look; balanced does not", () => {
    const short = storyFor(
      event({
        category: "CASH_DRAWER",
        eventType: "shift.closed",
        newState: JSON.stringify({ countedClosingCash: "9800", expectedClosingCash: "10000", variance: "-200" }),
      }),
    );
    expect(storyText(short)).toBe("Faith closed a shift · counted KES 9,800 · short by KES 200");
    expect(short.needsLook).toBe(true);

    const balanced = storyFor(
      event({
        category: "CASH_DRAWER",
        eventType: "shift.closed",
        newState: JSON.stringify({ countedClosingCash: "10000", variance: "0" }),
      }),
    );
    expect(storyText(balanced)).toBe("Faith closed a shift · counted KES 10,000 · drawer balanced");
    expect(balanced.needsLook).toBe(false);
  });

  test("capability flip is alarm when loosened", () => {
    const s = storyFor(
      event({
        category: "SECURITY",
        eventType: "settings.cashier_capability_changed",
        severity: "WARN",
        actorName: "Mary",
        targetType: "setting",
        targetLabel: "Allow cashiers to clear a sale",
        newState: JSON.stringify({ enabled: true }),
        metadata: JSON.stringify({ label: "Allow cashiers to clear a sale", loosened: true }),
      }),
    );
    expect(storyText(s)).toBe("Mary turned on cashiers can clear a sale");
    expect(s.tone).toBe("alarm");
  });

  test("unknown event type degrades to a readable label, never JSON", () => {
    const s = storyFor(
      event({
        category: "SYSTEM",
        eventType: "backup.completed",
        actorType: "SCHEDULER",
        actorName: null,
        targetLabel: null,
        metadata: JSON.stringify({ bytes: 1 }),
      }),
    );
    expect(storyText(s)).toBe("A scheduled job: Backup completed");
    expect(storyText(s)).not.toContain("{");
  });

  test("routine vs needs-look classification", () => {
    expect(isRoutineEvent({ eventType: "sale.completed", severity: "INFO" })).toBe(true);
    expect(isRoutineEvent({ eventType: "sale.voided", severity: "INFO" })).toBe(false);
    expect(isRoutineEvent({ eventType: "anything", severity: "DEBUG" })).toBe(true);
    expect(isNeedsLookEvent({ eventType: "login.failed", severity: "WARN" })).toBe(true);
    expect(isNeedsLookEvent({ eventType: "sale.completed", severity: "INFO" })).toBe(false);
    expect(isNeedsLookEvent({ eventType: "webhook.failed", severity: "ERROR" })).toBe(true);
  });
});

describe("time grouping", () => {
  test("dayparts follow the shop day", () => {
    expect(daypartFor(new Date(2026, 10, 11, 6, 0))).toBe("Morning");
    expect(daypartFor(new Date(2026, 10, 11, 13, 0))).toBe("Afternoon");
    expect(daypartFor(new Date(2026, 10, 11, 19, 30))).toBe("Evening");
    expect(daypartFor(new Date(2026, 10, 11, 23, 0))).toBe("Overnight");
    expect(daypartFor(new Date(2026, 10, 11, 2, 0))).toBe("Overnight");
  });
});

describe("streaks", () => {
  test("flags the same cashier voiding three sales within twenty minutes", () => {
    const rows = [0, 5, 12, 60].map((m, i) =>
      event({
        id: `v${i}`,
        createdAt: new Date(Date.UTC(2026, 10, 11, 8, m)).toISOString(),
      }),
    );
    const streaks = findStreaks(rows);
    expect(streaks).toHaveLength(1);
    expect(streaks[0]?.count).toBe(3);
    expect(streakSentence(streaks[0]!)).toBe("Faith voided 3 sales in 12 minutes");
  });

  test("two voids an hour apart are not a streak", () => {
    const rows = [0, 70].map((m, i) =>
      event({ id: `v${i}`, createdAt: new Date(Date.UTC(2026, 10, 11, 8, m)).toISOString() }),
    );
    expect(findStreaks(rows)).toHaveLength(0);
  });
});

describe("ask the diary", () => {
  test("understands shop words", () => {
    const q = parseDiaryQuery("voids yesterday");
    expect(q.eventTypes).toEqual(["sale.voided"]);
    expect(q.period).toBe("yesterday");
    expect(q.text).toEqual([]);
  });

  test("keeps names as free text and reads till numbers", () => {
    const q = parseDiaryQuery("Faith password");
    expect(q.eventTypes).toContain("password.changed");
    expect(q.text).toEqual(["faith"]);

    const t = parseDiaryQuery("cleared sales on Till 2");
    expect(t.eventTypes).toEqual(["pos_sale.cleared", "pos_sales.cleared_all"]);
    expect(t.terminal).toBe("2");
  });

  test("M-Pesa fails map to STK failures", () => {
    const q = parseDiaryQuery("M-Pesa fails");
    expect(q.eventTypes).toContain("stk_push.failed");
  });
});

describe("csv", () => {
  test("quotes commas and keeps JSON columns last", () => {
    const csv = diaryCsv([
      event({ reason: 'left, said "later"', metadata: JSON.stringify({ receiptNo: 1 }) }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toStartWith("﻿when,branch,category");
    expect(lines[1]).toContain('"left, said ""later"""');
    expect(lines[1]).toContain("Faith voided sale #1");
  });
});

describe("pulse", () => {
  test("sentence scales", () => {
    expect(pulseSentence(0, "today")).toBe("Nothing needed your eye today.");
    expect(pulseSentence(1, "today")).toBe("One thing needed your eye today.");
    expect(pulseSentence(12, "this week")).toBe("12 things needed your eye this week.");
  });
});
