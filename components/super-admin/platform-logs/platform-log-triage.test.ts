import { describe, expect, it } from "bun:test";

import type {
  PlatformRequestLogCategory,
  PlatformRequestLogRow,
} from "@/lib/super-admin-api";

import {
  countHiddenExpected,
  failureGroupKey,
  groupFailures,
  isUnexpectedFailure,
  latencyTone,
  pathTemplate,
  percentile,
  searchRows,
  tenantSummary,
} from "./platform-log-triage";

let seq = 0;

function row(
  overrides: Partial<PlatformRequestLogRow> = {},
): PlatformRequestLogRow {
  seq += 1;
  return {
    id: `row-${seq}`,
    loggedAt: "2026-10-27T09:00:00.000Z",
    method: "POST",
    path: "/api/v1/payments/stk",
    category: "MPESA" as PlatformRequestLogCategory,
    businessId: null,
    businessName: null,
    userId: null,
    branchId: null,
    correlationId: null,
    status: 500,
    success: false,
    durationMs: 120,
    ip: null,
    loadTestRunId: null,
    ...overrides,
  };
}

describe("pathTemplate", () => {
  it("collapses ids and drops the query string", () => {
    expect(
      pathTemplate("/api/v1/businesses/3f1c2a9e-7b4d-4c1e-9a2f-8b6d5e4c3a2b/orders/42"),
    ).toBe("/api/v1/businesses/:id/orders/:id");
    expect(pathTemplate("/api/v1/public/host/resolve?host=kiosk.ke")).toBe(
      "/api/v1/public/host/resolve",
    );
  });

  it("leaves human-readable routes alone", () => {
    expect(pathTemplate("/api/v1/reports/daily-sales")).toBe(
      "/api/v1/reports/daily-sales",
    );
  });
});

describe("groupFailures", () => {
  it("collapses repeats of the same signature and orders by volume", () => {
    const rows = [
      row({
        id: "a",
        loggedAt: "2026-10-27T09:00:00.000Z",
        businessName: "Mama Njeri",
        errorTitle: "STK push timed out",
      }),
      row({
        id: "b",
        loggedAt: "2026-10-27T09:05:00.000Z",
        businessName: "Mama Njeri",
        errorTitle: "STK push timed out",
      }),
      row({
        id: "c",
        loggedAt: "2026-10-27T09:06:00.000Z",
        businessName: "Kiosk West",
        status: 502,
        errorTitle: "Bad gateway",
      }),
    ];

    const groups = groupFailures(rows);
    expect(groups).toHaveLength(2);

    const [top, second] = groups;
    expect(top?.count).toBe(2);
    expect(top?.title).toBe("STK push timed out");
    expect(top?.tenants).toEqual(["Mama Njeri"]);
    expect(top?.firstSeen).toBe("2026-10-27T09:00:00.000Z");
    expect(top?.lastSeen).toBe("2026-10-27T09:05:00.000Z");
    expect(second?.count).toBe(1);
    expect(second?.status).toBe(502);
  });

  it("skips expected host-lookup 404s but keeps real failures", () => {
    const rows = [
      row({ status: 404, path: "/api/v1/public/host/resolve?host=kiosk.ke" }),
      row({ status: 404, path: "/api/v1/payments/stk" }),
      row({ status: 200, success: true }),
    ];

    expect(rows.filter(isUnexpectedFailure)).toHaveLength(1);
    expect(groupFailures(rows)).toHaveLength(1);
    expect(countHiddenExpected(rows)).toBe(1);
  });

  it("keys distinct routes apart even at the same status", () => {
    const a = row({ path: "/api/v1/orders/1" });
    const b = row({ path: "/api/v1/inventory/1" });
    expect(failureGroupKey(a)).not.toBe(failureGroupKey(b));
  });

  it("summarises the tenant spread", () => {
    const groups = groupFailures([
      row({ businessName: "Mama Njeri" }),
      row({ businessName: "Kiosk West" }),
      row({ businessName: "Kiosk East" }),
    ]);
    expect(groups[0] && tenantSummary(groups[0])).toBe("Mama Njeri · +2");
  });
});

describe("percentile", () => {
  it("uses nearest-rank and ignores the empty case", () => {
    expect(percentile([], 95)).toBeNull();
    expect(percentile([100], 95)).toBe(100);
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 95)).toBe(100);
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
  });
});

describe("searchRows", () => {
  const rows = [
    row({
      businessName: "Mama Njeri",
      path: "/api/v1/payments/stk",
      status: 500,
      errorTitle: "STK push timed out",
    }),
    row({
      businessName: "Kiosk West",
      path: "/api/v1/catalog/items",
      status: 200,
      success: true,
    }),
  ];

  it("matches tenant, status and error text", () => {
    expect(searchRows(rows, "mama")).toHaveLength(1);
    expect(searchRows(rows, "500")).toHaveLength(1);
    expect(searchRows(rows, "timed out")).toHaveLength(1);
  });

  it("narrows with every whitespace token", () => {
    expect(searchRows(rows, "500 mpesa")).toHaveLength(1);
    expect(searchRows(rows, "500 whatsapp")).toHaveLength(0);
  });

  it("returns everything for a blank query", () => {
    expect(searchRows(rows, "   ")).toHaveLength(2);
  });
});

describe("latencyTone", () => {
  it("marks the slow tail", () => {
    expect(latencyTone(120)).toBe("normal");
    expect(latencyTone(1000)).toBe("warn");
    expect(latencyTone(3000)).toBe("bad");
  });
});
