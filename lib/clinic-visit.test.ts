import { describe, expect, test } from "bun:test";

import type { BoardVisit, ClinicHats, ClinicVisit } from "./clinic-api";
import {
  amountDue,
  billNeedsDispenser,
  boardNote,
  groupBoard,
  minutesSince,
  payBlockedReason,
  stationsForHats,
  waitLabel,
  waitedLong,
  worksAlone,
} from "./clinic-visit";

const NO_HATS: ClinicHats = {
  reception: false,
  consult: false,
  prescribe: false,
  perform: false,
  dispense: false,
  cashier: false,
  manage: false,
  staffProfileId: null,
};

function card(over: Partial<BoardVisit>): BoardVisit {
  return {
    id: "v",
    number: 1,
    firstName: "Mary",
    station: "waiting",
    priority: 0,
    openedAt: "2026-11-21T07:00:00Z",
    since: "2026-11-21T07:00:00Z",
    clinicianStaffProfileId: null,
    clinicianName: null,
    roomName: null,
    linesDone: 0,
    linesTotal: 1,
    total: null,
    depositAmount: null,
    depositState: null,
    prescriptionStatus: null,
    review: false,
    ...over,
  };
}

function visit(over: Partial<ClinicVisit>): ClinicVisit {
  return {
    id: "v",
    branchId: "b",
    number: 1,
    station: "pay",
    status: "pending",
    priority: 0,
    patient: { id: "p", patientNo: 1, name: "Mary W", phone: null, ageYears: 30, allergies: null },
    payerCustomerId: null,
    requestedStaffProfileId: null,
    requestedStaffName: null,
    lines: [
      {
        id: "l1",
        serviceId: "s",
        name: "Consultation",
        unitPrice: 500,
        lineTotal: 500,
        performerStaffProfileId: "staff",
        performerName: "Amina",
        resourceId: null,
        resourceName: null,
        stage: "DONE",
        startedAt: null,
        finishedAt: null,
      },
    ],
    products: [],
    total: 500,
    depositAmount: null,
    depositState: null,
    review: false,
    prescription: null,
    prescriptionStatus: null,
    openedAt: "2026-11-21T07:00:00Z",
    scheduledStart: null,
    saleId: null,
    version: 1,
    ...over,
  };
}

describe("hats", () => {
  test("each hat opens its own station", () => {
    expect(stationsForHats({ ...NO_HATS, reception: true, cashier: true })).toEqual(["waiting", "pay"]);
    expect(stationsForHats({ ...NO_HATS, consult: true, prescribe: true, perform: true })).toEqual(["consult", "lab"]);
    expect(stationsForHats({ ...NO_HATS, dispense: true })).toEqual(["dispensary"]);
    expect(stationsForHats(NO_HATS)).toEqual([]);
    expect(stationsForHats(null)).toEqual([]);
  });

  test("one person holding reception, consulting and the till works alone", () => {
    expect(worksAlone({ ...NO_HATS, reception: true, consult: true, cashier: true })).toBe(true);
    expect(worksAlone({ ...NO_HATS, reception: true, cashier: true })).toBe(false);
  });
});

describe("waiting", () => {
  const now = Date.parse("2026-11-21T08:05:00Z");
  test("minutes are counted from when the step began", () => {
    expect(minutesSince("2026-11-21T07:00:00Z", now)).toBe(65);
    expect(minutesSince(null, now)).toBe(0);
    expect(minutesSince("2026-11-21T09:00:00Z", now)).toBe(0);
  });
  test("are worded for reading at a glance", () => {
    expect(waitLabel(4)).toBe("4 min");
    expect(waitLabel(65)).toBe("1 h 05 min");
  });
  test("only an unstarted visit is flagged for a long wait", () => {
    expect(waitedLong("waiting", 30)).toBe(true);
    expect(waitedLong("waiting", 29)).toBe(false);
    expect(waitedLong("consult", 90)).toBe(false);
  });
});

describe("money", () => {
  test("a fee held is taken off what is still to pay", () => {
    expect(amountDue(2150, 500, "HELD")).toBe(1650);
    expect(amountDue(2150, 500, "APPLIED")).toBe(2150);
    expect(amountDue(300, 500, "HELD")).toBe(0);
    expect(amountDue(null, null, null)).toBe(0);
  });
});

describe("the Today list", () => {
  test("never says what the person came for", () => {
    expect(boardNote(card({ clinicianName: "Dr Mwangi", depositAmount: 500, depositState: "HELD" }))).toBe(
      "For Dr Mwangi · fee paid",
    );
    expect(boardNote(card({ review: true }))).toBe("Any clinician · review visit");
    expect(boardNote(card({ station: "consult", clinicianName: "Dr Mwangi", roomName: "Room 1" }))).toBe(
      "Dr Mwangi · Room 1",
    );
    expect(boardNote(card({ station: "lab", linesDone: 1, linesTotal: 2 }))).toBe("1 of 2 done");
    expect(boardNote(card({ station: "dispensary" }))).toBe("Prescription to prepare");
    expect(boardNote(card({ station: "pay", prescriptionStatus: "DECLINED" }))).toBe("Not buying the medicines here");
    expect(boardNote(card({ station: "pay", prescriptionStatus: "PREPARED" }))).toBe(
      "Medicines ready to hand over after payment",
    );
  });

  test("puts the urgent first, then the longest wait", () => {
    const grouped = groupBoard([
      card({ id: "a", number: 27, since: "2026-11-21T07:00:00Z" }),
      card({ id: "b", number: 31, since: "2026-11-21T07:40:00Z", priority: 5 }),
      card({ id: "c", number: 29, since: "2026-11-21T07:20:00Z" }),
      card({ id: "d", number: 19, station: "pay" }),
    ]);
    expect(grouped.waiting.map((v) => v.id)).toEqual(["b", "a", "c"]);
    expect(grouped.pay.map((v) => v.id)).toEqual(["d"]);
    expect(grouped.lab).toEqual([]);
  });
});

describe("taking payment", () => {
  test("is allowed once everything done has a name against it", () => {
    expect(payBlockedReason(visit({}))).toBeNull();
  });
  test("waits for whoever did the work to be recorded", () => {
    const v = visit({});
    v.lines[0].performerStaffProfileId = null;
    expect(payBlockedReason(v)).toContain("Mark Consultation done");
  });
  test("waits for an unprepared prescription", () => {
    expect(payBlockedReason(visit({ station: "dispensary", prescriptionStatus: "OPEN" }))).toContain("not been prepared");
  });
  test("is refused on a closed or empty visit", () => {
    expect(payBlockedReason(visit({ status: "completed" }))).toBe("This visit is closed.");
    expect(payBlockedReason(visit({ lines: [] }))).toContain("Add what was done");
  });
  test("knows when the pharmacy rules will ask for a dispenser", () => {
    const product = {
      id: "p",
      itemId: "i",
      name: "Amoxicillin",
      quantity: 1,
      unitPrice: 10,
      lineTotal: 10,
      givenHere: false,
      dispensingClass: "PRESCRIPTION_ONLY" as const,
    };
    expect(billNeedsDispenser(visit({ products: [product] }))).toBe(true);
    expect(billNeedsDispenser(visit({ products: [{ ...product, dispensingClass: "OTC" }] }))).toBe(false);
    expect(billNeedsDispenser(visit({}))).toBe(false);
  });
});
