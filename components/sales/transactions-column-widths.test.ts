import { describe, expect, it } from "bun:test";

import {
  TX_COL_WIDTH_DEFAULTS,
  TX_COL_WIDTHS_RESTORE_SCRIPT,
  TX_COL_WIDTHS_STORAGE_KEY,
  clampTxColWidth,
  parseTxColumnWidths,
  txTableMinWidthPx,
  TX_COLUMN_ORDER,
} from "./transactions-column-widths";

describe("transactions-column-widths", () => {
  it("clamps to min/max", () => {
    expect(clampTxColWidth("items", 1)).toBe(160);
    expect(clampTxColWidth("items", 9999)).toBe(640);
    expect(clampTxColWidth("receipt", 112)).toBe(112);
  });

  it("parses stored widths and ignores junk", () => {
    expect(parseTxColumnWidths(null)).toBeNull();
    expect(
      parseTxColumnWidths({
        receipt: 200,
        items: "nope",
        status: 999,
      }),
    ).toEqual({
      ...TX_COL_WIDTH_DEFAULTS,
      receipt: 200,
      status: 200,
    });
  });

  it("sums sheet min width", () => {
    expect(txTableMinWidthPx(TX_COL_WIDTH_DEFAULTS)).toBe(1008);
  });

  it("covers every column in table order", () => {
    expect(TX_COLUMN_ORDER).toHaveLength(8);
    for (const col of TX_COLUMN_ORDER) {
      expect(TX_COL_WIDTH_DEFAULTS[col]).toBeGreaterThan(0);
    }
  });

  it("restore script paints clamped widths onto its parent element", () => {
    const painted: Array<[string, string]> = [];
    const shell = {
      style: {
        setProperty: (key: string, value: string) => {
          painted.push([key, value]);
        },
      },
    };
    const run = new Function(
      "window",
      "document",
      TX_COL_WIDTHS_RESTORE_SCRIPT,
    ) as (w: unknown, d: unknown) => void;
    run(
      {
        localStorage: {
          getItem: (key: string) =>
            key === TX_COL_WIDTHS_STORAGE_KEY
              ? JSON.stringify({ receipt: 400, items: 300, junk: "x" })
              : null,
        },
        matchMedia: () => ({ matches: true }),
      },
      { currentScript: { parentElement: shell } },
    );

    // Stored items kept, receipt clamped to max, junk key falls back to
    // default, min-width sums every track.
    expect(painted).toEqual([
      ["--tx-col-chevron", "32px"],
      ["--tx-col-receipt", "240px"],
      ["--tx-col-time", "128px"],
      ["--tx-col-items", "300px"],
      ["--tx-col-person", "144px"],
      ["--tx-col-payment", "112px"],
      ["--tx-col-status", "112px"],
      ["--tx-col-total", "128px"],
      ["--tx-table-min-width", "1196px"],
    ]);
  });

  it("restore script skips painting when nothing is stored", () => {
    const painted: Array<[string, string]> = [];
    const shell = {
      style: {
        setProperty: (key: string, value: string) => {
          painted.push([key, value]);
        },
      },
    };
    const run = new Function(
      "window",
      "document",
      TX_COL_WIDTHS_RESTORE_SCRIPT,
    ) as (w: unknown, d: unknown) => void;
    run(
      { localStorage: { getItem: () => null }, matchMedia: () => ({ matches: true }) },
      { currentScript: { parentElement: shell } },
    );

    expect(painted).toEqual([]);
  });
});
