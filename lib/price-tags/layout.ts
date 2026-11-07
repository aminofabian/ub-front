import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  type PageDirection,
  type SheetCount,
  type SheetGeometry,
  type TagLayout,
} from "@/lib/price-tags/types";

export const SHEET_COUNTS: readonly SheetCount[] = [24, 48, 72, 96];

/** 4-inch thermal label printers print up to 108 mm wide and take liners up to about 118 mm. */
export const ROLL_LIMITS = {
  minWidthMm: 20,
  maxWidthMm: 108,
  minHeightMm: 10,
  maxHeightMm: 300,
  maxAcross: 4,
  maxGapMm: 10,
  maxEdgeMm: 10,
  maxRowGapMm: 10,
  printWidthMm: 108,
  maxLinerMm: 118,
} as const;

export type RollSpec = {
  widthMm: number;
  heightMm: number;
  across: number;
  gapMm: number;
  edgeMm: number;
};

export type RollPreset = RollSpec & {
  label: string;
  /** Small square stickers read better with the sticker template. */
  suggestSticker?: boolean;
};

/**
 * Common label rolls. Square stickers are named by the size a ruler reads,
 * because sellers list the same 1″ roll as "1″ × 1″ (32 mm)": picking 32 mm
 * for a 25 mm sticker prints every tag across the gap onto the next one. Multi-across gaps and edges are typical values; the printer driver and the roll's own spec sheet are the final word.
 */
export const ROLL_PRESETS: readonly RollPreset[] = [
  { label: "40 × 30", widthMm: 40, heightMm: 30, across: 1, gapMm: 0, edgeMm: 0 },
  { label: "50 × 30", widthMm: 50, heightMm: 30, across: 1, gapMm: 0, edgeMm: 0 },
  { label: "58 × 40", widthMm: 58, heightMm: 40, across: 1, gapMm: 0, edgeMm: 0 },
  { label: "100 × 50", widthMm: 100, heightMm: 50, across: 1, gapMm: 0, edgeMm: 0 },
  { label: "25 mm (1″) · 2 across", widthMm: 25.4, heightMm: 25.4, across: 2, gapMm: 2.5, edgeMm: 2.5, suggestSticker: true },
  { label: "32 mm · 2 across", widthMm: 32, heightMm: 32, across: 2, gapMm: 2, edgeMm: 2, suggestSticker: true },
  { label: "25 mm · 3 across", widthMm: 25, heightMm: 25, across: 3, gapMm: 2, edgeMm: 2, suggestSticker: true },
];

export function rollSpecOf(layout: TagLayout): RollSpec {
  return {
    widthMm: clamp(layout.rollWidthMm, ROLL_LIMITS.minWidthMm, ROLL_LIMITS.maxWidthMm),
    heightMm: clamp(layout.rollHeightMm, ROLL_LIMITS.minHeightMm, ROLL_LIMITS.maxHeightMm),
    across: clamp(Math.round(layout.rollAcross), 1, ROLL_LIMITS.maxAcross),
    gapMm: clamp(layout.rollGapMm, 0, ROLL_LIMITS.maxGapMm),
    edgeMm: clamp(layout.rollEdgeMm, 0, ROLL_LIMITS.maxEdgeMm),
  };
}

/** Full width of the roll the driver should be told about: labels, gaps, and both edges. */
export function rollLinerWidthMm(spec: RollSpec): number {
  return roundMm(spec.edgeMm * 2 + spec.across * spec.widthMm + (spec.across - 1) * spec.gapMm);
}

export function rollPresetMatches(layout: TagLayout, preset: RollSpec): boolean {
  const spec = rollSpecOf(layout);
  return (
    spec.widthMm === preset.widthMm &&
    spec.heightMm === preset.heightMm &&
    spec.across === preset.across &&
    (spec.across === 1 || (spec.gapMm === preset.gapMm && spec.edgeMm === preset.edgeMm))
  );
}

/** Switch to a label roll; borders off, since a roll label is its own edge. */
export function layoutForRoll(layout: TagLayout, patch: Partial<RollSpec> = {}): TagLayout {
  const current = rollSpecOf(layout);
  const next = { ...current, ...patch };
  return {
    ...layout,
    media: "label-roll",
    rollWidthMm: clamp(next.widthMm, ROLL_LIMITS.minWidthMm, ROLL_LIMITS.maxWidthMm),
    rollHeightMm: clamp(next.heightMm, ROLL_LIMITS.minHeightMm, ROLL_LIMITS.maxHeightMm),
    rollAcross: clamp(Math.round(next.across), 1, ROLL_LIMITS.maxAcross),
    rollGapMm: clamp(next.gapMm, 0, ROLL_LIMITS.maxGapMm),
    rollEdgeMm: clamp(next.edgeMm, 0, ROLL_LIMITS.maxEdgeMm),
    border: layout.media === "label-roll" ? layout.border : "none",
  };
}

/**
 * One row of labels is one page: the printer feeds to the next gap after each
 * row. With 2 across, tags fill the row left to right, then the next row.
 */
function rollGeometry(layout: TagLayout): SheetGeometry {
  const spec = rollSpecOf(layout);
  const pageWidthMm = rollLinerWidthMm(spec);
  return {
    columns: spec.across,
    rows: 1,
    perPage: spec.across,
    tagWidthMm: spec.widthMm,
    tagHeightMm: spec.heightMm,
    gapXMm: spec.gapMm,
    gapYMm: 0,
    marginTopMm: 0,
    marginRightMm: spec.edgeMm,
    marginBottomMm: 0,
    marginLeftMm: spec.edgeMm,
    usedWidthMm: roundMm(pageWidthMm - spec.edgeMm * 2),
    usedHeightMm: spec.heightMm,
    usableWidthMm: roundMm(pageWidthMm - spec.edgeMm * 2),
    usableHeightMm: spec.heightMm,
    pageWidthMm,
    pageHeightMm: spec.heightMm,
  };
}

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
  if (layout.media === "label-roll") return rollGeometry(layout);
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

/**
 * Reference face the base type sizes were drawn for: the 63 × 32 mm shelf tag.
 * Its width counts as 40 mm, not 63: the price and a wrapped name need about
 * that much, and the rest of the shelf tag is breathing room. A squarer roll
 * label (40 × 30, 50 × 30) is then sized by its height, like the shelf tag,
 * instead of shrinking to a corner because it is narrower.
 */
const BASE_FACE_WIDTH_MM = 40;
const BASE_FACE_HEIGHT_MM = 32;
const STICKER_FACE_MM = 32;
const SHELF_FACE_WIDTH_MM = 50;
const SHELF_FACE_HEIGHT_MM = 30;

/**
 * Type scale for a tag face: 1 on the shelf tag, larger on big tags so the
 * price reads from the aisle, smaller on tiny ones so lines still fit. It
 * depends on the label size only, never the product, so every tag in a run
 * shows its price at the same size.
 */
export function tagTypeScale(
  geo: SheetGeometry,
  orientation: TagLayout["orientation"],
  templateId?: TagLayout["templateId"],
): number {
  const face = faceSize(geo, orientation);
  // The sticker's sizes are drawn for a 32 mm square, not the long shelf tag.
  // The shelf label's sizes are drawn for a 50 × 30 mm roll label.
  const base =
    templateId === "sticker" ? STICKER_FACE_MM : templateId === "shelf" ? SHELF_FACE_WIDTH_MM : BASE_FACE_WIDTH_MM;
  const baseHeight =
    templateId === "sticker" ? STICKER_FACE_MM : templateId === "shelf" ? SHELF_FACE_HEIGHT_MM : BASE_FACE_HEIGHT_MM;
  const fit = Math.min(face.width / base, face.height / baseHeight);
  return Math.round(clamp(fit, 0.48, 2.2) * 100) / 100;
}
