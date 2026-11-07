import { describe, expect, it } from "vitest";

import { chunkTsplRows, tsplHeader, tsplRow } from "@/lib/price-tags/tspl";

const text = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

describe("TSPL for label printers", () => {
  it("sets the row size, gap and print direction", () => {
    const header = text(tsplHeader({ widthMm: 70, heightMm: 32, rowGapMm: 2, flip: false }));
    expect(header).toBe("SIZE 70 mm,32 mm\r\nGAP 2 mm,0 mm\r\nDIRECTION 1,0\r\nREFERENCE 0,0\r\n");
    expect(text(tsplHeader({ widthMm: 70, heightMm: 32, rowGapMm: 2.5, flip: true }))).toContain("DIRECTION 0,0");
  });

  it("prints a dot where the image is black (TSPL prints 0 bits)", () => {
    const row = tsplRow({ bytesPerRow: 2, heightDots: 1, black: new Uint8Array([0b1000_0001, 0x00]) });
    const head = "CLS\r\nBITMAP 0,0,2,1,0,";
    expect(text(row.slice(0, head.length))).toBe(head);
    expect(Array.from(row.slice(head.length, head.length + 2))).toEqual([0b0111_1110, 0xff]);
    expect(text(row.slice(head.length + 2))).toBe("\r\nPRINT 1,1\r\n");
  });

  it("splits long runs into bridge-sized jobs that each start with the header", () => {
    const header = tsplHeader({ widthMm: 70, heightMm: 32, rowGapMm: 2, flip: false });
    const row = new Uint8Array(18_000);
    const chunks = chunkTsplRows(header, Array.from({ length: 25 }, () => row), 200_000);
    expect(chunks.map((chunk) => chunk.rowCount)).toEqual([11, 11, 3]);
    for (const chunk of chunks) {
      expect(chunk.bytes.length).toBeLessThanOrEqual(200_000);
      expect(text(chunk.bytes.slice(0, header.length))).toBe(text(header));
    }
    expect(chunkTsplRows(header, [])).toEqual([]);
  });
});
