/**
 * TSPL for thermal label printers (TSC and the many printers that copy it,
 * such as JPrinter, Xprinter, iDPRT). Each tag row is sent as one bitmap, so
 * the label looks exactly like the PDF instead of using the printer's fonts.
 */

/** 203 dpi, the resolution of nearly every 4-inch desktop label printer. */
export const LABEL_DOTS_PER_MM = 8;

/** The print bridge refuses bodies over 256 KB; stay well under it. */
export const MAX_TSPL_CHUNK_BYTES = 200_000;

export type TsplMedia = {
  widthMm: number;
  heightMm: number;
  /** Backing between rows on the roll; the printer's gap sensor stops on it. */
  rowGapMm: number;
  /** Turn the print 180° when tags come out upside down for how the roll is loaded. */
  flip: boolean;
};

export type MonochromeRow = {
  bytesPerRow: number;
  heightDots: number;
  /** 1 bit = a black dot, most significant bit first. */
  black: Uint8Array;
};

const encoder = new TextEncoder();

function mm(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Set-up sent once at the start of every chunk, so each chunk prints on its own. */
export function tsplHeader(media: TsplMedia): Uint8Array {
  return encoder.encode(
    [
      `SIZE ${mm(media.widthMm)} mm,${mm(media.heightMm)} mm`,
      `GAP ${mm(media.rowGapMm)} mm,0 mm`,
      `DIRECTION ${media.flip ? 0 : 1},0`,
      "REFERENCE 0,0",
      "",
    ].join("\r\n"),
  );
}

/**
 * One row: clear, draw the bitmap at the origin, print one copy. TSPL prints
 * a dot where the bit is 0, so the black mask is inverted on the way out.
 */
export function tsplRow(row: MonochromeRow): Uint8Array {
  const head = encoder.encode(`CLS\r\nBITMAP 0,0,${row.bytesPerRow},${row.heightDots},0,`);
  const tail = encoder.encode("\r\nPRINT 1,1\r\n");
  const out = new Uint8Array(head.length + row.black.length + tail.length);
  out.set(head, 0);
  for (let index = 0; index < row.black.length; index += 1) {
    out[head.length + index] = ~row.black[index] & 0xff;
  }
  out.set(tail, head.length + row.black.length);
  return out;
}

/**
 * Group rows into bridge-sized jobs, keeping row order. Every chunk starts
 * with the header; a row bigger than the limit still goes alone.
 */
export function chunkTsplRows(
  header: Uint8Array,
  rows: readonly Uint8Array[],
  maxBytes = MAX_TSPL_CHUNK_BYTES,
): { bytes: Uint8Array<ArrayBuffer>; rowCount: number }[] {
  const chunks: { bytes: Uint8Array<ArrayBuffer>; rowCount: number }[] = [];
  let pending: Uint8Array[] = [];
  let size = header.length;
  const flush = () => {
    if (pending.length === 0) return;
    const bytes = new Uint8Array(size);
    bytes.set(header, 0);
    let offset = header.length;
    for (const row of pending) {
      bytes.set(row, offset);
      offset += row.length;
    }
    chunks.push({ bytes, rowCount: pending.length });
    pending = [];
    size = header.length;
  };
  for (const row of rows) {
    if (pending.length > 0 && size + row.length > maxBytes) flush();
    pending.push(row);
    size += row.length;
  }
  flush();
  return chunks;
}
