import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  type PageDirection,
  type SheetCount,
  type SheetGeometry,
  type TagLayout,
} from "@/lib/price-tags/types";

export const SHEET_COUNTS: readonly SheetCount[] = [24, 48, 72, 96];

/** Columns and rows that keep a price tag wider than it is tall. */
const SHEET_GRIDS: Record<PageDirection, Record<SheetCount, readonly [number, number]>> = {
  portrait: { 24: [3, 8], 48: [4, 12], 72: [6, 12], 96: [6, 16] },
  landscape: { 24: [4, 6], 48: [6, 8], 72: [8, 9], 96: [8, 12] },
};

export function pageSizeMm(direction: PageDirection | undefined): { widthMm: number; heightMm: number } {
  if (direction === "landscape") return { widthMm: A4_HEIGHT_MM, heightMm: A4_WIDTH_MM };
  return { widthMm: A4_WIDTH_MM, heightMm: A4_HEIGHT_MM };
}

function sheetChrome(count: SheetCount): { margin: number; gap: number } {
  if (count === 24) return { margin: 8, gap: 2 };
  if (count === 48) return { margin: 6, gap: 1.5 };
  if (count === 72) return { margin: 5, gap: 1.2 };
  return { margin: 5, gap: 1 };
}

/** Size one tag so `count` of them, plus the gaps, stay inside the usable edge. */
function fitSpan(usable: number, count: number, gap: number): number {
  let size = Math.floor(((usable - gap * (count - 1)) / count) * 100) / 100;
  while (count * size + (count - 1) * gap > usable + 0.001) {
    size = Math.round((size - 0.01) * 100) / 100;
  }
  return size;
}

/**
 * Fill one A4 sheet with exactly 24, 48, 72, or 96 tags.
 * Portrait and landscape use different grids so each tag stays readable.
 */
export function layoutForSheet(
  layout: TagLayout,
  count: SheetCount,
  direction: PageDirection,
): TagLayout {
  const [columns, rows] = SHEET_GRIDS[direction][count];
  const { margin, gap } = sheetChrome(count);
  const page = pageSizeMm(direction);
  return {
    ...layout,
    presetId: "custom",
    pageDirection: direction,
    sheetCount: count,
    tagWidthMm: fitSpan(page.widthMm - margin * 2, columns, gap),
    tagHeightMm: fitSpan(page.heightMm - margin * 2, rows, gap),
    gapXMm: gap,
    gapYMm: gap,
    marginTopMm: margin,
    marginRightMm: margin,
    marginBottomMm: margin,
    marginLeftMm: margin,
  };
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

const FIT_TOLERANCE = 1e-6;

function roundMm(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * How many tags of the given size fit on one A4 sheet.
 * Columns and rows are derived from millimetres so the preview and the
 * printed page describe the same paper.
 */
export function resolveSheet(layout: TagLayout): SheetGeometry {
  const marginTopMm = clamp(layout.marginTopMm, 0, 40);
  const marginRightMm = clamp(layout.marginRightMm, 0, 40);
  const marginBottomMm = clamp(layout.marginBottomMm, 0, 40);
  const marginLeftMm = clamp(layout.marginLeftMm, 0, 40);
  const gapXMm = clamp(layout.gapXMm, 0, 20);
  const gapYMm = clamp(layout.gapYMm, 0, 20);
  const page = pageSizeMm(layout.pageDirection);
  const usableWidthMm = roundMm(page.widthMm - marginLeftMm - marginRightMm);
  const usableHeightMm = roundMm(page.heightMm - marginTopMm - marginBottomMm);
  const tagWidthMm = clamp(layout.tagWidthMm, 18, Math.max(18, usableWidthMm));
  const tagHeightMm = clamp(layout.tagHeightMm, 12, Math.max(12, usableHeightMm));

  // The tolerance stops float error flooring an exact fit (3.9999…) one short.
  let columns = Math.floor((usableWidthMm + gapXMm) / (tagWidthMm + gapXMm) + FIT_TOLERANCE);
  let rows = Math.floor((usableHeightMm + gapYMm) / (tagHeightMm + gapYMm) + FIT_TOLERANCE);
  if (columns < 1) columns = 1;
  if (rows < 1) rows = 1;

  const usedWidthMm = roundMm(columns * tagWidthMm + (columns - 1) * gapXMm);
  const usedHeightMm = roundMm(rows * tagHeightMm + (rows - 1) * gapYMm);

  return {
    columns,
    rows,
    perPage: columns * rows,
    tagWidthMm,
    tagHeightMm,
    gapXMm,
    gapYMm,
    marginTopMm,
    marginRightMm,
    marginBottomMm,
    marginLeftMm,
    usedWidthMm,
    usedHeightMm,
    usableWidthMm,
    usableHeightMm,
    pageWidthMm: page.widthMm,
    pageHeightMm: page.heightMm,
  };
}

/** Tag width that fills the sheet with exactly `columns` columns. */
export function tagWidthForColumns(layout: TagLayout, columns: number): number {
  const cols = clamp(Math.round(columns), 1, 12);
  const marginRightMm = clamp(layout.marginRightMm, 0, 40);
  const marginLeftMm = clamp(layout.marginLeftMm, 0, 40);
  const gapXMm = clamp(layout.gapXMm, 0, 20);
  const usable = pageSizeMm(layout.pageDirection).widthMm - marginLeftMm - marginRightMm;
  // Rounded down: a size rounded up by 0.01 mm loses the last column.
  return fitSpan(usable, cols, gapXMm);
}

/** Tag height that fills the sheet with exactly `rows` rows. */
export function tagHeightForRows(layout: TagLayout, rows: number): number {
  const count = clamp(Math.round(rows), 1, 16);
  const marginTopMm = clamp(layout.marginTopMm, 0, 40);
  const marginBottomMm = clamp(layout.marginBottomMm, 0, 40);
  const gapYMm = clamp(layout.gapYMm, 0, 20);
  const usable = pageSizeMm(layout.pageDirection).heightMm - marginTopMm - marginBottomMm;
  return fitSpan(usable, count, gapYMm);
}

export function paginate<T>(items: readonly T[], perPage: number): T[][] {
  const size = Math.max(1, Math.floor(perPage));
  if (items.length === 0) return [];
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

/** Blank labels allowed before the first tag: at most one sheet less one. */
export function clampSkip(skip: number, perPage: number): number {
  const size = Math.max(1, Math.floor(perPage));
  if (!Number.isFinite(skip)) return 0;
  return clamp(Math.floor(skip), 0, size - 1);
}

/**
 * Pages of sheet cells. The first `skip` cells of page one stay blank so a
 * partly used sticker sheet can go back through the printer.
 */
export function paginateCells<T>(
  items: readonly T[],
  perPage: number,
  skip = 0,
): (T | null)[][] {
  if (items.length === 0) return [];
  const lead = clampSkip(skip, perPage);
  const blanks: (T | null)[] = Array.from({ length: lead }, () => null);
  return paginate<T | null>(blanks.concat(items), perPage);
}

export function pageCount(tagCount: number, perPage: number, skip = 0): number {
  if (tagCount <= 0) return 1;
  const lead = clampSkip(skip, perPage);
  return Math.ceil((tagCount + lead) / Math.max(1, perPage));
}

/** Top-left corner of a cell on the sheet, in millimetres. */
export function cellPosition(geo: SheetGeometry, index: number): { x: number; y: number } {
  const col = index % geo.columns;
  const row = Math.floor(index / geo.columns);
  return {
    x: roundMm(geo.marginLeftMm + col * (geo.tagWidthMm + geo.gapXMm)),
    y: roundMm(geo.marginTopMm + row * (geo.tagHeightMm + geo.gapYMm)),
  };
}

/** Width and height of the tag face as it is read, after any rotation. */
export function faceSize(
  geo: SheetGeometry,
  orientation: TagLayout["orientation"],
): { width: number; height: number } {
  return orientation === "vertical"
    ? { width: geo.tagHeightMm, height: geo.tagWidthMm }
    : { width: geo.tagWidthMm, height: geo.tagHeightMm };
}

/** Reference face the base type sizes were drawn for (the 63 × 32 mm shelf tag). */
const BASE_FACE_WIDTH_MM = 63;
const BASE_FACE_HEIGHT_MM = 32;

/**
 * Type scale for a tag face: 1 on the shelf tag, larger on big tags so the
 * price reads from the aisle, smaller on tiny ones so lines still fit.
 */
export function tagTypeScale(
  geo: SheetGeometry,
  orientation: TagLayout["orientation"],
): number {
  const face = faceSize(geo, orientation);
  const fit = Math.min(face.width / BASE_FACE_WIDTH_MM, face.height / BASE_FACE_HEIGHT_MM);
  return Math.round(clamp(fit, 0.48, 2.2) * 100) / 100;
}
